import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Container, Typography, Paper, Box, TextField, InputAdornment, Table,
  TableBody, TableCell, TableContainer, TableHead, TableRow, Pagination,
  Alert, CircularProgress, Button, Dialog, DialogTitle, DialogContent,
  DialogActions, Grid, IconButton,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { debounce } from 'lodash';
import api from '../../api';
import { useSearch } from '../../context/SearchContext';

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
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [isUpdate, setIsUpdate] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [form, setForm] = useState({ name: '', description: '' });
  const [formError, setFormError] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const { searchTerm } = useSearch();
  const itemsPerPage = 10;
  const prevSearchTermRef = useRef(searchTerm);
  const prevSearchRef = useRef(search);

  // Debounced local search handler
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedSetSearch = useCallback(
    debounce((value) => {
      setSearch(value);
      setPage(1);
    }, 500),
    []
  );

  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      const searchValue = search || searchTerm;
      const res = await api.get('/finance/categories/', {
        params: { search: searchValue, page, page_size: itemsPerPage },
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
      });
      console.log('[CATEGORIES FETCHED]', res.data);
      setCategories(res.data.results || []);
      setTotalPages(Math.ceil(res.data.count / itemsPerPage));
      setError('');
    } catch (err) {
      console.error('Error fetching categories:', err.response?.data || err.message);
      setError(`❌ Failed to fetch categories: ${err.response?.data?.detail || err.message}`);
      setCategories([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [search, searchTerm, page, itemsPerPage]);

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
          setCheckingPermissions(false);
          return;
        }
        const [createResponse, updateResponse, deleteResponse] = await Promise.all([
          api.get('/auth/permissions/action/create_finance_category/'),
          api.get('/auth/permissions/action/update_finance_category/'),
          api.get('/auth/permissions/action/delete_finance_category/'),
        ]);
        setCanCreateCategory(createResponse.data.allowed || false);
        setCanUpdateCategory(updateResponse.data.allowed || false);
        setCanDeleteCategory(deleteResponse.data.allowed || false);
        if (pageResponse.data.allowed) {
          fetchCategories();
        }
      } catch (err) {
        console.error('Error checking permissions:', err.response?.data || err.message);
        setError(`⚠️ Failed to check permissions: ${err.response?.data?.detail || err.message}`);
        setHasPageAccess(false);
        setCanCreateCategory(false);
        setCanUpdateCategory(false);
        setCanDeleteCategory(false);
      } finally {
        setCheckingPermissions(false);
      }
    };
    checkPermissions();
  }, [fetchCategories]);

  useEffect(() => {
    if (hasPageAccess && (search !== prevSearchRef.current || searchTerm !== prevSearchTermRef.current)) {
      setPage(1);
      prevSearchRef.current = search;
      prevSearchTermRef.current = searchTerm;
    }
    if (hasPageAccess) fetchCategories();
  }, [search, searchTerm, page, hasPageAccess, fetchCategories]);

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
      fetchCategories();
    } catch (err) {
      let errorMsg = `Failed to ${isUpdate ? 'update' : 'create'} category: Unable to process request.`;
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
      fetchCategories();
    } catch (err) {
      let errorMsg = 'Failed to delete category: Unable to process request.';
      if (err.response?.status === 403) {
        errorMsg = `⚠ Permission denied: ${err.response.data.detail || 'You lack permission to delete categories.'}`;
      } else {
        errorMsg = err.response?.data?.detail || err.message;
      }
      setFormError(`❌ ${errorMsg}`);
    }
  };

  const openDeleteDialog = (id) => {
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
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
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
            onChange={(e) => debouncedSetSearch(e.target.value)}
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
                  {categories.length > 0 ? (
                    categories.map((category, index) => (
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
                        No categories found.
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