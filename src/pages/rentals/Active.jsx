import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Container, Typography, Paper, Box, Button, Alert, Dialog, DialogTitle, DialogContent, DialogActions,
  Grid, FormControl, InputLabel, Select, MenuItem, TextField, Accordion, AccordionSummary, AccordionDetails,
  Table, TableHead, TableRow, TableCell, TableBody, IconButton, Pagination, Collapse, Chip, Checkbox, FormControlLabel,
  CircularProgress
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import WarningIcon from '@mui/icons-material/Warning';
import PaymentIcon from '@mui/icons-material/Payment';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import NotificationsIcon from '@mui/icons-material/Notifications';
import API from '../../api';
import { useSearch } from '../../context/SearchContext';
import dayjs from 'dayjs';

const CURRENCY_OPTIONS = [
  { value: 'NGN', label: 'Nigerian Naira (₦)' },
  { value: 'USD', label: 'US Dollar ($)' },
];

function RentalRow({ 
  rental, 
  onEdit, 
  onDelete, 
  onMarkReturned,
  onExtend,
  hasUpdatePermission, 
  hasDeletePermission, 
  hasReturnPermission,
  hasExtendPermission,
  onSelect,
  selected,
  onDownloadReceipt,
  onAddPayment,
  isLoading
}) {
  const [open, setOpen] = useState(false);

  const getDuration = useCallback(() => {
    if (rental.returned) return rental.duration_days || 0;
    if (rental.is_open_ended) {
      const start = new Date(rental.start_date);
      const today = new Date();
      return Math.ceil((today - start) / (1000 * 60 * 60 * 24));
    }
    return rental.duration_days || 0;
  }, [rental]);

  const formatCurrency = useCallback((amount, currency) => {
    if (!amount && amount !== 0) return '—';
    return currency === 'NGN' 
      ? `₦${Number(amount).toLocaleString()}`
      : `$${Number(amount).toLocaleString()}`;
  }, []);

  return (
    <>
      <TableRow sx={{ '& > *': { borderBottom: 'unset' }, cursor: 'pointer' }} onClick={() => setOpen(!open)}>
        <TableCell padding="checkbox">
          <Checkbox
            checked={selected}
            onChange={(e) => {
              e.stopPropagation();
              onSelect(rental.id);
            }}
            disabled={rental.returned || isLoading}
          />
        </TableCell>
        <TableCell>
          <IconButton
            aria-label="expand row"
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(!open);
            }}
            disabled={isLoading}
          >
            {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </TableCell>
        <TableCell>{rental.code}</TableCell>
        <TableCell>{rental.renter_name || '—'}</TableCell>
        <TableCell>{rental.equipment_name || '—'}</TableCell>
        <TableCell>{rental.start_date ? dayjs(rental.start_date).format('DD/MM/YYYY') : '—'}</TableCell>
        <TableCell>
          {rental.is_open_ended ? (
            'Open-ended'
          ) : rental.effective_due_date ? (
            <>
              {dayjs(rental.effective_due_date).format('DD/MM/YYYY')}
              {rental.is_overdue && (
                <WarningIcon color="error" fontSize="small" sx={{ ml: 1 }} />
              )}
            </>
          ) : (
            '—'
          )}
        </TableCell>
        <TableCell>
          {isLoading ? (
            <CircularProgress size={20} />
          ) : (
            <>
              {!rental.returned && (
                <>
                  <Button 
                    size="small" 
                    variant="outlined" 
                    color="success" 
                    onClick={(e) => { e.stopPropagation(); onMarkReturned(rental.id); }}
                    disabled={!hasReturnPermission}
                    sx={{ mr: 1 }}
                  >
                    Return
                  </Button>
                  {!rental.is_open_ended && (
                    <Button 
                      size="small" 
                      variant="outlined" 
                      color="info" 
                      onClick={(e) => { e.stopPropagation(); onExtend(rental); }}
                      disabled={!hasExtendPermission}
                      sx={{ mr: 1 }}
                    >
                      Extend
                    </Button>
                  )}
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<PaymentIcon />}
                    onClick={(e) => { e.stopPropagation(); onAddPayment(rental.id); }}
                    sx={{ mr: 1 }}
                  >
                    Add Payment
                  </Button>
                </>
              )}
              <IconButton 
                onClick={(e) => { e.stopPropagation(); onEdit(rental); }} 
                color="primary" 
                size="small" 
                disabled={!hasUpdatePermission || rental.returned}
              >
                <EditIcon />
              </IconButton>
              <IconButton 
                onClick={(e) => { e.stopPropagation(); onDelete(rental.id); }} 
                color="error" 
                size="small" 
                disabled={!hasDeletePermission}
              >
                <DeleteIcon />
              </IconButton>
              <IconButton
                onClick={(e) => { e.stopPropagation(); onDownloadReceipt(rental.id); }}
                color="secondary"
                size="small"
              >
                <PictureAsPdfIcon />
              </IconButton>
            </>
          )}
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={8}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ margin: 2 }}>
              <Typography variant="h6" gutterBottom component="div">
                Rental Details
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography><strong>ID:</strong> {rental.id}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography><strong>Branch:</strong> {rental.branch_name || '—'}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography><strong>Quantity:</strong> {rental.quantity}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography><strong>Duration:</strong> {getDuration()} days</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography>
                    <strong>Days Overdue:</strong>{' '}
                    {rental.is_overdue && rental.days_overdue > 0 ? (
                      <Chip label={`${rental.days_overdue} days`} color="error" size="small" />
                    ) : (
                      '—'
                    )}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography><strong>Currency:</strong> {rental.currency || 'NGN'}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography><strong>Rental Rate:</strong> {rental.rental_rate ? formatCurrency(rental.rental_rate, rental.currency) : '—'}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography><strong>Total Incurred:</strong> {formatCurrency(rental.total_rental_cost, rental.currency)}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography><strong>Total Paid:</strong> {formatCurrency(rental.total_paid, rental.currency)}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography><strong>Balance Due:</strong> {formatCurrency(rental.balance_due, rental.currency)}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography><strong>Created By:</strong> {rental.created_by_name || '—'}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography><strong>Created At:</strong> {rental.created_at ? dayjs(rental.created_at).format('DD/MM/YYYY HH:mm') : '—'}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography><strong>Returned:</strong> {rental.returned ? 'Yes' : 'No'}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography><strong>Returned At:</strong> {rental.returned_at ? dayjs(rental.returned_at).format('DD/MM/YYYY HH:mm') : '—'}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography><strong>Notes:</strong> {rental.notes || '—'}</Typography>
                </Grid>
              </Grid>

              {/* Payments Section */}
              <Box mt={3}>
                <Typography variant="h6" gutterBottom>Payment History</Typography>
                {rental.payments && rental.payments.length > 0 ? (
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Date</TableCell>
                        <TableCell>Amount</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>In Words</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {rental.payments.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell>{dayjs(payment.payment_date).format('DD/MM/YYYY')}</TableCell>
                          <TableCell>{formatCurrency(payment.amount_paid, rental.currency)}</TableCell>
                          <TableCell>
                            <Chip 
                              label={payment.status} 
                              color={payment.status === 'Paid' ? 'success' : 'warning'} 
                              size="small" 
                            />
                          </TableCell>
                          <TableCell>{payment.amount_in_words || '—'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <Typography variant="body2" color="textSecondary">No payments recorded.</Typography>
                )}
              </Box>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
}

export default function ActiveRentals() {
  const [rentals, setRentals] = useState([]);
  const [equipmentList, setEquipmentList] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [formData, setFormData] = useState({
    equipment: '',
    renter: '',
    start_date: '',
    due_date: '',
    currency: 'NGN',
    rental_rate: '',
    notes: '',
    quantity: 1,
    is_open_ended: false
  });
  const [paymentForm, setPaymentForm] = useState({
    rental: '',
    amount_paid: '',
    amount_in_words: '',
    status: 'Paid'
  });
  const [openDialog, setOpenDialog] = useState(false);
  const [openPaymentDialog, setOpenPaymentDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [openReturnDialog, setOpenReturnDialog] = useState(false);
  const [openExtendDialog, setOpenExtendDialog] = useState(false);
  const [openBulkDialog, setOpenBulkDialog] = useState(false);
  const [openNotificationsDialog, setOpenNotificationsDialog] = useState(false);
  const [bulkAction, setBulkAction] = useState('return');
  const [bulkLoading, setBulkLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState({});
  const [deleteId, setDeleteId] = useState(null);
  const [returnId, setReturnId] = useState(null);
  const [extendRental, setExtendRental] = useState(null);
  const [editId, setEditId] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [checkingPermissions, setCheckingPermissions] = useState(true);
  const [hasPermission, setHasPermission] = useState(false);
  const [hasCreatePermission, setHasCreatePermission] = useState(false);
  const [hasUpdatePermission, setHasUpdatePermission] = useState(false);
  const [hasDeletePermission, setHasDeletePermission] = useState(false);
  const [hasReturnPermission, setHasReturnPermission] = useState(false);
  const [hasExtendPermission, setHasExtendPermission] = useState(false);
  const [hasCreatePaymentPermission, setHasCreatePaymentPermission] = useState(false);
  const [selectedRentals, setSelectedRentals] = useState([]);
  const { searchTerm } = useSearch();
  const itemsPerPage = 10;

  // Fetch rentals
  const fetchRentals = useCallback(async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setError('⚠️ No access token found. Please log in.');
        return;
      }
      const res = await API.get('rentals/rentals/', {
        params: { search: searchTerm, page, page_size: itemsPerPage, overdue_unpaid: true },
        headers: { Authorization: `Bearer ${token}` },
      });
      setRentals(res.data.results || []);
      setTotalPages(Math.ceil((res.data.count || 0) / itemsPerPage));
      setSelectedRentals([]);
    } catch (err) {
      setError(`❌ Failed to fetch rentals: ${err.response?.data?.detail || err.message}`);
    }
  }, [searchTerm, page]);

  // Fetch equipment
  const fetchEquipment = useCallback(async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setError('⚠️ No access token found. Please log in.');
        return;
      }
      const res = await API.get('rentals/equipment/', {
        params: { page_size: 100 },
        headers: { Authorization: `Bearer ${token}` },
      });
      setEquipmentList(res.data.results || []);
    } catch (err) {
      setError(`❌ Failed to fetch equipment: ${err.response?.data?.detail || err.message}`);
    }
  }, []);

  // Fetch users
  const fetchUsers = useCallback(async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setError('⚠️ No access token found. Please log in.');
        return;
      }
      const res = await API.get('auth/users/', {
        params: { page_size: 100 },
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsersList(res.data.results || []);
    } catch (err) {
      console.warn('Failed to fetch users for renter selection:', err.message);
    }
  }, []);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
  try {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      setError('⚠️ No access token found. Please log in.');
      return;
    }
    const res = await API.get('rentals/notifications/', {
      params: { is_read: false },
      headers: { Authorization: `Bearer ${token}` },
    });
    setNotifications(res.data || []);
  } catch (err) {
    setError(`❌ Failed to fetch notifications: ${err.response?.data?.detail || err.message}`);
  }
}, []);

  // Download equipment report
  const handleDownloadEquipmentReport = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setError('⚠️ No access token found. Please log in.');
        return;
      }
      setActionLoading(prev => ({ ...prev, equipmentReport: true }));
      const response = await API.get('/rentals/reports/equipment-pdf/', {
        responseType: 'blob',
        headers: { Authorization: `Bearer ${token}` },
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'equipment_inventory_report.pdf');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      setSuccess('✅ Equipment report downloaded successfully.');
    } catch (err) {
      setError(`❌ Failed to download equipment report: ${err.response?.data?.detail || err.message}`);
    } finally {
      setActionLoading(prev => ({ ...prev, equipmentReport: false }));
    }
  };

  // Download receipt
  const handleDownloadReceipt = useCallback(async (rentalId) => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setError('⚠️ No access token found. Please log in.');
        return;
      }
      setActionLoading(prev => ({ ...prev, [`receipt_${rentalId}`]: true }));
      const response = await API.get(`/rentals/rentals/${rentalId}/receipt_pdf/`, {
        responseType: 'blob',
        headers: { Authorization: `Bearer ${token}` },
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `rental_${rentalId}_receipt.pdf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      setSuccess('✅ Receipt downloaded successfully.');
    } catch (err) {
      setError(`❌ Failed to download receipt: ${err.response?.data?.detail || err.message}`);
    } finally {
      setActionLoading(prev => ({ ...prev, [`receipt_${rentalId}`]: false }));
    }
  }, []);

  const handleSelectRental = useCallback((id) => {
    setSelectedRentals(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  }, []);

  const handleOpenDialog = useCallback((rental = null) => {
    if (rental) {
      setFormData({
        equipment: rental.equipment,
        renter: rental.renter,
        start_date: rental.start_date ? dayjs(rental.start_date).format('YYYY-MM-DD') : '',
        due_date: rental.effective_due_date ? dayjs(rental.effective_due_date).format('YYYY-MM-DD') : '',
        currency: rental.currency || 'NGN',
        rental_rate: rental.rental_rate || '',
        notes: rental.notes || '',
        quantity: rental.quantity || 1,
        is_open_ended: !rental.effective_due_date
      });
      setEditId(rental.id);
    } else {
      setFormData({ 
        equipment: '', 
        renter: '', 
        start_date: '', 
        due_date: '',
        currency: 'NGN',
        rental_rate: '',
        notes: '',
        quantity: 1,
        is_open_ended: false
      });
      setEditId(null);
    }
    setOpenDialog(true);
  }, []);

  const handleOpenPaymentDialog = useCallback((rentalId) => {
    if (!hasCreatePaymentPermission) {
      setError('⚠️ No permission to add payments.');
      return;
    }
    setPaymentForm({
      rental: rentalId,
      amount_paid: '',
      amount_in_words: '',
      status: 'Paid'
    });
    setOpenPaymentDialog(true);
  }, [hasCreatePaymentPermission]);

  const handleCloseDialog = useCallback(() => {
    setOpenDialog(false);
    setError('');
    setSuccess('');
  }, []);

  const handleClosePaymentDialog = useCallback(() => {
    setOpenPaymentDialog(false);
    setError('');
    setSuccess('');
  }, []);

  const handleDeleteOpen = useCallback((id) => {
    if (!hasDeletePermission) {
      setError('⚠️ No delete permission.');
      return;
    }
    const rental = rentals.find(r => r.id === id);
    if (rental && !rental.returned) {
      setError('⚠️ Cannot delete unreturned rental. Please mark as returned first.');
      return;
    }
    setDeleteId(id);
    setOpenDeleteDialog(true);
  }, [hasDeletePermission, rentals]);

  const handleDeleteClose = useCallback(() => {
    setOpenDeleteDialog(false);
    setDeleteId(null);
  }, []);

  const handleReturnOpen = useCallback((id) => {
    if (!hasReturnPermission) {
      setError('⚠️ No return permission.');
      return;
    }
    setReturnId(id);
    setOpenReturnDialog(true);
  }, [hasReturnPermission]);

  const handleReturnClose = useCallback(() => {
    setOpenReturnDialog(false);
    setReturnId(null);
  }, []);

  const handleExtendOpen = useCallback((rental) => {
    if (!hasExtendPermission) {
      setError('⚠️ No extend permission.');
      return;
    }
    setExtendRental({ ...rental, new_due_date: '' });
    setOpenExtendDialog(true);
  }, [hasExtendPermission]);

  const handleExtendClose = useCallback(() => {
    setOpenExtendDialog(false);
    setExtendRental(null);
  }, []);

  const handleNotificationsOpen = useCallback(() => {
    setOpenNotificationsDialog(true);
  }, []);

  const handleNotificationsClose = useCallback(() => {
    setOpenNotificationsDialog(false);
  }, []);

  const handleBulkOpen = useCallback((action) => {
    if (selectedRentals.length === 0) {
      setError('⚠️ Please select at least one unreturned rental.');
      return;
    }
    if (action === 'return' && !hasReturnPermission) {
      setError('⚠️ No return permission.');
      return;
    }
    if (action === 'delete' && !hasDeletePermission) {
      setError('⚠️ No delete permission.');
      return;
    }
    setBulkAction(action);
    setOpenBulkDialog(true);
  }, [selectedRentals, hasReturnPermission, hasDeletePermission]);

  const handleBulkClose = useCallback(() => {
    setOpenBulkDialog(false);
    setBulkLoading(false);
  }, []);

  const handleChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
      ...(name === 'is_open_ended' && checked ? { due_date: '' } : {})
    }));
  }, []);

  const handlePaymentChange = useCallback((e) => {
    const { name, value } = e.target;
    setPaymentForm(prev => ({ ...prev, [name]: value }));
  }, []);

  const handleSave = useCallback(async () => {
    const { equipment, renter, start_date, due_date, currency, rental_rate, notes, quantity, is_open_ended } = formData;
    
    if (!equipment || !renter || !start_date || !quantity) {
      setError('⚠️ Equipment, Renter, Start Date, and Quantity are required.');
      return;
    }
    
    if (parseInt(quantity) <= 0) {
      setError('⚠️ Quantity must be at least 1.');
      return;
    }
    
    const selectedEquipment = equipmentList.find(eq => eq.id === parseInt(equipment));
    if (selectedEquipment && parseInt(quantity) > selectedEquipment.available_quantity) {
      setError(`⚠️ Cannot rent ${quantity} units. Only ${selectedEquipment.available_quantity} available.`);
      return;
    }
    
    if (!is_open_ended && due_date && start_date > due_date) {
      setError('⚠️ Due date must be after start date.');
      return;
    }

    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setError('⚠️ No access token found. Please log in.');
        return;
      }

      const payload = {
        equipment: parseInt(equipment),
        renter: parseInt(renter),
        start_date,
        due_date: is_open_ended ? null : (due_date || null),
        currency,
        rental_rate: rental_rate ? parseFloat(rental_rate) : null,
        notes: notes || '',
        quantity: parseInt(quantity)
      };

      setActionLoading(prev => ({ ...prev, saveRental: true }));
      if (editId) {
        await API.put(`rentals/rentals/${editId}/`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setSuccess('✅ Rental updated.');
      } else {
        await API.post('rentals/rentals/', payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setSuccess('✅ Rental created.');
      }

      await Promise.all([fetchRentals(), fetchEquipment(), fetchNotifications()]);
      setOpenDialog(false);
    } catch (err) {
      let errorMsg = 'Save failed. Check required fields.';
      if (err.response?.data) {
        errorMsg = Object.entries(err.response.data)
          .map(([field, msg]) => `${field}: ${Array.isArray(msg) ? msg.join(', ') : msg}`)
          .join('; ');
      }
      setError(`❌ ${errorMsg}`);
    } finally {
      setActionLoading(prev => ({ ...prev, saveRental: false }));
    }
  }, [formData, editId, equipmentList, fetchRentals, fetchEquipment, fetchNotifications]);

  const handleSavePayment = useCallback(async () => {
    const { rental, amount_paid, amount_in_words, status } = paymentForm;
    
    if (!rental || !amount_paid || !amount_in_words) {
      setError('⚠️ Rental, Amount Paid, and Amount in Words are required.');
      return;
    }
    
    if (parseFloat(amount_paid) <= 0) {
      setError('⚠️ Amount paid must be positive.');
      return;
    }

    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setError('⚠️ No access token found. Please log in.');
        return;
      }

      const payload = {
        rental: parseInt(rental),
        amount_paid: parseFloat(amount_paid),
        amount_in_words: amount_in_words.trim(),
        status
      };

      setActionLoading(prev => ({ ...prev, savePayment: true }));
      await API.post('rentals/payments/', payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSuccess('✅ Payment recorded.');
      await Promise.all([fetchRentals(), fetchNotifications()]);
      setOpenPaymentDialog(false);
    } catch (err) {
      let errorMsg = 'Payment failed.';
      if (err.response?.data) {
        errorMsg = Object.entries(err.response.data)
          .map(([field, msg]) => `${field}: ${Array.isArray(msg) ? msg.join(', ') : msg}`)
          .join('; ');
      }
      setError(`❌ ${errorMsg}`);
    } finally {
      setActionLoading(prev => ({ ...prev, savePayment: false }));
    }
  }, [paymentForm, fetchRentals, fetchNotifications]);

  const handleDelete = useCallback(async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setError('⚠️ No access token found. Please log in.');
        return;
      }
      setActionLoading(prev => ({ ...prev, [`delete_${deleteId}`]: true }));
      await API.delete(`rentals/rentals/${deleteId}/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSuccess('✅ Rental deleted successfully.');
      await Promise.all([fetchRentals(), fetchEquipment()]);
      setOpenDeleteDialog(false);
    } catch (err) {
      let errorMsg = 'Delete failed.';
      if (err.response?.data) {
        errorMsg = Object.entries(err.response.data)
          .map(([field, msg]) => `${field}: ${Array.isArray(msg) ? msg.join(', ') : msg}`)
          .join('; ');
      }
      setError(`❌ ${errorMsg}`);
    } finally {
      setActionLoading(prev => ({ ...prev, [`delete_${deleteId}`]: false }));
    }
  }, [deleteId, fetchRentals, fetchEquipment]);

  const handleMarkReturned = useCallback(async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setError('⚠️ No access token found. Please log in.');
        return;
      }
      setActionLoading(prev => ({ ...prev, [`return_${returnId}`]: true }));
      await API.post(`rentals/rentals/${returnId}/mark_returned/`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSuccess('✅ Equipment marked as returned.');
      await Promise.all([fetchRentals(), fetchEquipment(), fetchNotifications()]);
      setOpenReturnDialog(false);
    } catch (err) {
      let errorMsg = 'Return failed.';
      if (err.response?.data) {
        errorMsg = Object.entries(err.response.data)
          .map(([field, msg]) => `${field}: ${Array.isArray(msg) ? msg.join(', ') : msg}`)
          .join('; ');
      }
      setError(`❌ ${errorMsg}`);
    } finally {
      setActionLoading(prev => ({ ...prev, [`return_${returnId}`]: false }));
    }
  }, [returnId, fetchRentals, fetchEquipment, fetchNotifications]);

  const handleExtendRental = useCallback(async () => {
    if (!extendRental || !extendRental.new_due_date) {
      setError('⚠️ New due date is required.');
      return;
    }
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setError('⚠️ No access token found. Please log in.');
        return;
      }
      setActionLoading(prev => ({ ...prev, [`extend_${extendRental.id}`]: true }));
      await API.post(`rentals/rentals/${extendRental.id}/extend_rental/`, { new_due_date: extendRental.new_due_date }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSuccess('✅ Rental extended successfully.');
      await Promise.all([fetchRentals(), fetchNotifications()]);
      setOpenExtendDialog(false);
    } catch (err) {
      let errorMsg = 'Extend failed.';
      if (err.response?.data) {
        errorMsg = Object.entries(err.response.data)
          .map(([field, msg]) => `${field}: ${Array.isArray(msg) ? msg.join(', ') : msg}`)
          .join('; ');
      }
      setError(`❌ ${errorMsg}`);
    } finally {
      setActionLoading(prev => ({ ...prev, [`extend_${extendRental.id}`]: false }));
    }
  }, [extendRental, fetchRentals, fetchNotifications]);

  const handleMarkNotificationsRead = useCallback(async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setError('⚠️ No access token found. Please log in.');
        return;
      }
      setActionLoading(prev => ({ ...prev, markNotifications: true }));
      await API.post('rentals/notifications/mark_all_as_read/', {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSuccess('✅ All notifications marked as read.');
      setNotifications([]);
      setOpenNotificationsDialog(false);
    } catch (err) {
      setError(`❌ Failed to mark notifications as read: ${err.response?.data?.detail || err.message}`);
    } finally {
      setActionLoading(prev => ({ ...prev, markNotifications: false }));
    }
  }, []);

  const handleSelectAll = useCallback((e) => {
    if (e.target.checked) {
      const unreturnedIds = rentals
        .filter(r => !r.returned)
        .map(r => r.id);
      setSelectedRentals(unreturnedIds);
    } else {
      setSelectedRentals([]);
    }
  }, [rentals]);

  // Handle bulk actions (return or delete selected rentals)
  const handleBulkAction = useCallback(async () => {
    if (selectedRentals.length === 0) {
      setError('⚠️ No rentals selected.');
      return;
    }

    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setError('⚠️ No access token found. Please log in.');
        return;
      }

      setBulkLoading(true);
      if (bulkAction === 'return') {
        if (!hasReturnPermission) {
          setError('⚠️ No return permission.');
          return;
        }
        for (const id of selectedRentals) {
          const rental = rentals.find(r => r.id === id);
          if (!rental.returned) {
            await API.post(`rentals/rentals/${id}/mark_returned/`, {}, {
              headers: { Authorization: `Bearer ${token}` },
            });
          }
        }
        setSuccess(`✅ ${selectedRentals.length} rental(s) marked as returned.`);
      } else if (bulkAction === 'delete') {
        if (!hasDeletePermission) {
          setError('⚠️ No delete permission.');
          return;
        }
        for (const id of selectedRentals) {
          const rental = rentals.find(r => r.id === id);
          if (rental && !rental.returned) {
            setError(`⚠️ Cannot delete unreturned rental ID ${id}. Please mark as returned first.`);
            continue;
          }
          await API.delete(`rentals/rentals/${id}/`, {
            headers: { Authorization: `Bearer ${token}` },
          });
        }
        setSuccess(`✅ ${selectedRentals.length} rental(s) deleted successfully.`);
      }

      await Promise.all([fetchRentals(), fetchEquipment(), fetchNotifications()]);
      setSelectedRentals([]);
      setOpenBulkDialog(false);
    } catch (err) {
      let errorMsg = `${bulkAction === 'return' ? 'Return' : 'Delete'} failed.`;
      if (err.response?.data) {
        errorMsg = Object.entries(err.response.data)
          .map(([field, msg]) => `${field}: ${Array.isArray(msg) ? msg.join(', ') : msg}`)
          .join('; ');
      }
      setError(`❌ ${errorMsg}`);
    } finally {
      setBulkLoading(false);
    }
  }, [selectedRentals, bulkAction, hasReturnPermission, hasDeletePermission, rentals, fetchRentals, fetchEquipment, fetchNotifications]);

  useEffect(() => {
    const checkPermissions = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        if (!token) {
          setError('⚠️ No access token found. Please log in.');
          setCheckingPermissions(false);
          return;
        }

        const [
          pageRes, 
          createRes, 
          updateRes, 
          deleteRes, 
          returnRes, 
          extendRes, 
          createPaymentRes
        ] = await Promise.all([
          API.get('/auth/permissions/page/rentals_active/', { headers: { Authorization: `Bearer ${token}` } }),
          API.get('/auth/permissions/action/create_rental/', { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: { allowed: false } })),
          API.get('/auth/permissions/action/update_rental/', { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: { allowed: false } })),
          API.get('/auth/permissions/action/delete_rental/', { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: { allowed: false } })),
          API.get('/auth/permissions/action/mark_rental_returned/', { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: { allowed: false } })),
          API.get('/auth/permissions/action/extend_rental/', { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: { allowed: false } })),
          API.get('/auth/permissions/action/create_payment/', { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: { allowed: false } }))
        ]);

        setHasPermission(pageRes.data.allowed);
        setHasCreatePermission(createRes.data.allowed);
        setHasUpdatePermission(updateRes.data.allowed);
        setHasDeletePermission(deleteRes.data.allowed);
        setHasReturnPermission(returnRes.data.allowed);
        setHasExtendPermission(extendRes.data.allowed);
        setHasCreatePaymentPermission(createPaymentRes.data.allowed);

        if (pageRes.data.allowed) {
          await Promise.all([fetchRentals(), fetchEquipment(), fetchNotifications()]);
          if (createRes.data.allowed) {
            await fetchUsers();
          }
        }
      } catch (err) {
        setError(`⚠️ Permission check failed: ${err.response?.data?.detail || err.message}`);
      } finally {
        setCheckingPermissions(false);
      }
    };
    checkPermissions();
  }, [fetchRentals, fetchEquipment, fetchUsers, fetchNotifications]);

  const allSelected = useMemo(() => {
    const unreturnedCount = rentals.filter(r => !r.returned).length;
    return unreturnedCount > 0 && selectedRentals.length === unreturnedCount;
  }, [selectedRentals, rentals]);

  if (checkingPermissions) {
    return (
      <Container>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
          <CircularProgress />
          <Typography variant="h6" ml={2}>Loading...</Typography>
        </Box>
      </Container>
    );
  }

  if (!hasPermission) {
    return (
      <Container>
        <Alert severity="error">You do not have permission to view this page.</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Rentals</Typography>
        <Box>
          {notifications.length > 0 && (
            <Button
              variant="outlined"
              color="warning"
              startIcon={<NotificationsIcon />}
              onClick={handleNotificationsOpen}
              sx={{ mr: 1 }}
            >
              Notifications ({notifications.length})
            </Button>
          )}
          <Button
            variant="outlined"
            startIcon={<PictureAsPdfIcon />}
            onClick={handleDownloadEquipmentReport}
            disabled={actionLoading.equipmentReport}
          >
            {actionLoading.equipmentReport ? 'Downloading...' : 'Equipment Report (PDF)'}
          </Button>
        </Box>
      </Box>

      {/* === Rental Management Guide === */}
      <Accordion sx={{ mb: 2 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">Rental Management Guide & Best Practices</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Typography variant="body1" paragraph>
            <strong>💡 What is Rental Management?</strong> This page tracks all active equipment rentals, including renter details, equipment, branch location, and return status. Click on any row to view complete details.
          </Typography>
          <Typography variant="body1" paragraph>
            <strong>✅ Best Practices:</strong>
            <ul>
              <li><strong>Concurrent Rentals:</strong> Same equipment can be rented to multiple clients simultaneously.</li>
              <li><strong>Open-Ended Rentals:</strong> Leave due date empty for ongoing rentals (billed daily).</li>
              <li><strong>Real-Time Tracking:</strong> Duration updates automatically for open-ended rentals.</li>
              <li><strong>Bulk Actions:</strong> Select multiple rentals to return or delete at once.</li>
              <li><strong>Overdue Handling:</strong> Overdue rentals are highlighted with warning icons.</li>
              <li><strong>Notifications:</strong> Check notifications for overdue rentals and other alerts.</li>
            </ul>
          </Typography>
        </AccordionDetails>
      </Accordion>

      <Box mb={2} display="flex" gap={2}>
        {hasCreatePermission && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog()}>
            Add Rental
          </Button>
        )}
        {selectedRentals.length > 0 && (
          <>
            <Button 
              variant="outlined" 
              color="success" 
              onClick={() => handleBulkOpen('return')}
              disabled={!hasReturnPermission}
            >
              Return Selected ({selectedRentals.length})
            </Button>
            <Button 
              variant="outlined" 
              color="error" 
              onClick={() => handleBulkOpen('delete')}
              disabled={!hasDeletePermission}
            >
              Delete Selected ({selectedRentals.length})
            </Button>
          </>
        )}
      </Box>

      <Paper sx={{ p: 3 }}>
        <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
          💡 Click on any row to view complete details including payment history and financial summary
        </Typography>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  indeterminate={selectedRentals.length > 0 && !allSelected}
                  checked={allSelected}
                  onChange={handleSelectAll}
                />
              </TableCell>
              <TableCell />
              <TableCell><strong>Code</strong></TableCell>
              <TableCell><strong>Renter</strong></TableCell>
              <TableCell><strong>Equipment</strong></TableCell>
              <TableCell><strong>Start Date</strong></TableCell>
              <TableCell><strong>Due Date</strong></TableCell>
              <TableCell><strong>Actions</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rentals.length > 0 ? (
              rentals.map(rental => (
                <RentalRow
                  key={rental.id}
                  rental={rental}
                  onEdit={handleOpenDialog}
                  onDelete={handleDeleteOpen}
                  onMarkReturned={handleReturnOpen}
                  onExtend={handleExtendOpen}
                  hasUpdatePermission={hasUpdatePermission}
                  hasDeletePermission={hasDeletePermission}
                  hasReturnPermission={hasReturnPermission}
                  hasExtendPermission={hasExtendPermission}
                  onSelect={handleSelectRental}
                  selected={selectedRentals.includes(rental.id)}
                  onDownloadReceipt={handleDownloadReceipt}
                  onAddPayment={handleOpenPaymentDialog}
                  isLoading={
                    actionLoading[`delete_${rental.id}`] ||
                    actionLoading[`return_${rental.id}`] ||
                    actionLoading[`extend_${rental.id}`] ||
                    actionLoading[`receipt_${rental.id}`] ||
                    false
                  }
                />
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  <Typography variant="body2" color="textSecondary">No rentals found.</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {totalPages > 1 && (
          <Box mt={3} display="flex" justifyContent="center">
            <Pagination count={totalPages} page={page} onChange={(_, p) => setPage(p)} color="primary" />
          </Box>
        )}
      </Paper>

      {/* === Rental Form Dialog === */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editId ? '✏️ Edit Rental' : '➕ Add New Rental'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <FormControl fullWidth required error={!formData.equipment}>
                <InputLabel>Equipment</InputLabel>
                <Select name="equipment" value={formData.equipment} onChange={handleChange}>
                  <MenuItem value="">Select Equipment</MenuItem>
                  {equipmentList.map(eq => (
                    <MenuItem 
                      key={eq.id} 
                      value={eq.id}
                      disabled={eq.available_quantity <= 0}
                    >
                      {eq.name} ({eq.branch_name || 'No Branch'}) 
                      {eq.available_quantity <= 0 ? ' (Unavailable)' : ` (Avail: ${eq.available_quantity})`}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth required error={!formData.renter}>
                <InputLabel>Renter</InputLabel>
                <Select name="renter" value={formData.renter} onChange={handleChange}>
                  <MenuItem value="">Select Renter</MenuItem>
                  {usersList.map(user => (
                    <MenuItem key={user.id} value={user.id}>
                      {user.full_name || user.email}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField 
                label="Start Date" 
                name="start_date" 
                type="date" 
                value={formData.start_date} 
                onChange={handleChange} 
                fullWidth 
                required 
                error={!formData.start_date}
                InputLabelProps={{ shrink: true }} 
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField 
                label="Due Date" 
                name="due_date" 
                type="date" 
                value={formData.due_date} 
                onChange={handleChange} 
                fullWidth 
                disabled={formData.is_open_ended}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Checkbox
                    name="is_open_ended"
                    checked={formData.is_open_ended}
                    onChange={handleChange}
                  />
                }
                label="Open-ended rental (no due date)"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Quantity"
                name="quantity"
                type="number"
                value={formData.quantity}
                onChange={handleChange}
                fullWidth
                required
                error={parseInt(formData.quantity) <= 0}
                helperText={parseInt(formData.quantity) <= 0 ? 'Must be at least 1' : ''}
                inputProps={{ min: 1 }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Currency</InputLabel>
                <Select name="currency" value={formData.currency} onChange={handleChange}>
                  {CURRENCY_OPTIONS.map(opt => (
                    <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Rental Rate (per day)"
                name="rental_rate"
                type="number"
                value={formData.rental_rate}
                onChange={handleChange}
                fullWidth
                placeholder="Daily rate"
                inputProps={{ min: 0, step: '0.01' }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Notes"
                name="notes"
                multiline
                rows={2}
                value={formData.notes}
                onChange={handleChange}
                fullWidth
                placeholder="Special instructions, project name, etc."
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} disabled={actionLoading.saveRental}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={handleSave} 
            disabled={actionLoading.saveRental}
          >
            {actionLoading.saveRental ? <CircularProgress size={24} /> : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* === Payment Form Dialog === */}
      <Dialog open={openPaymentDialog} onClose={handleClosePaymentDialog} maxWidth="sm" fullWidth>
        <DialogTitle>➕ Add Payment</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                label="Amount Paid"
                name="amount_paid"
                type="number"
                value={paymentForm.amount_paid}
                onChange={handlePaymentChange}
                fullWidth
                required
                error={!paymentForm.amount_paid || parseFloat(paymentForm.amount_paid) <= 0}
                helperText={
                  !paymentForm.amount_paid 
                    ? 'Amount is required' 
                    : parseFloat(paymentForm.amount_paid) <= 0 
                      ? 'Must be positive' 
                      : ''
                }
                inputProps={{ min: 0.01, step: '0.01' }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Amount in Words"
                name="amount_in_words"
                value={paymentForm.amount_in_words}
                onChange={handlePaymentChange}
                fullWidth
                required
                error={!paymentForm.amount_in_words}
                helperText={!paymentForm.amount_in_words ? 'Required' : ''}
                placeholder="e.g., One Thousand Naira Only"
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select name="status" value={paymentForm.status} onChange={handlePaymentChange}>
                  <MenuItem value="Paid">Paid</MenuItem>
                  <MenuItem value="Pending">Pending</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClosePaymentDialog} disabled={actionLoading.savePayment}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={handleSavePayment} 
            disabled={actionLoading.savePayment}
          >
            {actionLoading.savePayment ? <CircularProgress size={24} /> : 'Save Payment'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* === Notifications Dialog === */}
      <Dialog open={openNotificationsDialog} onClose={handleNotificationsClose} maxWidth="sm" fullWidth>
        <DialogTitle>Notifications ({notifications.length})</DialogTitle>
        <DialogContent>
          {notifications.length > 0 ? (
            <Box>
              {notifications.map(notification => (
                <Alert
                  key={notification.id}
                  severity={notification.severity.toLowerCase()}
                  sx={{ mb: 1 }}
                >
                  <Typography variant="subtitle2">{notification.title}</Typography>
                  <Typography variant="body2">{notification.message}</Typography>
                  <Typography variant="caption">
                    {dayjs(notification.created_at).format('DD/MM/YYYY HH:mm')}
                  </Typography>
                </Alert>
              ))}
            </Box>
          ) : (
            <Typography variant="body2" color="textSecondary">No notifications.</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleNotificationsClose} disabled={actionLoading.markNotifications}>Cancel</Button>
          {notifications.length > 0 && (
            <Button 
              variant="contained" 
              onClick={handleMarkNotificationsRead}
              disabled={actionLoading.markNotifications}
            >
              {actionLoading.markNotifications ? <CircularProgress size={24} /> : 'Mark All as Read'}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* === Delete Dialog === */}
      <Dialog open={openDeleteDialog} onClose={handleDeleteClose}>
        <DialogTitle>Delete Rental?</DialogTitle>
        <DialogContent>
          <Typography>Are you sure? This cannot be undone.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteClose} disabled={actionLoading[`delete_${deleteId}`]}>Cancel</Button>
          <Button 
            color="error" 
            onClick={handleDelete} 
            disabled={actionLoading[`delete_${deleteId}`]}
          >
            {actionLoading[`delete_${deleteId}`] ? <CircularProgress size={24} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* === Return Dialog === */}
      <Dialog open={openReturnDialog} onClose={handleReturnClose}>
        <DialogTitle>Mark as Returned?</DialogTitle>
        <DialogContent>
          <Typography>Confirm that the equipment has been returned. This will update stock availability and stop billing.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleReturnClose} disabled={actionLoading[`return_${returnId}`]}>Cancel</Button>
          <Button 
            variant="contained" 
            color="success" 
            onClick={handleMarkReturned}
            disabled={actionLoading[`return_${returnId}`]}
          >
            {actionLoading[`return_${returnId}`] ? <CircularProgress size={24} /> : 'Confirm Return'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* === Extend Dialog === */}
      <Dialog open={openExtendDialog} onClose={handleExtendClose}>
        <DialogTitle>Extend Rental</DialogTitle>
        <DialogContent>
          <TextField
            label="New Due Date"
            type="date"
            fullWidth
            value={extendRental?.new_due_date || ''}
            onChange={(e) => setExtendRental(prev => ({ ...prev, new_due_date: e.target.value }))}
            InputLabelProps={{ shrink: true }}
            required
            error={!extendRental?.new_due_date}
            helperText={!extendRental?.new_due_date ? 'Required' : ''}
          />
          <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
            Current due date: {extendRental?.effective_due_date ? dayjs(extendRental.effective_due_date).format('DD/MM/YYYY') : 'N/A'}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleExtendClose} disabled={actionLoading[`extend_${extendRental?.id}`]}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={handleExtendRental}
            disabled={actionLoading[`extend_${extendRental?.id}`]}
          >
            {actionLoading[`extend_${extendRental?.id}`] ? <CircularProgress size={24} /> : 'Extend'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* === Bulk Action Dialog === */}
      <Dialog open={openBulkDialog} onClose={handleBulkClose}>
        <DialogTitle>
          {bulkAction === 'return' ? 'Return Selected Rentals?' : 'Delete Selected Rentals?'}
        </DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to {bulkAction} {selectedRentals.length} rental(s)? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleBulkClose} disabled={bulkLoading}>Cancel</Button>
          <Button 
            variant="contained" 
            color={bulkAction === 'return' ? 'success' : 'error'} 
            onClick={handleBulkAction}
            disabled={bulkLoading}
          >
            {bulkLoading ? <CircularProgress size={24} /> : (bulkAction === 'return' ? 'Return' : 'Delete')}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}