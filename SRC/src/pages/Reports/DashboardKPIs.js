<<<<<<< HEAD
import React, { useState, useEffect } from "react";
import { Box, Typography, TextField } from "@mui/material";

const DashboardKPIs = () => {
  const [lastRefresh, setLastRefresh] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const formatDateTime = () => {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const day = String(now.getDate()).padStart(2, "0");
      const hours = now.getHours();
      const minutes = String(now.getMinutes()).padStart(2, "0");
      const ampm = hours >= 12 ? "PM" : "AM";
      const displayHours = hours % 12 || 12;
      const formattedHours = String(displayHours).padStart(2, "0");
      
      return `${year}-${month}-${day}  ${formattedHours}:${minutes} ${ampm}`;
    };

    setLastRefresh(formatDateTime());
  }, []);

  return (
    <Box>
      <Box
        sx={{
          backgroundColor: "primary.main",
          color: "white",
          p: 2,
          mb: 1,
          ml: -17,
          mr: -1,
          borderRadius: 1,
        }}
      >
        <Typography
          variant="h4"
          component="h1"
          sx={{
            fontWeight: "bold",
            color: "white",
            mb: 2,
          }}
        >
          DASHBOARD
        </Typography>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 2,
          }}
        >
          <TextField
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            size="small"
            sx={{
              maxWidth: 400,
              backgroundColor: "white",
              borderRadius: 1,
              "& .MuiOutlinedInput-root": {
                borderRadius: 1,
              },
            }}
          />
          <Typography
            variant="body1"
            sx={{
              color: "white",
            }}
          >
            Last Data Refresh: {lastRefresh}
          </Typography>
        </Box>
      </Box>
      {/* headers merged into their respective grey cards below */}
      <Box
        sx={{
          display: "flex",
          gap: 2,
          ml: -17,
          mr: -1,
        }}
      >
        <Box
          sx={{
            backgroundColor: "grey.300",
            p: 3,
            borderRadius: 1,
            minHeight: 400,
            flex: 1,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Box
            sx={{
              backgroundColor: "primary.main",
              color: "white",
              p: 1,
              borderRadius: 1,
              mb: 1,
            }}
          >
            <Typography
              variant="h6"
              sx={{
                fontWeight: "bold",
                color: "white",
              }}
            >
              HEADER METRICS
            </Typography>
          </Box>

          

          <Box
            sx={{
              flex: 1,
              mt: 0,
              minHeight: 0,
            }}
          >
            {/* Dashboard content box 1 */}
          </Box>
        </Box>
        <Box
          sx={{
            backgroundColor: "grey.300",
            p: 2,
            borderRadius: 1,
            minHeight: 400,
            flex: 1,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Box
            sx={{
              backgroundColor: "primary.main",
              color: "white",
              p: 1,
              borderRadius: 1,
              mb: 1,
            }}
          >
            <Typography
              variant="h6"
              sx={{
                fontWeight: "bold",
                color: "white",
              }}
            >
              QUICK ACTIONS
            </Typography>
          </Box>

          

          <Box
            sx={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              gap: 2,
              minHeight: 0,
            }}
          >
            <Box
              sx={{
                backgroundColor: "white",
                p: 2,
                borderRadius: 1,
                flex: 1,
                minHeight: 0,
              }}
            >
              {/* Dashboard content box 2a */}
            </Box>

            <Box
              sx={{
                backgroundColor: "white",
                p: 2,
                borderRadius: 1,
                flex: 1,
                minHeight: 0,
              }}
            >
              {/* Dashboard content box 2b (was N/A) */}
            </Box>
          </Box>
        </Box>
        <Box
          sx={{
            backgroundColor: "grey.300",
            p: 3,
            borderRadius: 1,
            minHeight: 400,
            flex: 1,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Box
            sx={{
              backgroundColor: "primary.main",
              color: "white",
              p: 1,
              borderRadius: 1,
              mb: 1,
            }}
          >
            <Typography
              variant="h6"
              sx={{
                fontWeight: "bold",
                color: "white",
              }}
            >
              CRITICAL ALERT PANEL
            </Typography>
          </Box>

          

          <Box
            sx={{
              flex: 1,
              mt: 0,
              minHeight: 0,
            }}
          >
            {/* Dashboard content box 3 */}
          </Box>
        </Box>
      </Box>
      <Box
        sx={{
          backgroundColor: "grey.300",
          p: 3,
          borderRadius: 1,
          minHeight: 400,
          ml: -17,
          mr: -1,
          mt: 2,
        }}
      >
        {/* Dashboard content - big box */}
      </Box>
      <Box
        sx={{
          backgroundColor: "grey.300",
          p: 3,
          borderRadius: 1,
          minHeight: 400,
          ml: -17,
          mr: -1,
          mt: 2,
        }}
      >
        {/* Dashboard content - big box 2 */}
      </Box>
=======
import React, { useEffect, useState } from 'react';
import { db } from '../../firebase/config';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { Grid, Paper, Typography, Box, Card, CardContent } from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import WarningIcon from '@mui/icons-material/Warning';
import InventoryIcon from '@mui/icons-material/Inventory';
import AssignmentIcon from '@mui/icons-material/Assignment';

const DashboardKPIs = () => {
  const [stats, setStats] = useState({
    totalStockValue: 0,
    lowStockCount: 0,
    totalParts: 0,
    pendingPRs: 0
  });
  const [categoryData, setCategoryData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch Parts
        const partsSnapshot = await getDocs(collection(db, 'parts'));
        const parts = partsSnapshot.docs.map(doc => doc.data());

        let totalValue = 0;
        let lowStock = 0;
        const categoryMap = {};

        parts.forEach(part => {
          const stock = Number(part.currentStock) || 0;
          const price = Number(part.unitPrice) || 0; // Assuming unitPrice exists, otherwise 0
          const min = Number(part.minStockLevel) || 0;
          
          totalValue += stock * price;
          if (stock <= min) lowStock++;

          const cat = part.category || 'Uncategorized';
          categoryMap[cat] = (categoryMap[cat] || 0) + 1;
        });

        // Fetch Pending PRs
        const prQuery = query(collection(db, 'purchase_requisitions'), where('status', '==', 'Pending'));
        const prSnapshot = await getDocs(prQuery);

        setStats({
          totalStockValue: totalValue,
          lowStockCount: lowStock,
          totalParts: parts.length,
          pendingPRs: prSnapshot.size
        });

        const catData = Object.keys(categoryMap).map(key => ({
          name: key,
          value: categoryMap[key]
        }));
        setCategoryData(catData);

      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  const KPICard = ({ title, value, icon, color }) => (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography color="textSecondary" gutterBottom variant="overline">
              {title}
            </Typography>
            <Typography variant="h4">
              {value}
            </Typography>
          </Box>
          <Box sx={{ color: color }}>
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  if (loading) return <Typography>Loading Dashboard...</Typography>;

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Dashboard</Typography>
      
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <KPICard title="Total Parts" value={stats.totalParts} icon={<InventoryIcon fontSize="large" />} color="primary.main" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KPICard title="Low Stock Items" value={stats.lowStockCount} icon={<WarningIcon fontSize="large" />} color="error.main" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KPICard title="Pending PRs" value={stats.pendingPRs} icon={<AssignmentIcon fontSize="large" />} color="warning.main" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KPICard title="Est. Stock Value" value={`$${stats.totalStockValue.toLocaleString()}`} icon={<AttachMoneyIcon fontSize="large" />} color="success.main" />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, height: 400 }}>
            <Typography variant="h6" gutterBottom>Parts by Category</Typography>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={120}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, height: 400 }}>
            <Typography variant="h6" gutterBottom>Stock Distribution (Sample)</Typography>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={categoryData}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="value" fill="#8884d8" name="Count" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>
>>>>>>> refs/remotes/origin/main
    </Box>
  );
};

export default DashboardKPIs;
