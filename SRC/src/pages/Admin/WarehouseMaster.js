import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../firebase/config';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy, Timestamp } from 'firebase/firestore';
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
    Grid,
    Card,
    Alert,
    Snackbar,
    Chip,
    MenuItem,
    Divider,
} from '@mui/material';
import {
    Edit as EditIcon,
    Delete as DeleteIcon,
    Search as SearchIcon,
    Warehouse as WarehouseIcon,
    Refresh as RefreshIcon,
    Add as AddIcon,
    Clear as ClearIcon,
    CheckCircle as CheckCircleIcon,
    Cancel as CancelIcon,
    Visibility as VisibilityIcon
} from '@mui/icons-material';
import { useSelector } from 'react-redux';
const WarehouseMaster = () => {
    const user = useSelector(state => state.auth.user);
    const isAdmin = user?.groupId?.toLowerCase() === 'a' || user?.groupId?.toLowerCase() === 'admin';
    const permissions = user?.groupPermissions?.warehouse_master || {};

    const canAdd = permissions.access === 'add' || isAdmin;
    const canEdit = permissions.access === 'edit' || permissions.access === 'add' || isAdmin;
    const canDelete = permissions.access === 'add' || isAdmin;

    const [warehouses, setWarehouses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

    // Search and pagination
    const [searchQuery, setSearchQuery] = useState('');
    const [pageStart, setPageStart] = useState(0);
    const pageSize = 50;

    // Unified Form state
    const initialForm = {
        warehouseId: '',
        warehouseCode: '',
        warehouseName: '',
        location: '',
        status: 'Active',
        capacity: '',
        remarks: ''
    };
    const [form, setForm] = useState(initialForm);
    const [formErrors, setFormErrors] = useState({});

    // Dialog states
    const [dialogOpen, setDialogOpen] = useState(false);
    const [isEdit, setIsEdit] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);

    // Fetch warehouses
    useEffect(() => {
        fetchWarehouses();
    }, []);

    const fetchWarehouses = async () => {
        setLoading(true);
        try {
            const q = query(collection(db, 'warehouses'), orderBy('createdAt', 'desc'));
            const snapshot = await getDocs(q);
            const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
            setWarehouses(data);
        } catch (error) {
            console.error('Error fetching warehouses:', error);
            setSnackbar({ open: true, message: 'Error fetching warehouses', severity: 'error' });
        } finally {
            setLoading(false);
        }
    };

    // Generate warehouse ID
    const generateWarehouseId = async () => {
        try {
            const q = query(collection(db, 'warehouses'), orderBy('warehouseId', 'desc'));
            const snapshot = await getDocs(q);

            if (snapshot.empty) {
                return 'WH-001';
            }

            const lastWarehouse = snapshot.docs[0].data();
            const lastNumber = lastWarehouse.warehouseId || 'WH-000';
            const numberPart = parseInt(lastNumber.split('-')[1]) || 0;
            const newNumber = numberPart + 1;

            return `WH-${String(newNumber).padStart(3, '0')}`;
        } catch (error) {
            console.error('Error generating warehouse ID:', error);
            return `WH-${Date.now()}`; // Fallback
        }
    };

    // Validate form
    const validateForm = () => {
        const errors = {};
        if (!form.warehouseCode?.trim()) {
            errors.warehouseCode = 'Warehouse Code is required';
        }
        if (!form.warehouseName?.trim()) {
            errors.warehouseName = 'Warehouse Name is required';
        }
        return errors;
    };

    // Handle dialog open (unified)
    const handleOpenDialog = async (warehouse = null) => {
        if (warehouse) {
            setIsEdit(true);
            setForm({
                id: warehouse.id,
                warehouseId: warehouse.warehouseId || '',
                warehouseCode: warehouse.warehouseCode || '',
                warehouseName: warehouse.warehouseName || '',
                location: warehouse.location || '',
                status: warehouse.status || 'Active',
                capacity: warehouse.capacity || '',
                remarks: warehouse.remarks || ''
            });
        } else {
            setIsEdit(false);
            const newId = await generateWarehouseId();
            setForm({
                ...initialForm,
                warehouseId: newId
            });
        }
        setFormErrors({});
        setDialogOpen(true);
    };

    const handleSubmit = async () => {
        if (isEdit && !canEdit) {
            setSnackbar({ open: true, message: 'You do not have permission to edit warehouses', severity: 'error' });
            return;
        }
        if (!isEdit && !canAdd) {
            setSnackbar({ open: true, message: 'You do not have permission to add warehouses', severity: 'error' });
            return;
        }
        const errors = validateForm();

        if (Object.keys(errors).length > 0) {
            setFormErrors(errors);
            setSnackbar({ open: true, message: 'Please fix the errors', severity: 'error' });
            return;
        }

        // Check for duplicate warehouse code
        const codeExists = warehouses.some(w =>
            (!isEdit || w.id !== form.id) &&
            w.warehouseCode.toLowerCase() === form.warehouseCode.toLowerCase()
        );

        if (codeExists) {
            setFormErrors({ warehouseCode: 'Warehouse Code already exists' });
            setSnackbar({ open: true, message: 'Warehouse Code already exists', severity: 'error' });
            return;
        }

        try {
            const data = {
                warehouseId: form.warehouseId,
                warehouseCode: form.warehouseCode.toUpperCase(),
                warehouseName: form.warehouseName,
                location: form.location || '',
                status: form.status,
                capacity: form.capacity ? parseFloat(form.capacity) : 0,
                remarks: form.remarks || '',
                updatedAt: Timestamp.now()
            };

            if (isEdit) {
                await updateDoc(doc(db, 'warehouses', form.id), data);
            } else {
                await addDoc(collection(db, 'warehouses'), {
                    ...data,
                    createdAt: Timestamp.now()
                });
            }

            setDialogOpen(false);
            fetchWarehouses();
            setSnackbar({
                open: true,
                message: `Warehouse ${isEdit ? 'updated' : 'created'} successfully`,
                severity: 'success'
            });
        } catch (error) {
            console.error('Error saving warehouse:', error);
            setSnackbar({ open: true, message: 'Error saving warehouse', severity: 'error' });
        }
    };

    // Handle delete warehouse
    const handleOpenDeleteDialog = (warehouse) => {
        setDeleteTarget(warehouse);
        setDeleteDialogOpen(true);
    };

    const handleDeleteWarehouse = async () => {
        if (!canDelete) {
            setSnackbar({ open: true, message: 'You do not have permission to delete warehouses', severity: 'error' });
            return;
        }
        try {
            await deleteDoc(doc(db, 'warehouses', deleteTarget.id));
            setDeleteDialogOpen(false);
            setDeleteTarget(null);
            fetchWarehouses();
            setSnackbar({ open: true, message: 'Warehouse deleted successfully', severity: 'success' });
        } catch (error) {
            console.error('Error deleting warehouse:', error);
            setSnackbar({ open: true, message: 'Error deleting warehouse', severity: 'error' });
        }
    };

    // Filtered warehouses
    const filteredWarehouses = useMemo(() => {
        return warehouses.filter(w => {
            const matchesSearch =
                (w.warehouseId && w.warehouseId.toLowerCase().includes(searchQuery.toLowerCase())) ||
                (w.warehouseCode && w.warehouseCode.toLowerCase().includes(searchQuery.toLowerCase())) ||
                (w.warehouseName && w.warehouseName.toLowerCase().includes(searchQuery.toLowerCase())) ||
                (w.location && w.location.toLowerCase().includes(searchQuery.toLowerCase()));
            return matchesSearch;
        });
    }, [warehouses, searchQuery]);

    // Pagination
    const pageEnd = Math.min(pageStart + pageSize, filteredWarehouses.length);
    const warehousesPaginated = filteredWarehouses.slice(pageStart, pageEnd);

    // Stats
    const stats = {
        total: warehouses.length,
        active: warehouses.filter(w => w.status === 'Active').length,
        inactive: warehouses.filter(w => w.status === 'Inactive').length,
    };

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
                            background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
                            color: 'white',
                            boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)'
                        }}>
                            <WarehouseIcon sx={{ fontSize: 28 }} />
                        </Box>
                        <Box>
                            <Typography variant="h4" sx={{
                                fontWeight: 700,
                                color: '#1e293b',
                                mb: 0.5
                            }}>
                                Warehouse Master
                            </Typography>
                            <Typography variant="body1" sx={{ color: '#64748b' }}>
                                Manage warehouse locations and storage facilities
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
                                    Total Warehouses
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
                                <CheckCircleIcon sx={{ color: '#10b981', fontSize: 18 }} />
                                <Box>
                                    <Typography variant="body2" sx={{ color: '#64748b' }}>
                                        Active
                                    </Typography>
                                    <Typography variant="h6" sx={{ fontWeight: 600, color: '#1e293b' }}>
                                        {stats.active}
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
                                <CancelIcon sx={{ color: '#ef4444', fontSize: 18 }} />
                                <Box>
                                    <Typography variant="body2" sx={{ color: '#64748b' }}>
                                        Inactive
                                    </Typography>
                                    <Typography variant="h6" sx={{ fontWeight: 600, color: '#1e293b' }}>
                                        {stats.inactive}
                                    </Typography>
                                </Box>
                            </Box>
                        </Card>
                    </Box>
                </Box>

                {/* Warehouses List Section */}
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
                                <WarehouseIcon sx={{ fontSize: 20, color: '#8b5cf6' }} />
                                Warehouses List
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#64748b', mt: 0.5 }}>
                                {filteredWarehouses.length} warehouses found
                            </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                            <Tooltip title="Refresh data">
                                <IconButton
                                    onClick={fetchWarehouses}
                                    sx={{
                                        color: '#8b5cf6',
                                        backgroundColor: 'white',
                                        border: '1px solid #e2e8f0',
                                        '&:hover': {
                                            backgroundColor: '#f3e8ff'
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
                                        background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
                                        textTransform: 'none',
                                        fontWeight: 600,
                                        borderRadius: '10px',
                                        px: 3
                                    }}
                                >
                                    Create Warehouse
                                </Button>
                            )}
                        </Box>
                    </Box>

                    {/* Search Box */}
                    <Box sx={{ p: 3, borderBottom: '1px solid #e2e8f0', backgroundColor: 'white' }}>
                        <TextField
                            label="Search warehouses"
                            placeholder="Search by ID, Code, Name, or Location..."
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

                    {/* Warehouses Table */}
                    {filteredWarehouses.length === 0 ? (
                        <Box sx={{
                            p: 6,
                            textAlign: 'center',
                            color: '#94a3b8'
                        }}>
                            <WarehouseIcon sx={{ fontSize: 64, mb: 2, opacity: 0.5 }} />
                            <Typography variant="h6" sx={{ mb: 1 }}>
                                No warehouses found
                            </Typography>
                            <Typography variant="body2">
                                {warehouses.length === 0 ?
                                    "Create your first warehouse to get started." :
                                    "No warehouses match your search criteria."}
                            </Typography>
                        </Box>
                    ) : (
                        <>
                            <Box sx={{ overflowX: 'auto' }}>
                                <Table sx={{ minWidth: 1200 }}>
                                    <TableHead sx={{ backgroundColor: '#f8fafc' }}>
                                        <TableRow>
                                            <TableCell sx={{ fontWeight: 600, color: '#475569' }}>Warehouse ID</TableCell>
                                            <TableCell sx={{ fontWeight: 600, color: '#475569' }}>Code</TableCell>
                                            <TableCell sx={{ fontWeight: 600, color: '#475569' }}>Warehouse Name</TableCell>
                                            <TableCell sx={{ fontWeight: 600, color: '#475569' }}>Location</TableCell>
                                            <TableCell sx={{ fontWeight: 600, color: '#475569' }}>Capacity</TableCell>
                                            <TableCell sx={{ fontWeight: 600, color: '#475569' }}>Status</TableCell>
                                            <TableCell sx={{ fontWeight: 600, color: '#475569' }} align="center">Actions</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {warehousesPaginated.map((warehouse) => (
                                            <TableRow key={warehouse.id} hover>
                                                <TableCell>
                                                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#8b5cf6' }}>
                                                        {warehouse.warehouseId}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#1e293b' }}>
                                                        {warehouse.warehouseCode}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="body2" sx={{ fontWeight: 500, color: '#1e293b' }}>
                                                        {warehouse.warehouseName}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="body2" sx={{ color: '#64748b' }}>
                                                        {warehouse.location || '—'}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="body2" sx={{ color: '#64748b' }}>
                                                        {warehouse.capacity || '—'}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Chip
                                                        label={warehouse.status}
                                                        size="small"
                                                        color={warehouse.status === 'Active' ? 'success' : 'default'}
                                                        sx={{ fontWeight: 600 }}
                                                    />
                                                </TableCell>
                                                <TableCell align="center">
                                                    <Tooltip title={canEdit ? "Edit Warehouse" : "View Details"}>
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => handleOpenDialog(warehouse)}
                                                            sx={{
                                                                color: canEdit ? '#8b5cf6' : '#64748b',
                                                                '&:hover': { backgroundColor: canEdit ? '#f3e8ff' : '#f1f5f9' }
                                                            }}
                                                        >
                                                            {canEdit ? <EditIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                                                        </IconButton>
                                                    </Tooltip>
                                                    {canDelete && (
                                                        <Tooltip title="Delete Warehouse">
                                                            <IconButton
                                                                size="small"
                                                                onClick={() => handleOpenDeleteDialog(warehouse)}
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
                                        disabled={pageEnd >= filteredWarehouses.length}
                                        sx={{ borderRadius: '8px' }}
                                    >
                                        Next →
                                    </Button>
                                </Box>
                                <Typography variant="body2" sx={{ color: '#64748b' }}>
                                    Showing {filteredWarehouses.length > 0 ? pageStart + 1 : 0}–{pageEnd} of {filteredWarehouses.length}
                                </Typography>
                            </Box>
                        </>
                    )}
                </Paper>
            </Box>

            {/* Unified Create/Edit Warehouse Dialog */}
            <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
                <DialogTitle sx={{ fontWeight: 600, backgroundColor: '#f3e8ff', borderBottom: '1px solid #e2e8f0' }}>
                    {isEdit ? 'Edit Warehouse' : 'Create New Warehouse'}
                </DialogTitle>
                <DialogContent dividers sx={{ p: 4 }}>
                    <Grid container spacing={3}>
                        {/* Row 1: Warehouse ID and Code */}
                        <Grid item xs={12} md={2}>
                            <TextField
                                label="Warehouse ID"
                                value={form.warehouseId}
                                disabled
                                fullWidth
                                sx={{
                                    '& .MuiOutlinedInput-root': {
                                        backgroundColor: '#f8fafc',
                                    }
                                }}
                            />
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <TextField
                                label="Warehouse Code *"
                                placeholder="e.g., MAIN"
                                value={form.warehouseCode}
                                onChange={(e) => {
                                    setForm({ ...form, warehouseCode: e.target.value.toUpperCase() });
                                    setFormErrors({ ...formErrors, warehouseCode: '' });
                                }}
                                error={!!formErrors.warehouseCode}
                                helperText={formErrors.warehouseCode}
                                fullWidth
                                required
                                disabled={isEdit ? !canEdit : !canAdd}
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                label="Warehouse Name *"
                                placeholder="e.g., Main Warehouse"
                                value={form.warehouseName}
                                onChange={(e) => {
                                    setForm({ ...form, warehouseName: e.target.value });
                                    setFormErrors({ ...formErrors, warehouseName: '' });
                                }}
                                error={!!formErrors.warehouseName}
                                helperText={formErrors.warehouseName}
                                fullWidth
                                required
                                disabled={isEdit ? !canEdit : !canAdd}
                            />
                        </Grid>

                        {/* Row 2: Location/Address (single line) */}
                        <Grid item xs={12}>
                            <TextField
                                label="Location/Address"
                                placeholder="Physical address or location"
                                value={form.location}
                                onChange={(e) => setForm({ ...form, location: e.target.value })}
                                fullWidth
                                disabled={isEdit ? !canEdit : !canAdd}
                            />
                        </Grid>

                        {/* Row 3: Status and Capacity */}
                        <Grid item xs={12} md={6}>
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
                                label="Capacity"
                                type="number"
                                placeholder="e.g., 10000"
                                value={form.capacity}
                                onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                                fullWidth
                                helperText="Numeric capacity for storage calculations"
                                disabled={isEdit ? !canEdit : !canAdd}
                            />
                        </Grid>

                        {/* Row 4: Remarks (multiline) */}
                        <Grid item xs={12}>
                            <TextField
                                label="Remarks"
                                placeholder="Additional notes"
                                value={form.remarks}
                                onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                                fullWidth
                                multiline
                                rows={3}
                                disabled={isEdit ? !canEdit : !canAdd}
                            />
                        </Grid>
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
                                background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)'
                            }}
                        >
                            {isEdit ? 'Save Changes' : 'Create Warehouse'}
                        </Button>
                    )}
                </DialogActions>
            </Dialog>

            {/* Delete Warehouse Dialog */}
            <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle sx={{ fontWeight: 600, backgroundColor: '#fee2e2', borderBottom: '1px solid #fecaca' }}>
                    Delete Warehouse?
                </DialogTitle>
                <DialogContent sx={{ py: 3 }}>
                    <Box sx={{ py: 2 }}>
                        <Typography variant="body2" sx={{ mb: 2, color: '#64748b' }}>
                            Are you sure you want to delete this warehouse?
                        </Typography>
                        <Box sx={{ my: 2, p: 2, backgroundColor: '#fef2f2', borderRadius: '10px', borderLeft: '4px solid #ef4444' }}>
                            <Typography variant="body2" sx={{ mb: 1 }}>
                                <strong>ID:</strong> {deleteTarget?.warehouseId}
                            </Typography>
                            <Typography variant="body2" sx={{ mb: 1 }}>
                                <strong>Code:</strong> {deleteTarget?.warehouseCode}
                            </Typography>
                            <Typography variant="body2">
                                <strong>Name:</strong> {deleteTarget?.warehouseName}
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
                        onClick={handleDeleteWarehouse}
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

export default WarehouseMaster;
