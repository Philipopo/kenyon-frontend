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
import UploadFileIcon from '@mui/icons-material/UploadFile'; // Added for CSV import
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import API from '../../api';
import { useSearch } from '../../context/SearchContext';

// Expandable row component for Items
function ItemRow({ item, onEdit, onDelete }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <TableRow sx={{ '& > *': { borderBottom: 'unset' }, cursor: 'pointer' }} onClick={() => setOpen(!open)}>
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
        <TableCell>{item.name}</TableCell>
        <TableCell>{item.part_number}</TableCell>
        <TableCell>{item.manufacturer}</TableCell>
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
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={8}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ margin: 2 }}>
              <Typography variant="h6" gutterBottom component="div">
                Item Details
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography><strong>ID:</strong> {item.id}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography><strong>Contact:</strong> {item.contact || '—'}</Typography>
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
    name: '', part_number: '', manufacturer: '', contact: '',
    batch: '', expiry_date: '', min_stock_level: '0', reserved_quantity: '0',
    custom_fields: { Material: '', Grade: '' }
  });
  const [editId, setEditId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [checkingPermissions, setCheckingPermissions] = useState(true);
  const [hasPermission, setHasPermission] = useState(false);
  const [hasCreatePermission, setHasCreatePermission] = useState(false);
  const [hasDeletePermission, setHasDeletePermission] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false); // Added for CSV import
  const [importFile, setImportFile] = useState(null); // Added for CSV import
  const [importResult, setImportResult] = useState(null); // Added for CSV import
  const [importing, setImporting] = useState(false); // Added for CSV import
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
        name: item.name || '',
        part_number: item.part_number || '',
        manufacturer: item.manufacturer || '',
        contact: item.contact || '',
        batch: item.batch || '',
        expiry_date: item.expiry_date || '',
        min_stock_level: item.min_stock_level?.toString() || '0',
        reserved_quantity: item.reserved_quantity?.toString() || '0',
        custom_fields: item.custom_fields || { Material: '', Grade: '' }
      } : {
        name: '', part_number: '', manufacturer: '', contact: '',
        batch: '', expiry_date: '', min_stock_level: '0', reserved_quantity: '0',
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
      name: '', part_number: '', manufacturer: '', contact: '',
      batch: '', expiry_date: '', min_stock_level: '0', reserved_quantity: '0',
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
    const { name, part_number, manufacturer, contact, min_stock_level, reserved_quantity, custom_fields } = formData;
    if (!name || !part_number || !manufacturer || !contact || !custom_fields.Material || !custom_fields.Grade) {
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
      setError(`${validationError}`);
      return;
    }

    try {
      const payload = {
        name,
        part_number,
        manufacturer,
        contact,
        batch: formData.batch || null,
        expiry_date: formData.expiry_date || null,
        min_stock_level: Number(min_stock_level),
        reserved_quantity: Number(reserved_quantity),
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
          errorMsg = `${err.response.data}`;
        } else if (err.response.data.reserved_quantity) {
          errorMsg = `${err.response.data.reserved_quantity}`;
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

  // Added: Handle file upload for CSV import
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!file.name.endsWith('.csv')) {
        setError('Please select a CSV file');
        return;
      }
      setImportFile(file);
      setError('');
    }
  };

  // Added: Handle CSV import
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
        errorMsg = `${err.response.data.error}`;
      } else if (err.response?.data?.detail) {
        errorMsg = `${err.response.data.detail}`;
      }
      setError(errorMsg);
    } finally {
      setImporting(false);
    }
  };

  // Added: Download CSV template
  const downloadCSVTemplate = () => {
    const template = `name,part_number,manufacturer,contact,material,grade,batch,expiry_date,min_stock_level,reserved_quantity
Sample Item,PN001,ABC Corp,john@abccorp.com,Steel,Prime,BATCH001,2025-12-31,10,0
Another Item,PN002,XYZ Ltd,jane@xyzltd.com,Aluminum,Standard,BATCH002,2026-06-30,5,2`;
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
    name: item.name,
    total_quantity: item.total_quantity || 0,
    available_quantity: item.available_quantity || 0
  }));

  if (checkingPermissions) return <Container><Typography variant="h6" sx={{ mt: 4 }}>Loading...</Typography></Container>;
  if (!hasPermission) return <Container><Alert severity="error" sx={{ mt: 4 }} onClose={() => setError('')}>{error || 'You do not have permission to view Item Master.'}</Alert></Container>;

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      {error && !openDialog && !openDeleteDialog && !importDialogOpen && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      {success && !openDialog && !openDeleteDialog && !importDialogOpen && (
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
            <strong>Tip:</strong> Click on any row to expand and see full item details including contact information, expiry dates, and custom fields.
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
        <Button onClick={() => window.location.href = '/inventory/stock-in-out'} variant="outlined">
          Manage Stock
        </Button>
      </Box>

      <Paper sx={{ p: 3 }}>
        <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
          Click on any row to view complete item details including contact information, expiry dates, and custom fields
        </Typography>

        <Table>
          <TableHead>
            <TableRow>
              <TableCell></TableCell>
              <TableCell><strong>Name</strong></TableCell>
              <TableCell><strong>Part Number</strong></TableCell>
              <TableCell><strong>Manufacturer</strong></TableCell>
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
              />
            )) : (
              <TableRow>
                <TableCell colSpan={8} align="center">
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
          {editId && ` (ID: ${editId})`}
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
                required
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
              <li>Required columns: <code>name</code>, <code>part_number</code>, <code>manufacturer</code>, <code>contact</code>, <code>material</code>, <code>grade</code></li>
              <li>Optional columns: <code>batch</code>, <code>expiry_date</code>, <code>min_stock_level</code>, <code>reserved_quantity</code></li>
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