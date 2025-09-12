// src/pages/procurement/Approvals.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Container, Typography, Paper, Box, TextField, InputAdornment, Table,
  TableHead, TableRow, TableCell, TableBody, TableContainer, Pagination,
  Button, Dialog, DialogTitle, DialogContent, DialogActions, Collapse,
  IconButton, Alert, CircularProgress,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import { debounce } from 'lodash';
import API from '../../api';
import { useSearch } from '../../context/SearchContext';

export default function POApproval() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [openModal, setOpenModal] = useState(false);
  const [modalType, setModalType] = useState('');
  const [selectedPO, setSelectedPO] = useState(null);
  const [reason, setReason] = useState('');
  const [expandedRows, setExpandedRows] = useState([]);
  const [poList, setPoList] = useState([]);
  const [alert, setAlert] = useState(null);
  const [checkingPermissions, setCheckingPermissions] = useState(true);
  const [hasPermission, setHasPermission] = useState(false);
  const [actionPermissions, setActionPermissions] = useState({
    approve_purchase_order: false,
    reject_purchase_order: false,
    counter_purchase_order: false,
  });
  const { searchTerm } = useSearch();
  const itemsPerPage = 10;
  const prevSearchTermRef = useRef(searchTerm);
  const prevSearchRef = useRef(search);

  const debouncedSetSearch = useCallback(
    debounce((value) => {
      setSearch(value);
      setPage(1);
    }, 500),
    []
  );

  const fetchPOs = useCallback(async () => {
    try {
      setAlert(null);
      console.log('📦 Fetching POs for approval...');
      const searchValue = search || searchTerm;
      const res = await API.get('procurement/purchase-orders/', {
        params: { search: searchValue, page, page_size: itemsPerPage, status: 'Pending' },
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
      });
      console.log('[APPROVALS FETCHED]', res.data);
      setPoList(res.data.results || []);
      setTotalPages(Math.ceil(res.data.count / itemsPerPage));
    } catch (err) {
      console.error('Error fetching purchase orders:', err.response?.data || err.message);
      setAlert(`❌ Failed to fetch purchase orders: ${err.response?.data?.detail || err.message}`);
      setPoList([]);
      setTotalPages(1);
    }
  }, [search, searchTerm, page]);

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
        const pageResponse = await API.get('/auth/permissions/page/purchase_orders/');
        console.log('Page permission response:', pageResponse.data);
        setHasPermission(pageResponse.data.allowed || false);
        if (!pageResponse.data.allowed) {
          setAlert(`⚠️ You do not have permission to view this page: ${pageResponse.data.reason || 'No reason provided'}`);
          setCheckingPermissions(false);
          return;
        }
        const actions = ['approve_purchase_order', 'reject_purchase_order', 'counter_purchase_order'];
        const actionPerms = {};
        for (const action of actions) {
          try {
            const actionResponse = await API.get(`/auth/permissions/action/${action}/`);
            actionPerms[action] = actionResponse.data.allowed || false;
          } catch (err) {
            console.error(`Error checking ${action} permission:`, err.response?.data || err.message);
            actionPerms[action] = false;
          }
        }
        setActionPermissions(actionPerms);
        fetchPOs();
      } catch (err) {
        console.error('Error checking permissions:', err.response?.data || err.message);
        setAlert(`⚠️ Failed to check permissions: ${err.response?.data?.detail || err.message}`);
        setHasPermission(false);
      } finally {
        setCheckingPermissions(false);
      }
    };
    checkPermissions();
  }, [fetchPOs]);

  useEffect(() => {
    if (hasPermission && (search !== prevSearchRef.current || searchTerm !== prevSearchTermRef.current)) {
      setPage(1);
      prevSearchRef.current = search;
      prevSearchTermRef.current = searchTerm;
    }
    if (hasPermission) fetchPOs();
  }, [search, searchTerm, page, hasPermission, fetchPOs]);

  const toggleRow = (id) => {
    setExpandedRows((prev) =>
      prev.includes(id) ? prev.filter((rowId) => rowId !== id) : [...prev, id]
    );
  };

  const handleAction = (po, type) => {
    const actionMap = {
      approve: 'approve_purchase_order',
      reject: 'reject_purchase_order',
      counter: 'counter_purchase_order',
    };
    const action = actionMap[type];
    if (!actionPermissions[action]) {
      setAlert(`⚠️ You do not have permission to ${type} purchase orders.`);
      return;
    }
    setSelectedPO(po);
    setModalType(type);
    setReason('');
    setOpenModal(true);
  };

  const handleConfirm = async () => {
    if (!selectedPO) return;
    const actionMap = {
      approve: 'approve_purchase_order',
      reject: 'reject_purchase_order',
      counter: 'counter_purchase_order',
    };
    const action = actionMap[modalType];
    if (!actionPermissions[action]) {
      setAlert(`⚠️ You do not have permission to ${modalType} purchase orders.`);
      setOpenModal(false);
      return;
    }
    const data = {
      status: modalType === 'reject' ? 'Rejected' : modalType === 'counter' ? 'Counter' : 'Approved',
      ...(modalType !== 'approve' && { notes: reason }),
    };
    try {
      await API.patch(`procurement/purchase-orders/${selectedPO.id}/`, data);
      setAlert(`✅ Purchase order ${modalType}d successfully.`);
      setOpenModal(false);
      setSelectedPO(null);
      setReason('');
      fetchPOs();
    } catch (err) {
      console.error(`Error updating PO:`, err.response?.data || err.message);
      let errorMsg = `❌ Failed to ${modalType} purchase order.`;
      if (err.response?.data) {
        if (typeof err.response.data === 'object' && !Array.isArray(err.response.data)) {
          errorMsg = Object.entries(err.response.data)
            .map(([field, msg]) => `${field}: ${Array.isArray(msg) ? msg.join(', ') : msg}`)
            .join('; ');
        } else if (err.response.data.detail) {
          errorMsg = err.response.data.detail;
        } else {
          errorMsg = JSON.stringify(err.response.data);
        }
      } else {
        errorMsg = err.message || `❌ Failed to ${modalType} purchase order: Network error.`;
      }
      setAlert(errorMsg);
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
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom>
          Purchase Order Approvals
        </Typography>
        <Typography variant="subtitle1" sx={{ mb: 3 }}>
          Review and approve pending purchase orders.
        </Typography>

        {alert && (
          <Alert
            severity={alert.includes('❌') ? 'error' : alert.includes('⚠') ? 'warning' : 'success'}
            sx={{ mb: 2 }}
            onClose={() => setAlert(null)}
          >
            {alert}
          </Alert>
        )}

        <Box display="flex" justifyContent="flex-end" mb={2}>
          <TextField
            placeholder="Search by vendor..."
            variant="outlined"
            size="small"
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
        </Box>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell />
                <TableCell>Code</TableCell>
                <TableCell>Vendor</TableCell>
                <TableCell>Amount</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {poList.length > 0 ? (
                poList.map((po) => (
                  <React.Fragment key={po.id}>
                    <TableRow>
                      <TableCell>
                        <IconButton size="small" onClick={() => toggleRow(po.id)}>
                          {expandedRows.includes(po.id) ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                        </IconButton>
                      </TableCell>
                      <TableCell>{po.code}</TableCell>
                      <TableCell>{po.vendor?.name || '—'}</TableCell>
                      <TableCell>₦{parseFloat(po.amount).toLocaleString()}</TableCell>
                      <TableCell>{new Date(po.date).toLocaleDateString()}</TableCell>
                      <TableCell>{po.status}</TableCell>
                      <TableCell align="center">
                        <Button
                          variant="contained"
                          size="small"
                          color="success"
                          sx={{ mr: 1 }}
                          onClick={() => handleAction(po, 'approve')}
                          disabled={!actionPermissions.approve_purchase_order}
                        >
                          Approve
                        </Button>
                        <Button
                          variant="outlined"
                          size="small"
                          color="error"
                          sx={{ mr: 1 }}
                          onClick={() => handleAction(po, 'reject')}
                          disabled={!actionPermissions.reject_purchase_order}
                        >
                          Reject
                        </Button>
                        <Button
                          variant="outlined"
                          size="small"
                          color="warning"
                          onClick={() => handleAction(po, 'counter')}
                          disabled={!actionPermissions.counter_purchase_order}
                        >
                          Counter
                        </Button>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell colSpan={7} sx={{ py: 0 }}>
                        <Collapse in={expandedRows.includes(po.id)} timeout="auto" unmountOnExit>
                          <Box sx={{ margin: 2 }}>
                            <Typography variant="subtitle1" gutterBottom>Items in this Purchase Order:</Typography>
                            <Typography variant="body2">Not available (API not yet linked)</Typography>
                          </Box>
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  </React.Fragment>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    No pending purchase orders found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {totalPages > 1 && (
          <Box display="flex" justifyContent="center" mt={3}>
            <Pagination
              count={totalPages}
              page={page}
              onChange={(_, value) => setPage(value)}
              color="primary"
            />
          </Box>
        )}
      </Paper>

      <Dialog open={openModal} onClose={() => setOpenModal(false)} fullWidth maxWidth="sm">
        <DialogTitle>
          {modalType === 'reject' ? 'Reject Purchase Order' :
           modalType === 'counter' ? 'Counter Purchase Order' : 'Approve Purchase Order'}
        </DialogTitle>
        <DialogContent>
          <Typography mb={2}>PO Code: {selectedPO?.code}</Typography>
          {(modalType !== 'approve') && (
            <TextField
              multiline
              rows={4}
              label="Enter reason"
              fullWidth
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={!actionPermissions[`${modalType}_purchase_order`]}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenModal(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleConfirm}
            disabled={!actionPermissions[`${modalType}_purchase_order`]}
          >
            Submit
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}