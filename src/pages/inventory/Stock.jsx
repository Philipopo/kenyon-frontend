import React, { useState, useEffect, useCallback } from 'react';
import {
  Container, Typography, Paper, Box, Button, Alert, Dialog, DialogTitle, DialogContent, DialogActions,
  Grid, FormControl, InputLabel, Select, MenuItem, TextField, Accordion, AccordionSummary, AccordionDetails,
  Table, TableHead, TableRow, TableCell, TableBody, IconButton, Pagination, Chip, Collapse,
  Card, CardContent, Divider
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import InventoryIcon from '@mui/icons-material/Inventory';
import WarehouseIcon from '@mui/icons-material/Warehouse';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import API from '../../api';
import { useSearch } from '../../context/SearchContext';

// Expandable row component
function Row({ movement, onEdit, onDelete, getMovementField }) {
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
        <TableCell>{getMovementField(movement, 'item_name')}</TableCell>
        <TableCell>{getMovementField(movement, 'bin_id')}</TableCell>
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
    item_id: '', 
    quantity: '', 
    movement_type: '', 
    storage_bin_id: '', 
    notes: '' 
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
  const { searchTerm } = useSearch();
  const itemsPerPage = 10;

  const fetchItemsAndBins = useCallback(async () => {
    try {
      const [itemsRes, binsRes, movementsRes] = await Promise.all([
        API.get('inventory/items/', {
          params: { page_size: 100 },
          headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
        }),
        API.get('inventory/bins/', {
          headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
        }),
        API.get('inventory/movements/', {
          params: { search: searchTerm, page, page_size: itemsPerPage },
          headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
        })
      ]);
      
      setItems(itemsRes.data.results || itemsRes.data || []);
      setBins(binsRes.data.results || binsRes.data || []);
      setMovements(movementsRes.data.results || movementsRes.data || []);
      setTotalPages(Math.ceil((movementsRes.data.count || 0) / itemsPerPage) || 1);
      setError('');
    } catch (err) {
      console.error('Fetch error:', err);
      setError(`❌ Failed to fetch data: ${err.response?.data?.detail || err.message}`);
      setItems([]);
      setBins([]);
      setMovements([]);
      setTotalPages(1);
    }
  }, [searchTerm, page, itemsPerPage]);

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
        
        const [pageRes, stockInRes, stockOutRes, _updateRes, _deleteRes] = await Promise.all([
          API.get('/auth/permissions/page/stock_movements/'),
          API.get('/auth/permissions/action/stock_in/'),
          API.get('/auth/permissions/action/stock_out/'),
          API.get('/auth/permissions/action/update_stock_movement/'),
          API.get('/auth/permissions/action/delete_stock_movement/')
        ]);
        
        setHasPermission(pageRes.data.allowed || false);
        setHasStockInPermission(stockInRes.data.allowed || false);
        setHasStockOutPermission(stockOutRes.data.allowed || false);
        
        if (!pageRes.data.allowed) {
          setError(`⚠️ You do not have permission to view Stock In/Out: ${pageRes.data.reason || 'No reason provided'}`);
        } else {
          fetchItemsAndBins();
        }
      } catch (err) {
        const errorMsg = err.response?.data?.reason === 'page_not_configured'
          ? '⚠️ Permission not configured for Stock In/Out. Contact your administrator.'
          : `⚠️ Failed to check permissions: ${err.response?.data?.detail || err.message}`;
        setError(errorMsg);
        setHasPermission(false);
      } finally {
        setCheckingPermissions(false);
      }
    };
    checkPermissions();
  }, [fetchItemsAndBins]);

  useEffect(() => {
    if (hasPermission) {
      fetchItemsAndBins();
    }
  }, [searchTerm, page, hasPermission, fetchItemsAndBins]);

  const getMovementField = (movement, field) => {
    if (!movement) return '—';
    
    switch(field) {
      case 'item_name':
        return movement.item_name || movement.item?.name || '—';
      case 'bin_id':
        return movement.storage_bin_id || movement.storage_bin?.bin_id || '—';
      case 'quantity':
        return movement.quantity || '0';
      case 'batch':
        return movement.batch || movement.item?.batch || '—';
      case 'notes':
        return movement.notes || '—';
      case 'movement_type':
        return movement.movement_type || '—';
      case 'timestamp':
        return movement.timestamp || movement.created_at || '—';
      case 'user':
        return movement.user?.email || movement.user?.username || movement.user || '—';
      case 'user_display':
        return movement.user_display || movement.user?.full_name || movement.user?.name || '—';
      default:
        return movement[field] || '—';
    }
  };

  const handleOpenDialog = (type, movement = null) => {
    if (!hasPermission || (type === 'stock_in' && !hasStockInPermission) || (type === 'stock_out' && !hasStockOutPermission)) {
      setError(`⚠️ You do not have permission to perform ${type === 'stock_in' ? 'stock-in' : 'stock-out'}.`);
      return;
    }
    
    // Auto-populate form when editing
    if (movement) {
      setFormData({
        item_id: movement.item?.id || movement.item_id || '',
        storage_bin_id: movement.storage_bin?.id || movement.storage_bin_id || '',
        quantity: movement.quantity?.toString() || '',
        movement_type: movement.movement_type?.toLowerCase() || type,
        notes: movement.notes || ''
      });
      setEditId(movement.id);
    } else {
      setFormData({ 
        item_id: '', 
        quantity: '', 
        movement_type: type, 
        storage_bin_id: '', 
        notes: '' 
      });
      setEditId(null);
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setFormData({ item_id: '', quantity: '', movement_type: '', storage_bin_id: '', notes: '' });
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
    const { item_id, quantity, movement_type, storage_bin_id, notes } = formData;
    if (!item_id || !quantity || !movement_type || !storage_bin_id) {
      setError('⚠️ Please fill in all required fields.');
      return;
    }
    if (Number(quantity) <= 0) {
      setError('⚠️ Quantity must be a positive number.');
      return;
    }
    try {
      const payload = { 
        item_id: Number(item_id), 
        storage_bin_id: Number(storage_bin_id), 
        quantity: Number(quantity), 
        notes: notes || '' 
      };
      
      const endpoint = movement_type === 'stock_in' ? 'stock-in' : 'stock-out';
      
      if (editId) {
        await API.patch(`inventory/movements/${editId}/`, {
          quantity: Number(quantity),
          notes: notes || ''
        }, {
          headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
        });
        setSuccess('✅ Stock movement updated successfully');
      } else {
        await API.post(`inventory/${endpoint}/`, payload, {
          headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
        });
        setSuccess(`✅ ${movement_type === 'stock_in' ? 'Stock-in' : 'Stock-out'} recorded successfully`);
      }
      fetchItemsAndBins();
      handleCloseDialog();
    } catch (err) {
      let errorMsg = `❌ Failed to record ${movement_type === 'stock_in' ? 'stock-in' : 'stock-out'}: ${err.response?.data?.detail || err.message}`;
      if (err.response?.status === 403) {
        errorMsg = `⚠️ Permission denied: ${err.response.data.detail || 'You lack permission.'}`;
      } else if (err.response?.status === 400 && err.response?.data) {
        errorMsg = Object.entries(err.response.data).map(([field, msg]) => `${field}: ${Array.isArray(msg) ? msg.join(', ') : msg}`).join('; ');
      }
      setError(errorMsg);
    }
  };

  const handleDelete = async () => {
    try {
      await API.delete(`inventory/movements/${deleteId}/`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
      });
      setSuccess('✅ Stock movement deleted successfully');
      handleDeleteClose();
      fetchItemsAndBins();
    } catch (err) {
      let errorMsg = `❌ Failed to delete stock movement: ${err.response?.data?.detail || err.message}`;
      if (err.response?.status === 403) {
        errorMsg = `⚠️ Permission denied: ${err.response.data.detail || 'You lack permission.'}`;
      } else if (err.response?.status === 400 && err.response?.data) {
        errorMsg = Object.entries(err.response.data).map(([field, msg]) => `${field}: ${Array.isArray(msg) ? msg.join(', ') : msg}`).join('; ');
      }
      setError(errorMsg);
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

  // Get selected item and bin details for display
  const selectedItem = items.find(item => item.id == formData.item_id);
  const selectedBin = bins.find(bin => bin.id == formData.storage_bin_id);

  if (checkingPermissions) {
    return <Container><Typography variant="h6" sx={{ mt: 4 }}>Loading permissions...</Typography></Container>;
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
      {error && !openDialog && !openDeleteDialog && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      {success && !openDialog && !openDeleteDialog && (
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
                onEdit={(mov) => handleOpenDialog('', mov)}
                onDelete={handleDeleteOpen}
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
        
        <Box mt={3} display="flex" justifyContent="center">
          <Pagination 
            count={totalPages} 
            page={page} 
            onChange={(_, value) => setPage(value)} 
            color="primary" 
          />
        </Box>
      </Paper>

      {/* Enhanced Form Dialog */}
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
            {/* Selection Section */}
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
                          name="item_id" 
                          value={formData.item_id} 
                          onChange={handleFormChange} 
                          label="Item *"
                          disabled={!!editId} // Disable item selection when editing
                        >
                          <MenuItem value="">Select Item</MenuItem>
                          {items.map((item) => (
                            <MenuItem key={item.id} value={item.id}>
                              {item.name} ({item.part_number})
                              {item.batch && ` - Batch: ${item.batch}`}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      {selectedItem && (
                        <Box sx={{ mt: 1, p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
                          <Typography variant="body2" color="textSecondary">
                            <strong>Current Stock:</strong> {selectedItem.total_quantity || 0} 
                            {selectedItem.available_quantity !== undefined && 
                              ` (Available: ${selectedItem.available_quantity})`}
                          </Typography>
                        </Box>
                      )}
                    </Grid>
                    
                    <Grid item xs={12} md={6}>
                      <FormControl fullWidth required>
                        <InputLabel>Storage Bin *</InputLabel>
                        <Select 
                          name="storage_bin_id" 
                          value={formData.storage_bin_id} 
                          onChange={handleFormChange} 
                          label="Storage Bin *"
                          disabled={!!editId} // Disable bin selection when editing
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

            {/* Movement Details Section */}
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
                          disabled={!!editId} // Disable type change when editing
                        >
                          <MenuItem value="stock_in">Stock In</MenuItem>
                          <MenuItem value="stock_out">Stock Out</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    
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

            {/* Summary Section */}
            {(selectedItem || selectedBin) && (
              <Grid item xs={12}>
                <Card variant="outlined" sx={{ bgcolor: 'primary.50' }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      📋 Summary
                    </Typography>
                    <Grid container spacing={2}>
                      {selectedItem && (
                        <Grid item xs={12} md={6}>
                          <Typography variant="body2">
                            <strong>Item:</strong> {selectedItem.name} ({selectedItem.part_number})
                          </Typography>
                          <Typography variant="body2">
                            <strong>Manufacturer:</strong> {selectedItem.manufacturer}
                          </Typography>
                          {selectedItem.batch && (
                            <Typography variant="body2">
                              <strong>Batch:</strong> {selectedItem.batch}
                            </Typography>
                          )}
                        </Grid>
                      )}
                      {selectedBin && (
                        <Grid item xs={12} md={6}>
                          <Typography variant="body2">
                            <strong>Storage Bin:</strong> {selectedBin.bin_id}
                          </Typography>
                          <Typography variant="body2">
                            <strong>Location:</strong> {selectedBin.row}-{selectedBin.rack}
                            {selectedBin.shelf && `-${selectedBin.shelf}`}
                          </Typography>
                        </Grid>
                      )}
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button variant="contained" onClick={handleFormSubmit} size="large">
            {editId ? 'Update Movement' : 'Record Movement'}
          </Button>
        </DialogActions>
      </Dialog>

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
          <Button onClick={handleDeleteClose}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDelete}>Delete</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}