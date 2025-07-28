import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Paper,
  Box,
  TextField,
  InputAdornment,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  Pagination,
  CircularProgress,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import API from '../../api';

export default function FinanceCategories() {
  const [data, setData] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const rowsPerPage = 10;

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoading(true);
        const response = await API.get('finance/categories/');
        setData(response.data);
      } catch (err) {
        console.error('Error loading categories:', err);
        setError('Failed to fetch categories');
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  const filtered = data.filter(
    (cat) =>
      cat.name.toLowerCase().includes(search.toLowerCase()) ||
      cat.description.toLowerCase().includes(search.toLowerCase())
  );

  const paginated = filtered.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom>
          Finance Categories
        </Typography>
        <Typography variant="subtitle1" sx={{ mb: 3 }}>
          Manage all financial categories used for reporting and classification.
        </Typography>

        <Box display="flex" justifyContent="flex-end" mb={2}>
          <TextField
            placeholder="Search categories..."
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
                    <TableCell>ID</TableCell>
                    <TableCell>Category Name</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell>Created By</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginated.length > 0 ? (
                    paginated.map((cat) => (
                      <TableRow key={cat.id}>
                        <TableCell>{cat.id}</TableCell>
                        <TableCell>{cat.name}</TableCell>
                        <TableCell>{cat.description}</TableCell>
                        <TableCell>{cat.created_by_name}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} align="center">
                        No categories found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            <Box display="flex" justifyContent="center" mt={3}>
              <Pagination
                count={Math.ceil(filtered.length / rowsPerPage)}
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

