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
  Alert,
  CircularProgress,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import api from '../../api'; // ✅ Axios instance

export default function ERPIntegration() {
  const [data, setData] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const itemsPerPage = 10;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get('settings/erp/');
        setData(res.data);
      } catch (err) {
        console.error(err);
        setError('Failed to fetch ERP integrations.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const filtered = data.filter((item) =>
    item.system?.toLowerCase().includes(search.toLowerCase())
  );

  const paginated = filtered.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        ERP Integration
      </Typography>

      <Paper elevation={3} sx={{ p: 3 }}>
        <Box display="flex" justifyContent="flex-end" mb={2}>
          <TextField
            placeholder="Search by system name..."
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
                    <TableCell>System Name</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Last Sync</TableCell>
                    <TableCell>Synced By</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginated.length > 0 ? (
                    paginated.map((integration, index) => (
                      <TableRow key={integration.id}>
                        <TableCell>{(page - 1) * itemsPerPage + index + 1}</TableCell>
                        <TableCell>{integration.system}</TableCell>
                        <TableCell>{integration.status}</TableCell>
                        <TableCell>{integration.last_sync}</TableCell>
                        <TableCell>{integration.synced_by}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} align="center">
                        No ERP integrations found.
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

