import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Container, Typography, Paper, Box, TextField, InputAdornment, Table,
  TableBody, TableCell, TableContainer, TableHead, TableRow, Pagination,
  CircularProgress, Alert, Button, Dialog, DialogTitle, DialogContent,
  DialogActions, Grid, MenuItem, Select, FormControl, InputLabel, IconButton,
  Tooltip
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import WarningIcon from '@mui/icons-material/Warning';
import { debounce } from 'lodash';
import api from '../../api';
import { useSearch } from '../../context/SearchContext';

export default function RentalPayments() {
  const [payments, setPayments] = useState([]);
  const [rentals, setRentals] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [isUpdate, setIsUpdate] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [form, setForm] = useState({ rental: '', amount_paid: '', status: 'Paid' });
  const [formError, setFormError] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [hasPageAccess, setHasPageAccess] = useState(false);
  const [checkingPermissions, setCheckingPermissions] = useState(true);
  const [canCreatePayment, setCanCreatePayment] = useState(false);
  const [canUpdatePayment, setCanUpdatePayment] = useState(false);
  const [canDeletePayment, setCanDeletePayment] = useState(false);
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

  const fetchPayments = useCallback(async () => {
    try {
      setLoading(true);
      const searchValue = search || searchTerm;
      const res = await api.get('/rentals/payments/', {
        params: { search: searchValue, page, page_size: itemsPerPage },
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
      });
      setPayments(Array.isArray(res.data.results) ? res.data.results : []);
      setTotalPages(Math.ceil((res.data.count || 0) / itemsPerPage));
      setError('');
    } catch (err) {
      console.error('Error fetching payments:', err.response?.data || err.message);
      setError(`❌ Failed to fetch payments: ${err.response?.data?.detail || err.message}`);
      setPayments([]);
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
          setCheckingPermissions(false);
          return;
        }
        const pageResponse = await api.get('/auth/permissions/page/rentals_payments/');
        setHasPageAccess(pageResponse.data.allowed || false);
        if (!pageResponse.data.allowed) {
          setError(`⚠️ You do not have permission to view this page: ${pageResponse.data.reason || 'No reason provided'}`);
          setCheckingPermissions(false);
          return;
        }
        const [createResponse, updateResponse, deleteResponse, rentalsResponse] = await Promise.all([
          api.get('/auth/permissions/action/create_payment/'),
          api.get('/auth/permissions/action/update_payment/'),
          api.get('/auth/permissions/action/delete_payment/'),
          api.get('/rentals/rentals/', { params: { page_size: 100 } }),
        ]);
        setCanCreatePayment(createResponse.data.allowed || false);
        setCanUpdatePayment(updateResponse.data.allowed || false);
        setCanDeletePayment(deleteResponse.data.allowed || false);
        setRentals(Array.isArray(rentalsResponse.data.results) ? rentalsResponse.data.results : []);
        if (pageResponse.data.allowed) {
          fetchPayments();
        }
      } catch (err) {
        console.error('Error checking permissions or fetching rentals:', err.response?.data || err.message);
        setError(`⚠️ Failed to check permissions or fetch rentals: ${err.response?.data?.detail || err.message}`);
        setHasPageAccess(false);
        setRentals([]);
      } finally {
        setCheckingPermissions(false);
      }
    };
    checkPermissions();
  }, [fetchPayments]);

  useEffect(() => {
    if (hasPageAccess && (search !== prevSearchRef.current || searchTerm !== prevSearchTermRef.current)) {
      setPage(1);
      prevSearchRef.current = search;
      prevSearchTermRef.current = searchTerm;
    }
    if (hasPageAccess) fetchPayments();
  }, [search, searchTerm, page, hasPageAccess, fetchPayments]);

  const handleFormChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    if (!form.rental || !form.amount_paid) {
      setFormError('⚠ Please fill all required fields.');
      return;
    }
    if (parseFloat(form.amount_paid) <= 0) {
      setFormError('⚠ Amount paid must be positive.');
      return;
    }
    if (isUpdate && !canUpdatePayment) {
      setFormError('⚠ You do not have permission to update a payment.');
      return;
    }
    if (!isUpdate && !canCreatePayment) {
      setFormError('⚠ You do not have permission to create a payment.');
      return;
    }
    try {
      setFormLoading(true);
      setFormError(null);
      const payload = {
        rental: form.rental,
        amount_paid: parseFloat(form.amount_paid),
        status: form.status,
      };
      if (isUpdate) {
        const res = await api.put(`/rentals/payments/${selectedPayment.id}/`, payload);
        setPayments(payments.map((p) => (p.id === res.data.id ? res.data : p)));
        setFormError('✅ Payment updated successfully.');
      } else {
        const res = await api.post('/rentals/payments/', payload);
        setPayments([res.data, ...payments]);
        setFormError('✅ Payment created successfully.');
      }
      setFormOpen(false);
      setForm({ rental: '', amount_paid: '', status: 'Paid' });
      setIsUpdate(false);
      setSelectedPayment(null);
      fetchPayments();
    } catch (err) {
      let errorMsg = `Failed to ${isUpdate ? 'update' : 'create'} payment: Unable to process request.`;
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

  const handleUpdate = (payment) => {
    if (!canUpdatePayment) {
      setError('⚠ You do not have permission to update a payment.');
      return;
    }
    setForm({
      rental: payment.rental,
      amount_paid: payment.amount_paid.toString(),
      status: payment.status,
    });
    setSelectedPayment(payment);
    setIsUpdate(true);
    setFormOpen(true);
  };

  const handleDelete = async () => {
    if (!canDeletePayment) {
      setError('⚠ You do not have permission to delete a payment.');
      return;
    }
    try {
      await api.delete(`/rentals/payments/${deleteId}/`);
      setPayments(payments.filter((p) => p.id !== deleteId));
      setError('✅ Payment deleted successfully.');
      setDeleteOpen(false);
      setDeleteId(null);
      fetchPayments();
    } catch (err) {
      let errorMsg = 'Failed to delete payment: Unable to process request.';
      if (err.response?.status === 403) {
        errorMsg = `⚠ Permission denied: ${err.response.data.detail || 'You lack permission to delete payments.'}`;
      } else {
        errorMsg = err.response?.data?.detail || err.message;
      }
      setError(`❌ ${errorMsg}`);
    }
  };

  const openDeleteDialog = (id) => {
    if (!canDeletePayment) {
      setError('⚠ You do not have permission to delete a payment.');
      return;
    }
    setDeleteId(id);
    setDeleteOpen(true);
  };

  // Helper to get rental details by ID
  const getRentalDetails = (rentalId) => {
    return rentals.find(r => r.id === rentalId) || {};
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
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      {error && (
        <Alert severity={error.includes('❌') ? 'error' : 'success'} sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom>
          Rental Payments
        </Typography>
        <Typography variant="subtitle1" sx={{ mb: 3 }}>
          Track payments with real-time rental status and overdue alerts
        </Typography>

        <Box display="flex" justifyContent="space-between" mb={2}>
          <TextField
            placeholder="Search by renter or equipment..."
            variant="outlined"
            size="small"
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
          {canCreatePayment && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => {
                setForm({ rental: '', amount_paid: '', status: 'Paid' });
                setIsUpdate(false);
                setFormOpen(true);
              }}
            >
              Add Payment
            </Button>
          )}
        </Box>

        {loading ? (
          <Box display="flex" justifyContent="center" py={5}>
            <CircularProgress />
          </Box>
        ) : error && error.includes('❌') ? (
          <Alert severity="error">{error}</Alert>
        ) : (
          <>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>S/N</TableCell>
                    <TableCell>Rental Code</TableCell>
                    <TableCell>Renter</TableCell>
                    <TableCell>Equipment</TableCell>
                    <TableCell>Rental Status</TableCell>
                    <TableCell>Amount Paid</TableCell>
                    <TableCell>Payment Date</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Created By</TableCell>
                    {(canUpdatePayment || canDeletePayment) && <TableCell>Actions</TableCell>}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {payments.length > 0 ? (
                    payments.map((payment, index) => {
                      const rental = getRentalDetails(payment.rental);
                      const isOverdue = rental.is_overdue;
                      const daysOverdue = rental.days_overdue || 0;
                      
                      return (
                        <TableRow key={payment.id}>
                          <TableCell>{(page - 1) * itemsPerPage + index + 1}</TableCell>
                          <TableCell>
                            {payment.rental_code || rental.code}
                            {isOverdue && (
                              <Tooltip title={`Overdue by ${daysOverdue} days`}>
                                <WarningIcon color="error" fontSize="small" sx={{ ml: 1 }} />
                              </Tooltip>
                            )}
                          </TableCell>
                          <TableCell>{payment.renter_name}</TableCell>
                          <TableCell>{payment.equipment_name}</TableCell>
                          <TableCell>
                            {rental.computed_status || 'Unknown'}
                          </TableCell>
                          <TableCell>₦{parseFloat(payment.amount_paid).toLocaleString()}</TableCell>
                          <TableCell>{new Date(payment.payment_date).toLocaleDateString()}</TableCell>
                          <TableCell>{payment.status}</TableCell>
                          <TableCell>{payment.created_by_name || 'N/A'}</TableCell>
                          {(canUpdatePayment || canDeletePayment) && (
                            <TableCell>
                              {canUpdatePayment && (
                                <IconButton onClick={() => handleUpdate(payment)}>
                                  <EditIcon />
                                </IconButton>
                              )}
                              {canDeletePayment && (
                                <IconButton onClick={() => openDeleteDialog(payment.id)}>
                                  <DeleteIcon />
                                </IconButton>
                              )}
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={canUpdatePayment || canDeletePayment ? 10 : 9} align="center">
                        No payments found.
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
        <DialogTitle>{isUpdate ? 'Update Payment' : 'Add Payment'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <FormControl fullWidth required>
                <InputLabel id="rental-label">Rental</InputLabel>
                <Select
                  labelId="rental-label"
                  name="rental"
                  value={form.rental}
                  label="Rental"
                  onChange={handleFormChange}
                >
                  <MenuItem value="" disabled>-- Select Rental --</MenuItem>
                  {Array.isArray(rentals) && rentals.length > 0 ? (
                    rentals.map((rental) => {
                      const isOverdue = rental.is_overdue;
                      return (
                        <MenuItem key={rental.id} value={rental.id}>
                          {`${rental.code} - ${rental.renter_name} - ${rental.equipment_name}`}
                          {isOverdue && (
                            <WarningIcon color="error" fontSize="small" sx={{ ml: 1 }} />
                          )}
                        </MenuItem>
                      );
                    })
                  ) : (
                    <MenuItem value="" disabled>No rentals available</MenuItem>
                  )}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Amount Paid (₦)"
                name="amount_paid"
                type="number"
                fullWidth
                value={form.amount_paid}
                onChange={handleFormChange}
                inputProps={{ step: "0.01" }}
                required
                error={(form.amount_paid === '' || parseFloat(form.amount_paid) <= 0) && formError?.includes('Amount')}
                helperText={(form.amount_paid === '' || parseFloat(form.amount_paid) <= 0) && formError?.includes('Amount') ? 'Amount must be positive' : ''}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth required>
                <InputLabel>Status</InputLabel>
                <Select name="status" value={form.status} onChange={handleFormChange}>
                  <MenuItem value="Paid">Paid</MenuItem>
                  <MenuItem value="Pending">Pending</MenuItem>
                </Select>
              </FormControl>
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
          <Typography>Are you sure you want to delete this payment?</Typography>
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