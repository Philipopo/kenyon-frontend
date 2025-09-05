// src/pages/analytics/EOQ.jsx
import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Paper, TextField, InputAdornment, Table,
  TableBody, TableCell, TableHead, TableRow, Pagination, Box,
  TableContainer, CircularProgress, Alert, Button, Dialog,
  DialogTitle, DialogContent, DialogActions, Grid
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import API from '../../api';

export default function EOQReports() {
  const [data, setData] = useState([]);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    item: '',
    part_number: '',
    demand_rate: '',
    order_cost: '',
    holding_cost: '',
    eoq: '',
  });
  const [formAlert, setFormAlert] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [hasPageAccess, setHasPageAccess] = useState(false);
  const [checkingPermissions, setCheckingPermissions] = useState(true);
  const [canCreateEOQ, setCanCreateEOQ] = useState(false);
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

        const pageResponse = await API.get('/auth/permissions/page/analytics_eoq/');
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

        const actionResponse = await API.get('/auth/permissions/action/create_eoq/');
        setCanCreateEOQ(actionResponse.data.allowed || false);

        const response = await API.get('analytics/eoq/');
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

  const handleCreateEOQ = async () => {
    const { item, part_number, demand_rate, order_cost, holding_cost, eoq } = form;
    if (!item || !part_number || !demand_rate || !order_cost || !holding_cost || !eoq) {
      setFormAlert('⚠ Please fill in all required fields.');
      return;
    }

    try {
      setFormLoading(true);
      const res = await API.post('analytics/eoq/', form);
      setData([res.data, ...data]);
      setOpen(false);
      setFormAlert(null);
      setForm({ item: '', part_number: '', demand_rate: '', order_cost: '', holding_cost: '', eoq: '' });
    } catch (err) {
      console.error('❌ Error creating EOQ report:', err);
      setFormAlert(err.response?.data?.detail || '❌ Failed to create EOQ report.');
    } finally {
      setFormLoading(false);
    }
  };

  const filteredData = data.filter((row) =>
    row.item.toLowerCase().includes(search.toLowerCase()) ||
    row.part_number.toLowerCase().includes(search.toLowerCase())
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
          EOQ Reports
        </Typography>
        <Typography variant="subtitle1" sx={{ mb: 3 }}>
          Auto-replenishment insights based on demand, order cost, and holding cost data.
        </Typography>

        <Box display="flex" justifyContent="space-between" mb={2}>
          <TextField
            placeholder="Search by item or part number..."
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
            disabled={!canCreateEOQ}
          >
            Add EOQ Report
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
                    <TableCell>Part Number</TableCell>
                    <TableCell>Demand Rate (units/year)</TableCell>
                    <TableCell>Order Cost (₦)</TableCell>
                    <TableCell>Holding Cost (₦/unit/year)</TableCell>
                    <TableCell>EOQ (units)</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedData.length > 0 ? (
                    paginatedData.map((row, index) => (
                      <TableRow key={row.id}>
                        <TableCell>{(page - 1) * itemsPerPage + index + 1}</TableCell>
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={1}>
                            <PrecisionManufacturingIcon fontSize="small" color="primary" />
                            {row.item}
                          </Box>
                        </TableCell>
                        <TableCell>{row.part_number}</TableCell>
                        <TableCell>{row.demand_rate}</TableCell>
                        <TableCell>₦{parseFloat(row.order_cost).toFixed(2)}</TableCell>
                        <TableCell>₦{parseFloat(row.holding_cost).toFixed(2)}</TableCell>
                        <TableCell>{row.eoq}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} align="center">
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
          EOQ helps in minimizing total inventory costs. Review reports to determine optimal order quantity and restocking efficiency.
        </Typography>

        <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
          <DialogTitle>Add EOQ Report</DialogTitle>
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
                  name="part_number"
                  label="Part Number"
                  fullWidth
                  value={form.part_number}
                  onChange={handleChange}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  name="demand_rate"
                  label="Demand Rate (units/year)"
                  type="number"
                  fullWidth
                  value={form.demand_rate}
                  onChange={handleChange}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  name="order_cost"
                  label="Order Cost (₦)"
                  type="number"
                  fullWidth
                  value={form.order_cost}
                  onChange={handleChange}
                  inputProps={{ step: "0.01" }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  name="holding_cost"
                  label="Holding Cost (₦/unit/year)"
                  type="number"
                  fullWidth
                  value={form.holding_cost}
                  onChange={handleChange}
                  inputProps={{ step: "0.01" }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  name="eoq"
                  label="EOQ (units)"
                  type="number"
                  fullWidth
                  value={form.eoq}
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
              onClick={handleCreateEOQ}
              disabled={formLoading || !canCreateEOQ}
            >
              {formLoading ? <CircularProgress size={24} color="inherit" /> : 'Create'}
            </Button>
          </DialogActions>
        </Dialog>
      </Paper>
    </Container>
  );
}