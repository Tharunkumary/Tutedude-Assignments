import React from 'react';
import { Typography, Box, Paper } from '@mui/material';

const Products: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Products Management
      </Typography>
      <Paper sx={{ p: 3 }}>
        <Typography variant="body1">
          Products management functionality will be implemented here.
          This will include:
        </Typography>
        <Box component="ul" sx={{ mt: 2 }}>
          <li>View all products in a data grid</li>
          <li>Add new products with categories</li>
          <li>Edit existing products</li>
          <li>Update stock quantities</li>
          <li>Enable/disable products</li>
          <li>Manage product categories</li>
        </Box>
      </Paper>
    </Box>
  );
};

export default Products;