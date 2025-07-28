import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Paper, Box, TextField, InputAdornment, Table,
  TableBody, TableCell, TableContainer, TableHead, TableRow, Pagination,
  CircularProgress, Alert, Button, Dialog, DialogTitle, DialogContent,
  DialogActions, Grid
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import api from '../../api';

export default function EquipmentCatalog() {
  const [catalog, setCatalog] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: '',
    category: '',
    condition: '',
    location: ''
  });
  const [formAlert, setFormAlert] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const itemsPerPage = 10;

  const fetchCatalog = async () => {
    try {
      const res = await api.get('rentals/equipment/');
      setCatalog(res.data);
    } catch (err) {
      console.error('❌ Error fetching catalog:', err);
      setError(err.response?.data?.detail || 'Failed to load equipment catalog.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCatalog();
  }, []);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleCreateEquipment = async () => {
    const { name, category, condition, location } = form;
    if (!name || !category || !condition || !location) {
      setFormAlert('⚠ Please fill in all fields.');
      return;
    }

    try {
      setFormLoading(true);
      const res = await api.post('rentals/equipment/', form);
      setCatalog([res.data, ...catalog]);
      setOpen(false);
      setForm({ name: '', category: '', condition: '', location: '' });
      setFormAlert(null);
    } catch (err) {
      console.error('❌ Error creating equipment:', err);
      setFormAlert(err.response?.data?.detail || '❌ Failed to create equipment.');
    } finally {
      setFormLoading(false);
    }
  };

  const filtered = catalog.filter((item) =>
    item.name?.toLowerCase().includes(search.toLowerCase())
  );

  const paginated = filtered.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom>
          Equipment Catalog
        </Typography>
        <Typography variant="subtitle1" sx={{ mb: 3 }}>
          Browse available equipment, categories, and locations
        </Typography>

        <Box display="flex" justifyContent="space-between" mb={2}>
          <TextField
            placeholder="Search equipment..."
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

          <Button variant="contained" onClick={() => setOpen(true)}>
            Add Equipment
          </Button>
        </Box>

        {loading ? (
          <Box display="flex" justifyContent="center" py={5}>
            <CircularProgress />
          </Box>
        ) : error ? (
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
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginated.length > 0 ? (
                    paginated.map((item, index) => (
                      <TableRow key={item.id}>
                        <TableCell>{(page - 1) * itemsPerPage + index + 1}</TableCell>
                        <TableCell>{item.name}</TableCell>
                        <TableCell>{item.category}</TableCell>
                        <TableCell>{item.condition}</TableCell>
                        <TableCell>{item.location}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} align="center">
                        No equipment found.
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
          </>
        )}
      </Paper>

      {/* Equipment Creation Modal */}
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Add Equipment</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                name="name"
                label="Name"
                fullWidth
                value={form.name}
                onChange={handleChange}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                name="category"
                label="Category"
                fullWidth
                value={form.category}
                onChange={handleChange}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                name="condition"
                label="Condition"
                fullWidth
                value={form.condition}
                onChange={handleChange}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                name="location"
                label="Location"
                fullWidth
                value={form.location}
                onChange={handleChange}
              />
            </Grid>
          </Grid>

          {formAlert && (
            <Alert sx={{ mt: 2 }} severity={formAlert.includes('❌') ? 'error' : 'warning'}>
              {formAlert}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateEquipment} disabled={formLoading}>
            {formLoading ? <CircularProgress size={24} color="inherit" /> : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
