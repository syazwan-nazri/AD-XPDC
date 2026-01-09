import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, addDoc, deleteDoc, updateDoc, doc, writeBatch } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useDispatch, useSelector } from 'react-redux';
import { setParts } from '../../redux/partsSlice';
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
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Tooltip,
  Typography,
  Snackbar,
  Alert,
  LinearProgress,
  Chip,
  Card,
  Grid,
  CircularProgress,
  InputAdornment,
  TablePagination,

} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import CameraIcon from '@mui/icons-material/PhotoCamera';
import VisibilityIcon from '@mui/icons-material/Visibility';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import InventoryIcon from '@mui/icons-material/Inventory2';
import AddIcon from '@mui/icons-material/Add';
import WarningIcon from '@mui/icons-material/Warning';
import RefreshIcon from '@mui/icons-material/Refresh';
import ClearIcon from '@mui/icons-material/Clear';
import EventIcon from '@mui/icons-material/Event';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

const StockTake = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const parts = useSelector(state => state.parts.parts || []);
  const [storageLocations, setStorageLocations] = useState([]);
  const [materialGroups, setMaterialGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [stats, setStats] = useState({ total: 0, inProgress: 0, approved: 0 });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // Session states
  const [sessionForm, setSessionForm] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    startedBy: 'Current User',
    startDate: new Date().toISOString().split('T')[0],
    status: 'Not Started',
  });

  const [stockTakeSessions, setStockTakeSessions] = useState([]);
  const [currentSession, setCurrentSession] = useState(null);

  // Search & Filter
  const [historySearch, setHistorySearch] = useState('');
  const [historyStatusFilter, setHistoryStatusFilter] = useState('All');

  // Dialog states
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedSessionEdit, setSelectedSessionEdit] = useState(null);
  const [editStatus, setEditStatus] = useState('');

  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  // Fetch stock take data and master data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const sessionSnapshot = await getDocs(collection(db, 'stockTakeSessions'));
        const sessionData = sessionSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
        setStockTakeSessions(sessionData);
        
        // Calculate stats
        setStats({
          total: sessionData.length,
          inProgress: sessionData.filter(s => s.status === 'In Progress').length,
          approved: sessionData.filter(s => s.status === 'Approved').length,
        });

        const locationSnapshot = await getDocs(collection(db, 'storageLocations'));
        const locationData = locationSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
        setStorageLocations(locationData);

        const groupSnapshot = await getDocs(collection(db, 'materialGroups'));
        const groupData = groupSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
        setMaterialGroups(groupData);

        // Ensure parts are loaded
        if (parts.length === 0) {
          const partsSnapshot = await getDocs(collection(db, 'parts'));
          const partsData = partsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
          dispatch(setParts(partsData));
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        setSnackbar({ open: true, message: 'Error fetching data', severity: 'error' });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [dispatch, parts.length]);

  // Handle start new stock take
  const handleStartStockTake = async () => {
    if (!sessionForm.month || !sessionForm.year) {
      setSnackbar({ open: true, message: 'Please select month and year', severity: 'error' });
      return;
    }

    const newSession = {
      ...sessionForm,
      status: 'In Progress',
      createdAt: new Date().toISOString(),
    };

    try {
      const docRef = await addDoc(collection(db, 'stockTakeSessions'), newSession);
      const createdSession = { ...newSession, id: docRef.id };

      // Navigate to process page
      navigate('/inventory/stock-take/process', { state: { session: createdSession } });

    } catch (error) {
      console.error('Error starting session:', error);
      setSnackbar({ open: true, message: 'Error starting session', severity: 'error' });
    }
  };

  const handleSessionClick = (session) => {
    navigate('/inventory/stock-take/process', { state: { session } });
  };

  // Filter
  const filteredSessions = stockTakeSessions.filter(session => {
    const matchStatus = historyStatusFilter === 'All' || session.status === historyStatusFilter;
    const searchString = `${months[session.month - 1]} ${session.year} ${session.status}`.toLowerCase();
    const matchSearch = searchString.includes(historySearch.toLowerCase());
    return matchStatus && matchSearch;
  });

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const refreshData = async () => {
    setLoading(true);
    try {
      const sessionSnapshot = await getDocs(collection(db, 'stockTakeSessions'));
      const sessionData = sessionSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      setStockTakeSessions(sessionData);
      setStats({
        total: sessionData.length,
        inProgress: sessionData.filter(s => s.status === 'In Progress').length,
        approved: sessionData.filter(s => s.status === 'Approved').length,
      });
      setSnackbar({ open: true, message: 'Data refreshed successfully', severity: 'success' });
    } catch (error) {
      setSnackbar({ open: true, message: 'Error refreshing data', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  if (loading && stockTakeSessions.length === 0) {
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
              background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
              color: 'white',
              boxShadow: '0 4px 12px rgba(6, 182, 212, 0.3)'
            }}>
              <InventoryIcon sx={{ fontSize: 28 }} />
            </Box>
            <Box>
              <Typography variant="h4" sx={{
                fontWeight: 700,
                color: '#1e293b',
                mb: 0.5
              }}>
                Stock Take
              </Typography>
              <Typography variant="body1" sx={{ color: '#64748b' }}>
                Monthly Inventory Count & Verification
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
                  Total Sessions
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
                <EventIcon sx={{ color: '#f59e0b', fontSize: 18 }} />
                <Box>
                  <Typography variant="body2" sx={{ color: '#64748b' }}>
                    In Progress
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: '#1e293b' }}>
                    {stats.inProgress}
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
                <VisibilityIcon sx={{ color: '#10b981', fontSize: 18 }} />
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

        {/* Stock Take Session Section */}
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
            backgroundColor: '#ecf8fc'
          }}>
            <Typography variant="h6" sx={{
              fontWeight: 600,
              color: '#1e293b',
              display: 'flex',
              alignItems: 'center',
              gap: 1
            }}>
              <AddIcon sx={{ fontSize: 20, color: '#06b6d4' }} />
              New Stock Take Session
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748b', mt: 0.5 }}>
              Start a new monthly stock take count
            </Typography>
          </Box>

          <Box sx={{ p: 4 }}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={3}>
                <FormControl fullWidth>
                  <InputLabel>Month</InputLabel>
                  <Select
                    value={sessionForm.month}
                    onChange={(e) => setSessionForm({ ...sessionForm, month: e.target.value })}
                    label="Month"
                    sx={{
                      borderRadius: '10px',
                      backgroundColor: '#f8fafc',
                    }}
                  >
                    {months.map((m, idx) => (
                      <MenuItem key={idx} value={idx + 1}>{m}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  label="Year"
                  type="number"
                  value={sessionForm.year}
                  onChange={(e) => setSessionForm({ ...sessionForm, year: e.target.value })}
                  fullWidth
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '10px',
                      backgroundColor: '#f8fafc',
                    }
                  }}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  label="Started By"
                  value={sessionForm.startedBy}
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
              <Grid item xs={12} md={3}>
                <TextField
                  label="Start Date"
                  type="date"
                  value={sessionForm.startDate}
                  disabled
                  fullWidth
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

            <Box sx={{
              display: 'flex',
              justifyContent: 'center',
              gap: 2,
              pt: 4,
              mt: 2,
              borderTop: '1px solid #e2e8f0'
            }}>
              <Button
                variant="contained"
                onClick={handleStartStockTake}
                disabled={currentSession && currentSession.status === 'In Progress'}
                startIcon={<AddIcon />}
                sx={{
                  minWidth: 200,
                  background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
                  px: 4,
                  py: 1.5,
                  fontWeight: 600,
                  fontSize: '1rem',
                  borderRadius: '10px',
                  textTransform: 'none',
                  boxShadow: '0 4px 14px rgba(6, 182, 212, 0.4)',
                  '&:hover': {
                    boxShadow: '0 6px 20px rgba(6, 182, 212, 0.6)',
                    transform: 'translateY(-2px)'
                  },
                  '&:disabled': {
                    background: '#e2e8f0',
                    color: '#94a3b8'
                  }
                }}
              >
                Start Stock Take
              </Button>
            </Box>
          </Box>
        </Paper>

        {/* Stock Take History Section */}
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
            backgroundColor: '#ecf8fc',
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
                <InventoryIcon sx={{ fontSize: 20, color: '#06b6d4' }} />
                Stock Take History
              </Typography>
              <Typography variant="body2" sx={{ color: '#64748b', mt: 0.5 }}>
                {filteredSessions.length} sessions found
              </Typography>
            </Box>
            <Tooltip title="Refresh data">
              <IconButton
                onClick={refreshData}
                sx={{
                  color: '#06b6d4',
                  backgroundColor: 'white',
                  border: '1px solid #e2e8f0',
                  '&:hover': {
                    backgroundColor: '#ecf8fc'
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
                  label="Search Sessions"
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  placeholder="Search by month, year, status..."
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon sx={{ color: '#64748b' }} />
                      </InputAdornment>
                    ),
                    endAdornment: historySearch && (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setHistorySearch('')} size="small">
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
                    value={historyStatusFilter}
                    onChange={(e) => setHistoryStatusFilter(e.target.value)}
                    label="Status Filter"
                    sx={{
                      borderRadius: '10px',
                      backgroundColor: 'white',
                    }}
                  >
                    <MenuItem value="All">All Status</MenuItem>
                    <MenuItem value="In Progress">In Progress</MenuItem>
                    <MenuItem value="Complete">Complete</MenuItem>
                    <MenuItem value="Approved">Approved</MenuItem>
                    <MenuItem value="Rejected">Rejected</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Box>

          {/* History Table */}
          {loading ? (
            <Box sx={{ p: 6, textAlign: 'center' }}>
              <CircularProgress />
            </Box>
          ) : filteredSessions.length === 0 ? (
            <Box sx={{
              p: 6,
              textAlign: 'center',
              color: '#94a3b8'
            }}>
              <InventoryIcon sx={{ fontSize: 64, mb: 2, opacity: 0.5 }} />
              <Typography variant="h6" sx={{ mb: 1 }}>
                No stock take sessions found
              </Typography>
            </Box>
          ) : (
            <>
              <Box sx={{ overflowX: 'auto' }}>
                <Table sx={{ minWidth: 800 }}>
                  <TableHead sx={{ backgroundColor: '#f8fafc' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>Month</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Year</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Started By</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Start Date</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredSessions
                      .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                      .map((session) => (
                        <TableRow key={session.id} hover>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 600, color: '#1e293b' }}>
                              {months[session.month - 1]}
                            </Typography>
                          </TableCell>
                          <TableCell>{session.year}</TableCell>
                          <TableCell>{session.startedBy}</TableCell>
                          <TableCell>{session.startDate}</TableCell>
                          <TableCell>
                            <Chip
                              label={session.status}
                              color={
                                session.status === 'Approved' ? 'success' :
                                  session.status === 'Rejected' ? 'error' :
                                    session.status === 'Complete' ? 'info' :
                                      'warning'
                              }
                              size="small"
                              sx={{ fontWeight: 600, minWidth: 100 }}
                            />
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', gap: 0.5 }}>
                              <Tooltip title="View & Process">
                                <IconButton
                                  size="small"
                                  onClick={() => handleSessionClick(session)}
                                  sx={{
                                    color: '#06b6d4',
                                    '&:hover': { backgroundColor: '#ecf8fc' }
                                  }}
                                >
                                  <VisibilityIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Edit Status">
                                <IconButton
                                  size="small"
                                  onClick={() => {
                                    setSelectedSessionEdit(session);
                                    setEditStatus(session.status);
                                    setEditDialogOpen(true);
                                  }}
                                  sx={{
                                    color: '#06b6d4',
                                    '&:hover': { backgroundColor: '#ecf8fc' }
                                  }}
                                >
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Delete Session">
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={async () => {
                                    if (window.confirm('Are you sure you want to delete this session?')) {
                                      try {
                                        await deleteDoc(doc(db, 'stockTakeSessions', session.id));
                                        setSnackbar({ open: true, message: 'Session deleted successfully', severity: 'success' });
                                        const sessionSnapshot = await getDocs(collection(db, 'stockTakeSessions'));
                                        const sessionData = sessionSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
                                        setStockTakeSessions(sessionData);
                                      } catch (error) {
                                        console.error('Error deleting session:', error);
                                        setSnackbar({ open: true, message: 'Error deleting session', severity: 'error' });
                                      }
                                    }
                                  }}
                                  sx={{
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
                  </TableBody>
                </Table>
              </Box>

              {/* Pagination */}
              <TablePagination
                rowsPerPageOptions={[10, 25, 50, 100]}
                component="div"
                count={filteredSessions.length}
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

      {/* Edit Status Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        maxWidth="sm"
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
          backgroundColor: '#ecf8fc'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <EditIcon sx={{ color: '#06b6d4' }} />
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#1e293b' }}>
              Change Session Status
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ py: 3 }}>
          <FormControl fullWidth>
            <InputLabel>Status</InputLabel>
            <Select
              value={editStatus}
              onChange={(e) => setEditStatus(e.target.value)}
              label="Status"
              sx={{
                borderRadius: '10px',
                backgroundColor: '#f8fafc',
              }}
            >
              <MenuItem value="In Progress">In Progress</MenuItem>
              <MenuItem value="Complete">Complete</MenuItem>
              <MenuItem value="Approved">Approved</MenuItem>
              <MenuItem value="Rejected">Rejected</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{
          p: 2,
          borderTop: '1px solid #e2e8f0',
          backgroundColor: '#f8fafc'
        }}>
          <Button
            onClick={() => setEditDialogOpen(false)}
            variant="outlined"
            sx={{
              borderRadius: '10px',
              borderColor: '#e2e8f0',
              color: '#64748b',
              textTransform: 'none'
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={async () => {
              try {
                const sessionRef = doc(db, 'stockTakeSessions', selectedSessionEdit.id);
                await updateDoc(sessionRef, {
                  status: editStatus,
                });
                setSnackbar({ open: true, message: 'Status updated successfully', severity: 'success' });
                const sessionSnapshot = await getDocs(collection(db, 'stockTakeSessions'));
                const sessionData = sessionSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
                setStockTakeSessions(sessionData);
                setEditDialogOpen(false);
                setSelectedSessionEdit(null);
                setEditStatus('');
              } catch (error) {
                console.error('Error updating status:', error);
                setSnackbar({ open: true, message: 'Error updating status', severity: 'error' });
              }
            }}
            variant="contained"
            sx={{
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
              textTransform: 'none',
              fontWeight: 600
            }}
          >
            Save Changes
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
    </Box>
  );
};

export default StockTake;
