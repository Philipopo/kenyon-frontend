import React, { useState, useEffect, useCallback } from 'react';
import {
  Container, Paper, Typography, Box, Table, TableContainer, TableHead, TableRow, TableCell, TableBody,
  Pagination, TextField, Button, Modal, Grid, Select, MenuItem, Alert, IconButton,
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, CircularProgress
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { toast } from 'react-hot-toast';
import API from '../api'; // Keep correct import

const modalStyle = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 700,
  bgcolor: 'background.paper',
  boxShadow: 24,
  p: 4,
  borderRadius: 2,
};

export default function Warehouse() {
  const [items, setItems] = useState([]);
  const [availableItems, setAvailableItems] = useState([]);
  const [storageBins, setStorageBins] = useState([]);
  const [formData, setFormData] = useState({ item: '', storage_bin: '', quantity: '', status: 'in_stock' });
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [alert, setAlert] = useState(null);
  const [checkingPermissions, setCheckingPermissions] = useState(true);
  const [hasPermission, setHasPermission] = useState(false);
  const [actionPermissions, setActionPermissions] = useState({
    create_warehouse_new_item: false,
    update_warehouse_new_item: false,
    delete_warehouse_new_item: false,
  });
  const [loading, setLoading] = useState(false);
  const itemsPerPage = 10;

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await API.get('/warehouse_new/items/', {
        params: { page, page_size: itemsPerPage },
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
      });
      setItems(res.data.results || []);
      setTotalPages(Math.ceil((res.data.count || 0) / itemsPerPage));
      setAlert(null);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to fetch warehouse items');
      setItems([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [page]);

  const fetchAvailableItems = useCallback(async () => {
    try {
      const res = await API.get('/warehouse_new/items/available_items/', {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
      });
      setAvailableItems(res.data || []);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to fetch available items');
    }
  }, []);

  const fetchStorageBins = useCallback(async () => {
    try {
      const res = await API.get('/inventory/bins/', {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
      });
      setStorageBins(res.data.results || res.data || []);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to fetch storage bins');
    }
  }, []);

  useEffect(() => {
    const checkPermissions = async () => {
      setCheckingPermissions(true);
      try {
        const token = localStorage.getItem('accessToken');
        if (!token) {
          toast.error('No authentication token found. Please log in.');
          setHasPermission(false);
          setCheckingPermissions(false);
          return;
        }

        const pageResponse = await API.get('/auth/permissions/page/warehouse_new/', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setHasPermission(pageResponse.data.allowed || false);
        if (!pageResponse.data.allowed) {
          toast.error(pageResponse.data.reason || 'You do not have permission to view this page.');
          setCheckingPermissions(false);
          return;
        }

        const actions = ['create_warehouse_new_item', 'update_warehouse_new_item', 'delete_warehouse_new_item'];
        const actionPerms = {};
        for (const action of actions) {
          try {
            const actionResponse = await API.get(`/auth/permissions/action/${action}/`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            actionPerms[action] = actionResponse.data.allowed || false;
            if (!actionResponse.data.allowed) {
              toast.error(`You do not have permission to perform ${action.replace('_', ' ')}: ${actionResponse.data.reason || 'No reason provided'}`);
            }
          } catch (err) {
            actionPerms[action] = false;
            toast.error(`Failed to check permission for ${action}: ${err.response?.data?.detail || err.message}`);
          }
        }
        setActionPermissions(actionPerms);
        fetchItems();
        fetchAvailableItems();
        fetchStorageBins();
      } catch (err) {
        toast.error(err.response?.data?.detail || 'Failed to check permissions');
        setHasPermission(false);
      } finally {
        setCheckingPermissions(false);
      }
    };

    checkPermissions();
  }, [fetchItems, fetchAvailableItems, fetchStorageBins]);

  useEffect(() => {
    if (hasPermission) {
      fetchItems();
    }
  }, [fetchItems, page, hasPermission]);

  const handleOpen = async (item = null) => {
    if (!actionPermissions[item ? 'update_warehouse_new_item' : 'create_warehouse_new_item']) {
      toast.error(`You do not have permission to ${item ? 'update' : 'create'} warehouse items.`);
      return;
    }
    if (item) {
      setFormData({
        item: item.item?.id || item.item || '', // Handle nested item.id
        storage_bin: item.storage_bin?.id || '',
        quantity: item.quantity?.toString() || '',
        status: item.status || 'in_stock',
      });
      setEditId(item.id);
    } else {
      setFormData({ item: '', storage_bin: '', quantity: '', status: 'in_stock' });
      setEditId(null);
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setFormData({ item: '', storage_bin: '', quantity: '', status: 'in_stock' });
    setEditId(null);
    setAlert(null);
  };

  const handleDeleteOpen = (id) => {
    if (!actionPermissions.delete_warehouse_new_item) {
      toast.error('You do not have permission to delete warehouse items.');
      return;
    }
    setDeleteId(id);
    setDeleteOpen(true);
  };

  const handleDeleteClose = () => {
    setDeleteOpen(false);
    setDeleteId(null);
    setAlert(null);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    const { item, storage_bin, quantity, status } = formData;
    if (!item || !quantity || !status) {
      setAlert('⚠️ Please fill in all required fields.');
      return;
    }
    if (Number(quantity) <= 0) {
      setAlert('⚠️ Quantity must be greater than zero.');
      return;
    }
    const selectedItem = availableItems.find(i => i.id === Number(item));
    if (selectedItem && Number(quantity) > selectedItem.quantity) {
      setAlert(`⚠️ Quantity (${quantity}) exceeds available item quantity (${selectedItem.quantity}).`);
      return;
    }
    const payload = { item: Number(item), storage_bin: storage_bin || null, quantity: Number(quantity), status };
    setLoading(true);
    try {
      if (editId) {
        await API.patch(`/warehouse_new/items/${editId}/`, payload, {
          headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
        });
        toast.success('Warehouse item updated successfully');
      } else {
        await API.post('/warehouse_new/items/', payload, {
          headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
        });
        toast.success('Warehouse item created successfully');
      }
      fetchItems();
      fetchAvailableItems();
      handleClose();
    } catch (err) {
      let errorMsg = `Failed to ${editId ? 'update' : 'add'} warehouse item`;
      if (err.response?.status === 403) {
        errorMsg = err.response.data.detail || 'You lack permission to perform this action.';
      } else if (err.response?.status === 400 && err.response.data) {
        errorMsg = Object.entries(err.response.data)
          .map(([field, msg]) => `${field}: ${Array.isArray(msg) ? msg.join(', ') : msg}`)
          .join('; ');
      } else {
        errorMsg = err.response?.data?.detail || err.message;
      }
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      await API.delete(`/warehouse_new/items/${deleteId}/`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
      });
      toast.success('Warehouse item deleted successfully');
      fetchItems();
      fetchAvailableItems();
      handleDeleteClose();
    } catch (err) {
      let errorMsg = 'Failed to delete warehouse item';
      if (err.response?.status === 403) {
        errorMsg = err.response.data.detail || 'You lack permission to delete items.';
      } else {
        errorMsg = err.response?.data?.detail || err.message;
      }
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

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
          {alert || 'You do not have permission to view this page.'}
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      {alert && (
        <Alert
          severity={alert.includes('⚠️') ? 'warning' : 'success'}
          sx={{ mb: 2 }}
          onClose={() => setAlert(null)}
        >
          {alert}
        </Alert>
      )}
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom>Warehouse Management</Typography>
        <Typography variant="subtitle1" sx={{ mb: 3 }}>
          Manage inventory items and storage locations
        </Typography>

        <Box display="flex" justifyContent="space-between" mb={2}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpen()}
            disabled={!actionPermissions.create_warehouse_new_item || loading}
          >
            Add Item
          </Button>
        </Box>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>S/N</TableCell>
                <TableCell>Item Name</TableCell>
                <TableCell>Quantity</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Last Updated</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.length > 0 ? (
                items.map((row, index) => (
                  <TableRow key={row.id}>
                    <TableCell>{(page - 1) * itemsPerPage + index + 1}</TableCell>
                    <TableCell>{row.item_name}</TableCell>
                    <TableCell>{row.quantity}</TableCell>
                    <TableCell>{row.status}</TableCell>
                    <TableCell>{new Date(row.last_updated).toLocaleString()}</TableCell>
                    <TableCell>
                      <IconButton
                        onClick={() => handleOpen(row)}
                        disabled={!actionPermissions.update_warehouse_new_item || loading}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        onClick={() => handleDeleteOpen(row.id)}
                        disabled={!actionPermissions.delete_warehouse_new_item || loading}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    {loading ? 'Loading...' : 'No matching records found.'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <Box display="flex" justifyContent="center" mt={3}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={(_, val) => setPage(val)}
            color="primary"
            disabled={loading}
          />
        </Box>
      </Paper>

      <Modal open={open} onClose={handleClose}>
        <Box sx={modalStyle}>
          <Typography variant="h6" gutterBottom>
            {editId ? 'Update Warehouse Item' : 'Add Warehouse Item'}
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Select
                name="item"
                value={formData.item}
                onChange={handleChange}
                fullWidth
                required
                displayEmpty
                disabled={loading || (editId && !actionPermissions.update_warehouse_new_item)}
                error={formData.item === '' && alert?.includes('required')}
              >
                <MenuItem value="" disabled>Select Item</MenuItem>
                {availableItems.length > 0 ? (
                  availableItems.map((item) => (
                    <MenuItem key={item.id} value={item.id}>
                      {item.name} (Qty: {item.quantity})
                    </MenuItem>
                  ))
                ) : (
                  <MenuItem value="" disabled>No available items</MenuItem>
                )}
              </Select>
            </Grid>
            <Grid item xs={12}>
              <Select
                name="storage_bin"
                value={formData.storage_bin}
                onChange={handleChange}
                fullWidth
                displayEmpty
                disabled={loading}
              >
                <MenuItem value="">No Storage Bin</MenuItem>
                {storageBins.length > 0 ? (
                  storageBins.map((bin) => (
                    <MenuItem key={bin.id} value={bin.id}>
                      {bin.bin_id} ({bin.row}-{bin.rack}, Capacity: {bin.capacity - bin.used}/{bin.capacity})
                    </MenuItem>
                  ))
                ) : (
                  <MenuItem value="" disabled>No storage bins available</MenuItem>
                )}
              </Select>
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Quantity"
                name="quantity"
                type="number"
                value={formData.quantity}
                onChange={handleChange}
                fullWidth
                required
                disabled={loading}
                error={formData.quantity === '' && alert?.includes('required')}
                helperText={formData.quantity === '' && alert?.includes('required') ? 'Quantity is required' : ''}
              />
            </Grid>
            <Grid item xs={6}>
              <Select
                name="status"
                value={formData.status}
                onChange={handleChange}
                fullWidth
                required
                disabled={loading}
              >
                <MenuItem value="in_stock">In Stock</MenuItem>
                <MenuItem value="reserved">Reserved</MenuItem>
                <MenuItem value="dispatched">Dispatched</MenuItem>
              </Select>
            </Grid>
            <Grid item xs={12} textAlign="right">
              <Button onClick={handleClose} sx={{ mr: 1 }} disabled={loading}>Cancel</Button>
              <Button
                variant="contained"
                onClick={handleSave}
                disabled={loading || !actionPermissions[editId ? 'update_warehouse_new_item' : 'create_warehouse_new_item']}
              >
                {loading ? 'Saving...' : editId ? 'Update Item' : 'Save Item'}
              </Button>
            </Grid>
          </Grid>
        </Box>
      </Modal>

      <Dialog open={deleteOpen} onClose={handleDeleteClose}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This action cannot be reversed. Are you sure you want to continue?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteClose} disabled={loading}>Cancel</Button>
          <Button
            onClick={handleDelete}
            color="error"
            variant="contained"
            disabled={loading || !actionPermissions.delete_warehouse_new_item}
          >
            {loading ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}