// src/pages/product-documentation/ProductInflow.jsx
import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Paper, Grid, TextField, Button, Modal, Box, InputAdornment,
  Pagination, Alert, Table, TableHead, TableRow, TableCell, TableBody, Dialog,
  DialogTitle, DialogContent, DialogContentText, DialogActions, IconButton,
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

export default function ProductInflow() {
  const [inflows, setInflows] = useState([]);
  const [formData, setFormData] = useState({
    product_name: '', sku: '', production_date: '', quantity: '', cost: '', input_serial_numbers: '',
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
  const [selectedInflow, setSelectedInflow] = useState(null);
  const inflowsPerPage = 10;

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
        const pageResponse = await API.get('/auth/permissions/page/product_inflow/');
        setHasPermission(pageResponse.data.allowed || false);
        if (!pageResponse.data.allowed) {
          setError(`⚠️ You do not have permission to view this page: ${pageResponse.data.reason || 'No reason provided'}`);
          setCheckingPermissions(false);
          return;
        }
        const [createResponse, updateResponse, deleteResponse] = await Promise.all([
          API.get('/auth/permissions/action/create_product_inflow/'),
          API.get('/auth/permissions/action/update_product_inflow/'),
          API.get('/auth/permissions/action/delete_product_inflow/'),
        ]);
        setHasUpdatePermission(updateResponse.data.allowed || false);
        setHasDeletePermission(deleteResponse.data.allowed || false);
        if (createResponse.data.allowed) {
          fetchInflows();
        } else {
          setError('⚠️ You do not have permission to create product inflows.');
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

  const fetchInflows = async () => {
    try {
      const res = await API.get('product-documentation/inflows/');
      setInflows(res.data || []);
    } catch (err) {
      setError('❌ Failed to fetch inflows: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleOpen = async (inflow = null) => {
    if (!hasPermission) {
      setError('⚠️ You do not have permission to view product inflows.');
      return;
    }
    try {
      const action = inflow ? 'update_product_inflow' : 'create_product_inflow';
      const actionResponse = await API.get(`/auth/permissions/action/${action}/`);
      if (!actionResponse.data.allowed) {
        setError(`⚠️ You do not have permission to ${inflow ? 'update' : 'create'} product inflows: ${actionResponse.data.reason || 'No reason provided'}`);
        return;
      }
      if (inflow) {
        setFormData({
          product_name: inflow.product_name,
          sku: inflow.sku,
          production_date: inflow.production_date,
          quantity: inflow.quantity.toString(),
          cost: inflow.cost.toString(),
          input_serial_numbers: inflow.serial_numbers.map(s => s.serial_number).join(', '),
        });
        setEditId(inflow.id);
      } else {
        setFormData({
          product_name: '', sku: '', production_date: '', quantity: '', cost: '', input_serial_numbers: '',
        });
        setEditId(null);
      }
      setOpen(true);
    } catch (err) {
      setError(`❌ Failed to check ${inflow ? 'update' : 'create'} permission: ${err.response?.data?.detail || err.message}`);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setFormData({ product_name: '', sku: '', production_date: '', quantity: '', cost: '', input_serial_numbers: '' });
    setEditId(null);
    setError('');
    setSuccess('');
  };

  const handleDeleteOpen = (id) => {
    if (!hasDeletePermission) {
      setError('⚠️ You do not have permission to delete inflows.');
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
  };

  const handleSaveInflow = async () => {
    const { product_name, sku, production_date, quantity, cost, input_serial_numbers } = formData;
    if (!product_name || !sku || !production_date || !quantity || !cost) {
      setError('⚠️ Please fill in all required fields.');
      return;
    }
    if (Number(quantity) <= 0 || Number(cost) <= 0) {
      setError('⚠️ Quantity and cost must be positive.');
      return;
    }
    const serials = input_serial_numbers ? input_serial_numbers.split(',').map(s => s.trim()).filter(s => s) : [];
    if (serials.length && serials.length !== Number(quantity)) {
      setError('⚠️ Number of serial numbers must match quantity.');
      return;
    }
    const payload = {
      product_name,
      sku,
      production_date,
      quantity: Number(quantity),
      cost: Number(cost),
      input_serial_numbers: serials,
    };
    try {
      if (editId) {
        await API.patch(`product-documentation/inflows/${editId}/`, payload);
        setSuccess('✅ Inflow updated successfully');
      } else {
        await API.post('product-documentation/inflows/', payload);
        setSuccess('✅ Inflow created successfully');
      }
      fetchInflows();
      handleClose();
    } catch (err) {
      let errorMsg = `Failed to ${editId ? 'update' : 'add'} inflow: Unable to process request.`;
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
      await API.delete(`product-documentation/inflows/${deleteId}/`);
      setSuccess('✅ Inflow deleted successfully');
      setDeleteOpen(false);
      setDeleteId(null);
      fetchInflows();
    } catch (err) {
      let errorMsg = 'Failed to delete inflow: Unable to process request.';
      if (err.response?.status === 403) {
        errorMsg = `⚠️ Permission denied: ${err.response.data.detail || 'You lack permission to delete inflows.'}`;
      } else {
        errorMsg = err.response?.data?.detail || err.message;
      }
      setError(`❌ ${errorMsg}`);
    }
  };

  const filteredInflows = inflows.filter((inflow) =>
    Object.values(inflow).some((val) => String(val).toLowerCase().includes(search.toLowerCase()))
  );

  const paginatedInflows = filteredInflows.slice((page - 1) * inflowsPerPage, page * inflowsPerPage);

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
        Product Inflow
      </Typography>

      <Grid container justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            size="small"
            placeholder="Search inflows..."
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
            Add New Inflow
          </Button>
        </Grid>
      </Grid>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Inflow Records
        </Typography>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell><strong>Product Name</strong></TableCell>
              <TableCell><strong>SKU</strong></TableCell>
              <TableCell><strong>Serial Numbers</strong></TableCell>
              <TableCell><strong>Production Date</strong></TableCell>
              <TableCell><strong>Quantity</strong></TableCell>
              <TableCell><strong>Cost</strong></TableCell>
              <TableCell><strong>Actions</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedInflows.length > 0 ? (
              paginatedInflows.map((inflow) => (
                <TableRow
                  key={inflow.id}
                  hover
                  sx={{ '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.04)' } }}
                >
                  <TableCell onClick={() => setSelectedInflow(inflow)}>{inflow.product_name}</TableCell>
                  <TableCell onClick={() => setSelectedInflow(inflow)}>{inflow.sku}</TableCell>
                  <TableCell onClick={() => setSelectedInflow(inflow)}>
                    {inflow.serial_numbers.length ? inflow.serial_numbers.map(s => s.serial_number).join(', ') : 'N/A'}
                  </TableCell>
                  <TableCell onClick={() => setSelectedInflow(inflow)}>{inflow.production_date}</TableCell>
                  <TableCell onClick={() => setSelectedInflow(inflow)}>{inflow.quantity}</TableCell>
                  <TableCell onClick={() => setSelectedInflow(inflow)}>{inflow.cost}</TableCell>
                  <TableCell>
                    <IconButton onClick={() => handleOpen(inflow)} disabled={!hasUpdatePermission}>
                      <EditIcon />
                    </IconButton>
                    <IconButton onClick={() => handleDeleteOpen(inflow.id)} disabled={!hasDeletePermission}>
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7}>No inflows found.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {filteredInflows.length > inflowsPerPage && (
          <Box mt={4} display="flex" justifyContent="center">
            <Pagination
              count={Math.ceil(filteredInflows.length / inflowsPerPage)}
              page={page}
              onChange={(_, value) => setPage(value)}
              color="primary"
            />
          </Box>
        )}
      </Paper>

      <Modal open={!!selectedInflow} onClose={() => setSelectedInflow(null)}>
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
          {selectedInflow && (
            <>
              <Typography variant="h6" gutterBottom>
                Inflow Details: {selectedInflow.product_name}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>SKU:</strong> {selectedInflow.sku}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Serial Numbers:</strong> {selectedInflow.serial_numbers.length ? selectedInflow.serial_numbers.map(s => s.serial_number).join(', ') : 'N/A'}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Production Date:</strong> {selectedInflow.production_date}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Quantity:</strong> {selectedInflow.quantity}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Cost:</strong> {selectedInflow.cost}
              </Typography>
              <Box sx={{ mt: 3, textAlign: 'right' }}>
                <Button onClick={() => setSelectedInflow(null)} variant="contained">
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
            {editId ? 'Update Product Inflow' : 'Add New Product Inflow'}
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <TextField
                label="Product Name"
                name="product_name"
                value={formData.product_name}
                onChange={handleChange}
                fullWidth
                required
                error={formData.product_name === '' && error.includes('required')}
                helperText={formData.product_name === '' && error.includes('required') ? 'Product Name is required' : ''}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="SKU"
                name="sku"
                value={formData.sku}
                onChange={handleChange}
                fullWidth
                required
                error={formData.sku === '' && error.includes('required')}
                helperText={formData.sku === '' && error.includes('required') ? 'SKU is required' : ''}
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
                helperText="Enter serial numbers separated by commas (e.g., SN001, SN002). Must match quantity."
                error={error.includes('serial numbers')}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Production Date"
                name="production_date"
                type="date"
                value={formData.production_date}
                onChange={handleChange}
                fullWidth
                required
                InputLabelProps={{ shrink: true }}
                error={formData.production_date === '' && error.includes('required')}
                helperText={formData.production_date === '' && error.includes('required') ? 'Production Date is required' : ''}
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
            <Grid item xs={6}>
              <TextField
                label="Cost"
                name="cost"
                type="number"
                value={formData.cost}
                onChange={handleChange}
                fullWidth
                required
                error={formData.cost === '' && error.includes('required')}
                helperText={formData.cost === '' && error.includes('required') ? 'Cost is required' : ''}
              />
            </Grid>
            <Grid item xs={12} textAlign="right">
              <Button onClick={handleClose} sx={{ mr: 1 }}>
                Cancel
              </Button>
              <Button variant="contained" onClick={handleSaveInflow}>
                {editId ? 'Update Inflow' : 'Save Inflow'}
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