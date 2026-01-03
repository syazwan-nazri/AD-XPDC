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

} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import CameraIcon from '@mui/icons-material/PhotoCamera';
import VisibilityIcon from '@mui/icons-material/Visibility';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
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

  const [pageStart, setPageStart] = useState(0);
  const pageSize = 20;

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



  // Pagination for history
  // Filter
  const filteredSessions = stockTakeSessions.filter(session => {
    const matchStatus = historyStatusFilter === 'All' || session.status === historyStatusFilter;
    const searchString = `${months[session.month - 1]} ${session.year} ${session.status}`.toLowerCase();
    const matchSearch = searchString.includes(historySearch.toLowerCase());
    return matchStatus && matchSearch;
  });

  // Pagination for history
  const pageEnd = Math.min(pageStart + pageSize, filteredSessions.length);
  const sessionsPaginated = filteredSessions.slice(pageStart, pageEnd);

  if (loading) {
    return <Box sx={{ p: 3 }}><Typography>Loading...</Typography></Box>;
  }

  return (
    <Box sx={{ m: 0, p: 0 }}>
      {/* Title */}
      <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
        <h2 style={{ margin: 0 }}>MONTHLY STOCK TAKE</h2>
      </Paper>

      {/* Stock Take Session Section */}
      <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
          STOCK TAKE SESSION
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 2, mb: 2 }}>
          <FormControl fullWidth size="small">
            <InputLabel>Month</InputLabel>
            <Select
              value={sessionForm.month}
              onChange={(e) => setSessionForm({ ...sessionForm, month: e.target.value })}
              label="Month"
            >
              {months.map((m, idx) => (
                <MenuItem key={idx} value={idx + 1}>{m}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            label="Year"
            type="number"
            value={sessionForm.year}
            onChange={(e) => setSessionForm({ ...sessionForm, year: e.target.value })}
            fullWidth
            size="small"
          />

        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 2, mb: 2 }}>
          <TextField
            label="Started By"
            value={sessionForm.startedBy}
            disabled
            fullWidth
            size="small"
          />
          <TextField
            label="Start Date"
            type="date"
            value={sessionForm.startDate}
            disabled
            fullWidth
            size="small"
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="Status"
            value={currentSession?.status || sessionForm.status}
            disabled
            fullWidth
            size="small"
          />
        </Box>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="contained"
            onClick={handleStartStockTake}
            disabled={currentSession && currentSession.status === 'In Progress'}
          >
            START NEW STOCK TAKE
          </Button>
        </Box>
      </Paper>



      {/* Stock Take History Section */}
      <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
          STOCK TAKE HISTORY ({stockTakeSessions.length} RECORDS)
        </Typography>

        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <TextField
            label="Search"
            variant="outlined"
            size="small"
            fullWidth
            value={historySearch}
            onChange={(e) => setHistorySearch(e.target.value)}
            placeholder="Search by Month, Year, Status..."
          />
          <FormControl size="small" sx={{ width: 200 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={historyStatusFilter}
              onChange={(e) => setHistoryStatusFilter(e.target.value)}
              label="Status"
            >
              <MenuItem value="All">All Status</MenuItem>
              <MenuItem value="Approved">Approved</MenuItem>
              <MenuItem value="In Progress">In Progress</MenuItem>
              <MenuItem value="Rejected">Rejected</MenuItem>
            </Select>
          </FormControl>
        </Box>

        <Box sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold', width: '15%' }}>Month</TableCell>
                <TableCell sx={{ fontWeight: 'bold', width: '10%' }}>Year</TableCell>
                <TableCell sx={{ fontWeight: 'bold', width: '12%' }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 'bold', width: '15%' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sessionsPaginated.length > 0 ? (
                sessionsPaginated.map((session) => {
                  // Calculate items and variance for this session
                  const sessionItems = session.items ? session.items.length : 0;
                  const sessionVariances = session.items ? session.items.filter(item => {
                    const variance = (item.countQty || 0) - (item.stockQty || 0);
                    return variance !== 0;
                  }).length : 0;

                  return (
                    <TableRow
                      key={session.id}
                      hover
                      onClick={() => handleSessionClick(session)}
                      sx={{ cursor: 'pointer' }}
                    >
                      <TableCell>{months[session.month - 1]}</TableCell>
                      <TableCell>{session.year}</TableCell>
                      <TableCell>
                        <Chip
                          label={session.status}
                          color={
                            session.status === 'Approved' ? 'success' :
                              session.status === 'Rejected' ? 'error' :
                                'warning'
                          }
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Tooltip title="Edit">
                          <IconButton
                            size="small"
                            onClick={() => {
                              setSelectedSessionEdit(session);
                              setEditStatus(session.status);
                              setEditDialogOpen(true);
                            }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton
                            size="small"
                            onClick={async () => {
                              if (window.confirm('Are you sure you want to delete this record?')) {
                                try {
                                  await deleteDoc(doc(db, 'stockTakeSessions', session.id));
                                  setSnackbar({ open: true, message: 'Record deleted successfully', severity: 'success' });
                                  const sessionSnapshot = await getDocs(collection(db, 'stockTakeSessions'));
                                  const sessionData = sessionSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
                                  setStockTakeSessions(sessionData);
                                } catch (error) {
                                  console.error('Error deleting record:', error);
                                  setSnackbar({ open: true, message: 'Error deleting record', severity: 'error' });
                                }
                              }
                            }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 3, color: '#999' }}>
                    No stock take records
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Box>

        {/* Pagination */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
          <Box>
            <Button
              variant="outlined"
              size="small"
              onClick={() => setPageStart(Math.max(0, pageStart - pageSize))}
              disabled={pageStart === 0}
              sx={{ mr: 1 }}
            >
              &lt;&lt; Previous
            </Button>
            <Button
              variant="outlined"
              size="small"
              onClick={() => setPageStart(pageStart + pageSize)}
              disabled={pageEnd >= stockTakeSessions.length}
            >
              Next &gt;&gt;
            </Button>
          </Box>
          <Typography variant="body2" sx={{ color: '#666' }}>
            Showing {stockTakeSessions.length > 0 ? pageStart + 1 : 0}-{pageEnd} of {stockTakeSessions.length} records
          </Typography>
        </Box>
      </Paper>





      {/* Edit Status Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Change Status</DialogTitle>
        <DialogContent sx={{ py: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value)}
                label="Status"
              >
                <MenuItem value="In Progress">In Progress</MenuItem>
                <MenuItem value="Complete">Complete</MenuItem>
                <MenuItem value="Approved">Approved</MenuItem>
                <MenuItem value="Rejected">Rejected</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setEditDialogOpen(false)} variant="outlined">
            CANCEL
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
          >
            SAVE
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar Notification */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default StockTake;
