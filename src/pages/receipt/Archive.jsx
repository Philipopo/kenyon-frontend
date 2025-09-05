// src/pages/ReceiptArchive.jsx
import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Paper,
  Box,
  TextField,
  InputAdornment,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Pagination,
  Alert,
  CircularProgress,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import api from '../../api';

export default function ReceiptArchive() {
  const [hasPageAccess, setHasPageAccess] = useState(false);
  const [canCreateReceipt, setCanCreateReceipt] = useState(false);
  const [error, setError] = useState('');
  const [checkingPermissions, setCheckingPermissions] = useState(true);
  const [receipts, setReceipts] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({
    item: '',
    quantity: '',
    issued_by: '',
    date: '',
  });
  const [formError, setFormError] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const itemsPerPage = 10;

  useEffect(() => {
    const checkPermissions = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        console.log('Access token:', token ? 'Present' : 'Missing');
        if (!token) {
          setError('⚠️ No authentication token found. Please log in.');
          setHasPageAccess(false);
          setCanCreateReceipt(false);
          setCheckingPermissions(false);
          return;
        }
        console.log('Fetching page permission from /auth/permissions/page/receipt_archive/');
        const pageResponse = await api.get('/auth/permissions/page/receipt_archive/');
        console.log('Page permission response:', pageResponse.data);
        setHasPageAccess(pageResponse.data.allowed || false);
        if (!pageResponse.data.allowed) {
          setError(`⚠️ You do not have permission to view this page: ${pageResponse.data.reason || 'No reason provided'}`);
        }

        console.log('Fetching action permission from /auth/permissions/action/create_receipt/');
        const actionResponse = await api.get('/auth/permissions/action/create_receipt/');
        console.log('Action permission response:', actionResponse.data);
        setCanCreateReceipt(actionResponse.data.allowed || false);
        if (!actionResponse.data.allowed) {
  setError(
    `⚠️ You do not have permission to create a receipt: ${
      actionResponse.data.reason || 'No reason provided'
    }`
  );
}

        if (pageResponse.data.allowed) {
          try {
            const res = await api.get('/receipts/');
            setReceipts(res.data);
          } catch (err) {
            console.error('❌ Error fetching receipts:', err);
            setError(
              err.response?.data?.detail ||
              err.response?.data?.message ||
              'Failed to load receipts.'
            );
          } finally {
            setLoading(false);
          }
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
        setCanCreateReceipt(false);
      } finally {
        setCheckingPermissions(false);
      }
    };

    checkPermissions();
  }, []);

  const handleFormChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleCreateReceipt = async () => {
    if (!form.item || !form.quantity || !form.issued_by || !form.date) {
      setFormError('⚠ Please fill all required fields.');
      return;
    }

    if (!canCreateReceipt) {
      setFormError('⚠ You do not have permission to create a receipt.');
      return;
    }

    try {
      setFormLoading(true);
      setFormError(null);
      const payload = {
        item: form.item.trim(),
        quantity: form.quantity,
        issued_by: form.issued_by.trim(),
        date: form.date,
      };
      const res = await api.post('/receipts/', payload);
      setReceipts([res.data, ...receipts]);
      setFormOpen(false);
      setForm({ item: '', quantity: '', issued_by: '', date: '' });
    } catch (err) {
      console.error('❌ Error creating receipt:', err);
      setFormError(
        err.response?.data?.detail ||
        err.response?.data?.message ||
        'Failed to create receipt.'
      );
    } finally {
      setFormLoading(false);
    }
  };

  const filteredReceipts = receipts.filter((receipt) =>
    receipt.item?.toLowerCase().includes(search.toLowerCase())
  );

  const paginatedReceipts = filteredReceipts.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

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
        Receipt Archive
      </Typography>

      <Paper elevation={3} sx={{ p: 3 }}>
        <Box display="flex" justifyContent="space-between" mb={2}>
          <TextField
            variant="outlined"
            size="small"
            placeholder="Search by item..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
          {canCreateReceipt && (
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setFormOpen(true)}>
              Add Receipt
            </Button>
          )}
        </Box>

        {loading ? (
          <Box display="flex" justifyContent="center" py={5}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        ) : (
          <>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>S/N</TableCell>
                    <TableCell>Item</TableCell>
                    <TableCell>Quantity</TableCell>
                    <TableCell>Issued By</TableCell>
                    <TableCell>Date</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedReceipts.length > 0 ? (
                    paginatedReceipts.map((receipt, index) => (
                      <TableRow key={receipt.id}>
                        <TableCell>{(page - 1) * itemsPerPage + index + 1}</TableCell>
                        <TableCell>{receipt.item}</TableCell>
                        <TableCell>{receipt.quantity}</TableCell>
                        <TableCell>{receipt.issued_by}</TableCell>
                        <TableCell>{new Date(receipt.date).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} align="center">
                        No results found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            <Box display="flex" justifyContent="center" mt={3}>
              <Pagination
                count={Math.ceil(filteredReceipts.length / itemsPerPage)}
                page={page}
                onChange={(_, value) => setPage(value)}
                color="primary"
              />
            </Box>
          </>
        )}
      </Paper>

      {canCreateReceipt && (
        <Dialog open={formOpen} onClose={() => setFormOpen(false)} fullWidth maxWidth="sm">
          <DialogTitle>Add Receipt</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <TextField
                  label="Item"
                  name="item"
                  fullWidth
                  value={form.item}
                  onChange={handleFormChange}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Quantity"
                  name="quantity"
                  type="number"
                  fullWidth
                  value={form.quantity}
                  onChange={handleFormChange}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Issued By"
                  name="issued_by"
                  fullWidth
                  value={form.issued_by}
                  onChange={handleFormChange}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Date"
                  name="date"
                  type="date"
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  value={form.date}
                  onChange={handleFormChange}
                  required
                />
              </Grid>
            </Grid>
            {formError && <Alert severity="error" sx={{ mt: 2 }}>{formError}</Alert>}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button variant="contained" onClick={handleCreateReceipt} disabled={formLoading}>
              Submit
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Container>
  );
}