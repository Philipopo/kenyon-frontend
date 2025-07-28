import React, { useState, useEffect } from 'react';
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
} from '@mui/material';
import {
  Inventory as InventoryIcon,
  LocalShipping as LocalShippingIcon,
  Warning as AlertIcon,
  Timeline as ActivityIcon,
  CalendarToday as CalendarIcon,
  Add as AddIcon,
  Lock as LockIcon,
} from '@mui/icons-material';
import StockLevelWidget from '../widget/StockLevelWidget';
import AlertsWidget from '../widget/AlertsWidget';
import api from '../api';

export default function Dashboard() {
  const [metrics, setMetrics] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  const [openPasswordModal, setOpenPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({ old_password: '', new_password: '' });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const res = await api.get('/inventory/metrics/'); // Use correct endpoint from inventory app
        console.log('[METRICS FETCHED]', res.data);
        setMetrics(res.data || []); // Set metrics directly from response
        setRecentActivities([]); // No activities in InventoryMetricsView, set to empty for now
      } catch (err) {
        console.error('❌ Error fetching dashboard metrics:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const handlePasswordChange = async () => {
    const { old_password, new_password } = passwordData;
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

  if (loading) return <p style={{ padding: 20 }}>Loading dashboard metrics...</p>;

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Inventory Overview
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Real-time monitoring and analytics
          </Typography>
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
          >
            Change Password
          </Button>
        </Box>
      </Box>

      {/* Quick Actions */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12}>
          <Paper elevation={3} sx={{ p: 3, borderRadius: 2 }}>
            <Typography variant="h6" gutterBottom sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
              <LocalShippingIcon sx={{ mr: 1, color: 'secondary.main' }} />
              Quick Actions
            </Typography>
            <Grid container spacing={2}>
              {[
                { label: 'Create Order', link: '/dashboard/procurement/orders' },
                { label: 'Receive Stock', link: '/dashboard/inventory/stock' },
                { label: 'Generate Report', link: '/dashboard/analytics/stock' },
                { label: 'New Audit', link: '/dashboard/audit' },
              ].map((action) => (
                <Grid item xs={6} md={3} key={action.label}>
                  <Paper
                    elevation={1}
                    sx={{
                      p: 2,
                      textAlign: 'center',
                      cursor: 'pointer',
                      borderRadius: 1,
                      transition: 'all 0.2s',
                      '&:hover': {
                        backgroundColor: 'primary.light',
                        color: 'primary.contrastText',
                        transform: 'scale(1.03)',
                      },
                    }}
                    onClick={() => window.location.href = action.link}
                  >
                    <Typography>{action.label}</Typography>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </Paper>
        </Grid>
      </Grid>

      {/* Metrics */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {metrics.map((metric) => (
          <Grid item xs={12} sm={6} md={3} key={metric.id}>
            <Paper
              elevation={2}
              sx={{
                p: 3,
                height: '100%',
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
                  bgcolor: 'grey.200',
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

      {/* Main Content */}
      <Grid container spacing={3}>
        {/* Stock Levels */}
        <Grid item xs={12} lg={8}>
          <Paper elevation={3} sx={{
            p: { xs: 1, sm: 3 },
            height: '500px',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            borderRadius: 2,
          }}>
            <Typography variant="h6" gutterBottom sx={{
              mb: 2,
              display: 'flex',
              alignItems: 'center',
            }}>
              <InventoryIcon sx={{ mr: 1, color: 'primary.main' }} />
              Stock Levels
            </Typography>
            <Box sx={{ flex: 1, minHeight: 0 }}>
              <StockLevelWidget />
            </Box>
          </Paper>
        </Grid>

        {/* Alerts */}
        <Grid item xs={12} lg={4}>
          <Paper elevation={3} sx={{
            p: 3,
            height: '500px',
            display: 'flex',
            flexDirection: 'column',
            borderRadius: 2,
          }}>
            <Typography variant="h6" gutterBottom sx={{
              mb: 2,
              display: 'flex',
              alignItems: 'center',
            }}>
              <AlertIcon sx={{ mr: 1, color: 'error.main' }} />
              Recent Alerts
            </Typography>
            <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
              <AlertsWidget />
            </Box>
          </Paper>
        </Grid>

        {/* Activities */}
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

      {/* Change Password Modal */}
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
    </Container>
  );
}



