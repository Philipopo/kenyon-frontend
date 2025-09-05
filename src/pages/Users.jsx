// src/pages/UserManagement.jsx
import React, { useState, useEffect } from "react";
import {
  Container,
  Paper,
  Box,
  Typography,
  Button,
  TextField,
  InputAdornment,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  Pagination,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  MenuItem,
  Alert,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import api from "../api";

// Role options (match backend roles)
const ROLE_OPTIONS = [
  { value: "staff", label: "Staff" },
  { value: "finance_manager", label: "Finance Manager" },
  { value: "operations_manager", label: "Operations Manager" },
  { value: "md", label: "Managing Director" },
  { value: "admin", label: "Admin" },
];

// Inventory permission keys (must match accounts/models.py)
const INVENTORY_PAGES = [
  "inventory_metrics",
  "storage_bins",
  "expired_items",
  "items",
  "stock_records",
  "expiry_tracked_items", // Added
];

const INVENTORY_ACTIONS = [
  "create_storage_bin",
  "create_item",
  "create_stock_record",
  "create_expiry_tracked_item", // Added
  "update_storage_bin", // Added
  "update_item", // Added
  "update_stock_record", // Added
  "update_expiry_tracked_item", // Added
  "delete_item",
  "delete_storage_bin",
  "delete_stock_record", // Added
  "delete_expiry_tracked_item", // Added
];

// Procurement permission keys (must match accounts/models.py)
const PROCUREMENT_PAGES = [
  "requisitions",
  "purchase_orders",
  "po_items",
  "receiving",
  "goods_receipts",
  "vendors",
];

const PROCUREMENT_ACTIONS = [
  "create_requisition",
  "approve_requisition",
  "create_purchase_order",
  "approve_purchase_order",
  "reject_purchase_order",
  "counter_purchase_order",
  "create_po_item",
  "create_receiving",
  "create_goods_receipt",
  "add_vendor",
  "delete_vendor",
];

// Receipt permission keys (must match accounts/models.py)
const RECEIPT_PAGES = [
  "receipt_archive",
  "stock_receipts",
  "signing_receipts",
];

const RECEIPT_ACTIONS = [
  "create_receipt",
  "create_stock_receipt",
  "create_signing_receipt",
];

// Finance permission keys (must match accounts/models.py)
const FINANCE_PAGES = [
  "invoices",
  "financial_metrics",
];

const FINANCE_ACTIONS = [
  "create_invoice",
  "create_payment",
];

// Rentals permission keys (must match accounts/models.py)
const RENTALS_PAGES = [
  "rentals_active",
  "rentals_equipment",
  "rentals_payments",
];

const RENTALS_ACTIONS = [
  "create_rental",
  "create_equipment",
  "create_payment",
];

// Analytics permission keys (must match accounts/models.py)
const ANALYTICS_PAGES = [
  "analytics_dwell",
  "analytics_eoq",
  "analytics_stock",
  "analytics_dashboard",
];

const ANALYTICS_ACTIONS = [
  "create_dwell",
  "create_eoq",
  "create_stock_analytics",
];

function friendlyLabelFromKey(key) {
  return key
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [role, setRole] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", role: "staff" });
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [permissionsOpen, setPermissionsOpen] = useState(false);
  const [permError, setPermError] = useState("");
  const [permSuccess, setPermSuccess] = useState("");
  const [permLoading, setPermLoading] = useState(false);

  // Permissions state for all modules
  const [invPagePerms, setInvPagePerms] = useState([]);
  const [invActionPerms, setInvActionPerms] = useState([]);
  const [proPagePerms, setProPagePerms] = useState([]);
  const [proActionPerms, setProActionPerms] = useState([]);
  const [recPagePerms, setRecPagePerms] = useState([]);
  const [recActionPerms, setRecActionPerms] = useState([]);
  const [finPagePerms, setFinPagePerms] = useState([]);
  const [finActionPerms, setFinActionPerms] = useState([]);
  const [rentPagePerms, setRentPagePerms] = useState([]);
  const [rentActionPerms, setRentActionPerms] = useState([]);
  const [anaPagePerms, setAnaPagePerms] = useState([]);
  const [anaActionPerms, setAnaActionPerms] = useState([]);

  const [resolvedPageEndpoint, setResolvedPageEndpoint] = useState(null);
  const [resolvedActionEndpoint, setResolvedActionEndpoint] = useState(null);

  const itemsPerPage = 10;

  useEffect(() => {
    api
      .get("auth/me/")
      .then((res) => {
        setRole(res.data.role);
        if (res.data.role === "admin") {
          fetchUsers();
        } else {
          setUsers([]);
        }
      })
      .catch((err) => {
        console.error("Failed to fetch current user:", err);
      });
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await api.get("auth/users/");
      setUsers(res.data);
    } catch (err) {
      console.error("Failed to fetch users:", err);
    }
  };

  const handleCreateUser = async () => {
    setFormError("");
    setFormSuccess("");
    if (!form.name || !form.email || !form.role) {
      setFormError("Please fill in all fields.");
      return;
    }
    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        role: form.role,
        password: "Password10",
      };
      await api.post("auth/register/", payload);
      setFormSuccess("✅ User created successfully");
      setForm({ name: "", email: "", role: "staff" });
      fetchUsers();
    } catch (err) {
      const errMsg =
        err.response?.data?.email ||
        err.response?.data?.detail ||
        JSON.stringify(err.response?.data) ||
        "❌ Failed to create user.";
      setFormError(errMsg);
    }
  };

  const handleDeleteUser = async (id) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;
    try {
      await api.delete(`auth/users/${id}/`);
      setUsers((prev) => prev.filter((u) => u.id !== id));
    } catch (err) {
      alert("❌ Failed to delete user.");
      console.error(err);
    }
  };

  // Permissions handling
  const handleOpenPermissions = async () => {
    setPermError("");
    setPermSuccess("");
    setPermissionsOpen(true);
    await loadPermissions();
  };

  const ensureTrailingSlash = (p) => (p.endsWith("/") ? p : `${p}/`);

  const tryGet = async (candidates) => {
    for (const c of candidates) {
      const path = ensureTrailingSlash(c);
      try {
        const res = await api.get(path);
        return { res, path };
      } catch (err) {
        if (err.response && err.response.status === 404) {
          continue;
        } else {
          throw err;
        }
      }
    }
    const e = new Error("Not found");
    e.notFound = true;
    throw e;
  };

  const loadPermissions = async () => {
    setPermError("");
    setPermSuccess("");
    setPermLoading(true);

    const pageCandidates = ["auth/page-permissions", "page-permissions"];
    const actionCandidates = ["auth/action-permissions", "action-permissions"];

    try {
      const { res: pagesRes, path: pagesPath } = await tryGet(pageCandidates);
      const { res: actionsRes, path: actionsPath } = await tryGet(actionCandidates);

      const pagesFromServer = Array.isArray(pagesRes.data)
        ? pagesRes.data
        : pagesRes.data.results || [];

      const actionsFromServer = Array.isArray(actionsRes.data)
        ? actionsRes.data
        : actionsRes.data.results || [];

      // Build Inventory arrays
      const invPages = INVENTORY_PAGES.map((key) => {
        const found = pagesFromServer.find((p) => p.page_name === key);
        return found
          ? { id: found.id, page_name: found.page_name, min_role: found.min_role }
          : { id: null, page_name: key, min_role: "staff" };
      });
      const invActions = INVENTORY_ACTIONS.map((key) => {
        const found = actionsFromServer.find((a) => a.action_name === key);
        return found
          ? { id: found.id, action_name: found.action_name, min_role: found.min_role }
          : { id: null, action_name: key, min_role: "staff" };
      });

      // Build Procurement arrays
      const proPages = PROCUREMENT_PAGES.map((key) => {
        const found = pagesFromServer.find((p) => p.page_name === key);
        return found
          ? { id: found.id, page_name: found.page_name, min_role: found.min_role }
          : { id: null, page_name: key, min_role: "staff" };
      });
      const proActions = PROCUREMENT_ACTIONS.map((key) => {
        const found = actionsFromServer.find((a) => a.action_name === key);
        return found
          ? { id: found.id, action_name: found.action_name, min_role: found.min_role }
          : { id: null, action_name: key, min_role: "staff" };
      });

      // Build Receipt arrays
      const recPages = RECEIPT_PAGES.map((key) => {
        const found = pagesFromServer.find((p) => p.page_name === key);
        return found
          ? { id: found.id, page_name: found.page_name, min_role: found.min_role }
          : { id: null, page_name: key, min_role: "staff" };
      });
      const recActions = RECEIPT_ACTIONS.map((key) => {
        const found = actionsFromServer.find((a) => a.action_name === key);
        return found
          ? { id: found.id, action_name: found.action_name, min_role: found.min_role }
          : { id: null, action_name: key, min_role: "staff" };
      });

      // Build Finance arrays
      const finPages = FINANCE_PAGES.map((key) => {
        const found = pagesFromServer.find((p) => p.page_name === key);
        return found
          ? { id: found.id, page_name: found.page_name, min_role: found.min_role }
          : { id: null, page_name: key, min_role: "staff" };
      });
      const finActions = FINANCE_ACTIONS.map((key) => {
        const found = actionsFromServer.find((a) => a.action_name === key);
        return found
          ? { id: found.id, action_name: found.action_name, min_role: found.min_role }
          : { id: null, action_name: key, min_role: "staff" };
      });

      // Build Rentals arrays
      const rentPages = RENTALS_PAGES.map((key) => {
        const found = pagesFromServer.find((p) => p.page_name === key);
        return found
          ? { id: found.id, page_name: found.page_name, min_role: found.min_role }
          : { id: null, page_name: key, min_role: "staff" };
      });
      const rentActions = RENTALS_ACTIONS.map((key) => {
        const found = actionsFromServer.find((a) => a.action_name === key);
        return found
          ? { id: found.id, action_name: found.action_name, min_role: found.min_role }
          : { id: null, action_name: key, min_role: "staff" };
      });

      // Build Analytics arrays
      const anaPages = ANALYTICS_PAGES.map((key) => {
        const found = pagesFromServer.find((p) => p.page_name === key);
        return found
          ? { id: found.id, page_name: found.page_name, min_role: found.min_role }
          : { id: null, page_name: key, min_role: "staff" };
      });
      const anaActions = ANALYTICS_ACTIONS.map((key) => {
        const found = actionsFromServer.find((a) => a.action_name === key);
        return found
          ? { id: found.id, action_name: found.action_name, min_role: found.min_role }
          : { id: null, action_name: key, min_role: "staff" };
      });

      setInvPagePerms(invPages);
      setInvActionPerms(invActions);
      setProPagePerms(proPages);
      setProActionPerms(proActions);
      setRecPagePerms(recPages);
      setRecActionPerms(recActions);
      setFinPagePerms(finPages);
      setFinActionPerms(finActions);
      setRentPagePerms(rentPages);
      setRentActionPerms(rentActions);
      setAnaPagePerms(anaPages);
      setAnaActionPerms(anaActions);

      setResolvedPageEndpoint(ensureTrailingSlash(pagesPath));
      setResolvedActionEndpoint(ensureTrailingSlash(actionsPath));
    } catch (err) {
      console.error("Failed to load permissions:", err);
      if (err.notFound) {
        setPermError("Permissions endpoints not found (404). Check backend routing.");
      } else if (err.response && (err.response.status === 401 || err.response.status === 403)) {
        setPermError("Unauthorized – you need admin access.");
      } else {
        setPermError("Failed to load permissions. Please refresh and try again.");
      }
      setInvPagePerms(INVENTORY_PAGES.map((k) => ({ id: null, page_name: k, min_role: "staff" })));
      setInvActionPerms(INVENTORY_ACTIONS.map((k) => ({ id: null, action_name: k, min_role: "staff" })));
      setProPagePerms(PROCUREMENT_PAGES.map((k) => ({ id: null, page_name: k, min_role: "staff" })));
      setProActionPerms(PROCUREMENT_ACTIONS.map((k) => ({ id: null, action_name: k, min_role: "staff" })));
      setRecPagePerms(RECEIPT_PAGES.map((k) => ({ id: null, page_name: k, min_role: "staff" })));
      setRecActionPerms(RECEIPT_ACTIONS.map((k) => ({ id: null, action_name: k, min_role: "staff" })));
      setFinPagePerms(FINANCE_PAGES.map((k) => ({ id: null, page_name: k, min_role: "staff" })));
      setFinActionPerms(FINANCE_ACTIONS.map((k) => ({ id: null, action_name: k, min_role: "staff" })));
      setRentPagePerms(RENTALS_PAGES.map((k) => ({ id: null, page_name: k, min_role: "staff" })));
      setRentActionPerms(RENTALS_ACTIONS.map((k) => ({ id: null, action_name: k, min_role: "staff" })));
      setAnaPagePerms(ANALYTICS_PAGES.map((k) => ({ id: null, page_name: k, min_role: "staff" })));
      setAnaActionPerms(ANALYTICS_ACTIONS.map((k) => ({ id: null, action_name: k, min_role: "staff" })));
    } finally {
      setPermLoading(false);
    }
  };

  // Change handlers (Inventory)
  const handleInvPagePermChange = (pageName, newRole) => {
    setInvPagePerms((prev) =>
      prev.map((p) => (p.page_name === pageName ? { ...p, min_role: newRole } : p))
    );
  };
  const handleInvActionPermChange = (actionName, newRole) => {
    setInvActionPerms((prev) =>
      prev.map((a) => (a.action_name === actionName ? { ...a, min_role: newRole } : a))
    );
  };

  // Change handlers (Procurement)
  const handleProPagePermChange = (pageName, newRole) => {
    setProPagePerms((prev) =>
      prev.map((p) => (p.page_name === pageName ? { ...p, min_role: newRole } : p))
    );
  };
  const handleProActionPermChange = (actionName, newRole) => {
    setProActionPerms((prev) =>
      prev.map((a) => (a.action_name === actionName ? { ...a, min_role: newRole } : a))
    );
  };

  // Change handlers (Receipt)
  const handleRecPagePermChange = (pageName, newRole) => {
    setRecPagePerms((prev) =>
      prev.map((p) => (p.page_name === pageName ? { ...p, min_role: newRole } : p))
    );
  };
  const handleRecActionPermChange = (actionName, newRole) => {
    setRecActionPerms((prev) =>
      prev.map((a) => (a.action_name === actionName ? { ...a, min_role: newRole } : a))
    );
  };

  // Change handlers (Finance)
  const handleFinPagePermChange = (pageName, newRole) => {
    setFinPagePerms((prev) =>
      prev.map((p) => (p.page_name === pageName ? { ...p, min_role: newRole } : p))
    );
  };
  const handleFinActionPermChange = (actionName, newRole) => {
    setFinActionPerms((prev) =>
      prev.map((a) => (a.action_name === actionName ? { ...a, min_role: newRole } : a))
    );
  };

  // Change handlers (Rentals)
  const handleRentPagePermChange = (pageName, newRole) => {
    setRentPagePerms((prev) =>
      prev.map((p) => (p.page_name === pageName ? { ...p, min_role: newRole } : p))
    );
  };
  const handleRentActionPermChange = (actionName, newRole) => {
    setRentActionPerms((prev) =>
      prev.map((a) => (a.action_name === actionName ? { ...a, min_role: newRole } : a))
    );
  };

  // Change handlers (Analytics)
  const handleAnaPagePermChange = (pageName, newRole) => {
    setAnaPagePerms((prev) =>
      prev.map((p) => (p.page_name === pageName ? { ...p, min_role: newRole } : p))
    );
  };
  const handleAnaActionPermChange = (actionName, newRole) => {
    setAnaActionPerms((prev) =>
      prev.map((a) => (a.action_name === actionName ? { ...a, min_role: newRole } : a))
    );
  };

  const handleUpdatePermissions = async () => {
    setPermError("");
    setPermSuccess("");
    setPermLoading(true);

    try {
      let pageEndpoint = resolvedPageEndpoint;
      let actionEndpoint = resolvedActionEndpoint;

      if (!pageEndpoint || !actionEndpoint) {
        const pageCandidates = ["auth/page-permissions", "page-permissions"];
        const actionCandidates = ["auth/action-permissions", "action-permissions"];
        try {
          const { path: pagesPath } = await tryGet(pageCandidates);
          const { path: actionsPath } = await tryGet(actionCandidates);
          pageEndpoint = ensureTrailingSlash(pagesPath);
          actionEndpoint = ensureTrailingSlash(actionsPath);
          setResolvedPageEndpoint(pageEndpoint);
          setResolvedActionEndpoint(actionEndpoint);
        } catch (err) {
          throw new Error("Could not resolve permissions endpoints for update. Check backend routing.");
        }
      }

      const requests = [];

      // Patch/create Inventory pages
      invPagePerms.forEach((p) => {
        if (p.id) {
          requests.push(api.patch(`${pageEndpoint}${p.id}/`, { min_role: p.min_role }));
        } else {
          requests.push(api.post(pageEndpoint, { page_name: p.page_name, min_role: p.min_role }));
        }
      });

      // Patch/create Inventory actions
      invActionPerms.forEach((a) => {
        if (a.id) {
          requests.push(api.patch(`${actionEndpoint}${a.id}/`, { min_role: a.min_role }));
        } else {
          requests.push(api.post(actionEndpoint, { action_name: a.action_name, min_role: a.min_role }));
        }
      });

      // Patch/create Procurement pages
      proPagePerms.forEach((p) => {
        if (p.id) {
          requests.push(api.patch(`${pageEndpoint}${p.id}/`, { min_role: p.min_role }));
        } else {
          requests.push(api.post(pageEndpoint, { page_name: p.page_name, min_role: p.min_role }));
        }
      });

      // Patch/create Procurement actions
      proActionPerms.forEach((a) => {
        if (a.id) {
          requests.push(api.patch(`${actionEndpoint}${a.id}/`, { min_role: a.min_role }));
        } else {
          requests.push(api.post(actionEndpoint, { action_name: a.action_name, min_role: a.min_role }));
        }
      });

      // Patch/create Receipt pages
      recPagePerms.forEach((p) => {
        if (p.id) {
          requests.push(api.patch(`${pageEndpoint}${p.id}/`, { min_role: p.min_role }));
        } else {
          requests.push(api.post(pageEndpoint, { page_name: p.page_name, min_role: p.min_role }));
        }
      });

      // Patch/create Receipt actions
      recActionPerms.forEach((a) => {
        if (a.id) {
          requests.push(api.patch(`${actionEndpoint}${a.id}/`, { min_role: a.min_role }));
        } else {
          requests.push(api.post(actionEndpoint, { action_name: a.action_name, min_role: a.min_role }));
        }
      });

      // Patch/create Finance pages
      finPagePerms.forEach((p) => {
        if (p.id) {
          requests.push(api.patch(`${pageEndpoint}${p.id}/`, { min_role: p.min_role }));
        } else {
          requests.push(api.post(pageEndpoint, { page_name: p.page_name, min_role: p.min_role }));
        }
      });

      // Patch/create Finance actions
      finActionPerms.forEach((a) => {
        if (a.id) {
          requests.push(api.patch(`${actionEndpoint}${a.id}/`, { min_role: a.min_role }));
        } else {
          requests.push(api.post(actionEndpoint, { action_name: a.action_name, min_role: a.min_role }));
        }
      });

      // Patch/create Rentals pages
      rentPagePerms.forEach((p) => {
        if (p.id) {
          requests.push(api.patch(`${pageEndpoint}${p.id}/`, { min_role: p.min_role }));
        } else {
          requests.push(api.post(pageEndpoint, { page_name: p.page_name, min_role: p.min_role }));
        }
      });

      // Patch/create Rentals actions
      rentActionPerms.forEach((a) => {
        if (a.id) {
          requests.push(api.patch(`${actionEndpoint}${a.id}/`, { min_role: a.min_role }));
        } else {
          requests.push(api.post(actionEndpoint, { action_name: a.action_name, min_role: a.min_role }));
        }
      });

      // Patch/create Analytics pages
      anaPagePerms.forEach((p) => {
        if (p.id) {
          requests.push(api.patch(`${pageEndpoint}${p.id}/`, { min_role: p.min_role }));
        } else {
          requests.push(api.post(pageEndpoint, { page_name: p.page_name, min_role: p.min_role }));
        }
      });

      // Patch/create Analytics actions
      anaActionPerms.forEach((a) => {
        if (a.id) {
          requests.push(api.patch(`${actionEndpoint}${a.id}/`, { min_role: a.min_role }));
        } else {
          requests.push(api.post(actionEndpoint, { action_name: a.action_name, min_role: a.min_role }));
        }
      });

      await Promise.all(requests);
      await loadPermissions();
      setPermSuccess("✅ Permissions updated successfully");
    } catch (err) {
      console.error("Failed to update permissions:", err);
      const serverMsg =
        err.response?.data?.detail ||
        (err.response?.data && JSON.stringify(err.response.data)) ||
        err.message ||
        "Failed to update permissions.";
      setPermError(`❌ ${serverMsg}`);
    } finally {
      setPermLoading(false);
    }
  };

  const filtered = users.filter(
    (user) =>
      user.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      user.email?.toLowerCase().includes(search.toLowerCase()) ||
      user.role?.toLowerCase().includes(search.toLowerCase())
  );

  const paginated = filtered.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  if (role && role !== "admin") {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Alert severity="error">Access Denied – Admins only</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Box>
            <Typography variant="h4">User Management</Typography>
            <Typography variant="subtitle1">Manage all system users including roles and status</Typography>
          </Box>
          <Box display="flex" gap={2}>
            <Button variant="outlined" startIcon={<EditIcon />} onClick={handleOpenPermissions}>
              Edit User Permissions
            </Button>
            <Button variant="contained" startIcon={<PersonAddIcon />} onClick={() => setFormOpen(true)}>
              Add User
            </Button>
          </Box>
        </Box>

        <Box display="flex" justifyContent="flex-end" mb={2}>
          <TextField
            placeholder="Search users..."
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
                <TableCell>S/N</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginated.length > 0 ? (
                paginated.map((user, index) => (
                  <TableRow key={user.id}>
                    <TableCell>{(page - 1) * itemsPerPage + index + 1}</TableCell>
                    <TableCell>{user.full_name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.role}</TableCell>
                    <TableCell>{user.status ?? "Active"}</TableCell>
                    <TableCell>
                      <Button color="error" startIcon={<DeleteIcon />} onClick={() => handleDeleteUser(user.id)}>
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    No matching users found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <Box display="flex" justifyContent="center" mt={3}>
          <Pagination
            count={Math.max(1, Math.ceil(filtered.length / itemsPerPage))}
            page={page}
            onChange={(_, value) => setPage(value)}
            color="primary"
          />
        </Box>
      </Paper>

      <Dialog open={formOpen} onClose={() => setFormOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Create New User</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField label="Full Name" name="name" fullWidth value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Grid>
            <Grid item xs={12}>
              <TextField label="Email" name="email" fullWidth value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </Grid>
            <Grid item xs={12}>
              <TextField label="Role" name="role" select fullWidth value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                {ROLE_OPTIONS.map((r) => (
                  <MenuItem key={r.value} value={r.value}>
                    {r.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
          </Grid>
          {formError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {formError}
            </Alert>
          )}
          {formSuccess && (
            <Alert severity="success" sx={{ mt: 2 }}>
              {formSuccess}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFormOpen(false)}>Cancel</Button>
          <Button onClick={handleCreateUser} variant="contained">
            Create
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={permissionsOpen} onClose={() => setPermissionsOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>Edit User Permissions</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Control which roles can access specific pages and perform actions across all modules.
            Select the minimum role required for each page or action. (Admin is the highest role.)
          </Typography>

          {permError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {permError}
            </Alert>
          )}
          {permSuccess && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {permSuccess}
            </Alert>
          )}

          {/* Inventory Section */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" gutterBottom>
              Inventory
            </Typography>
            <Typography variant="subtitle1" sx={{ mt: 1, mb: 1 }}>
              Pages
            </Typography>
            <Grid container spacing={2} sx={{ mb: 2 }}>
              {invPagePerms.map((p) => (
                <Grid item xs={12} sm={6} key={p.page_name}>
                  <TextField
                    label={friendlyLabelFromKey(p.page_name)}
                    helperText={p.page_name}
                    select
                    fullWidth
                    value={p.min_role}
                    onChange={(e) => handleInvPagePermChange(p.page_name, e.target.value)}
                  >
                    {ROLE_OPTIONS.map((r) => (
                      <MenuItem key={r.value} value={r.value}>
                        {r.label}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
              ))}
            </Grid>
            <Typography variant="subtitle1" sx={{ mt: 1, mb: 1 }}>
              Actions
            </Typography>
            <Grid container spacing={2}>
              {invActionPerms.map((a) => (
                <Grid item xs={12} sm={6} key={a.action_name}>
                  <TextField
                    label={friendlyLabelFromKey(a.action_name)}
                    helperText={a.action_name}
                    select
                    fullWidth
                    value={a.min_role}
                    onChange={(e) => handleInvActionPermChange(a.action_name, e.target.value)}
                  >
                    {ROLE_OPTIONS.map((r) => (
                      <MenuItem key={r.value} value={r.value}>
                        {r.label}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
              ))}
            </Grid>
          </Box>

          {/* Procurement Section */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" gutterBottom>
              Procurement
            </Typography>
            <Typography variant="subtitle1" sx={{ mt: 1, mb: 1 }}>
              Pages
            </Typography>
            <Grid container spacing={2} sx={{ mb: 2 }}>
              {proPagePerms.map((p) => (
                <Grid item xs={12} sm={6} key={p.page_name}>
                  <TextField
                    label={friendlyLabelFromKey(p.page_name)}
                    helperText={p.page_name}
                    select
                    fullWidth
                    value={p.min_role}
                    onChange={(e) => handleProPagePermChange(p.page_name, e.target.value)}
                  >
                    {ROLE_OPTIONS.map((r) => (
                      <MenuItem key={r.value} value={r.value}>
                        {r.label}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
              ))}
            </Grid>
            <Typography variant="subtitle1" sx={{ mt: 1, mb: 1 }}>
              Actions
            </Typography>
            <Grid container spacing={2}>
              {proActionPerms.map((a) => (
                <Grid item xs={12} sm={6} key={a.action_name}>
                  <TextField
                    label={friendlyLabelFromKey(a.action_name)}
                    helperText={a.action_name}
                    select
                    fullWidth
                    value={a.min_role}
                    onChange={(e) => handleProActionPermChange(a.action_name, e.target.value)}
                  >
                    {ROLE_OPTIONS.map((r) => (
                      <MenuItem key={r.value} value={r.value}>
                        {r.label}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
              ))}
            </Grid>
          </Box>

          {/* Receipt Section */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" gutterBottom>
              Receipt
            </Typography>
            <Typography variant="subtitle1" sx={{ mt: 1, mb: 1 }}>
              Pages
            </Typography>
            <Grid container spacing={2} sx={{ mb: 2 }}>
              {recPagePerms.map((p) => (
                <Grid item xs={12} sm={6} key={p.page_name}>
                  <TextField
                    label={friendlyLabelFromKey(p.page_name)}
                    helperText={p.page_name}
                    select
                    fullWidth
                    value={p.min_role}
                    onChange={(e) => handleRecPagePermChange(p.page_name, e.target.value)}
                  >
                    {ROLE_OPTIONS.map((r) => (
                      <MenuItem key={r.value} value={r.value}>
                        {r.label}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
              ))}
            </Grid>
            <Typography variant="subtitle1" sx={{ mt: 1, mb: 1 }}>
              Actions
            </Typography>
            <Grid container spacing={2}>
              {recActionPerms.map((a) => (
                <Grid item xs={12} sm={6} key={a.action_name}>
                  <TextField
                    label={friendlyLabelFromKey(a.action_name)}
                    helperText={a.action_name}
                    select
                    fullWidth
                    value={a.min_role}
                    onChange={(e) => handleRecActionPermChange(a.action_name, e.target.value)}
                  >
                    {ROLE_OPTIONS.map((r) => (
                      <MenuItem key={r.value} value={r.value}>
                        {r.label}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
              ))}
            </Grid>
          </Box>

          {/* Finance Section */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" gutterBottom>
              Finance
            </Typography>
            <Typography variant="subtitle1" sx={{ mt: 1, mb: 1 }}>
              Pages
            </Typography>
            <Grid container spacing={2} sx={{ mb: 2 }}>
              {finPagePerms.map((p) => (
                <Grid item xs={12} sm={6} key={p.page_name}>
                  <TextField
                    label={friendlyLabelFromKey(p.page_name)}
                    helperText={p.page_name}
                    select
                    fullWidth
                    value={p.min_role}
                    onChange={(e) => handleFinPagePermChange(p.page_name, e.target.value)}
                  >
                    {ROLE_OPTIONS.map((r) => (
                      <MenuItem key={r.value} value={r.value}>
                        {r.label}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
              ))}
            </Grid>
            <Typography variant="subtitle1" sx={{ mt: 1, mb: 1 }}>
              Actions
            </Typography>
            <Grid container spacing={2}>
              {finActionPerms.map((a) => (
                <Grid item xs={12} sm={6} key={a.action_name}>
                  <TextField
                    label={friendlyLabelFromKey(a.action_name)}
                    helperText={a.action_name}
                    select
                    fullWidth
                    value={a.min_role}
                    onChange={(e) => handleFinActionPermChange(a.action_name, e.target.value)}
                  >
                    {ROLE_OPTIONS.map((r) => (
                      <MenuItem key={r.value} value={r.value}>
                        {r.label}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
              ))}
            </Grid>
          </Box>

          {/* Rentals Section */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" gutterBottom>
              Rentals
            </Typography>
            <Typography variant="subtitle1" sx={{ mt: 1, mb: 1 }}>
              Pages
            </Typography>
            <Grid container spacing={2} sx={{ mb: 2 }}>
              {rentPagePerms.map((p) => (
                <Grid item xs={12} sm={6} key={p.page_name}>
                  <TextField
                    label={friendlyLabelFromKey(p.page_name)}
                    helperText={p.page_name}
                    select
                    fullWidth
                    value={p.min_role}
                    onChange={(e) => handleRentPagePermChange(p.page_name, e.target.value)}
                  >
                    {ROLE_OPTIONS.map((r) => (
                      <MenuItem key={r.value} value={r.value}>
                        {r.label}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
              ))}
            </Grid>
            <Typography variant="subtitle1" sx={{ mt: 1, mb: 1 }}>
              Actions
            </Typography>
            <Grid container spacing={2}>
              {rentActionPerms.map((a) => (
                <Grid item xs={12} sm={6} key={a.action_name}>
                  <TextField
                    label={friendlyLabelFromKey(a.action_name)}
                    helperText={a.action_name}
                    select
                    fullWidth
                    value={a.min_role}
                    onChange={(e) => handleRentActionPermChange(a.action_name, e.target.value)}
                  >
                    {ROLE_OPTIONS.map((r) => (
                      <MenuItem key={r.value} value={r.value}>
                        {r.label}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
              ))}
            </Grid>
          </Box>

          {/* Analytics Section */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" gutterBottom>
              Analytics
            </Typography>
            <Typography variant="subtitle1" sx={{ mt: 1, mb: 1 }}>
              Pages
            </Typography>
            <Grid container spacing={2} sx={{ mb: 2 }}>
              {anaPagePerms.map((p) => (
                <Grid item xs={12} sm={6} key={p.page_name}>
                  <TextField
                    label={friendlyLabelFromKey(p.page_name)}
                    helperText={p.page_name}
                    select
                    fullWidth
                    value={p.min_role}
                    onChange={(e) => handleAnaPagePermChange(p.page_name, e.target.value)}
                  >
                    {ROLE_OPTIONS.map((r) => (
                      <MenuItem key={r.value} value={r.value}>
                        {r.label}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
              ))}
            </Grid>
            <Typography variant="subtitle1" sx={{ mt: 1, mb: 1 }}>
              Actions
            </Typography>
            <Grid container spacing={2}>
              {anaActionPerms.map((a) => (
                <Grid item xs={12} sm={6} key={a.action_name}>
                  <TextField
                    label={friendlyLabelFromKey(a.action_name)}
                    helperText={a.action_name}
                    select
                    fullWidth
                    value={a.min_role}
                    onChange={(e) => handleAnaActionPermChange(a.action_name, e.target.value)}
                  >
                    {ROLE_OPTIONS.map((r) => (
                      <MenuItem key={r.value} value={r.value}>
                        {r.label}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
              ))}
            </Grid>
          </Box>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setPermissionsOpen(false)}>Cancel</Button>
          <Button onClick={handleUpdatePermissions} variant="contained" disabled={permLoading}>
            {permLoading ? "Updating..." : "Update Permissions"}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}