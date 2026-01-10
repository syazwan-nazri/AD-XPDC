import React, { useState, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { db } from '../../firebase/config';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
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
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Warehouse as WarehouseIcon,
  Refresh as RefreshIcon,
  Warning as WarningIcon,
  StorageRounded as StorageRoundedIcon,
  WarningAmber as WarningAmberIcon,
} from '@mui/icons-material';

// Storage Master Page - Parts Management Only
const StorageMaster = () => {
  const parts = useSelector(state => state.parts.parts || []);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // Parts List states
  const [searchQueryParts, setSearchQueryParts] = useState('');
  const [pageStartParts, setPageStartParts] = useState(0);
  const pageSize = 50;

  // Dialog states
  const [editPartDialogOpen, setEditPartDialogOpen] = useState(false);
  const [deletePartDialogOpen, setDeletePartDialogOpen] = useState(false);
  const [editPartForm, setEditPartForm] = useState({
    id: '',
    sapNumber: '',
    internalRef: '',
    name: '',
    category: '',
    rackNumber: '',
    rackLevel: '',
    currentStock: ''
  });
  const [deletePartTarget, setDeletePartTarget] = useState(null);

  // Validation states
  const [editPartRackNumberError, setEditPartRackNumberError] = useState(false);
  const [editPartRackLevelError, setEditPartRackLevelError] = useState(false);

  // Validate Rack Number (2 digits only)
  const validateRackNumber = (value) => {
    if (!value) return true;
    return /^\d{2}$/.test(value);
  };

  // Validate Rack Level (A, B, C, or D only)
  const validateRackLevel = (value) => {
    if (!value) return true;
    return /^[ABCD]$/i.test(value);
  };

  // Filtered parts
  const filteredParts = useMemo(() => {
    return parts.filter(p => {
      const matchesSearch =
        (p.sapNumber && p.sapNumber.toLowerCase().includes(searchQueryParts.toLowerCase())) ||
        (p.internalRef && p.internalRef.toLowerCase().includes(searchQueryParts.toLowerCase())) ||
        (p.name && p.name.toLowerCase().includes(searchQueryParts.toLowerCase())) ||
        (p.category && p.category.toLowerCase().includes(searchQueryParts.toLowerCase())) ||
        (p.rackNumber && p.rackNumber.toLowerCase().includes(searchQueryParts.toLowerCase())) ||
        (p.rackLevel && p.rackLevel.toLowerCase().includes(searchQueryParts.toLowerCase()));
      return matchesSearch;
    });
  }, [parts, searchQueryParts]);

  // Sort parts: low stock items at top, then by SAP# descending
  const sortedParts = useMemo(() => {
    const sorted = [...filteredParts].sort((a, b) => {
      const sapA = parseInt(a.sapNumber || '0') || 0;
      const sapB = parseInt(b.sapNumber || '0') || 0;

      const aIsLowStock = (a.currentStock || 0) < (a.safetyLevel || 0);
      const bIsLowStock = (b.currentStock || 0) < (b.safetyLevel || 0);

      if (aIsLowStock && !bIsLowStock) return -1;
      if (!aIsLowStock && bIsLowStock) return 1;

      return sapB - sapA;
    });
    return sorted;
  }, [filteredParts]);

  // Pagination
  const pageEndParts = Math.min(pageStartParts + pageSize, sortedParts.length);
  const partsPaginated = sortedParts.slice(pageStartParts, pageEndParts);



  // Handle edit part
  const handleEditPart = (part) => {
    setEditPartForm({
      id: part.id,
      sapNumber: part.sapNumber || '',
      internalRef: part.internalRef || '',
      name: part.name || '',
      category: part.category || '',
      rackNumber: part.rackNumber || '',
      rackLevel: part.rackLevel || '',
      currentStock: part.currentStock || ''
    });
    setEditPartRackNumberError(false);
    setEditPartRackLevelError(false);
    setEditPartDialogOpen(true);
  };

  // Handle save part changes
  const handleSavePartChanges = async () => {
    setEditPartRackNumberError(false);
    setEditPartRackLevelError(false);

    let hasErrors = false;

    if (!validateRackNumber(editPartForm.rackNumber)) {
      setEditPartRackNumberError(true);
      hasErrors = true;
    }

    if (!validateRackLevel(editPartForm.rackLevel)) {
      setEditPartRackLevelError(true);
      hasErrors = true;
    }

    if (hasErrors) {
      setSnackbar({ open: true, message: 'Please fix the errors', severity: 'error' });
      return;
    }

    try {
      await updateDoc(doc(db, 'parts', editPartForm.id), {
        rackNumber: editPartForm.rackNumber,
        rackLevel: editPartForm.rackLevel.toUpperCase()
      });

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

  // Refresh data
  const refreshData = () => {
    setSnackbar({ open: true, message: 'Parts data refreshed', severity: 'success' });
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
              background: 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)',
              color: 'white',
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
            }}>
              <WarehouseIcon sx={{ fontSize: 28 }} />
            </Box>
            <Box>
              <Typography variant="h4" sx={{
                fontWeight: 700,
                color: '#1e293b',
                mb: 0.5
              }}>
                Storage Master
              </Typography>
              <Typography variant="body1" sx={{ color: '#64748b' }}>
                Manage spare parts storage and rack assignments
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
                  {parts.length}
                </Typography>
              </Box>
            </Card>
            <Card sx={{
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              backgroundColor: 'white',
              px: 2,
              py: 1.5,
              minWidth: 140
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <WarningAmberIcon sx={{ color: '#ef4444', fontSize: 18 }} />
                <Box>
                  <Typography variant="body2" sx={{ color: '#64748b' }}>
                    Low Stock
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: '#1e293b' }}>
                    {parts.filter(p => (p.currentStock || 0) < (p.safetyLevel || 0)).length}
                  </Typography>
                </Box>
              </Box>
            </Card>
          </Box>
        </Box>

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
                <StorageRoundedIcon sx={{ fontSize: 20, color: '#3b82f6' }} />
                Spare Parts List
              </Typography>
              <Typography variant="body2" sx={{ color: '#64748b', mt: 0.5 }}>
                {filteredParts.length} parts found
              </Typography>
            </Box>
            <Tooltip title="Refresh data">
              <IconButton
                onClick={refreshData}
                sx={{
                  color: '#3b82f6',
                  backgroundColor: 'white',
                  border: '1px solid #e2e8f0',
                  '&:hover': {
                    backgroundColor: '#dbeafe'
                  }
                }}
              >
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Box>

          {/* Search Box */}
          <Box sx={{ p: 3, borderBottom: '1px solid #e2e8f0', backgroundColor: 'white' }}>
            <TextField
              label="Search parts"
              placeholder="Search by SAP#, Internal Ref, Part Name, Category, or Rack..."
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
          {sortedParts.length === 0 ? (
            <Box sx={{
              p: 6,
              textAlign: 'center',
              color: '#94a3b8'
            }}>
              <WarehouseIcon sx={{ fontSize: 64, mb: 2, opacity: 0.5 }} />
              <Typography variant="h6" sx={{ mb: 1 }}>
                No parts found
              </Typography>
              <Typography variant="body2">
                No spare parts match your search criteria.
              </Typography>
            </Box>
          ) : (
            <>
              <Box sx={{ overflowX: 'auto' }}>
                <Table sx={{ minWidth: 1200 }}>
                  <TableHead sx={{ backgroundColor: '#f8fafc' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600, color: '#475569' }}>SAP#</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: '#475569' }}>Internal Ref</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: '#475569' }}>Part Name</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: '#475569' }}>Category</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: '#475569' }}>Rack #</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: '#475569' }}>Level</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: '#475569' }} align="right">Current Stock</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: '#475569' }} align="center">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {partsPaginated.map((part) => {
                      const isLowStock = (part.currentStock || 0) < (part.safetyLevel || 0);
                      const isOutOfStock = (part.currentStock || 0) === 0;

                      return (
                        <TableRow key={part.id} hover sx={{
                          backgroundColor: isOutOfStock ? '#fee2e2' : isLowStock ? '#fef3c7' : 'white',
                          '&:hover': {
                            backgroundColor: isOutOfStock ? '#fecaca' : isLowStock ? '#fde68a' : '#f8fafc'
                          }
                        }}>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 600, color: '#1e293b' }}>
                              {part.sapNumber}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ color: '#64748b' }}>
                              {part.internalRef || '—'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 500, color: '#1e293b' }}>
                              {part.name}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={part.category || '—'}
                              size="small"
                              sx={{
                                backgroundColor: '#ecf0ff',
                                color: '#1e40af'
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 600, color: '#1e293b' }}>
                              {part.rackNumber || '—'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={part.rackLevel || '—'}
                              size="small"
                              sx={{
                                backgroundColor: '#dbeafe',
                                color: '#0c4a6e'
                              }}
                            />
                          </TableCell>
                          <TableCell align="right">
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>
                              {isOutOfStock && (
                                <WarningAmberIcon sx={{ fontSize: 16, color: '#ef4444' }} />
                              )}
                              <Typography variant="body2" sx={{
                                fontWeight: 600,
                                color: isOutOfStock ? '#ef4444' : isLowStock ? '#f59e0b' : '#059669'
                              }}>
                                {part.currentStock}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell align="center">
                            <Tooltip title="Edit Part">
                              <IconButton
                                size="small"
                                onClick={() => handleEditPart(part)}
                                sx={{
                                  color: '#3b82f6',
                                  '&:hover': { backgroundColor: '#dbeafe' }
                                }}
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
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
                    onClick={() => setPageStartParts(Math.max(0, pageStartParts - pageSize))}
                    disabled={pageStartParts === 0}
                    sx={{ mr: 1, borderRadius: '8px' }}
                  >
                    ← Previous
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => setPageStartParts(pageStartParts + pageSize)}
                    disabled={pageEndParts >= sortedParts.length}
                    sx={{ borderRadius: '8px' }}
                  >
                    Next →
                  </Button>
                </Box>
                <Typography variant="body2" sx={{ color: '#64748b' }}>
                  Showing {sortedParts.length > 0 ? pageStartParts + 1 : 0}–{pageEndParts} of {sortedParts.length}
                </Typography>
              </Box>
            </>
          )}
        </Paper>
      </Box>

      {/* Edit Part Dialog */}
      <Dialog open={editPartDialogOpen} onClose={() => setEditPartDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 600, backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
          Edit Part Rack Assignment
        </DialogTitle>
        <DialogContent sx={{ py: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="SAP#"
              value={editPartForm.sapNumber}
              fullWidth
              disabled
              size="small"
              InputLabelProps={{ shrink: true }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '10px',
                  backgroundColor: '#f8fafc',
                }
              }}
            />

            <TextField
              label="Internal Ref No"
              value={editPartForm.internalRef}
              fullWidth
              disabled
              size="small"
              InputLabelProps={{ shrink: true }}
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
              InputLabelProps={{ shrink: true }}
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
              InputLabelProps={{ shrink: true }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '10px',
                  backgroundColor: '#f8fafc',
                }
              }}
            />

            <TextField
              label="Current Stock"
              value={editPartForm.currentStock}
              fullWidth
              disabled
              size="small"
              InputLabelProps={{ shrink: true }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '10px',
                  backgroundColor: '#f8fafc',
                }
              }}
            />

            <Box sx={{ p: 2, backgroundColor: '#dbeafe', borderRadius: '10px' }}>
              <Typography variant="body2" sx={{ color: '#1e40af', fontWeight: 600, mb: 1 }}>
                Edit Rack Assignment
              </Typography>
              <Typography variant="body2" sx={{ color: '#1e40af', fontSize: '0.85rem' }}>
                Update the storage rack location for this part.
              </Typography>
            </Box>

            <TextField
              label="Rack Number"
              placeholder="e.g., 01"
              value={editPartForm.rackNumber}
              onChange={(e) => {
                setEditPartForm({ ...editPartForm, rackNumber: e.target.value });
                setEditPartRackNumberError(false);
              }}
              error={editPartRackNumberError}
              helperText={editPartRackNumberError ? 'Must be exactly 2 digits' : ''}
              fullWidth
              size="small"
              inputProps={{ maxLength: 2 }}
              InputLabelProps={{ shrink: true }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '10px',
                  backgroundColor: '#f8fafc',
                }
              }}
            />

            <TextField
              label="Rack Level"
              placeholder="A, B, C, or D"
              value={editPartForm.rackLevel}
              onChange={(e) => {
                setEditPartForm({ ...editPartForm, rackLevel: e.target.value.toUpperCase() });
                setEditPartRackLevelError(false);
              }}
              error={editPartRackLevelError}
              helperText={editPartRackLevelError ? 'Must be A, B, C, or D' : ''}
              fullWidth
              size="small"
              inputProps={{ maxLength: 1, style: { textTransform: 'uppercase' } }}
              InputLabelProps={{ shrink: true }}
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
          <Button onClick={() => setEditPartDialogOpen(false)} variant="outlined" sx={{ borderRadius: '8px' }}>
            Cancel
          </Button>
          <Button
            onClick={handleSavePartChanges}
            variant="contained"
            sx={{
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)'
            }}
          >
            Save Changes
          </Button>
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
                <strong>Internal Ref:</strong> {deletePartTarget?.internalRef}
              </Typography>
              <Typography variant="body2">
                <strong>Part Name:</strong> {deletePartTarget?.name}
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

export default StorageMaster;
