import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Container, Typography, Paper, Box, TextField, InputAdornment, Table, TableHead,
  TableRow, TableCell, TableBody, TableContainer, Pagination, CircularProgress, Alert,
  Button, Dialog, DialogTitle, DialogContent, DialogActions, Grid, MenuItem, Select,
  FormControl, InputLabel, IconButton
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { debounce } from 'lodash';
import api from '../../api';
import { useSearch } from '../../context/SearchContext';

export default function ActiveRentals() {
  const [rentals, setRentals] = useState([]);
  const [equipmentList, setEquipmentList] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [isUpdate, setIsUpdate] = useState(false);
  const [selectedRental, setSelectedRental] = useState(null);
  const [form, setForm] = useState({ equipment: '', start_date: '', due_date: '', status: 'Active' });
  const [formError, setFormError] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [hasPageAccess, setHasPageAccess] = useState(false);
  const [checkingPermissions, setCheckingPermissions] = useState(true);
  const [canCreateRental, setCanCreateRental] = useState(false);
  const [canUpdateRental, setCanUpdateRental] = useState(false);
  const [canDeleteRental, setCanDeleteRental] = useState(false);
  const { searchTerm } = useSearch();
  const itemsPerPage = 10;
  const prevSearchTermRef = useRef(searchTerm);
  const prevSearchRef = useRef(search);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedSetSearch = useCallback(
    debounce((value) => {
      setSearch(value);
      setPage(1);
    }, 500),
    []
  );

  const fetchRentals = useCallback(async () => {
    try {
      setLoading(true);
      const searchValue = search || searchTerm;
      const res = await api.get('/rentals/rentals/', {
        params: { search: searchValue, page, page_size: itemsPerPage },
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
      });
      setRentals(Array.isArray(res.data.results) ? res.data.results : Array.isArray(res.data) ? res.data : []);
      setTotalPages(Math.ceil((res.data.count || 0) / itemsPerPage));
      setError('');
    } catch (err) {
      console.error('Error fetching rentals:', err.response?.data || err.message);
      setError(`❌ Failed to fetch rentals: ${err.response?.data?.detail || err.message}`);
      setRentals([]);
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
        const pageResponse = await api.get('/auth/permissions/page/rentals_active/');
        console.log('Page permission response:', pageResponse.data);
        setHasPageAccess(pageResponse.data.allowed || false);
        if (!pageResponse.data.allowed) {
          setError(`⚠️ You do not have permission to view this page: ${pageResponse.data.reason || 'No reason provided'}`);
          setCheckingPermissions(false);
          return;
        }
        const [createResponse, updateResponse, deleteResponse, equipmentResponse] = await Promise.all([
          api.get('/auth/permissions/action/create_rental/'),
          api.get('/auth/permissions/action/update_rental/'),
          api.get('/auth/permissions/action/delete_rental/'),
          api.get('/rentals/equipment/', { params: { page_size: 100 } }),
        ]);
        console.log('Equipment API response:', equipmentResponse.data);
        setCanCreateRental(createResponse.data.allowed || false);
        setCanUpdateRental(updateResponse.data.allowed || false);
        setCanDeleteRental(deleteResponse.data.allowed || false);
        setEquipmentList(Array.isArray(equipmentResponse.data.results) ? equipmentResponse.data.results : Array.isArray(equipmentResponse.data) ? equipmentResponse.data : []);
        if (pageResponse.data.allowed) {
          fetchRentals();
        }
      } catch (err) {
        console.error('Error checking permissions or fetching equipment:', err.response?.data || err.message);
        setError(`⚠️ Failed to check permissions or fetch equipment: ${err.response?.data?.detail || err.message}`);
        setHasPageAccess(false);
        setEquipmentList([]);
      } finally {
        setCheckingPermissions(false);
      }
    };
    checkPermissions();
  }, [fetchRentals]);

  useEffect(() => {
    if (hasPageAccess && (search !== prevSearchRef.current || searchTerm !== prevSearchTermRef.current)) {
      setPage(1);
      prevSearchRef.current = search;
      prevSearchTermRef.current = searchTerm;
    }
    if (hasPageAccess) fetchRentals();
  }, [search, searchTerm, page, hasPageAccess, fetchRentals]);

  const handleFormChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    if (!form.equipment || !form.start_date || !form.due_date) {
      setFormError('⚠ Please fill all required fields.');
      return;
    }
    if (new Date(form.start_date) > new Date(form.due_date)) {
      setFormError('⚠ Due date must be after start date.');
      return;
    }
    if (isUpdate && !canUpdateRental) {
      setFormError('⚠ You do not have permission to update a rental.');
      return;
    }
    if (!isUpdate && !canCreateRental) {
      setFormError('⚠ You do not have permission to create a rental.');
      return;
    }
    try {
      setFormLoading(true);
      setFormError(null);
      const payload = {
        equipment: form.equipment,
        start_date: form.start_date,
        due_date: form.due_date,
        status: form.status,
      };
      if (isUpdate) {
        const res = await api.put(`/rentals/rentals/${selectedRental.id}/`, payload);
        setRentals(rentals.map((r) => (r.id === res.data.id ? res.data : r)));
        setFormError('✅ Rental updated successfully.');
      } else {
        const res = await api.post('/rentals/rentals/', payload);
        setRentals([res.data, ...rentals]);
        setFormError('✅ Rental created successfully.');
      }
      setFormOpen(false);
      setForm({ equipment: '', start_date: '', due_date: '', status: 'Active' });
      setIsUpdate(false);
      setSelectedRental(null);
      fetchRentals();
    } catch (err) {
      let errorMsg = `Failed to ${isUpdate ? 'update' : 'create'} rental: Unable to process request.`;
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

  const handleUpdate = (rental) => {
    if (!canUpdateRental) {
      setError('⚠ You do not have permission to update a rental.');
      return;
    }
    setForm({
      equipment: rental.equipment,
      start_date: rental.start_date,
      due_date: rental.due_date,
      status: rental.status,
    });
    setSelectedRental(rental);
    setIsUpdate(true);
    setFormOpen(true);
  };

  const handleDelete = async () => {
    if (!canDeleteRental) {
      setError('⚠ You do not have permission to delete a rental.');
      return;
    }
    try {
      await api.delete(`/rentals/rentals/${deleteId}/`);
      setRentals(rentals.filter((r) => r.id !== deleteId));
      setError('✅ Rental deleted successfully.');
      setDeleteOpen(false);
      setDeleteId(null);
      fetchRentals();
    } catch (err) {
      let errorMsg = 'Failed to delete rental: Unable to process request.';
      if (err.response?.status === 403) {
        errorMsg = `⚠ Permission denied: ${err.response.data.detail || 'You lack permission to delete rentals.'}`;
      } else {
        errorMsg = err.response?.data?.detail || err.message;
      }
      setError(`❌ ${errorMsg}`);
    }
  };

  const openDeleteDialog = (id) => {
    if (!canDeleteRental) {
      setError('⚠ You do not have permission to delete a rental.');
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
        <Typography variant="h4" gutterBottom>Active Rentals</Typography>
        <Typography variant="subtitle1" sx={{ mb: 3 }}>
          All currently active or overdue rental records.
        </Typography>

        <Box display="flex" justifyContent="space-between" mb={2}>
          <TextField
            placeholder="Search by renter, equipment, or code..."
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
          {canCreateRental && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => {
                setForm({ equipment: '', start_date: '', due_date: '', status: 'Active' });
                setIsUpdate(false);
                setFormOpen(true);
              }}
            >
              Add Rental
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
                    <TableCell>Code</TableCell>
                    <TableCell>Renter</TableCell>
                    <TableCell>Equipment</TableCell>
                    <TableCell>Start Date</TableCell>
                    <TableCell>Due Date</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Created By</TableCell>
                    {(canUpdateRental || canDeleteRental) && <TableCell>Actions</TableCell>}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rentals.length > 0 ? (
                    rentals.map((rental, index) => (
                      <TableRow key={rental.id}>
                        <TableCell>{(page - 1) * itemsPerPage + index + 1}</TableCell>
                        <TableCell>{rental.code}</TableCell>
                        <TableCell>{rental.renter_name}</TableCell>
                        <TableCell>{rental.equipment_name}</TableCell>
                        <TableCell>{new Date(rental.start_date).toLocaleDateString()}</TableCell>
                        <TableCell>{new Date(rental.due_date).toLocaleDateString()}</TableCell>
                        <TableCell>{rental.status}</TableCell>
                        <TableCell>{rental.created_by_name || 'N/A'}</TableCell>
                        {(canUpdateRental || canDeleteRental) && (
                          <TableCell>
                            {canUpdateRental && (
                              <IconButton onClick={() => handleUpdate(rental)}>
                                <EditIcon />
                              </IconButton>
                            )}
                            {canDeleteRental && (
                              <IconButton onClick={() => openDeleteDialog(rental.id)}>
                                <DeleteIcon />
                              </IconButton>
                            )}
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={canUpdateRental || canDeleteRental ? 9 : 8} align="center">
                        No rentals found.
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
        <DialogTitle>{isUpdate ? 'Update Rental' : 'Add Rental'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <FormControl fullWidth required>
                <InputLabel id="equipment-label">Equipment</InputLabel>
                <Select
                  labelId="equipment-label"
                  name="equipment"
                  value={form.equipment}
                  label="Equipment"
                  onChange={handleFormChange}
                >
                  <MenuItem value="" disabled>-- Select Equipment --</MenuItem>
                  {Array.isArray(equipmentList) && equipmentList.length > 0 ? (
                    equipmentList.map((eq) => (
                      <MenuItem key={eq.id} value={eq.id}>{eq.name}</MenuItem>
                    ))
                  ) : (
                    <MenuItem value="" disabled>No equipment available</MenuItem>
                  )}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <TextField
                name="start_date"
                label="Start Date"
                type="date"
                fullWidth
                InputLabelProps={{ shrink: true }}
                value={form.start_date}
                onChange={handleFormChange}
                required
                error={form.start_date === '' && formError?.includes('required')}
                helperText={form.start_date === '' && formError?.includes('required') ? 'Start date is required' : ''}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                name="due_date"
                label="Due Date"
                type="date"
                fullWidth
                InputLabelProps={{ shrink: true }}
                value={form.due_date}
                onChange={handleFormChange}
                required
                error={form.due_date === '' && formError?.includes('required')}
                helperText={form.due_date === '' && formError?.includes('required') ? 'Due date is required' : ''}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth required>
                <InputLabel>Status</InputLabel>
                <Select name="status" value={form.status} onChange={handleFormChange}>
                  <MenuItem value="Active">Active</MenuItem>
                  <MenuItem value="Overdue">Overdue</MenuItem>
                </Select>
              </FormControl>
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
          <Typography>Are you sure you want to delete this rental?</Typography>
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