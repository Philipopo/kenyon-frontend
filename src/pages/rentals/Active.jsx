import React, { useState, useEffect, useCallback } from 'react';
import {
  Container, Typography, Paper, Box, Button, Alert, Dialog, DialogTitle, DialogContent, DialogActions,
  Grid, FormControl, InputLabel, Select, MenuItem, TextField, Accordion, AccordionSummary, AccordionDetails,
  Table, TableHead, TableRow, TableCell, TableBody, IconButton, Pagination, Collapse
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import API from '../../api';
import { useSearch } from '../../context/SearchContext';

function RentalRow({ rental, onEdit, onDelete, hasUpdatePermission, hasDeletePermission }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <TableRow sx={{ '& > *': { borderBottom: 'unset' }, cursor: 'pointer' }} onClick={() => setOpen(!open)}>
        <TableCell>
          <IconButton size="small" onClick={(e) => { e.stopPropagation(); setOpen(!open); }}>
            {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </TableCell>
        <TableCell>{rental.code}</TableCell>
        <TableCell>{rental.renter_name || '—'}</TableCell>
        <TableCell>{rental.equipment_name || '—'}</TableCell>
        <TableCell>{rental.branch_name || '—'}</TableCell>
        <TableCell>{rental.start_date || '—'}</TableCell>
        <TableCell>{rental.due_date || '—'}</TableCell>
        <TableCell>{rental.status}</TableCell>
        <TableCell>{rental.returned ? 'Yes' : 'No'}</TableCell>
        <TableCell>{rental.created_by_name || '—'}</TableCell>
        <TableCell>{rental.approved_by_name || '—'}</TableCell>
        <TableCell>
          <IconButton onClick={(e) => { e.stopPropagation(); onEdit(rental); }} color="primary" size="small" disabled={!hasUpdatePermission}>
            <EditIcon />
          </IconButton>
          <IconButton onClick={(e) => { e.stopPropagation(); onDelete(rental.id); }} color="error" size="small" disabled={!hasDeletePermission}>
            <DeleteIcon />
          </IconButton>
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell colSpan={13} style={{ paddingBottom: 0, paddingTop: 0 }}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ margin: 2 }}>
              <Typography variant="h6">Rental Details</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}><Typography><strong>ID:</strong> {rental.id}</Typography></Grid>
                <Grid item xs={12} sm={6}><Typography><strong>Created By:</strong> {rental.created_by_name || '—'}</Typography></Grid>
                <Grid item xs={12} sm={6}><Typography><strong>Approved By:</strong> {rental.approved_by_name || '—'}</Typography></Grid>
                <Grid item xs={12} sm={6}><Typography><strong>Created At:</strong> {new Date(rental.created_at).toLocaleString()}</Typography></Grid>
                <Grid item xs={12} sm={6}><Typography><strong>Returned:</strong> {rental.returned ? 'Yes' : 'No'}</Typography></Grid>
                <Grid item xs={12} sm={6}><Typography><strong>Returned At:</strong> {rental.returned_at ? new Date(rental.returned_at).toLocaleString() : '—'}</Typography></Grid>
              </Grid>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
}

export default function ActiveRentals() {
  const [rentals, setRentals] = useState([]);
  const [equipmentList, setEquipmentList] = useState([]);
  const [formData, setFormData] = useState({
    equipment: '',
    start_date: '',
    due_date: '',
    status: 'Active',
  });
  const [openDialog, setOpenDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [editId, setEditId] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [checkingPermissions, setCheckingPermissions] = useState(true);
  const [hasPermission, setHasPermission] = useState(false);
  const [hasCreatePermission, setHasCreatePermission] = useState(false);
  const [hasUpdatePermission, setHasUpdatePermission] = useState(false);
  const [hasDeletePermission, setHasDeletePermission] = useState(false);
  const { searchTerm } = useSearch();
  const itemsPerPage = 10;

  const fetchRentals = useCallback(async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const res = await API.get('rentals/rentals/', {
        params: { search: searchTerm, page, page_size: itemsPerPage },
        headers: { Authorization: `Bearer ${token}` },
      });
      setRentals(res.data.results || []);
      setTotalPages(Math.ceil((res.data.count || 0) / itemsPerPage));
    } catch (err) {
      setError(`❌ Failed to fetch rentals: ${err.response?.data?.detail || err.message}`);
    }
  }, [searchTerm, page]);

  const fetchEquipment = useCallback(async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const res = await API.get('rentals/equipment/', {
        params: { page_size: 100 },
        headers: { Authorization: `Bearer ${token}` },
      });
      setEquipmentList(res.data.results || []);
    } catch (err) {
      setError(`❌ Failed to fetch equipment: ${err.response?.data?.detail || err.message}`);
    }
  }, []);

  useEffect(() => {
    const checkPermissions = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        if (!token) return setCheckingPermissions(false);

        const pageRes = await API.get('/auth/permissions/page/rentals_active/', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const [createRes, updateRes, deleteRes] = await Promise.all([
          API.get('/auth/permissions/action/create_rental/', {
            headers: { Authorization: `Bearer ${token}` },
          }),
          API.get('/auth/permissions/action/update_rental/', {
            headers: { Authorization: `Bearer ${token}` },
          }),
          API.get('/auth/permissions/action/delete_rental/', {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        setHasPermission(pageRes.data.allowed);
        setHasCreatePermission(createRes.data.allowed);
        setHasUpdatePermission(updateRes.data.allowed);
        setHasDeletePermission(deleteRes.data.allowed);

        if (pageRes.data.allowed) {
          fetchRentals();
          fetchEquipment();
        }
      } catch (err) {
        setError(`⚠️ Permission check failed`);
      } finally {
        setCheckingPermissions(false);
      }
    };
    checkPermissions();
  }, [fetchRentals, fetchEquipment]);

  useEffect(() => {
    if (hasPermission) fetchRentals();
  }, [searchTerm, page, hasPermission, fetchRentals]);

  const handleOpenDialog = (rental = null) => {
    if (rental) {
      setFormData({
        equipment: rental.equipment,
        start_date: rental.start_date,
        due_date: rental.due_date,
        status: rental.status,
      });
      setEditId(rental.id);
    } else {
      setFormData({ equipment: '', start_date: '', due_date: '', status: 'Active' });
      setEditId(null);
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setError('');
    setSuccess('');
  };

  const handleDeleteOpen = (id) => {
    if (!hasDeletePermission) return setError('⚠️ No delete permission.');
    setDeleteId(id);
    setOpenDeleteDialog(true);
  };

  const handleDeleteClose = () => {
    setOpenDeleteDialog(false);
    setDeleteId(null);
  };

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSave = async () => {
    const { equipment, start_date, due_date, status } = formData;
    if (!equipment || !start_date || !due_date) {
      return setError('⚠️ All fields are required.');
    }
    if (start_date > due_date) {
      return setError('⚠️ Due date must be after start date.');
    }

    try {
      const payload = { equipment, start_date, due_date, status };

      if (editId) {
        await API.put(`rentals/rentals/${editId}/`, payload, {
          headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
        });
        setSuccess('✅ Rental updated.');
      } else {
        await API.post('rentals/rentals/', payload, {
          headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
        });
        setSuccess('✅ Rental created.');
      }

      fetchRentals();
      setOpenDialog(false);
    } catch (err) {
      setError(`❌ ${err.response?.data?.detail || 'Save failed.'}`);
    }
  };

  const handleDelete = async () => {
    try {
      await API.delete(`rentals/rentals/${deleteId}/`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
      });
      setSuccess('✅ Deleted.');
      fetchRentals();
      setOpenDeleteDialog(false);
    } catch (err) {
      setError(`❌ ${err.response?.data?.detail || 'Delete failed.'}`);
    }
  };

  if (checkingPermissions) return <Container><Typography variant="h6">Loading...</Typography></Container>;
  if (!hasPermission) return <Container><Alert severity="error">No permission</Alert></Container>;

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      <Typography variant="h4" gutterBottom>Active Rentals</Typography>

      {/* ✅ TUTORIAL ACCORDION */}
      <Accordion sx={{ mb: 2 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">Rental Management Guide & Best Practices</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Typography variant="body1" paragraph>
            <strong>💡 What is Rental Management?</strong> This page tracks all active equipment rentals, including renter details, equipment, branch location, and return status.
          </Typography>
          <Typography variant="body1" paragraph>
            <strong>✅ Best Practices:</strong>
            <ul>
              <li><strong>Accurate Equipment Assignment:</strong> Always select the correct equipment and branch.</li>
              <li><strong>Realistic Due Dates:</strong> Set due dates that account for actual usage periods.</li>
              <li><strong>Track Returns:</strong> Mark rentals as returned immediately upon equipment return.</li>
              <li><strong>Overdue Handling:</strong> Follow up on overdue rentals promptly to avoid loss.</li>
            </ul>
          </Typography>
        </AccordionDetails>
      </Accordion>

      <Box mb={2}>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog()} disabled={!hasCreatePermission}>
          Add Rental
        </Button>
      </Box>

      <Paper sx={{ p: 3 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell></TableCell>
              <TableCell><strong>Code</strong></TableCell>
              <TableCell><strong>Renter</strong></TableCell>
              <TableCell><strong>Equipment</strong></TableCell>
              <TableCell><strong>Branch</strong></TableCell>
              <TableCell><strong>Start Date</strong></TableCell>
              <TableCell><strong>Due Date</strong></TableCell>
              <TableCell><strong>Status</strong></TableCell>
              <TableCell><strong>Returned</strong></TableCell>
              <TableCell><strong>Created By</strong></TableCell>
              <TableCell><strong>Approved By</strong></TableCell>
              <TableCell><strong>Actions</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rentals.length > 0 ? (
              rentals.map(rental => (
                <RentalRow
                  key={rental.id}
                  rental={rental}
                  onEdit={handleOpenDialog}
                  onDelete={handleDeleteOpen}
                  hasUpdatePermission={hasUpdatePermission}
                  hasDeletePermission={hasDeletePermission}
                />
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={13} align="center">
                  <Typography variant="body2" color="textSecondary">No rentals found.</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        <Box mt={3} display="flex" justifyContent="center">
          <Pagination count={totalPages} page={page} onChange={(_, p) => setPage(p)} color="primary" />
        </Box>
      </Paper>

      {/* Form Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editId ? '✏️ Edit Rental' : '➕ Add New Rental'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <FormControl fullWidth required>
                <InputLabel>Equipment</InputLabel>
                <Select name="equipment" value={formData.equipment} onChange={handleChange}>
                  <MenuItem value="">Select Equipment</MenuItem>
                  {equipmentList.map(eq => (
                    <MenuItem key={eq.id} value={eq.id}>{eq.name} ({eq.branch_name})</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Start Date" name="start_date" type="date" value={formData.start_date} onChange={handleChange} fullWidth required InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Due Date" name="due_date" type="date" value={formData.due_date} onChange={handleChange} fullWidth required InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth required>
                <InputLabel>Status</InputLabel>
                <Select name="status" value={formData.status} onChange={handleChange}>
                  <MenuItem value="Active">Active</MenuItem>
                  <MenuItem value="Overdue">Overdue</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button variant="contained" onClick={handleSave}>Save</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={openDeleteDialog} onClose={handleDeleteClose}>
        <DialogTitle>Delete Rental?</DialogTitle>
        <DialogContent>Are you sure? This cannot be undone.</DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteClose}>Cancel</Button>
          <Button color="error" onClick={handleDelete}>Delete</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}