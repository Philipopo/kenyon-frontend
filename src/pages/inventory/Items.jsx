// src/pages/inventory/ItemMaster.jsx
import React, { useEffect, useState } from 'react';
import {
  Container, Typography, Paper, Table, TableHead, TableRow, TableCell, TableBody,
  TextField, Button, Box, Modal, Grid, Alert, InputAdornment, Pagination, Divider,
  IconButton, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import API from '../../api';

const modalStyle = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 800,
  bgcolor: 'background.paper',
  boxShadow: 24,
  p: 4,
  borderRadius: 2,
};

export default function ItemMaster() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(''); // Added for success messages
  const [open, setOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false); // For delete confirmation
  const [deleteId, setDeleteId] = useState(null); // ID of item to delete
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [checkingPermissions, setCheckingPermissions] = useState(true);
  const [hasPermission, setHasPermission] = useState(false);
  const [
  //hasCreatePermission, 
  setHasCreatePermission] = useState(false);
  const [hasUpdatePermission, setHasUpdatePermission] = useState(false); // Added
  const [hasDeletePermission, setHasDeletePermission] = useState(false); // Added
  const [editId, setEditId] = useState(null); // For update mode
  const itemsPerPage = 10;

  const [newItem, setNewItem] = useState({
    name: '', quantity: '', part_number: '', manufacturer: '', contact: '',
    batch: '', expiry_date: '', custom_fields: { Material: '', Grade: '' },
  });

  const [selectedItem, setSelectedItem] = useState(null);
  const [openViewModal, setOpenViewModal] = useState(false);

  const fetchItems = async () => {
    try {
      const res = await API.get('inventory/items/');
      console.log("Items response:", res.data);
      setItems(res.data || []);
    } catch (err) {
      console.error("Error fetching items:", err.response?.data || err.message);
      setError('❌ Failed to fetch items: ' + (err.response?.data?.detail || err.message));
    }
  };

  useEffect(() => {
    const checkPermissions = async () => {
      try {
        const token = localStorage.getItem("accessToken");
        console.log("Access token:", token);
        if (!token) {
          setError("⚠️ No authentication token found. Please log in.");
          setHasPermission(false);
          setCheckingPermissions(false);
          return;
        }
        const pageResponse = await API.get("/auth/permissions/page/items/");
        console.log("Page permission response:", pageResponse.data);
        setHasPermission(pageResponse.data.allowed || false);
        if (!pageResponse.data.allowed) {
          setError(`⚠️ You do not have permission to view this page: ${pageResponse.data.reason || "No reason provided"}`);
          setCheckingPermissions(false);
          return;
        }

        // Check create, update, delete permissions
        const [createResponse, updateResponse, deleteResponse] = await Promise.all([
          API.get("/auth/permissions/action/create_item/"),
          API.get("/auth/permissions/action/update_item/"),
          API.get("/auth/permissions/action/delete_item/"),
        ]);
        setHasCreatePermission(createResponse.data.allowed || false);
        setHasUpdatePermission(updateResponse.data.allowed || false);
        setHasDeletePermission(deleteResponse.data.allowed || false);
        if (!createResponse.data.allowed) {
          console.log("Create permission denied:", createResponse.data.reason);
        }
        if (!updateResponse.data.allowed) {
          console.log("Update permission denied:", updateResponse.data.reason);
        }
        if (!deleteResponse.data.allowed) {
          console.log("Delete permission denied:", deleteResponse.data.reason);
        }
        fetchItems();
      } catch (err) {
        console.error("Error checking permissions:", err.response?.data || err.message);
        if (err.response?.status === 401) {
          setError("⚠️ Authentication failed. Please log in again.");
        } else if (err.response?.status === 404) {
          setError("⚠️ Permission endpoint not found. Contact support.");
        } else {
          setError(`⚠️ Failed to check permissions: ${err.response?.data?.detail || err.message}`);
        }
        setHasPermission(false);
      } finally {
        setCheckingPermissions(false);
      }
    };
    checkPermissions();
  }, []);

  const handleOpen = async (item = null) => {
    if (!hasPermission) {
      setError("⚠️ You do not have permission to view items.");
      return;
    }
    try {
      const action = item ? "update_item" : "create_item";
      const actionResponse = await API.get(`/auth/permissions/action/${action}/`);
      console.log(`${action} permission response:`, actionResponse.data);
      if (!actionResponse.data.allowed) {
        setError(`⚠️ You do not have permission to ${item ? "update" : "create"} items: ${actionResponse.data.reason || "No reason provided"}`);
        return;
      }
      if (item) {
        setNewItem({
          name: item.name, quantity: item.quantity.toString(), part_number: item.part_number,
          manufacturer: item.manufacturer, contact: item.contact, batch: item.batch,
          expiry_date: item.expiry_date, custom_fields: { ...item.custom_fields },
        });
        setEditId(item.id);
      } else {
        setNewItem({
          name: '', quantity: '', part_number: '', manufacturer: '', contact: '',
          batch: '', expiry_date: '', custom_fields: { Material: '', Grade: '' },
        });
        setEditId(null);
      }
      setOpen(true);
    } catch (err) {
      console.error(`Error checking ${item ? "update" : "create"} permission:`, err.response?.data || err.message);
      setError(`❌ Failed to check ${item ? "update" : "create"} permission: ${err.response?.data?.detail || err.message}`);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setNewItem({
      name: '', quantity: '', part_number: '', manufacturer: '', contact: '',
      batch: '', expiry_date: '', custom_fields: { Material: '', Grade: '' },
    });
    setEditId(null);
    setError('');
    setSuccess('');
  };

  const handleDeleteOpen = (id) => {
    if (!hasDeletePermission) {
      setError("⚠️ You do not have permission to delete items.");
      return;
    }
    setDeleteId(id);
    setDeleteOpen(true);
  };

  const handleDeleteClose = () => {
    setDeleteOpen(false);
    setDeleteId(null);
    setError('');
    setSuccess('');
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.includes('custom.')) {
      const field = name.split('.')[1];
      setNewItem((prev) => ({
        ...prev,
        custom_fields: { ...prev.custom_fields, [field]: value },
      }));
    } else {
      setNewItem((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSaveItem = async () => {
    const { name, quantity, part_number, manufacturer, contact, batch, expiry_date, custom_fields } = newItem;

    if (!name || !quantity || !part_number || !manufacturer || !contact || !batch || !expiry_date || !custom_fields.Material || !custom_fields.Grade) {
      setError('⚠️ Please fill in all fields.');
      return;
    }

    if (Number(quantity) <= 0) {
      setError('⚠️ Quantity must be a positive number.');
      return;
    }

    try {
      const payload = { ...newItem, quantity: Number(quantity) };
      if (editId) {
        await API.patch(`inventory/items/${editId}/`, payload);
        setSuccess('✅ Item updated successfully');
      } else {
        await API.post('inventory/items/', payload);
        setSuccess('✅ Item created successfully');
      }
      setNewItem({
        name: '', quantity: '', part_number: '', manufacturer: '', contact: '',
        batch: '', expiry_date: '', custom_fields: { Material: '', Grade: '' },
      });
      setEditId(null);
      setOpen(false);
      fetchItems();
    } catch (err) {
      console.error(`${editId ? 'Updating' : 'Adding'} item error:`, err.response?.data || err.message);
      console.error('Raw response:', err.response);
      let errorMsg = `Failed to ${editId ? 'update' : 'add'} item: Unable to process request.`;
      if (err.response?.status === 403) {
        errorMsg = `⚠️ Permission denied: ${err.response.data.detail || 'You lack permission to perform this action.'}`;
      } else if (err.response?.status === 400 && err.response?.data) {
        errorMsg = Object.entries(err.response.data)
          .map(([field, msg]) => `${field}: ${Array.isArray(msg) ? msg.join(', ') : msg}`)
          .join('; ');
      } else if (err.response?.data?.detail) {
        errorMsg = err.response.data.detail;
      } else {
        errorMsg = err.message || `Failed to ${editId ? 'update' : 'add'} item: Network error.`;
      }
      setError(`❌ ${errorMsg}`);
    }
  };

  const handleDelete = async () => {
    try {
      await API.delete(`inventory/items/${deleteId}/`);
      setSuccess('✅ Item deleted successfully');
      setDeleteOpen(false);
      setDeleteId(null);
      fetchItems();
    } catch (err) {
      console.error('Error deleting item:', err.response?.data || err.message);
      let errorMsg = 'Failed to delete item: Unable to process request.';
      if (err.response?.status === 403) {
        errorMsg = `⚠️ Permission denied: ${err.response.data.detail || 'You lack permission to delete items.'}`;
      } else if (err.response?.data?.detail) {
        errorMsg = err.response.data.detail;
      } else {
        errorMsg = err.message || 'Failed to delete item: Network error.';
      }
      setError(`❌ ${errorMsg}`);
    }
  };

  const filteredItems = items.filter(
    (item) =>
      Object.values(item).some(
        (val) => typeof val === 'string' && val.toLowerCase().includes(search.toLowerCase())
      ) ||
      Object.values(item.custom_fields || {}).some((val) =>
        val.toLowerCase().includes(search.toLowerCase())
      )
  );

  const paginatedItems = filteredItems.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  if (checkingPermissions) {
    return (
      <Container>
        <Typography variant="h6" sx={{ mt: 4 }}>
          Loading permissions...
        </Typography>
      </Container>
    );
  }

  if (!hasPermission) {
    return (
      <Container>
        <Alert severity="error" sx={{ mt: 4 }} onClose={() => setError('')}>
          {error || '⚠️ You do not have permission to view this page.'}
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}
      <Typography variant="h4" gutterBottom>
        Item Master
      </Typography>

      {/* Search and Add Button */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap" gap={2}>
        <TextField
          placeholder="Search item..."
          variant="outlined"
          size="small"
          sx={{ minWidth: 300 }}
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
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpen()}>
          Add New Item
        </Button>
      </Box>

      {/* Table */}
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Item Registry
        </Typography>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell><strong>Part Number</strong></TableCell>
              <TableCell><strong>Manufacturer</strong></TableCell>
              <TableCell><strong>Contact</strong></TableCell>
              <TableCell><strong>Batch</strong></TableCell>
              <TableCell><strong>Expiry Date</strong></TableCell>
              <TableCell><strong>Material</strong></TableCell>
              <TableCell><strong>Grade</strong></TableCell>
              <TableCell><strong>Actions</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedItems.length > 0 ? (
              paginatedItems.map((item, idx) => (
                <TableRow
                  key={item.id}
                  hover
                  sx={{
                    cursor: 'pointer',
                    transition: 'background-color 0.2s ease-in-out',
                    '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.04)' },
                  }}
                >
                  <TableCell onClick={() => { setSelectedItem(item); setOpenViewModal(true); }}>
                    {item.part_number}
                  </TableCell>
                  <TableCell onClick={() => { setSelectedItem(item); setOpenViewModal(true); }}>
                    {item.manufacturer}
                  </TableCell>
                  <TableCell onClick={() => { setSelectedItem(item); setOpenViewModal(true); }}>
                    {item.contact}
                  </TableCell>
                  <TableCell onClick={() => { setSelectedItem(item); setOpenViewModal(true); }}>
                    {item.batch}
                  </TableCell>
                  <TableCell onClick={() => { setSelectedItem(item); setOpenViewModal(true); }}>
                    {item.expiry_date || '—'}
                  </TableCell>
                  <TableCell onClick={() => { setSelectedItem(item); setOpenViewModal(true); }}>
                    {item.custom_fields?.Material}
                  </TableCell>
                  <TableCell onClick={() => { setSelectedItem(item); setOpenViewModal(true); }}>
                    {item.custom_fields?.Grade}
                  </TableCell>
                  <TableCell>
                    <IconButton onClick={() => handleOpen(item)} disabled={!hasUpdatePermission}>
                      <EditIcon />
                    </IconButton>
                    <IconButton onClick={() => handleDeleteOpen(item.id)} disabled={!hasDeletePermission}>
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  No items found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {/* Pagination */}
        <Box mt={3} display="flex" justifyContent="center">
          <Pagination
            count={Math.ceil(filteredItems.length / itemsPerPage)}
            page={page}
            onChange={(_, value) => setPage(value)}
            color="primary"
          />
        </Box>
      </Paper>

      {/* Modal for Viewing Item Details */}
      <Modal open={openViewModal} onClose={() => setOpenViewModal(false)}>
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 400,
            bgcolor: 'background.paper',
            borderRadius: 2,
            boxShadow: 24,
            p: 4,
            outline: 'none',
          }}
        >
          {selectedItem && (
            <>
              <Typography variant="h6" gutterBottom>
                Item Details: {selectedItem.name}
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="body2" gutterBottom>
                <strong>Quantity:</strong> {selectedItem.quantity}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Part Number:</strong> {selectedItem.part_number}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Manufacturer:</strong> {selectedItem.manufacturer}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Contact:</strong> {selectedItem.contact}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Batch:</strong> {selectedItem.batch}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Expiry Date:</strong> {selectedItem.expiry_date || '—'}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Material:</strong> {selectedItem.custom_fields?.Material}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Grade:</strong> {selectedItem.custom_fields?.Grade}
              </Typography>
              <Box sx={{ mt: 3, textAlign: 'right' }}>
                <Button onClick={() => setOpenViewModal(false)} variant="contained">
                  Close
                </Button>
              </Box>
            </>
          )}
        </Box>
      </Modal>

      {/* Modal for Adding/Updating Item */}
      <Modal open={open} onClose={handleClose}>
        <Box sx={modalStyle}>
          <Typography variant="h6" gutterBottom>
            {editId ? 'Update Item' : 'Add New Item'}
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <TextField
                label="Item Name"
                name="name"
                value={newItem.name}
                onChange={handleChange}
                fullWidth
                required
                error={newItem.name === '' && error.includes('fill in all fields')}
                helperText={newItem.name === '' && error.includes('fill in all fields') ? 'Item name is required' : ''}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                label="Quantity"
                name="quantity"
                type="number"
                value={newItem.quantity}
                onChange={handleChange}
                fullWidth
                required
                error={newItem.quantity === '' && error.includes('fill in all fields')}
                helperText={newItem.quantity === '' && error.includes('fill in all fields') ? 'Quantity is required' : ''}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                label="Part Number"
                name="part_number"
                value={newItem.part_number}
                onChange={handleChange}
                fullWidth
                required
                error={newItem.part_number === '' && error.includes('fill in all fields')}
                helperText={newItem.part_number === '' && error.includes('fill in all fields') ? 'Part number is required' : ''}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                label="Manufacturer"
                name="manufacturer"
                value={newItem.manufacturer}
                onChange={handleChange}
                fullWidth
                required
                error={newItem.manufacturer === '' && error.includes('fill in all fields')}
                helperText={newItem.manufacturer === '' && error.includes('fill in all fields') ? 'Manufacturer is required' : ''}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                label="Contact"
                name="contact"
                value={newItem.contact}
                onChange={handleChange}
                fullWidth
                required
                error={newItem.contact === '' && error.includes('fill in all fields')}
                helperText={newItem.contact === '' && error.includes('fill in all fields') ? 'Contact is required' : ''}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                label="Batch Number"
                name="batch"
                value={newItem.batch}
                onChange={handleChange}
                fullWidth
                required
                error={newItem.batch === '' && error.includes('fill in all fields')}
                helperText={newItem.batch === '' && error.includes('fill in all fields') ? 'Batch number is required' : ''}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                label="Expiry Date"
                name="expiry_date"
                type="date"
                value={newItem.expiry_date}
                onChange={handleChange}
                fullWidth
                InputLabelProps={{ shrink: true }}
                required
                error={newItem.expiry_date === '' && error.includes('fill in all fields')}
                helperText={newItem.expiry_date === '' && error.includes('fill in all fields') ? 'Expiry date is required' : ''}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                label="Material"
                name="custom.Material"
                value={newItem.custom_fields.Material}
                onChange={handleChange}
                fullWidth
                required
                error={newItem.custom_fields.Material === '' && error.includes('fill in all fields')}
                helperText={newItem.custom_fields.Material === '' && error.includes('fill in all fields') ? 'Material is required' : ''}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                label="Grade"
                name="custom.Grade"
                value={newItem.custom_fields.Grade}
                onChange={handleChange}
                fullWidth
                required
                error={newItem.custom_fields.Grade === '' && error.includes('fill in all fields')}
                helperText={newItem.custom_fields.Grade === '' && error.includes('fill in all fields') ? 'Grade is required' : ''}
              />
            </Grid>
            <Grid item xs={12}>
              <Box sx={{ mt: 2, textAlign: 'right' }}>
                <Button onClick={handleClose} sx={{ mr: 1 }}>
                  Cancel
                </Button>
                <Button variant="contained" onClick={handleSaveItem}>
                  {editId ? 'Update Item' : 'Save Item'}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Box>
      </Modal>

      {/* Dialog for Delete Confirmation */}
      <Dialog open={deleteOpen} onClose={handleDeleteClose}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Action cannot be reversed, are you sure you want to continue?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteClose}>Cancel</Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}