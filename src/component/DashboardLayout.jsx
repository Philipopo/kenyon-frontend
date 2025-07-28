import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Box,
  IconButton,
  InputBase
} from '@mui/material';
import { Search, Menu as MenuIcon } from '@mui/icons-material';
import Sidebar from './Sidebar';
import { useThemeContext } from '../context/ThemeContext';
import { Outlet } from 'react-router-dom';

const drawerWidth = 280;

export default function DashboardLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { mode } = useThemeContext();

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
          <IconButton
            color="inherit"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center',
            backgroundColor: 'rgba(255,255,255,0.15)',
            borderRadius: 1,
            width: '100%',
            px: 2
          }}>
            <Search sx={{ mr: 1 }} />
            <InputBase 
              placeholder="Search…" 
              sx={{ 
                color: '#fff', 
                width: '100%',
                '& .MuiInputBase-input': {
                  py: 1
                }
              }} 
            />
          </Box>
        </Toolbar>
      </AppBar>

      {/* Sidebar */}
      <Sidebar mobileOpen={mobileOpen} handleDrawerToggle={handleDrawerToggle} />

      {/* Main Content */}
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