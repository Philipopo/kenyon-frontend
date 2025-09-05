import React, { useState, useEffect } from 'react';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import {
  Container, Typography, Paper, Grid, Button, TextField, Select, MenuItem,
  FormControl, InputLabel, Table, TableHead, TableRow, TableCell, TableBody,
  IconButton, Divider, Dialog, DialogTitle, DialogContent, DialogActions,
  Box, Pagination, CircularProgress, Alert, Rating
} from '@mui/material';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import API from '../../api';

export default function PurchaseOrders() {
  const [formData, setFormData] = useState({
    itemName: '', eoq: '', vendor: '', amount: '', notes: '', status: 'Pending'
  });
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [vendorList, setVendorList] = useState([]);
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedPO, setSelectedPO] = useState(null);
  const [vendorOpen, setVendorOpen] = useState(false);
  const [editVendorOpen, setEditVendorOpen] = useState(false);
  const [deleteVendorOpen, setDeleteVendorOpen] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [newVendor, setNewVendor] = useState({
    name: '', details: '', lead_time: '', ratings: 3, document: null
  });
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);
  const [page, setPage] = useState(1);
  const [vendorPage, setVendorPage] = useState(1);
  const itemsPerPage = 10;
  const vendorsPerPage = 5;
  const [checkingPermissions, setCheckingPermissions] = useState(true);
  const [hasPermission, setHasPermission] = useState(false);
  const [permissions, setPermissions] = useState({
    create_purchase_order: false,
    update_purchase_order: false,
    delete_purchase_order: false,
    add_vendor: false,
    update_vendor: false,
    delete_vendor: false
  });

  useEffect(() => {
    const checkPermissions = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        if (!token) {
          setAlert('⚠️ No authentication token found. Please log in.');
          setHasPermission(false);
          setCheckingPermissions(false);
          return;
        }
        const pageResponse = await API.get('/auth/permissions/page/purchase_orders/');
        setHasPermission(pageResponse.data.allowed || false);
        if (!pageResponse.data.allowed) {
          setAlert(`⚠️ You do not have permission to view this page: ${pageResponse.data.reason || 'No reason provided'}`);
        } else {
          const actions = ['create_purchase_order', 'update_purchase_order', 'delete_purchase_order', 'add_vendor', 'update_vendor', 'delete_vendor'];
          const actionPerms = {};
          for (const action of actions) {
            const actionResponse = await API.get(`/auth/permissions/action/${action}/`);
            actionPerms[action] = actionResponse.data.allowed || false;
          }
          setPermissions(actionPerms);
          fetchOrders();
          fetchVendors();
        }
      } catch (err) {
        console.error('Error checking permissions:', err.response?.data || err.message);
        setAlert(`⚠️ Failed to check permissions: ${err.response?.data?.detail || err.message}`);
        setHasPermission(false);
      } finally {
        setCheckingPermissions(false);
      }
    };
    checkPermissions();
  }, []);

  const fetchOrders = async () => {
    try {
      const res = await API.get('procurement/purchase-orders/');
      setPurchaseOrders(res.data.reverse() || []);
    } catch (err) {
      console.error('Error fetching purchase orders:', err.response?.data || err.message);
      setAlert('❌ Failed to fetch purchase orders: ' + (err.response?.data?.detail || err.message));
    }
  };

  const fetchVendors = async () => {
    try {
      const res = await API.get('procurement/vendors/');
      setVendorList(res.data || []);
    } catch (err) {
      console.error('Error fetching vendors:', err.response?.data || err.message);
      setAlert('❌ Failed to fetch vendors: ' + (err.response?.data?.detail || err.message));
    }
  };

  const renderStars = (rating) =>
    [...Array(5)].map((_, i) =>
      i < rating ? (
        <StarIcon key={i} fontSize="small" color="warning" />
      ) : (
        <StarBorderIcon key={i} fontSize="small" />
      )
    );

  const handleOpenPO = () => {
    if (!permissions.create_purchase_order) {
      setAlert('⚠️ You do not have permission to create purchase orders.');
      return;
    }
    setOpen(true);
  };

  const handleEditPO = (po) => {
    if (!permissions.update_purchase_order) {
      setAlert('⚠️ You do not have permission to update purchase orders.');
      return;
    }
    setSelectedPO(po);
    setFormData({
      itemName: po.item_name,
      eoq: po.eoq,
      vendor: po.vendor?.id || '',
      amount: po.amount,
      notes: po.notes || '',
      status: po.status
    });
    setEditOpen(true);
  };

  const handleUpdatePO = async () => {
    if (!permissions.update_purchase_order) {
      setAlert('⚠️ You do not have permission to update purchase orders.');
      return;
    }

    if (!formData.itemName || !formData.eoq || !formData.vendor || !formData.amount) {
      setAlert('⚠️ Please fill all required fields.');
      return;
    }

    if (parseInt(formData.eoq) <= 0 || parseFloat(formData.amount) <= 0) {
      setAlert('⚠️ EOQ and Amount must be positive numbers.');
      return;
    }

    try {
      setLoading(true);
      setAlert(null);
      const res = await API.patch(`procurement/purchase-orders/${selectedPO.id}/`, {
        item_name: formData.itemName,
        eoq: parseInt(formData.eoq),
        vendor_id: parseInt(formData.vendor),
        amount: parseFloat(formData.amount),
        notes: formData.notes,
        status: formData.status
      });
      setPurchaseOrders(purchaseOrders.map(po => po.id === selectedPO.id ? res.data : po));
      setAlert('✅ Purchase Order updated successfully.');
      setEditOpen(false);
      setFormData({ itemName: '', eoq: '', vendor: '', amount: '', notes: '', status: 'Pending' });
      fetchOrders();
    } catch (err) {
      let errorMsg = '❌ Failed to update purchase order.';
      if (err.response?.data) {
        errorMsg = Object.entries(err.response.data)
          .map(([field, msg]) => `${field}: ${Array.isArray(msg) ? msg.join(', ') : msg}`)
          .join('; ');
      } else {
        errorMsg = err.message || '❌ Network error.';
      }
      setAlert(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePO = (po) => {
    if (!permissions.delete_purchase_order) {
      setAlert('⚠️ You do not have permission to delete purchase orders.');
      return;
    }
    setSelectedPO(po);
    setDeleteOpen(true);
  };

  const handleConfirmDeletePO = async () => {
    if (!permissions.delete_purchase_order) {
      setAlert('⚠️ You do not have permission to delete purchase orders.');
      return;
    }

    try {
      setLoading(true);
      setAlert(null);
      await API.delete(`procurement/purchase-orders/${selectedPO.id}/`);
      setAlert('✅ Purchase Order deleted successfully.');
      setDeleteOpen(false);
      fetchOrders();
    } catch (err) {
      let errorMsg = '❌ Failed to delete purchase order.';
      if (err.response?.data) {
        errorMsg = err.response.data.detail || JSON.stringify(err.response.data);
      } else {
        errorMsg = err.message || '❌ Network error.';
      }
      setAlert(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenVendor = () => {
    if (!permissions.add_vendor) {
      setAlert('⚠️ You do not have permission to add vendors.');
      return;
    }
    setVendorOpen(true);
  };

  const handleEditVendor = (vendor) => {
    if (!permissions.update_vendor) {
      setAlert('⚠️ You do not have permission to update vendors.');
      return;
    }
    setSelectedVendor(vendor);
    setNewVendor({
      name: vendor.name,
      details: vendor.details || '',
      lead_time: vendor.lead_time,
      ratings: vendor.ratings,
      document: null
    });
    setEditVendorOpen(true);
  };

  const handleUpdateVendor = async () => {
    if (!permissions.update_vendor) {
      setAlert('⚠️ You do not have permission to update vendors.');
      return;
    }

    if (!newVendor.name || !newVendor.lead_time) {
      setAlert('⚠️ Please fill all required fields.');
      return;
    }

    if (parseInt(newVendor.lead_time) <= 0) {
      setAlert('⚠️ Lead time must be a positive number.');
      return;
    }

    try {
      setLoading(true);
      setAlert(null);
      const form = new FormData();
      form.append('name', newVendor.name);
      form.append('details', newVendor.details || '');
      form.append('lead_time', parseInt(newVendor.lead_time));
      form.append('ratings', newVendor.ratings);
      if (newVendor.document) form.append('document', newVendor.document);

      const res = await API.patch(`procurement/vendors/${selectedVendor.id}/`, form, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setVendorList(vendorList.map(v => v.id === selectedVendor.id ? res.data : v));
      setAlert('✅ Vendor updated successfully.');
      setEditVendorOpen(false);
      setNewVendor({ name: '', details: '', lead_time: '', ratings: 3, document: null });
      fetchVendors();
    } catch (err) {
      let errorMsg = '❌ Failed to update vendor.';
      if (err.response?.data) {
        errorMsg = Object.entries(err.response.data)
          .map(([field, msg]) => `${field}: ${Array.isArray(msg) ? msg.join(', ') : msg}`)
          .join('; ');
      } else {
        errorMsg = err.message || '❌ Network error.';
      }
      setAlert(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteVendor = (vendor) => {
    if (!permissions.delete_vendor) {
      setAlert('⚠️ You do not have permission to delete vendors.');
      return;
    }
    setSelectedVendor(vendor);
    setDeleteVendorOpen(true);
  };

  const handleConfirmDeleteVendor = async () => {
    if (!permissions.delete_vendor) {
      setAlert('⚠️ You do not have permission to delete vendors.');
      return;
    }

    try {
      setLoading(true);
      setAlert(null);
      await API.delete(`procurement/vendors/${selectedVendor.id}/`);
      setAlert('✅ Vendor deleted successfully.');
      setDeleteVendorOpen(false);
      fetchVendors();
    } catch (err) {
      let errorMsg = '❌ Failed to delete vendor.';
      if (err.response?.data) {
        errorMsg = err.response.data.detail || JSON.stringify(err.response.data);
      } else {
        errorMsg = err.message || '❌ Network error.';
      }
      setAlert(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleGeneratePO = async () => {
    if (!permissions.create_purchase_order) {
      setAlert('⚠️ You do not have permission to create purchase orders.');
      return;
    }

    if (!formData.itemName || !formData.eoq || !formData.vendor || !formData.amount) {
      setAlert('⚠️ Please fill all required fields.');
      return;
    }

    if (parseInt(formData.eoq) <= 0 || parseFloat(formData.amount) <= 0) {
      setAlert('⚠️ EOQ and Amount must be positive numbers.');
      return;
    }

    try {
      setLoading(true);
      setAlert(null);
      const res = await API.post('procurement/purchase-orders/', {
        item_name: formData.itemName,
        eoq: parseInt(formData.eoq),
        vendor_id: parseInt(formData.vendor),
        amount: parseFloat(formData.amount),
        notes: formData.notes,
        status: formData.status
      });
      setPurchaseOrders([res.data, ...purchaseOrders]);
      setAlert('✅ Purchase Order created successfully.');
      setOpen(false);
      setFormData({ itemName: '', eoq: '', vendor: '', amount: '', notes: '', status: 'Pending' });
      fetchOrders();
    } catch (err) {
      let errorMsg = '❌ Failed to create purchase order.';
      if (err.response?.data) {
        errorMsg = Object.entries(err.response.data)
          .map(([field, msg]) => `${field}: ${Array.isArray(msg) ? msg.join(', ') : msg}`)
          .join('; ');
      } else {
        errorMsg = err.message || '❌ Network error.';
      }
      setAlert(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewVendor((prev) => ({ ...prev, [name]: value }));
  };

  const handleRatingChange = (_, value) => {
    setNewVendor((prev) => ({ ...prev, ratings: value || 3 }));
  };

  const handleFileChange = (e) => {
    setNewVendor((prev) => ({ ...prev, document: e.target.files[0] }));
  };

  const handleCreateVendor = async () => {
    if (!permissions.add_vendor) {
      setAlert('⚠️ You do not have permission to add vendors.');
      return;
    }

    if (!newVendor.name || !newVendor.lead_time) {
      setAlert('⚠️ Please fill all required fields.');
      return;
    }

    if (parseInt(newVendor.lead_time) <= 0) {
      setAlert('⚠️ Lead time must be a positive number.');
      return;
    }

    try {
      setLoading(true);
      setAlert(null);
      const form = new FormData();
      form.append('name', newVendor.name);
      form.append('details', newVendor.details || '');
      form.append('lead_time', parseInt(newVendor.lead_time));
      form.append('ratings', newVendor.ratings);
      if (newVendor.document) form.append('document', newVendor.document);

      const res = await API.post('procurement/vendors/', form, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setVendorList([...vendorList, res.data]);
      setAlert('✅ Vendor created successfully.');
      setVendorOpen(false);
      setNewVendor({ name: '', details: '', lead_time: '', ratings: 3, document: null });
      fetchVendors();
    } catch (err) {
      let errorMsg = '❌ Failed to create vendor.';
      if (err.response?.data) {
        errorMsg = Object.entries(err.response.data)
          .map(([field, msg]) => `${field}: ${Array.isArray(msg) ? msg.join(', ') : msg}`)
          .join('; ');
      } else {
        errorMsg = err.message || '❌ Network error.';
      }
      setAlert(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const paginatedPOs = purchaseOrders.slice((page - 1) * itemsPerPage, page * itemsPerPage);
  const paginatedVendors = vendorList.slice((vendorPage - 1) * vendorsPerPage, vendorPage * vendorsPerPage);

  if (checkingPermissions) {
    return (
      <Container>
        <Typography variant="h6" sx={{ mt: 4 }}>
          Loading permissions...
        </Typography>
        <CircularProgress sx={{ mt: 2 }} />
      </Container>
    );
  }

  if (!hasPermission) {
    return (
      <Container>
        <Alert severity="error" sx={{ mt: 4 }} onClose={() => setAlert(null)}>
          {alert || '⚠️ You do not have permission to view this page.'}
        </Alert>
      </Container>
    );
  }

  return (
    <Container>
      {alert && (
        <Alert
          sx={{ mt: 2, mb: 2 }}
          severity={alert.includes('❌') ? 'error' : alert.includes('⚠') ? 'warning' : 'success'}
          onClose={() => setAlert(null)}
        >
          {alert}
        </Alert>
      )}
      <Paper elevation={3} sx={{ p: 4, mt: 4 }}>
        <Typography variant="h4" gutterBottom>
          Purchase Orders
        </Typography>
        <Typography sx={{ mb: 3 }}>
          Automate your procurement workflow with EOQ-based replenishment and smart vendor tools.
        </Typography>

        <Button variant="contained" color="primary" onClick={handleOpenPO} sx={{ mb: 3 }} disabled={!permissions.create_purchase_order}>
          Generate New PO
        </Button>

        <Dialog open={open || editOpen} onClose={() => { setOpen(false); setEditOpen(false); }} fullWidth maxWidth="sm">
          <DialogTitle>{editOpen ? 'Edit Purchase Order' : 'Generate New Purchase Order'}</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Item Name"
                  name="itemName"
                  value={formData.itemName}
                  onChange={handleChange}
                  required
                  error={formData.itemName === '' && alert?.includes('required')}
                  helperText={formData.itemName === '' && alert?.includes('required') ? 'Item name is required' : ''}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Recommended EOQ"
                  name="eoq"
                  type="number"
                  value={formData.eoq}
                  onChange={handleChange}
                  required
                  error={formData.eoq === '' && alert?.includes('required')}
                  helperText={formData.eoq === '' && alert?.includes('required') ? 'EOQ is required' : ''}
                />
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Vendor</InputLabel>
                  <Select
                    name="vendor"
                    value={formData.vendor}
                    onChange={handleChange}
                    required
                    error={formData.vendor === '' && alert?.includes('required')}
                  >
                    {vendorList.map((vendor) => (
                      <MenuItem key={vendor.id} value={vendor.id}>
                        {vendor.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Amount"
                  name="amount"
                  type="number"
                  value={formData.amount}
                  onChange={handleChange}
                  required
                  error={formData.amount === '' && alert?.includes('required')}
                  helperText={formData.amount === '' && alert?.includes('required') ? 'Amount is required' : ''}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Notes"
                  name="notes"
                  multiline
                  rows={3}
                  value={formData.notes}
                  onChange={handleChange}
                />
              </Grid>
            </Grid>
            <Button onClick={handleOpenVendor} size="small" sx={{ mt: 1 }} disabled={!permissions.add_vendor}>
              Create Vendor
            </Button>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => { setOpen(false); setEditOpen(false); }}>Cancel</Button>
            <Button variant="contained" onClick={editOpen ? handleUpdatePO : handleGeneratePO} disabled={loading}>
              {loading ? <CircularProgress size={24} color="inherit" /> : editOpen ? 'Update' : 'Generate'}
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} fullWidth maxWidth="sm">
          <DialogTitle>Delete Purchase Order</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to delete PO {selectedPO?.code}? This action cannot be reversed.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button
              variant="contained"
              color="error"
              onClick={handleConfirmDeletePO}
              disabled={loading || !permissions.delete_purchase_order}
            >
              Delete
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog open={vendorOpen || editVendorOpen} onClose={() => { setVendorOpen(false); setEditVendorOpen(false); }} fullWidth maxWidth="sm">
          <DialogTitle>{editVendorOpen ? 'Edit Vendor' : 'Create New Vendor'}</DialogTitle>
          <DialogContent dividers>
            <TextField
              fullWidth
              label="Name"
              name="name"
              value={newVendor.name}
              onChange={handleInputChange}
              sx={{ mb: 2 }}
              required
              error={newVendor.name === '' && alert?.includes('required')}
              helperText={newVendor.name === '' && alert?.includes('required') ? 'Name is required' : ''}
            />
            <TextField
              fullWidth
              label="Details"
              name="details"
              value={newVendor.details}
              onChange={handleInputChange}
              multiline
              rows={3}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Lead Time (days)"
              name="lead_time"
              type="number"
              value={newVendor.lead_time}
              onChange={handleInputChange}
              sx={{ mb: 2 }}
              required
              error={newVendor.lead_time === '' && alert?.includes('required')}
              helperText={newVendor.lead_time === '' && alert?.includes('required') ? 'Lead time is required' : ''}
            />
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
              <span style={{ marginRight: 8 }}>Rating:</span>
              <Rating name="ratings" value={newVendor.ratings} onChange={handleRatingChange} />
            </div>
            <input
              type="file"
              onChange={handleFileChange}
              accept="application/pdf"
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => { setVendorOpen(false); setEditVendorOpen(false); }}>Cancel</Button>
            <Button onClick={editVendorOpen ? handleUpdateVendor : handleCreateVendor} variant="contained" disabled={loading}>
              {editVendorOpen ? 'Update' : 'Save'}
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog open={deleteVendorOpen} onClose={() => setDeleteVendorOpen(false)} fullWidth maxWidth="sm">
          <DialogTitle>Delete Vendor</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to delete vendor {selectedVendor?.name}? This action cannot be reversed.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteVendorOpen(false)}>Cancel</Button>
            <Button
              variant="contained"
              color="error"
              onClick={handleConfirmDeleteVendor}
              disabled={loading || !permissions.delete_vendor}
            >
              Delete
            </Button>
          </DialogActions>
        </Dialog>

        <Typography variant="h6" gutterBottom>
          Vendor Comparison <IconButton><CompareArrowsIcon /></IconButton>
        </Typography>
        <Table size="small" sx={{ mb: 4 }}>
          <TableHead>
            <TableRow>
              <TableCell>Vendor</TableCell>
              <TableCell>Lead Time</TableCell>
              <TableCell>Rating</TableCell>
              <TableCell>Document</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedVendors.map((vendor) => (
              <TableRow key={vendor.id}>
                <TableCell>{vendor.name}</TableCell>
                <TableCell>{vendor.lead_time} days</TableCell>
                <TableCell>{renderStars(vendor.ratings)}</TableCell>
                <TableCell>
                  {vendor.document ? (
                    <a href={vendor.document} target="_blank" rel="noopener noreferrer">
                      <PictureAsPdfIcon color="error" />
                    </a>
                  ) : (
                    <Typography variant="body2" color="textSecondary">
                      No PDF
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  <IconButton
                    onClick={() => handleEditVendor(vendor)}
                    disabled={!permissions.update_vendor}
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    onClick={() => handleDeleteVendor(vendor)}
                    disabled={!permissions.delete_vendor}
                  >
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {vendorList.length > vendorsPerPage && (
          <Box mt={3} display="flex" justifyContent="center">
            <Pagination
              count={Math.ceil(vendorList.length / vendorsPerPage)}
              page={vendorPage}
              onChange={(_, value) => setVendorPage(value)}
              color="primary"
            />
          </Box>
        )}

        <Divider sx={{ my: 3 }} />
        <Typography variant="h6" gutterBottom>Generated Purchase Orders</Typography>
        {purchaseOrders.length > 0 ? (
          <>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Code</TableCell>
                  <TableCell>Item</TableCell>
                  <TableCell>EOQ</TableCell>
                  <TableCell>Vendor</TableCell>
                  <TableCell>Amount</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedPOs.map((po) => (
                  <TableRow key={po.id}>
                    <TableCell>{po.code}</TableCell>
                    <TableCell>{po.item_name}</TableCell>
                    <TableCell>{po.eoq}</TableCell>
                    <TableCell>{po.vendor?.name || '—'}</TableCell>
                    <TableCell>₦{parseFloat(po.amount).toLocaleString()}</TableCell>
                    <TableCell>{new Date(po.date).toLocaleDateString()}</TableCell>
                    <TableCell>{po.status}</TableCell>
                    <TableCell>
                      <IconButton
                        onClick={() => handleEditPO(po)}
                        disabled={!permissions.update_purchase_order}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        onClick={() => handleDeletePO(po)}
                        disabled={!permissions.delete_purchase_order}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {purchaseOrders.length > itemsPerPage && (
              <Box mt={3} display="flex" justifyContent="center">
                <Pagination
                  count={Math.ceil(purchaseOrders.length / itemsPerPage)}
                  page={page}
                  onChange={(_, value) => setPage(value)}
                  color="primary"
                />
              </Box>
            )}
          </>
        ) : (
          <Typography>No purchase orders generated yet.</Typography>
        )}
      </Paper>
    </Container>
  );
}