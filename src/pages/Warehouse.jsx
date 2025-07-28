import React, { useState, useEffect } from 'react';
import axios from 'axios';

import {
  Container,
  Paper,
  Typography,
  Box,
  Table,
  TableContainer,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Pagination,
  TextField,
  InputAdornment,
} from '@mui/material';

import SearchIcon from '@mui/icons-material/Search';


export default function Warehouse() {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    axios.get('/api/warehouse/items/', {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('accessToken')}`
      }
    }).then(res => setItems(res.data))
      .catch(err => console.error(err));
  }, []);

  const filtered = items.filter(item =>
    item.item.toLowerCase().includes(search.toLowerCase()) ||
    item.location.toLowerCase().includes(search.toLowerCase()) ||
    item.status.toLowerCase().includes(search.toLowerCase())
  );

  const paginated = filtered.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom>Warehouse Overview</Typography>
        <Typography variant="subtitle1" sx={{ mb: 3 }}>
          Visual rack map, heatmaps, and smart routing
        </Typography>

        <Box mt={5} mb={2} display="flex" justifyContent="flex-end">
          <TextField
            placeholder="Search warehouse data..."
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

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>S/N</TableCell>
                <TableCell>Item</TableCell>
                <TableCell>Location</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Last Updated</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginated.length > 0 ? (
                paginated.map((row, index) => (
                  <TableRow key={row.id}>
                    <TableCell>{(page - 1) * itemsPerPage + index + 1}</TableCell>
                    <TableCell>{row.item}</TableCell>
                    <TableCell>{row.location}</TableCell>
                    <TableCell>{row.status}</TableCell>
                    <TableCell>{new Date(row.last_updated).toLocaleString()}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} align="center">No matching records found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <Box display="flex" justifyContent="center" mt={3}>
          <Pagination
            count={Math.ceil(filtered.length / itemsPerPage)}
            page={page}
            onChange={(_, val) => setPage(val)}
            color="primary"
          />
        </Box>
      </Paper>
    </Container>
  );
}
