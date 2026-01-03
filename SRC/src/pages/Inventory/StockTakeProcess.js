import React, { useEffect, useState, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { collection, updateDoc, doc, writeBatch, deleteDoc, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useDispatch, useSelector } from 'react-redux';
import { setParts } from '../../redux/partsSlice';
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
    Chip,
    Typography,
    Snackbar,
    IconButton,
    Tooltip,
    Alert
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

const StockTakeProcess = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const dispatch = useDispatch();
    const parts = useSelector(state => state.parts.parts || []);

    // Get session from navigation state
    const { session } = location.state || {};

    const [countEntries, setCountEntries] = useState([]);
    const [loading, setLoading] = useState(false);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
    const [stockCountPageStart, setStockCountPageStart] = useState(0);
    const pageSize = 20;

    const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
    const [approvalComments, setApprovalComments] = useState('');

    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    const isReadOnly = session?.status === 'Approved' || session?.status === 'Rejected';

    useEffect(() => {
        if (!session) {
            navigate('/inventory/stock-take');
            return;
        }

        // Ensure parts are loaded
        const loadParts = async () => {
            if (parts.length === 0) {
                setLoading(true);
                try {
                    const partsSnapshot = await getDocs(collection(db, 'parts'));
                    const partsData = partsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
                    dispatch(setParts(partsData));
                } catch (error) {
                    console.error('Error loading parts:', error);
                } finally {
                    setLoading(false);
                }
            }
        };
        loadParts();

        // Initialize/Load count entries
        if (session.items && session.items.length > 0) {
            setCountEntries(session.items);
        } else if (parts.length > 0) {
            // Initialize if new
            const initialEntries = parts.map(p => ({
                sapNumber: p.sapNumber,
                partName: p.name,
                location: p.rackNumber ? `${p.rackNumber}-${p.rackLevel}` : 'N/A',
                stockQty: p.currentStock || 0,
                countQty: '',
                id: Date.now() + Math.random(),
            }));
            setCountEntries(initialEntries);
        }
    }, [session, parts, dispatch, navigate]);

    // Sync entries if parts loaded later
    useEffect(() => {
        if ((!session.items || session.items.length === 0) && parts.length > 0 && countEntries.length === 0) {
            const initialEntries = parts.map(p => ({
                sapNumber: p.sapNumber,
                partName: p.name,
                location: p.rackNumber ? `${p.rackNumber}-${p.rackLevel}` : 'N/A',
                stockQty: p.currentStock || 0,
                countQty: '',
                id: Date.now() + Math.random(),
            }));
            setCountEntries(initialEntries);
        }
    }, [parts, session, countEntries.length]);


    const handleSaveProgress = async () => {
        if (!session) return;
        try {
            await updateDoc(doc(db, 'stockTakeSessions', session.id), {
                items: countEntries,
                lastUpdated: new Date().toISOString(),
            });
            setSnackbar({ open: true, message: 'Progress saved successfully', severity: 'success' });
        } catch (error) {
            console.error('Error saving progress:', error);
            setSnackbar({ open: true, message: 'Error saving progress', severity: 'error' });
        }
    };

    const handleRejectCount = async () => {
        if (!session) return;
        if (!window.confirm('Are you sure you want to REJECT this stock take? This will DELETE the session permanently.')) {
            return;
        }

        try {
            await deleteDoc(doc(db, 'stockTakeSessions', session.id));
            setSnackbar({ open: true, message: 'Stock Take rejected and deleted', severity: 'success' });
            navigate('/inventory/stock-take');
        } catch (error) {
            console.error("Error deleting session:", error);
            setSnackbar({ open: true, message: 'Error rejecting session', severity: 'error' });
        }
    };

    const handleApproveStockTake = async () => {
        if (!session) return;
        if (!approvalComments || approvalComments.trim() === '') {
            setSnackbar({ open: true, message: 'Approval remarks are mandatory', severity: 'error' });
            return;
        }

        // Check if all parts counted
        const uncounted = countEntries.filter(e => e.countQty === '' || e.countQty === null || e.countQty === undefined);
        if (uncounted.length > 0) {
            setSnackbar({ open: true, message: `Cannot approve: ${uncounted.length} parts have not been counted yet.`, severity: 'error' });
            return;
        }

        try {
            const batch = writeBatch(db);

            // Update parts stock and add movement logs
            countEntries.forEach(entry => {
                const variance = (entry.countQty || 0) - (entry.stockQty || 0);
                if (variance !== 0) {
                    const part = parts.find(p => p.sapNumber === entry.sapNumber);
                    if (part && part.id) {
                        const partRef = doc(db, 'parts', part.id);
                        batch.update(partRef, {
                            currentStock: entry.countQty,
                            updatedAt: new Date().toISOString()
                        });

                        const logRef = doc(collection(db, 'movement_logs'));
                        batch.set(logRef, {
                            date: new Date(),
                            type: 'STOCK TAKE',
                            partName: part.name,
                            sapNumber: part.sapNumber,
                            quantity: variance,
                            userName: session.startedBy || 'System',
                            remarks: `Stock Take Adjustment: ${approvalComments} (Session ${months[session.month - 1]} ${session.year})`
                        });
                    }
                }
            });

            const sessionRef = doc(db, 'stockTakeSessions', session.id);
            batch.update(sessionRef, {
                status: 'Approved',
                approvalComments,
                approvedAt: new Date().toISOString(),
                items: countEntries
            });

            await batch.commit();
            setSnackbar({ open: true, message: 'Stock Take approved and adjustments posted', severity: 'success' });
            navigate('/inventory/stock-take');
        } catch (error) {
            console.error('Error approving:', error);
            setSnackbar({ open: true, message: 'Error approving stock take', severity: 'error' });
        }
    };

    const exportPDF = () => {
        const doc = new jsPDF();
        doc.text(`Stock Take List - ${months[session.month - 1]} ${session.year}`, 14, 15);
        doc.setFontSize(10);
        doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 22);

        const tableColumn = ["SAP #", "Part Name", "Location", "System Qty", "Actual Qty"];
        const tableRows = [];

        parts.forEach(part => {
            const entry = countEntries.find(e => e.sapNumber === part.sapNumber);
            const row = [
                part.sapNumber,
                part.name,
                part.rackNumber ? `${part.rackNumber}-${part.rackLevel}` : 'N/A',
                part.currentStock || 0,
                entry && entry.countQty !== '' ? entry.countQty : '__________'
            ];
            tableRows.push(row);
        });

        doc.autoTable({
            head: [tableColumn],
            body: tableRows,
            startY: 25,
            styles: { fontSize: 8 },
        });

        doc.save('stock_take_list.pdf');
    };

    const exportExcel = () => {
        const dataToExport = parts.map(part => {
            const entry = countEntries.find(e => e.sapNumber === part.sapNumber);
            return {
                "SAP Number": part.sapNumber,
                "Part Name": part.name,
                "Location": part.rackNumber ? `${part.rackNumber}-${part.rackLevel}` : 'N/A',
                "System Quantity": part.currentStock || 0,
                "Actual Quantity": entry && entry.countQty !== '' ? entry.countQty : ''
            };
        });

        const workSheet = XLSX.utils.json_to_sheet(dataToExport);
        const workBook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workBook, workSheet, "Stock Take List");
        XLSX.writeFile(workBook, "stock_take_list.xlsx");
    };

    // Variance Logic
    const varianceReport = useMemo(() => {
        if (!countEntries.length) return null;

        const variances = countEntries.map(entry => {
            const variance = (entry.countQty !== '' ? entry.countQty : 0) - (entry.stockQty || 0);
            return { ...entry, variance };
        });

        const zeroVariance = variances.filter(v => v.variance === 0).length;
        const positiveVariance = variances.filter(v => v.variance > 0);
        const negativeVariance = variances.filter(v => v.variance < 0);
        const totalVarianceValue = positiveVariance.reduce((sum, v) => sum + (v.variance * 100), 0) +
            negativeVariance.reduce((sum, v) => sum + (v.variance * 100), 0);

        return {
            variances,
            zeroVariance,
            positiveCount: positiveVariance.length,
            negativeCount: negativeVariance.length,
            totalVarianceValue,
        };
    }, [countEntries]);


    if (!session) return null;

    return (
        <Box sx={{ p: 0 }}>
            <Paper elevation={2} sx={{ p: 2, mb: 3, display: 'flex', alignItems: 'center' }}>
                <IconButton onClick={() => navigate('/inventory/stock-take')} sx={{ mr: 2 }}>
                    <ArrowBackIcon />
                </IconButton>
                <Typography variant="h5">
                    Stock Take Process: {months[session.month - 1]} {session.year} ({session.status})
                </Typography>
            </Paper>

            {/* Stock Count Entry Section */}
            <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                        STOCK COUNT ENTRY ({parts.length} PARTS)
                    </Typography>
                    {loading && <Typography variant="body2" sx={{ color: '#999' }}>Loading parts...</Typography>}
                    <Box>
                        <Button startIcon={<PictureAsPdfIcon />} variant="outlined" color="error" size="small" onClick={exportPDF} sx={{ mr: 1 }}>
                            List PDF
                        </Button>
                        <Button startIcon={<FileDownloadIcon />} variant="outlined" color="success" size="small" onClick={exportExcel}>
                            List Excel
                        </Button>
                    </Box>
                </Box>

                <Box sx={{ overflowX: 'auto' }}>
                    <Table size="small">
                        <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 'bold', width: '10%' }}>SAP#</TableCell>
                                <TableCell sx={{ fontWeight: 'bold', width: '25%' }}>Part Name</TableCell>
                                <TableCell sx={{ fontWeight: 'bold', width: '15%' }}>Location</TableCell>
                                <TableCell sx={{ fontWeight: 'bold', width: '12%' }}>Stock Qty</TableCell>
                                <TableCell sx={{ fontWeight: 'bold', width: '12%' }}>Count Qty</TableCell>
                                <TableCell sx={{ fontWeight: 'bold', width: '12%' }}>Variance</TableCell>
                                <TableCell sx={{ fontWeight: 'bold', width: '10%' }}>Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {parts.slice(stockCountPageStart, stockCountPageStart + pageSize).map((part) => {
                                const countEntry = countEntries.find(e => e.sapNumber === part.sapNumber);
                                const countQty = countEntry ? countEntry.countQty : '';
                                const variance = (countQty !== '' ? countQty : 0) - (part.currentStock || 0);
                                const location = part.rackNumber ? `${part.rackNumber}-${part.rackLevel}` : 'N/A';

                                return (
                                    <TableRow key={part.sapNumber} hover>
                                        <TableCell>{part.sapNumber}</TableCell>
                                        <TableCell>{part.name}</TableCell>
                                        <TableCell>{location}</TableCell>
                                        <TableCell>{part.currentStock || 0}</TableCell>
                                        <TableCell>
                                            <TextField
                                                size="small"
                                                type="number"
                                                value={countQty}
                                                disabled={isReadOnly}
                                                onChange={(e) => {
                                                    const value = e.target.value ? parseInt(e.target.value) : '';
                                                    const existingIndex = countEntries.findIndex(en => en.sapNumber === part.sapNumber);
                                                    if (existingIndex >= 0) {
                                                        const updated = [...countEntries];
                                                        updated[existingIndex] = {
                                                            ...updated[existingIndex],
                                                            countQty: value,
                                                        };
                                                        setCountEntries(updated);
                                                    } else {
                                                        // If not found (shouldn't happen if initialized correctly)
                                                        setCountEntries([...countEntries, {
                                                            sapNumber: part.sapNumber,
                                                            partName: part.name,
                                                            location: location,
                                                            stockQty: part.currentStock || 0,
                                                            countQty: value,
                                                            id: Date.now() + Math.random(),
                                                        }]);
                                                    }
                                                }}
                                                placeholder="Enter count"
                                                sx={{ width: '100px' }}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            {countQty !== '' && (
                                                <Chip
                                                    label={variance > 0 ? `+${variance}` : variance}
                                                    color={variance === 0 ? 'default' : variance > 0 ? 'success' : 'error'}
                                                    size="small"
                                                />
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {!isReadOnly && countEntry && (
                                                <Tooltip title="Clear">
                                                    <IconButton
                                                        size="small"
                                                        color="error"
                                                        onClick={() => {
                                                            // Revert to empty string
                                                            const existingIndex = countEntries.findIndex(en => en.sapNumber === part.sapNumber);
                                                            if (existingIndex >= 0) {
                                                                const updated = [...countEntries];
                                                                updated[existingIndex] = { ...updated[existingIndex], countQty: '' };
                                                                setCountEntries(updated);
                                                            }
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
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button
                            variant="outlined"
                            size="small"
                            onClick={() => setStockCountPageStart(Math.max(0, stockCountPageStart - pageSize))}
                            disabled={stockCountPageStart === 0}
                        >
                            &lt;&lt; Previous
                        </Button>
                        <Button
                            variant="outlined"
                            size="small"
                            onClick={() => setStockCountPageStart(stockCountPageStart + pageSize)}
                            disabled={stockCountPageStart + pageSize >= parts.length}
                        >
                            Next &gt;&gt;
                        </Button>
                        {!isReadOnly && (
                            <Button
                                variant="contained"
                                size="small"
                                onClick={handleSaveProgress}
                            >
                                SAVE PROGRESS
                            </Button>
                        )}
                    </Box>
                    <Typography variant="body2" sx={{ color: '#666' }}>
                        Showing {parts.length > 0 ? stockCountPageStart + 1 : 0}-{Math.min(stockCountPageStart + pageSize, parts.length)} of {parts.length} parts
                    </Typography>
                </Box>
            </Paper>

            {/* Variance Report Section */}
            {varianceReport && (
                <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                            VARIANCE REPORT
                        </Typography>
                    </Box>

                    <Box sx={{ overflowX: 'auto', mb: 2 }}>
                        <Table size="small">
                            <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
                                <TableRow>
                                    <TableCell sx={{ fontWeight: 'bold', width: '10%' }}>SAP#</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold', width: '25%' }}>Part Name</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold', width: '15%' }}>Location</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold', width: '12%' }}>Stock Qty</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold', width: '12%' }}>Count Qty</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold', width: '12%' }}>Variance</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {varianceReport.variances.filter(v => v.variance !== 0).map((entry) => (
                                    <TableRow key={entry.id} hover>
                                        <TableCell>{entry.sapNumber}</TableCell>
                                        <TableCell>{entry.partName}</TableCell>
                                        <TableCell>{entry.location}</TableCell>
                                        <TableCell>{entry.stockQty}</TableCell>
                                        <TableCell>{entry.countQty}</TableCell>
                                        <TableCell>
                                            <Chip
                                                label={entry.variance > 0 ? `+${entry.variance}` : entry.variance}
                                                color={entry.variance > 0 ? 'success' : 'error'}
                                                size="small"
                                            />
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Box>

                    <Paper sx={{ p: 2, backgroundColor: '#f9f9f9', mb: 2 }}>
                        <Typography variant="body2" sx={{ mb: 1 }}>
                            <strong>Summary:</strong>
                        </Typography>
                        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 2 }}>
                            <Typography variant="body2">
                                Total Items: <strong>{countEntries.length}</strong>
                            </Typography>
                            <Typography variant="body2">
                                Zero Variance: <strong>{varianceReport.zeroVariance}</strong>
                            </Typography>
                            <Typography variant="body2">
                                Positive: <strong>{varianceReport.positiveCount}</strong>
                            </Typography>
                            <Typography variant="body2">
                                Negative: <strong>{varianceReport.negativeCount}</strong>
                            </Typography>
                        </Box>
                        <Typography variant="body2" sx={{ mt: 1 }}>
                            Total Variance Value: <strong>${Math.abs(varianceReport.totalVarianceValue)}</strong>
                        </Typography>
                    </Paper>

                    {!isReadOnly && (
                        <Box sx={{ display: 'flex', gap: 1 }}>
                            <Button variant="outlined" color="error" onClick={handleRejectCount}>REJECT COUNT</Button>
                            <Button
                                variant="contained"
                                onClick={() => setApprovalDialogOpen(true)}
                            >
                                APPROVE COUNT
                            </Button>
                        </Box>
                    )}
                </Paper>
            )}

            {/* Approval Dialog */}
            <Dialog open={approvalDialogOpen} onClose={() => setApprovalDialogOpen(false)}>
                <DialogTitle>Approve Stock Take</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
                        This will finalize the stock take and update the master stock quantities. This action cannot be undone.
                    </Typography>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Approval Remarks"
                        fullWidth
                        multiline
                        rows={3}
                        variant="outlined"
                        value={approvalComments}
                        onChange={(e) => setApprovalComments(e.target.value)}
                        required
                        error={approvalComments.trim() === ''}
                        helperText={approvalComments.trim() === '' ? 'Remarks are mandatory' : ''}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setApprovalDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleApproveStockTake} variant="contained" color="primary">
                        Confirm Approval
                    </Button>
                </DialogActions>
            </Dialog>

            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
            >
                <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>

        </Box>
    );
};

export default StockTakeProcess;
