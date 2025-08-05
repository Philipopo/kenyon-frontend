import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Box,
  IconButton,
  InputBase,
} from '@mui/material';
import { Search, Menu as MenuIcon } from '@mui/icons-material';
import { Brightness4, Brightness7, LocationOn } from '@mui/icons-material';
import Sidebar from './Sidebar';
import { useThemeContext } from '../context/ThemeContext';
import { Outlet } from 'react-router-dom';
import logo from '../assets/kenyon_logo-removebg-preview.png';
import ChatWidget from '../widget/ChatWidget';


const drawerWidth = 280;

export default function DashboardLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { mode, toggleTheme } = useThemeContext();

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* AppBar */}
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
          backgroundColor: mode === 'dark' ? '#424242' : '#212121',
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
            {/* Left: Logo & Menu button (for mobile) */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <img
                src={logo}
                alt="Kenyon Logo"
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

            {/* Center: Search box */}
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
                sx={{
                  color: '#fff',
                  width: '100%',
                  '& .MuiInputBase-input': {
                    py: 1,
                  },
                }}
              />
            </Box>

            {/* Right: Location Chip + Theme Toggle */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {/* Location Chip */}
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
                Lagos
              </Box>

              {/* Dark Mode Toggle Icon */}
              <IconButton onClick={toggleTheme} sx={{ color: '#fff' }}>
                {mode === 'dark' ? <Brightness7 /> : <Brightness4 />}
              </IconButton>
            </Box>
          </Box>
        </Toolbar>
      </AppBar>


      {/* Sidebar */}
      <Sidebar mobileOpen={mobileOpen} handleDrawerToggle={handleDrawerToggle} />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          mt: 8,
          height: 'calc(100vh - 64px)',
          overflow: 'auto'
        }}
      >
        <Outlet />
        <ChatWidget />
      </Box>
    </Box>
  );
}