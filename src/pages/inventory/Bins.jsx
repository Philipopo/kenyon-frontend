import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Container, Typography, Paper, Grid, TextField, Button, Modal, Box, InputAdornment,
  Pagination, Alert, Table, TableHead, TableRow, TableCell, TableBody, Dialog,
  DialogTitle, DialogContent, DialogContentText, DialogActions, IconButton,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { debounce } from 'lodash';
import API from '../../api';
import { useSearch } from '../../context/SearchContext';

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

const generateBinId = (row, rack, shelf) => `A${row}-R${rack}-S${shelf}`;

export default function BinLocations() {
  const [bins, setBins] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [formData, setFormData] = useState({
    row: '', rack: '', shelf: '', type: '', capacity: '', used: '', description: '',
  });
  const [open, setOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [editId, setEditId] = useState(null);
  const [localSearch, setLocalSearch] = useState('');
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [checkingPermissions, setCheckingPermissions] = useState(true);
  const [hasPermission, setHasPermission] = useState(false);
  const [hasUpdatePermission, setHasUpdatePermission] = useState(false);
  const [hasDeletePermission, setHasDeletePermission] = useState(false);
  const [selectedBin, setSelectedBin] = useState(null);
  const { searchTerm } = useSearch();
  const binsPerPage = 10;
  const prevSearchTermRef = useRef(searchTerm);
  const prevLocalSearchRef = useRef(localSearch);

  // Debounced local search handler
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedSetLocalSearch = useCallback(
    debounce((value) => {
      setLocalSearch(value);
      setPage(1);
    }, 500),
    []
  );

  const fetchBins = useCallback(async () => {
    try {
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
  }, [fetchBins]); // Added fetchBins to dependency array

  useEffect(() => {
    if (hasPermission) {
      if (searchTerm !== prevSearchTermRef.current || localSearch !== prevLocalSearchRef.current) {
        setPage(1);
        prevSearchTermRef.current = searchTerm;
        prevLocalSearchRef.current = localSearch;
      }
      fetchBins();
    }
  }, [searchTerm, localSearch, page, hasPermission, fetchBins]); // Added fetchBins to dependency array

  const handleOpen = async (bin = null) => {
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
          row: bin.row, rack: bin.rack, shelf: bin.shelf, type: bin.type,
          capacity: bin.capacity.toString(), used: bin.used.toString(), description: bin.description || '',
        });
        setEditId(bin.id);
      } else {
        setFormData({ row: '', rack: '', shelf: '', type: '', capacity: '', used: '', description: '' });
        setEditId(null);
      }
      setOpen(true);
    } catch (err) {
      console.error(`Error checking ${bin ? 'update' : 'create'} permission:`, err.response?.data || err.message);
      setError(`❌ Failed to check ${bin ? 'update' : 'create'} permission: ${err.response?.data?.detail || err.message}`);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setFormData({ row: '', rack: '', shelf: '', type: '', capacity: '', used: '', description: '' });
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveBin = async () => {
    const { row, rack, shelf, type, capacity, used, description } = formData;
    if (!row || !rack || !shelf || !type || !capacity || !used) {
      setError('⚠️ Please fill in all required fields.');
      return;
    }
    if (Number(capacity) <= 0 || Number(used) < 0) {
      setError('⚠️ Capacity must be positive and used must be non-negative.');
      return;
    }
    if (Number(used) > Number(capacity)) {
      setError('⚠️ Used capacity cannot exceed total capacity.');
      return;
    }
    const bin_id = editId ? formData.bin_id || generateBinId(row, rack, shelf) : generateBinId(row, rack, shelf);
    const payload = {
      bin_id, row, rack, shelf, type,
      capacity: Number(capacity), used: Number(used), description,
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
      handleClose();
    } catch (err) {
      console.error(`${editId ? 'Updating' : 'Adding'} bin error:`, err.response?.data || err.message);
      let errorMsg = `Failed to ${editId ? 'update' : 'add'} bin: Unable to process request.`;
      if (err.response?.status === 403) {
        errorMsg = `⚠️ Permission denied: ${err.response.data.detail || 'You lack permission to perform this action.'}`;
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
      setDeleteOpen(false);
      setDeleteId(null);
      fetchBins();
    } catch (err) {
      console.error('Error deleting bin:', err.response?.data || err.message);
      let errorMsg = 'Failed to delete bin: Unable to process request.';
      if (err.response?.status === 403) {
        errorMsg = `⚠️ Permission denied: ${err.response.data.detail || 'You lack permission to delete bins.'}`;
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
      <Typography variant="h4" sx={{ mb: 3 }}>
        Bin Locations
      </Typography>

      <Grid container justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            size="small"
            placeholder="Search bins..."
            value={localSearch}
            onChange={(e) => debouncedSetLocalSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
        </Grid>
        <Grid item>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpen()}>
            Add New Bin
          </Button>
        </Grid>
      </Grid>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Warehouse Bin Map
        </Typography>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell><strong>Bin ID</strong></TableCell>
              <TableCell><strong>Row</strong></TableCell>
              <TableCell><strong>Rack</strong></TableCell>
              <TableCell><strong>Shelf</strong></TableCell>
              <TableCell><strong>Type</strong></TableCell>
              <TableCell><strong>Capacity</strong></TableCell>
              <TableCell><strong>Used</strong></TableCell>
              <TableCell><strong>Actions</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {bins.length > 0 ? (
              bins.map((bin) => (
                <TableRow
                  key={bin.id}
                  hover
                  sx={{ '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.04)' } }}
                >
                  <TableCell onClick={() => setSelectedBin(bin)}>{bin.bin_id}</TableCell>
                  <TableCell onClick={() => setSelectedBin(bin)}>{bin.row}</TableCell>
                  <TableCell onClick={() => setSelectedBin(bin)}>{bin.rack}</TableCell>
                  <TableCell onClick={() => setSelectedBin(bin)}>{bin.shelf}</TableCell>
                  <TableCell onClick={() => setSelectedBin(bin)}>{bin.type}</TableCell>
                  <TableCell onClick={() => setSelectedBin(bin)}>{bin.capacity}</TableCell>
                  <TableCell onClick={() => setSelectedBin(bin)}>{bin.used}</TableCell>
                  <TableCell>
                    <IconButton onClick={() => handleOpen(bin)} disabled={!hasUpdatePermission}>
                      <EditIcon />
                    </IconButton>
                    <IconButton onClick={() => handleDeleteOpen(bin.id)} disabled={!hasDeletePermission}>
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={8}>No bins found.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        <Box mt={4} display="flex" justifyContent="center">
          <Pagination
            count={totalPages}
            page={page}
            onChange={(_, value) => setPage(value)}
            color="primary"
          />
        </Box>
      </Paper>

      <Modal open={!!selectedBin} onClose={() => setSelectedBin(null)}>
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
          {selectedBin && (
            <>
              <Typography variant="h6" gutterBottom>
                Bin Details: {selectedBin.bin_id}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Type:</strong> {selectedBin.type}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Row:</strong> {selectedBin.row}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Rack:</strong> {selectedBin.rack}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Shelf:</strong> {selectedBin.shelf}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Capacity:</strong> {selectedBin.capacity}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Used:</strong> {selectedBin.used}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Description:</strong> {selectedBin.description || 'N/A'}
              </Typography>
              <Box sx={{ mt: 3, textAlign: 'right' }}>
                <Button onClick={() => setSelectedBin(null)} variant="contained">
                  Close
                </Button>
              </Box>
            </>
          )}
        </Box>
      </Modal>

      <Modal open={open} onClose={handleClose}>
        <Box sx={modalStyle}>
          <Typography variant="h6" gutterBottom>
            {editId ? 'Update Bin Slot' : 'Add New Bin Slot'}
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={4}>
              <TextField
                label="Row"
                name="row"
                value={formData.row}
                onChange={handleChange}
                fullWidth
                required
                error={formData.row === '' && error.includes('required')}
                helperText={formData.row === '' && error.includes('required') ? 'Row is required' : ''}
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                label="Rack"
                name="rack"
                value={formData.rack}
                onChange={handleChange}
                fullWidth
                required
                error={formData.rack === '' && error.includes('required')}
                helperText={formData.rack === '' && error.includes('required') ? 'Rack is required' : ''}
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                label="Shelf"
                name="shelf"
                value={formData.shelf}
                onChange={handleChange}
                fullWidth
                required
                error={formData.shelf === '' && error.includes('required')}
                helperText={formData.shelf === '' && error.includes('required') ? 'Shelf is required' : ''}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Type"
                name="type"
                value={formData.type}
                onChange={handleChange}
                fullWidth
                required
                error={formData.type === '' && error.includes('required')}
                helperText={formData.type === '' && error.includes('required') ? 'Type is required' : ''}
              />
            </Grid>
            <Grid item xs={3}>
              <TextField
                label="Capacity"
                name="capacity"
                type="number"
                value={formData.capacity}
                onChange={handleChange}
                fullWidth
                required
                error={formData.capacity === '' && error.includes('required')}
                helperText={formData.capacity === '' && error.includes('required') ? 'Capacity is required' : ''}
              />
            </Grid>
            <Grid item xs={3}>
              <TextField
                label="Used"
                name="used"
                type="number"
                value={formData.used}
                onChange={handleChange}
                fullWidth
                required
                error={formData.used === '' && error.includes('required')}
                helperText={formData.used === '' && error.includes('required') ? 'Used is required' : ''}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                fullWidth
                multiline
                rows={3}
              />
            </Grid>
            <Grid item xs={12} textAlign="right">
              <Button onClick={handleClose} sx={{ mr: 1 }}>
                Cancel
              </Button>
              <Button variant="contained" onClick={handleSaveBin}>
                {editId ? 'Update Bin' : 'Save Bin'}
              </Button>
            </Grid>
          </Grid>
        </Box>
      </Modal>

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