import React from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  ResponsiveContainer,
  Cell
} from 'recharts';
import { Box, Typography, useTheme } from '@mui/material';
import { styled } from '@mui/system';

const StyledContainer = styled(Box)(({ theme }) => ({
  width: '100%',
  height: '100%',
  minHeight: '400px',
  backgroundColor: theme.palette.background.paper,
  borderRadius: '12px',
  border: `1px solid ${theme.palette.divider}`,
  padding: theme.spacing(3),
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(2)
}));

const ChartHeader = styled(Box)({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-end'
});

const data = [
  { name: 'Crude Oil', stock: 4000, capacity: 5000, color: '#3a86ff' },
  { name: 'Refined', stock: 3000, capacity: 4500, color: '#8338ec' },
  { name: 'Natural Gas', stock: 2000, capacity: 3000, color: '#ff006e' },
  { name: 'Chemicals', stock: 2780, capacity: 3500, color: '#fb5607' },
];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const utilization = Math.round((payload[0].value / payload[1].value) * 100);
    return (
      <Box sx={{ 
        bgcolor: 'background.paper',
        p: 1.5,
        borderRadius: '6px',
        boxShadow: 3,
        border: '1px solid',
        borderColor: 'divider',
        minWidth: '160px'
      }}>
        <Typography variant="subtitle2" fontWeight={600}>{label}</Typography>
        <Box sx={{ mt: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="caption">Stock:</Typography>
            <Typography variant="caption" fontWeight={500}>{payload[0].value.toLocaleString()}</Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="caption">Capacity:</Typography>
            <Typography variant="caption" fontWeight={500}>{payload[1].value.toLocaleString()}</Typography>
          </Box>
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            mt: 0.5,
            pt: 0.5,
            borderTop: '1px dashed',
            borderColor: 'divider'
          }}>
            <Typography variant="caption">Utilization:</Typography>
            <Typography variant="caption" fontWeight={600} color={utilization > 90 ? 'error.main' : 'success.main'}>
              {utilization}%
            </Typography>
          </Box>
        </Box>
      </Box>
    );
  }
  return null;
};

export default function StockLevelWidget() {
  const theme = useTheme();
  
  return (
    <StyledContainer>
      <ChartHeader>
        <Box>
          <Typography variant="h6" fontWeight={600}>Inventory Status</Typography>
          <Typography variant="caption" color="text.secondary">
            Real-time stock levels vs capacity
          </Typography>
        </Box>
        <Typography variant="caption" color="text.secondary">
          {new Date().toLocaleString()}
        </Typography>
      </ChartHeader>
      
      <Box sx={{ flex: 1, marginLeft: '-8px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{
              top: 0,
              right: 10,
              left: 0,
              bottom: 0,
            }}
            barCategoryGap={12}
          >
            <CartesianGrid 
              horizontal={true} 
              vertical={false}
              stroke={theme.palette.divider}
              strokeDasharray="3 3"
            />
            <XAxis 
              type="number" 
              axisLine={false}
              tickLine={false}
              tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
            />
            <YAxis 
              dataKey="name" 
              type="category" 
              axisLine={false}
              tickLine={false}
              tick={{ fill: theme.palette.text.primary, fontSize: 13 }}
              width={90}
            />
            <Tooltip 
              content={<CustomTooltip />}
              cursor={{ fill: 'rgba(0, 0, 0, 0.04)' }}
            />
            <Legend 
              wrapperStyle={{ 
                paddingTop: '5px',
                paddingBottom: '5px'
              }}
              formatter={(value) => (
                <span style={{ 
                  color: theme.palette.text.secondary,
                  fontSize: '13px'
                }}>
                  {value}
                </span>
              )}
            />
            <Bar 
              dataKey="stock" 
              name="Current Stock"
              radius={[0, 4, 4, 0]}
              barSize={20}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
            <Bar 
              dataKey="capacity" 
              name="Total Capacity"
              radius={[0, 4, 4, 0]}
              barSize={20}
              fill={theme.palette.grey[300]}
              opacity={0.4}
            />
          </BarChart>
        </ResponsiveContainer>
      </Box>
      
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'flex-end'
      }}>
        <Typography variant="caption" color="text.secondary">
          Hover for details • Updated every 15 min
        </Typography>
      </Box>
    </StyledContainer>
  );
}