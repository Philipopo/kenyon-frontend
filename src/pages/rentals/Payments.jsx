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
  CircularProgress,
  Alert,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import api from '../../api'; // ✅ centralized axios instance

export default function RentalPayments() {
  const [payments, setPayments] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const itemsPerPage = 10;

  useEffect(() => {
    const fetchPayments = async () => {
      try {
        const res = await api.get('rentals/payments/');
        setPayments(res.data);
      } catch (err) {
        console.error('❌ Error fetching payments:', err);
        setError(
          err.response?.data?.detail ||
          err.response?.data?.message ||
          'Failed to load payments.'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchPayments();
  }, []);

  const filtered = payments.filter((p) =>
    p.renter_name?.toLowerCase().includes(search.toLowerCase())
  );

  const paginated = filtered.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom>
          Rental Payments
        </Typography>
        <Typography variant="subtitle1" sx={{ mb: 3 }}>
          View and track all equipment rental payments
        </Typography>

        <Box display="flex" justifyContent="flex-end" mb={2}>
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
    </Container>
  );
}
