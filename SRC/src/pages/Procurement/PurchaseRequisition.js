import React, { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  Timestamp,
  query,
  orderBy,
  where,
  deleteDoc
} from 'firebase/firestore';
import { useSelector } from 'react-redux';
import {
  Box,
  Paper,
  TextField,
  Button,
  Autocomplete,
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
  Snackbar,
  Alert,
  Typography,
  Card,
  Grid,
  CircularProgress,
  InputAdornment,
  Tooltip,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  TableContainer
} from '@mui/material';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import RefreshIcon from '@mui/icons-material/Refresh';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';

const PurchaseRequisition = () => {
  const user = useSelector(state => state.auth.user);

  // Check user permissions for requestor/approver roles
  const isAdmin = user?.groupId?.toLowerCase() === 'a' || user?.groupId?.toLowerCase() === 'admin';
  const canRequest = user?.groupPermissions?.purchase_requisition?.actions?.includes('requestor') || isAdmin;
  const canApprove = user?.groupPermissions?.purchase_requisition?.actions?.includes('approver') || isAdmin;
  const canDelete = user?.groupPermissions?.purchase_requisition?.access === 'add' || isAdmin;

  // Master Data
  const [parts, setParts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [locations, setLocations] = useState([]);
  const [prs, setPrs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, rejected: 0 });

  // Create/Edit PR Dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentPrId, setCurrentPrId] = useState(null);

  // PR Header Fields
  const [prHeader, setPrHeader] = useState({
    prNumber: '',
    supplier: null,
    prDate: new Date().toISOString().split('T')[0],
    requiredDate: '',
    warehouse: null,
    storageLocation: null,
    remarks: ''
  });

  // PR Detail Lines
  const [prLines, setPrLines] = useState([]);
  const [lineDialog, setLineDialog] = useState(false);
  const [currentLine, setCurrentLine] = useState({
    part: null,
    quantity: '',
    unitPrice: '',
    remarks: ''
  });
  const [editingLineIndex, setEditingLineIndex] = useState(null);

  // Part Search Dialog
  const [partSearchDialog, setPartSearchDialog] = useState(false);
  const [partSearchTerm, setPartSearchTerm] = useState('');

  // View PR Dialog
  const [viewDialog, setViewDialog] = useState(false);
  const [viewingPr, setViewingPr] = useState(null);

  // Delete Dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [saving, setSaving] = useState(false);

  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // Fetch Master Data
  useEffect(() => {
    const fetchMasterData = async () => {
      try {
        const [partsSnap, suppliersSnap, warehousesSnap, locationsSnap] = await Promise.all([
          getDocs(collection(db, 'parts')),
          getDocs(collection(db, 'suppliers')),
          getDocs(collection(db, 'warehouses')),
          getDocs(collection(db, 'warehouseLocations'))
        ]);

        setParts(partsSnap.docs.map(doc => ({ ...doc.data(), id: doc.id })));
        setSuppliers(suppliersSnap.docs.map(doc => ({ ...doc.data(), id: doc.id })));
        setWarehouses(warehousesSnap.docs.map(doc => ({ ...doc.data(), id: doc.id })));
        setLocations(locationsSnap.docs.map(doc => ({ ...doc.data(), id: doc.id })));
      } catch (error) {
        console.error('Error fetching master data:', error);
      }
    };
    fetchMasterData();
    fetchPrs();
  }, []);

  const generatePrNumber = async () => {
    try {
      const q = query(collection(db, 'purchase_requisitions'), orderBy('prNumber', 'desc'));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        return 'PR-001';
      }

      const lastPr = snapshot.docs[0].data();
      const lastNumber = lastPr.prNumber || 'PR-000';
      const numberPart = parseInt(lastNumber.split('-')[1]) || 0;
      const newNumber = numberPart + 1;

      return `PR-${String(newNumber).padStart(3, '0')}`;
    } catch (error) {
      console.error('Error generating PR number:', error);
      return `PR-${Date.now()}`; // Fallback to timestamp
    }
  };

  const fetchPrs = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'purchase_requisitions'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const prData = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      setPrs(prData);

      // Calculate stats
      setStats({
        total: prData.length,
        draft: prData.filter(p => p.status === 'Draft').length,
        pending: prData.filter(p => p.status === 'Pending').length,
        approved: prData.filter(p => p.status === 'Approved').length,
        rejected: prData.filter(p => p.status === 'Rejected').length,
      });
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const openCreateDialog = async () => {
    setEditMode(false);
    setCurrentPrId(null);
    const newPrNumber = await generatePrNumber();
    setPrHeader({
      prNumber: newPrNumber,
      supplier: null,
      prDate: new Date().toISOString().split('T')[0],
      requiredDate: '',
      warehouse: null,
      storageLocation: null,
      remarks: ''
    });
    setPrLines([]);
    setDialogOpen(true);
  };

  const openEditDialog = (pr) => {
    if (pr.status !== 'Draft' && pr.status !== 'Rejected') {
      setSnackbar({ open: true, message: 'Only Draft or Rejected PRs can be edited', severity: 'warning' });
      return;
    }
    setEditMode(true);
    setCurrentPrId(pr.id);
    setPrHeader({
      prNumber: pr.prNumber,
      supplier: suppliers.find(s => s.id === pr.supplierId) || null,
      prDate: pr.prDate || new Date().toISOString().split('T')[0],
      requiredDate: pr.requiredDate || '',
      warehouse: warehouses.find(w => w.id === pr.warehouseId) || null,
      storageLocation: locations.find(l => l.id === pr.storageLocationId) || null,
      remarks: pr.remarks || ''
    });
    setPrLines(pr.lines || []);
    setDialogOpen(true);
  };

  const openLineDialog = (lineIndex = null) => {
    if (lineIndex !== null) {
      setEditingLineIndex(lineIndex);
      setCurrentLine(prLines[lineIndex]);
    } else {
      setEditingLineIndex(null);
      setCurrentLine({
        part: null,
        quantity: '',
        unitPrice: '',
        remarks: ''
      });
    }
    setLineDialog(true);
  };

  const handleAddOrUpdateLine = () => {
    if (!currentLine.part || !currentLine.quantity || Number(currentLine.quantity) <= 0) {
      setSnackbar({ open: true, message: 'Please select a part and enter valid quantity', severity: 'error' });
      return;
    }

    const newLine = {
      partId: currentLine.part.id,
      partName: currentLine.part.name,
      sapNumber: currentLine.part.sapNumber,
      unit: currentLine.part.unit,
      quantity: Number(currentLine.quantity),
      unitPrice: Number(currentLine.unitPrice) || 0,
      totalPrice: Number(currentLine.quantity) * (Number(currentLine.unitPrice) || 0),
      remarks: currentLine.remarks
    };

    if (editingLineIndex !== null) {
      const updatedLines = [...prLines];
      updatedLines[editingLineIndex] = newLine;
      setPrLines(updatedLines);
    } else {
      setPrLines([...prLines, newLine]);
    }

    setLineDialog(false);
    setCurrentLine({
      part: null,
      quantity: '',
      unitPrice: '',
      remarks: ''
    });
  };

  const handleDeleteLine = (index) => {
    setPrLines(prLines.filter((_, i) => i !== index));
  };

  const handleSubmitPr = async (targetStatus = 'Pending') => {
    if (!canRequest) {
      setSnackbar({ open: true, message: 'You do not have permission to create or edit PRs', severity: 'error' });
      return;
    }
    // Validation (Mandatory fields only if submitting for approval)
    if (targetStatus === 'Pending') {
      if (!prHeader.supplier) {
        setSnackbar({ open: true, message: 'Please select a supplier', severity: 'error' });
        return;
      }
      if (!prHeader.requiredDate) {
        setSnackbar({ open: true, message: 'Please select required date', severity: 'error' });
        return;
      }
      if (!prHeader.warehouse) {
        setSnackbar({ open: true, message: 'Please select a warehouse', severity: 'error' });
        return;
      }
      if (!prHeader.storageLocation) {
        setSnackbar({ open: true, message: 'Please select storage location', severity: 'error' });
        return;
      }
      if (prLines.length === 0) {
        setSnackbar({ open: true, message: 'Please add at least one line item', severity: 'error' });
        return;
      }
    }

    try {
      setSaving(true);

      const prData = {
        prNumber: prHeader.prNumber || '',
        supplierId: prHeader.supplier?.id || '',
        supplierName: prHeader.supplier?.name || '',
        prDate: prHeader.prDate || new Date().toISOString().split('T')[0],
        requiredDate: prHeader.requiredDate || '',
        warehouseId: prHeader.warehouse?.id || '',
        warehouseName: prHeader.warehouse?.warehouseName || prHeader.warehouse?.name || '',
        storageLocationId: prHeader.storageLocation?.id || '',
        storageLocationName: prHeader.storageLocation?.locationName || prHeader.storageLocation?.name || '',
        remarks: prHeader.remarks || '',
        lines: prLines.map(l => ({
          partId: l.partId || '',
          partName: l.partName || '',
          sapNumber: l.sapNumber || '',
          unit: l.unit || '',
          quantity: Number(l.quantity) || 0,
          unitPrice: Number(l.unitPrice) || 0,
          totalPrice: Number(l.totalPrice) || 0,
          remarks: l.remarks || ''
        })),
        totalAmount: Number(prLines.reduce((sum, line) => sum + (line.totalPrice || 0), 0)) || 0,
        requesterId: user?.uid || 'unknown',
        requesterName: user?.username || user?.email || 'Unknown',
        status: targetStatus,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };

      if (editMode && currentPrId) {
        await updateDoc(doc(db, 'purchase_requisitions', currentPrId), {
          ...prData,
          updatedAt: Timestamp.now()
        });
        setSnackbar({ open: true, message: 'Purchase Requisition Updated Successfully', severity: 'success' });
      } else {
        // Double check uniqueness of PR number before addDoc
        const q = query(collection(db, 'purchase_requisitions'), where('prNumber', '==', prData.prNumber));
        const checkSnap = await getDocs(q);
        if (!checkSnap.empty) {
          throw new Error('PR Number ' + prData.prNumber + ' already exists. Please refresh and try again.');
        }

        await addDoc(collection(db, 'purchase_requisitions'), prData);
        setSnackbar({ open: true, message: 'Purchase Requisition Created Successfully', severity: 'success' });
      }

      setDialogOpen(false);
      fetchPrs();
    } catch (e) {
      console.error('PR Save Error:', e);
      setSnackbar({
        open: true,
        message: 'Failed to save PR: ' + (e.code === 'permission-denied' ? 'Access denied' : e.message),
        severity: 'error'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (prId, newStatus, rejectionReason = '') => {
    if (!canApprove) {
      setSnackbar({ open: true, message: 'You do not have permission to approve/reject PRs', severity: 'error' });
      return;
    }

    try {
      await updateDoc(doc(db, 'purchase_requisitions', prId), {
        status: newStatus,
        approverId: user?.uid || 'unknown',
        approverName: user?.username || user?.email || 'Unknown',
        approvedAt: Timestamp.now(),
        rejectionReason: rejectionReason || ''
      });
      setSnackbar({ open: true, message: `PR ${newStatus} Successfully`, severity: 'success' });
      fetchPrs();
    } catch (e) {
      console.error('PR Status Update Error:', e);
      setSnackbar({
        open: true,
        message: 'Failed to update PR status: ' + (e.code === 'permission-denied' ? 'Access denied' : e.message),
        severity: 'error'
      });
    }
  };

  const handleDeletePr = async () => {
    if (!canDelete) {
      setSnackbar({ open: true, message: 'You do not have permission to delete PRs', severity: 'error' });
      return;
    }
    if (!deleteTarget) return;

    try {
      setSaving(true);
      await deleteDoc(doc(db, 'purchase_requisitions', deleteTarget.id));
      setSnackbar({ open: true, message: 'Purchase Requisition Deleted', severity: 'success' });
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
      fetchPrs();
    } catch (e) {
      console.error('PR Delete Error:', e);
      setSnackbar({
        open: true,
        message: 'Failed to delete PR: ' + (e.code === 'permission-denied' ? 'Access denied' : e.message),
        severity: 'error'
      });
    } finally {
      setSaving(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Approved': return 'success';
      case 'Rejected': return 'error';
      case 'Pending': return 'warning';
      case 'Draft': return 'default';
      default: return 'info';
    }
  };

  const filteredParts = parts.filter(part =>
    part.name?.toLowerCase().includes(partSearchTerm.toLowerCase()) ||
    part.sapNumber?.toLowerCase().includes(partSearchTerm.toLowerCase())
  );

  const filteredPrs = prs.filter(pr => {
    const matchStatus = statusFilter === 'All' || pr.status === statusFilter;
    const matchSearch =
      pr.requesterName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pr.supplierName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pr.warehouseName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pr.storageLocationName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pr.remarks?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pr.lines?.some(line =>
        line.partName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        line.sapNumber?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    return matchStatus && matchSearch;
  });

  if (loading && prs.length === 0) {
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
      p: { xs: 2, md: 3 },
      width: '100%'
    }}>
      <Box sx={{ width: '100%', maxWidth: 'none', margin: '0 auto' }}>
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
              <ShoppingCartIcon sx={{ fontSize: 28 }} />
            </Box>
            <Box>
              <Typography variant="h4" sx={{
                fontWeight: 700,
                color: '#1e293b',
                mb: 0.5
              }}>
                Purchase Requisition
              </Typography>
              <Typography variant="body1" sx={{ color: '#64748b' }}>
                Create and manage purchase requests
              </Typography>
            </Box>
          </Box>

          {canRequest && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={openCreateDialog}
              sx={{
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                px: 3,
                py: 1.5,
                fontWeight: 600,
                borderRadius: '10px',
                textTransform: 'none',
                boxShadow: '0 4px 14px rgba(245, 158, 11, 0.4)',
                '&:hover': {
                  boxShadow: '0 6px 20px rgba(245, 158, 11, 0.6)',
                  transform: 'translateY(-2px)'
                }
              }}
            >
              Create New PR
            </Button>
          )}
        </Box>

        {/* Stats Cards */}
        <Grid container spacing={2} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={2.4}>
            <Card sx={{
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              backgroundColor: 'white',
              p: 2.5
            }}>
              <Typography variant="body2" sx={{ color: '#64748b', mb: 1 }}>
                Draft
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#94a3b8' }}>
                {stats.draft || 0}
              </Typography>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <Card sx={{
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              backgroundColor: 'white',
              p: 2.5
            }}>
              <Typography variant="body2" sx={{ color: '#64748b', mb: 1 }}>
                Pending
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#f59e0b' }}>
                {stats.pending}
              </Typography>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <Card sx={{
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              backgroundColor: 'white',
              p: 2.5
            }}>
              <Typography variant="body2" sx={{ color: '#64748b', mb: 1 }}>
                Approved
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#10b981' }}>
                {stats.approved}
              </Typography>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <Card sx={{
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              backgroundColor: 'white',
              p: 2.5
            }}>
              <Typography variant="body2" sx={{ color: '#64748b', mb: 1 }}>
                Rejected
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#ef4444' }}>
                {stats.rejected}
              </Typography>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <Card sx={{
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              backgroundColor: 'white',
              p: 2.5
            }}>
              <Typography variant="body2" sx={{ color: '#64748b', mb: 1 }}>
                Total PRs
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#1e293b' }}>
                {stats.total}
              </Typography>
            </Card>
          </Grid>
        </Grid>

        {/* PRs List Section */}
        <Paper elevation={0} sx={{
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
          backgroundColor: 'white',
          width: '100%'
        }}>
          <Box sx={{
            p: { xs: 2, md: 3 },
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
                <ShoppingCartIcon sx={{ fontSize: 20, color: '#f59e0b' }} />
                Purchase Requisitions
              </Typography>
              <Typography variant="body2" sx={{ color: '#64748b', mt: 0.5 }}>
                {filteredPrs.length} requisitions found
              </Typography>
            </Box>
            <Tooltip title="Refresh data">
              <IconButton
                onClick={() => {
                  setLoading(true);
                  fetchPrs();
                }}
                sx={{
                  color: '#f59e0b',
                  backgroundColor: 'white',
                  border: '1px solid #e2e8f0',
                  '&:hover': {
                    backgroundColor: '#fffbeb'
                  }
                }}
              >
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Box>

          {/* Search and Filter */}
          <Box sx={{ p: { xs: 2, md: 3 }, borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
            <Grid container spacing={2} alignItems="flex-start">
              <Grid item xs={12} md={8}>
                <TextField
                  fullWidth
                  label="Search Purchase Requisitions"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by requester, supplier, part name, or remarks..."
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon sx={{ color: '#64748b' }} />
                      </InputAdornment>
                    ),
                    endAdornment: searchTerm && (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setSearchTerm('')} size="small">
                          <ClearIcon fontSize="small" />
                        </IconButton>
                      </InputAdornment>
                    )
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '10px',
                      backgroundColor: 'white',
                    }
                  }}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControl fullWidth>
                  <InputLabel>Status Filter</InputLabel>
                  <Select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    label="Status Filter"
                    sx={{
                      borderRadius: '10px',
                      backgroundColor: 'white',
                    }}
                  >
                    <MenuItem value="All">All Status</MenuItem>
                    <MenuItem value="Pending">Pending</MenuItem>
                    <MenuItem value="Approved">Approved</MenuItem>
                    <MenuItem value="Rejected">Rejected</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Box>

          {/* PRs Table */}
          {loading ? (
            <Box sx={{ p: 6, textAlign: 'center' }}>
              <CircularProgress />
            </Box>
          ) : filteredPrs.length === 0 ? (
            <Box sx={{
              p: 6,
              textAlign: 'center',
              color: '#94a3b8'
            }}>
              <ShoppingCartIcon sx={{ fontSize: 64, mb: 2, opacity: 0.5 }} />
              <Typography variant="h6" sx={{ mb: 1 }}>
                No Purchase Requisitions found
              </Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table sx={{ minWidth: 1200 }}>
                <TableHead sx={{ backgroundColor: '#f8fafc' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>PR Number</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>PR Date</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Requester</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Supplier</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Warehouse</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Storage Location</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Items</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Total Amount</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredPrs.map((pr) => (
                    <TableRow key={pr.id} hover>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: '#f59e0b' }}>
                          {pr.prNumber || 'N/A'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 500, color: '#1e293b' }}>
                          {pr.prDate || 'N/A'}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#64748b' }}>
                          Required: {pr.requiredDate || 'N/A'}
                        </Typography>
                      </TableCell>
                      <TableCell>{pr.requesterName}</TableCell>
                      <TableCell>{pr.supplierName}</TableCell>
                      <TableCell>{pr.warehouseName}</TableCell>
                      <TableCell>{pr.storageLocationName}</TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {pr.lines?.length || 0} item(s)
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: '#1e293b' }}>
                          ${pr.totalAmount?.toFixed(2) || '0.00'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={pr.status}
                          color={getStatusColor(pr.status)}
                          size="small"
                          sx={{ fontWeight: 600, minWidth: 100 }}
                        />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <Tooltip title="View Details">
                            <IconButton
                              size="small"
                              onClick={() => {
                                setViewingPr(pr);
                                setViewDialog(true);
                              }}
                              sx={{ color: '#3b82f6' }}
                            >
                              <VisibilityIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>

                          {(pr.status === 'Draft' || pr.status === 'Rejected') && canRequest && pr.requesterId === user?.uid && (
                            <Tooltip title="Edit PR">
                              <IconButton
                                size="small"
                                onClick={() => openEditDialog(pr)}
                                sx={{ color: '#f59e0b' }}
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}

                          {pr.status === 'Pending' && canApprove && (
                            <>
                              <Tooltip title="Approve">
                                <IconButton
                                  size="small"
                                  onClick={() => handleStatusChange(pr.id, 'Approved')}
                                  sx={{ color: '#10b981' }}
                                >
                                  <CheckCircleIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Reject">
                                <IconButton
                                  size="small"
                                  onClick={() => handleStatusChange(pr.id, 'Rejected')}
                                  sx={{ color: '#ef4444' }}
                                >
                                  <CancelIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </>
                          )}

                          {canDelete && (
                            <Tooltip title="Delete PR">
                              <IconButton
                                size="small"
                                onClick={() => {
                                  setDeleteTarget(pr);
                                  setDeleteDialogOpen(true);
                                }}
                                sx={{ color: '#ef4444', '&:hover': { backgroundColor: '#fef2f2' } }}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      </Box>

      {/* Create/Edit PR Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            maxHeight: '90vh',
            height: '90vh'
          }
        }}
      >
        <DialogTitle sx={{
          backgroundColor: '#fffbeb',
          borderBottom: '1px solid #e2e8f0',
          fontWeight: 600,
          fontSize: '1.25rem',
          py: 2.5
        }}>
          {editMode ? 'Edit Purchase Requisition' : 'Create New Purchase Requisition'}
        </DialogTitle>
        <DialogContent
          dividers
          sx={{
            p: 4,
            overflowY: 'auto',
            backgroundColor: '#fafafa'
          }}
        >
          {/* PR Header */}
          <Paper
            elevation={0}
            sx={{
              p: 3,
              mb: 3,
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              backgroundColor: 'white'
            }}
          >
            <Typography
              variant="h6"
              sx={{
                mb: 3,
                fontWeight: 600,
                color: '#1e293b',
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}
            >
              <Box sx={{ width: 4, height: 24, backgroundColor: '#f59e0b', borderRadius: 1 }} />
              PR Header Information
            </Typography>

            {/* Row 1: PR Number (auto) | Supplier (flex-grow) */}
            <Box sx={{ display: 'flex', gap: 3, mb: 3, flexWrap: 'wrap' }}>
              <Box sx={{ minWidth: '120px', maxWidth: '150px' }}>
                <TextField
                  label="PR Number"
                  value={prHeader.prNumber}
                  disabled
                  fullWidth
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: '#f8fafc',
                      fontWeight: 600
                    }
                  }}
                />
              </Box>

              <Box sx={{ flexGrow: 1, minWidth: '300px' }}>
                <Autocomplete
                  options={suppliers}
                  getOptionLabel={(option) => option.name || ''}
                  value={prHeader.supplier}
                  onChange={(e, v) => setPrHeader({ ...prHeader, supplier: v })}
                  renderInput={(params) => (
                    <TextField {...params} label="Supplier *" fullWidth />
                  )}
                />
              </Box>
            </Box>

            {/* Row 1.5: Warehouse & Location */}
            <Box sx={{ display: 'flex', gap: 3, mb: 3, flexWrap: 'wrap' }}>
              <Box sx={{ flexGrow: 1, minWidth: '200px' }}>
                <Autocomplete
                  options={warehouses}
                  getOptionLabel={(option) => option.warehouseName || option.name || ''}
                  value={prHeader.warehouse}
                  onChange={(e, v) => setPrHeader({ ...prHeader, warehouse: v, storageLocation: null })}
                  renderInput={(params) => (
                    <TextField {...params} label="Warehouse *" fullWidth />
                  )}
                />
              </Box>

              <Box sx={{ flexGrow: 1, minWidth: '200px' }}>
                <Autocomplete
                  options={locations.filter(l => l.warehouseId === prHeader.warehouse?.id)}
                  getOptionLabel={(option) => option.locationName || option.name || ''}
                  value={prHeader.storageLocation}
                  disabled={!prHeader.warehouse}
                  onChange={(e, v) => setPrHeader({ ...prHeader, storageLocation: v })}
                  renderInput={(params) => (
                    <TextField {...params} label="Storage Location *" fullWidth />
                  )}
                />
              </Box>
            </Box>

            {/* Row 2: Dates and Remarks */}
            <Grid container spacing={3}>
              <Grid item xs={12} md={3}>
                <TextField
                  label="PR Date"
                  type="date"
                  fullWidth
                  value={prHeader.prDate}
                  onChange={(e) =>
                    setPrHeader({ ...prHeader, prDate: e.target.value })
                  }
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>

              <Grid item xs={12} md={3}>
                <TextField
                  label="Required Date *"
                  type="date"
                  fullWidth
                  value={prHeader.requiredDate}
                  onChange={(e) =>
                    setPrHeader({ ...prHeader, requiredDate: e.target.value })
                  }
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  label="Remarks"
                  fullWidth
                  value={prHeader.remarks}
                  onChange={(e) =>
                    setPrHeader({ ...prHeader, remarks: e.target.value })
                  }
                  placeholder="Optional notes"
                />
              </Grid>

              {/* Row 3: Total Amount and Requestor */}
              <Grid item xs={12} md={6}>
                <TextField
                  label="Total Amount"
                  value={`$${prLines.reduce((s, l) => s + l.totalPrice, 0).toFixed(2)}`}
                  disabled
                  fullWidth
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: '#fff7ed',
                      fontWeight: 700,
                      fontSize: '1.1rem',
                      color: '#f59e0b'
                    }
                  }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  label="Requestor"
                  value={user?.username || user?.email || 'Unknown User'}
                  disabled
                  fullWidth
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: '#f8fafc'
                    }
                  }}
                />
              </Grid>
            </Grid>
          </Paper>


          <Divider sx={{ my: 3 }} />

          {/* PR Lines */}
          <Paper elevation={0} sx={{ p: 3, border: '1px solid #e2e8f0', borderRadius: '12px', backgroundColor: 'white' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 4, height: 24, backgroundColor: '#f59e0b', borderRadius: 1 }} />
                PR Line Items ({prLines.length} items)
              </Typography>
              <Button
                variant="contained"
                size="medium"
                startIcon={<AddIcon />}
                onClick={() => openLineDialog()}
                sx={{
                  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                  textTransform: 'none',
                  borderRadius: '8px',
                  px: 3,
                  boxShadow: '0 2px 8px rgba(245, 158, 11, 0.3)'
                }}
              >
                Add Line Item
              </Button>
            </Box>

            {prLines.length === 0 ? (
              <Box sx={{
                p: 6,
                textAlign: 'center',
                border: '2px dashed #e2e8f0',
                borderRadius: '12px',
                backgroundColor: '#f8fafc'
              }}>
                <AddIcon sx={{ fontSize: 48, color: '#cbd5e1', mb: 2 }} />
                <Typography variant="h6" sx={{ color: '#64748b', mb: 1 }}>
                  No items added yet
                </Typography>
                <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                  Click "Add Line Item" button to add items to this purchase requisition
                </Typography>
              </Box>
            ) : (
              <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: '8px' }}>
                <Table size="small">
                  <TableHead sx={{ backgroundColor: '#f8fafc' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600, fontSize: '0.85rem' }}>SAP Number</TableCell>
                      <TableCell sx={{ fontWeight: 600, fontSize: '0.85rem' }}>Part Name</TableCell>
                      <TableCell sx={{ fontWeight: 600, fontSize: '0.85rem' }}>Quantity</TableCell>
                      <TableCell sx={{ fontWeight: 600, fontSize: '0.85rem' }}>Unit</TableCell>
                      <TableCell sx={{ fontWeight: 600, fontSize: '0.85rem' }}>Unit Price</TableCell>
                      <TableCell sx={{ fontWeight: 600, fontSize: '0.85rem' }}>Total</TableCell>
                      <TableCell sx={{ fontWeight: 600, fontSize: '0.85rem' }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {prLines.map((line, index) => (
                      <TableRow key={index} hover>
                        <TableCell sx={{ fontSize: '0.85rem' }}>{line.sapNumber}</TableCell>
                        <TableCell sx={{ fontSize: '0.85rem', fontWeight: 500 }}>{line.partName}</TableCell>
                        <TableCell sx={{ fontSize: '0.85rem' }}>{line.quantity}</TableCell>
                        <TableCell sx={{ fontSize: '0.85rem' }}>{line.unit}</TableCell>
                        <TableCell sx={{ fontSize: '0.85rem' }}>${line.unitPrice.toFixed(2)}</TableCell>
                        <TableCell sx={{ fontWeight: 600, fontSize: '0.85rem', color: '#f59e0b' }}>${line.totalPrice.toFixed(2)}</TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 0.5 }}>
                            <Tooltip title="Edit Line">
                              <IconButton
                                size="small"
                                onClick={() => openLineDialog(index)}
                                sx={{
                                  color: '#f59e0b',
                                  '&:hover': { backgroundColor: '#fffbeb' }
                                }}
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete Line">
                              <IconButton
                                size="small"
                                onClick={() => handleDeleteLine(index)}
                                sx={{
                                  color: '#ef4444',
                                  '&:hover': { backgroundColor: '#fef2f2' }
                                }}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow sx={{ backgroundColor: '#fffbeb' }}>
                      <TableCell colSpan={5} align="right" sx={{ fontWeight: 700, fontSize: '0.95rem' }}>
                        Grand Total:
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: '1.1rem', color: '#f59e0b' }}>
                        ${prLines.reduce((sum, line) => sum + line.totalPrice, 0).toFixed(2)}
                      </TableCell>
                      <TableCell />
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
        </DialogContent>
        <DialogActions sx={{ p: 3, borderTop: '1px solid #e2e8f0', backgroundColor: '#fafafa' }}>
          <Button
            onClick={() => setDialogOpen(false)}
            disabled={saving}
            sx={{
              textTransform: 'none',
              color: '#64748b',
              px: 3,
              py: 1
            }}
          >
            Cancel
          </Button>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              onClick={() => handleSubmitPr('Draft')}
              disabled={saving}
              sx={{
                textTransform: 'none',
                px: 3,
                borderRadius: '8px',
                fontWeight: 600,
              }}
            >
              {saving ? 'Saving...' : 'Save as Draft'}
            </Button>
            <Button
              variant="contained"
              onClick={() => handleSubmitPr('Pending')}
              disabled={saving}
              sx={{
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                textTransform: 'none',
                px: 4,
                py: 1,
                fontWeight: 600,
                boxShadow: '0 4px 14px rgba(245, 158, 11, 0.4)',
                '&:hover': {
                  boxShadow: '0 6px 20px rgba(245, 158, 11, 0.6)',
                }
              }}
            >
              {saving ? 'Processing...' : 'Submit for Approval'}
            </Button>
          </Box>
        </DialogActions>
      </Dialog>

      {/* Add/Edit Line Dialog */}
      <Dialog
        open={lineDialog}
        onClose={() => setLineDialog(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            maxHeight: '85vh'
          }
        }}
      >
        <DialogTitle sx={{
          backgroundColor: '#fffbeb',
          borderBottom: '1px solid #e2e8f0',
          fontWeight: 600,
          py: 2.5
        }}>
          {editingLineIndex !== null ? 'Edit Line Item' : 'Add Line Item'}
        </DialogTitle>
        <DialogContent
          dividers
          sx={{
            p: 4,
            overflowY: 'auto',
            backgroundColor: '#fafafa'
          }}
        >
          <Paper elevation={0} sx={{ p: 3, border: '1px solid #e2e8f0', borderRadius: '12px', backgroundColor: 'white' }}>
            {/* Part Selection - Always Visible */}
            <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ width: 4, height: 20, backgroundColor: '#f59e0b', borderRadius: 1 }} />
              Select Part
            </Typography>

            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start', mb: 3 }}>
              <Box sx={{ flexGrow: 1 }}>
                <Autocomplete
                  fullWidth
                  options={parts}
                  getOptionLabel={(option) => `${option.sapNumber || 'N/A'} - ${option.name}`}
                  value={currentLine.part}
                  onChange={(event, newValue) => {
                    setCurrentLine({
                      ...currentLine,
                      part: newValue
                    });
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Part *"
                      placeholder="Search by SAP Number or Part Name"
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: 'white',
                        }
                      }}
                    />
                  )}
                />
              </Box>
              <Tooltip title="Advanced Part Search">
                <IconButton
                  onClick={() => setPartSearchDialog(true)}
                  sx={{
                    mt: 1,
                    width: 48,
                    height: 48,
                    border: '1px solid #e2e8f0',
                    backgroundColor: 'white',
                    color: '#f59e0b',
                    '&:hover': {
                      backgroundColor: '#fffbeb',
                      borderColor: '#f59e0b'
                    }
                  }}
                >
                  <SearchIcon />
                </IconButton>
              </Tooltip>
            </Box>

            {/* Part Details and Input Fields - Only show when part is selected */}
            {currentLine.part && (
              <>
                <Divider sx={{ my: 3 }} />

                <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 4, height: 20, backgroundColor: '#f59e0b', borderRadius: 1 }} />
                  Part Information
                </Typography>

                <Grid container spacing={2.5}>
                  {/* Part Details Row */}
                  <Grid item xs={12} md={4}>
                    <TextField
                      label="SAP Number"
                      value={currentLine.part.sapNumber || 'N/A'}
                      disabled
                      fullWidth
                      size="small"
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: '#f8fafc',
                        }
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} md={5}>
                    <TextField
                      label="Part Name"
                      value={currentLine.part.name || ''}
                      disabled
                      fullWidth
                      size="small"
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: '#f8fafc',
                        }
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <TextField
                      label="Unit"
                      value={currentLine.part.unit || ''}
                      disabled
                      fullWidth
                      size="small"
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: '#f8fafc',
                        }
                      }}
                    />
                  </Grid>
                </Grid>

                {/* Quantity and Pricing Section */}
                <Divider sx={{ my: 3 }} />
                <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 4, height: 20, backgroundColor: '#f59e0b', borderRadius: 1 }} />
                  Quantity & Pricing
                </Typography>

                <Grid container spacing={2.5}>
                  <Grid item xs={12} md={4}>
                    <TextField
                      label="Quantity *"
                      type="number"
                      fullWidth
                      value={currentLine.quantity}
                      onChange={(e) => setCurrentLine({ ...currentLine, quantity: e.target.value })}
                      inputProps={{ min: 1, step: 1 }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: 'white',
                        }
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      label="Unit Price ($)"
                      type="number"
                      fullWidth
                      value={currentLine.unitPrice}
                      onChange={(e) => setCurrentLine({ ...currentLine, unitPrice: e.target.value })}
                      inputProps={{ min: 0, step: 0.01 }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: 'white',
                        }
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      label="Total Price"
                      value={`$${(Number(currentLine.quantity || 0) * Number(currentLine.unitPrice || 0)).toFixed(2)}`}
                      disabled
                      fullWidth
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: '#fff7ed',
                          fontWeight: 600,
                          fontSize: '1rem',
                          color: '#f59e0b'
                        }
                      }}
                    />
                  </Grid>

                  {/* Remarks Row */}
                  <Grid item xs={12}>
                    <TextField
                      label="Remarks"
                      fullWidth
                      multiline
                      rows={2}
                      value={currentLine.remarks}
                      onChange={(e) => setCurrentLine({ ...currentLine, remarks: e.target.value })}
                      placeholder="Add notes for this line item..."
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: 'white',
                        }
                      }}
                    />
                  </Grid>
                </Grid>
              </>
            )}

            {/* Empty State - Show when no part selected */}
            {!currentLine.part && (
              <Box sx={{
                p: 4,
                textAlign: 'center',
                border: '2px dashed #e2e8f0',
                borderRadius: '12px',
                backgroundColor: '#f8fafc',
                mt: 2
              }}>
                <SearchIcon sx={{ fontSize: 48, color: '#cbd5e1', mb: 2 }} />
                <Typography variant="h6" sx={{ color: '#64748b', mb: 1 }}>
                  No Part Selected
                </Typography>
                <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                  Please select a part from the dropdown above to continue
                </Typography>
              </Box>
            )}
          </Paper>
        </DialogContent>
        <DialogActions sx={{ p: 3, borderTop: '1px solid #e2e8f0', backgroundColor: '#fafafa' }}>
          <Button
            onClick={() => setLineDialog(false)}
            sx={{
              textTransform: 'none',
              color: '#64748b',
              px: 3,
              py: 1
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleAddOrUpdateLine}
            disabled={!currentLine.part}
            sx={{
              background: !currentLine.part ? '#cbd5e1' : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              textTransform: 'none',
              px: 4,
              py: 1,
              fontWeight: 600,
              boxShadow: !currentLine.part ? 'none' : '0 4px 14px rgba(245, 158, 11, 0.4)',
              '&:hover': {
                boxShadow: !currentLine.part ? 'none' : '0 6px 20px rgba(245, 158, 11, 0.6)',
              },
              '&:disabled': {
                color: 'white',
                opacity: 0.6
              }
            }}
          >
            {editingLineIndex !== null ? 'Update Line Item' : 'Add Line Item'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Part Search Dialog */}
      <Dialog
        open={partSearchDialog}
        onClose={() => setPartSearchDialog(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            maxHeight: '80vh'
          }
        }}
      >
        <DialogTitle sx={{
          backgroundColor: '#fffbeb',
          borderBottom: '1px solid #e2e8f0',
          fontWeight: 600,
          py: 2.5
        }}>
          Advanced Part Search
        </DialogTitle>
        <DialogContent
          dividers
          sx={{
            p: 4,
            overflowY: 'auto',
            backgroundColor: '#fafafa'
          }}
        >
          <TextField
            fullWidth
            label="Search Parts"
            value={partSearchTerm}
            onChange={(e) => setPartSearchTerm(e.target.value)}
            placeholder="Search by SAP Number or Part Name"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: '#f59e0b' }} />
                </InputAdornment>
              )
            }}
            sx={{
              mb: 3,
              '& .MuiOutlinedInput-root': {
                backgroundColor: 'white',
                borderRadius: '10px'
              }
            }}
          />
          <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 400, borderRadius: '8px' }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600, backgroundColor: '#f8fafc' }}>SAP Number</TableCell>
                  <TableCell sx={{ fontWeight: 600, backgroundColor: '#f8fafc' }}>Part Name</TableCell>
                  <TableCell sx={{ fontWeight: 600, backgroundColor: '#f8fafc' }}>Unit</TableCell>
                  <TableCell sx={{ fontWeight: 600, backgroundColor: '#f8fafc' }}>Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredParts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} align="center" sx={{ py: 4, color: '#64748b' }}>
                      No parts found matching your search
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredParts.map((part) => (
                    <TableRow key={part.id} hover>
                      <TableCell>{part.sapNumber}</TableCell>
                      <TableCell>{part.name}</TableCell>
                      <TableCell>{part.unit}</TableCell>
                      <TableCell>
                        <Button
                          size="small"
                          variant="contained"
                          onClick={() => {
                            setCurrentLine({ ...currentLine, part });
                            setPartSearchDialog(false);
                            setPartSearchTerm('');
                          }}
                          sx={{
                            textTransform: 'none',
                            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                            boxShadow: '0 2px 6px rgba(245, 158, 11, 0.3)'
                          }}
                        >
                          Select
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions sx={{ p: 3, borderTop: '1px solid #e2e8f0', backgroundColor: '#fafafa' }}>
          <Button
            onClick={() => setPartSearchDialog(false)}
            sx={{
              textTransform: 'none',
              color: '#64748b',
              px: 3,
              py: 1
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* View PR Dialog */}
      <Dialog
        open={viewDialog}
        onClose={() => setViewDialog(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            maxHeight: '90vh'
          }
        }}
      >
        <DialogTitle sx={{
          backgroundColor: '#fffbeb',
          borderBottom: '1px solid #e2e8f0',
          fontWeight: 600,
          py: 2.5
        }}>
          Purchase Requisition Details
        </DialogTitle>
        <DialogContent
          dividers
          sx={{
            p: 4,
            overflowY: 'auto',
            backgroundColor: '#fafafa'
          }}
        >
          {viewingPr && (
            <>
              <Paper elevation={0} sx={{ p: 3, mb: 3, border: '1px solid #e2e8f0', borderRadius: '12px', backgroundColor: 'white' }}>
                <Typography variant="h6" sx={{ mb: 3, fontWeight: 600, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 4, height: 24, backgroundColor: '#f59e0b', borderRadius: 1 }} />
                  PR Header Information
                </Typography>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={4}>
                    <Typography variant="body2" sx={{ color: '#64748b', mb: 0.5 }}>PR Number</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: '#f59e0b' }}>
                      {viewingPr.prNumber || 'N/A'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Typography variant="body2" sx={{ color: '#64748b', mb: 0.5 }}>PR Date</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>{viewingPr.prDate}</Typography>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Typography variant="body2" sx={{ color: '#64748b', mb: 0.5 }}>Required Date</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>{viewingPr.requiredDate}</Typography>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Typography variant="body2" sx={{ color: '#64748b', mb: 0.5 }}>Supplier</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>{viewingPr.supplierName}</Typography>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Typography variant="body2" sx={{ color: '#64748b', mb: 0.5 }}>Warehouse</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>{viewingPr.warehouseName}</Typography>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Typography variant="body2" sx={{ color: '#64748b', mb: 0.5 }}>Storage Location</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>{viewingPr.storageLocationName}</Typography>
                  </Grid>
                  {viewingPr.remarks && (
                    <Grid item xs={12}>
                      <Typography variant="body2" sx={{ color: '#64748b', mb: 0.5 }}>Remarks</Typography>
                      <Typography variant="body1">{viewingPr.remarks}</Typography>
                    </Grid>
                  )}
                  <Grid item xs={12} md={4}>
                    <Typography variant="body2" sx={{ color: '#64748b', mb: 0.5 }}>Status</Typography>
                    <Chip
                      label={viewingPr.status}
                      color={getStatusColor(viewingPr.status)}
                      size="small"
                      sx={{ fontWeight: 600, mt: 0.5 }}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Typography variant="body2" sx={{ color: '#64748b', mb: 0.5 }}>Total Amount</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: '#f59e0b' }}>
                      ${viewingPr.totalAmount?.toFixed(2)}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Typography variant="body2" sx={{ color: '#64748b', mb: 0.5 }}>Requestor</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>{viewingPr.requesterName}</Typography>
                  </Grid>
                </Grid>
              </Paper>

              <Paper elevation={0} sx={{ p: 3, border: '1px solid #e2e8f0', borderRadius: '12px', backgroundColor: 'white' }}>
                <Typography variant="h6" sx={{ mb: 3, fontWeight: 600, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 4, height: 24, backgroundColor: '#f59e0b', borderRadius: 1 }} />
                  Line Items ({viewingPr.lines?.length || 0} items)
                </Typography>
                <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: '8px' }}>
                  <Table size="small">
                    <TableHead sx={{ backgroundColor: '#f8fafc' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 600 }}>SAP Number</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Part Name</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Quantity</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Unit</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Unit Price</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Total</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {viewingPr.lines?.map((line, index) => (
                        <TableRow key={index} hover>
                          <TableCell>{line.sapNumber}</TableCell>
                          <TableCell sx={{ fontWeight: 500 }}>{line.partName}</TableCell>
                          <TableCell>{line.quantity}</TableCell>
                          <TableCell>{line.unit}</TableCell>
                          <TableCell>${line.unitPrice?.toFixed(2)}</TableCell>
                          <TableCell sx={{ fontWeight: 600, color: '#f59e0b' }}>${line.totalPrice?.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow sx={{ backgroundColor: '#fffbeb' }}>
                        <TableCell colSpan={5} align="right" sx={{ fontWeight: 700, fontSize: '1rem' }}>
                          Grand Total:
                        </TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: '1.2rem', color: '#f59e0b' }}>
                          ${viewingPr.totalAmount?.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3, borderTop: '1px solid #e2e8f0', backgroundColor: '#fafafa' }}>
          <Button
            onClick={() => setViewDialog(false)}
            sx={{
              textTransform: 'none',
              color: '#64748b',
              px: 3,
              py: 1
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar Notification */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: { borderRadius: '16px' }
        }}
      >
        <DialogTitle sx={{ textAlign: 'center', pt: 4 }}>
          <Box sx={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            backgroundColor: '#fef2f2',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto',
            mb: 2
          }}>
            <DeleteIcon sx={{ color: '#ef4444', fontSize: 32 }} />
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b' }}>
            Delete Purchase Requisition?
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ textAlign: 'center', pb: 3 }}>
          <Typography variant="body2" sx={{ color: '#64748b' }}>
            Are you sure you want to delete <strong>{deleteTarget?.prNumber}</strong>?
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0, justifyContent: 'center', gap: 2 }}>
          <Button
            onClick={() => setDeleteDialogOpen(false)}
            variant="outlined"
            disabled={saving}
            sx={{
              borderRadius: '10px',
              textTransform: 'none',
              px: 3,
              borderColor: '#e2e8f0',
              color: '#64748b'
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDeletePr}
            variant="contained"
            disabled={saving}
            sx={{
              borderRadius: '10px',
              textTransform: 'none',
              px: 3,
              backgroundColor: '#ef4444',
              '&:hover': { backgroundColor: '#dc2626' }
            }}
          >
            {saving ? 'Deleting...' : 'Delete PR'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PurchaseRequisition;
