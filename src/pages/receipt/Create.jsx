// src/pages/ReceiptCreate.jsx
import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Paper,
  TextField,
  Button,
  MenuItem,
  Alert,
  Grid,
  CircularProgress,
} from '@mui/material';
import api from '../../api';

const locations = ['Warehouse A', 'Warehouse B', 'Site A', 'Site B'];

export default function ReceiptCreate() {
  const [hasPageAccess, setHasPageAccess] = useState(false);
  const [canCreateStockReceipt, setCanCreateStockReceipt] = useState(false);
  const [error, setError] = useState('');
  const [checkingPermissions, setCheckingPermissions] = useState(true);
  const [form, setForm] = useState({
    item: '',
    quantity: '',
    location: '',
    date: '',
    notes: '',
  });
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const checkPermissions = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        console.log('Access token:', token ? 'Present' : 'Missing');
        if (!token) {
          setError('⚠️ No authentication token found. Please log in.');
          setHasPageAccess(false);
          setCanCreateStockReceipt(false);
          setCheckingPermissions(false);
          return;
        }
        console.log('Fetching page permission from /auth/permissions/page/stock_receipts/');
        const pageResponse = await api.get('/auth/permissions/page/stock_receipts/');
        console.log('Page permission response:', pageResponse.data);
        setHasPageAccess(pageResponse.data.allowed || false);
        if (!pageResponse.data.allowed) {
          setError(`⚠️ You do not have permission to view this page: ${pageResponse.data.reason || 'No reason provided'}`);
        }

        console.log('Fetching action permission from /auth/permissions/action/create_stock_receipt/');
        const actionResponse = await api.get('/auth/permissions/action/create_stock_receipt/');
        console.log('Action permission response:', actionResponse.data);
        setCanCreateStockReceipt(actionResponse.data.allowed || false);
        if (!actionResponse.data.allowed) {
  setError(
    `⚠️ You do not have permission to create a receipt: ${
      actionResponse.data.reason || 'No reason provided'
    }`
  );
}
      } catch (err) {
        console.error('Error checking permissions:', err.response?.data || err.message);
        if (err.response?.status === 401) {
          setError('⚠️ Authentication failed. Please log in again.');
        } else if (err.response?.status === 404) {
          setError('⚠️ Permission endpoint not found. Check backend routing.');
        } else {
          setError(`⚠️ Failed to check permissions: ${err.response?.data?.reason || err.message}`);
        }
        setHasPageAccess(false);
        setCanCreateStockReceipt(false);
      } finally {
        setCheckingPermissions(false);
      }
    };

    checkPermissions();
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    const { item, quantity, location, date } = form;

    if (!item || !quantity || !location || !date) {
      setSuccess(null);
      setError('⚠ Please fill all required fields.');
      return;
    }

    if (!canCreateStockReceipt) {
      setSuccess(null);
      setError('⚠ You do not have permission to create a stock receipt.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await api.post('/receipts/stock/', form);
      setSuccess(`✅ Receipt for "${form.item}" successfully created.`);
      setForm({
        item: '',
        quantity: '',
        location: '',
        date: '',
        notes: '',
      });
    } catch (err) {
      console.error('❌ Error creating receipt:', err);
      const errMsg =
        err.response?.data?.detail ||
        err.response?.data?.message ||
        'Failed to create receipt.';
      setError(`⚠ ${errMsg}`);
    } finally {
      setLoading(false);
    }
  };

  if (checkingPermissions) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Typography variant="h6">Loading permissions...</Typography>
      </Container>
    );
  }

  if (!hasPageAccess) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Alert severity="error">{error || 'Access Denied: You do not have permission to view this page.'}</Alert>
      </Container>
    );
  }

  return (
    <Container sx={{ mt: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h5" gutterBottom>
          Create Stock Receipt
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Log new items received into inventory.
        </Typography>

        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
        {error && <Alert severity="warning" sx={{ mb: 2 }}>{error}</Alert>}

        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <TextField
              label="Item Name"
              name="item"
              fullWidth
              value={form.item}
              onChange={handleChange}
              required
              disabled={!canCreateStockReceipt}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              label="Quantity"
              name="quantity"
              type="number"
              fullWidth
              value={form.quantity}
              onChange={handleChange}
              required
              disabled={!canCreateStockReceipt}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              select
              label="Location"
              name="location"
              fullWidth
              value={form.location}
              onChange={handleChange}
              required
              disabled={!canCreateStockReceipt}
            >
              {locations.map((loc) => (
                <MenuItem key={loc} value={loc}>
                  {loc}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              label="Receipt Date"
              name="date"
              type="date"
              fullWidth
              InputLabelProps={{ shrink: true }}
              value={form.date}
              onChange={handleChange}
              required
              disabled={!canCreateStockReceipt}
            />
          </Grid>
          <Grid item xs={12} md={8}>
            <TextField
              label="Notes (optional)"
              name="notes"
              fullWidth
              multiline
              rows={2}
              value={form.notes}
              onChange={handleChange}
              disabled={!canCreateStockReceipt}
            />
          </Grid>
        </Grid>

        {canCreateStockReceipt && (
          <Button
            variant="contained"
            color="primary"
            sx={{ mt: 3 }}
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : 'Submit Receipt'}
          </Button>
        )}
      </Paper>
    </Container>
  );
}