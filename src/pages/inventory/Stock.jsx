import React, { useState, useEffect, useCallback } from 'react';
import {
  Container, Typography, Paper, Box, Button, Alert, Dialog, DialogTitle, DialogContent, DialogActions,
  Grid, FormControl, InputLabel, Select, MenuItem, TextField, Accordion, AccordionSummary, AccordionDetails,
  Table, TableHead, TableRow, TableCell, TableBody, IconButton, Pagination, Chip, Collapse,
  Card, CardContent, CircularProgress, Tooltip
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import InventoryIcon from '@mui/icons-material/Inventory';
import WarehouseIcon from '@mui/icons-material/Warehouse';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import { BarChart, Bar, XAxis, YAxis, Legend, ResponsiveContainer } from 'recharts';
import API from '../../api';
import { useSearch } from '../../context/SearchContext';

// Expandable Row component
function Row({ movement, bins, onEdit, onDelete, onEditReceipt, getMovementField }) {
  const [open, setOpen] = useState(false);
  const getBinId = () => {
    if (movement.storage_bin?.bin_id) return movement.storage_bin.bin_id;
    if (typeof movement.storage_bin === 'number') {
      const bin = bins.find(b => b.id === movement.storage_bin);
      return bin?.bin_id || '—';
    }
    return movement.bin_id || '—';
  };

  // View PDF Receipt
  const handleViewReceiptPDF = async (e) => {
    e.stopPropagation();
    if (!movement.warehouse_receipt) {
      alert('No receipt available for this stock-out movement.');
      return;
    }
    try {
      const response = await API.get(`/inventory/receipts/${movement.warehouse_receipt}/pdf/`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
        responseType: 'blob'
      });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error fetching receipt PDF:', err);
      alert('Failed to load receipt PDF: ' + (err.response?.data?.detail || err.message));
    }
  };

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
        <TableCell>{getMovementField(movement, 'item_name')}</TableCell>
        <TableCell>{getBinId()}</TableCell>
        <TableCell>{getMovementField(movement, 'quantity')}</TableCell>
        <TableCell>
          <Chip 
            label={getMovementField(movement, 'movement_type') === 'IN' ? 'STOCK IN' : 'STOCK OUT'} 
            color={getMovementField(movement, 'movement_type') === 'IN' ? 'success' : 'error'}
            size="small"
          />
        </TableCell>
        <TableCell>{new Date(getMovementField(movement, 'timestamp')).toLocaleDateString()}</TableCell>
        <TableCell>{getMovementField(movement, 'user_display') || getMovementField(movement, 'user')}</TableCell>
        <TableCell>
          {getMovementField(movement, 'movement_type') === 'OUT' && (
            <>
              <Tooltip title="View PDF Receipt">
                <span>
                  <IconButton 
                    onClick={handleViewReceiptPDF}
                    color="primary"
                    size="small"
                    disabled={!movement.warehouse_receipt}
                  >
                    <PictureAsPdfIcon />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title="Edit Receipt">
                <span>
                  <IconButton 
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditReceipt(movement.warehouse_receipt);
                    }}
                    color="primary"
                    size="small"
                    disabled={!movement.warehouse_receipt}
                  >
                    <EditIcon />
                  </IconButton>
                </span>
              </Tooltip>
            </>
          )}
          <IconButton 
            onClick={(e) => {
              e.stopPropagation();
              onEdit(movement);
            }}
            color="primary"
            size="small"
          >
            <EditIcon />
          </IconButton>
          <IconButton 
            onClick={(e) => {
              e.stopPropagation();
              onDelete(movement.id);
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
                Movement Details
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography><strong>ID:</strong> {movement.id}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography><strong>Batch:</strong> {getMovementField(movement, 'batch') || '—'}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography><strong>Notes:</strong> {getMovementField(movement, 'notes') || '—'}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography><strong>Full Timestamp:</strong> {new Date(getMovementField(movement, 'timestamp')).toLocaleString()}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography><strong>Created By:</strong> {getMovementField(movement, 'user_display') || getMovementField(movement, 'user')}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography>
                    <strong>Movement Type:</strong> 
                    <Chip 
                      label={getMovementField(movement, 'movement_type') === 'IN' ? 'STOCK IN' : 'STOCK OUT'} 
                      color={getMovementField(movement, 'movement_type') === 'IN' ? 'success' : 'error'}
                      size="small"
                      sx={{ ml: 1 }}
                    />
                  </Typography>
                </Grid>
                {getMovementField(movement, 'movement_type') === 'OUT' && (
                  <Grid item xs={12}>
                    <Button
                      size="small"
                      startIcon={<PictureAsPdfIcon />}
                      onClick={handleViewReceiptPDF}
                      sx={{ mr: 1 }}
                      disabled={!movement.warehouse_receipt}
                    >
                      View PDF Receipt
                    </Button>
                    <Button
                      size="small"
                      startIcon={<EditIcon />}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditReceipt(movement.warehouse_receipt);
                      }}
                      disabled={!movement.warehouse_receipt}
                    >
                      Edit Receipt
                    </Button>
                  </Grid>
                )}
              </Grid>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
}

export default function StockInOut() {
  const [items, setItems] = useState([]);
  const [bins, setBins] = useState([]);
  const [movements, setMovements] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [formData, setFormData] = useState({ 
    item: '', 
    quantity: '', 
    movement_type: '', 
    storage_bin: '', 
    notes: '',
    recipient: ''
  });
  const [editId, setEditId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [checkingPermissions, setCheckingPermissions] = useState(true);
  const [hasPermission, setHasPermission] = useState(false);
  const [hasStockInPermission, setHasStockInPermission] = useState(false);
  const [hasStockOutPermission, setHasStockOutPermission] = useState(false);
  const [loading, setLoading] = useState(false);
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);
  const [receiptData, setReceiptData] = useState({
    recipient: '',
    delivery_to: '',
    transfer_order_no: '',
    unloading_point: '',
    original_document: '',
    old_material_no: '',
    picker: '',
    controller: '',
    purpose: '',
    qty_picked: '',
    qty_remaining: ''
  });
  const [receiptId, setReceiptId] = useState(null);
  const { searchTerm } = useSearch();
  const itemsPerPage = 10;

  const fetchStockMovements = useCallback(async () => {
    try {
      setLoading(true);
      const searchValue = searchTerm || '';
      const res = await API.get('inventory/movements/', {
        params: { 
          search: searchValue, 
          page, 
          page_size: itemsPerPage 
        },
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
      });
      setMovements(res.data.results || []);
      setTotalPages(Math.ceil(res.data.count / itemsPerPage));
      setError('');
    } catch (err) {
      console.error('Error fetching stock movements:', err.response?.data || err.message);
      setError('❌ Failed to fetch stock movements: ' + (err.response?.data?.detail || err.message));
      setMovements([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, page]);

  const fetchItemsAndBins = useCallback(async () => {
    try {
      const [itemsRes, binsRes] = await Promise.all([
        API.get('inventory/items/', { params: { page_size: 1000 } }),
        API.get('inventory/bins/', { params: { page_size: 1000 } })
      ]);
      setItems(itemsRes.data.results || []);
      setBins(binsRes.data.results || []);
    } catch (err) {
      console.error('Error fetching items/bins:', err);
      setError('❌ Failed to fetch items or bins: ' + (err.response?.data?.detail || err.message));
    }
  }, []);

  const fetchReceipt = async (id) => {
    try {
      const res = await API.get(`inventory/receipts/${id}/`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
      });
      setReceiptData({
        recipient: res.data.recipient || '',
        delivery_to: res.data.delivery_to || '',
        transfer_order_no: res.data.transfer_order_no || '',
        unloading_point: res.data.unloading_point || '',
        original_document: res.data.original_document || '',
        old_material_no: res.data.old_material_no || '',
        picker: res.data.picker || '',
        controller: res.data.controller || '',
        purpose: res.data.purpose || '',
        qty_picked: res.data.qty_picked?.toString() || '',
        qty_remaining: res.data.qty_remaining?.toString() || ''
      });
      setReceiptId(id);
    } catch (err) {
      console.error('Error fetching receipt:', err);
      setError('❌ Failed to load receipt details: ' + (err.response?.data?.detail || err.message));
    }
  };

  useEffect(() => {
    const checkPermissions = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        if (!token) {
          setError('⚠️ No authentication token found. Please log in.');
          setHasPermission(false);
          setCheckingPermissions(false);
          return;
        }
        const [pageRes, stockInRes, stockOutRes] = await Promise.all([
          API.get('/auth/permissions/page/stock_movements/'),
          API.get('/auth/permissions/action/stock_in/'),
          API.get('/auth/permissions/action/stock_out/')
        ]);
        setHasPermission(pageRes.data.allowed || false);
        setHasStockInPermission(stockInRes.data.allowed || false);
        setHasStockOutPermission(stockOutRes.data.allowed || false);
        if (!pageRes.data.allowed) {
          setError(`⚠️ You do not have permission to view Stock In/Out: ${pageRes.data.reason || 'No reason provided'}`);
        } else {
          fetchStockMovements();
          fetchItemsAndBins();
        }
      } catch (err) {
        console.error('Permission check error:', err);
        setHasPermission(true);
        setHasStockInPermission(true);
        setHasStockOutPermission(true);
        fetchStockMovements();
        fetchItemsAndBins();
      } finally {
        setCheckingPermissions(false);
      }
    };
    checkPermissions();
  }, [fetchStockMovements, fetchItemsAndBins]);

  useEffect(() => {
    if (hasPermission) {
      fetchStockMovements();
    }
  }, [searchTerm, page, hasPermission, fetchStockMovements]);

  const getMovementField = (movement, field) => {
    if (!movement) return '—';
    switch(field) {
      case 'item_name':
        return movement.item?.name || movement.item_name || '—';
      case 'quantity':
        return movement.quantity || '0';
      case 'batch':
        return movement.item?.batch || movement.batch || '—';
      case 'notes':
        return movement.notes || '—';
      case 'movement_type':
        return movement.movement_type || '—';
      case 'timestamp':
        return movement.timestamp || movement.created_at || '—';
      case 'user':
        return movement.user?.email || movement.user?.username || movement.user || '—';
      case 'user_display':
        return movement.user?.name || movement.user?.full_name || movement.user_display || '—';
      default:
        return movement[field] || '—';
    }
  };

  const handleOpenDialog = (type, movement = null) => {
    if (!hasPermission || (type === 'stock_in' && !hasStockInPermission) || (type === 'stock_out' && !hasStockOutPermission)) {
      setError(`⚠️ You do not have permission to perform ${type === 'stock_in' ? 'stock-in' : 'stock-out'}.`);
      return;
    }
    if (movement) {
      setFormData({
        item: movement.item?.id || movement.item || '',
        storage_bin: movement.storage_bin?.id || movement.storage_bin || '',
        quantity: movement.quantity?.toString() || '',
        movement_type: type || (movement.movement_type === 'IN' ? 'stock_in' : 'stock_out'),
        notes: movement.notes || '',
        recipient: movement.recipient || ''
      });
      setEditId(movement.id);
    } else {
      setFormData({ 
        item: '', 
        quantity: '', 
        movement_type: type, 
        storage_bin: '', 
        notes: '',
        recipient: ''
      });
      setEditId(null);
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setFormData({ item: '', quantity: '', movement_type: '', storage_bin: '', notes: '', recipient: '' });
    setEditId(null);
    setError('');
    setSuccess('');
  };

  const handleDeleteOpen = (id) => {
    setDeleteId(id);
    setOpenDeleteDialog(true);
  };

  const handleDeleteClose = () => {
    setOpenDeleteDialog(false);
    setDeleteId(null);
    setError('');
    setSuccess('');
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFormSubmit = async () => {
    const { item, quantity, movement_type, storage_bin, notes, recipient } = formData;
    if (!item || !quantity || !movement_type || !storage_bin) {
      setError('⚠️ Please fill in all required fields.');
      return;
    }
    if (Number(quantity) <= 0) {
      setError('⚠️ Quantity must be a positive number.');
      return;
    }
    try {
      setLoading(true);
      const payload = { 
        item_id: Number(item),
        storage_bin_id: Number(storage_bin),
        quantity: Number(quantity), 
        notes: notes || '',
        recipient: movement_type === 'stock_out' ? recipient || '' : ''
      };
      if (editId) {
        await API.patch(`inventory/movements/${editId}/`, { notes: notes || '' });
        setSuccess('✅ Stock movement notes updated successfully');
      } else {
        if (movement_type === 'stock_in') {
          await API.post('inventory/stock-in/', payload);
          setSuccess('✅ Stock-in recorded successfully');
        } else {
          const res = await API.post('inventory/stock-out/', payload);
          if (res.data.receipt_id) {
            setSuccess(
              <>
                ✅ Stock-out recorded successfully.
                <br />
                <Button
                  size="small"
                  startIcon={<PictureAsPdfIcon />}
                  onClick={() => {
                    const token = localStorage.getItem('accessToken');
                    API.get(`/inventory/receipts/${res.data.receipt_id}/pdf/`, {
                      headers: { Authorization: `Bearer ${token}` },
                      responseType: 'blob'
                    }).then(response => {
                      const blob = new Blob([response.data], { type: 'application/pdf' });
                      const url = window.URL.createObjectURL(blob);
                      const link = document.createElement('a');
                      link.href = url;
                      link.setAttribute('download', `Receipt_${res.data.receipt_id}.pdf`);
                      document.body.appendChild(link);
                      link.click();
                      link.remove();
                      window.URL.revokeObjectURL(url);
                    }).catch(err => {
                      alert('Failed to download receipt: ' + (err.response?.data?.detail || err.message));
                    });
                  }}
                  sx={{ mt: 1 }}
                >
                  Download Receipt PDF
                </Button>
              </>
            );
          } else {
            setSuccess('✅ Stock-out recorded successfully');
            setError('⚠️ No receipt generated. Ensure the storage bin has an assigned warehouse.');
          }
        }
      }
      fetchStockMovements();
      handleCloseDialog();
    } catch (err) {
      console.error('Form submit error:', err);
      let errorMsg = `❌ Failed to record movement: ${err.response?.data?.detail || err.message}`;
      if (err.response?.status === 403) {
        errorMsg = `⚠️ Permission denied: ${err.response.data.detail || 'You lack permission.'}`;
      } else if (err.response?.status === 400 && err.response?.data) {
        errorMsg = Object.entries(err.response.data)
          .map(([field, msg]) => `${field}: ${Array.isArray(msg) ? msg.join(', ') : msg}`)
          .join('; ');
      }
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) {
      setError('⚠️ No stock movement selected for deletion.');
      return;
    }
    try {
      setLoading(true);
      await API.delete(`inventory/movements/${deleteId}/`);
      setSuccess('✅ Stock movement deleted successfully');
      handleDeleteClose();
      fetchStockMovements();
    } catch (err) {
      console.error('Delete error:', err);
      let errorMsg = `❌ Failed to delete stock movement: ${err.response?.data?.detail || err.message}`;
      if (err.response?.status === 403) {
        errorMsg = `⚠️ Permission denied: ${err.response.data.detail || 'You lack permission.'}`;
      }
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleEditReceipt = (id) => {
    fetchReceipt(id);
    setReceiptDialogOpen(true);
  };

  const handleReceiptChange = (e) => {
    const { name, value } = e.target;
    setReceiptData(prev => ({ ...prev, [name]: value }));
  };

  const handleReceiptSubmit = async () => {
    if (!receiptData.recipient) {
      setError('⚠️ Recipient is required.');
      return;
    }
    try {
      setLoading(true);
      await API.patch(`inventory/receipts/${receiptId}/`, receiptData);
      setSuccess('✅ Warehouse receipt updated successfully');
      setReceiptDialogOpen(false);
      fetchStockMovements();
    } catch (err) {
      console.error('Error updating receipt:', err);
      setError(`❌ Failed to update receipt: ${err.response?.data?.detail || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const chartData = movements.reduce((acc, movement) => {
    const itemName = getMovementField(movement, 'item_name');
    const existing = acc.find(item => item.name === itemName);
    const movementType = getMovementField(movement, 'movement_type');
    const quantity = Number(movement.quantity) || 0;
    if (existing) {
      existing[movementType === 'IN' ? 'stock_in' : 'stock_out'] += quantity;
    } else {
      acc.push({
        name: itemName,
        stock_in: movementType === 'IN' ? quantity : 0,
        stock_out: movementType === 'OUT' ? quantity : 0
      });
    }
    return acc;
  }, []);

  const selectedItem = items.find(item => item.id === Number(formData.item));
  const selectedBin = bins.find(bin => bin.id === Number(formData.storage_bin));

  if (checkingPermissions) {
    return (
      <Container>
        <Typography variant="h6" sx={{ mt: 4 }}>
          Loading permissions...
        </Typography>
        <CircularProgress sx={{ mt: 2 }} />
      </Container>
    );
  }

  if (!hasPermission) {
    return (
      <Container>
        <Alert severity="error" sx={{ mt: 4 }} onClose={() => setError('')}>
          {error || '⚠️ You do not have permission to view this page.'}
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      {error && !openDialog && !openDeleteDialog && !receiptDialogOpen && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      {success && !openDialog && !openDeleteDialog && !receiptDialogOpen && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}
      <Typography variant="h4" gutterBottom>Stock In/Out</Typography>
      <Accordion sx={{ mb: 2 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">Stock In/Out Tutorial & Analytics</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Typography variant="body1" paragraph>
            <strong>💡 Tip:</strong> Click on any row to expand and see full details including batch information and notes.
          </Typography>
          <Box sx={{ mt: 2, height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="stock_in" fill="#8884d8" name="Stock In" />
                <Bar dataKey="stock_out" fill="#82ca9d" name="Stock Out" />
              </BarChart>
            </ResponsiveContainer>
          </Box>
        </AccordionDetails>
      </Accordion>
      <Paper sx={{ p: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">Stock Movements</Typography>
          <Box>
            <Button 
              variant="contained" 
              startIcon={<AddIcon />} 
              onClick={() => handleOpenDialog('stock_in')} 
              disabled={!hasStockInPermission} 
              sx={{ mr: 1 }}
            >
              Stock In
            </Button>
            <Button 
              variant="contained" 
              startIcon={<AddIcon />} 
              onClick={() => handleOpenDialog('stock_out')} 
              disabled={!hasStockOutPermission}
            >
              Stock Out
            </Button>
          </Box>
        </Box>
        <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
          💡 Click on any row to view complete details including batch information and notes
        </Typography>
        {loading ? (
          <Box display="flex" justifyContent="center" p={4}>
            <CircularProgress />
          </Box>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableCell></TableCell>
                <TableCell><strong>Item Name</strong></TableCell>
                <TableCell><strong>Storage Bin</strong></TableCell>
                <TableCell><strong>Quantity</strong></TableCell>
                <TableCell><strong>Type</strong></TableCell>
                <TableCell><strong>Date</strong></TableCell>
                <TableCell><strong>Created By</strong></TableCell>
                <TableCell><strong>Actions</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {movements.length > 0 ? movements.map((movement) => (
                <Row 
                  key={movement.id} 
                  movement={movement} 
                  bins={bins}
                  onEdit={(mov) => handleOpenDialog('', mov)}
                  onDelete={handleDeleteOpen}
                  onEditReceipt={handleEditReceipt}
                  getMovementField={getMovementField}
                />
              )) : (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    <Typography variant="body2" color="textSecondary">
                      No stock movements found.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
        <Box mt={3} display="flex" justifyContent="center">
          <Pagination 
            count={totalPages} 
            page={page} 
            onChange={(_, value) => setPage(value)} 
            color="primary" 
          />
        </Box>
      </Paper>
      {/* Stock Movement Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center">
            {formData.movement_type === 'stock_in' ? (
              <>
                <InventoryIcon color="success" sx={{ mr: 1 }} />
                {editId ? '✏️ Edit Stock In' : '📥 Record Stock In'}
              </>
            ) : (
              <>
                <WarehouseIcon color="error" sx={{ mr: 1 }} />
                {editId ? '✏️ Edit Stock Out' : '📤 Record Stock Out'}
              </>
            )}
            {editId && ` (ID: ${editId})`}
          </Box>
        </DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
              {error}
            </Alert>
          )}
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                    <InventoryIcon sx={{ mr: 1 }} />
                    Item & Location Selection
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <FormControl fullWidth required>
                        <InputLabel>Item *</InputLabel>
                        <Select 
                          name="item" 
                          value={formData.item} 
                          onChange={handleFormChange} 
                          label="Item *"
                          disabled={!!editId}
                        >
                          <MenuItem value="">Select Item</MenuItem>
                          {items.map((item) => (
                            <MenuItem key={item.id} value={item.id}>
                              {item.name} 
                              {item.part_number && ` (${item.part_number})`}
                              {item.batch && ` - Batch: ${item.batch}`}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      {selectedItem && (
                        <Box sx={{ mt: 1, p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
                          <Typography variant="body2" color="textSecondary">
                            <strong>Current Stock:</strong> {selectedItem.total_quantity || 0}
                          </Typography>
                        </Box>
                      )}
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <FormControl fullWidth required>
                        <InputLabel>Storage Bin *</InputLabel>
                        <Select 
                          name="storage_bin" 
                          value={formData.storage_bin} 
                          onChange={handleFormChange} 
                          label="Storage Bin *"
                          disabled={!!editId}
                        >
                          <MenuItem value="">Select Storage Bin</MenuItem>
                          {bins.map((bin) => (
                            <MenuItem key={bin.id} value={bin.id}>
                              {bin.bin_id} 
                              {bin.capacity && ` (${bin.capacity - (bin.current_load || 0)} free of ${bin.capacity})`}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      {selectedBin && (
                        <Box sx={{ mt: 1, p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
                          <Typography variant="body2" color="textSecondary">
                            <strong>Capacity:</strong> {selectedBin.current_load || 0}/{selectedBin.capacity} 
                            ({selectedBin.capacity - (selectedBin.current_load || 0)} free)
                          </Typography>
                        </Box>
                      )}
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                    <WarehouseIcon sx={{ mr: 1 }} />
                    Movement Details
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Quantity *"
                        name="quantity"
                        type="number"
                        value={formData.quantity}
                        onChange={handleFormChange}
                        required
                        inputProps={{ min: 1 }}
                        helperText="Must be a positive number"
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <FormControl fullWidth>
                        <InputLabel>Movement Type</InputLabel>
                        <Select 
                          name="movement_type" 
                          value={formData.movement_type} 
                          onChange={handleFormChange} 
                          label="Movement Type"
                          disabled={!!editId}
                        >
                          <MenuItem value="stock_in">Stock In</MenuItem>
                          <MenuItem value="stock_out">Stock Out</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    {formData.movement_type === 'stock_out' && (
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          label="Recipient"
                          name="recipient"
                          value={formData.recipient}
                          onChange={handleFormChange}
                          helperText="Recipient for the stock-out (optional)"
                        />
                      </Grid>
                    )}
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Notes"
                        name="notes"
                        value={formData.notes}
                        onChange={handleFormChange}
                        multiline
                        rows={3}
                        placeholder="Add any notes about this stock movement..."
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} disabled={loading}>Cancel</Button>
          <Button variant="contained" onClick={handleFormSubmit} size="large" disabled={loading}>
            {loading ? <CircularProgress size={24} /> : (editId ? 'Update Notes' : 'Record Movement')}
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
          <Typography>Are you sure you want to delete this stock movement? This action cannot be undone.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteClose} disabled={loading}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDelete} disabled={loading}>
            {loading ? <CircularProgress size={24} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
      {/* Receipt Edit Dialog */}
      <Dialog open={receiptDialogOpen} onClose={() => setReceiptDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Edit Warehouse Receipt</DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
              {error}
            </Alert>
          )}
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Recipient (Issued To) *"
                name="recipient"
                value={receiptData.recipient}
                onChange={handleReceiptChange}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Delivery To"
                name="delivery_to"
                value={receiptData.delivery_to}
                onChange={handleReceiptChange}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Transfer Order No"
                name="transfer_order_no"
                value={receiptData.transfer_order_no}
                onChange={handleReceiptChange}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Unloading Point"
                name="unloading_point"
                value={receiptData.unloading_point}
                onChange={handleReceiptChange}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Original Document"
                name="original_document"
                value={receiptData.original_document}
                onChange={handleReceiptChange}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Old Material No"
                name="old_material_no"
                value={receiptData.old_material_no}
                onChange={handleReceiptChange}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Picker"
                name="picker"
                value={receiptData.picker}
                onChange={handleReceiptChange}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Controller"
                name="controller"
                value={receiptData.controller}
                onChange={handleReceiptChange}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Purpose"
                name="purpose"
                value={receiptData.purpose}
                onChange={handleReceiptChange}
                multiline
                rows={2}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Qty Picked"
                name="qty_picked"
                value={receiptData.qty_picked}
                onChange={handleReceiptChange}
                type="number"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Qty Remaining"
                name="qty_remaining"
                value={receiptData.qty_remaining}
                onChange={handleReceiptChange}
                type="number"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReceiptDialogOpen(false)} disabled={loading}>Cancel</Button>
          <Button variant="contained" onClick={handleReceiptSubmit} disabled={loading}>
            {loading ? <CircularProgress size={24} /> : 'Update Receipt'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}