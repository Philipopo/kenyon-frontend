import React, { useEffect, useState } from 'react';
import {
  Container,
  Typography,
  Paper,
  Grid,
  Box,
  Divider,
  CircularProgress,
} from '@mui/material';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import API from '../../api';

export default function FinanceOverview() {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOverview = async () => {
      try {
        const response = await API.get('finance/overview/');
        setOverview(response.data);
      } catch (err) {
        console.error('Error loading overview:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchOverview();
  }, []);

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom>
          Finance Overview
        </Typography>
        <Typography variant="body1" sx={{ mb: 4 }}>
          Overview of your financial health across the inventory system.
        </Typography>

        {loading ? (
          <Box display="flex" justifyContent="center" my={4}>
            <CircularProgress />
          </Box>
        ) : overview ? (
          <Grid container spacing={4}>
            <Grid item xs={12} md={4}>
              <Box sx={{ p: 3, border: 1, borderRadius: 2, textAlign: 'center' }}>
                <AccountBalanceIcon fontSize="large" color="primary" />
                <Typography variant="h6" sx={{ mt: 1 }}>
                  Total Budget
                </Typography>
                <Typography variant="subtitle1">₦{overview.budget.toLocaleString()}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Overall financial allocation
                </Typography>
              </Box>
            </Grid>

            <Grid item xs={12} md={4}>
              <Box sx={{ p: 3, border: 1, borderRadius: 2, textAlign: 'center' }}>
                <TrendingUpIcon fontSize="large" color="error" />
                <Typography variant="h6" sx={{ mt: 1 }}>
                  Total Expenditure
                </Typography>
                <Typography variant="subtitle1">₦{overview.expenditure.toLocaleString()}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Spent on procurement, logistics, and ops
                </Typography>
              </Box>
            </Grid>

            <Grid item xs={12} md={4}>
              <Box sx={{ p: 3, border: 1, borderRadius: 2, textAlign: 'center' }}>
                <ReceiptLongIcon fontSize="large" color="success" />
                <Typography variant="h6" sx={{ mt: 1 }}>
                  Transactions
                </Typography>
                <Typography variant="subtitle1">{overview.transactions} Orders</Typography>
                <Typography variant="body2" color="text.secondary">
                  Total approved purchase records
                </Typography>
              </Box>
            </Grid>
          </Grid>
        ) : (
          <Typography color="error">Could not load overview.</Typography>
        )}

        <Divider sx={{ my: 4 }} />
        <Typography variant="body2" color="text.secondary">
          * This section provides a snapshot of your current financial operations within the inventory and procurement modules.
        </Typography>
      </Paper>
    </Container>
  );
}
