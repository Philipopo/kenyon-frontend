import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Grid,
  Typography,
  Paper,
  Container,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Menu,
  MenuItem,
  IconButton,
  LinearProgress,
  Skeleton,
  useTheme,
  alpha
} from '@mui/material';
import {
  Inventory as InventoryIcon,
  Add as AddIcon,
  Lock as LockIcon,
  Edit as EditIcon,
  MoreHoriz as MoreHorizIcon,
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Storage as StorageIcon,
  LocalShipping as LocalShippingIcon,
  Receipt as ReceiptIcon,
  BarChart as BarChartIcon,
  PieChart as PieChartIcon,
  Timeline as TimelineIcon
} from '@mui/icons-material';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import api from '../api';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

// Register all ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const Dashboard = () => {
  const theme = useTheme();
  const [metrics, setMetrics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openPasswordModal, setOpenPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({ old_password: '', new_password: '' });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [openProfileModal, setOpenProfileModal] = useState(false);
  const [profileData, setProfileData] = useState({ full_name: '', state: 'Lagos' });
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [anchorEl, setAnchorEl] = useState(null);
  const [stockData, setStockData] = useState({ labels: [], datasets: [] });
  const [analyticsData, setAnalyticsData] = useState(null);
  const [alerts, setAlerts] = useState([]);

  // Quick actions with icons
  const quickActions = [
    { label: 'Create Order', link: '/dashboard/procurement/orders', icon: <LocalShippingIcon /> },
    { label: 'Receive Stock', link: '/dashboard/inventory/stock', icon: <ReceiptIcon /> },
    { label: 'Generate Report', link: '/dashboard/analytics/stock', icon: <BarChartIcon /> },
    { label: 'New Audit', link: '/dashboard/audit', icon: <InventoryIcon /> },
  ];

  // Metric configuration with icons and colors
  const metricConfig = {
    1: { icon: <InventoryIcon />, color: '#4361ee', title: 'Total Items' },
    2: { icon: <StorageIcon />, color: '#3f37c9', title: 'Total Bins' },
    4: { icon: <TimelineIcon />, color: '#4895ef', title: 'Total Movements' },
    5: { icon: <WarningIcon />, color: '#f72585', title: 'Expired Items' },
  };

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Fetch metrics
        const metricsRes = await api.get('/inventory/metrics/');
        const filteredMetrics = metricsRes.data.filter(metric => metric.id !== 3);
        setMetrics(filteredMetrics || []);

        // Fetch stock data
        const stockRes = await api.get('/inventory/stocks/');
        const records = stockRes.data.results || [];
        const groupedData = records.reduce((acc, record) => {
          const date = new Date(record.created_at).toLocaleDateString();
          if (!acc[date]) acc[date] = 0;
          acc[date] += record.quantity;
          return acc;
        }, {});
        const labels = Object.keys(groupedData);
        const data = Object.values(groupedData);
        setStockData({
          labels,
          datasets: [
            {
              label: 'Stock Level',
              data,
              fill: true,
              borderColor: theme.palette.primary.main,
              backgroundColor: alpha(theme.palette.primary.main, 0.1),
              tension: 0.4,
              pointRadius: 3,
              pointBackgroundColor: theme.palette.primary.main,
            },
          ],
        });

        // Fetch analytics data
        const analyticsRes = await api.get('/inventory/analytics/');
        setAnalyticsData(analyticsRes.data);

        // Fetch alerts
        const alertsRes = await api.get('/inventory/alerts/');
        setAlerts(alertsRes.data.results || []);

      } catch (err) {
        setLocationError('Failed to fetch dashboard metrics.');
      } finally {
        setLoading(false);
      }
    };

    const fetchLocation = () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;
            try {
              const res = await api.post('/auth/update_location/', { latitude, longitude });
              setProfileData((prev) => ({ ...prev, state: res.data.state || 'Lagos' }));
            } catch (err) {
              setLocationError('Please allow location access or select state manually.');
            }
          },
          () => {
            setLocationError('Please allow location access or select state manually.');
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
      } else {
        setLocationError('Geolocation not supported by your browser.');
      }
    };

    fetchDashboardData();
    fetchLocation();
  }, []);

  useEffect(() => {
    if (openProfileModal) {
      const fetchProfileData = async () => {
        try {
          const res = await api.get('/auth/profile/');
          setProfileData({
            full_name: res.data.full_name || '',
            state: res.data.state || 'Lagos',
          });
        } catch (err) {
          setProfileError('Failed to load profile data.');
        }
      };
      fetchProfileData();
    }
  }, [openProfileModal]);

  const handlePasswordChange = async () => {
    const { new_password } = passwordData;
    const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;

    if (!passwordRegex.test(new_password)) {
      setPasswordError('⚠ Password must be at least 8 characters and include 1 uppercase, 1 number, and 1 symbol.');
      return;
    }

    try {
      setPasswordLoading(true);
      await api.post('/auth/change-password/', passwordData);
      setPasswordSuccess('✅ Password changed successfully.');
      setPasswordError('');
      setPasswordData({ old_password: '', new_password: '' });
    } catch (err) {
      setPasswordError(err.response?.data?.old_password || err.response?.data?.detail || 'Something went wrong.');
      setPasswordSuccess('');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleProfileUpdate = async () => {
    if (!profileData.full_name.trim()) {
      setProfileError('Full name is required.');
      return;
    }

    try {
      setProfileLoading(true);
      await api.patch('/auth/profile/', { full_name: profileData.full_name });
      setProfileSuccess('✅ Profile updated successfully.');
      setProfileError('');
      setOpenProfileModal(false);
      window.dispatchEvent(new Event('profileUpdated'));
    } catch (err) {
      setProfileError(err.response?.data?.detail || 'Failed to update profile.');
      setProfileSuccess('');
    } finally {
      setProfileLoading(false);
    }
  };

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleActionSelect = (link) => {
    window.location.href = link;
    handleMenuClose();
  };

  // Chart options
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { 
        position: 'top',
        labels: {
          padding: 20,
          usePointStyle: true,
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        titleFont: { size: 14 },
        bodyFont: { size: 12 },
        padding: 12,
        displayColors: true,
      }
    },
    interaction: {
      intersect: false,
      mode: 'index',
    }
  };

  // Stock chart options
  const stockChartOptions = {
    ...chartOptions,
    scales: {
      x: { 
        grid: { 
          color: alpha(theme.palette.divider, 0.2) 
        },
        ticks: { 
          maxRotation: 0,
          autoSkip: true,
          maxTicksLimit: 10 
        }
      },
      y: { 
        beginAtZero: true,
        grid: { 
          color: alpha(theme.palette.divider, 0.2) 
        }
      }
    }
  };

  // Analytics charts
  const turnoverData = useMemo(() => ({
    labels: ['Turnover Rate'],
    datasets: [{
      label: 'Current',
      data: [analyticsData?.turnover_rate || 0],
      backgroundColor: [theme.palette.primary.main],
      borderColor: [theme.palette.primary.dark],
      borderWidth: 1,
    }]
  }), [analyticsData]);

  const binUsageData = useMemo(() => ({
    labels: analyticsData?.most_used_bins?.map(bin => bin.bin_id) || [],
    datasets: [{
      label: 'Movement Count',
      data: analyticsData?.most_used_bins?.map(bin => bin.movement_count) || [],
      backgroundColor: theme.palette.primary.main,
      borderColor: theme.palette.primary.dark,
      borderWidth: 1,
    }]
  }), [analyticsData]);

  const alertsData = useMemo(() => {
    if (!analyticsData?.alerts_over_time) return { labels: [], datasets: [] };
    
    const alertTypes = analyticsData.alerts_over_time.reduce((acc, alert) => {
      acc[alert.alert_type] = alert.count;
      return acc;
    }, {});
    
    return {
      labels: Object.keys(alertTypes),
      datasets: [{
        data: Object.values(alertTypes),
        backgroundColor: [
          theme.palette.warning.main,
          theme.palette.error.main
        ],
        borderColor: [
          theme.palette.warning.dark,
          theme.palette.error.dark
        ],
        borderWidth: 1,
      }]
    };
  }, [analyticsData]);

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4, px: 0 }}>
        <Box sx={{ mb: 4, px: 3 }}>
          <Skeleton variant="text" width={300} height={40} />
          <Skeleton variant="text" width={200} height={20} />
        </Box>
        <Grid container spacing={3} sx={{ mb: 3, px: 3 }}>
          {[1, 2, 3, 4].map((i) => (
            <Grid item xs={12} md={3} key={i}>
              <Skeleton variant="rectangular" height={120} sx={{ borderRadius: 2 }} />
            </Grid>
          ))}
        </Grid>
        <Grid container spacing={3} sx={{ px: 3 }}>
          <Grid item xs={12} md={8}>
            <Skeleton variant="rectangular" height={400} sx={{ borderRadius: 2 }} />
          </Grid>
          <Grid item xs={12} md={4}>
            <Skeleton variant="rectangular" height={400} sx={{ borderRadius: 2, mb: 3 }} />
            <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 2 }} />
          </Grid>
        </Grid>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, px: 0 }}>
      {/* Header */}
      <Box sx={{ mb: 4, px: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight={700} gutterBottom>
            Inventory Dashboard
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Real-time monitoring and analytics for optimal inventory management
          </Typography>
          {locationError && (
            <Alert severity="warning" sx={{ mt: 2, maxWidth: 600 }}>
              {locationError}
            </Alert>
          )}
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            sx={{ 
              textTransform: 'none',
              borderRadius: 2,
              px: 3,
              py: 1.5,
              boxShadow: 3,
              '&:hover': { boxShadow: 6 }
            }}
            onClick={() => window.location.href = '/receipt/create'}
          >
            Create Receipt
          </Button>
          <Button
            variant="outlined"
            startIcon={<LockIcon />}
            onClick={() => setOpenPasswordModal(true)}
            sx={{ borderRadius: 2, px: 2, py: 1.5 }}
          >
            Change Password
          </Button>
          <Button
            variant="outlined"
            startIcon={<EditIcon />}
            onClick={() => setOpenProfileModal(true)}
            sx={{ borderRadius: 2, px: 2, py: 1.5 }}
          >
            Edit Profile
          </Button>
          <IconButton
            onClick={handleMenuOpen}
            sx={{ 
              color: theme.palette.text.secondary,
              borderRadius: 2,
              p: 1.5,
              border: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
              '&:hover': { 
                backgroundColor: alpha(theme.palette.action.hover, 0.1),
                borderColor: theme.palette.divider
              }
            }}
          >
            <MoreHorizIcon />
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
            PaperProps={{
              sx: { 
                width: 220, 
                mt: 1,
                borderRadius: 2,
                boxShadow: 3
              },
            }}
          >
            {quickActions.map((action) => (
              <MenuItem
                key={action.label}
                onClick={() => handleActionSelect(action.link)}
                sx={{ 
                  py: 1.5,
                  '&:hover': { 
                    backgroundColor: alpha(theme.palette.primary.main, 0.08) 
                  }
                }}
              >
                {action.icon}
                <Typography sx={{ ml: 2 }}>{action.label}</Typography>
              </MenuItem>
            ))}
          </Menu>
        </Box>
      </Box>

      {/* Metrics Cards */}
      <Grid container spacing={3} sx={{ mb: 4, px: 3 }}>
        {metrics.map((metric) => {
          const config = metricConfig[metric.id] || { icon: <InventoryIcon />, color: '#6c757d' };
          return (
            <Grid item xs={12} sm={6} md={3} key={metric.id}>
              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  height: '100%',
                  borderRadius: 3,
                  border: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
                  transition: 'all 0.3s ease',
                  '&:hover': { 
                    transform: 'translateY(-4px)',
                    boxShadow: 4,
                    borderColor: alpha(config.color, 0.3)
                  },
                  background: `linear-gradient(135deg, ${alpha(config.color, 0.05)} 0%, ${alpha(config.color, 0.02)} 100%)`
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Box sx={{
                    p: 1.5,
                    borderRadius: '12px',
                    backgroundColor: alpha(config.color, 0.15),
                    color: config.color,
                    display: 'flex',
                    mr: 2
                  }}>
                    {config.icon}
                  </Box>
                  <Typography variant="body2" color="text.secondary" fontWeight={500}>
                    {config.title}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                  <Typography variant="h3" fontWeight={700} sx={{ color: config.color }}>
                    {metric.value}
                  </Typography>
                  <Chip
                    label={metric.change}
                    size="small"
                    color={
                      metric.trend === 'up' ? 'success' :
                      metric.trend === 'down' ? 'error' : 'default'
                    }
                    variant="filled"
                    sx={{ 
                      fontWeight: 600,
                      height: 24,
                      fontSize: '0.75rem'
                    }}
                  />
                </Box>
              </Paper>
            </Grid>
          );
        })}
      </Grid>

      {/* Charts Section */}
      <Grid container spacing={3} sx={{ px: 3, mb: 4 }}>
        {/* Stock Tracking Chart */}
        <Grid item xs={12} md={8}>
          <Paper elevation={0} sx={{
            p: 3,
            borderRadius: 3,
            border: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
            height: '100%',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6" fontWeight={600}>
                Stock Levels Over Time
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Chip 
                  icon={<TrendingUpIcon />} 
                  label="30 Days" 
                  size="small" 
                  color="primary" 
                  variant="filled" 
                />
              </Box>
            </Box>
            <Box sx={{ flexGrow: 1, minHeight: 400 }}>
              <Line data={stockData} options={stockChartOptions} />
            </Box>
          </Paper>
        </Grid>

        {/* Alerts Summary */}
        <Grid item xs={12} md={4}>
          <Paper elevation={0} sx={{
            p: 3,
            borderRadius: 3,
            border: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
            height: '100%',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Active Alerts
            </Typography>
            <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
              {alerts.length > 0 ? (
                <Box sx={{ overflow: 'auto', maxHeight: 300 }}>
                  {alerts.slice(0, 5).map((alert, index) => (
                    <Box 
                      key={index} 
                      sx={{ 
                        p: 2, 
                        mb: 1, 
                        borderRadius: 2, 
                        backgroundColor: alpha(
                          alert.alert_type === 'CRITICAL' ? theme.palette.error.main : theme.palette.warning.main, 
                          0.1
                        ),
                        borderLeft: `4px solid ${
                          alert.alert_type === 'CRITICAL' ? theme.palette.error.main : theme.palette.warning.main
                        }`
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        {alert.alert_type === 'CRITICAL' ? (
                          <WarningIcon sx={{ color: theme.palette.error.main, mr: 1 }} />
                        ) : (
                          <CheckCircleIcon sx={{ color: theme.palette.warning.main, mr: 1 }} />
                        )}
                        <Typography variant="subtitle2" fontWeight={600}>
                          {alert.alert_type}
                        </Typography>
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        {alert.message}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexGrow: 1, py: 2 }}>
                  <CheckCircleIcon sx={{ fontSize: 40, color: theme.palette.success.main, mb: 1 }} />
                  <Typography variant="body2" color="text.secondary">
                    No active alerts
                  </Typography>
                </Box>
              )}
            </Box>
          </Paper>
        </Grid>

        {/* Analytics Charts */}
        <Grid item xs={12} md={6}>
          <Paper elevation={0} sx={{
            p: 3,
            borderRadius: 3,
            border: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
            height: '100%',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Bin Usage Distribution
            </Typography>
            <Box sx={{ flexGrow: 1, minHeight: 300 }}>
              {binUsageData.labels.length > 0 ? (
                <Bar data={binUsageData} options={chartOptions} />
              ) : (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                  <Typography variant="body2" color="text.secondary">
                    No bin usage data available
                  </Typography>
                </Box>
              )}
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper elevation={0} sx={{
            p: 3,
            borderRadius: 3,
            border: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
            height: '100%',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Alert Types Distribution
            </Typography>
            <Box sx={{ flexGrow: 1, minHeight: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {alertsData.labels.length > 0 ? (
                <Doughnut 
                  data={alertsData} 
                  options={{
                    ...chartOptions,
                    cutout: '60%',
                    plugins: {
                      ...chartOptions.plugins,
                      legend: {
                        ...chartOptions.plugins.legend,
                        position: 'right'
                      }
                    }
                  }} 
                />
              ) : (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                  <Typography variant="body2" color="text.secondary">
                    No alert data available
                  </Typography>
                </Box>
              )}
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Password Modal */}
      <Dialog 
        open={openPasswordModal} 
        onClose={() => setOpenPasswordModal(false)} 
        maxWidth="xs"
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ fontWeight: 600, pb: 1 }}>Change Password</DialogTitle>
        <DialogContent sx={{ mt: 1 }}>
          <TextField
            fullWidth
            label="Old Password"
            type="password"
            sx={{ mb: 2 }}
            value={passwordData.old_password}
            onChange={(e) => setPasswordData({ ...passwordData, old_password: e.target.value })}
          />
          <TextField
            fullWidth
            label="New Password"
            type="password"
            value={passwordData.new_password}
            onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
          />
          {passwordError && <Alert severity="error" sx={{ mt: 2 }}>{passwordError}</Alert>}
          {passwordSuccess && <Alert severity="success" sx={{ mt: 2 }}>{passwordSuccess}</Alert>}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenPasswordModal(false)} sx={{ borderRadius: 2 }}>
            Cancel
          </Button>
          <Button 
            variant="contained" 
            onClick={handlePasswordChange} 
            disabled={passwordLoading}
            sx={{ borderRadius: 2, px: 3 }}
          >
            {passwordLoading ? 'Changing...' : 'Change Password'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Profile Modal */}
      <Dialog 
        open={openProfileModal} 
        onClose={() => setOpenProfileModal(false)} 
        maxWidth="xs"
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ fontWeight: 600, pb: 1 }}>Edit User Profile</DialogTitle>
        <DialogContent sx={{ mt: 1 }}>
          <TextField
            fullWidth
            label="Full Name"
            sx={{ mb: 2 }}
            value={profileData.full_name}
            onChange={(e) => setProfileData({ ...profileData, full_name: e.target.value })}
            inputProps={{ maxLength: 255 }}
          />
          {profileError && <Alert severity="error" sx={{ mt: 2 }}>{profileError}</Alert>}
          {profileSuccess && <Alert severity="success" sx={{ mt: 2 }}>{profileSuccess}</Alert>}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenProfileModal(false)} sx={{ borderRadius: 2 }}>
            Cancel
          </Button>
          <Button 
            variant="contained" 
            onClick={handleProfileUpdate} 
            disabled={profileLoading}
            sx={{ borderRadius: 2, px: 3 }}
          >
            {profileLoading ? 'Updating...' : 'Update Profile'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Dashboard;