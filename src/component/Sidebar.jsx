import API from '../api'; // Make sure this is imported wherever you're using the handler
import React, { useEffect, useState, useRef } from 'react';
import logo from '../static images/kenyon_logo-removebg-preview (1).png';
import {
  Box,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Switch,
  Typography,
  Divider,
  Collapse,
  Avatar,
  
} from '@mui/material';
import { 
  Dashboard,
  Inventory,
  Settings,
  DarkMode,
  Warehouse,
  Receipt,
  Timeline,
  Analytics,
  Warning,
  People,
  ExitToApp,
  ExpandLess,
  ExpandMore,
  StarBorder,
  AttachMoney,
  Assessment,
  Category,
  Description,
  PostAdd,
  Draw,
  Archive,
  Construction,
  ListAlt,
  Payment,
  CameraAlt

} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useThemeContext } from '../context/ThemeContext';





import axios from 'axios';


const DEFAULT_AVATAR = '/default_avatar.png'; // replace with actual path to default image


const drawerWidth = 280;

const menuItems = [
  {
    icon: <Dashboard />,
    text: 'Dashboard',
    path: '/dashboard',
    description: 'Overview of inventory metrics and quick actions'
  },
  {
    icon: <Inventory />,
    text: 'Inventory Management',
    subItems: [
      {
        text: 'Stock Tracking',
        path: '/dashboard/inventory/stock',
        description: 'Real-time stock levels across all locations'
      },
      {
        text: 'Item Master',
        path: '/dashboard/inventory/items',
        description: 'Manage manufacturer data, part numbers, and custom fields',
        icon: <StarBorder />
      },
      {
        text: 'Bin Locations',
        path: '/dashboard/inventory/bins',
        description: 'Automatic bin numbering (e.g., A1-R2-S3) and management',
        icon: <StarBorder />
      },
      {
        text: 'Expiry Tracking',
        path: '/dashboard/inventory/expiry',
        description: 'Manufacturing/expiry dates with alerts',
        icon: <StarBorder />
      }
    ]
  },
  {
    icon: <Receipt />,
    text: 'Procurement',
    subItems: [
      {
        text: 'Purchase Orders',
        path: '/dashboard/procurement/orders',
        description: 'Automated PO generation based on EOQ calculations',
        icon: <StarBorder />
      },
      {
        text: 'Requisitions',
        path: '/dashboard/procurement/requisitions',
        description: 'Internal PR workflows with email routing',
        icon: <StarBorder />
      },
      {
        text: 'Receiving',
        path: '/dashboard/procurement/receiving',
        description: 'Document attachments (PO receipts, test certificates)',
        icon: <StarBorder />
      },
      {
        text: 'Approval',
        path: '/dashboard/procurement/approval',
        description: 'Approve purchase orders(accessable to only super admin/C.E.O)',
        icon: <StarBorder />
      }
    ]
  },
   // New Finance Management Section
  {
    icon: <AttachMoney />, // Import from @mui/icons-material
    text: 'Finance Management',
    subItems: [
      {
        text: 'Financial Dashboard',
        path: '/dashboard/finance/overview',
        description: 'Financial summaries and KPIs',
        icon: <Assessment />
      },
      {
        text: 'Categories',
        path: '/dashboard/finance/categories',
        description: 'Manage financial categories and accounts',
        icon: <Category />
      },
      {
        text: 'Transactions',
        path: '/dashboard/finance/transactions',
        description: 'View and manage all financial transactions',
        icon: <Receipt />
      }
    ]
  },
  // New Receipt Generation Section
  {
    icon: <Description />, // Import from @mui/icons-material
    text: 'Receipt Generation',
    subItems: [
      {
        text: 'Create Receipt',
        path: '/dashboard/receipts/create',
        description: 'Generate new receipts for payments',
        icon: <PostAdd />
      },
      {
        text: 'Digital Signing',
        path: '/dashboard/receipts/signing',
        description: 'Digitally sign completed receipts',
        icon: <Draw />
      },
      {
        text: 'Receipt Archive',
        path: '/dashboard/receipts/archive',
        description: 'View historical receipts',
        icon: <Archive />
      }
    ]
  },
  // New Equipment Rental Section
  {
    icon: <Construction />, // Import from @mui/icons-material
    text: 'Equipment Rental',
    subItems: [
      {
        text: 'Active Rentals',
        path: '/dashboard/rentals/active',
        description: 'Currently rented equipment and due dates',
        icon: <ListAlt />
      },
      {
        text: 'Rental Payments',
        path: '/dashboard/rentals/payments',
        description: 'Payment receipts and records',
        icon: <Payment />
      },
      {
        text: 'Equipment Catalog',
        path: '/dashboard/rentals/catalog',
        description: 'Manage available rental equipment',
        icon: <Warehouse />
      }
    ]
  },
  {
    icon: <Warehouse />,
    text: 'Warehouse',
    path: '/dashboard/warehouse',
    description: 'Visual rack map with storage status indicators'
  },
  {
    icon: <Timeline />,
    text: 'Audit Trail',
    path: '/dashboard/audit',
    description: 'Complete history of movements and changes'
  },
  {
    icon: <Analytics />,
    text: 'Analytics',
    subItems: [
      {
        text: 'Stock Analytics',
        path: '/dashboard/analytics/stock',
        description: 'Turnover rates and space utilization heatmaps',
        icon: <StarBorder />
      },
      {
        text: 'Dwell Time',
        path: '/dashboard/analytics/dwell',
        description: 'Average storage duration metrics',
        icon: <StarBorder />
      },
      {
        text: 'EOQ Reports',
        path: '/dashboard/analytics/eoq',
        description: 'Economic Order Quantity optimization',
        icon: <StarBorder />
      }
    ]
  },
  {
    icon: <Warning />,
    text: 'Alerts',
    path: '/dashboard/alerts',
    description: 'Stock thresholds, expiry warnings, and RFID issues'
  },
  {
    icon: <People />,
    text: 'User Management',
    path: '/dashboard/users',
    description: 'Role-based access control (Admin only)'
  },
  {
    icon: <Settings />,
    text: 'System Settings',
    subItems: [
      {
        text: 'ERP Integration',
        path: '/dashboard/settings/erp',
        description: 'AWS cloud configuration and module settings',
        icon: <StarBorder />
      },
      {
        text: 'Company Branding',
        path: '/dashboard/settings/branding',
        description: 'Customize interface and reporting templates',
        icon: <StarBorder />
      },
      {
        text: 'Tracker Setup',
        path: '/dashboard/settings/trackers',
        description: 'RFID/Scanner configuration',
        icon: <StarBorder />
      }
    ]
  }
];

export default function Sidebar({ mobileOpen, handleDrawerToggle }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { mode, toggleTheme } = useThemeContext();

  const [openSubMenus, setOpenSubMenus] = useState({});
  const [user, setUser] = useState({
    email: '',
    full_name: 'Loading...',
    profile_image: null,
    role: 'staff',
  });
  const [previewImage, setPreviewImage] = useState(null);
  const fileInputRef = useRef(null);

  const fetchUser = async () => {
    try {
      const res = await API.get('/auth/profile/');
      console.log('[USER FETCHED]', res.data);
      const profileData = res.data;
      setUser({
        email: profileData.email || 'N/A',
        full_name: profileData.full_name || profileData.name || profileData.email.split('@')[0] || 'User',
        profile_image: profileData.profile_image
          ? profileData.profile_image.replace('localhost:8000', 'localhost:8000')
          : null,
        role: profileData.role || 'staff',
      });
    } catch (error) {
      console.error('Failed to fetch user profile:', error.response || error);
      setUser({
        email: 'N/A',
        full_name: 'User',
        profile_image: null,
        role: 'staff',
      });
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);








  const handleImageChange = async (e) => {
    console.log('[Image Change Triggered]');
    const file = e.target.files?.[0];

    if (!file) {
      console.warn('No file selected');
      return;
    }

    setPreviewImage(URL.createObjectURL(file));
    console.log('[Preview Set]');

    const token = localStorage.getItem('accessToken');
    if (!token) {
      console.error('No access token found');
      alert('Please log in to upload a profile picture.');
      return;
    }

    const formData = new FormData();
    formData.append('profile_image', file);

    try {
      const res = await API.post('/auth/profile/upload/', formData);
      console.log('[Upload Success]', res.data);
      setPreviewImage(null); // Clear preview
      await fetchUser(); // Refresh user data after upload
    } catch (err) {
      console.error('[Upload Failed]', err.response || err);
      alert('Failed to upload image: ' + (err.response?.data?.detail || 'Please try again.'));
    }
  };

  const handleSubMenuToggle = (menu) => {
    setOpenSubMenus((prev) => ({ ...prev, [menu]: !prev[menu] }));
  };

  const drawerContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          py: 2,
          backgroundColor: mode === 'dark' ? '#424242' : '#212121',
          color: 'common.white',
        }}
        
      >
        <img
                      src={logo}
                      alt="Kenyon Logo"
                      style={{
                        width: '40px',
                        height: '40px',
                        objectFit: 'contain',
                        marginBottom: '16px'
                      }}
                    />
        <Box
          sx={{
            position: 'relative',
            width: 70,
            height: 70,
            mb: 1.5,
            cursor: 'pointer',
          }}
          onClick={() => {
            console.log('[Avatar Clicked]');
            if (fileInputRef.current) {
              fileInputRef.current.click();
            } else {
              console.warn('fileInputRef not ready');
            }
          }}
        >
          <Avatar
            src={previewImage || user.profile_image || DEFAULT_AVATAR}
            alt={user.full_name || 'User'}
            sx={{
              width: 70,
              height: 70,
              border: '2px solid #fff',
              objectFit: 'cover',
            }}
          />
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              bgcolor: 'rgba(0,0,0,0.4)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              borderRadius: '50%',
              opacity: 0,
              transition: 'opacity 0.3s',
              '&:hover': {
                opacity: 1,
              },
            }}
          >
            <CameraAlt sx={{ color: '#fff' }} />
          </Box>
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={handleImageChange}
          />
        </Box>
        <Typography variant="subtitle1" fontWeight="bold">
          {user.full_name}
        </Typography>
        <Typography variant="caption" color="gray">
          {user.role}
        </Typography>
      </Box>

      <Divider />

      <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
        <List>
          {menuItems.map((item) => (
            <React.Fragment key={item.text}>
              <ListItemButton
                selected={location.pathname === item.path}
                onClick={() => {
                  if (item.subItems) {
                    handleSubMenuToggle(item.text);
                  } else {
                    navigate(item.path);
                  }
                }}
              >
                <ListItemIcon sx={{ color: 'inherit' }}>{item.icon}</ListItemIcon>
                <ListItemText primary={item.text} />
                {item.subItems &&
                  (openSubMenus[item.text] ? <ExpandLess /> : <ExpandMore />)}
              </ListItemButton>
              {item.subItems && (
                <Collapse in={openSubMenus[item.text]} timeout="auto" unmountOnExit>
                  <List component="div" disablePadding>
                    {item.subItems.map((subItem) => (
                      <ListItemButton
                        key={subItem.text}
                        selected={location.pathname === subItem.path}
                        onClick={() => navigate(subItem.path)}
                        sx={{ pl: 4 }}
                      >
                        <ListItemIcon sx={{ color: 'inherit' }}>
                          {subItem.icon}
                        </ListItemIcon>
                        <ListItemText primary={subItem.text} />
                      </ListItemButton>
                    ))}
                  </List>
                </Collapse>
              )}
            </React.Fragment>
          ))}
        </List>
      </Box>

      <Divider />
      <Box sx={{ p: 2 }}>
  <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
    <Typography variant="body2" display="flex" alignItems="center" gap={1}>
      <DarkMode fontSize="small" />
      Dark Mode
    </Typography>
    <Switch checked={mode === 'dark'} onChange={toggleTheme} />
  </Box>

  <ListItemButton
  onClick={async () => {
    try {
      const access = localStorage.getItem('accessToken');
      const refresh = localStorage.getItem('refreshToken');
      await axios.post('http://127.0.0.1:8000/api/auth/logout/', {
        refresh: refresh,
      }, {
        headers: {
          Authorization: `Bearer ${access}`,
        },
      });
    } catch (error) {
      console.warn('Logout request failed:', error.message);
    }

    // Remove everything auth-related
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userEmail');
    localStorage.clear(); // optionally clear all
    window.location.href = '/login'; // 🔁 force reload to clean state

    // 🔁 Force full reload to flush React state
    window.location.href = '/login';
  }}
>
  <ListItemIcon sx={{ color: 'inherit' }}>
    <ExitToApp />
  </ListItemIcon>
  <ListItemText primary="Logout" />
</ListItemButton>


</Box>

    </Box>
  );

  return (
    <Box component="nav" sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}>
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', sm: 'none' },
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
          },
        }}
      >
        {drawerContent}
      </Drawer>
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', sm: 'block' },
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            height: '100vh',
          },
        }}
        open
      >
        {drawerContent}
      </Drawer>
    </Box>
  );
}


