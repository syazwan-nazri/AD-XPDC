import React, { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { collection, getDocs, addDoc, updateDoc, doc, Timestamp, query, orderBy } from 'firebase/firestore';
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
  MenuItem
} from '@mui/material';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import RefreshIcon from '@mui/icons-material/Refresh';

const PurchaseRequisition = () => {
  const user = useSelector(state => state.auth.user);
  const [parts, setParts] = useState([]);
  const [prs, setPrs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, rejected: 0 });

  // Create PR Form
  const [selectedPart, setSelectedPart] = useState(null);
  const [quantity, setQuantity] = useState('');
  const [remarks, setRemarks] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const fetchPrs = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'purchase_requisitions'), orderBy('date', 'desc'));
      const querySnapshot = await getDocs(q);
      const prData = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      setPrs(prData);

      // Calculate stats
      setStats({
        total: prData.length,
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

  useEffect(() => {
    const fetchParts = async () => {
      const querySnapshot = await getDocs(collection(db, 'parts'));
      setParts(querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
    };
    fetchParts();
    fetchPrs();
  }, []);

  const handleCreatePr = async () => {
    if (!selectedPart || !quantity) {
      setSnackbar({ open: true, message: 'Part and Quantity required', severity: 'error' });
      return;
    }

    if (Number(quantity) <= 0) {
      setSnackbar({ open: true, message: 'Quantity must be greater than 0', severity: 'error' });
      return;
    }

    try {
      await addDoc(collection(db, 'purchase_requisitions'), {
        requesterId: user?.uid || 'unknown',
        requesterName: user?.username || user?.email || 'Unknown',
        date: Timestamp.now(),
        status: 'Pending',
        items: [{ partId: selectedPart.id, partName: selectedPart.name, sapNumber: selectedPart.sapNumber, quantity: Number(quantity) }],
        remarks: remarks
      });
      setSnackbar({ open: true, message: 'Purchase Requisition Created Successfully', severity: 'success' });
      setCreateDialogOpen(false);
      setSelectedPart(null);
      setQuantity('');
      setRemarks('');
      fetchPrs();
    } catch (e) {
      console.error(e);
      setSnackbar({ open: true, message: 'Failed to Create PR', severity: 'error' });
    }
  };

  const handleStatusChange = async (prId, newStatus) => {
    try {
      await updateDoc(doc(db, 'purchase_requisitions', prId), {
        status: newStatus,
        approverId: user?.uid || 'unknown',
        approvedAt: Timestamp.now()
      });
      setSnackbar({ open: true, message: `PR ${newStatus} Successfully`, severity: 'success' });
      fetchPrs();
    } catch (e) {
      console.error(e);
      setSnackbar({ open: true, message: 'Failed to Update PR', severity: 'error' });
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Approved': return 'success';
      case 'Rejected': return 'error';
      default: return 'warning';
    }
  };

  // Filter PRs
  const filteredPrs = prs.filter(pr => {
    const matchStatus = statusFilter === 'All' || pr.status === statusFilter;
    const matchSearch = 
      pr.requesterName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pr.items?.[0]?.partName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pr.items?.[0]?.sapNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pr.remarks?.toLowerCase().includes(searchTerm.toLowerCase());
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
      p: 3,
      width: '100%'
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
                Manage and Approve Purchase Requests
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
                  Total PRs
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
              <Box>
                <Typography variant="body2" sx={{ color: '#64748b' }}>
                  Pending
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 600, color: '#f59e0b' }}>
                  {stats.pending}
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
              <Box>
                <Typography variant="body2" sx={{ color: '#64748b' }}>
                  Approved
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 600, color: '#10b981' }}>
                  {stats.approved}
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
              <Box>
                <Typography variant="body2" sx={{ color: '#64748b' }}>
                  Rejected
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 600, color: '#ef4444' }}>
                  {stats.rejected}
                </Typography>
              </Box>
            </Card>
          </Box>
        </Box>

        {/* Create PR Section */}
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
              <AddIcon sx={{ fontSize: 20, color: '#f59e0b' }} />
              Create New Purchase Requisition
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748b', mt: 0.5 }}>
              Submit a new purchase request for approval
            </Typography>
          </Box>

          <Box sx={{ p: 4 }}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Autocomplete
                  options={parts}
                  getOptionLabel={(option) => `${option.sapNumber || 'N/A'} - ${option.name}`}
                  value={selectedPart}
                  onChange={(event, newValue) => setSelectedPart(newValue)}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Select Part"
                      placeholder="Search by SAP Number or Part Name"
                      fullWidth
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: '10px',
                          backgroundColor: '#f8fafc',
                        }
                      }}
                    />
                  )}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '10px',
                    }
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Quantity"
                  type="number"
                  fullWidth
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  inputProps={{ min: 1 }}
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
                  label="Unit"
                  value={selectedPart?.unit || ''}
                  disabled
                  fullWidth
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '10px',
                      backgroundColor: '#f8fafc',
                    }
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Remarks"
                  fullWidth
                  multiline
                  rows={3}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Add any additional notes or details..."
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '10px',
                      backgroundColor: '#f8fafc',
                    }
                  }}
                />
              </Grid>
            </Grid>

            <Box sx={{
              display: 'flex',
              justifyContent: 'center',
              gap: 2,
              pt: 4,
              mt: 2,
              borderTop: '1px solid #e2e8f0'
            }}>
              <Button
                variant="outlined"
                onClick={() => {
                  setSelectedPart(null);
                  setQuantity('');
                  setRemarks('');
                }}
                sx={{
                  borderRadius: '10px',
                  borderColor: '#e2e8f0',
                  color: '#64748b',
                  textTransform: 'none',
                  minWidth: 120
                }}
              >
                Clear
              </Button>
              <Button
                variant="contained"
                onClick={handleCreatePr}
                startIcon={<AddIcon />}
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
                  }
                }}
              >
                Submit Request
              </Button>
            </Box>
          </Box>
        </Paper>

        {/* PRs List Section */}
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
          <Box sx={{ p: 3, borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
            <Grid container spacing={2} alignItems="flex-start">
              <Grid item xs={12} md={8}>
                <TextField
                  fullWidth
                  label="Search Purchase Requisitions"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by requester, part name, SAP number, or remarks..."
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
            <>
              <Box sx={{ overflowX: 'auto' }}>
                <Table sx={{ minWidth: 1000 }}>
                  <TableHead sx={{ backgroundColor: '#f8fafc' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Requester</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Part</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Quantity</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Remarks</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredPrs.map((pr) => (
                      <TableRow key={pr.id} hover>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 500, color: '#1e293b' }}>
                            {pr.date?.toDate?.() ? pr.date.toDate().toLocaleDateString() : 'N/A'}
                          </Typography>
                        </TableCell>
                        <TableCell>{pr.requesterName}</TableCell>
                        <TableCell>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 600, color: '#1e293b' }}>
                              {pr.items?.[0]?.partName || 'N/A'}
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#64748b' }}>
                              {pr.items?.[0]?.sapNumber || 'N/A'}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {pr.items?.[0]?.quantity || 0}
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
                          <Typography variant="body2" sx={{ color: '#64748b', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {pr.remarks || '-'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {pr.status === 'Pending' ? (
                            <Box sx={{ display: 'flex', gap: 0.5 }}>
                              <Tooltip title="Approve Request">
                                <Button
                                  size="small"
                                  variant="contained"
                                  color="success"
                                  onClick={() => handleStatusChange(pr.id, 'Approved')}
                                  sx={{
                                    textTransform: 'none',
                                    fontSize: '0.8rem',
                                    borderRadius: '8px'
                                  }}
                                >
                                  Approve
                                </Button>
                              </Tooltip>
                              <Tooltip title="Reject Request">
                                <Button
                                  size="small"
                                  variant="contained"
                                  color="error"
                                  onClick={() => handleStatusChange(pr.id, 'Rejected')}
                                  sx={{
                                    textTransform: 'none',
                                    fontSize: '0.8rem',
                                    borderRadius: '8px'
                                  }}
                                >
                                  Reject
                                </Button>
                              </Tooltip>
                            </Box>
                          ) : (
                            <Chip
                              label={pr.status}
                              color={getStatusColor(pr.status)}
                              size="small"
                              variant="outlined"
                            />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            </>
          )}
        </Paper>
      </Box>

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
    </Box>
  );
};

export default PurchaseRequisition;
