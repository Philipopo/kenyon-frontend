import { List, ListItem, ListItemIcon, ListItemText, Chip } from '@mui/material';
import { Warning, Error, Info } from '@mui/icons-material';

const alerts = [
  { id: 1, message: 'Low stock: Crude Oil', severity: 'high' },
  { id: 2, message: 'Shipment delayed: Order #4521', severity: 'medium' },
  { id: 3, message: 'Equipment due for return', severity: 'low' },
];

export default function AlertsWidget() {
  return (
    <List dense>
      {alerts.map((alert) => (
        <ListItem key={alert.id}>
          <ListItemIcon>
            {alert.severity === 'high' ? <Error color="error" /> : 
             alert.severity === 'medium' ? <Warning color="warning" /> : 
             <Info color="info" />}
          </ListItemIcon>
          <ListItemText primary={alert.message} />
          <Chip 
            label={alert.severity} 
            size="small"
            color={alert.severity === 'high' ? 'error' : 
                   alert.severity === 'medium' ? 'warning' : 'info'}
          />
        </ListItem>
      ))}
    </List>
  );
}