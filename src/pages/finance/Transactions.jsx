// src/pages/finance/Transactions.jsx
import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Paper,
  Box,
  TextField,
  InputAdornment,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Pagination,
  Alert,
  CircularProgress,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  MenuItem,
  IconButton,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import api from '../../api';

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
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [isUpdate, setIsUpdate] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [form, setForm] = useState({ ref: '', type: '', amount: '', date: '' });
  const [formError, setFormError] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const itemsPerPage = 10;

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
        }

        const createResponse = await api.get('/auth/permissions/action/create_finance_transaction/');
        setCanCreateTransaction(createResponse.data.allowed || false);
        const updateResponse = await api.get('/auth/permissions/action/update_finance_transaction/');
        setCanUpdateTransaction(updateResponse.data.allowed || false);
        const deleteResponse = await api.get('/auth/permissions/action/delete_finance_transaction/');
        setCanDeleteTransaction(deleteResponse.data.allowed || false);

        if (pageResponse.data.allowed) {
          try {
            const res = await api.get('/finance/transactions/');
            setTransactions(res.data);
          } catch (err) {
            setError(
              err.response?.data?.detail ||
              err.response?.data?.message ||
              'Failed to load transactions.'
            );
          } finally {
            setLoading(false);
          }
        }
      } catch (err) {
        console.error('Error checking permissions:', err.response?.data || err.message);
        if (err.response?.status === 401) {
          setError('⚠️ Authentication failed. Please log in again.');
        } else {
          setError(`⚠️ Failed to check permissions: ${err.response?.data?.reason || err.message}`);
        }
        setHasPageAccess(false);
        setCanCreateTransaction(false);
        setCanUpdateTransaction(false);
        setCanDeleteTransaction(false);
      } finally {
        setCheckingPermissions(false);
      }
    };

    checkPermissions();
  }, []);

  const handleFormChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    if (!form.ref || !form.type || !form.amount || !form.date) {
      setFormError('⚠ Please fill all required fields.');
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
        ref: form.ref.trim(),
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
    } catch (err) {
      setFormError(
        err.response?.data?.detail ||
        err.response?.data?.message ||
        `Failed to ${isUpdate ? 'update' : 'create'} transaction.`
      );
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
    } catch (err) {
      setFormError(
        err.response?.data?.detail ||
        err.response?.data?.message ||
        'Failed to delete transaction.'
      );
    }
  };

  const openDeleteDialog = (id) => {
    setDeleteId(id);
    setDeleteOpen(true);
  };

  const filteredTransactions = transactions.filter((transaction) =>
    transaction.ref?.toLowerCase().includes(search.toLowerCase())
  );

  const paginatedTransactions = filteredTransactions.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  if (checkingPermissions) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Typography variant="h6">Loading permissions...</Typography>
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
                  {paginatedTransactions.length > 0 ? (
                    paginatedTransactions.map((transaction, index) => (
                      <TableRow key={transaction.id}>
                        <TableCell>{(page - 1) * itemsPerPage + index + 1}</TableCell>
                        <TableCell>{transaction.ref}</TableCell>
                        <TableCell>{transaction.type}</TableCell>
                        <TableCell>₦{transaction.amount.toLocaleString()}</TableCell>
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
                        No results found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            <Box display="flex" justifyContent="center" mt={3}>
              <Pagination
                count={Math.ceil(filteredTransactions.length / itemsPerPage)}
                page={page}
                onChange={(_, value) => setPage(value)}
                color="primary"
              />
            </Box>
          </>
        )}
      </Paper>

      <Dialog open={formOpen} onClose={() => setFormOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{isUpdate ? 'Update Transaction' : 'Add Transaction'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                label="Reference"
                name="ref"
                fullWidth
                value={form.ref}
                onChange={handleFormChange}
                required
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