import React, { useEffect, useState } from 'react';
import {
  Container,
  Typography,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TextField,
  Button,
  Box,
  Modal,
  Grid,
  Alert,
  InputAdornment,
  Pagination,
  Divider // ← Add this here
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
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
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;

  const [newItem, setNewItem] = useState({
  name: '', // ✅ NEW
  quantity: '', // ✅ NEW
  part_number: '',
  manufacturer: '',
  contact: '',
  batch: '',
  expiry_date: '',
  custom_fields: { Material: '', Grade: '' },
});


  const fetchItems = async () => {
    try {
      const res = await API.get('inventory/items/');
      setItems(res.data);
    } catch (err) {
      console.error(err);
      setError('❌ Failed to fetch items.');
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.includes('custom.')) {
      const field = name.split('.')[1];
      setNewItem((prev) => ({
        ...prev,
        custom_fields: {
          ...prev.custom_fields,
          [field]: value
        }
      }));
    } else {
      setNewItem((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleAddItem = async () => {
  const {
    name,
    quantity,
    part_number,
    manufacturer,
    contact,
    batch,
    expiry_date,
    custom_fields
  } = newItem;

  if (
    !name || !quantity ||
    !part_number || !manufacturer || !contact || !batch || !expiry_date ||
    !custom_fields.Material || !custom_fields.Grade
  ) {
    setError('⚠️ Please fill in all fields.');
    return;
  }

  try {
    await API.post('inventory/items/', {
      ...newItem,
      quantity: Number(quantity),
    });
    setNewItem({
      name: '',
      quantity: '',
      part_number: '',
      manufacturer: '',
      contact: '',
      batch: '',
      expiry_date: '',
      custom_fields: { Material: '', Grade: '' },
    });
    setError('');
    setOpen(false);
    fetchItems();
  } catch (err) {
    console.error('🚨 Backend error:', err.response?.data || err.message);
    setError(
      err.response?.data?.detail ||
      Object.entries(err.response?.data || {})
        .map(([field, msg]) => `${field}: ${Array.isArray(msg) ? msg.join(', ') : msg}`)
        .join('\n') ||
      '❌ Failed to add item.'
    );
  }
};

const [selectedItem, setSelectedItem] = useState(null);
const [openViewModal, setOpenViewModal] = useState(false);



  const filteredItems = items.filter((item) =>
    Object.values(item).some(val =>
      typeof val === 'string' && val.toLowerCase().includes(search.toLowerCase())
    ) ||
    Object.values(item.custom_fields || {}).some(val =>
      val.toLowerCase().includes(search.toLowerCase())
    )
  );

  const paginatedItems = filteredItems.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
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

        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}>
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
    </TableRow>
  </TableHead>

  <TableBody>
    {paginatedItems.length > 0 ? (
      paginatedItems.map((item, idx) => (
        <TableRow
          key={idx}
          hover
          onClick={() => {
            setSelectedItem(item);
            setOpenViewModal(true);
          }}
          sx={{
            cursor: 'pointer',
            transition: 'background-color 0.2s ease-in-out',
            '&:hover': {
              backgroundColor: 'rgba(0, 0, 0, 0.04)',
            },
          }}
        >
          <TableCell>{item.part_number}</TableCell>
          <TableCell>{item.manufacturer}</TableCell>
          <TableCell>{item.contact}</TableCell>
          <TableCell>{item.batch}</TableCell>
          <TableCell>{item.expiry_date || '—'}</TableCell>
          <TableCell>{item.custom_fields?.Material}</TableCell>
          <TableCell>{item.custom_fields?.Grade}</TableCell>
        </TableRow>
      ))
    ) : (
      <TableRow>
        <TableCell colSpan={7} align="center">
          No items found.
        </TableCell>
      </TableRow>
    )}
  </TableBody>
</Table>

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
      outline: 'none'
    }}
  >
    {selectedItem && (
      <>
        <Typography variant="h6" gutterBottom>
          Item Details: {selectedItem.name}
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <Typography variant="body2" gutterBottom><strong>Quantity:</strong> {selectedItem.quantity}</Typography>
        <Typography variant="body2" gutterBottom><strong>Part Number:</strong> {selectedItem.part_number}</Typography>
        <Typography variant="body2" gutterBottom><strong>Manufacturer:</strong> {selectedItem.manufacturer}</Typography>
        <Typography variant="body2" gutterBottom><strong>Contact:</strong> {selectedItem.contact}</Typography>
        <Typography variant="body2" gutterBottom><strong>Batch:</strong> {selectedItem.batch}</Typography>
        <Typography variant="body2" gutterBottom><strong>Expiry Date:</strong> {selectedItem.expiry_date || '—'}</Typography>
        <Typography variant="body2" gutterBottom><strong>Material:</strong> {selectedItem.custom_fields?.Material}</Typography>
        <Typography variant="body2" gutterBottom><strong>Grade:</strong> {selectedItem.custom_fields?.Grade}</Typography>
        <Box sx={{ mt: 3, textAlign: 'right' }}>
          <Button onClick={() => setOpenViewModal(false)} variant="contained">
            Close
          </Button>
        </Box>
      </>
    )}
  </Box>
</Modal>



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

      {/* Modal for Adding New Item */}
      <Modal open={open} onClose={() => setOpen(false)}>
        <Box sx={modalStyle}>
          <Typography variant="h6" gutterBottom>
            Add New Item
          </Typography>

          {error && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Grid container spacing={2}>
  <Grid item xs={12} md={4}>
    {error && (
  <Grid item xs={12}>
    <Alert severity="error">{error}</Alert>
  </Grid>
)}
    <TextField
      label="Item Name"
      name="name"
      value={newItem.name}
      onChange={handleChange}
      fullWidth
      required
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
    />
  </Grid>
  <Grid item xs={12}>
    <Box sx={{ mt: 2, textAlign: 'right' }}>
      <Button variant="contained" onClick={handleAddItem}>
        Save Item
      </Button>
    </Box>
  </Grid>
</Grid>
        </Box>
      </Modal>
    </Container>
  );
}
