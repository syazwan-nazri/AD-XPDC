import React, { useEffect, useState } from 'react';
import { db } from '../../firebase/config';
import { collection, getDocs, addDoc, deleteDoc, updateDoc, doc } from 'firebase/firestore';
import { Button, Snackbar, TextField, Table, TableHead, TableRow, TableCell, TableBody, Paper, Box, Dialog, DialogTitle, DialogContent, DialogActions, IconButton, MenuItem, Select, FormControl, InputLabel } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

const MachineMaster = () => {
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  
  // Form states
  const [form, setForm] = useState({ name: '', model: '', serialNumber: '', location: '', status: 'Active' });
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', model: '', serialNumber: '', location: '', status: 'Active' });
  const [editingId, setEditingId] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Fetch machines
  const fetchMachines = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'machines'));
      const data = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
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

  // Add Machine
  const handleAdd = async () => {
    if (!form.name) return setSnackbar({ open: true, message: 'Name is required', severity: 'error' });
    try {
      await addDoc(collection(db, 'machines'), form);
      setSnackbar({ open: true, message: 'Machine added', severity: 'success' });
      setForm({ name: '', model: '', serialNumber: '', location: '', status: 'Active' });
      fetchMachines();
    } catch (e) {
      setSnackbar({ open: true, message: 'Add failed', severity: 'error' });
    }
  };

  // Edit Machine
  const handleEditClick = (m) => {
    setEditingId(m.id);
    setEditForm({ ...m });
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editForm.name) return setSnackbar({ open: true, message: 'Name is required', severity: 'error' });
    try {
      const { id, ...data } = editForm;
      await updateDoc(doc(db, 'machines', editingId), data);
      setSnackbar({ open: true, message: 'Machine updated', severity: 'success' });
      setEditDialogOpen(false);
      fetchMachines();
    } catch (e) {
      setSnackbar({ open: true, message: 'Update failed', severity: 'error' });
    }
  };

  // Delete Machine
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

      <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
        <h3 style={{ marginTop: 0 }}>MACHINE LIST</h3>
        {loading ? <div>Loading...</div> : (
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
              {machines.map(m => (
                <TableRow key={m.id}>
                  <TableCell>{m.name}</TableCell>
                  <TableCell>{m.model}</TableCell>
                  <TableCell>{m.serialNumber}</TableCell>
                  <TableCell>{m.location}</TableCell>
                  <TableCell>{m.status}</TableCell>
                  <TableCell>
                    <IconButton size="small" onClick={() => handleEditClick(m)}><EditIcon /></IconButton>
                    <IconButton size="small" color="error" onClick={() => handleDeleteClick(m)}><DeleteIcon /></IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {machines.length === 0 && <TableRow><TableCell colSpan={6}>No machines found</TableCell></TableRow>}
            </TableBody>
          </Table>
        )}
      </Paper>

      <Paper elevation={1} sx={{ p: 2 }}>
        <h3 style={{ marginTop: 0 }}>NEW MACHINE ENTRY</h3>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 2 }}>
          <TextField label="Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required size="small" />
          <TextField label="Model" value={form.model} onChange={e => setForm({ ...form, model: e.target.value })} size="small" />
          <TextField label="Serial #" value={form.serialNumber} onChange={e => setForm({ ...form, serialNumber: e.target.value })} size="small" />
          <TextField label="Location" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} size="small" />
          <FormControl size="small">
            <InputLabel>Status</InputLabel>
            <Select value={form.status} label="Status" onChange={e => setForm({ ...form, status: e.target.value })}>
              <MenuItem value="Active">Active</MenuItem>
              <MenuItem value="Inactive">Inactive</MenuItem>
              <MenuItem value="Maintenance">Maintenance</MenuItem>
            </Select>
          </FormControl>
        </Box>
        <Box sx={{ mt: 2 }}>
          <Button variant="contained" onClick={handleAdd}>ADD MACHINE</Button>
        </Box>
      </Paper>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>EDIT MACHINE</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField label="Name" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} fullWidth />
            <TextField label="Model" value={editForm.model} onChange={e => setEditForm({ ...editForm, model: e.target.value })} fullWidth />
            <TextField label="Serial #" value={editForm.serialNumber} onChange={e => setEditForm({ ...editForm, serialNumber: e.target.value })} fullWidth />
            <TextField label="Location" value={editForm.location} onChange={e => setEditForm({ ...editForm, location: e.target.value })} fullWidth />
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select value={editForm.status} label="Status" onChange={e => setEditForm({ ...editForm, status: e.target.value })}>
                <MenuItem value="Active">Active</MenuItem>
                <MenuItem value="Inactive">Inactive</MenuItem>
                <MenuItem value="Maintenance">Maintenance</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>CANCEL</Button>
          <Button onClick={handleSaveEdit} variant="contained">SAVE</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>Are you sure you want to delete {deleteTarget?.name}?</DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>CANCEL</Button>
          <Button onClick={handleConfirmDelete} color="error" variant="contained">DELETE</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar({ ...snackbar, open: false })} message={snackbar.message} severity={snackbar.severity} />
    </Box>
  );
};

export default MachineMaster;
