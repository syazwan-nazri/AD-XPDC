import React, { useEffect, useState, useMemo } from 'react';
import { db } from '../../firebase/config';
import { collection, getDocs, addDoc, deleteDoc, updateDoc, doc } from 'firebase/firestore';
import { Button, Snackbar, TextField, Table, TableHead, TableRow, TableCell, TableBody, Paper, Box, Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Tooltip, Typography, Card, CardContent, Grid, InputAdornment, MenuItem } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import Alert from '@mui/material/Alert';

// Main Part Group Master Page
const PartGroupMaster = () => {
  const [materialGroups, setMaterialGroups] = useState([]);
  const [parts, setParts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // Part List states
  const [searchQueryParts, setSearchQueryParts] = useState('');
  const [pageStartParts, setPageStartParts] = useState(0);
  const pageSize = 50;

  // Material Group List states
  const [searchQueryGroups, setSearchQueryGroups] = useState('');
  const [pageStartGroups, setPageStartGroups] = useState(0);

  // Material Group form states
  const [groupForm, setGroupForm] = useState({
    groupId: '',
    materialGroup: '',
    description: ''
  });

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
    return parts.filter(p => {
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

  // Validate Group ID (alphanumeric, required)
  const validateGroupId = (value) => {
    if (!value) return false;
    return /^[A-Za-z0-9_-]+$/.test(value);
  };

  // Validate Material Group name (required)
  const validateMaterialGroup = (value) => {
    return value && value.trim().length > 0;
  };

  // Handle add material group
  const handleAddGroup = async () => {
    setGroupIdError(false);
    setMaterialGroupError(false);
    setDescriptionError(false);

    if (!validateGroupId(groupForm.groupId)) {
      setGroupIdError(true);
      setSnackbar({ open: true, message: 'Group ID is required and must be alphanumeric', severity: 'error' });
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
  };

  // Handle edit group
  const handleEditGroup = (group) => {
    setEditGroupForm({
      id: group.id,
      groupId: group.groupId,
      materialGroup: group.materialGroup,
      description: group.description || ''
    });
    setEditGroupDialogOpen(true);
  };

  // Handle save group changes
  const handleSaveGroupChanges = async () => {
    setEditGroupIdError(false);
    setEditMaterialGroupError(false);
    setEditDescriptionError(false);

    if (!validateGroupId(editGroupForm.groupId)) {
      setEditGroupIdError(true);
      setSnackbar({ open: true, message: 'Group ID is required and must be alphanumeric', severity: 'error' });
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
    try {
      await deleteDoc(doc(db, 'materialGroups', deleteGroupTarget.id));

      // Refresh material groups list
      const groupsSnapshot = await getDocs(collection(db, 'materialGroups'));
      const groupsData = groupsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      setMaterialGroups(groupsData);

      setDeleteGroupDialogOpen(false);
      setDeleteGroupTarget(null);
      setSnackbar({ open: true, message: 'Material Group deleted successfully', severity: 'success' });
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
  const partPageEnd = Math.min(pageStartParts + pageSize, filteredPartsPending.length);
  const partsPaginated = filteredPartsPending.slice(pageStartParts, partPageEnd);

  // Pagination for groups
  const groupPageEnd = Math.min(pageStartGroups + pageSize, filteredGroups.length);
  const groupsPaginated = filteredGroups.slice(pageStartGroups, groupPageEnd);

  if (loading) {
    return <Box sx={{ p: 3 }}><Typography>Loading...</Typography></Box>;
  }

  return (
    <Box sx={{ m: 0, p: 0 }}>
      <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <h2 style={{ margin: 0 }}>PART GROUP MASTER - ENGINEERING STORE SPARE PART</h2>
        </Box>
      </Paper>

      {/* Part List Pending Verify */}
      <Paper elevation={1} sx={{ p: 2, mb: 3, mx: 0 }}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
          PART LIST PENDING VERIFY ({filteredPartsPending.length} ITEMS)
        </Typography>

        {/* Search Box */}
        <Box sx={{ mb: 2 }}>
          <TextField
            label="Search (SAP#, Int.Ref, Name)"
            placeholder="Search..."
            value={searchQueryParts}
            onChange={(e) => {
              setSearchQueryParts(e.target.value);
              setPageStartParts(0);
            }}
            size="small"
            fullWidth
            InputProps={{
              startAdornment: <SearchIcon sx={{ mr: 1 }} />,
            }}
          />
        </Box>

        {/* Parts Table */}
        <Box sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold', width: '10%' }}>SAP#</TableCell>
                <TableCell sx={{ fontWeight: 'bold', width: '12%' }}>Int.Ref</TableCell>
                <TableCell sx={{ fontWeight: 'bold', width: '20%' }}>Name</TableCell>
                <TableCell sx={{ fontWeight: 'bold', width: '15%' }}>Category</TableCell>
                <TableCell sx={{ fontWeight: 'bold', width: '20%' }}>Material Group</TableCell>
                <TableCell sx={{ fontWeight: 'bold', width: '13%' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {partsPaginated.length > 0 ? (
                partsPaginated.map((part) => (
                  <TableRow key={part.id} hover>
                    <TableCell>{part.sapNumber}</TableCell>
                    <TableCell>{part.internalRef}</TableCell>
                    <TableCell>{part.name}</TableCell>
                    <TableCell>{part.category}</TableCell>
                    <TableCell>
                      {part.materialGroupId ? (
                        materialGroups.find(g => g.id === part.materialGroupId)?.materialGroup || 'N/A'
                      ) : (
                        <Typography variant="body2" sx={{ color: '#999', fontStyle: 'italic' }}>
                          Not assigned
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Tooltip title="Edit Material Group">
                        <IconButton
                          size="small"
                          onClick={() => handleEditPart(part)}
                          sx={{ mr: 1 }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDeletePart(part)}
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
                    No parts found
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
              onClick={() => setPageStartParts(Math.max(0, pageStartParts - pageSize))}
              disabled={pageStartParts === 0}
              sx={{ mr: 1 }}
            >
              &lt;&lt; Previous
            </Button>
            <Button
              variant="outlined"
              size="small"
              onClick={() => setPageStartParts(pageStartParts + pageSize)}
              disabled={partPageEnd >= filteredPartsPending.length}
            >
              Next &gt;&gt;
            </Button>
          </Box>
          <Typography variant="body2" sx={{ color: '#666' }}>
            Showing {filteredPartsPending.length > 0 ? pageStartParts + 1 : 0}-{partPageEnd} of {filteredPartsPending.length} items
          </Typography>
        </Box>
      </Paper>

      <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
          MATERIAL GROUP LIST ({filteredGroups.length} ITEMS)
        </Typography>

            {/* Search Box */}
            <Box sx={{ mb: 2 }}>
              <TextField
                label="Search (Group ID, Material Group, Description)"
                placeholder="Search..."
                value={searchQueryGroups}
                onChange={(e) => {
                  setSearchQueryGroups(e.target.value);
                  setPageStartGroups(0);
                }}
                size="small"
                fullWidth
                InputProps={{
                  startAdornment: <SearchIcon sx={{ mr: 1 }} />,
                }}
              />
            </Box>

            {/* Groups Table */}
            <Box sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold', width: '15%' }}>Group ID</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', width: '25%' }}>Material Group</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', width: '35%' }}>Description</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', width: '15%' }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {groupsPaginated.length > 0 ? (
                    groupsPaginated.map((group) => (
                      <TableRow key={group.id} hover>
                        <TableCell>{group.groupId}</TableCell>
                          <TableCell>{group.materialGroup}</TableCell>
                          <TableCell>{group.description}</TableCell>
                          <TableCell>
                            <Tooltip title="Edit">
                              <IconButton
                                size="small"
                                onClick={() => handleEditGroup(group)}
                                sx={{ mr: 1 }}
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleDeleteGroup(group)}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} align="center" sx={{ py: 3, color: '#999' }}>
                          No material groups found
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
                    onClick={() => setPageStartGroups(Math.max(0, pageStartGroups - pageSize))}
                    disabled={pageStartGroups === 0}
                    sx={{ mr: 1 }}
                  >
                    &lt;&lt; Previous
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => setPageStartGroups(pageStartGroups + pageSize)}
                    disabled={groupPageEnd >= filteredGroups.length}
                  >
                    Next &gt;&gt;
                  </Button>
                </Box>
                <Typography variant="body2" sx={{ color: '#666' }}>
                  Showing {filteredGroups.length > 0 ? pageStartGroups + 1 : 0}-{groupPageEnd} of {filteredGroups.length} items
                </Typography>
              </Box>
            </Paper>

      <Paper elevation={1} sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ mb: 3, fontWeight: 'bold' }}>
          NEW MATERIAL GROUP ENTRY
        </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label="Group ID"
                placeholder="Enter Group ID"
                value={groupForm.groupId}
                onChange={(e) => {
                  setGroupForm({ ...groupForm, groupId: e.target.value });
                  setGroupIdError(false);
                }}
                error={groupIdError}
                helperText={groupIdError ? 'Required, alphanumeric only' : ''}
                fullWidth
                required
                size="small"
              />

              <TextField
                label="Material Group"
                placeholder="Enter Material Group Name"
                value={groupForm.materialGroup}
                onChange={(e) => {
                  setGroupForm({ ...groupForm, materialGroup: e.target.value });
                  setMaterialGroupError(false);
                }}
                error={materialGroupError}
                helperText={materialGroupError ? 'Required' : ''}
                fullWidth
                required
                size="small"
              />

              <TextField
                label="Description"
                placeholder="Enter Description"
                value={groupForm.description}
                onChange={(e) => setGroupForm({ ...groupForm, description: e.target.value })}
                fullWidth
                multiline
                rows={3}
                size="small"
              />

              <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', mt: 2 }}>
                <Button
                  variant="outlined"
                  onClick={handleClearGroupForm}
                >
                  CLEAR
                </Button>
                <Button
                  variant="contained"
                  onClick={handleAddGroup}
                >
                  ADD GROUP
                </Button>
              </Box>
            </Box>
          </Paper>

      {/* Edit Material Group Dialog */}
      <Dialog open={editGroupDialogOpen} onClose={() => setEditGroupDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Material Group Details</DialogTitle>
        <DialogContent sx={{ py: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Group ID"
              value={editGroupForm.groupId}
              onChange={(e) => {
                setEditGroupForm({ ...editGroupForm, groupId: e.target.value });
                setEditGroupIdError(false);
              }}
              error={editGroupIdError}
              helperText={editGroupIdError ? 'Required, alphanumeric only' : ''}
              fullWidth
              disabled
              size="small"
            />

            <TextField
              label="Material Group"
              value={editGroupForm.materialGroup}
              onChange={(e) => {
                setEditGroupForm({ ...editGroupForm, materialGroup: e.target.value });
                setEditMaterialGroupError(false);
              }}
              error={editMaterialGroupError}
              helperText={editMaterialGroupError ? 'Required' : ''}
              fullWidth
              size="small"
            />

            <TextField
              label="Description"
              value={editGroupForm.description}
              onChange={(e) => setEditGroupForm({ ...editGroupForm, description: e.target.value })}
              fullWidth
              multiline
              rows={3}
              size="small"
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setEditGroupDialogOpen(false)} variant="outlined">
            CANCEL
          </Button>
          <Button onClick={handleSaveGroupChanges} variant="contained">
            SAVE CHANGES
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Material Group Confirmation Dialog */}
      <Dialog open={deleteGroupDialogOpen} onClose={handleDeleteGroupClose} maxWidth="xs" fullWidth>
        <DialogTitle>Delete {deleteGroupTarget?.materialGroup}?</DialogTitle>
        <DialogContent>
          <Box sx={{ py: 2 }}>
            <p style={{ marginTop: 0 }}>Are you sure you want to delete this material group?</p>
            <Box sx={{ my: 2 }}>
              <p><strong>Group ID:</strong> {deleteGroupTarget?.groupId}</p>
              <p><strong>Material Group:</strong> {deleteGroupTarget?.materialGroup}</p>
            </Box>
            <Alert severity="warning" sx={{ mt: 2 }}>
              This action cannot be undone.
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleDeleteGroupClose} variant="outlined">
            CANCEL
          </Button>
          <Button onClick={handleConfirmDeleteGroup} variant="contained" color="error">
            CONFIRM DELETE
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Part Material Group Dialog */}
      <Dialog open={editPartDialogOpen} onClose={() => setEditPartDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Part Material Group</DialogTitle>
        <DialogContent sx={{ py: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="SAP#"
              value={editPartForm.sapNumber}
              fullWidth
              disabled
              size="small"
            />

            <TextField
              label="Int.Ref"
              value={editPartForm.internalRef}
              fullWidth
              disabled
              size="small"
            />

            <TextField
              label="Part Name"
              value={editPartForm.name}
              fullWidth
              disabled
              size="small"
            />

            <TextField
              label="Category"
              value={editPartForm.category}
              fullWidth
              disabled
              size="small"
            />

            <TextField
              select
              label="Material Group"
              value={editPartForm.materialGroupId}
              onChange={(e) => setEditPartForm({ ...editPartForm, materialGroupId: e.target.value })}
              fullWidth
              size="small"
            >
              <MenuItem value="">-- Select Group --</MenuItem>
              {materialGroups.map(group => (
                <MenuItem key={group.id} value={group.id}>
                  {group.materialGroup}
                </MenuItem>
              ))}
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setEditPartDialogOpen(false)} variant="outlined">
            CANCEL
          </Button>
          <Button onClick={handleSavePartChanges} variant="contained">
            SAVE CHANGES
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Part Confirmation Dialog */}
      <Dialog open={deletePartDialogOpen} onClose={handleDeletePartClose} maxWidth="xs" fullWidth>
        <DialogTitle>Delete {deletePartTarget?.name}?</DialogTitle>
        <DialogContent>
          <Box sx={{ py: 2 }}>
            <p style={{ marginTop: 0 }}>Are you sure you want to delete this part?</p>
            <Box sx={{ my: 2 }}>
              <p><strong>SAP#:</strong> {deletePartTarget?.sapNumber}</p>
              <p><strong>Int.Ref:</strong> {deletePartTarget?.internalRef}</p>
              <p><strong>Name:</strong> {deletePartTarget?.name}</p>
            </Box>
            <Alert severity="warning" sx={{ mt: 2 }}>
              This action cannot be undone.
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleDeletePartClose} variant="outlined">
            CANCEL
          </Button>
          <Button onClick={handleConfirmDeletePart} variant="contained" color="error">
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

export default PartGroupMaster;
