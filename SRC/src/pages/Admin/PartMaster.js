import React, { useEffect, useState, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { db } from '../../firebase/config';
import { collection, getDocs, addDoc, deleteDoc, updateDoc, doc } from 'firebase/firestore';
import { setParts, addPart, deletePart, updatePart } from '../../redux/partsSlice';
import { Button, Snackbar, TextField, Table, TableHead, TableRow, TableCell, TableBody, Paper, Box, Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Tooltip, Typography, MenuItem, Select, FormControl, InputLabel, InputAdornment, Chip } from '@mui/material';
import Barcode from 'react-barcode';
import QrCodeIcon from '@mui/icons-material/QrCode';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import WarningIcon from '@mui/icons-material/Warning';
import BarcodeScanner from '../../components/BarcodeScanner';

// Main Part Master Page
const PartMaster = () => {
  const dispatch = useDispatch();
  const parts = useSelector((state) => state.parts.parts);
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  
  // Search & Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterRackLevel, setFilterRackLevel] = useState('');

  const [form, setForm] = useState({ 
    sapNumber: '', internalRef: '', name: '', category: '', rackNumber: '', rackLevel: '', 
    safetyLevel: '', replenishQty: '', currentStock: '' 
  });
  // Track the current running SAP#
  const [currentRunningSap, setCurrentRunningSap] = useState('7000001');
  // Dialog for SAP# mismatch
  const [sapDialogOpen, setSapDialogOpen] = useState(false);
  const [pendingAdd, setPendingAdd] = useState(false);
  
  const [pageStart, setPageStart] = useState(0); // index of first item in current page
  const pageSize = 50;
  
  // Modal states
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [barcodeDialogOpen, setBarcodeDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({ 
    sapNumber: '', internalRef: '', name: '', category: '', rackNumber: '', rackLevel: '',
    safetyLevel: '', replenishQty: '', currentStock: 0
  });
  const [editingId, setEditingId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [barcodeTarget, setBarcodeTarget] = useState(null);
  
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
  const [safetyLevelError, setSafetyLevelError] = useState(false);
  const [editSafetyLevelError, setEditSafetyLevelError] = useState(false);
  const [replenishQtyError, setReplenishQtyError] = useState(false);
  const [editReplenishQtyError, setEditReplenishQtyError] = useState(false);
  const [currentStockError, setCurrentStockError] = useState(false);

  // Fetch parts from Firestore
  useEffect(() => {
    const fetchParts = async () => {
      setLoading(true);
      try {
        const querySnapshot = await getDocs(collection(db, 'parts'));
        const data = querySnapshot.docs.map(doc => {
          const d = { ...doc.data(), id: doc.id };
          if (d.safetyLevel === undefined && d.minStockLevel !== undefined) {
            d.safetyLevel = d.minStockLevel;
          }
          // Backward compatibility: map legacy maxStockLevel to replenishQty
          if (d.replenishQty === undefined && d.maxStockLevel !== undefined) {
            d.replenishQty = d.maxStockLevel;
          }
          return d;
        });
        dispatch(setParts(data));
      } catch (error) {
        setSnackbar({ open: true, message: 'Fetch error', severity: 'error' });
      } finally {
        setLoading(false);
      }
    };
    fetchParts();
  }, [dispatch]);

  // Auto-generate SAP# whenever parts list changes
  useEffect(() => {
    if (parts.length > 0) {
      const sapNumbers = parts
        .map(p => p.sapNumber)
        .filter(s => s && /^7\d{6}$/.test(s))
        .map(s => parseInt(s, 10));
      let nextSap = '7000001';
      if (sapNumbers.length > 0) {
        const maxSap = Math.max(...sapNumbers);
        nextSap = (maxSap + 1).toString();
      }
      setCurrentRunningSap(nextSap);
      setForm(f => ({ ...f, sapNumber: nextSap }));
    } else {
      setCurrentRunningSap('7000001');
      setForm(f => ({ ...f, sapNumber: '7000001' }));
    }
  }, [parts]);

  // Derived state for unique categories (for filter dropdown)
  const categories = useMemo(() => [...new Set(parts.map(p => p.category).filter(Boolean))], [parts]);

  // Filtered parts
  const filteredParts = useMemo(() => {
    const filtered = parts.filter(p => {
      const matchesSearch = 
        (p.name && p.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (p.sapNumber && p.sapNumber.includes(searchQuery)) ||
        (p.internalRef && p.internalRef.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesCategory = filterCategory ? p.category === filterCategory : true;
      const matchesRackLevel = filterRackLevel ? p.rackLevel === filterRackLevel : true;
      
      return matchesSearch && matchesCategory && matchesRackLevel;
    });

    // Sort: low stock items at top, then by SAP# numerically
    return filtered.sort((a, b) => {
      // Parse SAP# for numeric comparison
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
  }, [parts, searchQuery, filterCategory, filterRackLevel]);

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
    const regex = /^([A-Z]{3}\s?\d{3}|[A-Z]{2}\s?\d{4})$/i;
    return regex.test(value);
  };
  
  // Add part
  const handleAddPart = async (force = false) => {
    // Reset all errors
    setSapError(false);
    setInternalRefError(false);
    setNameError(false);
    setCategoryError(false);
    setRackNumberError(false);
    setRackLevelError(false);
    
    // Validate all required fields
    let hasError = false;

    // Required checks: flag all empty fields at once
    if (!form.sapNumber || form.sapNumber.trim() === '') { setSapError(true); hasError = true; }
    if (!form.internalRef || form.internalRef.trim() === '') { setInternalRefError(true); hasError = true; }
    if (!form.name || form.name.trim() === '') { setNameError(true); hasError = true; }
    if (!form.category || form.category.trim() === '') { setCategoryError(true); hasError = true; }
    if (!form.rackNumber || form.rackNumber.trim() === '') { setRackNumberError(true); hasError = true; }
    if (!form.rackLevel || form.rackLevel.trim() === '') { setRackLevelError(true); hasError = true; }
    if (form.safetyLevel === '' || form.safetyLevel === null || form.safetyLevel === undefined) { setSafetyLevelError(true); hasError = true; }
    if (form.replenishQty === '' || form.replenishQty === null || form.replenishQty === undefined) { setReplenishQtyError(true); hasError = true; }
    if (form.currentStock === '' || form.currentStock === null || form.currentStock === undefined) { setCurrentStockError(true); hasError = true; }

    // If any required field is missing, show generic incomplete form message and stop
    if (hasError) {
      setSnackbar({ open: true, message: 'Incomplete Form. Please provide the missing information.', severity: 'error' });
      return;
    }
    
    if (!validateSapNumber(form.sapNumber)) {
      setSapError(true);
      setSnackbar({ open: true, message: 'SAP # must be 7 digits starting with 7', severity: 'error' });
      return;
    } else if (parts.some(p => p.sapNumber === form.sapNumber)) {
      setSapError(true);
      setSnackbar({ open: true, message: 'SAP # already exists', severity: 'error' });
      return;
    }
    // Check if SAP# is not the current running number and not forced
    if (!force && form.sapNumber !== currentRunningSap) {
      setSapDialogOpen(true);
      setPendingAdd(true);
      return;
    }
    
    if (!validateInternalRef(form.internalRef)) {
      setInternalRefError(true);
      setSnackbar({ open: true, message: 'Internal Ref No format: ABC123, AB1234, ABC 123, or AB 1234', severity: 'error' });
      return;
    } else if (parts.some(p => p.internalRef && p.internalRef.replace(/\s+/g, '').toUpperCase() === form.internalRef.replace(/\s+/g, '').toUpperCase())) {
      setInternalRefError(true);
      setSnackbar({ open: true, message: 'Internal Ref No already exists', severity: 'error' });
      return;
    }
    
    if (parts.some(p => p.name && p.name.trim().toLowerCase() === form.name.trim().toLowerCase())) {
      setNameError(true);
      setSnackbar({ open: true, message: 'Name already exists', severity: 'error' });
      return;
    }
    
    if (!validateRackNumber(form.rackNumber)) {
      setRackNumberError(true);
      setSnackbar({ open: true, message: 'Rack Number must be exactly 2 digits (e.g., 00, 01, 10)', severity: 'error' });
      return;
    }
    
    if (!validateRackLevel(form.rackLevel)) {
      setRackLevelError(true);
      setSnackbar({ open: true, message: 'Rack Level must be A, B, C, or D only', severity: 'error' });
      return;
    }

    // Safety Level required and must be 0 or above
    if (form.safetyLevel === '' || form.safetyLevel === null || form.safetyLevel === undefined) {
      setSafetyLevelError(true);
      setSnackbar({ open: true, message: 'Safety Level is required', severity: 'error' });
      return;
    }
    if (Number(form.safetyLevel) < 0) {
      setSafetyLevelError(true);
      setSnackbar({ open: true, message: 'Safety Level must be 0 or greater', severity: 'error' });
      return;
    }

    // Replenish Quantity required and must be 0 or above
    if (form.replenishQty === '' || form.replenishQty === null || form.replenishQty === undefined) {
      setReplenishQtyError(true);
      setSnackbar({ open: true, message: 'Replenish Quantity is required', severity: 'error' });
      return;
    }
    if (Number(form.replenishQty) < 0) {
      setReplenishQtyError(true);
      setSnackbar({ open: true, message: 'Replenish Quantity must be 0 or greater', severity: 'error' });
      return;
    }
    
    // No missing fields at this point; continue

    try {
      const newPart = {
        ...form,
        safetyLevel: Number(form.safetyLevel) || 0,
        replenishQty: Number(form.replenishQty) || 0,
        currentStock: Number(form.currentStock) || 0,
        createdAt: new Date().toISOString()
      };
      const docRef = await addDoc(collection(db, 'parts'), newPart);
      dispatch(addPart({ ...newPart, id: docRef.id }));
      setSnackbar({ open: true, message: 'Part added', severity: 'success' });
      // Auto-generate next SAP# after successful add
      const nextSapNumber = (parseInt(form.sapNumber, 10) + 1).toString();
      setForm({ sapNumber: nextSapNumber, internalRef: '', name: '', category: '', rackNumber: '', rackLevel: '', safetyLevel: '', replenishQty: '', currentStock: '' });
      setCurrentRunningSap(nextSapNumber);
    } catch (e) {
      setSnackbar({ open: true, message: 'Add failed', severity: 'error' });
    }
  };

  // SAP# mismatch dialog handlers
  const handleSapDialogClose = () => {
    setSapDialogOpen(false);
    setPendingAdd(false);
  };

  const handleSapDialogEditBack = () => {
    setForm(f => ({ ...f, sapNumber: currentRunningSap }));
    setSapDialogOpen(false);
    setPendingAdd(false);
  };
  
  const handleClear = () => {
    setForm(f => ({
      ...f,
      internalRef: '',
      name: '',
      category: '',
      rackNumber: '',
      rackLevel: '',
      safetyLevel: '',
      replenishQty: '',
      currentStock: ''
    }));
    setSapError(false);
    setInternalRefError(false);
    setNameError(false);
    setCategoryError(false);
    setRackNumberError(false);
    setRackLevelError(false);
    setSafetyLevelError(false);
    setReplenishQtyError(false);
    setCurrentStockError(false);
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
      rackLevel: part.rackLevel || '',
      safetyLevel: (part.safetyLevel ?? part.minStockLevel) || '',
      replenishQty: (part.replenishQty ?? part.maxStockLevel) || '',
      currentStock: part.currentStock || 0
    });
    setEditDialogOpen(true);
  };
  
  const handleEditClose = () => {
    setEditDialogOpen(false);
    setEditingId(null);
    setEditForm({ sapNumber: '', internalRef: '', name: '', category: '', rackNumber: '', rackLevel: '', safetyLevel: '', replenishQty: '', currentStock: 0 });
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

    // Check for duplicate part name (excluding current part)
    const duplicateName = parts.some(p => 
      p.id !== editingId && p.name.toLowerCase() === editForm.name.toLowerCase()
    );
    if (duplicateName) {
      return setSnackbar({ open: true, message: 'Part name already exists', severity: 'error' });
    }

    // Safety Level required and must be 0 or above on edit
    if (editForm.safetyLevel === '' || editForm.safetyLevel === null || editForm.safetyLevel === undefined) {
      setEditSafetyLevelError(true);
      return setSnackbar({ open: true, message: 'Safety Level is required', severity: 'error' });
    }
    if (Number(editForm.safetyLevel) < 0) {
      setEditSafetyLevelError(true);
      return setSnackbar({ open: true, message: 'Safety Level must be 0 or greater', severity: 'error' });
    }

    // Replenish Quantity required and must be 0 or above on edit
    if (editForm.replenishQty === '' || editForm.replenishQty === null || editForm.replenishQty === undefined) {
      setEditReplenishQtyError(true);
      return setSnackbar({ open: true, message: 'Replenish Quantity is required', severity: 'error' });
    }
    if (Number(editForm.replenishQty) < 0) {
      setEditReplenishQtyError(true);
      return setSnackbar({ open: true, message: 'Replenish Quantity must be 0 or greater', severity: 'error' });
    }
    
    setEditSapError(false);
    setEditRackNumberError(false);
    setEditRackLevelError(false);
    
    try {
      const updatedPart = {
        ...editForm,
        safetyLevel: Number(editForm.safetyLevel) || 0,
        replenishQty: Number(editForm.replenishQty) || 0,
        currentStock: Number(editForm.currentStock) || 0,
        updatedAt: new Date().toISOString()
      };
      await updateDoc(doc(db, 'parts', editingId), updatedPart);
      dispatch(updatePart({ ...updatedPart, id: editingId }));
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

  // Barcode scan handler
  const handleScan = (code) => {
    setSearchQuery(code);
    setSnackbar({ open: true, message: `Scanned: ${code}`, severity: 'info' });
  };

  // Barcode dialog handlers
  const handleBarcodeClick = (part) => {
    setBarcodeTarget(part);
    setBarcodeDialogOpen(true);
  };

  const handleBarcodeClose = () => {
    setBarcodeDialogOpen(false);
    setBarcodeTarget(null);
  };

  const pageParts = filteredParts.slice(pageStart, pageStart + pageSize);
  const total = filteredParts.length;
  const showingEnd = Math.min(pageStart + pageSize, total);
  const handlePrev = () => setPageStart(s => Math.max(0, s - pageSize));
  const handleNext = () => {
    if (pageStart + pageSize < total) setPageStart(s => s + pageSize);
  };

  return (
    <Box sx={{ m: 0, p: 0 }}>
      <Paper elevation={2} sx={{ p:2, mb:3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <h2 style={{ margin:0 }}>PART MASTER - ENGINEERING STORE SPARE PART</h2>
          <Box width="300px">
            <BarcodeScanner onScan={handleScan} label="Scan to Search" autoFocus={false} />
          </Box>
        </Box>
      </Paper>

      <Paper elevation={1} sx={{ p:2, mb:3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap" gap={2}>
          <h3 style={{ margin:0 }}>PART MASTER LIST ({filteredParts.length} ITEMS)</h3>
          <Box display="flex" gap={2}>
            <TextField 
              size="small" 
              label="Search" 
              value={searchQuery} 
              onChange={e => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment>,
              }}
            />
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Category</InputLabel>
              <Select value={filterCategory} label="Category" onChange={e => setFilterCategory(e.target.value)}>
                <MenuItem value=""><em>All</em></MenuItem>
                {categories.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Rack Level</InputLabel>
              <Select value={filterRackLevel} label="Rack Level" onChange={e => setFilterRackLevel(e.target.value)}>
                <MenuItem value=""><em>All</em></MenuItem>
                {['A', 'B', 'C', 'D'].map(l => <MenuItem key={l} value={l}>{l}</MenuItem>)}
              </Select>
            </FormControl>
          </Box>
        </Box>

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
                <TableCell>Safety Level</TableCell>
                <TableCell>Replenish Quantity</TableCell>
                <TableCell>Current Stock</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pageParts.map(p => {
                const isLowStock = (p.currentStock || 0) <= (p.safetyLevel || p.minStockLevel || 0);
                return (
                  <TableRow key={p.id} sx={{ bgcolor: isLowStock ? '#fff4e5' : 'inherit' }}>
                    <TableCell>{p.sapNumber}</TableCell>
                    <TableCell>{p.internalRef}</TableCell>
                    <TableCell>{p.name}</TableCell>
                    <TableCell>{p.category}</TableCell>
                    <TableCell>{p.rackNumber}</TableCell>
                    <TableCell>{p.rackLevel}</TableCell>
                    <TableCell>{(p.safetyLevel ?? p.minStockLevel) || 0}</TableCell>
                    <TableCell>{(p.replenishQty ?? p.maxStockLevel) || 0}</TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        {p.currentStock || 0}
                        {isLowStock && <Tooltip title="Low Stock"><WarningIcon color="warning" fontSize="small" /></Tooltip>}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Tooltip title="View Barcode">
                        <IconButton size="small" onClick={() => handleBarcodeClick(p)}>
                          <QrCodeIcon />
                        </IconButton>
                      </Tooltip>
                      <IconButton size="small" onClick={() => handleEditClick(p)}>
                        <EditIcon />
                      </IconButton>
                      <IconButton size="small" color="error" onClick={() => handleDeleteClick(p)}>
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                );
              })}
              {pageParts.length === 0 && (
                <TableRow><TableCell colSpan={10}>No parts found</TableCell></TableRow>
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
        <Box sx={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:2 }}>
          <TextField 
            label="SAP #" 
            value={form.sapNumber} 
            onChange={e => {
              const value = e.target.value;
              setForm(f => ({ ...f, sapNumber: value }));
              
              const isValidFormat = validateSapNumber(value);
              const isDuplicate = value && parts.some(p => p.sapNumber === value);
              setSapError(value && (!isValidFormat || isDuplicate));
            }}
            error={sapError}
            helperText={sapError ? (
              parts.some(p => p.sapNumber === form.sapNumber) 
                ? "SAP # already exists" 
                : "SAP # must be 7 digits starting with 7 (e.g., 7000001)"
            ) : "Auto-generated (editable)"}
            required 
            size="small"
          />
          <TextField 
            label="Internal Ref No" 
            value={form.internalRef} 
            onChange={e => {
              const value = e.target.value.toUpperCase();
              setForm(f => ({ ...f, internalRef: value }));
              
              const isValidFormat = validateInternalRef(value);
              const isDuplicate = value && parts.some(p => p.internalRef && p.internalRef.replace(/\s+/g, '').toUpperCase() === value.replace(/\s+/g, '').toUpperCase());
              setInternalRefError(value && (!isValidFormat || isDuplicate));
            }}
            error={internalRefError}
            helperText={internalRefError ? (
              parts.some(p => p.internalRef && p.internalRef.replace(/\s+/g, '').toUpperCase() === form.internalRef.replace(/\s+/g, '').toUpperCase())
                ? "Internal Ref No already exists"
                : "Format: ABC123, AB1234, ABC 123, or AB 1234"
            ) : ""}
            required
            inputProps={{ style: { textTransform: 'uppercase' } }}
            size="small"
          />
          <TextField 
            label="Name" 
            value={form.name} 
            onChange={e => {
              const value = e.target.value.toUpperCase();
              setForm(f => ({ ...f, name: value }));
              
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
            size="small"
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
            helperText={categoryError ? 'Category is required' : ''}
            required
            inputProps={{ style: { textTransform: 'uppercase' } }}
            size="small"
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
            size="small"
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
            helperText={rackLevelError ? (form.rackLevel ? 'Must be A, B, C, or D' : 'Rack Level is required') : ''}
            inputProps={{ maxLength: 1, style: { textTransform: 'uppercase' } }}
            required
            size="small"
          />
          <TextField 
            label="Safety Level" 
            type="number"
            value={form.safetyLevel} 
            onChange={e => {
              const value = e.target.value;
              setForm(f => ({ ...f, safetyLevel: value }));
              setSafetyLevelError(value === '' || Number(value) < 0);
            }}
            inputProps={{ min: 0 }}
            error={safetyLevelError}
            helperText={safetyLevelError ? (form.safetyLevel === '' ? 'Safety Level is required' : 'Must be 0 or greater') : ''}
            size="small"
            required
          />
          <TextField 
            label="Replenish Quantity" 
            type="number"
            value={form.replenishQty} 
            onChange={e => {
              const value = e.target.value;
              setForm(f => ({ ...f, replenishQty: value }));
              setReplenishQtyError(value === '' || Number(value) < 0);
            }}
            inputProps={{ min: 0 }}
            error={replenishQtyError}
            helperText={replenishQtyError ? (form.replenishQty === '' ? 'Replenish Quantity is required' : 'Must be 0 or greater') : ''}
            size="small"
            required
          />
          <TextField 
            label="Current Stock" 
            type="number"
            value={form.currentStock} 
            onChange={e => {
              const value = e.target.value;
              setForm(f => ({ ...f, currentStock: value }));
              setCurrentStockError(value === '');
            }}
            size="small"
            required
            error={currentStockError}
            helperText={currentStockError ? 'Current Stock is required' : ''}
          />
        </Box>
        <Box sx={{ mt:2 }}>
          <Button variant="contained" onClick={() => handleAddPart()} sx={{ mr:1 }}>ADD PART</Button>
          <Button variant="outlined" onClick={handleClear}>CLEAR</Button>
        </Box>
        {/* SAP# mismatch dialog */}
        <Dialog open={sapDialogOpen} onClose={handleSapDialogClose}>
          <DialogTitle>SAP # Sequence Mismatch</DialogTitle>
          <DialogContent>
            <Typography gutterBottom>
              The entered SAP # (<b>{form.sapNumber}</b>) does not match the current system sequence. The correct number to use is <b>{currentRunningSap}</b>. Please revise your entry.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleSapDialogEditBack} color="primary" autoFocus>Edit Back</Button>
          </DialogActions>
        </Dialog>
      </Paper>

      {/* Edit Part Dialog */}
      <Dialog open={editDialogOpen} onClose={handleEditClose} maxWidth="md" fullWidth>
        <DialogTitle>EDIT PART</DialogTitle>
        <DialogContent>
          <Box sx={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:2, mt:1 }}>
            <TextField 
              label="SAP #" 
              value={editForm.sapNumber} 
              disabled 
              fullWidth 
              error={editSapError}
              helperText={editSapError ? "SAP # must be 7 digits starting with 7" : ""}
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
              inputProps={{ maxLength: 1, style: { textTransform: 'uppercase' } }}
              fullWidth 
            />
            <TextField 
              label="Safety Level" 
              type="number"
              value={editForm.safetyLevel} 
              onChange={e => {
                const value = e.target.value;
                setEditForm(f => ({ ...f, safetyLevel: value }));
                setEditSafetyLevelError(value === '' || Number(value) < 0);
              }}
              inputProps={{ min: 0 }}
              error={editSafetyLevelError}
              helperText={editSafetyLevelError ? (editForm.safetyLevel === '' ? 'Safety Level is required' : 'Must be 0 or greater') : ''}
              fullWidth
              required
            />
            <TextField 
              label="Replenish Quantity" 
              type="number"
              value={editForm.replenishQty} 
              onChange={e => {
                const value = e.target.value;
                setEditForm(f => ({ ...f, replenishQty: value }));
                setEditReplenishQtyError(value === '' || Number(value) < 0);
              }}
              inputProps={{ min: 0 }}
              error={editReplenishQtyError}
              helperText={editReplenishQtyError ? (editForm.replenishQty === '' ? 'Replenish Quantity is required' : 'Must be 0 or greater') : ''}
              fullWidth
              required
            />
            <TextField 
              label="Current Stock" 
              type="number"
              value={editForm.currentStock} 
              onChange={e => setEditForm(f => ({ ...f, currentStock: e.target.value }))}
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
        <DialogTitle>Delete {deleteTarget?.name}?</DialogTitle>
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

      {/* Barcode Dialog */}
      <Dialog open={barcodeDialogOpen} onClose={handleBarcodeClose} maxWidth="sm" fullWidth>
        <DialogTitle>BARCODE</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4 }}>
            {barcodeTarget && (
              <>
                <Barcode value={barcodeTarget.sapNumber} />
                <Typography variant="h6" sx={{ mt: 2 }}>{barcodeTarget.name}</Typography>
                <Typography variant="body1" color="textSecondary">{barcodeTarget.internalRef}</Typography>
              </>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleBarcodeClose}>CLOSE</Button>
          <Button onClick={() => window.print()} variant="contained">PRINT</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar(s => ({ ...s, open: false }))} message={snackbar.message} />
    </Box>
  );
};

export default PartMaster;
