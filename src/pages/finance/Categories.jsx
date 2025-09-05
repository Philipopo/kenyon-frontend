// src/pages/finance/Categories.jsx
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
  Alert,
  CircularProgress,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  IconButton,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import api from '../../api';

export default function Categories() {
  const [hasPageAccess, setHasPageAccess] = useState(false);
  const [canCreateCategory, setCanCreateCategory] = useState(false);
  const [canUpdateCategory, setCanUpdateCategory] = useState(false);
  const [canDeleteCategory, setCanDeleteCategory] = useState(false);
  const [error, setError] = useState('');
  const [checkingPermissions, setCheckingPermissions] = useState(true);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [isUpdate, setIsUpdate] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [form, setForm] = useState({ name: '', description: '' });
  const [formError, setFormError] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const itemsPerPage = 10;

  useEffect(() => {
    const checkPermissions = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        if (!token) {
          setError('⚠️ No authentication token found. Please log in.');
          setHasPageAccess(false);
          setCanCreateCategory(false);
          setCanUpdateCategory(false);
          setCanDeleteCategory(false);
          setCheckingPermissions(false);
          return;
        }
        const pageResponse = await api.get('/auth/permissions/page/finance_categories/');
        setHasPageAccess(pageResponse.data.allowed || false);
        if (!pageResponse.data.allowed) {
          setError(`⚠️ You do not have permission to view this page: ${pageResponse.data.reason || 'No reason provided'}`);
        }

        const createResponse = await api.get('/auth/permissions/action/create_finance_category/');
        setCanCreateCategory(createResponse.data.allowed || false);
        const updateResponse = await api.get('/auth/permissions/action/update_finance_category/');
        setCanUpdateCategory(updateResponse.data.allowed || false);
        const deleteResponse = await api.get('/auth/permissions/action/delete_finance_category/');
        setCanDeleteCategory(deleteResponse.data.allowed || false);

        if (pageResponse.data.allowed) {
          try {
            const res = await api.get('/finance/categories/');
            setCategories(res.data);
          } catch (err) {
            setError(
              err.response?.data?.detail ||
              err.response?.data?.message ||
              'Failed to load categories.'
            );
          } finally {
            setLoading(false);
          }
        }
      } catch (err) {
        console.error('Error checking permissions:', err.response?.data || err.message);
        if (err.response?.status === 401) {
          setError('⚠️ Authentication failed. Please log in again.');
        } else {
          setError(`⚠️ Failed to check permissions: ${err.response?.data?.reason || err.message}`);
        }
        setHasPageAccess(false);
        setCanCreateCategory(false);
        setCanUpdateCategory(false);
        setCanDeleteCategory(false);
      } finally {
        setCheckingPermissions(false);
      }
    };

    checkPermissions();
  }, []);

  const handleFormChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    if (!form.name) {
      setFormError('⚠ Please fill all required fields.');
      return;
    }

    if (isUpdate && !canUpdateCategory) {
      setFormError('⚠ You do not have permission to update a category.');
      return;
    }
    if (!isUpdate && !canCreateCategory) {
      setFormError('⚠ You do not have permission to create a category.');
      return;
    }

    try {
      setFormLoading(true);
      setFormError(null);
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
      };
      if (isUpdate) {
        const res = await api.put(`/finance/categories/${selectedCategory.id}/`, payload);
        setCategories(categories.map((cat) => (cat.id === res.data.id ? res.data : cat)));
      } else {
        const res = await api.post('/finance/categories/', payload);
        setCategories([res.data, ...categories]);
      }
      setFormOpen(false);
      setForm({ name: '', description: '' });
      setIsUpdate(false);
      setSelectedCategory(null);
    } catch (err) {
      setFormError(
        err.response?.data?.detail ||
        err.response?.data?.message ||
        `Failed to ${isUpdate ? 'update' : 'create'} category.`
      );
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdate = (category) => {
    setForm({ name: category.name, description: category.description || '' });
    setSelectedCategory(category);
    setIsUpdate(true);
    setFormOpen(true);
  };

  const handleDelete = async () => {
    if (!canDeleteCategory) {
      setFormError('⚠ You do not have permission to delete a category.');
      return;
    }
    try {
      await api.delete(`/finance/categories/${deleteId}/`);
      setCategories(categories.filter((cat) => cat.id !== deleteId));
      setDeleteOpen(false);
      setDeleteId(null);
    } catch (err) {
      setFormError(
        err.response?.data?.detail ||
        err.response?.data?.message ||
        'Failed to delete category.'
      );
    }
  };

  const openDeleteDialog = (id) => {
    setDeleteId(id);
    setDeleteOpen(true);
  };

  const filteredCategories = categories.filter((category) =>
    category.name?.toLowerCase().includes(search.toLowerCase())
  );

  const paginatedCategories = filteredCategories.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  if (checkingPermissions) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Typography variant="h6">Loading permissions...</Typography>
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
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        Finance Categories
      </Typography>

      <Paper elevation={3} sx={{ p: 3 }}>
        <Box display="flex" justifyContent="space-between" mb={2}>
          <TextField
            variant="outlined"
            size="small"
            placeholder="Search by category name..."
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
          {canCreateCategory && (
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => {
              setForm({ name: '', description: '' });
              setIsUpdate(false);
              setFormOpen(true);
            }}>
              Add Category
            </Button>
          )}
        </Box>

        {loading ? (
          <Box display="flex" justifyContent="center" py={5}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        ) : (
          <>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>S/N</TableCell>
                    <TableCell>Name</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell>Created By</TableCell>
                    <TableCell>Created At</TableCell>
                    {(canUpdateCategory || canDeleteCategory) && <TableCell>Actions</TableCell>}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedCategories.length > 0 ? (
                    paginatedCategories.map((category, index) => (
                      <TableRow key={category.id}>
                        <TableCell>{(page - 1) * itemsPerPage + index + 1}</TableCell>
                        <TableCell>{category.name}</TableCell>
                        <TableCell>{category.description || '-'}</TableCell>
                        <TableCell>{category.created_by_name}</TableCell>
                        <TableCell>{new Date(category.created_at).toLocaleDateString()}</TableCell>
                        {(canUpdateCategory || canDeleteCategory) && (
                          <TableCell>
                            {canUpdateCategory && (
                              <IconButton onClick={() => handleUpdate(category)}>
                                <EditIcon />
                              </IconButton>
                            )}
                            {canDeleteCategory && (
                              <IconButton onClick={() => openDeleteDialog(category.id)}>
                                <DeleteIcon />
                              </IconButton>
                            )}
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={canUpdateCategory || canDeleteCategory ? 6 : 5} align="center">
                        No results found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            <Box display="flex" justifyContent="center" mt={3}>
              <Pagination
                count={Math.ceil(filteredCategories.length / itemsPerPage)}
                page={page}
                onChange={(_, value) => setPage(value)}
                color="primary"
              />
            </Box>
          </>
        )}
      </Paper>

      <Dialog open={formOpen} onClose={() => setFormOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{isUpdate ? 'Update Category' : 'Add Category'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                label="Category Name"
                name="name"
                fullWidth
                value={form.name}
                onChange={handleFormChange}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Description (optional)"
                name="description"
                fullWidth
                multiline
                rows={3}
                value={form.description}
                onChange={handleFormChange}
              />
            </Grid>
          </Grid>
          {formError && <Alert severity="error" sx={{ mt: 2 }}>{formError}</Alert>}
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
          <Typography>Are you sure you want to delete this category?</Typography>
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