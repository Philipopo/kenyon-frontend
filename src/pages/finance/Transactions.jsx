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
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import API from '../../api';

export default function FinanceTransactions() {
  const [data, setData] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const rowsPerPage = 10;

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const response = await API.get('finance/transactions/');
        setData(response.data);
      } catch (err) {
        console.error('Error loading transactions:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, []);

  const filteredData = data.filter((txn) =>
    txn.ref.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const paginatedData = filteredData.slice(
    (page - 1) * rowsPerPage,
    page * rowsPerPage
  );

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom>
          Transactions
        </Typography>
        <Typography variant="body1" sx={{ mb: 3 }}>
          Review all financial transactions including purchases and expenses.
        </Typography>

        <Box display="flex" justifyContent="flex-end" mb={2}>
          <TextField
            variant="outlined"
            size="small"
            placeholder="Search by Reference"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
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
          <Box display="flex" justifyContent="center" my={4}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Transaction Ref</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Amount</TableCell>
                    <TableCell>Date</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedData.length > 0 ? (
                    paginatedData.map((txn) => (
                      <TableRow key={txn.id}>
                        <TableCell>{txn.ref}</TableCell>
                        <TableCell>{txn.type}</TableCell>
                        <TableCell>₦{parseFloat(txn.amount).toLocaleString()}</TableCell>
                        <TableCell>{txn.date}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} align="center">
                        No matching transactions found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            {filteredData.length > rowsPerPage && (
              <Box display="flex" justifyContent="center" mt={3}>
                <Pagination
                  count={Math.ceil(filteredData.length / rowsPerPage)}
                  page={page}
                  onChange={(_, val) => setPage(val)}
                  color="primary"
                />
              </Box>
            )}
          </>
        )}
      </Paper>
    </Container>
  );
}
