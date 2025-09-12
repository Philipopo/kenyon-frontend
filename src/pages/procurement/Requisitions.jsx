// src/pages/procurement/Requisitions.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Container, Typography, Paper, TextField, Button, MenuItem, Alert, Box, Divider,
  CircularProgress, Table, TableHead, TableRow, TableCell, TableBody, TableContainer,
  IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Pagination, InputAdornment,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import { debounce } from 'lodash';
import API from '../../api';
import { useSearch } from '../../context/SearchContext';

const departments = ['Operations', 'IT', 'Maintenance', 'Finance'];

const approvalFlows = {
  Operations: ['Ops Manager', 'Procurement'],
  IT: ['IT Lead', 'Procurement'],
  Maintenance: ['Maintenance Head', 'Procurement Manager', 'Finance Director'],
  Finance: ['Finance Head'],
};

const budgetLimits = {
  Operations: 500000,
  IT: 300000,
  Maintenance: 1000000,
  Finance: 200000,
};

export default function Requisitions() {
  const [form, setForm] = useState({
    item: '', quantity: '', department: '', purpose: '', cost: '',
  });
  const [requisitions, setRequisitions] = useState([]);
  const [alert, setAlert] = useState(null);
  const [loading, setLoading] = useState(false);
  const [checkingPermissions, setCheckingPermissions] = useState(true);
  const [hasPermission, setHasPermission] = useState(false);
  const [permissions, setPermissions] = useState({
    create_requisition: false,
    update_requisition: false,
    delete_requisition: false,
  });
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedRequisition, setSelectedRequisition] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
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

  useEffect(() => {
    const checkPermissions = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        if (!token) {
          setAlert('⚠️ No authentication token found. Please log in.');
          setHasPermission(false);
          setCheckingPermissions(false);
          return;
        }
        const pageResponse = await API.get('/auth/permissions/page/requisitions/');
        console.log('Page permission response:', pageResponse.data);
        setHasPermission(pageResponse.data.allowed || false);
        if (!pageResponse.data.allowed) {
          setAlert(`⚠️ You do not have permission to view this page: ${pageResponse.data.reason || 'No reason provided'}`);
          setCheckingPermissions(false);
          return;
        }
        const actions = ['create_requisition', 'update_requisition', 'delete_requisition'];
        const actionPerms = {};
        for (const action of actions) {
          const actionResponse = await API.get(`/auth/permissions/action/${action}/`);
          actionPerms[action] = actionResponse.data.allowed || false;
        }
        setPermissions(actionPerms);
        fetchRequisitions();
      } catch (err) {
        console.error('Error checking permissions:', err.response?.data || err.message);
        setAlert(`⚠️ Failed to check permissions: ${err.response?.data?.detail || err.message}`);
        setHasPermission(false);
      } finally {
        setCheckingPermissions(false);
      }
    };
    checkPermissions();
  }, []);

  const fetchRequisitions = async () => {
    try {
      setLoading(true);
      const searchValue = search || searchTerm;
      const res = await API.get('procurement/requisitions/', {
        params: { search: searchValue, page, page_size: itemsPerPage },
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
      });
      console.log('[REQUISITIONS FETCHED]', res.data);
      setRequisitions(res.data.results || []);
      setTotalPages(Math.ceil(res.data.count / itemsPerPage));
      setAlert(null);
    } catch (err) {
      console.error('Error fetching requisitions:', err.response?.data || err.message);
      setAlert(`❌ Failed to fetch requisitions: ${err.response?.data?.detail || err.message}`);
      setRequisitions([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasPermission && (search !== prevSearchRef.current || searchTerm !== prevSearchTermRef.current)) {
      setPage(1);
      prevSearchRef.current = search;
      prevSearchTermRef.current = searchTerm;
    }
    if (hasPermission) fetchRequisitions();
  }, [search, searchTerm, page, hasPermission]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setAlert(null);
  };

  const handleSubmit = async () => {
    if (!permissions.create_requisition) {
      setAlert('⚠️ You do not have permission to create requisitions.');
      return;
    }
    const { item, quantity, department, purpose, cost } = form;
    if (!item || !quantity || !department || !purpose || !cost) {
      setAlert('⚠ All fields are required.');
      return;
    }
    const parsedCost = parseFloat(cost);
    const parsedQuantity = parseInt(quantity);
    if (parsedQuantity <= 0) {
      setAlert('⚠ Quantity must be positive.');
      return;
    }
    if (parsedCost <= 0) {
      setAlert('⚠ Cost must be positive.');
      return;
    }
    const budget = budgetLimits[department] || 0;
    if (parsedCost > budget) {
      setAlert(`⚠ Request exceeds the ₦${budget.toLocaleString()} budget for ${department}`);
      return;
    }
    try {
      setLoading(true);
      setAlert(null);
      await API.post('procurement/requisitions/', {
        item,
        quantity: parsedQuantity,
        cost: parsedCost,
        department,
        purpose,
      });
      setAlert(`✅ Requisition submitted successfully. Routed to: ${approvalFlows[department]?.join(' → ') || 'Unknown'}`);
      setForm({ item: '', quantity: '', department: '', purpose: '', cost: '' });
      fetchRequisitions();
    } catch (err) {
      let errorMsg = '❌ Failed to submit requisition.';
      if (err.response?.data) {
        errorMsg = Object.entries(err.response.data)
          .map(([field, msg]) => `${field}: ${Array.isArray(msg) ? msg.join(', ') : msg}`)
          .join('; ');
      } else {
        errorMsg = err.message || '❌ Network error.';
      }
      setAlert(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (requisition) => {
    if (!permissions.update_requisition) {
      setAlert('⚠️ You do not have permission to update requisitions.');
      return;
    }
    setSelectedRequisition(requisition);
    setForm({
      item: requisition.item,
      quantity: requisition.quantity,
      department: requisition.department,
      purpose: requisition.purpose,
      cost: requisition.cost,
    });
    setEditOpen(true);
  };

  const handleUpdate = async () => {
    if (!permissions.update_requisition) {
      setAlert('⚠️ You do not have permission to update requisitions.');
      return;
    }
    const { item, quantity, department, purpose, cost } = form;
    if (!item || !quantity || !department || !purpose || !cost) {
      setAlert('⚠ All fields are required.');
      return;
    }
    const parsedCost = parseFloat(cost);
    const parsedQuantity = parseInt(quantity);
    if (parsedQuantity <= 0) {
      setAlert('⚠ Quantity must be positive.');
      return;
    }
    if (parsedCost <= 0) {
      setAlert('⚠ Cost must be positive.');
      return;
    }
    const budget = budgetLimits[department] || 0;
    if (parsedCost > budget) {
      setAlert(`⚠ Request exceeds the ₦${budget.toLocaleString()} budget for ${department}`);
      return;
    }
    try {
      setLoading(true);
      setAlert(null);
      await API.patch(`procurement/requisitions/${selectedRequisition.id}/`, {
        item,
        quantity: parsedQuantity,
        cost: parsedCost,
        department,
        purpose,
      });
      setAlert('✅ Requisition updated successfully.');
      setEditOpen(false);
      setForm({ item: '', quantity: '', department: '', purpose: '', cost: '' });
      fetchRequisitions();
    } catch (err) {
      let errorMsg = '❌ Failed to update requisition.';
      if (err.response?.data) {
        errorMsg = Object.entries(err.response.data)
          .map(([field, msg]) => `${field}: ${Array.isArray(msg) ? msg.join(', ') : msg}`)
          .join('; ');
      } else {
        errorMsg = err.message || '❌ Network error.';
      }
      setAlert(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (requisition) => {
    if (!permissions.delete_requisition) {
      setAlert('⚠️ You do not have permission to delete requisitions.');
      return;
    }
    setSelectedRequisition(requisition);
    setDeleteOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!permissions.delete_requisition) {
      setAlert('⚠️ You do not have permission to delete requisitions.');
      return;
    }
    try {
      setLoading(true);
      setAlert(null);
      await API.delete(`procurement/requisitions/${selectedRequisition.id}/`);
      setAlert('✅ Requisition deleted successfully.');
      setDeleteOpen(false);
      fetchRequisitions();
    } catch (err) {
      let errorMsg = '❌ Failed to delete requisition.';
      if (err.response?.data) {
        errorMsg = err.response.data.detail || JSON.stringify(err.response.data);
      } else {
        errorMsg = err.message || '❌ Network error.';
      }
      setAlert(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  if (checkingPermissions) {
    return (
      <Container>
        <Typography variant="h6" sx={{ mt: 4 }}>
          Loading permissions...
        </Typography>
        <CircularProgress sx={{ mt: 2 }} />
      </Container>
    );
  }

  if (!hasPermission) {
    return (
      <Container>
        <Alert severity="error" sx={{ mt: 4 }} onClose={() => setAlert(null)}>
          {alert || '⚠️ You do not have permission to view this page.'}
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h5" gutterBottom>
          Create New Requisition
        </Typography>
        <Typography variant="body2" sx={{ mb: 2 }} color="text.secondary">
          Submit a procurement request with estimated cost and department selection.
        </Typography>

        {alert && (
          <Alert
            severity={alert.includes('❌') ? 'error' : alert.includes('⚠') ? 'warning' : 'success'}
            sx={{ mb: 2 }}
            onClose={() => setAlert(null)}
          >
            {alert}
          </Alert>
        )}

        <TextField
          label="Item Name"
          name="item"
          fullWidth
          margin="normal"
          value={form.item}
          onChange={handleChange}
          disabled={!permissions.create_requisition && !editOpen}
        />
        <TextField
          label="Quantity"
          name="quantity"
          type="number"
          fullWidth
          margin="normal"
          value={form.quantity}
          onChange={handleChange}
          disabled={!permissions.create_requisition && !editOpen}
        />
        <TextField
          label="Estimated Cost (₦)"
          name="cost"
          type="number"
          fullWidth
          margin="normal"
          value={form.cost}
          onChange={handleChange}
          disabled={!permissions.create_requisition && !editOpen}
        />
        <TextField
          select
          label="Department"
          name="department"
          fullWidth
          margin="normal"
          value={form.department}
          onChange={handleChange}
          disabled={!permissions.create_requisition && !editOpen}
        >
          {departments.map((dep) => (
            <MenuItem key={dep} value={dep}>{dep}</MenuItem>
          ))}
        </TextField>
        <TextField
          label="Purpose"
          name="purpose"
          multiline
          rows={3}
          fullWidth
          margin="normal"
          value={form.purpose}
          onChange={handleChange}
          disabled={!permissions.create_requisition && !editOpen}
        />
        <Button
          variant="contained"
          color="primary"
          fullWidth
          sx={{ mt: 3 }}
          onClick={editOpen ? handleUpdate : handleSubmit}
          disabled={loading || (!permissions.create_requisition && !editOpen)}
        >
          {loading ? 'Submitting...' : editOpen ? 'Update Requisition' : 'Submit Requisition'}
        </Button>

        <Divider sx={{ my: 3 }} />

        <Box display="flex" justifyContent="flex-end" mb={2}>
          <TextField
            size="small"
            placeholder="Search Requisitions..."
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
        </Box>

        {form.department && (
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              🧭 Approval Routing Preview:
            </Typography>
            <Typography variant="body2">
              {approvalFlows[form.department].join(' → ')}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Routing is based on department policy.
            </Typography>
          </Box>
        )}

        <Divider sx={{ my: 3 }} />

        <Typography variant="h6" gutterBottom>Requisitions</Typography>
        {requisitions.length > 0 ? (
          <>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Code</TableCell>
                    <TableCell>Item</TableCell>
                    <TableCell>Quantity</TableCell>
                    <TableCell>Cost (₦)</TableCell>
                    <TableCell>Department</TableCell>
                    <TableCell>Purpose</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {requisitions.map((req) => (
                    <TableRow key={req.id}>
                      <TableCell>{req.code}</TableCell>
                      <TableCell>{req.item}</TableCell>
                      <TableCell>{req.quantity}</TableCell>
                      <TableCell>{parseFloat(req.cost).toLocaleString()}</TableCell>
                      <TableCell>{req.department}</TableCell>
                      <TableCell>{req.purpose}</TableCell>
                      <TableCell>
                        <IconButton
                          onClick={() => handleEdit(req)}
                          disabled={!permissions.update_requisition}
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          onClick={() => handleDelete(req)}
                          disabled={!permissions.delete_requisition}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            {totalPages > 1 && (
              <Box mt={3} display="flex" justifyContent="center">
                <Pagination
                  count={totalPages}
                  page={page}
                  onChange={(_, value) => setPage(value)}
                  color="primary"
                />
              </Box>
            )}
          </>
        ) : (
          <Typography>No requisitions found.</Typography>
        )}
      </Paper>

      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Delete Requisition</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete requisition {selectedRequisition?.code}? This action cannot be reversed.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleConfirmDelete}
            disabled={loading || !permissions.delete_requisition}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={editOpen} onClose={() => setEditOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Edit Requisition</DialogTitle>
        <DialogContent>
          <TextField
            label="Item Name"
            name="item"
            fullWidth
            margin="normal"
            value={form.item}
            onChange={handleChange}
            disabled={!permissions.update_requisition}
          />
          <TextField
            label="Quantity"
            name="quantity"
            type="number"
            fullWidth
            margin="normal"
            value={form.quantity}
            onChange={handleChange}
            disabled={!permissions.update_requisition}
          />
          <TextField
            label="Estimated Cost (₦)"
            name="cost"
            type="number"
            fullWidth
            margin="normal"
            value={form.cost}
            onChange={handleChange}
            disabled={!permissions.update_requisition}
          />
          <TextField
            select
            label="Department"
            name="department"
            fullWidth
            margin="normal"
            value={form.department}
            onChange={handleChange}
            disabled={!permissions.update_requisition}
          >
            {departments.map((dep) => (
              <MenuItem key={dep} value={dep}>{dep}</MenuItem>
            ))}
          </TextField>
          <TextField
            label="Purpose"
            name="purpose"
            multiline
            rows={3}
            fullWidth
            margin="normal"
            value={form.purpose}
            onChange={handleChange}
            disabled={!permissions.update_requisition}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleUpdate}
            disabled={loading || !permissions.update_requisition}
          >
            Update
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}