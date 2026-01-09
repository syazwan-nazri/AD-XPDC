import React, { useEffect, useState, useMemo } from 'react';
import { db } from '../../firebase/config';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import {
  Grid, Paper, Typography, Box, Card, CardContent, Divider, MenuItem, TextField, Select, FormControl, InputLabel,
  Tooltip, IconButton, CircularProgress
} from '@mui/material';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, LineChart, Line, ComposedChart, RadialBarChart, RadialBar
} from 'recharts';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import WarningIcon from '@mui/icons-material/Warning';
import InventoryIcon from '@mui/icons-material/Inventory';
import AssignmentIcon from '@mui/icons-material/Assignment';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import RefreshIcon from '@mui/icons-material/Refresh';
import DashboardIcon from '@mui/icons-material/Dashboard';

const DashboardKPIs = () => {
  const [stats, setStats] = useState({
    totalStockValue: 0,
    lowStockCount: 0,
    totalParts: 0,
    pendingPRs: 0,
    criticalParts: 0,
    lowParts: 0,
    normalParts: 0,
    highParts: 0
  });
  const [parts, setParts] = useState([]);
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 1. Fetch Parts
        const partsSnapshot = await getDocs(collection(db, 'parts'));
        const partsData = partsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setParts(partsData);

        // 2. Fetch Movements
        const movementsRef = collection(db, 'movement_logs');
        const q = query(movementsRef, orderBy('timestamp', 'desc'));
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
        let criticalCount = 0;
        let lowCount = 0;
        let normalCount = 0;
        let highCount = 0;

        partsData.forEach(part => {
          const stock = Number(part.currentStock) || 0;
          const price = Number(part.unitPrice) || 0;
          const min = Number(part.safetyLevel) || Number(part.minStockLevel) || 0;
          const max = Number(part.maxStockLevel) || 100;

          totalValue += stock * price;

          if (stock <= min) lowStock++;

          // Inventory Health Calculation
          const healthPercentage = max > 0 ? (stock / max) * 100 : 0;
          if (healthPercentage < 10) criticalCount++;
          else if (healthPercentage < 30) lowCount++;
          else if (healthPercentage < 70) normalCount++;
          else highCount++;
        });

        setStats({
          totalStockValue: totalValue,
          lowStockCount: lowStock,
          totalParts: partsData.length,
          pendingPRs: prSnapshot.size,
          criticalParts: criticalCount,
          lowParts: lowCount,
          normalParts: normalCount,
          highParts: highCount
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
    if (!parts.length) return { categoryData: [], stockOutTrend: [], topParts: [], inventoryHealthData: [], movementComparison: [] };

    // 1. Category Data
    const categoryMap = {};
    parts.forEach(part => {
      const cat = part.category || 'Uncategorized';
      categoryMap[cat] = (categoryMap[cat] || 0) + 1;
    });
    const categoryData = Object.keys(categoryMap).map(key => ({ name: key, value: categoryMap[key] }));

    // 2. Inventory Health Data
    const inventoryHealthData = [
      { name: 'Critical', value: stats.criticalParts, fill: '#f44336' },
      { name: 'Low', value: stats.lowParts, fill: '#ff9800' },
      { name: 'Normal', value: stats.normalParts, fill: '#4caf50' },
      { name: 'High', value: stats.highParts, fill: '#2196f3' }
    ];

    // 3. Stock Movement Comparison (In vs Out)
    // Group movements by month
    const movementMap = {};
    movements.forEach(m => {
      const month = m.date.toLocaleString('default', { month: 'short' });
      if (!movementMap[month]) {
        movementMap[month] = { date: month, StockIn: 0, StockOut: 0 };
      }
      
      const quantity = Number(m.quantity) || 0;
      const part = parts.find(p => p.id === m.partId || p.sapNumber === m.sapNumber || p.name === m.partName);
      const value = quantity * (Number(part?.unitPrice) || 0);

      if (m.type === 'IN') {
        movementMap[month].StockIn += value;
      } else if (m.type === 'OUT') {
        movementMap[month].StockOut += value;
      }
    });

    const movementComparison = Object.values(movementMap).map(m => ({
      ...m,
      NetChange: m.StockIn - m.StockOut
    }));

    // 4. Stock Out Trends
    const filteredMovements = movements.filter(m => {
      const mYear = m.date.getFullYear();
      const mMonth = m.date.getMonth() + 1;
      const typeMatch = m.type === 'OUT';
      const yearMatch = mYear === selectedYear;
      const monthMatch = selectedMonth === 'All' || mMonth === selectedMonth;
      return typeMatch && yearMatch && monthMatch;
    });

    const trendMap = {};
    const partUsageMap = {};

    filteredMovements.forEach(m => {
      let key;
      if (selectedMonth === 'All') {
        key = m.date.toLocaleString('default', { month: 'short' });
      } else {
        key = m.date.getDate();
      }

      const part = parts.find(p => p.id === m.partId || p.sapNumber === m.sapNumber || p.name === m.partName);
      const price = part ? (Number(part.unitPrice) || 0) : 0;
      const value = (Number(m.quantity) || 0) * price;

      trendMap[key] = (trendMap[key] || 0) + value;

      const partName = m.partName || 'Unknown';
      partUsageMap[partName] = (partUsageMap[partName] || 0) + (Number(m.quantity) || 0);
    });

    let stockOutTrend = [];
    if (selectedMonth === 'All') {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      stockOutTrend = months.map(m => ({ name: m, value: trendMap[m] || 0 }));
    } else {
      const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
      for (let i = 1; i <= daysInMonth; i++) {
        stockOutTrend.push({ name: i, value: trendMap[i] || 0 });
      }
    }

    const topParts = Object.keys(partUsageMap)
      .map(key => ({ name: key, value: partUsageMap[key] }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    return { categoryData, stockOutTrend, topParts, inventoryHealthData, movementComparison };
  }, [parts, movements, selectedYear, selectedMonth, stats]);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  const KPICard = ({ title, value, icon, color, subtitle, trend }) => (
    <Card sx={{
      height: '100%',
      borderRadius: '12px',
      border: '1px solid #e2e8f0',
      backgroundColor: 'white',
      transition: 'all 0.3s ease',
      '&:hover': {
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
        transform: 'translateY(-4px)'
      }
    }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 600, mb: 1 }}>
              {title}
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 700, color: '#1e293b', mb: 0.5 }}>
              {value}
            </Typography>
            {subtitle && (
              <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                {subtitle}
              </Typography>
            )}
          </Box>
          <Box sx={{
            width: 48,
            height: 48,
            borderRadius: '10px',
            background: `linear-gradient(135deg, ${color}20, ${color}40)`,
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

  if (loading) {
    return (
      <Box sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: 'calc(100vh - 64px)',
        backgroundColor: '#f8fafc'
      }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{
      minHeight: 'calc(100vh - 64px)',
      backgroundColor: '#f8fafc',
      p: 3,
      width: '100%'
    }}>
      {/* Header Section */}
      <Box sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        mb: 4,
        flexWrap: 'wrap',
        gap: 2
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 56,
            height: 56,
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
            color: 'white',
            boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
          }}>
            <DashboardIcon sx={{ fontSize: 28 }} />
          </Box>
          <Box>
            <Typography variant="h4" sx={{
              fontWeight: 700,
              color: '#1e293b',
              mb: 0.5
            }}>
              Dashboard Overview
            </Typography>
            <Typography variant="body1" sx={{ color: '#64748b' }}>
              Inventory & Operations Analytics
            </Typography>
          </Box>
        </Box>

        {/* Filter Controls */}
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Year</InputLabel>
            <Select value={selectedYear} label="Year" onChange={(e) => setSelectedYear(e.target.value)}>
              {[2023, 2024, 2025, 2026].map(y => <MenuItem key={y} value={y}>{y}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Month</InputLabel>
            <Select value={selectedMonth} label="Month" onChange={(e) => setSelectedMonth(e.target.value)}>
              <MenuItem value="All">All Year</MenuItem>
              {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m, i) => (
                <MenuItem key={i} value={i + 1}>{m}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <Tooltip title="Refresh Dashboard">
            <IconButton
              onClick={() => window.location.reload()}
              sx={{
                color: '#3b82f6',
                backgroundColor: 'white',
                border: '1px solid #e2e8f0',
                '&:hover': {
                  backgroundColor: '#f8fafc'
                }
              }}
            >
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* KPI Cards Row */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <KPICard
            title="Total Inventory Value"
            value={`$${(stats.totalStockValue / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })}K`}
            icon={<AttachMoneyIcon fontSize="large" />}
            color="#10b981"
            subtitle="Estimated Valuation"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KPICard
            title="Low Stock Alerts"
            value={stats.lowStockCount}
            icon={<WarningIcon fontSize="large" />}
            color="#ef4444"
            subtitle="Items below safety level"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KPICard
            title="Total SKUs"
            value={stats.totalParts}
            icon={<InventoryIcon fontSize="large" />}
            color="#3b82f6"
            subtitle="Active parts in system"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KPICard
            title="Pending Requests"
            value={stats.pendingPRs}
            icon={<AssignmentIcon fontSize="large" />}
            color="#f59e0b"
            subtitle="Require approval"
          />
        </Grid>
      </Grid>

      {/* Inventory Health & Movement Comparison Row */}
      <Grid container spacing={3} mb={4}>
        {/* Inventory Health Gauge */}
        <Grid item xs={12} md={6}>
          <Paper elevation={0} sx={{
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            overflow: 'hidden',
            backgroundColor: 'white',
            p: 3
          }}>
            <Box sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 3
            }}>
              <Typography variant="h6" sx={{ fontWeight: 600, color: '#1e293b' }}>
                Inventory Health Status
              </Typography>
              <Box sx={{
                display: 'flex',
                gap: 1,
                flexWrap: 'wrap'
              }}>
                {dashboardData.inventoryHealthData.map((item, idx) => (
                  <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Box sx={{
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      backgroundColor: item.fill
                    }} />
                    <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.75rem' }}>
                      {item.name}: {item.value}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>
            <Divider sx={{ mb: 3 }} />
            <ResponsiveContainer width="100%" height={280}>
              <RadialBarChart data={dashboardData.inventoryHealthData}>
                <RadialBar
                  background
                  dataKey="value"
                  cornerRadius={10}
                  label={{ position: 'insideStart', fill: '#fff', fontSize: 12 }}
                />
                <ChartTooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0' }} />
              </RadialBarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Stock Movement Analysis */}
        <Grid item xs={12} md={6}>
          <Paper elevation={0} sx={{
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            overflow: 'hidden',
            backgroundColor: 'white',
            p: 3
          }}>
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, color: '#1e293b', mb: 1 }}>
                Stock Movement Analysis
              </Typography>
              <Typography variant="body2" sx={{ color: '#64748b' }}>
                Stock In vs Stock Out (Valuation Based)
              </Typography>
            </Box>
            <Divider sx={{ mb: 3 }} />
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={dashboardData.movementComparison} margin={{ top: 20, right: 30, bottom: 20, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" />
                <YAxis tickFormatter={(val) => `$${(val / 1000).toFixed(0)}K`} />
                <ChartTooltip
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0' }}
                  formatter={(value) => [`$${value.toLocaleString()}`, '']}
                />
                <Legend />
                <Bar dataKey="StockIn" fill="#10b981" radius={[8, 8, 0, 0]} />
                <Bar dataKey="StockOut" fill="#ef4444" radius={[8, 8, 0, 0]} />
                <Line type="monotone" dataKey="NetChange" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6', r: 4 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>

      {/* Stock Out Analysis & Top Parts Row */}
      <Grid container spacing={3} mb={4}>
        {/* Stock Usage / Sales Report */}
        <Grid item xs={12} lg={8}>
          <Paper elevation={0} sx={{
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            overflow: 'hidden',
            backgroundColor: 'white',
            p: 3
          }}>
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 1 }}>
                <TrendingUpIcon sx={{ color: '#3b82f6', fontSize: 20 }} />
                Stock Out Value Analysis
              </Typography>
              <Typography variant="body2" sx={{ color: '#64748b', mt: 1 }}>
                {selectedMonth === 'All' ? selectedYear : `${selectedMonth}/${selectedYear}`} - Valuation based on Unit Price
              </Typography>
            </Box>
            <Divider sx={{ mb: 3 }} />
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart data={dashboardData.stockOutTrend} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" />
                <YAxis tickFormatter={(val) => `$${(val / 1000).toFixed(0)}K`} />
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <ChartTooltip
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0' }}
                  formatter={(value) => [`$${value.toLocaleString()}`, 'Value']}
                />
                <Area type="monotone" dataKey="value" stroke="#3b82f6" fillOpacity={1} fill="url(#colorValue)" />
              </AreaChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Top Moving Items */}
        <Grid item xs={12} lg={4}>
          <Paper elevation={0} sx={{
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            overflow: 'hidden',
            backgroundColor: 'white',
            p: 3
          }}>
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#1e293b', mb: 3 }}>
              Top Moving Items (Qty)
            </Typography>
            <Divider sx={{ mb: 3 }} />
            <ResponsiveContainer width="100%" height={350}>
              <BarChart layout="vertical" data={dashboardData.topParts} margin={{ top: 5, right: 30, left: 100, bottom: 5 }}>
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} />
                <ChartTooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0' }} />
                <Bar dataKey="value" fill="#10b981" radius={[0, 8, 8, 0]}>
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
          <Paper elevation={0} sx={{
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            overflow: 'hidden',
            backgroundColor: 'white',
            p: 3
          }}>
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#1e293b', mb: 3 }}>
              Inventory by Category
            </Typography>
            <Divider sx={{ mb: 3 }} />
            <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie
                  data={dashboardData.categoryData}
                  cx="40%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={120}
                  paddingAngle={5}
                  dataKey="value"
                  label={{ fontSize: 12 }}
                >
                  {dashboardData.categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <ChartTooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0' }} />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Summary Info Card */}
        <Grid item xs={12} md={6}>
          <Paper elevation={0} sx={{
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            overflow: 'hidden',
            backgroundColor: 'white',
            p: 3
          }}>
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#1e293b', mb: 3 }}>
              Inventory Health Summary
            </Typography>
            <Divider sx={{ mb: 3 }} />
            <Box sx={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 2,
              height: 350,
              alignContent: 'center'
            }}>
              {[
                { label: 'Critical Stock', value: stats.criticalParts, color: '#f44336', icon: '⚠️' },
                { label: 'Low Stock', value: stats.lowParts, color: '#ff9800', icon: '📉' },
                { label: 'Normal Stock', value: stats.normalParts, color: '#4caf50', icon: '✓' },
                { label: 'High Stock', value: stats.highParts, color: '#2196f3', icon: '📈' }
              ].map((item, idx) => (
                <Box
                  key={idx}
                  sx={{
                    p: 2,
                    borderRadius: '12px',
                    backgroundColor: `${item.color}10`,
                    border: `2px solid ${item.color}`,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center'
                  }}
                >
                  <Typography sx={{ fontSize: 32, mb: 1 }}>
                    {item.icon}
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: item.color, mb: 0.5 }}>
                    {item.value}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#64748b', textAlign: 'center' }}>
                    {item.label}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Paper>
        </Grid>
      </Grid>

    </Box>
  );
};

export default DashboardKPIs;
