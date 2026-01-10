import React, { useEffect, useMemo, useState } from 'react';
import { db } from '../../firebase/config';
import { useSelector } from 'react-redux';
import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  updateDoc,
  doc,
  query,
  where,
} from 'firebase/firestore';

import {
  Button,
  Snackbar,
  TextField,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Paper,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Alert,
  Typography,
  Chip,
  Card,
  Grid,
  CircularProgress,
  InputAdornment,
  Tooltip,
  TablePagination,
} from '@mui/material';

import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import BuildIcon from '@mui/icons-material/Build';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import AddIcon from '@mui/icons-material/Add';
import WarningIcon from '@mui/icons-material/Warning';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import RefreshIcon from '@mui/icons-material/Refresh';
import VisibilityIcon from '@mui/icons-material/Visibility';

const normalize = (v) => (v || '').trim().toLowerCase();

const statusChipVariant = (status) => {
  const s = (status || '').toLowerCase();
  if (s === 'active') return { label: 'Active', color: 'success' };
  if (s === 'inactive') return { label: 'Inactive', color: 'error' };
  if (s === 'maintenance') return { label: 'Maintenance', color: 'warning' };
  return { label: status || 'Unknown', color: 'default' };
};

const MachineMaster = () => {
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, active: 0 });

  const user = useSelector(state => state.auth.user);
  const isAdmin = user?.groupId?.toLowerCase() === 'a' || user?.groupId?.toLowerCase() === 'admin';
  const permissions = user?.groupPermissions?.machine_master || {};

  const canAdd = permissions.access === 'add' || isAdmin;
  const canEdit = permissions.access === 'edit' || permissions.access === 'add' || isAdmin;
  const canDelete = permissions.access === 'add' || isAdmin;

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success',
  });

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);

  const [form, setForm] = useState({
    name: '',
    model: '',
    serialNumber: '',
    location: '',
    status: 'Active',
  });

  const [nameError, setNameError] = useState(false);
  const [serialError, setSerialError] = useState(false);

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    model: '',
    serialNumber: '',
    location: '',
    status: 'Active',
  });
  const [editingId, setEditingId] = useState(null);
  const [editNameError, setEditNameError] = useState(false);
  const [editSerialError, setEditSerialError] = useState(false);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const calculateStats = (data) => {
    setStats({
      total: data.length,
      active: data.filter(m => (m.status || '').toLowerCase() === 'active').length,
    });
  };

  const fetchMachines = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'machines'));
      const data = querySnapshot.docs.map((d) => ({ ...d.data(), id: d.id }));
      setMachines(data);
      calculateStats(data);
    } catch (error) {
      setSnackbar({ open: true, message: 'Error fetching machines', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMachines();
  }, []);

  const filteredMachines = useMemo(() => {
    const q = (search || '').trim().toLowerCase();

    return machines.filter((m) => {
      const matchesSearch = !q
        ? true
        : [
          m.name,
          m.model,
          m.serialNumber,
          m.location,
          m.status,
        ]
          .map((x) => (x || '').toString().toLowerCase())
          .join(' | ')
          .includes(q);

      const matchesStatus =
        statusFilter === 'All'
          ? true
          : (m.status || '').toLowerCase() === statusFilter.toLowerCase();

      return matchesSearch && matchesStatus;
    });
  }, [machines, search, statusFilter]);

  const isMachineFormValid = useMemo(() => {
    const nameOk = (form.name || '').trim().length > 0;
    const serialOk = (form.serialNumber || '').trim().length > 0;
    return nameOk && serialOk;
  }, [form.name, form.serialNumber]);

  const handleAdd = async () => {
    if (!canAdd) {
      return setSnackbar({ open: true, message: 'You do not have permission to add machines', severity: 'error' });
    }
    const trimmedName = (form.name || '').trim();
    const trimmedSerial = (form.serialNumber || '').trim();

    if (!trimmedName) {
      setNameError(true);
      return setSnackbar({ open: true, message: 'Machine name is required', severity: 'error' });
    }
    if (!trimmedSerial) {
      setSerialError(true);
      return setSnackbar({ open: true, message: 'Serial number is required', severity: 'error' });
    }

    try {
      const machinesRef = collection(db, 'machines');

      // Duplicate NAME
      const nameQ = query(machinesRef, where('name', '==', trimmedName));
      const nameSnap = await getDocs(nameQ);
      if (!nameSnap.empty) {
        setNameError(true);
        return setSnackbar({ open: true, message: 'Machine name already exists', severity: 'error' });
      }

      // Duplicate SERIAL
      const serialQ = query(machinesRef, where('serialNumber', '==', trimmedSerial));
      const serialSnap = await getDocs(serialQ);
      if (!serialSnap.empty) {
        setSerialError(true);
        return setSnackbar({ open: true, message: 'Serial number already exists', severity: 'error' });
      }

      const machineToSave = {
        ...form,
        name: trimmedName,
        serialNumber: trimmedSerial,
        createdAt: new Date().toISOString()
      };

      await addDoc(machinesRef, machineToSave);

      setSnackbar({ open: true, message: 'Machine added successfully', severity: 'success' });

      setForm({
        name: '',
        model: '',
        serialNumber: '',
        location: '',
        status: 'Active',
      });
      setNameError(false);
      setSerialError(false);

      fetchMachines();
    } catch (e) {
      console.error('Add machine error:', e);
      setSnackbar({ open: true, message: 'Failed to add machine', severity: 'error' });
    }
  };

  const handleEditClick = (m) => {
    setEditingId(m.id);
    setEditForm({ ...m });
    setEditDialogOpen(true);
  };

  const handleEditClose = () => {
    setEditDialogOpen(false);
    setEditingId(null);
    setEditForm({
      name: '',
      model: '',
      serialNumber: '',
      location: '',
      status: 'Active',
    });
    setEditNameError(false);
    setEditSerialError(false);
  };

  const handleSaveEdit = async () => {
    if (!canEdit) {
      return setSnackbar({ open: true, message: 'You do not have permission to edit machines', severity: 'error' });
    }
    const trimmedName = (editForm.name || '').trim();
    const trimmedSerial = (editForm.serialNumber || '').trim();

    if (!trimmedName) {
      setEditNameError(true);
      return setSnackbar({ open: true, message: 'Machine name is required', severity: 'error' });
    }
    if (!trimmedSerial) {
      setEditSerialError(true);
      return setSnackbar({ open: true, message: 'Serial number is required', severity: 'error' });
    }

    try {
      const machinesRef = collection(db, 'machines');

      // Duplicate NAME (other docs)
      const nameQ = query(machinesRef, where('name', '==', trimmedName));
      const nameSnap = await getDocs(nameQ);
      const nameDuplicate = nameSnap.docs.some((d) => d.id !== editingId);
      if (nameDuplicate) {
        setEditNameError(true);
        return setSnackbar({
          open: true,
          message: 'Another machine with this name already exists',
          severity: 'error',
        });
      }

      // Duplicate SERIAL (other docs)
      const serialQ = query(machinesRef, where('serialNumber', '==', trimmedSerial));
      const serialSnap = await getDocs(serialQ);
      const serialDuplicate = serialSnap.docs.some((d) => d.id !== editingId);
      if (serialDuplicate) {
        setEditSerialError(true);
        return setSnackbar({
          open: true,
          message: 'Another machine with this serial number already exists',
          severity: 'error',
        });
      }

      const { id, ...data } = editForm;
      const updated = {
        ...data,
        name: trimmedName,
        serialNumber: trimmedSerial,
        updatedAt: new Date().toISOString()
      };

      await updateDoc(doc(db, 'machines', editingId), updated);

      setSnackbar({ open: true, message: 'Machine updated successfully', severity: 'success' });
      handleEditClose();
      fetchMachines();
    } catch (e) {
      console.error('Update machine error:', e);
      setSnackbar({ open: true, message: 'Failed to update machine', severity: 'error' });
    }
  };

  const handleDeleteClick = (m) => {
    setDeleteTarget(m);
    setDeleteDialogOpen(true);
  };

  const handleDeleteClose = () => {
    setDeleteDialogOpen(false);
    setDeleteTarget(null);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    if (!canDelete) {
      return setSnackbar({ open: true, message: 'You do not have permission to delete machines', severity: 'error' });
    }
    try {
      await deleteDoc(doc(db, 'machines', deleteTarget.id));
      setSnackbar({ open: true, message: 'Machine deleted successfully', severity: 'success' });
      handleDeleteClose();
      fetchMachines();
    } catch (e) {
      setSnackbar({ open: true, message: 'Failed to delete machine', severity: 'error' });
    }
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const getStatusChip = (status) => {
    const s = (status || '').toLowerCase();
    if (s === 'active') return { label: 'Active', color: 'success' };
    if (s === 'inactive') return { label: 'Inactive', color: 'error' };
    if (s === 'maintenance') return { label: 'Maintenance', color: 'warning' };
    return { label: status || 'Unknown', color: 'default' };
  };

  const refreshData = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'machines'));
      const data = querySnapshot.docs.map(d => ({ ...d.data(), id: d.id }));
      setMachines(data);
      calculateStats(data);
      setSnackbar({ open: true, message: 'Data refreshed successfully', severity: 'success' });
    } catch (error) {
      setSnackbar({ open: true, message: 'Error refreshing data', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  if (loading && machines.length === 0) {
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
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: 'white',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
            }}>
              <BuildIcon sx={{ fontSize: 28 }} />
            </Box>
            <Box>
              <Typography variant="h4" sx={{
                fontWeight: 700,
                color: '#1e293b',
                mb: 0.5
              }}>
                Machine Master
              </Typography>
              <Typography variant="body1" sx={{ color: '#64748b' }}>
                Asset & Equipment Management
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
                  Total Machines
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
                <VerifiedUserIcon sx={{ color: '#10b981', fontSize: 18 }} />
                <Box>
                  <Typography variant="body2" sx={{ color: '#64748b' }}>
                    Active Machines
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: '#1e293b' }}>
                    {stats.active}
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
            backgroundColor: '#f0fdf4'
          }}>
            <Typography variant="h6" sx={{
              fontWeight: 600,
              color: '#1e293b',
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              mb: 2
            }}>
              <SearchIcon sx={{ fontSize: 20, color: '#10b981' }} />
              Search & Filter Machines
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748b' }}>
              Find machines by name, model, serial number, or location
            </Typography>
          </Box>

          <Box sx={{ p: 3 }}>
            <Grid container spacing={2} alignItems="flex-start">
              <Grid item xs={12} md={8}>
                <TextField
                  fullWidth
                  label="Search Machines"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name, model, serial, or location..."
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
              <Grid item xs={12} md={4}>
                <FormControl fullWidth>
                  <InputLabel>Status Filter</InputLabel>
                  <Select
                    value={statusFilter}
                    label="Status Filter"
                    onChange={(e) => setStatusFilter(e.target.value)}
                    sx={{
                      borderRadius: '10px',
                      backgroundColor: '#f8fafc',
                    }}
                  >
                    <MenuItem value="All">All Statuses</MenuItem>
                    <MenuItem value="Active">Active</MenuItem>
                    <MenuItem value="Inactive">Inactive</MenuItem>
                    <MenuItem value="Maintenance">Maintenance</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Box>
        </Paper>

        {/* Machines List Section */}
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
            backgroundColor: '#f0fdf4',
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
                <BuildIcon sx={{ fontSize: 20, color: '#10b981' }} />
                Machine List
              </Typography>
              <Typography variant="body2" sx={{ color: '#64748b', mt: 0.5 }}>
                {filteredMachines.length} machines found
              </Typography>
            </Box>
            <Tooltip title="Refresh data">
              <IconButton
                onClick={refreshData}
                sx={{
                  color: '#10b981',
                  backgroundColor: 'white',
                  border: '1px solid #e2e8f0',
                  '&:hover': {
                    backgroundColor: '#f0fdf4'
                  }
                }}
              >
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Box>

          {/* Machines Table */}
          {loading ? (
            <Box sx={{ p: 6, textAlign: 'center' }}>
              <CircularProgress />
            </Box>
          ) : filteredMachines.length === 0 ? (
            <Box sx={{
              p: 6,
              textAlign: 'center',
              color: '#94a3b8'
            }}>
              <BuildIcon sx={{ fontSize: 64, mb: 2, opacity: 0.5 }} />
              <Typography variant="h6" sx={{ mb: 1 }}>
                No machines found
              </Typography>
              <Typography variant="body2">
                {machines.length === 0 ?
                  "No machines found. Add your first machine below." :
                  "No machines match your search or filter criteria."}
              </Typography>
            </Box>
          ) : (
            <>
              <Box sx={{ overflowX: 'auto' }}>
                <Table sx={{ minWidth: 900 }}>
                  <TableHead sx={{ backgroundColor: '#f8fafc' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Model</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Serial #</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Location</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredMachines
                      .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                      .map((m) => {
                        const statusChip = getStatusChip(m.status);
                        return (
                          <TableRow key={m.id} hover>
                            <TableCell>
                              <Typography variant="body2" sx={{ fontWeight: 600, color: '#1e293b' }}>
                                {m.name}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={m.model || '—'}
                                size="small"
                                variant="outlined"
                                sx={{ fontWeight: 500 }}
                              />
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" sx={{ color: '#64748b' }}>
                                {m.serialNumber || '—'}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <LocationOnIcon sx={{ color: '#64748b', fontSize: 16 }} />
                                <Typography variant="body2" sx={{ color: '#64748b' }}>
                                  {m.location || '—'}
                                </Typography>
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={statusChip.label}
                                color={statusChip.color}
                                size="small"
                                sx={{ fontWeight: 600, minWidth: 100 }}
                              />
                            </TableCell>
                            <TableCell>
                              <Box sx={{ display: 'flex', gap: 0.5 }}>
                                <Tooltip title={canEdit ? "Edit Machine" : "View Machine"}>
                                  <IconButton
                                    size="small"
                                    onClick={() => handleEditClick(m)}
                                    sx={{
                                      color: canEdit ? '#10b981' : '#64748b',
                                      '&:hover': { backgroundColor: canEdit ? '#f0fdf4' : '#f1f5f9' }
                                    }}
                                  >
                                    {canEdit ? <EditIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                                  </IconButton>
                                </Tooltip>
                                {canDelete && (
                                  <Tooltip title="Delete Machine">
                                    <IconButton
                                      size="small"
                                      color="error"
                                      onClick={() => handleDeleteClick(m)}
                                      sx={{
                                        '&:hover': { backgroundColor: '#fef2f2' }
                                      }}
                                    >
                                      <DeleteIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                )}
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
                count={filteredMachines.length}
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

        {canAdd ? (
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
              backgroundColor: '#f0fdf4'
            }}>
              <Typography variant="h6" sx={{
                fontWeight: 600,
                color: '#1e293b',
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}>
                <AddIcon sx={{ fontSize: 20, color: '#10b981' }} />
                New Machine Entry
              </Typography>
              <Typography variant="body2" sx={{ color: '#64748b', mt: 0.5 }}>
                Fill in the details below to add a new machine
              </Typography>
            </Box>

            <Box sx={{ p: 4 }}>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Machine Name"
                    value={form.name}
                    onChange={(e) => {
                      setForm({ ...form, name: e.target.value });
                      setNameError(false);
                    }}
                    error={nameError}
                    helperText={nameError ? 'Machine name is required' : ''}
                    required
                    fullWidth
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <BuildIcon sx={{ color: '#64748b' }} />
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
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Model"
                    value={form.model}
                    onChange={(e) => setForm({ ...form, model: e.target.value })}
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
                    label="Serial Number"
                    value={form.serialNumber}
                    onChange={(e) => {
                      setForm({ ...form, serialNumber: e.target.value });
                      setSerialError(false);
                    }}
                    error={serialError}
                    helperText={serialError ? 'Serial number is required' : ''}
                    required
                    fullWidth
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <VerifiedUserIcon sx={{ color: '#64748b' }} />
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
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Location"
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
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
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Status</InputLabel>
                    <Select
                      value={form.status}
                      label="Status"
                      onChange={(e) => setForm({ ...form, status: e.target.value })}
                      sx={{
                        borderRadius: '10px',
                        backgroundColor: '#f8fafc',
                      }}
                    >
                      <MenuItem value="Active">Active</MenuItem>
                      <MenuItem value="Inactive">Inactive</MenuItem>
                      <MenuItem value="Maintenance">Maintenance</MenuItem>
                    </Select>
                  </FormControl>
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
                  onClick={handleAdd}
                  disabled={!isMachineFormValid}
                  startIcon={<AddIcon />}
                  sx={{
                    minWidth: 200,
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    px: 4,
                    py: 1.5,
                    fontWeight: 600,
                    fontSize: '1rem',
                    borderRadius: '10px',
                    textTransform: 'none',
                    boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)',
                    '&:hover': {
                      boxShadow: '0 6px 20px rgba(16, 185, 129, 0.6)',
                      transform: 'translateY(-2px)'
                    },
                    '&:disabled': {
                      background: '#e2e8f0',
                      color: '#94a3b8'
                    }
                  }}
                >
                  Add Machine
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => {
                    setForm({
                      name: '',
                      model: '',
                      serialNumber: '',
                      location: '',
                      status: 'Active',
                    });
                    setNameError(false);
                    setSerialError(false);
                  }}
                  startIcon={<ClearIcon />}
                  sx={{
                    px: 4,
                    py: 1.5,
                    borderRadius: '10px',
                    textTransform: 'none',
                    borderColor: '#e2e8f0',
                    color: '#64748b',
                    '&:hover': {
                      borderColor: '#10b981',
                      color: '#10b981'
                    }
                  }}
                >
                  Clear Form
                </Button>
              </Box>
            </Box>
          </Paper>
        ) : (
          <Alert severity="info" sx={{ borderRadius: '16px', mb: 4 }}>
            You do not have permission to add new machines.
          </Alert>
        )}
      </Box>

      {/* Edit Machine Dialog */}
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
          backgroundColor: '#f0fdf4'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <EditIcon sx={{ color: '#10b981' }} />
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#1e293b' }}>
              Edit Machine Details
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ py: 3 }}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                label="Machine Name"
                value={editForm.name}
                onChange={(e) => {
                  setEditForm({ ...editForm, name: e.target.value });
                  setEditNameError(false);
                }}
                error={editNameError}
                helperText={editNameError ? 'Machine name is required' : ''}
                fullWidth
                required
                disabled={!canEdit}
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
                label="Model"
                value={editForm.model}
                onChange={(e) => setEditForm({ ...editForm, model: e.target.value })}
                fullWidth
                disabled={!canEdit}
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
                label="Serial Number"
                value={editForm.serialNumber}
                onChange={(e) => {
                  setEditForm({ ...editForm, serialNumber: e.target.value });
                  setEditSerialError(false);
                }}
                error={editSerialError}
                helperText={editSerialError ? 'Serial number is required' : ''}
                fullWidth
                required
                disabled={!canEdit}
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
                label="Location"
                value={editForm.location}
                onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                fullWidth
                disabled={!canEdit}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '10px',
                    backgroundColor: '#f8fafc',
                  }
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth disabled={!canEdit}>
                <InputLabel>Status</InputLabel>
                <Select
                  value={editForm.status}
                  label="Status"
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  sx={{
                    borderRadius: '10px',
                    backgroundColor: '#f8fafc',
                  }}
                >
                  <MenuItem value="Active">Active</MenuItem>
                  <MenuItem value="Inactive">Inactive</MenuItem>
                  <MenuItem value="Maintenance">Maintenance</MenuItem>
                </Select>
              </FormControl>
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
            {canEdit ? 'Cancel' : 'Close'}
          </Button>
          {canEdit && (
            <Button
              onClick={handleSaveEdit}
              variant="contained"
              sx={{
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                textTransform: 'none',
                fontWeight: 600
              }}
            >
              Save Changes
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
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
                    Machine Name
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600, color: '#1e293b' }}>
                    {deleteTarget.name}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" sx={{ color: '#64748b' }}>
                    Serial Number
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600, color: '#1e293b' }}>
                    {deleteTarget.serialNumber}
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
            Delete Machine
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
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default MachineMaster;
