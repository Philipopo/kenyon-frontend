import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Label
} from 'recharts';
import { Box, Typography, useTheme } from '@mui/material';
import { styled } from '@mui/system';

const StyledContainer = styled(Box)(({ theme }) => ({
  width: '100%',
  minHeight: '400px',
  borderRadius: '12px',
  padding: theme.spacing(3),
  backgroundColor: theme.palette.background.paper,
  border: `1px solid ${theme.palette.divider}`,
}));

// Enhanced: Add direction flag (↑/↓) and dynamic color
const rawData = [
  3500, 3800, 4200, 3900, 4000, 2800, 3100, 2900, 3200, 3000,
  1800, 2100, 1900, 2200, 2000, 2500, 2700, 2900, 2600, 2780,
];

const stockTrendData = rawData.map((value, i) => {
  let direction = 'neutral';
  if (i > 0) {
    direction = value > rawData[i - 1] ? 'up' : value < rawData[i - 1] ? 'down' : 'neutral';
  }
  return {
    name: `Week ${i + 1}`,
    value,
    direction,
  };
});

const CustomTooltip = ({ active, payload, label }) => {
  const theme = useTheme();

  if (active && payload?.length) {
    const value = payload[0].value;
    const direction = payload[0].payload.direction;
    const color = direction === 'up' ? theme.palette.success.main :
                  direction === 'down' ? theme.palette.error.main :
                  theme.palette.text.primary;

    return (
      <Box sx={{
        bgcolor: 'background.paper',
        p: 2,
        borderRadius: 1,
        boxShadow: 3,
        border: `1px solid ${theme.palette.divider}`,
      }}>
        <Typography fontWeight={600}>{label}</Typography>
        <Typography variant="caption" color={color}>
          {direction === 'up' ? '↑' : direction === 'down' ? '↓' : '→'} {value.toLocaleString()}
        </Typography>
      </Box>
    );
  }

  return null;
};

export default function StockLevelWidget() {
  const theme = useTheme();

  return (
    <StyledContainer>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" fontWeight={600}>Stock Trend</Typography>
        <Typography variant="caption" color="text.secondary">
          Combined stock movement (weekly) with dynamic coloring
        </Typography>
      </Box>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={stockTrendData}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.palette.divider} />
          
          <XAxis dataKey="name" tick={{ fill: theme.palette.text.primary }}>
            <Label
              value=""
              offset={-10}
              position="insideBottom"
              style={{ fill: theme.palette.text.secondary }}
            />
          </XAxis>

          <YAxis tick={{ fill: theme.palette.text.secondary }} />

          <Tooltip content={<CustomTooltip />} />

          <Line
            type="monotone"
            dataKey="value"
            stroke={theme.palette.grey[800]}
            strokeWidth={2.5}
            dot={({ cx, cy, payload }) => {
              const direction = payload.direction;
              const fillColor =
                direction === 'up'
                  ? theme.palette.success.main
                  : direction === 'down'
                  ? theme.palette.error.main
                  : theme.palette.text.secondary;

              return (
                <circle
                  cx={cx}
                  cy={cy}
                  r={4}
                  stroke={theme.palette.background.paper}
                  strokeWidth={2}
                  fill={fillColor}
                />
              );
            }}
            activeDot={({ cx, cy, payload }) => {
              const direction = payload.direction;
              const fillColor =
                direction === 'up'
                  ? theme.palette.success.main
                  : direction === 'down'
                  ? theme.palette.error.main
                  : theme.palette.text.secondary;

              return (
                <circle
                  cx={cx}
                  cy={cy}
                  r={6}
                  stroke={theme.palette.background.paper}
                  strokeWidth={2}
                  fill={fillColor}
                />
              );
            }}
          />
        </LineChart>
      </ResponsiveContainer>

      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between' }}>
        <Typography variant="caption" color="success.main">↑ Upward Trend</Typography>
        <Typography variant="caption" color="error.main">↓ Downward Trend</Typography>
      </Box>
    </StyledContainer>
  );
}
