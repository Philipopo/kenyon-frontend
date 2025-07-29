import React, { useState, useEffect } from 'react';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import {
  Container, Typography, Paper, Grid, Button, TextField, Select,
  MenuItem, FormControl, InputLabel, Table, TableHead, TableRow,
  TableCell, TableBody, IconButton, Divider, Dialog, DialogTitle,
  DialogContent, DialogActions, Box, Pagination, CircularProgress, Alert,
  Rating
} from '@mui/material';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import API from '../../api';

export default function PurchaseOrders() {
  const [formData, setFormData] = useState({ itemName: '', eoq: '', vendor: '', notes: '', status: 'Pending' });
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [vendorList, setVendorList] = useState([]);
  const [open, setOpen] = useState(false);
  const [vendorOpen, setVendorOpen] = useState(false);
  const [newVendor, setNewVendor] = useState({ name: '', details: '', lead_time: '', ratings: 3, document: null });
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchOrders();
    fetchVendors();
  }, []);

  const fetchOrders = async () => {
    try {
      const res = await API.get('procurement/purchase-orders/');
      setPurchaseOrders(res.data.reverse());
    } catch (err) {
      console.error('❌ Failed to fetch purchase orders:', err);
    }
  };

  const fetchVendors = async () => {
    try {
      const res = await API.get('procurement/vendors/');
      setVendorList(res.data);
    } catch (err) {
      console.error('❌ Failed to fetch vendors:', err);
    }
  };

  const renderStars = (rating) =>
    [...Array(5)].map((_, i) =>
      i < rating ? <StarIcon key={i} fontSize="small" color="warning" />
        : <StarBorderIcon key={i} fontSize="small" />
    );

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleGeneratePO = async () => {
    if (!formData.itemName || !formData.eoq || !formData.vendor) {
      setAlert('⚠ Please fill all required fields.');
      return;
    }

    setLoading(true);
    setAlert(null);

try {
  const vendor = vendorList.find(v => v.id === parseInt(formData.vendor));
  const amount = vendor ? vendor.price * parseInt(formData.eoq || 1) : null;

  if (!formData.vendor || amount === null) {
    setAlert("❌ Please select a valid vendor and EOQ.");
    return;
  }

  const res = await API.post('procurement/purchase-orders/', {
    item_name: formData.itemName,
    eoq: parseInt(formData.eoq),
    vendor_id: parseInt(formData.vendor),  // ✅ match backend field
    notes: formData.notes,
    status: formData.status,
    amount: amount || 0                        // ✅ ensure it's not null
  });

  setPurchaseOrders([res.data, ...purchaseOrders]);
  setFormData({
    itemName: '',
    eoq: '',
    vendor: '',
    notes: '',
    status: 'Pending'
  });
  setOpen(false);
  setAlert('✅ Purchase Order created successfully.');
} catch (err) {
  console.error(err);
  if (err.response?.data) {
    const detail = JSON.stringify(err.response.data);
    setAlert(`❌ Failed to create purchase order: ${detail}`);
  } else {
    setAlert('❌ Failed to create purchase order.');
  }
} finally {
  setLoading(false);
}


  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewVendor((prev) => ({ ...prev, [name]: value }));
  };

  const handleRatingChange = (_, value) => {
    setNewVendor((prev) => ({ ...prev, ratings: value || 3 }));
  };

  const handleFileChange = (e) => {
    setNewVendor((prev) => ({ ...prev, document: e.target.files[0] }));
  };

  const handleCreateVendor = async () => {
    if (!newVendor.name || !newVendor.lead_time) {
      setAlert('⚠ Please fill all required fields.');
      return;
    }

    try {
      const form = new FormData();
      form.append('name', newVendor.name);
      form.append('details', newVendor.details || '');
      form.append('lead_time', newVendor.lead_time);
      form.append('ratings', newVendor.ratings);
      if (newVendor.document) form.append('document', newVendor.document);

      const res = await API.post('procurement/vendors/', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setVendorList([...vendorList, res.data]);
      setNewVendor({ name: '', details: '', lead_time: '', ratings: 3, document: null });
      setAlert('✅ Vendor created successfully.');
      setVendorOpen(false);
    } catch (err) {
      console.error(err);
      setAlert('❌ Failed to create vendor.');
    }
  };

  const paginatedPOs = purchaseOrders.slice((page - 1) * itemsPerPage, page * itemsPerPage);
  const vendor = vendorList.find(v => v.id === parseInt(formData.vendor));
  return (
    <Container>
      <Paper elevation={3} sx={{ p: 4, mt: 4 }}>
        <Typography variant="h4" gutterBottom>Purchase Orders</Typography>
        <Typography sx={{ mb: 3 }}>
          Automate your procurement workflow with EOQ-based replenishment and smart vendor tools.
        </Typography>

        <Button variant="contained" color="primary" onClick={() => setOpen(true)} sx={{ mb: 3 }}>
          Generate New PO
        </Button>

        <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
          <DialogTitle>Generate New Purchase Order</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}><TextField fullWidth label="Item Name" name="itemName" value={formData.itemName} onChange={handleChange} /></Grid>
              <Grid item xs={12}><TextField fullWidth label="Recommended EOQ" name="eoq" type="number" value={formData.eoq} onChange={handleChange} /></Grid>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Vendor</InputLabel>
                  <Select name="vendor" value={formData.vendor} onChange={handleChange}>
                    {vendorList.map((vendor) => (
                      <MenuItem key={vendor.id} value={vendor.id}>{vendor.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
               
              </Grid>
              <Grid item xs={12}><TextField
  label="Amount"
  value={vendor ? vendor.price * parseInt(formData.eoq || 1) : ''}
  fullWidth
  margin="normal"
  InputProps={{ readOnly: true }}
/></Grid>
              <Grid item xs={12}><TextField fullWidth label="Notes" name="notes" multiline rows={3} value={formData.notes} onChange={handleChange} /></Grid>
              
            </Grid>
             <Button onClick={() => setVendorOpen(true)} size="small" sx={{ mt: 1 }}>Create Vendor</Button>
            {alert && (
              <Alert sx={{ mt: 2 }} severity={alert.includes('❌') ? 'error' : alert.includes('⚠') ? 'warning' : 'success'}>
                {alert}
              </Alert>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button variant="contained" onClick={handleGeneratePO} disabled={loading}>
              {loading ? <CircularProgress size={24} color="inherit" /> : 'Generate'}
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog open={vendorOpen} onClose={() => setVendorOpen(false)} fullWidth maxWidth="sm">
          <DialogTitle>Create New Vendor</DialogTitle>
          <DialogContent dividers>
            {alert && <Alert severity="info" sx={{ mb: 2 }}>{alert}</Alert>}
            <TextField fullWidth label="Name" name="name" value={newVendor.name} onChange={handleInputChange} sx={{ mb: 2 }} />
            <TextField fullWidth label="Details" name="details" value={newVendor.details} onChange={handleInputChange} multiline rows={3} sx={{ mb: 2 }} />
            <TextField fullWidth label="Lead Time (days)" name="lead_time" type="number" value={newVendor.lead_time} onChange={handleInputChange} sx={{ mb: 2 }} />
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
              <span style={{ marginRight: 8 }}>Rating:</span>
              <Rating name="ratings" value={newVendor.ratings} onChange={handleRatingChange} />
            </div>
            <input type="file" onChange={handleFileChange} />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setVendorOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateVendor} variant="contained">Save</Button>
          </DialogActions>
        </Dialog>

        <Typography variant="h6" gutterBottom>
          Vendor Comparison <IconButton><CompareArrowsIcon /></IconButton>
        </Typography>

        <Table size="small" sx={{ mb: 4 }}>
  <TableHead>
    <TableRow>
      <TableCell>Vendor</TableCell>
      <TableCell>Lead Time</TableCell>
      <TableCell>Rating</TableCell>
      <TableCell>Document</TableCell> {/* New header */}
    </TableRow>
  </TableHead>
  <TableBody>
    {vendorList.map((vendor) => (
      <TableRow key={vendor.id}>
        <TableCell>{vendor.name}</TableCell>
        <TableCell>{vendor.lead_time} days</TableCell>
        <TableCell>{renderStars(vendor.ratings)}</TableCell>
        <TableCell>
          {vendor.document ? (
            <a href={vendor.document} target="_blank" rel="noopener noreferrer">
              <PictureAsPdfIcon color="error" />
            </a>
          ) : (
            <Typography variant="body2" color="textSecondary">
              No PDF
            </Typography>
          )}
        </TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>


        <Divider sx={{ my: 3 }} />
        <Typography variant="h6" gutterBottom>Generated Purchase Orders</Typography>
        {purchaseOrders.length > 0 ? (
          <>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>#</TableCell>
                  <TableCell>Item</TableCell>
                  <TableCell>EOQ</TableCell>
                  <TableCell>Vendor</TableCell>
                  <TableCell>Date</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedPOs.map((po) => (
                  <TableRow key={po.id}>
                    <TableCell>{po.id}</TableCell>
                    <TableCell>{po.item_name}</TableCell>
                    <TableCell>{po.eoq}</TableCell>
                    <TableCell>{po.vendor?.name || '—'}</TableCell>
                    <TableCell>{po.date}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {purchaseOrders.length > itemsPerPage && (
              <Box mt={3} display="flex" justifyContent="center">
                <Pagination
                  count={Math.ceil(purchaseOrders.length / itemsPerPage)}
                  page={page}
                  onChange={(_, value) => setPage(value)}
                  color="primary"
                />
              </Box>
            )}
          </>
        ) : (
          <Typography>No purchase orders generated yet.</Typography>
        )}
      </Paper>
    </Container>
  );
}
