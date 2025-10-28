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
import LockResetIcon from "@mui/icons-material/LockReset";
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
  "expiry_tracked_items",
];

const INVENTORY_ACTIONS = [
  "create_storage_bin",
  "create_item",
  "create_stock_record",
  "create_expiry_tracked_item",
  "update_storage_bin",
  "update_item",
  "update_stock_record",
  "update_expiry_tracked_item",
  "delete_item",
  "delete_storage_bin",
  "delete_stock_record",
  "delete_expiry_tracked_item",
];

// Procurement permission keys
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

// Receipt permission keys
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

// Rentals permission keys
const RENTALS_PAGES = [
  "rentals_active",
  "rentals_equipment",
  "rentals_payments",
  "branches"
];
const RENTALS_ACTIONS = [
  "create_rental", "update_rental", "delete_rental",
  "create_equipment", "update_equipment", "delete_equipment",
  "create_payment", "update_payment", "delete_payment",
  "create_branch", "update_branch", "delete_branch",
  "create_reservation", "update_reservation", "delete_reservation",
  "mark_rental_returned",
  "view_overdue_rentals"
];

// Analytics permission keys
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

  // Permissions state
  const [invPagePerms, setInvPagePerms] = useState([]);
  const [invActionPerms, setInvActionPerms] = useState([]);
  const [proPagePerms, setProPagePerms] = useState([]);
  const [proActionPerms, setProActionPerms] = useState([]);
  const [recPagePerms, setRecPagePerms] = useState([]);
  const [recActionPerms, setRecActionPerms] = useState([]);
  const [rentPagePerms, setRentPagePerms] = useState([]);
  const [rentActionPerms, setRentActionPerms] = useState([]);
  const [anaPagePerms, setAnaPagePerms] = useState([]);
  const [anaActionPerms, setAnaActionPerms] = useState([]);

  const [resolvedPageEndpoint, setResolvedPageEndpoint] = useState(null);
  const [resolvedActionEndpoint, setResolvedActionEndpoint] = useState(null);

  // Role & Password Dialogs
  const [editRoleDialogOpen, setEditRoleDialogOpen] = useState(false);
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newRole, setNewRole] = useState("staff");
  const [newPassword, setNewPassword] = useState("");
  const [dialogError, setDialogError] = useState("");
  const [dialogSuccess, setDialogSuccess] = useState("");

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
        setUsers([]);
      });
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await api.get("auth/users/");
      const usersArray = Array.isArray(res.data.results) ? res.data.results : [];
      setUsers(usersArray);
    } catch (err) {
      console.error("Failed to fetch users:", err);
      setUsers([]);
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
      await api.delete(`auth/admin/delete-user/${id}/`);
      setUsers((prev) => prev.filter((u) => u.id !== id));
    } catch (err) {
      alert("❌ Failed to delete user.");
      console.error(err);
    }
  };

  // === Role & Password Handlers ===

  const handleEditRole = (user) => {
    setSelectedUser(user);
    setNewRole(user.role);
    setEditRoleDialogOpen(true);
    setDialogError("");
    setDialogSuccess("");
  };

  const handleResetPassword = (user) => {
    setSelectedUser(user);
    setNewPassword("");
    setResetPasswordDialogOpen(true);
    setDialogError("");
    setDialogSuccess("");
  };

  const handleUpdateRole = async () => {
    setDialogError("");
    setDialogSuccess("");
    try {
      await api.patch(`auth/admin/update-user-role/${selectedUser.id}/`, { role: newRole });
      setDialogSuccess("✅ Role updated successfully");
      fetchUsers();
      setTimeout(() => setEditRoleDialogOpen(false), 1000);
    } catch (err) {
      setDialogError(err.response?.data?.detail || "❌ Failed to update role.");
    }
  };

  const handlePasswordReset = async () => {
    if (newPassword.length < 6) {
      setDialogError("Password must be at least 6 characters.");
      return;
    }
    setDialogError("");
    setDialogSuccess("");
    try {
      await api.post(`auth/admin/reset-user-password/${selectedUser.id}/`, { new_password: newPassword });
      setDialogSuccess("✅ Password reset successfully");
      setTimeout(() => setResetPasswordDialogOpen(false), 1000);
    } catch (err) {
      setDialogError(err.response?.data?.detail || "❌ Failed to reset password.");
    }
  };

  // === Permissions Logic (unchanged) ===

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
        if (err.response && err.response.status === 404) continue;
        else throw err;
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

      const pagesFromServer = Array.isArray(pagesRes.data) ? pagesRes.data : pagesRes.data.results || [];
      const actionsFromServer = Array.isArray(actionsRes.data) ? actionsRes.data : actionsRes.data.results || [];

      const buildPerm = (keys, serverList, keyField, nameField) =>
        keys.map((key) => {
          const found = serverList.find((item) => item[keyField] === key);
          return found
            ? { id: found.id, [keyField]: found[keyField], min_role: found.min_role }
            : { id: null, [keyField]: key, min_role: "staff" };
        });

      setInvPagePerms(buildPerm(INVENTORY_PAGES, pagesFromServer, "page_name", "page_name"));
      setInvActionPerms(buildPerm(INVENTORY_ACTIONS, actionsFromServer, "action_name", "action_name"));
      setProPagePerms(buildPerm(PROCUREMENT_PAGES, pagesFromServer, "page_name", "page_name"));
      setProActionPerms(buildPerm(PROCUREMENT_ACTIONS, actionsFromServer, "action_name", "action_name"));
      setRecPagePerms(buildPerm(RECEIPT_PAGES, pagesFromServer, "page_name", "page_name"));
      setRecActionPerms(buildPerm(RECEIPT_ACTIONS, actionsFromServer, "action_name", "action_name"));
      setRentPagePerms(buildPerm(RENTALS_PAGES, pagesFromServer, "page_name", "page_name"));
      setRentActionPerms(buildPerm(RENTALS_ACTIONS, actionsFromServer, "action_name", "action_name"));
      setAnaPagePerms(buildPerm(ANALYTICS_PAGES, pagesFromServer, "page_name", "page_name"));
      setAnaActionPerms(buildPerm(ANALYTICS_ACTIONS, actionsFromServer, "action_name", "action_name"));

      setResolvedPageEndpoint(ensureTrailingSlash(pagesPath));
      setResolvedActionEndpoint(ensureTrailingSlash(actionsPath));
    } catch (err) {
      console.error("Failed to load permissions:", err);
      const fallback = (keys, keyField) => keys.map((k) => ({ id: null, [keyField]: k, min_role: "staff" }));
      setInvPagePerms(fallback(INVENTORY_PAGES, "page_name"));
      setInvActionPerms(fallback(INVENTORY_ACTIONS, "action_name"));
      setProPagePerms(fallback(PROCUREMENT_PAGES, "page_name"));
      setProActionPerms(fallback(PROCUREMENT_ACTIONS, "action_name"));
      setRecPagePerms(fallback(RECEIPT_PAGES, "page_name"));
      setRecActionPerms(fallback(RECEIPT_ACTIONS, "action_name"));
      setRentPagePerms(fallback(RENTALS_PAGES, "page_name"));
      setRentActionPerms(fallback(RENTALS_ACTIONS, "action_name"));
      setAnaPagePerms(fallback(ANALYTICS_PAGES, "page_name"));
      setAnaActionPerms(fallback(ANALYTICS_ACTIONS, "action_name"));

      if (err.notFound) setPermError("Permissions endpoints not found (404). Check backend routing.");
      else if (err.response?.status === 401 || err.response?.status === 403)
        setPermError("Unauthorized – you need admin access.");
      else setPermError("Failed to load permissions. Please refresh and try again.");
    } finally {
      setPermLoading(false);
    }
  };

  // Permission change handlers (Inventory, Procurement, etc.) – unchanged
  const handleInvPagePermChange = (pageName, newRole) =>
    setInvPagePerms((prev) => prev.map((p) => (p.page_name === pageName ? { ...p, min_role: newRole } : p)));
  const handleInvActionPermChange = (actionName, newRole) =>
    setInvActionPerms((prev) => prev.map((a) => (a.action_name === actionName ? { ...a, min_role: newRole } : a)));

  const handleProPagePermChange = (pageName, newRole) =>
    setProPagePerms((prev) => prev.map((p) => (p.page_name === pageName ? { ...p, min_role: newRole } : p)));
  const handleProActionPermChange = (actionName, newRole) =>
    setProActionPerms((prev) => prev.map((a) => (a.action_name === actionName ? { ...a, min_role: newRole } : a)));

  const handleRecPagePermChange = (pageName, newRole) =>
    setRecPagePerms((prev) => prev.map((p) => (p.page_name === pageName ? { ...p, min_role: newRole } : p)));
  const handleRecActionPermChange = (actionName, newRole) =>
    setRecActionPerms((prev) => prev.map((a) => (a.action_name === actionName ? { ...a, min_role: newRole } : a)));

  const handleRentPagePermChange = (pageName, newRole) =>
    setRentPagePerms((prev) => prev.map((p) => (p.page_name === pageName ? { ...p, min_role: newRole } : p)));
  const handleRentActionPermChange = (actionName, newRole) =>
    setRentActionPerms((prev) => prev.map((a) => (a.action_name === actionName ? { ...a, min_role: newRole } : a)));

  const handleAnaPagePermChange = (pageName, newRole) =>
    setAnaPagePerms((prev) => prev.map((p) => (p.page_name === pageName ? { ...p, min_role: newRole } : p)));
  const handleAnaActionPermChange = (actionName, newRole) =>
    setAnaActionPerms((prev) => prev.map((a) => (a.action_name === actionName ? { ...a, min_role: newRole } : a)));

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
        const { path: pagesPath } = await tryGet(pageCandidates);
        const { path: actionsPath } = await tryGet(actionCandidates);
        pageEndpoint = ensureTrailingSlash(pagesPath);
        actionEndpoint = ensureTrailingSlash(actionsPath);
        setResolvedPageEndpoint(pageEndpoint);
        setResolvedActionEndpoint(actionEndpoint);
      }

      const requests = [];

      const submitPerms = (perms, endpoint, idField, nameField) => {
        perms.forEach((p) => {
          if (p.id) {
            requests.push(api.patch(`${endpoint}${p.id}/`, { min_role: p.min_role }));
          } else {
            const payload = {};
            payload[nameField] = p[nameField];
            payload.min_role = p.min_role;
            requests.push(api.post(endpoint, payload));
          }
        });
      };

      submitPerms(invPagePerms, pageEndpoint, "id", "page_name");
      submitPerms(invActionPerms, actionEndpoint, "id", "action_name");
      submitPerms(proPagePerms, pageEndpoint, "id", "page_name");
      submitPerms(proActionPerms, actionEndpoint, "id", "action_name");
      submitPerms(recPagePerms, pageEndpoint, "id", "page_name");
      submitPerms(recActionPerms, actionEndpoint, "id", "action_name");
      submitPerms(rentPagePerms, pageEndpoint, "id", "page_name");
      submitPerms(rentActionPerms, actionEndpoint, "id", "action_name");
      submitPerms(anaPagePerms, pageEndpoint, "id", "page_name");
      submitPerms(anaActionPerms, actionEndpoint, "id", "action_name");

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

  const filtered = Array.isArray(users)
    ? users.filter(
        (user) =>
          user.full_name?.toLowerCase().includes(search.toLowerCase()) ||
          user.email?.toLowerCase().includes(search.toLowerCase()) ||
          user.role?.toLowerCase().includes(search.toLowerCase())
      )
    : [];

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
                      <Box display="flex" gap={1}>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => handleEditRole(user)}
                        >
                          Edit Role
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          color="warning"
                          startIcon={<LockResetIcon />}
                          onClick={() => handleResetPassword(user)}
                        >
                          Reset Password
                        </Button>
                        <Button
                          size="small"
                          color="error"
                          startIcon={<DeleteIcon />}
                          onClick={() => handleDeleteUser(user.id)}
                        >
                          Delete
                        </Button>
                      </Box>
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

      {/* Create User Dialog */}
      <Dialog open={formOpen} onClose={() => setFormOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Create New User</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                label="Full Name"
                fullWidth
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Email"
                fullWidth
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Role"
                select
                fullWidth
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
              >
                {ROLE_OPTIONS.map((r) => (
                  <MenuItem key={r.value} value={r.value}>
                    {r.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
          </Grid>
          {formError && <Alert severity="error" sx={{ mt: 2 }}>{formError}</Alert>}
          {formSuccess && <Alert severity="success" sx={{ mt: 2 }}>{formSuccess}</Alert>}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFormOpen(false)}>Cancel</Button>
          <Button onClick={handleCreateUser} variant="contained">
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Role Dialog */}
      <Dialog open={editRoleDialogOpen} onClose={() => setEditRoleDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Edit Role for {selectedUser?.full_name}</DialogTitle>
        <DialogContent>
          <TextField
            select
            label="Role"
            fullWidth
            value={newRole}
            onChange={(e) => setNewRole(e.target.value)}
            sx={{ mt: 2 }}
          >
            {ROLE_OPTIONS.map((r) => (
              <MenuItem key={r.value} value={r.value}>
                {r.label}
              </MenuItem>
            ))}
          </TextField>
          {dialogError && <Alert severity="error" sx={{ mt: 2 }}>{dialogError}</Alert>}
          {dialogSuccess && <Alert severity="success" sx={{ mt: 2 }}>{dialogSuccess}</Alert>}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditRoleDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleUpdateRole} variant="contained">
            Update Role
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={resetPasswordDialogOpen} onClose={() => setResetPasswordDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Reset Password for {selectedUser?.full_name}</DialogTitle>
        <DialogContent>
          <TextField
            label="New Password"
            type="password"
            fullWidth
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            sx={{ mt: 2 }}
            helperText="At least 6 characters"
          />
          {dialogError && <Alert severity="error" sx={{ mt: 2 }}>{dialogError}</Alert>}
          {dialogSuccess && <Alert severity="success" sx={{ mt: 2 }}>{dialogSuccess}</Alert>}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResetPasswordDialogOpen(false)}>Cancel</Button>
          <Button onClick={handlePasswordReset} variant="contained" color="warning">
            Reset Password
          </Button>
        </DialogActions>
      </Dialog>

      {/* Permissions Dialog */}
      <Dialog open={permissionsOpen} onClose={() => setPermissionsOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>Edit User Permissions</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Control which roles can access specific pages and perform actions across all modules.
            Select the minimum role required for each page or action. (Admin is the highest role.)
          </Typography>

          {permError && <Alert severity="error" sx={{ mb: 2 }}>{permError}</Alert>}
          {permSuccess && <Alert severity="success" sx={{ mb: 2 }}>{permSuccess}</Alert>}

          {/* Inventory */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" gutterBottom>Inventory</Typography>
            <Typography variant="subtitle1" sx={{ mt: 1, mb: 1 }}>Pages</Typography>
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
            <Typography variant="subtitle1" sx={{ mt: 1, mb: 1 }}>Actions</Typography>
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

          {/* Procurement */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" gutterBottom>Procurement</Typography>
            <Typography variant="subtitle1" sx={{ mt: 1, mb: 1 }}>Pages</Typography>
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
            <Typography variant="subtitle1" sx={{ mt: 1, mb: 1 }}>Actions</Typography>
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

          {/* Receipt */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" gutterBottom>Receipt</Typography>
            <Typography variant="subtitle1" sx={{ mt: 1, mb: 1 }}>Pages</Typography>
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
            <Typography variant="subtitle1" sx={{ mt: 1, mb: 1 }}>Actions</Typography>
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

          {/* Rentals */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" gutterBottom>Rentals</Typography>
            <Typography variant="subtitle1" sx={{ mt: 1, mb: 1 }}>Pages</Typography>
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
            <Typography variant="subtitle1" sx={{ mt: 1, mb: 1 }}>Actions</Typography>
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

          {/* Analytics */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" gutterBottom>Analytics</Typography>
            <Typography variant="subtitle1" sx={{ mt: 1, mb: 1 }}>Pages</Typography>
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
            <Typography variant="subtitle1" sx={{ mt: 1, mb: 1 }}>Actions</Typography>
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