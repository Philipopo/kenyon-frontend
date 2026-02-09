import React, { useState, useEffect, useCallback } from 'react';
import {
  Container, Typography, Paper, Box, Button, Alert, Dialog, DialogTitle, DialogContent, DialogActions,
  Grid, FormControl, InputLabel, Select, MenuItem, TextField, Accordion, AccordionSummary, AccordionDetails,
  Table, TableHead, TableRow, TableCell, TableBody, IconButton, Pagination, Collapse, CircularProgress
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import API from '../../api';
import { useSearch } from '../../context/SearchContext';
import { saveAs } from 'file-saver'; // Import saveAs


// Expandable row component for Items
function ItemRow({ item, onEdit, onDelete, selectedItems, handleSelectItem }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <TableRow sx={{ '& > *': { borderBottom: 'unset' }, cursor: 'pointer' }} onClick={() => setOpen(!open)}>
        <TableCell padding="checkbox">
          <input
            type="checkbox"
            checked={selectedItems.has(item.id)}
            onChange={() => handleSelectItem(item.id)}
          />
        </TableCell>
        <TableCell>
          <IconButton
            aria-label="expand row"
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(!open);
            }}
          >
            {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </TableCell>
        <TableCell>{item.serial_number || '—'}</TableCell>
        <TableCell>{item.material_id}</TableCell>
        <TableCell>{item.name}</TableCell>
        <TableCell>{item.part_number}</TableCell>
        <TableCell>{item.material_class}</TableCell>
        <TableCell>{item.manufacturer}</TableCell>
        <TableCell>{item.po_number || '—'}</TableCell>
        <TableCell>{item.batch || '—'}</TableCell>
        <TableCell>{item.total_quantity}</TableCell>
        <TableCell>{item.available_quantity}</TableCell>
        <TableCell>
          <IconButton 
            onClick={(e) => {
              e.stopPropagation();
              onEdit(item);
            }}
            color="primary"
            size="small"
          >
            <EditIcon />
          </IconButton>
          <IconButton 
            onClick={(e) => {
              e.stopPropagation();
              onDelete(item.id);
            }}
            color="error"
            size="small"
          >
            <DeleteIcon />
          </IconButton>
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={13}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ margin: 2 }}>
              <Typography variant="h6" gutterBottom component="div">
                Item Details
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography><strong>Material ID:</strong> {item.material_id}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography><strong>ID:</strong> {item.id}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography><strong>Serial Number:</strong> {item.serial_number || '—'}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography><strong>Description:</strong> {item.description || '—'}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography><strong>Contact:</strong> {item.contact || '—'}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography><strong>PO Number:</strong> {item.po_number || '—'}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography><strong>Expiry Date:</strong> {item.expiry_date || '—'}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography><strong>Min Stock Level:</strong> {item.min_stock_level}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography><strong>Reserved Quantity:</strong> {item.reserved_quantity}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography><strong>Material:</strong> {item.custom_fields?.Material || '—'}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography><strong>Grade:</strong> {item.custom_fields?.Grade || '—'}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography><strong>Created By:</strong> {item.created_by || '—'}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography><strong>Created At:</strong> {new Date(item.created_at).toLocaleString()}</Typography>
                </Grid>
              </Grid>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
}

// Validation function for reserved quantity
const validateReservedQuantity = (reservedQty, totalQty, isEdit) => {
  const reserved = Number(reservedQty);
  const total = Number(totalQty);

  if (reserved < 0) {
    return 'Reserved quantity cannot be negative.';
  }
  if (!isEdit && reserved > 0) {
    return 'Reserved quantity must be 0 for new items. Please add stock inflow first.';
  }
  if (isEdit && reserved > total) {
    return `Reserved quantity (${reserved}) cannot exceed total stock (${total}). Please add stock inflow first.`;
  }
  return null;
};

export default function ItemMaster() {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [formData, setFormData] = useState({
    material_id: '',
    name: '',
    description: '',
    part_number: '',
    material_class: '',
    manufacturer: '',
    contact: '',
    batch: '',
    expiry_date: '',
    min_stock_level: '0',
    reserved_quantity: '0',
    po_number: '',
    serial_number: '',
    custom_fields: { Material: '', Grade: '' }
  });
  const [editId, setEditId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingPermissions, setCheckingPermissions] = useState(true);
  const [hasPermission, setHasPermission] = useState(false);
  const [hasCreatePermission, setHasCreatePermission] = useState(false);
  const [hasDeletePermission, setHasDeletePermission] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importResult, setImportResult] = useState(null);
  const [importing, setImporting] = useState(false);
  const { searchTerm } = useSearch();
  const itemsPerPage = 10;
  const grades = ['Prime', 'Standard', 'Secondary', 'Economy'];

  const fetchItems = useCallback(async () => {
    try {
      const res = await API.get('inventory/items/', {
        params: { search: searchTerm, page, page_size: itemsPerPage },
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
      });
      setItems(res.data.results || []);
      setTotalPages(Math.ceil(res.data.count / itemsPerPage));
      setError('');
    } catch (err) {
      setError(`Failed to fetch items: ${err.response?.data?.detail || err.message}`);
      setItems([]);
      setTotalPages(1);
    }
  }, [searchTerm, page]);

  useEffect(() => {
    const checkPermissions = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        if (!token) {
          setError('No authentication token found. Please log in.');
          setHasPermission(false);
          setCheckingPermissions(false);
          return;
        }

        const [pageRes, createRes, deleteRes] = await Promise.all([
          API.get('/auth/permissions/page/items/'),
          API.get('/auth/permissions/action/create_item/'),
          API.get('/auth/permissions/action/delete_item/')
        ]);

        setHasPermission(pageRes.data.allowed || false);
        setHasCreatePermission(createRes.data.allowed || false);
        setHasDeletePermission(deleteRes.data.allowed || false);

        if (!pageRes.data.allowed) {
          setError(`You do not have permission to view Item Master: ${pageRes.data.reason || 'No reason provided'}`);
        } else {
          fetchItems();
        }
      } catch (err) {
        const errorMsg = err.response?.data?.reason === 'page_not_configured'
          ? 'Permission not configured for Item Master. Contact your administrator.'
          : `Failed to check permissions: ${err.response?.data?.detail || err.message}`;
        setError(errorMsg);
        setHasPermission(false);
      } finally {
        setCheckingPermissions(false);
      }
    };
    checkPermissions();
  }, [fetchItems]);

  useEffect(() => {
    if (hasPermission) fetchItems();
  }, [searchTerm, page, hasPermission, fetchItems]);

  const handleOpenDialog = async (item = null) => {
    if (!hasPermission) {
      setError('You do not have permission to view Item Master.');
      return;
    }
    try {
      const action = item ? 'update_item' : 'create_item';
      const actionRes = await API.get(`/auth/permissions/action/${action}/`);
      if (!actionRes.data.allowed) {
        setError(`You do not have permission to ${item ? 'update' : 'create'} items.`);
        return;
      }
      setFormData(item ? {
        material_id: item.material_id || '',
        name: item.name || '',
        description: item.description || '',
        part_number: item.part_number || '',
        material_class: item.material_class || '',
        manufacturer: item.manufacturer || '',
        contact: item.contact || '',
        batch: item.batch || '',
        expiry_date: item.expiry_date || '',
        min_stock_level: item.min_stock_level?.toString() || '0',
        reserved_quantity: item.reserved_quantity?.toString() || '0',
        po_number: item.po_number || '',
        serial_number: item.serial_number || '',
        custom_fields: item.custom_fields || { Material: '', Grade: '' }
      } : {
        material_id: '',
        name: '',
        description: '',
        part_number: '',
        material_class: '',
        manufacturer: '',
        contact: '',
        batch: '',
        expiry_date: '',
        min_stock_level: '0',
        reserved_quantity: '0',
        po_number: '',
        serial_number: '',
        custom_fields: { Material: '', Grade: '' }
      });
      setEditId(item ? item.id : null);
      setOpenDialog(true);
    } catch (err) {
      setError(`Failed to check ${item ? 'update' : 'create'} permission: ${err.response?.data?.detail || err.message}`);
    }
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setFormData({
      material_id: '',
      name: '',
      description: '',
      part_number: '',
      material_class: '',
      manufacturer: '',
      contact: '',
      batch: '',
      expiry_date: '',
      min_stock_level: '0',
      reserved_quantity: '0',
      po_number: '',
      serial_number: '',
      custom_fields: { Material: '', Grade: '' }
    });
    setEditId(null);
    setError('');
    setSuccess('');
  };

  const handleDeleteOpen = (id) => {
    if (!hasDeletePermission) {
      setError('You do not have permission to delete items.');
      return;
    }
    setDeleteId(id);
    setOpenDeleteDialog(true);
  };

  const handleDeleteClose = () => {
    setOpenDeleteDialog(false);
    setDeleteId(null);
    setError('');
    setSuccess('');
  };

  const handleSelectItem = (id) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const allIds = new Set(items.map(item => item.id));
      setSelectedItems(allIds);
    } else {
      setSelectedItems(new Set());
    }
  };

  const handleBulkDelete = async () => {
    const itemIds = Array.from(selectedItems);
    const primaryUrl = 'inventory/items/bulk-delete/';
    const altUrl = 'inventory/items/bulk-delete-alt/';
    console.log('Bulk delete: Sending item_ids:', itemIds, 'to URL:', primaryUrl);
    try {
      const response = await API.post(primaryUrl, 
        { item_ids: itemIds },
        { headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` } }
      );
      console.log('Bulk delete response:', response.data, 'URL:', primaryUrl);
      const deletedCount = response.data.message ? parseInt(response.data.message.match(/\d+/)[0], 10) : 0;
      if (deletedCount === 0) {
        setError('No items were deleted. They may have stock records preventing deletion.');
      } else {
        setSuccess(`${deletedCount} items deleted successfully`);
      }
      setSelectedItems(new Set());
      setBulkDeleteDialogOpen(false);
      fetchItems();
    } catch (err) {
      console.error('Bulk delete error:', err.response?.data || err.message, 'URL:', primaryUrl);
      let errorMsg = 'Failed to delete items';
      if (err.response?.status === 405 || err.response?.status === 500) {
        console.log('Retrying bulk delete with alternative endpoint:', altUrl);
        try {
          const retryResponse = await API.post(altUrl, 
            { item_ids: itemIds },
            { headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` } }
          );
          console.log('Bulk delete retry response:', retryResponse.data, 'URL:', altUrl);
          const deletedCount = retryResponse.data.message ? parseInt(retryResponse.data.message.match(/\d+/)[0], 10) : 0;
          if (deletedCount === 0) {
            setError('No items were deleted. They may have stock records preventing deletion.');
          } else {
            setSuccess(`${deletedCount} items deleted successfully`);
          }
          setSelectedItems(new Set());
          setBulkDeleteDialogOpen(false);
          fetchItems();
          return;
        } catch (retryErr) {
          console.error('Bulk delete retry error:', retryErr.response?.data || retryErr.message, 'URL:', altUrl);
          errorMsg = 'Bulk delete endpoint not found. Please contact the administrator to verify the server configuration.';
        }
      } else if (err.response?.status === 400) {
        if (err.response.data.error?.includes('not found')) {
          errorMsg = `Some items could not be deleted: ${err.response.data.error}`;
        } else if (err.response.data.items_with_stock) {
          errorMsg = `Cannot delete items with stock records: IDs ${err.response.data.items_with_stock.join(', ')}`;
        } else {
          errorMsg = err.response.data.error || 'Invalid request';
        }
      } else if (err.response?.status === 403) {
        errorMsg = `Permission denied: ${err.response.data.detail || 'You lack permission.'}`;
      } else {
        errorMsg = `Operation failed: ${err.response?.data?.error || err.message}`;
      }
      setError(errorMsg);
      // Keep dialog open to show error
    }
  };



  const handleExportPDF = async () => {
    try {
      setLoading(true);
      const response = await API.get('inventory/items/export-pdf/', {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
        responseType: 'blob', // Important for binary PDF data
      });
      console.log('PDF export response:', response);
      const blob = new Blob([response.data], { type: 'application/pdf' });
      saveAs(blob, 'inventory_items_report.pdf');
      setSuccess('PDF exported successfully');
    } catch (err) {
      console.error('PDF export error:', err.response?.data || err.message);
      setError('Failed to export PDF');
    } finally {
      setLoading(false);
    }
  };

  
  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith('custom.')) {
      const field = name.split('.')[1];
      setFormData((prev) => ({
        ...prev,
        custom_fields: { ...prev.custom_fields, [field]: value }
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSave = async () => {
    const { name, description, part_number, material_class, manufacturer, contact, min_stock_level, reserved_quantity, po_number, serial_number, custom_fields } = formData;
    if (!name || !description || !part_number || !material_class || !manufacturer || !contact || !custom_fields.Material || !custom_fields.Grade) {
      setError('Please fill in all required fields.');
      return;
    }
    if (Number(min_stock_level) < 0) {
      setError('Min stock level cannot be negative.');
      return;
    }

    // Validate reserved quantity
    const currentItem = editId ? items.find(item => item.id === editId) : null;
    const totalQty = currentItem ? currentItem.total_quantity : 0;
    const validationError = validateReservedQuantity(reserved_quantity, totalQty, !!editId);

    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      const payload = {
        name,
        description,
        part_number,
        material_class,
        manufacturer,
        contact,
        batch: formData.batch || null,
        expiry_date: formData.expiry_date || null,
        min_stock_level: Number(min_stock_level),
        reserved_quantity: Number(reserved_quantity),
        po_number: po_number || null,
        serial_number: serial_number || null,
        custom_fields
      };

      if (editId) {
        await API.patch(`inventory/items/${editId}/`, payload, {
          headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
        });
        setSuccess('Item updated successfully');
      } else {
        await API.post('inventory/items/', payload, {
          headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
        });
        setSuccess('Item created successfully');
      }
      fetchItems();
      handleCloseDialog();
    } catch (err) {
      let errorMsg = `Failed to ${editId ? 'update' : 'create'} item: ${err.response?.data?.detail || err.message}`;
      if (err.response?.status === 400 && err.response?.data) {
        if (typeof err.response.data === 'string') {
          errorMsg = err.response.data;
        } else if (err.response.data.reserved_quantity) {
          errorMsg = err.response.data.reserved_quantity;
        } else {
          errorMsg = Object.entries(err.response.data)
            .map(([field, msg]) => `${field}: ${Array.isArray(msg) ? msg.join(', ') : msg}`)
            .join('; ');
        }
      } else if (err.response?.status === 403) {
        errorMsg = `Permission denied: ${err.response.data.detail || 'You lack permission.'}`;
      }
      setError(errorMsg);
    }
  };

  const handleDelete = async () => {
    try {
      await API.delete(`inventory/items/${deleteId}/`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
      });
      setSuccess('Item deleted successfully');
      handleDeleteClose();
      fetchItems();
    } catch (err) {
      let errorMsg = `Failed to delete item: ${err.response?.data?.detail || err.message}`;
      if (err.response?.status === 400 && err.response?.data) {
        errorMsg = Object.entries(err.response.data)
          .map(([field, msg]) => `${field}: ${Array.isArray(msg) ? msg.join(', ') : msg}`)
          .join('; ');
      } else if (err.response?.status === 403) {
        errorMsg = `Permission denied: ${err.response.data.detail || 'You lack permission.'}`;
      }
      setError(errorMsg);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.name.endsWith('.csv')) {
        setError('Please select a CSV file');
        return;
      }
      setImportFile(file);
      setError('');
    }
  };

  const handleImportCSV = async () => {
    if (!importFile) {
      setError('Please select a CSV file');
      return;
    }

    const formData = new FormData();
    formData.append('file', importFile);

    try {
      setImporting(true);
      setImportResult(null);
      setError('');

      const response = await API.post('inventory/items/import-csv/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });

      setImportResult(response.data);
      setSuccess(response.data.success);
      fetchItems();
    } catch (err) {
      console.error('CSV import error:', err);
      let errorMsg = 'Failed to import CSV file';
      if (err.response?.data?.error) {
        errorMsg = err.response.data.error;
      } else if (err.response?.data?.detail) {
        errorMsg = err.response.data.detail;
      }
      setError(errorMsg);
    } finally {
      setImporting(false);
    }
  };

  const downloadCSVTemplate = () => {
    const template = `name,description,part_number,material_class,manufacturer,contact,material,grade,batch,expiry_date,min_stock_level,reserved_quantity,po_number,serial_number
Sample Item,Sample Description,PN001,Gold pack,ABC Corp,john@abccorp.com,Steel,Prime,BATCH001,2025-12-31,10,0,PO12345,SN12345
Another Item,Another Description,PN002,Silver pack,XYZ Ltd,jane@xyzltd.com,Aluminum,Standard,BATCH002,2026-06-30,5,0,PO67890,SN67890`;
    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'items_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const chartData = items.map(item => ({
    name: `${item.name} (${item.material_id})`,
    total_quantity: item.total_quantity || 0,
    available_quantity: item.available_quantity || 0
  }));

  if (checkingPermissions) return <Container><Typography variant="h6" sx={{ mt: 4 }}>Loading...</Typography></Container>;
  if (!hasPermission) return <Container><Alert severity="error" sx={{ mt: 4 }} onClose={() => setError('')}>{error || 'You do not have permission to view Item Master.'}</Alert></Container>;

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      {error && !openDialog && !openDeleteDialog && !importDialogOpen && !bulkDeleteDialogOpen && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      {success && !openDialog && !openDeleteDialog && !importDialogOpen && !bulkDeleteDialogOpen && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      <Typography variant="h4" gutterBottom>Item Master</Typography>

      <Accordion sx={{ mb: 2 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">Item Master Tutorial & Analytics</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Typography variant="body1" paragraph>
            <strong>Tip:</strong> Click on any row to expand and see full item details including material ID, description, contact information, expiry dates, and custom fields.
          </Typography>
          <Box sx={{ mt: 2, height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="total_quantity" fill="#8884d8" name="Total Quantity" />
                <Bar dataKey="available_quantity" fill="#82ca9d" name="Available Quantity" />
              </BarChart>
            </ResponsiveContainer>
          </Box>
        </AccordionDetails>
      </Accordion>

      <Box display="flex" justifyContent="space-between" mb={2}>
        <Box>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog()} disabled={!hasCreatePermission}>
            Add Item
          </Button>
          {selectedItems.size > 0 && (
            <Button
              variant="outlined"
              color="error"
              onClick={() => setBulkDeleteDialogOpen(true)}
              sx={{ ml: 2 }}
              disabled={!hasDeletePermission}
            >
              Delete Selected ({selectedItems.size})
            </Button>
          )}
          <Button 
            variant="outlined" 
            startIcon={<UploadFileIcon />} 
            onClick={() => setImportDialogOpen(true)}
            sx={{ ml: 2 }}
            disabled={!hasCreatePermission}
          >
            Import CSV
          </Button>
        </Box>
        <Box>
        <Button
        variant="contained"
        color="primary"
        onClick={handleExportPDF}
        disabled={loading}
        style={{ margin: '10px' }}
      >
        Export Items as PDF
      </Button>
        <Button onClick={() => window.location.href = '/inventory/stock-in-out'} variant="outlined">
          Manage Stock
        </Button>
        </Box>

      </Box>

      <Paper sx={{ p: 3 }}>
        <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
          Search by Item Name, Description, Part Number, or Material ID (e.g., 123456)
        </Typography>

        <Table>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <input
                  type="checkbox"
                  checked={selectedItems.size > 0 && selectedItems.size === items.length}
                  onChange={handleSelectAll}
                  disabled={items.length === 0}
                />
              </TableCell>
              <TableCell></TableCell>
              <TableCell><strong>Serial Number</strong></TableCell>
              <TableCell><strong>Material ID</strong></TableCell>
              <TableCell><strong>Name</strong></TableCell>
              <TableCell><strong>Part Number</strong></TableCell>
              <TableCell><strong>Material Class</strong></TableCell>
              <TableCell><strong>Manufacturer</strong></TableCell>
              <TableCell><strong>PO Number</strong></TableCell>
              <TableCell><strong>Batch</strong></TableCell>
              <TableCell><strong>Total Qty</strong></TableCell>
              <TableCell><strong>Available Qty</strong></TableCell>
              <TableCell><strong>Actions</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.length > 0 ? items.map((item) => (
              <ItemRow 
                key={item.id} 
                item={item} 
                onEdit={handleOpenDialog}
                onDelete={handleDeleteOpen}
                selectedItems={selectedItems}
                handleSelectItem={handleSelectItem}
              />
            )) : (
              <TableRow>
                <TableCell colSpan={13} align="center">
                  <Typography variant="body2" color="textSecondary">
                    No items found.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        <Box mt={3} display="flex" justifyContent="center">
          <Pagination count={totalPages} page={page} onChange={(_, value) => setPage(value)} color="primary" />
        </Box>
      </Paper>

      {/* Enhanced Form Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editId ? 'Update Item' : 'Add New Item'}
          {editId && ` (ID: ${editId}, Material ID: ${formData.material_id})`}
        </DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
              {error}
            </Alert>
          )}
          
          {editId && (
            <Alert severity="info" sx={{ mb: 2 }}>
              <strong>Stock Management Tip:</strong> Reserved quantity cannot exceed your total stock. 
              If you need to reserve more items, please add stock inflow first via the "Manage Stock" button.
            </Alert>
          )}
          
          <Grid container spacing={3} sx={{ mt: 1 }}>
            {editId && (
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Material ID"
                  name="material_id"
                  value={formData.material_id}
                  fullWidth
                  disabled
                />
              </Grid>
            )}
            <Grid item xs={12} sm={6}>
              <TextField
                label="Name *"
                name="name"
                value={formData.name}
                onChange={handleChange}
                fullWidth
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Description *"
                name="description"
                value={formData.description}
                onChange={handleChange}
                fullWidth
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Material Class *"
                name="material_class"
                value={formData.material_class}
                onChange={handleChange}
                fullWidth
             
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Part Number *"
                name="part_number"
                value={formData.part_number}
                onChange={handleChange}
                fullWidth
                required
              />
            </Grid>
           
            <Grid item xs={12} sm={6}>
              <TextField
                label="Manufacturer *"
                name="manufacturer"
                value={formData.manufacturer}
                onChange={handleChange}
                fullWidth
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Contact *"
                name="contact"
                value={formData.contact}
                onChange={handleChange}
                fullWidth
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="PO Number"
                name="po_number"
                value={formData.po_number}
                onChange={handleChange}
                fullWidth
                placeholder="Purchase Order Number (optional)"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Serial Number"
                name="serial_number"
                value={formData.serial_number}
                onChange={handleChange}
                fullWidth
                placeholder="Optional serial number"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Batch"
                name="batch"
                value={formData.batch}
                onChange={handleChange}
                fullWidth
                placeholder="Optional batch number"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Expiry Date"
                name="expiry_date"
                type="date"
                value={formData.expiry_date}
                onChange={handleChange}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Min Stock Level *"
                name="min_stock_level"
                type="number"
                value={formData.min_stock_level}
                onChange={handleChange}
                fullWidth
                required
                inputProps={{ min: 0 }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Reserved Quantity *"
                name="reserved_quantity"
                type="number"
                value={formData.reserved_quantity}
                onChange={handleChange}
                fullWidth
                required
                inputProps={{ min: 0 }}
                disabled={!editId}
                helperText={
                  !editId 
                    ? "Must be 0 for new items (add stock inflow first)" 
                    : `Current total stock: ${items.find(item => item.id === editId)?.total_quantity || 0}`
                }
                error={!!error && error.includes('Reserved quantity')}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Material *"
                name="custom.Material"
                value={formData.custom_fields.Material}
                onChange={handleChange}
                fullWidth
                
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required>
                <InputLabel>Grade *</InputLabel>
                <Select
                  name="custom.Grade"
                  value={formData.custom_fields.Grade}
                  onChange={handleChange}
                  label="Grade *"
                >
                  {grades.map((grade) => (
                    <MenuItem key={grade} value={grade}>{grade}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} size="large">
            {editId ? 'Update Item' : 'Create Item'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={openDeleteDialog} onClose={handleDeleteClose}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
              {error}
            </Alert>
          )}
          <Typography>Are you sure you want to delete this item? This action cannot be undone.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteClose}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDelete}>Delete</Button>
        </DialogActions>
      </Dialog>

      {/* Bulk Delete Confirmation Dialog */}
      <Dialog open={bulkDeleteDialogOpen} onClose={() => setBulkDeleteDialogOpen(false)}>
        <DialogTitle>Confirm Bulk Delete</DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
              {error}
            </Alert>
          )}
          <Typography>
            Are you sure you want to delete these {selectedItems.size} items? This will also delete all related stock-in and stock-out data.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBulkDeleteDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleBulkDelete}>
            Delete Selected
          </Button>
        </DialogActions>
      </Dialog>

      {/* CSV Import Dialog */}
      <Dialog open={importDialogOpen} onClose={() => setImportDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center">
            <UploadFileIcon sx={{ mr: 1, color: 'primary.main' }} />
            Import Items from CSV
          </Box>
        </DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2">
              <strong>CSV Format Requirements:</strong>
            </Typography>
            <ul>
              <li>Required columns: <code>name</code>, <code>description</code>, <code>part_number</code>, <code>manufacturer</code>, <code>contact</code>, <code>material</code>, <code>grade</code></li>
              <li>Optional columns: <code>batch</code>, <code>expiry_date</code>, <code>min_stock_level</code>, <code>reserved_quantity</code>, <code>po_number</code>, <code>serial_number</code>, <code>material_class</code></li>
              <li>Note: <code>material_id</code> is auto-generated and should not be included in the CSV</li>
              <li>File must be UTF-8 encoded CSV</li>
              <li>Date format for expiry_date: YYYY-MM-DD</li>
            </ul>
          </Alert>
          <Button 
            variant="outlined" 
            onClick={downloadCSVTemplate}
            sx={{ mb: 2 }}
          >
            Download CSV Template
          </Button>

          <TextField
            type="file"
            inputProps={{ accept: '.csv' }}
            onChange={handleFileUpload}
            fullWidth
            sx={{ mb: 2 }}
          />

          {importFile && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Selected file: {importFile.name}
            </Typography>
          )}

          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
              {error}
            </Alert>
          )}

          {importResult && (
            <Alert severity={importResult.errors?.length > 0 ? "warning" : "success"} sx={{ mb: 2 }}>
              <Typography variant="body2" gutterBottom>
                <strong>{importResult.success}</strong>
              </Typography>
              
              {importResult.created_items?.length > 0 && (
                <Box sx={{ mt: 1, maxHeight: 200, overflow: 'auto' }}>
                  <Typography variant="body2" gutterBottom>
                    <strong>Created Items ({importResult.created_items.length}):</strong>
                  </Typography>
                  <ul style={{ margin: 0, paddingLeft: 20 }}>
                    {importResult.created_items.map((item, index) => (
                      <li key={index} style={{ fontSize: '0.875rem' }}>{item}</li>
                    ))}
                  </ul>
                </Box>
              )}
              
              {importResult.errors?.length > 0 && (
                <Box sx={{ mt: 1, maxHeight: 200, overflow: 'auto' }}>
                  <Typography variant="body2" gutterBottom>
                    <strong>Errors ({importResult.errors.length}):</strong>
                  </Typography>
                  <ul style={{ margin: 0, paddingLeft: 20 }}>
                    {importResult.errors.map((error, index) => (
                      <li key={index} style={{ fontSize: '0.875rem', color: 'red' }}>{error}</li>
                    ))}
                  </ul>
                </Box>
              )}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImportDialogOpen(false)} disabled={importing}>
            Cancel
          </Button>
          <Button 
            variant="contained" 
            onClick={handleImportCSV} 
            disabled={!importFile || importing}
            startIcon={importing ? <CircularProgress size={20} /> : null}
          >
            {importing ? 'Importing...' : 'Import CSV'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}