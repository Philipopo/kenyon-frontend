import React, { useState, useEffect, useCallback } from 'react';
import {
  Container, Typography, Paper, Box, TextField, InputAdornment, Table,
  TableHead, TableRow, TableCell, TableBody, TableContainer, Pagination,
  Button, Dialog, DialogTitle, DialogContent, DialogActions, Collapse,
  IconButton
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import API from '../../api'; // ✅ Use centralized API instance

export default function POApproval() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [openModal, setOpenModal] = useState(false);
  const [modalType, setModalType] = useState('');
  const [selectedPO, setSelectedPO] = useState(null);
  const [reason, setReason] = useState('');
  const [expandedRows, setExpandedRows] = useState([]);
  const [poList, setPoList] = useState([]);
  const itemsPerPage = 10;

  const fetchPOs = useCallback(async () => {
    try {
      console.log('📦 Fetching POs for approval...');
      const res = await API.get('procurement/purchase-orders/');
      setPoList(res.data);
    } catch (err) {
      console.error('❌ Error fetching purchase orders:', err);
    }
  }, []);

  useEffect(() => {
    fetchPOs();
  }, [fetchPOs]);

  const filtered = poList
    .filter(po => po.status === 'Pending')
    .filter(po => po.vendor.toLowerCase().includes(search.toLowerCase()));

  const paginated = filtered.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  const toggleRow = (id) => {
    setExpandedRows((prev) =>
      prev.includes(id) ? prev.filter(rowId => rowId !== id) : [...prev, id]
    );
  };

  const handleAction = (po, type) => {
    setSelectedPO(po);
    setModalType(type);
    setReason('');
    setOpenModal(true);
  };

  const handleConfirm = async () => {
    if (!selectedPO) return;

    const data = {
      status: modalType === 'reject' ? 'Rejected' : modalType === 'counter' ? 'Counter' : 'Approved',
      ...(modalType !== 'approve' && { notes: reason })
    };

    try {
      await API.patch(`procurement/purchase-orders/${selectedPO.id}/`, data);
      setOpenModal(false);
      fetchPOs(); // Refresh list
    } catch (err) {
      console.error('❌ Error updating PO:', err);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom>
          Purchase Order Approvals
        </Typography>
        <Typography variant="subtitle1" sx={{ mb: 3 }}>
          Only visible to Super Admin or CEO
        </Typography>

        <Box display="flex" justifyContent="flex-end" mb={2}>
          <TextField
            placeholder="Search by vendor..."
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
        </Box>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell />
                <TableCell>S/N</TableCell>
                <TableCell>Vendor</TableCell>
                <TableCell>Amount</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginated.length > 0 ? (
                paginated.map((po, index) => (
                  <React.Fragment key={po.id}>
                    <TableRow>
                      <TableCell>
                        <IconButton size="small" onClick={() => toggleRow(po.id)}>
                          {expandedRows.includes(po.id) ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                        </IconButton>
                      </TableCell>
                      <TableCell>{(page - 1) * itemsPerPage + index + 1}</TableCell>
                      <TableCell>{po.vendor}</TableCell>
                      <TableCell>₦{parseFloat(po.amount).toLocaleString()}</TableCell>
                      <TableCell>{new Date(po.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>{po.status}</TableCell>
                      <TableCell align="center">
                        <Button variant="contained" size="small" color="success" sx={{ mr: 1 }} onClick={() => handleAction(po, 'approve')}>
                          Approve
                        </Button>
                        <Button variant="outlined" size="small" color="error" sx={{ mr: 1 }} onClick={() => handleAction(po, 'reject')}>
                          Reject
                        </Button>
                        <Button variant="outlined" size="small" color="warning" onClick={() => handleAction(po, 'counter')}>
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

        <Box display="flex" justifyContent="center" mt={3}>
          <Pagination
            count={Math.ceil(filtered.length / itemsPerPage)}
            page={page}
            onChange={(_, value) => setPage(value)}
            color="primary"
          />
        </Box>
      </Paper>

      <Dialog open={openModal} onClose={() => setOpenModal(false)} fullWidth maxWidth="sm">
        <DialogTitle>
          {modalType === 'reject' ? 'Reject Purchase Order' :
            modalType === 'counter' ? 'Counter Purchase Order' : 'Approve Purchase Order'}
        </DialogTitle>
        <DialogContent>
          <Typography mb={2}>PO ID: {selectedPO?.id}</Typography>
          {(modalType !== 'approve') && (
            <TextField
              multiline
              rows={4}
              label="Enter reason"
              fullWidth
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenModal(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleConfirm}>
            Submit
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
