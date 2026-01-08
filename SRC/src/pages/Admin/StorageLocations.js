import React, { useEffect, useState, useMemo } from 'react';
import { db } from '../../firebase/config';
import { collection, getDocs, addDoc, deleteDoc, updateDoc, doc } from 'firebase/firestore';
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
  IconButton,
  Tooltip,
  Typography,
  MenuItem,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Snackbar,
  Chip,
  Divider,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Add as AddIcon,
  Clear as ClearIcon,
  Storage as StorageIcon,
  Refresh as RefreshIcon,
  Warning as WarningIcon,
  Inventory as InventoryIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';

// Storage Locations Management Page
const StorageLocations = () => {
  const [storageLocations, setStorageLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // Material Group dropdown options
  const materialGroupOptions = [
    'SP-BEARING',
    'SP-BELT',
    'SP-CALIBRATION',
    'SP-CAN STERILIZER',
    'SP-CASE PACKER',
    'SP-ELECTRICAL',
    'SP-FILLER',
    'SP-HOMOGENIZER',
    'SP-I-DRYER',
    'SP-LABELLER',
    'SP-M&R',
    'SP-MISCELLANEOUS',
    'SP-O&G',
    'SP-OR&OS',
    'SP-PHE',
    'SP-PUMP',
    'SP-SEAMER',
    'SP-STERILIZER',
    'SP-VALVE'
  ];

  // Storage Location List states
  const [searchQueryLocations, setSearchQueryLocations] = useState('');
  const [pageStartLocations, setPageStartLocations] = useState(0);
  const pageSize = 50;

  // Storage Location form states
  const [locationForm, setLocationForm] = useState({
    binId: '',
    materialGroup: '',
    rackNumber: '',
    rackLevel: '',
    description: ''
  });

  // State to track if "Other" is selected for Material Group
  const [locationFormShowOther, setLocationFormShowOther] = useState(false);
  const [editLocationFormShowOther, setEditLocationFormShowOther] = useState(false);

  // Dialog states
  const [editLocationDialogOpen, setEditLocationDialogOpen] = useState(false);
  const [deleteLocationDialogOpen, setDeleteLocationDialogOpen] = useState(false);
  const [editLocationForm, setEditLocationForm] = useState({
    id: '',
    binId: '',
    materialGroup: '',
    rackNumber: '',
    rackLevel: '',
    description: ''
  });
  const [deleteLocationTarget, setDeleteLocationTarget] = useState(null);

  // Validation states
  const [binIdError, setBinIdError] = useState(false);
  const [materialGroupError, setMaterialGroupError] = useState(false);
  const [rackNumberError, setRackNumberError] = useState(false);
  const [rackLevelError, setRackLevelError] = useState(false);
  const [editBinIdError, setEditBinIdError] = useState(false);
  const [editMaterialGroupError, setEditMaterialGroupError] = useState(false);
  const [editRackNumberError, setEditRackNumberError] = useState(false);
  const [editRackLevelError, setEditRackLevelError] = useState(false);

  // Fetch data from Firestore
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const locationsSnapshot = await getDocs(collection(db, 'storageLocations'));
        const locationsData = locationsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
        setStorageLocations(locationsData);
      } catch (error) {
        console.error('Error fetching data:', error);
        setSnackbar({ open: true, message: 'Error fetching storage locations', severity: 'error' });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Filtered storage locations
  const filteredLocations = useMemo(() => {
    return storageLocations.filter(l => {
      const matchesSearch =
        (l.binId && l.binId.toLowerCase().includes(searchQueryLocations.toLowerCase())) ||
        (l.materialGroup && l.materialGroup.toLowerCase().includes(searchQueryLocations.toLowerCase())) ||
        (l.rackNumber && l.rackNumber.toLowerCase().includes(searchQueryLocations.toLowerCase())) ||
        (l.rackLevel && l.rackLevel.toLowerCase().includes(searchQueryLocations.toLowerCase())) ||
        (l.description && l.description.toLowerCase().includes(searchQueryLocations.toLowerCase()));
      return matchesSearch;
    });
  }, [storageLocations, searchQueryLocations]);

  // Validate Bin ID (4 alphabets only)
  const validateBinId = (value) => {
    if (!value) return false;
    return /^[A-Za-z]{4}$/.test(value);
  };

  // Validate Rack Number (2 digits only)
  const validateRackNumber = (value) => {
    if (!value) return true;
    return /^\d{2}$/.test(value);
  };

  // Validate Rack Level (A, B, C, or D only)
  const validateRackLevel = (value) => {
    if (!value) return true;
    return /^[ABCD]$/i.test(value);
  };

  // Handle add storage location
  const handleAddLocation = async () => {
    setBinIdError(false);
    setMaterialGroupError(false);
    setRackNumberError(false);
    setRackLevelError(false);

    let hasErrors = false;

    if (!validateBinId(locationForm.binId)) {
      setBinIdError(true);
      hasErrors = true;
    }

    if (!locationForm.materialGroup || locationForm.materialGroup.trim() === '') {
      setMaterialGroupError(true);
      hasErrors = true;
    }

    if (!validateRackNumber(locationForm.rackNumber)) {
      setRackNumberError(true);
      hasErrors = true;
    }

    if (!validateRackLevel(locationForm.rackLevel)) {
      setRackLevelError(true);
      hasErrors = true;
    }

    if (hasErrors) {
      setSnackbar({ 
        open: true, 
        message: 'Please fill in all required fields with valid values', 
        severity: 'error' 
      });
      return;
    }

    // Check for duplicate Group ID (case-insensitive)
    const binIdExists = storageLocations.some(l => l.binId.toLowerCase() === locationForm.binId.toLowerCase());

    if (binIdExists) {
      setBinIdError(true);
      setSnackbar({ open: true, message: 'Group ID already exists', severity: 'error' });
      return;
    }

    try {
      await addDoc(collection(db, 'storageLocations'), {
        binId: locationForm.binId.toUpperCase(),
        materialGroup: locationForm.materialGroup,
        rackNumber: locationForm.rackNumber,
        rackLevel: locationForm.rackLevel.toUpperCase(),
        description: locationForm.description || '',
        createdAt: new Date()
      });

      // Refresh storage locations list
      const locationsSnapshot = await getDocs(collection(db, 'storageLocations'));
      const locationsData = locationsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      setStorageLocations(locationsData);

      // Clear form
      setLocationForm({ binId: '', materialGroup: '', rackNumber: '', rackLevel: '', description: '' });
      setLocationFormShowOther(false);
      setSnackbar({ open: true, message: 'Storage Location added successfully', severity: 'success' });
    } catch (error) {
      console.error('Error adding storage location:', error);
      setSnackbar({ open: true, message: 'Error adding storage location', severity: 'error' });
    }
  };

  // Handle clear location form
  const handleClearLocationForm = () => {
    setLocationForm({ binId: '', materialGroup: '', rackNumber: '', rackLevel: '', description: '' });
    setBinIdError(false);
    setMaterialGroupError(false);
    setRackNumberError(false);
    setRackLevelError(false);
    setLocationFormShowOther(false);
  };

  // Handle edit location
  const handleEditLocation = (location) => {
    const isMaterialGroupCustom = !materialGroupOptions.includes(location.materialGroup);
    setEditLocationForm({
      id: location.id,
      binId: location.binId,
      materialGroup: location.materialGroup || '',
      rackNumber: location.rackNumber || '',
      rackLevel: location.rackLevel || '',
      description: location.description || ''
    });
    setEditLocationFormShowOther(isMaterialGroupCustom);
    setEditLocationDialogOpen(true);
  };

  // Handle save location changes
  const handleSaveLocationChanges = async () => {
    setEditBinIdError(false);
    setEditMaterialGroupError(false);
    setEditRackNumberError(false);
    setEditRackLevelError(false);

    if (!validateBinId(editLocationForm.binId)) {
      setEditBinIdError(true);
      setSnackbar({ open: true, message: 'Group ID must be exactly 4 alphabets only', severity: 'error' });
      return;
    }

    if (!editLocationForm.materialGroup || !editLocationForm.materialGroup.trim()) {
      setEditMaterialGroupError(true);
      setSnackbar({ open: true, message: 'Material Group is required', severity: 'error' });
      return;
    }

    if (!validateRackNumber(editLocationForm.rackNumber)) {
      setEditRackNumberError(true);
      setSnackbar({ open: true, message: 'Rack Number must be exactly 2 digits', severity: 'error' });
      return;
    }

    if (!validateRackLevel(editLocationForm.rackLevel)) {
      setEditRackLevelError(true);
      setSnackbar({ open: true, message: 'Rack Level must be A, B, C, or D', severity: 'error' });
      return;
    }

    // Check for duplicate Group ID (excluding current location)
    const binIdExists = storageLocations.some(l => 
      l.id !== editLocationForm.id && l.binId.toLowerCase() === editLocationForm.binId.toLowerCase()
    );

    if (binIdExists) {
      setEditBinIdError(true);
      setSnackbar({ open: true, message: 'Group ID already exists', severity: 'error' });
      return;
    }

    try {
      await updateDoc(doc(db, 'storageLocations', editLocationForm.id), {
        binId: editLocationForm.binId.toUpperCase(),
        materialGroup: editLocationForm.materialGroup,
        rackNumber: editLocationForm.rackNumber,
        rackLevel: editLocationForm.rackLevel.toUpperCase(),
        description: editLocationForm.description
      });

      // Refresh storage locations list
      const locationsSnapshot = await getDocs(collection(db, 'storageLocations'));
      const locationsData = locationsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      setStorageLocations(locationsData);

      setEditLocationDialogOpen(false);
      setEditLocationFormShowOther(false);
      setSnackbar({ open: true, message: 'Storage Location updated successfully', severity: 'success' });
    } catch (error) {
      console.error('Error updating storage location:', error);
      setSnackbar({ open: true, message: 'Error updating storage location', severity: 'error' });
    }
  };

  // Handle delete location
  const handleDeleteLocation = (location) => {
    setDeleteLocationTarget(location);
    setDeleteLocationDialogOpen(true);
  };

  // Handle confirm delete location
  const handleConfirmDeleteLocation = async () => {
    try {
      await deleteDoc(doc(db, 'storageLocations', deleteLocationTarget.id));

      // Refresh storage locations list
      const locationsSnapshot = await getDocs(collection(db, 'storageLocations'));
      const locationsData = locationsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      setStorageLocations(locationsData);

      setDeleteLocationDialogOpen(false);
      setDeleteLocationTarget(null);
      setSnackbar({ open: true, message: 'Storage Location deleted successfully', severity: 'success' });
    } catch (error) {
      console.error('Error deleting storage location:', error);
      setSnackbar({ open: true, message: 'Error deleting storage location', severity: 'error' });
    }
  };

  // Handle delete location close
  const handleDeleteLocationClose = () => {
    setDeleteLocationDialogOpen(false);
    setDeleteLocationTarget(null);
  };

  // Refresh data
  const refreshData = async () => {
    setLoading(true);
    try {
      const locationsSnapshot = await getDocs(collection(db, 'storageLocations'));
      const locationsData = locationsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      setStorageLocations(locationsData);
      setSnackbar({ open: true, message: 'Data refreshed successfully', severity: 'success' });
    } catch (error) {
      setSnackbar({ open: true, message: 'Error refreshing data', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Pagination
  const locationPageEnd = Math.min(pageStartLocations + pageSize, filteredLocations.length);
  const locationsPaginated = filteredLocations.slice(pageStartLocations, locationPageEnd);

  if (loading && storageLocations.length === 0) {
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
              <StorageIcon sx={{ fontSize: 28 }} />
            </Box>
            <Box>
              <Typography variant="h4" sx={{ 
                fontWeight: 700, 
                color: '#1e293b',
                mb: 0.5
              }}>
                Storage Locations
              </Typography>
              <Typography variant="body1" sx={{ color: '#64748b' }}>
                Manage warehouse storage bins and rack locations
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
                  Total Locations
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 600, color: '#1e293b' }}>
                  {storageLocations.length}
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
                <InventoryIcon sx={{ color: '#06b6d4', fontSize: 18 }} />
                <Box>
                  <Typography variant="body2" sx={{ color: '#64748b' }}>
                    Found
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: '#1e293b' }}>
                    {filteredLocations.length}
                  </Typography>
                </Box>
              </Box>
            </Card>
          </Box>
        </Box>

        {/* Add Storage Location Form Section */}
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
            backgroundColor: '#ecf0ff',
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
                <AddIcon sx={{ fontSize: 20, color: '#06b6d4' }} />
                Add New Storage Location
              </Typography>
              <Typography variant="body2" sx={{ color: '#64748b', mt: 0.5 }}>
                Create a new storage bin or rack location
              </Typography>
            </Box>
          </Box>

          <Box sx={{ p: 3 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={2.4}>
                <TextField
                  label="Group ID"
                  placeholder="e.g., BEAR"
                  value={locationForm.binId}
                  onChange={(e) => {
                    const value = e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4);
                    setLocationForm({ ...locationForm, binId: value });
                    setBinIdError(false);
                  }}
                  error={binIdError}
                  helperText={binIdError ? 'Must be 4 letters' : `${locationForm.binId.length}/4`}
                  fullWidth
                  required
                  size="small"
                  inputProps={{ maxLength: 4, style: { textTransform: 'uppercase' } }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '10px',
                      backgroundColor: '#f8fafc',
                    }
                  }}
                />
              </Grid>

              <Grid item xs={12} sm={6} md={2.4}>
                {!locationFormShowOther ? (
                  <TextField
                    select
                    label="Material Group"
                    value={locationForm.materialGroup}
                    onChange={(e) => {
                      if (e.target.value === 'OTHER') {
                        setLocationFormShowOther(true);
                        setLocationForm({ ...locationForm, materialGroup: '' });
                      } else {
                        setLocationForm({ ...locationForm, materialGroup: e.target.value });
                      }
                      setMaterialGroupError(false);
                    }}
                    error={materialGroupError}
                    helperText={materialGroupError ? 'Required' : ''}
                    fullWidth
                    required
                    size="small"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: '10px',
                        backgroundColor: '#f8fafc',
                      }
                    }}
                  >
                    <MenuItem value="">-- Select Material Group --</MenuItem>
                    {materialGroupOptions.map((option) => (
                      <MenuItem key={option} value={option}>
                        {option}
                      </MenuItem>
                    ))}
                    <MenuItem value="OTHER">Other (Custom)</MenuItem>
                  </TextField>
                ) : (
                  <TextField
                    label="Material Group"
                    placeholder="Enter custom group"
                    value={locationForm.materialGroup}
                    onChange={(e) => {
                      setLocationForm({ ...locationForm, materialGroup: e.target.value });
                      setMaterialGroupError(false);
                    }}
                    onBlur={() => {
                      if (!locationForm.materialGroup.trim()) {
                        setLocationFormShowOther(false);
                        setLocationForm({ ...locationForm, materialGroup: '' });
                      }
                    }}
                    error={materialGroupError}
                    helperText={materialGroupError ? 'Required' : 'Clear to go back'}
                    fullWidth
                    required
                    size="small"
                    autoFocus
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: '10px',
                        backgroundColor: '#f8fafc',
                      }
                    }}
                  />
                )}
              </Grid>

              <Grid item xs={12} sm={6} md={1.8}>
                <TextField
                  label="Rack Number"
                  placeholder="e.g., 01"
                  value={locationForm.rackNumber}
                  onChange={(e) => {
                    const value = e.target.value;
                    setLocationForm({ ...locationForm, rackNumber: value });
                    setRackNumberError(false);
                  }}
                  error={rackNumberError}
                  helperText={rackNumberError ? '2 digits only' : `${locationForm.rackNumber.length}/2`}
                  fullWidth
                  required
                  size="small"
                  inputProps={{ maxLength: 2 }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '10px',
                      backgroundColor: '#f8fafc',
                    }
                  }}
                />
              </Grid>

              <Grid item xs={12} sm={6} md={1.8}>
                <TextField
                  label="Rack Level"
                  placeholder="A, B, C, D"
                  value={locationForm.rackLevel}
                  onChange={(e) => {
                    const value = e.target.value.toUpperCase();
                    setLocationForm({ ...locationForm, rackLevel: value });
                    setRackLevelError(false);
                  }}
                  error={rackLevelError}
                  helperText={rackLevelError ? 'A-D only' : ''}
                  fullWidth
                  required
                  size="small"
                  inputProps={{ maxLength: 1, style: { textTransform: 'uppercase' } }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '10px',
                      backgroundColor: '#f8fafc',
                    }
                  }}
                />
              </Grid>

              <Grid item xs={12} md={3.6}>
                <TextField
                  label="Description"
                  placeholder="Optional notes"
                  value={locationForm.description}
                  onChange={(e) => setLocationForm({ ...locationForm, description: e.target.value })}
                  fullWidth
                  size="small"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '10px',
                      backgroundColor: '#f8fafc',
                    }
                  }}
                />
              </Grid>

              <Grid item xs={12} sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                <Button
                  variant="outlined"
                  startIcon={<ClearIcon />}
                  onClick={handleClearLocationForm}
                  sx={{
                    borderRadius: '10px',
                    borderColor: '#e2e8f0',
                    color: '#64748b',
                    textTransform: 'none',
                    '&:hover': {
                      borderColor: '#64748b'
                    }
                  }}
                >
                  Clear
                </Button>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={handleAddLocation}
                  sx={{
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
                    textTransform: 'none',
                    fontWeight: 600
                  }}
                >
                  Add Location
                </Button>
              </Grid>
            </Grid>
          </Box>
        </Paper>

        {/* Storage Locations List Section */}
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
            backgroundColor: '#ecf0ff',
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
                <StorageIcon sx={{ fontSize: 20, color: '#06b6d4' }} />
                Storage Locations List
              </Typography>
              <Typography variant="body2" sx={{ color: '#64748b', mt: 0.5 }}>
                {filteredLocations.length} locations found
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
                    backgroundColor: '#ecf0ff'
                  }
                }}
              >
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Box>

          {/* Search Box */}
          <Box sx={{ p: 3, borderBottom: '1px solid #e2e8f0', backgroundColor: 'white' }}>
            <TextField
              label="Search locations"
              placeholder="Search by Group ID, Material Group, Rack Number, or Description"
              value={searchQueryLocations}
              onChange={(e) => {
                setSearchQueryLocations(e.target.value);
                setPageStartLocations(0);
              }}
              fullWidth
              size="small"
              InputProps={{
                startAdornment: (
                  <SearchIcon sx={{ mr: 1, color: '#94a3b8' }} />
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '10px',
                  backgroundColor: '#f8fafc',
                }
              }}
            />
          </Box>

          {/* Locations Table */}
          {filteredLocations.length === 0 ? (
            <Box sx={{ 
              p: 6, 
              textAlign: 'center',
              color: '#94a3b8'
            }}>
              <StorageIcon sx={{ fontSize: 64, mb: 2, opacity: 0.5 }} />
              <Typography variant="h6" sx={{ mb: 1 }}>
                No storage locations found
              </Typography>
              <Typography variant="body2">
                {storageLocations.length === 0 ? 
                  "No locations yet. Create your first location above." :
                  "No locations match your search criteria."}
              </Typography>
            </Box>
          ) : (
            <>
              <Box sx={{ overflowX: 'auto' }}>
                <Table sx={{ minWidth: 1000 }}>
                  <TableHead sx={{ backgroundColor: '#f8fafc' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600, color: '#475569' }}>Group ID</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: '#475569' }}>Material Group</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: '#475569' }}>Rack Number</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: '#475569' }}>Rack Level</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: '#475569' }}>Description</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: '#475569' }} align="center">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {locationsPaginated.map((location) => (
                      <TableRow key={location.id} hover sx={{ 
                        '&:hover': {
                          backgroundColor: '#f8fafc'
                        }
                      }}>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: '#1e293b' }}>
                            {location.binId}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={location.materialGroup}
                            sx={{
                              backgroundColor: '#ecf0ff',
                              color: '#0891b2',
                              fontWeight: 600
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: '#1e293b' }}>
                            {location.rackNumber}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={location.rackLevel}
                            sx={{
                              backgroundColor: '#cffafe',
                              color: '#0c4a6e'
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ color: '#64748b' }}>
                            {location.description || '—'}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Tooltip title="Edit Location">
                            <IconButton
                              size="small"
                              onClick={() => handleEditLocation(location)}
                              sx={{ 
                                color: '#06b6d4',
                                '&:hover': { backgroundColor: '#ecf0ff' }
                              }}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete Location">
                            <IconButton
                              size="small"
                              onClick={() => handleDeleteLocation(location)}
                              sx={{ 
                                color: '#ef4444',
                                '&:hover': { backgroundColor: '#fee2e2' }
                              }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>

              {/* Pagination */}
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                p: 2,
                borderTop: '1px solid #e2e8f0'
              }}>
                <Box>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => setPageStartLocations(Math.max(0, pageStartLocations - pageSize))}
                    disabled={pageStartLocations === 0}
                    sx={{ mr: 1, borderRadius: '8px' }}
                  >
                    ← Previous
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => setPageStartLocations(pageStartLocations + pageSize)}
                    disabled={locationPageEnd >= filteredLocations.length}
                    sx={{ borderRadius: '8px' }}
                  >
                    Next →
                  </Button>
                </Box>
                <Typography variant="body2" sx={{ color: '#64748b' }}>
                  Showing {filteredLocations.length > 0 ? pageStartLocations + 1 : 0}–{locationPageEnd} of {filteredLocations.length}
                </Typography>
              </Box>
            </>
          )}
        </Paper>
      </Box>

      {/* Edit Storage Location Dialog */}
      <Dialog open={editLocationDialogOpen} onClose={() => setEditLocationDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 600, backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
          Edit Storage Location Details
        </DialogTitle>
        <DialogContent sx={{ py: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Group ID"
              value={editLocationForm.binId}
              onChange={(e) => {
                const value = e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4);
                setEditLocationForm({ ...editLocationForm, binId: value });
                setEditBinIdError(false);
              }}
              error={editBinIdError}
              helperText={editBinIdError ? 'Must be 4 letters' : `${editLocationForm.binId.length}/4`}
              fullWidth
              size="small"
              inputProps={{ maxLength: 4, style: { textTransform: 'uppercase' } }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '10px',
                  backgroundColor: '#f8fafc',
                }
              }}
            />

            {!editLocationFormShowOther ? (
              <TextField
                select
                label="Material Group"
                value={editLocationForm.materialGroup}
                onChange={(e) => {
                  if (e.target.value === 'OTHER') {
                    setEditLocationFormShowOther(true);
                    setEditLocationForm({ ...editLocationForm, materialGroup: '' });
                  } else {
                    setEditLocationForm({ ...editLocationForm, materialGroup: e.target.value });
                  }
                  setEditMaterialGroupError(false);
                }}
                error={editMaterialGroupError}
                helperText={editMaterialGroupError ? 'Required' : ''}
                fullWidth
                size="small"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '10px',
                    backgroundColor: '#f8fafc',
                  }
                }}
              >
                <MenuItem value="">-- Select Material Group --</MenuItem>
                {materialGroupOptions.map((option) => (
                  <MenuItem key={option} value={option}>
                    {option}
                  </MenuItem>
                ))}
                <MenuItem value="OTHER">Other (Please specify)</MenuItem>
              </TextField>
            ) : (
              <TextField
                label="Material Group"
                placeholder="Enter custom group name"
                value={editLocationForm.materialGroup}
                onChange={(e) => {
                  setEditLocationForm({ ...editLocationForm, materialGroup: e.target.value });
                  setEditMaterialGroupError(false);
                }}
                onBlur={() => {
                  if (!editLocationForm.materialGroup.trim()) {
                    setEditLocationFormShowOther(false);
                    setEditLocationForm({ ...editLocationForm, materialGroup: '' });
                  }
                }}
                error={editMaterialGroupError}
                helperText={editMaterialGroupError ? 'Required' : 'Clear to go back'}
                fullWidth
                size="small"
                autoFocus
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '10px',
                    backgroundColor: '#f8fafc',
                  }
                }}
              />
            )}

            <TextField
              label="Rack Number"
              value={editLocationForm.rackNumber}
              onChange={(e) => {
                setEditLocationForm({ ...editLocationForm, rackNumber: e.target.value });
                setEditRackNumberError(false);
              }}
              error={editRackNumberError}
              helperText={editRackNumberError ? '2 digits only' : ''}
              fullWidth
              size="small"
              inputProps={{ maxLength: 2 }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '10px',
                  backgroundColor: '#f8fafc',
                }
              }}
            />

            <TextField
              label="Rack Level"
              value={editLocationForm.rackLevel}
              onChange={(e) => {
                const value = e.target.value.toUpperCase();
                setEditLocationForm({ ...editLocationForm, rackLevel: value });
                setEditRackLevelError(false);
              }}
              error={editRackLevelError}
              helperText={editRackLevelError ? 'A, B, C, or D only' : ''}
              fullWidth
              size="small"
              inputProps={{ maxLength: 1, style: { textTransform: 'uppercase' } }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '10px',
                  backgroundColor: '#f8fafc',
                }
              }}
            />

            <TextField
              label="Description"
              value={editLocationForm.description}
              onChange={(e) => setEditLocationForm({ ...editLocationForm, description: e.target.value })}
              fullWidth
              multiline
              rows={3}
              size="small"
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '10px',
                  backgroundColor: '#f8fafc',
                }
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: '1px solid #e2e8f0' }}>
          <Button onClick={() => setEditLocationDialogOpen(false)} variant="outlined" sx={{ borderRadius: '8px' }}>
            Cancel
          </Button>
          <Button 
            onClick={handleSaveLocationChanges} 
            variant="contained"
            sx={{ 
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)'
            }}
          >
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Location Dialog */}
      <Dialog open={deleteLocationDialogOpen} onClose={handleDeleteLocationClose} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 600, backgroundColor: '#fee2e2', borderBottom: '1px solid #fecaca' }}>
          Delete {deleteLocationTarget?.binId}?
        </DialogTitle>
        <DialogContent sx={{ py: 3 }}>
          <Box sx={{ py: 2 }}>
            <Typography variant="body2" sx={{ mb: 2, color: '#64748b' }}>
              Are you sure you want to delete this storage location?
            </Typography>
            <Box sx={{ my: 2, p: 2, backgroundColor: '#fef2f2', borderRadius: '10px', borderLeft: '4px solid #ef4444' }}>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>Group ID:</strong> {deleteLocationTarget?.binId}
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>Material Group:</strong> {deleteLocationTarget?.materialGroup}
              </Typography>
              <Typography variant="body2">
                <strong>Rack:</strong> {deleteLocationTarget?.rackNumber}-{deleteLocationTarget?.rackLevel}
              </Typography>
            </Box>
            <Alert severity="warning" sx={{ mt: 2, borderRadius: '10px' }}>
              This action cannot be undone.
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: '1px solid #e2e8f0' }}>
          <Button onClick={handleDeleteLocationClose} variant="outlined" sx={{ borderRadius: '8px' }}>
            Cancel
          </Button>
          <Button 
            onClick={handleConfirmDeleteLocation} 
            variant="contained" 
            color="error"
            sx={{ borderRadius: '8px' }}
          >
            Confirm Delete
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

export default StorageLocations;
