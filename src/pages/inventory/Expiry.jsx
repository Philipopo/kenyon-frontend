import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Paper,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Chip,
  Button,
  TextField,
  InputAdornment,
  Pagination,
  Box
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { format, differenceInDays } from 'date-fns';
import API from '../../api'; // Custom Axios instance

export default function ExpiryTracking() {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    API.get('inventory/expiries/')
      .then((res) => setItems(res.data))
      .catch((err) => console.error('Failed to fetch expiry items:', err));
  }, []);

  const handleRecall = (batchId) => {
    alert(`Recall initiated for batch: ${batchId}`);
    // TODO: Optionally POST to backend endpoint for recalls
  };

  const getExpiryStatus = (dateStr) => {
    const today = new Date();
    const expiry = new Date(dateStr);
    const daysLeft = differenceInDays(expiry, today);

    return {
      label: 'Expired',
      color: 'error',
      daysLeft
    };
  };

  const filteredItems = [...items]
    .filter((item) => {
      const isExpired = differenceInDays(new Date(item.expiry_date), new Date()) < 0;
      return isExpired &&
        Object.values(item).some((val) =>
          String(val).toLowerCase().includes(search.toLowerCase())
        );
    })
    .sort((a, b) => new Date(a.expiry_date) - new Date(b.expiry_date)); // FEFO

  const paginatedItems = filteredItems.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom>
        Expired Items
      </Typography>
      <Typography variant="subtitle1" sx={{ mb: 3 }}>
        These items have already passed their expiry date.
      </Typography>

      {/* Search Bar */}
      <Box display="flex" justifyContent="flex-end" sx={{ mb: 2 }}>
        <TextField
          size="small"
          placeholder="Search..."
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
            )
          }}
        />
      </Box>

      {/* Table */}
      <Paper elevation={3} sx={{ p: 3, overflowX: 'auto' }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell><strong>Part Number</strong></TableCell>
              <TableCell><strong>Batch</strong></TableCell>
              <TableCell><strong>Quantity</strong></TableCell>
              <TableCell><strong>Expiry Date</strong></TableCell>
              <TableCell><strong>Status</strong></TableCell>
              <TableCell><strong>Actions</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedItems.length > 0 ? (
              paginatedItems.map((item) => {
                const status = getExpiryStatus(item.expiry_date);
                return (
                  <TableRow key={item.id}>
                    <TableCell>{item.part_number}</TableCell>
                    <TableCell>{item.batch}</TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>{format(new Date(item.expiry_date), 'yyyy-MM-dd')}</TableCell>
                    <TableCell>
                      <Chip label={status.label} color={status.color} size="small" />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outlined"
                        color="error"
                        size="small"
                        onClick={() => handleRecall(item.batch)}
                      >
                        Recall Batch
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={6}>No expired items found.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {/* Pagination */}
        {filteredItems.length > itemsPerPage && (
          <Box mt={4} display="flex" justifyContent="center">
            <Pagination
              count={Math.ceil(filteredItems.length / itemsPerPage)}
              page={page}
              onChange={(_, value) => setPage(value)}
              color="primary"
            />
          </Box>
        )}
      </Paper>
    </Container>
  );
}
