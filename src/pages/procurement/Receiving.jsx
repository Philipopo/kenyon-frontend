// src/pages/procurement/Receiving.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Container,
  Paper,
  Typography,
  Button,
  Box,
  Grid,
  Divider,
  Alert,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  Pagination,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  InputAdornment,
  Chip,
  TextField,
  Autocomplete,
  Collapse,
  Card,
  CardContent,
  CardHeader,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Close as CloseIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Inventory as InventoryIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { debounce } from 'lodash';
import API from '../../api';
import { useSearch } from '../../context/SearchContext';

const STATUS_COLORS = {
  pending: 'default',
  partial: 'warning',
  complete: 'success',
  rejected: 'error',
};

export default function Receiving() {
  const [receivings, setReceivings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);
  const [checkingPermissions, setCheckingPermissions] = useState(true);
  const [hasPermission, setHasPermission] = useState(false);
  const [permissions, setPermissions] = useState({
    create_receiving: false,
    update_receiving: false,
  });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const { searchTerm } = useSearch();
  const itemsPerPage = 10;
  const prevSearchTermRef = useRef(searchTerm);
  const prevSearchRef = useRef(search);

  // Modal states
  const [openModal, setOpenModal] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    po: null,
    invoice_number: '',
    invoice_date: '',
    notes: '',
    items: [],
  });

  // Data for dropdowns
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [storageBins, setStorageBins] = useState([]);

  // Tutorial state
  const [showTutorial, setShowTutorial] = useState(false);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedSetSearch = useCallback(
    debounce((value) => {
      setSearch(value);
      setPage(1);
    }, 500),
    []
  );

  // Fetch receivings
  const fetchReceivings = useCallback(async () => {
    try {
      setLoading(true);
      const searchValue = search || searchTerm;
      const res = await API.get('procurement/receivings/', {
        params: {
          search: searchValue,
          page,
          page_size: itemsPerPage,
        },
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
      });
      setReceivings(res.data.results || []);
      setTotalPages(Math.ceil(res.data.count / itemsPerPage));
      setAlert(null);
    } catch (err) {
      console.error('Error fetching receivings:', err.response?.data || err.message);
      setAlert('❌ Failed to fetch receivings: ' + (err.response?.data?.detail || err.message));
      setReceivings([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [search, searchTerm, page, itemsPerPage]);

  // Fetch approved purchase orders for dropdown
  const fetchApprovedPOs = useCallback(async () => {
    try {
      const res = await API.get('procurement/purchase-orders/', {
        params: {
          status: 'approved',
          page_size: 1000,
        },
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
      });
      setPurchaseOrders(res.data.results || []);
    } catch (err) {
      console.error('Error fetching approved POs:', err);
    }
  }, []);

  // Fetch storage bins for dropdown - FIXED ENDPOINT
  const fetchStorageBins = useCallback(async () => {
    try {
      const res = await API.get('inventory/bins/', {  // ✅ Correct endpoint
        params: { page_size: 1000 },
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
      });
      setStorageBins(res.data.results || []);
    } catch (err) {
      console.error('Error fetching storage bins:', err);
      setAlert('❌ Failed to load storage bins. Please try again.');
    }
  }, []);

  // Check permissions and fetch data
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

        // Check page permission
        const pageResponse = await API.get('/auth/permissions/page/receiving/');
        setHasPermission(pageResponse.data.allowed || false);

        if (!pageResponse.data.allowed) {
          setAlert(`⚠️ You do not have permission to view this page: ${pageResponse.data.reason || 'No reason provided'}`);
        } else {
          // Check action permissions
          const actions = ['create_receiving', 'update_receiving'];
          const actionPerms = {};
          for (const action of actions) {
            const actionResponse = await API.get(`/auth/permissions/action/${action}/`);
            actionPerms[action] = actionResponse.data.allowed || false;
          }
          setPermissions(actionPerms);

          // Fetch data
          fetchReceivings();
          fetchApprovedPOs();
          fetchStorageBins();
        }
      } catch (err) {
        console.error('Error checking permissions:', err.response?.data || err.message);
        setAlert(`⚠️ Failed to check permissions: ${err.response?.data?.detail || err.message}`);
        setHasPermission(false);
      } finally {
        setCheckingPermissions(false);
      }
    };

    checkPermissions();
  }, [fetchReceivings, fetchApprovedPOs, fetchStorageBins]);

  // Handle search and pagination
  useEffect(() => {
    if (hasPermission && (search !== prevSearchRef.current || searchTerm !== prevSearchTermRef.current)) {
      setPage(1);
      prevSearchRef.current = search;
      prevSearchTermRef.current = searchTerm;
    }
    if (hasPermission) fetchReceivings();
  }, [search, searchTerm, page, hasPermission, fetchReceivings]);

  // Handle PO selection
  const handlePOChange = (newValue) => {
    setFormData((prev) => ({
      ...prev,
      po: newValue,
      items: newValue
        ? newValue.items.map((item) => ({
            po_item: item.id,
            received_quantity: 0,
            accepted_quantity: 0,
            rejected_quantity: 0,
            rejection_reason: '',
            storage_bin: null,
            batch_number: '',
            expiry_date: '',
          }))
        : [],
    }));
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handle item quantity changes
  const handleItemQuantityChange = (index, field, value) => {
    setFormData((prev) => {
      const newItems = [...prev.items];
      const numValue = value === '' ? 0 : parseInt(value);

      if (field === 'received_quantity') {
        // Ensure received quantity doesn't exceed remaining PO quantity
        const poItem = purchaseOrders
          .find((po) => po.id === prev.po?.id)
          ?.items.find((item) => item.id === newItems[index].po_item);

        const maxAllowed = poItem ? poItem.quantity - poItem.received_quantity : 0;
        const clampedValue = Math.min(Math.max(0, numValue), maxAllowed);

        newItems[index] = {
          ...newItems[index],
          received_quantity: clampedValue,
          accepted_quantity: Math.min(newItems[index].accepted_quantity, clampedValue),
          rejected_quantity: clampedValue - Math.min(newItems[index].accepted_quantity, clampedValue),
        };
      } else if (field === 'accepted_quantity') {
        const received = newItems[index].received_quantity;
        const clampedValue = Math.min(Math.max(0, numValue), received);
        newItems[index] = {
          ...newItems[index],
          accepted_quantity: clampedValue,
          rejected_quantity: received - clampedValue,
        };
      }

      return { ...prev, items: newItems };
    });
  };

  // Handle item field changes
  const handleItemFieldChange = (index, field, value) => {
    setFormData((prev) => {
      const newItems = [...prev.items];
      newItems[index] = {
        ...newItems[index],
        [field]: value,
      };
      return { ...prev, items: newItems };
    });
  };

  // Open modal for creating new receiving
  const handleOpenCreateModal = () => {
    if (!permissions.create_receiving) {
      setAlert('⚠️ You do not have permission to create receiving records.');
      return;
    }

    setFormData({
      po: null,
      invoice_number: '',
      invoice_date: '',
      notes: '',
      items: [],
    });
    setOpenModal(true);
  };

  // Submit receiving record
  // Submit receiving record
// Submit receiving record
const handleSubmit = async () => {
  // Validate form
  if (!formData.po || !formData.invoice_number || !formData.invoice_date || formData.items.length === 0) {
    setAlert('⚠️ Please fill all required fields and add at least one item.');
    return;
  }

  // Validate each item
  for (let i = 0; i < formData.items.length; i++) {
    const item = formData.items[i];
    if (item.received_quantity <= 0) {
      setAlert(`⚠️ Item ${i + 1}: Received quantity must be positive.`);
      return;
    }
    if (item.accepted_quantity < 0) {
      setAlert(`⚠️ Item ${i + 1}: Accepted quantity cannot be negative.`);
      return;
    }
    if (item.accepted_quantity > item.received_quantity) {
      setAlert(`⚠️ Item ${i + 1}: Accepted quantity cannot exceed received quantity.`);
      return;
    }
    if (item.accepted_quantity > 0 && !item.storage_bin) {
      setAlert(`⚠️ Item ${i + 1}: Storage bin is required for accepted items.`);
      return;
    }
    if (item.rejected_quantity > 0 && !item.rejection_reason) {
      setAlert(`⚠️ Item ${i + 1}: Rejection reason is required when rejecting items.`);
      return;
    }
  }

  try {
    setLoading(true);
    setAlert(null);

    // ✅ DO NOT include received_by — backend sets it automatically
    const payload = {
      po: formData.po.id,
      invoice_number: formData.invoice_number,
      invoice_date: formData.invoice_date,
      notes: formData.notes,
      items: formData.items.map((item) => ({
        po_item: item.po_item,
        received_quantity: item.received_quantity,
        accepted_quantity: item.accepted_quantity,
        rejection_reason: item.rejection_reason || '',
        storage_bin: item.storage_bin ? item.storage_bin.id : null,
        batch_number: item.batch_number || '',
        expiry_date: item.expiry_date || null,
      })),
    };

    // ✅ Send with auth header (you already do this correctly)
    const response = await API.post('procurement/receivings/', payload, {
      headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
    });

    setReceivings([response.data, ...receivings]);
    setAlert('✅ Receiving record created successfully!');
    setOpenModal(false);
    fetchReceivings();
  } catch (err) {
    console.error('Submit error:', err);
    let errorMsg = '❌ Failed to save receiving record.';
    if (err.response?.data) {
      const errors = err.response.data;
      if (typeof errors === 'object') {
        errorMsg = Object.entries(errors)
          .map(([field, msg]) => {
            if (field === 'items' && Array.isArray(msg)) {
              return msg
                .map((itemErr, idx) => {
                  if (itemErr && typeof itemErr === 'object') {
                    return Object.entries(itemErr)
                      .map(([k, v]) => `Item ${idx + 1} ${k}: ${Array.isArray(v) ? v[0] : v}`)
                      .join('; ');
                  }
                  return `Item ${idx + 1}: ${itemErr}`;
                })
                .join('; ');
            }
            return `${field}: ${Array.isArray(msg) ? msg.join(', ') : msg}`;
          })
          .join('; ');
      } else {
        errorMsg = errors.detail || errorMsg;
      }
    }
    setAlert(errorMsg);
  } finally {
    setLoading(false);
  }
};


  // Get PO item details
  const getPOItemDetails = (poItemId) => {
    if (!formData.po) return null;
    return formData.po.items.find((item) => item.id === poItemId);
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
    <Container maxWidth="lg">
      {alert && (
        <Alert
          sx={{ mt: 2, mb: 2 }}
          severity={alert.includes('❌') ? 'error' : alert.includes('⚠') ? 'warning' : 'success'}
          onClose={() => setAlert(null)}
        >
          {alert}
        </Alert>
      )}

      <Paper elevation={3} sx={{ p: 4, mt: 4 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h5">Receiving Management</Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpenCreateModal}
            disabled={!permissions.create_receiving}
          >
            Create Receiving Record
          </Button>
        </Box>

        {/* Tutorial Section */}
        <Card variant="outlined" sx={{ mb: 4, borderColor: 'primary.main', bgcolor: 'background.paper' }}>
          <CardHeader
            title={
              <Box display="flex" alignItems="center" gap={1}>
                <InventoryIcon color="primary" />
                <Typography variant="h6" color="primary">
                  Page 3 of 4: Receiving Management
                </Typography>
              </Box>
            }
            action={
              <IconButton onClick={() => setShowTutorial(!showTutorial)}>
                {showTutorial ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </IconButton>
            }
          />
          <Collapse in={showTutorial}>
            <CardContent>
              <Typography paragraph>
                This page allows warehouse staff to record goods received against approved purchase orders. When goods arrive from vendors, you create a receiving record to document what was delivered, what was accepted into inventory, and what was rejected.
              </Typography>

              <Typography variant="subtitle1" gutterBottom>
                Key Validation Rules:
              </Typography>
              <ul>
                <li>
                  <strong>Cannot receive more than PO quantity:</strong> The system prevents you from receiving more items than what was ordered in the purchase order. If a PO item has 100 units ordered and 20 already received, you can only receive up to 80 more units.
                </li>
                <li>
                  <strong>Accepted items require storage bin:</strong> Any items you accept into inventory must be assigned to a specific storage location (storage bin). This ensures proper inventory tracking.
                </li>
                <li>
                  <strong>Rejected items require reason:</strong> If you reject any portion of the delivery, you must provide a reason for rejection (e.g., "Damaged", "Wrong item", "Expired").
                </li>
              </ul>

              <Typography variant="subtitle1" gutterBottom>
                Workflow:
              </Typography>
              <ol>
                <li>Select an approved Purchase Order (PO) that goods are being delivered against</li>
                <li>Enter invoice details (number and date)</li>
                <li>
                  For each PO item:
                  <ul>
                    <li>Enter the quantity actually received</li>
                    <li>Specify how much to accept into inventory (must assign storage bin)</li>
                    <li>Specify how much to reject (must provide rejection reason)</li>
                  </ul>
                </li>
                <li>Submit the receiving record</li>
                <li>
                  The system automatically:
                  <ul>
                    <li>Updates PO status (to "Partially Received" or "Received")</li>
                    <li>Updates inventory stock for accepted items</li>
                    <li>Generates a Goods Receipt Note (GRN)</li>
                  </ul>
                </li>
              </ol>

              <Typography variant="subtitle1" gutterBottom>
                Important Notes:
              </Typography>
              <ul>
                <li>You can only receive against approved POs</li>
                <li>Accepted quantity + Rejected quantity must equal Received quantity</li>
                <li>Storage bins are required for all accepted items</li>
                <li>Rejection reasons are mandatory when rejecting items</li>
                <li>Once submitted, receiving records cannot be edited</li>
              </ul>
            </CardContent>
          </Collapse>
        </Card>

        <Grid container spacing={2} mb={3}>
          <Grid item xs={12} md={6}>
            <Typography variant="body1" color="text.secondary">
              Record goods received against purchase orders. Document what was delivered, what was accepted into inventory, and what was rejected.
            </Typography>
          </Grid>
          <Grid item xs={12} md={6} display="flex" justifyContent="flex-end">
            <TextField
              size="small"
              placeholder="Search receiving records..."
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
          </Grid>
        </Grid>

        <Divider sx={{ my: 3 }} />

        <Typography variant="h6" gutterBottom>
          Receiving Records
        </Typography>

        {receivings.length > 0 ? (
          <>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>GRN</TableCell>
                    <TableCell>PO Code</TableCell>
                    <TableCell>Vendor</TableCell>
                    <TableCell>Invoice</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Created</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {receivings.map((receiving) => (
                    <TableRow key={receiving.id}>
                      <TableCell>
                        <Tooltip title="Goods Receipt Note">
                          <strong>{receiving.grn}</strong>
                        </Tooltip>
                      </TableCell>
                      <TableCell>{receiving.po?.code || 'N/A'}</TableCell>
                      <TableCell>{receiving.po?.vendor?.name || 'N/A'}</TableCell>
                      <TableCell>{receiving.invoice_number}</TableCell>
                      <TableCell>
                        <Chip
                          label={receiving.status.charAt(0).toUpperCase() + receiving.status.slice(1)}
                          size="small"
                          color={STATUS_COLORS[receiving.status] || 'default'}
                        />
                      </TableCell>
                      <TableCell>{new Date(receiving.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Tooltip title="View details">
                          <IconButton
                            onClick={() => {
                              // In a real app, this would open a details modal
                              alert('View details functionality would be implemented here');
                            }}
                          >
                            <CheckCircleIcon />
                          </IconButton>
                        </Tooltip>
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
          <Box textAlign="center" py={4}>
            <Typography variant="body1" color="text.secondary">
              No receiving records found.
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleOpenCreateModal}
              sx={{ mt: 2 }}
              disabled={!permissions.create_receiving}
            >
              Create Your First Receiving Record
            </Button>
          </Box>
        )}
      </Paper>

      {/* Receiving Modal */}
      <Dialog
        open={openModal}
        onClose={() => setOpenModal(false)}
        fullWidth
        maxWidth="md"
        PaperProps={{
          sx: {
            minHeight: '80vh',
          },
        }}
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            Create Receiving Record
            <IconButton onClick={() => setOpenModal(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent dividers>
          <Grid container spacing={3}>
            {/* Purchase Order Selection */}
            <Grid item xs={12}>
              <Autocomplete
                required
                options={purchaseOrders}
                getOptionLabel={(option) => `${option.code} - ${option.vendor?.name || 'N/A'}`}
                value={formData.po}
                onChange={(event, newValue) => handlePOChange(newValue)}
                renderInput={(params) => <TextField {...params} label="Select Purchase Order *" required />}
                isOptionEqualToValue={(option, value) => option.id === value.id}
              />
              <Typography variant="caption" color="text.secondary" display="block" mt={1}>
                Select an approved purchase order to receive goods against
              </Typography>
            </Grid>

            {/* Invoice Details */}
            <Grid item xs={12} md={6}>
              <TextField
                required
                label="Invoice Number *"
                name="invoice_number"
                value={formData.invoice_number}
                onChange={handleInputChange}
                fullWidth
                placeholder="Enter vendor invoice number"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                required
                label="Invoice Date *"
                type="date"
                name="invoice_date"
                value={formData.invoice_date}
                onChange={handleInputChange}
                fullWidth
                InputLabelProps={{
                  shrink: true,
                }}
              />
            </Grid>

            {/* Notes */}
            <Grid item xs={12}>
              <TextField
                label="Notes"
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                fullWidth
                multiline
                minRows={2}
                placeholder="Additional notes about the delivery..."
              />
            </Grid>

            {/* Items Section */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Receiving Items
              </Typography>

              {formData.items.length > 0 ? (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Item</TableCell>
                        <TableCell>PO Qty</TableCell>
                        <TableCell>Received</TableCell>
                        <TableCell>Accepted</TableCell>
                        <TableCell>Rejected</TableCell>
                        <TableCell>Storage Bin</TableCell>
                        <TableCell>Rejection Reason</TableCell>
                        <TableCell>Batch/Expiry</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {formData.items.map((item, index) => {
                        const poItem = getPOItemDetails(item.po_item);
                        const remainingQty = poItem ? poItem.quantity - poItem.received_quantity : 0;

                        return (
                          <TableRow key={index}>
                            <TableCell>{poItem ? poItem.item?.name : 'Unknown Item'}</TableCell>
                            <TableCell>{poItem ? `${poItem.quantity} (${remainingQty} remaining)` : 'N/A'}</TableCell>
                            <TableCell>
                              <TextField
                                type="number"
                                value={item.received_quantity}
                                onChange={(e) => handleItemQuantityChange(index, 'received_quantity', e.target.value)}
                                inputProps={{ min: 0, max: remainingQty }}
                                size="small"
                                sx={{ width: '100px' }}
                              />
                            </TableCell>
                            <TableCell>
                              <TextField
                                type="number"
                                value={item.accepted_quantity}
                                onChange={(e) => handleItemQuantityChange(index, 'accepted_quantity', e.target.value)}
                                inputProps={{ min: 0, max: item.received_quantity }}
                                size="small"
                                sx={{ width: '100px' }}
                                error={item.accepted_quantity > 0 && !item.storage_bin}
                                helperText={item.accepted_quantity > 0 && !item.storage_bin ? 'Required' : ''}
                              />
                            </TableCell>
                            <TableCell>{item.rejected_quantity}</TableCell>
                            <TableCell>
                              {/* ✅ FIXED STORAGE BIN AUTOCOMPLETE */}
                              <Autocomplete
                                options={storageBins}
                                getOptionLabel={(option) => option.bin_id || `Bin ${option.id}`}
                                value={item.storage_bin}
                                onChange={(event, newValue) => handleItemFieldChange(index, 'storage_bin', newValue)}
                                renderInput={(params) => (
                                  <TextField
                                    {...params}
                                    size="small"
                                    error={item.accepted_quantity > 0 && !item.storage_bin}
                                    helperText={item.accepted_quantity > 0 && !item.storage_bin ? 'Required' : ''}
                                  />
                                )}
                                isOptionEqualToValue={(option, value) => option?.id === value?.id}
                                disabled={item.accepted_quantity === 0}
                              />
                            </TableCell>
                            <TableCell>
                              <TextField
                                value={item.rejection_reason}
                                onChange={(e) => handleItemFieldChange(index, 'rejection_reason', e.target.value)}
                                size="small"
                                fullWidth
                                error={item.rejected_quantity > 0 && !item.rejection_reason}
                                helperText={item.rejected_quantity > 0 && !item.rejection_reason ? 'Required' : ''}
                                disabled={item.rejected_quantity === 0}
                              />
                            </TableCell>
                            <TableCell>
                              <Grid container spacing={1}>
                                <Grid item xs={6}>
                                  <TextField
                                    size="small"
                                    placeholder="Batch"
                                    value={item.batch_number}
                                    onChange={(e) => handleItemFieldChange(index, 'batch_number', e.target.value)}
                                    fullWidth
                                  />
                                </Grid>
                                <Grid item xs={6}>
                                  <TextField
                                    size="small"
                                    type="date"
                                    value={item.expiry_date}
                                    onChange={(e) => handleItemFieldChange(index, 'expiry_date', e.target.value)}
                                    InputLabelProps={{ shrink: true }}
                                    fullWidth
                                  />
                                </Grid>
                              </Grid>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Typography color="text.secondary" textAlign="center" py={2}>
                  Select a purchase order to see items available for receiving.
                </Typography>
              )}
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setOpenModal(false)} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={loading || !formData.po || formData.items.length === 0}
            startIcon={loading ? <CircularProgress size={20} /> : null}
          >
            {loading ? 'Creating...' : 'Create Receiving Record'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}