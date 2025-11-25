import React, { useEffect, useState } from 'react';
import { db } from '../../firebase/config';
import { collection, getDocs, addDoc, deleteDoc, updateDoc, doc } from 'firebase/firestore';
import { Button, Snackbar, TextField, Table, TableHead, TableRow, TableCell, TableBody, Paper, Box, Dialog, DialogTitle, DialogContent, DialogActions, IconButton } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

const SupplierMaster = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  
  // Form states
  const [form, setForm] = useState({ name: '', contactPerson: '', email: '', phone: '', address: '' });
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', contactPerson: '', email: '', phone: '', address: '' });
  const [editingId, setEditingId] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Fetch suppliers
  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'suppliers'));
      const data = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      setSuppliers(data);
    } catch (error) {
      setSnackbar({ open: true, message: 'Fetch error', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  // Add Supplier
  const handleAdd = async () => {
    if (!form.name) return setSnackbar({ open: true, message: 'Name is required', severity: 'error' });
    try {
      await addDoc(collection(db, 'suppliers'), form);
      setSnackbar({ open: true, message: 'Supplier added', severity: 'success' });
      setForm({ name: '', contactPerson: '', email: '', phone: '', address: '' });
      fetchSuppliers();
    } catch (e) {
      setSnackbar({ open: true, message: 'Add failed', severity: 'error' });
    }
  };

  // Edit Supplier
  const handleEditClick = (s) => {
    setEditingId(s.id);
    setEditForm({ ...s });
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editForm.name) return setSnackbar({ open: true, message: 'Name is required', severity: 'error' });
    try {
      const { id, ...data } = editForm; // Exclude ID from update data
      await updateDoc(doc(db, 'suppliers', editingId), data);
      setSnackbar({ open: true, message: 'Supplier updated', severity: 'success' });
      setEditDialogOpen(false);
      fetchSuppliers();
    } catch (e) {
      setSnackbar({ open: true, message: 'Update failed', severity: 'error' });
    }
  };

  // Delete Supplier
  const handleDeleteClick = (s) => {
    setDeleteTarget(s);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteDoc(doc(db, 'suppliers', deleteTarget.id));
      setSnackbar({ open: true, message: 'Deleted', severity: 'success' });
      setDeleteDialogOpen(false);
      fetchSuppliers();
    } catch (e) {
      setSnackbar({ open: true, message: 'Delete failed', severity: 'error' });
    }
  };

  return (
    <Box>
      <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
        <h2 style={{ margin: 0 }}>SUPPLIER MASTER</h2>
      </Paper>

      <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
        <h3 style={{ marginTop: 0 }}>SUPPLIER LIST</h3>
        {loading ? <div>Loading...</div> : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Contact Person</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Phone</TableCell>
                <TableCell>Address</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {suppliers.map(s => (
                <TableRow key={s.id}>
                  <TableCell>{s.name}</TableCell>
                  <TableCell>{s.contactPerson}</TableCell>
                  <TableCell>{s.email}</TableCell>
                  <TableCell>{s.phone}</TableCell>
                  <TableCell>{s.address}</TableCell>
                  <TableCell>
                    <IconButton size="small" onClick={() => handleEditClick(s)}><EditIcon /></IconButton>
                    <IconButton size="small" color="error" onClick={() => handleDeleteClick(s)}><DeleteIcon /></IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {suppliers.length === 0 && <TableRow><TableCell colSpan={6}>No suppliers found</TableCell></TableRow>}
            </TableBody>
          </Table>
        )}
      </Paper>

      <Paper elevation={1} sx={{ p: 2 }}>
        <h3 style={{ marginTop: 0 }}>NEW SUPPLIER ENTRY</h3>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 2 }}>
          <TextField label="Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required size="small" />
          <TextField label="Contact Person" value={form.contactPerson} onChange={e => setForm({ ...form, contactPerson: e.target.value })} size="small" />
          <TextField label="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} size="small" />
          <TextField label="Phone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} size="small" />
          <TextField label="Address" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} size="small" />
        </Box>
        <Box sx={{ mt: 2 }}>
          <Button variant="contained" onClick={handleAdd}>ADD SUPPLIER</Button>
        </Box>
      </Paper>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>EDIT SUPPLIER</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField label="Name" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} fullWidth />
            <TextField label="Contact Person" value={editForm.contactPerson} onChange={e => setEditForm({ ...editForm, contactPerson: e.target.value })} fullWidth />
            <TextField label="Email" value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} fullWidth />
            <TextField label="Phone" value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} fullWidth />
            <TextField label="Address" value={editForm.address} onChange={e => setEditForm({ ...editForm, address: e.target.value })} fullWidth />
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

export default SupplierMaster;
