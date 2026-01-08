import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { db } from '../../firebase/config';
import { collection, getDocs, addDoc, updateDoc, doc } from 'firebase/firestore';
import {
  Box,
  Paper,
  TextField,
  Button,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  FormControl,
  IconButton,
  Tooltip,
  Typography,
  Snackbar,
  Alert,
  Grid,
  Card,
  CardContent,
  InputAdornment,
  MenuItem,
  Select,
  InputLabel,
  Divider,
  Stack,
  TablePagination,
  CircularProgress,
  Badge,
  Autocomplete,
} from '@mui/material';
import {
  Description,
  Add,
  Search,
  FilterList,
  Refresh,
  Download,
  Edit,
  Delete,
  CheckCircle,
  Cancel,
  PendingActions,
  Inventory,
  Person,
  CalendarToday,
  Business,
  Assignment,
  TrendingUp,
  ArrowUpward,
  ArrowDownward,
  Clear,
  Visibility,
  LocalShipping,
} from '@mui/icons-material';

const MRF = () => {
  const parts = useSelector(state => state.parts.parts || []);
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [availableParts, setAvailableParts] = useState([]);

  // MRF Form states
  const [mrfHeader, setMrfHeader] = useState({
    mrfNumber: '',
    date: new Date().toISOString().split('T')[0],
    requestedBy: '',
    department: '',
    project: '',
    priority: 'MEDIUM',
    requiredDate: '',
  });

  const [mrfItems, setMrfItems] = useState([]);
  const [justification, setJustification] = useState('');

  // Dialog states
  const [addItemDialogOpen, setAddItemDialogOpen] = useState(false);
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [selectedMRF, setSelectedMRF] = useState(null);
  const [approvalComments, setApprovalComments] = useState('');
  const [partSearchFilter, setPartSearchFilter] = useState('');
  const [newItem, setNewItem] = useState({
    sapNumber: '',
    partName: '',
    quantity: '',
    unit: '',
    stockAvailable: 0,
    urgent: false,
    notes: '', // Added for enhanced dialog
  });

  const [mrfList, setMrfList] = useState([]);
  const [filteredMRFs, setFilteredMRFs] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterPriority, setFilterPriority] = useState('ALL');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [stats, setStats] = useState({ total: 0, draft: 0, pending: 0, approved: 0, rejected: 0 });

  // Fetch MRF data from Firestore
  useEffect(() => {
    const fetchMRFData = async () => {
      setLoading(true);
      try {
        const mrfSnapshot = await getDocs(collection(db, 'mrf'));
        const mrfData = mrfSnapshot.docs.map(doc => {
          const data = doc.data();
          // Handle date conversion safely
          let createdAtDate;
          if (data.createdAt) {
            if (data.createdAt.toDate) {
              // If it's a Firestore Timestamp
              createdAtDate = data.createdAt.toDate();
            } else if (typeof data.createdAt === 'string') {
              // If it's stored as ISO string
              createdAtDate = new Date(data.createdAt);
            } else if (data.createdAt.seconds) {
              // If it's stored as {seconds, nanoseconds}
              createdAtDate = new Date(data.createdAt.seconds * 1000);
            } else {
              createdAtDate = new Date();
            }
          } else {
            createdAtDate = new Date();
          }
          
          return { 
            ...data, 
            id: doc.id,
            createdAt: createdAtDate
          };
        });
        setMrfList(mrfData);
        calculateStats(mrfData);

        // Generate MRF number if new
        if (mrfData.length === 0) {
          const year = new Date().getFullYear();
          setMrfHeader(prev => ({ ...prev, mrfNumber: `MRF-${year}-001` }));
        } else {
          const year = new Date().getFullYear();
          const currentYearMRFs = mrfData.filter(mrf => 
            mrf.mrfNumber && mrf.mrfNumber.includes(`MRF-${year}-`)
          ).length;
          const newNumber = `MRF-${year}-${String(currentYearMRFs + 1).padStart(3, '0')}`;
          setMrfHeader(prev => ({ ...prev, mrfNumber: newNumber }));
        }
      } catch (error) {
        console.error('Error fetching MRF data:', error);
        setSnackbar({ open: true, message: 'Error fetching data', severity: 'error' });
      } finally {
        setLoading(false);
      }
    };
    fetchMRFData();
  }, []);

  // Apply filters whenever filter criteria change
  useEffect(() => {
    applyFilters();
  }, [mrfList, searchTerm, filterStatus, filterPriority, dateRange]);

  // Calculate stats
  const calculateStats = (data) => {
    const stats = {
      total: data.length,
      draft: data.filter(mrf => mrf.status === 'Draft').length,
      pending: data.filter(mrf => mrf.status === 'Pending' || mrf.status === 'Submitted').length,
      approved: data.filter(mrf => mrf.status === 'Approved').length,
      rejected: data.filter(mrf => mrf.status === 'Rejected').length,
    };
    setStats(stats);
  };

  // Apply filters
  const applyFilters = () => {
    let filtered = [...mrfList];

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(mrf => 
        (mrf.mrfNumber && mrf.mrfNumber.toLowerCase().includes(term)) ||
        (mrf.requestedBy && mrf.requestedBy.toLowerCase().includes(term)) ||
        (mrf.department && mrf.department.toLowerCase().includes(term)) ||
        (mrf.project && mrf.project.toLowerCase().includes(term)) ||
        (mrf.justification && mrf.justification.toLowerCase().includes(term))
      );
    }

    // Apply status filter
    if (filterStatus !== 'ALL') {
      filtered = filtered.filter(mrf => mrf.status === filterStatus);
    }

    // Apply priority filter
    if (filterPriority !== 'ALL') {
      filtered = filtered.filter(mrf => mrf.priority === filterPriority);
    }

    // Apply date range filter
    if (dateRange.start) {
      const startDate = new Date(dateRange.start);
      startDate.setHours(0, 0, 0, 0);
      filtered = filtered.filter(mrf => {
        const mrfDate = mrf.createdAt instanceof Date ? mrf.createdAt : new Date(mrf.createdAt);
        return mrfDate >= startDate;
      });
    }
    if (dateRange.end) {
      const endDate = new Date(dateRange.end);
      endDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(mrf => {
        const mrfDate = mrf.createdAt instanceof Date ? mrf.createdAt : new Date(mrf.createdAt);
        return mrfDate <= endDate;
      });
    }

    // Sort by creation date (newest first)
    filtered.sort((a, b) => {
      const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt);
      const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt);
      return dateB - dateA;
    });
    
    setFilteredMRFs(filtered);
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm('');
    setFilterStatus('ALL');
    setFilterPriority('ALL');
    setDateRange({ start: '', end: '' });
  };

  // Fetch Parts data
  useEffect(() => {
    const fetchParts = async () => {
      try {
        if (parts && parts.length > 0) {
          setAvailableParts(parts);
        } else {
          const partsSnapshot = await getDocs(collection(db, 'parts'));
          const partsData = partsSnapshot.docs.map(doc => ({ 
            ...doc.data(), 
            id: doc.id 
          }));
          setAvailableParts(partsData);
        }
      } catch (error) {
        console.error('Error fetching parts:', error);
        setSnackbar({ open: true, message: 'Error loading parts', severity: 'error' });
      }
    };
    fetchParts();
  }, [parts]);

  // Handle add item to MRF
  const handleAddItem = () => {
    if (!newItem.sapNumber || !newItem.quantity) {
      setSnackbar({ open: true, message: 'Please fill SAP# and Quantity', severity: 'error' });
      return;
    }

    const selectedPart = availableParts.find(p => p.sapNumber === newItem.sapNumber);
    if (!selectedPart) {
      setSnackbar({ open: true, message: 'Part not found', severity: 'error' });
      return;
    }

    const item = {
      id: Date.now(),
      sapNumber: newItem.sapNumber,
      partName: selectedPart.name,
      quantity: Number(newItem.quantity),
      unit: selectedPart.unit || 'PCS',
      stockAvailable: selectedPart.currentStock || 0,
      urgent: newItem.urgent,
      notes: newItem.notes || '', // Include notes if present
    };

    setMrfItems([...mrfItems, item]);
    setNewItem({ 
      sapNumber: '', 
      partName: '', 
      quantity: '', 
      unit: '', 
      stockAvailable: 0, 
      urgent: false,
      notes: '' 
    });
    setAddItemDialogOpen(false);
    setSnackbar({ open: true, message: 'Item added successfully', severity: 'success' });
  };

  // Handle remove item
  const handleRemoveItem = (itemId) => {
    setMrfItems(mrfItems.filter(item => item.id !== itemId));
  };

  // Handle save MRF
  const handleSaveMRF = async (status = 'Draft') => {
    if (!mrfHeader.requestedBy) {
      setSnackbar({ open: true, message: 'Please fill Requested By', severity: 'error' });
      return;
    }

    if (mrfItems.length === 0) {
      setSnackbar({ open: true, message: 'Please add at least one item', severity: 'error' });
      return;
    }

    try {
      const mrfData = {
        ...mrfHeader,
        items: mrfItems,
        justification,
        status,
        createdAt: new Date().toISOString(), // Use ISO string instead of Timestamp
        totalItems: mrfItems.length,
        totalQuantity: mrfItems.reduce((sum, item) => sum + Number(item.quantity), 0),
      };

      await addDoc(collection(db, 'mrf'), mrfData);
      setSnackbar({ open: true, message: `MRF ${status} saved successfully`, severity: 'success' });

      // Reset form and refresh list
      resetForm();
      await refreshData();
    } catch (error) {
      console.error('Error saving MRF:', error);
      setSnackbar({ open: true, message: 'Error saving MRF', severity: 'error' });
    }
  };

  const handleApproveMRF = async () => {
    if (!selectedMRF) return;

    try {
      const mrfRef = doc(db, 'mrf', selectedMRF.id);
      await updateDoc(mrfRef, {
        status: 'Approved',
        approvedBy: 'Current User',
        approvalComments: approvalComments,
        approvalDate: new Date().toISOString(), // Use ISO string
      });

      setSnackbar({ open: true, message: 'MRF Approved successfully', severity: 'success' });
      setApprovalDialogOpen(false);
      setApprovalComments('');
      setSelectedMRF(null);

      await refreshData();
    } catch (error) {
      console.error('Error approving MRF:', error);
      setSnackbar({ open: true, message: 'Error approving MRF', severity: 'error' });
    }
  };

  const handleRejectMRF = async () => {
    if (!selectedMRF) return;

    try {
      const mrfRef = doc(db, 'mrf', selectedMRF.id);
      await updateDoc(mrfRef, {
        status: 'Rejected',
        rejectedBy: 'Current User',
        rejectionComments: approvalComments,
        rejectionDate: new Date().toISOString(), // Use ISO string
      });

      setSnackbar({ open: true, message: 'MRF Rejected', severity: 'warning' });
      setApprovalDialogOpen(false);
      setApprovalComments('');
      setSelectedMRF(null);

      await refreshData();
    } catch (error) {
      console.error('Error rejecting MRF:', error);
      setSnackbar({ open: true, message: 'Error rejecting MRF', severity: 'error' });
    }
  };

  const resetForm = () => {
    const year = new Date().getFullYear();
    const currentYearMRFs = mrfList.filter(mrf => 
      mrf.mrfNumber && mrf.mrfNumber.includes(`MRF-${year}-`)
    ).length;
    const newNumber = `MRF-${year}-${String(currentYearMRFs + 1).padStart(3, '0')}`;
    
    setMrfHeader({
      mrfNumber: newNumber,
      date: new Date().toISOString().split('T')[0],
      requestedBy: '',
      department: '',
      project: '',
      priority: 'MEDIUM',
      requiredDate: '',
    });
    setMrfItems([]);
    setJustification('');
  };

  const refreshData = async () => {
    setLoading(true);
    try {
      const mrfSnapshot = await getDocs(collection(db, 'mrf'));
      const mrfData = mrfSnapshot.docs.map(doc => {
        const data = doc.data();
        let createdAtDate;
        if (data.createdAt) {
          if (data.createdAt.toDate) {
            createdAtDate = data.createdAt.toDate();
          } else if (typeof data.createdAt === 'string') {
            createdAtDate = new Date(data.createdAt);
          } else if (data.createdAt.seconds) {
            createdAtDate = new Date(data.createdAt.seconds * 1000);
          } else {
            createdAtDate = new Date();
          }
        } else {
          createdAtDate = new Date();
        }
        
        return { 
          ...data, 
          id: doc.id,
          createdAt: createdAtDate
        };
      });
      setMrfList(mrfData);
      calculateStats(mrfData);
    } catch (error) {
      console.error('Error refreshing MRF data:', error);
      setSnackbar({ open: true, message: 'Error refreshing data', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Draft': return 'default';
      case 'Submitted':
      case 'Pending': return 'warning';
      case 'Approved': return 'success';
      case 'Rejected': return 'error';
      default: return 'default';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'HIGH': return 'error';
      case 'MEDIUM': return 'warning';
      case 'LOW': return 'success';
      default: return 'default';
    }
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    try {
      const dateObj = date instanceof Date ? date : new Date(date);
      if (isNaN(dateObj.getTime())) {
        return 'N/A';
      }
      return dateObj.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'N/A';
    }
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const exportToCSV = () => {
    const headers = ['MRF#', 'Date', 'Requested By', 'Department', 'Project', 'Priority', 'Status', 'Items', 'Total Quantity'];
    const csvData = filteredMRFs.map(mrf => [
      mrf.mrfNumber || 'N/A',
      formatDate(mrf.createdAt),
      mrf.requestedBy || 'N/A',
      mrf.department || '—',
      mrf.project || '—',
      mrf.priority || 'MEDIUM',
      mrf.status || 'Draft',
      mrf.items?.length || 0,
      mrf.items?.reduce((sum, item) => sum + Number(item.quantity), 0) || 0
    ]);

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mrf-history-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

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
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              color: 'white',
              boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)'
            }}>
              <Description sx={{ fontSize: 28 }} />
            </Box>
            <Box>
              <Typography variant="h4" sx={{ 
                fontWeight: 700, 
                color: '#1e293b',
                mb: 0.5
              }}>
                Material Requisition Form (MRF)
              </Typography>
              <Typography variant="body1" sx={{ color: '#64748b' }}>
                Create and manage material requisition requests
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
                  Total MRFs
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
                <PendingActions sx={{ color: '#f59e0b', fontSize: 18 }} />
                <Box>
                  <Typography variant="body2" sx={{ color: '#64748b' }}>
                    Pending
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: '#1e293b' }}>
                    {stats.pending}
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
                <CheckCircle sx={{ color: '#10b981', fontSize: 18 }} />
                <Box>
                  <Typography variant="body2" sx={{ color: '#64748b' }}>
                    Approved
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: '#1e293b' }}>
                    {stats.approved}
                  </Typography>
                </Box>
              </Box>
            </Card>
          </Box>
        </Box>

        {/* New MRF Form - Stacked Layout */}
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
            backgroundColor: '#fffbeb'
          }}>
            <Typography variant="h6" sx={{ 
              fontWeight: 600,
              color: '#1e293b',
              display: 'flex',
              alignItems: 'center',
              gap: 1
            }}>
              <Description sx={{ fontSize: 20, color: '#f59e0b' }} />
              New Material Requisition Form
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748b', mt: 0.5 }}>
              Fill in the details below to create a new MRF
            </Typography>
          </Box>

          <Box sx={{ p: 4 }}>
            {/* MRF Header Section */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="subtitle1" sx={{ 
                fontWeight: 600, 
                color: '#334155',
                mb: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}>
                <Assignment sx={{ fontSize: 18, color: '#f59e0b' }} />
                MRF Header
              </Typography>
              
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="MRF Number"
                    value={mrfHeader.mrfNumber}
                    disabled
                    fullWidth
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Description sx={{ color: '#64748b' }} />
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
                    label="Date"
                    type="date"
                    value={mrfHeader.date}
                    disabled
                    fullWidth
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
                    label="Requested By"
                    value={mrfHeader.requestedBy}
                    onChange={(e) => setMrfHeader({ ...mrfHeader, requestedBy: e.target.value })}
                    fullWidth
                    required
                    placeholder="Enter requester name"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Person sx={{ color: '#64748b' }} />
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
                    label="Department"
                    value={mrfHeader.department}
                    onChange={(e) => setMrfHeader({ ...mrfHeader, department: e.target.value })}
                    fullWidth
                    placeholder="Enter department name"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Business sx={{ color: '#64748b' }} />
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
                    label="Project"
                    value={mrfHeader.project}
                    onChange={(e) => setMrfHeader({ ...mrfHeader, project: e.target.value })}
                    fullWidth
                    placeholder="Enter project name or code"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Assignment sx={{ color: '#64748b' }} />
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
                    label="Priority"
                    value={mrfHeader.priority}
                    onChange={(e) => setMrfHeader({ ...mrfHeader, priority: e.target.value })}
                    fullWidth
                    select
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: '10px',
                        backgroundColor: '#f8fafc',
                      }
                    }}
                  >
                    <MenuItem value="HIGH">High</MenuItem>
                    <MenuItem value="MEDIUM">Medium</MenuItem>
                    <MenuItem value="LOW">Low</MenuItem>
                  </TextField>
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Required Date"
                    type="date"
                    value={mrfHeader.requiredDate}
                    onChange={(e) => setMrfHeader({ ...mrfHeader, requiredDate: e.target.value })}
                    fullWidth
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
            </Box>

            <Divider sx={{ my: 4 }} />

            {/* Requested Items Section */}
            <Box sx={{ mb: 4 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle1" sx={{ 
                  fontWeight: 600, 
                  color: '#334155',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1
                }}>
                  <Inventory sx={{ fontSize: 18, color: '#f59e0b' }} />
                  Requested Items ({mrfItems.length} items)
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => setAddItemDialogOpen(true)}
                  sx={{
                    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                    borderRadius: '10px',
                    textTransform: 'none'
                  }}
                >
                  Add Item
                </Button>
              </Box>

              {mrfItems.length > 0 ? (
                <Paper elevation={0} sx={{ 
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  overflow: 'hidden'
                }}>
                  <Table>
                    <TableHead sx={{ backgroundColor: '#f8fafc' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 600 }}>SAP#</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Part Name</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Quantity</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Unit</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Stock Available</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {mrfItems.map((item) => (
                        <TableRow key={item.id} hover>
                          <TableCell>{item.sapNumber}</TableCell>
                          <TableCell>{item.partName}</TableCell>
                          <TableCell>
                            <Chip 
                              label={item.quantity}
                              color="primary"
                              size="small"
                              sx={{ fontWeight: 600 }}
                            />
                          </TableCell>
                          <TableCell>{item.unit}</TableCell>
                          <TableCell>
                            <Chip 
                              label={item.stockAvailable}
                              color={item.stockAvailable >= item.quantity ? "success" : "error"}
                              size="small"
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell>
                            <Tooltip title="Remove item">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleRemoveItem(item.id)}
                              >
                                <Delete fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Paper>
              ) : (
                <Box sx={{ 
                  p: 4, 
                  textAlign: 'center', 
                  border: '2px dashed #e2e8f0',
                  borderRadius: '10px',
                  backgroundColor: '#f8fafc'
                }}>
                  <Inventory sx={{ fontSize: 48, color: '#94a3b8', mb: 2, opacity: 0.5 }} />
                  <Typography variant="body1" sx={{ color: '#64748b', mb: 1 }}>
                    No items added yet
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                    Click "Add Item" to start adding requested parts
                  </Typography>
                </Box>
              )}
            </Box>

            <Divider sx={{ my: 4 }} />

            {/* Justification Section */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="subtitle1" sx={{ 
                fontWeight: 600, 
                color: '#334155',
                mb: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}>
                <Description sx={{ fontSize: 18, color: '#f59e0b' }} />
                Justification
              </Typography>
              
              <TextField
                label="Reason / Comments"
                multiline
                rows={4}
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                fullWidth
                placeholder="Enter reason for this requisition..."
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '10px',
                    backgroundColor: '#f8fafc',
                  }
                }}
              />
            </Box>

            <Divider sx={{ my: 4 }} />

            {/* Actions Section */}
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'center',
              gap: 2,
              pt: 2
            }}>
              <Button 
                variant="contained"
                onClick={() => handleSaveMRF('Submitted')}
                disabled={!mrfHeader.requestedBy || mrfItems.length === 0}
                startIcon={<CheckCircle />}
                sx={{ 
                  minWidth: 200,
                  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                  px: 4,
                  py: 1.5,
                  fontWeight: 600,
                  fontSize: '1rem',
                  borderRadius: '10px',
                  textTransform: 'none',
                  boxShadow: '0 4px 14px rgba(245, 158, 11, 0.4)',
                  '&:hover': {
                    boxShadow: '0 6px 20px rgba(245, 158, 11, 0.6)',
                    transform: 'translateY(-2px)'
                  },
                  '&:disabled': {
                    background: '#e2e8f0',
                    color: '#94a3b8'
                  }
                }}
              >
                Submit MRF
              </Button>
              <Button 
                variant="outlined"
                onClick={resetForm}
                sx={{ 
                  px: 4,
                  py: 1.5,
                  borderRadius: '10px',
                  textTransform: 'none',
                  borderColor: '#e2e8f0',
                  color: '#64748b',
                  '&:hover': {
                    borderColor: '#f59e0b',
                    color: '#f59e0b'
                  }
                }}
              >
                Clear Form
              </Button>
            </Box>
          </Box>
        </Paper>

        {/* MRF History Section with Search & Filter */}
        <Paper elevation={0} sx={{ 
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
          backgroundColor: 'white',
          width: '100%'
        }}>
          <Box sx={{ 
            p: 3, 
            borderBottom: '1px solid #e2e8f0',
            backgroundColor: '#fffbeb',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <Box>
              <Typography variant="h6" sx={{ 
                fontWeight: 600,
                color: '#1e293b',
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}>
                <PendingActions sx={{ fontSize: 20, color: '#f59e0b' }} />
                MRF History & Status
              </Typography>
              <Typography variant="body2" sx={{ color: '#64748b', mt: 0.5 }}>
                Track and manage all material requisition forms
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Tooltip title="Refresh data">
                <IconButton 
                  onClick={refreshData}
                  sx={{ 
                    color: '#f59e0b',
                    backgroundColor: 'white',
                    border: '1px solid #e2e8f0',
                    '&:hover': {
                      backgroundColor: '#fffbeb'
                    }
                  }}
                >
                  <Refresh />
                </IconButton>
              </Tooltip>
              <Tooltip title="Export to CSV">
                <IconButton 
                  onClick={exportToCSV}
                  sx={{ 
                    backgroundColor: '#f59e0b',
                    color: 'white',
                    '&:hover': {
                      backgroundColor: '#d97706'
                    }
                  }}
                >
                  <Download />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>

          {/* Search and Filter Section */}
          <Box sx={{ p: 3, borderBottom: '1px solid #e2e8f0' }}>
            <Typography variant="subtitle1" sx={{ 
              fontWeight: 600, 
              color: '#334155',
              mb: 2,
              display: 'flex',
              alignItems: 'center',
              gap: 1
            }}>
              <FilterList sx={{ fontSize: 18, color: '#f59e0b' }} />
              Search & Filter
            </Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Search MRFs"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by MRF#, requester, department..."
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
              <Grid item xs={12} md={2}>
                <TextField
                  label="Status"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  fullWidth
                  select
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '10px',
                      backgroundColor: '#f8fafc',
                    }
                  }}
                >
                  <MenuItem value="ALL">All Status</MenuItem>
                  <MenuItem value="Draft">Draft</MenuItem>
                  <MenuItem value="Submitted">Submitted</MenuItem>
                  <MenuItem value="Pending">Pending</MenuItem>
                  <MenuItem value="Approved">Approved</MenuItem>
                  <MenuItem value="Rejected">Rejected</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} md={2}>
                <TextField
                  label="Priority"
                  value={filterPriority}
                  onChange={(e) => setFilterPriority(e.target.value)}
                  fullWidth
                  select
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '10px',
                      backgroundColor: '#f8fafc',
                    }
                  }}
                >
                  <MenuItem value="ALL">All Priority</MenuItem>
                  <MenuItem value="HIGH">High</MenuItem>
                  <MenuItem value="MEDIUM">Medium</MenuItem>
                  <MenuItem value="LOW">Low</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} md={2}>
                <TextField
                  label="From Date"
                  type="date"
                  fullWidth
                  value={dateRange.start}
                  onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
                  InputLabelProps={{ shrink: true }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '10px',
                      backgroundColor: '#f8fafc',
                    }
                  }}
                />
              </Grid>
              <Grid item xs={12} md={2}>
                <TextField
                  label="To Date"
                  type="date"
                  fullWidth
                  value={dateRange.end}
                  onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
                  InputLabelProps={{ shrink: true }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '10px',
                      backgroundColor: '#f8fafc',
                    }
                  }}
                />
              </Grid>
            </Grid>

            {/* Active Filters */}
            {(searchTerm || filterStatus !== 'ALL' || filterPriority !== 'ALL' || dateRange.start || dateRange.end) && (
              <Box sx={{ mt: 2, pt: 2, borderTop: '1px dashed #e2e8f0' }}>
                <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                  {searchTerm && (
                    <Chip 
                      label={`Search: "${searchTerm}"`}
                      size="small"
                      onDelete={() => setSearchTerm('')}
                    />
                  )}
                  {filterStatus !== 'ALL' && (
                    <Chip 
                      label={`Status: ${filterStatus}`}
                      size="small"
                      onDelete={() => setFilterStatus('ALL')}
                      color={getStatusColor(filterStatus)}
                    />
                  )}
                  {filterPriority !== 'ALL' && (
                    <Chip 
                      label={`Priority: ${filterPriority}`}
                      size="small"
                      onDelete={() => setFilterPriority('ALL')}
                      color={getPriorityColor(filterPriority)}
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
                  <Button
                    variant="text"
                    size="small"
                    onClick={clearFilters}
                    startIcon={<Clear />}
                    sx={{ textTransform: 'none' }}
                  >
                    Clear All
                  </Button>
                </Stack>
              </Box>
            )}
          </Box>

          {/* Results Summary */}
          <Box sx={{ 
            p: 2, 
            borderBottom: '1px solid #e2e8f0',
            backgroundColor: '#f8fafc',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <Typography variant="body1" sx={{ fontWeight: 600, color: '#1e293b' }}>
              Showing {filteredMRFs.length} of {mrfList.length} MRFs
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748b' }}>
              {filteredMRFs.length > rowsPerPage ? 
                `Showing ${page * rowsPerPage + 1}-${Math.min((page + 1) * rowsPerPage, filteredMRFs.length)}` : 
                ''}
            </Typography>
          </Box>

          {/* MRF History Table */}
          {filteredMRFs.length === 0 ? (
            <Box sx={{ 
              p: 6, 
              textAlign: 'center',
              color: '#94a3b8'
            }}>
              <Description sx={{ fontSize: 64, mb: 2, opacity: 0.5 }} />
              <Typography variant="h6" sx={{ mb: 1 }}>
                No MRFs found
              </Typography>
              <Typography variant="body2">
                {mrfList.length === 0 ? 
                  "No MRF records found. Create your first MRF above." :
                  "No MRFs match your search criteria. Try changing your filters."}
              </Typography>
            </Box>
          ) : (
            <>
              <Box sx={{ overflowX: 'auto' }}>
                <Table sx={{ minWidth: 1000 }}>
                  <TableHead sx={{ backgroundColor: '#f8fafc' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>MRF#</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Requested By</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Department</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Project</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Priority</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Items</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredMRFs
                      .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                      .map((mrf) => (
                      <TableRow key={mrf.id} hover>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: '#1e293b' }}>
                            {mrf.mrfNumber}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ color: '#64748b' }}>
                            {formatDate(mrf.createdAt)}
                          </Typography>
                        </TableCell>
                        <TableCell>{mrf.requestedBy}</TableCell>
                        <TableCell>{mrf.department || '—'}</TableCell>
                        <TableCell>{mrf.project || '—'}</TableCell>
                        <TableCell>
                          <Chip 
                            label={mrf.priority || 'MEDIUM'}
                            color={getPriorityColor(mrf.priority)}
                            size="small"
                            sx={{ fontWeight: 500 }}
                          />
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={mrf.status || 'Draft'}
                            color={getStatusColor(mrf.status)}
                            size="small"
                            sx={{ fontWeight: 600 }}
                          />
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Badge 
                              badgeContent={mrf.items?.length || 0} 
                              color="primary"
                              sx={{ '& .MuiBadge-badge': { fontWeight: 600 } }}
                            >
                              <Inventory fontSize="small" />
                            </Badge>
                            <Typography variant="body2" sx={{ color: '#64748b' }}>
                              {mrf.totalQuantity || mrf.items?.reduce((sum, item) => sum + Number(item.quantity || 0), 0) || 0} units
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 0.5 }}>
                            {(mrf.status === 'Submitted' || mrf.status === 'Pending') && (
                              <>
                                <Tooltip title="Approve">
                                  <IconButton
                                    size="small"
                                    color="success"
                                    onClick={() => {
                                      setSelectedMRF(mrf);
                                      handleApproveMRF();
                                    }}
                                  >
                                    <CheckCircle fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Reject">
                                  <IconButton
                                    size="small"
                                    color="error"
                                    onClick={() => {
                                      setSelectedMRF(mrf);
                                      handleRejectMRF();
                                    }}
                                  >
                                    <Cancel fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </>
                            )}
                            <Tooltip title="View Details">
                              <IconButton size="small" color="info">
                                <Visibility fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Box>
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
                count={filteredMRFs.length}
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

      {/* Enhanced Add Item Dialog */}
      <Dialog 
        open={addItemDialogOpen} 
        onClose={() => setAddItemDialogOpen(false)} 
        maxWidth="md" 
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '12px',
            overflow: 'hidden'
          }
        }}
      >
        <DialogTitle sx={{ 
          pb: 1, 
          borderBottom: '1px solid #e2e8f0',
          backgroundColor: '#fffbeb'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Add sx={{ color: '#f59e0b' }} />
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#1e293b' }}>
              Add Request Item
            </Typography>
          </Box>
          <Typography variant="body2" sx={{ color: '#64748b', mt: 0.5 }}>
            Search and select a part to add to your MRF
          </Typography>
        </DialogTitle>
        
        <DialogContent sx={{ py: 3 }}>
          <Stack spacing={3}>
            {/* Search Autocomplete */}
            <Autocomplete
              options={availableParts}
              getOptionLabel={(option) => `${option.sapNumber || 'N/A'} - ${option.name}`}
              value={availableParts.find(p => p.sapNumber === newItem.sapNumber) || null}
              onChange={(event, newValue) => {
                if (newValue) {
                  setNewItem({
                    sapNumber: newValue.sapNumber,
                    partName: newValue.name,
                    quantity: '',
                    unit: newValue.unit || 'PCS',
                    stockAvailable: newValue.currentStock || 0,
                    urgent: false,
                    notes: '',
                  });
                } else {
                  setNewItem({
                    sapNumber: '',
                    partName: '',
                    quantity: '',
                    unit: '',
                    stockAvailable: 0,
                    urgent: false,
                    notes: '',
                  });
                }
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Search and Select Part"
                  placeholder="Type SAP number or part name to search..."
                  InputProps={{
                    ...params.InputProps,
                    startAdornment: (
                      <>
                        <Search sx={{ color: '#64748b', mr: 1 }} />
                        {params.InputProps.startAdornment}
                      </>
                    ),
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '10px',
                      backgroundColor: '#f8fafc',
                    }
                  }}
                />
              )}
              renderOption={(props, option) => (
                <Box component="li" {...props} sx={{ py: 1.5 }}>
                  <Box sx={{ width: '100%' }}>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {option.name}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 2, mt: 0.5 }}>
                      <Chip 
                        label={`SAP: ${option.sapNumber || 'N/A'}`} 
                        size="small" 
                        sx={{ height: 20, fontSize: '0.75rem' }}
                      />
                      <Chip 
                        label={`Stock: ${option.currentStock || 0}`} 
                        size="small"
                        color={option.currentStock > 0 ? "success" : "error"}
                        variant="outlined"
                        sx={{ height: 20, fontSize: '0.75rem' }}
                      />
                      <Chip 
                        label={`Unit: ${option.unit || 'PCS'}`} 
                        size="small"
                        color="default"
                        variant="outlined"
                        sx={{ height: 20, fontSize: '0.75rem' }}
                      />
                    </Box>
                  </Box>
                </Box>
              )}
              noOptionsText={
                <Box sx={{ p: 2, textAlign: 'center' }}>
                  <Inventory sx={{ fontSize: 32, color: '#94a3b8', mb: 1, opacity: 0.5 }} />
                  <Typography variant="body2" sx={{ color: '#64748b' }}>
                    No parts found. Try a different search term.
                  </Typography>
                </Box>
              }
            />

            {/* Selected Part Details Card */}
            {newItem.sapNumber && (
              <Paper elevation={0} sx={{ 
                p: 2, 
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                backgroundColor: '#f8fafc'
              }}>
                <Typography variant="subtitle2" sx={{ 
                  fontWeight: 600, 
                  color: '#334155',
                  mb: 1.5,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5
                }}>
                  <Inventory fontSize="small" />
                  Selected Part Details
                </Typography>
                
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Box>
                      <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
                        Part Name
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 500, color: '#1e293b' }}>
                        {newItem.partName}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Box>
                      <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
                        Current Stock
                      </Typography>
                      <Chip 
                        label={newItem.stockAvailable}
                        color={newItem.stockAvailable > 0 ? "success" : "error"}
                        size="small"
                        sx={{ fontWeight: 600 }}
                      />
                    </Box>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Box>
                      <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
                        Unit
                      </Typography>
                      <Chip 
                        label={newItem.unit}
                        variant="outlined"
                        size="small"
                      />
                    </Box>
                  </Grid>
                </Grid>
              </Paper>
            )}

            {/* Quantity Input with Stock Check */}
            <Box>
              <TextField
                label="Quantity Required"
                type="number"
                value={newItem.quantity}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === '' || (Number(value) >= 0 && Number(value) <= 99999)) {
                    setNewItem({ ...newItem, quantity: value });
                  }
                }}
                fullWidth
                required
                inputProps={{ 
                  min: 1,
                  max: 99999
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <TrendingUp sx={{ color: '#64748b' }} />
                    </InputAdornment>
                  ),
                }}
                disabled={!newItem.sapNumber}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '10px',
                    backgroundColor: '#f8fafc',
                  }
                }}
              />
              
              {/* Stock Availability Helper Text */}
              {newItem.sapNumber && newItem.quantity && (
                <Box sx={{ mt: 1 }}>
                  {Number(newItem.quantity) > Number(newItem.stockAvailable) ? (
                    <Alert 
                      severity="warning" 
                      icon={<ArrowUpward fontSize="small" />}
                      sx={{ 
                        borderRadius: '8px',
                        py: 0.5,
                        backgroundColor: '#fffbeb',
                        border: '1px solid #fde68a'
                      }}
                    >
                      <Box>
                        <Typography variant="caption" sx={{ fontWeight: 600, color: '#92400e' }}>
                          Request exceeds available stock
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#92400e', display: 'block' }}>
                          Available: {newItem.stockAvailable} • Requested: {newItem.quantity} • 
                          Shortage: {Number(newItem.quantity) - Number(newItem.stockAvailable)}
                        </Typography>
                      </Box>
                    </Alert>
                  ) : (
                    <Alert 
                      severity="success" 
                      icon={<CheckCircle fontSize="small" />}
                      sx={{ 
                        borderRadius: '8px',
                        py: 0.5,
                        backgroundColor: '#f0fdf4',
                        border: '1px solid #bbf7d0'
                      }}
                    >
                      <Box>
                        <Typography variant="caption" sx={{ fontWeight: 600, color: '#166534' }}>
                          Stock available
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#166534', display: 'block' }}>
                          Available: {newItem.stockAvailable} • Requested: {newItem.quantity} • 
                          Remaining: {Number(newItem.stockAvailable) - Number(newItem.quantity)}
                        </Typography>
                      </Box>
                    </Alert>
                  )}
                </Box>
              )}

              {/* Stock Level Indicator */}
              {newItem.sapNumber && newItem.quantity && (
                <Box sx={{ mt: 1.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="caption" sx={{ color: '#64748b' }}>
                      Stock Level
                    </Typography>
                    <Typography variant="caption" sx={{ fontWeight: 500, color: '#64748b' }}>
                      {newItem.stockAvailable} / {newItem.quantity}
                    </Typography>
                  </Box>
                  <Box sx={{ 
                    height: 6, 
                    backgroundColor: '#e2e8f0', 
                    borderRadius: '3px',
                    overflow: 'hidden'
                  }}>
                    <Box sx={{ 
                      height: '100%',
                      width: `${Math.min(100, (Number(newItem.stockAvailable) / Number(newItem.quantity)) * 100)}%`,
                      backgroundColor: Number(newItem.stockAvailable) >= Number(newItem.quantity) ? '#10b981' : '#f59e0b',
                      borderRadius: '3px'
                    }} />
                  </Box>
                </Box>
              )}
            </Box>

            {/* Additional Options */}
            {newItem.sapNumber && (
              <Box sx={{ 
                p: 2, 
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                backgroundColor: '#f8fafc'
              }}>
                <Typography variant="subtitle2" sx={{ 
                  fontWeight: 600, 
                  color: '#334155',
                  mb: 1
                }}>
                  Additional Options
                </Typography>
                
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      label="Additional Notes (Optional)"
                      value={newItem.notes}
                      onChange={(e) => setNewItem({...newItem, notes: e.target.value})}
                      multiline
                      rows={2}
                      placeholder="Add any special notes about this item request..."
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: '10px',
                          backgroundColor: 'white',
                        }
                      }}
                    />
                  </Grid>
                </Grid>
              </Box>
            )}
          </Stack>
        </DialogContent>
        
        <DialogActions sx={{ 
          p: 2, 
          borderTop: '1px solid #e2e8f0',
          backgroundColor: '#f8fafc'
        }}>
          <Button 
            onClick={() => {
              setAddItemDialogOpen(false);
              setNewItem({
                sapNumber: '',
                partName: '',
                quantity: '',
                unit: '',
                stockAvailable: 0,
                urgent: false,
                notes: '',
              });
            }}
            variant="outlined"
            startIcon={<Clear />}
            sx={{ 
              borderRadius: '10px',
              borderColor: '#e2e8f0',
              color: '#64748b',
              textTransform: 'none',
              '&:hover': {
                borderColor: '#f59e0b',
                color: '#f59e0b'
              }
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleAddItem}
            variant="contained"
            disabled={!newItem.sapNumber || !newItem.quantity}
            startIcon={<Add />}
            sx={{ 
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              textTransform: 'none',
              fontWeight: 600,
              px: 3,
              '&:hover': {
                background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
                boxShadow: '0 4px 12px rgba(245, 158, 11, 0.4)'
              },
              '&:disabled': {
                background: '#e2e8f0',
                color: '#94a3b8'
              }
            }}
          >
            Add to MRF
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar Notification */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
          sx={{ 
            width: '100%',
            borderRadius: '10px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
          }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default MRF;