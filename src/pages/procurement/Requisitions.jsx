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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Autocomplete,
  Collapse,
  Tooltip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Checkbox,
  AlertTitle,
} from '@mui/material';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Edit as EditIcon,
  Close as CloseIcon,
  ExpandMore as ExpandMoreIcon,
  Send as SendIcon,
  Delete as DeleteIcon,
  Description as DescriptionIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  TrendingUp as TrendingUpIcon,
  TrendingFlat as TrendingFlatIcon,
  TrendingDown as TrendingDownIcon,
  People as PeopleIcon,
  HowToReg as HowToRegIcon,
} from '@mui/icons-material';
import { debounce } from 'lodash';
import API from '../../api';
import { useSearch } from '../../context/SearchContext';

const STATUS_COLORS = {
  draft: 'default',
  submitted: 'info',
  approved: 'success',
  rejected: 'error',
  cancelled: 'warning',
  completed: 'success',
};

const STATUS_ICONS = {
  draft: <DescriptionIcon color="default" />,
  submitted: <SendIcon color="info" />,
  approved: <CheckCircleIcon color="success" />,
  rejected: <ErrorIcon color="error" />,
  cancelled: <WarningIcon color="warning" />,
  completed: <CheckCircleIcon color="success" />,
};

const PRIORITY_COLORS = {
  low: 'default',
  medium: 'info',
  high: 'warning',
  urgent: 'error',
};

const PRIORITY_ICONS = {
  low: <TrendingDownIcon color="default" />,
  medium: <TrendingFlatIcon color="info" />,
  high: <TrendingUpIcon color="warning" />,
  urgent: <TrendingUpIcon color="error" />,
};

const CURRENCY_OPTIONS = [
  { value: 'NGN', label: 'Nigerian Naira (₦)' },
  { value: 'USD', label: 'US Dollar ($)' },
];

// Helper to format currency based on code
const formatCurrency = (value, currency = 'NGN') => {
  if (value == null || value === '') return '—';
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
  });
  return formatter.format(value);
};

// Expandable row component for requisition details
function RequisitionRow({
  requisition,
  onEdit,
  onDelete,
  onSubmit,
  onApprove,
  onReject,
  hasUpdatePermission,
  hasDeletePermission,
  approvalBoard,
  currentUser,
}) {
  const [open, setOpen] = useState(false);

  const calculateTotalCost = (items) => {
    return items.reduce((total, item) => {
      return total + item.quantity * (item.unit_cost || 0);
    }, 0);
  };

  const canCurrentUserApprove = approvalBoard.some(
    (member) => member.user_id === currentUser.id && member.can_approve_requisitions
  );

  // ❌ Removed unused: const currencySymbol = requisition.currency === 'NGN' ? '₦' : '$';

  return (
    <>
      <TableRow sx={{ '& > *': { borderBottom: 'unset' }, cursor: 'pointer' }} onClick={() => setOpen(!open)}>
        <TableCell>
          <IconButton
            aria-label="expand row"
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(!open);
            }}
          >
            {open ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
        </TableCell>
        <TableCell>
          <Tooltip title="Requisition Code">
            <strong>{requisition.code}</strong>
          </Tooltip>
        </TableCell>
        <TableCell>{requisition.department}</TableCell>
        <TableCell>
          <Chip
            label={requisition.priority.charAt(0).toUpperCase() + requisition.priority.slice(1)}
            size="small"
            color={PRIORITY_COLORS[requisition.priority] || 'default'}
            icon={PRIORITY_ICONS[requisition.priority]}
          />
        </TableCell>
        <TableCell>
          <Chip
            label={requisition.status.charAt(0).toUpperCase() + requisition.status.slice(1)}
            size="small"
            color={STATUS_COLORS[requisition.status] || 'default'}
            icon={STATUS_ICONS[requisition.status]}
          />
        </TableCell>
        <TableCell>
          {requisition.created_by_name || requisition.created_by?.name || requisition.created_by?.email || 'System'}
        </TableCell>
        <TableCell>
          {requisition.approved_by_name || requisition.approved_by?.name || requisition.approved_by?.email || '-'}
        </TableCell>
        <TableCell>{new Date(requisition.created_at).toLocaleDateString()}</TableCell>
        <TableCell>
          {requisition.items.length > 0 && (
            <Typography variant="body2">
              {formatCurrency(calculateTotalCost(requisition.items), requisition.currency)}
            </Typography>
          )}
        </TableCell>
        <TableCell>
          <Box display="flex" gap={1}>
            {/* Edit - only draft + permission */}
            {requisition.status === 'draft' && hasUpdatePermission && (
              <IconButton
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(requisition);
                }}
                color="primary"
                title="Edit requisition"
                size="small"
              >
                <EditIcon />
              </IconButton>
            )}
            {/* Delete - only draft + permission */}
            {requisition.status === 'draft' && hasDeletePermission && (
              <IconButton
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(requisition.id);
                }}
                color="error"
                title="Delete requisition"
                size="small"
              >
                <DeleteIcon />
              </IconButton>
            )}
            {/* Submit - only draft + permission */}
            {requisition.status === 'draft' && hasUpdatePermission && (
              <IconButton
                onClick={(e) => {
                  e.stopPropagation();
                  onSubmit(requisition.id);
                }}
                color="info"
                title="Submit for approval"
                size="small"
              >
                <SendIcon />
              </IconButton>
            )}
            {/* Approve/Reject - only submitted + approver */}
            {requisition.status === 'submitted' && canCurrentUserApprove && (
              <>
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    onApprove(requisition.id);
                  }}
                  variant="contained"
                  color="success"
                  size="small"
                >
                  Approve
                </Button>
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    onReject(requisition.id);
                  }}
                  variant="contained"
                  color="error"
                  size="small"
                >
                  Reject
                </Button>
              </>
            )}
            {/* Show empty if no actions */}
            {!(requisition.status === 'draft' && (hasUpdatePermission || hasDeletePermission)) &&
              !(requisition.status === 'submitted' && canCurrentUserApprove) && (
                <Typography variant="body2" color="text.secondary">
                  -
                </Typography>
              )}
          </Box>
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={11}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ margin: 2 }}>
              <Typography variant="h6" gutterBottom component="div">
                Requisition Details
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography><strong>ID:</strong> {requisition.id}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography><strong>Code:</strong> {requisition.code}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography><strong>Department:</strong> {requisition.department}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography>
                    <strong>Priority:</strong>
                    <Chip
                      label={requisition.priority.charAt(0).toUpperCase() + requisition.priority.slice(1)}
                      size="small"
                      color={PRIORITY_COLORS[requisition.priority] || 'default'}
                      icon={PRIORITY_ICONS[requisition.priority]}
                      sx={{ ml: 1 }}
                    />
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography>
                    <strong>Status:</strong>
                    <Chip
                      label={requisition.status.charAt(0).toUpperCase() + requisition.status.slice(1)}
                      size="small"
                      color={STATUS_COLORS[requisition.status] || 'default'}
                      icon={STATUS_ICONS[requisition.status]}
                      sx={{ ml: 1 }}
                    />
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography>
                    <strong>Currency:</strong> {requisition.currency === 'NGN' ? 'Nigerian Naira (₦)' : 'US Dollar ($)'}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography>
                    <strong>Created By:</strong>{' '}
                    {requisition.created_by_name || requisition.created_by?.name || requisition.created_by?.email || 'System'}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography>
                    <strong>Requested By:</strong>{' '}
                    {requisition.requested_by_name || requisition.requested_by?.name || requisition.requested_by?.email || 'System'}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography>
                    <strong>Approved By:</strong>{' '}
                    {requisition.approved_by_name || requisition.approved_by?.name || requisition.approved_by?.email || '-'}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography><strong>Created:</strong> {new Date(requisition.created_at).toLocaleString()}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography><strong>Updated:</strong> {new Date(requisition.updated_at).toLocaleString()}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography>
                    <strong>Approved At:</strong>{' '}
                    {requisition.approved_at ? new Date(requisition.approved_at).toLocaleString() : '-'}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography><strong>Purpose:</strong> {requisition.purpose}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>
                    Items ({requisition.items.length})
                  </Typography>
                  {requisition.items.length > 0 ? (
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Item</TableCell>
                          <TableCell>Quantity</TableCell>
                          <TableCell>Unit Cost</TableCell>
                          <TableCell>Total</TableCell>
                          <TableCell>Notes</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {requisition.items.map((item, index) => {
                          const total = item.quantity * (item.unit_cost || 0);
                          return (
                            <TableRow key={index}>
                              <TableCell>{item.item_details?.name || 'Unknown Item'}</TableCell>
                              <TableCell>{item.quantity}</TableCell>
                              <TableCell>
                                {item.unit_cost != null
                                  ? formatCurrency(item.unit_cost, requisition.currency)
                                  : '—'}
                              </TableCell>
                              <TableCell>
                                {total > 0 ? formatCurrency(total, requisition.currency) : '—'}
                              </TableCell>
                              <TableCell>{item.notes || '-'}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  ) : (
                    <Typography color="text.secondary">No items added</Typography>
                  )}
                </Grid>
                <Grid item xs={12}>
                  <Typography>
                    <strong>Total Cost:</strong>{' '}
                    {formatCurrency(calculateTotalCost(requisition.items), requisition.currency)}
                  </Typography>
                </Grid>
              </Grid>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
}

export default function Requisitions() {
  const [requisitions, setRequisitions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);
  const [checkingPermissions, setCheckingPermissions] = useState(true);
  const [hasPermission, setHasPermission] = useState(false);
  const [permissions, setPermissions] = useState({
    create_requisition: false,
    update_requisition: false,
    delete_requisition: false,
    add_approval_board_member: false,
    view_approval_board: false,
  });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const { searchTerm } = useSearch();
  const itemsPerPage = 10;
  const prevSearchTermRef = useRef(searchTerm);
  const prevSearchRef = useRef(search);
  const currentUser = {
    id: parseInt(localStorage.getItem('userId')) || null,
    email: localStorage.getItem('userEmail') || '',
    name: localStorage.getItem('userName') || '',
    role: localStorage.getItem('userRole') || 'staff',
  };

  // Modal states
  const [openModal, setOpenModal] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [modalMode, setModalMode] = useState('create');
  const [selectedRequisition, setSelectedRequisition] = useState(null);

  // Approval modals
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedRequisitionForApproval, setSelectedRequisitionForApproval] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Approval board
  const [approvalBoard, setApprovalBoard] = useState([]);
  const [approvalBoardLoading, setApprovalBoardLoading] = useState(false);
  const [approvalBoardModalOpen, setApprovalBoardModalOpen] = useState(false);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);

  // Form state
  const [formData, setFormData] = useState({
    department: '',
    purpose: '',
    priority: 'medium',
    currency: 'NGN',
    items: [],
  });
  const [newItem, setNewItem] = useState({
    item: null,
    quantity: '',
    unit_cost: '',
    notes: '',
  });
  const [inventoryItems, setInventoryItems] = useState([]);
  const [showTutorial, setShowTutorial] = useState(false);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedSetSearch = useCallback(
    debounce((value) => {
      setSearch(value);
      setPage(1);
    }, 500),
    []
  );

  // Fetch requisitions
  const fetchRequisitions = useCallback(async () => {
    try {
      setLoading(true);
      const searchValue = search || searchTerm;
      const res = await API.get('procurement/requisitions/', {
        params: { search: searchValue, page, page_size: itemsPerPage },
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
      });
      setRequisitions(res.data.results || []);
      setTotalPages(Math.ceil(res.data.count / itemsPerPage));
      setAlert(null);
    } catch (err) {
      console.error('Error fetching requisitions:', err.response?.data || err.message);
      setAlert('❌ Failed to fetch requisitions: ' + (err.response?.data?.detail || err.message));
      setRequisitions([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [search, searchTerm, page, itemsPerPage]);

  const fetchInventoryItems = useCallback(async () => {
    try {
      const res = await API.get('inventory/items/', {
        params: { page_size: 1000 },
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
      });
      setInventoryItems(res.data.results || []);
    } catch (err) {
      console.error('Error fetching inventory items:', err);
    }
  }, []);

  const fetchApprovalBoard = useCallback(async () => {
    try {
      setApprovalBoardLoading(true);
      const res = await API.get('procurement/requisitions/approval_board/', {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
      });
      setApprovalBoard(res.data?.approval_board_members || []);
      setAlert(null);
    } catch (err) {
      console.error('Error fetching approval board:', err.response?.data || err.message);
      setAlert('❌ Failed to fetch approval board: ' + (err.response?.data?.detail || err.message));
      setApprovalBoard([]);
    } finally {
      setApprovalBoardLoading(false);
    }
  }, []);

  const fetchAvailableUsers = useCallback(async () => {
    try {
      const res = await API.get('auth/users/', {
        params: { page_size: 1000 },
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
      });
      setAvailableUsers(res.data.results || []);
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  }, []);

  // Check permissions
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
        const pageResponse = await API.get('/auth/permissions/page/requisitions/');
        setHasPermission(pageResponse.data.allowed || false);
        if (!pageResponse.data.allowed) {
          setAlert(`⚠️ You do not have permission to view this page: ${pageResponse.data.reason || 'No reason provided'}`);
        } else {
          const actions = ['create_requisition', 'update_requisition', 'delete_requisition', 'add_approval_board_member', 'view_approval_board'];
          const actionPerms = {};
          for (const action of actions) {
            const actionResponse = await API.get(`/auth/permissions/action/${action}/`);
            actionPerms[action] = actionResponse.data.allowed || false;
          }
          setPermissions(actionPerms);
          fetchRequisitions();
          fetchInventoryItems();
          fetchApprovalBoard();
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
  }, [fetchRequisitions, fetchInventoryItems, fetchApprovalBoard]);

  useEffect(() => {
    if (hasPermission && (search !== prevSearchRef.current || searchTerm !== prevSearchTermRef.current)) {
      setPage(1);
      prevSearchRef.current = search;
      prevSearchTermRef.current = searchTerm;
    }
    if (hasPermission) fetchRequisitions();
  }, [search, searchTerm, page, hasPermission, fetchRequisitions]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleNewItemChange = (field, value) => {
    setNewItem((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddItem = () => {
    if (!newItem.item || !newItem.quantity) {
      setAlert('⚠️ Please select an item and enter quantity.');
      return;
    }
    const quantity = parseInt(newItem.quantity);
    if (isNaN(quantity) || quantity <= 0) {
      setAlert('⚠️ Quantity must be a positive number.');
      return;
    }
    const unitCost = newItem.unit_cost === '' ? null : parseFloat(newItem.unit_cost);
    if (newItem.unit_cost !== '' && (isNaN(unitCost) || unitCost < 0)) {
      setAlert('⚠️ Unit cost must be a non-negative number.');
      return;
    }
    const newItemObj = {
      item: newItem.item.id,
      quantity: quantity,
      unit_cost: unitCost,
      notes: newItem.notes || '',
    };
    setFormData((prev) => ({ ...prev, items: [...prev.items, newItemObj] }));
    setNewItem({ item: null, quantity: '', unit_cost: '', notes: '' });
  };

  const handleRemoveItem = (index) => {
    setFormData((prev) => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));
  };

  const handleOpenCreateModal = () => {
    if (!permissions.create_requisition) {
      setAlert('⚠️ You do not have permission to create requisitions.');
      return;
    }
    setModalMode('create');
    setFormData({
      department: '',
      purpose: '',
      priority: 'medium',
      currency: 'NGN',
      items: [],
    });
    setNewItem({ item: null, quantity: '', unit_cost: '', notes: '' });
    setOpenModal(true);
  };

  const handleOpenEditModal = (requisition) => {
    if (!permissions.update_requisition) {
      setAlert('⚠️ You do not have permission to edit requisitions.');
      return;
    }
    if (requisition.status !== 'draft') {
      setAlert('⚠️ Only draft requisitions can be edited.');
      return;
    }
    setModalMode('edit');
    setSelectedRequisition(requisition);
    setFormData({
      department: requisition.department,
      purpose: requisition.purpose,
      priority: requisition.priority,
      currency: requisition.currency,
      items: requisition.items.map((item) => ({
        item: item.item.id,
        quantity: item.quantity,
        unit_cost: item.unit_cost,
        notes: item.notes,
      })),
    });
    setNewItem({ item: null, quantity: '', unit_cost: '', notes: '' });
    setOpenModal(true);
  };

  const handleOpenDelete = (id) => {
    if (!permissions.delete_requisition) {
      setAlert('⚠️ You do not have permission to delete requisitions.');
      return;
    }
    setDeleteId(id);
    setDeleteOpen(true);
  };

  const handleCloseDelete = () => {
    setDeleteOpen(false);
    setDeleteId(null);
  };

  const handleOpenApprovalBoardModal = () => {
    if (!permissions.add_approval_board_member) {
      setAlert('⚠️ You do not have permission to manage the approval board.');
      return;
    }
    fetchAvailableUsers();
    const currentMemberIds = approvalBoard.map((member) => member.user_id);
    setSelectedUsers(currentMemberIds);
    setApprovalBoardModalOpen(true);
  };

  const handleCloseApprovalBoardModal = () => {
    setApprovalBoardModalOpen(false);
    setSelectedUsers([]);
  };

  const handleUserToggle = (userId) => {
    setSelectedUsers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleSaveApprovalBoard = async () => {
    try {
      setLoading(true);
      setAlert(null);
      const currentMemberIds = approvalBoard.map((member) => member.user_id);
      const usersToAdd = selectedUsers.filter((id) => !currentMemberIds.includes(id));
      const usersToRemove = currentMemberIds.filter((id) => !selectedUsers.includes(id));
      for (const userId of usersToAdd) {
        await API.post('procurement/approval-board/', {
          user: userId,
          can_approve_requisitions: true,
          can_approve_purchase_orders: false,
        });
      }
      for (const userId of usersToRemove) {
        const member = approvalBoard.find((m) => m.user_id === userId);
        if (member) {
          await API.patch(`procurement/approval-board/${member.id}/`, { is_active: false });
        }
      }
      setAlert('✅ Approval board updated successfully!');
      handleCloseApprovalBoardModal();
      fetchApprovalBoard();
    } catch (err) {
      let errorMsg = '❌ Failed to update approval board.';
      if (err.response?.data) errorMsg = err.response.data.detail || JSON.stringify(err.response.data);
      else errorMsg = err.message || '❌ Network error.';
      setAlert(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenApproveModal = (requisitionId) => {
    const requisition = requisitions.find((req) => req.id === requisitionId);
    if (requisition) {
      setSelectedRequisitionForApproval(requisition);
      setApproveModalOpen(true);
    }
  };

  const handleOpenRejectModal = (requisitionId) => {
    const requisition = requisitions.find((req) => req.id === requisitionId);
    if (requisition) {
      setSelectedRequisitionForApproval(requisition);
      setRejectionReason('');
      setRejectModalOpen(true);
    }
  };

  const handleApprove = async () => {
    if (!selectedRequisitionForApproval) return;
    try {
      setLoading(true);
      setAlert(null);
      await API.post(`procurement/requisitions/${selectedRequisitionForApproval.id}/approve/`);
      setAlert('✅ Requisition approved successfully!');
      setApproveModalOpen(false);
      fetchRequisitions();
    } catch (err) {
      let errorMsg = '❌ Failed to approve requisition.';
      if (err.response?.data) errorMsg = err.response.data.detail || JSON.stringify(err.response.data);
      else errorMsg = err.message || '❌ Network error.';
      setAlert(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequisitionForApproval || !rejectionReason.trim()) {
      setAlert('⚠️ Please provide a rejection reason.');
      return;
    }
    try {
      setLoading(true);
      setAlert(null);
      await API.post(`procurement/requisitions/${selectedRequisitionForApproval.id}/reject/`);
      setAlert('✅ Requisition rejected successfully!');
      setRejectModalOpen(false);
      setRejectionReason('');
      fetchRequisitions();
    } catch (err) {
      let errorMsg = '❌ Failed to reject requisition.';
      if (err.response?.data) errorMsg = err.response.data.detail || JSON.stringify(err.response.data);
      else errorMsg = err.message || '❌ Network error.';
      setAlert(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.department || !formData.purpose || formData.items.length === 0) {
      setAlert('⚠️ Please fill all required fields and add at least one item.');
      return;
    }
    try {
      setLoading(true);
      setAlert(null);
      const payload = {
        department: formData.department,
        purpose: formData.purpose,
        priority: formData.priority,
        currency: formData.currency,
        items: formData.items,
      };

      // ❌ Removed unused 'response' variable
      if (modalMode === 'create') {
        await API.post('procurement/requisitions/', payload);
        setAlert('✅ Requisition created successfully!');
      } else {
        await API.patch(`procurement/requisitions/${selectedRequisition.id}/`, payload);
        setAlert('✅ Requisition updated successfully!');
      }

      setOpenModal(false);
      fetchRequisitions();
    } catch (err) {
      let errorMsg = '❌ Failed to save requisition.';
      if (err.response?.data) {
        const errors = err.response.data;
        if (typeof errors === 'object') {
          errorMsg = Object.entries(errors)
            .map(([field, msg]) => `${field}: ${Array.isArray(msg) ? msg.join(', ') : msg}`)
            .join('; ');
        } else {
          errorMsg = errors.detail || errorMsg;
        }
      } else {
        errorMsg = err.message || '❌ Network error.';
      }
      setAlert(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      setLoading(true);
      setAlert(null);
      await API.delete(`procurement/requisitions/${deleteId}/`);
      setAlert('✅ Requisition deleted successfully!');
      handleCloseDelete();
      fetchRequisitions();
    } catch (err) {
      let errorMsg = '❌ Failed to delete requisition.';
      if (err.response?.data) errorMsg = err.response.data.detail || JSON.stringify(err.response.data);
      else errorMsg = err.message || '❌ Network error.';
      setAlert(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitForApproval = async (requisitionId) => {
    try {
      setLoading(true);
      setAlert(null);
      await API.patch(`procurement/requisitions/${requisitionId}/`, { status: 'submitted' });
      setAlert('✅ Requisition submitted for approval!');
      fetchRequisitions();
    } catch (err) {
      let errorMsg = '❌ Failed to submit requisition.';
      if (err.response?.data) errorMsg = err.response.data.detail || JSON.stringify(err.response.data);
      else errorMsg = err.message || '❌ Network error.';
      setAlert(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  if (checkingPermissions) {
    return (
      <Container>
        <Typography variant="h6" sx={{ mt: 4 }}>Loading permissions...</Typography>
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
          severity={alert.includes('❌') ? 'error' : alert.includes('⚠️') ? 'warning' : 'success'}
          onClose={() => setAlert(null)}
        >
          {alert}
        </Alert>
      )}

      <Paper elevation={3} sx={{ p: 4, mt: 4 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h5">Requisitions Management</Typography>
          <Box display="flex" gap={2}>
            {permissions.add_approval_board_member && (
              <Button
                variant="outlined"
                startIcon={<PeopleIcon />}
                onClick={handleOpenApprovalBoardModal}
                disabled={approvalBoardLoading}
              >
                Manage Approval Board
              </Button>
            )}
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleOpenCreateModal}
              disabled={!permissions.create_requisition}
            >
              Create Requisition
            </Button>
          </Box>
        </Box>

        {/* Tutorial */}
        <Accordion expanded={showTutorial} onChange={() => setShowTutorial(!showTutorial)} sx={{ mb: 4 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <DescriptionIcon sx={{ mr: 1 }} />
              <Typography variant="h6">Page 1 of 4: Requisitions Management</Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Typography paragraph>
              This is where you initiate purchase requests for your department. Create a requisition with the items you
              need, then submit it for approval.
            </Typography>
            <ul>
              <li><strong>Currency selection</strong>: Choose NGN or USD at creation (cannot be changed later)</li>
              <li><strong>Optional pricing</strong>: Unit cost is no longer required</li>
              <li><strong>Status tracking</strong>: See "Approved", "Rejected" tags clearly</li>
              <li><strong>No thumbs icons</strong>: Clean approve/reject buttons</li>
            </ul>
          </AccordionDetails>
        </Accordion>

        {/* Approval Board Summary */}
        {permissions.view_approval_board && (
          <Paper variant="outlined" sx={{ p: 2, mb: 3, bgcolor: 'grey.50' }}>
            <Box display="flex" alignItems="center" mb={1}>
              <PeopleIcon sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h6" color="primary">
                Approval Board ({approvalBoard.length} members)
              </Typography>
            </Box>
            {approvalBoardLoading ? (
              <CircularProgress size={24} />
            ) : approvalBoard.length > 0 ? (
              <Box display="flex" flexWrap="wrap" gap={1}>
                {approvalBoard.map((member) => (
                  <Chip key={member.id} label={member.user_name || member.user_email} size="small" color="primary" variant="outlined" />
                ))}
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary">
                No approval board members configured.
              </Typography>
            )}
          </Paper>
        )}

        <Grid container spacing={2} mb={3}>
          <Grid item xs={12} md={6}>
            <Typography variant="body1" color="text.secondary">
              Initiate purchase requests. Select currency (NGN/USD) at creation.
            </Typography>
          </Grid>
          <Grid item xs={12} md={6} display="flex" justifyContent="flex-end">
            <TextField
              size="small"
              placeholder="Search requisitions..."
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
        <Typography variant="h6" gutterBottom>My Requisitions</Typography>

        {requisitions.length > 0 ? (
          <>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell />
                    <TableCell>Code</TableCell>
                    <TableCell>Department</TableCell>
                    <TableCell>Priority</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Created By</TableCell>
                    <TableCell>Approved By</TableCell>
                    <TableCell>Created</TableCell>
                    <TableCell>Total Cost</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {requisitions.map((req) => (
                    <RequisitionRow
                      key={req.id}
                      requisition={req}
                      onEdit={handleOpenEditModal}
                      onDelete={handleOpenDelete}
                      onSubmit={handleSubmitForApproval}
                      onApprove={handleOpenApproveModal}
                      onReject={handleOpenRejectModal}
                      hasUpdatePermission={permissions.update_requisition}
                      hasDeletePermission={permissions.delete_requisition}
                      approvalBoard={approvalBoard}
                      currentUser={currentUser}
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
              You haven't created any requisitions yet.
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleOpenCreateModal}
              sx={{ mt: 2 }}
              disabled={!permissions.create_requisition}
            >
              Create Your First Requisition
            </Button>
          </Box>
        )}
      </Paper>

      {/* Requisition Modal */}
      <Dialog open={openModal} onClose={() => setOpenModal(false)} fullWidth maxWidth="md" PaperProps={{ sx: { minHeight: '80vh' } }}>
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            {modalMode === 'create' ? 'Create New Requisition' : 'Edit Requisition'}
            <IconButton onClick={() => setOpenModal(false)}><CloseIcon /></IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                required
                label="Department *"
                name="department"
                value={formData.department}
                onChange={handleInputChange}
                fullWidth
                select
                sx={{ minWidth: 250 }}
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
              <FormControl fullWidth required sx={{ minWidth: 250 }}>
                <InputLabel>Currency *</InputLabel>
                <Select
                  name="currency"
                  value={formData.currency}
                  onChange={handleInputChange}
                  label="Currency *"
                  disabled={modalMode === 'edit'}
                >
                  {CURRENCY_OPTIONS.map((opt) => (
                    <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth required sx={{ minWidth: 250 }}>
                <InputLabel>Priority *</InputLabel>
                <Select name="priority" value={formData.priority} onChange={handleInputChange} label="Priority *">
                  <MenuItem value="low">Low</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                  <MenuItem value="urgent">Urgent</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                required
                label="Purpose *"
                name="purpose"
                value={formData.purpose}
                onChange={handleInputChange}
                fullWidth
                multiline
                minRows={3}
                placeholder="Describe why this requisition is needed..."
              />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>Items</Typography>
              <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={4}>
                    <Autocomplete
                      options={inventoryItems}
                      getOptionLabel={(option) => option.name}
                      value={newItem.item}
                      onChange={(event, newValue) => handleNewItemChange('item', newValue)}
                      renderInput={(params) => <TextField {...params} label="Select Item *" required sx={{ minWidth: 250 }} />}
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
                      sx={{ minWidth: 250 }}
                    />
                  </Grid>
                  <Grid item xs={12} md={2}>
                    <TextField
                      label="Unit Cost (Optional)"
                      type="number"
                      value={newItem.unit_cost}
                      onChange={(e) => handleNewItemChange('unit_cost', e.target.value)}
                      fullWidth
                      inputProps={{ min: 0, step: 0.01 }}
                      sx={{ minWidth: 250 }}
                    />
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <TextField
                      label="Notes"
                      value={newItem.notes}
                      onChange={(e) => handleNewItemChange('notes', e.target.value)}
                      fullWidth
                      sx={{ minWidth: 250 }}
                    />
                  </Grid>
                  <Grid item xs={12} md={1} display="flex" alignItems="flex-end">
                    <Button variant="contained" onClick={handleAddItem} fullWidth>
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
                        <TableCell>Unit Cost</TableCell>
                        <TableCell>Total</TableCell>
                        <TableCell>Notes</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {formData.items.map((item, index) => {
                        const inventoryItem = inventoryItems.find((i) => i.id === item.item);
                        const total = item.quantity * (item.unit_cost || 0);
                        return (
                          <TableRow key={index}>
                            <TableCell>{inventoryItem ? inventoryItem.name : 'Unknown Item'}</TableCell>
                            <TableCell>{item.quantity}</TableCell>
                            <TableCell>{item.unit_cost != null ? formatCurrency(item.unit_cost, formData.currency) : '—'}</TableCell>
                            <TableCell>{total > 0 ? formatCurrency(total, formData.currency) : '—'}</TableCell>
                            <TableCell>{item.notes || '-'}</TableCell>
                            <TableCell>
                              <IconButton size="small" onClick={() => handleRemoveItem(index)} color="error">
                                <DeleteIcon />
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
                  No items added yet.
                </Typography>
              )}
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setOpenModal(false)} disabled={loading}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={loading || formData.items.length === 0}
            startIcon={loading ? <CircularProgress size={20} /> : null}
          >
            {loading ? 'Saving...' : modalMode === 'create' ? 'Create Requisition' : 'Update Requisition'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteOpen} onClose={handleCloseDelete}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete this requisition?</Typography>
          <Alert severity="warning" sx={{ mt: 2 }}>
            <WarningIcon sx={{ mr: 1 }} />
            <strong>Warning:</strong> This action cannot be undone.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDelete}>Cancel</Button>
          <Button onClick={handleDelete} color="error" variant="contained" disabled={loading}>
            {loading ? 'Deleting...' : 'Delete Requisition'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Approval Board Modal */}
      <Dialog open={approvalBoardModalOpen} onClose={handleCloseApprovalBoardModal} fullWidth maxWidth="sm">
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            Manage Approval Board
            <IconButton onClick={handleCloseApprovalBoardModal}><CloseIcon /></IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" paragraph>
            Select users who can approve requisitions.
          </Typography>
          {availableUsers.length > 0 ? (
            <List dense>
              {availableUsers.map((user) => {
                const isChecked = selectedUsers.includes(user.id);
                return (
                  <ListItem key={user.id} button onClick={() => handleUserToggle(user.id)} disabled={loading}>
                    <ListItemIcon><Checkbox edge="start" checked={isChecked} tabIndex={-1} disableRipple /></ListItemIcon>
                    <ListItemText primary={user.name || user.email} secondary={user.email} />
                  </ListItem>
                );
              })}
            </List>
          ) : (
            <Typography color="text.secondary">No users available.</Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={handleCloseApprovalBoardModal} disabled={loading}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveApprovalBoard} disabled={loading}>
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Approve Modal */}
      <Dialog open={approveModalOpen} onClose={() => setApproveModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" color="success.main">
            <HowToRegIcon sx={{ mr: 1 }} />
            Confirm Approval
          </Box>
        </DialogTitle>
        <DialogContent>
          <Alert severity="info">
            <AlertTitle>Approve this requisition?</AlertTitle>
            <Typography variant="body2">
              <strong>Code:</strong> {selectedRequisitionForApproval?.code}<br />
              <strong>Department:</strong> {selectedRequisitionForApproval?.department}<br />
              <strong>Total:</strong> {formatCurrency(
                selectedRequisitionForApproval?.items?.reduce((t, i) => t + i.quantity * (i.unit_cost || 0), 0),
                selectedRequisitionForApproval?.currency
              )}
            </Typography>
          </Alert>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setApproveModalOpen(false)} disabled={loading}>Cancel</Button>
          <Button variant="contained" color="success" onClick={handleApprove} disabled={loading}>
            {loading ? 'Approving...' : 'Approve Requisition'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reject Modal */}
      <Dialog open={rejectModalOpen} onClose={() => setRejectModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" color="error.main">
            <ErrorIcon sx={{ mr: 1 }} />
            Reject Requisition
          </Box>
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning">
            <AlertTitle>Reject this requisition?</AlertTitle>
            <Typography variant="body2" paragraph>
              <strong>Code:</strong> {selectedRequisitionForApproval?.code}
            </Typography>
          </Alert>
          <TextField
            label="Rejection Reason"
            multiline
            minRows={3}
            fullWidth
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="Explain why this requisition is being rejected..."
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setRejectModalOpen(false)} disabled={loading}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleReject} disabled={loading}>
            {loading ? 'Rejecting...' : 'Reject Requisition'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}