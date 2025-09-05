// src/pages/rentals/Payments.jsx
import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Paper, Box, TextField, InputAdornment, Table,
  TableBody, TableCell, TableContainer, TableHead, TableRow, Pagination,
  CircularProgress, Alert, Button, Dialog, DialogTitle, DialogContent,
  DialogActions, Grid, MenuItem, Select, FormControl, InputLabel
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import api from '../../api';

export default function RentalPayments() {
  const [payments, setPayments] = useState([]);
  const [rentals, setRentals] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    rental: '',
    amount_paid: '',
    status: 'Paid',
  });
  const [formAlert, setFormAlert] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [hasPageAccess, setHasPageAccess] = useState(false);
  const [checkingPermissions, setCheckingPermissions] = useState(true);
  const [canCreatePayment, setCanCreatePayment] = useState(false);
  const itemsPerPage = 10;

  useEffect(() => {
    const checkPermissions = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        console.log('Access token:', token);
        if (!token) {
          setError('⚠️ No authentication token found. Please log in.');
          setHasPageAccess(false);
          setCheckingPermissions(false);
          return;
        }

        // Check page permission
        const pageResponse = await api.get('/auth/permissions/page/rentals_payments/');
        console.log('Page permission response:', pageResponse.data);
        if (pageResponse.data && typeof pageResponse.data.allowed === 'boolean') {
          setHasPageAccess(pageResponse.data.allowed);
          if (!pageResponse.data.allowed) {
            setError(`⚠️ You do not have permission to view this page: ${pageResponse.data.reason || 'No reason provided'}`);
            setCheckingPermissions(false);
            return;
          }
        } else {
          setError('⚠️ Invalid permission response from server.');
          setHasPageAccess(false);
          setCheckingPermissions(false);
          return;
        }

        // Check action permission for creating payments
        const actionResponse = await api.get('/auth/permissions/action/create_payment/');
        console.log('Action permission response:', actionResponse.data);
        setCanCreatePayment(actionResponse.data.allowed || false);

        // Fetch data if page access is granted
        const [paymentsRes, rentalsRes] = await Promise.all([
          api.get('rentals/payments/'),
          api.get('rentals/rentals/')
        ]);
        setPayments(paymentsRes.data);
        setRentals(rentalsRes.data);
        setLoading(false);
      } catch (err) {
        console.error('Error checking permissions or fetching data:', err.response?.data || err.message);
        if (err.response?.status === 401) {
          setError('⚠️ Authentication failed. Please log in again.');
        } else if (err.response?.status === 404) {
          setError('⚠️ Permission endpoint not found. Contact support.');
        } else {
          setError(`⚠️ Failed to check permissions or fetch data: ${err.response?.data?.detail || err.message}`);
        }
        setHasPageAccess(false);
      } finally {
        setCheckingPermissions(false);
      }
    };

    checkPermissions();
  }, []);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleCreatePayment = async () => {
    const { rental, amount_paid, status } = form;
    if (!rental || !amount_paid || !status) {
      setFormAlert('⚠ Please fill in all fields.');
      return;
    }

    try {
      setFormLoading(true);
      const payload = { ...form };
      const res = await api.post('rentals/payments/', payload);
      setPayments([res.data, ...payments]);
      setOpen(false);
      setFormAlert(null);
      setForm({ rental: '', amount_paid: '', status: 'Paid' });
    } catch (err) {
      console.error('❌ Error creating payment:', err);
      setFormAlert(err.response?.data?.detail || '❌ Failed to create payment.');
    } finally {
      setFormLoading(false);
    }
  };

  const filtered = payments.filter((p) =>
    p.renter_name?.toLowerCase().includes(search.toLowerCase())
  );

  const paginated = filtered.slice((page - 1) * itemsPerPage, page * itemsPerPage);

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
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom>
          Rental Payments
        </Typography>
        <Typography variant="subtitle1" sx={{ mb: 3 }}>
          View and track all equipment rental payments
        </Typography>

        <Box display="flex" justifyContent="space-between" mb={2}>
          <TextField
            placeholder="Search by renter..."
            variant="outlined"
            size="small"
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
          <Button
            variant="contained"
            onClick={() => setOpen(true)}
            disabled={!canCreatePayment}
          >
            Add Payment
          </Button>
        </Box>

        {loading ? (
          <Box display="flex" justifyContent="center" py={5}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : (
          <>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>S/N</TableCell>
                    <TableCell>Renter</TableCell>
                    <TableCell>Equipment</TableCell>
                    <TableCell>Amount Paid</TableCell>
                    <TableCell>Payment Date</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginated.length > 0 ? (
                    paginated.map((payment, index) => (
                      <TableRow key={payment.id}>
                        <TableCell>{(page - 1) * itemsPerPage + index + 1}</TableCell>
                        <TableCell>{payment.renter_name}</TableCell>
                        <TableCell>{payment.equipment_name}</TableCell>
                        <TableCell>{`₦${parseFloat(payment.amount_paid).toLocaleString()}`}</TableCell>
                        <TableCell>{new Date(payment.payment_date).toLocaleDateString()}</TableCell>
                        <TableCell>{payment.status}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        No rental payments found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            <Box display="flex" justifyContent="center" mt={3}>
              <Pagination
                count={Math.ceil(filtered.length / itemsPerPage)}
                page={page}
                onChange={(_, value) => setPage(value)}
                color="primary"
              />
            </Box>
          </>
        )}
      </Paper>

      {/* Payment Creation Modal */}
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Add Payment</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <FormControl fullWidth required>
                <InputLabel id="rental-label">Rental</InputLabel>
                <Select
                  labelId="rental-label"
                  id="rental-select"
                  name="rental"
                  value={form.rental}
                  label="Rental"
                  onChange={handleChange}
                >
                  <MenuItem value="" disabled>-- Select Rental --</MenuItem>
                  {rentals.map((rental) => (
                    <MenuItem key={rental.id} value={rental.id}>
                      {`${rental.renter_name} - ${rental.equipment_name}`}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                name="amount_paid"
                label="Amount Paid (₦)"
                type="number"
                fullWidth
                value={form.amount_paid}
                onChange={handleChange}
                inputProps={{ step: "0.01" }}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth required>
                <InputLabel>Status</InputLabel>
                <Select
                  name="status"
                  value={form.status}
                  onChange={handleChange}
                >
                  <MenuItem value="Paid">Paid</MenuItem>
                  <MenuItem value="Pending">Pending</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          {formAlert && (
            <Alert sx={{ mt: 2 }} severity={formAlert.includes('❌') ? 'error' : 'warning'}>
              {formAlert}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleCreatePayment}
            disabled={formLoading || !canCreatePayment}
          >
            {formLoading ? <CircularProgress size={24} color="inherit" /> : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}