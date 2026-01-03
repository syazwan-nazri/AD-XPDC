import React, { useEffect, useState, useMemo } from 'react';
import { collection, getDocs, addDoc, deleteDoc, updateDoc, doc, writeBatch } from 'firebase/firestore';
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

const StockTake = () => {
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
    selectionMode: 'All', // All, ByLocation, ByGroup
    selectedLocationId: '',
    selectedGroupId: '',
    startedBy: 'Current User',
    startDate: new Date().toISOString().split('T')[0],
    status: 'Not Started',
  });

  const [stockTakeSessions, setStockTakeSessions] = useState([]);
  const [currentSession, setCurrentSession] = useState(null);
  const [countEntries, setCountEntries] = useState([]);
  const [pageStart, setPageStart] = useState(0);
  const [stockCountPageStart, setStockCountPageStart] = useState(0);
  const pageSize = 20;

  // Dialog states
  const [barcodeDialogOpen, setBarcodeDialogOpen] = useState(false);
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [viewVarianceDialogOpen, setViewVarianceDialogOpen] = useState(false);
  const [selectedSessionView, setSelectedSessionView] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedSessionEdit, setSelectedSessionEdit] = useState(null);
  const [editStatus, setEditStatus] = useState('');

  const [barcodeInput, setBarcodeInput] = useState('');
  const [currentCountItem, setCurrentCountItem] = useState(null);
  const [approvalComments, setApprovalComments] = useState('');

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

  // Get filtered parts for current session
  // Get filtered parts for current session or preview
  const filteredParts = useMemo(() => {
    // If a session is active, use its criteria
    const criteria = currentSession ? {
      selectionMode: currentSession.selectionMode,
      selectedLocationId: currentSession.selectedLocationId,
      selectedGroupId: currentSession.selectedGroupId
    } : {
      selectionMode: sessionForm.selectionMode,
      selectedLocationId: sessionForm.selectedLocationId,
      selectedGroupId: sessionForm.selectedGroupId
    };

    return parts.filter(p => {
      if (criteria.selectionMode === 'ByLocation') {
        const location = storageLocations.find(l => l.id === criteria.selectedLocationId);
        if (!location) return false;
        // Match Rack Number and Level
        const partRack = p.rackNumber || '';
        const partLevel = p.rackLevel || '';
        const locRack = location.rackNumber || '';
        const locLevel = location.rackLevel || '';

        // Exact match
        return partRack == locRack && partLevel == locLevel;
      }

      if (criteria.selectionMode === 'ByGroup') {
        if (!criteria.selectedGroupId) return false;
        // Match Material Group ID or Name?
        // parts store 'materialGroupId' usually, but legacy might have 'materialGroup' name string.
        // Let's assume ID if available, else name check
        if (p.materialGroupId) return p.materialGroupId === criteria.selectedGroupId;
        // Fallback to name match if p.materialGroup exists
        const group = materialGroups.find(g => g.id === criteria.selectedGroupId);
        if (group && p.materialGroup) return p.materialGroup === group.materialGroup;
        return false;
      }

      return true; // Mode 'All'
    });
  }, [parts, currentSession, sessionForm, storageLocations, materialGroups]);

  // Calculate progress
  const progressStats = useMemo(() => {
    const total = filteredParts.length;
    const counted = countEntries.length;
    const remaining = total - counted;
    const percentage = total > 0 ? Math.round((counted / total) * 100) : 0;

    return { total, counted, remaining, percentage };
  }, [filteredParts, countEntries]);

  // Calculate variance report
  const varianceReport = useMemo(() => {
    if (!currentSession || currentSession.status !== 'In Progress') return null;

    const variances = countEntries.map(entry => {
      const variance = (entry.countQty || 0) - (entry.stockQty || 0);
      return { ...entry, variance };
    });

    const zeroVariance = variances.filter(v => v.variance === 0).length;
    const positiveVariance = variances.filter(v => v.variance > 0);
    const negativeVariance = variances.filter(v => v.variance < 0);
    const totalVarianceValue = positiveVariance.reduce((sum, v) => sum + (v.variance * 100), 0) +
      negativeVariance.reduce((sum, v) => sum + (v.variance * 100), 0);

    return {
      variances,
      zeroVariance,
      positiveCount: positiveVariance.length,
      negativeCount: negativeVariance.length,
      totalVarianceValue,
    };
  }, [currentSession, countEntries]);

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
      setStockTakeSessions([...stockTakeSessions, createdSession]);
      setCurrentSession(createdSession);
      setCountEntries([]);
      setSnackbar({ open: true, message: 'Stock Take session started', severity: 'success' });
    } catch (error) {
      console.error('Error starting session:', error);
      setSnackbar({ open: true, message: 'Error starting session', severity: 'error' });
    }
  };

  // Handle barcode scan
  const handleBarcodeScan = () => {
    const scannedPart = parts.find(p => p.sapNumber === barcodeInput);
    if (scannedPart) {
      setCurrentCountItem({
        sapNumber: scannedPart.sapNumber,
        partName: scannedPart.name,
        location: scannedPart.rackNumber ? `${scannedPart.rackNumber}-${scannedPart.rackLevel}` : 'N/A',
        stockQty: scannedPart.currentStock || 0,
        countQty: '',
        id: Date.now(),
      });
      setBarcodeInput('');
    } else {
      setSnackbar({ open: true, message: 'Part not found', severity: 'error' });
    }
  };

  // Handle save count
  const handleSaveCount = () => {
    if (!currentCountItem.countQty) {
      setSnackbar({ open: true, message: 'Please enter count quantity', severity: 'error' });
      return;
    }

    const existingIndex = countEntries.findIndex(e => e.sapNumber === currentCountItem.sapNumber);
    if (existingIndex >= 0) {
      const updated = [...countEntries];
      updated[existingIndex] = currentCountItem;
      setCountEntries(updated);
    } else {
      setCountEntries([...countEntries, currentCountItem]);
    }

    setCurrentCountItem(null);
    setBarcodeDialogOpen(false);
    setSnackbar({ open: true, message: 'Count saved', severity: 'success' });
  };

  // Handle approve stock take
  const handleApproveStockTake = async () => {
    if (!currentSession) return;

    // Mandatory remarks check
    if (!approvalComments || approvalComments.trim() === '') {
      setSnackbar({ open: true, message: 'Approval remarks are mandatory', severity: 'error' });
      return;
    }

    try {
      const batch = writeBatch(db);

      // Update parts stock and add movement logs
      countEntries.forEach(entry => {
        const variance = (entry.countQty || 0) - (entry.stockQty || 0);
        if (variance !== 0) {
          // Find part ID (entry might not have it if it comes from session, need to match sapNumber)
          // Actually entry should have matched data, but local `countEntries` has `sapNumber`.
          // We need to find the part's doc ID from the `parts` list.
          const part = parts.find(p => p.sapNumber === entry.sapNumber);
          if (part && part.id) {
            const partRef = doc(db, 'parts', part.id);
            batch.update(partRef, {
              currentStock: entry.countQty,
              updatedAt: new Date().toISOString()
            });

            // Add movement log
            const logRef = doc(collection(db, 'movement_logs'));
            batch.set(logRef, {
              date: new Date(),
              type: 'STOCK TAKE',
              partName: part.name,
              sapNumber: part.sapNumber,
              quantity: variance, // + for gain, - for loss
              userName: sessionForm.startedBy || 'System',
              remarks: `Stock Take Adjustment: ${approvalComments} (Session ${months[sessionForm.month - 1]} ${sessionForm.year})`
            });
          }
        }
      });

      // Update session status
      const sessionRef = doc(db, 'stockTakeSessions', currentSession.id);
      batch.update(sessionRef, {
        status: 'Approved',
        approvalComments,
        approvedAt: new Date().toISOString(),
      });

      await batch.commit();

      const updated = { ...currentSession, status: 'Approved', approvalComments };
      setCurrentSession(updated);
      setApprovalDialogOpen(false);
      setApprovalComments('');

      // Refresh stock take sessions list and parts
      const sessionSnapshot = await getDocs(collection(db, 'stockTakeSessions'));
      const sessionData = sessionSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      setStockTakeSessions(sessionData);

      // Refresh parts in Redux
      const partsSnapshot = await getDocs(collection(db, 'parts'));
      const partsData = partsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      dispatch(setParts(partsData));

      setSnackbar({ open: true, message: 'Stock Take approved and adjustments posted', severity: 'success' });
    } catch (error) {
      console.error('Error approving:', error);
      setSnackbar({ open: true, message: 'Error approving stock take', severity: 'error' });
    }
  };

  // Handle save progress
  const handleSaveProgress = async () => {
    if (!currentSession) return;

    try {
      await updateDoc(doc(db, 'stockTakeSessions', currentSession.id), {
        items: countEntries,
        lastUpdated: new Date().toISOString(),
      });

      const updated = { ...currentSession, items: countEntries };
      setCurrentSession(updated);

      // Refresh stock take sessions list
      const sessionSnapshot = await getDocs(collection(db, 'stockTakeSessions'));
      const sessionData = sessionSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      setStockTakeSessions(sessionData);

      setSnackbar({ open: true, message: 'Progress saved successfully', severity: 'success' });
    } catch (error) {
      console.error('Error saving progress:', error);
      setSnackbar({ open: true, message: 'Error saving progress', severity: 'error' });
    }
  };

  // Pagination for history
  const pageEnd = Math.min(pageStart + pageSize, stockTakeSessions.length);
  const sessionsPaginated = stockTakeSessions.slice(pageStart, pageEnd);

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

          <FormControl fullWidth size="small">
            <InputLabel>Selection Mode</InputLabel>
            <Select
              value={sessionForm.selectionMode}
              onChange={(e) => setSessionForm({
                ...sessionForm,
                selectionMode: e.target.value,
                selectedLocationId: '',
                selectedGroupId: ''
              })}
              label="Selection Mode"
            >
              <MenuItem value="All">All Parts</MenuItem>
              <MenuItem value="ByLocation">By Location</MenuItem>
              <MenuItem value="ByGroup">By Material Group</MenuItem>
            </Select>
          </FormControl>

          {sessionForm.selectionMode === 'ByLocation' && (
            <FormControl fullWidth size="small">
              <InputLabel>Location</InputLabel>
              <Select
                value={sessionForm.selectedLocationId}
                onChange={(e) => setSessionForm({ ...sessionForm, selectedLocationId: e.target.value })}
                label="Location"
              >
                {storageLocations.map(loc => (
                  <MenuItem key={loc.id} value={loc.id}>
                    {loc.binId} - {loc.description} ({loc.rackNumber}-{loc.rackLevel})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          {sessionForm.selectionMode === 'ByGroup' && (
            <FormControl fullWidth size="small">
              <InputLabel>Material Group</InputLabel>
              <Select
                value={sessionForm.selectedGroupId}
                onChange={(e) => setSessionForm({ ...sessionForm, selectedGroupId: e.target.value })}
                label="Material Group"
              >
                {materialGroups.map(group => (
                  <MenuItem key={group.id} value={group.id}>
                    {group.materialGroup}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
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

      {/* Stock Count Entry Section */}
      {currentSession && currentSession.status === 'In Progress' && (
        <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              STOCK COUNT ENTRY ({parts && parts.length > 0 ? parts.length : 0} PARTS)
            </Typography>
            {loading && <Typography variant="body2" sx={{ color: '#999' }}>Loading parts...</Typography>}
          </Box>

          {parts && parts.length > 0 ? (
            <Box sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold', width: '10%' }}>SAP#</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', width: '25%' }}>Part Name</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', width: '15%' }}>Location</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', width: '12%' }}>Stock Qty</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', width: '12%' }}>Count Qty</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', width: '12%' }}>Variance</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', width: '10%' }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {parts && parts.slice(stockCountPageStart, stockCountPageStart + pageSize).map((part) => {
                    const countEntry = countEntries.find(e => e.sapNumber === part.sapNumber);
                    const countQty = countEntry ? countEntry.countQty : '';
                    const variance = (countQty || 0) - (part.currentStock || 0);
                    const location = part.rackNumber ? `${part.rackNumber}-${part.rackLevel}` : 'N/A';

                    return (
                      <TableRow key={part.sapNumber} hover>
                        <TableCell>{part.sapNumber}</TableCell>
                        <TableCell>{part.name}</TableCell>
                        <TableCell>{location}</TableCell>
                        <TableCell>{part.currentStock || 0}</TableCell>
                        <TableCell>
                          <TextField
                            size="small"
                            type="number"
                            value={countQty}
                            onChange={(e) => {
                              const value = e.target.value ? parseInt(e.target.value) : '';
                              const existingIndex = countEntries.findIndex(en => en.sapNumber === part.sapNumber);
                              if (existingIndex >= 0) {
                                const updated = [...countEntries];
                                updated[existingIndex] = {
                                  ...updated[existingIndex],
                                  countQty: value,
                                };
                                setCountEntries(updated);
                              } else if (value !== '') {
                                setCountEntries([...countEntries, {
                                  sapNumber: part.sapNumber,
                                  partName: part.name,
                                  location: location,
                                  stockQty: part.currentStock || 0,
                                  countQty: value,
                                  id: Date.now() + Math.random(),
                                }]);
                              }
                            }}
                            placeholder="Enter count"
                            sx={{ width: '100px' }}
                          />
                        </TableCell>
                        <TableCell>
                          {countQty !== '' && (
                            <Chip
                              label={variance > 0 ? `+${variance}` : variance}
                              color={variance === 0 ? 'default' : variance > 0 ? 'success' : 'error'}
                              size="small"
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          {countEntry && (
                            <Tooltip title="Clear">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => setCountEntries(countEntries.filter(e => e.sapNumber !== part.sapNumber))}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Box>
          ) : (
            <Box sx={{ py: 3, textAlign: 'center', color: '#999' }}>
              <Typography variant="body2">
                {loading ? 'Loading parts data...' : 'No spare parts registered in Part Master. Please check the Part Master configuration.'}
              </Typography>
            </Box>
          )}

          {parts && parts.length > 0 && (
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => setStockCountPageStart(Math.max(0, stockCountPageStart - pageSize))}
                  disabled={stockCountPageStart === 0}
                >
                  &lt;&lt; Previous
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => setStockCountPageStart(stockCountPageStart + pageSize)}
                  disabled={stockCountPageStart + pageSize >= parts.length}
                >
                  Next &gt;&gt;
                </Button>
                <Button
                  variant="contained"
                  size="small"
                  onClick={handleSaveProgress}
                >
                  SAVE PROGRESS
                </Button>
              </Box>
              <Typography variant="body2" sx={{ color: '#666' }}>
                Showing {parts.length > 0 ? stockCountPageStart + 1 : 0}-{Math.min(stockCountPageStart + pageSize, parts.length)} of {parts.length} parts
              </Typography>
            </Box>
          )}
        </Paper>
      )}

      {/* Variance Report Section */}
      {currentSession && varianceReport && (
        <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              VARIANCE REPORT
            </Typography>
          </Box>

          <Box sx={{ overflowX: 'auto', mb: 2 }}>
            <Table size="small">
              <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold', width: '10%' }}>SAP#</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', width: '25%' }}>Part Name</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', width: '15%' }}>Location</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', width: '12%' }}>Stock Qty</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', width: '12%' }}>Count Qty</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', width: '12%' }}>Variance</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {varianceReport.variances.filter(v => v.variance !== 0).map((entry) => (
                  <TableRow key={entry.id} hover>
                    <TableCell>{entry.sapNumber}</TableCell>
                    <TableCell>{entry.partName}</TableCell>
                    <TableCell>{entry.location}</TableCell>
                    <TableCell>{entry.stockQty}</TableCell>
                    <TableCell>{entry.countQty}</TableCell>
                    <TableCell>
                      <Chip
                        label={entry.variance > 0 ? `+${entry.variance}` : entry.variance}
                        color={entry.variance > 0 ? 'success' : 'error'}
                        size="small"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>

          <Paper sx={{ p: 2, backgroundColor: '#f9f9f9', mb: 2 }}>
            <Typography variant="body2" sx={{ mb: 1 }}>
              <strong>Summary:</strong>
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 2 }}>
              <Typography variant="body2">
                Total Items: <strong>{countEntries.length}</strong>
              </Typography>
              <Typography variant="body2">
                Zero Variance: <strong>{varianceReport.zeroVariance}</strong>
              </Typography>
              <Typography variant="body2">
                Positive: <strong>{varianceReport.positiveCount}</strong>
              </Typography>
              <Typography variant="body2">
                Negative: <strong>{varianceReport.negativeCount}</strong>
              </Typography>
            </Box>
            <Typography variant="body2" sx={{ mt: 1 }}>
              Total Variance Value: <strong>${Math.abs(varianceReport.totalVarianceValue)}</strong>
            </Typography>
          </Paper>

          {currentSession.status === 'In Progress' && (
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button variant="outlined" color="error">REJECT COUNT</Button>
              <Button
                variant="contained"
                onClick={() => setApprovalDialogOpen(true)}
              >
                APPROVE COUNT
              </Button>
            </Box>
          )}
        </Paper>
      )}

      {/* Stock Take History Section */}
      <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
          STOCK TAKE HISTORY ({stockTakeSessions.length} RECORDS)
        </Typography>

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
                    <TableRow key={session.id} hover>
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

      {/* Barcode Scanner Dialog */}
      <Dialog open={barcodeDialogOpen} onClose={() => setBarcodeDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>SCAN BARCODE</DialogTitle>
        <DialogContent sx={{ py: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Select Part or Scan SAP #</InputLabel>
                <Select
                  value={barcodeInput}
                  onChange={(e) => {
                    setBarcodeInput(e.target.value);
                    const scannedPart = parts.find(p => p.sapNumber === e.target.value);
                    if (scannedPart) {
                      setCurrentCountItem({
                        sapNumber: scannedPart.sapNumber,
                        partName: scannedPart.name,
                        location: scannedPart.rackNumber ? `${scannedPart.rackNumber}-${scannedPart.rackLevel}` : 'N/A',
                        stockQty: scannedPart.currentStock || 0,
                        countQty: '',
                        id: Date.now(),
                      });
                    }
                  }}
                  label="Select Part or Scan SAP #"
                >
                  {parts.map((part) => (
                    <MenuItem key={part.sapNumber} value={part.sapNumber}>
                      {part.sapNumber} - {part.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            {currentCountItem && (
              <>
                <TextField
                  label="SAP #"
                  value={currentCountItem.sapNumber}
                  disabled
                  fullWidth
                  size="small"
                />
                <TextField
                  label="Part Name"
                  value={currentCountItem.partName}
                  disabled
                  fullWidth
                  size="small"
                />
                <TextField
                  label="Location"
                  value={currentCountItem.location}
                  disabled
                  fullWidth
                  size="small"
                />
                <TextField
                  label="Stock Qty"
                  value={currentCountItem.stockQty}
                  disabled
                  fullWidth
                  size="small"
                  type="number"
                />
                <TextField
                  label="Count Qty"
                  value={currentCountItem.countQty}
                  onChange={(e) => setCurrentCountItem({ ...currentCountItem, countQty: parseInt(e.target.value) || '' })}
                  fullWidth
                  size="small"
                  type="number"
                  required
                  autoFocus
                />
              </>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => {
            setBarcodeDialogOpen(false);
            setCurrentCountItem(null);
            setBarcodeInput('');
          }} variant="outlined">
            CANCEL
          </Button>
          {currentCountItem && (
            <Button onClick={handleSaveCount} variant="contained">
              SAVE & NEXT
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Approval Dialog */}
      <Dialog open={approvalDialogOpen} onClose={() => setApprovalDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Approve Stock Take - {months[sessionForm.month - 1]} {sessionForm.year}</DialogTitle>
        <DialogContent sx={{ py: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {varianceReport && (
              <>
                <Typography variant="body2">
                  Total Items: <strong>{countEntries.length}</strong>
                </Typography>
                <Typography variant="body2">
                  Zero Variance: <strong>{varianceReport.zeroVariance} items</strong>
                </Typography>
                <Typography variant="body2">
                  Positive Variance: <strong>{varianceReport.positiveCount} items</strong>
                </Typography>
                <Typography variant="body2">
                  Negative Variance: <strong>{varianceReport.negativeCount} items</strong>
                </Typography>
                <Typography variant="body2">
                  Net Variance: <strong>${Math.abs(varianceReport.totalVarianceValue)}</strong>
                </Typography>
              </>
            )}
            <TextField
              label="Approval Remarks (Mandatory for Stock Adjustment)"
              value={approvalComments}
              onChange={(e) => setApprovalComments(e.target.value)}
              fullWidth
              multiline
              rows={3}
              sx={{ mb: 2 }}
              required
              error={!approvalComments}
              helperText={!approvalComments ? "Remarks are required to approve" : ""}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setApprovalDialogOpen(false)} variant="outlined" color="error">
            REJECT
          </Button>
          <Button onClick={handleApproveStockTake} variant="contained">
            APPROVE
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Variance Dialog */}
      <Dialog open={viewVarianceDialogOpen} onClose={() => setViewVarianceDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Stock Take Details - {selectedSessionView && months[selectedSessionView.month - 1]} {selectedSessionView?.year}</DialogTitle>
        <DialogContent sx={{ py: 3 }}>
          <Typography variant="body2">
            Status: <strong>{selectedSessionView?.status}</strong>
          </Typography>
          <Typography variant="body2">
            Started By: <strong>{selectedSessionView?.startedBy}</strong>
          </Typography>
          <Typography variant="body2">
            Location: <strong>{selectedSessionView?.location}</strong>
          </Typography>
          <Typography variant="body2">
            Material Group: <strong>{selectedSessionView?.materialGroup}</strong>
          </Typography>
          {selectedSessionView?.approvalComments && (
            <Typography variant="body2" sx={{ mt: 2 }}>
              Comments: <strong>{selectedSessionView.approvalComments}</strong>
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setViewVarianceDialogOpen(false)} variant="contained">
            CLOSE
          </Button>
        </DialogActions>
      </Dialog>

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
