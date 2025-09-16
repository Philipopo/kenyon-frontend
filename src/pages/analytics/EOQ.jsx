import React, { useState, useEffect, useCallback } from 'react';
import {
  Container, Typography, Paper, TextField, InputAdornment, Table,
  TableBody, TableCell, TableHead, TableRow, Pagination, Box,
  TableContainer, CircularProgress, Alert, Button, Dialog,
  DialogTitle, DialogContent, DialogActions, Grid, Select, MenuItem
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import API from '../../api';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Pie } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

export default function EOQReports() {
  const [data, setData] = useState([]);
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    item: '',
    demand_rate: '',
    order_cost: '',
    holding_cost: '',
    lead_time_days: '',
    safety_stock: ''
  });
  const [formAlert, setFormAlert] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [hasPageAccess, setHasPageAccess] = useState(false);
  const [checkingPermissions, setCheckingPermissions] = useState(true);
  const [canCreateEOQ, setCanCreateEOQ] = useState(false);
  const itemsPerPage = 10;
  const navigate = useNavigate();

  // Debug localStorage tokens
  useEffect(() => {
    console.log('🔍 Debug - LocalStorage tokens:', {
      accessToken: localStorage.getItem('accessToken'),
      access_token: localStorage.getItem('access_token'),
      refreshToken: localStorage.getItem('refreshToken'),
      user: localStorage.getItem('user')
    });
  }, []);

  const checkAuth = useCallback(() => {
    // FIXED: Use 'accessToken' instead of 'access_token'
    const token = localStorage.getItem('accessToken');
    if (!token) {
      setError('⚠️ No authentication token found. Please log in.');
      setTimeout(() => navigate('/login'), 2000);
      return false;
    }
    return token;
  }, [navigate]);

  const fetchItems = useCallback(async () => {
    const token = checkAuth();
    if (!token) return;
    
    try {
      const response = await API.get('/inventory/items/', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setItems(response.data.results || response.data);
    } catch (err) {
      console.error('Error fetching items:', err);
      if (err.response?.status === 401) {
        setError('⚠️ Session expired. Please log in again.');
        navigate('/login');
      } else {
        setError(`⚠️ Failed to load items: ${err.response?.data?.detail || err.message}`);
      }
    }
  }, [checkAuth, navigate]);

  const fetchEOQReports = useCallback(async () => {
    const token = checkAuth();
    if (!token) return;
    
    try {
      const response = await API.get('/analytics/eoq-v2/', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setData(response.data.results || response.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching EOQ reports:', err);
      if (err.response?.status === 401) {
        setError('⚠️ Session expired. Please log in again.');
        navigate('/login');
      } else {
        setError(`⚠️ Failed to load EOQ reports: ${err.response?.data?.detail || err.message}`);
      }
      setLoading(false);
    }
  }, [checkAuth, navigate]);

  const checkPermissions = useCallback(async () => {
    setCheckingPermissions(true);
    const token = checkAuth();
    if (!token) {
      setHasPageAccess(false);
      setCheckingPermissions(false);
      return;
    }

    try {
      const [pageResponse, actionResponse] = await Promise.all([
        API.get('/auth/permissions/page/analytics_eoq/', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        API.get('/auth/permissions/action/create_eoq/', {
          headers: { Authorization: `Bearer ${token}` },
        })
      ]);
      
      if (!pageResponse.data.allowed) {
        setError(`⚠️ ${pageResponse.data.reason || 'No permission to view EOQ reports.'}`);
        setHasPageAccess(false);
        setCheckingPermissions(false);
        return;
      }
      
      setHasPageAccess(true);
      setCanCreateEOQ(actionResponse.data.allowed || false);
      await Promise.all([fetchItems(), fetchEOQReports()]);
      
    } catch (err) {
      console.error('Error checking permissions:', err);
      if (err.response?.status === 401) {
        setError('⚠️ Authentication failed. Please log in again.');
        navigate('/login');
      } else {
        setError(`⚠️ Failed to check permissions: ${err.response?.data?.detail || err.message}`);
      }
      setHasPageAccess(false);
    } finally {
      setCheckingPermissions(false);
    }
  }, [checkAuth, fetchItems, fetchEOQReports, navigate]);

  useEffect(() => {
    checkPermissions();
  }, [checkPermissions]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const handleCreateEOQ = async () => {
    const { item, demand_rate, order_cost, holding_cost, lead_time_days } = form;
    if (!item || !demand_rate || !order_cost || !holding_cost || !lead_time_days) {
      setFormAlert('⚠ Please fill in all required fields.');
      return;
    }

    try {
      setFormLoading(true);
      const token = checkAuth();
      if (!token) throw new Error('No authentication token found.');
      
      const res = await API.post('/analytics/eoq-v2/', {
        item, 
        demand_rate, 
        order_cost, 
        holding_cost, 
        lead_time_days, 
        safety_stock: form.safety_stock || 0
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      setData(prevData => [res.data, ...prevData]);
      setOpen(false);
      setFormAlert(null);
      setForm({ 
        item: '', 
        demand_rate: '', 
        order_cost: '', 
        holding_cost: '', 
        lead_time_days: '', 
        safety_stock: '' 
      });
      toast.success('✅ EOQ report created successfully', { id: 'eoq-create' });
    } catch (err) {
      console.error('Error creating EOQ report:', err);
      setFormAlert(err.response?.data?.detail || '❌ Failed to create EOQ report.');
    } finally {
      setFormLoading(false);
    }
  };

  const filteredData = data.filter((row) =>
    row.item_name?.toLowerCase().includes(search.toLowerCase()) ||
    row.part_number?.toLowerCase().includes(search.toLowerCase())
  );

  const paginatedData = filteredData.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  const chartData = {
    labels: paginatedData.map(row => row.item_name),
    datasets: [{
      label: 'EOQ (units)',
      data: paginatedData.map(row => row.eoq || 0),
      backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF'],
    }],
  };

  if (checkingPermissions) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Typography variant="h6">Loading permissions...</Typography>
      </Container>
    );
  }

  if (!hasPageAccess) {
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
          EOQ Reports
        </Typography>
        <Typography variant="subtitle1" sx={{ mb: 3 }}>
          Auto-replenishment insights based on demand, order cost, and holding cost data.
        </Typography>

        <Box display="flex" justifyContent="space-between" mb={2}>
          <TextField
            placeholder="Search by item or part number..."
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
          <Button
            variant="contained"
            onClick={() => setOpen(true)}
            disabled={!canCreateEOQ || items.length === 0}
          >
            Add EOQ Report
          </Button>
        </Box>

        {loading ? (
          <Box display="flex" justifyContent="center" my={4}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : (
          <>
            <Box sx={{ mb: 4, maxWidth: 400 }}>
              <Typography variant="h6" gutterBottom>EOQ Distribution</Typography>
              {paginatedData.length > 0 ? (
                <Pie data={chartData} />
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No data available for chart
                </Typography>
              )}
            </Box>
            
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>S/N</TableCell>
                    <TableCell>Item</TableCell>
                    <TableCell>Part Number</TableCell>
                    <TableCell>Demand Rate (units/year)</TableCell>
                    <TableCell>Order Cost (₦)</TableCell>
                    <TableCell>Holding Cost (₦/unit/year)</TableCell>
                    <TableCell>EOQ (units)</TableCell>
                    <TableCell>Reorder Point</TableCell>
                    <TableCell>Total Cost (₦)</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedData.length > 0 ? (
                    paginatedData.map((row, index) => (
                      <TableRow key={row.id || index}>
                        <TableCell>{(page - 1) * itemsPerPage + index + 1}</TableCell>
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={1}>
                            <PrecisionManufacturingIcon fontSize="small" color="primary" />
                            {row.item_name || 'N/A'}
                          </Box>
                        </TableCell>
                        <TableCell>{row.part_number || 'N/A'}</TableCell>
                        <TableCell>{row.demand_rate || 'N/A'}</TableCell>
                        <TableCell>₦{parseFloat(row.order_cost || 0).toFixed(2)}</TableCell>
                        <TableCell>₦{parseFloat(row.holding_cost || 0).toFixed(2)}</TableCell>
                        <TableCell>{row.eoq || 'N/A'}</TableCell>
                        <TableCell>{row.reorder_point || 'N/A'}</TableCell>
                        <TableCell>₦{parseFloat(row.total_cost || 0).toFixed(2)}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={9} align="center">
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
          EOQ helps in minimizing total inventory costs. Review reports to determine optimal order quantity and restocking efficiency.
        </Typography>

        <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
          <DialogTitle>Add EOQ Report</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <Select
                  name="item"
                  value={form.item}
                  onChange={handleChange}
                  fullWidth
                  displayEmpty
                  renderValue={(value) => {
                    const selected = items.find(i => i.id === value);
                    return selected ? `${selected.name} (${selected.part_number})` : 'Select Item';
                  }}
                  disabled={items.length === 0}
                >
                  {items.map(item => (
                    <MenuItem key={item.id} value={item.id}>
                      {item.name} ({item.part_number})
                    </MenuItem>
                  ))}
                </Select>
                {items.length === 0 && (
                  <Typography color="error" variant="caption">
                    No items available. Add items first.
                  </Typography>
                )}
              </Grid>
              <Grid item xs={12}>
                <TextField
                  name="demand_rate"
                  label="Demand Rate (units/year)"
                  type="number"
                  fullWidth
                  value={form.demand_rate}
                  onChange={handleChange}
                  required
                  inputProps={{ min: 1 }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  name="order_cost"
                  label="Order Cost (₦)"
                  type="number"
                  fullWidth
                  value={form.order_cost}
                  onChange={handleChange}
                  inputProps={{ step: "0.01", min: 0.01 }}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  name="holding_cost"
                  label="Holding Cost (₦/unit/year)"
                  type="number"
                  fullWidth
                  value={form.holding_cost}
                  onChange={handleChange}
                  inputProps={{ step: "0.01", min: 0.01 }}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  name="lead_time_days"
                  label="Lead Time (days)"
                  type="number"
                  fullWidth
                  value={form.lead_time_days}
                  onChange={handleChange}
                  required
                  inputProps={{ min: 0 }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  name="safety_stock"
                  label="Safety Stock (units)"
                  type="number"
                  fullWidth
                  value={form.safety_stock}
                  onChange={handleChange}
                  inputProps={{ min: 0 }}
                />
              </Grid>
            </Grid>

            {formAlert && (
              <Alert sx={{ mt: 2 }} severity={formAlert.includes('❌') ? 'error' : 'warning'}>
                {formAlert}
              </Alert>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              variant="contained"
              onClick={handleCreateEOQ}
              disabled={formLoading || !canCreateEOQ || items.length === 0}
            >
              {formLoading ? <CircularProgress size={24} color="inherit" /> : 'Create'}
            </Button>
          </DialogActions>
        </Dialog>
      </Paper>
    </Container>
  );
}