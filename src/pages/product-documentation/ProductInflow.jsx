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

export default function ProductInflow() {
  const [inflows, setInflows] = useState([]);
  const [items, setItems] = useState([]);
  const [batchChoices, setBatchChoices] = useState([]);
  const [formData, setFormData] = useState({
    item: '',
    batch: '',
    vendor: '',
    date_of_delivery: '',
    quantity: '',
    cost: '',
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
  const [selectedInflow, setSelectedInflow] = useState(null);
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

  const fetchInflows = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const searchValue = search || searchTerm;
      const res = await API.get('product-documentation-new/inflows/', {
        params: { search: searchValue, page, page_size: itemsPerPage },
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
      });
      const inflowsData = res.data.results || res.data || [];
      setInflows(inflowsData);
      setTotalPages(Math.ceil((res.data.count || inflowsData.length || 1) / itemsPerPage));
      if (!inflowsData.length) {
        setTimedAlert(setError, '⚠️ No inflows found in the response.');
      }
    } catch (err) {
      const errorMsg = err.response?.status === 401
        ? '⚠️ Authentication failed. Please log in again.'
        : err.response?.status === 404
        ? '❌ Endpoint not found. Please check the backend URL.'
        : `❌ Failed to fetch inflows: ${err.response?.data?.detail || err.message}`;
      setTimedAlert(setError, errorMsg);
      setInflows([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [search, searchTerm, page]);

  const fetchItems = useCallback(async () => {
    try {
      const res = await API.get('inventory/items/', {
        params: { ordering: '-created_at', limit: 15 },
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
      });
      const itemsData = res.data.results || res.data || [];
      setItems(itemsData);
      const batches = [...new Set(itemsData.map(item => item.batch).filter(Boolean))];
      setBatchChoices(batches);
    } catch (err) {
      setTimedAlert(setError, `❌ Failed to fetch items: ${err.response?.data?.detail || err.message}`);
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
        const pageResponse = await API.get('/auth/permissions/page/product_inflow/');
        setHasPermission(pageResponse.data.allowed || false);
        if (!pageResponse.data.allowed) {
          setTimedAlert(setError, `⚠️ You do not have permission to view this page: ${pageResponse.data.reason || 'No reason provided'}`);
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
          fetchItems();
        } else {
          setTimedAlert(setError, '⚠️ You do not have permission to create product inflows.');
        }
      } catch (err) {
        setTimedAlert(setError, `⚠️ Failed to check permissions: ${err.response?.data?.detail || err.message}`);
        setHasPermission(false);
      } finally {
        setCheckingPermissions(false);
      }
    };
    checkPermissions();
  }, [fetchInflows, fetchItems]);

  useEffect(() => {
    if (hasPermission && (search !== prevSearchRef.current || searchTerm !== prevSearchTermRef.current)) {
      setPage(1);
      prevSearchRef.current = search;
      prevSearchTermRef.current = searchTerm;
    }
    if (hasPermission) fetchInflows();
  }, [search, searchTerm, page, hasPermission, fetchInflows]);

  const handleOpen = async (inflow = null) => {
    if (!hasPermission) {
      setTimedAlert(setError, '⚠️ You do not have permission to view product inflows.');
      return;
    }
    try {
      const action = inflow ? 'update_product_inflow' : 'create_product_inflow';
      const actionResponse = await API.get(`/auth/permissions/action/${action}/`);
      if (!actionResponse.data.allowed) {
        setTimedAlert(setError, `⚠️ You do not have permission to ${inflow ? 'update' : 'create'} product inflows: ${actionResponse.data.reason || 'No reason provided'}`);
        return;
      }
      if (inflow) {
        setFormData({
          item: inflow.item || '',
          batch: inflow.batch || '',
          vendor: inflow.vendor || '',
          date_of_delivery: inflow.date_of_delivery || '',
          quantity: inflow.quantity?.toString() || '',
          cost: inflow.cost?.toString() || '',
          input_serial_numbers: inflow.serial_numbers?.map(s => s.serial_number).join(', ') || '',
        });
        setEditId(inflow.id);
      } else {
        setFormData({
          item: '',
          batch: '',
          vendor: '',
          date_of_delivery: '',
          quantity: '',
          cost: '',
          input_serial_numbers: '',
        });
        setEditId(null);
      }
      setOpen(true);
    } catch (err) {
      setTimedAlert(setError, `❌ Failed to check ${inflow ? 'update' : 'create'} permission: ${err.response?.data?.detail || err.message}`);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setFormData({ item: '', batch: '', vendor: '', date_of_delivery: '', quantity: '', cost: '', input_serial_numbers: '' });
    setEditId(null);
    setError('');
    setSuccess('');
  };

  const handleDeleteOpen = (id) => {
    if (!hasDeletePermission) {
      setTimedAlert(setError, '⚠️ You do not have permission to delete inflows.');
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
    const { item, batch, vendor, date_of_delivery, quantity, cost, input_serial_numbers } = formData;
    if (!item || !batch || !vendor || !date_of_delivery || !quantity || !cost) {
      setTimedAlert(setError, '⚠️ Please fill in all required fields.');
      return;
    }
    if (Number(quantity) <= 0 || Number(cost) <= 0) {
      setTimedAlert(setError, '⚠️ Quantity and cost must be positive.');
      return;
    }
    const serials = input_serial_numbers ? input_serial_numbers.split(',').map(s => s.trim()).filter(s => s) : [];
    if (serials.length && serials.length !== Number(quantity)) {
      setTimedAlert(setError, '⚠️ Number of serial numbers must match quantity.');
      return;
    }
    const payload = {
      item,
      batch,
      vendor,
      date_of_delivery,
      quantity: Number(quantity),
      cost: Number(cost),
      input_serial_numbers: serials.join(','),
    };
    try {
      setLoading(true);
      if (editId) {
        await API.patch(`product-documentation-new/inflows/${editId}/`, payload);
        setTimedAlert(setSuccess, '✅ Inflow updated successfully');
      } else {
        await API.post('product-documentation-new/inflows/', payload);
        setTimedAlert(setSuccess, '✅ Inflow created successfully');
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
      setTimedAlert(setError, `❌ ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      setLoading(true);
      await API.delete(`product-documentation-new/inflows/${deleteId}/`);
      setTimedAlert(setSuccess, '✅ Inflow deleted successfully');
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
        Product Inflow
      </Typography>

      <Grid container justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            size="small"
            placeholder="Search by item name, batch, or vendor..."
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
            Add New Inflow
          </Button>
        </Grid>
      </Grid>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Inflow Records
        </Typography>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell><strong>Item Name</strong></TableCell>
                <TableCell><strong>Batch</strong></TableCell>
                <TableCell><strong>Vendor</strong></TableCell>
                <TableCell><strong>Date of Delivery</strong></TableCell>
                <TableCell><strong>Quantity</strong></TableCell>
                <TableCell><strong>Cost</strong></TableCell>
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
              ) : inflows.length > 0 ? (
                inflows.map((inflow, index) => (
                  <TableRow
                    key={inflow.id || `inflow-${index}`}
                    hover
                    sx={{ '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.04)' } }}
                  >
                    <TableCell onClick={() => setSelectedInflow(inflow)}>
                      {inflow.item_name || '—'}
                    </TableCell>
                    <TableCell onClick={() => setSelectedInflow(inflow)}>
                      {inflow.batch || '—'}
                    </TableCell>
                    <TableCell onClick={() => setSelectedInflow(inflow)}>
                      {inflow.vendor || '—'}
                    </TableCell>
                    <TableCell onClick={() => setSelectedInflow(inflow)}>
                      {inflow.date_of_delivery || '—'}
                    </TableCell>
                    <TableCell onClick={() => setSelectedInflow(inflow)}>
                      {inflow.quantity || 0}
                    </TableCell>
                    <TableCell onClick={() => setSelectedInflow(inflow)}>
                      {inflow.cost ? parseFloat(inflow.cost).toLocaleString() : '0.00'}
                    </TableCell>
                    <TableCell onClick={() => setSelectedInflow(inflow)}>
                      {inflow.serial_numbers && inflow.serial_numbers.length
                        ? inflow.serial_numbers.map(s => s.serial_number || '—').join(', ')
                        : '—'}
                    </TableCell>
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
                  <TableCell colSpan={8} align="center">
                    No inflows found. {error && `Error: ${error}`}
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

      <Dialog open={!!selectedInflow} onClose={() => setSelectedInflow(null)} fullWidth maxWidth="sm">
        <DialogTitle>Inflow Details: {selectedInflow?.item_name || '—'}</DialogTitle>
        <DialogContent>
          {selectedInflow && (
            <>
              <Typography variant="body2" gutterBottom>
                <strong>Batch:</strong> {selectedInflow.batch || '—'}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Vendor:</strong> {selectedInflow.vendor || '—'}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Date of Delivery:</strong> {selectedInflow.date_of_delivery || '—'}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Quantity:</strong> {selectedInflow.quantity || 0}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Cost:</strong> {selectedInflow.cost ? parseFloat(selectedInflow.cost).toLocaleString() : '0.00'}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Serial Numbers:</strong> {selectedInflow.serial_numbers && selectedInflow.serial_numbers.length
                  ? selectedInflow.serial_numbers.map(s => s.serial_number || '—').join(', ')
                  : '—'}
              </Typography>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedInflow(null)} variant="contained">
            Close
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={open} onClose={handleClose} fullWidth maxWidth="md">
        <DialogTitle>{editId ? 'Update Product Inflow' : 'Add New Product Inflow'}</DialogTitle>
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
              <FormControl fullWidth required error={formData.item === '' && error.includes('required')}>
                <InputLabel>Item</InputLabel>
                <Select
                  name="item"
                  value={formData.item}
                  onChange={handleChange}
                >
                  <MenuItem value="" disabled>Select Item</MenuItem>
                  {items.map((item) => (
                    <MenuItem key={item.id} value={item.id}>
                      {item.name} (Batch: {item.batch || '—'})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth required error={formData.batch === '' && error.includes('required')}>
                <InputLabel>Batch</InputLabel>
                <Select
                  name="batch"
                  value={formData.batch}
                  onChange={handleChange}
                >
                  <MenuItem value="" disabled>Select Batch</MenuItem>
                  {batchChoices.map((batch) => (
                    <MenuItem key={batch} value={batch}>{batch}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Vendor"
                name="vendor"
                value={formData.vendor}
                onChange={handleChange}
                fullWidth
                required
                error={formData.vendor === '' && error.includes('required')}
                helperText={formData.vendor === '' && error.includes('required') ? 'Vendor is required' : ''}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Date of Delivery"
                name="date_of_delivery"
                type="date"
                value={formData.date_of_delivery}
                onChange={handleChange}
                fullWidth
                required
                InputLabelProps={{ shrink: true }}
                error={formData.date_of_delivery === '' && error.includes('required')}
                helperText={formData.date_of_delivery === '' && error.includes('required') ? 'Date of Delivery is required' : ''}
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
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveInflow} disabled={loading}>
            {loading ? <CircularProgress size={24} /> : editId ? 'Update Inflow' : 'Save Inflow'}
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