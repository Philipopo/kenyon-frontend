import React, { useState, useEffect, useCallback } from 'react';
import {
  AppBar,
  Toolbar,
  Box,
  IconButton,
  InputBase,
  Typography,
  Badge,
  Drawer,
  List,
  ListItem,
  ListItemText,
  Divider,
  Button,
  CircularProgress
} from '@mui/material';
import { Search, Menu as MenuIcon, LocationOn, Notifications as NotificationsIcon } from '@mui/icons-material';
import { Brightness4, Brightness7 } from '@mui/icons-material';
import { toast } from 'react-hot-toast';
import Sidebar from './Sidebar';
import { useThemeContext } from '../context/ThemeContext';
import { useSearch } from '../context/SearchContext';
import { Outlet } from 'react-router-dom';
import API from '../api';
import logo from '../assets/kenyon_logo-removebg-preview.png';
import ChatWidget from '../widget/ChatWidget';
import dayjs from 'dayjs';

const drawerWidth = 280;

export default function DashboardLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { mode, toggleTheme } = useThemeContext();
  const { searchTerm, setSearchTerm } = useSearch();
  const [userProfile, setUserProfile] = useState({ full_name: '', state: 'Lagos' });
  const [brandingLogo, setBrandingLogo] = useState(null);
  const [brandingColor, setBrandingColor] = useState(null);
  const [canViewBranding, setCanViewBranding] = useState(false);
  
  // ✅ Notification state
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [loadingNotifications, setLoadingNotifications] = useState(false);

  // Fetch user profile
  const fetchUserProfile = async () => {
    try {
      const response = await API.get('/auth/profile/', {
        headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
      });
      setUserProfile({
        full_name: response.data.full_name || response.data.name || response.data.email.split('@')[0],
        state: response.data.state || 'Lagos',
      });
    } catch (error) {
      console.error('Error fetching user profile:', error.response || error);
      setUserProfile({ full_name: 'User', state: 'Lagos' });
    }
  };

  // Fetch branding
  const fetchBranding = async () => {
    try {
      await API.get('/auth/permissions/page/branding/', {
        headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
      });
      setCanViewBranding(true);
      const response = await API.get('/settings/company-branding/', {
        headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
      });
      if (response.data.results?.length > 0) {
        const branding = response.data.results[0];
        setBrandingLogo(branding.logo);
        setBrandingColor(branding.primary_color || '#212121');
      }
    } catch (error) {
      if (error.response?.status === 403) {
        setCanViewBranding(false);
      }
      setBrandingLogo(null);
      setBrandingColor(null);
    }
  };

  // ✅ Fetch unread notification count
  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await API.get('/rentals/notifications/', {
        params: { is_read: false },
        headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
      });
      setUnreadCount(res.data.count || 0);
    } catch (err) {
      console.error('Failed to fetch unread count:', err);
    }
  }, []);

  // ✅ Fetch all notifications
  const fetchNotifications = async () => {
    try {
      setLoadingNotifications(true);
      const res = await API.get('/rentals/notifications/', {
        headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
      });
      setNotifications(res.data.results || []);
    } catch (err) {
      toast.error('Failed to load notifications');
      console.error(err);
    } finally {
      setLoadingNotifications(false);
    }
  };

  // ✅ Mark notification as read
  const markAsRead = async (id) => {
    try {
      await API.post(`/rentals/notifications/${id}/mark_as_read/`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
      });
      setNotifications(notifications.map(n => n.id === id ? { ...n, is_read: true } : n));
      fetchUnreadCount(); // Update badge
    } catch (err) {
      toast.error('Failed to mark as read');
    }
  };

  // ✅ Mark all as read
  const markAllAsRead = async () => {
    try {
      await API.post('/rentals/notifications/mark_all_as_read/', {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
      });
      setNotifications(notifications.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
      setNotificationsOpen(false);
    } catch (err) {
      toast.error('Failed to mark all as read');
    }
  };

  // Initial fetch + auto-refresh
  useEffect(() => {
    fetchUserProfile();
    fetchBranding();
    fetchUnreadCount();
    
    const interval = setInterval(() => {
      fetchUnreadCount();
    }, 30000); // Poll every 30 seconds

    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  // Handle notification drawer open
  const handleNotificationsOpen = async () => {
    await fetchNotifications();
    setNotificationsOpen(true);
  };

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
          backgroundColor: canViewBranding && brandingColor
            ? brandingColor
            : (mode === 'dark' ? '#424242' : '#212121'),
        }}
      >
        <Toolbar>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              width: '100%',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <img
                src={canViewBranding && brandingLogo ? brandingLogo : logo}
                alt="Company Logo"
                style={{
                  width: 40,
                  height: 40,
                  objectFit: 'contain',
                }}
              />
              <IconButton
                color="inherit"
                onClick={handleDrawerToggle}
                sx={{ display: { sm: 'none' } }}
              >
                <MenuIcon />
              </IconButton>
            </Box>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                backgroundColor: 'rgba(255,255,255,0.15)',
                borderRadius: 1,
                width: '100%',
                maxWidth: 500,
                px: 2,
              }}
            >
              <Search sx={{ mr: 1 }} />
              <InputBase
                placeholder="Search…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                sx={{
                  color: '#fff',
                  width: '100%',
                  '& .MuiInputBase-input': {
                    py: 1,
                  },
                }}
              />
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {/* ✅ Notification Badge */}
              <Badge badgeContent={unreadCount} color="error">
                <IconButton onClick={handleNotificationsOpen} sx={{ color: '#fff' }}>
                  <NotificationsIcon />
                </IconButton>
              </Badge>

              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  px: 1.5,
                  py: 0.5,
                  borderRadius: 2,
                  bgcolor: 'rgba(255,255,255,0.15)',
                  color: '#fff',
                  fontSize: 13,
                  fontWeight: 500,
                }}
              >
                <LocationOn sx={{ fontSize: 18 }} />
                <Typography variant="body2">
                  {userProfile.state}
                </Typography>
              </Box>
              <IconButton onClick={toggleTheme} sx={{ color: '#fff' }}>
                {mode === 'dark' ? <Brightness7 /> : <Brightness4 />}
              </IconButton>
            </Box>
          </Box>
        </Toolbar>
      </AppBar>

      <Sidebar mobileOpen={mobileOpen} handleDrawerToggle={handleDrawerToggle} />

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          mt: 8,
          height: 'calc(100vh - 64px)',
          overflow: 'auto',
        }}
      >
        <Outlet />
        <ChatWidget />
      </Box>

      {/* ✅ Notification Drawer */}
      <Drawer
        anchor="right"
        open={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        sx={{ zIndex: 1300 }}
      >
        <Box sx={{ width: 400, p: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Notifications</Typography>
            {notifications.length > 0 && (
              <Button size="small" onClick={markAllAsRead}>
                Mark All as Read
              </Button>
            )}
          </Box>

          {loadingNotifications ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : notifications.length > 0 ? (
            <List>
              {notifications.map((n) => (
                <React.Fragment key={n.id}>
                  <ListItem
                    sx={{
                      bgcolor: n.is_read ? 'transparent' : 'rgba(255,223,0,0.1)',
                      borderLeft: n.severity === 'CRITICAL' ? '4px solid red' :
                                 n.severity === 'WARNING' ? '4px solid orange' : 'none',
                      mb: 1,
                      borderRadius: 1
                    }}
                  >
                    <ListItemText
                      primary={n.title}
                      secondary={
                        <>
                          <Typography component="span" variant="body2" color="textSecondary">
                            {n.message}
                          </Typography>
                          <br />
                          <Typography component="span" variant="caption" color="textSecondary">
                            {dayjs(n.created_at).format('DD/MM/YYYY HH:mm')}
                          </Typography>
                        </>
                      }
                    />
                    {!n.is_read && (
                      <Button size="small" onClick={() => markAsRead(n.id)}>
                        Mark Read
                      </Button>
                    )}
                    {n.rental_code && (
                      <Button
                        size="small"
                        onClick={() => {
                          window.location.href = `/rentals/active/?search=${n.rental_code}`;
                          setNotificationsOpen(false);
                        }}
                        sx={{ ml: 1 }}
                      >
                        View Rental
                      </Button>
                    )}
                  </ListItem>
                  <Divider />
                </React.Fragment>
              ))}
            </List>
          ) : (
            <Typography color="textSecondary">No notifications</Typography>
          )}
        </Box>
      </Drawer>
    </Box>
  );
}