import React, { useEffect, useState } from 'react';
import { useUser } from '../../hooks/useUser';
import {
  Container,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Box,
  Chip,
  TextField,
  InputAdornment,
  Pagination,
  Alert,
  Button,
  Modal,
  Grid,
  Snackbar
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import API from '../../api';

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

export default function StockTracking() {
  const { user } = useUser();

  const roleLevels = {
    staff: 1,
    finance_manager: 2,
    operations_manager: 3,
    md: 4,
    admin: 5,
  };

  const userLevel = roleLevels[user?.role] || 0;

  const [stocks, setStocks] = useState([]);
  const [category, setCategory] = useState('All');
  const [location, setLocation] = useState('All');
  const [critical, setCritical] = useState('All');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [snackOpen, setSnackOpen] = useState(false);
  const itemsPerPage = 10;

  const [newStock, setNewStock] = useState({
    item: '',
    category: '',
    location: '',
    quantity: '',
    critical: false,
  });

  const fetchStocks = async () => {
    try {
      const res = await API.get('inventory/stocks/');
      setStocks(res.data);
    } catch (err) {
      console.error(err);
      setError('Failed to load stock data.');
    }
  };

  useEffect(() => {
    fetchStocks();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setNewStock((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleAddStock = async () => {
    try {
      await API.post('inventory/stocks/', newStock);
      setNewStock({ item: '', category: '', location: '', quantity: '', critical: false });
      setOpen(false);
      fetchStocks();
      setError('');
    } catch (err) {
      console.error('Error adding stock:', err);
      setError('❌ Failed to create stock record.');
    }
  };

  const handleOpenModal = () => {
    if (userLevel >= 3) {
      setOpen(true);
    } else {
      setSnackOpen(true);
    }
  };

  const categories = ['All', ...new Set(stocks.map(item => item.category))];
  const locations = ['All', ...new Set(stocks.map(item => item.location))];

  const filteredData = stocks.filter(item =>
    (category === 'All' || item.category === category) &&
    (location === 'All' || item.location === location) &&
    (critical === 'All' || item.critical === (critical === 'Critical')) &&
    (item.item.toLowerCase().includes(search.toLowerCase()))
  );

  const paginatedData = filteredData.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  if (!user) return null;

  // Block users with role level 1 or 2 only
  if (userLevel <= 2) {
    return <Alert severity="error">❌ You don’t have permission to access this page.</Alert>;
  }


  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h4">Stock Tracking</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenModal}>
          Add Stock
        </Button>
      </Box>

      <Typography variant="subtitle1" sx={{ mb: 3 }}>
        Real-time monitoring of stock levels across all locations.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Filters */}
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 3 }}>
        <FormControl fullWidth>
          <InputLabel>Category</InputLabel>
          <Select value={category} onChange={(e) => setCategory(e.target.value)} label="Category">
            {categories.map((cat, idx) => (
              <MenuItem key={idx} value={cat}>
                {cat}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl fullWidth>
          <InputLabel>Location</InputLabel>
          <Select value={location} onChange={(e) => setLocation(e.target.value)} label="Location">
            {locations.map((loc, idx) => (
              <MenuItem key={idx} value={loc}>
                {loc}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl fullWidth>
          <InputLabel>Critical</InputLabel>
          <Select value={critical} onChange={(e) => setCritical(e.target.value)} label="Critical">
            <MenuItem value="All">All</MenuItem>
            <MenuItem value="Critical">Critical</MenuItem>
            <MenuItem value="Normal">Normal</MenuItem>
          </Select>
        </FormControl>

        <TextField
          placeholder="Search item..."
          variant="outlined"
          fullWidth
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
      </Box>

      {/* Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>S/N</TableCell>
              <TableCell>Item</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Location</TableCell>
              <TableCell>Quantity</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedData.length > 0 ? (
              paginatedData.map((row, index) => (
                <TableRow key={row.id}>
                  <TableCell>{(page - 1) * itemsPerPage + index + 1}</TableCell>
                  <TableCell>{row.item}</TableCell>
                  <TableCell>{row.category}</TableCell>
                  <TableCell>{row.location}</TableCell>
                  <TableCell>{row.quantity}</TableCell>
                  <TableCell>
                    <Chip
                      label={row.critical ? 'Critical' : 'Normal'}
                      color={row.critical ? 'error' : 'success'}
                      size="small"
                    />
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  No stock items match your filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      <Box display="flex" justifyContent="center" mt={3}>
        <Pagination
          count={Math.ceil(filteredData.length / itemsPerPage)}
          page={page}
          onChange={(_, value) => setPage(value)}
          color="primary"
        />
      </Box>

      {/* Add Stock Modal */}
      <Modal open={open} onClose={() => setOpen(false)}>
        <Box sx={modalStyle}>
          <Typography variant="h6" gutterBottom>
            Add Stock Record
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Item" name="item" value={newStock.item} onChange={handleChange} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Category" name="category" value={newStock.category} onChange={handleChange} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Location" name="location" value={newStock.location} onChange={handleChange} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Quantity"
                name="quantity"
                type="number"
                value={newStock.quantity}
                onChange={handleChange}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Critical</InputLabel>
                <Select
                  name="critical"
                  value={newStock.critical ? 'Critical' : 'Normal'}
                  onChange={(e) =>
                    handleChange({
                      target: {
                        name: 'critical',
                        type: 'checkbox',
                        checked: e.target.value === 'Critical',
                      },
                    })
                  }
                  label="Critical"
                >
                  <MenuItem value="Normal">Normal</MenuItem>
                  <MenuItem value="Critical">Critical</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} textAlign="right">
              <Button variant="contained" onClick={handleAddStock}>
                Save
              </Button>
            </Grid>
          </Grid>
        </Box>
      </Modal>

      {/* Permission Snackbar */}
      <Snackbar
        open={snackOpen}
        autoHideDuration={3000}
        onClose={() => setSnackOpen(false)}
        message="❌ You do not have the required permission to create stock."
      />
    </Container>
  );
}
