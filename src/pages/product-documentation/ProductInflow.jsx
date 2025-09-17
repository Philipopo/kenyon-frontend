import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Container, Typography, Paper, Grid, TextField, Button, Dialog, DialogTitle,
  DialogContent, DialogActions, InputAdornment, Pagination, Alert, Table,
  TableHead, TableRow, TableCell, TableBody, TableContainer, IconButton, CircularProgress, Box,
  FormControl, InputLabel, Select, MenuItem
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { debounce } from 'lodash';
import API from '../../api';
import { useSearch } from '../../context/SearchContext';

export default function ProductOutflow() {
  const [outflows, setOutflows] = useState([]);
  const [products, setProducts] = useState([]);
  const [availableSerials, setAvailableSerials] = useState([]);
  const [formData, setFormData] = useState({
    product: '',
    customer_name: '',
    sales_order: '',
    dispatch_date: '',
    quantity: '',
    input_serial_numbers: '',
  });
  const [open, setOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [editId, setEditId] = useState(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [checkingPermissions, setCheckingPermissions] = useState(true);
  const [hasPermission, setHasPermission] = useState(false);
  const [hasUpdatePermission, setHasUpdatePermission] = useState(false);
  const [hasDeletePermission, setHasDeletePermission] = useState(false);
  const [selectedOutflow, setSelectedOutflow] = useState(null);
  const [loading, setLoading] = useState(false);
  const { searchTerm } = useSearch();
  const itemsPerPage = 10;
  const prevSearchTermRef = useRef(searchTerm);
  const prevSearchRef = useRef(search);

  const setTimedAlert = (setter, message, duration = 5000) => {
    setter(message);
    setTimeout(() => setter(''), duration);
  };

  const debouncedSetSearch = debounce((value) => {
    setSearch(value);
    setPage(1);
  }, 500);

  const fetchOutflows = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const searchValue = search || searchTerm;
      const res = await API.get('product-documentation-new/outflows/', {
        params: { search: searchValue, page, page_size: itemsPerPage },
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
      });
      const outflowsData = res.data.results || res.data || [];
      setOutflows(outflowsData);
      setTotalPages(Math.ceil((res.data.count || outflowsData.length || 1) / itemsPerPage));
      if (!outflowsData.length) {
        setTimedAlert(setError, '⚠️ No outflows found in the response.');
      }
    } catch (err) {
      const errorMsg = err.response?.status === 401
        ? '⚠️ Authentication failed. Please log in again.'
        : err.response?.status === 404
        ? '❌ Endpoint not found. Please check the backend URL.'
        : `❌ Failed to fetch outflows: ${err.response?.data?.detail || err.message}`;
      setTimedAlert(setError, errorMsg);
      setOutflows([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [search, searchTerm, page]);

  const fetchProducts = useCallback(async () => {
    try {
      const res = await API.get('product-documentation-new/inflows/', {
        params: { ordering: '-created_at', limit: 15 },
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
      });
      const productsData = res.data.results || res.data || [];
      setProducts(productsData);
    } catch (err) {
      setTimedAlert(setError, `❌ Failed to fetch products: ${err.response?.data?.detail || err.message}`);
    }
  }, []);

  const fetchAvailableSerials = useCallback(async (productId) => {
    if (!productId) {
      setAvailableSerials([]);
      return;
    }
    try {
      const res = await API.get(`product-documentation-new/inflows/${productId}/`);
      const serials = res.data.serial_numbers
        ? res.data.serial_numbers
            .filter(s => s.status === 'in_stock')
            .map(s => s.serial_number)
        : [];
      setAvailableSerials(serials);
    } catch (err) {
      setTimedAlert(setError, `❌ Failed to fetch available serial numbers: ${err.response?.data?.detail || err.message}`);
    }
  }, []);

  useEffect(() => {
    const checkPermissions = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        if (!token) {
          setTimedAlert(setError, '⚠️ No authentication token found. Please log in.');
          setHasPermission(false);
          setCheckingPermissions(false);
          return;
        }
        const pageResponse = await API.get('/auth/permissions/page/product_outflow/');
        setHasPermission(pageResponse.data.allowed || false);
        if (!pageResponse.data.allowed) {
          setTimedAlert(setError, `⚠️ You do not have permission to view this page: ${pageResponse.data.reason || 'No reason provided'}`);
          setCheckingPermissions(false);
          return;
        }
        const [createResponse, updateResponse, deleteResponse] = await Promise.all([
          API.get('/auth/permissions/action/create_product_outflow/'),
          API.get('/auth/permissions/action/update_product_outflow/'),
          API.get('/auth/permissions/action/delete_product_outflow/'),
        ]);
        setHasUpdatePermission(updateResponse.data.allowed || false);
        setHasDeletePermission(deleteResponse.data.allowed || false);
        if (createResponse.data.allowed) {
          fetchOutflows();
          fetchProducts();
        } else {
          setTimedAlert(setError, '⚠️ You do not have permission to create product outflows.');
        }
      } catch (err) {
        setTimedAlert(setError, `⚠️ Failed to check permissions: ${err.response?.data?.detail || err.message}`);
        setHasPermission(false);
      } finally {
        setCheckingPermissions(false);
      }
    };
    checkPermissions();
  }, [fetchOutflows, fetchProducts]);

  useEffect(() => {
    if (hasPermission && (search !== prevSearchRef.current || searchTerm !== prevSearchTermRef.current)) {
      setPage(1);
      prevSearchRef.current = search;
      prevSearchTermRef.current = searchTerm;
    }
    if (hasPermission) fetchOutflows();
  }, [search, searchTerm, page, hasPermission, fetchOutflows]);

  const handleOpen = async (outflow = null) => {
    if (!hasPermission) {
      setTimedAlert(setError, '⚠️ You do not have permission to view product outflows.');
      return;
    }
    try {
      const action = outflow ? 'update_product_outflow' : 'create_product_outflow';
      const actionResponse = await API.get(`/auth/permissions/action/${action}/`);
      if (!actionResponse.data.allowed) {
        setTimedAlert(setError, `⚠️ You do not have permission to ${outflow ? 'update' : 'create'} product outflows: ${actionResponse.data.reason || 'No reason provided'}`);
        return;
      }
      if (outflow) {
        setFormData({
          product: outflow.product || '',
          customer_name: outflow.customer_name || '',
          sales_order: outflow.sales_order || '',
          dispatch_date: outflow.dispatch_date || '',
          quantity: outflow.quantity?.toString() || '',
          input_serial_numbers: outflow.serial_numbers?.map(s => s.serial_number).join(', ') || '',
        });
        setEditId(outflow.id);
        await fetchAvailableSerials(outflow.product);
      } else {
        setFormData({
          product: '',
          customer_name: '',
          sales_order: '',
          dispatch_date: '',
          quantity: '',
          input_serial_numbers: '',
        });
        setEditId(null);
        setAvailableSerials([]);
      }
      setOpen(true);
    } catch (err) {
      setTimedAlert(setError, `❌ Failed to check ${outflow ? 'update' : 'create'} permission: ${err.response?.data?.detail || err.message}`);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setFormData({ product: '', customer_name: '', sales_order: '', dispatch_date: '', quantity: '', input_serial_numbers: '' });
    setEditId(null);
    setError('');
    setSuccess('');
    setAvailableSerials([]);
  };

  const handleDeleteOpen = (id) => {
    if (!hasDeletePermission) {
      setTimedAlert(setError, '⚠️ You do not have permission to delete outflows.');
      return;
    }
    setDeleteId(id);
    setDeleteOpen(true);
  };

  const handleDeleteClose = () => {
    setDeleteOpen(false);
    setDeleteId(null);
    setError('');
    setSuccess('');
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (name === 'product') {
      fetchAvailableSerials(value);
    }
  };

  const handleSaveOutflow = async () => {
    const { product, customer_name, sales_order, dispatch_date, quantity, input_serial_numbers } = formData;
    if (!product || !customer_name || !dispatch_date || !quantity) {
      setTimedAlert(setError, '⚠️ Please fill in all required fields.');
      return;
    }
    if (Number(quantity) <= 0) {
      setTimedAlert(setError, '⚠️ Quantity must be positive.');
      return;
    }
    const serials = input_serial_numbers ? input_serial_numbers.split(',').map(s => s.trim()).filter(s => s) : [];
    if (serials.length && serials.length !== Number(quantity)) {
      setTimedAlert(setError, '⚠️ Number of serial numbers must match quantity.');
      return;
    }
    if (serials.length && serials.some(s => !availableSerials.includes(s))) {
      setTimedAlert(setError, '⚠️ Invalid or unavailable serial numbers selected.');
      return;
    }
    const payload = {
      product,
      customer_name,
      sales_order: sales_order || null,
      dispatch_date,
      quantity: Number(quantity),
      input_serial_numbers: serials.join(','),
    };
    try {
      setLoading(true);
      if (editId) {
        await API.patch(`product-documentation-new/outflows/${editId}/`, payload);
        setTimedAlert(setSuccess, '✅ Outflow updated successfully');
      } else {
        await API.post('product-documentation-new/outflows/', payload);
        setTimedAlert(setSuccess, '✅ Outflow created successfully');
      }
      fetchOutflows();
      handleClose();
    } catch (err) {
      let errorMsg = `Failed to ${editId ? 'update' : 'add'} outflow: Unable to process request.`;
      if (err.response?.status === 403) {
        errorMsg = `⚠️ Permission denied: ${err.response.data.detail || 'You lack permission to perform this action.'}`;
      } else if (err.response?.status === 400 && err.response?.data) {
        errorMsg = Object.entries(err.response.data)
          .map(([field, msg]) => `${field}: ${Array.isArray(msg) ? msg.join(', ') : msg}`)
          .join('; ');
      } else {
        errorMsg = err.response?.data?.detail || err.message;
      }
      setTimedAlert(setError, `❌ ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      setLoading(true);
      await API.delete(`product-documentation-new/outflows/${deleteId}/`);
      setTimedAlert(setSuccess, '✅ Outflow deleted successfully');
      setDeleteOpen(false);
      setDeleteId(null);
      fetchOutflows();
    } catch (err) {
      let errorMsg = 'Failed to delete outflow: Unable to process request.';
      if (err.response?.status === 403) {
        errorMsg = `⚠️ Permission denied: ${err.response.data.detail || 'You lack permission to delete outflows.'}`;
      } else {
        errorMsg = err.response?.data?.detail || err.message;
      }
      setTimedAlert(setError, `❌ ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

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
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}
      <Typography variant="h4" sx={{ mb: 3 }}>
        Product Outflows
      </Typography>

      <Grid container justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            size="small"
            placeholder="Search by item name, batch, customer, or sales order..."
            value={search}
            onChange={(e) => debouncedSetSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
        </Grid>
        <Grid item>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpen()}>
            Add New Outflow
          </Button>
        </Grid>
      </Grid>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Outflow Records
        </Typography>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell><strong>Item Name</strong></TableCell>
                <TableCell><strong>Batch</strong></TableCell>
                <TableCell><strong>Customer Name</strong></TableCell>
                <TableCell><strong>Sales Order</strong></TableCell>
                <TableCell><strong>Dispatch Date</strong></TableCell>
                <TableCell><strong>Quantity</strong></TableCell>
                <TableCell><strong>Serial Numbers</strong></TableCell>
                <TableCell><strong>Actions</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : outflows.length > 0 ? (
                outflows.map((outflow, index) => (
                  <TableRow
                    key={outflow.id || `outflow-${index}`}
                    hover
                    sx={{ '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.04)' } }}
                  >
                    <TableCell onClick={() => setSelectedOutflow(outflow)}>
                      {outflow.item_name || '—'}
                    </TableCell>
                    <TableCell onClick={() => setSelectedOutflow(outflow)}>
                      {outflow.item_batch || '—'}
                    </TableCell>
                    <TableCell onClick={() => setSelectedOutflow(outflow)}>
                      {outflow.customer_name || '—'}
                    </TableCell>
                    <TableCell onClick={() => setSelectedOutflow(outflow)}>
                      {outflow.sales_order || '—'}
                    </TableCell>
                    <TableCell onClick={() => setSelectedOutflow(outflow)}>
                      {outflow.dispatch_date || '—'}
                    </TableCell>
                    <TableCell onClick={() => setSelectedOutflow(outflow)}>
                      {outflow.quantity || 0}
                    </TableCell>
                    <TableCell onClick={() => setSelectedOutflow(outflow)}>
                      {outflow.serial_numbers && outflow.serial_numbers.length
                        ? outflow.serial_numbers.map(s => s.serial_number || '—').join(', ')
                        : '—'}
                    </TableCell>
                    <TableCell>
                      <IconButton onClick={() => handleOpen(outflow)} disabled={!hasUpdatePermission}>
                        <EditIcon />
                      </IconButton>
                      <IconButton onClick={() => handleDeleteOpen(outflow.id)} disabled={!hasDeletePermission}>
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    No outflows found. {error && `Error: ${error}`}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {totalPages > 1 && (
          <Box mt={4} display="flex" justifyContent="center">
            <Pagination
              count={totalPages}
              page={page}
              onChange={(_, value) => setPage(value)}
              color="primary"
            />
          </Box>
        )}
      </Paper>

      <Dialog open={!!selectedOutflow} onClose={() => setSelectedOutflow(null)} fullWidth maxWidth="sm">
        <DialogTitle>Outflow Details: {selectedOutflow?.item_name || '—'}</DialogTitle>
        <DialogContent>
          {selectedOutflow && (
            <>
              <Typography variant="body2" gutterBottom>
                <strong>Item Name:</strong> {selectedOutflow.item_name || '—'}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Batch:</strong> {selectedOutflow.item_batch || '—'}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Customer Name:</strong> {selectedOutflow.customer_name || '—'}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Sales Order:</strong> {selectedOutflow.sales_order || '—'}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Dispatch Date:</strong> {selectedOutflow.dispatch_date || '—'}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Quantity:</strong> {selectedOutflow.quantity || 0}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Serial Numbers:</strong> {selectedOutflow.serial_numbers && selectedOutflow.serial_numbers.length
                  ? selectedOutflow.serial_numbers.map(s => s.serial_number || '—').join(', ')
                  : '—'}
              </Typography>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedOutflow(null)} variant="contained">
            Close
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={open} onClose={handleClose} fullWidth maxWidth="md">
        <DialogTitle>{editId ? 'Update Product Outflow' : 'Add New Product Outflow'}</DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
              {error}
            </Alert>
          )}
          {success && (
            <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
              {success}
            </Alert>
          )}
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={6}>
              <FormControl fullWidth required error={formData.product === '' && error.includes('required')}>
                <InputLabel>Product Inflow</InputLabel>
                <Select
                  name="product"
                  value={formData.product}
                  onChange={handleChange}
                >
                  <MenuItem value="" disabled>Select Product Inflow</MenuItem>
                  {products.map((product) => (
                    <MenuItem key={product.id} value={product.id}>
                      {product.item_name} (Batch: {product.batch || '—'})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Customer Name"
                name="customer_name"
                value={formData.customer_name}
                onChange={handleChange}
                fullWidth
                required
                error={formData.customer_name === '' && error.includes('required')}
                helperText={formData.customer_name === '' && error.includes('required') ? 'Customer Name is required' : ''}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Sales Order"
                name="sales_order"
                value={formData.sales_order}
                onChange={handleChange}
                fullWidth
                error={error.includes('sales_order')}
                helperText={error.includes('sales_order') ? 'Invalid Sales Order' : ''}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Dispatch Date"
                name="dispatch_date"
                type="date"
                value={formData.dispatch_date}
                onChange={handleChange}
                fullWidth
                required
                InputLabelProps={{ shrink: true }}
                error={formData.dispatch_date === '' && error.includes('required')}
                helperText={formData.dispatch_date === '' && error.includes('required') ? 'Dispatch Date is required' : ''}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Quantity"
                name="quantity"
                type="number"
                value={formData.quantity}
                onChange={handleChange}
                fullWidth
                required
                error={formData.quantity === '' && error.includes('required')}
                helperText={formData.quantity === '' && error.includes('required') ? 'Quantity is required' : ''}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Serial Numbers (comma-separated)"
                name="input_serial_numbers"
                value={formData.input_serial_numbers}
                onChange={handleChange}
                fullWidth
                multiline
                rows={3}
                helperText={`Select ${formData.quantity || 0} serial numbers from: ${availableSerials.join(', ') || 'None available'}`}
                error={error.includes('serial numbers')}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveOutflow} disabled={loading}>
            {loading ? <CircularProgress size={24} /> : editId ? 'Update Outflow' : 'Save Outflow'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteOpen} onClose={handleDeleteClose} fullWidth maxWidth="sm">
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
              {error}
            </Alert>
          )}
          {success && (
            <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
              {success}
            </Alert>
          )}
          <Typography>Action cannot be reversed, are you sure you want to continue?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteClose}>Cancel</Button>
          <Button onClick={handleDelete} color="error" variant="contained" disabled={loading}>
            {loading ? <CircularProgress size={24} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}