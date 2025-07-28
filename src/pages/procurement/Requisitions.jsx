import React, { useState } from 'react';
import {
  Container,
  Typography,
  Paper,
  TextField,
  Button,
  MenuItem,
  Alert,
  Box,
  Divider
} from '@mui/material';
import API from '../../api'; // ✅ Use shared API instance

const departments = ['Operations', 'IT', 'Maintenance', 'Finance'];

const approvalFlows = {
  Operations: ['Ops Manager', 'Procurement'],
  IT: ['IT Lead', 'Procurement'],
  Maintenance: ['Maintenance Head', 'Procurement Manager', 'Finance Director'],
  Finance: ['Finance Head']
};

const budgetLimits = {
  Operations: 500000,
  IT: 300000,
  Maintenance: 1000000,
  Finance: 200000
};

export default function Requisitions() {
  const [form, setForm] = useState({
    item: '',
    quantity: '',
    department: '',
    purpose: '',
    cost: ''
  });

  const [alert, setAlert] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setAlert(null);
  };

  const handleSubmit = async () => {
    const { item, quantity, department, purpose, cost } = form;

    if (!item || !quantity || !department || !purpose || !cost) {
      setAlert('⚠ All fields are required.');
      return;
    }

    const parsedCost = parseFloat(cost);
    const budget = budgetLimits[department] || 0;

    if (parsedCost > budget) {
      setAlert(`⚠ Request exceeds the ₦${budget.toLocaleString()} budget for ${department}`);
      return;
    }

    try {
      setLoading(true);

      await API.post(
        'procurement/requisitions/',
        {
          item,
          quantity: parseInt(quantity),
          cost: parseFloat(cost),
          department,
          purpose
        }
      );

      const route = approvalFlows[department]?.join(' → ') || 'Unknown';
      setAlert(`✅ Requisition submitted successfully. Routed to: ${route}`);
      setForm({ item: '', quantity: '', department: '', purpose: '', cost: '' });
    } catch (err) {
      console.error('Submission error:', err);

      const backendMessage =
        err.response?.data?.detail ||
        err.response?.data?.message ||
        JSON.stringify(err.response?.data) ||
        '❌ Failed to submit requisition.';

      setAlert(backendMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h5" gutterBottom>
          Create New Requisition
        </Typography>
        <Typography variant="body2" sx={{ mb: 2 }} color="text.secondary">
          Submit a procurement request with estimated cost and department selection.
        </Typography>

        {alert && (
          <Alert
            severity={
              alert.includes('⚠') ? 'warning' :
              alert.includes('❌') ? 'error' : 'success'
            }
            sx={{ mb: 2 }}
          >
            {alert}
          </Alert>
        )}

        <TextField
          label="Item Name"
          name="item"
          fullWidth
          margin="normal"
          value={form.item}
          onChange={handleChange}
        />

        <TextField
          label="Quantity"
          name="quantity"
          type="number"
          fullWidth
          margin="normal"
          value={form.quantity}
          onChange={handleChange}
        />

        <TextField
          label="Estimated Cost (₦)"
          name="cost"
          type="number"
          fullWidth
          margin="normal"
          value={form.cost}
          onChange={handleChange}
        />

        <TextField
          select
          label="Department"
          name="department"
          fullWidth
          margin="normal"
          value={form.department}
          onChange={handleChange}
        >
          {departments.map((dep) => (
            <MenuItem key={dep} value={dep}>
              {dep}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          label="Purpose"
          name="purpose"
          multiline
          rows={3}
          fullWidth
          margin="normal"
          value={form.purpose}
          onChange={handleChange}
        />

        <Divider sx={{ my: 3 }} />

        {form.department && (
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              🧭 Approval Routing Preview:
            </Typography>
            <Typography variant="body2">
              {approvalFlows[form.department].join(' → ')}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Routing is based on department policy.
            </Typography>
          </Box>
        )}

        <Button
          variant="contained"
          color="primary"
          fullWidth
          sx={{ mt: 3 }}
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? 'Submitting...' : 'Submit Requisition'}
        </Button>
      </Paper>
    </Container>
  );
}

