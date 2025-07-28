import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Paper,
  Grid,
  LinearProgress,
  TextField,
  Button,
  Modal,
  Box,
  InputAdornment,
  Pagination,
  Divider, // 
  Alert, // 
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import API from '../../api'; // Axios instance with token handling

const generateBinId = (row, rack, shelf) => `A${row}-R${rack}-S${shelf}`;

const modalStyle = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 700,
  bgcolor: 'background.paper',
  boxShadow: 24,
  p: 4,
  borderRadius: 2
};

export default function BinLocations() {
  const [bins, setBins] = useState([]);
  const [formData, setFormData] = useState({
    row: '',
    rack: '',
    shelf: '',
    type: '',
    capacity: '',
    used: '',
    description: '' // ✅ New field
  });
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const binsPerPage = 10;

  useEffect(() => {
    API.get('inventory/bins/')
      .then((res) => setBins(res.data))
      .catch((err) => console.error('Error fetching bins:', err));
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

const [error, setError] = useState('');


const handleAddBin = () => {
  const { row, rack, shelf, type, capacity, used, description } = formData;

  // Check for empty required fields
  if (!row || !rack || !shelf || !type || !capacity || !used) {
    setError('Please fill in all required fields.');
    return;
  }

  const id = generateBinId(row, rack, shelf);

  const payload = {
    bin_id: id,
    row,
    rack,
    shelf,
    type,
    capacity: Number(capacity),
    used: Number(used),
    description,
  };

  API.post('inventory/bins/', payload)
    .then((res) => {
      setBins((prev) => [...prev, res.data]);
      setFormData({
        row: '',
        rack: '',
        shelf: '',
        type: '',
        capacity: '',
        used: '',
        description: '',
      });
      setError('');
      setOpen(false);
    })
    .catch((err) => {
      const backendError = err.response?.data?.detail || 'Error adding bin.';
      setError(backendError);
      console.error('Error adding bin:', err);
    });
};




  const filteredBins = bins.filter((bin) =>
    Object.values(bin).some((val) =>
      String(val).toLowerCase().includes(search.toLowerCase())
    )
  );

  const paginatedBins = filteredBins.slice((page - 1) * binsPerPage, page * binsPerPage);
  const [selectedBin, setSelectedBin] = useState(null);

      const handleBinClick = (bin) => {
            setSelectedBin(bin);
          };

      const handleModalClose = () => {
            setSelectedBin(null);
          };


  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Bin Locations
      </Typography>

      {/* Search and Add Button */}
      <Grid container justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            size="small"
            placeholder="Search bins..."
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
              )
            }}
          />
        </Grid>
        <Grid item>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}>
            Add New Bin
          </Button>
        </Grid>
      </Grid>

      {/* Visual Bin Map */}
      <Paper sx={{ p: 3 }}>
  <Typography variant="h6" gutterBottom>
    Warehouse Bin Map
  </Typography>

  <Grid container spacing={2}>
    {paginatedBins.length > 0 ? (
      paginatedBins.map((bin, idx) => {
        const utilization = (bin.used / bin.capacity) * 100;
        return (
          <Grid item xs={12} sm={6} md={4} key={idx}>
            <Paper
              onClick={() => handleBinClick(bin)}
              sx={{
                p: 2,
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider',
                cursor: 'pointer',
                '&:hover': { boxShadow: 3 },
              }}
            >
              <Typography variant="subtitle1" fontWeight="bold">
                {bin.bin_id}
              </Typography>
              <Typography variant="body2" gutterBottom>{bin.type}</Typography>
              <Typography variant="caption">Used: {bin.used} / {bin.capacity}</Typography>
              <LinearProgress
                variant="determinate"
                value={utilization}
                sx={{
                  mt: 1,
                  height: 10,
                  borderRadius: 5,
                  backgroundColor: 'divider',
                  '& .MuiLinearProgress-bar': {
                    backgroundColor:
                      utilization < 50 ? '#66bb6a' :
                        utilization < 80 ? '#ffa726' :
                          '#ef5350'
                  }
                }}
              />
            </Paper>
          </Grid>
        );
      })
    ) : (
      <Typography variant="body2" sx={{ m: 2 }}>
        No matching bins found.
      </Typography>
    )}
  </Grid>

  {/* Pagination */}
  {filteredBins.length > binsPerPage && (
    <Box mt={4} display="flex" justifyContent="center">
      <Pagination
        count={Math.ceil(filteredBins.length / binsPerPage)}
        page={page}
        onChange={(_, value) => setPage(value)}
        color="primary"
      />
    </Box>
  )}

  {/* Bin Detail Popup */}
  <Modal open={!!selectedBin} onClose={handleModalClose}>
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
        outline: 'none'
      }}
    >
      {selectedBin && (
        <>
          <Typography variant="h6" gutterBottom>
            Bin Details: {selectedBin.bin_id}
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <Typography variant="body2" gutterBottom><strong>Type:</strong> {selectedBin.type}</Typography>
          <Typography variant="body2" gutterBottom><strong>Row:</strong> {selectedBin.row}</Typography>
          <Typography variant="body2" gutterBottom><strong>Rack:</strong> {selectedBin.rack}</Typography>
          <Typography variant="body2" gutterBottom><strong>Shelf:</strong> {selectedBin.shelf}</Typography>
          <Typography variant="body2" gutterBottom><strong>Capacity:</strong> {selectedBin.capacity}</Typography>
          <Typography variant="body2" gutterBottom><strong>Used:</strong> {selectedBin.used}</Typography>
          <Typography variant="body2" gutterBottom><strong>Description:</strong> {selectedBin.description || 'N/A'}</Typography>

          <Typography variant="body2" gutterBottom><strong>Type:</strong> {selectedBin.type}</Typography>
          <Typography variant="body2" gutterBottom><strong>Row:</strong> {selectedBin.row}</Typography>
          <Typography variant="body2" gutterBottom><strong>Rack:</strong> {selectedBin.rack}</Typography>
          <Typography variant="body2" gutterBottom><strong>Shelf:</strong> {selectedBin.shelf}</Typography>
        </>
      )}
    </Box>
  </Modal>
</Paper>

      {/* Modal for Adding New Bin */}
      <Modal open={open} onClose={() => setOpen(false)}>
  
        <Box sx={modalStyle}>
                <Grid item xs={12} textAlign="right">
     {error && (
  <Alert severity="error" sx={{ mb: 2 }}>
    {error}
  </Alert>
)}
  </Grid>
          <Typography variant="h6" gutterBottom>
            Add New Bin Slot
          </Typography>
          <Grid container spacing={2}>
  <Grid item xs={4}>
    <TextField
      label="Row"
      name="row"
      value={formData.row}
      onChange={handleChange}
      fullWidth
    />
  </Grid>
  <Grid item xs={4}>
    <TextField
      label="Rack"
      name="rack"
      value={formData.rack}
      onChange={handleChange}
      fullWidth
    />
  </Grid>
  <Grid item xs={4}>
    <TextField
      label="Shelf"
      name="shelf"
      value={formData.shelf}
      onChange={handleChange}
      fullWidth
    />
  </Grid>
  <Grid item xs={6}>
    <TextField
      label="Type"
      name="type"
      value={formData.type}
      onChange={handleChange}
      fullWidth
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
    />
  </Grid>

  {/* ✅ Description Field */}
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
    <Button variant="contained" onClick={handleAddBin}>
      Save Bin
    </Button>
  </Grid>
   
 

</Grid>

        </Box>
      </Modal>
    </Container>
  );
}
