import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TextField,
  Box,
  TableContainer,
  InputAdornment,
  Pagination,
  CircularProgress
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AssessmentIcon from '@mui/icons-material/Assessment';
import API from '../../api'; // 👈 Ensure this points to your axios instance

export default function StockAnalytics() {
  const [data, setData] = useState([]);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const itemsPerPage = 10;

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await API.get('/analytics/stock/');
        setData(response.data);
      } catch (err) {
        console.error('Error fetching stock data:', err);
        setError('Failed to load stock analytics');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const filteredData = data.filter(
    (item) =>
      item.item.toLowerCase().includes(search.toLowerCase()) ||
      item.category.toLowerCase().includes(search.toLowerCase())
  );

  const paginatedData = filteredData.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom>
          Stock Analytics
        </Typography>
        <Typography variant="subtitle1" sx={{ mb: 3 }}>
          Review turnover rates, ABC classifications, and obsolescence risk.
        </Typography>

        <Box display="flex" justifyContent="flex-end" mb={2}>
          <TextField
            placeholder="Search by item or category..."
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
          <Box display="flex" justifyContent="center" my={4}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Typography color="error">{error}</Typography>
        ) : (
          <>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>S/N</TableCell>
                    <TableCell>Item</TableCell>
                    <TableCell>Category (ABC)</TableCell>
                    <TableCell>Turnover Rate</TableCell>
                    <TableCell>Obsolescence Risk</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedData.length > 0 ? (
                    paginatedData.map((row, index) => (
                      <TableRow key={row.id}>
                        <TableCell>{(page - 1) * itemsPerPage + index + 1}</TableCell>
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={1}>
                            <AssessmentIcon fontSize="small" color="primary" />
                            {row.item}
                          </Box>
                        </TableCell>
                        <TableCell>{row.category}</TableCell>
                        <TableCell>{row.turnover_rate}</TableCell>
                        <TableCell>{row.obsolescence_risk}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} align="center">
                        No matching records found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            <Box display="flex" justifyContent="center" mt={3}>
              <Pagination
                count={Math.ceil(filteredData.length / itemsPerPage)}
                page={page}
                onChange={(_, value) => setPage(value)}
                color="primary"
              />
            </Box>
          </>
        )}

        <Typography variant="body2" color="text.secondary" sx={{ mt: 4 }}>
          * These insights are generated based on historical data. Accurate stock entry improves reporting reliability.
        </Typography>
      </Paper>
    </Container>
  );
}

