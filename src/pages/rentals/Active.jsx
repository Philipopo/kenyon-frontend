import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Paper, Box, TextField, InputAdornment, Table, TableHead,
  TableRow, TableCell, TableBody, TableContainer, Pagination, CircularProgress, Alert,
  Button, Dialog, DialogTitle, DialogContent, DialogActions, Grid, MenuItem, Select,
  InputLabel, FormControl
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import api from '../../api';

export default function ActiveRentals() {
  const [rentals, setRentals] = useState([]);
  const [equipmentList, setEquipmentList] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    equipment: '',
    start_date: '',
    due_date: '',
    status: 'Active',
  });

  const [formLoading, setFormLoading] = useState(false);
  const [formAlert, setFormAlert] = useState(null);
  const itemsPerPage = 10;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [rentalsRes, equipmentRes] = await Promise.all([
          api.get('rentals/rentals/'),
          api.get('rentals/equipment/')
        ]);
        setRentals(rentalsRes.data);
        setEquipmentList(equipmentRes.data);
      } catch (err) {
        console.error('❌ Error fetching data:', err);
        setError('Failed to load rentals or equipment.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleCreateRental = async () => {
    if (!form.equipment || !form.start_date || !form.due_date) {
      setFormAlert('⚠ Please fill all required fields.');
      return;
    }

    try {
      setFormLoading(true);
      const payload = { ...form };
      const res = await api.post('rentals/rentals/', payload);
      setRentals([res.data, ...rentals]);
      setOpen(false);
      setFormAlert(null);
      setForm({ equipment: '', start_date: '', due_date: '', status: 'Active' });
    } catch (err) {
      console.error('❌ Failed to create rental:', err);
      setFormAlert(err.response?.data?.detail || '❌ Error creating rental.');
    } finally {
      setFormLoading(false);
    }
  };

  const filtered = rentals.filter(
    (r) =>
      r.renter_name?.toLowerCase().includes(search.toLowerCase()) ||
      r.equipment_name?.toLowerCase().includes(search.toLowerCase())
  );

  const paginated = filtered.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom>Active Rentals</Typography>
        <Typography variant="subtitle1" sx={{ mb: 3 }}>
          All currently active or overdue rental records.
        </Typography>

        <Box display="flex" justifyContent="space-between" mb={2}>
          <TextField
            placeholder="Search by renter or equipment..."
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
            Add Rental
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
                    <TableCell>Renter</TableCell>
                    <TableCell>Equipment</TableCell>
                    <TableCell>Start Date</TableCell>
                    <TableCell>Due Date</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginated.length > 0 ? (
                    paginated.map((rental, index) => (
                      <TableRow key={rental.id}>
                        <TableCell>{(page - 1) * itemsPerPage + index + 1}</TableCell>
                        <TableCell>{rental.renter_name}</TableCell>
                        <TableCell>{rental.equipment_name}</TableCell>
                        <TableCell>{new Date(rental.start_date).toLocaleDateString()}</TableCell>
                        <TableCell>{new Date(rental.due_date).toLocaleDateString()}</TableCell>
                        <TableCell>{rental.status}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        No rentals found.
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

      {/* Modal for adding rental */}
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Add New Rental</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <FormControl fullWidth required>
                <InputLabel id="equipment-label">Equipment</InputLabel>
                <Select
                  labelId="equipment-label"
                  id="equipment-select"
                  name="equipment"
                  value={form.equipment}
                  label="Equipment"
                  onChange={handleChange}
                >
                  <MenuItem value="" disabled>-- Select Equipment --</MenuItem>
                  {equipmentList.map((eq) => (
                    <MenuItem key={eq.id} value={eq.id}>
                      {eq.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={6}>
              <TextField
                name="start_date"
                label="Start Date"
                type="date"
                fullWidth
                value={form.start_date}
                onChange={handleChange}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={6}>
              <TextField
                name="due_date"
                label="Due Date"
                type="date"
                fullWidth
                value={form.due_date}
                onChange={handleChange}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select name="status" value={form.status} onChange={handleChange}>
                  <MenuItem value="Active">Active</MenuItem>
                  <MenuItem value="Overdue">Overdue</MenuItem>
                </Select>
              </FormControl>
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
          <Button variant="contained" onClick={handleCreateRental} disabled={formLoading}>
            {formLoading ? <CircularProgress size={24} color="inherit" /> : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
