import React, { useState, useEffect } from 'react';
//import { Link } from 'react-router-dom';
import {
  Box,
  Grid,
  Typography,
  Paper,
  Container,
  Stack,
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
} from '@mui/material';
import {
  Inventory as InventoryIcon,
  //LocalShipping as LocalShippingIcon,
  Add as AddIcon,
  Lock as LockIcon,
  Edit as EditIcon,
  MoreHoriz as MoreHorizIcon,
} from '@mui/icons-material';
import AlertsWidget from '../widget/AlertsWidget';
import { Line } from 'react-chartjs-2';
import api from '../api';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

// Register ChartJS components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

export default function Dashboard() {
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
  const [anchorEl, setAnchorEl] = useState(null); // For dropdown menu
  const [stockData, setStockData] = useState({ labels: [], datasets: [] });

  const quickActions = [
    { label: 'Create Order', link: '/dashboard/procurement/orders' },
    { label: 'Receive Stock', link: '/dashboard/inventory/stock' },
    { label: 'Generate Report', link: '/dashboard/analytics/stock' },
    { label: 'New Audit', link: '/dashboard/audit' },
  ];

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const res = await api.get('/inventory/metrics/', {
          headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
        });
        console.log('[METRICS FETCHED]', res.data);
        // Filter out Total Active Rentals (id: 3)
        const filteredMetrics = res.data.filter(metric => metric.id !== 3);
        setMetrics(filteredMetrics || []);

        // Fetch stock tracking data
        const stockRes = await api.get('/inventory/stocks/', {
          headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
        });
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
              fill: false,
              borderColor: 'rgb(75, 192, 192)',
              tension: 0.1,
            },
          ],
        });
      } catch (err) {
        console.error('❌ Error fetching dashboard metrics:', err);
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
              const res = await api.post(
                '/auth/update_location/',
                { latitude, longitude },
                { headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` } }
              );
              console.log('Location updated:', res.data);
              setProfileData((prev) => ({ ...prev, state: res.data.state || 'Lagos' }));
            } catch (err) {
              console.error('Error updating location:', err);
              setLocationError('Please allow location access or select state manually.');
            }
          },
          (error) => {
            console.error('Geolocation error:', error.message);
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
          const res = await api.get('/auth/profile/', {
            headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
          });
          console.log('[PROFILE FETCHED]', res.data);
          setProfileData({
            full_name: res.data.full_name || '',
            state: res.data.state || 'Lagos',
          });
        } catch (err) {
          setProfileError('Failed to load profile data.');
          console.error('❌ Error fetching profile:', err);
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
      const res = await api.post('/auth/change-password/', passwordData);
      setPasswordSuccess(res.data.detail || '✅ Password changed successfully.');
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

    console.log('[PATCH Payload]', { full_name: profileData.full_name });

    try {
      setProfileLoading(true);
      const res = await api.patch('/auth/profile/', { full_name: profileData.full_name }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
      });
      console.log('[PATCH Response]', res.data);
      setProfileSuccess('✅ Profile updated successfully.');
      setProfileError('');
      setOpenProfileModal(false);
      window.dispatchEvent(new Event('profileUpdated'));
    } catch (err) {
      console.error('[PATCH Error]', err.response || err);
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

  if (loading) return <p style={{ padding: 20 }}>Loading dashboard metrics...</p>;

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4, px: 3 }}>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h6" fontWeight={500} gutterBottom>
            Inventory Overview
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Real-time monitoring and analytics
          </Typography>
          {locationError && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              {locationError}
            </Alert>
          )}
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            color="primary"
            sx={{ textTransform: 'none', mr: 2 }}
            onClick={() => window.location.href = '/receipt/create'}
          >
            Create Receipt
          </Button>
          <Button
            variant="outlined"
            startIcon={<LockIcon />}
            onClick={() => setOpenPasswordModal(true)}
            sx={{ mr: 2 }}
          >
            Change Password
          </Button>
          <Button
            variant="outlined"
            startIcon={<EditIcon />}
            onClick={() => setOpenProfileModal(true)}
          >
            Edit User Profile
          </Button>
          <IconButton
            onClick={handleMenuOpen}
            sx={{ color: '#757575', ml: 1 }}
          >
            <MoreHorizIcon />
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
            PaperProps={{
              sx: { width: 200, mt: 1 },
            }}
          >
            {quickActions.map((action) => (
              <MenuItem
                key={action.label}
                onClick={() => handleActionSelect(action.link)}
              >
                {action.label}
              </MenuItem>
            ))}
          </Menu>
        </Box>
      </Box>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        {metrics.map((metric) => (
          <Grid item xs={12} md={3} key={metric.id}>
            <Paper
              elevation={2}
              sx={{
                p: 3,
                height: '100%',
                width: '100%',
                minWidth: '250px',
                borderRadius: 8,
                transition: 'transform 0.2s',
                '&:hover': { transform: 'translateY(-4px)' },
              }}
            >
              <Stack direction="row" alignItems="center" spacing={2} mb={2}>
                <Box sx={{
                  p: 1.5,
                  borderRadius: '50%',
                  border: '1px solid',
                  color: 'text.primary',
                  display: 'flex',
                }}>
                  <InventoryIcon />
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {metric.title}
                </Typography>
              </Stack>
              <Stack direction="row" alignItems="baseline" spacing={1}>
                <Typography variant="h4" fontWeight={700}>
                  {metric.value}
                </Typography>
                <Chip
                  label={metric.change}
                  size="small"
                  color={
                    metric.trend === 'up' ? 'success' :
                      metric.trend === 'down' ? 'error' : 'default'
                  }
                  variant="outlined"
                />
              </Stack>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3} sx={{ width: '100%', mb: 3 }}>
        <Grid item xs={12} md={6}>
          <Paper elevation={3} sx={{
            p: 3,
            borderRadius: 8,
            backgroundColor: '#fff',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
          }}>
            <Typography variant="h6" fontWeight={500} gutterBottom>
              Stock Tracking
            </Typography>
            <Box sx={{ flexGrow: 1, overflow: 'auto', minHeight: 300 }}>
              <Line
                data={stockData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { position: 'top' },
                    title: { display: true, text: 'Stock Levels Over Time' },
                  },
                  scales: {
                    x: { title: { display: true, text: 'Date' } },
                    y: { title: { display: true, text: 'Quantity' }, beginAtZero: true },
                  },
                }}
              />
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper elevation={3} sx={{
            p: 3,
            borderRadius: 8,
            backgroundColor: '#fff',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
          }}>
            <Typography variant="h6" fontWeight={500} gutterBottom>
              Active Alerts
            </Typography>
            <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
              <AlertsWidget />
            </Box>
          </Paper>
        </Grid>
      </Grid>

      <Dialog open={openPasswordModal} onClose={() => setOpenPasswordModal(false)} fullWidth maxWidth="xs">
        <DialogTitle>Change Password</DialogTitle>
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
        <DialogActions>
          <Button onClick={() => setOpenPasswordModal(false)}>Cancel</Button>
          <Button variant="contained" onClick={handlePasswordChange} disabled={passwordLoading}>
            {passwordLoading ? 'Changing...' : 'Change Password'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openProfileModal} onClose={() => setOpenProfileModal(false)} fullWidth maxWidth="xs">
        <DialogTitle>Edit User Profile</DialogTitle>
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
        <DialogActions>
          <Button onClick={() => setOpenProfileModal(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleProfileUpdate} disabled={profileLoading}>
            {profileLoading ? 'Updating...' : 'Update Profile'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}