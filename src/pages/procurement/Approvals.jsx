import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Container,
  Paper,
  Typography,
  Button,
  Box,
  Grid,
  Alert,
  AlertTitle,
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
  Tooltip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Search as SearchIcon,
  ExpandMore as ExpandMoreIcon,
  Delete as DeleteIcon,
  PersonAdd as PersonAddIcon,
  HowToReg as HowToRegIcon,
  Assignment as AssignmentIcon,
  Group as GroupIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { debounce } from 'lodash';
import API from '../../api';
import { useSearch } from '../../context/SearchContext';

const PRIORITY_COLORS = {
  low: 'default',
  medium: 'info',
  high: 'warning',
  urgent: 'error',
};

// Format currency based on code
const formatCurrency = (value, currency = 'NGN') => {
  if (value == null || value === '') return '—';
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
  });
  return formatter.format(value);
};

export default function Approval() {
  const [tabValue, setTabValue] = useState(0); // 0 = Requisitions, 1 = Approval Board
  const [submittedRequisitions, setSubmittedRequisitions] = useState([]);
  const [approvalBoard, setApprovalBoard] = useState([]);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);
  const [checkingPermissions, setCheckingPermissions] = useState(true);
  const [hasPermission, setHasPermission] = useState(false);
  const [permissions, setPermissions] = useState({
    view_approval_board: false,
    add_approval_board_member: false,
    delete_approval_board_member: false,
  });

  // Modal-specific alerts
  const [modalAlert, setModalAlert] = useState(null);

  // Pagination
  const [requisitionPage, setRequisitionPage] = useState(1);
  const [requisitionTotalPages, setRequisitionTotalPages] = useState(1);
  const [boardPage, setBoardPage] = useState(1);
  const [boardTotalPages, setBoardTotalPages] = useState(1);

  // Search
  const [requisitionSearch, setRequisitionSearch] = useState('');
  const [boardSearch, setBoardSearch] = useState('');
  const { searchTerm } = useSearch();
  const itemsPerPage = 10;

  // Modal states
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [addUserModalOpen, setAddUserModalOpen] = useState(false);
  const [deleteUserModalOpen, setDeleteUserModalOpen] = useState(false);

  // Selected items
  const [selectedRequisition, setSelectedRequisition] = useState(null);
  const [selectedBoardMember, setSelectedBoardMember] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Form states
  const [newUser, setNewUser] = useState(null);
  const [availableUsers, setAvailableUsers] = useState([]);

  // Tutorial state
  const [showTutorial, setShowTutorial] = useState(true);

  const prevSearchTermRef = useRef(searchTerm);
  const prevRequisitionSearchRef = useRef(requisitionSearch);
  const prevBoardSearchRef = useRef(boardSearch);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedSetRequisitionSearch = useCallback(
    debounce((value) => {
      setRequisitionSearch(value);
      setRequisitionPage(1);
    }, 500),
    []
  );

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedSetBoardSearch = useCallback(
    debounce((value) => {
      setBoardSearch(value);
      setBoardPage(1);
    }, 500),
    []
  );

  // Fetch submitted requisitions
  const fetchSubmittedRequisitions = useCallback(async () => {
    try {
      setLoading(true);
      const searchValue = requisitionSearch || searchTerm;
      const res = await API.get('procurement/requisitions/', {
        params: {
          search: searchValue,
          status: 'submitted',
          page: requisitionPage,
          page_size: itemsPerPage,
        },
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
      });
      setSubmittedRequisitions(res.data.results || []);
      setRequisitionTotalPages(Math.ceil(res.data.count / itemsPerPage));
      setAlert(null);
    } catch (err) {
      console.error('Error fetching submitted requisitions:', err.response?.data || err.message);
      setAlert('❌ Failed to fetch submitted requisitions: ' + (err.response?.data?.detail || err.message));
      setSubmittedRequisitions([]);
      setRequisitionTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [requisitionSearch, searchTerm, requisitionPage, itemsPerPage]);

  // Fetch approval board
  const fetchApprovalBoard = useCallback(async () => {
    try {
      setLoading(true);
      const searchValue = boardSearch || searchTerm;
      const res = await API.get('procurement/approval-board/', {
        params: {
          search: searchValue,
          page: boardPage,
          page_size: itemsPerPage,
          is_active: true,
        },
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
      });
      setApprovalBoard(res.data.results || []);
      setBoardTotalPages(Math.ceil(res.data.count / itemsPerPage));
      setAlert(null);
    } catch (err) {
      console.error('Error fetching approval board:', err.response?.data || err.message);
      setAlert('❌ Failed to fetch approval board: ' + (err.response?.data?.detail || err.message));
      setApprovalBoard([]);
      setBoardTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [boardSearch, searchTerm, boardPage, itemsPerPage]);

  // Fetch available users for adding to approval board
  const fetchAvailableUsers = useCallback(async () => {
    try {
      setModalAlert(null);
      const res = await API.get('auth/users/', {
        params: { page_size: 1000 },
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
      });

      // Extract user IDs from approval board
      const boardUserIds = approvalBoard.map((member) => member.user?.id || member.user).filter(Boolean);
      const available = res.data.results.filter((user) => !boardUserIds.includes(user.id));
      setAvailableUsers(available || []);
    } catch (err) {
      console.error('Error fetching users:', err);
      const errorMsg = '❌ Failed to load users for approval board.';
      setModalAlert(errorMsg);
    }
  }, [approvalBoard]);

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
        const pageResponse = await API.get('/auth/permissions/page/approval_board/');
        setHasPermission(pageResponse.data.allowed || false);

        if (!pageResponse.data.allowed) {
          setAlert(`⚠️ You do not have permission to view this page: ${pageResponse.data.reason || 'No reason provided'}`);
        } else {
          // Check action permissions
          const actions = ['view_approval_board', 'add_approval_board_member', 'delete_approval_board_member'];
          const actionPerms = {};
          for (const action of actions) {
            const actionResponse = await API.get(`/auth/permissions/action/${action}/`);
            actionPerms[action] = actionResponse.data.allowed || false;
          }
          setPermissions(actionPerms);

          // Fetch data
          fetchSubmittedRequisitions();
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
  }, [fetchSubmittedRequisitions, fetchApprovalBoard]);

  // Handle search and pagination for requisitions
  useEffect(() => {
    if (hasPermission && tabValue === 0) {
      if (requisitionSearch !== prevRequisitionSearchRef.current || searchTerm !== prevSearchTermRef.current) {
        setRequisitionPage(1);
        prevRequisitionSearchRef.current = requisitionSearch;
        prevSearchTermRef.current = searchTerm;
      }
      fetchSubmittedRequisitions();
    }
  }, [requisitionSearch, searchTerm, requisitionPage, hasPermission, fetchSubmittedRequisitions, tabValue]);

  // Handle search and pagination for approval board
  useEffect(() => {
    if (hasPermission && tabValue === 1) {
      if (boardSearch !== prevBoardSearchRef.current || searchTerm !== prevSearchTermRef.current) {
        setBoardPage(1);
        prevBoardSearchRef.current = boardSearch;
        prevSearchTermRef.current = searchTerm;
      }
      fetchApprovalBoard();
    }
  }, [boardSearch, searchTerm, boardPage, hasPermission, fetchApprovalBoard, tabValue]);

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  // Open approve modal
  const handleOpenApproveModal = (requisition) => {
    setSelectedRequisition(requisition);
    setApproveModalOpen(true);
    setModalAlert(null);
  };

  // Open reject modal
  const handleOpenRejectModal = (requisition) => {
    setSelectedRequisition(requisition);
    setRejectionReason('');
    setRejectModalOpen(true);
    setModalAlert(null);
  };

  // Open add user modal
  const handleOpenAddUserModal = () => {
    if (!permissions.add_approval_board_member) {
      setAlert('⚠️ You do not have permission to add approval board members.');
      return;
    }
    fetchAvailableUsers();
    setNewUser(null);
    setAddUserModalOpen(true);
    setModalAlert(null);
  };

  // Open delete user modal
  const handleOpenDeleteUserModal = (member) => {
    if (!permissions.delete_approval_board_member) {
      setAlert('⚠️ You do not have permission to remove approval board members.');
      return;
    }
    setSelectedBoardMember(member);
    setDeleteUserModalOpen(true);
    setModalAlert(null);
  };

  // Approve requisition
  const handleApprove = async () => {
    if (!selectedRequisition) return;

    try {
      setLoading(true);
      setModalAlert(null);

      await API.post(`procurement/requisitions/${selectedRequisition.id}/approve/`);

      setModalAlert('✅ Requisition approved successfully!');
      setApproveModalOpen(false);
      fetchSubmittedRequisitions();
      fetchApprovalBoard();
    } catch (err) {
      let errorMsg = '❌ Failed to approve requisition.';
      if (err.response?.data) {
        errorMsg = err.response.data.detail || JSON.stringify(err.response.data);
      } else {
        errorMsg = err.message || '❌ Network error.';
      }
      setModalAlert(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Reject requisition
  const handleReject = async () => {
    if (!selectedRequisition || !rejectionReason.trim()) {
      setModalAlert('⚠️ Please provide a rejection reason.');
      return;
    }

    try {
      setLoading(true);
      setModalAlert(null);

      await API.post(`procurement/requisitions/${selectedRequisition.id}/reject/`);

      setModalAlert('✅ Requisition rejected successfully!');
      setRejectModalOpen(false);
      setRejectionReason('');
      fetchSubmittedRequisitions();
    } catch (err) {
      let errorMsg = '❌ Failed to reject requisition.';
      if (err.response?.data) {
        errorMsg = err.response.data.detail || JSON.stringify(err.response.data);
      } else {
        errorMsg = err.message || '❌ Network error.';
      }
      setModalAlert(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Add user to approval board
  const handleAddUser = async () => {
    if (!newUser || !permissions.add_approval_board_member) {
      setModalAlert('⚠️ Please select a user to add.');
      return;
    }

    try {
      setLoading(true);
      setModalAlert(null);

      await API.post('procurement/approval-board/', {
        user: newUser.id,
        can_approve_requisitions: true,
        can_approve_purchase_orders: false,
      });

      setModalAlert('✅ User added to approval board successfully!');
      setAddUserModalOpen(false);
      fetchApprovalBoard();
      setNewUser(null);
    } catch (err) {
      let errorMsg = '❌ Failed to add user to approval board.';
      if (err.response?.data) {
        errorMsg = err.response.data.detail || JSON.stringify(err.response.data);
      } else {
        errorMsg = err.message || '❌ Network error.';
      }
      setModalAlert(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Remove user from approval board
  const handleRemoveUser = async () => {
    if (!selectedBoardMember || !permissions.delete_approval_board_member) {
      setModalAlert('⚠️ Invalid selection.');
      return;
    }

    try {
      setLoading(true);
      setModalAlert(null);

      await API.patch(`procurement/approval-board/${selectedBoardMember.id}/`, {
        is_active: false,
      });

      setModalAlert('✅ User removed from approval board successfully!');
      setDeleteUserModalOpen(false);
      fetchApprovalBoard();
    } catch (err) {
      let errorMsg = '❌ Failed to remove user from approval board.';
      if (err.response?.data) {
        errorMsg = err.response.data.detail || JSON.stringify(err.response.data);
      } else {
        errorMsg = err.message || '❌ Network error.';
      }
      setModalAlert(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Calculate total cost for requisition
  const calculateTotalCost = (items, currency = 'NGN') => {
    const total = items.reduce((sum, item) => sum + (item.quantity * (item.unit_cost || 0)), 0);
    return formatCurrency(total, currency);
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
          <Typography variant="h5">Approval Management</Typography>
          {tabValue === 1 && permissions.add_approval_board_member && (
            <Button
              variant="contained"
              startIcon={<PersonAddIcon />}
              onClick={handleOpenAddUserModal}
              disabled={loading}
            >
              Add Approval User
            </Button>
          )}
        </Box>

        {/* Tutorial Section */}
        <Accordion expanded={showTutorial} onChange={() => setShowTutorial(!showTutorial)} sx={{ mb: 4 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <HowToRegIcon sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h6">Approval Management</Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Typography paragraph>
              This page allows authorized users to approve or reject submitted requisitions and manage the approval board.
            </Typography>

            <Typography variant="subtitle1" gutterBottom>
              Key Features:
            </Typography>
            <ul>
              <li>
                <strong>Approve/Reject Requisitions:</strong> Review and take action on submitted requisitions
              </li>
              <li>
                <strong>Approval Board Management:</strong> View and manage users who can approve requisitions
              </li>
              <li>
                <strong>Admin Controls:</strong> Only administrators can add or remove approval board members
              </li>
              <li>
                <strong>Audit Trail:</strong> All approval actions are logged for compliance and tracking
              </li>
            </ul>

            <Typography variant="subtitle1" gutterBottom>
              Workflow:
            </Typography>
            <ol>
              <li>Review submitted requisitions in the table below</li>
              <li>Click "Approve" to convert to Purchase Order or "Reject" with reason</li>
              <li>Manage approval board members (Admin only)</li>
              <li>Track all approval activities in the audit logs</li>
            </ol>

            <Alert severity="info" sx={{ mt: 2 }}>
              <strong>Note:</strong> Only users in the approval board can see and approve submitted requisitions. Contact your administrator if you need approval permissions.
            </Alert>
          </AccordionDetails>
        </Accordion>

        {/* Tab Navigation */}
        <Tabs value={tabValue} onChange={handleTabChange} variant="fullWidth" sx={{ mb: 3 }}>
          <Tab icon={<AssignmentIcon />} label="Requisitions to Approve" iconPosition="start" />
          <Tab icon={<GroupIcon />} label="Approval Board" iconPosition="start" />
        </Tabs>

        {/* Tab Content */}
        {tabValue === 0 && (
          <>
            {/* Submitted Requisitions Section */}
            <Typography variant="h6" gutterBottom>
              Submitted Requisitions
            </Typography>

            <Grid container spacing={2} mb={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="body1" color="text.secondary">
                  Review and approve/reject requisitions that have been submitted for approval.
                </Typography>
              </Grid>
              <Grid item xs={12} md={6} display="flex" justifyContent="flex-end">
                <TextField
                  size="small"
                  placeholder="Search requisitions..."
                  value={requisitionSearch}
                  onChange={(e) => debouncedSetRequisitionSearch(e.target.value)}
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

            {submittedRequisitions.length > 0 ? (
              <>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Code</TableCell>
                        <TableCell>Department</TableCell>
                        <TableCell>Priority</TableCell>
                        <TableCell>Created By</TableCell>
                        <TableCell>Created</TableCell>
                        <TableCell>Total Cost</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {submittedRequisitions.map((req) => (
                        <TableRow key={req.id}>
                          <TableCell>
                            <Tooltip title="Requisition Code">
                              <strong>{req.code}</strong>
                            </Tooltip>
                          </TableCell>
                          <TableCell>{req.department}</TableCell>
                          <TableCell>
                            <Chip
                              label={req.priority.charAt(0).toUpperCase() + req.priority.slice(1)}
                              size="small"
                              color={PRIORITY_COLORS[req.priority] || 'default'}
                            />
                          </TableCell>
                          <TableCell>{req.created_by_name || req.created_by?.name || req.created_by?.email || 'System'}</TableCell>
                          <TableCell>{new Date(req.created_at).toLocaleDateString()}</TableCell>
                          <TableCell>
                            {req.items.length > 0 && (
                              <Typography variant="body2">
                                {calculateTotalCost(req.items, req.currency)}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            <Box display="flex" gap={1}>
                              <Button
                                variant="contained"
                                color="error"
                                size="small"
                                onClick={() => handleOpenRejectModal(req)}
                              >
                                Reject
                              </Button>
                              <Button
                                variant="contained"
                                color="success"
                                size="small"
                                onClick={() => handleOpenApproveModal(req)}
                              >
                                Approve
                              </Button>
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>

                {requisitionTotalPages > 1 && (
                  <Box mt={3} display="flex" justifyContent="center">
                    <Pagination
                      count={requisitionTotalPages}
                      page={requisitionPage}
                      onChange={(_, value) => setRequisitionPage(value)}
                      color="primary"
                    />
                  </Box>
                )}
              </>
            ) : (
              <Box textAlign="center" py={4}>
                <Typography variant="body1" color="text.secondary">
                  No submitted requisitions found.
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Requisitions will appear here once they are submitted for approval.
                </Typography>
              </Box>
            )}
          </>
        )}

        {tabValue === 1 && (
          <>
            {/* Approval Board Section */}
            <Typography variant="h6" gutterBottom>
              Approval Board Management
            </Typography>

            <Grid container spacing={2} mb={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="body1" color="text.secondary">
                  Users who can approve requisitions. Only administrators can modify this list.
                </Typography>
              </Grid>
              <Grid item xs={12} md={6} display="flex" justifyContent="flex-end">
                <TextField
                  size="small"
                  placeholder="Search approval board..."
                  value={boardSearch}
                  onChange={(e) => debouncedSetBoardSearch(e.target.value)}
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

            {approvalBoard.length > 0 ? (
              <>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>User</TableCell>
                        <TableCell>Email</TableCell>
                        <TableCell>Added By</TableCell>
                        <TableCell>Added</TableCell>
                        <TableCell>Permissions</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {approvalBoard.map((member) => (
                        <TableRow key={member.id}>
                          <TableCell>
                            <Box display="flex" alignItems="center">
                              <HowToRegIcon color="primary" sx={{ mr: 1 }} />
                              <strong>{member.user.name || member.user.email}</strong>
                            </Box>
                          </TableCell>
                          <TableCell>{member.user.email}</TableCell>
                          <TableCell>{member.added_by?.name || member.added_by?.email || 'System'}</TableCell>
                          <TableCell>{new Date(member.added_at).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <Chip
                              label="Requisitions"
                              size="small"
                              color="success"
                              variant="outlined"
                              sx={{ mr: 1 }}
                            />
                            {member.can_approve_purchase_orders && (
                              <Chip
                                label="Purchase Orders"
                                size="small"
                                color="info"
                                variant="outlined"
                              />
                            )}
                          </TableCell>
                          <TableCell>
                            {permissions.delete_approval_board_member && (
                              <IconButton
                                onClick={() => handleOpenDeleteUserModal(member)}
                                color="error"
                                title="Remove from approval board"
                                size="small"
                              >
                                <DeleteIcon />
                              </IconButton>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>

                {boardTotalPages > 1 && (
                  <Box mt={3} display="flex" justifyContent="center">
                    <Pagination
                      count={boardTotalPages}
                      page={boardPage}
                      onChange={(_, value) => setBoardPage(value)}
                      color="primary"
                    />
                  </Box>
                )}
              </>
            ) : (
              <Box textAlign="center" py={4}>
                <Typography variant="body1" color="text.secondary">
                  No approval board members configured.
                </Typography>
                {permissions.add_approval_board_member && (
                  <Button
                    variant="contained"
                    startIcon={<PersonAddIcon />}
                    onClick={handleOpenAddUserModal}
                    sx={{ mt: 2 }}
                    disabled={loading}
                  >
                    Add First Approval User
                  </Button>
                )}
              </Box>
            )}
          </>
        )}
      </Paper>

      {/* Approve Confirmation Modal */}
      <Dialog open={approveModalOpen} onClose={() => setApproveModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" color="success.main">
            <CheckCircleIcon sx={{ mr: 1 }} />
            Confirm Approval
          </Box>
        </DialogTitle>
        <DialogContent>
          {modalAlert && (
            <Alert
              sx={{ mb: 2 }}
              severity={modalAlert.includes('❌') ? 'error' : modalAlert.includes('⚠') ? 'warning' : 'success'}
              onClose={() => setModalAlert(null)}
            >
              {modalAlert}
            </Alert>
          )}
          <Alert severity="info">
            <AlertTitle>Are you sure you want to approve this requisition?</AlertTitle>
            <Typography variant="body2">
              <strong>Requisition Code:</strong> {selectedRequisition?.code}
              <br />
              <strong>Department:</strong> {selectedRequisition?.department}
              <br />
              <strong>Currency:</strong> {selectedRequisition?.currency === 'NGN' ? 'Nigerian Naira (₦)' : 'US Dollar ($)'}
              <br />
              <strong>Total Cost:</strong>{' '}
              {selectedRequisition?.items?.length > 0
                ? calculateTotalCost(selectedRequisition.items, selectedRequisition.currency)
                : '—'}
            </Typography>
            <br />
            <Typography variant="body2">
              Once approved, this requisition will be converted to a Purchase Order and cannot be modified.
            </Typography>
          </Alert>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setApproveModalOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="success"
            onClick={handleApprove}
            disabled={loading}
          >
            {loading ? 'Approving...' : 'Approve Requisition'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reject Confirmation Modal */}
      <Dialog open={rejectModalOpen} onClose={() => setRejectModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" color="error.main">
            <ErrorIcon sx={{ mr: 1 }} />
            Reject Requisition
          </Box>
        </DialogTitle>
        <DialogContent>
          {modalAlert && (
            <Alert
              sx={{ mb: 2 }}
              severity={modalAlert.includes('❌') ? 'error' : modalAlert.includes('⚠') ? 'warning' : 'success'}
              onClose={() => setModalAlert(null)}
            >
              {modalAlert}
            </Alert>
          )}
          <Alert severity="warning">
            <AlertTitle>Are you sure you want to reject this requisition?</AlertTitle>
            <Typography variant="body2" paragraph>
              <strong>Requisition Code:</strong> {selectedRequisition?.code}
              <br />
              <strong>Department:</strong> {selectedRequisition?.department}
            </Typography>
            <Typography variant="body2" paragraph>
              Please provide a reason for rejection. This will be recorded in the audit log and communicated to the requester.
            </Typography>
          </Alert>

          <TextField
            label="Rejection Reason *"
            multiline
            minRows={3}
            fullWidth
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="Please explain why this requisition is being rejected..."
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setRejectModalOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleReject}
            disabled={loading || !rejectionReason.trim()}
          >
            {loading ? 'Rejecting...' : 'Reject Requisition'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add User Modal */}
      <Dialog open={addUserModalOpen} onClose={() => setAddUserModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center">
            <PersonAddIcon sx={{ mr: 1, color: 'primary.main' }} />
            Add Approval Board Member
          </Box>
        </DialogTitle>
        <DialogContent>
          {modalAlert && (
            <Alert
              sx={{ mb: 2 }}
              severity={modalAlert.includes('❌') ? 'error' : modalAlert.includes('⚠') ? 'warning' : 'success'}
              onClose={() => setModalAlert(null)}
            >
              {modalAlert}
            </Alert>
          )}
          <Alert severity="info" sx={{ mb: 2 }}>
            Select a user to add to the approval board. Only administrators can perform this action.
          </Alert>

          <Autocomplete
            options={availableUsers}
            getOptionLabel={(option) => `${option.name || option.email} (${option.email})`}
            value={newUser}
            onChange={(event, newValue) => setNewUser(newValue)}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Select User *"
                required
                sx={{ minWidth: 250 }}
              />
            )}
            noOptionsText="No users available or all users are already in approval board"
          />
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setAddUserModalOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleAddUser}
            disabled={loading || !newUser}
            startIcon={loading ? <CircularProgress size={20} /> : null}
          >
            {loading ? 'Adding...' : 'Add User'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete User Modal */}
      <Dialog open={deleteUserModalOpen} onClose={() => setDeleteUserModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" color="error.main">
            <DeleteIcon sx={{ mr: 1 }} />
            Remove Approval Board Member
          </Box>
        </DialogTitle>
        <DialogContent>
          {modalAlert && (
            <Alert
              sx={{ mb: 2 }}
              severity={modalAlert.includes('❌') ? 'error' : modalAlert.includes('⚠') ? 'warning' : 'success'}
              onClose={() => setModalAlert(null)}
            >
              {modalAlert}
            </Alert>
          )}
          <Alert severity="warning">
            <AlertTitle>Are you sure you want to remove this user?</AlertTitle>
            <Typography variant="body2">
              <strong>User:</strong> {selectedBoardMember?.user?.name || selectedBoardMember?.user?.email}
              <br />
              <strong>Email:</strong> {selectedBoardMember?.user?.email}
            </Typography>
            <br />
            <Typography variant="body2">
              This user will no longer be able to approve requisitions. This action cannot be undone.
            </Typography>
          </Alert>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setDeleteUserModalOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleRemoveUser}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : <DeleteIcon />}
          >
            {loading ? 'Removing...' : 'Remove User'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}