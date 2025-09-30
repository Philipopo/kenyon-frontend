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

function InflowRow({ inflow, onEdit, onDelete, hasUpdatePermission, hasDeletePermission }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <TableRow sx={{ '& > *': { borderBottom: 'unset' }, cursor: 'pointer' }} onClick={() => setOpen(!open)}>
        <TableCell>
          <IconButton size="small" onClick={(e) => { e.stopPropagation(); setOpen(!open); }}>
            {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </TableCell>
        <TableCell>{inflow.item_name || '—'}</TableCell>
        <TableCell>{inflow.batch || '—'}</TableCell>
        <TableCell>{inflow.vendor || '—'}</TableCell>
        <TableCell>{inflow.date_of_delivery || '—'}</TableCell>
        <TableCell>{inflow.quantity || 0}</TableCell>
        <TableCell>₦{inflow.cost ? parseFloat(inflow.cost).toLocaleString() : '0.00'}</TableCell>
        <TableCell>{inflow.created_by_name || '—'}</TableCell>
        <TableCell>
          <IconButton onClick={(e) => { e.stopPropagation(); onEdit(inflow); }} color="primary" size="small" disabled={!hasUpdatePermission}>
            <EditIcon />
          </IconButton>
          <IconButton onClick={(e) => { e.stopPropagation(); onDelete(inflow.id); }} color="error" size="small" disabled={!hasDeletePermission}>
            <DeleteIcon />
          </IconButton>
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell colSpan={9} style={{ paddingBottom: 0, paddingTop: 0 }}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ margin: 2 }}>
              <Typography variant="h6">Inflow Details</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}><Typography><strong>ID:</strong> {inflow.id}</Typography></Grid>
                <Grid item xs={12} sm={6}><Typography><strong>Created By:</strong> {inflow.created_by_name || '—'}</Typography></Grid>
                <Grid item xs={12} sm={6}><Typography><strong>Created At:</strong> {new Date(inflow.created_at).toLocaleString()}</Typography></Grid>
                {/* ✅ REMOVED: Serial Numbers section */}
              </Grid>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
}

export default function ProductInflow() {
  const [inflows, setInflows] = useState([]);
  const [items, setItems] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [formData, setFormData] = useState({
    item: '',
    batch: '',
    vendor: '',
    date_of_delivery: '',
    quantity: '',
    cost: '',
    // ✅ REMOVED: input_serial_numbers
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

  const fetchInflows = useCallback(async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const res = await API.get('product-documentation-new/inflows/', {
        params: { search: searchTerm, page, page_size: itemsPerPage },
        headers: { Authorization: `Bearer ${token}` },
      });
      const results = res.data.results || res.data || [];
      setInflows(results);
      setTotalPages(Math.ceil((res.data.count || results.length || 0) / itemsPerPage));
      setError('');
    } catch (err) {
      setError(`❌ Failed to fetch inflows: ${err.response?.data?.detail || err.message}`);
      setInflows([]);
      setTotalPages(1);
    }
  }, [searchTerm, page]);

  const fetchItems = useCallback(async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const res = await API.get('inventory/items/', {
        params: { page_size: 100 },
        headers: { Authorization: `Bearer ${token}` },
      });
      setItems(res.data.results || res.data || []);
    } catch (err) {
      setError(`❌ Failed to fetch items: ${err.response?.data?.detail || err.message}`);
    }
  }, []);

  const fetchVendors = useCallback(async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const res = await API.get('procurement/vendors/', {
        params: { page_size: 100 },
        headers: { Authorization: `Bearer ${token}` },
      });
      setVendors(res.data.results || res.data || []);
    } catch (err) {
      setError(`❌ Failed to fetch vendors: ${err.response?.data?.detail || err.message}`);
    }
  }, []);

  useEffect(() => {
    const checkPermissions = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        if (!token) {
          setError('⚠️ Not logged in. Please log in to continue.');
          setHasPermission(false);
          setCheckingPermissions(false);
          return;
        }

        const pageRes = await API.get('/auth/permissions/page/product_documentation_new/', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const [createRes, updateRes, deleteRes] = await Promise.all([
          API.get('/auth/permissions/action/create_product_new_inflow/', {
            headers: { Authorization: `Bearer ${token}` },
          }),
          API.get('/auth/permissions/action/update_product_new_inflow/', {
            headers: { Authorization: `Bearer ${token}` },
          }),
          API.get('/auth/permissions/action/delete_product_new_inflow/', {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        setHasPermission(pageRes.data.allowed || false);
        setHasCreatePermission(createRes.data.allowed || false);
        setHasUpdatePermission(updateRes.data.allowed || false);
        setHasDeletePermission(deleteRes.data.allowed || false);

        if (pageRes.data.allowed) {
          fetchInflows();
          fetchItems();
          fetchVendors();
        } else {
          setError(`⚠️ No permission to view Product Inflow: ${pageRes.data.reason || 'Access denied.'}`);
        }
      } catch (err) {
        setError(`⚠️ Permission check failed: ${err.response?.data?.detail || err.message}`);
        setHasPermission(false);
      } finally {
        setCheckingPermissions(false);
      }
    };
    checkPermissions();
  }, [fetchInflows, fetchItems, fetchVendors]);

  useEffect(() => {
    if (hasPermission) {
      fetchInflows();
    }
  }, [searchTerm, page, hasPermission, fetchInflows]);

  const handleOpenDialog = async (inflow = null) => {
    if (!hasPermission) {
      setError('⚠️ You do not have permission to view Product Inflow.');
      return;
    }
    try {
      const action = inflow ? 'update_product_new_inflow' : 'create_product_new_inflow';
      const actionRes = await API.get(`/auth/permissions/action/${action}/`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
      });
      if (!actionRes.data.allowed) {
        setError(`⚠️ You do not have permission to ${inflow ? 'update' : 'create'} inflows.`);
        return;
      }

      if (inflow) {
        const vendorId = vendors.find(v => v.name === inflow.vendor)?.id || '';
        setFormData({
          item: inflow.item || '',
          batch: inflow.batch || '',
          vendor: vendorId,
          date_of_delivery: inflow.date_of_delivery || '',
          quantity: String(inflow.quantity || ''),
          cost: String(inflow.cost || ''),
          // ✅ REMOVED: input_serial_numbers
        });
        setEditId(inflow.id);
      } else {
        setFormData({
          item: '',
          batch: '',
          vendor: '',
          date_of_delivery: '',
          quantity: '',
          cost: '',
          // ✅ REMOVED: input_serial_numbers
        });
        setEditId(null);
      }
      setOpenDialog(true);
    } catch (err) {
      setError(`❌ Failed to check ${inflow ? 'update' : 'create'} permission: ${err.response?.data?.detail || err.message}`);
    }
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setFormData({
      item: '',
      batch: '',
      vendor: '',
      date_of_delivery: '',
      quantity: '',
      cost: '',
      // ✅ REMOVED: input_serial_numbers
    });
    setEditId(null);
    setError('');
    setSuccess('');
  };

  const handleDeleteOpen = (id) => {
    if (!hasDeletePermission) {
      setError('⚠️ You do not have permission to delete inflows.');
      return;
    }
    setDeleteId(id);
    setOpenDeleteDialog(true);
  };

  const handleDeleteClose = () => {
    setOpenDeleteDialog(false);
    setDeleteId(null);
    setError('');
    setSuccess('');
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    const { item, batch, vendor, date_of_delivery, quantity, cost } = formData; // ✅ Removed input_serial_numbers

    if (!item || !batch || !vendor || !date_of_delivery || !quantity || !cost) {
      setError('⚠️ All fields are required.');
      return;
    }

    const qty = Number(quantity);
    const cst = Number(cost);
    if (qty <= 0 || cst <= 0) {
      setError('⚠️ Quantity and cost must be positive.');
      return;
    }

    // ✅ REMOVED: serial number validation

    const vendorName = vendors.find(v => v.id === Number(vendor))?.name;
    if (!vendorName) {
      setError('⚠️ Invalid vendor selected.');
      return;
    }

    try {
      const payload = {
        item: Number(item),
        batch,
        vendor: vendorName,
        date_of_delivery,
        quantity: qty,
        cost: cst,
        // ✅ REMOVED: input_serial_numbers
      };

      if (editId) {
        await API.patch(`product-documentation-new/inflows/${editId}/`, payload, {
          headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
        });
        setSuccess('✅ Inflow updated.');
      } else {
        await API.post('product-documentation-new/inflows/', payload, {
          headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
        });
        setSuccess('✅ Inflow created.');
      }

      fetchInflows();
      handleCloseDialog();
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Unknown error';
      setError(`❌ ${msg}`);
    }
  };

  const handleDelete = async () => {
    try {
      await API.delete(`product-documentation-new/inflows/${deleteId}/`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
      });
      setSuccess('✅ Deleted.');
      fetchInflows();
      handleDeleteClose();
    } catch (err) {
      setError(`❌ ${err.response?.data?.detail || 'Delete failed.'}`);
    }
  };

  if (checkingPermissions) return <Container><Typography variant="h6" sx={{ mt: 4 }}>Loading...</Typography></Container>;
  if (!hasPermission) return <Container><Alert severity="error" sx={{ mt: 4 }} onClose={() => setError('')}>{error || 'No permission to view this page.'}</Alert></Container>;

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      {error && !openDialog && !openDeleteDialog && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      {success && !openDialog && !openDeleteDialog && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      <Typography variant="h4" gutterBottom>Product Inflow</Typography>

      <Accordion sx={{ mb: 2 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">Product Inflow Guide & Best Practices</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Typography variant="body1" paragraph>
            <strong>💡 What is Product Inflow?</strong> This page tracks all incoming inventory batches — including vendor details, delivery dates, and costs. Each inflow is linked to an item in your inventory.
          </Typography>
          <Typography variant="body1" paragraph>
            <strong>✅ Best Practices:</strong>
            <ul>
              <li>Ensure batch numbers match your vendor documentation.</li>
              <li>Record accurate delivery dates for expiry tracking.</li>
            </ul>
          </Typography>
        </AccordionDetails>
      </Accordion>

      <Box display="flex" justifyContent="space-between" mb={2}>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog()} disabled={!hasCreatePermission}>
          Add New Inflow
        </Button>
      </Box>

      <Paper sx={{ p: 3 }}>
        <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
          💡 Click on any row to view complete inflow details
        </Typography>

        <Table>
          <TableHead>
            <TableRow>
              <TableCell></TableCell>
              <TableCell><strong>Item</strong></TableCell>
              <TableCell><strong>Batch</strong></TableCell>
              <TableCell><strong>Vendor</strong></TableCell>
              <TableCell><strong>Date</strong></TableCell>
              <TableCell><strong>Qty</strong></TableCell>
              <TableCell><strong>Cost (₦)</strong></TableCell>
              <TableCell><strong>Created By</strong></TableCell>
              <TableCell><strong>Actions</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {inflows.length > 0 ? (
              inflows.map(inflow => (
                <InflowRow
                  key={inflow.id}
                  inflow={inflow}
                  onEdit={handleOpenDialog}
                  onDelete={handleDeleteOpen}
                  hasUpdatePermission={hasUpdatePermission}
                  hasDeletePermission={hasDeletePermission}
                />
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={9} align="center">
                  <Typography variant="body2" color="textSecondary">No inflows found.</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        <Box mt={3} display="flex" justifyContent="center">
          <Pagination count={totalPages} page={page} onChange={(_, p) => setPage(p)} color="primary" />
        </Box>
      </Paper>

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>{editId ? 'Edit Product Inflow' : 'Add Product Inflow'}</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
          {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required>
                <InputLabel>Item</InputLabel>
                <Select name="item" value={formData.item} onChange={handleChange}>
                  <MenuItem value="">Select Item</MenuItem>
                  {items.map(i => (
                    <MenuItem key={i.id} value={i.id}>{i.name} ({i.batch || '—'})</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Batch"
                name="batch"
                value={formData.batch}
                onChange={handleChange}
                fullWidth
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required>
                <InputLabel>Vendor</InputLabel>
                <Select name="vendor" value={formData.vendor} onChange={handleChange}>
                  <MenuItem value="">Select Vendor</MenuItem>
                  {vendors.map(v => (
                    <MenuItem key={v.id} value={v.id}>{v.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Date of Delivery"
                name="date_of_delivery"
                type="date"
                value={formData.date_of_delivery}
                onChange={handleChange}
                fullWidth
                required
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Quantity"
                name="quantity"
                type="number"
                value={formData.quantity}
                onChange={handleChange}
                fullWidth
                required
                inputProps={{ min: 1 }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Cost (₦)"
                name="cost"
                type="number"
                value={formData.cost}
                onChange={handleChange}
                fullWidth
                required
                inputProps={{ min: 0.01, step: 0.01 }}
              />
            </Grid>
            {/* ✅ REMOVED: Serial Numbers TextField */}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button variant="contained" onClick={handleSave}>Save</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openDeleteDialog} onClose={handleDeleteClose}>
        <DialogTitle>Delete Inflow?</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
          {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}
          <Typography>Are you sure? This cannot be undone.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteClose}>Cancel</Button>
          <Button color="error" onClick={handleDelete}>Delete</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}