import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  Container, Typography, Paper, Table, TableHead, TableRow, TableCell, TableBody,
  TableContainer, Box, Alert, Pagination, TextField, Button,
  Dialog, DialogTitle, DialogContent, DialogActions, Grid, Card, CardContent,
  LinearProgress, Chip, FormControl, InputLabel, Select, MenuItem,
  Accordion, AccordionSummary, AccordionDetails, Tab, Tabs, IconButton
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Warehouse as WarehouseIcon,
  Storage as StorageIcon,
  ExpandMore as ExpandMoreIcon,
  BarChart as BarChartIcon,
  Analytics as AnalyticsIcon,
  Info as InfoIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import API from '../../api';
import { useSearch } from '../../context/SearchContext';

// Register ChartJS components
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

// Tab Panel Component
function TabPanel({ children, value, index, ...other }) {
  return (
    <div hidden={value !== index} {...other}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export default function AisleRackDashboard() {
  const [bins, setBins] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [page, setPage] = useState(1);
  const [checkingPermissions, setCheckingPermissions] = useState(true);
  const [hasPermission, setHasPermission] = useState(false);
  const [hasUpdatePermission, setHasUpdatePermission] = useState(false);
  const [hasDeletePermission, setHasDeletePermission] = useState(false);
  const [hasCreateBinPermission, setHasCreateBinPermission] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [openDialog, setOpenDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [formData, setFormData] = useState({
    name: '', code: '', description: '', address: '', capacity: '', is_active: true
  });
  const [analyticsData, setAnalyticsData] = useState(null);
  const { searchTerm, setSearchTerm } = useSearch();
  const itemsPerPage = 10;
  const prevSearchTermRef = useRef(searchTerm);

  // NEW: Bin management states
  const [binDialog, setBinDialog] = useState(false);
  const [binFormData, setBinFormData] = useState({
    bin_id: '', row: '', rack: '', shelf: '', type: '', capacity: ''
  });
  const [selectedWarehouseId, setSelectedWarehouseId] = useState(null);
  const [warehouseBins, setWarehouseBins] = useState([]);
  const [loadingBins, setLoadingBins] = useState(false);

  // Search handler
  const handleSearch = useCallback((value) => {
    setSearchTerm(value);
    setPage(1);
  }, [setSearchTerm]);

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setError('⚠️ No authentication token found. Please log in.');
        return;
      }

      const [binsRes, warehousesRes, analyticsRes] = await Promise.all([
        API.get('/inventory/bins/', {
          params: { search: searchTerm, page, page_size: itemsPerPage },
          headers: { Authorization: `Bearer ${token}` },
        }),
        API.get('/inventory/warehouses/', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        API.get('/inventory/warehouse-analytics/', {
          headers: { Authorization: `Bearer ${token}` },
        })
      ]);

      setBins(binsRes.data.results || []);
      setTotalPages(Math.ceil(binsRes.data.count / itemsPerPage));
      setWarehouses(warehousesRes.data.results || warehousesRes.data || []);
      setAnalyticsData(analyticsRes.data);
      setError('');
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('❌ Failed to fetch data: ' + (err.response?.data?.detail || err.message));
    }
  }, [page, searchTerm, itemsPerPage]);

  // NEW: Fetch bins for selected warehouse
  const fetchWarehouseBins = useCallback(async (warehouseId) => {
    if (!warehouseId) return;
    setLoadingBins(true);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await API.get(`/inventory/warehouses/${warehouseId}/bins/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setWarehouseBins(res.data);
    } catch (err) {
      setError('❌ Failed to fetch warehouse bins: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoadingBins(false);
    }
  }, []);

  // Check permissions
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

        const [pageRes, updateRes, deleteRes, createBinRes] = await Promise.all([
          API.get('/auth/permissions/page/aisle_rack_dashboard/'),
          API.get('/auth/permissions/action/update_warehouse/'),
          API.get('/auth/permissions/action/delete_warehouse/'),
          API.get('/auth/permissions/action/create_storage_bin/')
        ]);

        setHasPermission(pageRes.data.allowed || false);
        setHasUpdatePermission(updateRes.data.allowed || false);
        setHasDeletePermission(deleteRes.data.allowed || false);
        setHasCreateBinPermission(createBinRes.data.allowed || false);

        if (!pageRes.data.allowed) {
          setError(`⚠️ You do not have permission to view this page: ${pageRes.data.reason || 'No reason provided'}`);
        } else {
          fetchData();
        }
      } catch (err) {
        console.error('Error checking permissions:', err);
        setError(`⚠️ Failed to check permissions: ${err.response?.data?.detail || err.message}`);
        setHasPermission(false);
      } finally {
        setCheckingPermissions(false);
      }
    };
    checkPermissions();
  }, [fetchData]);

  useEffect(() => {
    if (hasPermission && searchTerm !== prevSearchTermRef.current) {
      setPage(1);
      prevSearchTermRef.current = searchTerm;
      fetchData();
    }
  }, [searchTerm, hasPermission, fetchData]);

  // Dialog handlers
  const handleOpenDialog = (warehouse = null) => {
    if (warehouse) {
      setFormData({
        name: warehouse.name || '',
        code: warehouse.code || '',
        description: warehouse.description || '',
        address: warehouse.address || '',
        capacity: warehouse.capacity?.toString() || '',
        is_active: warehouse.is_active !== undefined ? warehouse.is_active : true
      });
      setSelectedItem(warehouse);
    } else {
      setFormData({
        name: '', code: '', description: '', address: '', capacity: '', is_active: true
      });
      setSelectedItem(null);
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedItem(null);
    setFormData({
      name: '', code: '', description: '', address: '', capacity: '', is_active: true
    });
  };

  const handleDeleteOpen = (warehouse) => {
    setSelectedItem(warehouse);
    setDeleteDialog(true);
  };

  const handleDeleteClose = () => {
    setDeleteDialog(false);
    setSelectedItem(null);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'capacity' ? value : name === 'is_active' ? value === 'true' : value
    }));
  };

  const handleFormSubmit = async () => {
    const { name, code, description, address, capacity, is_active } = formData;
    
    if (!name || !code || !capacity) {
      setError('⚠️ Please fill in all required fields (Name, Code, Capacity).');
      return;
    }

    if (Number(capacity) <= 0) {
      setError('⚠️ Capacity must be a positive number.');
      return;
    }

    try {
      const payload = {
        name, code, description, address,
        capacity: Number(capacity), is_active
      };

      if (selectedItem) {
        await API.patch(`/inventory/warehouses/${selectedItem.id}/`, payload);
        setSuccess('✅ Warehouse updated successfully');
      } else {
        await API.post('/inventory/warehouses/', payload);
        setSuccess('✅ Warehouse created successfully');
      }

      fetchData();
      handleCloseDialog();
    } catch (err) {
      setError(`❌ Failed to ${selectedItem ? 'update' : 'create'} warehouse: ${err.response?.data?.detail || err.message}`);
    }
  };

  const handleDelete = async () => {
    try {
      await API.delete(`/inventory/warehouses/${selectedItem.id}/`);
      setSuccess('✅ Warehouse deleted successfully');
      handleDeleteClose();
      fetchData();
    } catch (err) {
      setError(`❌ Failed to delete warehouse: ${err.response?.data?.detail || err.message}`);
    }
  };

  // NEW: Bin dialog handlers
  const handleOpenBinDialog = (bin = null, warehouseId) => {
    if (bin) {
      setBinFormData({
        bin_id: bin.bin_id || '',
        row: bin.row || '',
        rack: bin.rack || '',
        shelf: bin.shelf || '',
        type: bin.type || '',
        capacity: bin.capacity?.toString() || ''
      });
      setSelectedItem(bin);
    } else {
      setBinFormData({
        bin_id: '', row: '', rack: '', shelf: '', type: '', capacity: ''
      });
      setSelectedItem(null);
    }
    setSelectedWarehouseId(warehouseId);
    setBinDialog(true);
  };

  const handleCloseBinDialog = () => {
    setBinDialog(false);
    setSelectedItem(null);
    setBinFormData({ bin_id: '', row: '', rack: '', shelf: '', type: '', capacity: '' });
  };

  const handleBinFormChange = (e) => {
    const { name, value } = e.target;
    setBinFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleBinSubmit = async () => {
    const { bin_id, row, rack, shelf, type, capacity } = binFormData;
    if (!bin_id || !row || !rack || !capacity) {
      setError('⚠️ Please fill all required fields (Bin ID, Row, Rack, Capacity).');
      return;
    }
    if (Number(capacity) <= 0) {
      setError('⚠️ Capacity must be a positive number.');
      return;
    }

    try {
      const payload = {
        bin_id, row, rack, shelf, type, capacity: Number(capacity)
      };

      const token = localStorage.getItem('accessToken');
      if (selectedItem) {
        // Update existing bin
        await API.patch(`/inventory/bins/${selectedItem.id}/`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSuccess('✅ Bin updated successfully');
      } else {
        // Create new bin in warehouse
        await API.post(`/inventory/warehouses/${selectedWarehouseId}/add_bin/`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSuccess('✅ Bin added to warehouse successfully');
      }

      fetchData();
      fetchWarehouseBins(selectedWarehouseId);
      handleCloseBinDialog();
    } catch (err) {
      const errorMsg = err.response?.data?.warehouse || err.response?.data?.detail || err.message;
      setError(`❌ ${selectedItem ? 'Update' : 'Add'} failed: ${errorMsg}`);
    }
  };

  const handleDeleteBin = async (bin) => {
    try {
      const token = localStorage.getItem('accessToken');
      await API.delete(`/inventory/bins/${bin.id}/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuccess('✅ Bin removed from warehouse');
      fetchWarehouseBins(selectedWarehouseId);
    } catch (err) {
      setError(`❌ Failed to remove bin: ${err.response?.data?.detail || err.message}`);
    }
  };

  // Chart data functions
  const getWarehouseUsageData = () => ({
    labels: warehouses.map(w => w.name),
    datasets: [{
      label: 'Usage Percentage',
      data: warehouses.map(w => w.usage_percentage || 0),
      backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF'],
      borderWidth: 1
    }]
  });

  const getBinDistributionData = () => {
    if (!analyticsData) return null;
    
    return {
      labels: ['Empty', 'Low Usage (<20%)', 'Medium Usage (20-80%)', 'High Usage (≥80%)'],
      datasets: [{
        data: [
          analyticsData.usage_distribution?.empty || 0,
          analyticsData.usage_distribution?.low_usage || 0,
          analyticsData.usage_distribution?.medium_usage || 0,
          analyticsData.usage_distribution?.high_usage || 0,
        ],
        backgroundColor: ['#4CAF50', '#2196F3', '#FF9800', '#F44336'],
        borderWidth: 1
      }]
    };
  };

  if (checkingPermissions) {
    return <Container><Typography>Loading permissions...</Typography></Container>;
  }

  if (!hasPermission) {
    return <Container><Alert severity="error">{error}</Alert></Container>;
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4 }}>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      <Paper elevation={3} sx={{ p: 4 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <WarehouseIcon sx={{ fontSize: 40, mr: 2, color: 'primary.main' }} />
          <Box>
            <Typography variant="h4" gutterBottom>
              Warehouse & Aisle Management Dashboard
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              Comprehensive warehouse management with bin tracking, analytics, and space optimization
            </Typography>
          </Box>
        </Box>

        {/* Tutorial Accordion */}
        <Accordion sx={{ mb: 3 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <InfoIcon sx={{ mr: 1 }} />
              <Typography variant="h6">Dashboard Tutorial & Features</Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="body1" paragraph>
              <strong>Welcome to the Warehouse Management Dashboard! 🏭</strong> This powerful tool helps you manage 
              multiple warehouses, track storage utilization, and optimize your inventory space.
            </Typography>

            <Typography variant="h6" gutterBottom>Key Features:</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <ul>
                  <li><strong>Multi-Warehouse Management:</strong> Create and manage multiple warehouse locations</li>
                  <li><strong>Visual Analytics:</strong> Interactive charts showing space utilization</li>
                  <li><strong>Bin Tracking:</strong> Monitor individual bin usage across all warehouses</li>
                  <li><strong>Capacity Planning:</strong> Forecast storage needs based on current usage</li>
                </ul>
              </Grid>
              <Grid item xs={12} md={6}>
                <ul>
                  <li><strong>Smart Alerts:</strong> Get notified about nearly full or empty bins</li>
                  <li><strong>Search & Filter:</strong> Quickly find bins and warehouses</li>
                  <li><strong>Export Ready:</strong> All data available for reporting</li>
                  <li><strong>Mobile Friendly:</strong> Access your warehouse data anywhere</li>
                </ul>
              </Grid>
            </Grid>

            <Alert severity="info" sx={{ mt: 2 }}>
              <strong>Pro Tip:</strong> Use the analytics tab to identify underutilized space and optimize 
              your warehouse layout for maximum efficiency.
            </Alert>
          </AccordionDetails>
        </Accordion>

        {/* Tabs */}
        <Paper sx={{ width: '100%', mb: 3 }}>
          <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
            <Tab label="Dashboard Overview" icon={<AnalyticsIcon />} />
            <Tab label="Warehouse Management" icon={<WarehouseIcon />} />
            <Tab label="Bin Locations" icon={<StorageIcon />} />
            <Tab label="Analytics" icon={<BarChartIcon />} />
          </Tabs>
        </Paper>

        {/* Tab 1: Dashboard Overview */}
        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={3}>
            {/* Key Metrics */}
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>Total Warehouses</Typography>
                  <Typography variant="h4">{warehouses.length}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>Total Bins</Typography>
                  <Typography variant="h4">{bins.length}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>Total Capacity</Typography>
                  <Typography variant="h4">{analyticsData?.total_capacity || 0}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>Overall Usage</Typography>
                  <Typography variant="h4">{analyticsData?.overall_usage_percentage || 0}%</Typography>
                  <LinearProgress 
                    variant="determinate" 
                    value={analyticsData?.overall_usage_percentage || 0} 
                    sx={{ mt: 1 }}
                  />
                </CardContent>
              </Card>
            </Grid>

            {/* Quick Actions */}
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Quick Actions</Typography>
                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog()}>
                      Add Warehouse
                    </Button>
                    <Button variant="outlined" onClick={() => setTabValue(2)}>
                      View All Bins
                    </Button>
                    <Button variant="outlined" onClick={() => setTabValue(3)}>
                      View Analytics
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Tab 2: Warehouse Management */}
        <TabPanel value={tabValue} index={1}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h5">Warehouse Management</Typography>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog()}>
              Add Warehouse
            </Button>
          </Box>

          <Grid container spacing={3}>
            {warehouses.map(warehouse => (
              <Grid item xs={12} md={6} key={warehouse.id}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                      <Box>
                        <Typography variant="h6">{warehouse.name}</Typography>
                        <Typography color="textSecondary">{warehouse.code}</Typography>
                      </Box>
                      <Chip 
                        label={warehouse.is_active ? 'Active' : 'Inactive'} 
                        color={warehouse.is_active ? 'success' : 'default'} 
                        size="small" 
                      />
                    </Box>

                    <Typography variant="body2" paragraph>{warehouse.description}</Typography>

                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" gutterBottom>
                        Capacity Usage: {warehouse.used_capacity || 0} / {warehouse.capacity} 
                        ({warehouse.usage_percentage || 0}%)
                      </Typography>
                      <LinearProgress 
                        variant="determinate" 
                        value={warehouse.usage_percentage || 0} 
                        color={warehouse.usage_percentage >= 80 ? 'error' : warehouse.usage_percentage >= 60 ? 'warning' : 'success'}
                      />
                    </Box>

                    <Typography variant="body2" gutterBottom>
                      📦 Bins: {warehouse.total_bins || 0} | 
                      📍 {warehouse.address || 'No address specified'}
                    </Typography>

                    <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                      <Button 
                        size="small" 
                        startIcon={<EditIcon />}
                        onClick={() => handleOpenDialog(warehouse)}
                        disabled={!hasUpdatePermission}
                      >
                        Edit
                      </Button>
                      <Button 
                        size="small" 
                        color="error" 
                        startIcon={<DeleteIcon />}
                        onClick={() => handleDeleteOpen(warehouse)}
                        disabled={!hasDeletePermission || (warehouse.total_bins || 0) > 0}
                      >
                        Delete
                      </Button>
                    </Box>

                    {/* NEW: Bin management section */}
                    <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid #eee' }}>
                      <Typography variant="subtitle1" gutterBottom>
                        Bins ({warehouse.total_bins})
                      </Typography>
                      
                      <Button 
                        size="small" 
                        variant="outlined" 
                        startIcon={<AddIcon />}
                        onClick={() => handleOpenBinDialog(null, warehouse.id)}
                        disabled={!hasCreateBinPermission}
                        sx={{ mb: 1 }}
                      >
                        Add Bin
                      </Button>

                      {warehouse.total_bins > 0 ? (
                        <Box sx={{ maxHeight: 200, overflow: 'auto' }}>
                          {warehouseBins
                            .filter(bin => bin.warehouse?.id === warehouse.id)
                            .map(bin => (
                              <Box 
                                key={bin.id} 
                                sx={{ 
                                  display: 'flex', 
                                  justifyContent: 'space-between', 
                                  alignItems: 'center',
                                  p: 1,
                                  borderBottom: '1px solid #f0f0f0'
                                }}
                              >
                                <Box>
                                  <Typography variant="body2" fontWeight="bold">
                                    {bin.bin_id}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {bin.location_display}
                                  </Typography>
                                </Box>
                                <Box>
                                  <Chip 
                                    label={`${bin.current_load}/${bin.capacity}`} 
                                    size="small" 
                                    color={bin.usage_percentage >= 80 ? 'error' : 'default'}
                                    sx={{ mr: 1 }}
                                  />
                                  <IconButton 
                                    size="small" 
                                    onClick={() => handleOpenBinDialog(bin, warehouse.id)}
                                    disabled={!hasUpdatePermission}
                                  >
                                    <EditIcon />
                                  </IconButton>
                                  <IconButton 
                                    size="small" 
                                    color="error"
                                    onClick={() => handleDeleteBin(bin)}
                                    disabled={!hasDeletePermission || bin.current_load > 0}
                                  >
                                    <DeleteIcon />
                                  </IconButton>
                                </Box>
                              </Box>
                            ))}
                        </Box>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          No bins assigned. Click "Add Bin" to create one.
                        </Typography>
                      )}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </TabPanel>

        {/* Tab 3: Bin Locations */}
        <TabPanel value={tabValue} index={2}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h5">Bin Locations</Typography>
            <TextField
              placeholder="Search bins..."
              size="small"
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              InputProps={{
                startAdornment: <SearchIcon />,
              }}
            />
          </Box>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Bin ID</TableCell>
                  <TableCell>Warehouse</TableCell>
                  <TableCell>Location</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Capacity</TableCell>
                  <TableCell>Usage</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {bins.map(bin => (
                  <TableRow key={bin.id}>
                    <TableCell>{bin.bin_id}</TableCell>
                    <TableCell>{bin.warehouse_name || '—'}</TableCell>
                    <TableCell>Row {bin.row}, Rack {bin.rack}{bin.shelf && `, Shelf ${bin.shelf}`}</TableCell>
                    <TableCell>{bin.type}</TableCell>
                    <TableCell>{bin.current_load || 0}/{bin.capacity}</TableCell>
                    <TableCell>
                      <LinearProgress 
                        variant="determinate" 
                        value={bin.usage_percentage || 0}
                        color={
                          bin.usage_percentage >= 80 ? 'error' : 
                          bin.usage_percentage >= 60 ? 'warning' : 'success'
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={
                          bin.usage_percentage >= 80 ? 'Nearly Full' : 
                          bin.usage_percentage <= 20 ? 'Mostly Empty' : 'Balanced'
                        }
                        size="small"
                        color={
                          bin.usage_percentage >= 80 ? 'error' : 
                          bin.usage_percentage <= 20 ? 'default' : 'primary'
                        }
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Pagination
            count={totalPages}
            page={page}
            onChange={(e, value) => setPage(value)}
            sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}
          />
        </TabPanel>

        {/* Tab 4: Analytics */}
        <TabPanel value={tabValue} index={3}>
          <Typography variant="h5" gutterBottom>Warehouse Analytics</Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Warehouse Usage Distribution</Typography>
                  {warehouses.length > 0 ? (
                    <Bar data={getWarehouseUsageData()} />
                  ) : (
                    <Typography>No warehouse data available</Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Bin Usage Distribution</Typography>
                  {analyticsData ? (
                    <Doughnut data={getBinDistributionData()} />
                  ) : (
                    <Typography>No analytics data available</Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>
      </Paper>

      {/* Add/Edit Warehouse Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedItem ? 'Edit Warehouse' : 'Add New Warehouse'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Warehouse Name *"
                name="name"
                value={formData.name}
                onChange={handleFormChange}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Warehouse Code *"
                name="code"
                value={formData.code}
                onChange={handleFormChange}
                required
                helperText="Unique identifier for the warehouse"
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
                rows={2}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Address"
                name="address"
                value={formData.address}
                onChange={handleFormChange}
                multiline
                rows={2}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Total Capacity *"
                name="capacity"
                type="number"
                value={formData.capacity}
                onChange={handleFormChange}
                required
                inputProps={{ min: 1 }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  name="is_active"
                  value={formData.is_active.toString()}
                  onChange={handleFormChange}
                  label="Status"
                >
                  <MenuItem value="true">Active</MenuItem>
                  <MenuItem value="false">Inactive</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleFormSubmit} variant="contained">
            {selectedItem ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* NEW: Bin Management Dialog */}
      <Dialog open={binDialog} onClose={handleCloseBinDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {selectedItem ? 'Edit Bin' : 'Add Bin to Warehouse'}
            <IconButton onClick={handleCloseBinDialog}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Bin ID *"
                name="bin_id"
                value={binFormData.bin_id}
                onChange={handleBinFormChange}
                required
                helperText="Unique identifier for the bin"
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Row *"
                name="row"
                value={binFormData.row}
                onChange={handleBinFormChange}
                required
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Rack *"
                name="rack"
                value={binFormData.rack}
                onChange={handleBinFormChange}
                required
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Shelf"
                name="shelf"
                value={binFormData.shelf}
                onChange={handleBinFormChange}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Type"
                name="type"
                value={binFormData.type}
                onChange={handleBinFormChange}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Capacity *"
                name="capacity"
                type="number"
                value={binFormData.capacity}
                onChange={handleBinFormChange}
                required
                inputProps={{ min: 1 }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseBinDialog}>Cancel</Button>
          <Button onClick={handleBinSubmit} variant="contained">
            {selectedItem ? 'Update' : 'Add to Warehouse'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog} onClose={handleDeleteClose}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the warehouse "{selectedItem?.name}"? 
            This action cannot be undone.
          </Typography>
          {selectedItem?.total_bins > 0 && (
            <Alert severity="error" sx={{ mt: 2 }}>
              Cannot delete warehouse that contains bins. Please reassign or delete the bins first.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteClose}>Cancel</Button>
          <Button 
            onClick={handleDelete} 
            color="error" 
            variant="contained"
            disabled={selectedItem?.total_bins > 0}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}