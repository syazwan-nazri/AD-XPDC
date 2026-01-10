import React, { useState, useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
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
    CircularProgress,
} from '@mui/material';
import {
    Edit as EditIcon,
    Delete as DeleteIcon,
    Search as SearchIcon,
    Refresh as RefreshIcon,
    Add as AddIcon,
    Clear as ClearIcon,
    Business as BusinessIcon,
    Visibility as VisibilityIcon
} from '@mui/icons-material';

const DepartmentMaster = () => {
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

    const user = useSelector(state => state.auth.user);
    const isAdmin = user?.groupId?.toLowerCase() === 'a' || user?.groupId?.toLowerCase() === 'admin';
    const permissions = user?.groupPermissions?.department_master || {};

    const canAdd = permissions.access === 'add' || isAdmin;
    const canEdit = permissions.access === 'edit' || permissions.access === 'add' || isAdmin;
    const canDelete = permissions.access === 'add' || isAdmin;

    // Search and pagination
    const [searchQuery, setSearchQuery] = useState('');
    const [pageStart, setPageStart] = useState(0);
    const pageSize = 50;

    // Form state
    const initialForm = {
        departmentId: '',
        departmentCode: '',
        departmentName: '',
        description: '',
        status: 'Active',
    };
    const [form, setForm] = useState(initialForm);
    const [formErrors, setFormErrors] = useState({});

    // Dialog states
    const [dialogOpen, setDialogOpen] = useState(false);
    const [isEdit, setIsEdit] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);

    // Fetch departments
    useEffect(() => {
        fetchDepartments();
    }, []);

    const fetchDepartments = async () => {
        setLoading(true);
        try {
            const q = query(collection(db, 'departments'), orderBy('createdAt', 'desc'));
            const snapshot = await getDocs(q);
            const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
            setDepartments(data);
        } catch (error) {
            console.error('Error fetching departments:', error);
            setSnackbar({ open: true, message: 'Error fetching departments', severity: 'error' });
        } finally {
            setLoading(false);
        }
    };

    // Generate department ID
    const generateDepartmentId = async () => {
        try {
            const q = query(collection(db, 'departments'), orderBy('departmentId', 'desc'));
            const snapshot = await getDocs(q);

            if (snapshot.empty) {
                return 'DEPT-001';
            }

            const lastDept = snapshot.docs[0].data();
            const lastIdStr = lastDept.departmentId || 'DEPT-000';
            const lastNum = parseInt(lastIdStr.split('-')[1]) || 0;
            const nextNum = lastNum + 1;
            return `DEPT-${nextNum.toString().padStart(3, '0')}`;
        } catch (error) {
            console.error('Error generating ID:', error);
            return 'DEPT-ERR';
        }
    };

    // Unified Handle Open Dialog
    const handleOpenDialog = async (dept = null) => {
        if (dept) {
            setIsEdit(true);
            setForm({
                id: dept.id,
                departmentId: dept.departmentId || '',
                departmentCode: dept.departmentCode || '',
                departmentName: dept.departmentName || '',
                description: dept.description || '',
                status: dept.status || 'Active',
            });
        } else {
            setIsEdit(false);
            const newId = await generateDepartmentId();
            setForm({
                ...initialForm,
                departmentId: newId
            });
        }
        setFormErrors({});
        setDialogOpen(true);
    };

    // Validate form
    const validateForm = () => {
        const errors = {};
        if (!form.departmentCode?.trim()) {
            errors.departmentCode = 'Department Code is required';
        }
        if (!form.departmentName?.trim()) {
            errors.departmentName = 'Department Name is required';
        }
        return errors;
    };

    const handleSubmit = async () => {
        if (isEdit && !canEdit) {
            setSnackbar({ open: true, message: 'You do not have permission to edit departments', severity: 'error' });
            return;
        }
        if (!isEdit && !canAdd) {
            setSnackbar({ open: true, message: 'You do not have permission to add departments', severity: 'error' });
            return;
        }
        const errors = validateForm();

        if (Object.keys(errors).length > 0) {
            setFormErrors(errors);
            setSnackbar({ open: true, message: 'Please fix the errors', severity: 'error' });
            return;
        }

        // Check for duplicate code
        const codeExists = departments.some(d =>
            (!isEdit || d.id !== form.id) &&
            d.departmentCode.toLowerCase() === form.departmentCode.toLowerCase()
        );

        if (codeExists) {
            setFormErrors({ departmentCode: 'Department Code already exists' });
            setSnackbar({ open: true, message: 'Department Code already exists', severity: 'error' });
            return;
        }

        try {
            const data = {
                departmentId: form.departmentId,
                departmentCode: form.departmentCode.toUpperCase(),
                departmentName: form.departmentName,
                description: form.description || '',
                status: form.status,
                updatedAt: Timestamp.now()
            };

            if (isEdit) {
                await updateDoc(doc(db, 'departments', form.id), data);
            } else {
                await addDoc(collection(db, 'departments'), {
                    ...data,
                    createdAt: Timestamp.now()
                });
            }

            setDialogOpen(false);
            fetchDepartments();
            setSnackbar({
                open: true,
                message: `Department ${isEdit ? 'updated' : 'created'} successfully`,
                severity: 'success'
            });
        } catch (error) {
            console.error('Error saving department:', error);
            setSnackbar({ open: true, message: 'Error saving department', severity: 'error' });
        }
    };

    const handleOpenDeleteDialog = (dept) => {
        setDeleteTarget(dept);
        setDeleteDialogOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!deleteTarget) return;
        if (!canDelete) {
            setSnackbar({ open: true, message: 'You do not have permission to delete departments', severity: 'error' });
            return;
        }

        try {
            await deleteDoc(doc(db, 'departments', deleteTarget.id));
            setDeleteDialogOpen(false);
            fetchDepartments();
            setSnackbar({ open: true, message: 'Department deleted successfully', severity: 'success' });
        } catch (error) {
            console.error('Error deleting department:', error);
            setSnackbar({ open: true, message: 'Error deleting department', severity: 'error' });
        }
    };

    // Filtering
    const filteredDepartments = useMemo(() => {
        const q = searchQuery.toLowerCase().trim();
        return departments.filter(d =>
            d.departmentId?.toLowerCase().includes(q) ||
            d.departmentCode?.toLowerCase().includes(q) ||
            d.departmentName?.toLowerCase().includes(q) ||
            d.description?.toLowerCase().includes(q)
        );
    }, [departments, searchQuery]);

    const pageEnd = Math.min((pageStart + 1) * pageSize, filteredDepartments.length);

    return (
        <Box sx={{ p: 4, backgroundColor: '#f8fafc', minHeight: '100vh' }}>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box sx={{
                        backgroundColor: '#8b5cf6',
                        p: 1.5,
                        borderRadius: '12px',
                        display: 'flex',
                        boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)'
                    }}>
                        <BusinessIcon sx={{ color: 'white', fontSize: 32 }} />
                    </Box>
                    <Box>
                        <Typography variant="h4" sx={{ fontWeight: 700, color: '#1e293b' }}>Department Master</Typography>
                        <Typography variant="body1" sx={{ color: '#64748b' }}>Manage company departments and associations</Typography>
                    </Box>
                </Box>
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
                            px: 3,
                            py: 1,
                            boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)',
                            '&:hover': {
                                background: 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)',
                            }
                        }}
                    >
                        Add Department
                    </Button>
                )}
            </Box>

            {/* Main Table Paper */}
            <Paper elevation={0} sx={{ borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                <Box sx={{ p: 3, borderBottom: '1px solid #e2e8f0', display: 'flex', gap: 2, alignItems: 'center', backgroundColor: '#f1f5f9' }}>
                    <TextField
                        size="small"
                        placeholder="Search departments..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        sx={{
                            flexGrow: 1,
                            maxWidth: 400,
                            '& .MuiOutlinedInput-root': {
                                backgroundColor: 'white',
                                borderRadius: '10px',
                            }
                        }}
                        InputProps={{
                            startAdornment: <SearchIcon sx={{ color: '#94a3b8', mr: 1 }} />,
                            endAdornment: searchQuery && (
                                <IconButton size="small" onClick={() => setSearchQuery('')}>
                                    <ClearIcon fontSize="small" />
                                </IconButton>
                            )
                        }}
                    />
                    <IconButton onClick={fetchDepartments} sx={{ color: '#8b5cf6' }}>
                        <RefreshIcon />
                    </IconButton>
                </Box>

                <Table sx={{ minWidth: 650 }}>
                    <TableHead sx={{ backgroundColor: '#f8fafc' }}>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 600, color: '#475569' }}>Dept ID</TableCell>
                            <TableCell sx={{ fontWeight: 600, color: '#475569' }}>Code</TableCell>
                            <TableCell sx={{ fontWeight: 600, color: '#475569' }}>Department Name</TableCell>
                            <TableCell sx={{ fontWeight: 600, color: '#475569' }}>Status</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 600, color: '#475569' }}>Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={6} align="center" sx={{ py: 10 }}>
                                    <CircularProgress size={40} sx={{ color: '#8b5cf6' }} />
                                </TableCell>
                            </TableRow>
                        ) : filteredDepartments.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} align="center" sx={{ py: 10 }}>
                                    <Typography color="textSecondary">No departments found</Typography>
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredDepartments.slice(pageStart * pageSize, (pageStart + 1) * pageSize).map((dept) => (
                                <TableRow key={dept.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                    <TableCell>
                                        <Chip label={dept.departmentId} size="small" variant="outlined" sx={{ fontWeight: 600, color: '#1e293b' }} />
                                    </TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>{dept.departmentCode}</TableCell>
                                    <TableCell>{dept.departmentName}</TableCell>
                                    <TableCell>
                                        <Chip
                                            label={dept.status || 'Active'}
                                            size="small"
                                            color={(dept.status || 'Active') === 'Active' ? 'success' : 'default'}
                                            sx={{ fontWeight: 600, borderRadius: '6px' }}
                                        />
                                    </TableCell>
                                    <TableCell align="center">
                                        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
                                            <Tooltip title={canEdit ? "Edit Department" : "View Details"}>
                                                <IconButton size="small" onClick={() => handleOpenDialog(dept)} sx={{ color: canEdit ? '#8b5cf6' : '#64748b' }}>
                                                    {canEdit ? <EditIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                                                </IconButton>
                                            </Tooltip>
                                            {canDelete && (
                                                <Tooltip title="Delete Department">
                                                    <IconButton size="small" onClick={() => handleOpenDeleteDialog(dept)} sx={{ color: '#ef4444' }}>
                                                        <DeleteIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                            )}
                                        </Box>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>

                <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc' }}>
                    <Typography variant="body2" sx={{ color: '#64748b' }}>
                        Showing {filteredDepartments.length > 0 ? pageStart * pageSize + 1 : 0} to {pageEnd} of {filteredDepartments.length} entries
                    </Typography>
                </Box>
            </Paper>

            {/* Unified Create/Edit Dialog */}
            <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ fontWeight: 600, backgroundColor: '#f3e8ff', borderBottom: '1px solid #e2e8f0' }}>
                    {isEdit ? 'Edit Department' : 'Create New Department'}
                </DialogTitle>
                <DialogContent sx={{ p: 4, mt: 2 }}>
                    <Grid container spacing={3}>
                        <Grid item xs={12} md={4}>
                            <TextField
                                label="Department ID"
                                value={form.departmentId}
                                disabled
                                fullWidth
                                sx={{ '& .MuiOutlinedInput-root': { backgroundColor: '#f8fafc' } }}
                            />
                        </Grid>
                        <Grid item xs={12} md={8}>
                            <TextField
                                label="Department Code *"
                                placeholder="e.g., HR, IT, OPS"
                                value={form.departmentCode}
                                onChange={(e) => setForm({ ...form, departmentCode: e.target.value.toUpperCase() })}
                                error={!!formErrors.departmentCode}
                                helperText={formErrors.departmentCode}
                                fullWidth
                                required
                                disabled={isEdit ? !canEdit : !canAdd}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                label="Department Name *"
                                placeholder="e.g., Human Resources"
                                value={form.departmentName}
                                onChange={(e) => setForm({ ...form, departmentName: e.target.value })}
                                error={!!formErrors.departmentName}
                                helperText={formErrors.departmentName}
                                fullWidth
                                required
                                disabled={isEdit ? !canEdit : !canAdd}
                            />
                        </Grid>
                        <Grid item xs={12}>
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
                        <Grid item xs={12}>
                            <TextField
                                label="Description"
                                placeholder="Department purpose/function"
                                value={form.description}
                                onChange={(e) => setForm({ ...form, description: e.target.value })}
                                fullWidth
                                multiline
                                rows={3}
                                disabled={isEdit ? !canEdit : !canAdd}
                            />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions sx={{ p: 3, borderTop: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                    <Button onClick={() => setDialogOpen(false)} variant="outlined" sx={{ borderRadius: '8px', textTransform: 'none' }}>
                        {isEdit ? (canEdit ? 'Cancel' : 'Close') : 'Cancel'}
                    </Button>
                    {(isEdit ? canEdit : canAdd) && (
                        <Button
                            onClick={handleSubmit}
                            variant="contained"
                            sx={{
                                borderRadius: '8px',
                                textTransform: 'none',
                                background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
                            }}
                        >
                            {isEdit ? 'Save Changes' : 'Create Department'}
                        </Button>
                    )}
                </DialogActions>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle sx={{ fontWeight: 600, backgroundColor: '#fee2e2', borderBottom: '1px solid #fecaca' }}>Delete Department?</DialogTitle>
                <DialogContent sx={{ py: 3 }}>
                    <Typography variant="body1">Are you sure you want to delete <strong>{deleteTarget?.departmentName}</strong>?</Typography>
                    <Typography variant="body2" sx={{ mt: 1, color: '#ef4444' }}>This action cannot be undone.</Typography>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setDeleteDialogOpen(false)} sx={{ textTransform: 'none' }}>Cancel</Button>
                    <Button onClick={handleConfirmDelete} variant="contained" color="error" sx={{ textTransform: 'none', borderRadius: '8px' }}>Confirm Delete</Button>
                </DialogActions>
            </Dialog>

            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
                <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} variant="filled" sx={{ width: '100%' }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default DepartmentMaster;
