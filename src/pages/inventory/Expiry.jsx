import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Container, Typography, Paper, Table, TableHead, TableBody, TableRow, TableCell,
  Chip, TextField, InputAdornment, Pagination, Box, Alert, Grid, Accordion, AccordionSummary, AccordionDetails,
  LinearProgress
} from '@mui/material';
import {
  Search as SearchIcon,
  Info as InfoIcon,
  ExpandMore as ExpandMoreIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  LocalPharmacy as LocalPharmacyIcon,
  CalendarToday as CalendarTodayIcon,
  BatchPrediction as BatchPredictionIcon,
  TrendingDown as TrendingDownIcon
} from '@mui/icons-material';
import { format, differenceInDays } from 'date-fns';
import { debounce } from 'lodash';
import API from '../../api';
import { useSearch } from '../../context/SearchContext';

export default function ExpiryTracking() {
  const [items, setItems] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [localSearch, setLocalSearch] = useState('');
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [checkingPermissions, setCheckingPermissions] = useState(true);
  const [hasPermission, setHasPermission] = useState(false);
  const [loading, setLoading] = useState(false);
  const { searchTerm } = useSearch();
  const itemsPerPage = 10;
  const prevSearchTermRef = useRef(searchTerm);
  const prevLocalSearchRef = useRef(localSearch);

  // Debounced local search handler
  const debouncedSetLocalSearch = useCallback(
    (value) => {
      const debounced = debounce(() => {
        setLocalSearch(value);
        setPage(1);
      }, 500);
      debounced();
    },
    []
  );

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const search = localSearch || searchTerm;
      const res = await API.get('inventory/items/', {
        params: { 
          search, 
          page, 
          page_size: itemsPerPage,
          expired_only: true
        },
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
      });
      setItems(res.data.results || []);
      setTotalPages(Math.ceil(res.data.count / itemsPerPage));
      setError('');
    } catch (err) {
      console.error('Error fetching expired items:', err.response?.data || err.message);
      setError('❌ Failed to fetch expired items: ' + (err.response?.data?.detail || err.message));
      setItems([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, localSearch, page, itemsPerPage]);

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
        
        const pageResponse = await API.get('/auth/permissions/page/expired_items/');
        
        setHasPermission(pageResponse.data.allowed || false);
        
        if (!pageResponse.data.allowed) {
          setError(`⚠️ You do not have permission to view this page: ${pageResponse.data.reason || 'No reason provided'}`);
        } else {
          fetchItems();
        }
      } catch (err) {
        console.error('Error checking permissions:', err.response?.data || err.message);
        setError(`⚠️ Failed to check permissions: ${err.response?.data?.detail || err.message}`);
        setHasPermission(false);
      } finally {
        setCheckingPermissions(false);
      }
    };
    checkPermissions();
  }, [fetchItems]);

  useEffect(() => {
    if (hasPermission) {
      if (searchTerm !== prevSearchTermRef.current || localSearch !== prevLocalSearchRef.current) {
        setPage(1);
        prevSearchTermRef.current = searchTerm;
        prevLocalSearchRef.current = localSearch;
      }
      fetchItems();
    }
  }, [searchTerm, localSearch, page, hasPermission, fetchItems]);

  const getExpiryStatus = (dateStr) => {
    const today = new Date();
    const expiry = new Date(dateStr);
    const daysLeft = differenceInDays(expiry, today);
    
    if (daysLeft < 0) {
      return { label: 'Expired', color: 'error', icon: <WarningIcon />, severity: 'critical' };
    } else if (daysLeft === 0) {
      return { label: 'Expiring Today', color: 'warning', icon: <CalendarTodayIcon />, severity: 'warning' };
    } else if (daysLeft <= 7) {
      return { label: `Expiring in ${daysLeft} days`, color: 'warning', icon: <TrendingDownIcon />, severity: 'warning' };
    } else {
      return { label: `Valid for ${daysLeft} days`, color: 'success', icon: <CheckCircleIcon />, severity: 'good' };
    }
  };

  if (checkingPermissions) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" gutterBottom>
            Loading permissions...
          </Typography>
          <LinearProgress sx={{ mt: 2, maxWidth: 300, mx: 'auto' }} />
        </Paper>
      </Container>
    );
  }

  if (!hasPermission) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
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
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <LocalPharmacyIcon sx={{ fontSize: 36, mr: 2, color: 'primary.main' }} />
        <Box>
          <Typography variant="h4" gutterBottom>
            Expiry Tracking Dashboard
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Monitor and manage items approaching or past their expiry dates
          </Typography>
        </Box>
      </Box>

      {/* Tutorial Accordion */}
      <Accordion sx={{ mb: 3, borderRadius: 2 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <InfoIcon sx={{ mr: 1, color: 'info.main' }} />
            <Typography variant="h6">Expiry Tracking Tutorial & Best Practices</Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Typography variant="body1" paragraph>
            <strong>Welcome to the Expiry Tracking System! 🕒</strong> This critical module helps you prevent losses from expired inventory and ensure product safety compliance.
          </Typography>

          <Typography variant="h6" gutterBottom>Why Track Expiry Dates?</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <ul>
                <li><strong>Prevent Financial Loss:</strong> Identify expiring items before they become worthless</li>
                <li><strong>Ensure Safety Compliance:</strong> Maintain regulatory standards for perishable goods</li>
                <li><strong>Optimize Stock Rotation:</strong> Implement FIFO (First-In-First-Out) inventory practices</li>
                <li><strong>Reduce Waste:</strong> Minimize disposal costs and environmental impact</li>
              </ul>
            </Grid>
            <Grid item xs={12} md={6}>
              <ul>
                <li><strong>Improve Customer Trust:</strong> Deliver fresh, safe products consistently</li>
                <li><strong>Automated Alerts:</strong> Get notified about items expiring within 7 days</li>
                <li><strong>Batch Recall:</strong> Quickly initiate recalls for compromised batches</li>
                <li><strong>Audit Ready:</strong> Maintain complete expiry records for inspections</li>
              </ul>
            </Grid>
          </Grid>

          <Alert severity="info" sx={{ mt: 2 }}>
            <strong>Pro Tip:</strong> Always scan batch numbers during receiving to automatically track expiry dates. 
            Items with expiry dates within 7 days are highlighted in <Chip label="warning" color="warning" size="small" /> 
            and expired items in <Chip label="critical" color="error" size="small" />.
          </Alert>
        </AccordionDetails>
      </Accordion>

      {/* Search and Stats */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h6">
            {items.length} Expired/Expiring Items
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Items past or approaching expiry date
          </Typography>
        </Box>
        <TextField
          size="small"
          placeholder="Search by part number or item name..."
          value={localSearch}
          onChange={(e) => debouncedSetLocalSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ width: { xs: '100%', sm: 300 } }}
        />
      </Box>

      {/* Loading State */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <LinearProgress sx={{ width: '100%', maxWidth: 400 }} />
        </Box>
      )}

      {/* Items Table - READ ONLY */}
      <Paper elevation={3} sx={{ p: 3, overflowX: 'auto', borderRadius: 2 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell><strong>Part Number</strong></TableCell>
              <TableCell><strong>Item Name</strong></TableCell>
              <TableCell><strong>Batch</strong></TableCell>
              <TableCell><strong>Expiry Date</strong></TableCell>
              <TableCell><strong>Status</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.length > 0 ? (
              items.map((item) => {
                const status = getExpiryStatus(item.expiry_date);
                const isExpired = status.severity === 'critical';
                const isExpiringSoon = status.severity === 'warning';
                
                return (
                  <TableRow 
                    key={item.id} 
                    sx={{ 
                      backgroundColor: isExpired ? 'error.light' : isExpiringSoon ? 'warning.light' : 'inherit',
                      '&:hover': { backgroundColor: isExpired ? 'error.lighter' : isExpiringSoon ? 'warning.lighter' : 'action.hover' }
                    }}
                  >
                    <TableCell>{item.part_number || '—'}</TableCell>
                    <TableCell>{item.name || '—'}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <BatchPredictionIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                        {item.batch || '—'}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CalendarTodayIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                        {format(new Date(item.expiry_date), 'dd MMM yyyy')}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        icon={status.icon}
                        label={status.label} 
                        color={status.color} 
                        size="small" 
                        sx={{ fontWeight: 600 }}
                      />
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={5} sx={{ textAlign: 'center', py: 4 }}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                    <CheckCircleIcon sx={{ fontSize: 40, color: 'success.main' }} />
                    <Typography variant="h6" color="text.secondary">
                      No expired or expiring items found
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      All your inventory is within safe expiry dates
                    </Typography>
                  </Box>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {items.length > 0 && (
          <Box mt={3} display="flex" justifyContent="center">
            <Pagination
              count={totalPages}
              page={page}
              onChange={(_, value) => setPage(value)}
              color="primary"
              size="medium"
            />
          </Box>
        )}
      </Paper>
    </Container>
  );
}