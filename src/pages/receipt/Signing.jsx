import React, { useEffect, useState } from 'react';
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
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import api from '../../api'; // ✅ Centralized API instance

export default function ReceiptSigning() {
  const [receipts, setReceipts] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const itemsPerPage = 10;

  useEffect(() => {
    const fetchReceipts = async () => {
      try {
        const res = await api.get('/receipts/signing/');
        setReceipts(res.data);
      } catch (err) {
        console.error('❌ Error fetching signing receipts:', err);
        setError(
          err.response?.data?.detail ||
          err.response?.data?.message ||
          'Failed to load receipts.'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchReceipts();
  }, []);

  const filteredReceipts = receipts.filter((receipt) =>
    receipt.recipient?.toLowerCase().includes(search.toLowerCase())
  );

  const paginatedReceipts = filteredReceipts.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        Signing Receipts
      </Typography>

      <Paper elevation={3} sx={{ p: 3 }}>
        <Box display="flex" justifyContent="flex-end" mb={2}>
          <TextField
            variant="outlined"
            size="small"
            placeholder="Search by recipient..."
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
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedReceipts.length > 0 ? (
                    paginatedReceipts.map((receipt, index) => (
                      <TableRow key={receipt.id}>
                        <TableCell>{(page - 1) * itemsPerPage + index + 1}</TableCell>
                        <TableCell>{receipt.recipient}</TableCell>
                        <TableCell>{receipt.signed_by}</TableCell>
                        <TableCell>{new Date(receipt.date).toLocaleDateString()}</TableCell>
                        <TableCell>{receipt.status}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} align="center">
                        No results found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            <Box display="flex" justifyContent="center" mt={3}>
              <Pagination
                count={Math.ceil(filteredReceipts.length / itemsPerPage)}
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
