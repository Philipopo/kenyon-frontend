// src/pages/inventory/ExpiryTracking.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Container, Typography, Paper, Table, TableHead, TableBody, TableRow, TableCell,
  Chip, Button, TextField, InputAdornment, Pagination, Box, Alert, Dialog, DialogTitle,
  DialogContent, DialogContentText, DialogActions, Grid, IconButton,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { format, differenceInDays } from 'date-fns';
import { debounce } from 'lodash'; // Add lodash for debouncing
import API from '../../api';
import { useSearch } from '../../context/SearchContext';

export default function ExpiryTracking() {
  const [items, setItems] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [localSearch, setLocalSearch] = useState('');
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [checkingPermissions, setCheckingPermissions] = useState(true);
  const [hasPermission, setHasPermission] = useState(false);
  const [hasUpdatePermission, setHasUpdatePermission] = useState(false);
  const [hasDeletePermission, setHasDeletePermission] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [editId, setEditId] = useState(null);
  const [formData, setFormData] = useState({
    part_number: '', batch: '', quantity: '', expiry_date: '',
  });
  const { searchTerm } = useSearch(); // Use global searchTerm
  const itemsPerPage = 10;
  const prevSearchTermRef = useRef(searchTerm);
  const prevLocalSearchRef = useRef(localSearch);

  // Debounced local search handler
  const debouncedSetLocalSearch = useCallback(
    (value) => {
      const debounced = debounce(() => {
        setLocalSearch(value);
        setPage(1);
      }, 500);
      debounced();
    },
    []
  );

  const fetchItems = useCallback(async () => {
    try {
      const search = localSearch || searchTerm; // Prefer localSearch, fallback to global searchTerm
      const res = await API.get('inventory/expiries/', {
        params: { search, page, page_size: itemsPerPage },
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
      });
      console.log('[EXPIRY ITEMS FETCHED]', res.data);
      setItems(res.data.results || []);
      setTotalPages(Math.ceil(res.data.count / itemsPerPage));
      setError('');
    } catch (err) {
      console.error('Error fetching expired items:', err.response?.data || err.message);
      setError('❌ Failed to fetch expired items: ' + (err.response?.data?.detail || err.message));
      setItems([]);
      setTotalPages(1);
    }
  }, [searchTerm, localSearch, page, itemsPerPage]);



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
        const pageResponse = await API.get('/auth/permissions/page/expired_items/');
        console.log('Page permission response:', pageResponse.data);
        setHasPermission(pageResponse.data.allowed || false);
        if (!pageResponse.data.allowed) {
          setError(`⚠️ You do not have permission to view this page: ${pageResponse.data.reason || 'No reason provided'}`);
          setCheckingPermissions(false);
          return;
        }
        const [updateResponse, deleteResponse] = await Promise.all([
          API.get('/auth/permissions/action/update_expiry_item/'),
          API.get('/auth/permissions/action/delete_expiry_item/'),
        ]);
        setHasUpdatePermission(updateResponse.data.allowed || false);
        setHasDeletePermission(deleteResponse.data.allowed || false);
        console.log('Update permission:', updateResponse.data);
        console.log('Delete permission:', deleteResponse.data);
        fetchItems();
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
  }, [fetchItems]); // Already includes fetchItems, so no change needed




   useEffect(() => {
    if (hasPermission) {
      if (searchTerm !== prevSearchTermRef.current || localSearch !== prevLocalSearchRef.current) {
        setPage(1);
        prevSearchTermRef.current = searchTerm;
        prevLocalSearchRef.current = localSearch;
      }
      fetchItems();
    }
  }, [searchTerm, localSearch, page, hasPermission, fetchItems]); // Already includes fetchItems

  const handleRecall = async (batchId) => {
    try {
      await API.post(`/inventory/recall/${batchId}/`, {});
      setSuccess(`✅ Recall initiated for batch: ${batchId}`);
      fetchItems();
    } catch (err) {
      console.error('Error initiating recall:', err.response?.data || err.message);
      setError(`❌ Failed to initiate recall: ${err.response?.data?.detail || err.message}`);
    }
  };

  const handleEditOpen = (item) => {
    if (!hasUpdatePermission) {
      setError('⚠️ You do not have permission to update expired items.');
      return;
    }
    setFormData({
      part_number: item.part_number,
      batch: item.batch,
      quantity: item.quantity.toString(),
      expiry_date: item.expiry_date,
    });
    setEditId(item.id);
    setOpenEditDialog(true);
  };

  const handleEditClose = () => {
    setOpenEditDialog(false);
    setFormData({ part_number: '', batch: '', quantity: '', expiry_date: '' });
    setEditId(null);
    setError('');
    setSuccess('');
  };

  const handleDeleteOpen = (id) => {
    if (!hasDeletePermission) {
      setError('⚠️ You do not have permission to delete expired items.');
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

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFormSubmit = async () => {
    const { part_number, batch, quantity, expiry_date } = formData;
    if (!part_number || !batch || !quantity || !expiry_date) {
      setError('⚠️ Please fill in all required fields.');
      return;
    }
    if (Number(quantity) <= 0) {
      setError('⚠️ Quantity must be a positive number.');
      return;
    }
    try {
      const payload = {
        part_number: part_number.trim(),
        batch: batch.trim(),
        quantity: Number(quantity),
        expiry_date,
      };
      await API.patch(`inventory/expiries/${editId}/`, payload);
      setSuccess('✅ Item updated successfully');
      setOpenEditDialog(false);
      setFormData({ part_number: '', batch: '', quantity: '', expiry_date: '' });
      setEditId(null);
      fetchItems();
    } catch (err) {
      console.error('Updating item error:', err.response?.data || err.message);
      let errorMsg = 'Failed to update item: Unable to process request.';
      if (err.response?.status === 403) {
        errorMsg = `⚠️ Permission denied: ${err.response.data.detail || 'You lack permission to perform this action.'}`;
      } else if (err.response?.status === 400 && err.response?.data) {
        errorMsg = Object.entries(err.response.data)
          .map(([field, msg]) => `${field}: ${Array.isArray(msg) ? msg.join(', ') : msg}`)
          .join('; ');
      } else if (err.response?.data?.detail) {
        errorMsg = err.response.data.detail;
      } else {
        errorMsg = err.message || 'Failed to update item: Network error.';
      }
      setError(`❌ ${errorMsg}`);
    }
  };

  const handleDelete = async () => {
    try {
      await API.delete(`inventory/expiries/${deleteId}/`);
      setSuccess('✅ Item deleted successfully');
      setDeleteOpen(false);
      setDeleteId(null);
      fetchItems();
    } catch (err) {
      console.error('Error deleting item:', err.response?.data || err.message);
      let errorMsg = 'Failed to delete item: Unable to process request.';
      if (err.response?.status === 403) {
        errorMsg = `⚠️ Permission denied: ${err.response.data.detail || 'You lack permission to delete items.'}`;
      } else if (err.response?.data?.detail) {
        errorMsg = err.response.data.detail;
      } else {
        errorMsg = err.message || 'Failed to delete item: Network error.';
      }
      setError(`❌ ${errorMsg}`);
    }
  };

  const getExpiryStatus = (dateStr) => {
    const today = new Date();
    const expiry = new Date(dateStr);
    const daysLeft = differenceInDays(expiry, today);
    return {
      label: 'Expired',
      color: 'error',
      daysLeft,
    };
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
      <Typography variant="h4" gutterBottom>
        Expired Items
      </Typography>
      <Typography variant="subtitle1" sx={{ mb: 3 }}>
        These items have already passed their expiry date.
      </Typography>

      <Box display="flex" justifyContent="flex-end" sx={{ mb: 2 }}>
        <TextField
          size="small"
          placeholder="Search..."
          value={localSearch}
          onChange={(e) => debouncedSetLocalSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      <Paper elevation={3} sx={{ p: 3, overflowX: 'auto' }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell><strong>Part Number</strong></TableCell>
              <TableCell><strong>Batch</strong></TableCell>
              <TableCell><strong>Quantity</strong></TableCell>
              <TableCell><strong>Expiry Date</strong></TableCell>
              <TableCell><strong>Status</strong></TableCell>
              <TableCell><strong>Actions</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.length > 0 ? (
              items.map((item) => {
                const status = getExpiryStatus(item.expiry_date);
                return (
                  <TableRow key={item.id}>
                    <TableCell>{item.part_number}</TableCell>
                    <TableCell>{item.batch}</TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>{format(new Date(item.expiry_date), 'yyyy-MM-dd')}</TableCell>
                    <TableCell>
                      <Chip label={status.label} color={status.color} size="small" />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outlined"
                        color="error"
                        size="small"
                        onClick={() => handleRecall(item.batch)}
                        sx={{ mr: 1 }}
                      >
                        Recall Batch
                      </Button>
                      <IconButton onClick={() => handleEditOpen(item)} disabled={!hasUpdatePermission}>
                        <EditIcon />
                      </IconButton>
                      <IconButton onClick={() => handleDeleteOpen(item.id)} disabled={!hasDeletePermission}>
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={6}>No expired items found.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        <Box mt={4} display="flex" justifyContent="center">
          <Pagination
            count={totalPages}
            page={page}
            onChange={(_, value) => setPage(value)}
            color="primary"
          />
        </Box>
      </Paper>

      <Dialog open={openEditDialog} onClose={handleEditClose}>
        <DialogTitle>Update Expired Item</DialogTitle>
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
                label="Part Number"
                name="part_number"
                value={formData.part_number}
                onChange={handleFormChange}
                required
                error={formData.part_number === '' && error.includes('required')}
                helperText={formData.part_number === '' && error.includes('required') ? 'Part number is required' : ''}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Batch"
                name="batch"
                value={formData.batch}
                onChange={handleFormChange}
                required
                error={formData.batch === '' && error.includes('required')}
                helperText={formData.batch === '' && error.includes('required') ? 'Batch is required' : ''}
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
              <TextField
                fullWidth
                label="Expiry Date"
                name="expiry_date"
                type="date"
                value={formData.expiry_date}
                onChange={handleFormChange}
                InputLabelProps={{ shrink: true }}
                required
                error={formData.expiry_date === '' && error.includes('required')}
                helperText={formData.expiry_date === '' && error.includes('required') ? 'Expiry date is required' : ''}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleEditClose}>Cancel</Button>
          <Button variant="contained" onClick={handleFormSubmit}>
            Update
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