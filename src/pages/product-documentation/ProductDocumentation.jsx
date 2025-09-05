// src/pages/product-documentation/ProductDocumentation.jsx
import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Paper, Button, Alert, Box
} from '@mui/material';
import { Link } from 'react-router-dom';
import API from '../../api';

export default function ProductDocumentation() {
  const [hasPermission, setHasPermission] = useState(false);
  const [checkingPermissions, setCheckingPermissions] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const checkPermissions = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        if (!token) {
          setError('⚠️ No authentication token found. Please log in.');
          setHasPermission(false);
          setCheckingPermissions(false);
          return;
        }
        const pageResponse = await API.get('/auth/permissions/page/product_documentation/');
        setHasPermission(pageResponse.data.allowed || false);
        if (!pageResponse.data.allowed) {
          setError(`⚠️ You do not have permission to view this page: ${pageResponse.data.reason || 'No reason provided'}`);
        }
      } catch (err) {
        setError(`⚠️ Failed to check permissions: ${err.response?.data?.detail || err.message}`);
        setHasPermission(false);
      } finally {
        setCheckingPermissions(false);
      }
    };
    checkPermissions();
  }, []);

  if (checkingPermissions) {
    return (
      <Container>
        <Typography variant="h6" sx={{ mt: 4 }}>
          Loading permissions...
        </Typography>
      </Container>
    );
  }

  if (!hasPermission) {
    return (
      <Container>
        <Alert severity="error" sx={{ mt: 4 }} onClose={() => setError('')}>
          {error || '⚠️ You do not have permission to view this page.'}
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      <Typography variant="h4" sx={{ mb: 3 }}>
        Product Documentation
      </Typography>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Overview
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            component={Link}
            to="/dashboard/product-documentation/inflow"
          >
            View Product Inflow
          </Button>
          <Button
            variant="contained"
            component={Link}
            to="/dashboard/product-documentation/outflow"
          >
            View Product Outflow
          </Button>
        </Box>
      </Paper>
    </Container>
  );
}