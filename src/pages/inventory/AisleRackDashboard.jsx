import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  Container, Typography, Paper, Table, TableHead, TableRow, TableCell, TableBody,
  TableContainer, Box, Alert, Pagination, TextField, InputAdornment, Button
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import API from '../../api';
import { useSearch } from '../../context/SearchContext';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';
import { toast } from 'react-hot-toast';

// Register ChartJS components
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

export default function AisleRackDashboard() {
  const [bins, setBins] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [checkingPermissions, setCheckingPermissions] = useState(true);
  const [hasPermission, setHasPermission] = useState(false);
  const { searchTerm, setSearchTerm } = useSearch();
  const itemsPerPage = 10;
  const prevSearchTermRef = useRef(searchTerm);

  // Define handleSearch with useCallback
  const handleSearch = useCallback((value) => {
    setSearchTerm(value);
    setPage(1);
  }, [setSearchTerm]);

  const fetchBins = useCallback(async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setError('⚠️ No authentication token found. Please log in.');
        return;
      }
      const res = await API.get('/inventory/bins/', {
        params: { search: searchTerm, page, page_size: itemsPerPage },
        headers: { Authorization: `Bearer ${token}` },
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
  }, [page, searchTerm, itemsPerPage]);

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
        const pageResponse = await API.get('/auth/permissions/page/aisle_rack_dashboard/', {
          headers: { Authorization: `Bearer ${token}` },
        });
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

  // Calculate capacity usage percentage for alerts
  const getCapacityPercentage = (bin) => {
    return (bin.used / bin.capacity) * 100;
  };

  // Chart data for bin capacity distribution
  const capacityDistribution = {
    labels: ['Nearly Empty (<20%)', 'Partially Used (20-80%)', 'Nearly Full (≥80%)'],
    datasets: [{
      label: 'Number of Bins',
      data: [
        bins.filter(bin => getCapacityPercentage(bin) < 20).length,
        bins.filter(bin => getCapacityPercentage(bin) >= 20 && getCapacityPercentage(bin) < 80).length,
        bins.filter(bin => getCapacityPercentage(bin) >= 80).length,
      ],
      backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56'],
      borderWidth: 1,
    }]
  };

  // Chart data for bin types
  const typeDistribution = {
    labels: [...new Set(bins.map(bin => bin.type))],
    datasets: [{
      label: 'Number of Bins',
      data: [...new Set(bins.map(bin => bin.type))].map(type => 
        bins.filter(bin => bin.type === type).length
      ),
      backgroundColor: ['#4BC0C0', '#FFCE56', '#FF9F40', '#FF6384'],
      borderWidth: 1,
    }]
  };

  // Chart data for top 5 bins by used capacity
  const topBinsByUsage = {
    labels: bins.sort((a, b) => b.used - a.used).slice(0, 5).map(bin => bin.bin_id),
    datasets: [{
      label: 'Used Capacity',
      data: bins.sort((a, b) => b.used - a.used).slice(0, 5).map(bin => bin.used),
      backgroundColor: '#9966FF',
      borderWidth: 1,
    }]
  };

  // Alerts for nearly full and nearly empty bins
  const nearlyFullBins = bins.filter(bin => getCapacityPercentage(bin) >= 80);
  const nearlyEmptyBins = bins.filter(bin => getCapacityPercentage(bin) < 20);

  if (checkingPermissions) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Typography variant="h6">Loading permissions...</Typography>
      </Container>
    );
  }

  if (!hasPermission) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error">{error || 'Access Denied: You do not have permission to view this page.'}</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom>
          Aisle & Rack Management Dashboard
        </Typography>
        <Typography variant="subtitle1" sx={{ mb: 3 }}>
          Monitor storage bins, check space usage, and get alerts for bins that are almost full or nearly empty.
        </Typography>

        {/* Alerts for Nearly Full and Nearly Empty Bins */}
        {nearlyFullBins.length > 0 && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            ⚠️ {nearlyFullBins.length} bin(s) are 80% or more full: {nearlyFullBins.map(bin => bin.bin_id).join(', ')}. Consider reorganizing or adding new bins.
          </Alert>
        )}
        {nearlyEmptyBins.length > 0 && (
          <Alert severity="info" sx={{ mb: 2 }}>
            ℹ️ {nearlyEmptyBins.length} bin(s) are less than 20% full: {nearlyEmptyBins.map(bin => bin.bin_id).join(', ')}. These bins may be underutilized.
          </Alert>
        )}

        <Box display="flex" justifyContent="space-between" mb={2}>
          <TextField
            placeholder="Search by bin ID, aisle, or rack..."
            variant="outlined"
            size="small"
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
          <Button
            variant="contained"
            onClick={() => toast.success('Add Bin feature coming soon!')}
          >
            Add New Bin
          </Button>
        </Box>

        {/* Charts Section */}
        <Box sx={{ mb: 4, display: 'flex', flexWrap: 'wrap', gap: 3, justifyContent: 'center' }}>
          {/* Capacity Distribution Chart */}
          <Box sx={{ width: 300, p: 2, border: '1px solid #e0e0e0', borderRadius: 2 }}>
            <Typography variant="h6" gutterBottom align="center">
              Bin Capacity Usage
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2, textAlign: 'center' }}>
              Nearly Empty: Less than 20% full<br/>
              Partially Used: 20% to 80% full<br/>
              Nearly Full: 80% or more full
            </Typography>
            {bins.length > 0 ? (
              <Pie data={capacityDistribution} />
            ) : (
              <Typography variant="body2" color="text.secondary" align="center">
                No data for chart
              </Typography>
            )}
          </Box>

          {/* Bin Type Distribution Chart */}
          <Box sx={{ width: 300, p: 2, border: '1px solid #e0e0e0', borderRadius: 2 }}>
            <Typography variant="h6" gutterBottom align="center">
              Bin Types
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2, textAlign: 'center' }}>
              Shows different types of bins (e.g., Standard, Heavy Duty)
            </Typography>
            {bins.length > 0 ? (
              <Pie data={typeDistribution} />
            ) : (
              <Typography variant="body2" color="text.secondary" align="center">
                No data for chart
              </Typography>
            )}
          </Box>

          {/* Top 5 Bins by Used Capacity */}
          <Box sx={{ width: 400, p: 2, border: '1px solid #e0e0e0', borderRadius: 2 }}>
            <Typography variant="h6" gutterBottom align="center">
              Top 5 Bins by Used Space
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2, textAlign: 'center' }}>
              Shows bins with the most items stored
            </Typography>
            {bins.length > 0 ? (
              <Bar 
                data={topBinsByUsage}
                options={{
                  responsive: true,
                  plugins: {
                    legend: { display: false },
                  },
                }}
              />
            ) : (
              <Typography variant="body2" color="text.secondary" align="center">
                No data for chart
              </Typography>
            )}
          </Box>
        </Box>

        {/* Table Section */}
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell><strong>Aisle (Row)</strong></TableCell>
                <TableCell><strong>Rack</strong></TableCell>
                <TableCell><strong>Bin ID</strong></TableCell>
                <TableCell><strong>Shelf</strong></TableCell>
                <TableCell><strong>Type</strong></TableCell>
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
                    <TableCell>{bin.type}</TableCell>
                    <TableCell>{bin.used}/{bin.capacity} ({getCapacityPercentage(bin).toFixed(1)}%)</TableCell>
                    <TableCell>
                      <Box
                        sx={{
                          bgcolor:
                            getCapacityPercentage(bin) >= 80 ? '#FF6384' :
                            getCapacityPercentage(bin) < 20 ? '#4BC0C0' : '#36A2EB',
                          color: 'white',
                          p: 1,
                          borderRadius: 1,
                        }}
                      >
                        {getCapacityPercentage(bin) >= 80 ? 'Nearly Full' :
                         getCapacityPercentage(bin) < 20 ? 'Nearly Empty' : 'Partially Used'}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    No bins found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <Box display="flex" justifyContent="center" mt={3}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={(_, value) => setPage(value)}
            color="primary"
          />
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ mt: 4 }}>
          * <strong>Aisle (Row)</strong>: The section of the warehouse where the bin is located, like a street in a city.<br/>
          * <strong>Rack</strong>: The specific rack within an aisle, like a house number on a street.<br/>
          * <strong>Bin ID</strong>: A unique name for each storage bin, like a label on a box.<br/>
          * <strong>Shelf</strong>: The level or shelf within the rack where items are stored.<br/>
          * <strong>Type</strong>: The kind of bin (e.g., Standard for regular items, Heavy Duty for large items).<br/>
          * <strong>Used/Capacity</strong>: How many items are in the bin compared to how many it can hold.<br/>
          * <strong>Status</strong>: 
            - Nearly Full (80% or more): Bin is almost out of space, needs attention.<br/>
            - Nearly Empty (less than 20%): Bin has lots of free space, could be used more.<br/>
            - Partially Used (20-80%): Bin has a balanced amount of items.
        </Typography>
      </Paper>
    </Container>
  );
}