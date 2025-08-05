import React from 'react';
import { 
  List, 
  ListItem, 
  ListItemIcon, 
  ListItemText, 
  Chip, 
  Box, 
  Typography,
  Divider,
  useTheme
} from '@mui/material';
import { 
  Warning as WarningIcon, 
  Error as ErrorIcon, 
  Info as InfoIcon,
  LocalShipping as ShippingIcon,
  Inventory as InventoryIcon,
  Schedule as ScheduleIcon
} from '@mui/icons-material';

const alerts = [
  { 
    id: 1, 
    message: 'Critical: Crude Oil stock below safety level (15%)', 
    severity: 'critical',
    timestamp: '2023-06-15T09:23:17',
    type: 'inventory'
  },
  { 
    id: 2, 
    message: 'Delayed: Shipment #4521 (Expected yesterday)', 
    severity: 'high',
    timestamp: '2023-06-15T08:45:32',
    type: 'shipping'
  },
  { 
    id: 3, 
    message: 'Maintenance: Tank 7 requires inspection', 
    severity: 'medium',
    timestamp: '2023-06-15T07:30:00',
    type: 'maintenance'
  },
  { 
    id: 4, 
    message: 'Overdue: Equipment return from Site B', 
    severity: 'low',
    timestamp: '2023-06-14T16:20:45',
    type: 'logistics'
  },
];

const getSeverityIcon = (severity) => {
  switch(severity) {
    case 'critical': return <ErrorIcon fontSize="small" />;
    case 'high': return <ErrorIcon fontSize="small" />;
    case 'medium': return <WarningIcon fontSize="small" />;
    case 'low': return <InfoIcon fontSize="small" />;
    default: return <InfoIcon fontSize="small" />;
  }
};

const getTypeIcon = (type) => {
  switch(type) {
    case 'shipping': return <ShippingIcon fontSize="small" />;
    case 'inventory': return <InventoryIcon fontSize="small" />;
    case 'logistics': return <ScheduleIcon fontSize="small" />;
    default: return <InfoIcon fontSize="small" />;
  }
};

const formatTime = (timestamp) => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export default function AlertsWidget() {
  const theme = useTheme();

  return (
    <Box sx={{ 
      border: `1px solid ${theme.palette.divider}`,
      borderRadius: '8px',
      overflow: 'hidden'
    }}>
      <Box sx={{ 
        p: 2,
        borderBottom: `1px solid ${theme.palette.divider}`,
        display: 'flex',
        alignItems: 'center'
      }}>
        <Typography variant="subtitle1" fontWeight={500}>
          Active Alerts
        </Typography>
        <Chip 
          label={alerts.length} 
          size="small" 
          variant="outlined"
          sx={{ ml: 'auto' }} 
        />
      </Box>
      
      <List disablePadding>
        {alerts.map((alert, index) => (
          <React.Fragment key={alert.id}>
            <ListItem sx={{ py: 1.5, px: 2 }}>
              <ListItemIcon sx={{ minWidth: 36 }}>
                {getTypeIcon(alert.type)}
              </ListItemIcon>
              <ListItemText
                primary={
                  <Typography variant="body2">
                    {alert.message}
                  </Typography>
                }
                secondary={
                  <Typography variant="caption" color="text.secondary">
                    {formatTime(alert.timestamp)}
                  </Typography>
                }
                sx={{ my: 0 }}
              />
              <Chip
                label={alert.severity}
                size="small"
                icon={getSeverityIcon(alert.severity)}
                variant="outlined"
                sx={{ 
                  ml: 1,
                  borderColor: 
                    alert.severity === 'critical' ? theme.palette.error.main :
                    alert.severity === 'high' ? theme.palette.error.main :
                    alert.severity === 'medium' ? theme.palette.warning.main :
                    theme.palette.info.main,
                  color: 
                    alert.severity === 'critical' ? theme.palette.error.main :
                    alert.severity === 'high' ? theme.palette.error.main :
                    alert.severity === 'medium' ? theme.palette.warning.main :
                    theme.palette.info.main
                }}
              />
            </ListItem>
            {index < alerts.length - 1 && (
              <Divider variant="inset" component="li" sx={{ ml: 7 }} />
            )}
          </React.Fragment>
        ))}
      </List>
    </Box>
  );
}