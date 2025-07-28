import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Paper,
  Box,
  TextField,
  InputAdornment,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Pagination,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Alert,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import DeleteIcon from '@mui/icons-material/Delete';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import api from '../api';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [role, setRole] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', role: 'staff' });
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const itemsPerPage = 10;

  useEffect(() => {
    // Get current user role
    api.get('auth/me/')
      .then((res) => {
        setRole(res.data.role);
        if (res.data.role !== 'admin') {
          setUsers([]);
        } else {
          fetchUsers();
        }
      })
      .catch((err) => console.error('Failed to fetch current user:', err));
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await api.get('auth/users/');
      setUsers(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateUser = async () => {
    if (!form.name || !form.email || !form.role) {
      setFormError('Please fill in all fields');
      return;
    }

    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        role: form.role,
        password: 'Password10', // Default password
      };

      const res = await api.post('auth/register/', payload);
      setFormSuccess('✅ User created successfully');
      setFormError('');
      setForm({ name: '', email: '', role: 'staff' });
      fetchUsers();
    } catch (err) {
      const errMsg = err.response?.data?.email || err.response?.data?.detail || '❌ Failed to create user.';
      setFormError(errMsg);
      setFormSuccess('');
    }
  };

  const handleDeleteUser = async (id) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      await api.delete(`auth/users/${id}/`);
      setUsers((prev) => prev.filter((u) => u.id !== id));
    } catch (err) {
      alert('❌ Failed to delete user.');
      console.error(err);
    }
  };

  const filtered = users.filter(
    (user) =>
      user.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      user.email?.toLowerCase().includes(search.toLowerCase()) ||
      user.role?.toLowerCase().includes(search.toLowerCase())
  );

  const paginated = filtered.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  if (role && role !== 'admin') {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Alert severity="error">Access Denied – Admins only</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Box>
            <Typography variant="h4">User Management</Typography>
            <Typography variant="subtitle1">Manage all system users including roles and status</Typography>
          </Box>
          <Button variant="contained" startIcon={<PersonAddIcon />} onClick={() => setFormOpen(true)}>
            Add User
          </Button>
        </Box>

        <Box display="flex" justifyContent="flex-end" mb={2}>
          <TextField
            placeholder="Search users..."
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
        </Box>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>S/N</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginated.length > 0 ? (
                paginated.map((user, index) => (
                  <TableRow key={user.id}>
                    <TableCell>{(page - 1) * itemsPerPage + index + 1}</TableCell>
                    <TableCell>{user.full_name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.role}</TableCell>
                    <TableCell>{user.status}</TableCell>
                    <TableCell>
                      <Button
                        color="error"
                        startIcon={<DeleteIcon />}
                        onClick={() => handleDeleteUser(user.id)}
                      >
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    No matching users found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <Box display="flex" justifyContent="center" mt={3}>
          <Pagination
            count={Math.ceil(filtered.length / itemsPerPage)}
            page={page}
            onChange={(_, value) => setPage(value)}
            color="primary"
          />
        </Box>
      </Paper>

      {/* Create User Modal */}
      <Dialog open={formOpen} onClose={() => setFormOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Create New User</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                label="Full Name"
                name="name"
                fullWidth
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Email"
                name="email"
                fullWidth
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Role"
                name="role"
                select
                SelectProps={{ native: true }}
                fullWidth
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
              >
                <option value="staff">Staff</option>
                <option value="admin">Admin</option>
              </TextField>
            </Grid>
          </Grid>
          {formError && <Alert severity="error" sx={{ mt: 2 }}>{formError}</Alert>}
          {formSuccess && <Alert severity="success" sx={{ mt: 2 }}>{formSuccess}</Alert>}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFormOpen(false)}>Cancel</Button>
          <Button onClick={handleCreateUser} variant="contained">
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
