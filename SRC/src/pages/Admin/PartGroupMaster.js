import React, { useEffect, useState, useMemo } from 'react';
import { db } from '../../firebase/config';
import { useSelector } from 'react-redux';
import { collection, getDocs, addDoc, deleteDoc, updateDoc, doc } from 'firebase/firestore';
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
  Grid,
  Card,
  CardContent,
  Divider,
  Stack,
  CircularProgress,
  Alert,
  Snackbar,
  Chip,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Add as AddIcon,
  Clear as ClearIcon,
  Category as CategoryIcon,
  Refresh as RefreshIcon,
  Layers as LayersIcon,
  Warning as WarningIcon,
  Inventory as InventoryIcon,
  CheckCircle as CheckCircleIcon,
  Info as InfoIcon,
  Visibility as VisibilityIcon,
} from '@mui/icons-material';

// Main Part Group Master Page
const PartGroupMaster = () => {
  const [materialGroups, setMaterialGroups] = useState([]);
  const [parts, setParts] = useState([]);
  const [loading, setLoading] = useState(true);
  const user = useSelector(state => state.auth.user);
  const isAdmin = user?.groupId?.toLowerCase() === 'a' || user?.groupId?.toLowerCase() === 'admin';
  const permissions = user?.groupPermissions?.part_group_master || {};

  const canAdd = permissions.access === 'add' || isAdmin;
  const canEdit = permissions.access === 'edit' || permissions.access === 'add' || isAdmin;
  const canDelete = permissions.access === 'add' || isAdmin;

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

  // Part List states
  const [searchQueryParts, setSearchQueryParts] = useState('');
  const [pageStartParts, setPageStartParts] = useState(0);
  const [pageStartPartsWithGroup, setPageStartPartsWithGroup] = useState(0);
  const pageSize = 50;
  const pageSizePendingParts = 10; // 10 items per page for parts awaiting assignment

  // Material Group List states
  const [searchQueryGroups, setSearchQueryGroups] = useState('');
  const [pageStartGroups, setPageStartGroups] = useState(0);

  // Material Group form states
  const [groupForm, setGroupForm] = useState({
    groupId: '',
    materialGroup: '',
    description: ''
  });

  // State to track if "Other" is selected for Material Group
  const [groupFormShowOther, setGroupFormShowOther] = useState(false);
  const [editGroupFormShowOther, setEditGroupFormShowOther] = useState(false);

  // Dialog states
  const [editGroupDialogOpen, setEditGroupDialogOpen] = useState(false);
  const [deleteGroupDialogOpen, setDeleteGroupDialogOpen] = useState(false);
  const [editPartDialogOpen, setEditPartDialogOpen] = useState(false);
  const [deletePartDialogOpen, setDeletePartDialogOpen] = useState(false);
  const [editGroupForm, setEditGroupForm] = useState({
    id: '',
    groupId: '',
    materialGroup: '',
    description: ''
  });
  const [editPartForm, setEditPartForm] = useState({
    id: '',
    sapNumber: '',
    internalRef: '',
    name: '',
    category: '',
    materialGroupId: ''
  });
  const [deleteGroupTarget, setDeleteGroupTarget] = useState(null);
  const [deletePartTarget, setDeletePartTarget] = useState(null);

  // Validation states
  const [groupIdError, setGroupIdError] = useState(false);
  const [materialGroupError, setMaterialGroupError] = useState(false);
  const [descriptionError, setDescriptionError] = useState(false);
  const [editGroupIdError, setEditGroupIdError] = useState(false);
  const [editMaterialGroupError, setEditMaterialGroupError] = useState(false);
  const [editDescriptionError, setEditDescriptionError] = useState(false);
  const [selectedMaterialGroup, setSelectedMaterialGroup] = useState({});

  // Fetch data from Firestore
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch material groups
        const groupsSnapshot = await getDocs(collection(db, 'materialGroups'));
        const groupsData = groupsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
        setMaterialGroups(groupsData);

        // Fetch parts
        const partsSnapshot = await getDocs(collection(db, 'parts'));
        const partsData = partsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
        setParts(partsData);
      } catch (error) {
        console.error('Error fetching data:', error);
        setSnackbar({ open: true, message: 'Error fetching data', severity: 'error' });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Filtered parts pending verification (parts without material group assigned)
  const filteredPartsPending = useMemo(() => {
    const filtered = parts.filter(p => {
      if (p.materialGroupId) return false; // Only show parts without material group
      const matchesSearch =
        (p.name && p.name.toLowerCase().includes(searchQueryParts.toLowerCase())) ||
        (p.sapNumber && p.sapNumber.includes(searchQueryParts)) ||
        (p.internalRef && p.internalRef.toLowerCase().includes(searchQueryParts.toLowerCase()));
      return matchesSearch;
    });

    // Sort by SAP# descending (higher numbers at top, lower numbers at bottom)
    return filtered.sort((a, b) => {
      const sapA = parseInt(a.sapNumber || '0') || 0;
      const sapB = parseInt(b.sapNumber || '0') || 0;
      return sapB - sapA; // Descending order
    });
  }, [parts, searchQueryParts]);

  // Filtered parts with material group assigned
  const filteredPartsWithGroup = useMemo(() => {
    return parts.filter(p => {
      if (!p.materialGroupId) return false; // Only show parts with material group
      const matchesSearch =
        (p.name && p.name.toLowerCase().includes(searchQueryParts.toLowerCase())) ||
        (p.sapNumber && p.sapNumber.includes(searchQueryParts)) ||
        (p.internalRef && p.internalRef.toLowerCase().includes(searchQueryParts.toLowerCase()));
      return matchesSearch;
    });
  }, [parts, searchQueryParts]);

  // Filtered material groups
  const filteredGroups = useMemo(() => {
    return materialGroups.filter(g => {
      const matchesSearch =
        (g.materialGroup && g.materialGroup.toLowerCase().includes(searchQueryGroups.toLowerCase())) ||
        (g.groupId && g.groupId.toLowerCase().includes(searchQueryGroups.toLowerCase())) ||
        (g.description && g.description.toLowerCase().includes(searchQueryGroups.toLowerCase()));
      return matchesSearch;
    });
  }, [materialGroups, searchQueryGroups]);

  // Validate Group ID (exactly 4 alphabets only, required)
  const validateGroupId = (value) => {
    if (!value) return false;
    return /^[A-Z]{4}$/.test(value);
  };

  // Validate Material Group name (required)
  const validateMaterialGroup = (value) => {
    return value && value.trim().length > 0;
  };

  // Handle add material group
  const handleAddGroup = async () => {
    if (!canAdd) {
      setSnackbar({ open: true, message: 'You do not have permission to add groups', severity: 'error' });
      return;
    }
    setGroupIdError(false);
    setMaterialGroupError(false);
    setDescriptionError(false);

    if (!validateGroupId(groupForm.groupId)) {
      setGroupIdError(true);
      setSnackbar({ open: true, message: 'Group ID must be exactly 4 alphabets only', severity: 'error' });
      return;
    }

    if (!validateMaterialGroup(groupForm.materialGroup)) {
      setMaterialGroupError(true);
      setSnackbar({ open: true, message: 'Material Group is required', severity: 'error' });
      return;
    }

    // Check for duplicate Group ID or Material Group name (case-insensitive)
    const groupIdExists = materialGroups.some(g => g.groupId.toLowerCase() === groupForm.groupId.toLowerCase());
    const materialGroupExists = materialGroups.some(g => g.materialGroup.toLowerCase() === groupForm.materialGroup.toLowerCase());

    if (groupIdExists) {
      setGroupIdError(true);
      setSnackbar({ open: true, message: 'Group ID already exists', severity: 'error' });
      return;
    }

    if (materialGroupExists) {
      setMaterialGroupError(true);
      setSnackbar({ open: true, message: 'Material Group name already exists', severity: 'error' });
      return;
    }

    try {
      await addDoc(collection(db, 'materialGroups'), {
        groupId: groupForm.groupId,
        materialGroup: groupForm.materialGroup,
        description: groupForm.description || '',
        createdAt: new Date()
      });

      // Refresh material groups list
      const groupsSnapshot = await getDocs(collection(db, 'materialGroups'));
      const groupsData = groupsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      setMaterialGroups(groupsData);

      // Clear form
      setGroupForm({ groupId: '', materialGroup: '', description: '' });
      setSnackbar({ open: true, message: 'Material Group added successfully', severity: 'success' });
    } catch (error) {
      console.error('Error adding material group:', error);
      setSnackbar({ open: true, message: 'Error adding material group', severity: 'error' });
    }
  };

  // Handle clear group form
  const handleClearGroupForm = () => {
    setGroupForm({ groupId: '', materialGroup: '', description: '' });
    setGroupIdError(false);
    setMaterialGroupError(false);
    setDescriptionError(false);
    setGroupFormShowOther(false);
  };

  // Handle edit group
  const handleEditGroup = (group) => {
    setEditGroupForm({
      id: group.id,
      groupId: group.groupId,
      materialGroup: group.materialGroup,
      description: group.description || ''
    });
    // Check if material group is in predefined list
    const isOther = !materialGroupOptions.includes(group.materialGroup);
    setEditGroupFormShowOther(isOther);
    setEditGroupDialogOpen(true);
  };

  // Handle save group changes
  const handleSaveGroupChanges = async () => {
    if (!canEdit) {
      setSnackbar({ open: true, message: 'You do not have permission to edit groups', severity: 'error' });
      return;
    }
    setEditGroupIdError(false);
    setEditMaterialGroupError(false);
    setEditDescriptionError(false);

    if (!validateGroupId(editGroupForm.groupId)) {
      setEditGroupIdError(true);
      setSnackbar({ open: true, message: 'Group ID must be exactly 4 alphabets only', severity: 'error' });
      return;
    }

    if (!validateMaterialGroup(editGroupForm.materialGroup)) {
      setEditMaterialGroupError(true);
      setSnackbar({ open: true, message: 'Material Group is required', severity: 'error' });
      return;
    }

    // Check for duplicate Group ID or Material Group name (excluding current group)
    const groupIdExists = materialGroups.some(g =>
      g.id !== editGroupForm.id && g.groupId.toLowerCase() === editGroupForm.groupId.toLowerCase()
    );
    const materialGroupExists = materialGroups.some(g =>
      g.id !== editGroupForm.id && g.materialGroup.toLowerCase() === editGroupForm.materialGroup.toLowerCase()
    );

    if (groupIdExists) {
      setEditGroupIdError(true);
      setSnackbar({ open: true, message: 'Group ID already exists', severity: 'error' });
      return;
    }

    if (materialGroupExists) {
      setEditMaterialGroupError(true);
      setSnackbar({ open: true, message: 'Material Group name already exists', severity: 'error' });
      return;
    }

    try {
      await updateDoc(doc(db, 'materialGroups', editGroupForm.id), {
        groupId: editGroupForm.groupId,
        materialGroup: editGroupForm.materialGroup,
        description: editGroupForm.description
      });

      // Refresh material groups list
      const groupsSnapshot = await getDocs(collection(db, 'materialGroups'));
      const groupsData = groupsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      setMaterialGroups(groupsData);

      setEditGroupDialogOpen(false);
      setSnackbar({ open: true, message: 'Material Group updated successfully', severity: 'success' });
    } catch (error) {
      console.error('Error updating material group:', error);
      setSnackbar({ open: true, message: 'Error updating material group', severity: 'error' });
    }
  };

  // Handle delete group
  const handleDeleteGroup = (group) => {
    setDeleteGroupTarget(group);
    setDeleteGroupDialogOpen(true);
  };

  // Handle confirm delete group
  const handleConfirmDeleteGroup = async () => {
    if (!canDelete) {
      setSnackbar({ open: true, message: 'You do not have permission to delete groups', severity: 'error' });
      return;
    }
    try {
      // Find all parts assigned to this material group
      const partsToUnassign = parts.filter(p => p.materialGroupId === deleteGroupTarget.id);

      // Unassign all parts from this material group
      for (const part of partsToUnassign) {
        await updateDoc(doc(db, 'parts', part.id), {
          materialGroupId: ''
        });
      }

      // Delete the material group
      await deleteDoc(doc(db, 'materialGroups', deleteGroupTarget.id));

      // Refresh material groups list
      const groupsSnapshot = await getDocs(collection(db, 'materialGroups'));
      const groupsData = groupsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      setMaterialGroups(groupsData);

      // Refresh parts list
      const partsSnapshot = await getDocs(collection(db, 'parts'));
      const partsData = partsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      setParts(partsData);

      setDeleteGroupDialogOpen(false);
      setDeleteGroupTarget(null);
      const unassignedCount = partsToUnassign.length;
      const message = unassignedCount > 0
        ? `Material Group deleted successfully. ${unassignedCount} part(s) unassigned and moved to Part List without Material Group`
        : 'Material Group deleted successfully';
      setSnackbar({ open: true, message, severity: 'success' });
    } catch (error) {
      console.error('Error deleting material group:', error);
      setSnackbar({ open: true, message: 'Error deleting material group', severity: 'error' });
    }
  };

  // Handle delete group close
  const handleDeleteGroupClose = () => {
    setDeleteGroupDialogOpen(false);
    setDeleteGroupTarget(null);
  };

  // Handle edit part
  const handleEditPart = (part) => {
    setEditPartForm({
      id: part.id,
      sapNumber: part.sapNumber || '',
      internalRef: part.internalRef || '',
      name: part.name || '',
      category: part.category || '',
      materialGroupId: part.materialGroupId || ''
    });
    setEditPartDialogOpen(true);
  };

  // Handle save part changes
  const handleSavePartChanges = async () => {
    try {
      await updateDoc(doc(db, 'parts', editPartForm.id), {
        materialGroupId: editPartForm.materialGroupId
      });

      // Refresh parts list
      const partsSnapshot = await getDocs(collection(db, 'parts'));
      const partsData = partsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      setParts(partsData);

      setEditPartDialogOpen(false);
      setSnackbar({ open: true, message: 'Part updated successfully', severity: 'success' });
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
    if (!canDelete) {
      setSnackbar({ open: true, message: 'You do not have permission to delete parts', severity: 'error' });
      return;
    }
    try {
      await deleteDoc(doc(db, 'parts', deletePartTarget.id));

      // Refresh parts list
      const partsSnapshot = await getDocs(collection(db, 'parts'));
      const partsData = partsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      setParts(partsData);

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

  // Pagination for parts
  const partPageEnd = Math.min(pageStartParts + pageSizePendingParts, filteredPartsPending.length);
  const partsPaginated = filteredPartsPending.slice(pageStartParts, partPageEnd);

  // Pagination for parts with group
  const partWithGroupPageEnd = Math.min(pageStartPartsWithGroup + pageSize, filteredPartsWithGroup.length);
  const partsWithGroupPaginated = filteredPartsWithGroup.slice(pageStartPartsWithGroup, partWithGroupPageEnd);

  // Pagination for groups
  const groupPageEnd = Math.min(pageStartGroups + pageSize, filteredGroups.length);
  const groupsPaginated = filteredGroups.slice(pageStartGroups, groupPageEnd);

  if (loading) {
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
              background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
              color: 'white',
              boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)'
            }}>
              <LayersIcon sx={{ fontSize: 28 }} />
            </Box>
            <Box>
              <Typography variant="h4" sx={{
                fontWeight: 700,
                color: '#1e293b',
                mb: 0.5
              }}>
                Part Group Master
              </Typography>
              <Typography variant="body1" sx={{ color: '#64748b' }}>
                Material Group & Part Assignment Management
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
                  Total Groups
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 600, color: '#1e293b' }}>
                  {materialGroups.length}
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
                <InventoryIcon sx={{ color: '#3b82f6', fontSize: 18 }} />
                <Box>
                  <Typography variant="body2" sx={{ color: '#64748b' }}>
                    Assigned
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: '#1e293b' }}>
                    {filteredPartsWithGroup.length}
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
                <WarningIcon sx={{ color: '#f59e0b', fontSize: 18 }} />
                <Box>
                  <Typography variant="body2" sx={{ color: '#64748b' }}>
                    Pending
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: '#1e293b' }}>
                    {filteredPartsPending.length}
                  </Typography>
                </Box>
              </Box>
            </Card>
          </Box>
        </Box>

        {/* Material Group Form Section */}
        {canAdd ? (
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
              backgroundColor: '#f3e8ff',
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
                  <AddIcon sx={{ fontSize: 20, color: '#8b5cf6' }} />
                  Add New Material Group
                </Typography>
                <Typography variant="body2" sx={{ color: '#64748b', mt: 0.5 }}>
                  Create a new material group for spare parts classification
                </Typography>
              </Box>
            </Box>

            <Box sx={{ p: 3 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={3}>
                  <TextField
                    label="Group ID"
                    placeholder="e.g., BEAR"
                    value={groupForm.groupId}
                    onChange={(e) => {
                      const value = e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4);
                      setGroupForm({ ...groupForm, groupId: value });
                      setGroupIdError(false);
                    }}
                    error={groupIdError}
                    helperText={groupIdError ? 'Must be 4 letters' : `${groupForm.groupId.length}/4`}
                    fullWidth
                    required
                    size="small"
                    inputProps={{ maxLength: 4, style: { textTransform: 'uppercase' } }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: '10px',
                        backgroundColor: '#f8fafc',
                      }
                    }}
                  />
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  {!groupFormShowOther ? (
                    <TextField
                      select
                      label="Material Group"
                      value={groupForm.materialGroup}
                      onChange={(e) => {
                        if (e.target.value === 'OTHER') {
                          setGroupFormShowOther(true);
                          setGroupForm({ ...groupForm, materialGroup: '' });
                        } else {
                          setGroupForm({ ...groupForm, materialGroup: e.target.value });
                        }
                        setMaterialGroupError(false);
                      }}
                      error={materialGroupError}
                      helperText={materialGroupError ? 'Required' : ''}
                      fullWidth
                      required
                      size="small"
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: '10px',
                          backgroundColor: '#f8fafc',
                        }
                      }}
                    >
                      <MenuItem value="">-- Select Material Group --</MenuItem>
                      {materialGroupOptions.map((option) => (
                        <MenuItem key={option} value={option}>
                          {option}
                        </MenuItem>
                      ))}
                      <MenuItem value="OTHER">Other (Custom)</MenuItem>
                    </TextField>
                  ) : (
                    <TextField
                      label="Material Group"
                      placeholder="Enter custom group name"
                      value={groupForm.materialGroup}
                      onChange={(e) => {
                        setGroupForm({ ...groupForm, materialGroup: e.target.value });
                        setMaterialGroupError(false);
                      }}
                      onBlur={() => {
                        if (!groupForm.materialGroup.trim()) {
                          setGroupFormShowOther(false);
                          setGroupForm({ ...groupForm, materialGroup: '' });
                        }
                      }}
                      error={materialGroupError}
                      helperText={materialGroupError ? 'Required or clear to go back' : 'Clear to go back to list'}
                      fullWidth
                      required
                      size="small"
                      autoFocus
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: '10px',
                          backgroundColor: '#f8fafc',
                        }
                      }}
                    />
                  )}
                </Grid>

                <Grid item xs={12} md={4}>
                  <TextField
                    label="Description"
                    placeholder="Brief description of this group"
                    value={groupForm.description}
                    onChange={(e) => setGroupForm({ ...groupForm, description: e.target.value })}
                    fullWidth
                    multiline
                    rows={1}
                    size="small"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: '10px',
                        backgroundColor: '#f8fafc',
                      }
                    }}
                  />
                </Grid>

                <Grid item xs={12} sm={6} md={2} sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    variant="outlined"
                    startIcon={<ClearIcon />}
                    onClick={handleClearGroupForm}
                    fullWidth
                    sx={{
                      borderRadius: '10px',
                      borderColor: '#e2e8f0',
                      color: '#64748b',
                      textTransform: 'none',
                      '&:hover': {
                        borderColor: '#64748b'
                      }
                    }}
                  >
                    Clear
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={handleAddGroup}
                    fullWidth
                    sx={{
                      borderRadius: '10px',
                      background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
                      textTransform: 'none',
                      fontWeight: 600
                    }}
                  >
                    Add Group
                  </Button>
                </Grid>
              </Grid>
            </Box>
          </Paper>
        ) : (
          <Alert severity="info" sx={{ borderRadius: '16px', mb: 4 }}>
            You do not have permission to create new material groups.
          </Alert>
        )}

        {/* Material Groups List Section */}
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
            backgroundColor: '#f3e8ff',
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
                <CategoryIcon sx={{ fontSize: 20, color: '#8b5cf6' }} />
                Material Groups List
              </Typography>
              <Typography variant="body2" sx={{ color: '#64748b', mt: 0.5 }}>
                {filteredGroups.length} groups found
              </Typography>
            </Box>
          </Box>

          {/* Search Box */}
          <Box sx={{ p: 3, borderBottom: '1px solid #e2e8f0', backgroundColor: 'white' }}>
            <TextField
              label="Search groups"
              placeholder="Search by Group ID, Material Group, or Description"
              value={searchQueryGroups}
              onChange={(e) => {
                setSearchQueryGroups(e.target.value);
                setPageStartGroups(0);
              }}
              fullWidth
              size="small"
              InputProps={{
                startAdornment: (
                  <SearchIcon sx={{ mr: 1, color: '#94a3b8' }} />
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '10px',
                  backgroundColor: '#f8fafc',
                }
              }}
            />
          </Box>

          {/* Groups Table */}
          {filteredGroups.length === 0 ? (
            <Box sx={{
              p: 6,
              textAlign: 'center',
              color: '#94a3b8'
            }}>
              <CategoryIcon sx={{ fontSize: 64, mb: 2, opacity: 0.5 }} />
              <Typography variant="h6" sx={{ mb: 1 }}>
                No material groups found
              </Typography>
              <Typography variant="body2">
                {materialGroups.length === 0 ?
                  "No groups yet. Create your first group above." :
                  "No groups match your search criteria."}
              </Typography>
            </Box>
          ) : (
            <>
              <Box sx={{ overflowX: 'auto' }}>
                <Table sx={{ minWidth: 900 }}>
                  <TableHead sx={{ backgroundColor: '#f8fafc' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600, color: '#475569' }}>Group ID</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: '#475569' }}>Material Group</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: '#475569' }}>Description</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: '#475569' }} align="center">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {groupsPaginated.map((group) => (
                      <TableRow key={group.id} hover sx={{
                        '&:hover': {
                          backgroundColor: '#f8fafc'
                        }
                      }}>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: '#1e293b' }}>
                            {group.groupId}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={group.materialGroup}
                            sx={{
                              backgroundColor: '#f3e8ff',
                              color: '#6d28d9',
                              fontWeight: 600
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ color: '#64748b' }}>
                            {group.description || '—'}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Tooltip title={canEdit ? "Edit Group" : "View Group"}>
                            <IconButton
                              size="small"
                              onClick={() => handleEditGroup(group)}
                              sx={{
                                color: canEdit ? '#8b5cf6' : '#64748b',
                                '&:hover': { backgroundColor: canEdit ? '#f3e8ff' : '#f1f5f9' }
                              }}
                            >
                              {canEdit ? <EditIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                            </IconButton>
                          </Tooltip>
                          {canDelete && (
                            <Tooltip title="Delete Group">
                              <IconButton
                                size="small"
                                onClick={() => handleDeleteGroup(group)}
                                sx={{
                                  color: '#ef4444',
                                  '&:hover': { backgroundColor: '#fee2e2' }
                                }}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>

              {/* Pagination */}
              <Box sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                p: 2,
                borderTop: '1px solid #e2e8f0'
              }}>
                <Box>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => setPageStartGroups(Math.max(0, pageStartGroups - pageSize))}
                    disabled={pageStartGroups === 0}
                    sx={{ mr: 1, borderRadius: '8px' }}
                  >
                    ← Previous
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => setPageStartGroups(pageStartGroups + pageSize)}
                    disabled={groupPageEnd >= filteredGroups.length}
                    sx={{ borderRadius: '8px' }}
                  >
                    Next →
                  </Button>
                </Box>
                <Typography variant="body2" sx={{ color: '#64748b' }}>
                  Showing {filteredGroups.length > 0 ? pageStartGroups + 1 : 0}–{groupPageEnd} of {filteredGroups.length}
                </Typography>
              </Box>
            </>
          )}
        </Paper>

        {/* Parts Without Group Section */}
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
            backgroundColor: '#fef3c7',
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
                <WarningIcon sx={{ fontSize: 20, color: '#f59e0b' }} />
                Parts Awaiting Group Assignment
              </Typography>
              <Typography variant="body2" sx={{ color: '#64748b', mt: 0.5 }}>
                {filteredPartsPending.length} parts need to be assigned to a material group
              </Typography>
            </Box>
          </Box>

          {/* Search Box */}
          <Box sx={{ p: 3, borderBottom: '1px solid #e2e8f0', backgroundColor: 'white' }}>
            <TextField
              label="Search parts"
              placeholder="Search by SAP#, Int.Ref, or Part Name"
              value={searchQueryParts}
              onChange={(e) => {
                setSearchQueryParts(e.target.value);
                setPageStartParts(0);
              }}
              fullWidth
              size="small"
              InputProps={{
                startAdornment: (
                  <SearchIcon sx={{ mr: 1, color: '#94a3b8' }} />
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '10px',
                  backgroundColor: '#f8fafc',
                }
              }}
            />
          </Box>

          {/* Parts Table */}
          {filteredPartsPending.length === 0 ? (
            <Box sx={{
              p: 6,
              textAlign: 'center',
              color: '#94a3b8'
            }}>
              <CheckCircleIcon sx={{ fontSize: 64, mb: 2, color: '#10b981', opacity: 0.8 }} />
              <Typography variant="h6" sx={{ mb: 1, color: '#10b981' }}>
                All Parts Assigned
              </Typography>
              <Typography variant="body2">
                All parts have been assigned to material groups!
              </Typography>
            </Box>
          ) : (
            <>
              <Box sx={{ overflowX: 'auto' }}>
                <Table sx={{ minWidth: 1000 }}>
                  <TableHead sx={{ backgroundColor: '#f8fafc' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600, color: '#475569' }}>SAP#</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: '#475569' }}>Int.Ref</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: '#475569' }}>Part Name</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: '#475569' }}>Category</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: '#475569' }} align="center">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {partsPaginated.map((part) => (
                      <TableRow key={part.id} hover sx={{
                        backgroundColor: '#fffbeb',
                        '&:hover': {
                          backgroundColor: '#fef3c7'
                        }
                      }}>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: '#1e293b' }}>
                            {part.sapNumber}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ color: '#64748b' }}>
                            {part.internalRef}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ color: '#64748b' }}>
                            {part.name}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={part.category || 'N/A'}
                            variant="outlined"
                            size="small"
                            sx={{
                              borderColor: '#f59e0b',
                              color: '#f59e0b'
                            }}
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Tooltip title={canEdit ? "Assign Material Group" : "View Part"}>
                            <IconButton
                              size="small"
                              onClick={() => handleEditPart(part)}
                              sx={{
                                color: canEdit ? '#f59e0b' : '#64748b',
                                '&:hover': { backgroundColor: canEdit ? '#fef3c7' : '#f1f5f9' }
                              }}
                            >
                              {canEdit ? <EditIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                            </IconButton>
                          </Tooltip>
                          {canDelete && (
                            <Tooltip title="Delete Part">
                              <IconButton
                                size="small"
                                onClick={() => handleDeletePart(part)}
                                sx={{
                                  color: '#ef4444',
                                  '&:hover': { backgroundColor: '#fee2e2' }
                                }}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>

              {/* Pagination */}
              <Box sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                p: 2,
                borderTop: '1px solid #e2e8f0'
              }}>
                <Box>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => setPageStartParts(Math.max(0, pageStartParts - pageSizePendingParts))}
                    disabled={pageStartParts === 0}
                    sx={{ mr: 1, borderRadius: '8px' }}
                  >
                    ← Previous
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => setPageStartParts(pageStartParts + pageSizePendingParts)}
                    disabled={partPageEnd >= filteredPartsPending.length}
                    sx={{ borderRadius: '8px' }}
                  >
                    Next →
                  </Button>
                </Box>
                <Typography variant="body2" sx={{ color: '#64748b' }}>
                  Showing {filteredPartsPending.length > 0 ? pageStartParts + 1 : 0}–{partPageEnd} of {filteredPartsPending.length}
                </Typography>
              </Box>
            </>
          )}
        </Paper>

        {/* Parts With Group Section */}
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
            backgroundColor: '#dbeafe',
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
                <CheckCircleIcon sx={{ fontSize: 20, color: '#3b82f6' }} />
                Parts With Material Group Assigned
              </Typography>
              <Typography variant="body2" sx={{ color: '#64748b', mt: 0.5 }}>
                {filteredPartsWithGroup.length} parts are properly assigned
              </Typography>
            </Box>
          </Box>

          {/* Parts Table */}
          {filteredPartsWithGroup.length === 0 ? (
            <Box sx={{
              p: 6,
              textAlign: 'center',
              color: '#94a3b8'
            }}>
              <InfoIcon sx={{ fontSize: 64, mb: 2, opacity: 0.5 }} />
              <Typography variant="h6" sx={{ mb: 1 }}>
                No parts assigned yet
              </Typography>
              <Typography variant="body2">
                Parts will appear here once they are assigned to a material group
              </Typography>
            </Box>
          ) : (
            <>
              <Box sx={{ overflowX: 'auto' }}>
                <Table sx={{ minWidth: 1000 }}>
                  <TableHead sx={{ backgroundColor: '#f8fafc' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600, color: '#475569' }}>SAP#</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: '#475569' }}>Int.Ref</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: '#475569' }}>Part Name</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: '#475569' }}>Category</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: '#475569' }}>Material Group</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: '#475569' }} align="center">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {partsWithGroupPaginated.map((part) => {
                      const group = materialGroups.find(g => g.id === part.materialGroupId);
                      return (
                        <TableRow key={part.id} hover sx={{
                          '&:hover': {
                            backgroundColor: '#f0f9ff'
                          }
                        }}>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 600, color: '#1e293b' }}>
                              {part.sapNumber}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ color: '#64748b' }}>
                              {part.internalRef}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ color: '#64748b' }}>
                              {part.name}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={part.category || 'N/A'}
                              variant="outlined"
                              size="small"
                              sx={{
                                borderColor: '#3b82f6',
                                color: '#3b82f6'
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={group?.materialGroup || 'N/A'}
                              sx={{
                                backgroundColor: '#dbeafe',
                                color: '#0c4a6e',
                                fontWeight: 600
                              }}
                            />
                          </TableCell>
                          <TableCell align="center">
                            <Tooltip title={canEdit ? "Edit Material Group" : "View Part"}>
                              <IconButton
                                size="small"
                                onClick={() => handleEditPart(part)}
                                sx={{
                                  color: canEdit ? '#3b82f6' : '#64748b',
                                  '&:hover': { backgroundColor: canEdit ? '#dbeafe' : '#f1f5f9' }
                                }}
                              >
                                {canEdit ? <EditIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                              </IconButton>
                            </Tooltip>
                            {canDelete && (
                              <Tooltip title="Delete Part">
                                <IconButton
                                  size="small"
                                  onClick={() => handleDeletePart(part)}
                                  sx={{
                                    color: '#ef4444',
                                    '&:hover': { backgroundColor: '#fee2e2' }
                                  }}
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </Box>

              {/* Pagination */}
              <Box sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                p: 2,
                borderTop: '1px solid #e2e8f0'
              }}>
                <Box>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => setPageStartPartsWithGroup(Math.max(0, pageStartPartsWithGroup - pageSize))}
                    disabled={pageStartPartsWithGroup === 0}
                    sx={{ mr: 1, borderRadius: '8px' }}
                  >
                    ← Previous
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => setPageStartPartsWithGroup(pageStartPartsWithGroup + pageSize)}
                    disabled={partWithGroupPageEnd >= filteredPartsWithGroup.length}
                    sx={{ borderRadius: '8px' }}
                  >
                    Next →
                  </Button>
                </Box>
                <Typography variant="body2" sx={{ color: '#64748b' }}>
                  Showing {filteredPartsWithGroup.length > 0 ? pageStartPartsWithGroup + 1 : 0}–{partWithGroupPageEnd} of {filteredPartsWithGroup.length}
                </Typography>
              </Box>
            </>
          )}
        </Paper>
      </Box>

      {/* Edit Group Dialog */}
      <Dialog open={editGroupDialogOpen} onClose={() => setEditGroupDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 600, backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
          Edit Material Group Details
        </DialogTitle>
        <DialogContent sx={{ py: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Group ID"
              value={editGroupForm.groupId}
              onChange={(e) => {
                const value = e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4);
                setEditGroupForm({ ...editGroupForm, groupId: value });
                setEditGroupIdError(false);
              }}
              error={editGroupIdError}
              helperText={editGroupIdError ? 'Must be exactly 4 alphabets only' : `${editGroupForm.groupId.length}/4`}
              fullWidth
              disabled
              size="small"
              inputProps={{ maxLength: 4, style: { textTransform: 'uppercase' } }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '10px',
                  backgroundColor: '#f8fafc',
                }
              }}
            />

            {!editGroupFormShowOther ? (
              <TextField
                select
                label="Material Group"
                value={editGroupForm.materialGroup}
                onChange={(e) => {
                  if (e.target.value === 'OTHER') {
                    setEditGroupFormShowOther(true);
                    setEditGroupForm({ ...editGroupForm, materialGroup: '' });
                  } else {
                    setEditGroupForm({ ...editGroupForm, materialGroup: e.target.value });
                  }
                  setEditMaterialGroupError(false);
                }}
                error={editMaterialGroupError}
                helperText={editMaterialGroupError ? 'Required' : ''}
                fullWidth
                size="small"
                disabled={!canEdit}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '10px',
                    backgroundColor: '#f8fafc',
                  }
                }}
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
                value={editGroupForm.materialGroup}
                onChange={(e) => {
                  setEditGroupForm({ ...editGroupForm, materialGroup: e.target.value });
                  setEditMaterialGroupError(false);
                }}
                onBlur={() => {
                  if (!editGroupForm.materialGroup.trim()) {
                    setEditGroupFormShowOther(false);
                    setEditGroupForm({ ...editGroupForm, materialGroup: '' });
                  }
                }}
                error={editMaterialGroupError}
                helperText={editMaterialGroupError ? 'Required or click back to select from list' : 'Type custom value or clear to go back'}
                fullWidth
                size="small"
                autoFocus
                disabled={!canEdit}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '10px',
                    backgroundColor: '#f8fafc',
                  }
                }}
              />
            )}

            <TextField
              label="Description"
              value={editGroupForm.description}
              onChange={(e) => setEditGroupForm({ ...editGroupForm, description: e.target.value })}
              fullWidth
              multiline
              rows={3}
              size="small"
              disabled={!canEdit}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '10px',
                  backgroundColor: '#f8fafc',
                }
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: '1px solid #e2e8f0' }}>
          <Button onClick={() => setEditGroupDialogOpen(false)} variant="outlined" sx={{ borderRadius: '8px' }}>
            {canEdit ? 'Cancel' : 'Close'}
          </Button>
          {canEdit && (
            <Button
              onClick={handleSaveGroupChanges}
              variant="contained"
              sx={{
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)'
              }}
            >
              Save Changes
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Delete Group Dialog */}
      <Dialog open={deleteGroupDialogOpen} onClose={handleDeleteGroupClose} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 600, backgroundColor: '#fee2e2', borderBottom: '1px solid #fecaca' }}>
          Delete {deleteGroupTarget?.materialGroup}?
        </DialogTitle>
        <DialogContent sx={{ py: 3 }}>
          <Box sx={{ py: 2 }}>
            <Typography variant="body2" sx={{ mb: 2, color: '#64748b' }}>
              Are you sure you want to delete this material group?
            </Typography>
            <Box sx={{ my: 2, p: 2, backgroundColor: '#fef2f2', borderRadius: '10px', borderLeft: '4px solid #ef4444' }}>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>Group ID:</strong> {deleteGroupTarget?.groupId}
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>Material Group:</strong> {deleteGroupTarget?.materialGroup}
              </Typography>
            </Box>
            <Alert severity="warning" sx={{ mt: 2, borderRadius: '10px' }}>
              This action cannot be undone. All parts assigned to this group will be unassigned.
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: '1px solid #e2e8f0' }}>
          <Button onClick={handleDeleteGroupClose} variant="outlined" sx={{ borderRadius: '8px' }}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirmDeleteGroup}
            variant="contained"
            color="error"
            sx={{ borderRadius: '8px' }}
          >
            Confirm Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Part Dialog */}
      <Dialog open={editPartDialogOpen} onClose={() => setEditPartDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 600, backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
          Assign Material Group to Part
        </DialogTitle>
        <DialogContent sx={{ py: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="SAP#"
              value={editPartForm.sapNumber}
              fullWidth
              disabled
              size="small"
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '10px',
                  backgroundColor: '#f8fafc',
                }
              }}
            />

            <TextField
              label="Int.Ref"
              value={editPartForm.internalRef}
              fullWidth
              disabled
              size="small"
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '10px',
                  backgroundColor: '#f8fafc',
                }
              }}
            />

            <TextField
              label="Part Name"
              value={editPartForm.name}
              fullWidth
              disabled
              size="small"
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '10px',
                  backgroundColor: '#f8fafc',
                }
              }}
            />

            <TextField
              label="Category"
              value={editPartForm.category}
              fullWidth
              disabled
              size="small"
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '10px',
                  backgroundColor: '#f8fafc',
                }
              }}
            />

            <Divider sx={{ my: 1 }} />

            <TextField
              select
              label="Material Group"
              value={editPartForm.materialGroupId}
              onChange={(e) => setEditPartForm({ ...editPartForm, materialGroupId: e.target.value })}
              fullWidth
              size="small"
              disabled={!canEdit}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '10px',
                  backgroundColor: '#f8fafc',
                }
              }}
            >
              <MenuItem value="">-- Select Group --</MenuItem>
              {materialGroups.map(group => (
                <MenuItem key={group.id} value={group.id}>
                  <Box>
                    <Typography variant="body2">{group.materialGroup}</Typography>
                    <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                      ({group.groupId})
                    </Typography>
                  </Box>
                </MenuItem>
              ))}
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: '1px solid #e2e8f0' }}>
          <Button onClick={() => setEditPartDialogOpen(false)} variant="outlined" sx={{ borderRadius: '8px' }}>
            {canEdit ? 'Cancel' : 'Close'}
          </Button>
          {canEdit && (
            <Button
              onClick={handleSavePartChanges}
              variant="contained"
              sx={{
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)'
              }}
            >
              Save Changes
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Delete Part Dialog */}
      <Dialog open={deletePartDialogOpen} onClose={handleDeletePartClose} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 600, backgroundColor: '#fee2e2', borderBottom: '1px solid #fecaca' }}>
          Delete {deletePartTarget?.name}?
        </DialogTitle>
        <DialogContent sx={{ py: 3 }}>
          <Box sx={{ py: 2 }}>
            <Typography variant="body2" sx={{ mb: 2, color: '#64748b' }}>
              Are you sure you want to delete this part?
            </Typography>
            <Box sx={{ my: 2, p: 2, backgroundColor: '#fef2f2', borderRadius: '10px', borderLeft: '4px solid #ef4444' }}>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>SAP#:</strong> {deletePartTarget?.sapNumber}
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>Int.Ref:</strong> {deletePartTarget?.internalRef}
              </Typography>
              <Typography variant="body2">
                <strong>Name:</strong> {deletePartTarget?.name}
              </Typography>
            </Box>
            <Alert severity="warning" sx={{ mt: 2, borderRadius: '10px' }}>
              This action cannot be undone.
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: '1px solid #e2e8f0' }}>
          <Button onClick={handleDeletePartClose} variant="outlined" sx={{ borderRadius: '8px' }}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirmDeletePart}
            variant="contained"
            color="error"
            sx={{ borderRadius: '8px' }}
          >
            Confirm Delete
          </Button>
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

export default PartGroupMaster;
