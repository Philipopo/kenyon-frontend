import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Container, Paper, Box, Typography, Button, TextField, InputAdornment, Table, TableHead,
  TableRow, TableCell, TableBody, TableContainer, Pagination, Dialog, DialogTitle,
  DialogContent, DialogContentText, DialogActions, Grid, Alert, IconButton, Card,
  CardContent, LinearProgress, Chip, Collapse, IconButton as MuiIconButton
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import WarehouseIcon from '@mui/icons-material/Warehouse';
import StorageIcon from '@mui/icons-material/Storage';
import InventoryIcon from '@mui/icons-material/Inventory';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { debounce } from 'lodash';
import API from '../../api';
import { useSearch } from '../../context/SearchContext';

const generateBinId = (row, rack, shelf) => `A${row}-R${rack}-S${shelf}`;

// Helper function to calculate usage percentage
const calculateUsagePercentage = (used, capacity) => {
  if (capacity === 0) return 0;
  return Math.round((used / capacity) * 100);
};

// Helper function to get usage color
const getUsageColor = (percentage) => {
  if (percentage >= 90) return 'error';
  if (percentage >= 70) return 'warning';
  return 'success';
};

export default function BinLocations() {
  const [bins, setBins] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [formData, setFormData] = useState({
    row: '', rack: '', shelf: '', type: '', capacity: '', description: '',
  });
  const [openDialog, setOpenDialog] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [editId, setEditId] = useState(null);
  const [localSearch, setLocalSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [checkingPermissions, setCheckingPermissions] = useState(true);
  const [hasPermission, setHasPermission] = useState(false);
  const [hasUpdatePermission, setHasUpdatePermission] = useState(false);
  const [hasDeletePermission, setHasDeletePermission] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  //const [selectedBin, setSelectedBin] = useState(null);
  const [metricsExpanded, setMetricsExpanded] = useState(true);
  const { searchTerm } = useSearch();
  const binsPerPage = 10;
  const prevSearchTermRef = useRef(searchTerm);
  const prevLocalSearchRef = useRef(localSearch);

  const debouncedSetLocalSearch = debounce((value) => {
    setLocalSearch(value);
    setPage(1);
  }, 500);

  const memoizedSetLocalSearch = useCallback((value) => {
    debouncedSetLocalSearch(value);
  }, [debouncedSetLocalSearch]);

  // Calculate warehouse statistics
  const warehouseStats = bins.reduce((stats, bin) => {
    stats.totalCapacity += bin.capacity;
    stats.totalUsed += bin.used;
    stats.binCount += 1;
    
    const usage = calculateUsagePercentage(bin.used, bin.capacity);
    if (usage >= 90) stats.fullBins += 1;
    if (usage <= 10) stats.emptyBins += 1;
    
    return stats;
  }, { totalCapacity: 0, totalUsed: 0, binCount: 0, fullBins: 0, emptyBins: 0 });

  const warehouseUsage = calculateUsagePercentage(warehouseStats.totalUsed, warehouseStats.totalCapacity);

  const fetchBins = useCallback(async () => {
    try {
      setLoading(true);
      const search = localSearch || searchTerm;
      const res = await API.get('inventory/bins/', {
        params: { search, page, page_size: binsPerPage },
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
      });
      console.log('[BINS FETCHED]', res.data);
      setBins(res.data.results || []);
      setTotalPages(Math.ceil(res.data.count / binsPerPage));
      setError('');
    } catch (err) {
      console.error('Error fetching bins:', err.response?.data || err.message);
      setError('❌ Failed to fetch bins: ' + (err.response?.data?.detail || err.message));
      setBins([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, localSearch, page, binsPerPage]);

  useEffect(() => {
    const checkPermissions = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        console.log('Access token:', token);
        if (!token) {
          setError('⚠️ No authentication token found. Please log in.');
          setHasPermission(false);
          setCheckingPermissions(false);
          return;
        }
        const pageResponse = await API.get('/auth/permissions/page/storage_bins/');
        console.log('Page permission response:', pageResponse.data);
        setHasPermission(pageResponse.data.allowed || false);
        if (!pageResponse.data.allowed) {
          setError(`⚠️ You do not have permission to view this page: ${pageResponse.data.reason || 'No reason provided'}`);
          setCheckingPermissions(false);
          return;
        }
        const [updateResponse, deleteResponse] = await Promise.all([
          API.get('/auth/permissions/action/update_storage_bin/'),
          API.get('/auth/permissions/action/delete_storage_bin/'),
        ]);
        setHasUpdatePermission(updateResponse.data.allowed || false);
        setHasDeletePermission(deleteResponse.data.allowed || false);
        console.log('Update permission:', updateResponse.data);
        console.log('Delete permission:', deleteResponse.data);
        fetchBins();
      } catch (err) {
        console.error('Error checking permissions:', err.response?.data || err.message);
        if (err.response?.status === 401) {
          setError('⚠️ Authentication failed. Please log in again.');
        } else if (err.response?.status === 404) {
          setError('⚠️ Permission endpoint not found. Contact support.');
        } else {
          setError(`⚠️ Failed to check permissions: ${err.response?.data?.detail || err.message}`);
        }
        setHasPermission(false);
      } finally {
        setCheckingPermissions(false);
      }
    };
    checkPermissions();
  }, [fetchBins]);

  useEffect(() => {
    if (hasPermission) {
      if (searchTerm !== prevSearchTermRef.current || localSearch !== prevLocalSearchRef.current) {
        setPage(1);
        prevSearchTermRef.current = searchTerm;
        prevLocalSearchRef.current = localSearch;
      }
      fetchBins();
    }
  }, [searchTerm, localSearch, page, hasPermission, fetchBins]);

  const handleOpenDialog = async (bin = null) => {
    if (!hasPermission) {
      setError('⚠️ You do not have permission to view bin locations.');
      return;
    }
    try {
      const action = bin ? 'update_storage_bin' : 'create_storage_bin';
      const actionResponse = await API.get(`/auth/permissions/action/${action}/`);
      console.log(`${action} permission response:`, actionResponse.data);
      if (!actionResponse.data.allowed) {
        setError(`⚠️ You do not have permission to ${bin ? 'update' : 'create'} storage bins: ${actionResponse.data.reason || 'No reason provided'}`);
        return;
      }
      if (bin) {
        setFormData({
          row: bin.row || '', rack: bin.rack || '', shelf: bin.shelf || '', type: bin.type || '',
          capacity: bin.capacity?.toString() || '', description: bin.description || '',
        });
        setEditId(bin.id);
      } else {
        setFormData({ row: '', rack: '', shelf: '', type: '', capacity: '', description: '' });
        setEditId(null);
      }
      setOpenDialog(true);
    } catch (err) {
      console.error(`Error checking ${bin ? 'update' : 'create'} permission:`, err.response?.data || err.message);
      setError(`❌ Failed to check ${bin ? 'update' : 'create'} permission: ${err.response?.data?.detail || err.message}`);
    }
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setFormData({ row: '', rack: '', shelf: '', type: '', capacity: '', description: '' });
    setEditId(null);
    setError('');
    setSuccess('');
  };

  const handleDeleteOpen = (id) => {
    if (!hasDeletePermission) {
      setError('⚠️ You do not have permission to delete bins.');
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

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFormSubmit = async () => {
    const { row, rack, shelf, type, capacity, description } = formData;
    if (!row || !rack || !shelf || !type || !capacity) {
      setError('⚠️ Please fill in all required fields.');
      return;
    }
    const numCapacity = Number(capacity);
    if (numCapacity <= 0) {
      setError('⚠️ Capacity must be positive.');
      return;
    }
    const bin_id = editId ? formData.bin_id || generateBinId(row, rack, shelf) : generateBinId(row, rack, shelf);
    const payload = {
      bin_id, row, rack, shelf, type,
      capacity: numCapacity, description,
    };
    try {
      if (editId) {
        await API.patch(`inventory/bins/${editId}/`, payload);
        setSuccess('✅ Bin updated successfully');
      } else {
        await API.post('inventory/bins/', payload);
        setSuccess('✅ Bin created successfully');
      }
      fetchBins();
      handleCloseDialog();
    } catch (err) {
      console.error(`${editId ? 'Updating' : 'Adding'} bin error:`, err.response?.data || err.message);
      let errorMsg = `Failed to ${editId ? 'update' : 'add'} bin: Unable to process request.`;
      if (err.response?.status === 403) {
        errorMsg = `⚠️ Permission denied: ${err.response.data.detail || 'You lack permission.'}`;
      } else if (err.response?.status === 400 && err.response?.data) {
        errorMsg = Object.entries(err.response.data)
          .map(([field, msg]) => `${field}: ${Array.isArray(msg) ? msg.join(', ') : msg}`)
          .join('; ');
      } else if (err.response?.data?.detail) {
        errorMsg = err.response.data.detail;
      } else {
        errorMsg = err.message || `Failed to ${editId ? 'update' : 'add'} bin: Network error.`;
      }
      setError(`❌ ${errorMsg}`);
    }
  };

  const handleDelete = async () => {
    try {
      await API.delete(`inventory/bins/${deleteId}/`);
      setSuccess('✅ Bin deleted successfully');
      handleDeleteClose();
      fetchBins();
    } catch (err) {
      console.error('Error deleting bin:', err.response?.data || err.message);
      let errorMsg = 'Failed to delete bin: Unable to process request.';
      if (err.response?.status === 403) {
        errorMsg = `⚠️ Permission denied: ${err.response.data.detail || 'You lack permission.'}`;
      } else if (err.response?.data?.detail) {
        errorMsg = err.response.data.detail;
      } else {
        errorMsg = err.message || 'Failed to delete bin: Network error.';
      }
      setError(`❌ ${errorMsg}`);
    }
  };

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
    <Container sx={{ mt: 4 }}>
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
      
      {/* Header Section */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <WarehouseIcon sx={{ fontSize: 40, mr: 2, color: 'primary.main' }} />
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Warehouse Bin Management
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage storage locations, track inventory capacity, and organize your warehouse efficiently
          </Typography>
        </Box>
      </Box>

      {/* Collapsible Metrics Section */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box 
          sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            cursor: 'pointer'
          }}
          onClick={() => setMetricsExpanded(!metricsExpanded)}
        >
          <Typography variant="h6">
            Warehouse Overview
          </Typography>
          <MuiIconButton size="small">
            {metricsExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </MuiIconButton>
        </Box>
        
        <Collapse in={metricsExpanded}>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={3}>
              <Card variant="outlined">
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <StorageIcon color="primary" sx={{ mr: 1 }} />
                    <Typography variant="h6">Total Bins</Typography>
                  </Box>
                  <Typography variant="h4" color="primary">
                    {warehouseStats.binCount}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Storage locations
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card variant="outlined">
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <InventoryIcon color="info" sx={{ mr: 1 }} />
                    <Typography variant="h6">Warehouse Usage</Typography>
                  </Box>
                  <Typography variant="h4" color="info.main">
                    {warehouseUsage}%
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                    <Box sx={{ width: '100%', mr: 1 }}>
                      <LinearProgress 
                        variant="determinate" 
                        value={warehouseUsage} 
                        color={getUsageColor(warehouseUsage)}
                        sx={{ height: 8, borderRadius: 4 }}
                      />
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card variant="outlined">
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <InventoryIcon color="success" sx={{ mr: 1 }} />
                    <Typography variant="h6">Available Capacity</Typography>
                  </Box>
                  <Typography variant="h4" color="success.main">
                    {warehouseStats.totalCapacity - warehouseStats.totalUsed}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    of {warehouseStats.totalCapacity} total
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card variant="outlined">
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <InventoryIcon color="warning" sx={{ mr: 1 }} />
                    <Typography variant="h6">Full Bins</Typography>
                  </Box>
                  <Typography variant="h4" color="warning.main">
                    {warehouseStats.fullBins}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {warehouseStats.emptyBins} empty bins
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Collapse>
      </Paper>

      {/* Search and Action Bar */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h5">Bin Locations</Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog()}>
            Add Bin
          </Button>
        </Box>

        <TextField
          placeholder="Search bins..."
          value={localSearch}
          onChange={(e) => memoizedSetLocalSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ mb: 2, width: '300px' }}
        />

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Bin ID</TableCell>
                <TableCell>Row</TableCell>
                <TableCell>Rack</TableCell>
                <TableCell>Shelf</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Capacity</TableCell>
                <TableCell>Used</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : bins.length > 0 ? (
                bins.map((bin) => {
                  const usagePercentage = calculateUsagePercentage(bin.used, bin.capacity);
                  return (
                    <TableRow key={bin.id}>
                      <TableCell>{bin.bin_id}</TableCell>
                      <TableCell>{bin.row}</TableCell>
                      <TableCell>{bin.rack}</TableCell>
                      <TableCell>{bin.shelf}</TableCell>
                      <TableCell>
                        <Chip 
                          label={bin.type} 
                          size="small" 
                          color="primary" 
                          variant="outlined" 
                        />
                      </TableCell>
                      <TableCell>{bin.capacity}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Box sx={{ width: '60%', mr: 1 }}>
                            <LinearProgress 
                              variant="determinate" 
                              value={usagePercentage} 
                              color={getUsageColor(usagePercentage)}
                              sx={{ height: 8, borderRadius: 4 }}
                            />
                          </Box>
                          <Typography variant="body2" color="text.secondary">
                            {bin.used} ({usagePercentage}%)
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <IconButton onClick={() => handleOpenDialog(bin)} disabled={!hasUpdatePermission}>
                          <EditIcon />
                        </IconButton>
                        <IconButton onClick={() => handleDeleteOpen(bin.id)} disabled={!hasDeletePermission}>
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    No bins found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <Box display="flex" justifyContent="center" mt={2}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={(_, value) => setPage(value)}
            color="primary"
          />
        </Box>
      </Paper>

      <Dialog open={openDialog} onClose={handleCloseDialog}>
        <DialogTitle>{editId ? 'Update Bin' : 'Add Bin'}</DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
              {error}
            </Alert>
          )}
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={4}>
              <TextField
                fullWidth
                label="Row"
                name="row"
                value={formData.row}
                onChange={handleFormChange}
                required
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                fullWidth
                label="Rack"
                name="rack"
                value={formData.rack}
                onChange={handleFormChange}
                required
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                fullWidth
                label="Shelf"
                name="shelf"
                value={formData.shelf}
                onChange={handleFormChange}
                required
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Type"
                name="type"
                value={formData.type}
                onChange={handleFormChange}
                required
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Capacity"
                name="capacity"
                type="number"
                value={formData.capacity}
                onChange={handleFormChange}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                name="description"
                value={formData.description}
                onChange={handleFormChange}
                multiline
                rows={3}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button variant="contained" onClick={handleFormSubmit}>
            {editId ? 'Update' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

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