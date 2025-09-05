// src/pages/analytics/Stock.jsx
import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Paper, Table, TableHead, TableRow, TableCell,
  TableBody, TextField, Box, TableContainer, InputAdornment, Pagination,
  CircularProgress, Alert, Button, Dialog, DialogTitle, DialogContent,
  DialogActions, Grid, FormControl, InputLabel, Select, MenuItem // Added MenuItem
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AssessmentIcon from '@mui/icons-material/Assessment';
import API from '../../api';

export default function StockAnalytics() {
  const [data, setData] = useState([]);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    item: '',
    category: 'A',
    turnover_rate: '',
    obsolescence_risk: '',
  });
  const [formAlert, setFormAlert] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [hasPageAccess, setHasPageAccess] = useState(false);
  const [checkingPermissions, setCheckingPermissions] = useState(true);
  const [canCreateStock, setCanCreateStock] = useState(false);
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

        const pageResponse = await API.get('/auth/permissions/page/analytics_stock/');
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

        const actionResponse = await API.get('/auth/permissions/action/create_stock_analytics/');
        setCanCreateStock(actionResponse.data.allowed || false);

        const response = await API.get('analytics/stock/');
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
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const handleCreateStock = async () => {
    const { item, category, turnover_rate, obsolescence_risk } = form;
    if (!item || !category || !turnover_rate || !obsolescence_risk) {
      setFormAlert('⚠ Please fill in all required fields.');
      return;
    }

    try {
      setFormLoading(true);
      const res = await API.post('analytics/stock/', form);
      setData([res.data, ...data]);
      setOpen(false);
      setFormAlert(null);
      setForm({ item: '', category: 'A', turnover_rate: '', obsolescence_risk: '' });
    } catch (err) {
      console.error('❌ Error creating stock analytics:', err);
      setFormAlert(err.response?.data?.detail || '❌ Failed to create stock analytics.');
    } finally {
      setFormLoading(false);
    }
  };

  const filteredData = data.filter(
    (item) =>
      item.item.toLowerCase().includes(search.toLowerCase()) ||
      item.category.toLowerCase().includes(search.toLowerCase())
  );

  const paginatedData = filteredData.slice(
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
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom>
          Stock Analytics
        </Typography>
        <Typography variant="subtitle1" sx={{ mb: 3 }}>
          Review turnover rates, ABC classifications, and obsolescence risk.
        </Typography>

        <Box display="flex" justifyContent="space-between" mb={2}>
          <TextField
            placeholder="Search by item or category..."
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
            disabled={!canCreateStock}
          >
            Add Stock Analytics
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
                    <TableCell>Category (ABC)</TableCell>
                    <TableCell>Turnover Rate</TableCell>
                    <TableCell>Obsolescence Risk</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedData.length > 0 ? (
                    paginatedData.map((row, index) => (
                      <TableRow key={row.id}>
                        <TableCell>{(page - 1) * itemsPerPage + index + 1}</TableCell>
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={1}>
                            <AssessmentIcon fontSize="small" color="primary" />
                            {row.item}
                          </Box>
                        </TableCell>
                        <TableCell>{row.category}</TableCell>
                        <TableCell>{row.turnover_rate}</TableCell>
                        <TableCell>{row.obsolescence_risk}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} align="center">
                        No matching records found.
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
          * These insights are generated based on historical data. Accurate stock entry improves reporting reliability.
        </Typography>

        <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
          <DialogTitle>Add Stock Analytics</DialogTitle>
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
                <FormControl fullWidth>
                  <InputLabel>Category</InputLabel>
                  <Select
                    name="category"
                    value={form.category}
                    onChange={handleChange}
                  >
                    <MenuItem value="A">A</MenuItem>
                    <MenuItem value="B">B</MenuItem>
                    <MenuItem value="C">C</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  name="turnover_rate"
                  label="Turnover Rate"
                  type="number"
                  fullWidth
                  value={form.turnover_rate}
                  onChange={handleChange}
                  inputProps={{ step: "0.01" }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  name="obsolescence_risk"
                  label="Obsolescence Risk"
                  fullWidth
                  value={form.obsolescence_risk}
                  onChange={handleChange}
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
              onClick={handleCreateStock}
              disabled={formLoading || !canCreateStock}
            >
              {formLoading ? <CircularProgress size={24} color="inherit" /> : 'Create'}
            </Button>
          </DialogActions>
        </Dialog>
      </Paper>
    </Container>
  );
}