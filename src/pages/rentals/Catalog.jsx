import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Container, Typography, Paper, Box, TextField, InputAdornment, Table,
  TableBody, TableCell, TableContainer, TableHead, TableRow, Pagination,
  CircularProgress, Alert, Button, Dialog, DialogTitle, DialogContent,
  DialogActions, Grid, IconButton, Accordion, AccordionSummary, AccordionDetails, MenuItem,
  Collapse
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import dayjs from 'dayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { debounce } from 'lodash';
import api from '../../api';
import { useSearch } from '../../context/SearchContext';

// Create debounced function outside component to avoid ESLint warning
const createDebouncedSetSearch = (setSearch, setPage) =>
  debounce((value) => {
    setSearch(value);
    setPage(1);
  }, 500);

export default function EquipmentCatalog() {
  const [catalog, setCatalog] = useState([]);
  const [branches, setBranches] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [isUpdate, setIsUpdate] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState(null);
  const [form, setForm] = useState({
    name: '',
    description: '',
    category: '',
    condition: '',
    location: '',
    branch: '',
    total_quantity: '1',
    available_quantity: '1',
    manufacture_date: null,
    expiry_date: null,
    image: null,
    imagePreview: null
  });
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [branchFormOpen, setBranchFormOpen] = useState(false);
  const [isBranchUpdate, setIsBranchUpdate] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [branchForm, setBranchForm] = useState({ name: '', code: '', address: '' });
  const [formError, setFormError] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [deleteType, setDeleteType] = useState('equipment');
  const [hasPageAccess, setHasPageAccess] = useState(false);
  const [checkingPermissions, setCheckingPermissions] = useState(true);
  const [canCreateEquipment, setCanCreateEquipment] = useState(false);
  const [canUpdateEquipment, setCanUpdateEquipment] = useState(false);
  const [canDeleteEquipment, setCanDeleteEquipment] = useState(false);
  const { searchTerm } = useSearch();
  const itemsPerPage = 10;
  const prevSearchTermRef = useRef(searchTerm);
  const prevSearchRef = useRef(search);

  // Memoize debounced function to ensure stable reference
  const debouncedSetSearch = useMemo(
    () => createDebouncedSetSearch(setSearch, setPage),
    [setSearch, setPage]
  );

  // Fetching
  const fetchEquipment = useCallback(async () => {
    try {
      setLoading(true);
      const searchValue = search || searchTerm;
      const res = await api.get('/rentals/equipment/', {
        params: { search: searchValue, page, page_size: itemsPerPage },
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
      });
      setCatalog(res.data.results || []);
      setTotalPages(Math.ceil(res.data.count / itemsPerPage));
      setError('');
    } catch (err) {
      console.error('Error fetching equipment:', err.response?.data || err.message);
      setError(`❌ Failed to fetch equipment: ${err.response?.data?.detail || err.message}`);
      setCatalog([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [search, searchTerm, page]);

  const fetchBranches = useCallback(async () => {
    try {
      const res = await api.get('/rentals/branches/', {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
      });
      setBranches(res.data.results || []);
    } catch (err) {
      console.error('Error fetching branches:', err);
    }
  }, []);

  // Permissions & Initial Load
  useEffect(() => {
    const checkPermissions = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        if (!token) {
          setError('⚠️ No authentication token found. Please log in.');
          setHasPageAccess(false);
          setCheckingPermissions(false);
          return;
        }
        const pageResponse = await api.get('/auth/permissions/page/rentals_equipment/');
        setHasPageAccess(pageResponse.data.allowed || false);
        if (!pageResponse.data.allowed) {
          setError(`⚠️ You do not have permission to view this page: ${pageResponse.data.reason || 'No reason provided'}`);
          setCheckingPermissions(false);
          return;
        }
        const [createResponse, updateResponse, deleteResponse] = await Promise.all([
          api.get('/auth/permissions/action/create_equipment/'),
          api.get('/auth/permissions/action/update_equipment/'),
          api.get('/auth/permissions/action/delete_equipment/'),
        ]);
        setCanCreateEquipment(createResponse.data.allowed || false);
        setCanUpdateEquipment(updateResponse.data.allowed || false);
        setCanDeleteEquipment(deleteResponse.data.allowed || false);
        if (pageResponse.data.allowed) {
          fetchEquipment();
          fetchBranches();
        }
      } catch (err) {
        console.error('Error checking permissions:', err.response?.data || err.message);
        setError(`⚠️ Failed to check permissions: ${err.response?.data?.detail || err.message}`);
        setHasPageAccess(false);
        setCheckingPermissions(false);
      } finally {
        setCheckingPermissions(false);
      }
    };
    checkPermissions();
  }, [fetchEquipment, fetchBranches]);

  useEffect(() => {
    if (hasPageAccess && (search !== prevSearchRef.current || searchTerm !== prevSearchTermRef.current)) {
      setPage(1);
      prevSearchRef.current = search;
      prevSearchTermRef.current = searchTerm;
    }
    if (hasPageAccess) fetchEquipment();
  }, [search, searchTerm, page, hasPageAccess, fetchEquipment]);

  // Equipment Form Handlers
  const handleFormChange = useCallback((e) => {
    const { name, value, files } = e.target;
    if (name === 'image') {
      const file = files[0];
      setForm(prev => ({
        ...prev,
        image: file,
        imagePreview: file ? URL.createObjectURL(file) : null
      }));
    } else {
      setForm(prev => ({ ...prev, [name]: value }));
    }
  }, []);

  const handleDateChange = useCallback((name, newValue) => {
    setForm(prev => ({ ...prev, [name]: newValue }));
  }, []);

  const handleSubmit = useCallback(async () => {
    const { name, description, category, condition, location, branch, total_quantity, available_quantity, manufacture_date, expiry_date, image } = form;
    if (!name || !category || !condition || !location || !branch) {
      setFormError('⚠ Please fill all required fields.');
      return;
    }
    
    const totalQty = parseInt(total_quantity);
    const availQty = parseInt(available_quantity);
    
    if (isNaN(totalQty) || totalQty < 1) {
      setFormError('⚠ Total quantity must be at least 1.');
      return;
    }
    
    if (isNaN(availQty) || availQty < 0 || availQty > totalQty) {
      setFormError('⚠ Available quantity must be between 0 and total quantity.');
      return;
    }

    if (isUpdate && !canUpdateEquipment) {
      setFormError('⚠ You do not have permission to update equipment.');
      return;
    }
    if (!isUpdate && !canCreateEquipment) {
      setFormError('⚠ You do not have permission to create equipment.');
      return;
    }
    
    try {
      setFormLoading(true);
      setFormError(null);

      const formData = new FormData();
      formData.append('name', name);
      if (description) formData.append('description', description);
      formData.append('category', category);
      formData.append('condition', condition);
      formData.append('location', location);
      formData.append('branch', branch);
      formData.append('total_quantity', totalQty);
      formData.append('available_quantity', availQty);
      if (manufacture_date) formData.append('manufacture_date', manufacture_date.format('YYYY-MM-DD'));
      if (expiry_date) formData.append('expiry_date', expiry_date.format('YYYY-MM-DD'));

      if (image instanceof File) {
        formData.append('image', image);
      }

      let res;
      if (isUpdate) {
        res = await api.put(`/rentals/equipment/${selectedEquipment.id}/`, formData);
        setCatalog(prev => prev.map((item) => (item.id === res.data.id ? res.data : item)));
        setFormError('✅ Equipment updated successfully.');
      } else {
        res = await api.post('/rentals/equipment/', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        setCatalog(prev => [res.data, ...prev]);
        setFormError('✅ Equipment created successfully.');
      }
      
      setFormOpen(false);
      setForm({
        name: '', description: '', category: '', condition: '', location: '', branch: '',
        total_quantity: '1', available_quantity: '1',
        manufacture_date: null, expiry_date: null, image: null, imagePreview: null
      });
      setIsUpdate(false);
      setSelectedEquipment(null);
      fetchEquipment();
    } catch (err) {
      let errorMsg = `Failed to ${isUpdate ? 'update' : 'create'} equipment.`;
      if (err.response?.data) {
        errorMsg = Object.entries(err.response.data)
          .map(([field, msg]) => `${field}: ${Array.isArray(msg) ? msg.join(', ') : msg}`)
          .join('; ');
      }
      setFormError(`❌ ${errorMsg}`);
    } finally {
      setFormLoading(false);
    }
  }, [form, isUpdate, canCreateEquipment, canUpdateEquipment, selectedEquipment, fetchEquipment]);

  const handleUpdate = useCallback((equipment) => {
    if (!canUpdateEquipment) {
      setError('⚠ You do not have permission to update equipment.');
      return;
    }
    setForm({
      name: equipment.name,
      description: equipment.description || '',
      category: equipment.category,
      condition: equipment.condition,
      location: equipment.location,
      branch: equipment.branch,
      total_quantity: equipment.total_quantity.toString(),
      available_quantity: equipment.available_quantity.toString(),
      manufacture_date: equipment.manufacture_date ? dayjs(equipment.manufacture_date) : null,
      expiry_date: equipment.expiry_date ? dayjs(equipment.expiry_date) : null,
      image: undefined,
      imagePreview: equipment.image || null
    });
    setSelectedEquipment(equipment);
    setIsUpdate(true);
    setFormOpen(true);
  }, [canUpdateEquipment]);

  const toggleRow = useCallback((id) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  // Branch Handlers
  const handleBranchFormChange = useCallback((e) => {
    setBranchForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  }, []);

  const handleBranchSubmit = useCallback(async () => {
    const { name, code, address } = branchForm;
    if (!name || !code || !address) {
      setFormError('⚠ Please fill all required fields.');
      return;
    }

    try {
      setFormLoading(true);
      setFormError(null);
      const payload = { name, code, address };
      
      if (isBranchUpdate) {
        await api.put(`/rentals/branches/${selectedBranch.id}/`, payload);
        setFormError('✅ Branch updated successfully.');
      } else {
        await api.post('/rentals/branches/', payload);
        setFormError('✅ Branch created successfully.');
      }
      
      setBranchFormOpen(false);
      setBranchForm({ name: '', code: '', address: '' });
      setIsBranchUpdate(false);
      setSelectedBranch(null);
      fetchBranches();
    } catch (err) {
      let errorMsg = `Failed to ${isBranchUpdate ? 'update' : 'create'} branch.`;
      if (err.response?.data) {
        errorMsg = Object.entries(err.response.data)
          .map(([field, msg]) => `${field}: ${Array.isArray(msg) ? msg.join(', ') : msg}`)
          .join('; ');
      }
      setFormError(`❌ ${errorMsg}`);
    } finally {
      setFormLoading(false);
    }
  }, [branchForm, isBranchUpdate, selectedBranch, fetchBranches]);

  const handleBranchUpdate = useCallback((branch) => {
    setBranchForm({
      name: branch.name,
      code: branch.code,
      address: branch.address
    });
    setSelectedBranch(branch);
    setIsBranchUpdate(true);
    setBranchFormOpen(true);
  }, []);

  const handleBranchDelete = useCallback((id) => {
    setDeleteId(id);
    setDeleteType('branch');
    setDeleteOpen(true);
  }, []);

  const handleDelete = useCallback(async () => {
    try {
      if (deleteType === 'equipment') {
        await api.delete(`/rentals/equipment/${deleteId}/`);
        setCatalog(prev => prev.filter((item) => item.id !== deleteId));
        setError('✅ Equipment deleted successfully.');
      } else {
        await api.delete(`/rentals/branches/${deleteId}/`);
        setBranches(prev => prev.filter((b) => b.id !== deleteId));
        setError('✅ Branch deleted successfully.');
      }
      setDeleteOpen(false);
      setDeleteId(null);
      setDeleteType('equipment');
      fetchEquipment();
      fetchBranches();
    } catch (err) {
      let errorMsg = `Failed to delete ${deleteType}.`;
      if (err.response?.data?.detail) {
        errorMsg = err.response.data.detail;
      }
      setError(`❌ ${errorMsg}`);
    }
  }, [deleteType, deleteId, fetchEquipment, fetchBranches]);

  const openDeleteDialog = useCallback((id, type = 'equipment') => {
    if (type === 'equipment' && !canDeleteEquipment) {
      setError('⚠ You do not have permission to delete equipment.');
      return;
    }
    setDeleteId(id);
    setDeleteType(type);
    setDeleteOpen(true);
  }, [canDeleteEquipment]);

  const getAvailabilityStatus = useCallback((available, total) => {
    if (available === 0) return 'Unavailable';
    if (available === total) return 'Available';
    return 'Partially Available';
  }, []);

  const getAvailabilityColor = useCallback((available, total) => {
    if (available === 0) return 'error';
    if (available === total) return 'success';
    return 'warning';
  }, []);

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
        <Alert severity="error">{error || 'Access Denied: You do not have permission to view this page.'}</Alert>
      </Container>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        {error && (
          <Alert severity={error.includes('❌') ? 'error' : 'success'} sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}
        <Paper elevation={3} sx={{ p: 4 }}>
          <Typography variant="h4" gutterBottom>
            Equipment Catalog
          </Typography>
          <Typography variant="subtitle1" sx={{ mb: 3 }}>
            Manage equipment and branches for rental operations
          </Typography>

          {/* Branch Management Accordion */}
          <Accordion sx={{ mb: 3 }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6">Manage Branches</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Box display="flex" justifyContent="space-between" mb={2}>
                <Typography variant="body2" color="textSecondary">
                  Create and manage physical locations for equipment
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={() => {
                    setBranchForm({ name: '', code: '', address: '' });
                    setIsBranchUpdate(false);
                    setBranchFormOpen(true);
                  }}
                >
                  Add Branch
                </Button>
              </Box>

              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell>Code</TableCell>
                      <TableCell>Address</TableCell>
                      <TableCell>Created By</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {branches.length > 0 ? (
                      branches.map((branch) => (
                        <TableRow key={branch.id}>
                          <TableCell>{branch.name}</TableCell>
                          <TableCell>{branch.code}</TableCell>
                          <TableCell>{branch.address}</TableCell>
                          <TableCell>{branch.created_by_name || 'N/A'}</TableCell>
                          <TableCell>
                            <IconButton onClick={() => handleBranchUpdate(branch)}>
                              <EditIcon />
                            </IconButton>
                            <IconButton onClick={() => handleBranchDelete(branch.id)}>
                              <DeleteIcon />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} align="center">
                          No branches found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </AccordionDetails>
          </Accordion>

          {/* Equipment Section */}
          <Box display="flex" justifyContent="space-between" mb={2}>
            <TextField
              placeholder="Search by name, category, or location..."
              variant="outlined"
              size="small"
              value={search}
              onChange={(e) => debouncedSetSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
            {canCreateEquipment && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => {
                  setForm({
                    name: '', description: '', category: '', condition: '', location: '',
                    branch: '', total_quantity: '1', available_quantity: '1',
                    manufacture_date: null, expiry_date: null, image: null, imagePreview: null
                  });
                  setIsUpdate(false);
                  setFormOpen(true);
                }}
              >
                Add Equipment
              </Button>
            )}
            <Button
              variant="outlined"
              onClick={async () => {
                try {
                  const response = await api.get('/rentals/reports/equipment-pdf/', {
                    responseType: 'blob',
                    headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
                  });
                  const url = window.URL.createObjectURL(new Blob([response.data]));
                  const link = document.createElement('a');
                  link.href = url;
                  link.setAttribute('download', 'equipment_inventory_report.pdf');
                  document.body.appendChild(link);
                  link.click();
                  link.remove();
                } catch (err) {
                  setError('❌ Failed to generate equipment report.');
                  console.error(err);
                }
              }}
            >
              Print Equipment Report (PDF)
            </Button>
          </Box>

          {loading ? (
            <Box display="flex" justifyContent="center" py={5}>
              <CircularProgress />
            </Box>
          ) : error && error.includes('❌') ? (
            <Alert severity="error">{error}</Alert>
          ) : (
            <>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell />
                      <TableCell>S/N</TableCell>
                      <TableCell>Name</TableCell>
                      <TableCell>Category</TableCell>
                      <TableCell>Condition</TableCell>
                      <TableCell>Location</TableCell>
                      <TableCell>Branch</TableCell>
                      <TableCell>Total Qty</TableCell>
                      <TableCell>Available Qty</TableCell>
                      <TableCell>Availability</TableCell>
                      <TableCell>Created By</TableCell>
                      {(canUpdateEquipment || canDeleteEquipment) && <TableCell>Actions</TableCell>}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {catalog.length > 0 ? (
                      catalog.map((item, index) => (
                        <React.Fragment key={item.id}>
                          <TableRow>
                            <TableCell>
                              <IconButton size="small" onClick={() => toggleRow(item.id)}>
                                {expandedRows.has(item.id) ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                              </IconButton>
                            </TableCell>
                            <TableCell>{(page - 1) * itemsPerPage + index + 1}</TableCell>
                            <TableCell>{item.name}</TableCell>
                            <TableCell>{item.category}</TableCell>
                            <TableCell>{item.condition}</TableCell>
                            <TableCell>{item.location}</TableCell>
                            <TableCell>{item.branch_name || '—'}</TableCell>
                            <TableCell>{item.total_quantity}</TableCell>
                            <TableCell>{item.available_quantity}</TableCell>
                            <TableCell>
                              <span style={{
                                display: 'inline-block',
                                width: '12px',
                                height: '12px',
                                borderRadius: '50%',
                                backgroundColor: getAvailabilityColor(item.available_quantity, item.total_quantity) === 'success' ? '#4caf50' :
                                                 getAvailabilityColor(item.available_quantity, item.total_quantity) === 'warning' ? '#ff9800' : '#f44336'
                              }} />
                              <span style={{ marginLeft: '8px' }}>
                                {getAvailabilityStatus(item.available_quantity, item.total_quantity)}
                              </span>
                            </TableCell>
                            <TableCell>{item.created_by_name || 'N/A'}</TableCell>
                            {(canUpdateEquipment || canDeleteEquipment) && (
                              <TableCell>
                                {canUpdateEquipment && (
                                  <IconButton onClick={() => handleUpdate(item)}>
                                    <EditIcon />
                                  </IconButton>
                                )}
                                {canDeleteEquipment && (
                                  <IconButton onClick={() => openDeleteDialog(item.id, 'equipment')}>
                                    <DeleteIcon />
                                  </IconButton>
                                )}
                              </TableCell>
                            )}
                          </TableRow>
                          <TableRow>
                            <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={12}>
                              <Collapse in={expandedRows.has(item.id)} timeout="auto" unmountOnExit>
                                <Box sx={{ p: 2, bgcolor: '#f9f9f9' }}>
                                  <Typography variant="subtitle2" gutterBottom>Details</Typography>
                                  <Grid container spacing={2}>
                                    <Grid item xs={12} md={6}>
                                      <Typography variant="body2"><strong>Description:</strong> {item.description || '—'}</Typography>
                                      <Typography variant="body2"><strong>Manufacture Date:</strong> {item.manufacture_date || '—'}</Typography>
                                      <Typography variant="body2"><strong>Expiry Date:</strong> {item.expiry_date || '—'}</Typography>
                                    </Grid>
                                    <Grid item xs={12} md={6}>
                                      {item.image ? (
                                        <Box>
                                          <Typography variant="body2" gutterBottom><strong>Image:</strong></Typography>
                                          <img src={item.image} alt={item.name} style={{ maxWidth: '200px', height: 'auto', border: '1px solid #ddd' }} />
                                        </Box>
                                      ) : (
                                        <Typography variant="body2"><strong>Image:</strong> —</Typography>
                                      )}
                                    </Grid>
                                  </Grid>
                                </Box>
                              </Collapse>
                            </TableCell>
                          </TableRow>
                        </React.Fragment>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={12} align="center">
                          No equipment found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>

              {totalPages > 1 && (
                <Box display="flex" justifyContent="center" mt={3}>
                  <Pagination
                    count={totalPages}
                    page={page}
                    onChange={(_, value) => setPage(value)}
                    color="primary"
                  />
                </Box>
              )}
            </>
          )}
        </Paper>

        {/* Equipment Form Dialog */}
        <Dialog open={formOpen} onClose={() => setFormOpen(false)} fullWidth maxWidth="sm">
          <DialogTitle>{isUpdate ? 'Update Equipment' : 'Add Equipment'}</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <TextField
                  label="Name"
                  name="name"
                  fullWidth
                  value={form.name}
                  onChange={handleFormChange}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Description"
                  name="description"
                  fullWidth
                  multiline
                  rows={3}
                  value={form.description}
                  onChange={handleFormChange}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Category"
                  name="category"
                  fullWidth
                  value={form.category}
                  onChange={handleFormChange}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Condition"
                  name="condition"
                  fullWidth
                  value={form.condition}
                  onChange={handleFormChange}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Location"
                  name="location"
                  fullWidth
                  value={form.location}
                  onChange={handleFormChange}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Branch"
                  name="branch"
                  select
                  fullWidth
                  value={form.branch}
                  onChange={handleFormChange}
                  required
                >
                  {branches.map((branch) => (
                    <MenuItem key={branch.id} value={branch.id}>
                      {branch.name} ({branch.code})
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Total Quantity"
                  name="total_quantity"
                  type="number"
                  fullWidth
                  value={form.total_quantity}
                  onChange={handleFormChange}
                  inputProps={{ min: 1 }}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Available Quantity"
                  name="available_quantity"
                  type="number"
                  fullWidth
                  value={form.available_quantity}
                  onChange={handleFormChange}
                  inputProps={{ min: 0 }}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <DatePicker
                  label="Manufacture Date"
                  value={form.manufacture_date}
                  onChange={(newValue) => handleDateChange('manufacture_date', newValue)}
                  renderInput={(params) => <TextField {...params} fullWidth />}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <DatePicker
                  label="Expiry Date"
                  value={form.expiry_date}
                  onChange={(newValue) => handleDateChange('expiry_date', newValue)}
                  renderInput={(params) => <TextField {...params} fullWidth />}
                />
              </Grid>
              <Grid item xs={12}>
                <Button variant="outlined" component="label" fullWidth>
                  {form.imagePreview ? 'Change Image' : 'Upload Image'}
                  <input
                    type="file"
                    hidden
                    accept="image/*"
                    onChange={handleFormChange}
                    name="image"
                  />
                </Button>
                {form.imagePreview && (
                  <Box mt={1} textAlign="center">
                    <img src={form.imagePreview} alt="Preview" style={{ maxWidth: '100%', maxHeight: '150px', objectFit: 'contain' }} />
                  </Box>
                )}
              </Grid>
            </Grid>
            {formError && (
              <Alert severity={formError.includes('❌') ? 'error' : 'success'} sx={{ mt: 2 }}>
                {formError}
              </Alert>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button variant="contained" onClick={handleSubmit} disabled={formLoading}>
              {isUpdate ? 'Update' : 'Submit'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Branch Form Dialog */}
        <Dialog open={branchFormOpen} onClose={() => setBranchFormOpen(false)} fullWidth maxWidth="sm">
          <DialogTitle>{isBranchUpdate ? 'Update Branch' : 'Add Branch'}</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <TextField
                  label="Name"
                  name="name"
                  fullWidth
                  value={branchForm.name}
                  onChange={handleBranchFormChange}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Code"
                  name="code"
                  fullWidth
                  value={branchForm.code}
                  onChange={handleBranchFormChange}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Address"
                  name="address"
                  fullWidth
                  multiline
                  rows={2}
                  value={branchForm.address}
                  onChange={handleBranchFormChange}
                  required
                />
              </Grid>
            </Grid>
            {formError && (
              <Alert severity={formError.includes('❌') ? 'error' : 'success'} sx={{ mt: 2 }}>
                {formError}
              </Alert>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setBranchFormOpen(false)}>Cancel</Button>
            <Button variant="contained" onClick={handleBranchSubmit} disabled={formLoading}>
              {isBranchUpdate ? 'Update' : 'Submit'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)}>
          <DialogTitle>Confirm Delete</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to delete this {deleteType}? This action cannot be undone.
              {deleteType === 'branch' && (
                <Typography color="error" variant="body2" sx={{ mt: 1 }}>
                  Note: You cannot delete a branch that has equipment assigned to it.
                </Typography>
              )}
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button variant="contained" color="error" onClick={handleDelete}>
              Delete
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </LocalizationProvider>
  );
}