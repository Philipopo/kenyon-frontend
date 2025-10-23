// src/pages/procurement/Orders.jsx
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
  MenuItem,
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Edit as EditIcon,
  Send as SendIcon,
  Info as InfoIcon,
  Close as CloseIcon,
  Cancel as CancelIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  PictureAsPdf as PictureAsPdfIcon,
  ThumbUp as ThumbUpIcon,
  ThumbDown as ThumbDownIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { debounce } from 'lodash';
import API from '../../api';
import { useSearch } from '../../context/SearchContext';

const STATUS_COLORS = {
  draft: 'default',
  submitted: 'info',
  approved: 'success',
  rejected: 'error',
  partially_received: 'warning',
  received: 'success',
  cancelled: 'error',
};

function PurchaseOrderRow({ po, onEdit, onDelete, onSubmitForApproval, onApprove, onReject, onExportPDF, permissions, loading, formatCurrency }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <TableRow sx={{ '& > *': { borderBottom: 'unset' }, cursor: 'pointer' }} onClick={() => setOpen(!open)}>
        <TableCell>
          <IconButton size="small" onClick={(e) => { e.stopPropagation(); setOpen(!open); }}>
            {open ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
        </TableCell>
        <TableCell>
          <Tooltip title="Purchase Order Code">
            <strong>{po.code}</strong>
          </Tooltip>
        </TableCell>
        <TableCell>{po.vendor?.name || 'N/A'}</TableCell>
        <TableCell>{po.department}</TableCell>
        <TableCell>
          <Chip
            label={po.status.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
            size="small"
            color={STATUS_COLORS[po.status] || 'default'}
          />
        </TableCell>
        <TableCell>{formatCurrency(po.total_amount)}</TableCell>
        <TableCell>{new Date(po.created_at).toLocaleDateString()}</TableCell>
        <TableCell>
          <IconButton
            onClick={(e) => { e.stopPropagation(); onEdit(po); }}
            disabled={!permissions.update_purchase_order || po.status !== 'draft' || loading}
            title="Edit PO (only for drafts)"
          >
            <EditIcon />
          </IconButton>
        
          
          <IconButton
            onClick={(e) => { e.stopPropagation(); onExportPDF(po.id); }}
            disabled={loading}
            title="Export as PDF"
          >
            <PictureAsPdfIcon />
          </IconButton>
          <IconButton
            onClick={(e) => { e.stopPropagation(); onDelete(po.id); }}
            disabled={!permissions.delete_purchase_order || po.status !== 'draft' || loading}
            title="Delete PO (only for drafts)"
            color="error"
          >
            <DeleteIcon />
          </IconButton>
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell colSpan={8} style={{ paddingBottom: 0, paddingTop: 0 }}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ margin: 2 }}>
              <Typography variant="h6">Purchase Order Details</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography><strong>Requisition:</strong> {po.requisition?.code || 'N/A'}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography><strong>Delivery Address:</strong> {po.delivery_address || '—'}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography><strong>Expected Delivery:</strong> {po.expected_delivery_date || '—'}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography><strong>Payment Terms:</strong> {po.payment_terms || '—'}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography><strong>Notes:</strong> {po.notes || '—'}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography><strong>Items:</strong></Typography>
                  {po.items?.length ? (
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Item</TableCell>
                          <TableCell>Quantity</TableCell>
                          <TableCell>Unit Price</TableCell>
                          <TableCell>Total</TableCell>
                          <TableCell>Notes</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {po.items.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell>{item.item?.name || 'Unknown Item'}</TableCell>
                            <TableCell>{item.quantity}</TableCell>
                            <TableCell>{formatCurrency(item.unit_price)}</TableCell>
                            <TableCell>{formatCurrency(item.quantity * item.unit_price)}</TableCell>
                            <TableCell>{item.notes || '—'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <Typography>—</Typography>
                  )}
                </Grid>
              </Grid>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
}

export default function PurchaseOrders() {
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);
  const [modalAlert, setModalAlert] = useState(null);
  const [checkingPermissions, setCheckingPermissions] = useState(true);
  const [hasPermission, setHasPermission] = useState(false);
  const [permissions, setPermissions] = useState({
    create_purchase_order: false,
    update_purchase_order: false,
    delete_purchase_order: false,
  });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const { searchTerm } = useSearch();
  const itemsPerPage = 10;
  const prevSearchTermRef = useRef(searchTerm);
  const prevSearchRef = useRef(search);

  // Modal states
  const [openModal, setOpenModal] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' or 'edit'
  const [selectedPO, setSelectedPO] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    requisition: null,
    vendor: null,
    department: '',
    delivery_address: '',
    expected_delivery_date: '',
    payment_terms: '',
    notes: '',
    items: [],
  });

  // New item form state
  const [newItem, setNewItem] = useState({
    item: null,
    quantity: '',
    unit_price: '',
    notes: '',
  });

  // Data for dropdowns
  const [requisitions, setRequisitions] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);

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

  // Format currency in Naira
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 2,
    }).format(value);
  };

  // Calculate total amount for PO
  const calculateTotalAmount = (items) => {
    return items.reduce((total, item) => total + (item.quantity * (item.unit_price || 0)), 0);
  };

  // Fetch purchase orders
  const fetchPurchaseOrders = useCallback(async () => {
    try {
      setLoading(true);
      const searchValue = search || searchTerm;
      console.log('Fetching purchase orders with params:', { search: searchValue, page, page_size: itemsPerPage });
      const res = await API.get('procurement/purchase-orders/', {
        params: { search: searchValue, page, page_size: itemsPerPage },
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
      });
      console.log('Purchase orders API response:', res.data);
      setPurchaseOrders(res.data.results || res.data || []);
      setTotalPages(Math.ceil((res.data.count || res.data.length || 0) / itemsPerPage));
      setAlert(null);
    } catch (err) {
      console.error('Error fetching purchase orders:', err.response?.data || err.message);
      setAlert(`❌ Failed to fetch purchase orders: ${err.response?.data?.detail || err.message}`);
      setPurchaseOrders([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [search, searchTerm, page, itemsPerPage]);

  // Fetch approved requisitions for dropdown
  const fetchApprovedRequisitions = useCallback(async () => {
    try {
      const res = await API.get('procurement/requisitions/', {
        params: { status: 'approved', page_size: 1000 },
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
      });
      console.log('Requisitions API response:', res.data);
      const approvedReqs = (res.data.results || res.data || []).filter((req) => req.status === 'approved');
      setRequisitions(approvedReqs);
    } catch (err) {
      console.error('Error fetching approved requisitions:', err.response?.data || err.message);
      setAlert(`❌ Failed to fetch requisitions: ${err.response?.data?.detail || err.message}`);
    }
  }, []);

  // Fetch vendors for dropdown
  const fetchVendors = useCallback(async () => {
    try {
      const res = await API.get('procurement/vendors/', {
        params: { status: 'active', page_size: 1000 },
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
      });
      console.log('Vendors API response:', res.data);
      setVendors(res.data.results || res.data || []);
    } catch (err) {
      console.error('Error fetching vendors:', err.response?.data || err.message);
      setAlert(`❌ Failed to fetch vendors: ${err.response?.data?.detail || err.message}`);
    }
  }, []);

  // Fetch inventory items for autocomplete
  const fetchInventoryItems = useCallback(async () => {
    try {
      const res = await API.get('inventory/items/', {
        params: { page_size: 1000 },
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
      });
      console.log('Inventory items API response:', res.data);
      setInventoryItems(res.data.results || res.data || []);
    } catch (err) {
      console.error('Error fetching inventory items:', err.response?.data || err.message);
      setAlert(`❌ Failed to fetch inventory items: ${err.response?.data?.detail || err.message}`);
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

        // Check page-level permission
        const pageResponse = await API.get('/auth/permissions/page/purchase_orders/', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setHasPermission(pageResponse.data.allowed || false);

        if (!pageResponse.data.allowed) {
          setAlert(`⚠️ You do not have permission to view this page: ${pageResponse.data.reason || 'No reason provided'}`);
          setCheckingPermissions(false);
          return;
        }

        // Fetch all action permissions in parallel
        const actions = ['create_purchase_order', 'update_purchase_order', 'delete_purchase_order'];
        const permissionPromises = actions.map((action) =>
          API.get(`/auth/permissions/action/${action}/`, {
            headers: { Authorization: `Bearer ${token}` },
          }).catch((err) => {
            console.error(`Error checking ${action} permission:`, err.response?.data || err.message);
            return { data: { allowed: false } }; // Fallback to false
          })
        );

        const permissionResponses = await Promise.all(permissionPromises);
        const actionPerms = actions.reduce((acc, action, index) => {
          acc[action] = permissionResponses[index].data.allowed || false;
          return acc;
        }, {});

        console.log('Permissions fetched:', actionPerms);
        setPermissions(actionPerms);

        // Fetch data only if page permission is granted
        await Promise.all([fetchPurchaseOrders(), fetchApprovedRequisitions(), fetchVendors(), fetchInventoryItems()]);
      } catch (err) {
        console.error('Error checking permissions:', err.response?.data || err.message);
        setAlert(`⚠️ Failed to check permissions: ${err.response?.data?.detail || err.message}`);
        setHasPermission(false);
      } finally {
        setCheckingPermissions(false);
      }
    };

    checkPermissions();
  }, [fetchPurchaseOrders, fetchApprovedRequisitions, fetchVendors, fetchInventoryItems]);

  // Handle search and pagination
  useEffect(() => {
    if (hasPermission && (search !== prevSearchRef.current || searchTerm !== prevSearchTermRef.current)) {
      setPage(1);
      prevSearchRef.current = search;
      prevSearchTermRef.current = searchTerm;
    }
    if (hasPermission) fetchPurchaseOrders();
  }, [search, searchTerm, page, hasPermission, fetchPurchaseOrders]);

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handle requisition selection
  const handleRequisitionChange = (newValue) => {
    setFormData((prev) => ({
      ...prev,
      requisition: newValue,
      department: newValue ? newValue.department : '',
      items: newValue
        ? newValue.items.map((item) => ({
            item: item.item?.id || null,
            quantity: item.quantity || 0,
            unit_price: item.unit_cost || 0,
            notes: item.notes || '',
          }))
        : [],
    }));
    setModalAlert(null);
  };

  // Handle vendor selection
  const handleVendorChange = (newValue) => {
    setFormData((prev) => ({
      ...prev,
      vendor: newValue,
    }));
  };

  // Handle new item input changes
  const handleNewItemChange = (field, value) => {
    setNewItem((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Add new item to PO
  const handleAddItem = () => {
    if (!newItem.item || !newItem.quantity || !newItem.unit_price) {
      setModalAlert('⚠️ Please fill all required fields for the item (Item, Quantity, Unit Price).');
      console.log('Missing fields:', { item: newItem.item, quantity: newItem.quantity, unit_price: newItem.unit_price });
      return;
    }

    const quantity = parseInt(newItem.quantity, 10);
    const unitPrice = parseFloat(newItem.unit_price);

    if (isNaN(quantity) || quantity <= 0) {
      setModalAlert('⚠️ Quantity must be a positive number.');
      return;
    }

    if (isNaN(unitPrice) || unitPrice <= 0) {
      setModalAlert('⚠️ Unit price must be a positive number.');
      return;
    }

    const newItemObj = {
      item: newItem.item.id,
      quantity,
      unit_price: unitPrice,
      notes: newItem.notes || '',
    };

    console.log('Adding item:', newItemObj);

    setFormData((prev) => ({
      ...prev,
      items: [...prev.items, newItemObj],
    }));

    setNewItem({
      item: null,
      quantity: '',
      unit_price: '',
      notes: '',
    });
    setModalAlert(null);
  };

  // Remove item from PO
  const handleRemoveItem = (index) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  // Open modal for creating new PO
  const handleOpenCreateModal = async () => {
    setLoading(true);
    try {
      console.log('Checking create_purchase_order permission...');
      const response = await API.get('/auth/permissions/action/create_purchase_order/', {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
      });
      console.log('Create permission response:', response.data);
      if (!response.data.allowed) {
        setAlert('⚠️ You do not have permission to create purchase orders.');
        return;
      }

      setModalMode('create');
      setFormData({
        requisition: null,
        vendor: null,
        department: '',
        delivery_address: '',
        expected_delivery_date: '',
        payment_terms: '',
        notes: '',
        items: [],
      });
      setNewItem({
        item: null,
        quantity: '',
        unit_price: '',
        notes: '',
      });
      setModalAlert(null);
      setOpenModal(true);
    } catch (err) {
      console.error('Create permission error:', err.response?.data || err.message);
      setAlert(`⚠️ Failed to check create permission: ${err.response?.data?.detail || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Open modal for editing PO
  const handleOpenEditModal = async (po) => {
    setLoading(true);
    try {
      const response = await API.get('/auth/permissions/action/update_purchase_order/', {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
      });
      if (!response.data.allowed) {
        setAlert('⚠️ You do not have permission to edit purchase orders.');
        return;
      }

      if (po.status !== 'draft') {
        setAlert('⚠️ Only draft purchase orders can be edited.');
        return;
      }

      setModalMode('edit');
      setSelectedPO(po);
      setFormData({
        requisition: po.requisition || null,
        vendor: po.vendor || null,
        department: po.department || '',
        delivery_address: po.delivery_address || '',
        expected_delivery_date: po.expected_delivery_date || '',
        payment_terms: po.payment_terms || '',
        notes: po.notes || '',
        items: po.items?.map((item) => ({
          item: item.item?.id || null,
          quantity: item.quantity || 0,
          unit_price: item.unit_price || 0,
          notes: item.notes || '',
        })) || [],
      });
      setNewItem({
        item: null,
        quantity: '',
        unit_price: '',
        notes: '',
      });
      setModalAlert(null);
      setOpenModal(true);
    } catch (err) {
      console.error('Edit permission error:', err.response?.data || err.message);
      setAlert(`⚠️ Failed to check edit permission: ${err.response?.data?.detail || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Open delete dialog
  const handleOpenDeleteDialog = async (id) => {
    setLoading(true);
    try {
      const response = await API.get('/auth/permissions/action/delete_purchase_order/', {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
      });
      if (!response.data.allowed) {
        setAlert('⚠️ You do not have permission to delete purchase orders.');
        return;
      }
      const po = purchaseOrders.find((p) => p.id === id);
      if (po.status !== 'draft') {
        setAlert('⚠️ Only draft purchase orders can be deleted.');
        return;
      }
      setDeleteId(id);
      setOpenDeleteDialog(true);
    } catch (err) {
      console.error('Delete permission error:', err.response?.data || err.message);
      setAlert(`⚠️ Failed to check delete permission: ${err.response?.data?.detail || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Close delete dialog
  const handleCloseDeleteDialog = () => {
    setOpenDeleteDialog(false);
    setDeleteId(null);
    setAlert(null);
    setModalAlert(null);
  };

  // Delete PO
  const handleDelete = async () => {
    setLoading(true);
    try {
      setAlert(null);
      await API.delete(`procurement/purchase-orders/${deleteId}/`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
      });
      setAlert('✅ Purchase order deleted successfully!');
      fetchPurchaseOrders();
      handleCloseDeleteDialog();
    } catch (err) {
      console.error('Delete error:', err.response?.data || err.message);
      let errorMsg = '❌ Failed to delete purchase order.';
      if (err.response?.data) {
        errorMsg = err.response.data.detail || JSON.stringify(err.response.data);
      } else {
        errorMsg = err.message || '❌ Network error.';
      }
      setAlert(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Submit PO (create or update)
  const handleSubmit = async () => {
    // Validate required fields
    if (!formData.vendor || !formData.department || !formData.delivery_address || !formData.expected_delivery_date || formData.items.length === 0) {
      setModalAlert('⚠️ Please fill all required fields and add at least one item.');
      return;
    }

    // Validate items
    const invalidItems = formData.items.filter((item) => !item.item || isNaN(item.quantity) || item.quantity <= 0 || isNaN(item.unit_price) || item.unit_price <= 0);
    if (invalidItems.length > 0) {
      setModalAlert('⚠️ All items must have a valid item, positive quantity, and positive unit price.');
      console.log('Invalid items:', invalidItems);
      return;
    }

    try {
      setLoading(true);
      setModalAlert(null);

      const payload = {
        vendor: formData.vendor.id,
        department: formData.department,
        delivery_address: formData.delivery_address,
        expected_delivery_date: formData.expected_delivery_date,
        payment_terms: formData.payment_terms || '',
        notes: formData.notes || '',
        items: formData.items.map((item) => ({
          item: item.item, // Ensure this is the item ID
          quantity: parseInt(item.quantity, 10),
          unit_price: parseFloat(item.unit_price),
          notes: item.notes || '',
        })),
      };

      if (formData.requisition) {
        payload.requisition = formData.requisition.id;
      }

      console.log('Submitting payload:', JSON.stringify(payload, null, 2));

      let response;
      if (modalMode === 'create') {
        response = await API.post('procurement/purchase-orders/', payload, {
          headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
        });
        setPurchaseOrders([response.data, ...purchaseOrders]);
        setAlert('✅ Purchase order created successfully!');
      } else {
        response = await API.patch(`procurement/purchase-orders/${selectedPO.id}/`, payload, {
          headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
        });
        setPurchaseOrders(purchaseOrders.map((po) => (po.id === selectedPO.id ? response.data : po)));
        setAlert('✅ Purchase order updated successfully!');
      }

      setOpenModal(false);
      fetchPurchaseOrders();
    } catch (err) {
      console.error('Submit error:', err.response?.data || err.message);
      let errorMsg = '❌ Failed to save purchase order.';
      if (err.response?.data) {
        const errors = err.response.data;
        if (typeof errors === 'object') {
          errorMsg = Object.entries(errors)
            .map(([field, msg]) => {
              if (field === 'items' && Array.isArray(msg)) {
                return msg.map((itemError, index) => `Item ${index + 1}: ${JSON.stringify(itemError)}`).join('; ');
              }
              return `${field}: ${Array.isArray(msg) ? msg.join(', ') : msg}`;
            })
            .join('; ');
        } else {
          errorMsg = errors.detail || errorMsg;
        }
      } else {
        errorMsg = err.message || '❌ Network error.';
      }
      setModalAlert(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Submit PO for approval
  const handleSubmitForApproval = async (poId) => {
    setLoading(true);
    try {
      setAlert(null);
      await API.patch(
        `procurement/purchase-orders/${poId}/`,
        { status: 'submitted' },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
        }
      );
      setAlert('✅ Purchase order submitted for approval!');
      fetchPurchaseOrders();
    } catch (err) {
      console.error('Submit for approval error:', err.response?.data || err.message);
      let errorMsg = '❌ Failed to submit purchase order.';
      if (err.response?.data) {
        errorMsg = err.response.data.detail || JSON.stringify(err.response.data);
      } else {
        errorMsg = err.message || '❌ Network error.';
      }
      setAlert(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Approve PO
  const handleApprovePO = async (poId) => {
    setLoading(true);
    try {
      setAlert(null);
      await API.post(
        `procurement/purchase-orders/${poId}/approve/`,
        {},
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
        }
      );
      setAlert('✅ Purchase order approved successfully!');
      fetchPurchaseOrders();
    } catch (err) {
      console.error('Approve error:', err.response?.data || err.message);
      let errorMsg = '❌ Failed to approve purchase order.';
      if (err.response?.data) {
        errorMsg = err.response.data.detail || JSON.stringify(err.response.data);
      } else {
        errorMsg = err.message || '❌ Network error.';
      }
      setAlert(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Reject PO
  const handleRejectPO = async (poId) => {
    setLoading(true);
    try {
      setAlert(null);
      await API.post(
        `procurement/purchase-orders/${poId}/reject/`,
        {},
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
        }
      );
      setAlert('✅ Purchase order rejected successfully!');
      fetchPurchaseOrders();
    } catch (err) {
      console.error('Reject error:', err.response?.data || err.message);
      let errorMsg = '❌ Failed to reject purchase order.';
      if (err.response?.data) {
        errorMsg = err.response.data.detail || JSON.stringify(err.response.data);
      } else {
        errorMsg = err.message || '❌ Network error.';
      }
      setAlert(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Export PO as PDF
  const handleExportPDF = async (poId) => {
    setLoading(true);
    try {
      setAlert(null);
      const response = await API.get(`procurement/purchase-orders/${poId}/export_pdf/`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `PO_${poId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      setAlert('✅ Purchase order PDF exported successfully!');
    } catch (err) {
      console.error('Export PDF error:', err.response?.data || err.message);
      let errorMsg = '❌ Failed to export purchase order as PDF.';
      if (err.response?.data) {
        errorMsg = err.response.data.detail || JSON.stringify(err.response.data);
      } else {
        errorMsg = err.message || '❌ Network error.';
      }
      setAlert(errorMsg);
    } finally {
      setLoading(false);
    }
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
      {alert && !openModal && !openDeleteDialog && (
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
          <Typography variant="h5">Purchase Orders Management</Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpenCreateModal}
            disabled={loading || !permissions.create_purchase_order}
          >
            Create Purchase Order
          </Button>
        </Box>

        {/* Tutorial Section */}
        <Card variant="outlined" sx={{ mb: 4, borderColor: 'primary.main', bgcolor: 'background.paper' }}>
          <CardHeader
            title={
              <Box display="flex" alignItems="center" gap={1}>
                <InfoIcon color="primary" />
                <Typography variant="h6" color="primary">
                  Page 2 of 4: Purchase Orders Management
                </Typography>
              </Box>
            }
            action={<IconButton onClick={() => setShowTutorial(!showTutorial)}>{showTutorial ? <ExpandLessIcon /> : <ExpandMoreIcon />}</IconButton>}
          />
          <Collapse in={showTutorial}>
            <CardContent>
              <Typography paragraph>
                This page allows Procurement Officers to create formal purchase orders based on approved requisitions. Purchase Orders (POs) are legally binding documents sent to vendors to order goods or services.
              </Typography>
              <Typography variant="subtitle1" gutterBottom>
                Key Features:
              </Typography>
              <ul>
                <li>
                  <strong>Create PO from Requisition:</strong> Select an approved requisition to auto-populate department and items
                </li>
                <li>
                  <strong>Standalone PO:</strong> Create a PO without a requisition for ad-hoc purchases
                </li>
                <li>
                  <strong>Vendor Selection:</strong> Choose from your approved vendor list
                </li>
                <li>
                  <strong>Delivery Details:</strong> Set delivery address and expected date
                </li>
                <li>
                  <strong>PO Status Tracking:</strong> Monitor PO progress from Draft → Submitted → Approved → Received
                </li>
                <li>
                  <strong>Approval Workflow:</strong> Managers can approve or reject submitted POs
                </li>
                <li>
                  <strong>PDF Export:</strong> Generate professional PDF documents for vendors
                </li>
              </ul>
              <Typography variant="subtitle1" gutterBottom>
                Workflow:
              </Typography>
              <ol>
                <li>Create a PO (from requisition or standalone)</li>
                <li>Submit for approval (changes status to "Submitted")</li>
                <li>Approvers review and either approve or reject</li>
                <li>Approved POs are sent to vendors</li>
                <li>When goods arrive, create a Receiving record (Page 3)</li>
              </ol>
              <Typography variant="subtitle1" gutterBottom>
                Important Notes:
              </Typography>
              <ul>
                <li>Only Draft POs can be edited or deleted</li>
                <li>Submitted POs require approval before processing</li>
                <li>All fields marked with * are required</li>
                <li>Total amount is automatically calculated from line items in Naira</li>
              </ul>
            </CardContent>
          </Collapse>
        </Card>

        <Grid container spacing={2} mb={3}>
          <Grid item xs={12} md={6}>
            <Typography variant="body1" color="text.secondary">
              Create and manage purchase orders for your organization. Convert approved requisitions into formal orders or create standalone orders.
            </Typography>
          </Grid>
          <Grid item xs={12} md={6} display="flex" justifyContent="flex-end">
            <TextField
              size="small"
              placeholder="Search purchase orders..."
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

        <Typography variant="h6" gutterBottom>Purchase Orders</Typography>

        {purchaseOrders.length > 0 ? (
          <>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell></TableCell>
                    <TableCell>PO Code</TableCell>
                    <TableCell>Vendor</TableCell>
                    <TableCell>Department</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Total Amount</TableCell>
                    <TableCell>Created</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {purchaseOrders.map((po) => (
                    <PurchaseOrderRow
                      key={po.id}
                      po={po}
                      onEdit={handleOpenEditModal}
                      onDelete={handleOpenDeleteDialog}
                      onSubmitForApproval={handleSubmitForApproval}
                      onApprove={handleApprovePO}
                      onReject={handleRejectPO}
                      onExportPDF={handleExportPDF}
                      permissions={permissions}
                      loading={loading}
                      formatCurrency={formatCurrency}
                    />
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {totalPages > 1 && (
              <Box mt={3} display="flex" justifyContent="center">
                <Pagination count={totalPages} page={page} onChange={(_, value) => setPage(value)} color="primary" />
              </Box>
            )}
          </>
        ) : (
          <Box textAlign="center" py={4}>
            <Typography variant="body1" color="text.secondary">
              No purchase orders found.
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleOpenCreateModal}
              sx={{ mt: 2 }}
              disabled={loading || !permissions.create_purchase_order}
            >
              Create Your First Purchase Order
            </Button>
          </Box>
        )}
      </Paper>

      {/* Purchase Order Modal */}
      <Dialog open={openModal} onClose={() => setOpenModal(false)} fullWidth maxWidth="md" PaperProps={{ sx: { minHeight: '80vh' } }}>
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            {modalMode === 'create' ? 'Create New Purchase Order' : 'Edit Purchase Order'}
            <IconButton onClick={() => setOpenModal(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent dividers>
          {modalAlert && (
            <Alert
              sx={{ mb: 2 }}
              severity={modalAlert.includes('❌') ? 'error' : modalAlert.includes('⚠') ? 'warning' : 'success'}
              onClose={() => setModalAlert(null)}
            >
              {modalAlert}
            </Alert>
          )}
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Autocomplete
                options={requisitions}
                getOptionLabel={(option) => `${option.code} - ${option.department}`}
                value={formData.requisition}
                onChange={(event, newValue) => handleRequisitionChange(newValue)}
                renderInput={(params) => <TextField {...params} label="Select Approved Requisition (Optional)" />}
                isOptionEqualToValue={(option, value) => option.id === value?.id}
              />
              <Typography variant="caption" color="text.secondary" display="block" mt={1}>
                Select an approved requisition to auto-populate department and items
              </Typography>
            </Grid>

            <Grid item xs={12}>
              <Autocomplete
                required
                options={vendors}
                getOptionLabel={(option) => option.name}
                value={formData.vendor}
                onChange={(event, newValue) => handleVendorChange(newValue)}
                renderInput={(params) => <TextField {...params} label="Vendor *" required />}
                isOptionEqualToValue={(option, value) => option.id === value?.id}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                required
                label="Department *"
                name="department"
                value={formData.department}
                onChange={handleInputChange}
                fullWidth
                select
              >
                <MenuItem value="IT">IT</MenuItem>
                <MenuItem value="HR">Human Resources</MenuItem>
                <MenuItem value="Finance">Finance</MenuItem>
                <MenuItem value="Marketing">Marketing</MenuItem>
                <MenuItem value="Operations">Operations</MenuItem>
                <MenuItem value="Sales">Sales</MenuItem>
                <MenuItem value="R&D">Research & Development</MenuItem>
                <MenuItem value="Procurement">Procurement</MenuItem>
                <MenuItem value="Admin">Administration</MenuItem>
              </TextField>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                required
                label="Expected Delivery Date *"
                type="date"
                name="expected_delivery_date"
                value={formData.expected_delivery_date}
                onChange={handleInputChange}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                required
                label="Delivery Address *"
                name="delivery_address"
                value={formData.delivery_address}
                onChange={handleInputChange}
                fullWidth
                multiline
                minRows={2}
                placeholder="Enter full delivery address..."
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                label="Payment Terms"
                name="payment_terms"
                value={formData.payment_terms}
                onChange={handleInputChange}
                fullWidth
                multiline
                minRows={2}
                placeholder="e.g., Net 30, 50% upfront, etc."
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                label="Notes"
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                fullWidth
                multiline
                minRows={2}
                placeholder="Additional notes or instructions..."
              />
            </Grid>

            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Items
              </Typography>

              <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={4}>
                    <Autocomplete
                      options={inventoryItems}
                      getOptionLabel={(option) => option.name}
                      value={newItem.item}
                      onChange={(event, newValue) => handleNewItemChange('item', newValue)}
                      renderInput={(params) => <TextField {...params} label="Select Item *" required />}
                      isOptionEqualToValue={(option, value) => option.id === value?.id}
                    />
                  </Grid>

                  <Grid item xs={12} md={2}>
                    <TextField
                      required
                      label="Quantity *"
                      type="number"
                      value={newItem.quantity}
                      onChange={(e) => handleNewItemChange('quantity', e.target.value)}
                      fullWidth
                      inputProps={{ min: 1 }}
                    />
                  </Grid>

                  <Grid item xs={12} md={2}>
                    <TextField
                      required
                      label="Unit Price (₦)*"
                      type="number"
                      value={newItem.unit_price}
                      onChange={(e) => handleNewItemChange('unit_price', e.target.value)}
                      fullWidth
                      inputProps={{ min: 0.01, step: 0.01 }}
                    />
                  </Grid>

                  <Grid item xs={12} md={3}>
                    <TextField
                      label="Notes"
                      value={newItem.notes}
                      onChange={(e) => handleNewItemChange('notes', e.target.value)}
                      fullWidth
                    />
                  </Grid>

                  <Grid item xs={12} md={1} display="flex" alignItems="flex-end">
                    <Button variant="contained" onClick={handleAddItem} fullWidth disabled={loading}>
                      Add
                    </Button>
                  </Grid>
                </Grid>
              </Paper>

              {formData.items.length > 0 ? (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Item</TableCell>
                        <TableCell>Quantity</TableCell>
                        <TableCell>Unit Price</TableCell>
                        <TableCell>Total</TableCell>
                        <TableCell>Notes</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {formData.items.map((item, index) => {
                        const inventoryItem = inventoryItems.find((i) => i.id === item.item);
                        const total = item.quantity * item.unit_price;

                        return (
                          <TableRow key={index}>
                            <TableCell>{inventoryItem ? inventoryItem.name : 'Unknown Item'}</TableCell>
                            <TableCell>{item.quantity}</TableCell>
                            <TableCell>{formatCurrency(item.unit_price)}</TableCell>
                            <TableCell>{formatCurrency(total)}</TableCell>
                            <TableCell>{item.notes || '-'}</TableCell>
                            <TableCell>
                              <IconButton size="small" onClick={() => handleRemoveItem(index)} color="error">
                                <CancelIcon />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Typography color="text.secondary" textAlign="center" py={2}>
                  No items added yet. Add items using the form above.
                </Typography>
              )}

              {formData.items.length > 0 && (
                <Box mt={2} display="flex" justifyContent="flex-end">
                  <Typography variant="h6">Total Amount: {formatCurrency(calculateTotalAmount(formData.items))}</Typography>
                </Box>
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
            disabled={loading || formData.items.length === 0 || !formData.vendor || !formData.department || !formData.delivery_address || !formData.expected_delivery_date}
            startIcon={loading ? <CircularProgress size={20} /> : null}
          >
            {loading ? 'Saving...' : modalMode === 'create' ? 'Create Purchase Order' : 'Update Purchase Order'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={openDeleteDialog} onClose={handleCloseDeleteDialog}>
        <DialogTitle>Delete Purchase Order?</DialogTitle>
        <DialogContent>
          {alert && (
            <Alert
              sx={{ mb: 2 }}
              severity={alert.includes('❌') ? 'error' : alert.includes('⚠') ? 'warning' : 'success'}
              onClose={() => setAlert(null)}
            >
              {alert}
            </Alert>
          )}
          <Typography>Are you sure you want to delete this purchase order? This cannot be undone.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog} disabled={loading}>
            Cancel
          </Button>
          <Button color="error" onClick={handleDelete} disabled={loading}>
            {loading ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}