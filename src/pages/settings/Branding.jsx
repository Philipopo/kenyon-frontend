import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Paper,
  Box,
  TextField,
  InputAdornment,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  Pagination,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import api from '../../api'; // ✅ centralized axios instance

export default function CompanyBranding() {
  const [assets, setAssets] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const itemsPerPage = 10;

  useEffect(() => {
    const fetchAssets = async () => {
      try {
        const res = await api.get('settings/branding/');
        setAssets(res.data);
      } catch (err) {
        console.error(err);
        setError('Failed to load brand assets.');
      } finally {
        setLoading(false);
      }
    };

    fetchAssets();
  }, []);

  const filtered = assets.filter((item) =>
    item.name?.toLowerCase().includes(search.toLowerCase())
  );

  const paginated = filtered.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        Company Branding
      </Typography>

      <Paper elevation={3} sx={{ p: 3 }}>
        <Box display="flex" justifyContent="space-between" mb={2}>
          <TextField
            placeholder="Search by name..."
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

          <Button variant="contained" onClick={() => setModalOpen(true)}>
            Make Branding Change
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
                    <TableCell>Asset Name</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Uploaded By</TableCell>
                    <TableCell>Upload Date</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginated.length > 0 ? (
                    paginated.map((asset, index) => (
                      <TableRow key={asset.id}>
                        <TableCell>{(page - 1) * itemsPerPage + index + 1}</TableCell>
                        <TableCell>{asset.name}</TableCell>
                        <TableCell>{asset.type}</TableCell>
                        <TableCell>{asset.uploaded_by}</TableCell>
                        <TableCell>{asset.upload_date}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} align="center">
                        No brand assets found.
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

      <BrandingModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onAssetAdded={(newAsset) => setAssets((prev) => [newAsset, ...prev])}
      />
    </Container>
  );
}

function BrandingModal({ open, onClose, onAssetAdded }) {
  const [changeType, setChangeType] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [name, setName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleTypeChange = (e) => {
    setChangeType(e.target.value);
    setInputValue('');
  };

  const handleSubmit = async () => {
    const formData = new FormData();
    formData.append('type', changeType === 'logo' ? 'Logo' : changeType === 'brandColor' ? 'Color Palette' : 'Letterhead');
    formData.append('name', name || changeType);
    if (changeType === 'logo') {
      formData.append('file', inputValue);
    }

    setUploading(true);
    try {
      const res = await api.post('settings/branding/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onAssetAdded(res.data);
      onClose();
      setChangeType('');
      setName('');
      setInputValue('');
      setError('');
    } catch (err) {
      console.error(err);
      setError('Failed to save branding change.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Make Branding Changes</DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <FormControl fullWidth sx={{ mb: 3 }}>
          <InputLabel>Change Type</InputLabel>
          <Select value={changeType} onChange={handleTypeChange} label="Change Type">
            <MenuItem value="logo">Company Logo</MenuItem>
            <MenuItem value="companyName">Company Name</MenuItem>
            <MenuItem value="brandColor">Brand Color</MenuItem>
          </Select>
        </FormControl>

        <TextField
          label="Asset Name"
          fullWidth
          sx={{ mb: 2 }}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        {changeType === 'logo' && (
          <TextField
            type="file"
            fullWidth
            onChange={(e) => setInputValue(e.target.files[0])}
            InputLabelProps={{ shrink: true }}
          />
        )}

        {changeType === 'companyName' && (
          <TextField
            label="New Company Name"
            fullWidth
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
          />
        )}

        {changeType === 'brandColor' && (
          <TextField
            label="Select Brand Color"
            type="color"
            fullWidth
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            sx={{ width: 150 }}
          />
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} variant="outlined" disabled={uploading}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={!changeType || !name || (changeType === 'logo' && !inputValue)}
        >
          {uploading ? 'Saving...' : 'Save Changes'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
