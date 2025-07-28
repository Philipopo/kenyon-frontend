import React from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  ResponsiveContainer 
} from 'recharts';
import { Box } from '@mui/material';

const data = [
  { name: 'Crude Oil', stock: 4000, capacity: 5000 },
  { name: 'Refined', stock: 3000, capacity: 4500 },
  { name: 'Natural Gas', stock: 2000, capacity: 3000 },
  { name: 'Chemicals', stock: 2780, capacity: 3500 },
];

export default function StockLevelWidget() {
  return (
    <Box sx={{ 
      width: '100%',
      height: '100%', // Takes all available space
      minHeight: '300px' // Ensures minimum size
    }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{
            top: 20,
            right: 30,
            left: 20,
            bottom: 20,
          }}
          barSize={30} // Thicker bars
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar 
            dataKey="stock" 
            fill="#1976d2" 
            name="Current Stock"
            radius={[4, 4, 0, 0]} // Rounded top corners
          />
          <Bar 
            dataKey="capacity" 
            fill="#82ca9d" 
            name="Total Capacity" 
          />
        </BarChart>
      </ResponsiveContainer>
    </Box>
  );
}