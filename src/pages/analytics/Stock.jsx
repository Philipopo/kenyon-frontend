import React, { useState, useEffect, useCallback } from 'react';
import {
  Container, Typography, Paper, Table, TableHead, TableRow, TableCell,
  TableBody, TextField, Box, TableContainer, InputAdornment, Pagination,
  CircularProgress, Alert, Button, Dialog, DialogTitle, DialogContent,
  DialogActions, Grid, FormControl, InputLabel, Select, MenuItem, Link
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AssessmentIcon from '@mui/icons-material/Assessment';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import API from '../../api';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

export default function StockAnalytics() {
  const [data, setData] = useState([]);
  const [forecastData, setForecastData] = useState([]);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    item: '',
    category: 'A',
    turnover_rate: '',
    obsolescence_risk: '',
  });
  const [formAlert, setFormAlert] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [hasPageAccess, setHasPageAccess] = useState(false);
  const [checkingPermissions, setCheckingPermissions] = useState(true);
  const [canCreateStock, setCanCreateStock] = useState(false);
  const itemsPerPage = 10;
  const navigate = useNavigate();

  const checkAuth = useCallback(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      setError('⚠️ No authentication token found. Please log in.');
      setTimeout(() => navigate('/login'), 2000);
      return false;
    }
    return token;
  }, [navigate]);

  const fetchStockData = useCallback(async () => {
    const token = checkAuth();
    if (!token) return;
    
    try {
      const response = await API.get('analytics/stock/', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setData(response.data.results || response.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching stock analytics:', err);
      if (err.response?.status === 401) {
        setError('⚠️ Session expired. Please log in again.');
        navigate('/login');
      } else {
        setError(`⚠️ Failed to load stock analytics: ${err.response?.data?.detail || err.message}`);
      }
      setLoading(false);
    }
  }, [checkAuth, navigate]);

  const fetchForecastData = useCallback(async () => {
    const token = checkAuth();
    if (!token) return;
    
    try {
      const response = await API.get('inventory/items/', {
        headers: { Authorization: `Bearer ${token}` },
        params: { page_size: 1000 }
      });
      const items = response.data.results || response.data;
      const forecastPromises = items.map(item =>
        API.get(`analytics/forecast/?item_id=${item.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
      );
      const forecasts = await Promise.all(forecastPromises);
      setForecastData(forecasts.map(res => res.data));
    } catch (err) {
      setError(`❌ Failed to fetch forecast data: ${err.response?.data?.detail || err.message}`);
    }
  }, [checkAuth]);

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
        API.get('/auth/permissions/page/analytics_stock/', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        API.get('/auth/permissions/action/create_stock_analytics/', {
          headers: { Authorization: `Bearer ${token}` },
        })
      ]);
      
      if (!pageResponse.data.allowed) {
        setError(`⚠️ ${pageResponse.data.reason || 'No permission to view stock analytics.'}`);
        setHasPageAccess(false);
        setCheckingPermissions(false);
        return;
      }
      
      setHasPageAccess(true);
      setCanCreateStock(actionResponse.data.allowed || false);
      await Promise.all([fetchStockData(), fetchForecastData()]);
      
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
  }, [checkAuth, fetchStockData, fetchForecastData, navigate]);

  useEffect(() => {
    checkPermissions();
  }, [checkPermissions]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const handleCreateStock = async () => {
    const { item, category, turnover_rate, obsolescence_risk } = form;
    if (!item || !category || !turnover_rate || !obsolescence_risk) {
      setFormAlert('⚠ Please fill in all required fields.');
      return;
    }

    const riskMapping = {
      'Low Risk': 'low',
      'Medium Risk': 'medium',
      'High Risk': 'high',
      'Critical Risk': 'critical',
    };
    const formattedForm = {
      ...form,
      obsolescence_risk: riskMapping[obsolescence_risk] || obsolescence_risk,
    };

    try {
      setFormLoading(true);
      const token = checkAuth();
      if (!token) throw new Error('No authentication token found.');
      
      const res = await API.post('analytics/stock/', formattedForm, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      setData(prevData => [res.data, ...prevData]);
      setOpen(false);
      setFormAlert(null);
      setForm({ item: '', category: 'A', turnover_rate: '', obsolescence_risk: '' });
      toast.success('✅ Stock analytics created successfully', { id: 'stock-create' });
    } catch (err) {
      console.error('Error creating stock analytics:', err.response?.data);
      setFormAlert(err.response?.data?.detail || '❌ Failed to create stock analytics.');
    } finally {
      setFormLoading(false);
    }
  };

  const filteredData = data.filter(
    (item) =>
      item.item?.toLowerCase().includes(search.toLowerCase()) ||
      item.category?.toLowerCase().includes(search.toLowerCase()) ||
      item.obsolescence_risk?.toLowerCase().includes(search.toLowerCase())
  );

  const paginatedData = filteredData.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  const categoryDistribution = {
    labels: ['A Items (High Value)', 'B Items (Medium Value)', 'C Items (Low Value)'],
    datasets: [{
      label: 'Number of Items',
      data: [
        data.filter(item => item.category === 'A').length,
        data.filter(item => item.category === 'B').length,
        data.filter(item => item.category === 'C').length
      ],
      backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56'],
      borderWidth: 1,
    }]
  };

  const riskDistribution = {
    labels: ['Low Risk', 'Medium Risk', 'High Risk', 'Critical Risk'],
    datasets: [{
      label: 'Number of Items',
      data: [
        data.filter(item => item.obsolescence_risk?.toLowerCase().includes('low')).length,
        data.filter(item => item.obsolescence_risk?.toLowerCase().includes('medium')).length,
        data.filter(item => item.obsolescence_risk?.toLowerCase().includes('high')).length,
        data.filter(item => item.obsolescence_risk?.toLowerCase().includes('critical')).length
      ],
      backgroundColor: ['#4BC0C0', '#FFCE56', '#FF9F40', '#FF6384'],
      borderWidth: 1,
    }]
  };

  const turnoverAnalysis = {
    labels: data.map(item => item.item).slice(0, 10),
    datasets: [{
      label: 'Turnover Rate',
      data: data.map(item => parseFloat(item.turnover_rate) || 0).slice(0, 10),
      backgroundColor: '#9966FF',
      borderWidth: 1,
    }, {
      label: 'Forecasted Demand (units/year)',
      data: data.map(item => {
        const forecast = forecastData.find(f => f.item_name === item.item)?.forecasted_demand || 0;
        return forecast;
      }).slice(0, 10),
      backgroundColor: '#82ca9d',
      borderWidth: 1,
    }]
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
          Stock Analytics
        </Typography>
        <Typography variant="subtitle1" sx={{ mb: 3 }}>
          Review turnover rates, ABC classifications, and obsolescence risk. For EOQ and reorder recommendations, visit{' '}
          <Link href="/analytics/optimization" color="primary">Stock Optimization</Link>.
        </Typography>

        <Box display="flex" justifyContent="space-between" mb={2}>
          <TextField
            placeholder="Search by item, category, or risk..."
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
            disabled={!canCreateStock}
          >
            Add Stock Analytics
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
            <Box sx={{ mb: 4, display: 'flex', flexWrap: 'wrap', gap: 3, justifyContent: 'center' }}>
              <Box sx={{ width: 300, p: 2, border: '1px solid #e0e0e0', borderRadius: 2 }}>
                <Typography variant="h6" gutterBottom align="center">
                  ABC Classification
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2, textAlign: 'center' }}>
                  A: High value items (20% of items, 80% of value)<br/>
                  B: Medium value items (30% of items, 15% of value)<br/>
                  C: Low value items (50% of items, 5% of value)
                </Typography>
                {data.length > 0 ? (
                  <Pie data={categoryDistribution} />
                ) : (
                  <Typography variant="body2" color="text.secondary" align="center">
                    No data for chart
                  </Typography>
                )}
              </Box>

              <Box sx={{ width: 300, p: 2, border: '1px solid #e0e0e0', borderRadius: 2 }}>
                <Typography variant="h6" gutterBottom align="center">
                  Obsolescence Risk
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2, textAlign: 'center' }}>
                  Monitor items at risk of becoming obsolete
                </Typography>
                {data.length > 0 ? (
                  <Pie data={riskDistribution} />
                ) : (
                  <Typography variant="body2" color="text.secondary" align="center">
                    No data for chart
                  </Typography>
                )}
              </Box>

              <Box sx={{ width: 400, p: 2, border: '1px solid #e0e0e0', borderRadius: 2 }}>
                <Typography variant="h6" gutterBottom align="center">
                  Top 10 Items by Turnover & Demand
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2, textAlign: 'center' }}>
                  Higher turnover = faster selling items. Forecasted demand aids EOQ planning.
                </Typography>
                {data.length > 0 ? (
                  <Bar 
                    data={turnoverAnalysis} 
                    options={{
                      responsive: true,
                      plugins: {
                        legend: { display: true }
                      }
                    }}
                  />
                ) : (
                  <Typography variant="body2" color="text.secondary" align="center">
                    No data for chart
                  </Typography>
                )}
              </Box>
            </Box>

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
                      <TableRow key={row.id || index}>
                        <TableCell>{(page - 1) * itemsPerPage + index + 1}</TableCell>
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={1}>
                            <AssessmentIcon fontSize="small" color="primary" />
                            {row.item || 'N/A'}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box 
                            sx={{ 
                              px: 1, 
                              py: 0.5, 
                              borderRadius: 1, 
                              display: 'inline-block',
                              backgroundColor: 
                                row.category === 'A' ? '#ffebee' : 
                                row.category === 'B' ? '#e3f2fd' : '#fff8e1',
                              color: 
                                row.category === 'A' ? '#c62828' : 
                                row.category === 'B' ? '#1565c0' : '#f57c00',
                              fontWeight: 'bold'
                            }}
                          >
                            {row.category || 'N/A'}
                          </Box>
                        </TableCell>
                        <TableCell>{row.turnover_rate || 'N/A'}</TableCell>
                        <TableCell>
                          <Box 
                            sx={{ 
                              px: 1, 
                              py: 0.5, 
                              borderRadius: 1, 
                              display: 'inline-block',
                              backgroundColor: 
                                row.obsolescence_risk?.toLowerCase().includes('low') ? '#e8f5e8' : 
                                row.obsolescence_risk?.toLowerCase().includes('medium') ? '#fff3e0' :
                                row.obsolescence_risk?.toLowerCase().includes('high') ? '#ffebee' : '#f5f5f5',
                              color: 
                                row.obsolescence_risk?.toLowerCase().includes('low') ? '#2e7d32' : 
                                row.obsolescence_risk?.toLowerCase().includes('medium') ? '#f57c00' :
                                row.obsolescence_risk?.toLowerCase().includes('high') ? '#c62828' : '#757575',
                            }}
                          >
                            {row.obsolescence_risk || 'N/A'}
                          </Box>
                        </TableCell>
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
          * ABC Classification: A items (high value), B items (medium value), C items (low value)<br/>
          * Turnover Rate: How quickly items sell (higher = better)<br/>
          * Obsolescence Risk: Likelihood items become outdated or unsellable
        </Typography>

        <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
          <DialogTitle>Add Stock Analytics</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <TextField
                  name="item"
                  label="Item Name"
                  fullWidth
                  value={form.item}
                  onChange={handleChange}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth required>
                  <InputLabel>ABC Category</InputLabel>
                  <Select
                    name="category"
                    value={form.category}
                    onChange={handleChange}
                    label="ABC Category"
                  >
                    <MenuItem value="A">A - High Value Items</MenuItem>
                    <MenuItem value="B">B - Medium Value Items</MenuItem>
                    <MenuItem value="C">C - Low Value Items</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  name="turnover_rate"
                  label="Turnover Rate"
                  type="number"
                  fullWidth
                  value={form.turnover_rate}
                  onChange={handleChange}
                  inputProps={{ step: "0.01", min: 0 }}
                  required
                  helperText="How quickly items sell (higher = better)"
                />
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth required>
                  <InputLabel>Obsolescence Risk</InputLabel>
                  <Select
                    name="obsolescence_risk"
                    value={form.obsolescence_risk}
                    onChange={handleChange}
                    label="Obsolescence Risk"
                  >
                    <MenuItem value="Low Risk">Low Risk</MenuItem>
                    <MenuItem value="Medium Risk">Medium Risk</MenuItem>
                    <MenuItem value="High Risk">High Risk</MenuItem>
                    <MenuItem value="Critical Risk">Critical Risk</MenuItem>
                  </Select>
                </FormControl>
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
              onClick={handleCreateStock}
              disabled={formLoading || !canCreateStock}
            >
              {formLoading ? <CircularProgress size={24} color="inherit" /> : 'Create'}
            </Button>
          </DialogActions>
        </Dialog>
      </Paper>
    </Container>
  );
}