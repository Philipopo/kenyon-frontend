import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Paper,
  Box,
  Alert,
  CircularProgress,
  Grid,
  Card,
  CardContent,
} from '@mui/material';
import API from '../../api';

export default function Overview() {
  const [hasPageAccess, setHasPageAccess] = useState(false);
  const [error, setError] = useState('');
  const [checkingPermissions, setCheckingPermissions] = useState(true);
  const [overview, setOverview] = useState({
    budget: 0,
    expenditure: 0,
    transactions: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchOverview = async () => {
    try {
      const res = await API.get('finance/overview/');
      console.log('Overview response:', res.data);
      setOverview(res.data || { budget: 0, expenditure: 0, transactions: 0 });
      setLoading(false);
    } catch (err) {
      console.error('Error fetching overview:', err.response?.data || err.message);
      setError('❌ Failed to fetch overview: ' + (err.response?.data?.detail || err.message));
      setLoading(false);
    }
  };

  useEffect(() => {
    const checkPermissions = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        console.log('Access token:', token);
        if (!token) {
          setError('⚠️ No authentication token found. Please log in.');
          setHasPageAccess(false);
          setCheckingPermissions(false);
          return;
        }
        const response = await API.get('/auth/permissions/page/finance_overview/');
        console.log('Page permission response:', response.data);
        if (response.data && typeof response.data.allowed === 'boolean') {
          setHasPageAccess(response.data.allowed);
          if (!response.data.allowed) {
            setError(`⚠️ You do not have permission to view this page: ${response.data.reason || 'No reason provided'}`);
          } else {
            fetchOverview();
          }
        } else {
          setError('⚠️ Invalid permission response from server.');
          setHasPageAccess(false);
        }
      } catch (err) {
        console.error('Error checking permissions:', err.response?.data || err.message);
        if (err.response?.status === 401) {
          setError('⚠️ Authentication failed. Please log in again.');
        } else if (err.response?.status === 404) {
          setError('⚠️ Permission endpoint not found. Contact support.');
        } else {
          setError(`⚠️ Failed to check permissions: ${err.response?.data?.detail || err.message}`);
        }
        setHasPageAccess(false);
      } finally {
        setCheckingPermissions(false);
      }
    };
    checkPermissions();
  }, []);

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
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        Finance Overview
      </Typography>
      <Paper elevation={3} sx={{ p: 3 }}>
        {loading ? (
          <Box display="flex" justifyContent="center" py={5}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        ) : (
          <Grid container spacing={3}>
            {/* <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" color="text.secondary">
                    Total Budget
                  </Typography>
                  <Typography variant="h4">
                    ₦{overview.budget.toLocaleString()}
                  </Typography>
                </CardContent>
              </Card>
            </Grid> */}
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" color="text.secondary">
                    Total Expenditure
                  </Typography>
                  <Typography variant="h4">
                    ₦{overview.expenditure.toLocaleString()}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" color="text.secondary">
                    Total Transactions
                  </Typography>
                  <Typography variant="h4">
                    {overview.transactions}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}
      </Paper>
    </Container>
  );
}