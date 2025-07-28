import React, { useState, useEffect, useRef } from 'react';
import {
  Container,
  Typography,
  Paper,
  Box,
  TextField,
  InputAdornment,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  Pagination,
  CircularProgress,
  Alert,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ReceiptIcon from '@mui/icons-material/ReceiptLong';
import PrintIcon from '@mui/icons-material/Print';
import DownloadIcon from '@mui/icons-material/Download';
import AddIcon from '@mui/icons-material/Add';
import api from '../../api';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import { saveAs } from 'file-saver';

export default function ReceiptArchive() {
  const [receipts, setReceipts] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState(null); // ✅ FIXED: added formError
  const [form, setForm] = useState({
    reference: '',
    issued_by: '',
    date: '',
    amount: '',
  });

  const previewRef = useRef();
  const itemsPerPage = 10;

  const fetchReceipts = async () => {
    try {
      const res = await api.get('receipts/archive/');
      setReceipts(res.data);
    } catch (err) {
      console.error('❌ Error fetching receipts:', err);
      setError(err.response?.data?.detail || 'Failed to load receipts.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReceipts();
  }, []);

  const handlePreview = (receipt) => {
    setSelectedReceipt(receipt);
    setPreviewOpen(true);
  };

  const handlePdfDownload = async () => {
    const canvas = await html2canvas(previewRef.current);
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF();
    pdf.addImage(imgData, 'PNG', 10, 10, 190, 0);
    pdf.save(`${selectedReceipt.reference}.pdf`);
  };

  const handleDocxDownload = async () => {
    const doc = new Document({
      sections: [
        {
          properties: {},
          children: [
            new Paragraph({ children: [new TextRun({ text: 'Receipt', bold: true, size: 36 })] }),
            new Paragraph({ children: [new TextRun(`Reference: ${selectedReceipt.reference}`)] }),
            new Paragraph({ children: [new TextRun(`Issued By: ${selectedReceipt.issued_by}`)] }),
            new Paragraph({ children: [new TextRun(`Date: ${new Date(selectedReceipt.date).toLocaleDateString()}`)] }),
            new Paragraph({ children: [new TextRun(`Amount: ₦${parseFloat(selectedReceipt.amount).toLocaleString()}`)] }),
          ],
        },
      ],
    });
    const blob = await Packer.toBlob(doc);
    saveAs(blob, `${selectedReceipt.reference}.docx`);
  };

  const handleFormChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleCreateReceipt = async () => {
    if (!form.reference || !form.issued_by || !form.date || !form.amount) {
      setFormError('⚠ Please fill in all fields.');
      return;
    }

    try {
      setFormLoading(true);
      const payload = {
        reference: form.reference.trim(),
        issued_by: form.issued_by.trim(),
        date: form.date,
        amount: parseFloat(form.amount),
      };
      const res = await api.post('receipts/archive/', payload);
      setReceipts([res.data, ...receipts]);
      setFormOpen(false);
      setForm({ reference: '', issued_by: '', date: '', amount: '' });
      setFormError(null);
    } catch (err) {
      if (err.response?.data) {
        const data = err.response.data;
        const errorMessages = Object.entries(data)
          .map(([field, msgs]) => `${field}: ${Array.isArray(msgs) ? msgs.join(', ') : msgs}`)
          .join('\n');
        setFormError(`❌ Submission Failed:\n${errorMessages}`);
      } else {
        setFormError('❌ Something went wrong. Please try again.');
      }
    } finally {
      setFormLoading(false);
    }
  };

  const filtered = receipts.filter(
    (receipt) =>
      receipt.reference?.toLowerCase().includes(search.toLowerCase()) ||
      receipt.issued_by?.toLowerCase().includes(search.toLowerCase())
  );

  const paginated = filtered.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom>
          Receipt Archive
        </Typography>
        <Typography variant="subtitle1" sx={{ mb: 3 }}>
          Centralized records of all issued receipts
        </Typography>

        <Box display="flex" justifyContent="space-between" mb={2}>
          <TextField
            placeholder="Search receipts..."
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
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setFormOpen(true)}>
            Add Receipt
          </Button>
        </Box>

        {loading ? (
          <Box display="flex" justifyContent="center" py={5}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : (
          <>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>S/N</TableCell>
                    <TableCell>Reference</TableCell>
                    <TableCell>Issued By</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Amount (₦)</TableCell>
                    <TableCell>Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginated.map((receipt, index) => (
                    <TableRow key={receipt.id}>
                      <TableCell>{(page - 1) * itemsPerPage + index + 1}</TableCell>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={1}>
                          <ReceiptIcon fontSize="small" color="primary" />
                          {receipt.reference}
                        </Box>
                      </TableCell>
                      <TableCell>{receipt.issued_by}</TableCell>
                      <TableCell>{new Date(receipt.date).toLocaleDateString()}</TableCell>
                      <TableCell>{parseFloat(receipt.amount).toLocaleString()}</TableCell>
                      <TableCell>
                        <Button size="small" variant="outlined" onClick={() => handlePreview(receipt)}>
                          Preview
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
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
          </>
        )}
      </Paper>

      {/* Preview Modal */}
      <Dialog open={previewOpen} onClose={() => setPreviewOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Receipt Preview</DialogTitle>
        <DialogContent>
          {selectedReceipt && (
            <Box ref={previewRef} p={4} sx={{ backgroundColor: '#f9f9f9', borderRadius: 2, boxShadow: 3 }}>
              <Typography variant="h5" gutterBottom align="center">
                🧾 Official Receipt
              </Typography>
              <Box mt={2}>
                <Typography><strong>Reference:</strong> {selectedReceipt.reference}</Typography>
                <Typography><strong>Issued By:</strong> {selectedReceipt.issued_by}</Typography>
                <Typography><strong>Date:</strong> {new Date(selectedReceipt.date).toLocaleDateString()}</Typography>
                <Typography><strong>Amount:</strong> ₦{parseFloat(selectedReceipt.amount).toLocaleString()}</Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handlePdfDownload} startIcon={<PrintIcon />} variant="contained" color="primary">
            Download PDF
          </Button>
          <Button onClick={handleDocxDownload} startIcon={<DownloadIcon />} variant="outlined">
            Download DOCX
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create Receipt Modal */}
      <Dialog open={formOpen} onClose={() => setFormOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Add New Receipt</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                label="Reference"
                name="reference"
                fullWidth
                value={form.reference}
                onChange={handleFormChange}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Issued By"
                name="issued_by"
                fullWidth
                value={form.issued_by}
                onChange={handleFormChange}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Date"
                name="date"
                type="date"
                fullWidth
                InputLabelProps={{ shrink: true }}
                value={form.date}
                onChange={handleFormChange}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Amount"
                name="amount"
                type="number"
                fullWidth
                value={form.amount}
                onChange={handleFormChange}
              />
            </Grid>
          </Grid>
          {formError && <Alert severity="error" sx={{ mt: 2, whiteSpace: 'pre-wrap' }}>{formError}</Alert>}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFormOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateReceipt} disabled={formLoading}>
            Submit
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
