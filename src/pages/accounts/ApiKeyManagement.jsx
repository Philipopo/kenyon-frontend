import React, { useEffect, useState } from 'react';
import {
  Container, Typography, Paper, Table, TableHead, TableRow, TableCell, TableBody,
  Button, TextField, Alert, IconButton, Tooltip, Dialog, DialogTitle, DialogContent,
  DialogActions, DialogContentText,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import API from '../../api';

export default function ApiKeyManagement() {
  const [apiKeys, setApiKeys] = useState([]);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [checkingPermissions, setCheckingPermissions] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [keyToDelete, setKeyToDelete] = useState(null);
  const [newKey, setNewKey] = useState(null);

  useEffect(() => {
    const fetchApiKeys = async () => {
      try {
        console.log('[ApiKeyManagement] Fetching API keys with token:', localStorage.getItem('accessToken'));
        const response = await API.get('/auth/api-keys/');
        setApiKeys(response.data);
        setError('');
      } catch (err) {
        setError('❌ Failed to fetch API keys: ' + (err.response?.data?.detail || err.response?.data?.error || err.message));
        console.error('[ApiKeyManagement] Fetch error:', JSON.stringify(err.response?.data || err, null, 2));
      } finally {
        setCheckingPermissions(false);
      }
    };
    fetchApiKeys();
  }, []);

  const handleGenerate = async () => {
    const payload = { name: name || '' };
    console.log('[ApiKeyManagement] Sending payload:', payload);
    try {
      const response = await API.post('/auth/api-keys/', payload);
      console.log('[ApiKeyManagement] Full response:', JSON.stringify(response, null, 2));
      if (response.data && typeof response.data.key === 'string') {
        setSuccess(`API Key generated: ${response.data.key} (can only be viewed once)`);
        setNewKey(response.data.key);
        setApiKeys(prev => [
          ...prev,
          {
            id: response.data.id,
            name: response.data.name || 'Unnamed',
            created_by_email: response.data.created_by_email,
            created_by_full_name: response.data.created_by_full_name,
            created_at: response.data.created_at,
            is_active: response.data.is_active,
            is_viewed: response.data.is_viewed,
          },
        ]);
        setName('');
      } else {
        setError('❌ Failed to generate API key: Key missing or invalid in response');
        console.error('[ApiKeyManagement] Invalid response data:', JSON.stringify(response.data, null, 2));
      }
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.response?.data?.name?.[0] || err.response?.data?.detail || err.message;
      setError('❌ Failed to generate API key: ' + errorMsg);
      console.error('[ApiKeyManagement] Generate error:', JSON.stringify(err.response?.data || err, null, 2));
    }
  };

  const handleDelete = async () => {
    if (!keyToDelete) return;
    try {
      console.log('[ApiKeyManagement] Deleting key:', keyToDelete);
      await API.delete(`/auth/api-keys/${keyToDelete}/`);
      setSuccess('API Key deleted successfully');
      setApiKeys(prev => prev.filter(key => key.id !== keyToDelete));
      setDeleteDialogOpen(false);
      setKeyToDelete(null);
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.response?.data?.detail || err.message;
      setError('❌ Failed to delete API key: ' + errorMsg);
      console.error('[ApiKeyManagement] Delete error:', JSON.stringify(err.response?.data || err, null, 2));
    }
  };

  if (checkingPermissions) {
    return <Container><Typography>Loading...</Typography></Container>;
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && (
        <Alert
          severity="success"
          sx={{ mb: 2 }}
          onClose={() => {
            setSuccess('');
            setNewKey(null);
          }}
        >
          {success}
          {newKey && (
            <TextField
              value={newKey}
              fullWidth
              sx={{ mt: 1 }}
              InputProps={{ readOnly: true }}
              helperText="Select and copy the key manually"
            />
          )}
        </Alert>
      )}
      <Typography variant="h4" gutterBottom>API Key Management</Typography>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6">Generate New API Key</Typography>
        <TextField
          label="Key Name (Optional)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          fullWidth
          sx={{ mb: 2 }}
        />
        <Button variant="contained" color="primary" onClick={handleGenerate}>
          Generate API Key
        </Button>
      </Paper>
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6">API Keys</Typography>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Created By</TableCell>
              <TableCell>Created By Email</TableCell>
              <TableCell>Created At</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {apiKeys.length > 0 ? (
              apiKeys.map((key) => (
                <TableRow key={key.id}>
                  <TableCell>{key.name || 'Unnamed'}</TableCell>
                  <TableCell>{key.created_by_full_name || 'Unknown'}</TableCell>
                  <TableCell>{key.created_by_email}</TableCell>
                  <TableCell>{new Date(key.created_at).toLocaleString()}</TableCell>
                  <TableCell>{key.is_active ? 'Active' : 'Inactive'}</TableCell>
                  <TableCell>
                    <Tooltip title="Delete Key">
                      <IconButton onClick={() => {
                        setKeyToDelete(key.id);
                        setDeleteDialogOpen(true);
                      }}>
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6}>No API keys found.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>
      <Dialog
        open={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setKeyToDelete(null);
        }}
        aria-labelledby="delete-dialog-title"
      >
        <DialogTitle id="delete-dialog-title">Confirm Delete</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this API key? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setDeleteDialogOpen(false);
            setKeyToDelete(null);
          }} color="primary">
            Cancel
          </Button>
          <Button onClick={handleDelete} color="error" autoFocus>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}