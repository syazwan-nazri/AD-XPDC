import React, { useEffect, useState, useMemo } from 'react';
import { db } from '../../firebase/config';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import {
  Grid, Paper, Typography, Box, Card, CardContent, Divider, MenuItem,
  Select, FormControl, InputLabel, Tooltip, IconButton, CircularProgress,
  Chip, useMediaQuery, useTheme
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
import CategoryIcon from '@mui/icons-material/Category';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import BuildIcon from '@mui/icons-material/Build';
import StorageIcon from '@mui/icons-material/Storage';

const DashboardKPIs = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));

  const [stats, setStats] = useState({
    totalStockValue: 0,
    lowStockCount: 0,
    totalParts: 0,
    pendingPRs: 0,
    criticalParts: 0,
    lowParts: 0,
    normalParts: 0,
    highParts: 0,
    recentMovements: 0,
    pendingMRFs: 0
  });
  const [parts, setParts] = useState([]);
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [timeRange, setTimeRange] = useState('month');

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('🔍 Starting data fetch...');

        // 1. Fetch Parts
        const partsSnapshot = await getDocs(collection(db, 'parts'));
        const partsData = partsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setParts(partsData);
        console.log('Fetched Parts:', partsData.length);

        // 2. Fetch Movements - Simple query first to test
        console.log('📦 Attempting to fetch movement_logs...');

        let movementsData = [];

        // First try: simple fetch without any query
        try {
          const simpleSnapshot = await getDocs(collection(db, 'movement_logs'));
          console.log('📊 Simple fetch result - Total docs:', simpleSnapshot.size);

          if (simpleSnapshot.size > 0) {
            movementsData = simpleSnapshot.docs.map(doc => {
              const data = doc.data();
              let parsedDate = null;

              // Try multiple ways to parse the date
              if (data.timestamp && typeof data.timestamp.toDate === 'function') {
                parsedDate = data.timestamp.toDate();
              } else if (data.date && typeof data.date.toDate === 'function') {
                parsedDate = data.date.toDate();
              } else if (data.timestamp instanceof Date) {
                parsedDate = data.timestamp;
              } else if (data.date instanceof Date) {
                parsedDate = data.date;
              } else if (typeof data.timestamp === 'string') {
                parsedDate = new Date(data.timestamp);
              } else if (typeof data.date === 'string') {
                parsedDate = new Date(data.date);
              } else if (typeof data.timestamp === 'number') {
                parsedDate = new Date(data.timestamp);
              } else if (typeof data.date === 'number') {
                parsedDate = new Date(data.date);
              }

              // Fallback to current date if nothing works
              if (!parsedDate || isNaN(parsedDate.getTime())) {
                console.warn('⚠️ Could not parse date for document:', doc.id, data);
                parsedDate = new Date();
              }

              return {
                id: doc.id,
                ...data,
                date: parsedDate
              };
            });
            console.log('✅ Total Movements Fetched:', movementsData.length);
            if (movementsData.length > 0) {
              console.log('✅ First Movement:', movementsData[0]);
              // Show date range of movements
              const dates = movementsData.map(m => m.date.toLocaleDateString());
              const uniqueDates = [...new Set(dates)];
              console.log('📅 Movement dates available:', uniqueDates.sort());
            }
          } else {
            console.warn('⚠️ movement_logs collection returned 0 documents');
            movementsData = [];
          }
        } catch (fetchError) {
          console.error('❌ Error fetching movements:', fetchError.message);
          movementsData = [];
        }

        setMovements(movementsData);

        // 3. Fetch PRs
        const prQuery = query(collection(db, 'purchase_requisitions'), where('status', '==', 'Pending'));
        const prSnapshot = await getDocs(prQuery);

        // 4. Fetch MRFs
        const mrfQuery = query(collection(db, 'material_request_forms'), where('status', '==', 'pending'));
        const mrfSnapshot = await getDocs(mrfQuery);

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
          const max = Number(part.maxStockLevel) || Math.max(min * 3, 100);

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
          highParts: highCount,
          recentMovements: movementsData.length,
          pendingMRFs: mrfSnapshot.size
        });

      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Color palette
  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

  // Filtered Data Calculations
  const dashboardData = useMemo(() => {
    if (!parts.length) return {
      categoryData: [],
      stockOutTrend: [],
      topParts: [],
      inventoryHealthData: [],
      movementComparison: [],
      recentActivity: [],
      quickStats: []
    };

    // 1. Category Data
    const categoryMap = {};
    parts.forEach(part => {
      const cat = part.category || 'Uncategorized';
      categoryMap[cat] = (categoryMap[cat] || 0) + 1;
    });
    const categoryData = Object.keys(categoryMap).map(key => ({
      name: key,
      value: categoryMap[key],
      color: COLORS[Object.keys(categoryMap).indexOf(key) % COLORS.length]
    }));

    // 2. Inventory Health Data
    const inventoryHealthData = [
      { name: 'Critical', value: stats.criticalParts, fill: '#ef4444', description: '< 10% stock' },
      { name: 'Low', value: stats.lowParts, fill: '#f59e0b', description: '10-30% stock' },
      { name: 'Normal', value: stats.normalParts, fill: '#10b981', description: '30-70% stock' },
      { name: 'High', value: stats.highParts, fill: '#3b82f6', description: '> 70% stock' }
    ];

    // 3. Stock Movement Comparison (In vs Out) - APPLY FILTERS
    const movementMap = {};

    // Calculate filter date range based on timeRange
    let filterStartDate = new Date();
    let filterEndDate = new Date();

    // For past years, we need to adjust the end date to be the end of that year
    const isCurrentYear = selectedYear === new Date().getFullYear();
    const referenceDate = isCurrentYear ? new Date() : new Date(selectedYear, 11, 31);

    if (timeRange === 'day') {
      filterStartDate = new Date(referenceDate);
      filterStartDate.setDate(filterStartDate.getDate() - 1);
      filterEndDate = new Date(referenceDate);
    } else if (timeRange === 'week') {
      filterStartDate = new Date(referenceDate);
      filterStartDate.setDate(filterStartDate.getDate() - 7);
      filterEndDate = new Date(referenceDate);
    } else if (timeRange === 'month') {
      filterStartDate = new Date(referenceDate);
      filterStartDate.setMonth(filterStartDate.getMonth() - 1);
      filterEndDate = new Date(referenceDate);
    } else if (timeRange === 'quarter') {
      filterStartDate = new Date(referenceDate);
      filterStartDate.setMonth(filterStartDate.getMonth() - 3);
      filterEndDate = new Date(referenceDate);
    } else if (timeRange === 'year') {
      filterStartDate = new Date(selectedYear, 0, 1); // Jan 1 of selected year
      filterEndDate = new Date(selectedYear, 11, 31); // Dec 31 of selected year
    }

    // Set start time to beginning of day
    filterStartDate.setHours(0, 0, 0, 0);
    filterEndDate.setHours(23, 59, 59, 999);

    console.log('=== STOCK MOVEMENT ANALYSIS ===');
    console.log('Total movements available:', movements.length);
    console.log('Filter range:', filterStartDate.toLocaleDateString(), 'to', filterEndDate.toLocaleDateString());
    console.log('Time range selected:', timeRange);
    console.log('Selected Year:', selectedYear);

    let processedCount = 0;
    let inTotal = 0, outTotal = 0, transferTotal = 0;

    movements.forEach(m => {
      if (!m.date) {
        console.warn('Movement missing date:', m);
        return;
      }

      const date = m.date;
      const dateYear = date.getFullYear();

      // First apply year filter
      if (dateYear !== selectedYear) {
        return;
      }

      // Then apply time range filter (within selected year only)
      if (date < filterStartDate || date > filterEndDate) {
        return;
      }

      processedCount++;

      // Create consistent date key in YYYY-MM-DD format for sorting
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const dateKey = `${year}-${month}-${day}`;

      // Display format (e.g., "Jan 9")
      const displayDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

      if (!movementMap[dateKey]) {
        movementMap[dateKey] = {
          date: displayDate,
          dateKey: dateKey,
          StockIn: 0,
          StockOut: 0,
          Transfers: 0
        };
      }

      const quantity = Number(m.quantity) || 0;

      // Handle multiple possible field names for type
      const movementType = (m.type || m.movementType || m.movement_type || '').toUpperCase();

      // Count number of transactions (each movement record = 1 transaction)
      if (movementType === 'IN' || movementType === 'STOCK IN' || movementType === 'INWARD') {
        movementMap[dateKey].StockIn += 1;
        inTotal += 1;
      } else if (movementType === 'OUT' || movementType === 'STOCK OUT' || movementType === 'OUTWARD') {
        movementMap[dateKey].StockOut += 1;
        outTotal += 1;
      } else if (movementType === 'TRANSFER' || movementType === 'INTERNAL TRANSFER') {
        movementMap[dateKey].Transfers += 1;
        transferTotal += 1;
      }
    });

    console.log(`✅ Processed ${processedCount} movements within filter range`);
    console.log(`Totals - Stock In: ${inTotal} transactions | Stock Out: ${outTotal} transactions | Transfers: ${transferTotal} transactions`);

    // Sort by actual date and calculate net change - Show all processed data or last 15 days
    const movementComparison = Object.values(movementMap)
      .sort((a, b) => new Date(a.dateKey) - new Date(b.dateKey))
      .map(item => ({
        ...item,
        NetChange: item.StockIn - item.StockOut
      }));

    console.log('Final chart data points:', movementComparison.length);
    console.log('Chart data:', movementComparison);
    console.log('=== END STOCK MOVEMENT ANALYSIS ===');;

    // 4. Top Moving Items (Updated to use Stock Code/SAP Number)
    const partUsageMap = {};
    movements.forEach(m => {
      // Try to find part details from parts list to get SAP/Stock Code if missing in movement log
      const partDef = parts.find(p => p.id === m.partId);

      const stockCode = m.sapNumber || partDef?.sapNumber || 'N/A';
      const partName = m.partName || partDef?.name || 'Unknown';

      // Use stockCode as key if available, otherwise partName (fallback)
      const key = stockCode !== 'N/A' ? stockCode : partName;

      if (!partUsageMap[key]) {
        partUsageMap[key] = {
          name: partName,
          stockCode: stockCode,
          value: 0
        };
      }
      partUsageMap[key].value += (Number(m.quantity) || 0);
    });

    const topParts = Object.values(partUsageMap)
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);

    // 5. Recent Activity - Last 5 Stock Transactions (IN, OUT, TRANSFER only)
    const recentActivity = movements
      .filter(m => {
        const movementType = (m.type || m.movementType || m.movement_type || '').toUpperCase();
        return (
          movementType === 'IN' ||
          movementType === 'STOCK IN' ||
          movementType === 'INWARD' ||
          movementType === 'OUT' ||
          movementType === 'STOCK OUT' ||
          movementType === 'OUTWARD' ||
          movementType === 'TRANSFER' ||
          movementType === 'INTERNAL TRANSFER'
        );
      })
      .sort((a, b) => b.date - a.date) // Sort by date descending (most recent first)
      .slice(0, 5)
      .map(m => {
        const movementType = (m.type || m.movementType || m.movement_type || '').toUpperCase();
        let displayType = 'Transfer';
        if (movementType === 'IN' || movementType === 'STOCK IN' || movementType === 'INWARD') {
          displayType = 'Stock In';
        } else if (movementType === 'OUT' || movementType === 'STOCK OUT' || movementType === 'OUTWARD') {
          displayType = 'Stock Out';
        }

        return {
          id: m.id,
          type: displayType,
          part: m.partName || m.part_name || 'Unknown',
          quantity: m.quantity || 0,
          date: m.date.toLocaleDateString(),
          time: m.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          user: m.user || m.createdBy || 'System'
        };
      });

    // 6. Quick Stats
    const quickStats = [
      { label: 'Inventory Turnover', value: '4.2', unit: 'months', icon: '🔄', color: '#3b82f6' },
      { label: 'Stock Accuracy', value: '98.5', unit: '%', icon: '🎯', color: '#10b981' },
      { label: 'Avg Lead Time', value: '7.2', unit: 'days', icon: '⏱️', color: '#f59e0b' },
      { label: 'Fill Rate', value: '94', unit: '%', icon: '📦', color: '#8b5cf6' }
    ];

    return {
      categoryData,
      stockOutTrend: movementComparison,
      topParts,
      inventoryHealthData,
      movementComparison,
      recentActivity,
      quickStats
    };
  }, [parts, movements, stats, timeRange, selectedYear]);

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
          <Box flex={1}>
            <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 600, mb: 1 }}>
              {title}
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 700, color: '#1e293b', mb: 0.5 }}>
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
            justifyContent: 'center',
            ml: 2
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
      minHeight: '100vh',
      backgroundColor: '#f8fafc',
      p: 0,
      width: '100%',
      overflowX: 'hidden',
      // REMOVED: marginLeft: '240px' and width calculation
      // Let the sidebar handle its own space
      // The content will naturally flow to the right of the sidebar
    }}>
      {/* Header Section */}
      <Box sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        mb: 0,
        flexWrap: 'wrap',
        gap: 2,
        p: 3,
        backgroundColor: 'white',
        borderBottom: '1px solid #e2e8f0',
        position: 'relative',
        width: '100%',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
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
              Real-time inventory & operations analytics
            </Typography>
          </Box>
        </Box>

        {/* Filter Controls */}
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <Select value={timeRange} onChange={(e) => setTimeRange(e.target.value)}>
              <MenuItem value="day">Today</MenuItem>
              <MenuItem value="week">This Week</MenuItem>
              <MenuItem value="month">This Month</MenuItem>
              <MenuItem value="quarter">This Quarter</MenuItem>
              <MenuItem value="year">This Year</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Year</InputLabel>
            <Select value={selectedYear} label="Year" onChange={(e) => setSelectedYear(e.target.value)}>
              {[2023, 2024, 2025, 2026].map(y => <MenuItem key={y} value={y}>{y}</MenuItem>)}
            </Select>
          </FormControl>
          <Tooltip title="Refresh Dashboard">
            <IconButton
              onClick={() => window.location.reload()}
              sx={{
                color: '#3b82f6',
                backgroundColor: '#f0f4ff',
                border: '1px solid #e2e8f0',
                '&:hover': {
                  backgroundColor: '#e0e8ff'
                }
              }}
            >
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>



      {/* Content Area */}
      <Box sx={{
        p: 3,
        width: '100%'
      }}>
        {/* Top KPI Cards - Full Width Row */}
        <Grid container spacing={3} sx={{ mb: 4, width: '100%' }}>
          <Grid item xs={12} sm={6} md={3}>
            <KPICard
              title="Total Inventory Value"
              value={`$${(stats.totalStockValue / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })}K`}
              icon={<AttachMoneyIcon fontSize="large" />}
              color="#10b981"
              subtitle="Current valuation"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <KPICard
              title="Low Stock Alerts"
              value={stats.lowStockCount}
              icon={<WarningIcon fontSize="large" />}
              color="#ef4444"
              subtitle="Require attention"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <KPICard
              title="Active SKUs"
              value={stats.totalParts}
              icon={<InventoryIcon fontSize="large" />}
              color="#3b82f6"
              subtitle="Total parts"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <KPICard
              title="Pending Requests"
              value={stats.pendingPRs + stats.pendingMRFs}
              icon={<AssignmentIcon fontSize="large" />}
              color="#f59e0b"
              subtitle="PRs & MRFs"
            />
          </Grid>
        </Grid>

        {/* Main Charts Row - Optimized Layout */}
        <Grid container spacing={3} sx={{ mb: 4, width: '100%' }}>
          {/* Stock Movement Analysis - Takes more space */}
          <Grid item xs={12} lg={8}>
            <Paper elevation={0} sx={{
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              backgroundColor: 'white',
              p: 3,
              height: '100%'
            }}>
              <Box sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: 3,
                flexWrap: 'wrap',
                gap: 2
              }}>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: '#1e293b', mb: 1 }}>
                    Stock Movement Analysis
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#64748b' }}>
                    Stock In vs Stock Out Comparison
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Chip size="small" label="Stock In" sx={{ backgroundColor: '#10b98120', color: '#10b981' }} />
                  <Chip size="small" label="Stock Out" sx={{ backgroundColor: '#ef444420', color: '#ef4444' }} />
                  <Chip size="small" label="Internal Transfer" sx={{ backgroundColor: '#8b5cf620', color: '#8b5cf6' }} />
                </Box>
              </Box>
              <Divider sx={{ mb: 3 }} />
              <Box sx={{ height: 350, width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dashboardData.movementComparison} margin={{ top: 10, right: 30, left: 70, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="date"
                      angle={-45}
                      textAnchor="end"
                      height={60}
                      label={{ value: 'Date', position: 'insideBottom', offset: -5 }}
                    />
                    <YAxis
                      tickFormatter={(val) => val.toLocaleString()}
                      tickMargin={12}
                      label={{ value: 'Total Transaction', angle: -90, position: 'insideLeft', offset: 10, style: { textAnchor: 'middle' } }}
                    />
                    <ChartTooltip
                      formatter={(value, name) => {
                        return [`${value} transaction(s)`, name];
                      }}
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                    />
                    <Line type="monotone" dataKey="StockIn" stroke="#10b981" strokeWidth={2} dot={false} name="Stock In" />
                    <Line type="monotone" dataKey="StockOut" stroke="#ef4444" strokeWidth={2} dot={false} name="Stock Out" />
                    <Line type="monotone" dataKey="Transfers" stroke="#8b5cf6" strokeWidth={2} dot={false} name="Internal Transfer" />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            </Paper>
          </Grid>

          {/* Inventory Health & Quick Stats - Side Panel */}
          <Grid item xs={12} lg={4}>
            <Grid container spacing={3} sx={{ height: '100%' }}>
              {/* Inventory Health */}
              <Grid item xs={12}>
                <Paper elevation={0} sx={{
                  borderRadius: '16px',
                  border: '1px solid #e2e8f0',
                  backgroundColor: 'white',
                  p: 3,
                  height: '100%'
                }}>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: '#1e293b', mb: 3 }}>
                    Inventory Health Status
                  </Typography>
                  <Divider sx={{ mb: 3 }} />
                  <Box sx={{ height: 220 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <RadialBarChart data={dashboardData.inventoryHealthData} innerRadius="10%" outerRadius="80%">
                        <RadialBar
                          background={{ fill: '#f8fafc' }}
                          dataKey="value"
                          cornerRadius={8}
                          label={{ position: 'insideStart', fill: '#fff', fontSize: 10 }}
                        />
                        <ChartTooltip
                          formatter={(value, name, props) => [
                            `${value} items`,
                            props.payload.description
                          ]}
                        />
                      </RadialBarChart>
                    </ResponsiveContainer>
                  </Box>
                  <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2, mt: 3 }}>
                    {dashboardData.inventoryHealthData.map((item, idx) => (
                      <Box key={idx} sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        p: 1.5,
                        borderRadius: '8px',
                        backgroundColor: `${item.fill}10`,
                        border: `1px solid ${item.fill}20`
                      }}>
                        <Box sx={{
                          width: 12,
                          height: 12,
                          borderRadius: '50%',
                          backgroundColor: item.fill
                        }} />
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
                            {item.name}
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: '#1e293b' }}>
                            {item.value} items
                          </Typography>
                        </Box>
                      </Box>
                    ))}
                  </Box>
                </Paper>
              </Grid>

              {/* Recent Activity */}
              <Grid item xs={12}>
                <Paper elevation={0} sx={{
                  borderRadius: '16px',
                  border: '1px solid #e2e8f0',
                  backgroundColor: 'white',
                  p: 3,
                  height: '100%'
                }}>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: '#1e293b', mb: 3 }}>
                    Past Transactions
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  <Box sx={{ maxHeight: '100%', overflowY: 'auto' }}>
                    {dashboardData.recentActivity.map((activity, idx) => (
                      <Box key={idx} sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                        p: 1.5,
                        borderRadius: '8px',
                        mb: 1,
                        backgroundColor: idx % 2 === 0 ? '#f8fafc' : 'transparent',
                        '&:hover': { backgroundColor: '#f1f5f9' }
                      }}>
                        <Box sx={{
                          width: 36,
                          height: 36,
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: activity.type === 'Stock In' ? '#10b98120' :
                            activity.type === 'Stock Out' ? '#ef444420' : '#8b5cf620',
                          color: activity.type === 'Stock In' ? '#10b981' :
                            activity.type === 'Stock Out' ? '#ef4444' : '#8b5cf6',
                          fontSize: '18px',
                          fontWeight: 700
                        }}>
                          {activity.type === 'Stock In' ? '📥' : activity.type === 'Stock Out' ? '📤' : '🔁'}
                        </Box>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 500, color: '#1e293b' }}>
                            {activity.part}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#64748b' }}>
                            {activity.quantity} units • {activity.date} {activity.time}
                          </Typography>
                        </Box>
                      </Box>
                    ))}
                  </Box>
                </Paper>
              </Grid>
            </Grid>
          </Grid>
        </Grid>

        {/* Bottom Charts Row - Full Width */}
        <Grid container spacing={3} sx={{ width: '100%' }}>
          {/* Category Distribution */}
          <Grid item xs={12} md={6} lg={4}>
            <Paper elevation={0} sx={{
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              backgroundColor: 'white',
              p: 3,
              height: '100%'
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                <CategoryIcon sx={{ color: '#3b82f6' }} />
                <Typography variant="h6" sx={{ fontWeight: 600, color: '#1e293b' }}>
                  Category Distribution
                </Typography>
              </Box>
              <Divider sx={{ mb: 3 }} />
              <Box sx={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={dashboardData.categoryData.slice(0, 6)}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {dashboardData.categoryData.slice(0, 6).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <ChartTooltip formatter={(value) => [`${value} items`, 'Count']} />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
              <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {dashboardData.categoryData.slice(0, 6).map((cat, idx) => (
                  <Chip
                    key={idx}
                    size="small"
                    label={`${cat.name}: ${cat.value}`}
                    sx={{ backgroundColor: `${cat.color}10`, color: cat.color }}
                  />
                ))}
              </Box>
            </Paper>
          </Grid>

          {/* Top Moving Items */}
          <Grid item xs={12} md={6} lg={4}>
            <Paper elevation={0} sx={{
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              backgroundColor: 'white',
              p: 3,
              height: '100%'
            }}>
              <Box sx={{ display: 'flex', alignItems: 'left', gap: 1, mb: 3 }}>
                <LocalShippingIcon sx={{ color: '#10b981' }} />
                <Typography variant="h6" sx={{ fontWeight: 600, color: '#1e293b' }}>
                  Top Moving Items
                </Typography>
              </Box>
              <Divider sx={{ mb: 3 }} />
              <Box sx={{ height: 300, overflowY: 'auto', px: 1 }}>
                {/* Header */}
                <Box sx={{
                  display: 'flex',
                  alignItems: 'center',
                  mb: 2,
                  p: 1.5,
                  bgcolor: '#f8fafc',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0'
                }}>
                  <Typography variant="caption" sx={{ width: 40, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>#</Typography>
                  <Typography variant="caption" sx={{ flex: 1, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Stock Code</Typography>
                  <Typography variant="caption" sx={{ width: 80, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', textAlign: 'right' }}>Quantity</Typography>
                </Box>

                {/* List Items */}
                {dashboardData.topParts.map((entry, index) => (
                  <Box key={index} sx={{
                    display: 'flex',
                    alignItems: 'center',
                    mb: 2,
                    p: 0.5,
                    '&:hover': { bgcolor: '#f8fafc', borderRadius: '8px' }
                  }}>
                    <Box sx={{
                      width: 40,
                      display: 'flex',
                      justifyContent: 'flex-start',
                      pl: 1
                    }}>
                      <Typography variant="body2" sx={{
                        fontWeight: 700,
                        color: index < 3 ? COLORS[index] : '#94a3b8',
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: index < 3 ? `${COLORS[index]}15` : 'transparent'
                      }}>
                        {index + 1}
                      </Typography>
                    </Box>
                    <Box sx={{ flex: 1, pr: 3 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: '#1e293b', mb: 0.5 }}>
                        {entry.stockCode !== 'N/A' ? entry.stockCode : entry.name}
                      </Typography>
                      {/* Subtitle with Name if Stock Code is displayed */}
                      {entry.stockCode !== 'N/A' && (
                        <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mt: -0.5, mb: 0.5 }}>
                          {entry.name}
                        </Typography>
                      )}
                      {/* Visual Bar */}
                      <Box sx={{
                        width: '100%',
                        height: 6,
                        bgcolor: '#f1f5f9',
                        borderRadius: 3,
                        overflow: 'hidden'
                      }}>
                        <Box sx={{
                          width: `${(entry.value / (dashboardData.topParts[0]?.value || 1)) * 100}%`,
                          height: '100%',
                          bgcolor: COLORS[index % COLORS.length],
                          borderRadius: 3,
                          transition: 'width 1s ease-in-out'
                        }} />
                      </Box>
                    </Box>
                    <Typography variant="body2" sx={{ width: 80, fontWeight: 700, color: '#3b82f6', textAlign: 'right', pr: 1 }}>
                      {entry.value}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Paper>
          </Grid>

          {/* Performance Metrics */}
          <Grid item xs={12} lg={4}>
            <Paper elevation={0} sx={{
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              backgroundColor: 'white',
              p: 3,
              height: '100%'
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                <TrendingUpIcon sx={{ color: '#f59e0b' }} />
                <Typography variant="h6" sx={{ fontWeight: 600, color: '#1e293b' }}>
                  Performance Metrics
                </Typography>
              </Box>
              <Divider sx={{ mb: 3 }} />
              <Box sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 2,
                height: 'auto'
              }}>
                {dashboardData.quickStats.map((stat, idx) => (
                  <Card key={idx} sx={{
                    p: 2,
                    borderRadius: '12px',
                    border: `2px solid ${stat.color}20`,
                    backgroundColor: `${stat.color}05`,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      backgroundColor: `${stat.color}10`,
                      transform: 'translateY(-2px)'
                    }
                  }}>
                    <Typography sx={{ fontSize: 32, mb: 1 }}>
                      {stat.icon}
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 700, color: stat.color, mb: 0.5 }}>
                      {stat.value}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#64748b', textAlign: 'center', mb: 0.5 }}>
                      {stat.label}
                    </Typography>
                    <Typography variant="caption" sx={{ color: stat.color, fontWeight: 600 }}>
                      {stat.unit}
                    </Typography>
                  </Card>
                ))}
                {/* Additional Stats */}
                <Card sx={{
                  p: 2,
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  gridColumn: 'span 2',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2
                }}>
                  <Box sx={{
                    width: 48,
                    height: 48,
                    borderRadius: '8px',
                    backgroundColor: '#f0f4ff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#3b82f6'
                  }}>
                    <BuildIcon />
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#1e293b' }}>
                      Active Maintenance
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: '#3b82f6' }}>
                      {stats.pendingMRFs}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#64748b' }}>
                      Material requests pending
                    </Typography>
                  </Box>
                </Card>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
};

export default DashboardKPIs;