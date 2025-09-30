// src/pages/procurement/VendorManagement.jsx
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
  Collapse,
  Tooltip,
  Tabs,
  Tab,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Edit as EditIcon,
  Close as CloseIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  UploadFile as UploadFileIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  Person as PersonIcon,
  History as HistoryIcon,
  Delete as DeleteIcon,
  Description as DescriptionIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { debounce } from 'lodash';
import API from '../../api';
import { useSearch } from '../../context/SearchContext';

const STATUS_COLORS = {
  active: 'success',
  inactive: 'default',
  suspended: 'warning',
  blacklisted: 'error',
};

const STATUS_ICONS = {
  active: <CheckCircleIcon color="success" />,
  inactive: <WarningIcon color="warning" />,
  suspended: <WarningIcon color="warning" />,
  blacklisted: <ErrorIcon color="error" />,
};

// Expandable row component for vendor details
function VendorRow({ vendor, onEdit, onDelete, hasUpdatePermission, hasDeletePermission }) {
  const [open, setOpen] = useState(false);

  // Format document URL for viewing
  const getDocumentUrl = () => {
    if (!vendor.document) return null;
    // If it's already a full URL, return it
    if (vendor.document.startsWith('http')) {
      return vendor.document;
    }
    // Otherwise, construct the full URL
    const baseUrl = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';
    return `${baseUrl}${vendor.document}`;
  };

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
          <Tooltip title="Vendor Name">
            <strong>{vendor.name}</strong>
          </Tooltip>
        </TableCell>
        <TableCell>{vendor.contact_person || '-'}</TableCell>
        <TableCell>{vendor.email || '-'}</TableCell>
        <TableCell>{vendor.lead_time} days</TableCell>
        <TableCell>
          <Box display="flex" alignItems="center">
            {[1, 2, 3, 4, 5].map((star) => (
              <Box key={star} color={star <= vendor.ratings ? 'gold' : 'grey'}>
                {star <= vendor.ratings ? <StarIcon fontSize="small" /> : <StarBorderIcon fontSize="small" />}
              </Box>
            ))}
          </Box>
        </TableCell>
        <TableCell>
          <Chip
            label={vendor.status.charAt(0).toUpperCase() + vendor.status.slice(1)}
            size="small"
            color={STATUS_COLORS[vendor.status] || 'default'}
            icon={STATUS_ICONS[vendor.status]}
          />
        </TableCell>
        <TableCell>{vendor.created_by_name || vendor.created_by?.name || vendor.created_by?.email || 'System'}</TableCell>
        <TableCell>
          <IconButton
            onClick={(e) => {
              e.stopPropagation();
              onEdit(vendor);
            }}
            disabled={!hasUpdatePermission}
            color="primary"
            title="Edit vendor"
          >
            <EditIcon />
          </IconButton>
          <IconButton
            onClick={(e) => {
              e.stopPropagation();
              onDelete(vendor.id);
            }}
            disabled={!hasDeletePermission}
            color="error"
            title="Delete vendor"
          >
            <DeleteIcon />
          </IconButton>
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={10}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ margin: 2 }}>
              <Typography variant="h6" gutterBottom component="div">
                Vendor Details
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography>
                    <strong>ID:</strong> {vendor.id}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography>
                    <strong>Tax ID:</strong> {vendor.tax_id || '-'}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography>
                    <strong>Phone:</strong> {vendor.phone || '-'}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography>
                    <strong>Address:</strong> {vendor.address || '-'}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography>
                    <strong>Created:</strong> {new Date(vendor.created_at).toLocaleString()}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography>
                    <strong>Last Updated:</strong> {new Date(vendor.updated_at).toLocaleString()}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography>
                    <strong>Details:</strong> {vendor.details || '-'}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography>
                    <strong>Document:</strong>
                    {vendor.document ? (
                      <Button
                        variant="text"
                        startIcon={<DescriptionIcon />}
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(getDocumentUrl(), '_blank');
                        }}
                        sx={{ ml: 1 }}
                      >
                        View Document
                      </Button>
                    ) : (
                      <span> - </span>
                    )}
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

export default function VendorManagement() {
  const [activeTab, setActiveTab] = useState(0);

  // Vendor states
  const [vendors, setVendors] = useState([]);
  const [vendorLoading, setVendorLoading] = useState(false);

  // Audit log states
  const [auditLogs, setAuditLogs] = useState([]);

  const [alert, setAlert] = useState(null);
  const [checkingPermissions, setCheckingPermissions] = useState(true);
  const [hasPermission, setHasPermission] = useState(false);
  const [permissions, setPermissions] = useState({
    add_vendor: false,
    update_vendor: false,
    delete_vendor: false,
  });

  // Pagination
  const [vendorPage, setVendorPage] = useState(1);
  const [vendorTotalPages, setVendorTotalPages] = useState(1);
  const [auditPage, setAuditPage] = useState(1);
  const [auditTotalPages, setAuditTotalPages] = useState(1);

  // Search
  const [vendorSearch, setVendorSearch] = useState('');
  const [auditSearch, setAuditSearch] = useState('');
  const { searchTerm } = useSearch();
  const itemsPerPage = 10;

  // Modal states
  const [openModal, setOpenModal] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [modalMode, setModalMode] = useState('create'); // 'create' or 'edit'
  const [selectedVendor, setSelectedVendor] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    tax_id: '',
    details: '',
    lead_time: '',
    ratings: 3,
    status: 'active',
    document: null,
  });

  // Tutorial state
  const [showTutorial, setShowTutorial] = useState(false);

  const prevSearchTermRef = useRef(searchTerm);
  const prevVendorSearchRef = useRef(vendorSearch);
  const prevAuditSearchRef = useRef(auditSearch);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedSetVendorSearch = useCallback(
    debounce((value) => {
      setVendorSearch(value);
      setVendorPage(1);
    }, 500),
    []
  );

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedSetAuditSearch = useCallback(
    debounce((value) => {
      setAuditSearch(value);
      setAuditPage(1);
    }, 500),
    []
  );

  // Fetch vendors
  const fetchVendors = useCallback(async () => {
    try {
      setVendorLoading(true);
      const searchValue = vendorSearch || searchTerm;
      const res = await API.get('procurement/vendors/', {
        params: {
          search: searchValue,
          page: vendorPage,
          page_size: itemsPerPage,
        },
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
      });
      setVendors(res.data.results || []);
      setVendorTotalPages(Math.ceil(res.data.count / itemsPerPage));
      setAlert(null);
    } catch (err) {
      console.error('Error fetching vendors:', err.response?.data || err.message);
      setAlert('❌ Failed to fetch vendors: ' + (err.response?.data?.detail || err.message));
      setVendors([]);
      setVendorTotalPages(1);
    } finally {
      setVendorLoading(false);
    }
  }, [vendorSearch, searchTerm, vendorPage, itemsPerPage]);

  // Fetch audit logs
  const fetchAuditLogs = useCallback(async () => {
    try {
      const searchValue = auditSearch || searchTerm;
      const res = await API.get('procurement/audit-logs/', {
        params: {
          search: searchValue,
          page: auditPage,
          page_size: itemsPerPage,
        },
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
      });
      setAuditLogs(res.data.results || []);
      setAuditTotalPages(Math.ceil(res.data.count / itemsPerPage));
      setAlert(null);
    } catch (err) {
      console.error('Error fetching audit logs:', err.response?.data || err.message);
      setAlert('❌ Failed to fetch audit logs: ' + (err.response?.data?.detail || err.message));
      setAuditLogs([]);
      setAuditTotalPages(1);
    }
  }, [auditSearch, searchTerm, auditPage, itemsPerPage]);

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
        const pageResponse = await API.get('/auth/permissions/page/vendors/');
        setHasPermission(pageResponse.data.allowed || false);

        if (!pageResponse.data.allowed) {
          setAlert(`⚠️ You do not have permission to view this page: ${pageResponse.data.reason || 'No reason provided'}`);
        } else {
          // Check action permissions
          const actions = ['add_vendor', 'update_vendor', 'delete_vendor'];
          const actionPerms = {};
          for (const action of actions) {
            const actionResponse = await API.get(`/auth/permissions/action/${action}/`);
            actionPerms[action] = actionResponse.data.allowed || false;
          }
          setPermissions(actionPerms);

          // Fetch data based on active tab
          if (activeTab === 0) {
            fetchVendors();
          } else {
            fetchAuditLogs();
          }
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
  }, [fetchVendors, fetchAuditLogs, activeTab]);

  // Handle search and pagination for vendors
  useEffect(() => {
    if (hasPermission && activeTab === 0) {
      if (vendorSearch !== prevVendorSearchRef.current || searchTerm !== prevSearchTermRef.current) {
        setVendorPage(1);
        prevVendorSearchRef.current = vendorSearch;
        prevSearchTermRef.current = searchTerm;
      }
      fetchVendors();
    }
  }, [vendorSearch, searchTerm, vendorPage, hasPermission, fetchVendors, activeTab]);

  // Handle search and pagination for audit logs
  useEffect(() => {
    if (hasPermission && activeTab === 1) {
      if (auditSearch !== prevAuditSearchRef.current || searchTerm !== prevSearchTermRef.current) {
        setAuditPage(1);
        prevAuditSearchRef.current = auditSearch;
        prevSearchTermRef.current = searchTerm;
      }
      fetchAuditLogs();
    }
  }, [auditSearch, searchTerm, auditPage, hasPermission, fetchAuditLogs, activeTab]);

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handle file upload
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData((prev) => ({
        ...prev,
        document: file,
      }));
    }
  };

  // Open modal for creating new vendor
  const handleOpenCreateModal = () => {
    if (!permissions.add_vendor) {
      setAlert('⚠️ You do not have permission to create vendors.');
      return;
    }

    setModalMode('create');
    setFormData({
      name: '',
      contact_person: '',
      email: '',
      phone: '',
      address: '',
      tax_id: '',
      details: '',
      lead_time: '',
      ratings: 3,
      status: 'active',
      document: null,
    });
    setOpenModal(true);
  };

  // Open modal for editing vendor
  const handleOpenEditModal = (vendor) => {
    if (!permissions.update_vendor) {
      setAlert('⚠️ You do not have permission to edit vendors.');
      return;
    }

    setModalMode('edit');
    setSelectedVendor(vendor);

    // Populate form data
    setFormData({
      name: vendor.name,
      contact_person: vendor.contact_person,
      email: vendor.email,
      phone: vendor.phone,
      address: vendor.address,
      tax_id: vendor.tax_id,
      details: vendor.details,
      lead_time: vendor.lead_time.toString(),
      ratings: vendor.ratings,
      status: vendor.status,
      document: null, // Don't pre-fill file input
    });

    setOpenModal(true);
  };

  // Open delete confirmation
  const handleOpenDelete = (id) => {
    if (!permissions.delete_vendor) {
      setAlert('⚠️ You do not have permission to delete vendors.');
      return;
    }
    setDeleteId(id);
    setDeleteOpen(true);
  };

  // Close delete confirmation
  const handleCloseDelete = () => {
    setDeleteOpen(false);
    setDeleteId(null);
  };

  // Submit vendor (create or update)
  const handleSubmit = async () => {
    // Validate form
    if (!formData.name || !formData.lead_time) {
      setAlert('⚠️ Please fill all required fields.');
      return;
    }

    // Validate lead time
    const leadTime = parseInt(formData.lead_time);
    if (isNaN(leadTime) || leadTime <= 0) {
      setAlert('⚠️ Lead time must be a positive number.');
      return;
    }

    try {
      setVendorLoading(true);
      setAlert(null);

      const payload = {
        name: formData.name,
        contact_person: formData.contact_person,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        tax_id: formData.tax_id,
        details: formData.details,
        lead_time: leadTime,
        ratings: formData.ratings,
        status: formData.status,
      };

      let response;

      if (modalMode === 'create') {
        // Create with file upload
        const formDataObj = new FormData();
        Object.keys(payload).forEach((key) => {
          formDataObj.append(key, payload[key]);
        });
        if (formData.document) {
          formDataObj.append('document', formData.document);
        }

        response = await API.post('procurement/vendors/', formDataObj, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        setVendors([response.data, ...vendors]);
        setAlert('✅ Vendor created successfully!');
      } else {
        // Update (file upload optional)
        if (formData.document) {
          const formDataObj = new FormData();
          Object.keys(payload).forEach((key) => {
            formDataObj.append(key, payload[key]);
          });
          formDataObj.append('document', formData.document);

          response = await API.patch(`procurement/vendors/${selectedVendor.id}/`, formDataObj, {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          });
        } else {
          response = await API.patch(`procurement/vendors/${selectedVendor.id}/`, payload);
        }

        setVendors(vendors.map((vendor) => (vendor.id === selectedVendor.id ? response.data : vendor)));
        setAlert('✅ Vendor updated successfully!');
      }

      setOpenModal(false);
      if (activeTab === 0) {
        fetchVendors();
      }
    } catch (err) {
      let errorMsg = '❌ Failed to save vendor.';
      if (err.response?.data) {
        // Format validation errors
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
      setVendorLoading(false);
    }
  };

  // Delete vendor
  const handleDelete = async () => {
    try {
      setVendorLoading(true);
      setAlert(null);

      await API.delete(`procurement/vendors/${deleteId}/`);

      setVendors(vendors.filter((vendor) => vendor.id !== deleteId));
      setAlert('✅ Vendor deleted successfully!');
      handleCloseDelete();
      fetchVendors();
    } catch (err) {
      let errorMsg = '❌ Failed to delete vendor.';
      if (err.response?.data) {
        errorMsg = err.response.data.detail || JSON.stringify(err.response.data);
      } else {
        errorMsg = err.message || '❌ Network error.';
      }
      setAlert(errorMsg);
    } finally {
      setVendorLoading(false);
    }
  };

  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
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
          <Typography variant="h5">Vendor Management & Audit</Typography>
          {activeTab === 0 && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleOpenCreateModal}
              disabled={!permissions.add_vendor}
            >
              Add Vendor
            </Button>
          )}
        </Box>

        {/* Tutorial Section */}
        <Accordion expanded={showTutorial} onChange={() => setShowTutorial(!showTutorial)} sx={{ mb: 4 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <PersonIcon sx={{ mr: 1 }} />
              <HistoryIcon sx={{ mr: 1 }} />
              <Typography variant="h6">Page 4 of 4: Vendor Management & Audit</Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Typography paragraph>
              This page allows Admin and Procurement Managers to manage supplier information and track all procurement activities.
            </Typography>

            <Typography variant="subtitle1" gutterBottom>
              Subsection A: Vendor Management
            </Typography>
            <ul>
              <li>
                <strong>Vendor Details:</strong> Maintain comprehensive vendor information including contact details, address, tax ID, and lead times.
              </li>
              <li>
                <strong>Performance Tracking:</strong> Rate vendors on a 1-5 star scale based on their performance.
              </li>
              <li>
                <strong>Status Management:</strong> Set vendor status to Active, Inactive, Suspended, or Blacklisted to control their availability for new purchase orders.
              </li>
              <li>
                <strong>Document Management:</strong> Upload and store important vendor documents like contracts, certificates, and compliance records. Click "View Document" in the expanded row to open PDFs.
              </li>
              <li>
                <strong>Validation Rules:</strong> Lead time must be a positive number, and email/phone fields are validated for proper format.
              </li>
            </ul>

            <Typography variant="subtitle1" gutterBottom>
              Subsection B: Procurement Audit Logs
            </Typography>
            <ul>
              <li>
                <strong>Complete Audit Trail:</strong> View a chronological log of all procurement activities across the system.
              </li>
              <li>
                <strong>Action Tracking:</strong> See who performed actions (Create, Update, Approve, Reject, Receive) and when they occurred.
              </li>
              <li>
                <strong>Entity Tracking:</strong> Track changes to Requisitions, Purchase Orders, Receiving records, and Vendors.
              </li>
              <li>
                <strong>Search & Filter:</strong> Find specific activities by user, action type, or date range.
              </li>
              <li>
                <strong>Compliance & Security:</strong> Maintain a complete record for compliance, security audits, and troubleshooting.
              </li>
            </ul>

            <Typography variant="subtitle1" gutterBottom>
              User Roles & Permissions:
            </Typography>
            <ul>
              <li>
                <strong>Staff:</strong> Create requisitions, view own requisitions
              </li>
              <li>
                <strong>Department Heads:</strong> Approve/reject requisitions
              </li>
              <li>
                <strong>Procurement Officers:</strong> Create POs, manage vendors
              </li>
              <li>
                <strong>Warehouse Staff:</strong> Create receiving records
              </li>
              <li>
                <strong>Finance Managers:</strong> Approve POs, view audit logs
              </li>
              <li>
                <strong>Admin:</strong> Full access to all features
              </li>
            </ul>
          </AccordionDetails>
        </Accordion>

        {/* Tabs */}
        <Tabs value={activeTab} onChange={handleTabChange} sx={{ mb: 3 }} aria-label="vendor management tabs">
          <Tab label="Vendor Management" icon={<PersonIcon />} />
          <Tab label="Audit Logs" icon={<HistoryIcon />} />
        </Tabs>

        <Divider sx={{ my: 3 }} />

        {/* Vendor Management Tab */}
        {activeTab === 0 && (
          <>
            <Grid container spacing={2} mb={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="body1" color="text.secondary">
                  Manage your supplier database. Add new vendors, update existing information, and track vendor performance.
                </Typography>
              </Grid>
              <Grid item xs={12} md={6} display="flex" justifyContent="flex-end">
                <TextField
                  size="small"
                  placeholder="Search vendors..."
                  value={vendorSearch}
                  onChange={(e) => debouncedSetVendorSearch(e.target.value)}
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

            <Typography variant="h6" gutterBottom>
              Vendors
            </Typography>

            {vendors.length > 0 ? (
              <>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell />
                        <TableCell>Name</TableCell>
                        <TableCell>Contact</TableCell>
                        <TableCell>Email</TableCell>
                        <TableCell>Lead Time</TableCell>
                        <TableCell>Ratings</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Created By</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {vendors.map((vendor) => (
                        <VendorRow
                          key={vendor.id}
                          vendor={vendor}
                          onEdit={handleOpenEditModal}
                          onDelete={handleOpenDelete}
                          hasUpdatePermission={permissions.update_vendor}
                          hasDeletePermission={permissions.delete_vendor}
                        />
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>

                {vendorTotalPages > 1 && (
                  <Box mt={3} display="flex" justifyContent="center">
                    <Pagination
                      count={vendorTotalPages}
                      page={vendorPage}
                      onChange={(_, value) => setVendorPage(value)}
                      color="primary"
                    />
                  </Box>
                )}
              </>
            ) : (
              <Box textAlign="center" py={4}>
                <Typography variant="body1" color="text.secondary">
                  No vendors found.
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={handleOpenCreateModal}
                  sx={{ mt: 2 }}
                  disabled={!permissions.add_vendor}
                >
                  Add Your First Vendor
                </Button>
              </Box>
            )}
          </>
        )}

        {/* Audit Logs Tab */}
        {activeTab === 1 && (
          <>
            <Grid container spacing={2} mb={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="body1" color="text.secondary">
                  View a complete audit trail of all procurement activities. Track who did what, when, and to which entity.
                </Typography>
              </Grid>
              <Grid item xs={12} md={6} display="flex" justifyContent="flex-end">
                <TextField
                  size="small"
                  placeholder="Search audit logs..."
                  value={auditSearch}
                  onChange={(e) => debouncedSetAuditSearch(e.target.value)}
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

            <Typography variant="h6" gutterBottom>
              Audit Logs
            </Typography>

            {auditLogs.length > 0 ? (
              <>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>User</TableCell>
                        <TableCell>Action</TableCell>
                        <TableCell>Entity</TableCell>
                        <TableCell>Details</TableCell>
                        <TableCell>Timestamp</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {auditLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell>
                            <Tooltip title={log.user?.email || 'Unknown user'}>{log.user?.name || log.user?.email || 'Unknown'}</Tooltip>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={log.action.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                              size="small"
                              color={
                                log.action === 'create'
                                  ? 'success'
                                  : log.action === 'update'
                                  ? 'info'
                                  : log.action === 'approve'
                                  ? 'success'
                                  : log.action === 'reject'
                                  ? 'error'
                                  : 'default'
                              }
                            />
                          </TableCell>
                          <TableCell>
                            {log.model_name} {log.object_id}
                          </TableCell>
                          <TableCell>
                            <Tooltip title={JSON.stringify(log.details)}>
                              <Typography variant="body2" noWrap>
                                {Object.entries(log.details)
                                  .map(([key, value]) => `${key}: ${value}`)
                                  .join(', ') || '-'}
                              </Typography>
                            </Tooltip>
                          </TableCell>
                          <TableCell>{formatDate(log.created_at)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>

                {auditTotalPages > 1 && (
                  <Box mt={3} display="flex" justifyContent="center">
                    <Pagination
                      count={auditTotalPages}
                      page={auditPage}
                      onChange={(_, value) => setAuditPage(value)}
                      color="primary"
                    />
                  </Box>
                )}
              </>
            ) : (
              <Box textAlign="center" py={4}>
                <Typography variant="body1" color="text.secondary">
                  No audit logs found.
                </Typography>
              </Box>
            )}
          </>
        )}
      </Paper>

      {/* Vendor Modal */}
      <Dialog open={openModal} onClose={() => setOpenModal(false)} fullWidth maxWidth="md">
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            {modalMode === 'create' ? 'Add New Vendor' : 'Edit Vendor'}
            <IconButton onClick={() => setOpenModal(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent dividers>
          <Grid container spacing={3}>
            {/* Basic Information */}
            <Grid item xs={12} md={6}>
              <TextField
                required
                label="Vendor Name *"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                fullWidth
                placeholder="Enter vendor name"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                label="Contact Person"
                name="contact_person"
                value={formData.contact_person}
                onChange={handleInputChange}
                fullWidth
                placeholder="Enter contact person name"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                label="Email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                fullWidth
                placeholder="Enter email address"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                label="Phone"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                fullWidth
                placeholder="Enter phone number"
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="Address"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                fullWidth
                multiline
                minRows={2}
                placeholder="Enter full address"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                label="Tax ID"
                name="tax_id"
                value={formData.tax_id}
                onChange={handleInputChange}
                fullWidth
                placeholder="Enter tax/VAT registration number"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                required
                label="Lead Time (days) *"
                name="lead_time"
                type="number"
                value={formData.lead_time}
                onChange={handleInputChange}
                fullWidth
                inputProps={{ min: 1 }}
                placeholder="Enter average lead time in days"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth required>
                <InputLabel>Ratings *</InputLabel>
                <Select name="ratings" value={formData.ratings} onChange={handleInputChange} label="Ratings *">
                  <MenuItem value={1}>1 Star</MenuItem>
                  <MenuItem value={2}>2 Stars</MenuItem>
                  <MenuItem value={3}>3 Stars</MenuItem>
                  <MenuItem value={4}>4 Stars</MenuItem>
                  <MenuItem value={5}>5 Stars</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth required>
                <InputLabel>Status *</InputLabel>
                <Select name="status" value={formData.status} onChange={handleInputChange} label="Status *">
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="inactive">Inactive</MenuItem>
                  <MenuItem value="suspended">Suspended</MenuItem>
                  <MenuItem value="blacklisted">Blacklisted</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="Details"
                name="details"
                value={formData.details}
                onChange={handleInputChange}
                fullWidth
                multiline
                minRows={2}
                placeholder="Additional vendor details or notes..."
              />
            </Grid>

            <Grid item xs={12}>
              <Button variant="outlined" component="label" startIcon={<UploadFileIcon />} fullWidth>
                {formData.document ? formData.document.name : 'Upload Vendor Document'}
                <input type="file" hidden accept=".pdf,.doc,.docx,.jpg,.png" onChange={handleFileUpload} />
              </Button>
              <Typography variant="caption" color="text.secondary" display="block" mt={1}>
                Upload contracts, certificates, or other vendor documents (PDF, DOC, JPG, PNG)
              </Typography>
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setOpenModal(false)} disabled={vendorLoading}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={vendorLoading || !formData.name || !formData.lead_time}
            startIcon={vendorLoading ? <CircularProgress size={20} /> : null}
          >
            {vendorLoading ? 'Saving...' : modalMode === 'create' ? 'Add Vendor' : 'Update Vendor'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteOpen} onClose={handleCloseDelete}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete this vendor? This action cannot be undone.</Typography>
          <Alert severity="warning" sx={{ mt: 2 }}>
            <WarningIcon sx={{ mr: 1 }} />
            <strong>Warning:</strong> Deleting a vendor will remove it from all future purchase orders. Existing purchase orders will retain the vendor information.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDelete}>Cancel</Button>
          <Button
            onClick={handleDelete}
            color="error"
            variant="contained"
            disabled={vendorLoading}
            startIcon={vendorLoading ? <CircularProgress size={20} /> : null}
          >
            {vendorLoading ? 'Deleting...' : 'Delete Vendor'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}