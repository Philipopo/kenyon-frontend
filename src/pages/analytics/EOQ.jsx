import React, { useState, useEffect, useCallback } from 'react';
import {
  Container, Typography, Paper, TextField, InputAdornment, Table, TableBody, TableCell, TableHead, TableRow,
  Pagination, Box, TableContainer, CircularProgress, Alert, Button, Dialog, DialogTitle, DialogContent,
  DialogActions, Grid, Select, MenuItem, Tabs, Tab, IconButton, Accordion, AccordionSummary, AccordionDetails
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import RemoveIcon from '@mui/icons-material/Remove';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useNavigate } from 'react-router-dom';
import API from '../../api';

function EOQRow({ eoq, items, onEdit, onDelete, hasUpdatePermission, hasDeletePermission }) {
  return (
    <TableRow>
      <TableCell>{items.find(i => i.id === eoq.item)?.name || 'N/A'}</TableCell>
      <TableCell>{eoq.part_number || 'N/A'}</TableCell>
      <TableCell>{eoq.demand_rate || 'N/A'}</TableCell>
      <TableCell>₦{parseFloat(eoq.ordering_cost || 0).toFixed(2)}</TableCell>
      <TableCell>₦{parseFloat(eoq.holding_cost || 0).toFixed(2)}</TableCell>
      <TableCell>{eoq.eoq || 'N/A'}</TableCell>
      <TableCell>{eoq.reorder_point || 'N/A'}</TableCell>
      <TableCell>₦{parseFloat(eoq.total_cost || 0).toFixed(2)}</TableCell>
      <TableCell>
        <IconButton
          onClick={() => onEdit(eoq)}
          color="primary"
          size="small"
          disabled={!hasUpdatePermission}
        >
          <EditIcon />
        </IconButton>
        <IconButton
          onClick={() => onDelete(eoq.id)}
          color="error"
          size="small"
          disabled={!hasDeletePermission}
        >
          <DeleteIcon />
        </IconButton>
      </TableCell>
    </TableRow>
  );
}

function SupplierRow({ supplier, onEdit, onDelete, hasUpdateSupplierPermission, hasDeleteSupplierPermission }) {
  return (
    <TableRow>
      <TableCell>{supplier.name}</TableCell>
      <TableCell>{supplier.lead_time_days}</TableCell>
      <TableCell>{supplier.min_order_quantity || '—'}</TableCell>
      <TableCell>{supplier.discount_threshold ? `${supplier.discount_percentage}%` : '—'}</TableCell>
      <TableCell>
        <IconButton
          onClick={() => onEdit(supplier)}
          color="primary"
          size="small"
          disabled={!hasUpdateSupplierPermission}
        >
          <EditIcon />
        </IconButton>
        <IconButton
          onClick={() => onDelete(supplier.id)}
          color="error"
          size="small"
          disabled={!hasDeleteSupplierPermission}
        >
          <DeleteIcon />
        </IconButton>
      </TableCell>
    </TableRow>
  );
}

export default function EOQReports() {
  const [tabValue, setTabValue] = useState(0);
  const [data, setData] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [open, setOpen] = useState(false);
  const [openMultipleEOQ, setOpenMultipleEOQ] = useState(false);
  const [openSupplier, setOpenSupplier] = useState(false);
  const [openDelete, setOpenDelete] = useState(false);
  const [openSupplierDelete, setOpenSupplierDelete] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [deleteSupplierId, setDeleteSupplierId] = useState(null);
  const [form, setForm] = useState({
    item: '', demand_rate: '', ordering_cost: '', holding_cost: '', lead_time_days: '', safety_stock: '', supplier: ''
  });
  const [multipleEOQForms, setMultipleEOQForms] = useState([{
    item: '', demand_rate: '', ordering_cost: '', holding_cost: '', lead_time_days: '', safety_stock: '', supplier: ''
  }]);
  const [supplierForm, setSupplierForm] = useState({
    name: '', lead_time_days: '7', min_order_quantity: '', discount_threshold: '', discount_percentage: ''
  });
  const [editId, setEditId] = useState(null);
  const [editSupplierId, setEditSupplierId] = useState(null);
  const [formAlert, setFormAlert] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [hasPageAccess, setHasPageAccess] = useState(false);
  const [checkingPermissions, setCheckingPermissions] = useState(true);
  const [canCreateEOQ, setCanCreateEOQ] = useState(false);
  const [canUpdateEOQ, setCanUpdateEOQ] = useState(false);
  const [canDeleteEOQ, setCanDeleteEOQ] = useState(false);
  const [canCreateSupplier, setCanCreateSupplier] = useState(false);
  const [canUpdateSupplier, setCanUpdateSupplier] = useState(false);
  const [canDeleteSupplier, setCanDeleteSupplier] = useState(false);
  const itemsPerPage = 10;
  const navigate = useNavigate();

  const checkAuth = useCallback(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      setError('⚠️ No authentication token found. Please log in.');
      setTimeout(() => navigate('/login'), 2000);
      return false;
    }
    return token;
  }, [navigate]);

  const fetchItems = useCallback(async () => {
    const token = checkAuth();
    if (!token) return;
    try {
      const response = await API.get('/inventory/items/', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setItems(response.data.results || response.data);
    } catch (err) {
      console.error('Error fetching items:', err);
      if (err.response?.status === 401) {
        setError('⚠️ Session expired. Please log in again.');
        navigate('/login');
      } else {
        setError(`❌ Failed to load items: ${err.response?.data?.detail || err.message}`);
      }
    }
  }, [checkAuth, navigate]);

  const fetchEOQReports = useCallback(async () => {
    const token = checkAuth();
    if (!token) return;
    try {
      const response = await API.get('/analytics/eoq-v2/', {
        params: { search, page, page_size: itemsPerPage },
        headers: { Authorization: `Bearer ${token}` },
      });
      setData(response.data.results || response.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching EOQ reports:', err);
      if (err.response?.status === 401) {
        setError('⚠️ Session expired. Please log in again.');
        navigate('/login');
      } else {
        setError(`❌ Failed to load EOQ reports: ${err.response?.data?.detail || err.message}`);
      }
      setLoading(false);
    }
  }, [checkAuth, navigate, search, page]);

  const fetchSuppliers = useCallback(async () => {
    const token = checkAuth();
    if (!token) return;
    try {
      const response = await API.get('/analytics/suppliers/', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSuppliers(response.data.results || response.data);
    } catch (err) {
      console.error('Error fetching suppliers:', err);
      if (err.response?.status === 401) {
        setError('⚠️ Session expired. Please log in again.');
        navigate('/login');
      } else {
        setError(`❌ Failed to load suppliers: ${err.response?.data?.detail || err.message}`);
      }
    }
  }, [checkAuth, navigate]);

  const checkPermissions = useCallback(async () => {
    setCheckingPermissions(true);
    const token = checkAuth();
    if (!token) {
      setHasPageAccess(false);
      setCheckingPermissions(false);
      return;
    }
    try {
      const responses = await Promise.all([
        API.get('/auth/permissions/page/analytics_eoq/'),
        API.get('/auth/permissions/action/create_eoq/'),
        API.get('/auth/permissions/action/update_eoq/'),
        API.get('/auth/permissions/action/delete_eoq/'),
        API.get('/auth/permissions/action/create_supplier/'),
        API.get('/auth/permissions/action/update_supplier/'),
        API.get('/auth/permissions/action/delete_supplier/'),
      ]);
      setHasPageAccess(responses[0].data.allowed);
      setCanCreateEOQ(responses[1].data.allowed);
      setCanUpdateEOQ(responses[2].data.allowed);
      setCanDeleteEOQ(responses[3].data.allowed);
      setCanCreateSupplier(responses[4].data.allowed);
      setCanUpdateSupplier(responses[5].data.allowed);
      setCanDeleteSupplier(responses[6].data.allowed);
      if (responses[0].data.allowed) {
        console.log('Fetching initial data');
        await Promise.all([fetchItems(), fetchEOQReports(), fetchSuppliers()]);
      } else {
        setError(`⚠️ ${responses[0].data.reason || 'No permission to view EOQ reports.'}`);
        navigate('/login');
      }
    } catch (err) {
      console.error('Error checking permissions:', err);
      if (err.response?.status === 401) {
        setError('⚠️ Authentication failed. Please log in again.');
        navigate('/login');
      } else {
        setError(`❌ Failed to check permissions: ${err.response?.data?.detail || err.message}`);
      }
      setHasPageAccess(false);
    } finally {
      setCheckingPermissions(false);
    }
  }, [checkAuth, fetchItems, fetchEOQReports, fetchSuppliers, navigate]);

  useEffect(() => {
    console.log('useEffect running for initial data fetch');
    checkPermissions();
    return () => {
      console.log('useEffect cleanup');
    };
  }, [checkPermissions]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const handleMultipleEOQChange = (index, e) => {
    const { name, value } = e.target;
    setMultipleEOQForms(prev => prev.map((form, i) => (i === index ? { ...form, [name]: value } : form)));
  };

  const addEOQForm = () => {
    setMultipleEOQForms(prev => [
      ...prev,
      { item: '', demand_rate: '', ordering_cost: '', holding_cost: '', lead_time_days: '', safety_stock: '', supplier: '' }
    ]);
  };

  const removeEOQForm = (index) => {
    setMultipleEOQForms(prev => prev.filter((_, i) => i !== index));
  };

  const handleSupplierChange = (e) => {
    const { name, value } = e.target;
    setSupplierForm({ ...supplierForm, [name]: value });
  };

  const handleCreateEOQ = async () => {
    const { item, demand_rate, ordering_cost, holding_cost, lead_time_days, safety_stock, supplier } = form;
    if (!item || !demand_rate || !ordering_cost || !holding_cost || !lead_time_days) {
      setFormAlert('⚠️ Please fill in all required fields.');
      return;
    }
    if (Number(demand_rate) <= 0 || Number(ordering_cost) <= 0 || Number(holding_cost) <= 0 || Number(lead_time_days) < 0) {
      setFormAlert('⚠️ Demand rate, ordering cost, and holding cost must be positive; lead time cannot be negative.');
      return;
    }
    try {
      setFormLoading(true);
      const token = checkAuth();
      if (!token) throw new Error('No authentication token found.');
      const payload = {
        item: Number(item),
        demand_rate: parseFloat(demand_rate),
        ordering_cost: parseFloat(ordering_cost),
        holding_cost: parseFloat(holding_cost),
        lead_time_days: parseInt(lead_time_days, 10),
        safety_stock: parseFloat(safety_stock) || 0,
        supplier: supplier ? Number(supplier) : null
      };
      if (editId) {
        const res = await API.patch(`/analytics/eoq-v2/${editId}/`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setData(prev => prev.map(d => (d.id === editId ? res.data : d)));
        setFormAlert('✅ EOQ report updated successfully.');
      } else {
        const res = await API.post('/analytics/eoq-v2/', payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setData(prev => [res.data, ...prev]);
        setFormAlert('✅ EOQ report created successfully.');
      }
      setOpen(false);
      setForm({ item: '', demand_rate: '', ordering_cost: '', holding_cost: '', lead_time_days: '', safety_stock: '', supplier: '' });
      setEditId(null);
    } catch (err) {
      console.error('Error saving EOQ report:', err.response?.data);
      setFormAlert(
        err.response?.data?.detail ||
        Object.entries(err.response?.data || {})
          .map(([field, msg]) => `${field}: ${Array.isArray(msg) ? msg.join(', ') : msg}`)
          .join('; ') ||
        '❌ Failed to save EOQ report.'
      );
    } finally {
      setFormLoading(false);
    }
  };

  const handleCreateMultipleEOQ = async () => {
    const validForms = multipleEOQForms.filter(form => 
      form.item && form.demand_rate && form.ordering_cost && form.holding_cost && form.lead_time_days &&
      Number(form.demand_rate) > 0 && Number(form.ordering_cost) > 0 && Number(form.holding_cost) > 0 && Number(form.lead_time_days) >= 0
    );
    if (validForms.length === 0) {
      setFormAlert('⚠️ At least one valid EOQ form is required.');
      return;
    }
    try {
      setFormLoading(true);
      const token = checkAuth();
      if (!token) throw new Error('No authentication token found.');
      const responses = await Promise.allSettled(
        validForms.map(form => 
          API.post('/analytics/eoq-v2/', {
            item: Number(form.item),
            demand_rate: parseFloat(form.demand_rate),
            ordering_cost: parseFloat(form.ordering_cost),
            holding_cost: parseFloat(form.holding_cost),
            lead_time_days: parseInt(form.lead_time_days, 10),
            safety_stock: parseFloat(form.safety_stock) || 0,
            supplier: form.supplier ? Number(form.supplier) : null
          }, {
            headers: { Authorization: `Bearer ${token}` },
          })
        )
      );
      const newEOQs = responses
        .map((res, index) => res.status === 'fulfilled' ? res.value.data : null)
        .filter(Boolean);
      setData(prev => [...newEOQs, ...prev]);
      const errors = responses
        .map((res, index) => 
          res.status === 'rejected' 
            ? `Item ${validForms[index].item}: ${res.reason.response?.data?.detail || res.reason.message}`
            : null
        )
        .filter(Boolean);
      if (errors.length > 0) {
        setFormAlert(`⚠️ Some EOQ reports failed: ${errors.join('; ')}`);
      } else {
        setFormAlert(`✅ Successfully created ${newEOQs.length} EOQ report(s).`);
      }
      setOpenMultipleEOQ(false);
      setMultipleEOQForms([{ item: '', demand_rate: '', ordering_cost: '', holding_cost: '', lead_time_days: '', safety_stock: '', supplier: '' }]);
    } catch (err) {
      console.error('Error saving multiple EOQ reports:', err);
      setFormAlert(err.response?.data?.detail || '❌ Failed to save EOQ reports.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteEOQ = async () => {
    if (!canDeleteEOQ) {
      setFormAlert('⚠️ No permission to delete EOQ reports.');
      return;
    }
    try {
      const token = checkAuth();
      if (!token) throw new Error('No authentication token found.');
      await API.delete(`/analytics/eoq-v2/${deleteId}/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setData(prev => prev.filter(d => d.id !== deleteId));
      setOpenDelete(false);
      setDeleteId(null);
      setFormAlert('✅ EOQ report deleted successfully.');
    } catch (err) {
      console.error('Error deleting EOQ report:', err);
      setFormAlert(err.response?.data?.detail || '❌ Failed to delete EOQ report.');
    }
  };

  const handleCreateSupplier = async () => {
    const { name, lead_time_days, min_order_quantity, discount_threshold, discount_percentage } = supplierForm;
    if (!name || !lead_time_days) {
      setFormAlert('⚠️ Name and lead time are required.');
      return;
    }
    if (Number(lead_time_days) < 1) {
      setFormAlert('⚠️ Lead time must be positive.');
      return;
    }
    try {
      setFormLoading(true);
      const token = checkAuth();
      if (!token) throw new Error('No authentication token found.');
      const payload = {
        name,
        lead_time_days: Number(lead_time_days),
        min_order_quantity: min_order_quantity ? Number(min_order_quantity) : null,
        discount_threshold: discount_threshold ? Number(discount_threshold) : null,
        discount_percentage: discount_percentage ? Number(discount_percentage) : null
      };
      if (editSupplierId) {
        const res = await API.patch(`/analytics/suppliers/${editSupplierId}/`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setSuppliers(prev => prev.map(s => (s.id === editSupplierId ? res.data : s)));
        setFormAlert('✅ Supplier updated successfully.');
      } else {
        const res = await API.post('/analytics/suppliers/', payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setSuppliers(prev => [res.data, ...prev]);
        setFormAlert('✅ Supplier created successfully.');
      }
      setOpenSupplier(false);
      setSupplierForm({ name: '', lead_time_days: '7', min_order_quantity: '', discount_threshold: '', discount_percentage: '' });
      setEditSupplierId(null);
    } catch (err) {
      console.error('Error saving supplier:', err);
      setFormAlert(err.response?.data?.detail || '❌ Failed to save supplier.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteSupplier = async () => {
    if (!canDeleteSupplier) {
      setFormAlert('⚠️ No permission to delete suppliers.');
      return;
    }
    try {
      const token = checkAuth();
      if (!token) throw new Error('No authentication token found.');
      await API.delete(`/analytics/suppliers/${deleteSupplierId}/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSuppliers(prev => prev.filter(s => s.id !== deleteSupplierId));
      setOpenSupplierDelete(false);
      setDeleteSupplierId(null);
      setFormAlert('✅ Supplier deleted successfully.');
    } catch (err) {
      console.error('Error deleting supplier:', err);
      setFormAlert(err.response?.data?.detail || '❌ Failed to delete supplier.');
    }
  };

  const handleOpenEOQDialog = (eoq = null) => {
    if (!canCreateEOQ && !eoq) return setFormAlert('⚠️ No create permission.');
    if (!canUpdateEOQ && eoq) return setFormAlert('⚠️ No update permission.');
    if (eoq) {
      setForm({
        item: eoq.item,
        demand_rate: eoq.demand_rate.toString(),
        ordering_cost: eoq.ordering_cost.toString(),
        holding_cost: eoq.holding_cost.toString(),
        lead_time_days: eoq.lead_time_days.toString(),
        safety_stock: eoq.safety_stock.toString(),
        supplier: eoq.supplier || ''
      });
      setEditId(eoq.id);
    } else {
      setForm({ item: '', demand_rate: '', ordering_cost: '', holding_cost: '', lead_time_days: '', safety_stock: '', supplier: '' });
      setEditId(null);
    }
    setOpen(true);
  };

  const handleOpenMultipleEOQDialog = () => {
    if (!canCreateEOQ) return setFormAlert('⚠️ No create permission.');
    setMultipleEOQForms([{ item: '', demand_rate: '', ordering_cost: '', holding_cost: '', lead_time_days: '', safety_stock: '', supplier: '' }]);
    setOpenMultipleEOQ(true);
  };

  const handleOpenSupplierDialog = (supplier = null) => {
    if (!canCreateSupplier && !supplier) return setFormAlert('⚠️ No create supplier permission.');
    if (!canUpdateSupplier && supplier) return setFormAlert('⚠️ No update supplier permission.');
    if (supplier) {
      setSupplierForm({
        name: supplier.name,
        lead_time_days: supplier.lead_time_days.toString(),
        min_order_quantity: supplier.min_order_quantity?.toString() || '',
        discount_threshold: supplier.discount_threshold?.toString() || '',
        discount_percentage: supplier.discount_percentage?.toString() || ''
      });
      setEditSupplierId(supplier.id);
    } else {
      setSupplierForm({ name: '', lead_time_days: '7', min_order_quantity: '', discount_threshold: '', discount_percentage: '' });
      setEditSupplierId(null);
    }
    setOpenSupplier(true);
  };

  const filteredData = data.filter((row) =>
    row.item_name?.toLowerCase().includes(search.toLowerCase()) ||
    row.part_number?.toLowerCase().includes(search.toLowerCase())
  );

  const paginatedData = filteredData.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  const chartData = paginatedData.map(eoq => ({
    name: eoq.item_name,
    eoq: eoq.eoq,
    current_stock: items.find(i => i.id === eoq.item)?.total_quantity || 0,
    reorder_point: eoq.reorder_point
  }));

  const costChartData = paginatedData.map(eoq => ({
    name: eoq.item_name,
    holding_cost: parseFloat(eoq.holding_cost_breakdown || 0),
    ordering_cost: parseFloat(eoq.ordering_cost_breakdown || 0)
  }));

  if (checkingPermissions) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Typography variant="h6">Loading permissions...</Typography>
        <CircularProgress sx={{ mt: 2 }} />
      </Container>
    );
  }

  if (!hasPageAccess) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error">{error || '⚠️ Access Denied: You do not have permission to view this page.'}</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom>Stock Optimization</Typography>
        <Typography variant="subtitle1" sx={{ mb: 3 }}>
          Manage EOQ reports and suppliers for efficient inventory management.
        </Typography>

        <Accordion sx={{ mb: 2 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6">Stock Optimization Guide</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="body1" paragraph>
              <strong>💡 What is Stock Optimization?</strong> This module uses Economic Order Quantity (EOQ) to minimize inventory costs and manage suppliers.
            </Typography>
            <Typography variant="body1" paragraph>
              <strong>📊 EOQ Formula:</strong> EOQ = √(2DS/H)
              <ul>
                <li><strong>D</strong>: Annual demand (units/year)</li>
                <li><strong>S</strong>: Ordering cost per order (₦)</li>
                <li><strong>H</strong>: Holding cost per unit per year (₦/unit/year)</li>
              </ul>
            </Typography>
            <Typography variant="body1" paragraph>
              <strong>✅ Features:</strong>
              <ul>
                <li><strong>EOQ Dashboard</strong>: Create, edit, and delete EOQ reports.</li>
                <li><strong>Suppliers</strong>: Manage supplier data for lead times and discounts.</li>
              </ul>
            </Typography>
          </AccordionDetails>
        </Accordion>

        <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)} sx={{ mb: 2 }}>
          <Tab label="EOQ Dashboard" />
          <Tab label="Suppliers" />
        </Tabs>

        {formAlert && (
          <Alert sx={{ mb: 2 }} severity={formAlert.includes('successfully') ? 'success' : 'error'} onClose={() => setFormAlert(null)}>
            {formAlert}
          </Alert>
        )}

        {tabValue === 0 && (
          <>
            <Box display="flex" justifyContent="space-between" mb={2}>
              <TextField
                placeholder="Search by item or part number..."
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
              <Box>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => handleOpenEOQDialog()}
                  disabled={!canCreateEOQ || items.length === 0}
                  sx={{ mr: 1 }}
                >
                  Add EOQ Report
                </Button>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={handleOpenMultipleEOQDialog}
                  disabled={!canCreateEOQ || items.length === 0}
                >
                  Add Multiple EOQ Reports
                </Button>
              </Box>
            </Box>

            {loading ? (
              <Box display="flex" justifyContent="center" my={4}>
                <CircularProgress />
              </Box>
            ) : error ? (
              <Alert severity="error">{error}</Alert>
            ) : (
              <>
                <Box sx={{ mb: 4 }}>
                  <Typography variant="h6" gutterBottom>Inventory Levels</Typography>
                  {paginatedData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={chartData}>
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="eoq" fill="#8884d8" name="EOQ (units)" />
                        <Bar dataKey="current_stock" fill="#82ca9d" name="Current Stock (units)" />
                        <Bar dataKey="reorder_point" fill="#ffc107" name="Reorder Point (units)" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      No data available for chart
                    </Typography>
                  )}
                </Box>
                <Box sx={{ mb: 4 }}>
                  <Typography variant="h6" gutterBottom>Cost Breakdown</Typography>
                  {paginatedData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={costChartData}>
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="holding_cost" fill="#8884d8" name="Holding Cost (₦)" />
                        <Bar dataKey="ordering_cost" fill="#82ca9d" name="Ordering Cost (₦)" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      No data available for chart
                    </Typography>
                  )}
                </Box>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Item</TableCell>
                        <TableCell>Part Number</TableCell>
                        <TableCell>Demand Rate (units/year)</TableCell>
                        <TableCell>Order Cost (₦)</TableCell>
                        <TableCell>Holding Cost (₦/unit/year)</TableCell>
                        <TableCell>EOQ (units)</TableCell>
                        <TableCell>Reorder Point</TableCell>
                        <TableCell>Total Cost (₦)</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {paginatedData.length > 0 ? (
                        paginatedData.map((row, index) => (
                          <EOQRow
                            key={row.id || index}
                            eoq={row}
                            items={items}
                            onEdit={handleOpenEOQDialog}
                            onDelete={(id) => {
                              setDeleteId(id);
                              setOpenDelete(true);
                            }}
                            hasUpdatePermission={canUpdateEOQ}
                            hasDeletePermission={canDeleteEOQ}
                          />
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={9} align="center">
                            No matching records found.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
                <Box display="flex" justifyContent="center" mt={3}>
                  <Pagination
                    count={Math.ceil(filteredData.length / itemsPerPage)}
                    page={page}
                    onChange={(_, value) => setPage(value)}
                    color="primary"
                  />
                </Box>
              </>
            )}
          </>
        )}

        {tabValue === 1 && (
          <>
            <Box display="flex" justifyContent="space-between" mb={2}>
              <Typography variant="h6">Suppliers</Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => handleOpenSupplierDialog()}
                disabled={!canCreateSupplier}
              >
                Add Supplier
              </Button>
            </Box>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Lead Time (days)</TableCell>
                    <TableCell>Min Order Quantity</TableCell>
                    <TableCell>Discount</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {suppliers.length > 0 ? (
                    suppliers.map(supplier => (
                      <SupplierRow
                        key={supplier.id}
                        supplier={supplier}
                        onEdit={handleOpenSupplierDialog}
                        onDelete={(id) => {
                          setDeleteSupplierId(id);
                          setOpenSupplierDelete(true);
                        }}
                        hasUpdateSupplierPermission={canUpdateSupplier}
                        hasDeleteSupplierPermission={canDeleteSupplier}
                      />
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} align="center">
                        <Typography variant="body2" color="textSecondary">No suppliers found.</Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        )}

        <Typography variant="body2" color="text.secondary" sx={{ mt: 4 }}>
          EOQ helps in minimizing total inventory costs. Review reports and supplier data to optimize restocking efficiency.
        </Typography>

        <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
          <DialogTitle>{editId ? '✏️ Edit EOQ Report' : '➕ Add EOQ Report'}</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <Select
                  name="item"
                  value={form.item}
                  onChange={handleChange}
                  fullWidth
                  displayEmpty
                  renderValue={(value) => {
                    const selected = items.find(i => i.id === value);
                    return selected ? `${selected.name} (${selected.part_number || 'No PN'})` : 'Select Item';
                  }}
                  disabled={items.length === 0}
                >
                  {items.map(item => (
                    <MenuItem key={item.id} value={item.id}>
                      {item.name} ({item.part_number || 'No PN'})
                    </MenuItem>
                  ))}
                </Select>
                {items.length === 0 && (
                  <Typography color="error" variant="caption">
                    No items available. Add items first.
                  </Typography>
                )}
              </Grid>
              <Grid item xs={12}>
                <TextField
                  name="demand_rate"
                  label="Demand Rate (units/year)"
                  type="number"
                  fullWidth
                  value={form.demand_rate}
                  onChange={handleChange}
                  required
                  inputProps={{ min: 1 }}
                  error={Number(form.demand_rate) <= 0}
                  helperText={Number(form.demand_rate) <= 0 ? 'Must be positive' : ''}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  name="ordering_cost"
                  label="Order Cost (₦)"
                  type="number"
                  fullWidth
                  value={form.ordering_cost}
                  onChange={handleChange}
                  required
                  inputProps={{ step: "0.01", min: 0.01 }}
                  error={Number(form.ordering_cost) <= 0}
                  helperText={Number(form.ordering_cost) <= 0 ? 'Must be positive' : ''}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  name="holding_cost"
                  label="Holding Cost (₦/unit/year)"
                  type="number"
                  fullWidth
                  value={form.holding_cost}
                  onChange={handleChange}
                  required
                  inputProps={{ step: "0.01", min: 0.01 }}
                  error={Number(form.holding_cost) <= 0}
                  helperText={Number(form.holding_cost) <= 0 ? 'Must be positive' : ''}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  name="lead_time_days"
                  label="Lead Time (days)"
                  type="number"
                  fullWidth
                  value={form.lead_time_days}
                  onChange={handleChange}
                  required
                  inputProps={{ min: 0 }}
                  error={Number(form.lead_time_days) < 0}
                  helperText={Number(form.lead_time_days) < 0 ? 'Cannot be negative' : ''}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  name="safety_stock"
                  label="Safety Stock (units)"
                  type="number"
                  fullWidth
                  value={form.safety_stock}
                  onChange={handleChange}
                  inputProps={{ min: 0 }}
                  error={Number(form.safety_stock) < 0}
                  helperText={Number(form.safety_stock) < 0 ? 'Cannot be negative' : ''}
                />
              </Grid>
              <Grid item xs={12}>
                <Select
                  name="supplier"
                  value={form.supplier}
                  onChange={handleChange}
                  fullWidth
                  displayEmpty
                  renderValue={(value) => {
                    const selected = suppliers.find(s => s.id === value);
                    return selected ? `${selected.name} (Lead: ${selected.lead_time_days} days)` : 'Select Supplier';
                  }}
                >
                  <MenuItem value="">No Supplier</MenuItem>
                  {suppliers.map(supplier => (
                    <MenuItem key={supplier.id} value={supplier.id}>
                      {supplier.name} (Lead: {supplier.lead_time_days} days)
                    </MenuItem>
                  ))}
                </Select>
              </Grid>
            </Grid>
            {formAlert && open && (
              <Alert sx={{ mt: 2 }} severity={formAlert.includes('successfully') ? 'success' : 'error'}>
                {formAlert}
              </Alert>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              variant="contained"
              onClick={handleCreateEOQ}
              disabled={formLoading || (!editId && !canCreateEOQ) || (editId && !canUpdateEOQ) || items.length === 0}
            >
              {formLoading ? <CircularProgress size={24} color="inherit" /> : editId ? 'Update' : 'Create'}
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog open={openMultipleEOQ} onClose={() => setOpenMultipleEOQ(false)} fullWidth maxWidth="md">
          <DialogTitle>➕ Add Multiple EOQ Reports</DialogTitle>
          <DialogContent>
            {multipleEOQForms.map((form, index) => (
              <Box key={index} sx={{ mb: 3, p: 2, border: '1px solid #ddd', borderRadius: 2 }}>
                <Typography variant="h6" gutterBottom>EOQ Report {index + 1}</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Select
                      name="item"
                      value={form.item}
                      onChange={(e) => handleMultipleEOQChange(index, e)}
                      fullWidth
                      displayEmpty
                      renderValue={(value) => {
                        const selected = items.find(i => i.id === value);
                        return selected ? `${selected.name} (${selected.part_number || 'No PN'})` : 'Select Item';
                      }}
                      disabled={items.length === 0}
                    >
                      {items.map(item => (
                        <MenuItem key={item.id} value={item.id}>
                          {item.name} ({item.part_number || 'No PN'})
                        </MenuItem>
                      ))}
                    </Select>
                    {items.length === 0 && (
                      <Typography color="error" variant="caption">
                        No items available. Add items first.
                      </Typography>
                    )}
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      name="demand_rate"
                      label="Demand Rate (units/year)"
                      type="number"
                      fullWidth
                      value={form.demand_rate}
                      onChange={(e) => handleMultipleEOQChange(index, e)}
                      required
                      inputProps={{ min: 1 }}
                      error={Number(form.demand_rate) <= 0}
                      helperText={Number(form.demand_rate) <= 0 ? 'Must be positive' : ''}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      name="ordering_cost"
                      label="Order Cost (₦)"
                      type="number"
                      fullWidth
                      value={form.ordering_cost}
                      onChange={(e) => handleMultipleEOQChange(index, e)}
                      required
                      inputProps={{ step: "0.01", min: 0.01 }}
                      error={Number(form.ordering_cost) <= 0}
                      helperText={Number(form.ordering_cost) <= 0 ? 'Must be positive' : ''}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      name="holding_cost"
                      label="Holding Cost (₦/unit/year)"
                      type="number"
                      fullWidth
                      value={form.holding_cost}
                      onChange={(e) => handleMultipleEOQChange(index, e)}
                      required
                      inputProps={{ step: "0.01", min: 0.01 }}
                      error={Number(form.holding_cost) <= 0}
                      helperText={Number(form.holding_cost) <= 0 ? 'Must be positive' : ''}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      name="lead_time_days"
                      label="Lead Time (days)"
                      type="number"
                      fullWidth
                      value={form.lead_time_days}
                      onChange={(e) => handleMultipleEOQChange(index, e)}
                      required
                      inputProps={{ min: 0 }}
                      error={Number(form.lead_time_days) < 0}
                      helperText={Number(form.lead_time_days) < 0 ? 'Cannot be negative' : ''}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      name="safety_stock"
                      label="Safety Stock (units)"
                      type="number"
                      fullWidth
                      value={form.safety_stock}
                      onChange={(e) => handleMultipleEOQChange(index, e)}
                      inputProps={{ min: 0 }}
                      error={Number(form.safety_stock) < 0}
                      helperText={Number(form.safety_stock) < 0 ? 'Cannot be negative' : ''}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <Select
                      name="supplier"
                      value={form.supplier}
                      onChange={(e) => handleMultipleEOQChange(index, e)}
                      fullWidth
                      displayEmpty
                      renderValue={(value) => {
                        const selected = suppliers.find(s => s.id === value);
                        return selected ? `${selected.name} (Lead: ${selected.lead_time_days} days)` : 'Select Supplier';
                      }}
                    >
                      <MenuItem value="">No Supplier</MenuItem>
                      {suppliers.map(supplier => (
                        <MenuItem key={supplier.id} value={supplier.id}>
                          {supplier.name} (Lead: {supplier.lead_time_days} days)
                        </MenuItem>
                      ))}
                    </Select>
                  </Grid>
                  <Grid item xs={12}>
                    <Button
                      variant="outlined"
                      color="error"
                      startIcon={<RemoveIcon />}
                      onClick={() => removeEOQForm(index)}
                      disabled={multipleEOQForms.length === 1}
                    >
                      Remove
                    </Button>
                  </Grid>
                </Grid>
              </Box>
            ))}
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={addEOQForm}
              sx={{ mb: 2 }}
            >
              Add Another EOQ
            </Button>
            {formAlert && openMultipleEOQ && (
              <Alert sx={{ mt: 2 }} severity={formAlert.includes('successfully') ? 'success' : 'error'}>
                {formAlert}
              </Alert>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenMultipleEOQ(false)}>Cancel</Button>
            <Button
              variant="contained"
              onClick={handleCreateMultipleEOQ}
              disabled={formLoading || !canCreateEOQ || items.length === 0}
            >
              {formLoading ? <CircularProgress size={24} color="inherit" /> : 'Create All'}
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog open={openSupplier} onClose={() => setOpenSupplier(false)} fullWidth maxWidth="sm">
          <DialogTitle>{editSupplierId ? '✏️ Edit Supplier' : '➕ Add Supplier'}</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <TextField
                  name="name"
                  label="Supplier Name"
                  fullWidth
                  value={supplierForm.name}
                  onChange={handleSupplierChange}
                  required
                  error={!supplierForm.name}
                  helperText={!supplierForm.name ? 'Name is required' : ''}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  name="lead_time_days"
                  label="Lead Time (days)"
                  type="number"
                  fullWidth
                  value={supplierForm.lead_time_days}
                  onChange={handleSupplierChange}
                  required
                  inputProps={{ min: 1 }}
                  error={Number(supplierForm.lead_time_days) < 1}
                  helperText={Number(supplierForm.lead_time_days) < 1 ? 'Must be positive' : ''}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  name="min_order_quantity"
                  label="Min Order Quantity"
                  type="number"
                  fullWidth
                  value={supplierForm.min_order_quantity}
                  onChange={handleSupplierChange}
                  inputProps={{ min: 0 }}
                  error={Number(supplierForm.min_order_quantity) < 0}
                  helperText={Number(supplierForm.min_order_quantity) < 0 ? 'Cannot be negative' : ''}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  name="discount_threshold"
                  label="Discount Threshold (units)"
                  type="number"
                  fullWidth
                  value={supplierForm.discount_threshold}
                  onChange={handleSupplierChange}
                  inputProps={{ min: 0 }}
                  error={Number(supplierForm.discount_threshold) < 0}
                  helperText={Number(supplierForm.discount_threshold) < 0 ? 'Cannot be negative' : ''}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  name="discount_percentage"
                  label="Discount Percentage (%)"
                  type="number"
                  fullWidth
                  value={supplierForm.discount_percentage}
                  onChange={handleSupplierChange}
                  inputProps={{ min: 0, max: 100, step: "0.01" }}
                  error={Number(supplierForm.discount_percentage) < 0 || Number(supplierForm.discount_percentage) > 100}
                  helperText={Number(supplierForm.discount_percentage) < 0 || Number(supplierForm.discount_percentage) > 100 ? 'Must be between 0 and 100' : ''}
                />
              </Grid>
            </Grid>
            {formAlert && openSupplier && (
              <Alert sx={{ mt: 2 }} severity={formAlert.includes('successfully') ? 'success' : 'error'}>
                {formAlert}
              </Alert>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenSupplier(false)}>Cancel</Button>
            <Button
              variant="contained"
              onClick={handleCreateSupplier}
              disabled={formLoading || (!editSupplierId && !canCreateSupplier) || (editSupplierId && !canUpdateSupplier)}
            >
              {formLoading ? <CircularProgress size={24} color="inherit" /> : editSupplierId ? 'Update' : 'Create'}
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog open={openDelete} onClose={() => setOpenDelete(false)}>
          <DialogTitle>Delete EOQ Report?</DialogTitle>
          <DialogContent>
            <Typography>Are you sure? This cannot be undone.</Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenDelete(false)}>Cancel</Button>
            <Button color="error" onClick={handleDeleteEOQ}>Delete</Button>
          </DialogActions>
        </Dialog>

        <Dialog open={openSupplierDelete} onClose={() => setOpenSupplierDelete(false)}>
          <DialogTitle>Delete Supplier?</DialogTitle>
          <DialogContent>
            <Typography>Are you sure? This cannot be undone.</Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenSupplierDelete(false)}>Cancel</Button>
            <Button color="error" onClick={handleDeleteSupplier}>Delete</Button>
          </DialogActions>
        </Dialog>
      </Paper>
    </Container>
  );
}