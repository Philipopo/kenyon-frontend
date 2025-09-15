import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Container, Paper, Box, Typography, Button, TextField, InputAdornment, Table, TableHead,
  TableRow, TableCell, TableBody, TableContainer, Pagination, Dialog, DialogTitle,
  DialogContent, DialogContentText, DialogActions, Grid, Alert, FormControlLabel, Checkbox,
  IconButton,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { debounce } from 'lodash';
import API from '../../api';
import { useSearch } from '../../context/SearchContext';

export default function Stocks() {
  const [stocks, setStocks] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [localSearch, setLocalSearch] = useState('');
  const [page, setPage] = useState(1);
  const [openDialog, setOpenDialog] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [editId, setEditId] = useState(null);
  const [formData, setFormData] = useState({
    item: '', location: '', quantity: '', critical: false,
  });
  const [loading, setLoading] = useState(true);
  const [checkingPermissions, setCheckingPermissions] = useState(true);
  const [hasPermission, setHasPermission] = useState(false);
  const [hasUpdatePermission, setHasUpdatePermission] = useState(false);
  const [hasDeletePermission, setHasDeletePermission] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { searchTerm } = useSearch();
  const itemsPerPage = 10;
  const prevSearchTermRef = useRef(searchTerm);
  const prevLocalSearchRef = useRef(localSearch);

  const debouncedSetLocalSearch = debounce((value) => {
    setLocalSearch(value);
    setPage(1);
  }, 500);

  const memoizedSetLocalSearch = useCallback((value) => {
    debouncedSetLocalSearch(value);
  }, [debouncedSetLocalSearch]); // Add debouncedSetLocalSearch

  const fetchStocks = useCallback(async () => {
    try {
      setLoading(true);
      const search = localSearch || searchTerm;
      const response = await API.get('inventory/stocks/', {
        params: { search, page, page_size: itemsPerPage },
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
      });
      console.log('[STOCKS FETCHED]', response.data);
      setStocks(response.data.results || []);
      setTotalPages(Math.ceil(response.data.count / itemsPerPage));
      setError('');
    } catch (err) {
      console.error('Error fetching stocks:', err.response?.data || err.message);
      setError('❌ Failed to fetch stocks: ' + (err.response?.data?.detail || err.message));
      setStocks([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [localSearch, searchTerm, page, itemsPerPage]);

  useEffect(() => {
    const checkPermissions = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        console.log('Access token:', token);
        if (!token) {
          setError('⚠️ No authentication token found. Please log in.');
          setHasPermission(false);
          setCheckingPermissions(false);
          return;
        }
        const pageResponse = await API.get('/auth/permissions/page/stock_records/');
        console.log('Page permission response:', pageResponse.data);
        setHasPermission(pageResponse.data.allowed || false);
        if (!pageResponse.data.allowed) {
          setError(`⚠️ You do not have permission to view this page: ${pageResponse.data.reason || 'No reason provided'}`);
          setCheckingPermissions(false);
          return;
        }
        const [updateResponse, deleteResponse] = await Promise.all([
          API.get('/auth/permissions/action/update_stock_record/'),
          API.get('/auth/permissions/action/delete_stock_record/'),
        ]);
        setHasUpdatePermission(updateResponse.data.allowed || false);
        setHasDeletePermission(deleteResponse.data.allowed || false);
        console.log('Update permission:', updateResponse.data);
        console.log('Delete permission:', deleteResponse.data);
        fetchStocks();
      } catch (err) {
        console.error('Error checking permissions:', err.response?.data || err.message);
        if (err.response?.status === 401) {
          setError('⚠️ Authentication failed. Please log in again.');
        } else if (err.response?.status === 404) {
          setError('⚠️ Permission endpoint not found. Contact support.');
        } else {
          setError(`⚠️ Failed to check permissions: ${err.response?.data?.detail || err.message}`);
        }
        setHasPermission(false);
      } finally {
        setCheckingPermissions(false);
      }
    };
    checkPermissions();
  }, [fetchStocks]);

  useEffect(() => {
    if (hasPermission) {
      if (searchTerm !== prevSearchTermRef.current || localSearch !== prevLocalSearchRef.current) {
        setPage(1);
        prevSearchTermRef.current = searchTerm;
        prevLocalSearchRef.current = localSearch;
      }
      fetchStocks();
    }
  }, [searchTerm, localSearch, page, hasPermission, fetchStocks]);

  const handleOpenDialog = async (stock = null) => {
    if (!hasPermission) {
      setError('⚠️ You do not have permission to view stock records.');
      return;
    }
    try {
      const action = stock ? 'update_stock_record' : 'create_stock_record';
      const actionResponse = await API.get(`/auth/permissions/action/${action}/`);
      console.log(`${action} permission response:`, actionResponse.data);
      if (!actionResponse.data.allowed) {
        setError(`⚠️ You do not have permission to ${stock ? 'update' : 'create'} stock records: ${actionResponse.data.reason || 'No reason provided'}`);
        return;
      }
      if (stock) {
        setFormData({
          item: stock.item?.name || stock.item_name || '', // Fallback to item_name
          location: stock.location || '',
          quantity: stock.quantity.toString(),
          critical: stock.critical,
        });
        setEditId(stock.id);
      } else {
        setFormData({ item: '', location: '', quantity: '', critical: false });
        setEditId(null);
      }
      setOpenDialog(true);
    } catch (err) {
      console.error(`Error checking ${stock ? 'update' : 'create'} permission:`, err.response?.data || err.message);
      setError(`❌ Failed to check ${stock ? 'update' : 'create'} permission: ${err.response?.data?.detail || err.message}`);
    }
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setFormData({ item: '', location: '', quantity: '', critical: false });
    setEditId(null);
    setError('');
    setSuccess('');
  };

  const handleDeleteOpen = (id) => {
    if (!hasDeletePermission) {
      setError('⚠️ You do not have permission to delete stock records.');
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

  const handleFormChange = (event) => {
    const { name, value, type, checked } = event.target;
    setFormData({ ...formData, [name]: type === 'checkbox' ? checked : value });
  };

  const handleFormSubmit = async () => {
    const { item, location, quantity } = formData;
    if (!item || !location || !quantity) {
      setError('⚠️ Please fill in all required fields.');
      return;
    }
    if (Number(quantity) <= 0) {
      setError('⚠️ Quantity must be a positive number.');
      return;
    }
    try {
      const payload = {
        item: item.trim(), // Assuming item is a string name for now; adjust if it should be an ID
        location: location.trim(),
        quantity: Number(quantity),
        critical: formData.critical,
      };
      if (editId) {
        await API.patch(`inventory/stocks/${editId}/`, payload);
        setSuccess('✅ Stock record updated successfully');
      } else {
        await API.post('/inventory/stocks/', payload);
        setSuccess('✅ Stock record created manually successfully');
      }
      fetchStocks();
      handleCloseDialog();
    } catch (err) {
      console.error(`${editId ? 'Updating' : 'Adding'} stock error:`, err.response?.data || err.message);
      let errorMsg = `Failed to ${editId ? 'update' : 'add'} stock: Unable to process request.`;
      if (err.response?.status === 403) {
        errorMsg = `⚠️ Permission denied: ${err.response.data.detail || 'You lack permission to perform this action.'}`;
      } else if (err.response?.status === 400 && err.response?.data) {
        errorMsg = Object.entries(err.response.data)
          .map(([field, msg]) => `${field}: ${Array.isArray(msg) ? msg.join(', ') : msg}`)
          .join('; ');
      } else if (err.response?.data?.detail) {
        errorMsg = err.response.data.detail;
      } else {
        errorMsg = err.message || `Failed to ${editId ? 'update' : 'add'} stock: Network error.`;
      }
      setError(`❌ ${errorMsg}`);
    }
  };

  const handleDelete = async () => {
    try {
      await API.delete(`inventory/stocks/${deleteId}/`);
      setSuccess('✅ Stock record deleted successfully');
      setDeleteOpen(false);
      setDeleteId(null);
      fetchStocks();
    } catch (err) {
      console.error('Error deleting stock:', err.response?.data || err.message);
      let errorMsg = 'Failed to delete stock: Unable to process request.';
      if (err.response?.status === 403) {
        errorMsg = `⚠️ Permission denied: ${err.response.data.detail || 'You lack permission to delete stock records.'}`;
      } else if (err.response?.data?.detail) {
        errorMsg = err.response.data.detail;
      } else {
        errorMsg = err.message || 'Failed to delete stock: Network error.';
      }
      setError(`❌ ${errorMsg}`);
    }
  };

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
    <Container sx={{ mt: 4 }}>
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
      <Paper sx={{ p: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h5">Stock Records</Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog()}>
            Add Stock
          </Button>
        </Box>

        <TextField
          placeholder="Search..."
          value={localSearch}
          onChange={(e) => memoizedSetLocalSearch(e.target.value)} // Use memoizedSetLocalSearch
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ mb: 2, width: '300px' }}
        />

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Item Name</TableCell>
                <TableCell>Created At</TableCell>
                <TableCell>Quantity</TableCell>
                <TableCell>Location</TableCell>
                <TableCell>Critical</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : stocks.length > 0 ? (
                stocks.map((stock) => (
                  <TableRow key={stock.id}>
                    <TableCell>{stock.item_name || stock.item?.name || 'Unknown Item'}</TableCell> {/* Fallback to item_name */}
                    <TableCell>{new Date(stock.created_at).toLocaleString()}</TableCell>
                    <TableCell>{stock.quantity}</TableCell>
                    <TableCell>{stock.location || (stock.storage_bin?.bin_id || 'N/A')}</TableCell>
                    <TableCell>{stock.critical ? 'Yes' : 'No'}</TableCell>
                    <TableCell>
                      <IconButton onClick={() => handleOpenDialog(stock)} disabled={!hasUpdatePermission}>
                        <EditIcon />
                      </IconButton>
                      <IconButton onClick={() => handleDeleteOpen(stock.id)} disabled={!hasDeletePermission}>
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    No stock records found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <Box display="flex" justifyContent="center" mt={2}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={(_, value) => setPage(value)}
            color="primary"
          />
        </Box>
      </Paper>

      <Dialog open={openDialog} onClose={handleCloseDialog}>
        <DialogTitle>{editId ? 'Update Stock' : 'Add Stock'}</DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
              {error}
            </Alert>
          )}
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Item Name"
                name="item"
                value={formData.item}
                onChange={handleFormChange}
                required
                error={formData.item === '' && error.includes('required')}
                helperText={formData.item === '' && error.includes('required') ? 'Item name is required' : ''}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Location"
                name="location"
                value={formData.location}
                onChange={handleFormChange}
                required
                error={formData.location === '' && error.includes('required')}
                helperText={formData.location === '' && error.includes('required') ? 'Location is required' : ''}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Quantity"
                name="quantity"
                type="number"
                value={formData.quantity}
                onChange={handleFormChange}
                required
                error={formData.quantity === '' && error.includes('required')}
                helperText={formData.quantity === '' && error.includes('required') ? 'Quantity is required' : ''}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Checkbox
                    name="critical"
                    checked={formData.critical}
                    onChange={handleFormChange}
                  />
                }
                label="Critical"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button variant="contained" onClick={handleFormSubmit}>
            {editId ? 'Update' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

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