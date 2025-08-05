import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Box,
  IconButton,
  InputBase,
  Switch, 
  Typography
} from '@mui/material';
import { Search, Menu as MenuIcon } from '@mui/icons-material';
import Sidebar from './Sidebar';
import { useThemeContext } from '../context/ThemeContext';
import { Outlet } from 'react-router-dom';

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
        <Toolbar sx={{ display: 'flex', justifyContent: 'space-between' }}>
          {/* Left side: Menu button and Search box */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
            <IconButton
              color="inherit"
              onClick={handleDrawerToggle}
              sx={{ display: { sm: 'none' } }}
            >
              <MenuIcon />
            </IconButton>

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
          </Box>

          {/* Right side: Dark Mode Toggle */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              ml: 2,
            }}
          >
            <Typography variant="body2">Dark Mode</Typography>
            <Switch checked={mode === 'dark'} onChange={toggleTheme} />
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
      </Box>
    </Box>
  );
}