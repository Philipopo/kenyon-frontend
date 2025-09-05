// src/pages/product-documentation/ProductOutflow.jsx
import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Paper, Grid, TextField, Button, Modal, Box, InputAdornment,
  Pagination, Alert, Table, TableHead, TableRow, TableCell, TableBody, Dialog,
  DialogTitle, DialogContent, DialogContentText, DialogActions, IconButton, Select, MenuItem,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import API from '../../api';

const modalStyle = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 700,
  bgcolor: 'background.paper',
  boxShadow: 24,
  p: 4,
  borderRadius: 2,
};

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
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [checkingPermissions, setCheckingPermissions] = useState(true);
  const [hasPermission, setHasPermission] = useState(false);
  const [hasUpdatePermission, setHasUpdatePermission] = useState(false);
  const [hasDeletePermission, setHasDeletePermission] = useState(false);
  const [selectedOutflow, setSelectedOutflow] = useState(null);
  const outflowsPerPage = 10;

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
        setError(`⚠️ Failed to check permissions: ${err.response?.data?.detail || err.message}`);
        setHasPermission(false);
      } finally {
        setCheckingPermissions(false);
      }
    };
    checkPermissions();
  }, []);

  const fetchOutflows = async () => {
    try {
      const res = await API.get('product-documentation/outflows/');
      setOutflows(res.data || []);
    } catch (err) {
      setError('❌ Failed to fetch outflows: ' + (err.response?.data?.detail || err.message));
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await API.get('product-documentation/inflows/');
      setProducts(res.data || []);
    } catch (err) {
      setError('❌ Failed to fetch products: ' + (err.response?.data?.detail || err.message));
    }
  };

  const fetchAvailableSerials = async (productId) => {
    if (!productId) return;
    try {
      const res = await API.get(`product-documentation/inflows/${productId}/`);
      setAvailableSerials(res.data.serial_numbers.filter(s => s.status === 'in_stock').map(s => s.serial_number));
    } catch (err) {
      setError('❌ Failed to fetch available serial numbers: ' + (err.response?.data?.detail || err.message));
    }
  };

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
        fetchAvailableSerials(outflow.product.id);
      } else {
        setFormData({
          product: '', customer_name: '', sales_order: '', dispatch_date: '', quantity: '', input_serial_numbers: '',
        });
        setEditId(null);
        setAvailableSerials([]);
      }
      setOpen(true);
    } catch (err) {
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
    }
  };

  const handleDelete = async () => {
    try {
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
    }
  };

  const filteredOutflows = outflows.filter((outflow) =>
    Object.values(outflow).some((val) => String(val).toLowerCase().includes(search.toLowerCase()))
  );

  const paginatedOutflows = filteredOutflows.slice((page - 1) * outflowsPerPage, page * outflowsPerPage);

  if (checkingPermissions) {
    return (
      <Container>
        <Typography variant="h6" sx={{ mt: 4 }}>
          Loading permissions...
        </Typography>
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
            placeholder="Search outflows..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
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
            {paginatedOutflows.length > 0 ? (
              paginatedOutflows.map((outflow) => (
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

        {filteredOutflows.length > outflowsPerPage && (
          <Box mt={4} display="flex" justifyContent="center">
            <Pagination
              count={Math.ceil(filteredOutflows.length / outflowsPerPage)}
              page={page}
              onChange={(_, value) => setPage(value)}
              color="primary"
            />
          </Box>
        )}
      </Paper>

      <Modal open={!!selectedOutflow} onClose={() => setSelectedOutflow(null)}>
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 400,
            bgcolor: 'background.paper',
            borderRadius: 2,
            boxShadow: 24,
            p: 4,
            outline: 'none',
          }}
        >
          {selectedOutflow && (
            <>
              <Typography variant="h6" gutterBottom>
                Outflow Details: {selectedOutflow.customer_name}
              </Typography>
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
              <Box sx={{ mt: 3, textAlign: 'right' }}>
                <Button onClick={() => setSelectedOutflow(null)} variant="contained">
                  Close
                </Button>
              </Box>
            </>
          )}
        </Box>
      </Modal>

      <Modal open={open} onClose={handleClose}>
        <Box sx={modalStyle}>
          <Typography variant="h6" gutterBottom>
            {editId ? 'Update Product Outflow' : 'Add New Product Outflow'}
          </Typography>
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
            <Grid item xs={12} textAlign="right">
              <Button onClick={handleClose} sx={{ mr: 1 }}>
                Cancel
              </Button>
              <Button variant="contained" onClick={handleSaveOutflow}>
                {editId ? 'Update Outflow' : 'Save Outflow'}
              </Button>
            </Grid>
          </Grid>
        </Box>
      </Modal>

      <Dialog open={deleteOpen} onClose={handleDeleteClose}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Action cannot be reversed, are you sure you want to continue?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteClose}>Cancel</Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}