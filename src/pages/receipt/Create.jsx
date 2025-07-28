import React, { useState } from 'react';
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
import api from '../../api'; // ✅ Use centralized API instance

const locations = ['Warehouse A', 'Warehouse B', 'Site A', 'Site B'];

export default function ReceiptCreate() {
  const [form, setForm] = useState({
    item: '',
    quantity: '',
    location: '',
    date: '',
    notes: ''
  });

  const [success, setSuccess] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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

    try {
      setLoading(true);
      setError('');
      const res = await api.post('receipts/create/', form);
      setSuccess(`✅ Receipt for "${form.item}" successfully created.`);
      setForm({
        item: '',
        quantity: '',
        location: '',
        date: '',
        notes: ''
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
            />
          </Grid>
        </Grid>

        <Button
          variant="contained"
          color="primary"
          sx={{ mt: 3 }}
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? <CircularProgress size={24} color="inherit" /> : 'Submit Receipt'}
        </Button>
      </Paper>
    </Container>
  );
}
