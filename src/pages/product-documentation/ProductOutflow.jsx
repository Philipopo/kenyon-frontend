import React, { useState, useEffect, useCallback } from 'react';
import {
  Container, Typography, Paper, Box, Button, Alert, Dialog, DialogTitle, DialogContent, DialogActions,
  Grid, FormControl, InputLabel, Select, MenuItem, TextField, Accordion, AccordionSummary, AccordionDetails,
  Table, TableHead, TableRow, TableCell, TableBody, IconButton, Pagination, Collapse
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import API from '../../api';
import { useSearch } from '../../context/SearchContext';

function OutflowRow({ outflow, onEdit, onDelete, hasUpdatePermission, hasDeletePermission }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <TableRow sx={{ '& > *': { borderBottom: 'unset' }, cursor: 'pointer' }} onClick={() => setOpen(!open)}>
        <TableCell>
          <IconButton size="small" onClick={(e) => { e.stopPropagation(); setOpen(!open); }}>
            {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </TableCell>
        <TableCell>{outflow.item_name || '—'}</TableCell>
        <TableCell>{outflow.item_batch || '—'}</TableCell>
        <TableCell>{outflow.customer_name || '—'}</TableCell>
        <TableCell>{outflow.sales_order || '—'}</TableCell>
        <TableCell>{outflow.dispatch_date || '—'}</TableCell>
        <TableCell>{outflow.quantity || 0}</TableCell>
        <TableCell>{outflow.created_by_name || '—'}</TableCell>
        <TableCell>
          <IconButton onClick={(e) => { e.stopPropagation(); onEdit(outflow); }} color="primary" size="small" disabled={!hasUpdatePermission}>
            <EditIcon />
          </IconButton>
          <IconButton onClick={(e) => { e.stopPropagation(); onDelete(outflow.id); }} color="error" size="small" disabled={!hasDeletePermission}>
            <DeleteIcon />
          </IconButton>
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell colSpan={9} style={{ paddingBottom: 0, paddingTop: 0 }}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ margin: 2 }}>
              <Typography variant="h6">Outflow Details</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}><Typography><strong>ID:</strong> {outflow.id}</Typography></Grid>
                <Grid item xs={12} sm={6}><Typography><strong>Created By:</strong> {outflow.created_by_name || '—'}</Typography></Grid>
                <Grid item xs={12} sm={6}><Typography><strong>Created At:</strong> {new Date(outflow.created_at).toLocaleString()}</Typography></Grid>
                <Grid item xs={12} sm={6}><Typography><strong>Dispatch Date:</strong> {outflow.dispatch_date || '—'}</Typography></Grid>
              </Grid>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
}

export default function ProductOutflow() {
  const [outflows, setOutflows] = useState([]);
  const [inflows, setInflows] = useState([]);
  const [formData, setFormData] = useState({
    product: '',
    customer_name: '',
    sales_order: '',
    dispatch_date: '',
    quantity: '',
  });
  const [openDialog, setOpenDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [editId, setEditId] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [checkingPermissions, setCheckingPermissions] = useState(true);
  const [hasPermission, setHasPermission] = useState(false);
  const [hasCreatePermission, setHasCreatePermission] = useState(false);
  const [hasUpdatePermission, setHasUpdatePermission] = useState(false);
  const [hasDeletePermission, setHasDeletePermission] = useState(false);
  const { searchTerm } = useSearch();
  const itemsPerPage = 10;

  const fetchOutflows = useCallback(async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const res = await API.get('product-documentation-new/outflows/', {
        params: { search: searchTerm, page, page_size: itemsPerPage, ordering: '-id' },
        headers: { Authorization: `Bearer ${token}` },
      });

      let outflowsData = [];
      let totalCount = 0;

      if (res.data.results !== undefined) {
        outflowsData = res.data.results;
        totalCount = res.data.count || 0;
      } else if (Array.isArray(res.data)) {
        outflowsData = res.data;
        totalCount = res.data.length;
      } else {
        console.error('Unexpected API response format:', res.data);
        outflowsData = [];
        totalCount = 0;
      }

      setOutflows(outflowsData);
      setTotalPages(Math.ceil(totalCount / itemsPerPage));
      setError('');
    } catch (err) {
      console.error('Fetch outflows error:', err);
      setError(`❌ Failed to fetch outflows: ${err.response?.data?.detail || err.message}`);
      setOutflows([]);
      setTotalPages(1);
    }
  }, [searchTerm, page, itemsPerPage]);

  const fetchInflows = useCallback(async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const res = await API.get('product-documentation-new/inflows/', {
        params: { page_size: 100, ordering: '-id' },
        headers: { Authorization: `Bearer ${token}` },
      });
      const inflowsData = res.data.results || res.data || [];
      setInflows(inflowsData);
    } catch (err) {
      setError(`❌ Failed to fetch inflows: ${err.response?.data?.detail || err.message}`);
    }
  }, []);

  useEffect(() => {
    const checkPermissions = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        if (!token) return setCheckingPermissions(false);

        const pageRes = await API.get('/auth/permissions/page/product_documentation_new/', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const [createRes, updateRes, deleteRes] = await Promise.all([
          API.get('/auth/permissions/action/create_product_new_outflow/', { headers: { Authorization: `Bearer ${token}` } }),
          API.get('/auth/permissions/action/update_product_new_outflow/', { headers: { Authorization: `Bearer ${token}` } }),
          API.get('/auth/permissions/action/delete_product_new_outflow/', { headers: { Authorization: `Bearer ${token}` } }),
        ]);

        setHasPermission(pageRes.data.allowed);
        setHasCreatePermission(createRes.data.allowed);
        setHasUpdatePermission(updateRes.data.allowed);
        setHasDeletePermission(deleteRes.data.allowed);

        if (pageRes.data.allowed) {
          fetchOutflows();
          fetchInflows();
        }
      } catch (err) {
        setError(`⚠️ Permission check failed`);
      } finally {
        setCheckingPermissions(false);
      }
    };
    checkPermissions();
  }, [fetchOutflows, fetchInflows]);

  useEffect(() => {
    if (hasPermission) fetchOutflows();
  }, [searchTerm, page, hasPermission, fetchOutflows]);

  const handleOpenDialog = (outflow = null) => {
    if (outflow) {
      setFormData({
        product: outflow.product,
        customer_name: outflow.customer_name,
        sales_order: outflow.sales_order || '',
        dispatch_date: outflow.dispatch_date,
        quantity: String(outflow.quantity),
      });
      setEditId(outflow.id);
    } else {
      setFormData({ product: '', customer_name: '', sales_order: '', dispatch_date: '', quantity: '' });
      setEditId(null);
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setError('');
    setSuccess('');
  };

  const handleDeleteOpen = (id) => {
    if (!hasDeletePermission) return setError('⚠️ No delete permission.');
    setDeleteId(id);
    setOpenDeleteDialog(true);
  };

  const handleDeleteClose = () => {
    setOpenDeleteDialog(false);
    setDeleteId(null);
  };

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSave = async () => {
    const { product, customer_name, dispatch_date, quantity } = formData;
    if (!product || !customer_name || !dispatch_date || !quantity) {
      return setError('⚠️ All fields are required.');
    }
    if (Number(quantity) <= 0) {
      return setError('⚠️ Quantity must be positive.');
    }

    try {
      const payload = {
        product: Number(product),
        customer_name,
        sales_order: formData.sales_order,
        dispatch_date,
        quantity: Number(quantity),
      };

      if (editId) {
        await API.patch(`product-documentation-new/outflows/${editId}/`, payload, {
          headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
        });
        setSuccess('✅ Outflow updated.');
      } else {
        await API.post('product-documentation-new/outflows/', payload, {
          headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
        });
        setSuccess('✅ Outflow created.');
      }

      fetchOutflows();
      setOpenDialog(false);
    } catch (err) {
      setError(`❌ ${err.response?.data?.detail || 'Save failed.'}`);
    }
  };

  const handleDelete = async () => {
    try {
      await API.delete(`product-documentation-new/outflows/${deleteId}/`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
      });
      setSuccess('✅ Deleted.');
      fetchOutflows();
      setOpenDeleteDialog(false);
    } catch (err) {
      setError(`❌ ${err.response?.data?.detail || 'Delete failed.'}`);
    }
  };

  if (checkingPermissions) return <Container><Typography variant="h6">Loading...</Typography></Container>;
  if (!hasPermission) return <Container><Alert severity="error">No permission</Alert></Container>;

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      <Typography variant="h4" gutterBottom>Product Outflow</Typography>

      <Accordion sx={{ mb: 2 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">Product Outflow Guide & Best Practices</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Typography variant="body1" paragraph>
            <strong>💡 What is Product Outflow?</strong> This page records inventory that has been dispatched to customers.
          </Typography>
        </AccordionDetails>
      </Accordion>

      <Box mb={2}>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog()} disabled={!hasCreatePermission}>
          Add New Outflow
        </Button>
      </Box>

      <Paper sx={{ p: 3 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          💡 Click on any row to view complete outflow details
        </Typography>

        <Table>
          <TableHead>
            <TableRow>
              <TableCell></TableCell>
              <TableCell><strong>Item</strong></TableCell>
              <TableCell><strong>Batch</strong></TableCell>
              <TableCell><strong>Customer</strong></TableCell>
              <TableCell><strong>Sales Order</strong></TableCell>
              <TableCell><strong>Dispatch Date</strong></TableCell>
              <TableCell><strong>Quantity</strong></TableCell>
              <TableCell><strong>Created By</strong></TableCell>
              <TableCell><strong>Actions</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {outflows.length > 0 ? (
              outflows.map(outflow => (
                <OutflowRow
                  key={outflow.id}
                  outflow={outflow}
                  onEdit={handleOpenDialog}
                  onDelete={handleDeleteOpen}
                  hasUpdatePermission={hasUpdatePermission}
                  hasDeletePermission={hasDeletePermission}
                />
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={9} align="center">
                  <Typography variant="body2" color="text.secondary">No outflows found.</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        <Box mt={3} display="flex" justifyContent="center">
          <Pagination count={totalPages} page={page} onChange={(_, p) => setPage(p)} color="primary" />
        </Box>
      </Paper>

      {/* Form Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editId ? '✏️ Edit Product Outflow' : '➕ Add New Product Outflow'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <FormControl fullWidth required>
                <InputLabel id="inflow-label">Inflow (Item - Batch)</InputLabel>
                <Select
                  labelId="inflow-label"
                  name="product"
                  value={formData.product}
                  onChange={handleChange}
                  label="Inflow (Item - Batch)"
                >
                  <MenuItem value="">Select Inflow</MenuItem>
                  {inflows.map(inflow => (
                    <MenuItem key={inflow.id} value={inflow.id}>
                      {inflow.item_name} - {inflow.batch}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField label="Customer Name *" name="customer_name" value={formData.customer_name} onChange={handleChange} fullWidth required />
            </Grid>
            <Grid item xs={12}>
              <TextField label="Sales Order (Optional)" name="sales_order" value={formData.sales_order} onChange={handleChange} fullWidth />
            </Grid>
            <Grid item xs={12}>
              <TextField label="Dispatch Date *" name="dispatch_date" type="date" value={formData.dispatch_date} onChange={handleChange} fullWidth required InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={12}>
              <TextField label="Quantity *" name="quantity" type="number" value={formData.quantity} onChange={handleChange} fullWidth required inputProps={{ min: 1 }} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button variant="contained" onClick={handleSave}>Save</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={openDeleteDialog} onClose={handleDeleteClose}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete this outflow? This action cannot be undone.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteClose}>Cancel</Button>
          <Button color="error" onClick={handleDelete}>Delete</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
