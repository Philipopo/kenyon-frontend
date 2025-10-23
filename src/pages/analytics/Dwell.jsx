import React, { useState, useEffect, useCallback } from 'react';
import {
  Container, Typography, Paper, TextField, InputAdornment, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Pagination, Box, CircularProgress, Alert, Button,
  Dialog, DialogTitle, DialogContent, DialogActions, Grid, FormControlLabel, Checkbox,
  Link, Accordion, AccordionSummary, AccordionDetails, IconButton, Collapse, Chip
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import StorageIcon from '@mui/icons-material/Inventory2';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import API from '../../api';

function DwellRow({ row, index, page, itemsPerPage, onReorder }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <TableRow sx={{ '& > *': { borderBottom: 'unset' }, cursor: 'pointer' }} onClick={() => setOpen(!open)}>
        <TableCell>
          <IconButton
            aria-label="expand row"
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(!open);
            }}
          >
            {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </TableCell>
        <TableCell>{(page - 1) * itemsPerPage + index + 1}</TableCell>
        <TableCell>
          <Box display="flex" alignItems="center" gap={1}>
            <StorageIcon fontSize="small" color="primary" />
            {row.item}
          </Box>
        </TableCell>
        <TableCell>{row.duration_days}</TableCell>
        <TableCell>
          <Chip
            label={row.is_aging ? 'Aging' : 'Non-Aging'}
            color={row.is_aging ? 'error' : 'success'}
            size="small"
          />
        </TableCell>
        <TableCell>₦{parseFloat(row.storage_cost).toFixed(2)}</TableCell>
        <TableCell>
          {row.is_aging && (
            <Button
              size="small"
              variant="outlined"
              color="primary"
              onClick={(e) => {
                e.stopPropagation();
                onReorder(row);
              }}
            >
              Add to Reorder Queue
            </Button>
          )}
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={6}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ margin: 2 }}>
              <Typography variant="h6" gutterBottom component="div">
                Dwell Details
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography><strong>Item:</strong> {row.item}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography><strong>Duration (days):</strong> {row.duration_days}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography><strong>Aging Status:</strong> {row.is_aging ? 'Yes' : 'No'}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography><strong>Storage Cost:</strong> ₦{parseFloat(row.storage_cost).toFixed(2)}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography><strong>Created At:</strong> {new Date(row.created_at).toLocaleString()}</Typography>
                </Grid>
              </Grid>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
}

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
  const [canReorder, setCanReorder] = useState(false);
  const itemsPerPage = 10;
  const navigate = useNavigate();

  const checkAuth = useCallback(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      setError('⚠️ No authentication token found. Please log in.');
      setTimeout(() => navigate('/login'), 2000);
      return false;
    }
    return token;
  }, [navigate]);

  const fetchDwellData = useCallback(async () => {
    const token = checkAuth();
    if (!token) return;
    
    try {
      const response = await API.get('analytics/dwell/', {
        headers: { Authorization: `Bearer ${token}` },
        params: { search, page, page_size: itemsPerPage },
      });
      setData(response.data.results || response.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching dwell data:', err);
      if (err.response?.status === 401) {
        setError('⚠️ Session expired. Please log in again.');
        navigate('/login');
      } else {
        setError(`⚠️ Failed to load dwell data: ${err.response?.data?.detail || err.message}`);
      }
      setLoading(false);
    }
  }, [checkAuth, navigate, search, page]);

  const checkPermissions = useCallback(async () => {
    setCheckingPermissions(true);
    const token = checkAuth();
    if (!token) {
      setHasPageAccess(false);
      setCheckingPermissions(false);
      return;
    }

    try {
      const [pageResponse, createResponse, reorderResponse] = await Promise.all([
        API.get('/auth/permissions/page/analytics_dwell/', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        API.get('/auth/permissions/action/create_dwell/', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        API.get('/auth/permissions/page/analytics_reorder/', {
          headers: { Authorization: `Bearer ${token}` },
        })
      ]);
      
      if (!pageResponse.data.allowed) {
        setError(`⚠️ ${pageResponse.data.reason || 'No permission to view dwell time analysis.'}`);
        setHasPageAccess(false);
        setCheckingPermissions(false);
        return;
      }
      
      setHasPageAccess(true);
      setCanCreateDwell(createResponse.data.allowed || false);
      setCanReorder(reorderResponse.data.allowed || false);
      await fetchDwellData();
      
    } catch (err) {
      console.error('Error checking permissions:', err);
      if (err.response?.status === 401) {
        setError('⚠️ Authentication failed. Please log in again.');
        navigate('/login');
      } else {
        setError(`⚠️ Failed to check permissions: ${err.response?.data?.detail || err.message}`);
      }
      setHasPageAccess(false);
    } finally {
      setCheckingPermissions(false);
    }
  }, [checkAuth, fetchDwellData, navigate]);

  useEffect(() => {
    checkPermissions();
  }, [checkPermissions]);

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
      const token = checkAuth();
      if (!token) throw new Error('No authentication token found.');
      
      const res = await API.post('analytics/dwell/', form, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      setData(prevData => [res.data, ...prevData]);
      setOpen(false);
      setFormAlert(null);
      setForm({ item: '', duration_days: '', is_aging: false, storage_cost: '' });
      toast.success('✅ Dwell record created successfully', { id: 'dwell-create' });
    } catch (err) {
      console.error('Error creating dwell record:', err);
      setFormAlert(err.response?.data?.detail || '❌ Failed to create dwell record.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleReorder = async (row) => {
    if (!canReorder) {
      setError('⚠️ No permission to add to reorder queue.');
      return;
    }
    try {
      await API.post('analytics/reorder-queue/', {
        item: row.item_id, // Assumes item_id is available; adjust based on backend
        recommended_quantity: Math.round(row.duration_days * 0.1) // Example logic
      });
      toast.success(`✅ Added ${row.item} to reorder queue.`);
      fetchDwellData();
    } catch (err) {
      setError(`❌ Failed to add to reorder queue: ${err.response?.data?.detail || err.message}`);
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
          Average storage duration metrics and aging stock reports. For EOQ and reorder recommendations, visit{' '}
          <Link href="/analytics/optimization" color="primary">Stock Optimization</Link>.
        </Typography>

        <Accordion sx={{ mb: 2 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6">Dwell Time Guide</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="body1" paragraph>
              <strong>💡 What is Dwell Time Analysis?</strong> This module tracks how long items remain in storage, identifying slow-moving or aging stock that may incur high storage costs.
            </Typography>
            <Typography variant="body1" paragraph>
              <strong>📊 Key Metrics:</strong>
              <ul>
                <li><strong>Storage Duration:</strong> Days an item has been in inventory.</li>
                <li><strong>Aging Status:</strong> Indicates if an item is at risk of becoming obsolete (e.g., duration > threshold).</li>
                <li><strong>Storage Cost:</strong> Cost incurred for holding the item (₦).</li>
              </ul>
            </Typography>
            <Typography variant="body1" paragraph>
              <strong>✅ Best Practices:</strong>
              <ul>
                <li>Use dwell time to identify items for reorder or disposal.</li>
                <li>Combine with Stock Optimization for EOQ-based reordering.</li>
                <li>Monitor aging items to reduce storage costs.</li>
              </ul>
            </Typography>
          </AccordionDetails>
        </Accordion>

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
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        ) : (
          <>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell />
                    <TableCell>S/N</TableCell>
                    <TableCell>Item</TableCell>
                    <TableCell>Storage Duration (days)</TableCell>
                    <TableCell>Aging</TableCell>
                    <TableCell>Storage Cost (₦)</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedData.length > 0 ? (
                    paginatedData.map((row, index) => (
                      <DwellRow
                        key={row.id}
                        row={row}
                        index={index}
                        page={page}
                        itemsPerPage={itemsPerPage}
                        onReorder={handleReorder}
                      />
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} align="center">
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
                  required
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
                  required
                  inputProps={{ min: 0 }}
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
                  required
                  inputProps={{ step: "0.01", min: 0 }}
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