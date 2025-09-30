import React, { useState, useEffect, useCallback } from 'react';
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
  FormControl,
  InputLabel,
  Select,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import api from '../../api';

export default function StockReceiptCreate() {
  const [hasPageAccess, setHasPageAccess] = useState(false);
  const [canCreateStockReceipt, setCanCreateStockReceipt] = useState(false);
  const [error, setError] = useState('');
  const [checkingPermissions, setCheckingPermissions] = useState(true);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(false);

  // Form state
  const [form, setForm] = useState({
    purchase_order: '',
    item: '',
    quantity_received: '',
    quantity_accepted: '',
    quantity_rejected: '0',
    rejection_reason: '',
    storage_bin: '',
    batch_number: '',
    expiry_date: '',
    notes: '',
  });

  // Options from API
  const [items, setItems] = useState([]);
  const [bins, setBins] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);

  // Fetch dropdown options
  const fetchOptions = useCallback(async () => {
    try {
      const [itemRes, binRes, poRes] = await Promise.all([
        api.get('/inventory/items/', { params: { page_size: 1000 } }),
        api.get('/inventory/bins/', { params: { page_size: 1000 } }),
        api.get('/procurement/purchase_orders/', { params: { status: 'approved', page_size: 100 } }),
      ]);
      setItems(itemRes.data.results || []);
      setBins(binRes.data.results || []);
      setPurchaseOrders(poRes.data.results || []);
    } catch (err) {
      console.error('Failed to fetch options:', err);
    }
  }, []);

  // Handle form changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));

    // Auto-calculate accepted/rejected
    if (name === 'quantity_received') {
      const received = parseInt(value) || 0;
      const accepted = form.quantity_accepted ? parseInt(form.quantity_accepted) : received;
      const rejected = Math.max(0, received - accepted);
      setForm((prev) => ({
        ...prev,
        quantity_received: value,
        quantity_rejected: rejected.toString(),
      }));
    }

    if (name === 'quantity_accepted') {
      const received = parseInt(form.quantity_received) || 0;
      const accepted = parseInt(value) || 0;
      const rejected = Math.max(0, received - accepted);
      setForm((prev) => ({
        ...prev,
        quantity_accepted: value,
        quantity_rejected: rejected.toString(),
      }));
    }
  };

  // Handle rejection reason toggle
  const handleRejectionChange = (e) => {
    const rejected = e.target.value;
    setForm((prev) => ({
      ...prev,
      quantity_rejected: rejected,
      rejection_reason: rejected && parseInt(rejected) > 0 ? prev.rejection_reason : '',
    }));
  };

  // Submit handler
  const handleSubmit = async () => {
    const {
      purchase_order,
      item,
      quantity_received,
      quantity_accepted,
      storage_bin,
      batch_number,
      expiry_date,
      notes,
      rejection_reason,
    } = form;

    if (!item || !quantity_received || !storage_bin) {
      setError('⚠ Please fill all required fields.');
      return;
    }

    if (!canCreateStockReceipt) {
      setError('⚠ You do not have permission to create a stock receipt.');
      return;
    }

    if (parseInt(quantity_accepted) > parseInt(quantity_received)) {
      setError('⚠ Accepted quantity cannot exceed received quantity.');
      return;
    }

    if (parseInt(form.quantity_rejected) > 0 && !rejection_reason.trim()) {
      setError('⚠ Rejection reason is required when rejecting items.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await api.post('/receipts/stock/', {
        purchase_order: purchase_order || null,
        item: parseInt(item),
        quantity_received: parseInt(quantity_received),
        quantity_accepted: parseInt(quantity_accepted),
        quantity_rejected: parseInt(form.quantity_rejected),
        rejection_reason: rejection_reason.trim() || null,
        storage_bin: parseInt(storage_bin),
        batch_number: batch_number || null,
        expiry_date: expiry_date || null,
        notes: notes || null,
      });
      setSuccess(`✅ Stock receipt created successfully.`);
      setForm({
        purchase_order: '',
        item: '',
        quantity_received: '',
        quantity_accepted: '',
        quantity_rejected: '0',
        rejection_reason: '',
        storage_bin: '',
        batch_number: '',
        expiry_date: '',
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

  // Permission & data fetch
  useEffect(() => {
    const checkPermissions = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        if (!token) {
          setError('⚠️ No authentication token found. Please log in.');
          setHasPageAccess(false);
          setCanCreateStockReceipt(false);
          setCheckingPermissions(false);
          return;
        }

        const [pageRes, actionRes] = await Promise.all([
          api.get('/auth/permissions/page/stock_receipts/'),
          api.get('/auth/permissions/action/create_stock_receipt/'),
        ]);

        setHasPageAccess(pageRes.data.allowed || false);
        setCanCreateStockReceipt(actionRes.data.allowed || false);

        if (pageRes.data.allowed) {
          fetchOptions();
        } else {
          setError(`⚠️ Access denied: ${pageRes.data.reason || 'No reason provided'}`);
        }
      } catch (err) {
        console.error('Error checking permissions:', err);
        setError(`⚠️ Failed to check permissions: ${err.message}`);
        setHasPageAccess(false);
        setCanCreateStockReceipt(false);
      } finally {
        setCheckingPermissions(false);
      }
    };

    checkPermissions();
  }, [fetchOptions]);

  if (checkingPermissions) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Typography variant="h6">Loading permissions...</Typography>
        <CircularProgress sx={{ mt: 2 }} />
      </Container>
    );
  }

  if (!hasPageAccess) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Alert severity="error">{error || 'Access Denied'}</Alert>
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
          Log received inventory items with full traceability to Purchase Orders, Bins, and Items.
        </Typography>

        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
        {error && <Alert severity="warning" sx={{ mb: 2 }}>{error}</Alert>}

        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Purchase Order (Optional)</InputLabel>
              <Select
                name="purchase_order"
                value={form.purchase_order}
                onChange={handleChange}
                label="Purchase Order (Optional)"
              >
                <MenuItem value="">None</MenuItem>
                {purchaseOrders.map((po) => (
                  <MenuItem key={po.id} value={po.id}>
                    {po.code} - {po.vendor?.name || 'Unknown Vendor'}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={6}>
            <FormControl fullWidth required>
              <InputLabel>Item *</InputLabel>
              <Select
                name="item"
                value={form.item}
                onChange={handleChange}
                label="Item *"
              >
                {items.map((item) => (
                  <MenuItem key={item.id} value={item.id}>
                    {item.name} ({item.part_number})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={4}>
            <TextField
              label="Quantity Received *"
              name="quantity_received"
              type="number"
              fullWidth
              value={form.quantity_received}
              onChange={handleChange}
              inputProps={{ min: 1 }}
              required
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <TextField
              label="Quantity Accepted *"
              name="quantity_accepted"
              type="number"
              fullWidth
              value={form.quantity_accepted}
              onChange={handleChange}
              inputProps={{ min: 0 }}
              required
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <TextField
              label="Quantity Rejected"
              name="quantity_rejected"
              type="number"
              fullWidth
              value={form.quantity_rejected}
              onChange={handleRejectionChange}
              inputProps={{ min: 0 }}
            />
          </Grid>

          {parseInt(form.quantity_rejected) > 0 && (
            <Grid item xs={12}>
              <TextField
                label="Rejection Reason *"
                name="rejection_reason"
                fullWidth
                multiline
                rows={2}
                value={form.rejection_reason}
                onChange={handleChange}
                required
              />
            </Grid>
          )}

          <Grid item xs={12} md={6}>
            <FormControl fullWidth required>
              <InputLabel>Storage Bin *</InputLabel>
              <Select
                name="storage_bin"
                value={form.storage_bin}
                onChange={handleChange}
                label="Storage Bin *"
              >
                {bins.map((bin) => (
                  <MenuItem key={bin.id} value={bin.id}>
                    {bin.bin_id} ({bin.warehouse_name || 'No Warehouse'})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={3}>
            <TextField
              label="Batch Number"
              name="batch_number"
              fullWidth
              value={form.batch_number}
              onChange={handleChange}
            />
          </Grid>

          <Grid item xs={12} md={3}>
            <TextField
              label="Expiry Date"
              name="expiry_date"
              type="date"
              fullWidth
              InputLabelProps={{ shrink: true }}
              value={form.expiry_date}
              onChange={handleChange}
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              label="Notes (Optional)"
              name="notes"
              fullWidth
              multiline
              rows={2}
              value={form.notes}
              onChange={handleChange}
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
            startIcon={loading ? <CircularProgress size={20} /> : <AddIcon />}
          >
            {loading ? 'Creating...' : 'Create Stock Receipt'}
          </Button>
        )}
      </Paper>
    </Container>
  );
}