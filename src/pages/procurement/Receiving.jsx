// src/pages/procurement/Receiving.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Container, Paper, Typography, TextField, Button, Box, Grid, Divider, Alert,
  Table, TableHead, TableRow, TableCell, TableBody, TableContainer, Pagination,
  IconButton, Dialog, DialogTitle, DialogContent, DialogActions, CircularProgress,
  InputAdornment,
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import { debounce } from 'lodash';
import API from '../../api';
import { useSearch } from '../../context/SearchContext';

export default function Receiving() {
  const [scanCode, setScanCode] = useState('');
  const [matchResult, setMatchResult] = useState(null);
  const [file, setFile] = useState(null);
  const [goodsReceipts, setGoodsReceipts] = useState([]);
  const [submitSuccess, setSubmitSuccess] = useState(null);
  const [alert, setAlert] = useState(null);
  const [loading, setLoading] = useState(false);
  const [checkingPermissions, setCheckingPermissions] = useState(true);
  const [hasPermission, setHasPermission] = useState(false);
  const [permissions, setPermissions] = useState({
    create_goods_receipt: false,
    update_goods_receipt: false,
    delete_goods_receipt: false,
  });
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const { searchTerm } = useSearch();
  const itemsPerPage = 10;
  const prevSearchTermRef = useRef(searchTerm);
  const prevSearchRef = useRef(search);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedSetSearch = useCallback(
    debounce((value) => {
      setSearch(value);
      setPage(1);
    }, 500),
    []
  );

  const fetchGoodsReceipts = useCallback(async () => {
    try {
      setLoading(true);
      const searchValue = search || searchTerm;
      const res = await API.get('procurement/goods-receipts/', {
        params: { search: searchValue, page, page_size: itemsPerPage },
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
      });
      console.log('[GOODS RECEIPTS FETCHED]', res.data);
      setGoodsReceipts(res.data.results || []);
      setTotalPages(Math.ceil(res.data.count / itemsPerPage));
      setAlert(null);
    } catch (err) {
      console.error('Error fetching goods receipts:', err.response?.data || err.message);
      setAlert('❌ Failed to fetch goods receipts: ' + (err.response?.data?.detail || err.message));
      setGoodsReceipts([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [search, searchTerm, page, itemsPerPage]);

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
        const pageResponse = await API.get('/auth/permissions/page/goods_receipts/');
        console.log('Page permission response:', pageResponse.data);
        setHasPermission(pageResponse.data.allowed || false);
        if (!pageResponse.data.allowed) {
          setAlert(`⚠️ You do not have permission to view this page: ${pageResponse.data.reason || 'No reason provided'}`);
        } else {
          const actions = ['create_goods_receipt', 'update_goods_receipt', 'delete_goods_receipt'];
          const actionPerms = {};
          for (const action of actions) {
            const actionResponse = await API.get(`/auth/permissions/action/${action}/`);
            actionPerms[action] = actionResponse.data.allowed || false;
          }
          setPermissions(actionPerms);
          fetchGoodsReceipts();
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
  }, [fetchGoodsReceipts]);

  useEffect(() => {
    if (hasPermission && (search !== prevSearchRef.current || searchTerm !== prevSearchTermRef.current)) {
      setPage(1);
      prevSearchRef.current = search;
      prevSearchTermRef.current = searchTerm;
    }
    if (hasPermission) fetchGoodsReceipts();
  }, [search, searchTerm, page, hasPermission, fetchGoodsReceipts]);

  const handleScan = async () => {
    const code = scanCode.trim();
    if (!code) {
      setAlert('⚠️ Please enter a PO code.');
      return;
    }
    if (!/PO-\d+/.test(code)) {
      setAlert('⚠️ PO code must be in format PO-<number>.');
      return;
    }
    try {
      setLoading(true);
      setAlert(null);
      const res = await API.get(`procurement/purchase-orders/?code=${code}`);
      const match = res.data.results?.length > 0 ? res.data.results[0] : null;
      if (match) {
        const poCode = match.code;
        const grn = `GRN-${Math.floor(Math.random() * 1000000)}`;
        const invoice = `INV-${Math.floor(Math.random() * 1000000)}`;
        setMatchResult({
          po_code: poCode,
          grn_code: grn,
          invoice_code: invoice,
          match_success: true,
        });
      } else {
        setMatchResult({ match_success: false });
        setAlert(`❌ No match found for PO code: ${code}`);
      }
    } catch (err) {
      console.error('Error scanning PO:', err.response?.data || err.message);
      setMatchResult({ match_success: false });
      setAlert(`❌ Scan failed: ${err.response?.data?.detail || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e) => {
    const uploaded = e.target.files[0];
    if (uploaded) {
      setFile(uploaded);
    }
  };

  const handleSubmit = async () => {
    if (!matchResult?.match_success) {
      setAlert('⚠️ No valid match to submit.');
      return;
    }
    if (!permissions.create_goods_receipt) {
      setAlert('⚠️ You do not have permission to create goods receipts.');
      return;
    }
    try {
      setLoading(true);
      setAlert(null);
      const formData = new FormData();
      formData.append('po_code', matchResult.po_code);
      formData.append('grn_code', matchResult.grn_code);
      formData.append('invoice_code', matchResult.invoice_code);
      formData.append('match_success', true);
      if (file) formData.append('attachment', file);
      const res = await API.post('procurement/goods-receipts/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setSubmitSuccess('✅ Goods receipt successfully saved.');
      setGoodsReceipts([res.data, ...goodsReceipts]);
      setScanCode('');
      setMatchResult(null);
      setFile(null);
      fetchGoodsReceipts();
    } catch (err) {
      let errorMsg = '❌ Failed to save goods receipt.';
      if (err.response?.data) {
        errorMsg = Object.entries(err.response.data)
          .map(([field, msg]) => `${field}: ${Array.isArray(msg) ? msg.join(', ') : msg}`)
          .join('; ');
      } else {
        errorMsg = err.message || '❌ Network error.';
      }
      setSubmitSuccess(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (receipt) => {
    if (!permissions.update_goods_receipt) {
      setAlert('⚠️ You do not have permission to update goods receipts.');
      return;
    }
    setSelectedReceipt(receipt);
    setMatchResult({
      po_code: receipt.po_code,
      grn_code: receipt.grn_code,
      invoice_code: receipt.invoice_code,
      match_success: receipt.match_success,
    });
    setFile(null);
    setEditOpen(true);
  };

  const handleUpdate = async () => {
    if (!permissions.update_goods_receipt) {
      setAlert('⚠️ You do not have permission to update goods receipts.');
      return;
    }
    if (!matchResult?.po_code || !matchResult.grn_code || !matchResult.invoice_code) {
      setAlert('⚠️ All fields are required.');
      return;
    }
    try {
      setLoading(true);
      setAlert(null);
      const formData = new FormData();
      formData.append('po_code', matchResult.po_code);
      formData.append('grn_code', matchResult.grn_code);
      formData.append('invoice_code', matchResult.invoice_code);
      formData.append('match_success', matchResult.match_success);
      if (file) formData.append('attachment', file);
      const res = await API.patch(`procurement/goods-receipts/${selectedReceipt.id}/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setGoodsReceipts(goodsReceipts.map((r) => (r.id === selectedReceipt.id ? res.data : r)));
      setAlert('✅ Goods receipt updated successfully.');
      setEditOpen(false);
      setMatchResult(null);
      setFile(null);
      fetchGoodsReceipts();
    } catch (err) {
      let errorMsg = '❌ Failed to update goods receipt.';
      if (err.response?.data) {
        errorMsg = Object.entries(err.response.data)
          .map(([field, msg]) => `${field}: ${Array.isArray(msg) ? msg.join(', ') : msg}`)
          .join('; ');
      } else {
        errorMsg = err.message || '❌ Network error.';
      }
      setAlert(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (receipt) => {
    if (!permissions.delete_goods_receipt) {
      setAlert('⚠️ You do not have permission to delete goods receipts.');
      return;
    }
    setSelectedReceipt(receipt);
    setDeleteOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!permissions.delete_goods_receipt) {
      setAlert('⚠️ You do not have permission to delete goods receipts.');
      return;
    }
    try {
      setLoading(true);
      setAlert(null);
      await API.delete(`procurement/goods-receipts/${selectedReceipt.id}/`);
      setAlert('✅ Goods receipt deleted successfully.');
      setDeleteOpen(false);
      fetchGoodsReceipts();
    } catch (err) {
      let errorMsg = '❌ Failed to delete goods receipt.';
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
        <Typography variant="h5" gutterBottom>
          Receiving — Goods Receipt Process
        </Typography>
        <Typography sx={{ mb: 3 }} color="text.secondary">
          Scan goods to confirm delivery, attach documents, and verify records using three-way match logic.
        </Typography>

        <Grid container spacing={4}>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1" gutterBottom>
              Step 1: Scan or Enter PO Code
            </Typography>
            <TextField
              label="PO Code"
              variant="outlined"
              fullWidth
              value={scanCode}
              onChange={(e) => setScanCode(e.target.value)}
              error={scanCode === '' && alert?.includes('required')}
              helperText={scanCode === '' && alert?.includes('required') ? 'PO code is required' : ''}
            />
            <Button
              onClick={handleScan}
              variant="contained"
              sx={{ mt: 2 }}
              disabled={!hasPermission || !scanCode.trim() || loading}
            >
              {loading ? 'Scanning...' : 'Scan & Match'}
            </Button>

            {matchResult && (
              <Box mt={3}>
                {matchResult.match_success ? (
                  <Alert severity="success">
                    ✅ Match Successful — PO: <strong>{matchResult.po_code}</strong>, GRN:{' '}
                    <strong>{matchResult.grn_code}</strong>, Invoice: <strong>{matchResult.invoice_code}</strong>
                  </Alert>
                ) : (
                  <Alert severity="error">
                    ❌ No match found for PO code: <strong>{scanCode}</strong>
                  </Alert>
                )}
              </Box>
            )}
          </Grid>

          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1" gutterBottom>
              Step 2: Attach Delivery Document
            </Typography>
            <Button variant="outlined" component="label" startIcon={<UploadFileIcon />}>
              Upload File
              <input type="file" hidden accept=".pdf,.png,.jpg" onChange={handleFileUpload} />
            </Button>
            {file && (
              <Typography variant="caption" display="block" mt={1} color="text.secondary">
                Attached: {file.name}
              </Typography>
            )}
          </Grid>
        </Grid>

        <Divider sx={{ my: 4 }} />

        {matchResult?.match_success && (
          <Button
            variant="contained"
            color="primary"
            fullWidth
            onClick={editOpen ? handleUpdate : handleSubmit}
            disabled={loading || !permissions.create_goods_receipt}
          >
            {editOpen ? 'Update GRN' : 'Submit GRN to System'}
          </Button>
        )}

        {submitSuccess && (
          <Alert
            sx={{ mt: 3 }}
            severity={submitSuccess.startsWith('✅') ? 'success' : 'error'}
            onClose={() => setSubmitSuccess(null)}
          >
            {submitSuccess}
          </Alert>
        )}

        <Divider sx={{ my: 3 }} />

        <Box display="flex" justifyContent="flex-end" mb={2}>
          <TextField
            size="small"
            placeholder="Search Goods Receipts..."
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

        <Typography variant="h6" gutterBottom>Goods Receipts</Typography>
        {goodsReceipts.length > 0 ? (
          <>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>GRN Code</TableCell>
                    <TableCell>PO Code</TableCell>
                    <TableCell>Invoice Code</TableCell>
                    <TableCell>Match Success</TableCell>
                    <TableCell>Timestamp</TableCell>
                    <TableCell>Attachment</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {goodsReceipts.map((receipt) => (
                    <TableRow key={receipt.id}>
                      <TableCell>{receipt.grn_code}</TableCell>
                      <TableCell>{receipt.po_code}</TableCell>
                      <TableCell>{receipt.invoice_code}</TableCell>
                      <TableCell>{receipt.match_success ? 'Yes' : 'No'}</TableCell>
                      <TableCell>{new Date(receipt.timestamp).toLocaleDateString()}</TableCell>
                      <TableCell>
                        {receipt.attachment ? (
                          <a href={receipt.attachment} target="_blank" rel="noopener noreferrer">
                            View
                          </a>
                        ) : (
                          'None'
                        )}
                      </TableCell>
                      <TableCell>
                        <IconButton
                          onClick={() => handleEdit(receipt)}
                          disabled={!permissions.update_goods_receipt}
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          onClick={() => handleDelete(receipt)}
                          disabled={!permissions.delete_goods_receipt}
                        >
                          <DeleteIcon />
                        </IconButton>
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
          <Typography>No goods receipts found.</Typography>
        )}
      </Paper>

      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Delete Goods Receipt</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete GRN {selectedReceipt?.grn_code}? This action cannot be reversed.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleConfirmDelete}
            disabled={loading || !permissions.delete_goods_receipt}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={editOpen} onClose={() => setEditOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Edit Goods Receipt</DialogTitle>
        <DialogContent>
          <TextField
            label="PO Code"
            variant="outlined"
            fullWidth
            margin="normal"
            value={matchResult?.po_code || ''}
            onChange={(e) => setMatchResult({ ...matchResult, po_code: e.target.value })}
            error={matchResult?.po_code === '' && alert?.includes('required')}
            helperText={matchResult?.po_code === '' && alert?.includes('required') ? 'PO code is required' : ''}
          />
          <TextField
            label="GRN Code"
            variant="outlined"
            fullWidth
            margin="normal"
            value={matchResult?.grn_code || ''}
            onChange={(e) => setMatchResult({ ...matchResult, grn_code: e.target.value })}
            error={matchResult?.grn_code === '' && alert?.includes('required')}
            helperText={matchResult?.grn_code === '' && alert?.includes('required') ? 'GRN code is required' : ''}
          />
          <TextField
            label="Invoice Code"
            variant="outlined"
            fullWidth
            margin="normal"
            value={matchResult?.invoice_code || ''}
            onChange={(e) => setMatchResult({ ...matchResult, invoice_code: e.target.value })}
            error={matchResult?.invoice_code === '' && alert?.includes('required')}
            helperText={matchResult?.invoice_code === '' && alert?.includes('required') ? 'Invoice code is required' : ''}
          />
          <Button variant="outlined" component="label" startIcon={<UploadFileIcon />} sx={{ mt: 2 }}>
            Upload New File
            <input type="file" hidden accept=".pdf,.png,.jpg" onChange={handleFileUpload} />
          </Button>
          {file && (
            <Typography variant="caption" display="block" mt={1} color="text.secondary">
              Attached: {file.name}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleUpdate}
            disabled={loading || !permissions.update_goods_receipt}
          >
            Update
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}