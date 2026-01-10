import React, { useEffect, useState, useMemo } from 'react';
import { db } from '../../firebase/config';
import { collection, getDocs, addDoc, deleteDoc, updateDoc, doc, Timestamp } from 'firebase/firestore';
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
    CircularProgress,
    Alert,
    Snackbar,
    Chip,
    Divider,
} from '@mui/material';
import {
    Edit as EditIcon,
    Delete as DeleteIcon,
    Search as SearchIcon,
    Add as AddIcon,
    Clear as ClearIcon,
    LocationOn as LocationIcon,
    Refresh as RefreshIcon,
    Warehouse as WarehouseIcon,
    CheckCircle as CheckCircleIcon,
    Visibility as VisibilityIcon
} from '@mui/icons-material';
import { useSelector } from 'react-redux';

// Warehouse Locations Management Page
const WarehouseLocations = () => {
    const user = useSelector(state => state.auth.user);
    const isAdmin = user?.groupId?.toLowerCase() === 'a' || user?.groupId?.toLowerCase() === 'admin';
    const permissions = user?.groupPermissions?.warehouse_locations || {};

    const canAdd = permissions.access === 'add' || isAdmin;
    const canEdit = permissions.access === 'edit' || permissions.access === 'add' || isAdmin;
    const canDelete = permissions.access === 'add' || isAdmin;

    const [locations, setLocations] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
    const [materialGroups, setMaterialGroups] = useState([]);

    // Constants
    const WAREHOUSE_SELECT_LABEL = 'Select Warehouse *';

    // Search and pagination
    const [searchQuery, setSearchQuery] = useState('');
    const [pageStart, setPageStart] = useState(0);
    const pageSize = 50;

    // Unified Form state
    const initialForm = {
        warehouseId: '',
        locationId: '',
        locationName: '',
        locationType: '',
        capacity: '',
        remarks: '',
        status: 'Active'
    };
    const [form, setForm] = useState(initialForm);
    const [formErrors, setFormErrors] = useState({});

    // Dialog states
    const [dialogOpen, setDialogOpen] = useState(false);
    const [isEdit, setIsEdit] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);

    // Selected warehouse details
    const [selectedWarehouse, setSelectedWarehouse] = useState(null);

    // Fetch data from Firestore
    useEffect(() => {
        fetchData();
        fetchMaterialGroups();
    }, []);

    const fetchMaterialGroups = async () => {
        try {
            const snapshot = await getDocs(collection(db, 'materialGroups'));
            const groups = snapshot.docs.map(doc => doc.data().materialGroup).filter(g => g && g.trim() !== '');
            setMaterialGroups(groups.sort());
        } catch (error) {
            console.error('Error fetching material groups:', error);
        }
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch warehouses
            const warehousesSnapshot = await getDocs(collection(db, 'warehouses'));
            const warehousesData = warehousesSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
            setWarehouses(warehousesData);

            // Fetch locations
            const locationsSnapshot = await getDocs(collection(db, 'warehouseLocations'));
            const locationsData = locationsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
            setLocations(locationsData);
        } catch (error) {
            console.error('Error fetching data:', error);
            setSnackbar({ open: true, message: 'Error fetching data', severity: 'error' });
        } finally {
            setLoading(false);
        }
    };

    // Calculate total capacity used in a warehouse
    const calculateUsedCapacity = (warehouseId, excludeLocationId = null) => {
        return locations
            .filter(loc => loc.warehouseId === warehouseId && loc.id !== excludeLocationId)
            .reduce((total, loc) => {
                const capacity = parseFloat(loc.capacity) || 0;
                return total + capacity;
            }, 0);
    };

    // Get warehouse by ID
    const getWarehouseById = (warehouseId) => {
        return warehouses.find(w => w.id === warehouseId);
    };

    // Helper to get warehouse name for table display
    const getWarehouseName = (warehouseId) => {
        const warehouse = getWarehouseById(warehouseId);
        return warehouse ? warehouse.warehouseName : 'Unknown';
    };

    // Validate form
    const validateForm = () => {
        const errors = {};

        if (!form.warehouseId) {
            errors.warehouseId = 'Warehouse selection is required';
        }

        if (!form.locationId || form.locationId.trim() === '') {
            errors.locationId = 'Location ID is required';
        }

        if (!form.locationName || form.locationName.trim() === '') {
            errors.locationName = 'Location Name is required';
        }

        // Validate capacity if specified
        if (form.capacity && form.warehouseId) {
            const numericCapacity = parseFloat(form.capacity);
            if (isNaN(numericCapacity) || numericCapacity <= 0) {
                errors.capacity = 'Capacity must be a positive number';
            } else if (selectedWarehouse && selectedWarehouse.capacity) {
                const totalWarehouseCapacity = parseFloat(selectedWarehouse.capacity);
                const usedCapacity = calculateUsedCapacity(form.warehouseId, isEdit ? form.id : null);
                const remainingCapacity = totalWarehouseCapacity - usedCapacity;

                if (numericCapacity > remainingCapacity) {
                    errors.capacity = `Capacity exceeds available warehouse capacity (Max: ${remainingCapacity.toFixed(2)})`;
                }
            }
        }

        return errors;
    };

    // Handle warehouse selection
    const handleWarehouseSelect = (warehouseId) => {
        const warehouse = getWarehouseById(warehouseId);
        setSelectedWarehouse(warehouse);
        setForm({
            ...form,
            warehouseId,
            capacity: '' // Reset capacity when warehouse changes as validation limits change
        });
        setFormErrors({ ...formErrors, warehouseId: '' });
    };

    // Handle dialog open (unified)
    const handleOpenDialog = (location = null) => {
        if (location) {
            setIsEdit(true);
            const warehouse = getWarehouseById(location.warehouseId);
            setSelectedWarehouse(warehouse);
            setForm({
                id: location.id,
                warehouseId: location.warehouseId || '',
                locationId: location.locationId || '',
                locationName: location.locationName || '',
                locationType: location.locationType || '',
                capacity: location.capacity || '',
                remarks: location.remarks || '',
                status: location.status || 'Active'
            });
        } else {
            setIsEdit(false);
            setSelectedWarehouse(null);
            setForm(initialForm);
        }
        setFormErrors({});
        setDialogOpen(true);
    };

    const handleSubmit = async () => {
        if (isEdit && !canEdit) {
            setSnackbar({ open: true, message: 'You do not have permission to edit locations', severity: 'error' });
            return;
        }
        if (!isEdit && !canAdd) {
            setSnackbar({ open: true, message: 'You do not have permission to add locations', severity: 'error' });
            return;
        }
        const errors = validateForm();

        if (Object.keys(errors).length > 0) {
            setFormErrors(errors);
            setSnackbar({ open: true, message: 'Please fix the errors', severity: 'error' });
            return;
        }

        // Check for duplicate location ID within the same warehouse
        const locationExists = locations.some(
            loc => (!isEdit || loc.id !== form.id) &&
                loc.warehouseId === form.warehouseId &&
                loc.locationId.toLowerCase() === form.locationId.toLowerCase()
        );

        if (locationExists) {
            setFormErrors({ locationId: 'Location ID already exists in this warehouse' });
            setSnackbar({ open: true, message: 'Location ID already exists', severity: 'error' });
            return;
        }

        try {
            const data = {
                warehouseId: form.warehouseId,
                locationId: form.locationId.toUpperCase(),
                locationName: form.locationName,
                locationType: form.locationType,
                capacity: form.capacity ? parseFloat(form.capacity) : 0,
                remarks: form.remarks || '',
                status: form.status,
                updatedAt: Timestamp.now()
            };

            if (isEdit) {
                await updateDoc(doc(db, 'warehouseLocations', form.id), data);
            } else {
                await addDoc(collection(db, 'warehouseLocations'), {
                    ...data,
                    createdAt: Timestamp.now()
                });
            }

            setDialogOpen(false);
            fetchData();
            setSnackbar({
                open: true,
                message: `Location ${isEdit ? 'updated' : 'created'} successfully`,
                severity: 'success'
            });
        } catch (error) {
            console.error('Error saving location:', error);
            setSnackbar({ open: true, message: 'Error saving location', severity: 'error' });
        }
    };

    // Handle delete location
    const handleOpenDeleteDialog = (location) => {
        setDeleteTarget(location);
        setDeleteDialogOpen(true);
    };

    const handleDeleteLocation = async () => {
        if (!canDelete) {
            setSnackbar({ open: true, message: 'You do not have permission to delete locations', severity: 'error' });
            return;
        }
        try {
            await deleteDoc(doc(db, 'warehouseLocations', deleteTarget.id));
            setDeleteDialogOpen(false);
            setDeleteTarget(null);
            fetchData();
            setSnackbar({ open: true, message: 'Location deleted successfully', severity: 'success' });
        } catch (error) {
            console.error('Error deleting location:', error);
            setSnackbar({ open: true, message: 'Error deleting location', severity: 'error' });
        }
    };

    // Filtered locations
    const filteredLocations = useMemo(() => {
        return locations.filter(loc => {
            const warehouse = getWarehouseById(loc.warehouseId);
            const warehouseName = warehouse ? warehouse.warehouseName : '';
            const warehouseCode = warehouse ? warehouse.warehouseCode : '';

            const matchesSearch =
                (loc.locationId && loc.locationId.toLowerCase().includes(searchQuery.toLowerCase())) ||
                (loc.locationName && loc.locationName.toLowerCase().includes(searchQuery.toLowerCase())) ||
                (warehouseName && warehouseName.toLowerCase().includes(searchQuery.toLowerCase())) ||
                (warehouseCode && warehouseCode.toLowerCase().includes(searchQuery.toLowerCase()));
            return matchesSearch;
        });
    }, [locations, searchQuery, warehouses]);

    // Pagination
    const pageEnd = Math.min(pageStart + pageSize, filteredLocations.length);
    const locationsPaginated = filteredLocations.slice(pageStart, pageEnd);

    // Stats
    const stats = {
        total: locations.length,
        warehouses: warehouses.length,
    };

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
                            background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
                            color: 'white',
                            boxShadow: '0 4px 12px rgba(6, 182, 212, 0.3)'
                        }}>
                            <LocationIcon sx={{ fontSize: 28 }} />
                        </Box>
                        <Box>
                            <Typography variant="h4" sx={{
                                fontWeight: 700,
                                color: '#1e293b',
                                mb: 0.5
                            }}>
                                Warehouse Locations
                            </Typography>
                            <Typography variant="body1" sx={{ color: '#64748b' }}>
                                Manage storage locations within warehouses
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
                                    Total Locations
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
                                <WarehouseIcon sx={{ color: '#8b5cf6', fontSize: 18 }} />
                                <Box>
                                    <Typography variant="body2" sx={{ color: '#64748b' }}>
                                        Warehouses
                                    </Typography>
                                    <Typography variant="h6" sx={{ fontWeight: 600, color: '#1e293b' }}>
                                        {stats.warehouses}
                                    </Typography>
                                </Box>
                            </Box>
                        </Card>
                    </Box>
                </Box>

                {/* Locations List Section */}
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
                        backgroundColor: '#ecf0ff',
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
                                <LocationIcon sx={{ fontSize: 20, color: '#06b6d4' }} />
                                Locations List
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#64748b', mt: 0.5 }}>
                                {filteredLocations.length} locations found
                            </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                            <Tooltip title="Refresh data">
                                <IconButton
                                    onClick={fetchData}
                                    sx={{
                                        color: '#06b6d4',
                                        backgroundColor: 'white',
                                        border: '1px solid #e2e8f0',
                                        '&:hover': {
                                            backgroundColor: '#ecf0ff'
                                        }
                                    }}
                                >
                                    <RefreshIcon />
                                </IconButton>
                            </Tooltip>
                            {canAdd && (
                                <Button
                                    variant="contained"
                                    startIcon={<AddIcon />}
                                    onClick={() => handleOpenDialog()}
                                    sx={{
                                        background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
                                        textTransform: 'none',
                                        fontWeight: 600,
                                        borderRadius: '10px',
                                        px: 3
                                    }}
                                >
                                    Create Location
                                </Button>
                            )}
                        </Box>
                    </Box>

                    {/* Search Box */}
                    <Box sx={{ p: 3, borderBottom: '1px solid #e2e8f0', backgroundColor: 'white' }}>
                        <TextField
                            label="Search locations"
                            placeholder="Search by Location ID, Name, or Warehouse..."
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setPageStart(0);
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

                    {/* Locations Table */}
                    {filteredLocations.length === 0 ? (
                        <Box sx={{
                            p: 6,
                            textAlign: 'center',
                            color: '#94a3b8'
                        }}>
                            <LocationIcon sx={{ fontSize: 64, mb: 2, opacity: 0.5 }} />
                            <Typography variant="h6" sx={{ mb: 1 }}>
                                No locations found
                            </Typography>
                            <Typography variant="body2">
                                {locations.length === 0 ?
                                    "Create your first location to get started." :
                                    "No locations match your search criteria."}
                            </Typography>
                        </Box>
                    ) : (
                        <>
                            <Box sx={{ overflowX: 'auto' }}>
                                <Table sx={{ minWidth: 1000 }}>
                                    <TableHead sx={{ backgroundColor: '#f8fafc' }}>
                                        <TableRow>
                                            <TableCell sx={{ fontWeight: 600, color: '#475569' }}>Warehouse</TableCell>
                                            <TableCell sx={{ fontWeight: 600, color: '#475569' }}>Location ID</TableCell>
                                            <TableCell sx={{ fontWeight: 600, color: '#475569' }}>Location Name</TableCell>
                                            <TableCell sx={{ fontWeight: 600, color: '#475569' }}>Capacity</TableCell>
                                            <TableCell sx={{ fontWeight: 600, color: '#475569' }}>Remarks</TableCell>
                                            <TableCell sx={{ fontWeight: 600, color: '#475569' }}>Status</TableCell>
                                            <TableCell sx={{ fontWeight: 600, color: '#475569' }} align="center">Actions</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {filteredLocations
                                            .slice(pageStart * pageSize, (pageStart + 1) * pageSize)
                                            .map((location) => (
                                                <TableRow
                                                    key={location.id}
                                                    hover
                                                    sx={{
                                                        '&:last-child td, &:last-child th': { border: 0 },
                                                        '&:hover': { backgroundColor: '#f8fafc' }
                                                    }}
                                                >
                                                    <TableCell>
                                                        <Typography variant="body2" sx={{ fontWeight: 600, color: '#1e293b' }}>
                                                            {getWarehouseName(location.warehouseId)}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Chip
                                                            label={location.locationId}
                                                            size="small"
                                                            sx={{
                                                                fontWeight: 700,
                                                                backgroundColor: '#f1f5f9',
                                                                color: '#475569',
                                                                borderRadius: '6px'
                                                            }}
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                                                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                                                {location.locationName}
                                                            </Typography>
                                                            <Typography variant="caption" sx={{ color: '#64748b' }}>
                                                                {location.locationType || 'General Storage'}
                                                            </Typography>
                                                        </Box>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Typography variant="body2" sx={{ fontWeight: 600, color: '#0f172a' }}>
                                                            {location.capacity || '—'}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Typography variant="body2" sx={{ color: '#64748b' }}>
                                                            {location.remarks || '—'}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Chip
                                                            label={location.status || 'Active'}
                                                            size="small"
                                                            color={(location.status || 'Active') === 'Active' ? 'success' : 'default'}
                                                            sx={{ fontWeight: 600, borderRadius: '6px' }}
                                                        />
                                                    </TableCell>
                                                    <TableCell align="center">
                                                        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
                                                            <Tooltip title={canEdit ? "Edit Location" : "View Details"}>
                                                                <IconButton
                                                                    size="small"
                                                                    onClick={() => handleOpenDialog(location)}
                                                                    sx={{
                                                                        color: canEdit ? '#06b6d4' : '#64748b',
                                                                        '&:hover': { backgroundColor: canEdit ? '#ecf0ff' : '#f1f5f9' }
                                                                    }}
                                                                >
                                                                    {canEdit ? <EditIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                                                                </IconButton>
                                                            </Tooltip>
                                                            {canDelete && (
                                                                <Tooltip title="Delete Location">
                                                                    <IconButton
                                                                        size="small"
                                                                        onClick={() => handleOpenDeleteDialog(location)}
                                                                        sx={{
                                                                            color: '#ef4444',
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
                                        onClick={() => setPageStart(Math.max(0, pageStart - pageSize))}
                                        disabled={pageStart === 0}
                                        sx={{ mr: 1, borderRadius: '8px' }}
                                    >
                                        ← Previous
                                    </Button>
                                    <Button
                                        variant="outlined"
                                        size="small"
                                        onClick={() => setPageStart(pageStart + pageSize)}
                                        disabled={pageEnd >= filteredLocations.length}
                                        sx={{ borderRadius: '8px' }}
                                    >
                                        Next →
                                    </Button>
                                </Box>
                                <Typography variant="body2" sx={{ color: '#64748b' }}>
                                    Showing {filteredLocations.length > 0 ? pageStart + 1 : 0}–{pageEnd} of {filteredLocations.length}
                                </Typography>
                            </Box>
                        </>
                    )}
                </Paper>
            </Box>

            {/* Unified Create/Edit Location Dialog */}
            <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
                <DialogTitle sx={{ fontWeight: 600, backgroundColor: '#ecf0ff', borderBottom: '1px solid #e2e8f0' }}>
                    {isEdit ? 'Edit Warehouse Location' : 'Create New Location'}
                </DialogTitle>
                <DialogContent dividers sx={{ p: 4 }}>
                    <Grid container spacing={3}>
                        {/* Row 1: Warehouse Selection and Details */}
                        <Grid item xs={12} md={6}>
                            <TextField
                                select
                                label={WAREHOUSE_SELECT_LABEL}
                                placeholder="Choose a warehouse"
                                value={form.warehouseId}
                                onChange={(e) => handleWarehouseSelect(e.target.value)}
                                error={!!formErrors.warehouseId}
                                helperText={formErrors.warehouseId}
                                fullWidth
                                required
                                disabled={isEdit ? !canEdit : !canAdd}
                                SelectProps={{ displayEmpty: true }}
                            >
                                <MenuItem value="">{WAREHOUSE_SELECT_LABEL}</MenuItem>
                                {warehouses.filter(w => w.status === 'Active').map((warehouse) => (
                                    <MenuItem key={warehouse.id} value={warehouse.id}>
                                        {warehouse.warehouseName} ({warehouse.warehouseCode})
                                    </MenuItem>
                                ))}
                            </TextField>
                        </Grid>

                        {selectedWarehouse && (
                            <Grid item xs={12} md={6}>
                                <Paper sx={{ p: 2, backgroundColor: '#f8fafc', borderRadius: '10px', height: '100%' }}>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: '#475569' }}>
                                        Warehouse Overview
                                    </Typography>
                                    <Grid container spacing={1}>
                                        <Grid item xs={6}>
                                            <Typography variant="caption" sx={{ color: '#64748b' }}>Limit:</Typography>
                                            <Typography variant="body2" sx={{ fontWeight: 600 }}>{selectedWarehouse.capacity || 'Unlimited'}</Typography>
                                        </Grid>
                                        <Grid item xs={6}>
                                            <Typography variant="caption" sx={{ color: '#64748b' }}>Used:</Typography>
                                            <Typography variant="body2" sx={{ fontWeight: 600, color: '#f59e0b' }}>
                                                {calculateUsedCapacity(selectedWarehouse.id, isEdit ? form.id : null).toFixed(2)}
                                            </Typography>
                                        </Grid>
                                        <Grid item xs={12}>
                                            <Typography variant="caption" sx={{ color: '#64748b' }}>Available:</Typography>
                                            <Typography variant="body2" sx={{ fontWeight: 600, color: '#10b981' }}>
                                                {selectedWarehouse.capacity ?
                                                    (parseFloat(selectedWarehouse.capacity) - calculateUsedCapacity(selectedWarehouse.id, isEdit ? form.id : null)).toFixed(2) :
                                                    'Unlimited'}
                                            </Typography>
                                        </Grid>
                                    </Grid>
                                </Paper>
                            </Grid>
                        )}

                        {/* Row 2: Location Details - Only show after warehouse is selected */}
                        {selectedWarehouse && (
                            <>
                                <Grid item xs={12}>
                                    <Divider sx={{ my: 1, borderColor: '#e2e8f0' }} />
                                </Grid>

                                <Grid item xs={12}>
                                    <TextField
                                        select
                                        label="Location Type"
                                        value={form.locationType}
                                        onChange={(e) => setForm({ ...form, locationType: e.target.value })}
                                        fullWidth
                                        disabled={isEdit ? !canEdit : !canAdd}
                                        helperText="Select the primary material group for this location"
                                    >
                                        <MenuItem value="">-- Select Type --</MenuItem>
                                        {materialGroups.map((group) => (
                                            <MenuItem key={group} value={group}>{group}</MenuItem>
                                        ))}
                                    </TextField>
                                </Grid>

                                <Grid item xs={12} md={4}>
                                    <TextField
                                        label="Location ID *"
                                        placeholder="e.g., LOC-001"
                                        value={form.locationId}
                                        onChange={(e) => {
                                            setForm({ ...form, locationId: e.target.value.toUpperCase() });
                                            setFormErrors({ ...formErrors, locationId: '' });
                                        }}
                                        error={!!formErrors.locationId}
                                        helperText={formErrors.locationId}
                                        fullWidth
                                        required
                                        disabled={isEdit ? !canEdit : !canAdd}
                                    />
                                </Grid>

                                <Grid item xs={12} md={8}>
                                    <TextField
                                        label="Location Name *"
                                        placeholder="e.g., Aisle A - Shelf 1"
                                        value={form.locationName}
                                        onChange={(e) => {
                                            setForm({ ...form, locationName: e.target.value });
                                            setFormErrors({ ...formErrors, locationName: '' });
                                        }}
                                        error={!!formErrors.locationName}
                                        helperText={formErrors.locationName}
                                        fullWidth
                                        required
                                        disabled={isEdit ? !canEdit : !canAdd}
                                    />
                                </Grid>

                                <Grid item xs={12} md={3}>
                                    <TextField
                                        label="Capacity"
                                        placeholder="Numeric value"
                                        type="number"
                                        value={form.capacity}
                                        onChange={(e) => {
                                            setForm({ ...form, capacity: e.target.value });
                                            setFormErrors({ ...formErrors, capacity: '' });
                                        }}
                                        error={!!formErrors.capacity}
                                        helperText={formErrors.capacity || 'Leave empty if unlimited'}
                                        fullWidth
                                        disabled={isEdit ? !canEdit : !canAdd}
                                    />
                                </Grid>

                                <Grid item xs={12} md={3}>
                                    <TextField
                                        select
                                        label="Status"
                                        value={form.status}
                                        onChange={(e) => setForm({ ...form, status: e.target.value })}
                                        fullWidth
                                        disabled={isEdit ? !canEdit : !canAdd}
                                    >
                                        <MenuItem value="Active">Active</MenuItem>
                                        <MenuItem value="Inactive">Inactive</MenuItem>
                                    </TextField>
                                </Grid>

                                <Grid item xs={12} md={6}>
                                    <TextField
                                        label="Remarks"
                                        placeholder="Additional notes"
                                        value={form.remarks}
                                        onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                                        fullWidth
                                        multiline
                                        rows={1}
                                        disabled={isEdit ? !canEdit : !canAdd}
                                    />
                                </Grid>
                            </>
                        )}
                    </Grid>
                </DialogContent>
                <DialogActions sx={{ p: 2, borderTop: '1px solid #e2e8f0' }}>
                    <Button onClick={() => setDialogOpen(false)} variant="outlined" sx={{ borderRadius: '8px' }}>
                        {((isEdit && canEdit) || (!isEdit && canAdd)) ? 'Cancel' : 'Close'}
                    </Button>
                    {((isEdit && canEdit) || (!isEdit && canAdd)) && (
                        <Button
                            onClick={handleSubmit}
                            variant="contained"
                            sx={{
                                borderRadius: '8px',
                                background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)'
                            }}
                        >
                            {isEdit ? 'Save Changes' : 'Create Location'}
                        </Button>
                    )}
                </DialogActions>
            </Dialog>

            {/* Delete Location Dialog */}
            <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle sx={{ fontWeight: 600, backgroundColor: '#fee2e2', borderBottom: '1px solid #fecaca' }}>
                    Delete Location?
                </DialogTitle>
                <DialogContent sx={{ py: 3 }}>
                    <Box sx={{ py: 2 }}>
                        <Typography variant="body2" sx={{ mb: 2, color: '#64748b' }}>
                            Are you sure you want to delete this location?
                        </Typography>
                        <Box sx={{ my: 2, p: 2, backgroundColor: '#fef2f2', borderRadius: '10px', borderLeft: '4px solid #ef4444' }}>
                            <Typography variant="body2" sx={{ mb: 1 }}>
                                <strong>Location ID:</strong> {deleteTarget?.locationId}
                            </Typography>
                            <Typography variant="body2">
                                <strong>Name:</strong> {deleteTarget?.locationName}
                            </Typography>
                        </Box>
                        <Alert severity="warning" sx={{ mt: 2, borderRadius: '10px' }}>
                            This action cannot be undone.
                        </Alert>
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 2, borderTop: '1px solid #e2e8f0' }}>
                    <Button onClick={() => setDeleteDialogOpen(false)} variant="outlined" sx={{ borderRadius: '8px' }}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleDeleteLocation}
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

export default WarehouseLocations;
