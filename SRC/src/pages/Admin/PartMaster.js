import React, { useEffect, useState, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { db } from '../../firebase/config';
import { collection, getDocs, addDoc, deleteDoc, updateDoc, doc, writeBatch } from 'firebase/firestore';
import { setParts, addPart, deletePart, updatePart } from '../../redux/partsSlice';
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
  Select,
  FormControl,
  InputLabel,
  InputAdornment,
  Chip,
  LinearProgress,
  Grid,
  Card,
  CardContent,
  Divider,
  Stack,
  TablePagination,
  CircularProgress,
  Alert,
  Autocomplete,
  Badge,
  Avatar,
  Snackbar,
} from '@mui/material';
import Barcode from 'react-barcode';
import {
  QrCode as QrCodeIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Warning as WarningIcon,
  Inventory as InventoryIcon,
  Category as CategoryIcon,
  Storage as StorageIcon,
  Add as AddIcon,
  Clear as ClearIcon,
  FileUpload as FileUploadIcon,
  CleaningServices as CleaningServicesIcon,
  Print as PrintIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  FilterList as FilterListIcon,
  Numbers as NumbersIcon,
  Barcode as BarcodeIcon,
  Description as DescriptionIcon,
  LocalOffer as LocalOfferIcon,
  LocationOn as LocationOnIcon,
  SafetyDivider as SafetyDividerIcon,
  Replay as ReplayIcon,
  VerifiedUser as VerifiedUserIcon,
  Analytics as AnalyticsIcon,
} from '@mui/icons-material';
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
  
  // Pagination states
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
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
  
  // CSV Import states
  const [csvImportDialogOpen, setCsvImportDialogOpen] = useState(false);
  const [csvFile, setCsvFile] = useState(null);
  const [csvPreview, setCsvPreview] = useState([]);
  const [csvErrors, setCsvErrors] = useState([]);
  
  // Cleanup states
  const [cleanupDialogOpen, setCleanupDialogOpen] = useState(false);
  const [duplicatesFound, setDuplicatesFound] = useState([]);
  const [cleanupInProgress, setCleanupInProgress] = useState(false);
  const [cleanupProgress, setCleanupProgress] = useState(0);

  // Stats states
  const [stats, setStats] = useState({
    total: 0,
    lowStock: 0,
    zeroStock: 0,
    categories: 0,
    averageStock: 0,
  });

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
          if (d.replenishQty === undefined && d.maxStockLevel !== undefined) {
            d.replenishQty = d.maxStockLevel;
          }
          return d;
        });
        dispatch(setParts(data));
        calculateStats(data);
      } catch (error) {
        setSnackbar({ open: true, message: 'Error fetching parts data', severity: 'error' });
      } finally {
        setLoading(false);
      }
    };
    fetchParts();
  }, [dispatch]);

  // Calculate statistics
  const calculateStats = (data) => {
    const total = data.length;
    const lowStock = data.filter(p => (p.currentStock || 0) < (p.safetyLevel || 0)).length;
    const zeroStock = data.filter(p => (p.currentStock || 0) === 0).length;
    const categories = [...new Set(data.map(p => p.category).filter(Boolean))].length;
    const totalStock = data.reduce((sum, p) => sum + (p.currentStock || 0), 0);
    const averageStock = total > 0 ? Math.round(totalStock / total) : 0;

    setStats({
      total,
      lowStock,
      zeroStock,
      categories,
      averageStock,
    });
  };

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
      const sapA = parseInt(a.sapNumber || '0') || 0;
      const sapB = parseInt(b.sapNumber || '0') || 0;
      
      const aHasValidSafety = (a.safetyLevel || 0) > 0;
      const bHasValidSafety = (b.safetyLevel || 0) > 0;
      const aIsLowStock = aHasValidSafety && (a.currentStock || 0) < (a.safetyLevel || 0);
      const bIsLowStock = bHasValidSafety && (b.currentStock || 0) < (b.safetyLevel || 0);
      
      if (aIsLowStock && !bIsLowStock) return -1;
      if (!aIsLowStock && bIsLowStock) return 1;
      
      return sapB - sapA;
    });
    
    return sorted;
  }, [parts, searchQuery, filterCategory, filterRackLevel]);

  // Validate functions (keep as is)
  const validateSapNumber = (value) => /^7\d{6}$/.test(value);
  const validateRackNumber = (value) => !value || /^\d{2}$/.test(value);
  const validateRackLevel = (value) => !value || /^[ABCD]$/i.test(value);
  const validateInternalRef = (value) => {
    if (!value) return false;
    const regex = /^([A-Z]{4}\s?\d{3}|[A-Z]{3}\s?\d{3}|[A-Z]{2}\s?\d{3}|[A-Z]{2}\s?\d{4})$/i;
    return regex.test(value);
  };

  // Add part (keep functionality)
  const handleAddPart = async (force = false) => {
    setSapError(false);
    setInternalRefError(false);
    setNameError(false);
    setCategoryError(false);
    setRackNumberError(false);
    setRackLevelError(false);
    
    let hasError = false;
    if (!form.sapNumber || form.sapNumber.trim() === '') { setSapError(true); hasError = true; }
    if (!form.internalRef || form.internalRef.trim() === '') { setInternalRefError(true); hasError = true; }
    if (!form.name || form.name.trim() === '') { setNameError(true); hasError = true; }
    if (!form.category || form.category.trim() === '') { setCategoryError(true); hasError = true; }
    if (!form.rackNumber || form.rackNumber.trim() === '') { setRackNumberError(true); hasError = true; }
    if (!form.rackLevel || form.rackLevel.trim() === '') { setRackLevelError(true); hasError = true; }
    if (form.safetyLevel === '' || form.safetyLevel === null || form.safetyLevel === undefined) { setSafetyLevelError(true); hasError = true; }
    if (form.replenishQty === '' || form.replenishQty === null || form.replenishQty === undefined) { setReplenishQtyError(true); hasError = true; }
    if (form.currentStock === '' || form.currentStock === null || form.currentStock === undefined) { setCurrentStockError(true); hasError = true; }

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
      setSnackbar({ open: true, message: 'Part added successfully', severity: 'success' });
      const nextSapNumber = (parseInt(form.sapNumber, 10) + 1).toString();
      setForm({ sapNumber: nextSapNumber, internalRef: '', name: '', category: '', rackNumber: '', rackLevel: '', safetyLevel: '', replenishQty: '', currentStock: '' });
      setCurrentRunningSap(nextSapNumber);
      calculateStats([...parts, { ...newPart, id: docRef.id }]);
    } catch (e) {
      setSnackbar({ open: true, message: 'Failed to add part', severity: 'error' });
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
  
  // Edit handlers (keep functionality)
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

    const duplicateName = parts.some(p => 
      p.id !== editingId && p.name.toLowerCase() === editForm.name.toLowerCase()
    );
    if (duplicateName) {
      return setSnackbar({ open: true, message: 'Part name already exists', severity: 'error' });
    }

    if (editForm.safetyLevel === '' || editForm.safetyLevel === null || editForm.safetyLevel === undefined) {
      setEditSafetyLevelError(true);
      return setSnackbar({ open: true, message: 'Safety Level is required', severity: 'error' });
    }
    if (Number(editForm.safetyLevel) < 0) {
      setEditSafetyLevelError(true);
      return setSnackbar({ open: true, message: 'Safety Level must be 0 or greater', severity: 'error' });
    }

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
      setSnackbar({ open: true, message: 'Part updated successfully', severity: 'success' });
      handleEditClose();
      calculateStats(parts.map(p => p.id === editingId ? { ...updatedPart, id: editingId } : p));
    } catch (e) {
      setSnackbar({ open: true, message: 'Failed to update part', severity: 'error' });
    }
  };
  
  // Delete handlers (keep functionality)
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
      setSnackbar({ open: true, message: 'Part deleted successfully', severity: 'success' });
      handleDeleteClose();
      calculateStats(parts.filter(p => p.id !== deleteTarget.id));
    } catch (e) {
      setSnackbar({ open: true, message: 'Failed to delete part', severity: 'error' });
    }
  };

  // CSV Import handler (keep functionality)
  const handleCsvFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const csv = event.target.result;
        const lines = csv.split('\n').filter(line => line.trim());
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        
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
      calculateStats([...parts, ...newParts]);
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

  // Remove duplicate entries (keep first, delete others)
  const handleRemoveDuplicates = async () => {
    try {
      setCleanupInProgress(true);
      setCleanupProgress(0);
      
      const allIdsToDelete = [];
      duplicatesFound.forEach(duplicate => {
        for (let i = 1; i < duplicate.ids.length; i++) {
          allIdsToDelete.push(duplicate.ids[i]);
        }
      });

      const totalToDelete = allIdsToDelete.length;
      let deletedCount = 0;

      const batchSize = 100;
      
      for (let i = 0; i < allIdsToDelete.length; i += batchSize) {
        const batch = writeBatch(db);
        const batchIds = allIdsToDelete.slice(i, Math.min(i + batchSize, allIdsToDelete.length));
        
        batchIds.forEach(id => {
          batch.delete(doc(db, 'parts', id));
        });
        
        await batch.commit();
        
        deletedCount += batchIds.length;
        setCleanupProgress(Math.round((deletedCount / totalToDelete) * 100));
        
        batchIds.forEach(id => {
          dispatch(deletePart(id));
        });
      }

      setSnackbar({ open: true, message: `Successfully deleted ${deletedCount} duplicate entries`, severity: 'success' });
      setCleanupDialogOpen(false);
      setDuplicatesFound([]);
      setCleanupProgress(0);

      const querySnapshot = await getDocs(collection(db, 'parts'));
      const data = querySnapshot.docs.map(d => ({ ...d.data(), id: d.id }));
      dispatch(setParts(data));
      calculateStats(data);
    } catch (error) {
      setSnackbar({ open: true, message: 'Error removing duplicates: ' + error.message, severity: 'error' });
      setCleanupProgress(0);
    } finally {
      setCleanupInProgress(false);
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

  // Pagination handlers
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Get status color for low stock
  const getStockStatusColor = (stock, safety) => {
    if (stock === 0) return 'error';
    if (stock < safety) return 'warning';
    return 'success';
  };

  // Get stock status text
  const getStockStatusText = (stock, safety) => {
    if (stock === 0) return 'Out of Stock';
    if (stock < safety) return 'Low Stock';
    return 'In Stock';
  };

  // Refresh data
  const refreshData = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'parts'));
      const data = querySnapshot.docs.map(doc => {
        const d = { ...doc.data(), id: doc.id };
        if (d.safetyLevel === undefined && d.minStockLevel !== undefined) {
          d.safetyLevel = d.minStockLevel;
        }
        if (d.replenishQty === undefined && d.maxStockLevel !== undefined) {
          d.replenishQty = d.maxStockLevel;
        }
        return d;
      });
      dispatch(setParts(data));
      calculateStats(data);
      setSnackbar({ open: true, message: 'Data refreshed successfully', severity: 'success' });
    } catch (error) {
      setSnackbar({ open: true, message: 'Error refreshing data', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  if (loading && parts.length === 0) {
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
              background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
              color: 'white',
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
            }}>
              <InventoryIcon sx={{ fontSize: 28 }} />
            </Box>
            <Box>
              <Typography variant="h4" sx={{ 
                fontWeight: 700, 
                color: '#1e293b',
                mb: 0.5
              }}>
                Part Master
              </Typography>
              <Typography variant="body1" sx={{ color: '#64748b' }}>
                Engineering Store Spare Part Management
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
                  Total Parts
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 600, color: '#1e293b' }}>
                  {stats.total}
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
                <WarningIcon sx={{ color: '#f59e0b', fontSize: 18 }} />
                <Box>
                  <Typography variant="body2" sx={{ color: '#64748b' }}>
                    Low Stock
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: '#1e293b' }}>
                    {stats.lowStock}
                  </Typography>
                </Box>
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
                <CategoryIcon sx={{ color: '#10b981', fontSize: 18 }} />
                <Box>
                  <Typography variant="body2" sx={{ color: '#64748b' }}>
                    Categories
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: '#1e293b' }}>
                    {stats.categories}
                  </Typography>
                </Box>
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
                <StorageIcon sx={{ color: '#8b5cf6', fontSize: 18 }} />
                <Box>
                  <Typography variant="body2" sx={{ color: '#64748b' }}>
                    Avg Stock
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: '#1e293b' }}>
                    {stats.averageStock}
                  </Typography>
                </Box>
              </Box>
            </Card>
          </Box>
        </Box>

        {/* Search and Filter Section */}
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
            backgroundColor: '#eff6ff'
          }}>
            <Typography variant="h6" sx={{ 
              fontWeight: 600,
              color: '#1e293b',
              display: 'flex',
              alignItems: 'center',
              gap: 1
            }}>
              <SearchIcon sx={{ fontSize: 20, color: '#3b82f6' }} />
              Search & Filter Parts
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748b', mt: 0.5 }}>
              Find parts by name, SAP#, or other criteria
            </Typography>
          </Box>

          <Box sx={{ p: 3 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Search Parts"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name, SAP#, internal ref..."
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon sx={{ color: '#64748b' }} />
                      </InputAdornment>
                    ),
                    endAdornment: searchQuery && (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setSearchQuery('')} size="small">
                          <ClearIcon fontSize="small" />
                        </IconButton>
                      </InputAdornment>
                    )
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '10px',
                      backgroundColor: '#f8fafc',
                    }
                  }}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <Box sx={{ width: '100%' }}>
                  <BarcodeScanner 
                    onScan={handleScan} 
                    label="Scan Barcode" 
                    autoFocus={false}
                    size="small"
                    fullWidth
                  />
                </Box>
              </Grid>
              <Grid item xs={12} md={2}>
                <TextField
                  label="Category"
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  fullWidth
                  select
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '10px',
                      backgroundColor: '#f8fafc',
                    }
                  }}
                >
                  <MenuItem value="">All Categories</MenuItem>
                  {categories.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={12} md={2}>
                <TextField
                  label="Rack Level"
                  value={filterRackLevel}
                  onChange={(e) => setFilterRackLevel(e.target.value)}
                  fullWidth
                  select
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '10px',
                      backgroundColor: '#f8fafc',
                    }
                  }}
                >
                  <MenuItem value="">All Levels</MenuItem>
                  {['A', 'B', 'C', 'D'].map(l => <MenuItem key={l} value={l}>{l}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={12} md={1}>
                <Tooltip title="Refresh data">
                  <IconButton 
                    onClick={refreshData}
                    sx={{ 
                      color: '#3b82f6',
                      backgroundColor: 'white',
                      border: '1px solid #e2e8f0',
                      '&:hover': {
                        backgroundColor: '#eff6ff'
                      }
                    }}
                  >
                    <RefreshIcon />
                  </IconButton>
                </Tooltip>
              </Grid>
            </Grid>
          </Box>
        </Paper>

        {/* Parts List Section */}
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
            backgroundColor: '#eff6ff',
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
                <InventoryIcon sx={{ fontSize: 20, color: '#3b82f6' }} />
                Parts Master List
              </Typography>
              <Typography variant="body2" sx={{ color: '#64748b', mt: 0.5 }}>
                {filteredParts.length} parts found
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Tooltip title="Import CSV">
                <Button
                  variant="outlined"
                  startIcon={<FileUploadIcon />}
                  onClick={() => setCsvImportDialogOpen(true)}
                  size="small"
                  sx={{ 
                    borderRadius: '10px',
                    borderColor: '#e2e8f0',
                    color: '#64748b',
                    textTransform: 'none',
                    '&:hover': {
                      borderColor: '#3b82f6',
                      color: '#3b82f6'
                    }
                  }}
                >
                  Import
                </Button>
              </Tooltip>
              <Tooltip title="Cleanup Duplicates">
                <Button
                  variant="outlined"
                  startIcon={<CleaningServicesIcon />}
                  onClick={handleDetectDuplicates}
                  size="small"
                  sx={{ 
                    borderRadius: '10px',
                    borderColor: '#e2e8f0',
                    color: '#64748b',
                    textTransform: 'none',
                    '&:hover': {
                      borderColor: '#f59e0b',
                      color: '#f59e0b'
                    }
                  }}
                >
                  Cleanup
                </Button>
              </Tooltip>
            </Box>
          </Box>

          {/* Parts Table */}
          {loading ? (
            <Box sx={{ p: 6, textAlign: 'center' }}>
              <CircularProgress />
            </Box>
          ) : filteredParts.length === 0 ? (
            <Box sx={{ 
              p: 6, 
              textAlign: 'center',
              color: '#94a3b8'
            }}>
              <InventoryIcon sx={{ fontSize: 64, mb: 2, opacity: 0.5 }} />
              <Typography variant="h6" sx={{ mb: 1 }}>
                No parts found
              </Typography>
              <Typography variant="body2">
                {parts.length === 0 ? 
                  "No parts found. Add your first part below." :
                  "No parts match your search criteria. Try changing your filters."}
              </Typography>
            </Box>
          ) : (
            <>
              <Box sx={{ overflowX: 'auto' }}>
                <Table sx={{ minWidth: 1200 }}>
                  <TableHead sx={{ backgroundColor: '#f8fafc' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>SAP#</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Internal Ref</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Part Name</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Category</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Location</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Safety Level</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Replenish Qty</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Current Stock</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredParts
                      .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                      .map((p) => {
                        const safetyLevel = (p.safetyLevel ?? p.minStockLevel) || 0;
                        const currentStock = p.currentStock || 0;
                        const isLowStock = currentStock < safetyLevel;
                        const isZeroStock = currentStock === 0;
                        
                        return (
                          <TableRow key={p.id} hover sx={{ 
                            backgroundColor: isZeroStock ? '#fef2f2' : isLowStock ? '#fffbeb' : 'inherit'
                          }}>
                            <TableCell>
                              <Typography variant="body2" sx={{ fontWeight: 600, color: '#1e293b' }}>
                                {p.sapNumber}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Chip 
                                label={p.internalRef || '—'}
                                size="small"
                                variant="outlined"
                                sx={{ fontWeight: 500 }}
                              />
                            </TableCell>
                            <TableCell>{p.name}</TableCell>
                            <TableCell>
                              <Chip 
                                label={p.category || '—'}
                                size="small"
                                color="primary"
                                variant="outlined"
                                sx={{ fontWeight: 500 }}
                              />
                            </TableCell>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                  {p.rackNumber || '—'}
                                </Typography>
                                {p.rackLevel && (
                                  <Chip 
                                    label={`Lvl ${p.rackLevel}`}
                                    size="small"
                                    variant="outlined"
                                    color="secondary"
                                  />
                                )}
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" sx={{ color: '#64748b' }}>
                                {safetyLevel}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" sx={{ color: '#64748b' }}>
                                {(p.replenishQty ?? p.maxStockLevel) || 0}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                  {currentStock}
                                </Typography>
                                {(isLowStock || isZeroStock) && (
                                  <Tooltip title={isZeroStock ? "Out of Stock" : "Low Stock"}>
                                    <WarningIcon color={isZeroStock ? "error" : "warning"} fontSize="small" />
                                  </Tooltip>
                                )}
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Chip 
                                label={getStockStatusText(currentStock, safetyLevel)}
                                color={getStockStatusColor(currentStock, safetyLevel)}
                                size="small"
                                sx={{ fontWeight: 600, minWidth: 100 }}
                              />
                            </TableCell>
                            <TableCell>
                              <Box sx={{ display: 'flex', gap: 0.5 }}>
                                <Tooltip title="View Barcode">
                                  <IconButton
                                    size="small"
                                    onClick={() => handleBarcodeClick(p)}
                                    sx={{ 
                                      color: '#3b82f6',
                                      '&:hover': { backgroundColor: '#eff6ff' }
                                    }}
                                  >
                                    <QrCodeIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Edit Part">
                                  <IconButton
                                    size="small"
                                    onClick={() => handleEditClick(p)}
                                    sx={{ 
                                      color: '#f59e0b',
                                      '&:hover': { backgroundColor: '#fffbeb' }
                                    }}
                                  >
                                    <EditIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Delete Part">
                                  <IconButton
                                    size="small"
                                    color="error"
                                    onClick={() => handleDeleteClick(p)}
                                    sx={{ 
                                      '&:hover': { backgroundColor: '#fef2f2' }
                                    }}
                                  >
                                    <DeleteIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </Box>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                  </TableBody>
                </Table>
              </Box>

              {/* Pagination */}
              <TablePagination
                rowsPerPageOptions={[10, 25, 50, 100]}
                component="div"
                count={filteredParts.length}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                sx={{ 
                  borderTop: '1px solid #e2e8f0',
                  '& .MuiTablePagination-toolbar': {
                    padding: 2
                  }
                }}
              />
            </>
          )}
        </Paper>

        {/* New Part Entry Section */}
        <Paper elevation={0} sx={{ 
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
          backgroundColor: 'white',
          width: '100%'
        }}>
          <Box sx={{ 
            p: 3, 
            borderBottom: '1px solid #e2e8f0',
            backgroundColor: '#eff6ff'
          }}>
            <Typography variant="h6" sx={{ 
              fontWeight: 600,
              color: '#1e293b',
              display: 'flex',
              alignItems: 'center',
              gap: 1
            }}>
              <AddIcon sx={{ fontSize: 20, color: '#3b82f6' }} />
              New Part Entry
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748b', mt: 0.5 }}>
              Fill in the details below to add a new part
            </Typography>
          </Box>

          <Box sx={{ p: 4 }}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6} lg={3}>
                <TextField
                  label="SAP #"
                  value={form.sapNumber}
                  onChange={(e) => {
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
                  fullWidth
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <NumbersIcon sx={{ color: '#64748b' }} />
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '10px',
                      backgroundColor: '#f8fafc',
                    }
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6} lg={3}>
                <TextField
                  label="Internal Ref No"
                  value={form.internalRef}
                  onChange={(e) => {
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
                      : "Format: ABCD123, ABC123, AB123, AB1234"
                  ) : ""}
                  required
                  fullWidth
                  inputProps={{ style: { textTransform: 'uppercase' } }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LocalOfferIcon sx={{ color: '#64748b' }} />
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '10px',
                      backgroundColor: '#f8fafc',
                    }
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6} lg={3}>
                <TextField
                  label="Part Name"
                  value={form.name}
                  onChange={(e) => {
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
                  fullWidth
                  inputProps={{ style: { textTransform: 'uppercase' } }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <DescriptionIcon sx={{ color: '#64748b' }} />
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '10px',
                      backgroundColor: '#f8fafc',
                    }
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6} lg={3}>
                <TextField
                  label="Category"
                  value={form.category}
                  onChange={(e) => {
                    const value = e.target.value.toUpperCase();
                    setForm(f => ({ ...f, category: value }));
                    setCategoryError(!value || value.trim() === '');
                  }}
                  error={categoryError}
                  helperText={categoryError ? 'Category is required' : ''}
                  required
                  fullWidth
                  inputProps={{ style: { textTransform: 'uppercase' } }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <CategoryIcon sx={{ color: '#64748b' }} />
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '10px',
                      backgroundColor: '#f8fafc',
                    }
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6} lg={3}>
                <TextField
                  label="Rack Number"
                  value={form.rackNumber}
                  onChange={(e) => {
                    const value = e.target.value;
                    setForm(f => ({ ...f, rackNumber: value }));
                    setRackNumberError(value && !validateRackNumber(value));
                  }}
                  error={rackNumberError}
                  helperText={rackNumberError ? (form.rackNumber ? "Must be exactly 2 digits" : "Rack Number is required") : ""}
                  required
                  fullWidth
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LocationOnIcon sx={{ color: '#64748b' }} />
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '10px',
                      backgroundColor: '#f8fafc',
                    }
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6} lg={3}>
                <TextField
                  label="Rack Level"
                  value={form.rackLevel}
                  onChange={(e) => {
                    const value = e.target.value.toUpperCase();
                    setForm(f => ({ ...f, rackLevel: value }));
                    setRackLevelError(value && !validateRackLevel(value));
                  }}
                  error={rackLevelError}
                  helperText={rackLevelError ? (form.rackLevel ? 'Must be A, B, C, or D' : 'Rack Level is required') : ''}
                  inputProps={{ maxLength: 1, style: { textTransform: 'uppercase' } }}
                  required
                  fullWidth
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <StorageIcon sx={{ color: '#64748b' }} />
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '10px',
                      backgroundColor: '#f8fafc',
                    }
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6} lg={2}>
                <TextField
                  label="Safety Level"
                  type="number"
                  value={form.safetyLevel}
                  onChange={(e) => {
                    const value = e.target.value;
                    setForm(f => ({ ...f, safetyLevel: value }));
                    setSafetyLevelError(value === '' || Number(value) < 0);
                  }}
                  inputProps={{ min: 0 }}
                  error={safetyLevelError}
                  helperText={safetyLevelError ? (form.safetyLevel === '' ? 'Required' : 'Must be ≥ 0') : ''}
                  required
                  fullWidth
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SafetyDividerIcon sx={{ color: '#64748b' }} />
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '10px',
                      backgroundColor: '#f8fafc',
                    }
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6} lg={2}>
                <TextField
                  label="Replenish Qty"
                  type="number"
                  value={form.replenishQty}
                  onChange={(e) => {
                    const value = e.target.value;
                    setForm(f => ({ ...f, replenishQty: value }));
                    setReplenishQtyError(value === '' || Number(value) < 0);
                  }}
                  inputProps={{ min: 0 }}
                  error={replenishQtyError}
                  helperText={replenishQtyError ? (form.replenishQty === '' ? 'Required' : 'Must be ≥ 0') : ''}
                  required
                  fullWidth
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <ReplayIcon sx={{ color: '#64748b' }} />
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '10px',
                      backgroundColor: '#f8fafc',
                    }
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6} lg={2}>
                <TextField
                  label="Current Stock"
                  type="number"
                  value={form.currentStock}
                  onChange={(e) => {
                    const value = e.target.value;
                    setForm(f => ({ ...f, currentStock: value }));
                    setCurrentStockError(value === '');
                  }}
                  required
                  fullWidth
                  error={currentStockError}
                  helperText={currentStockError ? 'Current Stock is required' : ''}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <InventoryIcon sx={{ color: '#64748b' }} />
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '10px',
                      backgroundColor: '#f8fafc',
                    }
                  }}
                />
              </Grid>
            </Grid>

            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'center',
              gap: 2,
              pt: 4,
              mt: 2,
              borderTop: '1px solid #e2e8f0'
            }}>
              <Button 
                variant="contained"
                onClick={() => handleAddPart()}
                startIcon={<AddIcon />}
                sx={{ 
                  minWidth: 200,
                  background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                  px: 4,
                  py: 1.5,
                  fontWeight: 600,
                  fontSize: '1rem',
                  borderRadius: '10px',
                  textTransform: 'none',
                  boxShadow: '0 4px 14px rgba(59, 130, 246, 0.4)',
                  '&:hover': {
                    boxShadow: '0 6px 20px rgba(59, 130, 246, 0.6)',
                    transform: 'translateY(-2px)'
                  },
                  '&:disabled': {
                    background: '#e2e8f0',
                    color: '#94a3b8'
                  }
                }}
              >
                Add Part
              </Button>
              <Button 
                variant="outlined"
                onClick={handleClear}
                startIcon={<ClearIcon />}
                sx={{ 
                  px: 4,
                  py: 1.5,
                  borderRadius: '10px',
                  textTransform: 'none',
                  borderColor: '#e2e8f0',
                  color: '#64748b',
                  '&:hover': {
                    borderColor: '#3b82f6',
                    color: '#3b82f6'
                  }
                }}
              >
                Clear Form
              </Button>
            </Box>
          </Box>
        </Paper>
      </Box>

      {/* Enhanced SAP# Mismatch Dialog */}
      <Dialog 
        open={sapDialogOpen} 
        onClose={handleSapDialogClose}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '12px',
            overflow: 'hidden'
          }
        }}
      >
        <DialogTitle sx={{ 
          pb: 1, 
          borderBottom: '1px solid #e2e8f0',
          backgroundColor: '#fffbeb'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <WarningIcon sx={{ color: '#f59e0b' }} />
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#1e293b' }}>
              SAP # Sequence Mismatch
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ py: 3 }}>
          <Alert 
            severity="warning" 
            sx={{ 
              mb: 3,
              borderRadius: '10px',
              backgroundColor: '#fffbeb',
              border: '1px solid #fde68a'
            }}
          >
            <Typography variant="body2" sx={{ fontWeight: 600, color: '#92400e' }}>
              Sequence Mismatch Detected
            </Typography>
            <Typography variant="body2" sx={{ color: '#92400e', mt: 0.5 }}>
              Your entered SAP# doesn't follow the sequential order.
            </Typography>
          </Alert>
          <Box sx={{ p: 2, backgroundColor: '#f8fafc', borderRadius: '10px' }}>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 500 }}>
                  Entered SAP#
                </Typography>
                <Typography variant="h6" sx={{ color: '#ef4444', fontWeight: 600 }}>
                  {form.sapNumber}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 500 }}>
                  Expected SAP#
                </Typography>
                <Typography variant="h6" sx={{ color: '#10b981', fontWeight: 600 }}>
                  {currentRunningSap}
                </Typography>
              </Grid>
            </Grid>
          </Box>
          <Typography variant="body2" sx={{ color: '#64748b', mt: 3 }}>
            To maintain sequential integrity, please use the expected SAP#. 
            This helps prevent gaps in the numbering system.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ 
          p: 2, 
          borderTop: '1px solid #e2e8f0',
          backgroundColor: '#f8fafc'
        }}>
          <Button 
            onClick={handleSapDialogClose}
            variant="outlined"
            sx={{ 
              borderRadius: '10px',
              borderColor: '#e2e8f0',
              color: '#64748b',
              textTransform: 'none'
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSapDialogEditBack}
            variant="contained"
            sx={{ 
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              textTransform: 'none',
              fontWeight: 600
            }}
            autoFocus
          >
            Use {currentRunningSap}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Enhanced Edit Part Dialog */}
      <Dialog 
        open={editDialogOpen} 
        onClose={handleEditClose}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '12px',
            overflow: 'hidden'
          }
        }}
      >
        <DialogTitle sx={{ 
          pb: 1, 
          borderBottom: '1px solid #e2e8f0',
          backgroundColor: '#eff6ff'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <EditIcon sx={{ color: '#3b82f6' }} />
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#1e293b' }}>
              Edit Part Details
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ py: 3 }}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                label="SAP #"
                value={editForm.sapNumber}
                disabled
                fullWidth
                error={editSapError}
                helperText={editSapError ? "SAP # must be 7 digits starting with 7" : ""}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '10px',
                    backgroundColor: '#f8fafc',
                  }
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Internal Ref No"
                value={editForm.internalRef}
                onChange={(e) => setEditForm(f => ({ ...f, internalRef: e.target.value }))}
                fullWidth
                inputProps={{ style: { textTransform: 'uppercase' } }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '10px',
                    backgroundColor: '#f8fafc',
                  }
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Part Name"
                value={editForm.name}
                onChange={(e) => setEditForm(f => ({ ...f, name: e.target.value.toUpperCase() }))}
                fullWidth
                inputProps={{ style: { textTransform: 'uppercase' } }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '10px',
                    backgroundColor: '#f8fafc',
                  }
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Category"
                value={editForm.category}
                onChange={(e) => setEditForm(f => ({ ...f, category: e.target.value.toUpperCase() }))}
                fullWidth
                inputProps={{ style: { textTransform: 'uppercase' } }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '10px',
                    backgroundColor: '#f8fafc',
                  }
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Rack Number"
                value={editForm.rackNumber}
                onChange={(e) => {
                  const value = e.target.value;
                  setEditForm(f => ({ ...f, rackNumber: value }));
                  setEditRackNumberError(value && !validateRackNumber(value));
                }}
                error={editRackNumberError}
                helperText={editRackNumberError ? "Must be exactly 2 digits" : ""}
                fullWidth
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '10px',
                    backgroundColor: '#f8fafc',
                  }
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Rack Level"
                value={editForm.rackLevel}
                onChange={(e) => {
                  const value = e.target.value.toUpperCase();
                  setEditForm(f => ({ ...f, rackLevel: value }));
                  setEditRackLevelError(value && !validateRackLevel(value));
                }}
                error={editRackLevelError}
                inputProps={{ maxLength: 1, style: { textTransform: 'uppercase' } }}
                fullWidth
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '10px',
                    backgroundColor: '#f8fafc',
                  }
                }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                label="Safety Level"
                type="number"
                value={editForm.safetyLevel}
                onChange={(e) => {
                  const value = e.target.value;
                  setEditForm(f => ({ ...f, safetyLevel: value }));
                  setEditSafetyLevelError(value === '' || Number(value) < 0);
                }}
                inputProps={{ min: 0 }}
                error={editSafetyLevelError}
                helperText={editSafetyLevelError ? (editForm.safetyLevel === '' ? 'Required' : 'Must be ≥ 0') : ''}
                fullWidth
                required
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '10px',
                    backgroundColor: '#f8fafc',
                  }
                }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                label="Replenish Quantity"
                type="number"
                value={editForm.replenishQty}
                onChange={(e) => {
                  const value = e.target.value;
                  setEditForm(f => ({ ...f, replenishQty: value }));
                  setEditReplenishQtyError(value === '' || Number(value) < 0);
                }}
                inputProps={{ min: 0 }}
                error={editReplenishQtyError}
                helperText={editReplenishQtyError ? (editForm.replenishQty === '' ? 'Required' : 'Must be ≥ 0') : ''}
                fullWidth
                required
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '10px',
                    backgroundColor: '#f8fafc',
                  }
                }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                label="Current Stock"
                type="number"
                value={editForm.currentStock}
                onChange={(e) => setEditForm(f => ({ ...f, currentStock: e.target.value }))}
                fullWidth
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '10px',
                    backgroundColor: '#f8fafc',
                  }
                }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ 
          p: 2, 
          borderTop: '1px solid #e2e8f0',
          backgroundColor: '#f8fafc'
        }}>
          <Button 
            onClick={handleEditClose}
            variant="outlined"
            sx={{ 
              borderRadius: '10px',
              borderColor: '#e2e8f0',
              color: '#64748b',
              textTransform: 'none'
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSaveChanges}
            variant="contained"
            sx={{ 
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
              textTransform: 'none',
              fontWeight: 600
            }}
          >
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

      {/* Enhanced Delete Confirmation Dialog */}
      <Dialog 
        open={deleteDialogOpen} 
        onClose={handleDeleteClose}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '12px',
            overflow: 'hidden'
          }
        }}
      >
        <DialogTitle sx={{ 
          pb: 1, 
          borderBottom: '1px solid #e2e8f0',
          backgroundColor: '#fef2f2'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <WarningIcon sx={{ color: '#ef4444' }} />
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#1e293b' }}>
              Confirm Delete
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ py: 3 }}>
          <Alert 
            severity="error" 
            sx={{ 
              mb: 3,
              borderRadius: '10px',
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca'
            }}
          >
            <Typography variant="body2" sx={{ fontWeight: 600, color: '#991b1b' }}>
              This action cannot be undone
            </Typography>
          </Alert>
          
          {deleteTarget && (
            <Box sx={{ p: 2, backgroundColor: '#f8fafc', borderRadius: '10px' }}>
              <Typography variant="subtitle2" sx={{ color: '#64748b', mb: 2 }}>
                You are about to delete:
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="body2" sx={{ color: '#64748b' }}>
                    SAP #
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600, color: '#1e293b' }}>
                    {deleteTarget.sapNumber}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" sx={{ color: '#64748b' }}>
                    Internal Ref
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600, color: '#1e293b' }}>
                    {deleteTarget.internalRef || '—'}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="body2" sx={{ color: '#64748b' }}>
                    Part Name
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600, color: '#1e293b' }}>
                    {deleteTarget.name}
                  </Typography>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ 
          p: 2, 
          borderTop: '1px solid #e2e8f0',
          backgroundColor: '#f8fafc'
        }}>
          <Button 
            onClick={handleDeleteClose}
            variant="outlined"
            sx={{ 
              borderRadius: '10px',
              borderColor: '#e2e8f0',
              color: '#64748b',
              textTransform: 'none'
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleConfirmDelete}
            variant="contained"
            color="error"
            sx={{ 
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
              textTransform: 'none',
              fontWeight: 600
            }}
          >
            Delete Part
          </Button>
        </DialogActions>
      </Dialog>

      {/* Enhanced Barcode Dialog */}
      <Dialog 
        open={barcodeDialogOpen} 
        onClose={handleBarcodeClose}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '12px',
            overflow: 'hidden'
          }
        }}
      >
        <DialogTitle sx={{ 
          pb: 1, 
          borderBottom: '1px solid #e2e8f0',
          backgroundColor: '#eff6ff'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <QrCodeIcon sx={{ color: '#3b82f6' }} />
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#1e293b' }}>
              Barcode / QR Code
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ py: 4 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {barcodeTarget && (
              <>
                <Box sx={{ 
                  p: 3, 
                  border: '1px solid #e2e8f0', 
                  borderRadius: '10px',
                  backgroundColor: 'white',
                  mb: 3
                }}>
                  <Barcode 
                    value={barcodeTarget.sapNumber} 
                    width={2}
                    height={80}
                    fontSize={14}
                  />
                </Box>
                <Box sx={{ textAlign: 'center', width: '100%' }}>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: '#1e293b', mb: 1 }}>
                    {barcodeTarget.name}
                  </Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'center', gap: 3, mb: 2 }}>
                    <Chip 
                      label={`SAP: ${barcodeTarget.sapNumber}`}
                      color="primary"
                      variant="outlined"
                    />
                    <Chip 
                      label={`Ref: ${barcodeTarget.internalRef || '—'}`}
                      color="secondary"
                      variant="outlined"
                    />
                  </Box>
                  <Typography variant="body2" sx={{ color: '#64748b' }}>
                    Category: {barcodeTarget.category || '—'} | 
                    Location: Rack {barcodeTarget.rackNumber || '—'} Level {barcodeTarget.rackLevel || '—'}
                  </Typography>
                </Box>
              </>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ 
          p: 2, 
          borderTop: '1px solid #e2e8f0',
          backgroundColor: '#f8fafc'
        }}>
          <Button 
            onClick={handleBarcodeClose}
            variant="outlined"
            sx={{ 
              borderRadius: '10px',
              borderColor: '#e2e8f0',
              color: '#64748b',
              textTransform: 'none'
            }}
          >
            Close
          </Button>
          <Button 
            onClick={() => window.print()}
            variant="contained"
            startIcon={<PrintIcon />}
            sx={{ 
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
              textTransform: 'none',
              fontWeight: 600
            }}
          >
            Print
          </Button>
        </DialogActions>
      </Dialog>

      {/* Enhanced Duplicate Cleanup Dialog */}
      <Dialog 
        open={cleanupDialogOpen} 
        onClose={() => !cleanupInProgress && setCleanupDialogOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '12px',
            overflow: 'hidden'
          }
        }}
      >
        <DialogTitle sx={{ 
          pb: 1, 
          borderBottom: '1px solid #e2e8f0',
          backgroundColor: '#fffbeb'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CleaningServicesIcon sx={{ color: '#f59e0b' }} />
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#1e293b' }}>
              Duplicate Parts Cleanup
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ py: 3 }}>
          {cleanupInProgress ? (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <CircularProgress size={60} thickness={4} sx={{ mb: 3, color: '#f59e0b' }} />
              <Typography variant="h6" sx={{ fontWeight: 600, color: '#1e293b', mb: 1 }}>
                Removing Duplicates...
              </Typography>
              <Typography variant="body2" sx={{ color: '#64748b', mb: 3 }}>
                Please wait while duplicate records are being cleaned up.
              </Typography>
              <Box sx={{ width: '100%', mb: 2 }}>
                <LinearProgress 
                  variant="determinate" 
                  value={cleanupProgress}
                  sx={{ 
                    height: 10, 
                    borderRadius: 5,
                    backgroundColor: '#e2e8f0',
                    '& .MuiLinearProgress-bar': {
                      background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                      borderRadius: 5
                    }
                  }}
                />
              </Box>
              <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 500 }}>
                Progress: {cleanupProgress}%
              </Typography>
            </Box>
          ) : duplicatesFound.length === 0 ? (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <CheckCircleIcon sx={{ fontSize: 64, color: '#10b981', mb: 2 }} />
              <Typography variant="h6" sx={{ fontWeight: 600, color: '#1e293b', mb: 1 }}>
                No Duplicates Found!
              </Typography>
              <Typography variant="body2" sx={{ color: '#64748b' }}>
                Your parts database is clean and contains no duplicate SAP# entries.
              </Typography>
            </Box>
          ) : (
            <>
              <Alert 
                severity="warning" 
                sx={{ 
                  mb: 3,
                  borderRadius: '10px',
                  backgroundColor: '#fffbeb',
                  border: '1px solid #fde68a'
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 600, color: '#92400e' }}>
                  Found {duplicatesFound.length} duplicate SAP# entries
                </Typography>
                <Typography variant="body2" sx={{ color: '#92400e', mt: 0.5 }}>
                  Total duplicate records to remove: {duplicatesFound.reduce((sum, d) => sum + (d.count - 1), 0)}
                </Typography>
              </Alert>
              
              <Box sx={{ maxHeight: 300, overflowY: 'auto', mb: 3 }}>
                <Table size="small">
                  <TableHead sx={{ backgroundColor: '#f8fafc', position: 'sticky', top: 0 }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>SAP #</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Part Name</TableCell>
                      <TableCell sx={{ fontWeight: 600, textAlign: 'center' }}>Occurrences</TableCell>
                      <TableCell sx={{ fontWeight: 600, textAlign: 'center' }}>To Delete</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {duplicatesFound.map((dup, idx) => (
                      <TableRow key={idx} sx={{ backgroundColor: idx % 2 === 0 ? '#fffbeb' : '#fff' }}>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: '#1e293b' }}>
                            {dup.sapNumber}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ color: '#64748b' }}>
                            {dup.name}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ textAlign: 'center' }}>
                          <Chip 
                            label={dup.count}
                            color="warning"
                            size="small"
                            sx={{ fontWeight: 600 }}
                          />
                        </TableCell>
                        <TableCell sx={{ textAlign: 'center' }}>
                          <Chip 
                            label={dup.count - 1}
                            color="error"
                            size="small"
                            sx={{ fontWeight: 600 }}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
              
              <Alert 
                severity="info" 
                sx={{ 
                  borderRadius: '10px',
                  backgroundColor: '#eff6ff',
                  border: '1px solid #bfdbfe'
                }}
              >
                <Typography variant="body2" sx={{ color: '#1e40af' }}>
                  Note: This will keep the first occurrence of each duplicate and remove all subsequent entries.
                </Typography>
              </Alert>
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ 
          p: 2, 
          borderTop: '1px solid #e2e8f0',
          backgroundColor: '#f8fafc'
        }}>
          <Button 
            onClick={() => setCleanupDialogOpen(false)}
            variant="outlined"
            disabled={cleanupInProgress}
            sx={{ 
              borderRadius: '10px',
              borderColor: '#e2e8f0',
              color: '#64748b',
              textTransform: 'none'
            }}
          >
            Cancel
          </Button>
          {duplicatesFound.length > 0 && !cleanupInProgress && (
            <Button 
              onClick={handleRemoveDuplicates}
              variant="contained"
              color="warning"
              sx={{ 
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                textTransform: 'none',
                fontWeight: 600
              }}
            >
              Remove {duplicatesFound.reduce((sum, d) => sum + (d.count - 1), 0)} Duplicates
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Enhanced CSV Import Dialog */}
      <Dialog 
        open={csvImportDialogOpen} 
        onClose={() => setCsvImportDialogOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '12px',
            overflow: 'hidden'
          }
        }}
      >
        <DialogTitle sx={{ 
          pb: 1, 
          borderBottom: '1px solid #e2e8f0',
          backgroundColor: '#eff6ff'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FileUploadIcon sx={{ color: '#3b82f6' }} />
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#1e293b' }}>
              Import Parts from CSV
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ py: 3 }}>
          {csvPreview.length === 0 && csvErrors.length === 0 ? (
            <Box sx={{ textAlign: 'center', p: 3 }}>
              <FileUploadIcon sx={{ fontSize: 64, color: '#94a3b8', mb: 2, opacity: 0.5 }} />
              <Typography variant="h6" sx={{ fontWeight: 600, color: '#1e293b', mb: 1 }}>
                Upload CSV File
              </Typography>
              <Typography variant="body2" sx={{ color: '#64748b', mb: 3 }}>
                CSV format should include columns: SAP Number, Internal Ref, Name, Category, Safety Level, Replenish Qty
              </Typography>
              <Box 
                sx={{ 
                  border: '2px dashed #e2e8f0',
                  p: 4,
                  borderRadius: '10px',
                  backgroundColor: '#f8fafc',
                  '&:hover': {
                    borderColor: '#3b82f6',
                    backgroundColor: '#eff6ff'
                  }
                }}
              >
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleCsvFileSelect}
                  style={{ display: 'none' }}
                  id="csv-input"
                />
                <label htmlFor="csv-input" style={{ cursor: 'pointer', display: 'block' }}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <FileUploadIcon sx={{ fontSize: 48, color: '#94a3b8', mb: 2 }} />
                    <Typography variant="body1" sx={{ fontWeight: 600, color: '#1e293b', mb: 0.5 }}>
                      Click to select CSV file
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#64748b' }}>
                      or drag and drop
                    </Typography>
                  </Box>
                </label>
              </Box>
            </Box>
          ) : csvErrors.length > 0 ? (
            <Box>
              <Alert 
                severity="error" 
                sx={{ 
                  mb: 3,
                  borderRadius: '10px',
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca'
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 600, color: '#991b1b' }}>
                  {csvErrors.length} error(s) found in CSV file
                </Typography>
              </Alert>
              <Box sx={{ maxHeight: 200, overflowY: 'auto', p: 2, backgroundColor: '#f8fafc', borderRadius: '10px' }}>
                {csvErrors.map((error, idx) => (
                  <Typography key={idx} variant="body2" sx={{ color: '#ef4444', mb: 0.5 }}>
                    • {error}
                  </Typography>
                ))}
              </Box>
            </Box>
          ) : csvPreview.length > 0 ? (
            <>
              <Alert 
                severity="success" 
                sx={{ 
                  mb: 3,
                  borderRadius: '10px',
                  backgroundColor: '#f0fdf4',
                  border: '1px solid #bbf7d0'
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 600, color: '#166534' }}>
                  Ready to import {csvPreview.length} part(s)
                </Typography>
              </Alert>
              <Typography variant="subtitle2" sx={{ color: '#64748b', mb: 2, fontWeight: 600 }}>
                Preview:
              </Typography>
              <Box sx={{ maxHeight: 300, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
                <Table size="small">
                  <TableHead sx={{ backgroundColor: '#f8fafc', position: 'sticky', top: 0 }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>SAP #</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Internal Ref</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Category</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Safety Level</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Replenish Qty</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {csvPreview.slice(0, 10).map((row, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{row.sapNumber}</TableCell>
                        <TableCell>{row.internalRef}</TableCell>
                        <TableCell>{row.name}</TableCell>
                        <TableCell>{row.category}</TableCell>
                        <TableCell>{row.safetyLevel}</TableCell>
                        <TableCell>{row.replenishQty}</TableCell>
                      </TableRow>
                    ))}
                    {csvPreview.length > 10 && (
                      <TableRow>
                        <TableCell colSpan={6} sx={{ textAlign: 'center', color: '#64748b', fontStyle: 'italic' }}>
                          ... and {csvPreview.length - 10} more rows
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </Box>
            </>
          ) : null}
        </DialogContent>
        <DialogActions sx={{ 
          p: 2, 
          borderTop: '1px solid #e2e8f0',
          backgroundColor: '#f8fafc'
        }}>
          <Button 
            onClick={() => {
              setCsvImportDialogOpen(false);
              setCsvFile(null);
              setCsvPreview([]);
              setCsvErrors([]);
            }}
            variant="outlined"
            sx={{ 
              borderRadius: '10px',
              borderColor: '#e2e8f0',
              color: '#64748b',
              textTransform: 'none'
            }}
          >
            Cancel
          </Button>
          {csvPreview.length > 0 && csvErrors.length === 0 && (
            <Button 
              onClick={handleBulkImport}
              variant="contained"
              color="success"
              sx={{ 
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
                textTransform: 'none',
                fontWeight: 600
              }}
            >
              Import {csvPreview.length} Parts
            </Button>
          )}
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

export default PartMaster;