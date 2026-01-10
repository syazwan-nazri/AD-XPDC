import React, { useEffect, useMemo, useState } from 'react';
import { db } from '../../firebase/config';
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
  Alert,
  Typography,
  Card,
  Grid,
  CircularProgress,
  InputAdornment,
  Chip,
  Tooltip,
  TablePagination,
} from '@mui/material';

import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import BusinessIcon from '@mui/icons-material/Business';
import PersonIcon from '@mui/icons-material/Person';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import AddIcon from '@mui/icons-material/Add';
import WarningIcon from '@mui/icons-material/Warning';
import PhoneIcon from '@mui/icons-material/Phone';
import EmailIcon from '@mui/icons-material/Email';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import RefreshIcon from '@mui/icons-material/Refresh';

const MALAYSIA_STATES = [
  'Johor',
  'Kedah',
  'Kelantan',
  'Melaka',
  'Negeri Sembilan',
  'Pahang',
  'Perak',
  'Perlis',
  'Pulau Pinang',
  'Sabah',
  'Sarawak',
  'Selangor',
  'Terengganu',
  'Wilayah Persekutuan Kuala Lumpur',
  'Wilayah Persekutuan Putrajaya',
  'Wilayah Persekutuan Labuan',
];

const normalize = (v) => (v || '').trim().toLowerCase();

const buildAddress = ({ houseNo, building, street, postalCode, state, country }) =>
  [houseNo, building, street, postalCode, state, country].filter(Boolean).join(', ');

const SupplierMaster = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [stats, setStats] = useState({ total: 0, active: 0 });

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success',
  });

  const [search, setSearch] = useState('');

  // Form states
  const [form, setForm] = useState({
    name: '',
    contactPerson: '',
    email: '',
    phone: '',
    houseNo: '',
    building: '',
    street: '',
    postalCode: '',
    state: '',
    country: 'Malaysia',
  });

  const [nameError, setNameError] = useState(false);
  const [contactPersonError, setContactPersonError] = useState(false);
  const [emailError, setEmailError] = useState(false);
  const [phoneError, setPhoneError] = useState(false);

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    contactPerson: '',
    email: '',
    phone: '',
    houseNo: '',
    building: '',
    street: '',
    postalCode: '',
    state: '',
    country: 'Malaysia',
    address: '',
  });
  const [editingId, setEditingId] = useState(null);
  const [editNameError, setEditNameError] = useState(false);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const calculateStats = (data) => {
    setStats({
      total: data.length,
      active: data.filter(s => s.status !== 'Inactive').length,
    });
  };

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'suppliers'));
      const data = querySnapshot.docs.map((d) => ({ ...d.data(), id: d.id }));
      setSuppliers(data);
      calculateStats(data);
    } catch (error) {
      setSnackbar({ open: true, message: 'Error fetching suppliers', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  // Filtered suppliers
  const filteredSuppliers = useMemo(() => {
    const q = (search || '').trim().toLowerCase();
    if (!q) return suppliers;

    return suppliers.filter((s) => {
      const haystack = [
        s.name,
        s.contactPerson,
        s.email,
        s.phone,
        s.address,
      ]
        .map((x) => (x || '').toString().toLowerCase())
        .join(' | ');

      return haystack.includes(q);
    });
  }, [suppliers, search]);

  // Disable add button until valid
  const isSupplierFormValid = useMemo(() => {
    const nameOk = (form.name || '').trim().length > 0;
    return nameOk;
  }, [form.name]);

  const buildAddress = ({ houseNo, building, street, postalCode, state, country }) =>
    [houseNo, building, street, postalCode, state, country].filter(Boolean).join(', ');

  const handleAdd = async () => {
    const trimmedName = (form.name || '').trim();

    if (!trimmedName) {
      setNameError(true);
      return setSnackbar({
        open: true,
        message: 'Supplier name is required',
        severity: 'error',
      });
    }

    try {
      const suppliersRef = collection(db, 'suppliers');
      const q = query(suppliersRef, where('name', '==', trimmedName));
      const snap = await getDocs(q);

      if (!snap.empty) {
        setNameError(true);
        return setSnackbar({
          open: true,
          message: 'Supplier name already exists',
          severity: 'error',
        });
      }

      const fullAddress = buildAddress({
        houseNo: form.houseNo,
        building: form.building,
        street: form.street,
        postalCode: form.postalCode,
        state: form.state,
        country: form.country || 'Malaysia',
      });

      const supplierToSave = {
        name: trimmedName,
        contactPerson: form.contactPerson || '',
        email: form.email || '',
        phone: form.phone || '',
        address: fullAddress,
        createdAt: new Date().toISOString()
      };

      const docRef = await addDoc(collection(db, 'suppliers'), supplierToSave);

      setSnackbar({
        open: true,
        message: 'Supplier added successfully',
        severity: 'success',
      });

      setForm({
        name: '',
        contactPerson: '',
        email: '',
        phone: '',
        houseNo: '',
        building: '',
        street: '',
        postalCode: '',
        state: '',
        country: 'Malaysia',
      });
      setNameError(false);

      fetchSuppliers();
    } catch (e) {
      console.error(e);
      setSnackbar({ open: true, message: 'Failed to add supplier', severity: 'error' });
    }
  };

  const handleEditClick = (s) => {
    setEditingId(s.id);
    setEditForm({ ...s });
    setEditDialogOpen(true);
  };

  const handleEditClose = () => {
    setEditDialogOpen(false);
    setEditingId(null);
    setEditForm({
      name: '',
      contactPerson: '',
      email: '',
      phone: '',
      houseNo: '',
      building: '',
      street: '',
      postalCode: '',
      state: '',
      country: 'Malaysia',
      address: '',
    });
    setEditNameError(false);
  };

  const handleSaveEdit = async () => {
    const trimmedName = (editForm.name || '').trim();

    if (!trimmedName) {
      setEditNameError(true);
      return setSnackbar({
        open: true,
        message: 'Supplier name is required',
        severity: 'error',
      });
    }

    try {
      const suppliersRef = collection(db, 'suppliers');
      const q = query(suppliersRef, where('name', '==', trimmedName));
      const snap = await getDocs(q);

      const hasOtherDuplicate = snap.docs.some((d) => d.id !== editingId);
      if (hasOtherDuplicate) {
        setEditNameError(true);
        return setSnackbar({
          open: true,
          message: 'Another supplier with this name already exists',
          severity: 'error',
        });
      }

      const { id, ...data } = editForm;
      const updated = {
        ...data,
        name: trimmedName,
        updatedAt: new Date().toISOString()
      };

      await updateDoc(doc(db, 'suppliers', editingId), updated);

      setSnackbar({
        open: true,
        message: 'Supplier updated successfully',
        severity: 'success',
      });
      handleEditClose();
      fetchSuppliers();
    } catch (e) {
      console.error('Update supplier error:', e);
      setSnackbar({ open: true, message: 'Failed to update supplier', severity: 'error' });
    }
  };

  const handleDeleteClick = (s) => {
    setDeleteTarget(s);
    setDeleteDialogOpen(true);
  };

  const handleDeleteClose = () => {
    setDeleteDialogOpen(false);
    setDeleteTarget(null);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteDoc(doc(db, 'suppliers', deleteTarget.id));
      setSnackbar({ open: true, message: 'Supplier deleted successfully', severity: 'success' });
      handleDeleteClose();
      fetchSuppliers();
    } catch (e) {
      setSnackbar({ open: true, message: 'Failed to delete supplier', severity: 'error' });
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
      const querySnapshot = await getDocs(collection(db, 'suppliers'));
      const data = querySnapshot.docs.map(d => ({ ...d.data(), id: d.id }));
      setSuppliers(data);
      calculateStats(data);
      setSnackbar({ open: true, message: 'Data refreshed successfully', severity: 'success' });
    } catch (error) {
      setSnackbar({ open: true, message: 'Error refreshing data', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  if (loading && suppliers.length === 0) {
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
              background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
              color: 'white',
              boxShadow: '0 4px 12px rgba(249, 115, 22, 0.3)'
            }}>
              <BusinessIcon sx={{ fontSize: 28 }} />
            </Box>
            <Box>
              <Typography variant="h4" sx={{
                fontWeight: 700,
                color: '#1e293b',
                mb: 0.5
              }}>
                Supplier Master
              </Typography>
              <Typography variant="body1" sx={{ color: '#64748b' }}>
                Vendor & Supplier Management
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
                  Total Suppliers
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
                <PersonIcon sx={{ color: '#f97316', fontSize: 18 }} />
                <Box>
                  <Typography variant="body2" sx={{ color: '#64748b' }}>
                    Active Suppliers
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
            backgroundColor: '#fef3f2'
          }}>
            <Typography variant="h6" sx={{
              fontWeight: 600,
              color: '#1e293b',
              display: 'flex',
              alignItems: 'center',
              gap: 1
            }}>
              <SearchIcon sx={{ fontSize: 20, color: '#f97316' }} />
              Search & Filter Suppliers
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748b', mt: 0.5 }}>
              Find suppliers by name, contact, or location
            </Typography>
          </Box>

          <Box sx={{ p: 3 }}>
            <TextField
              fullWidth
              label="Search Suppliers"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, phone, or address..."
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
          </Box>
        </Paper>

        {/* Suppliers List Section */}
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
            backgroundColor: '#fef3f2',
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
                <BusinessIcon sx={{ fontSize: 20, color: '#f97316' }} />
                Supplier List
              </Typography>
              <Typography variant="body2" sx={{ color: '#64748b', mt: 0.5 }}>
                {filteredSuppliers.length} suppliers found
              </Typography>
            </Box>
            <Tooltip title="Refresh data">
              <IconButton
                onClick={refreshData}
                sx={{
                  color: '#f97316',
                  backgroundColor: 'white',
                  border: '1px solid #e2e8f0',
                  '&:hover': {
                    backgroundColor: '#fef3f2'
                  }
                }}
              >
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Box>

          {/* Suppliers Table */}
          {loading ? (
            <Box sx={{ p: 6, textAlign: 'center' }}>
              <CircularProgress />
            </Box>
          ) : filteredSuppliers.length === 0 ? (
            <Box sx={{
              p: 6,
              textAlign: 'center',
              color: '#94a3b8'
            }}>
              <BusinessIcon sx={{ fontSize: 64, mb: 2, opacity: 0.5 }} />
              <Typography variant="h6" sx={{ mb: 1 }}>
                No suppliers found
              </Typography>
              <Typography variant="body2">
                {suppliers.length === 0 ?
                  "No suppliers found. Add your first supplier below." :
                  "No suppliers match your search criteria."}
              </Typography>
            </Box>
          ) : (
            <>
              <Box sx={{ overflowX: 'auto' }}>
                <Table sx={{ minWidth: 900 }}>
                  <TableHead sx={{ backgroundColor: '#f8fafc' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Contact Person</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Email</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Phone</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Address</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredSuppliers
                      .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                      .map((s) => (
                        <TableRow key={s.id} hover>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 600, color: '#1e293b' }}>
                              {s.name}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ color: '#64748b' }}>
                              {s.contactPerson || '—'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              icon={<EmailIcon />}
                              label={s.email || '—'}
                              size="small"
                              variant="outlined"
                              sx={{ fontWeight: 500 }}
                            />
                          </TableCell>
                          <TableCell>
                            <Chip
                              icon={<PhoneIcon />}
                              label={s.phone || '—'}
                              size="small"
                              variant="outlined"
                              sx={{ fontWeight: 500 }}
                            />
                          </TableCell>
                          <TableCell sx={{ maxWidth: 250 }}>
                            <Typography variant="body2" sx={{ color: '#64748b', noWrap: true }}>
                              {s.address || '—'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', gap: 0.5 }}>
                              <Tooltip title="Edit Supplier">
                                <IconButton
                                  size="small"
                                  onClick={() => handleEditClick(s)}
                                  sx={{
                                    color: '#f97316',
                                    '&:hover': { backgroundColor: '#fef3f2' }
                                  }}
                                >
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Delete Supplier">
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => handleDeleteClick(s)}
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
                      ))}
                  </TableBody>
                </Table>
              </Box>

              {/* Pagination */}
              <TablePagination
                rowsPerPageOptions={[10, 25, 50, 100]}
                component="div"
                count={filteredSuppliers.length}
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

        {/* New Supplier Entry Section */}
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
            backgroundColor: '#fef3f2'
          }}>
            <Typography variant="h6" sx={{
              fontWeight: 600,
              color: '#1e293b',
              display: 'flex',
              alignItems: 'center',
              gap: 1
            }}>
              <AddIcon sx={{ fontSize: 20, color: '#f97316' }} />
              New Supplier Entry
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748b', mt: 0.5 }}>
              Fill in the details below to add a new supplier
            </Typography>
          </Box>

          <Box sx={{ p: 4 }}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Supplier Name"
                  value={form.name}
                  onChange={(e) => {
                    setForm({ ...form, name: e.target.value });
                    setNameError(false);
                  }}
                  error={nameError}
                  helperText={nameError ? 'Supplier name is required' : ''}
                  required
                  fullWidth
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <BusinessIcon sx={{ color: '#64748b' }} />
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
                  label="Contact Person"
                  value={form.contactPerson}
                  onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
                  fullWidth
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <PersonIcon sx={{ color: '#64748b' }} />
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
                  label="Email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  fullWidth
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <EmailIcon sx={{ color: '#64748b' }} />
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
                  label="Phone"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  fullWidth
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <PhoneIcon sx={{ color: '#64748b' }} />
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
              <Grid item xs={12} md={4}>
                <TextField
                  label="House No."
                  value={form.houseNo}
                  onChange={(e) => setForm({ ...form, houseNo: e.target.value })}
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
                  label="Building"
                  value={form.building}
                  onChange={(e) => setForm({ ...form, building: e.target.value })}
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
                  label="Street"
                  value={form.street}
                  onChange={(e) => setForm({ ...form, street: e.target.value })}
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
                  label="Postal Code"
                  value={form.postalCode}
                  onChange={(e) => setForm({ ...form, postalCode: e.target.value })}
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
                  label="State"
                  select
                  value={form.state}
                  onChange={(e) => setForm({ ...form, state: e.target.value })}
                  fullWidth
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '10px',
                      backgroundColor: '#f8fafc',
                    }
                  }}
                >
                  <MenuItem value="">Select State</MenuItem>
                  {MALAYSIA_STATES.map((st) => (
                    <MenuItem key={st} value={st}>{st}</MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  label="Country"
                  value={form.country}
                  onChange={(e) => setForm({ ...form, country: e.target.value })}
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
                disabled={!isSupplierFormValid}
                startIcon={<AddIcon />}
                sx={{
                  minWidth: 200,
                  background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                  px: 4,
                  py: 1.5,
                  fontWeight: 600,
                  fontSize: '1rem',
                  borderRadius: '10px',
                  textTransform: 'none',
                  boxShadow: '0 4px 14px rgba(249, 115, 22, 0.4)',
                  '&:hover': {
                    boxShadow: '0 6px 20px rgba(249, 115, 22, 0.6)',
                    transform: 'translateY(-2px)'
                  },
                  '&:disabled': {
                    background: '#e2e8f0',
                    color: '#94a3b8'
                  }
                }}
              >
                Add Supplier
              </Button>
              <Button
                variant="outlined"
                onClick={() => {
                  setForm({
                    name: '',
                    contactPerson: '',
                    email: '',
                    phone: '',
                    houseNo: '',
                    building: '',
                    street: '',
                    postalCode: '',
                    state: '',
                    country: 'Malaysia',
                  });
                  setNameError(false);
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
                    borderColor: '#f97316',
                    color: '#f97316'
                  }
                }}
              >
                Clear Form
              </Button>
            </Box>
          </Box>
        </Paper>
      </Box>

      {/* Edit Supplier Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={handleEditClose}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '12px',
            display: 'flex',
            flexDirection: 'column',
          }
        }}
      >
        <DialogTitle sx={{
          pb: 1,
          borderBottom: '1px solid #e2e8f0',
          backgroundColor: '#fef3f2'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <EditIcon sx={{ color: '#f97316' }} />
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#1e293b' }}>
              Edit Supplier Details
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ py: 3 }}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                label="Supplier Name"
                value={editForm.name}
                onChange={(e) => {
                  setEditForm({ ...editForm, name: e.target.value });
                  setEditNameError(false);
                }}
                error={editNameError}
                helperText={editNameError ? 'Supplier name is required' : ''}
                fullWidth
                required
                InputLabelProps={{ shrink: true }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '10px',
                    backgroundColor: '#f8fafc',
                  }
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Contact Person"
                value={editForm.contactPerson}
                onChange={(e) => setEditForm({ ...editForm, contactPerson: e.target.value })}
                fullWidth
                InputLabelProps={{ shrink: true }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '10px',
                    backgroundColor: '#f8fafc',
                  }
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Email"
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                fullWidth
                InputLabelProps={{ shrink: true }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '10px',
                    backgroundColor: '#f8fafc',
                  }
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Phone"
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                fullWidth
                InputLabelProps={{ shrink: true }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '10px',
                    backgroundColor: '#f8fafc',
                  }
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Full Address"
                value={editForm.address}
                onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                fullWidth
                multiline
                rows={3}
                InputLabelProps={{ shrink: true }}
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
            onClick={handleSaveEdit}
            variant="contained"
            sx={{
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
              textTransform: 'none',
              fontWeight: 600
            }}
          >
            Save Changes
          </Button>
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
              <Box>
                <Typography variant="body2" sx={{ color: '#64748b' }}>
                  Supplier Name
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 600, color: '#1e293b' }}>
                  {deleteTarget.name}
                </Typography>
              </Box>
              {deleteTarget.contactPerson && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" sx={{ color: '#64748b' }}>
                    Contact Person
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600, color: '#1e293b' }}>
                    {deleteTarget.contactPerson}
                  </Typography>
                </Box>
              )}
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
            Delete Supplier
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

export default SupplierMaster;
