import React, { useEffect, useState } from 'react';
import {
  Container,
  Typography,
  Paper,
  TextField,
  InputAdornment,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Pagination,
  Box,
  TableContainer,
  CircularProgress
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import API from '../../api'; // adjust path if needed

export default function EOQReports() {
  const [data, setData] = useState([]);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const itemsPerPage = 10;

  useEffect(() => {
    const fetchEOQ = async () => {
      try {
        const response = await API.get('analytics/eoq/');
        setData(response.data);
      } catch (err) {
        console.error('Error fetching EOQ data:', err);
        setError('Failed to load EOQ reports.');
      } finally {
        setLoading(false);
      }
    };

    fetchEOQ();
  }, []);

  const filteredData = data.filter((row) =>
    row.item.toLowerCase().includes(search.toLowerCase()) ||
    row.part_number.toLowerCase().includes(search.toLowerCase())
  );

  const paginatedData = filteredData.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom>
          EOQ Reports
        </Typography>
        <Typography variant="subtitle1" sx={{ mb: 3 }}>
          Auto-replenishment insights based on demand, order cost, and holding cost data.
        </Typography>

        <Box display="flex" justifyContent="flex-end" mb={2}>
          <TextField
            placeholder="Search by item or part number..."
            variant="outlined"
            size="small"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
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
          <Box display="flex" justifyContent="center" my={4}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Typography color="error">{error}</Typography>
        ) : (
          <>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>S/N</TableCell>
                    <TableCell>Item</TableCell>
                    <TableCell>Part Number</TableCell>
                    <TableCell>Demand Rate (units/year)</TableCell>
                    <TableCell>Order Cost (₦)</TableCell>
                    <TableCell>Holding Cost (₦/unit/year)</TableCell>
                    <TableCell>EOQ (units)</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedData.length > 0 ? (
                    paginatedData.map((row, index) => (
                      <TableRow key={row.id}>
                        <TableCell>{(page - 1) * itemsPerPage + index + 1}</TableCell>
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={1}>
                            <PrecisionManufacturingIcon fontSize="small" color="primary" />
                            {row.item}
                          </Box>
                        </TableCell>
                        <TableCell>{row.part_number}</TableCell>
                        <TableCell>{row.demand_rate}</TableCell>
                        <TableCell>{row.ordering_cost}</TableCell>
                        <TableCell>{row.holding_cost}</TableCell>
                        <TableCell>{row.eoq}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} align="center">
                        No matching records found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            <Box display="flex" justifyContent="center" mt={3}>
              <Pagination
                count={Math.ceil(filteredData.length / itemsPerPage)}
                page={page}
                onChange={(_, value) => setPage(value)}
                color="primary"
              />
            </Box>
          </>
        )}

        <Typography variant="body2" color="text.secondary" sx={{ mt: 4 }}>
          EOQ helps in minimizing total inventory costs. Review reports to determine optimal order quantity and restocking efficiency.
        </Typography>
      </Paper>
    </Container>
  );
}
