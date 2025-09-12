import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Container, Typography, Paper, Box, TextField, InputAdornment, Table,
  TableBody, TableCell, TableContainer, TableHead, TableRow, Pagination,
  CircularProgress, Alert, Button, Dialog, DialogTitle, DialogContent,
  DialogActions, Grid, IconButton
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { debounce } from 'lodash';
import api from '../../api';
import { useSearch } from '../../context/SearchContext';

export default function EquipmentCatalog() {
  const [catalog, setCatalog] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [isUpdate, setIsUpdate] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState(null);
  const [form, setForm] = useState({ name: '', category: '', condition: '', location: '' });
  const [formError, setFormError] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [hasPageAccess, setHasPageAccess] = useState(false);
  const [checkingPermissions, setCheckingPermissions] = useState(true);
  const [canCreateEquipment, setCanCreateEquipment] = useState(false);
  const [canUpdateEquipment, setCanUpdateEquipment] = useState(false);
  const [canDeleteEquipment, setCanDeleteEquipment] = useState(false);
  const { searchTerm } = useSearch();
  const itemsPerPage = 10;
  const prevSearchTermRef = useRef(searchTerm);
  const prevSearchRef = useRef(search);

  const debouncedSetSearch = useCallback(
    debounce((value) => {
      setSearch(value);
      setPage(1);
    }, 500),
    []
  );

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
  }, [fetchEquipment]);

  useEffect(() => {
    if (hasPageAccess && (search !== prevSearchRef.current || searchTerm !== prevSearchTermRef.current)) {
      setPage(1);
      prevSearchRef.current = search;
      prevSearchTermRef.current = searchTerm;
    }
    if (hasPageAccess) fetchEquipment();
  }, [search, searchTerm, page, hasPageAccess, fetchEquipment]);

  const handleFormChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    if (!form.name || !form.category || !form.condition || !form.location) {
      setFormError('⚠ Please fill all required fields.');
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
      const payload = { ...form };
      if (isUpdate) {
        const res = await api.put(`/rentals/equipment/${selectedEquipment.id}/`, payload);
        setCatalog(catalog.map((item) => (item.id === res.data.id ? res.data : item)));
        setFormError('✅ Equipment updated successfully.');
      } else {
        const res = await api.post('/rentals/equipment/', payload);
        setCatalog([res.data, ...catalog]);
        setFormError('✅ Equipment created successfully.');
      }
      setFormOpen(false);
      setForm({ name: '', category: '', condition: '', location: '' });
      setIsUpdate(false);
      setSelectedEquipment(null);
      fetchEquipment();
    } catch (err) {
      let errorMsg = `Failed to ${isUpdate ? 'update' : 'create'} equipment: Unable to process request.`;
      if (err.response?.status === 400 && err.response?.data) {
        errorMsg = Object.entries(err.response.data)
          .map(([field, msg]) => `${field}: ${Array.isArray(msg) ? msg.join(', ') : msg}`)
          .join('; ');
      } else {
        errorMsg = err.response?.data?.detail || err.message;
      }
      setFormError(`❌ ${errorMsg}`);
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdate = (equipment) => {
    if (!canUpdateEquipment) {
      setError('⚠ You do not have permission to update equipment.');
      return;
    }
    setForm({
      name: equipment.name,
      category: equipment.category,
      condition: equipment.condition,
      location: equipment.location,
    });
    setSelectedEquipment(equipment);
    setIsUpdate(true);
    setFormOpen(true);
  };

  const handleDelete = async () => {
    if (!canDeleteEquipment) {
      setError('⚠ You do not have permission to delete equipment.');
      return;
    }
    try {
      await api.delete(`/rentals/equipment/${deleteId}/`);
      setCatalog(catalog.filter((item) => item.id !== deleteId));
      setError('✅ Equipment deleted successfully.');
      setDeleteOpen(false);
      setDeleteId(null);
      fetchEquipment();
    } catch (err) {
      let errorMsg = 'Failed to delete equipment: Unable to process request.';
      if (err.response?.status === 403) {
        errorMsg = `⚠ Permission denied: ${err.response.data.detail || 'You lack permission to delete equipment.'}`;
      } else {
        errorMsg = err.response?.data?.detail || err.message;
      }
      setError(`❌ ${errorMsg}`);
    }
  };

  const openDeleteDialog = (id) => {
    if (!canDeleteEquipment) {
      setError('⚠ You do not have permission to delete equipment.');
      return;
    }
    setDeleteId(id);
    setDeleteOpen(true);
  };

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
          Browse available equipment, categories, and locations
        </Typography>

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
                setForm({ name: '', category: '', condition: '', location: '' });
                setIsUpdate(false);
                setFormOpen(true);
              }}
            >
              Add Equipment
            </Button>
          )}
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
                    <TableCell>S/N</TableCell>
                    <TableCell>Name</TableCell>
                    <TableCell>Category</TableCell>
                    <TableCell>Condition</TableCell>
                    <TableCell>Location</TableCell>
                    <TableCell>Created By</TableCell>
                    {(canUpdateEquipment || canDeleteEquipment) && <TableCell>Actions</TableCell>}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {catalog.length > 0 ? (
                    catalog.map((item, index) => (
                      <TableRow key={item.id}>
                        <TableCell>{(page - 1) * itemsPerPage + index + 1}</TableCell>
                        <TableCell>{item.name}</TableCell>
                        <TableCell>{item.category}</TableCell>
                        <TableCell>{item.condition}</TableCell>
                        <TableCell>{item.location}</TableCell>
                        <TableCell>{item.created_by_name || 'N/A'}</TableCell>
                        {(canUpdateEquipment || canDeleteEquipment) && (
                          <TableCell>
                            {canUpdateEquipment && (
                              <IconButton onClick={() => handleUpdate(item)}>
                                <EditIcon />
                              </IconButton>
                            )}
                            {canDeleteEquipment && (
                              <IconButton onClick={() => openDeleteDialog(item.id)}>
                                <DeleteIcon />
                              </IconButton>
                            )}
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={canUpdateEquipment || canDeleteEquipment ? 7 : 6} align="center">
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
                error={form.name === '' && formError?.includes('required')}
                helperText={form.name === '' && formError?.includes('required') ? 'Name is required' : ''}
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
                error={form.category === '' && formError?.includes('required')}
                helperText={form.category === '' && formError?.includes('required') ? 'Category is required' : ''}
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
                error={form.condition === '' && formError?.includes('required')}
                helperText={form.condition === '' && formError?.includes('required') ? 'Condition is required' : ''}
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
                error={form.location === '' && formError?.includes('required')}
                helperText={form.location === '' && formError?.includes('required') ? 'Location is required' : ''}
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
          <Button onClick={() => setFormOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmit} disabled={formLoading}>
            {isUpdate ? 'Update' : 'Submit'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete this equipment?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteOpen(false)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDelete}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}