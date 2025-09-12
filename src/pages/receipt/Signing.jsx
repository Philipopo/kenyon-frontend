// src/pages/ReceiptSigning.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Container, Typography, Paper, Box, TextField, InputAdornment, Table,
  TableBody, TableCell, TableContainer, TableHead, TableRow, Pagination,
  Alert, CircularProgress, Button, Dialog, DialogTitle, DialogContent,
  DialogActions, Grid, MenuItem, IconButton,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { debounce } from 'lodash';
import api from '../../api';
import { useSearch } from '../../context/SearchContext';

export default function ReceiptSigning() {
  const [hasPageAccess, setHasPageAccess] = useState(false);
  const [canCreateSigningReceipt, setCanCreateSigningReceipt] = useState(false);
  const [canUpdateSigningReceipt, setCanUpdateSigningReceipt] = useState(false);
  const [canDeleteSigningReceipt, setCanDeleteSigningReceipt] = useState(false);
  const [error, setError] = useState('');
  const [checkingPermissions, setCheckingPermissions] = useState(true);
  const [receipts, setReceipts] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [isUpdate, setIsUpdate] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [form, setForm] = useState({ recipient: '', signed_by: '', date: '', status: 'Pending' });
  const [formError, setFormError] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
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

  const fetchReceipts = useCallback(async () => {
    try {
      setLoading(true);
      const searchValue = search || searchTerm;
      const res = await api.get('/receipts/signing/', {
        params: { search: searchValue, page, page_size: itemsPerPage },
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
      });
      console.log('[SIGNING RECEIPTS FETCHED]', res.data);
      setReceipts(res.data.results || []);
      setTotalPages(Math.ceil(res.data.count / itemsPerPage));
      setError('');
    } catch (err) {
      console.error('Error fetching signing receipts:', err.response?.data || err.message);
      setError(`❌ Failed to fetch signing receipts: ${err.response?.data?.detail || err.message}`);
      setReceipts([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [search, searchTerm, page]);

  useEffect(() => {
    const checkPermissions = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        if (!token) {
          setError('⚠️ No authentication token found. Please log in.');
          setHasPageAccess(false);
          setCanCreateSigningReceipt(false);
          setCanUpdateSigningReceipt(false);
          setCanDeleteSigningReceipt(false);
          setCheckingPermissions(false);
          return;
        }
        const pageResponse = await api.get('/auth/permissions/page/signing_receipts/');
        setHasPageAccess(pageResponse.data.allowed || false);
        if (!pageResponse.data.allowed) {
          setError(`⚠️ You do not have permission to view this page: ${pageResponse.data.reason || 'No reason provided'}`);
          setCheckingPermissions(false);
          return;
        }
        const [createResponse, updateResponse, deleteResponse] = await Promise.all([
          api.get('/auth/permissions/action/create_signing_receipt/'),
          api.get('/auth/permissions/action/update_signing_receipt/'),
          api.get('/auth/permissions/action/delete_signing_receipt/'),
        ]);
        setCanCreateSigningReceipt(createResponse.data.allowed || false);
        setCanUpdateSigningReceipt(updateResponse.data.allowed || false);
        setCanDeleteSigningReceipt(deleteResponse.data.allowed || false);
        if (pageResponse.data.allowed) {
          fetchReceipts();
        }
      } catch (err) {
        console.error('Error checking permissions:', err.response?.data || err.message);
        setError(`⚠️ Failed to check permissions: ${err.response?.data?.detail || err.message}`);
        setHasPageAccess(false);
        setCanCreateSigningReceipt(false);
        setCanUpdateSigningReceipt(false);
        setCanDeleteSigningReceipt(false);
      } finally {
        setCheckingPermissions(false);
      }
    };
    checkPermissions();
  }, [fetchReceipts]);

  useEffect(() => {
    if (hasPageAccess && (search !== prevSearchRef.current || searchTerm !== prevSearchTermRef.current)) {
      setPage(1);
      prevSearchRef.current = search;
      prevSearchTermRef.current = searchTerm;
    }
    if (hasPageAccess) fetchReceipts();
  }, [search, searchTerm, page, hasPageAccess, fetchReceipts]);

  const handleFormChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    if (!form.recipient || !form.signed_by || !form.date || !form.status) {
      setFormError('⚠ Please fill all required fields.');
      return;
    }
    if (isUpdate && !canUpdateSigningReceipt) {
      setError('⚠ You do not have permission to update a signing receipt.');
      return;
    }
    if (!isUpdate && !canCreateSigningReceipt) {
      setError('⚠ You do not have permission to create a signing receipt.');
      return;
    }
    try {
      setFormLoading(true);
      setFormError(null);
      const payload = {
        recipient: form.recipient.trim(),
        signed_by: form.signed_by.trim(),
        date: form.date,
        status: form.status,
      };
      if (isUpdate) {
        const res = await api.put(`/receipts/signing/${selectedReceipt.id}/`, payload);
        setReceipts(receipts.map((rec) => (rec.id === res.data.id ? res.data : rec)));
        setFormError('✅ Signing receipt updated successfully.');
      } else {
        const res = await api.post('/receipts/signing/', payload);
        setReceipts([res.data, ...receipts]);
        setFormError('✅ Signing receipt created successfully.');
      }
      setFormOpen(false);
      setForm({ recipient: '', signed_by: '', date: '', status: 'Pending' });
      setIsUpdate(false);
      setSelectedReceipt(null);
      fetchReceipts();
    } catch (err) {
      let errorMsg = `Failed to ${isUpdate ? 'update' : 'create'} signing receipt: Unable to process request.`;
      if (err.response?.status === 400 && err.response?.data) {
        errorMsg = Object.entries(err.response.data)
          .map(([field, msg]) => `${field}: ${Array.isArray(msg) ? msg.join(', ') : msg}`)
          .join('; ');
      } else {
        errorMsg = err.response?.data?.detail || err.message;
      }
      setFormError(`❌ ${errorMsg}`);
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdate = (receipt) => {
    if (!canUpdateSigningReceipt) {
      setError('⚠ You do not have permission to update a signing receipt.');
      return;
    }
    setForm({
      recipient: receipt.recipient,
      signed_by: receipt.signed_by,
      date: receipt.date,
      status: receipt.status,
    });
    setSelectedReceipt(receipt);
    setIsUpdate(true);
    setFormOpen(true);
  };

  const handleDelete = async () => {
    if (!canDeleteSigningReceipt) {
      setError('⚠ You do not have permission to delete a signing receipt.');
      return;
    }
    try {
      await api.delete(`/receipts/signing/${deleteId}/`);
      setReceipts(receipts.filter((rec) => rec.id !== deleteId));
      setError('✅ Signing receipt deleted successfully.');
      setDeleteOpen(false);
      setDeleteId(null);
      fetchReceipts();
    } catch (err) {
      let errorMsg = 'Failed to delete signing receipt: Unable to process request.';
      if (err.response?.status === 403) {
        errorMsg = `⚠ Permission denied: ${err.response.data.detail || 'You lack permission to delete signing receipts.'}`;
      } else {
        errorMsg = err.response?.data?.detail || err.message;
      }
      setError(`❌ ${errorMsg}`);
    }
  };

  const openDeleteDialog = (id) => {
    if (!canDeleteSigningReceipt) {
      setError('⚠ You do not have permission to delete a signing receipt.');
      return;
    }
    setDeleteId(id);
    setDeleteOpen(true);
  };

  if (checkingPermissions) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Typography variant="h6">Loading permissions...</Typography>
        <CircularProgress sx={{ mt: 2 }} />
      </Container>
    );
  }

  if (!hasPageAccess) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error">{error || 'Access Denied: You do not have permission to view this page.'}</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {error && (
        <Alert severity={error.includes('❌') ? 'error' : 'success'} sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        Signing Receipts
      </Typography>

      <Paper elevation={3} sx={{ p: 3 }}>
        <Box display="flex" justifyContent="space-between" mb={2}>
          <TextField
            variant="outlined"
            size="small"
            placeholder="Search by recipient or signed by..."
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
          {canCreateSigningReceipt && (
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => {
              setForm({ recipient: '', signed_by: '', date: '', status: 'Pending' });
              setIsUpdate(false);
              setFormOpen(true);
            }}>
              Add Signing Receipt
            </Button>
          )}
        </Box>

        {loading ? (
          <Box display="flex" justifyContent="center" py={5}>
            <CircularProgress />
          </Box>
        ) : error && error.includes('❌') ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        ) : (
          <>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>S/N</TableCell>
                    <TableCell>Recipient</TableCell>
                    <TableCell>Signed By</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Created By</TableCell>
                    {(canUpdateSigningReceipt || canDeleteSigningReceipt) && <TableCell>Actions</TableCell>}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {receipts.length > 0 ? (
                    receipts.map((receipt, index) => (
                      <TableRow key={receipt.id}>
                        <TableCell>{(page - 1) * itemsPerPage + index + 1}</TableCell>
                        <TableCell>{receipt.recipient}</TableCell>
                        <TableCell>{receipt.signed_by}</TableCell>
                        <TableCell>{new Date(receipt.date).toLocaleDateString()}</TableCell>
                        <TableCell>{receipt.status}</TableCell>
                        <TableCell>{receipt.created_by_name || 'N/A'}</TableCell>
                        {(canUpdateSigningReceipt || canDeleteSigningReceipt) && (
                          <TableCell>
                            {canUpdateSigningReceipt && (
                              <IconButton onClick={() => handleUpdate(receipt)}>
                                <EditIcon />
                              </IconButton>
                            )}
                            {canDeleteSigningReceipt && (
                              <IconButton onClick={() => openDeleteDialog(receipt.id)}>
                                <DeleteIcon />
                              </IconButton>
                            )}
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={canUpdateSigningReceipt || canDeleteSigningReceipt ? 6 : 5} align="center">
                        No signing receipts found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            {totalPages > 1 && (
              <Box display="flex" justifyContent="center" mt={3}>
                <Pagination
                  count={totalPages}
                  page={page}
                  onChange={(_, value) => setPage(value)}
                  color="primary"
                />
              </Box>
            )}
          </>
        )}
      </Paper>

      <Dialog open={formOpen} onClose={() => setFormOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{isUpdate ? 'Update Signing Receipt' : 'Add Signing Receipt'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                label="Recipient"
                name="recipient"
                fullWidth
                value={form.recipient}
                onChange={handleFormChange}
                required
                error={form.recipient === '' && formError?.includes('required')}
                helperText={form.recipient === '' && formError?.includes('required') ? 'Recipient is required' : ''}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Signed By"
                name="signed_by"
                fullWidth
                value={form.signed_by}
                onChange={handleFormChange}
                required
                error={form.signed_by === '' && formError?.includes('required')}
                helperText={form.signed_by === '' && formError?.includes('required') ? 'Signed By is required' : ''}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Date"
                name="date"
                type="date"
                fullWidth
                InputLabelProps={{ shrink: true }}
                value={form.date}
                onChange={handleFormChange}
                required
                error={form.date === '' && formError?.includes('required')}
                helperText={form.date === '' && formError?.includes('required') ? 'Date is required' : ''}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Status"
                name="status"
                select
                fullWidth
                value={form.status}
                onChange={handleFormChange}
                required
                error={form.status === '' && formError?.includes('required')}
                helperText={form.status === '' && formError?.includes('required') ? 'Status is required' : ''}
              >
                <MenuItem value="Pending">Pending</MenuItem>
                <MenuItem value="Signed">Signed</MenuItem>
              </TextField>
            </Grid>
          </Grid>
          {formError && (
            <Alert severity={formError.includes('❌') ? 'error' : 'success'} sx={{ mt: 2 }}>
              {formError}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFormOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmit} disabled={formLoading}>
            {isUpdate ? 'Update' : 'Submit'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete this signing receipt?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteOpen(false)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDelete}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}