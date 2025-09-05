// src/pages/inventory/Stocks.jsx
import React, { useState, useEffect } from "react";
import {
  Container, Paper, Box, Typography, Button, TextField, InputAdornment, Table, TableHead,
  TableRow, TableCell, TableBody, TableContainer, Pagination, Dialog, DialogTitle,
  DialogContent, DialogContentText, DialogActions, Grid, Alert, FormControlLabel, Checkbox,
  IconButton,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import API from "../../api";

export default function Stocks() {
  const [stocks, setStocks] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [openDialog, setOpenDialog] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [editId, setEditId] = useState(null);
  const [formData, setFormData] = useState({
    item: "", category: "", quantity: "", location: "", critical: false,
  });
  const [loading, setLoading] = useState(true);
  const [checkingPermissions, setCheckingPermissions] = useState(true);
  const [hasPermission, setHasPermission] = useState(false);
  const [hasUpdatePermission, setHasUpdatePermission] = useState(false);
  const [hasDeletePermission, setHasDeletePermission] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const itemsPerPage = 10;

  // Fetch stocks
  const fetchStocks = async () => {
    try {
      setLoading(true);
      const response = await API.get("inventory/stocks/");
      console.log("Stocks response:", response.data);
      setStocks(response.data || []);
    } catch (err) {
      console.error("Error fetching stocks:", err.response?.data || err.message);
      setError("❌ Failed to fetch stocks: " + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  // Permission check
  useEffect(() => {
    const checkPermissions = async () => {
      try {
        const token = localStorage.getItem("accessToken");
        console.log("Access token:", token);
        if (!token) {
          setError("⚠️ No authentication token found. Please log in.");
          setHasPermission(false);
          setCheckingPermissions(false);
          return;
        }
        const pageResponse = await API.get("/auth/permissions/page/stock_records/");
        console.log("Page permission response:", pageResponse.data);
        setHasPermission(pageResponse.data.allowed || false);
        if (!pageResponse.data.allowed) {
          setError(`⚠️ You do not have permission to view this page: ${pageResponse.data.reason || "No reason provided"}`);
          setCheckingPermissions(false);
          return;
        }
        const [updateResponse, deleteResponse] = await Promise.all([
          API.get("/auth/permissions/action/update_stock_record/"),
          API.get("/auth/permissions/action/delete_stock_record/"),
        ]);
        setHasUpdatePermission(updateResponse.data.allowed || false);
        setHasDeletePermission(deleteResponse.data.allowed || false);
        fetchStocks();
      } catch (err) {
        console.error("Error checking permissions:", err.response?.data || err.message);
        if (err.response?.status === 401) {
          setError("⚠️ Authentication failed. Please log in again.");
        } else if (err.response?.status === 404) {
          setError("⚠️ Permission endpoint not found. Contact support.");
        } else {
          setError(`⚠️ Failed to check permissions: ${err.response?.data?.detail || err.message}`);
        }
        setHasPermission(false);
      } finally {
        setCheckingPermissions(false);
      }
    };
    checkPermissions();
  }, []);

  // Handle search input change
  const handleSearchChange = (event) => {
    const query = event.target.value;
    setSearchQuery(query);
    setPage(1);
  };

  // Handle page change
  const handlePageChange = (event, value) => {
    setPage(value);
  };

  // Handle dialog open/close
  const handleOpenDialog = async (stock = null) => {
    if (!hasPermission) {
      setError("⚠️ You do not have permission to view stock records.");
      return;
    }
    try {
      const action = stock ? "update_stock_record" : "create_stock_record";
      const actionResponse = await API.get(`/auth/permissions/action/${action}/`);
      console.log(`${action} permission response:`, actionResponse.data);
      if (!actionResponse.data.allowed) {
        setError(`⚠️ You do not have permission to ${stock ? "update" : "create"} stock records: ${actionResponse.data.reason || "No reason provided"}`);
        return;
      }
      if (stock) {
        setFormData({ ...stock, quantity: stock.quantity.toString() });
        setEditId(stock.id);
      } else {
        setFormData({ item: "", category: "", quantity: "", location: "", critical: false });
        setEditId(null);
      }
      setOpenDialog(true);
    } catch (err) {
      console.error(`Error checking ${stock ? "update" : "create"} permission:`, err.response?.data || err.message);
      setError(`❌ Failed to check ${stock ? "update" : "create"} permission: ${err.response?.data?.detail || err.message}`);
    }
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setFormData({ item: "", category: "", quantity: "", location: "", critical: false });
    setEditId(null);
    setError("");
    setSuccess("");
  };

  const handleDeleteOpen = (id) => {
    if (!hasDeletePermission) {
      setError("⚠️ You do not have permission to delete stock records.");
      return;
    }
    setDeleteId(id);
    setDeleteOpen(true);
  };

  const handleDeleteClose = () => {
    setDeleteOpen(false);
    setDeleteId(null);
    setError("");
    setSuccess("");
  };

  // Handle form input change
  const handleFormChange = (event) => {
    const { name, value, type, checked } = event.target;
    setFormData({ ...formData, [name]: type === "checkbox" ? checked : value });
  };

  // Handle form submission
  const handleFormSubmit = async () => {
    const { item, category, quantity, location } = formData;
    if (!item || !category || !quantity || !location) {
      setError("⚠️ Please fill in all required fields.");
      return;
    }
    if (Number(quantity) <= 0) {
      setError("⚠️ Quantity must be a positive number.");
      return;
    }
    try {
      const payload = {
        item: formData.item.trim(),
        category: formData.category.trim(),
        quantity: Number(formData.quantity),
        location: formData.location.trim(),
        critical: formData.critical,
      };
      if (editId) {
        await API.patch(`inventory/stocks/${editId}/`, payload);
        setSuccess("✅ Stock record updated successfully");
      } else {
        await API.post("/inventory/stocks/", payload);
        setSuccess("✅ Stock record created successfully");
      }
      fetchStocks();
      handleCloseDialog();
    } catch (err) {
      console.error(`${editId ? "Updating" : "Adding"} stock error:`, err.response?.data || err.message);
      let errorMsg = `Failed to ${editId ? "update" : "add"} stock: Unable to process request.`;
      if (err.response?.status === 403) {
        errorMsg = `⚠️ Permission denied: ${err.response.data.detail || "You lack permission to perform this action."}`;
      } else if (err.response?.status === 400 && err.response?.data) {
        errorMsg = Object.entries(err.response.data)
          .map(([field, msg]) => `${field}: ${Array.isArray(msg) ? msg.join(", ") : msg}`)
          .join("; ");
      } else if (err.response?.data?.detail) {
        errorMsg = err.response.data.detail;
      } else {
        errorMsg = err.message || `Failed to ${editId ? "update" : "add"} stock: Network error.`;
      }
      setError(`❌ ${errorMsg}`);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    try {
      await API.delete(`inventory/stocks/${deleteId}/`);
      setSuccess("✅ Stock record deleted successfully");
      setDeleteOpen(false);
      setDeleteId(null);
      fetchStocks();
    } catch (err) {
      console.error("Error deleting stock:", err.response?.data || err.message);
      let errorMsg = "Failed to delete stock: Unable to process request.";
      if (err.response?.status === 403) {
        errorMsg = `⚠️ Permission denied: ${err.response.data.detail || "You lack permission to delete stock records."}`;
      } else if (err.response?.data?.detail) {
        errorMsg = err.response.data.detail;
      } else {
        errorMsg = err.message || "Failed to delete stock: Network error.";
      }
      setError(`❌ ${errorMsg}`);
    }
  };

  // Filter and paginate stocks
  const filteredStocks = stocks.filter((stock) =>
    Object.values(stock).some(
      (val) => typeof val === "string" && val.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );
  const paginatedStocks = filteredStocks.slice((page - 1) * itemsPerPage, page * itemsPerPage);
  const totalPages = Math.ceil(filteredStocks.length / itemsPerPage);

  // Render loading state
  if (checkingPermissions) {
    return (
      <Container>
        <Typography variant="h6" sx={{ mt: 4 }}>
          Loading permissions...
        </Typography>
      </Container>
    );
  }

  // Render no permission state
  if (!hasPermission) {
    return (
      <Container>
        <Alert severity="error" sx={{ mt: 4 }} onClose={() => setError("")}>
          {error || "⚠️ You do not have permission to view this page."}
        </Alert>
      </Container>
    );
  }

  // Main render
  return (
    <Container sx={{ mt: 4 }}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess("")}>
          {success}
        </Alert>
      )}
      <Paper sx={{ p: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h5">Stock Records</Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog()}>
            Add Stock
          </Button>
        </Box>

        <TextField
          placeholder="Search..."
          value={searchQuery}
          onChange={handleSearchChange}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ mb: 2, width: "300px" }}
        />

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Item Name</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Quantity</TableCell>
                <TableCell>Location</TableCell>
                <TableCell>Critical</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : paginatedStocks.length > 0 ? (
                paginatedStocks.map((stock) => (
                  <TableRow key={stock.id}>
                    <TableCell>{stock.item}</TableCell>
                    <TableCell>{stock.category}</TableCell>
                    <TableCell>{stock.quantity}</TableCell>
                    <TableCell>{stock.location}</TableCell>
                    <TableCell>{stock.critical ? "Yes" : "No"}</TableCell>
                    <TableCell>
                      <IconButton onClick={() => handleOpenDialog(stock)} disabled={!hasUpdatePermission}>
                        <EditIcon />
                      </IconButton>
                      <IconButton onClick={() => handleDeleteOpen(stock.id)} disabled={!hasDeletePermission}>
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    No stock records found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <Box display="flex" justifyContent="center" mt={2}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={handlePageChange}
            color="primary"
          />
        </Box>
      </Paper>

      <Dialog open={openDialog} onClose={handleCloseDialog}>
        <DialogTitle>{editId ? "Update Stock" : "Add Stock"}</DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
              {error}
            </Alert>
          )}
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Item Name"
                name="item"
                value={formData.item}
                onChange={handleFormChange}
                required
                error={formData.item === "" && error.includes("required")}
                helperText={formData.item === "" && error.includes("required") ? "Item name is required" : ""}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Category"
                name="category"
                value={formData.category}
                onChange={handleFormChange}
                required
                error={formData.category === "" && error.includes("required")}
                helperText={formData.category === "" && error.includes("required") ? "Category is required" : ""}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Quantity"
                name="quantity"
                type="number"
                value={formData.quantity}
                onChange={handleFormChange}
                required
                error={formData.quantity === "" && error.includes("required")}
                helperText={formData.quantity === "" && error.includes("required") ? "Quantity is required" : ""}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Location"
                name="location"
                value={formData.location}
                onChange={handleFormChange}
                required
                error={formData.location === "" && error.includes("required")}
                helperText={formData.location === "" && error.includes("required") ? "Location is required" : ""}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Checkbox
                    name="critical"
                    checked={formData.critical}
                    onChange={handleFormChange}
                  />
                }
                label="Critical"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button variant="contained" onClick={handleFormSubmit}>
            {editId ? "Update" : "Save"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteOpen} onClose={handleDeleteClose}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Action cannot be reversed, are you sure you want to continue?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteClose}>Cancel</Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}