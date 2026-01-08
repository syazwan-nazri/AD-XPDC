import React, { useEffect, useState } from 'react';
import { db } from '../../firebase/config';
import { collection, getDocs, orderBy, query, Timestamp } from 'firebase/firestore';
import { 
  Box, 
  Typography, 
  Paper, 
  Table, 
  TableHead, 
  TableRow, 
  TableCell, 
  TableBody, 
  Chip, 
  Card, 
  TextField, 
  InputAdornment,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  IconButton,
  Tooltip,
  Grid,
  Button,
  Alert,
  CircularProgress,
  TablePagination,
  Stack
} from '@mui/material';
import { 
  History, 
  Search, 
  FilterList, 
  Refresh, 
  Download,
  ArrowUpward,
  ArrowDownward,
  SwapHoriz,
  CalendarToday,
  Person,
  Inventory,
  Clear
} from '@mui/icons-material';

const MovementLog = () => {
  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortField, setSortField] = useState('date');
  const [sortDirection, setSortDirection] = useState('desc');
  const [stats, setStats] = useState({ total: 0, in: 0, out: 0, transfer: 0 });

  useEffect(() => {
    fetchLogs();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [logs, searchTerm, filterType, dateRange, sortField, sortDirection]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const q = query(collection(db, 'movement_logs'), orderBy('date', 'desc'));
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => {
        const logData = doc.data();
        return { 
          ...logData, 
          id: doc.id,
          date: logData.date?.toDate ? logData.date.toDate() : new Date(logData.date)
        };
      });
      setLogs(data);
      calculateStats(data);
    } catch (error) {
      console.error("Error fetching logs:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (logData) => {
    const stats = {
      total: logData.length,
      in: logData.filter(log => log.type === 'IN').length,
      out: logData.filter(log => log.type === 'OUT').length,
      transfer: logData.filter(log => log.type === 'TRANSFER').length
    };
    setStats(stats);
  };

  const applyFilters = () => {
    let filtered = [...logs];

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(log => 
        log.partName?.toLowerCase().includes(term) ||
        log.sapNumber?.toLowerCase().includes(term) ||
        log.userName?.toLowerCase().includes(term) ||
        log.remarks?.toLowerCase().includes(term) ||
        log.supplier?.toLowerCase().includes(term) ||
        log.receiver?.toLowerCase().includes(term) ||
        log.fromLocation?.toLowerCase().includes(term) ||
        log.toLocation?.toLowerCase().includes(term)
      );
    }

    // Apply type filter
    if (filterType !== 'ALL') {
      filtered = filtered.filter(log => log.type === filterType);
    }

    // Apply date range filter
    if (dateRange.start) {
      const startDate = new Date(dateRange.start);
      filtered = filtered.filter(log => log.date >= startDate);
    }
    if (dateRange.end) {
      const endDate = new Date(dateRange.end);
      endDate.setHours(23, 59, 59, 999); // End of day
      filtered = filtered.filter(log => log.date <= endDate);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

      if (sortField === 'date') {
        aValue = a.date;
        bValue = b.date;
      } else if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredLogs(filtered);
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilterType('ALL');
    setDateRange({ start: '', end: '' });
  };

  const formatDateTime = (date) => {
    if (!date) return 'N/A';
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'IN': return 'success';
      case 'OUT': return 'error';
      case 'TRANSFER': return 'secondary';
      default: return 'default';
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'IN': return <ArrowUpward fontSize="small" />;
      case 'OUT': return <ArrowDownward fontSize="small" />;
      case 'TRANSFER': return <SwapHoriz fontSize="small" />;
      default: return null;
    }
  };

  const getQuantityDisplay = (log) => {
    if (log.type === 'TRANSFER') {
      return '—';
    }
    const prefix = log.type === 'IN' ? '+' : '-';
    return `${prefix}${log.quantity || 0}`;
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const getDisplayDetails = (log) => {
    switch (log.type) {
      case 'IN':
        return log.supplier ? `Supplier: ${log.supplier}` : null;
      case 'OUT':
        return log.receiver ? `Receiver: ${log.receiver}` : null;
      case 'TRANSFER':
        return log.fromLocation && log.toLocation 
          ? `${log.fromLocation} → ${log.toLocation}` 
          : null;
      default:
        return null;
    }
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Type', 'Part Name', 'SAP #', 'Quantity', 'User', 'Details', 'Remarks'];
    const csvData = filteredLogs.map(log => [
      formatDateTime(log.date),
      log.type,
      log.partName || 'N/A',
      log.sapNumber || 'N/A',
      getQuantityDisplay(log),
      log.userName || 'N/A',
      getDisplayDetails(log) || '',
      log.remarks || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `movement-logs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <Box sx={{ 
      minHeight: 'calc(100vh - 64px)',
      backgroundColor: '#f8fafc',
      p: 3,
      width: '100%',
      ml: 0,
      mr: 0
    }}>
      {/* Main Content Container */}
      <Box sx={{ 
        width: '100%',
        maxWidth: 'none',
        margin: '0 auto'
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
              background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
              color: 'white',
              boxShadow: '0 4px 12px rgba(5, 150, 105, 0.3)'
            }}>
              <History sx={{ fontSize: 28 }} />
            </Box>
            <Box>
              <Typography variant="h4" sx={{ 
                fontWeight: 700, 
                color: '#1e293b',
                mb: 0.5
              }}>
                Movement Logs
              </Typography>
              <Typography variant="body1" sx={{ color: '#64748b' }}>
                Track all inventory movements and transactions
              </Typography>
            </Box>
          </Box>

          {/* Stats Cards */}
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Card sx={{ 
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              backgroundColor: 'white',
              px: 2,
              py: 1.5,
              minWidth: 120
            }}>
              <Box>
                <Typography variant="body2" sx={{ color: '#64748b' }}>
                  Total Logs
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 600, color: '#1e293b' }}>
                  {stats.total}
                </Typography>
              </Box>
            </Card>
            <Card sx={{ 
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              backgroundColor: 'white',
              px: 2,
              py: 1.5,
              minWidth: 120
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <ArrowUpward sx={{ color: '#10b981', fontSize: 18 }} />
                <Box>
                  <Typography variant="body2" sx={{ color: '#64748b' }}>
                    Stock In
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: '#1e293b' }}>
                    {stats.in}
                  </Typography>
                </Box>
              </Box>
            </Card>
            <Card sx={{ 
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              backgroundColor: 'white',
              px: 2,
              py: 1.5,
              minWidth: 120
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <ArrowDownward sx={{ color: '#ef4444', fontSize: 18 }} />
                <Box>
                  <Typography variant="body2" sx={{ color: '#64748b' }}>
                    Stock Out
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: '#1e293b' }}>
                    {stats.out}
                  </Typography>
                </Box>
              </Box>
            </Card>
            <Card sx={{ 
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              backgroundColor: 'white',
              px: 2,
              py: 1.5,
              minWidth: 120
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <SwapHoriz sx={{ color: '#8b5cf6', fontSize: 18 }} />
                <Box>
                  <Typography variant="body2" sx={{ color: '#64748b' }}>
                    Transfers
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: '#1e293b' }}>
                    {stats.transfer}
                  </Typography>
                </Box>
              </Box>
            </Card>
          </Box>
        </Box>

        {/* Search and Filter Section */}
        <Paper elevation={0} sx={{ 
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
          backgroundColor: 'white',
          mb: 4,
          width: '100%'
        }}>
          <Box sx={{ 
            p: 3, 
            borderBottom: '1px solid #e2e8f0',
            backgroundColor: '#f0fdf4'
          }}>
            <Typography variant="h6" sx={{ 
              fontWeight: 600,
              color: '#1e293b',
              display: 'flex',
              alignItems: 'center',
              gap: 1
            }}>
              <FilterList sx={{ fontSize: 20, color: '#059669' }} />
              Search & Filter
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748b', mt: 0.5 }}>
              Filter movement logs by various criteria
            </Typography>
          </Box>

          <Box sx={{ p: 3 }}>
            <Grid container spacing={3}>
              {/* Search Input */}
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by part name, SAP, user, remarks..."
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search sx={{ color: '#64748b' }} />
                      </InputAdornment>
                    ),
                    endAdornment: searchTerm && (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setSearchTerm('')} size="small">
                          <Clear fontSize="small" />
                        </IconButton>
                      </InputAdornment>
                    )
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '10px',
                      backgroundColor: '#f8fafc',
                    }
                  }}
                />
              </Grid>

              {/* Type Filter */}
              <Grid item xs={12} md={3}>
                <FormControl fullWidth>
                  <TextField
                    label="Type"
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    select
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: '10px',
                        backgroundColor: '#f8fafc',
                      }
                    }}
                  >
                    <MenuItem value="ALL">All Types</MenuItem>
                    <MenuItem value="IN">Stock In</MenuItem>
                    <MenuItem value="OUT">Stock Out</MenuItem>
                    <MenuItem value="TRANSFER">Transfer</MenuItem>
                  </TextField>
                </FormControl>
              </Grid>

              {/* Action Buttons */}
              <Grid item xs={12} md={3}>
                <Stack direction="row" spacing={2} justifyContent="flex-end">
                  <Button
                    variant="outlined"
                    onClick={clearFilters}
                    startIcon={<Clear />}
                    sx={{ 
                      borderRadius: '10px',
                      borderColor: '#e2e8f0',
                      color: '#64748b'
                    }}
                  >
                    Clear
                  </Button>
                  <Tooltip title="Refresh logs">
                    <IconButton 
                      onClick={fetchLogs}
                      sx={{ 
                        backgroundColor: '#f1f5f9',
                        border: '1px solid #e2e8f0',
                        borderRadius: '10px'
                      }}
                    >
                      <Refresh />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Export to CSV">
                    <IconButton 
                      onClick={exportToCSV}
                      sx={{ 
                        backgroundColor: '#059669',
                        color: 'white',
                        borderRadius: '10px',
                        '&:hover': {
                          backgroundColor: '#047857'
                        }
                      }}
                    >
                      <Download />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </Grid>

              {/* Date Range Filters */}
              <Grid item xs={12} md={6}>
                <TextField
                  label="Start Date"
                  type="date"
                  fullWidth
                  value={dateRange.start}
                  onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
                  InputLabelProps={{ shrink: true }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <CalendarToday sx={{ color: '#64748b' }} />
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '10px',
                      backgroundColor: '#f8fafc',
                    }
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="End Date"
                  type="date"
                  fullWidth
                  value={dateRange.end}
                  onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
                  InputLabelProps={{ shrink: true }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <CalendarToday sx={{ color: '#64748b' }} />
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '10px',
                      backgroundColor: '#f8fafc',
                    }
                  }}
                />
              </Grid>
            </Grid>

            {/* Filter Summary */}
            {(searchTerm || filterType !== 'ALL' || dateRange.start || dateRange.end) && (
              <Box sx={{ mt: 2, pt: 2, borderTop: '1px dashed #e2e8f0' }}>
                <Typography variant="body2" sx={{ color: '#64748b', mb: 1 }}>
                  Active Filters:
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                  {searchTerm && (
                    <Chip 
                      label={`Search: "${searchTerm}"`}
                      size="small"
                      onDelete={() => setSearchTerm('')}
                    />
                  )}
                  {filterType !== 'ALL' && (
                    <Chip 
                      label={`Type: ${filterType}`}
                      size="small"
                      onDelete={() => setFilterType('ALL')}
                      color={getTypeColor(filterType)}
                    />
                  )}
                  {dateRange.start && (
                    <Chip 
                      label={`From: ${dateRange.start}`}
                      size="small"
                      onDelete={() => setDateRange({...dateRange, start: ''})}
                    />
                  )}
                  {dateRange.end && (
                    <Chip 
                      label={`To: ${dateRange.end}`}
                      size="small"
                      onDelete={() => setDateRange({...dateRange, end: ''})}
                    />
                  )}
                </Stack>
              </Box>
            )}
          </Box>
        </Paper>

        {/* Results Summary */}
        <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#1e293b' }}>
            Showing {filteredLogs.length} of {logs.length} logs
          </Typography>
          <Typography variant="body2" sx={{ color: '#64748b' }}>
            {filteredLogs.length > rowsPerPage ? 
              `Showing ${page * rowsPerPage + 1}-${Math.min((page + 1) * rowsPerPage, filteredLogs.length)}` : 
              ''}
          </Typography>
        </Box>

        {/* Logs Table */}
        <Paper elevation={0} sx={{ 
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
          backgroundColor: 'white',
          width: '100%'
        }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 8 }}>
              <CircularProgress sx={{ color: '#059669' }} />
            </Box>
          ) : filteredLogs.length === 0 ? (
            <Box sx={{ p: 6, textAlign: 'center' }}>
              <History sx={{ fontSize: 64, color: '#94a3b8', opacity: 0.5, mb: 2 }} />
              <Typography variant="h6" sx={{ color: '#64748b', mb: 1 }}>
                No movement logs found
              </Typography>
              <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                {logs.length === 0 ? 
                  "No movement logs recorded yet. Start by adding stock in, stock out, or transfer transactions." :
                  "No logs match your search criteria. Try changing your filters."}
              </Typography>
            </Box>
          ) : (
            <>
              <Box sx={{ overflowX: 'auto' }}>
                <Table sx={{ minWidth: 1000 }}>
                  <TableHead>
                    <TableRow sx={{ backgroundColor: '#f8fafc' }}>
                      <TableCell 
                        sx={{ 
                          fontWeight: 600, 
                          cursor: 'pointer',
                          '&:hover': { backgroundColor: '#f1f5f9' }
                        }}
                        onClick={() => handleSort('date')}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          Date & Time
                          {sortField === 'date' && (
                            sortDirection === 'asc' ? <ArrowUpward fontSize="small" /> : <ArrowDownward fontSize="small" />
                          )}
                        </Box>
                      </TableCell>
                      <TableCell 
                        sx={{ 
                          fontWeight: 600,
                          cursor: 'pointer',
                          '&:hover': { backgroundColor: '#f1f5f9' }
                        }}
                        onClick={() => handleSort('type')}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          Type
                          {sortField === 'type' && (
                            sortDirection === 'asc' ? <ArrowUpward fontSize="small" /> : <ArrowDownward fontSize="small" />
                          )}
                        </Box>
                      </TableCell>
                      <TableCell 
                        sx={{ 
                          fontWeight: 600,
                          cursor: 'pointer',
                          '&:hover': { backgroundColor: '#f1f5f9' }
                        }}
                        onClick={() => handleSort('partName')}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          Part Details
                          {sortField === 'partName' && (
                            sortDirection === 'asc' ? <ArrowUpward fontSize="small" /> : <ArrowDownward fontSize="small" />
                          )}
                        </Box>
                      </TableCell>
                      <TableCell 
                        sx={{ 
                          fontWeight: 600,
                          cursor: 'pointer',
                          '&:hover': { backgroundColor: '#f1f5f9' }
                        }}
                        onClick={() => handleSort('quantity')}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          Quantity
                          {sortField === 'quantity' && (
                            sortDirection === 'asc' ? <ArrowUpward fontSize="small" /> : <ArrowDownward fontSize="small" />
                          )}
                        </Box>
                      </TableCell>
                      <TableCell 
                        sx={{ 
                          fontWeight: 600,
                          cursor: 'pointer',
                          '&:hover': { backgroundColor: '#f1f5f9' }
                        }}
                        onClick={() => handleSort('userName')}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          User
                          {sortField === 'userName' && (
                            sortDirection === 'asc' ? <ArrowUpward fontSize="small" /> : <ArrowDownward fontSize="small" />
                          )}
                        </Box>
                      </TableCell>
                      <TableCell 
                        sx={{ fontWeight: 600 }}
                      >
                        Details
                      </TableCell>
                      <TableCell 
                        sx={{ fontWeight: 600 }}
                      >
                        Remarks
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredLogs
                      .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                      .map(log => (
                        <TableRow 
                          key={log.id}
                          hover
                          sx={{ 
                            '&:hover': { backgroundColor: '#f8fafc' },
                            '&:last-child td, &:last-child th': { border: 0 }
                          }}
                        >
                          <TableCell>
                            <Typography variant="body2" sx={{ color: '#334155', fontWeight: 500 }}>
                              {formatDateTime(log.date)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={log.type}
                              color={getTypeColor(log.type)}
                              icon={getTypeIcon(log.type)}
                              size="small"
                              sx={{ fontWeight: 600 }}
                            />
                          </TableCell>
                          <TableCell>
                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: 600, color: '#1e293b' }}>
                                {log.partName || 'N/A'}
                              </Typography>
                              <Typography variant="caption" sx={{ color: '#64748b' }}>
                                SAP: {log.sapNumber || 'N/A'}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Typography 
                              variant="body2" 
                              sx={{ 
                                fontWeight: 600,
                                color: log.type === 'IN' ? '#10b981' : log.type === 'OUT' ? '#ef4444' : '#64748b'
                              }}
                            >
                              {getQuantityDisplay(log)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Person sx={{ color: '#64748b', fontSize: 16 }} />
                              <Typography variant="body2">
                                {log.userName || 'N/A'}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            {getDisplayDetails(log) && (
                              <Typography variant="body2" sx={{ color: '#475569', fontSize: '0.875rem' }}>
                                {getDisplayDetails(log)}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            <Typography 
                              variant="body2" 
                              sx={{ 
                                color: '#475569',
                                fontStyle: log.remarks ? 'normal' : 'italic'
                              }}
                            >
                              {log.remarks || 'No remarks'}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </Box>

              {/* Pagination */}
              <TablePagination
                rowsPerPageOptions={[10, 25, 50, 100]}
                component="div"
                count={filteredLogs.length}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                sx={{ 
                  borderTop: '1px solid #e2e8f0',
                  '& .MuiTablePagination-toolbar': {
                    padding: 2
                  }
                }}
              />
            </>
          )}
        </Paper>
      </Box>
    </Box>
  );
};

export default MovementLog;