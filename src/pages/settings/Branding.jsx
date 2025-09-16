import React, { useEffect, useState, useCallback } from "react";
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TablePagination,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Menu,
  MenuItem,
  Alert,
} from "@mui/material";
import { PhotoCamera, Edit, Delete, MoreVert } from "@mui/icons-material";
import { toast } from "react-hot-toast";
import API from "../../api";
import { useSearch } from "../../context/SearchContext";

const Branding = () => {
  const [preview, setPreview] = useState(null);
  const [brandColor, setBrandColor] = useState("#000000");
  const [brandingId, setBrandingId] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [openModal, setOpenModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
  const [newAnnouncement, setNewAnnouncement] = useState({ title: "", message: "" });
  const [loading, setLoading] = useState(false);
  const [canCreateAnnouncement, setCanCreateAnnouncement] = useState(false);
  const [canUpdateAnnouncement, setCanUpdateAnnouncement] = useState(false);
  const [canDeleteAnnouncement, setCanDeleteAnnouncement] = useState(false);
  const [canViewAnnouncements, setCanViewAnnouncements] = useState(true);
  const [canViewBranding, setCanViewBranding] = useState(true);
  const [canCreateBranding, setCanCreateBranding] = useState(false);
  const [canUpdateBranding, setCanUpdateBranding] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);

  // Use search context
  const { search, setSearch } = useSearch();

  // Check permissions for actions and branding
  const checkPermissions = useCallback(async () => {
    try {
      const [createAnnouncementRes, updateAnnouncementRes, deleteAnnouncementRes, createBrandingRes, updateBrandingRes] = await Promise.all([
        API.get("/auth/permissions/action/create_announcement/"),
        API.get("/auth/permissions/action/update_announcement/"),
        API.get("/auth/permissions/action/delete_announcement/"),
        API.get("/auth/permissions/action/create_branding/"),
        API.get("/auth/permissions/action/update_branding/"),
      ]);
      console.log("Permissions response:", {
        createAnnouncement: createAnnouncementRes.data,
        updateAnnouncement: updateAnnouncementRes.data,
        deleteAnnouncement: deleteAnnouncementRes.data,
        createBranding: createBrandingRes.data,
        updateBranding: updateBrandingRes.data,
      });
      setCanCreateAnnouncement(createAnnouncementRes.data.allowed || false);
      setCanUpdateAnnouncement(updateAnnouncementRes.data.allowed || false);
      setCanDeleteAnnouncement(deleteAnnouncementRes.data.allowed || false);
      setCanCreateBranding(createBrandingRes.data.allowed || false);
      setCanUpdateBranding(updateBrandingRes.data.allowed || false);
    } catch (err) {
      console.error("Error checking action permissions:", err.response?.data || err.message);
      if (err.response?.status === 403) {
        const message = err.response.data.reason || "Requires admin role to perform actions";
        if (err.response.config.url.includes("create_announcement")) {
          toast.error("Requires admin role to create announcement");
        } else if (err.response.config.url.includes("update_announcement")) {
          toast.error("Requires admin role to update announcement");
        } else if (err.response.config.url.includes("delete_announcement")) {
          toast.error("Requires admin role to delete announcement");
        } else if (err.response.config.url.includes("create_branding")) {
          toast.error("Requires admin role to create branding");
        } else if (err.response.config.url.includes("update_branding")) {
          toast.error("Requires admin role to update branding");
        } else {
          toast.error(message);
        }
      } else {
        toast.error("Failed to check permissions");
      }
    }
  }, []);

  // Fetch branding data with view permission check
  const fetchBranding = useCallback(async () => {
    setLoading(true);
    try {
      // Check view permission for branding
      await API.get("/auth/permissions/page/branding/");
      setCanViewBranding(true);

      const res = await API.get("settings/company-branding/");
      if (res.data.results?.length > 0) {
        const branding = res.data.results[0];
        setBrandingId(branding.id);
        setPreview(branding.logo);
        setBrandColor(branding.primary_color || "#000000");
      }
    } catch (err) {
      console.error("Error fetching branding:", err.response?.data || err.message);
      if (err.response?.status === 403) {
        setCanViewBranding(false);
        toast.error(err.response.data.reason || "Requires admin role to view branding");
      } else {
        toast.error(err.response?.data?.detail || "Failed to load branding");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch announcements with view permission check
  const fetchAnnouncements = useCallback(async () => {
    setLoading(true);
    try {
      await API.get("/auth/permissions/page/announcement/");
      setCanViewAnnouncements(true);

      const res = await API.get("settings/announcements/", {
        params: { search, page: page + 1, page_size: rowsPerPage },
      });
      console.log("Announcements API response:", res.data);
      let data = [];
      let count = 0;
      if (Array.isArray(res.data.results)) {
        data = res.data.results;
        count = res.data.count || 0;
      } else if (Array.isArray(res.data)) {
        data = res.data;
        count = res.data.length;
      } else {
        console.error("Invalid response format:", res.data);
        toast.error("Invalid data received from server");
        data = [];
        count = 0;
      }
      setAnnouncements(data);
      setTotalCount(count);
      if (data.length === 0 && search.trim()) {
        toast.error("No announcements found for your search");
      } else if (data.length === 0) {
        toast.error("No announcements available");
      }
    } catch (err) {
      console.error("Error fetching announcements:", {
        status: err.response?.status,
        data: err.response?.data,
        message: err.message,
      });
      if (err.response?.status === 403) {
        setCanViewAnnouncements(false);
        toast.error(err.response.data.reason || "Requires admin role to view announcements");
      } else {
        toast.error(err.response?.data?.detail || "Failed to load announcements");
        setAnnouncements([]);
        setTotalCount(0);
      }
    } finally {
      setLoading(false);
    }
  }, [search, page, rowsPerPage]);

  // Handle search input change
  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    setPage(0);
  };

  // Initial data loading
 useEffect(() => {
    fetchBranding();
    checkPermissions();
    fetchAnnouncements();
  }, [fetchBranding, checkPermissions, fetchAnnouncements]);

  
  // Logo upload with permission check
  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) {
      toast.error("Please select a file");
      return;
    }

    if (!brandingId && !canCreateBranding) {
      toast.error("Requires admin role to create branding");
      return;
    }
    if (brandingId && !canUpdateBranding) {
      toast.error("Requires admin role to update branding");
      return;
    }

    const formData = new FormData();
    formData.append("logo", file);
    formData.append("name", "Company Branding");
    formData.append("primary_color", brandColor);
    formData.append("secondary_color", "#000000");

    try {
      const method = brandingId ? API.patch : API.post;
      const url = brandingId ? `settings/company-branding/${brandingId}/` : "settings/company-branding/";
      
      await method(url, formData, { 
        headers: { 
          "Content-Type": "multipart/form-data",
        },
      });
      
      toast.success(`Logo ${brandingId ? "updated" : "uploaded"} successfully`);
      setPreview(URL.createObjectURL(file));
      fetchBranding();
    } catch (err) {
      console.error("Error uploading logo:", err.response?.data || err.message);
      if (err.response?.status === 403) {
        toast.error(err.response.data.reason || `Requires admin role to ${brandingId ? "update" : "create"} branding`);
      } else {
        toast.error(err.response?.data?.detail || "Failed to upload logo");
      }
    }
  };

  // Color update with permission check
  const handleColorUpdate = async () => {
    if (!brandingId) {
      toast.error("Please upload a logo first");
      return;
    }
    if (!canUpdateBranding) {
      toast.error("Requires admin role to update branding");
      return;
    }
    try {
      await API.patch(
        `settings/company-branding/${brandingId}/`, 
        { primary_color: brandColor }
      );
      toast.success("Color updated successfully");
    } catch (err) {
      console.error("Error updating color:", err.response?.data || err.message);
      if (err.response?.status === 403) {
        toast.error(err.response.data.reason || "Requires admin role to update branding");
      } else {
        toast.error(err.response?.data?.detail || "Failed to update color");
      }
    }
  };

  const handleCreateAnnouncement = async () => {
    if (!newAnnouncement.title.trim()) {
      toast.error("Announcement title cannot be empty");
      return;
    }
    
    setLoading(true);
    try {
      const res = await API.post("settings/announcements/", newAnnouncement);
      console.log("Announcement creation response:", res.data);
      toast.success("Announcement created successfully");
      setOpenModal(false);
      setNewAnnouncement({ title: "", message: "" });
      fetchAnnouncements();
    } catch (err) {
      console.error("Error creating announcement:", {
        status: err.response?.status,
        data: err.response?.data,
        message: err.message,
      });
      if (err.response?.status === 403) {
        toast.error(err.response.data.reason || "Requires admin role to create announcement");
      } else {
        toast.error(err.response?.data?.detail || "Failed to create announcement");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateAnnouncement = async () => {
    if (!selectedAnnouncement?.title.trim()) {
      toast.error("Announcement title cannot be empty");
      return;
    }
    
    setLoading(true);
    try {
      const res = await API.put(`settings/announcements/${selectedAnnouncement.id}/`, selectedAnnouncement);
      console.log("Announcement update response:", res.data);
      toast.success("Announcement updated successfully");
      setEditModal(false);
      setSelectedAnnouncement(null);
      fetchAnnouncements();
    } catch (err) {
      console.error("Error updating announcement:", {
        status: err.response?.status,
        data: err.response?.data,
        message: err.message,
      });
      if (err.response?.status === 403) {
        toast.error(err.response.data.reason || "Requires admin role to update announcement");
      } else {
        toast.error(err.response?.data?.detail || "Failed to update announcement");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAnnouncement = async () => {
    if (!selectedAnnouncement) return;
    
    setLoading(true);
    try {
      const res = await API.delete(`settings/announcements/${selectedAnnouncement.id}/`);
      console.log("Announcement delete response:", res.data);
      toast.success("Announcement deleted successfully");
      setDeleteModal(false);
      setSelectedAnnouncement(null);
      fetchAnnouncements();
    } catch (err) {
      console.error("Error deleting announcement:", {
        status: err.response?.status,
        data: err.response?.data,
        message: err.message,
      });
      if (err.response?.status === 403) {
        toast.error(err.response.data.reason || "Requires admin role to delete announcement");
      } else {
        toast.error(err.response?.data?.detail || "Failed to delete announcement");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleMenuOpen = (event, announcement) => {
    setAnchorEl(event.currentTarget);
    setSelectedAnnouncement(announcement);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleEditClick = () => {
    setEditModal(true);
    handleMenuClose();
  };

  const handleDeleteClick = () => {
    setDeleteModal(true);
    handleMenuClose();
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>Company Branding</Typography>

      {/* Branding section */}
      {canViewBranding ? (
        <>
          <Box sx={{ position: "relative", height: 200, bgcolor: "#f5f5f5", borderRadius: 2, mb: 3, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {preview ? (
              <img src={preview} alt="Company Logo" style={{ maxHeight: "100%", maxWidth: "100%", objectFit: "contain", borderRadius: "50%" }} />
            ) : (
              <Typography variant="h6" color="textSecondary">No Logo Uploaded</Typography>
            )}
            <Box sx={{ position: "absolute", bottom: 10, right: 10 }}>
              <input 
                accept="image/*" 
                style={{ display: "none" }} 
                id="upload-logo" 
                type="file" 
                onChange={handleLogoUpload} 
                disabled={!(brandingId ? canUpdateBranding : canCreateBranding) || loading}
              />
              <label htmlFor="upload-logo">
                <IconButton 
                  color="primary" 
                  component="span" 
                  sx={{ bgcolor: "white", "&:hover": { bgcolor: "#eee" } }} 
                  disabled={!(brandingId ? canUpdateBranding : canCreateBranding) || loading}
                >
                  <PhotoCamera />
                </IconButton>
              </label>
            </Box>
          </Box>

          <Box sx={{ mb: 4, display: "flex", alignItems: "center", gap: 2 }}>
            <Typography variant="h6">Brand Color</Typography>
            <input
              type="color"
              value={brandColor}
              onChange={(e) => setBrandColor(e.target.value)}
              style={{ width: 60, height: 40, border: "none", cursor: "pointer" }}
              disabled={!canUpdateBranding || loading}
            />
            <TextField
              size="small"
              value={brandColor}
              onChange={(e) => setBrandColor(e.target.value)}
              sx={{ width: 120 }}
              disabled={!canUpdateBranding || loading}
            />
            <Button 
              variant="contained" 
              onClick={handleColorUpdate} 
              disabled={!canUpdateBranding || loading}
            >
              Update
            </Button>
          </Box>
        </>
      ) : (
        <Box sx={{ p: 3, textAlign: "center" }}>
          <Typography color="error">Requires admin role to view branding</Typography>
        </Box>
      )}

      {/* Announcements section */}
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
        <Typography variant="h5">Announcements</Typography>
        {canViewAnnouncements && (
          <Box sx={{ display: "flex", gap: 2 }}>
            <TextField
              size="small"
              placeholder="Search announcements..."
              value={search}
              onChange={handleSearchChange}
              disabled={loading}
            />
            {canCreateAnnouncement && (
              <Button variant="contained" onClick={() => setOpenModal(true)} disabled={loading}>
                + Create Announcement
              </Button>
            )}
          </Box>
        )}
      </Box>

      {canViewAnnouncements ? (
        <>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Title</TableCell>
                <TableCell>Message</TableCell>
                <TableCell>Created By</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {announcements.map((announcement) => (
                <TableRow key={announcement.id}>
                  <TableCell>{announcement.title}</TableCell>
                  <TableCell>
                    {announcement.message?.length > 100 ? `${announcement.message.substring(0, 100)}...` : announcement.message}
                  </TableCell>
                  <TableCell>{announcement.created_by || "Unknown"}</TableCell>
                  <TableCell>{new Date(announcement.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <IconButton onClick={(e) => handleMenuOpen(e, announcement)} disabled={!canUpdateAnnouncement && !canDeleteAnnouncement}>
                      <MoreVert />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {announcements.length === 0 && (
            <Box sx={{ p: 3, textAlign: "center" }}>
              <Typography color="textSecondary">No announcements found</Typography>
            </Box>
          )}

          <TablePagination
            component="div"
            count={totalCount}
            page={page}
            onPageChange={(e, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
          />
        </>
      ) : (
        <Box sx={{ p: 3, textAlign: "center" }}>
          <Typography color="error">Requires admin role to view announcements</Typography>
        </Box>
      )}

      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
        {canUpdateAnnouncement && (
          <MenuItem onClick={handleEditClick}><Edit sx={{ mr: 1 }} /> Edit</MenuItem>
        )}
        {canDeleteAnnouncement && (
          <MenuItem onClick={handleDeleteClick} sx={{ color: "error.main" }}><Delete sx={{ mr: 1 }} /> Delete</MenuItem>
        )}
      </Menu>

      <Dialog open={openModal} onClose={() => setOpenModal(false)} fullWidth maxWidth="md">
        <DialogTitle>Create Announcement</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Title"
            margin="normal"
            value={newAnnouncement.title}
            onChange={(e) => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })}
            disabled={loading}
          />
          <TextField
            fullWidth
            label="Message"
            margin="normal"
            multiline
            rows={4}
            value={newAnnouncement.message}
            onChange={(e) => setNewAnnouncement({ ...newAnnouncement, message: e.target.value })}
            disabled={loading}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenModal(false)} disabled={loading}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateAnnouncement} disabled={loading}>
            {loading ? "Creating..." : "Create"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={editModal} onClose={() => setEditModal(false)} fullWidth maxWidth="md">
        <DialogTitle>Edit Announcement</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Title"
            margin="normal"
            value={selectedAnnouncement?.title || ""}
            onChange={(e) => setSelectedAnnouncement({ ...selectedAnnouncement, title: e.target.value })}
            disabled={loading}
          />
          <TextField
            fullWidth
            label="Message"
            margin="normal"
            multiline
            rows={4}
            value={selectedAnnouncement?.message || ""}
            onChange={(e) => setSelectedAnnouncement({ ...selectedAnnouncement, message: e.target.value })}
            disabled={loading}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditModal(false)} disabled={loading}>Cancel</Button>
          <Button variant="contained" onClick={handleUpdateAnnouncement} disabled={loading}>
            {loading ? "Updating..." : "Update"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteModal} onClose={() => setDeleteModal(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>This action cannot be undone</Alert>
          <Typography><strong>Title:</strong> {selectedAnnouncement?.title}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteModal(false)} disabled={loading}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDeleteAnnouncement} disabled={loading}>
            {loading ? "Deleting..." : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default Branding;