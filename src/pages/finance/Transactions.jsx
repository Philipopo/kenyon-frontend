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

export default function Transactions() {
  const [hasPageAccess, setHasPageAccess] = useState(false);
  const [canCreateTransaction, setCanCreateTransaction] = useState(false);
  const [canUpdateTransaction, setCanUpdateTransaction] = useState(false);
  const [canDeleteTransaction, setCanDeleteTransaction] = useState(false);
  const [error, setError] = useState('');
  const [checkingPermissions, setCheckingPermissions] = useState(true);
  const [transactions, setTransactions] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [isUpdate, setIsUpdate] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [form, setForm] = useState({ ref: '', type: '', amount: '', date: '' });
  const [formError, setFormError] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const { searchTerm } = useSearch();
  const itemsPerPage = 10;
  const prevSearchTermRef = useRef(searchTerm);
  const prevSearchRef = useRef(search);

  // Debounced local search handler
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedSetSearch = useCallback(
    debounce((value) => {
      setSearch(value);
      setPage(1);
    }, 500),
    []
  );

  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true);
      const searchValue = search || searchTerm;
      const res = await api.get('/finance/transactions/', {
        params: { search: searchValue, page, page_size: itemsPerPage },
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
      });
      console.log('[TRANSACTIONS FETCHED]', res.data);
      setTransactions(res.data.results || []);
      setTotalPages(Math.ceil(res.data.count / itemsPerPage));
      setError('');
    } catch (err) {
      console.error('Error fetching transactions:', err.response?.data || err.message);
      setError(`❌ Failed to fetch transactions: ${err.response?.data?.detail || err.message}`);
      setTransactions([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [search, searchTerm, page, itemsPerPage]);

  useEffect(() => {
    const checkPermissions = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        if (!token) {
          setError('⚠️ No authentication token found. Please log in.');
          setHasPageAccess(false);
          setCanCreateTransaction(false);
          setCanUpdateTransaction(false);
          setCanDeleteTransaction(false);
          setCheckingPermissions(false);
          return;
        }
        const pageResponse = await api.get('/auth/permissions/page/finance_transactions/');
        setHasPageAccess(pageResponse.data.allowed || false);
        if (!pageResponse.data.allowed) {
          setError(`⚠️ You do not have permission to view this page: ${pageResponse.data.reason || 'No reason provided'}`);
          setCheckingPermissions(false);
          return;
        }
        const [createResponse, updateResponse, deleteResponse] = await Promise.all([
          api.get('/auth/permissions/action/create_finance_transaction/'),
          api.get('/auth/permissions/action/update_finance_transaction/'),
          api.get('/auth/permissions/action/delete_finance_transaction/'),
        ]);
        setCanCreateTransaction(createResponse.data.allowed || false);
        setCanUpdateTransaction(updateResponse.data.allowed || false);
        setCanDeleteTransaction(deleteResponse.data.allowed || false);
        if (pageResponse.data.allowed) {
          fetchTransactions();
        }
      } catch (err) {
        console.error('Error checking permissions:', err.response?.data || err.message);
        setError(`⚠️ Failed to check permissions: ${err.response?.data?.detail || err.message}`);
        setHasPageAccess(false);
        setCanCreateTransaction(false);
        setCanUpdateTransaction(false);
        setCanDeleteTransaction(false);
      } finally {
        setCheckingPermissions(false);
      }
    };
    checkPermissions();
  }, [fetchTransactions]);

  useEffect(() => {
    if (hasPageAccess && (search !== prevSearchRef.current || searchTerm !== prevSearchTermRef.current)) {
      setPage(1);
      prevSearchRef.current = search;
      prevSearchTermRef.current = searchTerm;
    }
    if (hasPageAccess) fetchTransactions();
  }, [search, searchTerm, page, hasPageAccess, fetchTransactions]);

  const handleFormChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    if (!form.type || !form.amount || !form.date) {
      setFormError('⚠ Please fill all required fields.');
      return;
    }
    if (Number(form.amount) <= 0) {
      setFormError('⚠ Amount must be positive.');
      return;
    }
    if (isUpdate && !canUpdateTransaction) {
      setFormError('⚠ You do not have permission to update a transaction.');
      return;
    }
    if (!isUpdate && !canCreateTransaction) {
      setFormError('⚠ You do not have permission to create a transaction.');
      return;
    }
    try {
      setFormLoading(true);
      setFormError(null);
      const payload = {
        ref: form.ref.trim() || undefined, // Let backend generate ref if empty
        type: form.type,
        amount: parseFloat(form.amount),
        date: form.date,
      };
      if (isUpdate) {
        const res = await api.put(`/finance/transactions/${selectedTransaction.id}/`, payload);
        setTransactions(transactions.map((txn) => (txn.id === res.data.id ? res.data : txn)));
      } else {
        const res = await api.post('/finance/transactions/', payload);
        setTransactions([res.data, ...transactions]);
      }
      setFormOpen(false);
      setForm({ ref: '', type: '', amount: '', date: '' });
      setIsUpdate(false);
      setSelectedTransaction(null);
      fetchTransactions();
    } catch (err) {
      let errorMsg = `Failed to ${isUpdate ? 'update' : 'create'} transaction: Unable to process request.`;
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

  const handleUpdate = (transaction) => {
    setForm({
      ref: transaction.ref,
      type: transaction.type,
      amount: transaction.amount.toString(),
      date: transaction.date,
    });
    setSelectedTransaction(transaction);
    setIsUpdate(true);
    setFormOpen(true);
  };

  const handleDelete = async () => {
    if (!canDeleteTransaction) {
      setFormError('⚠ You do not have permission to delete a transaction.');
      return;
    }
    try {
      await api.delete(`/finance/transactions/${deleteId}/`);
      setTransactions(transactions.filter((txn) => txn.id !== deleteId));
      setDeleteOpen(false);
      setDeleteId(null);
      fetchTransactions();
    } catch (err) {
      let errorMsg = 'Failed to delete transaction: Unable to process request.';
      if (err.response?.status === 403) {
        errorMsg = `⚠ Permission denied: ${err.response.data.detail || 'You lack permission to delete transactions.'}`;
      } else {
        errorMsg = err.response?.data?.detail || err.message;
      }
      setFormError(`❌ ${errorMsg}`);
    }
  };

  const openDeleteDialog = (id) => {
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
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        Finance Transactions
      </Typography>

      <Paper elevation={3} sx={{ p: 3 }}>
        <Box display="flex" justifyContent="space-between" mb={2}>
          <TextField
            variant="outlined"
            size="small"
            placeholder="Search by reference..."
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
          {canCreateTransaction && (
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => {
              setForm({ ref: '', type: '', amount: '', date: '' });
              setIsUpdate(false);
              setFormOpen(true);
            }}>
              Add Transaction
            </Button>
          )}
        </Box>

        {loading ? (
          <Box display="flex" justifyContent="center" py={5}>
            <CircularProgress />
          </Box>
        ) : error ? (
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
                    <TableCell>Type</TableCell>
                    <TableCell>Amount</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Created By</TableCell>
                    {(canUpdateTransaction || canDeleteTransaction) && <TableCell>Actions</TableCell>}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {transactions.length > 0 ? (
                    transactions.map((transaction, index) => (
                      <TableRow key={transaction.id}>
                        <TableCell>{(page - 1) * itemsPerPage + index + 1}</TableCell>
                        <TableCell>{transaction.ref}</TableCell>
                        <TableCell>{transaction.type}</TableCell>
                        <TableCell>₦{parseFloat(transaction.amount).toLocaleString()}</TableCell>
                        <TableCell>{new Date(transaction.date).toLocaleDateString()}</TableCell>
                        <TableCell>{transaction.created_by_name}</TableCell>
                        {(canUpdateTransaction || canDeleteTransaction) && (
                          <TableCell>
                            {canUpdateTransaction && (
                              <IconButton onClick={() => handleUpdate(transaction)}>
                                <EditIcon />
                              </IconButton>
                            )}
                            {canDeleteTransaction && (
                              <IconButton onClick={() => openDeleteDialog(transaction.id)}>
                                <DeleteIcon />
                              </IconButton>
                            )}
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={canUpdateTransaction || canDeleteTransaction ? 7 : 6} align="center">
                        No transactions found.
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
        <DialogTitle>{isUpdate ? 'Update Transaction' : 'Add Transaction'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                label="Reference (optional)"
                name="ref"
                fullWidth
                value={form.ref}
                onChange={handleFormChange}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Type"
                name="type"
                select
                fullWidth
                value={form.type}
                onChange={handleFormChange}
                required
              >
                <MenuItem value="Purchase">Purchase</MenuItem>
                <MenuItem value="Expense">Expense</MenuItem>
              </TextField>
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
              />
            </Grid>
          </Grid>
          {formError && <Alert severity="error" sx={{ mt: 2 }}>{formError}</Alert>}
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
          <Typography>Are you sure you want to delete this transaction?</Typography>
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