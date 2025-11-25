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
  
  // Validation states
  const [sapError, setSapError] = useState(false);
  const [editSapError, setEditSapError] = useState(false);
  const [rackNumberError, setRackNumberError] = useState(false);
  const [rackLevelError, setRackLevelError] = useState(false);
  const [editRackNumberError, setEditRackNumberError] = useState(false);
  const [editRackLevelError, setEditRackLevelError] = useState(false);
  const [internalRefError, setInternalRefError] = useState(false);
  const [nameError, setNameError] = useState(false);
  const [categoryError, setCategoryError] = useState(false);

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

  // Validate SAP# (7 digits only, must start with 7)
  const validateSapNumber = (value) => {
    const regex = /^7\d{6}$/;
    return regex.test(value);
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
  
  // Validate Internal Ref No (ABC123, AB1234, ABC 123, AB 1234 formats only)
  const validateInternalRef = (value) => {
    if (!value) return false;
    // Exact patterns: ABC123 (3 letters + 3 digits) OR AB1234 (2 letters + 4 digits)
    // With optional space: ABC 123 OR AB 1234
    const regex = /^([A-Z]{3}\s?\d{3}|[A-Z]{2}\s?\d{4})$/i;
    return regex.test(value);
  };
  
  // Add part
  const handleAddPart = async () => {
    // Reset all errors
    setSapError(false);
    setInternalRefError(false);
    setNameError(false);
    setCategoryError(false);
    setRackNumberError(false);
    setRackLevelError(false);
    
    // Validate all required fields
    let hasError = false;
    
    if (!form.sapNumber) {
      setSapError(true);
      hasError = true;
    } else if (!validateSapNumber(form.sapNumber)) {
      setSapError(true);
      setSnackbar({ open: true, message: 'SAP # must be 7 digits starting with 7', severity: 'error' });
      return;
    } else if (parts.some(p => p.sapNumber === form.sapNumber)) {
      setSapError(true);
      setSnackbar({ open: true, message: 'SAP # already exists', severity: 'error' });
      return;
    }
    
    if (!form.internalRef || form.internalRef.trim() === '') {
      setInternalRefError(true);
      hasError = true;
    } else if (!validateInternalRef(form.internalRef)) {
      setInternalRefError(true);
      setSnackbar({ open: true, message: 'Internal Ref No format: ABC123, AB1234, ABC 123, or AB 1234', severity: 'error' });
      return;
    } else if (parts.some(p => p.internalRef === form.internalRef)) {
      setInternalRefError(true);
      setSnackbar({ open: true, message: 'Internal Ref No already exists', severity: 'error' });
      return;
    }
    
    if (!form.name || form.name.trim() === '') {
      setNameError(true);
      hasError = true;
    } else if (parts.some(p => p.name && p.name.trim().toLowerCase() === form.name.trim().toLowerCase())) {
      setNameError(true);
      setSnackbar({ open: true, message: 'Name already exists', severity: 'error' });
      return;
    }
    
    if (!form.category || form.category.trim() === '') {
      setCategoryError(true);
      hasError = true;
    }
    
    if (!form.rackNumber) {
      setRackNumberError(true);
      hasError = true;
    } else if (!validateRackNumber(form.rackNumber)) {
      setRackNumberError(true);
      setSnackbar({ open: true, message: 'Rack Number must be exactly 2 digits (e.g., 00, 01, 10)', severity: 'error' });
      return;
    }
    
    if (!form.rackLevel) {
      setRackLevelError(true);
      hasError = true;
    } else if (!validateRackLevel(form.rackLevel)) {
      setRackLevelError(true);
      setSnackbar({ open: true, message: 'Rack Level must be A, B, C, or D only', severity: 'error' });
      return;
    }
    
    if (hasError) {
      setSnackbar({ open: true, message: 'Please fill in all required fields', severity: 'error' });
      return;
    }
    // Uniqueness check for SAP# (running number) against existing parts in state
    const sapExists = parts.some(p => p.sapNumber === form.sapNumber);
    if (sapExists) {
      setSapError(true);
      setSnackbar({ open: true, message: 'SAP # already exists', severity: 'error' });
      return;
    }
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
    setSapError(false);
    setInternalRefError(false);
    setNameError(false);
    setCategoryError(false);
    setRackNumberError(false);
    setRackLevelError(false);
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
    if (!editForm.sapNumber) {
      setEditSapError(true);
      return setSnackbar({ open: true, message: 'SAP # required', severity: 'error' });
    }
    if (!validateSapNumber(editForm.sapNumber)) {
      setEditSapError(true);
      return setSnackbar({ open: true, message: 'SAP # must be 7 digits starting with 7', severity: 'error' });
    }
    if (editForm.rackNumber && !validateRackNumber(editForm.rackNumber)) {
      setEditRackNumberError(true);
      return setSnackbar({ open: true, message: 'Rack Number must be exactly 2 digits (e.g., 00, 01, 10)', severity: 'error' });
    }
    if (editForm.rackLevel && !validateRackLevel(editForm.rackLevel)) {
      setEditRackLevelError(true);
      return setSnackbar({ open: true, message: 'Rack Level must be A, B, C, or D only', severity: 'error' });
    }
    setEditSapError(false);
    setEditRackNumberError(false);
    setEditRackLevelError(false);
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
          <TextField 
            label="SAP #" 
            value={form.sapNumber} 
            onChange={e => {
              const value = e.target.value;
              setForm(f => ({ ...f, sapNumber: value }));
              // Check if format is valid
              const isValidFormat = validateSapNumber(value);
              // Check if SAP# already exists in parts list
              const isDuplicate = value && parts.some(p => p.sapNumber === value);
              setSapError(value && (!isValidFormat || isDuplicate));
            }}
            error={sapError}
            helperText={sapError ? (
              parts.some(p => p.sapNumber === form.sapNumber) 
                ? "SAP # already exists" 
                : "SAP # must be 7 digits starting with 7 (e.g., 7000001)"
            ) : ""}
            required 
          />
          <TextField 
            label="Internal Ref No" 
            value={form.internalRef} 
            onChange={e => {
              const value = e.target.value.toUpperCase();
              setForm(f => ({ ...f, internalRef: value }));
              // Check if format is valid
              const isValidFormat = validateInternalRef(value);
              // Check if Internal Ref No already exists in parts list
              const isDuplicate = value && parts.some(p => p.internalRef === value);
              setInternalRefError(value && (!isValidFormat || isDuplicate));
            }}
            error={internalRefError}
            helperText={internalRefError ? (
              parts.some(p => p.internalRef === form.internalRef)
                ? "Internal Ref No already exists"
                : "Format: ABC123, AB1234, ABC 123, or AB 1234"
            ) : ""}
            required
            inputProps={{ style: { textTransform: 'uppercase' } }}
          />
          <TextField 
            label="Name" 
            value={form.name} 
            onChange={e => {
              const value = e.target.value.toUpperCase();
              setForm(f => ({ ...f, name: value }));
              // Check if Name already exists in parts list (trim for comparison)
              const trimmedValue = value.trim();
              const isDuplicate = trimmedValue && parts.some(p => p.name && p.name.trim().toLowerCase() === trimmedValue.toLowerCase());
              setNameError((!value || value.trim() === '') || isDuplicate);
            }}
            error={nameError}
            helperText={nameError ? (
              form.name && form.name.trim() && parts.some(p => p.name && p.name.trim().toLowerCase() === form.name.trim().toLowerCase())
                ? "Name already exists"
                : "Name is required"
            ) : ""}
            required
            inputProps={{ style: { textTransform: 'uppercase' } }}
          />
          <TextField 
            label="Category" 
            value={form.category} 
            onChange={e => {
              const value = e.target.value.toUpperCase();
              setForm(f => ({ ...f, category: value }));
              setCategoryError(!value || value.trim() === '');
            }}
            error={categoryError}
            helperText={categoryError ? "Category is required" : ""}
            required
            inputProps={{ style: { textTransform: 'uppercase' } }}
          />
          <TextField 
            label="Rack Number" 
            value={form.rackNumber} 
            onChange={e => {
              const value = e.target.value;
              setForm(f => ({ ...f, rackNumber: value }));
              setRackNumberError(value && !validateRackNumber(value));
            }}
            error={rackNumberError}
            helperText={rackNumberError ? (form.rackNumber ? "Must be exactly 2 digits (e.g., 00, 01, 10)" : "Rack Number is required") : ""}
            required
          />
          <TextField 
            label="Rack Level" 
            value={form.rackLevel} 
            onChange={e => {
              const value = e.target.value.toUpperCase();
              setForm(f => ({ ...f, rackLevel: value }));
              setRackLevelError(value && !validateRackLevel(value));
            }}
            error={rackLevelError}
            helperText={rackLevelError ? (form.rackLevel ? "Rack Level must be A, B, C, or D only" : "Rack Level is required") : ""}
            inputProps={{ maxLength: 1, style: { textTransform: 'uppercase' } }}
            required
          />
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
            <TextField 
              label="SAP #" 
              value={editForm.sapNumber} 
              disabled 
              fullWidth 
              error={editSapError}
              helperText={editSapError ? "SAP # must be 7 digits starting with 7 (e.g., 7000001)" : ""}
            />
            <TextField label="Internal Ref No" value={editForm.internalRef} onChange={e => setEditForm(f => ({ ...f, internalRef: e.target.value }))} fullWidth />
            <TextField 
              label="Name" 
              value={editForm.name} 
              onChange={e => setEditForm(f => ({ ...f, name: e.target.value.toUpperCase() }))} 
              fullWidth 
              inputProps={{ style: { textTransform: 'uppercase' } }}
            />
            <TextField 
              label="Category" 
              value={editForm.category} 
              onChange={e => setEditForm(f => ({ ...f, category: e.target.value.toUpperCase() }))} 
              fullWidth 
              inputProps={{ style: { textTransform: 'uppercase' } }}
            />
            <TextField 
              label="Rack Number" 
              value={editForm.rackNumber} 
              onChange={e => {
                const value = e.target.value;
                setEditForm(f => ({ ...f, rackNumber: value }));
                setEditRackNumberError(value && !validateRackNumber(value));
              }}
              error={editRackNumberError}
              helperText={editRackNumberError ? "Must be exactly 2 digits (e.g., 00, 01, 10)" : ""}
              fullWidth 
            />
            <TextField 
              label="Rack Level" 
              value={editForm.rackLevel} 
              onChange={e => {
                const value = e.target.value.toUpperCase();
                setEditForm(f => ({ ...f, rackLevel: value }));
                setEditRackLevelError(value && !validateRackLevel(value));
              }}
              error={editRackLevelError}
              helperText={editRackLevelError ? "Rack Level must be A, B, C, or D only" : ""}
              inputProps={{ maxLength: 1, style: { textTransform: 'uppercase' } }}
              fullWidth 
            />
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
