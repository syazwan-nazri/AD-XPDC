import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { db } from '../../firebase/config';
import { collection, getDocs, addDoc, deleteDoc, updateDoc, doc } from 'firebase/firestore';
import { setParts, addPart, deletePart, updatePart } from '../../redux/partsSlice';
import { Button, Snackbar, TextField, Table, TableHead, TableRow, TableCell, TableBody, Paper, Box, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';

// Main Part Master Page
const PartMaster = () => {
  const dispatch = useDispatch();
  const parts = useSelector((state) => state.parts.parts);
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [form, setForm] = useState({ sapNumber: '', internalRef: '', name: '', category: '', rackNumber: '', rackLevel: '' });
  const [pageStart, setPageStart] = useState(0); // index of first item in current page
  const pageSize = 50;
  
  // Modal states
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({ sapNumber: '', internalRef: '', name: '', category: '', rackNumber: '', rackLevel: '' });
  const [editingId, setEditingId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Fetch parts from Firestore
  useEffect(() => {
    const fetchParts = async () => {
      setLoading(true);
      try {
        const querySnapshot = await getDocs(collection(db, 'parts'));
        const data = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
        dispatch(setParts(data));
      } catch (error) {
        setSnackbar({ open: true, message: 'Fetch error', severity: 'error' });
      } finally {
        setLoading(false);
      }
    };
    fetchParts();
  }, [dispatch]);

  // Add part
  const handleAddPart = async () => {
    if (!form.sapNumber) return setSnackbar({ open: true, message: 'SAP # required', severity: 'error' });
    try {
      const docRef = await addDoc(collection(db, 'parts'), form);
      dispatch(addPart({ ...form, id: docRef.id }));
      setSnackbar({ open: true, message: 'Part added', severity: 'success' });
      setForm({ sapNumber: '', internalRef: '', name: '', category: '', rackNumber: '', rackLevel: '' });
    } catch (e) {
      setSnackbar({ open: true, message: 'Add failed', severity: 'error' });
    }
  };
  
  const handleClear = () => {
    setForm({ sapNumber: '', internalRef: '', name: '', category: '', rackNumber: '', rackLevel: '' });
  };
  
  // Edit handlers
  const handleEditClick = (part) => {
    setEditingId(part.id);
    setEditForm({
      sapNumber: part.sapNumber || '',
      internalRef: part.internalRef || '',
      name: part.name || '',
      category: part.category || '',
      rackNumber: part.rackNumber || '',
      rackLevel: part.rackLevel || ''
    });
    setEditDialogOpen(true);
  };
  
  const handleEditClose = () => {
    setEditDialogOpen(false);
    setEditingId(null);
    setEditForm({ sapNumber: '', internalRef: '', name: '', category: '', rackNumber: '', rackLevel: '' });
  };
  
  const handleSaveChanges = async () => {
    if (!editingId) return;
    if (!editForm.sapNumber) return setSnackbar({ open: true, message: 'SAP # required', severity: 'error' });
    try {
      await updateDoc(doc(db, 'parts', editingId), editForm);
      dispatch(updatePart({ ...editForm, id: editingId }));
      setSnackbar({ open: true, message: 'Part updated', severity: 'success' });
      handleEditClose();
    } catch (e) {
      setSnackbar({ open: true, message: 'Update failed', severity: 'error' });
    }
  };
  
  // Delete handlers
  const handleDeleteClick = (part) => {
    setDeleteTarget(part);
    setDeleteDialogOpen(true);
  };
  
  const handleDeleteClose = () => {
    setDeleteDialogOpen(false);
    setDeleteTarget(null);
  };
  
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteDoc(doc(db, 'parts', deleteTarget.id));
      dispatch(deletePart(deleteTarget.id));
      setSnackbar({ open: true, message: 'Deleted', severity: 'success' });
      handleDeleteClose();
    } catch (e) {
      setSnackbar({ open: true, message: 'Delete failed', severity: 'error' });
    }
  };
  const pageParts = parts.slice(pageStart, pageStart + pageSize);
  const total = parts.length;
  const showingEnd = Math.min(pageStart + pageSize, total);
  const handlePrev = () => setPageStart(s => Math.max(0, s - pageSize));
  const handleNext = () => {
    if (pageStart + pageSize < total) setPageStart(s => s + pageSize);
  };
  return (
    <Box>
      <Paper elevation={2} sx={{ p:2, mb:3 }}>
        <h2 style={{ margin:0 }}>PART MASTER - ENGINEERING STORE SPARE PART</h2>
      </Paper>

      <Paper elevation={1} sx={{ p:2, mb:3 }}>
        <h3 style={{ marginTop:0 }}>PART LIST ({pageSize} ITEMS)</h3>
        {loading ? <div>Loading...</div> : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>SAP#</TableCell>
                <TableCell>Int.Ref</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Rack No</TableCell>
                <TableCell>Level</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pageParts.map(p => (
                <TableRow key={p.id}>
                  <TableCell>{p.sapNumber}</TableCell>
                  <TableCell>{p.internalRef}</TableCell>
                  <TableCell>{p.name}</TableCell>
                  <TableCell>{p.category}</TableCell>
                  <TableCell>{p.rackNumber}</TableCell>
                  <TableCell>{p.rackLevel}</TableCell>
                  <TableCell>
                    <Button size="small" onClick={() => handleEditClick(p)}>Edit</Button>
                    <Button size="small" color="error" onClick={() => handleDeleteClick(p)}>Delete</Button>
                  </TableCell>
                </TableRow>
              ))}
              {pageParts.length === 0 && (
                <TableRow><TableCell colSpan={7}>No parts</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        )}
        <Box sx={{ display:'flex', alignItems:'center', justifyContent:'space-between', mt:1 }}>
          <div>
            <Button size="small" onClick={handlePrev} disabled={pageStart === 0}>{'<< Previous'}</Button>
            <Button size="small" onClick={handleNext} disabled={pageStart + pageSize >= total}>{'Next >>'}</Button>
          </div>
          <div>Showing {pageStart + 1}-{showingEnd} of {total} items</div>
        </Box>
      </Paper>

      <Paper elevation={1} sx={{ p:2 }}>
        <h3 style={{ marginTop:0 }}>NEW PART ENTRY</h3>
        <Box sx={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))', gap:2 }}>
          <TextField label="SAP #" value={form.sapNumber} onChange={e => setForm(f => ({ ...f, sapNumber: e.target.value }))} required />
          <TextField label="Internal Ref No" value={form.internalRef} onChange={e => setForm(f => ({ ...f, internalRef: e.target.value }))} />
          <TextField label="Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          <TextField label="Category" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} />
          <TextField label="Rack Number" value={form.rackNumber} onChange={e => setForm(f => ({ ...f, rackNumber: e.target.value }))} />
          <TextField label="Rack Level" value={form.rackLevel} onChange={e => setForm(f => ({ ...f, rackLevel: e.target.value }))} />
        </Box>
        <Box sx={{ mt:2 }}>
          <Button variant="contained" onClick={handleAddPart} sx={{ mr:1 }}>ADD PART</Button>
          <Button variant="outlined" onClick={handleClear}>CLEAR</Button>
        </Box>
      </Paper>

      {/* Edit Part Dialog */}
      <Dialog open={editDialogOpen} onClose={handleEditClose} maxWidth="sm" fullWidth>
        <DialogTitle>EDIT PART</DialogTitle>
        <DialogContent>
          <Box sx={{ display:'flex', flexDirection:'column', gap:2, mt:1 }}>
            <TextField label="SAP #" value={editForm.sapNumber} disabled fullWidth />
            <TextField label="Internal Ref No" value={editForm.internalRef} onChange={e => setEditForm(f => ({ ...f, internalRef: e.target.value }))} fullWidth />
            <TextField label="Name" value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} fullWidth />
            <TextField label="Category" value={editForm.category} onChange={e => setEditForm(f => ({ ...f, category: e.target.value }))} fullWidth />
            <TextField label="Rack Number" value={editForm.rackNumber} onChange={e => setEditForm(f => ({ ...f, rackNumber: e.target.value }))} fullWidth />
            <TextField label="Rack Level" value={editForm.rackLevel} onChange={e => setEditForm(f => ({ ...f, rackLevel: e.target.value }))} fullWidth />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p:2 }}>
          <Button onClick={handleEditClose} variant="outlined">CANCEL</Button>
          <Button onClick={handleSaveChanges} variant="contained">SAVE CHANGES</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={handleDeleteClose} maxWidth="xs" fullWidth>
        <DialogTitle>DELETE CONFIRMATION PROMPT</DialogTitle>
        <DialogContent>
          <Box sx={{ py:2 }}>
            <p style={{ marginTop:0 }}>Are you sure you want to delete this part?</p>
            <Box sx={{ my:2 }}>
              <p><strong>SAP #:</strong> {deleteTarget?.sapNumber}</p>
              <p><strong>Name:</strong> {deleteTarget?.name}</p>
            </Box>
            <p style={{ color:'red', marginBottom:0 }}>This action cannot be undone.</p>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p:2 }}>
          <Button onClick={handleDeleteClose} variant="outlined">CANCEL</Button>
          <Button onClick={handleConfirmDelete} variant="contained" color="error">CONFIRM DELETE</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar(s => ({ ...s, open: false }))} message={snackbar.message} />
    </Box>
  );
};

export default PartMaster;
