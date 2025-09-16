import React, { useState, useEffect } from 'react';
import {
  AppBar,
  Toolbar,
  Box,
  IconButton,
  InputBase,
  Typography,
} from '@mui/material';
import { Search, Menu as MenuIcon, LocationOn } from '@mui/icons-material';
import { Brightness4, Brightness7 } from '@mui/icons-material';
import { toast } from 'react-hot-toast';
import Sidebar from './Sidebar';
import { useThemeContext } from '../context/ThemeContext';
import { useSearch } from '../context/SearchContext';
import { Outlet } from 'react-router-dom';
import API from '../api';
import logo from '../assets/kenyon_logo-removebg-preview.png';
import ChatWidget from '../widget/ChatWidget';

const drawerWidth = 280;

export default function DashboardLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { mode, toggleTheme } = useThemeContext();
  const { searchTerm, setSearchTerm } = useSearch();
  const [userProfile, setUserProfile] = useState({ full_name: '', state: 'Lagos' });
  const [brandingLogo, setBrandingLogo] = useState(null);
  const [brandingColor, setBrandingColor] = useState(null);
  const [canViewBranding, setCanViewBranding] = useState(false); // Initialize as false

  // Fetch user profile (unchanged)
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

  // Fetch branding data
  const fetchBranding = async () => {
    try {
      // Check permission to view branding
      await API.get('/auth/permissions/page/branding/', {
        headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
      });
      setCanViewBranding(true); // User has permission

      // Fetch branding data
      const response = await API.get('/settings/company-branding/', {
        headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
      });
      if (response.data.results?.length > 0) {
        const branding = response.data.results[0];
        setBrandingLogo(branding.logo);
        setBrandingColor(branding.primary_color || '#212121');
      } else {
        // No branding data, use fallbacks
        setBrandingLogo(null);
        setBrandingColor(null);
      }
    } catch (error) {
      console.error('Error fetching branding:', error.response || error);
      if (error.response?.status === 403) {
        setCanViewBranding(false); // No permission
        toast.error(error.response.data.reason || 'Requires admin role to view branding');
      } else {
        toast.error(error.response?.data?.detail || 'Failed to load branding');
      }
      // Use fallbacks on error
      setBrandingLogo(null);
      setBrandingColor(null);
    }
  };

  useEffect(() => {
    fetchUserProfile();
    fetchBranding();
    window.addEventListener('profileUpdated', fetchUserProfile);
    return () => window.removeEventListener('profileUpdated', fetchUserProfile);
  }, []);

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
    </Box>
  );
}