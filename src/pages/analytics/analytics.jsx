import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Container,
  Typography,
  Paper,
  Box,
  Button,
  Alert,
  Tabs,
  Tab,
  TextField,
  MenuItem,
  CircularProgress,
  Grid,
  Card,
  CardContent,
  Divider,
} from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import API from '../../api';

/* ------------------------------------------------------------------ */
/*  CONSTANTS & HELPERS                                               */
/* ------------------------------------------------------------------ */
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const QUICK_RANGES = [
  { label: 'Today', value: 'today' },
  { label: 'Last 7 Days', value: '7d' },
  { label: 'Last 30 Days', value: '30d' },
  { label: 'This Month', value: 'month' },
  { label: 'Last Quarter', value: 'quarter' },
  { label: 'YTD', value: 'ytd' },
];

const formatDate = (date) => date.toISOString().split('T')[0];

const getQuickDateRange = (preset) => {
  const today = new Date();
  const start = new Date(today);

  switch (preset) {
    case 'today':
      return { start: formatDate(today), end: formatDate(today) };
    case '7d':
      start.setDate(today.getDate() - 6);
      return { start: formatDate(start), end: formatDate(today) };
    case '30d':
      start.setDate(today.getDate() - 29);
      return { start: formatDate(start), end: formatDate(today) };
    case 'month':
      start.setDate(1);
      return { start: formatDate(start), end: formatDate(today) };
    case 'quarter': {
      const quarter = Math.floor(today.getMonth() / 3);
      start.setMonth(quarter * 3, 1);
      return { start: formatDate(start), end: formatDate(today) };
    }
    case 'ytd':
      start.setMonth(0, 1);
      return { start: formatDate(start), end: formatDate(today) };
    default:
      return { start: '', end: '' };
  }
};

/* ------------------------------------------------------------------ */
/*  MAIN COMPONENT                                                    */
/* ------------------------------------------------------------------ */
export default function AnalyticsDashboard() {
  const [activeTab, setActiveTab] = useState('inventory');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [quickRange, setQuickRange] = useState('30d');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [itemOptions, setItemOptions] = useState([]);

  /* ----------------------- LOAD ITEMS (Inventory tab) ----------------------- */
  useEffect(() => {
    if (activeTab !== 'inventory') {
      setItemOptions([]);
      setSelectedItemId(null);
      return;
    }

    const loadItems = async () => {
      try {
        const res = await API.get('inventory/items/', {
          params: { page_size: 1000 },
          headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
        });
        setItemOptions(res.data.results || []);
      } catch (err) {
        console.error('Failed to load items:', err);
      }
    };
    loadItems();
  }, [activeTab]);

  /* ----------------------- INITIAL DATE RANGE ----------------------- */
  useEffect(() => {
    const { start, end } = getQuickDateRange(quickRange);
    setStartDate(start);
    setEndDate(end);
  }, [quickRange]);

  /* ----------------------- FETCH ANALYTICS ----------------------- */
  const fetchData = useCallback(async () => {
    if (!startDate || !endDate) return;

    setLoading(true);
    setError('');
    try {
      const params = {
        start_date: startDate,
        end_date: endDate,
      };
      if (activeTab === 'inventory' && selectedItemId) {
        params.item_id = selectedItemId;
      }

      const res = await API.get(`analyticsnew/${activeTab}/`, {
        params,
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
      });
      setData(res.data);
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Unknown error';
      setError(`Failed to load analytics: ${msg}`);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [activeTab, startDate, endDate, selectedItemId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* ----------------------- QUICK RANGE HANDLER ----------------------- */
  const handleQuickRangeChange = (e) => {
    const value = e.target.value;
    setQuickRange(value);
    const { start, end } = getQuickDateRange(value);
    setStartDate(start);
    setEndDate(end);
  };

  /* ----------------------- PDF EXPORT ----------------------- */
  const handleExportPDF = async () => {
    setLoading(true);
    try {
      const params = {
        tab: activeTab,
        start_date: startDate,
        end_date: endDate,
      };
      if (selectedItemId) params.item_id = selectedItemId;

      const response = await API.get('analyticsnew/export-pdf/', {
        params,
        responseType: 'blob',
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `Analytics_${activeTab}_${startDate}_to_${endDate}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Unknown error';
      setError(`Failed to export PDF: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  /* ----------------------- KPI CARDS ----------------------- */
  const kpiCards = useMemo(() => {
    if (!data?.metrics) return null;
    return Object.entries(data.metrics).map(([key, value]) => (
      <Grid item xs={12} sm={6} md={4} lg={3} key={key}>
        <Card variant="outlined">
          <CardContent>
            <Typography variant="body2" color="textSecondary">
              {key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
            </Typography>
            <Typography variant="h6">
              {typeof value === 'number' ? value.toLocaleString() : String(value)}
            </Typography>
          </CardContent>
        </Card>
      </Grid>
    ));
  }, [data?.metrics]);

  /* ----------------------- TOP TABLE (Bar) ----------------------- */
  const topTable = useMemo(() => {
    if (!data) return null;

    let topKey = '';
    let title = '';
    let dataKeyX = '';
    let dataKeyBar = '';
    let barName = '';

    if (activeTab === 'inventory') {
      topKey = 'top_active_bins';
      title = 'Top 5 Most Active Bins';
      dataKeyX = 'bin_id';
      dataKeyBar = 'movement_count';
      barName = 'Movements';
    } else if (activeTab === 'procurement') {
      topKey = 'top_vendors';
      title = 'Top 5 Vendors by Order Volume';
      dataKeyX = 'name';
      dataKeyBar = 'order_count';
      barName = 'Orders';
    } else {
      return null;
    }

    const items = data[topKey] || [];
    if (items.length === 0) return null;

    return (
      <Paper sx={{ p: 2, mt: 3 }}>
        <Typography variant="h6" gutterBottom>{title}</Typography>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={items}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={dataKeyX} />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey={dataKeyBar} fill="#8884d8" name={barName} />
          </BarChart>
        </ResponsiveContainer>
      </Paper>
    );
  }, [data, activeTab]);

  /* ----------------------- TIME-SERIES CHART ----------------------- */
  const timeSeriesChart = useMemo(() => {
    if (!data?.chart_data) return null;
    return (
      <Paper sx={{ p: 2, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          {selectedItemId ? 'Item Movement History' : 'Overall Stock Movement'}
        </Typography>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data.chart_data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="stock_in" fill="#82ca9d" name="Stock In" />
            <Bar dataKey="stock_out" fill="#8884d8" name="Stock Out" />
          </BarChart>
        </ResponsiveContainer>
      </Paper>
    );
  }, [data?.chart_data, selectedItemId]);

  /* ----------------------- ITEM DISTRIBUTION PIE ----------------------- */
  const itemDistributionPie = useMemo(() => {
    if (!data?.item_distribution || selectedItemId) return null;
    return (
      <Paper sx={{ p: 2, mt: 3 }}>
        <Typography variant="h6" gutterBottom>Item Quantity Distribution</Typography>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data.item_distribution}
              cx="50%"
              cy="50%"
              labelLine={false}
              outerRadius={80}
              dataKey="value"
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
            >
              {data.item_distribution.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => [value.toLocaleString(), 'Quantity']} />
          </PieChart>
        </ResponsiveContainer>
      </Paper>
    );
  }, [data?.item_distribution, selectedItemId]);

  /* ----------------------- UNIFIED CHARTS ----------------------- */
  const unifiedCharts = useMemo(() => {
    if (activeTab !== 'unified' || !data) return null;
    const metrics = data.metrics || {};

    const pieData = [
      { name: 'Stock Inflow', value: metrics.stock_inflow || 0 },
      { name: 'Procurement Spend', value: metrics.procurement_spend || 0 },
      { name: 'Rental Revenue', value: metrics.rental_revenue || 0 },
    ].filter((i) => i.value > 0);

    return (
      <Grid container spacing={3} mt={2}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>Operational Flow</Typography>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                  {pieData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [value.toLocaleString(), 'Value']} />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>Net Operational Flow</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
              <Typography
                variant="h4"
                color={(metrics.net_operational_flow || 0) >= 0 ? 'success.main' : 'error.main'}
              >
                {(metrics.net_operational_flow || 0).toLocaleString()}
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    );
  }, [activeTab, data]);

  /* ------------------------------------------------------------------ */
  /*  RENDER                                                            */
  /* ------------------------------------------------------------------ */
  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Analytics Dashboard
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* -------------------- CONTROLS -------------------- */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={3}>
            <TextField
              select
              label="Quick Date Range"
              value={quickRange}
              onChange={handleQuickRangeChange}
              fullWidth
            >
              {QUICK_RANGES.map((r) => (
                <MenuItem key={r.value} value={r.value}>
                  {r.label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid item xs={12} md={3}>
            <TextField
              label="Start Date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
          </Grid>

          <Grid item xs={12} md={3}>
            <TextField
              label="End Date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
          </Grid>

          {activeTab === 'inventory' && (
            <Grid item xs={12} md={3}>
              <TextField
                select
                label="Item (optional)"
                value={selectedItemId || ''}
                onChange={(e) => setSelectedItemId(e.target.value || null)}
                fullWidth
              >
                <MenuItem value="">All Items</MenuItem>
                {itemOptions.map((item) => (
                  <MenuItem key={item.id} value={item.id}>
                    {item.name || item.id}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
          )}

          <Grid item xs={12} md={activeTab === 'inventory' ? 12 : 3}>
            <Button
              variant="contained"
              color="primary"
              onClick={handleExportPDF}
              disabled={loading || !data}
              fullWidth
            >
              Export PDF
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* -------------------- TABS -------------------- */}
      <Tabs
        value={activeTab}
        onChange={(_, v) => setActiveTab(v)}
        sx={{ mb: 3 }}
      >
        <Tab label="Inventory" value="inventory" />
        <Tab label="Procurement" value="procurement" />
        <Tab label="Unified" value="unified" />
      </Tabs>

      {/* -------------------- LOADING -------------------- */}
      {loading && (
        <Box display="flex" justifyContent="center" my={4}>
          <CircularProgress />
        </Box>
      )}

      {/* -------------------- CONTENT -------------------- */}
      {!loading && data && (
        <Box>
          <Grid container spacing={2}>
            {kpiCards}
          </Grid>

          <Divider sx={{ my: 3 }} />

          {activeTab !== 'unified' && topTable}
          {timeSeriesChart}
          {itemDistributionPie}
          {unifiedCharts}
        </Box>
      )}

      {/* -------------------- EMPTY STATE -------------------- */}
      {!loading && !data && !error && (
        <Alert severity="info">Select a date range to view analytics.</Alert>
      )}
    </Container>
  );
}