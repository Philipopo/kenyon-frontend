import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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
  // MenuItem,
  // Select,
  // InputLabel,
  // FormControl,
} from '@mui/material';
import {
  Inventory as InventoryIcon,
  LocalShipping as LocalShippingIcon,
  Timeline as ActivityIcon,
  CalendarToday as CalendarIcon,
  Add as AddIcon,
  Lock as LockIcon,
  PostAdd as PostAddIcon,
  Assessment as AssessmentIcon,
  ChecklistRtl as ChecklistRtlIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import StockLevelWidget from '../widget/StockLevelWidget';
import AlertsWidget from '../widget/AlertsWidget';
import api from '../api';

// Nigerian states to match accounts/models.py
// Commented out since unused; uncomment if state selection is implemented
// const NIGERIAN_STATES = [
//   'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno',
//   'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT', 'Gombe',
//   'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara',
//   'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau',
//   'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara',
// ];

const quickActions = [
  {
    label: 'Create Order',
    link: '/dashboard/procurement/orders',
    icon: <PostAddIcon fontSize="small" />,
  },
  {
    label: 'Receive Stock',
    link: '/dashboard/inventory/stock',
    icon: <InventoryIcon fontSize="small" />,
  },
  {
    label: 'Generate Report',
    link: '/dashboard/analytics/stock',
    icon: <AssessmentIcon fontSize="small" />,
  },
  {
    label: 'New Audit',
    link: '/dashboard/audit',
    icon: <ChecklistRtlIcon fontSize="small" />,
  },
];

export default function Dashboard() {
  const [metrics, setMetrics] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);
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

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const res = await api.get('/inventory/metrics/', {
          headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
        });
        console.log('[METRICS FETCHED]', res.data);
        setMetrics(res.data || []);
        setRecentActivities([]);
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

  if (loading) return <p style={{ padding: 20 }}>Loading dashboard metrics...</p>;

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Inventory Overview
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Real-time monitoring and analytics
          </Typography>
          {locationError && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              {locationError}
            </Alert>
          )}
        </Box>
        <Box>
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
        </Box>
      </Box>

      <Grid container spacing={3} sx={{ mb: 3, width: '100%' }}>
        <Grid item xs={12}>
          <Paper elevation={0} sx={{
            p: 3,
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'divider',
            backgroundColor: 'background.paper'
          }}>
            <Box sx={{
              display: 'flex',
              alignItems: 'center',
              mb: 3,
              justifyContent: 'space-between'
            }}>
              <Typography variant="h6" sx={{
                display: 'flex',
                alignItems: 'center',
                fontWeight: 600
              }}>
                <LocalShippingIcon sx={{
                  mr: 1.5,
                  fontSize: '1.5rem',
                  color: 'primary.main'
                }} />
                Quick Actions
              </Typography>
              <Chip
                label={`${quickActions.length} actions`}
                size="small"
                variant="outlined"
                sx={{
                  borderColor: 'primary.main',
                  color: 'primary.main'
                }}
              />
            </Box>

            <Grid container spacing={2}>
              {quickActions.map((action) => (
                <Grid item xs={12} sm={6} md={3} key={action.label}>
                  <Link to={action.link} style={{ textDecoration: 'none' }}>
                    <Paper
                      elevation={0}
                      sx={{
                        p: 2.5,
                        height: '100%',
                        minWidth: '240px',
                        width: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        borderRadius: 1,
                        border: '1px solid',
                        borderColor: 'divider',
                        transition: 'all 0.25s ease',
                        '&:hover': {
                          borderColor: '#ccc',
                          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
                          transform: 'translateY(-2px)'
                        },
                      }}
                    >
                      <Box sx={{
                        width: 48,
                        height: 48,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mb: 1.5,
                        borderRadius: '50%',
                        border: '1px solid'
                      }}>
                        {action.icon}
                      </Box>
                      <Typography variant="subtitle1" fontWeight={500}>
                        {action.label}
                      </Typography>
                    </Paper>
                  </Link>
                </Grid>
              ))}
            </Grid>
          </Paper>
        </Grid>
      </Grid>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        {metrics.map((metric) => (
          <Grid item xs={12} sm={6} md={3} key={metric.id}>
            <Paper
              elevation={2}
              sx={{
                p: 3,
                height: '100%',
                width: '100%',
                minWidth: '250px',
                borderRadius: 2,
                transition: 'transform 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                },
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
                <Typography variant="h6">{metric.title}</Typography>
              </Stack>
              <Stack direction="row" alignItems="baseline" spacing={1}>
                <Typography variant="h4" sx={{ fontWeight: 'bold' }}>{metric.value}</Typography>
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

      <Grid container spacing={3}>
        <Box sx={{ flex: 1, minHeight: 0 }}>
          <StockLevelWidget />
        </Box>
        <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
          <AlertsWidget />
        </Box>
      </Grid>

      <Grid container spacing={3} sx={{ mt: 2 }}>
        <Grid item xs={12} md={6}>
          <Paper elevation={3} sx={{
            p: 3,
            height: '100%',
            borderRadius: 2,
          }}>
            <Typography variant="h6" gutterBottom sx={{
              mb: 2,
              display: 'flex',
              alignItems: 'center',
            }}>
              <ActivityIcon sx={{ mr: 1, color: 'info.main' }} />
              Recent Activities
            </Typography>
            <Stack spacing={2}>
              {recentActivities.map((activity) => (
                <Box key={activity.id} sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  p: 1,
                  borderRadius: 1,
                  '&:hover': {
                    backgroundColor: 'action.hover',
                  },
                }}>
                  <Box>
                    <Typography fontWeight="medium">{activity.action}</Typography>
                    <Typography variant="body2" color="text.secondary">{activity.item}</Typography>
                  </Box>
                  <Chip
                    label={activity.time}
                    size="small"
                    icon={<CalendarIcon fontSize="small" />}
                    variant="outlined"
                  />
                </Box>
              ))}
            </Stack>
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