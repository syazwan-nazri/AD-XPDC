import React, { useEffect, useMemo, useState } from 'react';
import { db } from '../../firebase/config';
import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  updateDoc,
  doc,
  query,
  where,
} from 'firebase/firestore';

import {
  Button,
  Snackbar,
  TextField,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Paper,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Alert,
  Typography,
  Chip,
} from '@mui/material';

import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

const normalize = (v) => (v || '').trim().toLowerCase();

const statusChipVariant = (status) => {
  const s = (status || '').toLowerCase();
  if (s === 'active') return { label: 'Active', color: 'success' };
  if (s === 'inactive') return { label: 'Inactive', color: 'error' };
  if (s === 'maintenance') return { label: 'Maintenance', color: 'warning' };
  return { label: status || 'Unknown', color: 'default' };
};

const MachineMaster = () => {
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success',
  });

  // NEW: Search + Status filter
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const [form, setForm] = useState({
    name: '',
    model: '',
    serialNumber: '',
    location: '',
    status: 'Active',
  });

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    model: '',
    serialNumber: '',
    location: '',
    status: 'Active',
  });
  const [editingId, setEditingId] = useState(null);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const fetchMachines = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'machines'));
      const data = querySnapshot.docs.map((d) => ({ ...d.data(), id: d.id }));
      setMachines(data);
    } catch (error) {
      setSnackbar({ open: true, message: 'Fetch error', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMachines();
  }, []);

  const filteredMachines = useMemo(() => {
    const q = normalize(search);

    return machines.filter((m) => {
      const matchesSearch = !q
        ? true
        : [
            m.name,
            m.model,
            m.serialNumber,
            m.location,
            m.status,
          ]
            .map((x) => (x || '').toString().toLowerCase())
            .join(' | ')
            .includes(q);

      const matchesStatus =
        statusFilter === 'All'
          ? true
          : normalize(m.status) === normalize(statusFilter);

      return matchesSearch && matchesStatus;
    });
  }, [machines, search, statusFilter]);

  const isMachineFormValid = useMemo(() => {
    const nameOk = normalize(form.name).length > 0;
    const serialOk = normalize(form.serialNumber).length > 0;
    return nameOk && serialOk;
  }, [form.name, form.serialNumber]);

  // Add Machine with duplicate name + duplicate serial check (Firestore)
  const handleAdd = async () => {
    const trimmedName = (form.name || '').trim();
    const trimmedSerial = (form.serialNumber || '').trim();

    if (!trimmedName) {
      return setSnackbar({ open: true, message: 'Machine name is required', severity: 'error' });
    }
    if (!trimmedSerial) {
      return setSnackbar({ open: true, message: 'Serial number is required', severity: 'error' });
    }

    try {
      const machinesRef = collection(db, 'machines');

      // Duplicate NAME
      const nameQ = query(machinesRef, where('name', '==', trimmedName));
      const nameSnap = await getDocs(nameQ);
      if (!nameSnap.empty) {
        return setSnackbar({ open: true, message: 'Machine name already exists', severity: 'error' });
      }

      // Duplicate SERIAL
      const serialQ = query(machinesRef, where('serialNumber', '==', trimmedSerial));
      const serialSnap = await getDocs(serialQ);
      if (!serialSnap.empty) {
        return setSnackbar({ open: true, message: 'Serial number already exists', severity: 'error' });
      }

      const machineToSave = {
        ...form,
        name: trimmedName,
        serialNumber: trimmedSerial,
      };

      await addDoc(machinesRef, machineToSave);

      setSnackbar({ open: true, message: 'Machine added', severity: 'success' });

      setForm({
        name: '',
        model: '',
        serialNumber: '',
        location: '',
        status: 'Active',
      });

      fetchMachines();
    } catch (e) {
      console.error('Add machine error:', e);
      setSnackbar({ open: true, message: 'Add failed', severity: 'error' });
    }
  };

  const handleEditClick = (m) => {
    setEditingId(m.id);
    setEditForm({ ...m });
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    const trimmedName = (editForm.name || '').trim();
    const trimmedSerial = (editForm.serialNumber || '').trim();

    if (!trimmedName) {
      return setSnackbar({ open: true, message: 'Machine name is required', severity: 'error' });
    }
    if (!trimmedSerial) {
      return setSnackbar({ open: true, message: 'Serial number is required', severity: 'error' });
    }

    try {
      const machinesRef = collection(db, 'machines');

      // Duplicate NAME (other docs)
      const nameQ = query(machinesRef, where('name', '==', trimmedName));
      const nameSnap = await getDocs(nameQ);
      const nameDuplicate = nameSnap.docs.some((d) => d.id !== editingId);
      if (nameDuplicate) {
        return setSnackbar({
          open: true,
          message: 'Another machine with this name already exists',
          severity: 'error',
        });
      }

      // Duplicate SERIAL (other docs)
      const serialQ = query(machinesRef, where('serialNumber', '==', trimmedSerial));
      const serialSnap = await getDocs(serialQ);
      const serialDuplicate = serialSnap.docs.some((d) => d.id !== editingId);
      if (serialDuplicate) {
        return setSnackbar({
          open: true,
          message: 'Another machine with this serial number already exists',
          severity: 'error',
        });
      }

      const { id, ...data } = editForm;
      const updated = {
        ...data,
        name: trimmedName,
        serialNumber: trimmedSerial,
      };

      await updateDoc(doc(db, 'machines', editingId), updated);

      setSnackbar({ open: true, message: 'Machine updated', severity: 'success' });
      setEditDialogOpen(false);
      fetchMachines();
    } catch (e) {
      console.error('Update machine error:', e);
      setSnackbar({ open: true, message: 'Update failed', severity: 'error' });
    }
  };

  // FIXED: delete handlers
  const handleDeleteClick = (m) => {
    setDeleteTarget(m);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteDoc(doc(db, 'machines', deleteTarget.id));
      setSnackbar({ open: true, message: 'Deleted', severity: 'success' });
      setDeleteDialogOpen(false);
      fetchMachines();
    } catch (e) {
      setSnackbar({ open: true, message: 'Delete failed', severity: 'error' });
    }
  };

  return (
    <Box>
      <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
        <h2 style={{ margin: 0 }}>MACHINE MASTER</h2>
      </Paper>

      {/* NEW: Search + Status Filter */}
      <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 220px', gap: 2 }}>
          <TextField
            label="Search machines (name / serial / model / location)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            size="small"
            fullWidth
          />

          <FormControl size="small" fullWidth>
            <InputLabel>Status Filter</InputLabel>
            <Select
              value={statusFilter}
              label="Status Filter"
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <MenuItem value="All">All</MenuItem>
              <MenuItem value="Active">Active</MenuItem>
              <MenuItem value="Inactive">Inactive</MenuItem>
              <MenuItem value="Maintenance">Maintenance</MenuItem>
            </Select>
          </FormControl>
        </Box>

        <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
          {!!search && (
            <Button size="small" onClick={() => setSearch('')}>
              Clear Search
            </Button>
          )}
          {statusFilter !== 'All' && (
            <Button size="small" onClick={() => setStatusFilter('All')}>
              Clear Filter
            </Button>
          )}
        </Box>
      </Paper>

      <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
        <h3 style={{ marginTop: 0 }}>MACHINE LIST</h3>

        {loading ? (
          <div>Loading...</div>
        ) : filteredMachines.length === 0 ? (
          <Alert severity="info">
            <Typography variant="body2">
              No machines found{search || statusFilter !== 'All' ? ' for your current search/filter.' : '.'}
            </Typography>
          </Alert>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Model</TableCell>
                <TableCell>Serial #</TableCell>
                <TableCell>Location</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {filteredMachines.map((m) => {
                const chip = statusChipVariant(m.status);
                return (
                  <TableRow key={m.id}>
                    <TableCell>{m.name}</TableCell>
                    <TableCell>{m.model}</TableCell>
                    <TableCell>{m.serialNumber}</TableCell>
                    <TableCell>{m.location}</TableCell>

                    {/* NEW: Status color coding */}
                    <TableCell>
                      <Chip size="small" label={chip.label} color={chip.color} />
                    </TableCell>

                    <TableCell>
                      <IconButton size="small" onClick={() => handleEditClick(m)}>
                        <EditIcon />
                      </IconButton>
                      <IconButton size="small" color="error" onClick={() => handleDeleteClick(m)}>
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Paper>

      <Paper elevation={1} sx={{ p: 2 }}>
        <h3 style={{ marginTop: 0 }}>NEW MACHINE ENTRY</h3>

        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 2 }}>
          <TextField
            label="Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
            size="small"
          />
          <TextField
            label="Model"
            value={form.model}
            onChange={(e) => setForm({ ...form, model: e.target.value })}
            size="small"
          />
          <TextField
            label="Serial #"
            value={form.serialNumber}
            onChange={(e) => setForm({ ...form, serialNumber: e.target.value })}
            required
            size="small"
          />
          <TextField
            label="Location"
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
            size="small"
          />

          <FormControl size="small">
            <InputLabel>Status</InputLabel>
            <Select
              value={form.status}
              label="Status"
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              <MenuItem value="Active">Active</MenuItem>
              <MenuItem value="Inactive">Inactive</MenuItem>
              <MenuItem value="Maintenance">Maintenance</MenuItem>
            </Select>
          </FormControl>
        </Box>

        <Box sx={{ mt: 2 }}>
          {/* NEW: disable add until valid */}
          <Button variant="contained" onClick={handleAdd} disabled={!isMachineFormValid}>
            ADD MACHINE
          </Button>
          {!isMachineFormValid && (
            <Typography variant="caption" sx={{ ml: 2 }}>
              *Name and Serial # are required
            </Typography>
          )}
        </Box>
      </Paper>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>EDIT MACHINE</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Name"
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              fullWidth
            />
            <TextField
              label="Model"
              value={editForm.model}
              onChange={(e) => setEditForm({ ...editForm, model: e.target.value })}
              fullWidth
            />
            <TextField
              label="Serial #"
              value={editForm.serialNumber}
              onChange={(e) => setEditForm({ ...editForm, serialNumber: e.target.value })}
              fullWidth
            />
            <TextField
              label="Location"
              value={editForm.location}
              onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={editForm.status}
                label="Status"
                onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
              >
                <MenuItem value="Active">Active</MenuItem>
                <MenuItem value="Inactive">Inactive</MenuItem>
                <MenuItem value="Maintenance">Maintenance</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>CANCEL</Button>
          <Button onClick={handleSaveEdit} variant="contained">
            SAVE
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          Are you sure you want to delete {deleteTarget?.name}?
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>CANCEL</Button>
          <Button onClick={handleConfirmDelete} color="error" variant="contained">
            DELETE
          </Button>
        </DialogActions>
      </Dialog>

      {/* FIXED: Snackbar severity via Alert */}
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

export default MachineMaster;
