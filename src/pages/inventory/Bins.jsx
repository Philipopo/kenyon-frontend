import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Container, Paper, Box, Typography, Button, TextField, InputAdornment, Table, TableHead,
  TableRow, TableCell, TableBody, TableContainer, Pagination, Dialog, DialogTitle,
  DialogContent, DialogContentText, DialogActions, Grid, Alert, IconButton, Card,
  CardContent, LinearProgress, Chip, Collapse, IconButton as MuiIconButton,
  Accordion, AccordionSummary, AccordionDetails, FormControl, InputLabel, Select, MenuItem
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
import InfoIcon from '@mui/icons-material/Info';
import WarningIcon from '@mui/icons-material/Warning';
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

// Expandable row component for bin details
function BinRow({ bin, onEdit, onDelete, hasUpdatePermission, hasDeletePermission }) {
  const [open, setOpen] = useState(false);
  const usagePercentage = calculateUsagePercentage(bin.current_load || 0, bin.capacity);
  
  // Parse stock records from bin data (assuming they come from API)
  const stockRecords = bin.stock_records || [];
  
  // Group items by name and sum quantities
  const itemSummary = stockRecords.reduce((acc, record) => {
    const itemName = record.item?.name || 'Unknown Item';
    if (!acc[itemName]) {
      acc[itemName] = {
        name: itemName,
        totalQuantity: 0,
        records: []
      };
    }
    acc[itemName].totalQuantity += record.quantity || 0;
    acc[itemName].records.push(record);
    return acc;
  }, {});

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
            {open ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
        </TableCell>
        <TableCell>{bin.bin_id}</TableCell>
        <TableCell>{bin.row}</TableCell>
        <TableCell>{bin.rack}</TableCell>
        <TableCell>{bin.shelf || '—'}</TableCell>
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
              {bin.current_load || 0} ({usagePercentage}%)
            </Typography>
          </Box>
        </TableCell>
        <TableCell>
          <IconButton 
            onClick={(e) => {
              e.stopPropagation();
              onEdit(bin);
            }} 
            disabled={!hasUpdatePermission}
            color="primary"
          >
            <EditIcon />
          </IconButton>
          <IconButton 
            onClick={(e) => {
              e.stopPropagation();
              onDelete(bin.id);
            }} 
            disabled={!hasDeletePermission || (bin.current_load || 0) > 0}
            color="error"
          >
            <DeleteIcon />
          </IconButton>
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={10}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ margin: 2 }}>
              <Typography variant="h6" gutterBottom component="div">
                Bin Details
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography><strong>ID:</strong> {bin.id}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography><strong>Description:</strong> {bin.description || '—'}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography><strong>Free Space:</strong> {Math.max(0, bin.capacity - (bin.current_load || 0))}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography><strong>Usage:</strong> 
                    <Chip 
                      label={`${usagePercentage}%`} 
                      size="small" 
                      color={getUsageColor(usagePercentage)}
                      sx={{ ml: 1 }}
                    />
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography><strong>Created By:</strong> {bin.created_by || bin.user?.name || bin.user?.email || '—'}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography><strong>Status:</strong> 
                    <Chip 
                      label={bin.current_load === 0 ? 'Empty' : bin.current_load >= bin.capacity ? 'Full' : 'In Use'} 
                      size="small" 
                      color={bin.current_load === 0 ? 'default' : bin.current_load >= bin.capacity ? 'error' : 'primary'}
                      sx={{ ml: 1 }}
                    />
                  </Typography>
                </Grid>
                
                {/* Items in Bin Section */}
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>
                    Items in Bin ({stockRecords.length} stock records)
                  </Typography>
                  {stockRecords.length > 0 ? (
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell><strong>Item Name</strong></TableCell>
                          <TableCell><strong>Part Number</strong></TableCell>
                          <TableCell><strong>Quantity</strong></TableCell>
                          <TableCell><strong>Batch</strong></TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {Object.entries(itemSummary).map(([itemName, summary]) => (
                          <TableRow key={itemName}>
                            <TableCell>{itemName}</TableCell>
                            <TableCell>
                              {summary.records.map((record, idx) => 
                                record.item?.part_number || '—'
                              ).filter((part, idx, arr) => arr.indexOf(part) === idx).join(', ')}
                            </TableCell>
                            <TableCell>
                              <strong>{summary.totalQuantity}</strong>
                            </TableCell>
                            <TableCell>
                              {summary.records.map(record => record.item?.batch || '—').filter(Boolean).join(', ') || '—'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <Typography color="text.secondary">
                      No items in this bin.
                    </Typography>
                  )}
                </Grid>
              </Grid>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
}

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
  const [hasCreatePermission, setHasCreatePermission] = useState(false);
  const [hasUpdatePermission, setHasUpdatePermission] = useState(false);
  const [hasDeletePermission, setHasDeletePermission] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [metricsExpanded, setMetricsExpanded] = useState(true);
  const [tutorialExpanded, setTutorialExpanded] = useState(false);
  const { searchTerm } = useSearch();
  const binsPerPage = 10;
  const prevSearchTermRef = useRef(searchTerm);
  const prevLocalSearchRef = useRef(localSearch);

  const binTypes = ['Pallet Rack', 'Shelf', 'Bulk Storage', 'Mezzanine', 'Flow Rack', 'Cantilever', 'Other'];

  const debouncedSetLocalSearch = debounce((value) => {
    setLocalSearch(value);
    setPage(1);
  }, 500);

  const memoizedSetLocalSearch = useCallback((value) => {
    debouncedSetLocalSearch(value);
  }, [debouncedSetLocalSearch]);

  // Calculate warehouse statistics
  const warehouseStats = bins.reduce((stats, bin) => {
    stats.totalCapacity += bin.capacity || 0;
    stats.totalUsed += bin.current_load || 0;
    stats.binCount += 1;
    
    const usage = calculateUsagePercentage(bin.current_load || 0, bin.capacity || 1);
    if (usage >= 90) stats.fullBins += 1;
    if (usage <= 10) stats.emptyBins += 1;
    if (bin.current_load === 0) stats.emptyBins += 1;
    
    return stats;
  }, { totalCapacity: 0, totalUsed: 0, binCount: 0, fullBins: 0, emptyBins: 0 });

  const warehouseUsage = calculateUsagePercentage(warehouseStats.totalUsed, warehouseStats.totalCapacity || 1);

  const fetchBins = useCallback(async () => {
    try {
      setLoading(true);
      const search = localSearch || searchTerm;
      const res = await API.get('inventory/bins/', {
        params: { 
          search, 
          page, 
          page_size: binsPerPage,
          expand: 'stock_records' // Add this to get stock records
        },
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
      });
      console.log('[BINS FETCHED]', res.data);
      setBins(res.data.results || res.data || []);
      setTotalPages(Math.ceil((res.data.count || 0) / binsPerPage));
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
        if (!token) {
          setError('⚠️ No authentication token found. Please log in.');
          setHasPermission(false);
          setCheckingPermissions(false);
          return;
        }
        
        const [pageRes, createRes, updateRes, deleteRes] = await Promise.all([
          API.get('/auth/permissions/page/storage_bins/'),
          API.get('/auth/permissions/action/create_storage_bin/'),
          API.get('/auth/permissions/action/update_storage_bin/'),
          API.get('/auth/permissions/action/delete_storage_bin/')
        ]);
        
        setHasPermission(pageRes.data.allowed || false);
        setHasCreatePermission(createRes.data.allowed || false);
        setHasUpdatePermission(updateRes.data.allowed || false);
        setHasDeletePermission(deleteRes.data.allowed || false);
        
        if (!pageRes.data.allowed) {
          setError(`⚠️ You do not have permission to view this page: ${pageRes.data.reason || 'No reason provided'}`);
        } else {
          fetchBins();
        }
      } catch (err) {
        console.error('Error checking permissions:', err.response?.data || err.message);
        setError(`⚠️ Failed to check permissions: ${err.response?.data?.detail || err.message}`);
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
    
    const hasActionPermission = bin ? hasUpdatePermission : hasCreatePermission;
    
    if (!hasActionPermission) {
      setError(`⚠️ You do not have permission to ${bin ? 'update' : 'create'} storage bins.`);
      return;
    }

    if (hasActionPermission) {
      if (bin) {
        setFormData({
          row: bin.row || '',
          rack: bin.rack || '',
          shelf: bin.shelf || '',
          type: bin.type || '',
          capacity: bin.capacity?.toString() || '',
          description: bin.description || '',
        });
        setEditId(bin.id);
      } else {
        setFormData({ 
          row: '', 
          rack: '', 
          shelf: '', 
          type: '', 
          capacity: '', 
          description: '' 
        });
        setEditId(null);
      }
      setOpenDialog(true);
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
    const bin = bins.find(b => b.id === id);
    if (!hasDeletePermission) {
      setError('⚠️ You do not have permission to delete bins.');
      return;
    }
    if (bin && (bin.current_load || 0) > 0) {
      setError('⚠️ Cannot delete bin that contains stock. Please remove all items first.');
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
    
    if (!row || !rack || !type || !capacity) {
      setError('⚠️ Please fill in all required fields (Row, Rack, Type, Capacity).');
      return;
    }
    
    const numCapacity = Number(capacity);
    if (numCapacity <= 0) {
      setError('⚠️ Capacity must be a positive number.');
      return;
    }

    if (editId) {
      const existingBin = bins.find(b => b.id === editId);
      if (existingBin && numCapacity < (existingBin.current_load || 0)) {
        setError(`⚠️ New capacity (${numCapacity}) cannot be less than current load (${existingBin.current_load || 0}).`);
        return;
      }
    }

    const bin_id = editId ? bins.find(b => b.id === editId)?.bin_id : generateBinId(row, rack, shelf);
    const payload = {
      bin_id, 
      row, 
      rack, 
      shelf: shelf || '', 
      type,
      capacity: numCapacity, 
      description: description || '',
    };

    try {
      if (editId) {
        await API.patch(`inventory/bins/${editId}/`, payload, {
          headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
        });
        setSuccess('✅ Bin updated successfully');
      } else {
        await API.post('inventory/bins/', payload, {
          headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
        });
        setSuccess('✅ Bin created successfully');
      }
      fetchBins();
      handleCloseDialog();
    } catch (err) {
      console.error(`${editId ? 'Updating' : 'Adding'} bin error:`, err.response?.data || err.message);
      let errorMsg = `Failed to ${editId ? 'update' : 'add'} bin: ${err.response?.data?.detail || err.message}`;
      
      if (err.response?.status === 403) {
        errorMsg = `⚠️ Permission denied: ${err.response.data.detail || 'You lack permission.'}`;
      } else if (err.response?.status === 400 && err.response?.data) {
        errorMsg = Object.entries(err.response.data)
          .map(([field, msg]) => `${field}: ${Array.isArray(msg) ? msg.join(', ') : msg}`)
          .join('; ');
      }
      
      setError(`❌ ${errorMsg}`);
    }
  };

  const handleDelete = async () => {
    try {
      await API.delete(`inventory/bins/${deleteId}/`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
      });
      setSuccess('✅ Bin deleted successfully');
      handleDeleteClose();
      fetchBins();
    } catch (err) {
      console.error('Error deleting bin:', err.response?.data || err.message);
      let errorMsg = 'Failed to delete bin: ' + (err.response?.data?.detail || err.message);
      
      if (err.response?.status === 403) {
        errorMsg = `⚠️ Permission denied: ${err.response.data.detail || 'You lack permission.'}`;
      } else if (err.response?.status === 400) {
        errorMsg = `⚠️ ${err.response.data.detail || 'Cannot delete bin with existing stock.'}`;
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
      {error && !openDialog && !deleteOpen && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      {success && !openDialog && !deleteOpen && (
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

      {/* Tutorial Accordion */}
      <Accordion expanded={tutorialExpanded} onChange={() => setTutorialExpanded(!tutorialExpanded)} sx={{ mb: 3 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <InfoIcon sx={{ mr: 1 }} />
            <Typography variant="h6">Bin Management Tutorial</Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Typography variant="body1" paragraph>
            <strong>Welcome to Bin Management! 🏭</strong> This system helps you organize your warehouse storage locations efficiently.
          </Typography>
          
          <Typography variant="h6" gutterBottom>Key Features:</Typography>
          <ul>
            <li><strong>Create Bins:</strong> Add new storage locations with unique IDs</li>
            <li><strong>Track Capacity:</strong> Monitor usage with visual progress bars</li>
            <li><strong>Organize by Location:</strong> Use Row-Rack-Shelf system for easy navigation</li>
            <li><strong>Smart Validations:</strong> Prevent errors with capacity and load checks</li>
          </ul>

          <Typography variant="h6" gutterBottom>Best Practices:</Typography>
          <ul>
            <li>💡 Use consistent naming for rows and racks (e.g., A, B, C for rows; 1, 2, 3 for racks)</li>
            <li>💡 Set realistic capacity based on your storage needs</li>
            <li>💡 Regularly review bin usage to optimize space</li>
            <li>💡 Empty bins before deleting them</li>
          </ul>

          <Alert severity="warning" sx={{ mt: 2 }}>
            <WarningIcon sx={{ mr: 1 }} />
            <strong>Important:</strong> You cannot reduce a bin's capacity below its current load, 
            and bins with stock cannot be deleted. Always empty bins before making major changes.
          </Alert>
        </AccordionDetails>
      </Accordion>

      {/* Metrics Section */}
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
            📊 Warehouse Overview
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
                    <Typography variant="h6">Available Space</Typography>
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
                    <Typography variant="h6">Storage Status</Typography>
                  </Box>
                  <Typography variant="h4" color="warning.main">
                    {warehouseStats.fullBins}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Full • {warehouseStats.emptyBins} Empty
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Collapse>
      </Paper>

      {/* Bins Table Section */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h5">📦 Bin Locations</Typography>
          <Button 
            variant="contained" 
            startIcon={<AddIcon />} 
            onClick={() => handleOpenDialog()}
            disabled={!hasCreatePermission}
          >
            Add New Bin
          </Button>
        </Box>

        <TextField
          placeholder="Search bins by ID, location, or type..."
          value={localSearch}
          onChange={(e) => memoizedSetLocalSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ mb: 2, width: '350px' }}
        />

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell></TableCell>
                <TableCell><strong>Bin ID</strong></TableCell>
                <TableCell><strong>Row</strong></TableCell>
                <TableCell><strong>Rack</strong></TableCell>
                <TableCell><strong>Shelf</strong></TableCell>
                <TableCell><strong>Type</strong></TableCell>
                <TableCell><strong>Capacity</strong></TableCell>
                <TableCell><strong>Current Load</strong></TableCell>
                <TableCell><strong>Actions</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} align="center">
                    <Typography>Loading bins...</Typography>
                  </TableCell>
                </TableRow>
              ) : bins.length > 0 ? (
                bins.map((bin) => (
                  <BinRow 
                    key={bin.id} 
                    bin={bin} 
                    onEdit={handleOpenDialog}
                    onDelete={handleDeleteOpen}
                    hasUpdatePermission={hasUpdatePermission}
                    hasDeletePermission={hasDeletePermission}
                  />
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={9} align="center">
                    <Typography variant="body2" color="textSecondary">
                      No bins found. {hasCreatePermission && 'Click "Add New Bin" to create your first storage location.'}
                    </Typography>
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

      {/* Add/Edit Bin Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <WarehouseIcon sx={{ mr: 1 }} />
            {editId ? '✏️ Edit Bin Location' : '➕ Add New Bin Location'}
          </Box>
        </DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
              {error}
            </Alert>
          )}
          
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Row *"
                name="row"
                value={formData.row}
                onChange={handleFormChange}
                required
                placeholder="e.g., A, B, C"
                helperText="Row identifier"
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Rack *"
                name="rack"
                value={formData.rack}
                onChange={handleFormChange}
                required
                placeholder="e.g., 1, 2, 3"
                helperText="Rack number"
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Shelf"
                name="shelf"
                value={formData.shelf}
                onChange={handleFormChange}
                placeholder="e.g., 1, 2, 3"
                helperText="Shelf level (optional)"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required>
                <InputLabel>Bin Type *</InputLabel>
                <Select
                  name="type"
                  value={formData.type}
                  onChange={handleFormChange}
                  label="Bin Type *"
                >
                  {binTypes.map((type) => (
                    <MenuItem key={type} value={type}>{type}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Capacity *"
                name="capacity"
                type="number"
                value={formData.capacity}
                onChange={handleFormChange}
                required
                inputProps={{ min: 1 }}
                helperText="Maximum storage capacity"
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
                placeholder="Add any notes about this bin location..."
              />
            </Grid>
            
            {/* Preview Section */}
            {formData.row && formData.rack && (
              <Grid item xs={12}>
                <Card variant="outlined" sx={{ bgcolor: 'grey.50' }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      📋 Bin Preview
                    </Typography>
                    <Typography variant="body2">
                      <strong>Bin ID:</strong> {generateBinId(formData.row, formData.rack, formData.shelf)}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Location:</strong> Row {formData.row}, Rack {formData.rack}
                      {formData.shelf && `, Shelf ${formData.shelf}`}
                    </Typography>
                    {editId && (
                      <Alert severity="info" sx={{ mt: 1 }}>
                        <strong>Note:</strong> You cannot reduce capacity below current load. 
                        Current load: {bins.find(b => b.id === editId)?.current_load || 0}
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button variant="contained" onClick={handleFormSubmit}>
            {editId ? 'Update Bin' : 'Create Bin'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteOpen} onClose={handleDeleteClose}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this bin? This action cannot be undone.
          </DialogContentText>
          <Alert severity="warning" sx={{ mt: 1 }}>
            <WarningIcon sx={{ mr: 1 }} />
            Ensure the bin is empty before deleting. Bins with stock cannot be removed.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteClose}>Cancel</Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            Delete Bin
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}