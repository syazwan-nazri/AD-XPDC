import React, { useEffect, useState, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { db } from '../../firebase/config';
import { collection, getDocs, addDoc, deleteDoc, updateDoc, doc } from 'firebase/firestore';
import { Button, Snackbar, TextField, Table, TableHead, TableRow, TableCell, TableBody, Box, Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Tooltip, Typography, Paper, MenuItem, Alert } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';

// Main Storage Master Page
const StorageMaster = () => {
  const parts = useSelector(state => state.parts.parts || []);
  const [storageLocations, setStorageLocations] = useState([]);
  const [materialGroups, setMaterialGroups] = useState([]);
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
  const [editPartDialogOpen, setEditPartDialogOpen] = useState(false);
  const [deletePartDialogOpen, setDeletePartDialogOpen] = useState(false);
  const [editLocationForm, setEditLocationForm] = useState({
    id: '',
    binId: '',
    materialGroup: '',
    rackNumber: '',
    rackLevel: '',
    description: ''
  });
  const [editPartForm, setEditPartForm] = useState({
    id: '',
    sapNumber: '',
    internalRef: '',
    name: '',
    category: '',
    rackNumber: '',
    rackLevel: '',
    materialGroupId: '',
    currentStock: ''
  });
  const [deleteLocationTarget, setDeleteLocationTarget] = useState(null);
  const [deletePartTarget, setDeletePartTarget] = useState(null);

  // Validation states
  const [binIdError, setBinIdError] = useState(false);
  const [materialGroupError, setMaterialGroupError] = useState(false);
  const [rackNumberError, setRackNumberError] = useState(false);
  const [rackLevelError, setRackLevelError] = useState(false);
  const [editBinIdError, setEditBinIdError] = useState(false);
  const [editMaterialGroupError, setEditMaterialGroupError] = useState(false);
  const [editRackNumberError, setEditRackNumberError] = useState(false);
  const [editRackLevelError, setEditRackLevelError] = useState(false);
  const [editPartRackNumberError, setEditPartRackNumberError] = useState(false);
  const [editPartRackLevelError, setEditPartRackLevelError] = useState(false);

  // Pagination states for parts list
  const [pageStartWith, setPageStartWith] = useState(0);

  // Fetch data from Firestore
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const locationsSnapshot = await getDocs(collection(db, 'storageLocations'));
        const locationsData = locationsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
        setStorageLocations(locationsData);

        const groupsSnapshot = await getDocs(collection(db, 'materialGroups'));
        const groupsData = groupsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
        setMaterialGroups(groupsData);
      } catch (error) {
        console.error('Error fetching data:', error);
        setSnackbar({ open: true, message: 'Error fetching data', severity: 'error' });
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
        (l.binName && l.binName.toLowerCase().includes(searchQueryLocations.toLowerCase())) ||
        (l.binId && l.binId.toLowerCase().includes(searchQueryLocations.toLowerCase())) ||
        (l.binType && l.binType.toLowerCase().includes(searchQueryLocations.toLowerCase())) ||
        (l.description && l.description.toLowerCase().includes(searchQueryLocations.toLowerCase()));
      return matchesSearch;
    });
  }, [storageLocations, searchQueryLocations]);

  // Validate Bin ID (alphanumeric, required)
  const validateBinId = (value) => {
    if (!value) return false;
    // Exactly 4 alphabets only (no numbers, no special characters)
    return /^[A-Za-z]{4}$/.test(value);
  };

  // Validate Rack Number (2 digits only)
  const validateRackNumber = (value) => {
    if (!value) return true; // Allow empty
    const regex = /^\d{2}$/;
    return regex.test(value);
  };

  // Validate Rack Level (A, B, C, or D only)
  const validateRackLevel = (value) => {
    if (!value) return true; // Allow empty
    const regex = /^[ABCD]$/i;
    return regex.test(value);
  };

  // Handle add storage location
  const handleAddLocation = async () => {
    setBinIdError(false);
    setMaterialGroupError(false);
    setRackNumberError(false);
    setRackLevelError(false);

    let hasErrors = false;
    const errors = [];

    // Validate Group ID
    if (!validateBinId(locationForm.binId)) {
      setBinIdError(true);
      hasErrors = true;
      errors.push('Group ID');
    }

    // Validate Material Group
    if (!locationForm.materialGroup || locationForm.materialGroup.trim() === '') {
      setMaterialGroupError(true);
      hasErrors = true;
      errors.push('Material Group');
    }

    // Validate Rack Number
    if (!validateRackNumber(locationForm.rackNumber)) {
      setRackNumberError(true);
      hasErrors = true;
      errors.push('Rack Number');
    }

    // Validate Rack Level
    if (!validateRackLevel(locationForm.rackLevel)) {
      setRackLevelError(true);
      hasErrors = true;
      errors.push('Rack Level');
    }

    // If there are errors, show them
    if (hasErrors) {
      setSnackbar({ 
        open: true, 
        message: `${errors.join(', ')} ${errors.length === 1 ? 'is' : 'are'} required`, 
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
        binId: locationForm.binId,
        materialGroup: locationForm.materialGroup,
        rackNumber: locationForm.rackNumber,
        rackLevel: locationForm.rackLevel,
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
        binId: editLocationForm.binId,
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

  // Handle edit part
  const handleEditPart = (part) => {
    setEditPartForm({
      id: part.id,
      sapNumber: part.sapNumber || '',
      internalRef: part.internalRef || '',
      name: part.name || '',
      category: part.category || '',
      rackNumber: part.rackNumber || '',
      rackLevel: part.rackLevel || '',
      materialGroupId: part.materialGroupId || '',
      currentStock: part.currentStock || ''
    });
    setEditPartRackNumberError(false);
    setEditPartRackLevelError(false);
    setEditPartDialogOpen(true);
  };

  // Handle save part changes (only Rack Number and Rack Level)
  const handleSavePartChanges = async () => {
    setEditPartRackNumberError(false);
    setEditPartRackLevelError(false);

    let hasErrors = false;

    // Validate Rack Number
    if (!validateRackNumber(editPartForm.rackNumber)) {
      setEditPartRackNumberError(true);
      hasErrors = true;
    }

    // Validate Rack Level
    if (!validateRackLevel(editPartForm.rackLevel)) {
      setEditPartRackLevelError(true);
      hasErrors = true;
    }

    if (hasErrors) {
      setSnackbar({ open: true, message: 'Please fix the errors', severity: 'error' });
      return;
    }

    try {
      const { db: firebaseDb } = await import('../../firebase/config');
      await updateDoc(doc(firebaseDb, 'parts', editPartForm.id), {
        rackNumber: editPartForm.rackNumber,
        rackLevel: editPartForm.rackLevel
      });

      setEditPartDialogOpen(false);
      setSnackbar({ open: true, message: 'Part updated successfully', severity: 'success' });
      
      // Refresh parts data (parts are from Redux, so they will update automatically)
    } catch (error) {
      console.error('Error updating part:', error);
      setSnackbar({ open: true, message: 'Error updating part', severity: 'error' });
    }
  };

  // Handle delete part
  const handleDeletePart = (part) => {
    setDeletePartTarget(part);
    setDeletePartDialogOpen(true);
  };

  // Handle confirm delete part
  const handleConfirmDeletePart = async () => {
    try {
      const { db: firebaseDb } = await import('../../firebase/config');
      await deleteDoc(doc(firebaseDb, 'parts', deletePartTarget.id));

      setDeletePartDialogOpen(false);
      setDeletePartTarget(null);
      setSnackbar({ open: true, message: 'Part deleted successfully', severity: 'success' });
    } catch (error) {
      console.error('Error deleting part:', error);
      setSnackbar({ open: true, message: 'Error deleting part', severity: 'error' });
    }
  };

  // Handle delete part close
  const handleDeletePartClose = () => {
    setDeletePartDialogOpen(false);
    setDeletePartTarget(null);
  };

  // Pagination for locations
  const locationPageEnd = Math.min(pageStartLocations + pageSize, filteredLocations.length);
  const locationsPaginated = filteredLocations.slice(pageStartLocations, locationPageEnd);

  // Sort parts: low stock items at top, then by SAP# sequence
  const sortedParts = useMemo(() => {
    const sorted = [...parts].sort((a, b) => {
      // Parse SAP# for numeric comparison (extract numeric part)
      const sapA = parseInt(a.sapNumber || '0') || 0;
      const sapB = parseInt(b.sapNumber || '0') || 0;
      
      // Determine if each is low stock (currentStock < safetyLevel)
      const aIsLowStock = (a.currentStock || 0) < (a.safetyLevel || 0);
      const bIsLowStock = (b.currentStock || 0) < (b.safetyLevel || 0);
      
      // Low stock items come first
      if (aIsLowStock && !bIsLowStock) return -1;
      if (!aIsLowStock && bIsLowStock) return 1;
      
      // If both are low stock or both are not, sort by SAP# (descending - higher numbers at top)
      return sapB - sapA;
    });
    return sorted;
  }, [parts]);

  // Pagination for parts - show all parts
  const pageEndWith = Math.min(pageStartWith + pageSize, sortedParts.length);
  const partsPaginatedWith = sortedParts.slice(pageStartWith, pageEndWith);

  if (loading) {
    return <Box sx={{ p: 3 }}><Typography>Loading...</Typography></Box>;
  }

  return (
    <Box sx={{ m: 0, p: 0 }}>
      <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <h2 style={{ margin: 0 }}>STORAGE MASTER - ENGINEERING STORE SPARE PART</h2>
        </Box>
      </Paper>

      {/* Part List */}
      <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
          STORAGE PART LIST ({sortedParts.length} ITEMS)
        </Typography>
        <Box sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold', width: '10%' }}>SAP#</TableCell>
                <TableCell sx={{ fontWeight: 'bold', width: '10%' }}>Internal Ref No</TableCell>
                <TableCell sx={{ fontWeight: 'bold', width: '18%' }}>Part Name</TableCell>
                <TableCell sx={{ fontWeight: 'bold', width: '12%' }}>Category</TableCell>
                <TableCell sx={{ fontWeight: 'bold', width: '10%' }}>Rack Number</TableCell>
                <TableCell sx={{ fontWeight: 'bold', width: '8%' }}>Rack Level</TableCell>
                <TableCell sx={{ fontWeight: 'bold', width: '10%' }}>Material Group</TableCell>
                <TableCell sx={{ fontWeight: 'bold', width: '12%' }}>Current Stock</TableCell>
                <TableCell sx={{ fontWeight: 'bold', width: '12%' }}>Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {partsPaginatedWith.length > 0 ? (
                partsPaginatedWith.map((part) => {
                  const location = storageLocations.find(l => l.id === part.storageLocationId);
                  return (
                    <TableRow key={part.id} hover>
                      <TableCell>{part.sapNumber}</TableCell>
                      <TableCell>{part.internalRef}</TableCell>
                      <TableCell>{part.name}</TableCell>
                      <TableCell>{part.category}</TableCell>
                      <TableCell>{part.rackNumber || '-'}</TableCell>
                      <TableCell>{part.rackLevel || '-'}</TableCell>
                      <TableCell>
                        {materialGroups.find(g => g.id === part.materialGroupId)?.materialGroup || '-'}
                      </TableCell>
                      <TableCell>{part.currentStock}</TableCell>
                      <TableCell>
                        <Tooltip title="Edit">
                          <IconButton
                            size="small"
                            onClick={() => handleEditPart(part)}
                            sx={{ mr: 1 }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDeletePart(part)}
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
                  <TableCell colSpan={9} align="center" sx={{ py: 3, color: '#999' }}>
                    No parts found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Box>
        {/* Pagination for Parts */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
          <Box>
            <Button
              variant="outlined"
              size="small"
              disabled={pageStartWith === 0}
              onClick={() => setPageStartWith(Math.max(0, pageStartWith - pageSize))}
            >
              Previous
            </Button>
            <Button
              variant="outlined"
              size="small"
              disabled={pageEndWith >= sortedParts.length}
              onClick={() => setPageStartWith(pageStartWith + pageSize)}
              sx={{ ml: 1 }}
            >
              Next
            </Button>
          </Box>
          <Typography variant="body2" sx={{ color: '#666' }}>
            Showing {sortedParts.length > 0 ? pageStartWith + 1 : 0}-{pageEndWith} of {sortedParts.length} items
          </Typography>
        </Box>
      </Paper>

      <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
          STORAGE LOCATION LIST ({filteredLocations.length} ITEMS)
        </Typography>

        {/* Search Box */}
        <Box sx={{ mb: 2 }}>
          <TextField
            label="Search (Group ID, Material Group, Rack Number, Rack Level, Description)"
            placeholder="Search..."
            value={searchQueryLocations}
            onChange={(e) => {
              setSearchQueryLocations(e.target.value);
              setPageStartLocations(0);
            }}
            size="small"
            fullWidth
            InputProps={{
              startAdornment: <SearchIcon sx={{ mr: 1 }} />,
            }}
          />
        </Box>

        {/* Locations Table */}
        <Box sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold', width: '12%' }}>Group ID</TableCell>
                <TableCell sx={{ fontWeight: 'bold', width: '15%' }}>Material Group</TableCell>
                <TableCell sx={{ fontWeight: 'bold', width: '12%' }}>Rack Number</TableCell>
                <TableCell sx={{ fontWeight: 'bold', width: '12%' }}>Rack Level</TableCell>
                <TableCell sx={{ fontWeight: 'bold', width: '34%' }}>Description</TableCell>
                <TableCell sx={{ fontWeight: 'bold', width: '15%' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {locationsPaginated.length > 0 ? (
                locationsPaginated.map((location) => (
                  <TableRow key={location.id} hover>
                    <TableCell>{location.binId}</TableCell>
                    <TableCell>{location.materialGroup}</TableCell>
                    <TableCell>{location.rackNumber}</TableCell>
                    <TableCell>{location.rackLevel}</TableCell>
                    <TableCell>{location.description}</TableCell>
                    <TableCell>
                      <Tooltip title="Edit">
                        <IconButton
                          size="small"
                          onClick={() => handleEditLocation(location)}
                          sx={{ mr: 1 }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDeleteLocation(location)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 3, color: '#999' }}>
                    No storage locations found
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
              onClick={() => setPageStartLocations(Math.max(0, pageStartLocations - pageSize))}
              disabled={pageStartLocations === 0}
              sx={{ mr: 1 }}
            >
              &lt;&lt; Previous
            </Button>
            <Button
              variant="outlined"
              size="small"
              onClick={() => setPageStartLocations(pageStartLocations + pageSize)}
              disabled={locationPageEnd >= filteredLocations.length}
            >
              Next &gt;&gt;
            </Button>
          </Box>
          <Typography variant="body2" sx={{ color: '#666' }}>
            Showing {filteredLocations.length > 0 ? pageStartLocations + 1 : 0}-{locationPageEnd} of {filteredLocations.length} items
          </Typography>
        </Box>
      </Paper>

      <Paper elevation={1} sx={{ p: 2 }}>
        <h3 style={{ marginTop: 0 }}>NEW STORAGE LOCATION ENTRY</h3>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label="Group ID"
            placeholder="Enter Group ID"
            value={locationForm.binId}
            onChange={(e) => {
              setLocationForm({ ...locationForm, binId: e.target.value });
              setBinIdError(false);
            }}
            error={binIdError}
            helperText={binIdError ? 'Must be exactly 4 alphabets only' : ''}
            fullWidth
            required
            size="small"
          />

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
              placeholder="Enter custom material group name"
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
              helperText={materialGroupError ? 'Required or click back to select from list' : 'Type custom value or clear to go back'}
              fullWidth
              required
              size="small"
              autoFocus
            />
          )}

          <TextField
            label="Rack Number"
            placeholder="Enter Rack Number"
            value={locationForm.rackNumber}
            onChange={(e) => {
              const value = e.target.value;
              setLocationForm({ ...locationForm, rackNumber: value });
              setRackNumberError(false);
            }}
            error={rackNumberError}
            helperText={rackNumberError ? 'Must be exactly 2 digits (e.g., 00, 01, 10)' : ''}
            fullWidth
            required
            size="small"
          />

          <TextField
            label="Rack Level"
            placeholder="Enter Rack Level"
            value={locationForm.rackLevel}
            onChange={(e) => {
              const value = e.target.value.toUpperCase();
              setLocationForm({ ...locationForm, rackLevel: value });
              setRackLevelError(false);
            }}
            error={rackLevelError}
            helperText={rackLevelError ? 'Must be A, B, C, or D' : ''}
            inputProps={{ maxLength: 1, style: { textTransform: 'uppercase' } }}
            fullWidth
            required
            size="small"
          />

          <TextField
            label="Description"
            placeholder="Enter Description"
            value={locationForm.description}
            onChange={(e) => setLocationForm({ ...locationForm, description: e.target.value })}
            fullWidth
            multiline
            rows={3}
            size="small"
          />

          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', mt: 2 }}>
            <Button
              variant="outlined"
              onClick={handleClearLocationForm}
            >
              CLEAR
            </Button>
            <Button
              variant="contained"
              onClick={handleAddLocation}
            >
              ADD LOCATION
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* Edit Storage Location Dialog */}
      <Dialog open={editLocationDialogOpen} onClose={() => setEditLocationDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Storage Location Details</DialogTitle>
        <DialogContent sx={{ py: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Group ID"
              value={editLocationForm.binId}
              onChange={(e) => {
                setEditLocationForm({ ...editLocationForm, binId: e.target.value });
                setEditBinIdError(false);
              }}
              error={editBinIdError}
              helperText={editBinIdError ? 'Must be exactly 4 alphabets only' : ''}
              fullWidth
              required
              size="small"
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
                required
                size="small"
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
                placeholder="Enter custom material group name"
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
                helperText={editMaterialGroupError ? 'Required or click back to select from list' : 'Type custom value or clear to go back'}
                fullWidth
                required
                size="small"
                autoFocus
              />
            )}

            <TextField
              label="Rack Number"
              value={editLocationForm.rackNumber}
              onChange={(e) => {
                const value = e.target.value;
                setEditLocationForm({ ...editLocationForm, rackNumber: value });
                setEditRackNumberError(false);
              }}
              error={editRackNumberError}
              helperText={editRackNumberError ? 'Must be exactly 2 digits (e.g., 00, 01, 10)' : ''}
              fullWidth
              required
              size="small"
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
              helperText={editRackLevelError ? 'Must be A, B, C, or D' : ''}
              inputProps={{ maxLength: 1, style: { textTransform: 'uppercase' } }}
              fullWidth
              required
              size="small"
            />

            <TextField
              label="Description"
              value={editLocationForm.description}
              onChange={(e) => setEditLocationForm({ ...editLocationForm, description: e.target.value })}
              fullWidth
              multiline
              rows={3}
              size="small"
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setEditLocationDialogOpen(false)} variant="outlined">
            CANCEL
          </Button>
          <Button onClick={handleSaveLocationChanges} variant="contained">
            SAVE CHANGES
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Storage Location Confirmation Dialog */}
      <Dialog open={deleteLocationDialogOpen} onClose={handleDeleteLocationClose} maxWidth="xs" fullWidth>
        <DialogTitle>Delete {deleteLocationTarget?.binId}?</DialogTitle>
        <DialogContent>
          <Box sx={{ py: 2 }}>
            <p style={{ marginTop: 0 }}>Are you sure you want to delete this storage location?</p>
            <Box sx={{ my: 2 }}>
              <p><strong>Group ID:</strong> {deleteLocationTarget?.binId}</p>
              <p><strong>Material Group:</strong> {deleteLocationTarget?.materialGroup}</p>
              <p><strong>Rack Number:</strong> {deleteLocationTarget?.rackNumber}</p>
              <p><strong>Rack Level:</strong> {deleteLocationTarget?.rackLevel}</p>
            </Box>
            <Alert severity="warning" sx={{ mt: 2 }}>
              This action cannot be undone.
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleDeleteLocationClose} variant="outlined">
            CANCEL
          </Button>
          <Button onClick={handleConfirmDeleteLocation} variant="contained" color="error">
            CONFIRM DELETE
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Part Dialog */}
      <Dialog open={editPartDialogOpen} onClose={() => setEditPartDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Part Details</DialogTitle>
        <DialogContent sx={{ py: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="SAP#"
              value={editPartForm.sapNumber}
              fullWidth
              disabled
              size="small"
            />

            <TextField
              label="Internal Ref No"
              value={editPartForm.internalRef}
              fullWidth
              disabled
              size="small"
            />

            <TextField
              label="Part Name"
              value={editPartForm.name}
              fullWidth
              disabled
              size="small"
            />

            <TextField
              label="Category"
              value={editPartForm.category}
              fullWidth
              disabled
              size="small"
            />

            <TextField
              label="Material Group"
              value={materialGroups.find(g => g.id === editPartForm.materialGroupId)?.materialGroup || '-'}
              fullWidth
              disabled
              size="small"
            />

            <TextField
              label="Current Stock"
              value={editPartForm.currentStock}
              fullWidth
              disabled
              size="small"
            />

            <TextField
              label="Rack Number"
              placeholder="Enter Rack Number (2 digits)"
              value={editPartForm.rackNumber}
              onChange={(e) => {
                setEditPartForm({ ...editPartForm, rackNumber: e.target.value });
                setEditPartRackNumberError(false);
              }}
              error={editPartRackNumberError}
              helperText={editPartRackNumberError ? 'Must be exactly 2 digits only' : ''}
              fullWidth
              size="small"
              inputProps={{ maxLength: 2 }}
            />

            <TextField
              label="Rack Level"
              placeholder="Enter Rack Level (A, B, C, or D)"
              value={editPartForm.rackLevel}
              onChange={(e) => {
                setEditPartForm({ ...editPartForm, rackLevel: e.target.value.toUpperCase() });
                setEditPartRackLevelError(false);
              }}
              error={editPartRackLevelError}
              helperText={editPartRackLevelError ? 'Must be A, B, C, or D only' : ''}
              fullWidth
              size="small"
              inputProps={{ maxLength: 1 }}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setEditPartDialogOpen(false)} variant="outlined">
            CANCEL
          </Button>
          <Button onClick={handleSavePartChanges} variant="contained">
            SAVE CHANGES
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Part Confirmation Dialog */}
      <Dialog open={deletePartDialogOpen} onClose={handleDeletePartClose} maxWidth="xs" fullWidth>
        <DialogTitle>Delete {deletePartTarget?.name}?</DialogTitle>
        <DialogContent>
          <Box sx={{ py: 2 }}>
            <p style={{ marginTop: 0 }}>Are you sure you want to delete this part?</p>
            <Box sx={{ my: 2 }}>
              <p><strong>SAP#:</strong> {deletePartTarget?.sapNumber}</p>
              <p><strong>Internal Ref No:</strong> {deletePartTarget?.internalRef}</p>
              <p><strong>Part Name:</strong> {deletePartTarget?.name}</p>
            </Box>
            <Alert severity="warning" sx={{ mt: 2 }}>
              This action cannot be undone.
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleDeletePartClose} variant="outlined">
            CANCEL
          </Button>
          <Button onClick={handleConfirmDeletePart} variant="contained" color="error">
            CONFIRM DELETE
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

export default StorageMaster;
