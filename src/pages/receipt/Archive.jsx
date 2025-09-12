import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Container, Typography, Paper, Box, TextField, InputAdornment, Table,
  TableBody, TableCell, TableContainer, TableHead, TableRow, Pagination,
  Alert, CircularProgress, Button, Dialog, DialogTitle, DialogContent,
  DialogActions, Grid, IconButton,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { debounce } from 'lodash';
import api from '../../api';
import { useSearch } from '../../context/SearchContext';

export default function ReceiptArchive() {
  const [hasPageAccess, setHasPageAccess] = useState(false);
  const [canCreateReceipt, setCanCreateReceipt] = useState(false);
  const [canUpdateReceipt, setCanUpdateReceipt] = useState(false);
  const [canDeleteReceipt, setCanDeleteReceipt] = useState(false);
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
  const [form, setForm] = useState({ reference: '', issued_by: '', date: '', amount: '' });
  const [formError, setFormError] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const { searchTerm } = useSearch();
  const itemsPerPage = 10;
  const prevSearchTermRef = useRef(searchTerm);
  const prevSearchRef = useRef(search);

  // eslint-disable-next-line react-hooks/exhaustive-deps
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
      const res = await api.get('/receipts/receipts/', {
        params: { search: searchValue, page, page_size: itemsPerPage },
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
      });
      console.log('[RECEIPTS FETCHED]', res.data);
      setReceipts(res.data.results || []);
      setTotalPages(Math.ceil(res.data.count / itemsPerPage));
      setError('');
    } catch (err) {
      console.error('Error fetching receipts:', err.response?.data || err.message);
      setError(`❌ Failed to fetch receipts: ${err.response?.data?.detail || err.message}`);
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
          setCanCreateReceipt(false);
          setCanUpdateReceipt(false);
          setCanDeleteReceipt(false);
          setCheckingPermissions(false);
          return;
        }
        const pageResponse = await api.get('/auth/permissions/page/receipt_archive/');
        setHasPageAccess(pageResponse.data.allowed || false);
        if (!pageResponse.data.allowed) {
          setError(`⚠️ You do not have permission to view this page: ${pageResponse.data.reason || 'No reason provided'}`);
          setCheckingPermissions(false);
          return;
        }
        const [createResponse, updateResponse, deleteResponse] = await Promise.all([
          api.get('/auth/permissions/action/create_receipt/'),
          api.get('/auth/permissions/action/update_receipt/'),
          api.get('/auth/permissions/action/delete_receipt/'),
        ]);
        setCanCreateReceipt(createResponse.data.allowed || false);
        setCanUpdateReceipt(updateResponse.data.allowed || false);
        setCanDeleteReceipt(deleteResponse.data.allowed || false);
        if (pageResponse.data.allowed) {
          fetchReceipts();
        }
      } catch (err) {
        console.error('Error checking permissions:', err.response?.data || err.message);
        setError(`⚠️ Failed to check permissions: ${err.response?.data?.detail || err.message}`);
        setHasPageAccess(false);
        setCanCreateReceipt(false);
        setCanUpdateReceipt(false);
        setCanDeleteReceipt(false);
      } finally {
        setCheckingPermissions(false);
      }
    };
    checkPermissions();
  }, [fetchReceipts]);

  useEffect(() => {
    if (hasPageAccess && (search !== prevSearchRef.current || searchTerm !== prevSearchRef.current)) {
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
    if (!form.reference || !form.issued_by || !form.date || !form.amount) {
      setFormError('⚠ Please fill all required fields.');
      return;
    }
    if (parseFloat(form.amount) <= 0) {
      setFormError('⚠ Amount must be positive.');
      return;
    }
    if (isUpdate && !canUpdateReceipt) {
      setFormError('⚠ You do not have permission to update a receipt.');
      return;
    }
    if (!isUpdate && !canCreateReceipt) {
      setFormError('⚠ You do not have permission to create a receipt.');
      return;
    }
    try {
      setFormLoading(true);
      setFormError(null);
      const payload = {
        reference: form.reference.trim(),
        issued_by: form.issued_by.trim(),
        date: form.date,
        amount: parseFloat(form.amount),
      };
      if (isUpdate) {
        const res = await api.put(`/receipts/receipts/${selectedReceipt.id}/`, payload);
        setReceipts(receipts.map((rec) => (rec.id === res.data.id ? res.data : rec)));
        setFormError('✅ Receipt updated successfully.');
      } else {
        const res = await api.post('/receipts/receipts/', payload);
        setReceipts([res.data, ...receipts]);
        setFormError('✅ Receipt created successfully.');
      }
      setFormOpen(false);
      setForm({ reference: '', issued_by: '', date: '', amount: '' });
      setIsUpdate(false);
      setSelectedReceipt(null);
      fetchReceipts();
    } catch (err) {
      let errorMsg = `Failed to ${isUpdate ? 'update' : 'create'} receipt: Unable to process request.`;
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
    if (!canUpdateReceipt) {
      setError('⚠ You do not have permission to update a receipt.');
      return;
    }
    setForm({
      reference: receipt.reference,
      issued_by: receipt.issued_by,
      date: receipt.date,
      amount: receipt.amount.toString(),
    });
    setSelectedReceipt(receipt);
    setIsUpdate(true);
    setFormOpen(true);
  };

  const handleDelete = async () => {
    if (!canDeleteReceipt) {
      setError('⚠ You do not have permission to delete a receipt.');
      return;
    }
    try {
      await api.delete(`/receipts/receipts/${deleteId}/`);
      setReceipts(receipts.filter((rec) => rec.id !== deleteId));
      setError('✅ Receipt deleted successfully.');
      setDeleteOpen(false);
      setDeleteId(null);
      fetchReceipts();
    } catch (err) {
      let errorMsg = 'Failed to delete receipt: Unable to process request.';
      if (err.response?.status === 403) {
        errorMsg = `⚠ Permission denied: ${err.response.data.detail || 'You lack permission to delete receipts.'}`;
      } else {
        errorMsg = err.response?.data?.detail || err.message;
      }
      setError(`❌ ${errorMsg}`);
    }
  };

  const openDeleteDialog = (id) => {
    if (!canDeleteReceipt) {
      setError('⚠ You do not have permission to delete a receipt.');
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
        Receipt Archive
      </Typography>

      <Paper elevation={3} sx={{ p: 3 }}>
        <Box display="flex" justifyContent="space-between" mb={2}>
          <TextField
            variant="outlined"
            size="small"
            placeholder="Search by reference or issued by..."
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
          {canCreateReceipt && (
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => {
              setForm({ reference: '', issued_by: '', date: '', amount: '' });
              setIsUpdate(false);
              setFormOpen(true);
            }}>
              Add Receipt
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
                    <TableCell>Reference</TableCell>
                    <TableCell>Issued By</TableCell>
                    <TableCell>Amount</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Created By</TableCell>
                    {(canUpdateReceipt || canDeleteReceipt) && <TableCell>Actions</TableCell>}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {receipts.length > 0 ? (
                    receipts.map((receipt, index) => (
                      <TableRow key={receipt.id}>
                        <TableCell>{(page - 1) * itemsPerPage + index + 1}</TableCell>
                        <TableCell>{receipt.reference}</TableCell>
                        <TableCell>{receipt.issued_by}</TableCell>
                        <TableCell>₦{parseFloat(receipt.amount).toLocaleString()}</TableCell>
                        <TableCell>{new Date(receipt.date).toLocaleDateString()}</TableCell>
                        <TableCell>{receipt.created_by_name || 'N/A'}</TableCell>
                        {(canUpdateReceipt || canDeleteReceipt) && (
                          <TableCell>
                            {canUpdateReceipt && (
                              <IconButton onClick={() => handleUpdate(receipt)}>
                                <EditIcon />
                              </IconButton>
                            )}
                            {canDeleteReceipt && (
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
                      <TableCell colSpan={canUpdateReceipt || canDeleteReceipt ? 6 : 5} align="center">
                        No receipts found.
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
        <DialogTitle>{isUpdate ? 'Update Receipt' : 'Add Receipt'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                label="Reference"
                name="reference"
                fullWidth
                value={form.reference}
                onChange={handleFormChange}
                required
                error={form.reference === '' && formError?.includes('required')}
                helperText={form.reference === '' && formError?.includes('required') ? 'Reference is required' : ''}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Issued By"
                name="issued_by"
                fullWidth
                value={form.issued_by}
                onChange={handleFormChange}
                required
                error={form.issued_by === '' && formError?.includes('required')}
                helperText={form.issued_by === '' && formError?.includes('required') ? 'Issued By is required' : ''}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Amount"
                name="amount"
                type="number"
                fullWidth
                value={form.amount}
                onChange={handleFormChange}
                required
                error={(form.amount === '' || parseFloat(form.amount) <= 0) && formError?.includes('Amount')}
                helperText={(form.amount === '' || parseFloat(form.amount) <= 0) && formError?.includes('Amount') ? 'Amount must be positive' : ''}
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
          <Typography>Are you sure you want to delete this receipt?</Typography>
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