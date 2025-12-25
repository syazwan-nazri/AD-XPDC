import React, { useEffect, useState, useMemo } from 'react';
import { db } from '../../firebase/config';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import {
  Grid, Paper, Typography, Box, Card, CardContent, Divider, MenuItem, TextField, Select, FormControl, InputLabel
} from '@mui/material';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, LineChart, Line
} from 'recharts';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import WarningIcon from '@mui/icons-material/Warning';
import InventoryIcon from '@mui/icons-material/Inventory';
import AssignmentIcon from '@mui/icons-material/Assignment';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';

const DashboardKPIs = () => {
  const [stats, setStats] = useState({
    totalStockValue: 0,
    lowStockCount: 0,
    totalParts: 0,
    pendingPRs: 0
  });
  const [parts, setParts] = useState([]);
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1); // 1-12, 'All'

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 1. Fetch Parts
        const partsSnapshot = await getDocs(collection(db, 'parts'));
        const partsData = partsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setParts(partsData);

        // 2. Fetch Movements (All history ideally, or filter by date range if too large. For now fetching all)
        // Optimization: In real app, query by date range.
        const movementsRef = collection(db, 'movement_logs');
        const q = query(movementsRef, orderBy('timestamp', 'desc')); // Get latest
        const movementsSnapshot = await getDocs(q);
        const movementsData = movementsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          date: doc.data().timestamp?.toDate() || new Date()
        }));
        setMovements(movementsData);

        // 3. Fetch PRs
        const prQuery = query(collection(db, 'purchase_requisitions'), where('status', '==', 'Pending'));
        const prSnapshot = await getDocs(prQuery);

        // Calculate KPI Stats
        let totalValue = 0;
        let lowStock = 0;
        partsData.forEach(part => {
          const stock = Number(part.currentStock) || 0;
          const price = Number(part.unitPrice) || 0;
          const min = Number(part.safetyLevel) || Number(part.minStockLevel) || 0;
          totalValue += stock * price;
          if (stock <= min) lowStock++;
        });

        setStats({
          totalStockValue: totalValue,
          lowStockCount: lowStock,
          totalParts: partsData.length,
          pendingPRs: prSnapshot.size
        });

      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Filtered Data Calculations
  const dashboardData = useMemo(() => {
    if (!parts.length) return { categoryData: [], stockOutTrend: [], topParts: [] };

    // 1. Category Data
    const categoryMap = {};
    parts.forEach(part => {
      const cat = part.category || 'Uncategorized';
      categoryMap[cat] = (categoryMap[cat] || 0) + 1;
    });
    const categoryData = Object.keys(categoryMap).map(key => ({ name: key, value: categoryMap[key] }));

    // 2. Stock Out Trends (Sales/Usage)
    // Filter movements by Year/Month and Type=OUT
    const filteredMovements = movements.filter(m => {
      const mYear = m.date.getFullYear();
      const mMonth = m.date.getMonth() + 1;
      const typeMatch = m.type === 'OUT';
      const yearMatch = mYear === selectedYear;
      const monthMatch = selectedMonth === 'All' || mMonth === selectedMonth;
      return typeMatch && yearMatch && monthMatch;
    });

    // Group by Day (if Month selected) or Month (if Year selected and Month=All)
    const trendMap = {};
    const partUsageMap = {};

    filteredMovements.forEach(m => {
      // Trend
      let key;
      if (selectedMonth === 'All') {
        // Group by Month
        key = m.date.toLocaleString('default', { month: 'short' });
      } else {
        // Group by Day
        key = m.date.getDate();
      }

      // Calculate Value of this movement
      const part = parts.find(p => p.id === m.partId || p.sapNumber === m.sapNumber || p.name === m.partName);
      const price = part ? (Number(part.unitPrice) || 0) : 0;
      const value = (Number(m.quantity) || 0) * price;

      trendMap[key] = (trendMap[key] || 0) + value;

      // Top Parts Usage
      const partName = m.partName || 'Unknown';
      partUsageMap[partName] = (partUsageMap[partName] || 0) + (Number(m.quantity) || 0);
    });

    // Format Trend Data
    // Ensure chronological order for months or days
    let stockOutTrend = [];
    if (selectedMonth === 'All') {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      stockOutTrend = months.map(m => ({ name: m, value: trendMap[m] || 0 }));
    } else {
      // Days 1-31
      const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
      for (let i = 1; i <= daysInMonth; i++) {
        stockOutTrend.push({ name: i, value: trendMap[i] || 0 });
      }
    }

    // 3. Top Parts
    const topParts = Object.keys(partUsageMap)
      .map(key => ({ name: key, value: partUsageMap[key] }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    return { categoryData, stockOutTrend, topParts };
  }, [parts, movements, selectedYear, selectedMonth]);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

  const KPICard = ({ title, value, icon, color, subtitle }) => (
    <Card elevation={3} sx={{ height: '100%', borderRadius: 3, position: 'relative', overflow: 'hidden' }}>
      <Box sx={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '5px', bgcolor: color }} />
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography color="textSecondary" variant="subtitle2" fontWeight="bold" textTransform="uppercase" sx={{ opacity: 0.7 }}>
              {title}
            </Typography>
            <Typography variant="h4" fontWeight="bold" sx={{ mt: 1, mb: 1 }}>
              {value}
            </Typography>
            {subtitle && (
              <Typography variant="body2" color="textSecondary">
                {subtitle}
              </Typography>
            )}
          </Box>
          <Box sx={{
            bgcolor: `${color}20`, // 20% opacity
            p: 1.5,
            borderRadius: '50%',
            color: color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  if (loading) return <Box p={3}><Typography>Loading Dashboard...</Typography></Box>;

  return (
    <Box sx={{ p: 2 }}>
      {/* Header & Filters */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4} flexWrap="wrap">
        <Typography variant="h4" fontWeight="bold" color="primary.main">
          Dashboard Overview
        </Typography>
        <Box display="flex" gap={2}>
          <FormControl size="small" sx={{ minWidth: 100 }}>
            <InputLabel>Year</InputLabel>
            <Select value={selectedYear} label="Year" onChange={(e) => setSelectedYear(e.target.value)}>
              {[2023, 2024, 2025, 2026].map(y => <MenuItem key={y} value={y}>{y}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 100 }}>
            <InputLabel>Month</InputLabel>
            <Select value={selectedMonth} label="Month" onChange={(e) => setSelectedMonth(e.target.value)}>
              <MenuItem value="All">All Year</MenuItem>
              {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m, i) => (
                <MenuItem key={i} value={i + 1}>{m}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </Box>

      {/* KPI Cards Row */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <KPICard
            title="Total Inventory Value"
            value={`$${stats.totalStockValue.toLocaleString()}`}
            icon={<AttachMoneyIcon fontSize="large" />}
            color="#2e7d32" // Green
            subtitle="Estimated Valuation"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KPICard
            title="Low Stock Alerts"
            value={stats.lowStockCount}
            icon={<WarningIcon fontSize="large" />}
            color="#d32f2f" // Red
            subtitle="Items below safety level"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KPICard
            title="Total SKUs"
            value={stats.totalParts}
            icon={<InventoryIcon fontSize="large" />}
            color="#1976d2" // Blue
            subtitle="Active parts in system"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KPICard
            title="Pending Requests"
            value={stats.pendingPRs}
            icon={<AssignmentIcon fontSize="large" />}
            color="#ed6c02" // Orange
            subtitle="Require approval"
          />
        </Grid>
      </Grid>

      {/* Main Charts Row */}
      <Grid container spacing={3} mb={3}>
        {/* Stock Usage / Sales Report */}
        <Grid item xs={12} lg={8}>
          <Paper elevation={2} sx={{ p: 3, borderRadius: 3, height: 450 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6" fontWeight="bold">
                Stock Out Value Analysis ({selectedMonth === 'All' ? selectedYear : `${selectedMonth}/${selectedYear}`})
              </Typography>
              <Box display="flex" alignItems="center" color="text.secondary">
                <TrendingUpIcon sx={{ mr: 1 }} />
                <Typography variant="body2">Valuation based on Unit Price</Typography>
              </Box>
            </Box>
            <Divider sx={{ mb: 3 }} />
            <ResponsiveContainer width="100%" height="85%">
              <AreaChart data={dashboardData.stockOutTrend} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" />
                <YAxis tickFormatter={(val) => `$${val}`} />
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <Tooltip formatter={(value) => [`$${value.toLocaleString()}`, 'Value']} />
                <Area type="monotone" dataKey="value" stroke="#8884d8" fillOpacity={1} fill="url(#colorValue)" />
              </AreaChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Top Moving Items */}
        <Grid item xs={12} lg={4}>
          <Paper elevation={2} sx={{ p: 3, borderRadius: 3, height: 450 }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              Top Moving Items (Qty)
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <ResponsiveContainer width="100%" height="90%">
              <BarChart layout="vertical" data={dashboardData.topParts} margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="value" fill="#82ca9d" radius={[0, 5, 5, 0]}>
                  {dashboardData.topParts.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>

      {/* Secondary Charts Row */}
      <Grid container spacing={3}>
        {/* Category Distribution */}
        <Grid item xs={12} md={6}>
          <Paper elevation={2} sx={{ p: 3, borderRadius: 3, height: 400 }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>Inventory by Category</Typography>
            <Divider sx={{ mb: 2 }} />
            <ResponsiveContainer width="100%" height="85%">
              <PieChart>
                <Pie
                  data={dashboardData.categoryData}
                  cx="40%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={120}
                  paddingAngle={5}
                  dataKey="value"
                  label
                >
                  {dashboardData.categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="middle" align="right" layout="vertical" />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Placeholder for future expansion or another chart */}
        <Grid item xs={12} md={6}>
          <Paper elevation={2} sx={{ p: 3, borderRadius: 3, height: 400, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', bgcolor: '#f9fafb' }}>
            <ShoppingCartIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary">Recent Activity Feed</Typography>
            <Typography variant="body2" color="text.disabled">Coming Soon</Typography>
          </Paper>
        </Grid>
      </Grid>

    </Box>
  );
};

export default DashboardKPIs;
