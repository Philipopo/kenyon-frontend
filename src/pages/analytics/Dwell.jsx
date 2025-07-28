import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Paper,
  TextField,
  InputAdornment,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Pagination,
  Box,
  CircularProgress,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import StorageIcon from '@mui/icons-material/Inventory2';
import API from '../../api'; // adjust path as needed

export default function DwellTime() {
  const [data, setData] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const itemsPerPage = 10;

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await API.get('analytics/dwell/');
        setData(response.data);
      } catch (err) {
        console.error('Error fetching dwell data:', err);
        setError('Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const filteredData = data.filter((row) =>
    row.item.toLowerCase().includes(search.toLowerCase())
  );

  const paginatedData = filteredData.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom>
          Dwell Time Analysis
        </Typography>
        <Typography variant="subtitle1" sx={{ mb: 3 }}>
          Average storage duration metrics and aging stock reports
        </Typography>

        <Box display="flex" justifyContent="flex-end" mb={2}>
          <TextField
            placeholder="Search by item..."
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
                    <TableCell>Storage Duration</TableCell>
                    <TableCell>Aging</TableCell>
                    <TableCell>Storage Cost</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedData.length > 0 ? (
                    paginatedData.map((row, index) => (
                      <TableRow key={row.id}>
                        <TableCell>{(page - 1) * itemsPerPage + index + 1}</TableCell>
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={1}>
                            <StorageIcon fontSize="small" color="primary" />
                            {row.item}
                          </Box>
                        </TableCell>
                        <TableCell>{row.duration}</TableCell>
                        <TableCell>{row.aging}</TableCell>
                        <TableCell>₦{parseFloat(row.cost).toFixed(2)}</TableCell>
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
                count={Math.ceil(filteredData.length / itemsPerPage)}
                page={page}
                onChange={(_, value) => setPage(value)}
                color="primary"
              />
            </Box>
          </>
        )}

        <Typography variant="body2" color="text.secondary" sx={{ mt: 4 }}>
          Use this module to detect slow-moving or costly-to-store items and take proactive actions to optimize warehouse efficiency.
        </Typography>
      </Paper>
    </Container>
  );
}
