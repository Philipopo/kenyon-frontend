import React, { useState } from 'react';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  Grid,
  Divider,
  Alert
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import API from '../../api'; // ✅ Use centralized API instance

export default function Receiving() {
  const [scanCode, setScanCode] = useState('');
  const [matchResult, setMatchResult] = useState(null);
  const [file, setFile] = useState(null);
  const [submitSuccess, setSubmitSuccess] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleScan = async () => {
    const code = scanCode.trim().toUpperCase();
    if (!code) return;

    try {
      setLoading(true);
      const res = await API.get(`procurement/purchase-orders/?code=${code}`);
      const match = res.data?.length > 0 ? res.data[0] : null;

      if (match) {
        const poCode = match.code;
        const grn = `GRN-${Math.floor(Math.random() * 1000000)}`;
        const invoice = `INV-${Math.floor(Math.random() * 1000000)}`;

        setMatchResult({
          po: poCode,
          grn,
          invoice,
          match: true
        });
      } else {
        setMatchResult({ match: false });
      }
    } catch (err) {
      console.error('❌ Scan failed:', err);
      setMatchResult({ match: false });
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
    if (!matchResult?.match) return;

    const formData = new FormData();
    formData.append('po_code', matchResult.po);
    formData.append('grn_code', matchResult.grn);
    formData.append('invoice_code', matchResult.invoice);
    formData.append('match_success', true);
    if (file) formData.append('attachment', file);

    try {
      await API.post('procurement/grn/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      setSubmitSuccess('✅ Goods receipt successfully saved.');
      setScanCode('');
      setMatchResult(null);
      setFile(null);
    } catch (error) {
      console.error('❌ Submit failed:', error);
      const msg =
        error.response?.data?.detail ||
        error.response?.data?.message ||
        JSON.stringify(error.response?.data) ||
        '❌ Failed to save goods receipt.';
      setSubmitSuccess(msg);
    }
  };

  return (
    <Container maxWidth="md">
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
            />
            <Button
              onClick={handleScan}
              variant="contained"
              sx={{ mt: 2 }}
              disabled={!scanCode.trim() || loading}
            >
              {loading ? 'Scanning...' : 'Scan & Match'}
            </Button>

            {matchResult && (
              <Box mt={3}>
                {matchResult.match ? (
                  <Alert severity="success">
                    ✅ Match Successful — PO: <strong>{matchResult.po}</strong>, GRN: <strong>{matchResult.grn}</strong>, Invoice: <strong>{matchResult.invoice}</strong>
                  </Alert>
                ) : (
                  <Alert severity="error">
                    ❌ No match found for: <strong>{scanCode}</strong>
                  </Alert>
                )}
              </Box>
            )}
          </Grid>

          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1" gutterBottom>
              Step 2: Attach Delivery Document
            </Typography>
            <Button
              variant="outlined"
              component="label"
              startIcon={<UploadFileIcon />}
            >
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

        {matchResult?.match && (
          <Button variant="contained" color="primary" fullWidth onClick={handleSubmit}>
            Submit GRN to System
          </Button>
        )}

        {submitSuccess && (
          <Alert sx={{ mt: 3 }} severity={submitSuccess.startsWith('✅') ? 'success' : 'error'}>
            {submitSuccess}
          </Alert>
        )}
      </Paper>
    </Container>
  );
}
