import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Paper,
  Box,
  TextField,
  InputAdornment,
  Table,
  TableContainer,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Pagination,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import axios from 'axios';

export default function AuditTrail() {
  const [logs, setLogs] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    axios.get('/api/audit-logs/', {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
      },
    })
    .then(res => setLogs(res.data))
    .catch(err => console.error(err));
  }, []);

  const filtered = logs.filter(
    (item) =>
      item.action.toLowerCase().includes(search.toLowerCase()) ||
      item.user.toLowerCase().includes(search.toLowerCase()) ||
      item.description.toLowerCase().includes(search.toLowerCase())
  );

  const paginated = filtered.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom>
          Audit Trail
        </Typography>
        <Typography variant="subtitle1" sx={{ mb: 3 }}>
          Comprehensive system-wide activity tracking
        </Typography>

        <Box display="flex" justifyContent="flex-end" mb={2}>
          <TextField
            placeholder="Search logs..."
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
                <TableCell>Action</TableCell>
                <TableCell>User</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Timestamp</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginated.length > 0 ? (
                paginated.map((log, index) => (
                  <TableRow key={log.id}>
                    <TableCell>{(page - 1) * itemsPerPage + index + 1}</TableCell>
                    <TableCell>{log.action}</TableCell>
                    <TableCell>{log.user}</TableCell>
                    <TableCell>{log.description}</TableCell>
                    <TableCell>{new Date(log.timestamp).toLocaleString()}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    No logs found.
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
      </Paper>
    </Container>
  );
}
