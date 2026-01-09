import React, { useState, useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { db } from '../../firebase/config';
import { collection, getDocs, deleteDoc, doc, setDoc, query, where } from 'firebase/firestore';
import { Roles } from '../../utils/roles';
import {
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  InputAdornment,
  Paper,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  Alert,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import AddIcon from '@mui/icons-material/Add';
import WarningIcon from '@mui/icons-material/Warning';
import RefreshIcon from '@mui/icons-material/Refresh';
import ShieldIcon from '@mui/icons-material/Shield';

const defaultForm = {
  groupId: '',
  groupName: '',
  description: '',
  department: '',
  permissions: {
    inventory: false,
    procurement: false,
    maintenance: false,
    admin: false,
    canAccessUserManagement: false,
    canAccessPartMaster: false,
    canAccessAssetRegistry: false,
    canAccessStorageLocations: false,
    canAccessSupplierManagement: false,
    canAccessReports: false
  }
};

// Convert Roles to array for predefined groups
const predefinedGroups = Object.values(Roles).map(role => ({
  groupId: role.groupId,
  groupName: role.name,
  description: getGroupDescription(role.name),
  permissions: role.permissions
}));

function getGroupDescription(roleName) {
  switch (roleName) {
    case 'Admin':
      return 'Administrator group with full access';
    case 'Store keeper':
      return 'Manages inventory and stock';
    case 'Maintenance Technician':
      return 'Handles maintenance requests';
    case 'Procurement Officer':
      return 'Manages purchases and orders';
    default:
      return '';
  }
}

const UserGroupMaster = () => {
  const currentUser = useSelector((state) => state.auth.user);
  const isAdmin = currentUser?.groupId === 'A';
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [stats, setStats] = useState({ total: 0, active: 0 });
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState({ open: false, edit: false, data: defaultForm });
  const [snackbar, setSnackbar] = useState({ open: false, msg: '', severity: 'success' });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [groupIdError, setGroupIdError] = useState(false);
  const [groupNameError, setGroupNameError] = useState(false);

  const calculateStats = (data) => {
    setStats({
      total: data.length,
      active: data.filter(g => !['D', 'S'].includes(g.groupId?.[0])).length,
    });
  };

  const fetchGroups = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'groups'));
      const groupsData = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id,
          groupId: data.groupId || doc.id,
          groupName: data.name || data.groupName || doc.id || '',
          description: data.description || '',
          department: data.department || '',
        };
      });
      setGroups(groupsData);
      calculateStats(groupsData);
    } catch (err) {
      setSnackbar({ open: true, msg: 'Failed to fetch groups', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  const filteredGroups = useMemo(() => {
    const q = (search || '').trim().toLowerCase();
    return groups.filter((group) => {
      const matchesSearch = !q ? true : [
        group.groupId,
        group.groupName,
        group.description,
        group.department,
      ]
        .map((x) => (x || '').toString().toLowerCase())
        .join(' | ')
        .includes(q);
      return matchesSearch;
    });
  }, [groups, search]);

  const openAdd = () => {
    setModal({ open: true, edit: false, data: defaultForm });
    setGroupIdError(false);
    setGroupNameError(false);
  };

  const openEdit = (row) => {
    setModal({
      open: true,
      edit: true,
      data: {
        ...row,
        groupName: row.groupName || row.name || row.groupId,
      },
    });
    setGroupIdError(false);
    setGroupNameError(false);
  };

  const closeModal = () => {
    setModal({ open: false, edit: false, data: defaultForm });
    setGroupIdError(false);
    setGroupNameError(false);
  };

  const handleSave = async () => {
    const { groupId, groupName, description, department, id } = modal.data;

    setGroupIdError(!groupId);
    setGroupNameError(!groupName);

    if (!groupId || !groupName) {
      setSnackbar({
        open: true,
        msg: 'Group ID and Group Name are required',
        severity: 'error',
      });
      return;
    }

    if (!isAdmin) {
      setSnackbar({
        open: true,
        msg: 'Only admins can add or edit groups',
        severity: 'error',
      });
      return;
    }

    try {
      // Check for duplicate Group ID (only for new groups)
      if (!modal.edit) {
        if (groups.some((g) => g.groupId === groupId)) {
          setGroupIdError(true);
          return setSnackbar({
            open: true,
            msg: 'Group ID already exists',
            severity: 'error',
          });
        }
      }

      // Check for duplicate Group Name (case-insensitive, exclude current if editing)
      const duplicateName = groups.find(
        (g) =>
          (g.groupName || '').toLowerCase() === groupName.toLowerCase() &&
          g.id !== (modal.edit ? id : '')
      );

      if (duplicateName) {
        setGroupNameError(true);
        return setSnackbar({
          open: true,
          msg: 'Group Name already exists',
          severity: 'error',
        });
      }

      if (modal.edit) {
        await setDoc(
          doc(db, 'groups', id),
          {
            groupId,
            name: groupName,
            groupName,
            description,
            department,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
        setSnackbar({ open: true, msg: 'Group updated successfully', severity: 'success' });
      } else {
        await setDoc(doc(db, 'groups', groupId), {
          groupId,
          name: groupName,
          groupName,
          description,
          department,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        setSnackbar({ open: true, msg: 'Group added successfully', severity: 'success' });
      }
      closeModal();
      fetchGroups();
    } catch (err) {
      setSnackbar({
        open: true,
        msg: 'Save failed: ' + err.message,
        severity: 'error',
      });
    }
  };

  const handleDeleteClick = (row) => {
    setDeleteTarget(row);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      const groupToDelete = groups.find((g) => g.id === deleteTarget.id);
      if (!groupToDelete) return;

      const usersQuery = query(
        collection(db, 'users'),
        where('groupId', '==', groupToDelete.groupId)
      );
      const usersSnapshot = await getDocs(usersQuery);

      if (!usersSnapshot.empty) {
        setSnackbar({
          open: true,
          msg: `Cannot delete group. ${usersSnapshot.size} user(s) are assigned to this group`,
          severity: 'error',
        });
        setDeleteDialogOpen(false);
        setDeleteTarget(null);
        return;
      }

      await deleteDoc(doc(db, 'groups', deleteTarget.id));
      setGroups((groups) => groups.filter((g) => g.id !== deleteTarget.id));
      setSnackbar({ open: true, msg: 'Group deleted successfully', severity: 'success' });
    } catch (err) {
      setSnackbar({
        open: true,
        msg: 'Delete failed: ' + err.message,
        severity: 'error',
      });
    } finally {
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
    }
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const refreshData = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'groups'));
      const groupsData = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id,
          groupId: data.groupId || doc.id,
          groupName: data.name || data.groupName || doc.id || '',
          description: data.description || '',
          department: data.department || '',
        };
      });
      setGroups(groupsData);
      calculateStats(groupsData);
      setSnackbar({ open: true, msg: 'Data refreshed successfully', severity: 'success' });
    } catch (error) {
      setSnackbar({ open: true, msg: 'Error refreshing data', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  if (loading && groups.length === 0) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: 'calc(100vh - 64px)',
          backgroundColor: '#f8fafc',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: 'calc(100vh - 64px)',
        backgroundColor: '#f8fafc',
        p: 3,
        width: '100%',
      }}
    >
      {/* Header Section */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 4,
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 56,
              height: 56,
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
              color: 'white',
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
            }}
          >
            <ShieldIcon sx={{ fontSize: 28 }} />
          </Box>
          <Box>
            <Typography
              variant="h4"
              sx={{
                fontWeight: 700,
                color: '#1e293b',
                mb: 0.5,
              }}
            >
              User Group Master
            </Typography>
            <Typography variant="body1" sx={{ color: '#64748b' }}>
              User Roles & Access Control Management
            </Typography>
          </Box>
        </Box>

        {/* Stats Cards */}
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Card
            sx={{
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              backgroundColor: 'white',
              px: 2,
              py: 1.5,
              minWidth: 120,
            }}
          >
            <Box>
              <Typography variant="body2" sx={{ color: '#64748b' }}>
                Total Groups
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 600, color: '#1e293b' }}>
                {stats.total}
              </Typography>
            </Box>
          </Card>
          <Card
            sx={{
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              backgroundColor: 'white',
              px: 2,
              py: 1.5,
              minWidth: 120,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ShieldIcon sx={{ color: '#3b82f6', fontSize: 18 }} />
              <Box>
                <Typography variant="body2" sx={{ color: '#64748b' }}>
                  Active Groups
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 600, color: '#1e293b' }}>
                  {stats.active}
                </Typography>
              </Box>
            </Box>
          </Card>
        </Box>
      </Box>

      {/* Search Section */}
      <Paper
        elevation={0}
        sx={{
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
          backgroundColor: 'white',
          mb: 4,
          width: '100%',
        }}
      >
        <Box
          sx={{
            p: 3,
            borderBottom: '1px solid #e2e8f0',
            backgroundColor: '#eff6ff',
          }}
        >
          <Typography
            variant="h6"
            sx={{
              fontWeight: 600,
              color: '#1e293b',
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            }}
          >
            <SearchIcon sx={{ fontSize: 20, color: '#3b82f6' }} />
            Search & Filter Groups
          </Typography>
          <Typography variant="body2" sx={{ color: '#64748b', mt: 0.5 }}>
            Find groups by ID, name, or description
          </Typography>
        </Box>

        <Box sx={{ p: 3 }}>
          <TextField
            fullWidth
            label="Search Groups"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Group ID, Name, or Description..."
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: '#64748b' }} />
                </InputAdornment>
              ),
              endAdornment: search && (
                <InputAdornment position="end">
                  <IconButton onClick={() => setSearch('')} size="small">
                    <ClearIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ),
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: '10px',
                backgroundColor: '#f8fafc',
              },
            }}
          />
        </Box>
      </Paper>

      {/* Groups List Section */}
      <Paper
        elevation={0}
        sx={{
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
          backgroundColor: 'white',
          mb: 4,
          width: '100%',
        }}
      >
        <Box
          sx={{
            p: 3,
            borderBottom: '1px solid #e2e8f0',
            backgroundColor: '#eff6ff',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Box>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 600,
                color: '#1e293b',
                display: 'flex',
                alignItems: 'center',
                gap: 1,
              }}
            >
              <ShieldIcon sx={{ fontSize: 20, color: '#3b82f6' }} />
              Group List
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748b', mt: 0.5 }}>
              {filteredGroups.length} groups found
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {isAdmin && (
              <Tooltip title="Add Group">
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={openAdd}
                  sx={{
                    background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                    borderRadius: '10px',
                    textTransform: 'none',
                    fontWeight: 600,
                  }}
                >
                  Add Group
                </Button>
              </Tooltip>
            )}
            <Tooltip title="Refresh data">
              <IconButton
                onClick={refreshData}
                sx={{
                  color: '#3b82f6',
                  backgroundColor: 'white',
                  border: '1px solid #e2e8f0',
                  '&:hover': {
                    backgroundColor: '#eff6ff',
                  },
                }}
              >
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Groups Table */}
        {loading ? (
          <Box sx={{ p: 6, textAlign: 'center' }}>
            <CircularProgress />
          </Box>
        ) : filteredGroups.length === 0 ? (
          <Box
            sx={{
              p: 6,
              textAlign: 'center',
              color: '#94a3b8',
            }}
          >
            <ShieldIcon sx={{ fontSize: 64, mb: 2, opacity: 0.5 }} />
            <Typography variant="h6" sx={{ mb: 1 }}>
              No groups found
            </Typography>
            <Typography variant="body2">
              {groups.length === 0
                ? 'No groups found. Add your first group above.'
                : 'No groups match your search criteria.'}
            </Typography>
          </Box>
        ) : (
          <>
            <Box sx={{ overflowX: 'auto' }}>
              <Table sx={{ minWidth: 900 }}>
                <TableHead sx={{ backgroundColor: '#f8fafc' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Group ID</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Group Name</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Description</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Department</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredGroups
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((g) => (
                      <TableRow key={g.id} hover>
                        <TableCell>
                          <Chip
                            label={g.groupId}
                            size="small"
                            variant="outlined"
                            sx={{ fontWeight: 600 }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: '#1e293b' }}>
                            {g.groupName}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ color: '#64748b' }}>
                            {g.description || '—'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ color: '#64748b' }}>
                            {g.department || '—'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 0.5 }}>
                            {isAdmin && (
                              <Tooltip title="Edit Group">
                                <IconButton
                                  size="small"
                                  onClick={() => openEdit(g)}
                                  sx={{
                                    color: '#3b82f6',
                                    '&:hover': { backgroundColor: '#eff6ff' },
                                  }}
                                >
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                            {isAdmin && (
                              <Tooltip title="Delete Group">
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => handleDeleteClick(g)}
                                  sx={{
                                    '&:hover': { backgroundColor: '#fef2f2' },
                                  }}
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </Box>

            {/* Pagination */}
            <TablePagination
              rowsPerPageOptions={[10, 25, 50, 100]}
              component="div"
              count={filteredGroups.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              sx={{
                borderTop: '1px solid #e2e8f0',
                '& .MuiTablePagination-toolbar': {
                  padding: 2,
                },
              }}
            />
          </>
        )}
      </Paper>

      {/* Add/Edit Group Dialog */}
      <Dialog
        open={modal.open}
        onClose={closeModal}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '12px',
            overflow: 'hidden',
          },
        }}
      >
        <DialogTitle
          sx={{
            pb: 1,
            borderBottom: '1px solid #e2e8f0',
            backgroundColor: '#eff6ff',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ShieldIcon sx={{ color: '#3b82f6' }} />
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#1e293b' }}>
              {modal.edit ? 'Edit Group' : 'Add New Group'}
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ py: 3 }}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                label="Group ID"
                value={modal.data.groupId}
                onChange={(e) => {
                  setModal((m) => ({
                    ...m,
                    data: { ...m.data, groupId: e.target.value },
                  }));
                  setGroupIdError(false);
                }}
                error={groupIdError}
                helperText={groupIdError ? 'Group ID is required or already exists' : ''}
                disabled={modal.edit}
                fullWidth
                required
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '10px',
                    backgroundColor: '#f8fafc',
                  },
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Group Name"
                value={modal.data.groupName}
                onChange={(e) => {
                  setModal((m) => ({
                    ...m,
                    data: { ...m.data, groupName: e.target.value },
                  }));
                  setGroupNameError(false);
                }}
                error={groupNameError}
                helperText={groupNameError ? 'Group Name is required or already exists' : ''}
                fullWidth
                required
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '10px',
                    backgroundColor: '#f8fafc',
                  },
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Description"
                value={modal.data.description}
                onChange={(e) =>
                  setModal((m) => ({
                    ...m,
                    data: { ...m.data, description: e.target.value },
                  }))
                }
                fullWidth
                multiline
                rows={3}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '10px',
                    backgroundColor: '#f8fafc',
                  },
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Department"
                value={modal.data.department}
                onChange={(e) =>
                  setModal((m) => ({
                    ...m,
                    data: { ...m.data, department: e.target.value },
                  }))
                }
                fullWidth
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '10px',
                    backgroundColor: '#f8fafc',
                  },
                }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions
          sx={{
            p: 2,
            borderTop: '1px solid #e2e8f0',
            backgroundColor: '#f8fafc',
          }}
        >
          <Button
            onClick={closeModal}
            variant="outlined"
            sx={{
              borderRadius: '10px',
              borderColor: '#e2e8f0',
              color: '#64748b',
              textTransform: 'none',
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            variant="contained"
            disabled={!isAdmin}
            sx={{
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
              textTransform: 'none',
              fontWeight: 600,
            }}
          >
            {modal.edit ? 'Update Group' : 'Add Group'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '12px',
            overflow: 'hidden',
          },
        }}
      >
        <DialogTitle
          sx={{
            pb: 1,
            borderBottom: '1px solid #e2e8f0',
            backgroundColor: '#fef2f2',
          }}
        >
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
              border: '1px solid #fecaca',
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
              <Box>
                <Typography variant="body2" sx={{ color: '#64748b' }}>
                  Group ID
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 600, color: '#1e293b' }}>
                  {deleteTarget.groupId}
                </Typography>
              </Box>
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" sx={{ color: '#64748b' }}>
                  Group Name
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 600, color: '#1e293b' }}>
                  {deleteTarget.groupName}
                </Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions
          sx={{
            p: 2,
            borderTop: '1px solid #e2e8f0',
            backgroundColor: '#f8fafc',
          }}
        >
          <Button
            onClick={() => setDeleteDialogOpen(false)}
            variant="outlined"
            sx={{
              borderRadius: '10px',
              borderColor: '#e2e8f0',
              color: '#64748b',
              textTransform: 'none',
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
              fontWeight: 600,
            }}
          >
            Delete Group
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
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
          {snackbar.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default UserGroupMaster;
