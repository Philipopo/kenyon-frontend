// src/pages/product-documentation/ProductOutflow.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Container, Typography, Paper, Grid, TextField, Button, Dialog, DialogTitle,
  DialogContent, DialogActions, InputAdornment, Pagination, Alert, Table,
  TableHead, TableRow, TableCell, TableBody, TableContainer, IconButton, Select, MenuItem, CircularProgress, Box,
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
    product: '', customer_name: '', sales_order: '', dispatch_date: '', quantity: '', input_serial_numbers: '',
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

  const debouncedSetSearch = useCallback(
    debounce((value) => {
      setSearch(value);
      setPage(1);
    }, 500),
    []
  );

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
        const pageResponse = await API.get('/auth/permissions/page/product_outflow/');
        console.log('Page permission response:', pageResponse.data);
        setHasPermission(pageResponse.data.allowed || false);
        if (!pageResponse.data.allowed) {
          setError(`⚠️ You do not have permission to view this page: ${pageResponse.data.reason || 'No reason provided'}`);
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
          setError('⚠️ You do not have permission to create product outflows.');
        }
      } catch (err) {
        console.error('Error checking permissions:', err.response?.data || err.message);
        setError(`⚠️ Failed to check permissions: ${err.response?.data?.detail || err.message}`);
        setHasPermission(false);
      } finally {
        setCheckingPermissions(false);
      }
    };
    checkPermissions();
  }, []);

  const fetchOutflows = useCallback(async () => {
    try {
      setLoading(true);
      const searchValue = search || searchTerm;
      const res = await API.get('product-documentation/outflows/', {
        params: { search: searchValue, page, page_size: itemsPerPage },
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
      });
      console.log('[OUTFLOWS FETCHED]', res.data);
      setOutflows(res.data.results || []);
      setTotalPages(Math.ceil(res.data.count / itemsPerPage));
      setError('');
    } catch (err) {
      console.error('Error fetching outflows:', err.response?.data || err.message);
      setError(`❌ Failed to fetch outflows: ${err.response?.data?.detail || err.message}`);
      setOutflows([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [search, searchTerm, page, itemsPerPage]);

  const fetchProducts = async () => {
    try {
      const res = await API.get('product-documentation/inflows/');
      setProducts(res.data.results || []);
    } catch (err) {
      console.error('Error fetching products:', err.response?.data || err.message);
      setError(`❌ Failed to fetch products: ${err.response?.data?.detail || err.message}`);
    }
  };

  const fetchAvailableSerials = async (productId) => {
    if (!productId) {
      setAvailableSerials([]);
      return;
    }
    try {
      const res = await API.get(`product-documentation/inflows/${productId}/`);
      setAvailableSerials(res.data.serial_numbers.filter(s => s.status === 'in_stock').map(s => s.serial_number));
    } catch (err) {
      console.error('Error fetching available serial numbers:', err.response?.data || err.message);
      setError(`❌ Failed to fetch available serial numbers: ${err.response?.data?.detail || err.message}`);
    }
  };

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
      setError('⚠️ You do not have permission to view product outflows.');
      return;
    }
    try {
      const action = outflow ? 'update_product_outflow' : 'create_product_outflow';
      const actionResponse = await API.get(`/auth/permissions/action/${action}/`);
      if (!actionResponse.data.allowed) {
        setError(`⚠️ You do not have permission to ${outflow ? 'update' : 'create'} product outflows: ${actionResponse.data.reason || 'No reason provided'}`);
        return;
      }
      if (outflow) {
        setFormData({
          product: outflow.product.id,
          customer_name: outflow.customer_name,
          sales_order: outflow.sales_order,
          dispatch_date: outflow.dispatch_date,
          quantity: outflow.quantity.toString(),
          input_serial_numbers: outflow.serial_numbers.map(s => s.serial_number).join(', '),
        });
        setEditId(outflow.id);
        await fetchAvailableSerials(outflow.product.id);
      } else {
        setFormData({
          product: '', customer_name: '', sales_order: '', dispatch_date: '', quantity: '', input_serial_numbers: '',
        });
        setEditId(null);
        setAvailableSerials([]);
      }
      setOpen(true);
    } catch (err) {
      console.error(`Error checking ${outflow ? 'update' : 'create'} permission:`, err.response?.data || err.message);
      setError(`❌ Failed to check ${outflow ? 'update' : 'create'} permission: ${err.response?.data?.detail || err.message}`);
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
      setError('⚠️ You do not have permission to delete outflows.');
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
    const { product, customer_name, dispatch_date, quantity, input_serial_numbers } = formData;
    if (!product || !customer_name || !dispatch_date || !quantity) {
      setError('⚠️ Please fill in all required fields.');
      return;
    }
    if (Number(quantity) <= 0) {
      setError('⚠️ Quantity must be positive.');
      return;
    }
    const serials = input_serial_numbers ? input_serial_numbers.split(',').map(s => s.trim()).filter(s => s) : [];
    if (serials.length !== Number(quantity)) {
      setError('⚠️ Number of serial numbers must match quantity.');
      return;
    }
    if (serials.some(s => !availableSerials.includes(s))) {
      setError('⚠️ Invalid or unavailable serial numbers selected.');
      return;
    }
    const payload = {
      product,
      customer_name,
      sales_order: formData.sales_order,
      dispatch_date,
      quantity: Number(quantity),
      input_serial_numbers: serials,
    };
    try {
      setLoading(true);
      if (editId) {
        await API.patch(`product-documentation/outflows/${editId}/`, payload);
        setSuccess('✅ Outflow updated successfully');
      } else {
        await API.post('product-documentation/outflows/', payload);
        setSuccess('✅ Outflow created successfully');
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
      setError(`❌ ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      setLoading(true);
      await API.delete(`product-documentation/outflows/${deleteId}/`);
      setSuccess('✅ Outflow deleted successfully');
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
      setError(`❌ ${errorMsg}`);
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
        Product Outflow
      </Typography>

      <Grid container justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            size="small"
            placeholder="Search by customer name or sales order..."
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
                <TableCell><strong>Product</strong></TableCell>
                <TableCell><strong>Customer Name</strong></TableCell>
                <TableCell><strong>Sales Order</strong></TableCell>
                <TableCell><strong>Dispatch Date</strong></TableCell>
                <TableCell><strong>Quantity</strong></TableCell>
                <TableCell><strong>Serial Numbers</strong></TableCell>
                <TableCell><strong>Actions</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {outflows.length > 0 ? (
                outflows.map((outflow) => (
                  <TableRow
                    key={outflow.id}
                    hover
                    sx={{ '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.04)' } }}
                  >
                    <TableCell onClick={() => setSelectedOutflow(outflow)}>{outflow.product.product_name}</TableCell>
                    <TableCell onClick={() => setSelectedOutflow(outflow)}>{outflow.customer_name}</TableCell>
                    <TableCell onClick={() => setSelectedOutflow(outflow)}>{outflow.sales_order || 'N/A'}</TableCell>
                    <TableCell onClick={() => setSelectedOutflow(outflow)}>{outflow.dispatch_date}</TableCell>
                    <TableCell onClick={() => setSelectedOutflow(outflow)}>{outflow.quantity}</TableCell>
                    <TableCell onClick={() => setSelectedOutflow(outflow)}>
                      {outflow.serial_numbers.length ? outflow.serial_numbers.map(s => s.serial_number).join(', ') : 'N/A'}
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
                  <TableCell colSpan={7}>No outflows found.</TableCell>
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
        <DialogTitle>Outflow Details: {selectedOutflow?.customer_name}</DialogTitle>
        <DialogContent>
          {selectedOutflow && (
            <>
              <Typography variant="body2" gutterBottom>
                <strong>Product:</strong> {selectedOutflow.product.product_name}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Sales Order:</strong> {selectedOutflow.sales_order || 'N/A'}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Dispatch Date:</strong> {selectedOutflow.dispatch_date}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Quantity:</strong> {selectedOutflow.quantity}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Serial Numbers:</strong> {selectedOutflow.serial_numbers.length ? selectedOutflow.serial_numbers.map(s => s.serial_number).join(', ') : 'N/A'}
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
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Select
                name="product"
                value={formData.product}
                onChange={handleChange}
                fullWidth
                required
                displayEmpty
                error={formData.product === '' && error.includes('required')}
              >
                <MenuItem value="" disabled>Select Product</MenuItem>
                {products.map((product) => (
                  <MenuItem key={product.id} value={product.id}>
                    {product.product_name} ({product.sku})
                  </MenuItem>
                ))}
              </Select>
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
            {editId ? 'Update Outflow' : 'Save Outflow'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteOpen} onClose={handleDeleteClose} fullWidth maxWidth="sm">
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>Action cannot be reversed, are you sure you want to continue?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteClose}>Cancel</Button>
          <Button onClick={handleDelete} color="error" variant="contained" disabled={loading}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}