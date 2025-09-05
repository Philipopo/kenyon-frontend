// src/pages/analytics/Dwell.jsx
import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Paper, TextField, InputAdornment, Table,
  TableBody, TableCell, TableContainer, TableHead, TableRow, Pagination,
  Box, CircularProgress, Alert, Button, Dialog, DialogTitle, DialogContent,
  DialogActions, Grid, FormControlLabel, Checkbox
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import StorageIcon from '@mui/icons-material/Inventory2';
import API from '../../api';

export default function DwellTime() {
  const [data, setData] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    item: '',
    duration_days: '',
    is_aging: false,
    storage_cost: '',
  });
  const [formAlert, setFormAlert] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [hasPageAccess, setHasPageAccess] = useState(false);
  const [checkingPermissions, setCheckingPermissions] = useState(true);
  const [canCreateDwell, setCanCreateDwell] = useState(false);
  const itemsPerPage = 10;

  useEffect(() => {
    const checkPermissions = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        if (!token) {
          setError('⚠️ No authentication token found. Please log in.');
          setHasPageAccess(false);
          setCheckingPermissions(false);
          return;
        }

        const pageResponse = await API.get('/auth/permissions/page/analytics_dwell/');
        if (pageResponse.data && typeof pageResponse.data.allowed === 'boolean') {
          setHasPageAccess(pageResponse.data.allowed);
          if (!pageResponse.data.allowed) {
            setError(`⚠️ You do not have permission to view this page: ${pageResponse.data.reason || 'No reason provided'}`);
            setCheckingPermissions(false);
            return;
          }
        } else {
          setError('⚠️ Invalid permission response from server.');
          setHasPageAccess(false);
          setCheckingPermissions(false);
          return;
        }

        const actionResponse = await API.get('/auth/permissions/action/create_dwell/');
        setCanCreateDwell(actionResponse.data.allowed || false);

        const response = await API.get('analytics/dwell/');
        setData(response.data);
        setLoading(false);
      } catch (err) {
        console.error('Error checking permissions or fetching data:', err.response?.data || err.message);
        setError(
          err.response?.status === 401 ? '⚠️ Authentication failed. Please log in again.' :
          err.response?.status === 404 ? '⚠️ Permission endpoint not found. Contact support.' :
          `⚠️ Failed to check permissions or fetch data: ${err.response?.data?.detail || err.message}`
        );
        setHasPageAccess(false);
      } finally {
        setCheckingPermissions(false);
      }
    };

    checkPermissions();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({ ...form, [name]: type === 'checkbox' ? checked : value });
  };

  const handleCreateDwell = async () => {
    const { item, duration_days, storage_cost } = form;
    if (!item || !duration_days || !storage_cost) {
      setFormAlert('⚠ Please fill in all required fields.');
      return;
    }

    try {
      setFormLoading(true);
      const res = await API.post('analytics/dwell/', form);
      setData([res.data, ...data]);
      setOpen(false);
      setFormAlert(null);
      setForm({ item: '', duration_days: '', is_aging: false, storage_cost: '' });
    } catch (err) {
      console.error('❌ Error creating dwell record:', err);
      setFormAlert(err.response?.data?.detail || '❌ Failed to create dwell record.');
    } finally {
      setFormLoading(false);
    }
  };

  const filteredData = data.filter((row) =>
    row.item.toLowerCase().includes(search.toLowerCase())
  );

  const paginatedData = filteredData.slice((page - 1) * itemsPerPage, page * itemsPerPage);

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
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom>
          Dwell Time Analysis
        </Typography>
        <Typography variant="subtitle1" sx={{ mb: 3 }}>
          Average storage duration metrics and aging stock reports
        </Typography>

        <Box display="flex" justifyContent="space-between" mb={2}>
          <TextField
            placeholder="Search by item..."
            variant="outlined"
            size="small"
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
          <Button
            variant="contained"
            onClick={() => setOpen(true)}
            disabled={!canCreateDwell}
          >
            Add Dwell Record
          </Button>
        </Box>

        {loading ? (
          <Box display="flex" justifyContent="center" my={4}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : (
          <>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>S/N</TableCell>
                    <TableCell>Item</TableCell>
                    <TableCell>Storage Duration (days)</TableCell>
                    <TableCell>Aging</TableCell>
                    <TableCell>Storage Cost (₦)</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedData.length > 0 ? (
                    paginatedData.map((row, index) => (
                      <TableRow key={row.id}>
                        <TableCell>{(page - 1) * itemsPerPage + index + 1}</TableCell>
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={1}>
                            <StorageIcon fontSize="small" color="primary" />
                            {row.item}
                          </Box>
                        </TableCell>
                        <TableCell>{row.duration_days}</TableCell>
                        <TableCell>{row.is_aging ? 'Yes' : 'No'}</TableCell>
                        <TableCell>₦{parseFloat(row.storage_cost).toFixed(2)}</TableCell>
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
                count={Math.ceil(filteredData.length / itemsPerPage)}
                page={page}
                onChange={(_, value) => setPage(value)}
                color="primary"
              />
            </Box>
          </>
        )}

        <Typography variant="body2" color="text.secondary" sx={{ mt: 4 }}>
          Use this module to detect slow-moving or costly-to-store items and take proactive actions to optimize warehouse efficiency.
        </Typography>

        <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
          <DialogTitle>Add Dwell Record</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <TextField
                  name="item"
                  label="Item"
                  fullWidth
                  value={form.item}
                  onChange={handleChange}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  name="duration_days"
                  label="Storage Duration (days)"
                  type="number"
                  fullWidth
                  value={form.duration_days}
                  onChange={handleChange}
                />
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Checkbox
                      name="is_aging"
                      checked={form.is_aging}
                      onChange={handleChange}
                    />
                  }
                  label="Is Aging"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  name="storage_cost"
                  label="Storage Cost (₦)"
                  type="number"
                  fullWidth
                  value={form.storage_cost}
                  onChange={handleChange}
                  inputProps={{ step: "0.01" }}
                />
              </Grid>
            </Grid>

            {formAlert && (
              <Alert sx={{ mt: 2 }} severity={formAlert.includes('❌') ? 'error' : 'warning'}>
                {formAlert}
              </Alert>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              variant="contained"
              onClick={handleCreateDwell}
              disabled={formLoading || !canCreateDwell}
            >
              {formLoading ? <CircularProgress size={24} color="inherit" /> : 'Create'}
            </Button>
          </DialogActions>
        </Dialog>
      </Paper>
    </Container>
  );
}