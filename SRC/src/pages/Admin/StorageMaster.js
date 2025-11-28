import React, { useEffect, useState, useMemo } from 'react';
import { db } from '../../firebase/config';
import { collection, getDocs, addDoc, deleteDoc, updateDoc, doc } from 'firebase/firestore';
import { Button, Snackbar, TextField, Table, TableHead, TableRow, TableCell, TableBody, Box, Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Tooltip, Typography, Paper, MenuItem, Alert } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';

// Main Storage Master Page
const StorageMaster = () => {
  const [storageLocations, setStorageLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // Storage Location List states
  const [searchQueryLocations, setSearchQueryLocations] = useState('');
  const [pageStartLocations, setPageStartLocations] = useState(0);
  const pageSize = 50;

  // Storage Location form states
  const [locationForm, setLocationForm] = useState({
    binId: '',
    binName: '',
    binType: '',
    capacity: '',
    description: ''
  });

  // Dialog states
  const [editLocationDialogOpen, setEditLocationDialogOpen] = useState(false);
  const [deleteLocationDialogOpen, setDeleteLocationDialogOpen] = useState(false);
  const [editLocationForm, setEditLocationForm] = useState({
    id: '',
    binId: '',
    binName: '',
    binType: '',
    capacity: '',
    description: ''
  });
  const [deleteLocationTarget, setDeleteLocationTarget] = useState(null);

  // Validation states
  const [binIdError, setBinIdError] = useState(false);
  const [binNameError, setBinNameError] = useState(false);
  const [binTypeError, setBinTypeError] = useState(false);
  const [capacityError, setCapacityError] = useState(false);
  const [editBinIdError, setEditBinIdError] = useState(false);
  const [editBinNameError, setEditBinNameError] = useState(false);
  const [editBinTypeError, setEditBinTypeError] = useState(false);
  const [editCapacityError, setEditCapacityError] = useState(false);

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
    return /^[A-Za-z0-9_-]+$/.test(value);
  };

  // Validate Bin Name (required)
  const validateBinName = (value) => {
    return value && value.trim().length > 0;
  };

  // Validate Bin Type (required)
  const validateBinType = (value) => {
    return value && value.trim().length > 0;
  };

  // Validate Capacity (positive number)
  const validateCapacity = (value) => {
    if (!value) return false;
    return !isNaN(value) && parseFloat(value) > 0;
  };

  // Handle add storage location
  const handleAddLocation = async () => {
    setBinIdError(false);
    setBinNameError(false);
    setBinTypeError(false);
    setCapacityError(false);

    if (!validateBinId(locationForm.binId)) {
      setBinIdError(true);
      setSnackbar({ open: true, message: 'Bin ID is required and must be alphanumeric', severity: 'error' });
      return;
    }

    if (!validateBinName(locationForm.binName)) {
      setBinNameError(true);
      setSnackbar({ open: true, message: 'Bin Name is required', severity: 'error' });
      return;
    }

    if (!validateBinType(locationForm.binType)) {
      setBinTypeError(true);
      setSnackbar({ open: true, message: 'Bin Type is required', severity: 'error' });
      return;
    }

    if (!validateCapacity(locationForm.capacity)) {
      setCapacityError(true);
      setSnackbar({ open: true, message: 'Capacity must be a positive number', severity: 'error' });
      return;
    }

    // Check for duplicate Bin ID or Bin Name (case-insensitive)
    const binIdExists = storageLocations.some(l => l.binId.toLowerCase() === locationForm.binId.toLowerCase());
    const binNameExists = storageLocations.some(l => l.binName.toLowerCase() === locationForm.binName.toLowerCase());

    if (binIdExists) {
      setBinIdError(true);
      setSnackbar({ open: true, message: 'Bin ID already exists', severity: 'error' });
      return;
    }

    if (binNameExists) {
      setBinNameError(true);
      setSnackbar({ open: true, message: 'Bin Name already exists', severity: 'error' });
      return;
    }

    try {
      await addDoc(collection(db, 'storageLocations'), {
        binId: locationForm.binId,
        binName: locationForm.binName,
        binType: locationForm.binType,
        capacity: parseFloat(locationForm.capacity),
        description: locationForm.description || '',
        createdAt: new Date()
      });

      // Refresh storage locations list
      const locationsSnapshot = await getDocs(collection(db, 'storageLocations'));
      const locationsData = locationsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      setStorageLocations(locationsData);

      // Clear form
      setLocationForm({ binId: '', binName: '', binType: '', capacity: '', description: '' });
      setSnackbar({ open: true, message: 'Storage Location added successfully', severity: 'success' });
    } catch (error) {
      console.error('Error adding storage location:', error);
      setSnackbar({ open: true, message: 'Error adding storage location', severity: 'error' });
    }
  };

  // Handle clear location form
  const handleClearLocationForm = () => {
    setLocationForm({ binId: '', binName: '', binType: '', capacity: '', description: '' });
    setBinIdError(false);
    setBinNameError(false);
    setBinTypeError(false);
    setCapacityError(false);
  };

  // Handle edit location
  const handleEditLocation = (location) => {
    setEditLocationForm({
      id: location.id,
      binId: location.binId,
      binName: location.binName,
      binType: location.binType,
      capacity: location.capacity || '',
      description: location.description || ''
    });
    setEditLocationDialogOpen(true);
  };

  // Handle save location changes
  const handleSaveLocationChanges = async () => {
    setEditBinIdError(false);
    setEditBinNameError(false);
    setEditBinTypeError(false);
    setEditCapacityError(false);

    if (!validateBinId(editLocationForm.binId)) {
      setEditBinIdError(true);
      setSnackbar({ open: true, message: 'Bin ID is required and must be alphanumeric', severity: 'error' });
      return;
    }

    if (!validateBinName(editLocationForm.binName)) {
      setEditBinNameError(true);
      setSnackbar({ open: true, message: 'Bin Name is required', severity: 'error' });
      return;
    }

    if (!validateBinType(editLocationForm.binType)) {
      setEditBinTypeError(true);
      setSnackbar({ open: true, message: 'Bin Type is required', severity: 'error' });
      return;
    }

    if (!validateCapacity(editLocationForm.capacity)) {
      setEditCapacityError(true);
      setSnackbar({ open: true, message: 'Capacity must be a positive number', severity: 'error' });
      return;
    }

    // Check for duplicate Bin ID or Bin Name (excluding current location)
    const binIdExists = storageLocations.some(l => 
      l.id !== editLocationForm.id && l.binId.toLowerCase() === editLocationForm.binId.toLowerCase()
    );
    const binNameExists = storageLocations.some(l => 
      l.id !== editLocationForm.id && l.binName.toLowerCase() === editLocationForm.binName.toLowerCase()
    );

    if (binIdExists) {
      setEditBinIdError(true);
      setSnackbar({ open: true, message: 'Bin ID already exists', severity: 'error' });
      return;
    }

    if (binNameExists) {
      setEditBinNameError(true);
      setSnackbar({ open: true, message: 'Bin Name already exists', severity: 'error' });
      return;
    }

    try {
      await updateDoc(doc(db, 'storageLocations', editLocationForm.id), {
        binId: editLocationForm.binId,
        binName: editLocationForm.binName,
        binType: editLocationForm.binType,
        capacity: parseFloat(editLocationForm.capacity),
        description: editLocationForm.description
      });

      // Refresh storage locations list
      const locationsSnapshot = await getDocs(collection(db, 'storageLocations'));
      const locationsData = locationsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      setStorageLocations(locationsData);

      setEditLocationDialogOpen(false);
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

  // Pagination for locations
  const locationPageEnd = Math.min(pageStartLocations + pageSize, filteredLocations.length);
  const locationsPaginated = filteredLocations.slice(pageStartLocations, locationPageEnd);

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

      <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
          STORAGE LOCATION LIST ({filteredLocations.length} ITEMS)
        </Typography>

        {/* Search Box */}
        <Box sx={{ mb: 2 }}>
          <TextField
            label="Search (Bin ID, Bin Name, Type, Description)"
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
                <TableCell sx={{ fontWeight: 'bold', width: '12%' }}>Bin ID</TableCell>
                <TableCell sx={{ fontWeight: 'bold', width: '18%' }}>Bin Name</TableCell>
                <TableCell sx={{ fontWeight: 'bold', width: '15%' }}>Bin Type</TableCell>
                <TableCell sx={{ fontWeight: 'bold', width: '12%' }}>Capacity</TableCell>
                <TableCell sx={{ fontWeight: 'bold', width: '28%' }}>Description</TableCell>
                <TableCell sx={{ fontWeight: 'bold', width: '15%' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {locationsPaginated.length > 0 ? (
                locationsPaginated.map((location) => (
                  <TableRow key={location.id} hover>
                    <TableCell>{location.binId}</TableCell>
                    <TableCell>{location.binName}</TableCell>
                    <TableCell>{location.binType}</TableCell>
                    <TableCell>{location.capacity}</TableCell>
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
            label="Bin ID"
            placeholder="Enter Bin ID"
            value={locationForm.binId}
            onChange={(e) => {
              setLocationForm({ ...locationForm, binId: e.target.value });
              setBinIdError(false);
            }}
            error={binIdError}
            helperText={binIdError ? 'Required, alphanumeric only' : ''}
            fullWidth
            required
            size="small"
          />

          <TextField
            label="Bin Name"
            placeholder="Enter Bin Name"
            value={locationForm.binName}
            onChange={(e) => {
              setLocationForm({ ...locationForm, binName: e.target.value });
              setBinNameError(false);
            }}
            error={binNameError}
            helperText={binNameError ? 'Required' : ''}
            fullWidth
            required
            size="small"
          />

          <TextField
            label="Bin Type"
            placeholder="Enter Bin Type"
            value={locationForm.binType}
            onChange={(e) => {
              setLocationForm({ ...locationForm, binType: e.target.value });
              setBinTypeError(false);
            }}
            error={binTypeError}
            helperText={binTypeError ? 'Required' : ''}
            fullWidth
            required
            size="small"
          />

          <TextField
            label="Capacity"
            placeholder="Enter Capacity"
            type="number"
            value={locationForm.capacity}
            onChange={(e) => {
              setLocationForm({ ...locationForm, capacity: e.target.value });
              setCapacityError(false);
            }}
            error={capacityError}
            helperText={capacityError ? 'Must be a positive number' : ''}
            fullWidth
            required
            size="small"
            inputProps={{ step: 'any', min: 0 }}
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
              label="Bin ID"
              value={editLocationForm.binId}
              onChange={(e) => {
                setEditLocationForm({ ...editLocationForm, binId: e.target.value });
                setEditBinIdError(false);
              }}
              error={editBinIdError}
              helperText={editBinIdError ? 'Required, alphanumeric only' : ''}
              fullWidth
              required
              size="small"
            />

            <TextField
              label="Bin Name"
              value={editLocationForm.binName}
              onChange={(e) => {
                setEditLocationForm({ ...editLocationForm, binName: e.target.value });
                setEditBinNameError(false);
              }}
              error={editBinNameError}
              helperText={editBinNameError ? 'Required' : ''}
              fullWidth
              required
              size="small"
            />

            <TextField
              label="Bin Type"
              value={editLocationForm.binType}
              onChange={(e) => {
                setEditLocationForm({ ...editLocationForm, binType: e.target.value });
                setEditBinTypeError(false);
              }}
              error={editBinTypeError}
              helperText={editBinTypeError ? 'Required' : ''}
              fullWidth
              required
              size="small"
            />

            <TextField
              label="Capacity"
              type="number"
              value={editLocationForm.capacity}
              onChange={(e) => {
                setEditLocationForm({ ...editLocationForm, capacity: e.target.value });
                setEditCapacityError(false);
              }}
              error={editCapacityError}
              helperText={editCapacityError ? 'Must be a positive number' : ''}
              fullWidth
              required
              size="small"
              inputProps={{ step: 'any', min: 0 }}
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
        <DialogTitle>Delete {deleteLocationTarget?.binName}?</DialogTitle>
        <DialogContent>
          <Box sx={{ py: 2 }}>
            <p style={{ marginTop: 0 }}>Are you sure you want to delete this storage location?</p>
            <Box sx={{ my: 2 }}>
              <p><strong>Bin ID:</strong> {deleteLocationTarget?.binId}</p>
              <p><strong>Bin Name:</strong> {deleteLocationTarget?.binName}</p>
              <p><strong>Bin Type:</strong> {deleteLocationTarget?.binType}</p>
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
