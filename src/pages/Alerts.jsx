import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Container,
  Typography,
  Paper,
  Box,
  TextField,
  InputAdornment,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  Pagination,
  CircularProgress
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import WarningIcon from '@mui/icons-material/Warning';
import ScheduleIcon from '@mui/icons-material/Schedule';
import SensorsOffIcon from '@mui/icons-material/SensorsOff';
import LockIcon from '@mui/icons-material/Lock';

const iconMap = {
  'Stock Threshold': <WarningIcon />,
  'Expiry Warning': <ScheduleIcon />,
  'Tracker Issue': <SensorsOffIcon />,
  'Unauthorized Access': <LockIcon />,
};

export default function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem('accessToken');

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const response = await axios.get('/api/alerts/', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setAlerts(response.data);
        setFiltered(response.data);
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch alerts:', error);
        setLoading(false);
      }
    };

    fetchAlerts();
  }, [token]);

  useEffect(() => {
    const results = alerts.filter((item) =>
      item.type.toLowerCase().includes(search.toLowerCase()) ||
      item.message.toLowerCase().includes(search.toLowerCase())
    );
    setFiltered(results);
    setPage(1);
  }, [search, alerts]);

  const paginated = filtered.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom>
          Alerts Dashboard
        </Typography>
        <Typography variant="subtitle1" sx={{ mb: 3 }}>
          Centralized system alerts and warnings
        </Typography>

        <Box display="flex" justifyContent="flex-end" mb={2}>
          <TextField
            placeholder="Search alerts..."
            variant="outlined"
            size="small"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
        </Box>

        {loading ? (
          <Box display="flex" justifyContent="center" py={5}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>S/N</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Message</TableCell>
                    <TableCell>Time</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginated.length > 0 ? (
                    paginated.map((alert, index) => (
                      <TableRow key={alert.id}>
                        <TableCell>{(page - 1) * itemsPerPage + index + 1}</TableCell>
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={1}>
                            {iconMap[alert.type]}
                            {alert.type}
                          </Box>
                        </TableCell>
                        <TableCell>{alert.message}</TableCell>
                        <TableCell>{new Date(alert.time).toLocaleString()}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} align="center">
                        No alerts found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            <Box display="flex" justifyContent="center" mt={3}>
              <Pagination
                count={Math.ceil(filtered.length / itemsPerPage)}
                page={page}
                onChange={(_, value) => setPage(value)}
                color="primary"
              />
            </Box>
          </>
        )}
      </Paper>
    </Container>
  );
}
