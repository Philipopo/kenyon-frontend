// src/pages/Warehouse.jsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  Container, Paper, Typography, Box, Table, TableContainer, TableHead, TableRow, TableCell, TableBody,
  Pagination, TextField, InputAdornment, Button, Modal, Grid, Select, MenuItem, Alert, IconButton,
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Tabs, Tab, CircularProgress
} from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import MapIcon from '@mui/icons-material/Map';
import API from '../api';

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
  const [serials, setSerials] = useState([]);
  const [formData, setFormData] = useState({ serial_number: '', location: '', status: 'in_stock' });
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [alert, setAlert] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  const [checkingPermissions, setCheckingPermissions] = useState(true);
  const [hasPermission, setHasPermission] = useState(false);
  const [actionPermissions, setActionPermissions] = useState({
    create_warehouse_item: false,
    update_warehouse_item: false,
    delete_warehouse_item: false,
  });
  const itemsPerPage = 10;

  // Sample data for analytics (replace with API call)
  const analyticsData = [
    { name: 'Laptop', stock: 50 },
    { name: 'Phone', stock: 30 },
    { name: 'Tablet', stock: 20 },
  ];

  const fetchItems = useCallback(async () => {
    try {
      const res = await API.get('/warehouse/items/');
      setItems(res.data || []);
    } catch (err) {
      setAlert(`❌ Failed to fetch warehouse items: ${err.response?.data?.detail || err.message}`);
    }
  }, []);

  const fetchSerials = useCallback(async () => {
    try {
      const res = await API.get('/warehouse/items/available_serials/');
      setSerials(res.data || []);
    } catch (err) {
      setAlert(`❌ Failed to fetch serial numbers: ${err.response?.data?.detail || err.message}`);
    }
  }, []);

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

        const pageResponse = await API.get('/auth/permissions/page/warehouse/');
        setHasPermission(pageResponse.data.allowed || false);
        if (!pageResponse.data.allowed) {
          setAlert(`⚠️ You do not have permission to view this page: ${pageResponse.data.reason || 'No reason provided'}`);
          setCheckingPermissions(false);
          return;
        }

        const actions = ['create_warehouse_item', 'update_warehouse_item', 'delete_warehouse_item'];
        const actionPerms = {};
        for (const action of actions) {
          try {
            const actionResponse = await API.get(`/auth/permissions/action/${action}/`);
            actionPerms[action] = actionResponse.data.allowed || false;
            if (!actionResponse.data.allowed) {
              setAlert(`⚠️ You do not have permission to perform ${action.replace('_', ' ')}: ${actionResponse.data.reason || 'No reason provided'}`);
            }
          } catch (err) {
            actionPerms[action] = false;
          }
        }
        setActionPermissions(actionPerms);
        fetchItems();
        fetchSerials();
      } catch (err) {
        setAlert(`❌ Failed to check permissions: ${err.response?.data?.detail || err.message}`);
        setHasPermission(false);
      } finally {
        setCheckingPermissions(false);
      }
    };

    checkPermissions();
  }, [fetchItems, fetchSerials]);

  const handleOpen = async (item = null) => {
    if (!actionPermissions[item ? 'update_warehouse_item' : 'create_warehouse_item']) {
      setAlert(`⚠️ You do not have permission to ${item ? 'update' : 'create'} warehouse items.`);
      return;
    }
    if (item) {
      setFormData({
        serial_number: item.serial_number.id,
        location: item.location,
        status: item.status,
      });
      setEditId(item.id);
    } else {
      setFormData({ serial_number: '', location: '', status: 'in_stock' });
      setEditId(null);
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setFormData({ serial_number: '', location: '', status: 'in_stock' });
    setEditId(null);
    setAlert(null);
  };

  const handleDeleteOpen = (id) => {
    if (!actionPermissions.delete_warehouse_item) {
      setAlert('⚠️ You do not have permission to delete warehouse items.');
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
    const { serial_number, location, status } = formData;
    if (!serial_number || !location || !status) {
      setAlert('⚠️ Please fill in all required fields.');
      return;
    }
    const payload = { serial_number, location, status };
    try {
      if (editId) {
        await API.patch(`/warehouse/items/${editId}/`, payload);
        setAlert('✅ Warehouse item updated successfully');
      } else {
        await API.post('/warehouse/items/', payload);
        setAlert('✅ Warehouse item created successfully');
      }
      fetchItems();
      handleClose();
    } catch (err) {
      let errorMsg = `❌ Failed to ${editId ? 'update' : 'add'} warehouse item: Unable to process request.`;
      if (err.response?.status === 403) {
        errorMsg = `⚠️ Permission denied: ${err.response.data.detail || 'You lack permission to perform this action.'}`;
      } else if (err.response?.status === 400 && err.response.data) {
        errorMsg = Object.entries(err.response.data)
          .map(([field, msg]) => `${field}: ${Array.isArray(msg) ? msg.join(', ') : msg}`)
          .join('; ');
      } else {
        errorMsg = err.response?.data?.detail || err.message;
      }
      setAlert(errorMsg);
    }
  };

  const handleDelete = async () => {
    try {
      await API.delete(`/warehouse/items/${deleteId}/`);
      setAlert('✅ Warehouse item deleted successfully');
      setDeleteOpen(false);
      setDeleteId(null);
      fetchItems();
    } catch (err) {
      let errorMsg = '❌ Failed to delete warehouse item: Unable to process request.';
      if (err.response?.status === 403) {
        errorMsg = `⚠️ Permission denied: ${err.response.data.detail || 'You lack permission to delete items.'}`;
      } else {
        errorMsg = err.response?.data?.detail || err.message;
      }
      setAlert(errorMsg);
    }
  };

  const filtered = items.filter(item =>
    item.product_name?.toLowerCase().includes(search.toLowerCase()) ||
    item.sku?.toLowerCase().includes(search.toLowerCase()) ||
    item.serial_number?.serial_number.toLowerCase().includes(search.toLowerCase()) ||
    item.location?.toLowerCase().includes(search.toLowerCase()) ||
    item.status?.toLowerCase().includes(search.toLowerCase())
  );

  const paginated = filtered.slice((page - 1) * itemsPerPage, page * itemsPerPage);

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
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      {alert && (
        <Alert
          severity={alert.includes('❌') ? 'error' : alert.includes('⚠') ? 'warning' : 'success'}
          sx={{ mb: 2 }}
          onClose={() => setAlert(null)}
        >
          {alert}
        </Alert>
      )}
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom>Warehouse Overview</Typography>
        <Typography variant="subtitle1" sx={{ mb: 3 }}>
          Visual rack map, heatmaps, and smart routing
        </Typography>

        <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)} sx={{ mb: 3 }}>
          <Tab label="Inventory" />
          <Tab label="Rack Map" />
          <Tab label="Analytics" />
        </Tabs>

        {tabValue === 0 && (
          <>
            <Box display="flex" justifyContent="space-between" mb={2}>
              <TextField
                placeholder="Search warehouse data..."
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
                startIcon={<AddIcon />}
                onClick={() => handleOpen()}
                disabled={!actionPermissions.create_warehouse_item}
              >
                Add Item
              </Button>
            </Box>

            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>S/N</TableCell>
                    <TableCell>Product</TableCell>
                    <TableCell>SKU</TableCell>
                    <TableCell>Serial Number</TableCell>
                    <TableCell>Location</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Last Updated</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginated.length > 0 ? (
                    paginated.map((row, index) => (
                      <TableRow key={row.id}>
                        <TableCell>{(page - 1) * itemsPerPage + index + 1}</TableCell>
                        <TableCell>{row.product_name}</TableCell>
                        <TableCell>{row.sku}</TableCell>
                        <TableCell>{row.serial_number.serial_number}</TableCell>
                        <TableCell>{row.location}</TableCell>
                        <TableCell>{row.status}</TableCell>
                        <TableCell>{new Date(row.last_updated).toLocaleString()}</TableCell>
                        <TableCell>
                          <IconButton
                            onClick={() => handleOpen(row)}
                            disabled={!actionPermissions.update_warehouse_item}
                          >
                            <EditIcon />
                          </IconButton>
                          <IconButton
                            onClick={() => handleDeleteOpen(row.id)}
                            disabled={!actionPermissions.delete_warehouse_item}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} align="center">No matching records found.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            <Box display="flex" justifyContent="center" mt={3}>
              <Pagination
                count={Math.ceil(filtered.length / itemsPerPage)}
                page={page}
                onChange={(_, val) => setPage(val)}
                color="primary"
              />
            </Box>
          </>
        )}

        {tabValue === 1 && (
          <Box>
            <Typography variant="h6" gutterBottom>Rack Map</Typography>
            <Typography variant="body2">Interactive warehouse layout (to be implemented with a canvas or library like Konva.js)</Typography>
            {/* Placeholder for rack map */}
          </Box>
        )}

        {tabValue === 2 && (
          <Box>
            <Typography variant="h6" gutterBottom>Analytics Dashboard</Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analyticsData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="stock" fill="#1976d2" />
              </BarChart>
            </ResponsiveContainer>
          </Box>
        )}
      </Paper>

      <Modal open={open} onClose={handleClose}>
        <Box sx={modalStyle}>
          <Typography variant="h6" gutterBottom>
            {editId ? 'Update Warehouse Item' : 'Add Warehouse Item'}
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Select
                name="serial_number"
                value={formData.serial_number}
                onChange={handleChange}
                fullWidth
                required
                displayEmpty
              >
                <MenuItem value="" disabled>Select Serial Number</MenuItem>
                {serials.map((serial) => (
                  <MenuItem key={serial.id} value={serial.id}>
                    {serial.serial_number} ({serial.inflow?.product_name || 'Unknown'})
                  </MenuItem>
                ))}
              </Select>
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Location"
                name="location"
                value={formData.location}
                onChange={handleChange}
                fullWidth
                required
                error={formData.location === '' && alert?.includes('required')}
                helperText={formData.location === '' && alert?.includes('required') ? 'Location is required' : ''}
              />
            </Grid>
            <Grid item xs={6}>
              <Select
                name="status"
                value={formData.status}
                onChange={handleChange}
                fullWidth
                required
              >
                <MenuItem value="in_stock">In Stock</MenuItem>
                <MenuItem value="reserved">Reserved</MenuItem>
                <MenuItem value="dispatched">Dispatched</MenuItem>
              </Select>
            </Grid>
            <Grid item xs={12} textAlign="right">
              <Button onClick={handleClose} sx={{ mr: 1 }}>Cancel</Button>
              <Button
                variant="contained"
                onClick={handleSave}
                disabled={!actionPermissions[editId ? 'update_warehouse_item' : 'create_warehouse_item']}
              >
                {editId ? 'Update Item' : 'Save Item'}
              </Button>
            </Grid>
          </Grid>
        </Box>
      </Modal>

      <Dialog open={deleteOpen} onClose={handleDeleteClose}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Action cannot be reversed, are you sure you want to continue?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteClose}>Cancel</Button>
          <Button
            onClick={handleDelete}
            color="error"
            variant="contained"
            disabled={!actionPermissions.delete_warehouse_item}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}