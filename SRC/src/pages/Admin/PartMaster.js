import React, { useEffect, useState, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { db } from '../../firebase/config';
import { collection, getDocs, addDoc, deleteDoc, updateDoc, doc, writeBatch } from 'firebase/firestore';
import { setParts, addPart, deletePart, updatePart } from '../../redux/partsSlice';
import { Button, Snackbar, TextField, Table, TableHead, TableRow, TableCell, TableBody, Paper, Box, Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Tooltip, Typography, MenuItem, Select, FormControl, InputLabel, InputAdornment, Chip, LinearProgress } from '@mui/material';
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
  const [csvImportDialogOpen, setCsvImportDialogOpen] = useState(false);
  const [csvFile, setCsvFile] = useState(null);
  const [csvPreview, setCsvPreview] = useState([]);
  const [csvErrors, setCsvErrors] = useState([]);
  const [cleanupDialogOpen, setCleanupDialogOpen] = useState(false);
  const [duplicatesFound, setDuplicatesFound] = useState([]);
  const [cleanupInProgress, setCleanupInProgress] = useState(false);
  const [cleanupProgress, setCleanupProgress] = useState(0);
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
    const sorted = filtered.sort((a, b) => {
      // Parse SAP# for numeric comparison
      const sapA = parseInt(a.sapNumber || '0') || 0;
      const sapB = parseInt(b.sapNumber || '0') || 0;
      
      // Determine if each is low stock (currentStock < safetyLevel)
      // Only consider low stock if safetyLevel > 0 (0 means safety level not set)
      const aHasValidSafety = (a.safetyLevel || 0) > 0;
      const bHasValidSafety = (b.safetyLevel || 0) > 0;
      const aIsLowStock = aHasValidSafety && (a.currentStock || 0) < (a.safetyLevel || 0);
      const bIsLowStock = bHasValidSafety && (b.currentStock || 0) < (b.safetyLevel || 0);
      
      // Low stock items come first
      if (aIsLowStock && !bIsLowStock) return -1;
      if (!aIsLowStock && bIsLowStock) return 1;
      
      // If both are low stock or both are not, sort by SAP# (descending - higher numbers at top)
      return sapB - sapA;
    });
    
    // Debug: log first 10 SAP numbers to verify sort order
    if (sorted.length > 0) {
      console.log('Filtered parts sort order (first 10):', sorted.slice(0, 10).map(p => ({ sap: p.sapNumber, stock: p.currentStock, safety: p.safetyLevel })));
    }
    
    return sorted;
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
  
  // Validate Internal Ref No (ABCD123, ABC123, AB123, AB1234, with optional spaces)
  const validateInternalRef = (value) => {
    if (!value) return false;
    const regex = /^([A-Z]{4}\s?\d{3}|[A-Z]{3}\s?\d{3}|[A-Z]{2}\s?\d{3}|[A-Z]{2}\s?\d{4})$/i;
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
      setSnackbar({ open: true, message: 'Internal Ref No format: ABCD123, ABC123, AB123, AB1234 (with or without space)', severity: 'error' });
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

  // CSV Import handler
  const handleCsvFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const csv = event.target.result;
        const lines = csv.split('\n').filter(line => line.trim());
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        
        // Required columns: sapNumber, internalRef, name, category, safetyLevel, replenishQty
        const requiredColumns = ['sapnumber', 'internalref', 'name', 'category', 'safetylevel', 'replenishqty'];
        const missingColumns = requiredColumns.filter(col => !headers.includes(col));
        
        if (missingColumns.length > 0) {
          setCsvErrors([`Missing required columns: ${missingColumns.join(', ')}`]);
          setCsvPreview([]);
          return;
        }
        
        const rows = [];
        const errors = [];
        const seenSapNumbers = new Set();
        const seenInternalRefs = new Set();
        const seenNames = new Set();
        
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.trim());
          const row = {};
          headers.forEach((h, idx) => {
            row[h] = values[idx] || '';
          });
          
          // Validate row
          const rowErrors = [];
          if (!row.sapnumber) rowErrors.push(`Row ${i}: SAP # is required`);
          else if (!/^7\d{6}$/.test(row.sapnumber)) rowErrors.push(`Row ${i}: SAP # must be 7 digits starting with 7`);
          else if (parts.some(p => p.sapNumber === row.sapnumber)) rowErrors.push(`Row ${i}: SAP # already exists in database`);
          else if (seenSapNumbers.has(row.sapnumber)) rowErrors.push(`Row ${i}: Duplicate SAP # within this file`);
          else seenSapNumbers.add(row.sapnumber);
          
          if (!row.internalref) rowErrors.push(`Row ${i}: Internal Ref No is required`);
          else if (!/^[A-Z]{2,4}\s?\d{3,4}$/.test(row.internalref.toUpperCase())) rowErrors.push(`Row ${i}: Invalid Internal Ref No format`);
          else {
            const normalizedRef = row.internalref.replace(/\s+/g, '').toUpperCase();
            if (parts.some(p => p.internalRef && p.internalRef.replace(/\s+/g, '').toUpperCase() === normalizedRef)) rowErrors.push(`Row ${i}: Internal Ref No already exists in database`);
            else if (seenInternalRefs.has(normalizedRef)) rowErrors.push(`Row ${i}: Duplicate Internal Ref within this file`);
            else seenInternalRefs.add(normalizedRef);
          }
          
          if (!row.name) rowErrors.push(`Row ${i}: Part Name is required`);
          else {
            const normalizedName = row.name.toLowerCase();
            if (parts.some(p => p.name.toLowerCase() === normalizedName)) rowErrors.push(`Row ${i}: Part Name already exists in database`);
            else if (seenNames.has(normalizedName)) rowErrors.push(`Row ${i}: Duplicate Part Name within this file`);
            else seenNames.add(normalizedName);
          }
          
          if (!row.category) rowErrors.push(`Row ${i}: Category is required`);
          if (!row.safetylevel || Number(row.safetylevel) < 0) rowErrors.push(`Row ${i}: Safety Level must be 0 or greater`);
          if (!row.replenishqty || Number(row.replenishqty) < 0) rowErrors.push(`Row ${i}: Replenish Quantity must be 0 or greater`);
          
          if (rowErrors.length > 0) {
            errors.push(...rowErrors);
          } else {
            rows.push({
              sapNumber: row.sapnumber,
              internalRef: row.internalref.toUpperCase(),
              name: row.name,
              category: row.category,
              rackNumber: '',
              rackLevel: '',
              safetyLevel: Number(row.safetylevel),
              replenishQty: Number(row.replenishqty),
              currentStock: Number(row.currentstock) || 0
            });
          }
        }
        
        setCsvPreview(rows);
        setCsvErrors(errors);
        setCsvFile(file);
      } catch (error) {
        setCsvErrors(['Error parsing CSV: ' + error.message]);
        setCsvPreview([]);
      }
    };
    reader.readAsText(file);
  };
  
  const handleBulkImport = async () => {
    if (csvErrors.length > 0) {
      setSnackbar({ open: true, message: 'Please fix errors before importing', severity: 'error' });
      return;
    }
    if (csvPreview.length === 0) {
      setSnackbar({ open: true, message: 'No valid rows to import', severity: 'error' });
      return;
    }
    
    try {
      const newParts = [];
      for (const row of csvPreview) {
        const docRef = await addDoc(collection(db, 'parts'), {
          ...row,
          createdAt: new Date().toISOString()
        });
        newParts.push({ ...row, id: docRef.id });
      }
      
      dispatch(setParts([...parts, ...newParts]));
      setSnackbar({ open: true, message: `Successfully imported ${newParts.length} parts`, severity: 'success' });
      setCsvImportDialogOpen(false);
      setCsvFile(null);
      setCsvPreview([]);
      setCsvErrors([]);
    } catch (error) {
      setSnackbar({ open: true, message: 'Import failed: ' + error.message, severity: 'error' });
    }
  };

  // Detect duplicates by SAP#
  const handleDetectDuplicates = () => {
    const sapMap = new Map();
    const dups = [];

    parts.forEach(part => {
      if (sapMap.has(part.sapNumber)) {
        if (!dups.find(d => d.sapNumber === part.sapNumber)) {
          dups.push({
            sapNumber: part.sapNumber,
            name: part.name,
            count: 2,
            ids: [sapMap.get(part.sapNumber), part.id]
          });
        } else {
          const existing = dups.find(d => d.sapNumber === part.sapNumber);
          existing.count += 1;
          existing.ids.push(part.id);
        }
      } else {
        sapMap.set(part.sapNumber, part.id);
      }
    });

    setDuplicatesFound(dups);
    setCleanupDialogOpen(true);

    if (dups.length === 0) {
      setSnackbar({ open: true, message: 'No duplicates found!', severity: 'success' });
    }
  };

  // Remove duplicate entries (keep first, delete others) - OPTIMIZED with batch operations
  const handleRemoveDuplicates = async () => {
    try {
      setCleanupInProgress(true);
      setCleanupProgress(0);
      
      // Collect all IDs to delete
      const allIdsToDelete = [];
      duplicatesFound.forEach(duplicate => {
        for (let i = 1; i < duplicate.ids.length; i++) {
          allIdsToDelete.push(duplicate.ids[i]);
        }
      });

      const totalToDelete = allIdsToDelete.length;
      let deletedCount = 0;

      // Firestore batch operations have a max of 500 operations per batch
      // So we'll create multiple batches if needed
      const batchSize = 100; // Conservative batch size for safety
      
      for (let i = 0; i < allIdsToDelete.length; i += batchSize) {
        const batch = writeBatch(db);
        const batchIds = allIdsToDelete.slice(i, Math.min(i + batchSize, allIdsToDelete.length));
        
        batchIds.forEach(id => {
          batch.delete(doc(db, 'parts', id));
        });
        
        // Commit batch
        await batch.commit();
        
        deletedCount += batchIds.length;
        setCleanupProgress(Math.round((deletedCount / totalToDelete) * 100));
        
        // Update Redux state for each batch
        batchIds.forEach(id => {
          dispatch(deletePart(id));
        });
      }

      setSnackbar({ open: true, message: `Successfully deleted ${deletedCount} duplicate entries`, severity: 'success' });
      setCleanupDialogOpen(false);
      setDuplicatesFound([]);
      setCleanupProgress(0);

      // Refresh the parts list
      const querySnapshot = await getDocs(collection(db, 'parts'));
      const data = querySnapshot.docs.map(d => ({ ...d.data(), id: d.id }));
      dispatch(setParts(data));
    } catch (error) {
      setSnackbar({ open: true, message: 'Error removing duplicates: ' + error.message, severity: 'error' });
      setCleanupProgress(0);
    } finally {
      setCleanupInProgress(false);
    }
  };

  // Find specific problematic SAP#s and show their exact positions
  const handleFindProblematicSaps = () => {
    const problematicSaps = ['7000259', '7000253', '7000240', '7000169', '7000168', '7000037'];
    console.log('=== FINDING PROBLEMATIC SAP#S IN FILTERED LIST ===');
    console.log('Total filtered parts:', filteredParts.length);
    
    const positions = [];
    filteredParts.forEach((p, idx) => {
      if (problematicSaps.includes(p.sapNumber)) {
        positions.push({
          position: idx + 1,
          sap: p.sapNumber,
          stock: p.currentStock,
          safety: p.safetyLevel,
          name: p.name
        });
      }
    });
    
    console.log('POSITIONS IN FILTERED LIST:');
    positions.forEach(p => {
      console.log(`Position ${p.position}: SAP ${p.sap} (${p.name}) - Stock: ${p.stock}, Safety: ${p.safety}`);
    });
    
    console.log('\nEXPECTED DESCENDING ORDER: 7000259 → 7000253 → 7000240 → 7000169 → 7000168 → 7000037');
    console.log('ACTUAL ORDER IN LIST:', positions.map(p => p.sap).join(' → '));
    
    alert(`Found ${positions.length}/6 problematic SAP#s. Check console for positions.`);
  };

  // Detect parts with invalid/zero safety levels
  const handleDetectInvalidSafety = () => {
    const invalidSafety = parts.filter(p => !p.safetyLevel || p.safetyLevel === 0);
    console.log('Parts with invalid/zero safety level:', invalidSafety.length);
    invalidSafety.forEach(p => {
      console.log(`- SAP: ${p.sapNumber}, Name: ${p.name}, Current Stock: ${p.currentStock}, Safety: ${p.safetyLevel}`);
    });
    setSnackbar({ open: true, message: `Found ${invalidSafety.length} parts with invalid safety levels (set to 0)`, severity: 'warning' });
  };

  // Debug: Verify current sort order
  const handleVerifySort = () => {
    console.log('=== SORT VERIFICATION ===');
    console.log('Total filtered parts:', filteredParts.length);
    
    // Show detailed info for each part
    const detailedInfo = filteredParts.slice(0, 30).map((p, i) => {
      const sapNum = parseInt(p.sapNumber || '0') || 0;
      const isLowStock = (p.currentStock || 0) < (p.safetyLevel || 0);
      return `${i+1}. SAP: ${p.sapNumber} (parsed: ${sapNum}, type: ${typeof p.sapNumber}, lowStock: ${isLowStock}, stock: ${p.currentStock}, safety: ${p.safetyLevel})`;
    });
    
    console.log('First 30 parts with details:\n' + detailedInfo.join('\n'));
    
    // Specifically check those problematic SAP#s
    const problematicSaps = ['7000259', '7000253', '7000240', '7000169', '7000168', '7000037'];
    const foundParts = filteredParts.filter(p => problematicSaps.includes(p.sapNumber));
    console.log('\n=== PROBLEMATIC SAP#S FOUND ===');
    console.log('Found in current list:', foundParts.length, 'of', problematicSaps.length);
    foundParts.forEach((p, i) => {
      const isLowStock = (p.currentStock || 0) < (p.safetyLevel || 0);
      console.log(`${i+1}. SAP: ${p.sapNumber}, Stock: ${p.currentStock}, Safety: ${p.safetyLevel}, LowStock: ${isLowStock}`);
    });
    
    alert(`Sort verification logged. Check console for details. Found ${foundParts.length}/6 problematic SAP#s`);
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
          <Box display="flex" gap={2} alignItems="center" flexWrap="wrap">
            <Button 
              variant="contained" 
              color="success"
              onClick={() => setCsvImportDialogOpen(true)}
              size="small"
            >
              IMPORT CSV
            </Button>
            <Button 
              variant="contained" 
              color="warning"
              onClick={handleDetectDuplicates}
              size="small"
            >
              CLEANUP DUPLICATES
            </Button>
            <Button 
              variant="outlined" 
              color="info"
              onClick={handleVerifySort}
              size="small"
            >
              VERIFY SORT
            </Button>
            <Button 
              variant="outlined" 
              color="warning"
              onClick={handleDetectInvalidSafety}
              size="small"
            >
              DETECT INVALID SAFETY
            </Button>
            <Button 
              variant="outlined" 
              color="error"
              onClick={handleFindProblematicSaps}
              size="small"
            >
              FIND PROBLEMATIC SAP#S
            </Button>
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
                : "Format: ABCD123, ABC123, AB123, AB1234 (with or without space)"
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

      {/* Duplicate Cleanup Dialog */}
      <Dialog open={cleanupDialogOpen} onClose={() => !cleanupInProgress && setCleanupDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>CLEANUP DUPLICATE PARTS</DialogTitle>
        <DialogContent sx={{ py: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {cleanupInProgress ? (
              <>
                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                  Deleting duplicates... {cleanupProgress}%
                </Typography>
                <Box sx={{ width: '100%' }}>
                  <LinearProgress 
                    variant="determinate" 
                    value={cleanupProgress}
                    sx={{ height: 10, borderRadius: 5 }}
                  />
                </Box>
                <Typography variant="body2" color="textSecondary">
                  Please wait while duplicate records are being removed from the database...
                </Typography>
              </>
            ) : duplicatesFound.length === 0 ? (
              <Typography variant="body2" color="textSecondary">
                Checking for duplicates...
              </Typography>
            ) : (
              <>
                <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#d32f2f' }}>
                  Found {duplicatesFound.length} duplicate SAP# entries
                </Typography>
                <Box sx={{ maxHeight: 300, overflowY: 'auto', border: '1px solid #e0e0e0', borderRadius: 1 }}>
                  <Table size="small">
                    <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 'bold' }}>SAP #</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Part Name</TableCell>
                        <TableCell sx={{ fontWeight: 'bold', textAlign: 'center' }}>Occurrences</TableCell>
                        <TableCell sx={{ fontWeight: 'bold', textAlign: 'center' }}>To Delete</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {duplicatesFound.map((dup, idx) => (
                        <TableRow key={idx} sx={{ backgroundColor: '#fff3e0' }}>
                          <TableCell>{dup.sapNumber}</TableCell>
                          <TableCell>{dup.name}</TableCell>
                          <TableCell sx={{ textAlign: 'center', color: '#d32f2f', fontWeight: 'bold' }}>
                            {dup.count}
                          </TableCell>
                          <TableCell sx={{ textAlign: 'center', color: '#d32f2f', fontWeight: 'bold' }}>
                            {dup.count - 1}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Box>
                <Typography variant="body2" color="error">
                  ⚠️ This will keep the first entry and delete {duplicatesFound.reduce((sum, d) => sum + (d.count - 1), 0)} duplicate record(s).
                </Typography>
              </>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button 
            onClick={() => setCleanupDialogOpen(false)} 
            variant="outlined"
            disabled={cleanupInProgress}
          >
            CANCEL
          </Button>
          {duplicatesFound.length > 0 && !cleanupInProgress && (
            <Button 
              onClick={handleRemoveDuplicates} 
              variant="contained"
              color="error"
            >
              DELETE {duplicatesFound.reduce((sum, d) => sum + (d.count - 1), 0)} DUPLICATES
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* CSV Import Dialog */}
      <Dialog open={csvImportDialogOpen} onClose={() => setCsvImportDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>IMPORT PARTS FROM CSV</DialogTitle>
        <DialogContent sx={{ py: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {csvPreview.length === 0 && csvErrors.length === 0 && (
              <>
                <Typography variant="body2" color="textSecondary">
                  CSV format should include columns: SAP Number, Internal Ref, Name, Category, Safety Level, Replenish Qty
                </Typography>
                <Box sx={{ border: '2px dashed #ccc', p: 3, textAlign: 'center', borderRadius: 1, cursor: 'pointer', '&:hover': { backgroundColor: '#f5f5f5' } }}>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleCsvFileSelect}
                    style={{ display: 'none' }}
                    id="csv-input"
                  />
                  <label htmlFor="csv-input" style={{ cursor: 'pointer', display: 'block' }}>
                    <Typography variant="h6">Click to select CSV file</Typography>
                    <Typography variant="body2" color="textSecondary">or drag and drop</Typography>
                  </label>
                </Box>
              </>
            )}

            {csvErrors.length > 0 && (
              <Box sx={{ backgroundColor: '#ffebee', p: 2, borderRadius: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#d32f2f', mb: 1 }}>
                  Errors found:
                </Typography>
                {csvErrors.map((error, idx) => (
                  <Typography key={idx} variant="body2" color="error">
                    • {error}
                  </Typography>
                ))}
              </Box>
            )}

            {csvPreview.length > 0 && (
              <>
                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                  Preview: {csvPreview.length} parts ready to import
                </Typography>
                <Box sx={{ maxHeight: 300, overflowY: 'auto', border: '1px solid #e0e0e0', borderRadius: 1 }}>
                  <Table size="small">
                    <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
                      <TableRow>
                        <TableCell>SAP #</TableCell>
                        <TableCell>Internal Ref</TableCell>
                        <TableCell>Name</TableCell>
                        <TableCell>Category</TableCell>
                        <TableCell>Safety Level</TableCell>
                        <TableCell>Replenish Qty</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {csvPreview.map((row, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{row.sapNumber}</TableCell>
                          <TableCell>{row.internalRef}</TableCell>
                          <TableCell>{row.name}</TableCell>
                          <TableCell>{row.category}</TableCell>
                          <TableCell>{row.safetyLevel}</TableCell>
                          <TableCell>{row.replenishQty}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Box>
              </>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button 
            onClick={() => {
              setCsvImportDialogOpen(false);
              setCsvFile(null);
              setCsvPreview([]);
              setCsvErrors([]);
            }} 
            variant="outlined"
          >
            CLOSE
          </Button>
          {csvPreview.length > 0 && (
            <Button 
              onClick={handleBulkImport} 
              variant="contained"
              color="success"
            >
              IMPORT {csvPreview.length} PARTS
            </Button>
          )}
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar(s => ({ ...s, open: false }))} message={snackbar.message} />
    </Box>
  );
};

export default PartMaster;
