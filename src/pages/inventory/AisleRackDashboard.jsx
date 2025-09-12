import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  Container, Typography, Paper, Table, TableHead, TableRow, TableCell, TableBody,
  Box, Alert, Pagination, TextField, InputAdornment,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import API from '../../api';
import { useSearch } from '../../context/SearchContext';

export default function AisleRackDashboard() {
  const [bins, setBins] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [checkingPermissions, setCheckingPermissions] = useState(true);
  const [hasPermission, setHasPermission] = useState(false);
  const { searchTerm, setSearchTerm } = useSearch(); // Move useSearch to top level
  const itemsPerPage = 10;
  const prevSearchTermRef = useRef(searchTerm);

  const fetchBins = useCallback(async () => {
    try {
      const res = await API.get('/inventory/bins/', {
        params: { search: searchTerm, page, page_size: itemsPerPage },
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
      });
      console.log('[BINS FETCHED]', res.data);
      setBins(Array.isArray(res.data.results) ? res.data.results : []);
      setTotalPages(Math.ceil(res.data.count / itemsPerPage));
      setError('');
    } catch (err) {
      console.error('Error fetching bins:', err.response?.data || err.message);
      setError('❌ Failed to fetch bins: ' + (err.response?.data?.detail || err.message));
      setBins([]);
      setTotalPages(1);
    }
  }, [page, searchTerm]);

  useEffect(() => {
    const checkPermissions = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        if (!token) {
          setError('⚠️ No authentication token found. Please log in.');
          setHasPermission(false);
          setCheckingPermissions(false);
          return;
        }
        const pageResponse = await API.get('/auth/permissions/page/aisle_rack_dashboard/');
        console.log('Page permission response:', pageResponse.data);
        setHasPermission(pageResponse.data.allowed || false);
        if (!pageResponse.data.allowed) {
          setError(`⚠️ You do not have permission to view this page: ${pageResponse.data.reason || 'No reason provided'}`);
          setCheckingPermissions(false);
          return;
        }
        fetchBins();
      } catch (err) {
        console.error('Error checking permissions:', err.response?.data || err.message);
        setError(`⚠️ Failed to check permissions: ${err.response?.data?.detail || err.message}`);
        setHasPermission(false);
      } finally {
        setCheckingPermissions(false);
      }
    };
    checkPermissions();
  }, [fetchBins]);

  useEffect(() => {
    if (hasPermission && searchTerm !== prevSearchTermRef.current) {
      setPage(1);
      prevSearchTermRef.current = searchTerm;
      fetchBins();
    }
  }, [searchTerm, hasPermission, fetchBins]);

  const getStatusColor = (bin) => {
    if (bin.used < bin.capacity) return 'green'; // Available
    if (bin.used >= bin.capacity) return 'red'; // Occupied
    return 'yellow'; // Error
  };

  const getStatusText = (bin) => {
    if (bin.used < bin.capacity) return 'Available';
    if (bin.used >= bin.capacity) return 'Occupied';
    return 'Error';
  };

  if (checkingPermissions) {
    return (
      <Container>
        <Typography variant="h6" sx={{ mt: 4 }}>
          Loading permissions...
        </Typography>
      </Container>
    );
  }

  if (!hasPermission) {
    return (
      <Container>
        <Alert severity="error" sx={{ mt: 4 }} onClose={() => setError('')}>
          {error || '⚠️ You do not have permission to view this page.'}
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      <Typography variant="h4" gutterBottom>
        Aisle & Rack Dashboard
      </Typography>
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Storage Bin Status
        </Typography>
        <TextField
          placeholder="Search by bin ID, row, or rack..."
          variant="outlined"
          size="small"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)} // Use setSearchTerm directly
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ mb: 2 }}
        />
        <Table>
          <TableHead>
            <TableRow>
              <TableCell><strong>Aisle (Row)</strong></TableCell>
              <TableCell><strong>Rack</strong></TableCell>
              <TableCell><strong>Bin ID</strong></TableCell>
              <TableCell><strong>Shelf</strong></TableCell>
              <TableCell><strong>Used/Capacity</strong></TableCell>
              <TableCell><strong>Status</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {bins.length > 0 ? (
              bins.map((bin) => (
                <TableRow key={bin.id}>
                  <TableCell>{bin.row}</TableCell>
                  <TableCell>{bin.rack}</TableCell>
                  <TableCell>{bin.bin_id}</TableCell>
                  <TableCell>{bin.shelf}</TableCell>
                  <TableCell>{bin.used}/{bin.capacity}</TableCell>
                  <TableCell>
                    <Box sx={{ bgcolor: getStatusColor(bin), color: 'white', p: 1, borderRadius: 1 }}>
                      {getStatusText(bin)}
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  No bins found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <Box mt={3} display="flex" justifyContent="center">
          <Pagination
            count={totalPages}
            page={page}
            onChange={(_, value) => setPage(value)}
            color="primary"
          />
        </Box>
      </Paper>
    </Container>
  );
}