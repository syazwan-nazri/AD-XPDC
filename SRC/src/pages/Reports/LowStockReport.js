import React, { useEffect, useState } from 'react';
import { db } from '../../firebase/config';
import { collection, getDocs } from 'firebase/firestore';
import {
    Paper, Box, Typography, TextField, InputAdornment, Button, Chip, MenuItem,
    Grid, Radio, RadioGroup, FormControlLabel, FormControl, FormLabel
} from '@mui/material';
import { DataGrid, GridToolbar } from '@mui/x-data-grid';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import WarningIcon from '@mui/icons-material/Warning';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

const LowStockReport = () => {
    const [parts, setParts] = useState([]);
    const [filteredParts, setFilteredParts] = useState([]);
    const [loading, setLoading] = useState(true);

    // Advanced Filter State
    const [filterLogic, setFilterLogic] = useState('AND');
    const [filters, setFilters] = useState([
        { id: 1, field: 'name', value: '' },
        { id: 2, field: 'sapNumber', value: '' },
        { id: 3, field: 'status', value: '' }, // Critical/Warning
    ]);

    const fieldOptions = [
        { value: 'name', label: 'Part Name' },
        { value: 'sapNumber', label: 'SAP Number' },
        { value: 'internalRef', label: 'Internal Ref' },
        { value: 'category', label: 'Category' },
        { value: 'status', label: 'Status' },
    ];

    const fetchParts = async () => {
        setLoading(true);
        try {
            const querySnapshot = await getDocs(collection(db, 'parts'));
            const data = querySnapshot.docs.map(doc => {
                const d = doc.data();
                const stock = Number(d.currentStock) || 0;
                const safety = Number(d.safetyLevel) || Number(d.minStockLevel) || 0;

                // Determine Status
                let status = 'Good';
                let statusPriority = 3; // For sorting: 1=Critical, 2=Warning, 3=Good

                if (stock < safety) {
                    status = 'Critical';
                    statusPriority = 1;
                } else if (stock <= safety * 1.25) { // 25% buffer for warning
                    status = 'Warning';
                    statusPriority = 2;
                }

                return {
                    id: doc.id,
                    ...d,
                    currentStock: stock,
                    safetyLevel: safety,
                    status,
                    statusPriority
                };
            });
            setParts(data);
            setFilteredParts(data);
        } catch (error) {
            console.error("Error fetching parts:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchParts();
    }, []);

    useEffect(() => {
        const activeFilters = filters.filter(f => f.value.trim() !== '');

        if (activeFilters.length === 0) {
            setFilteredParts(parts);
            return;
        }

        const result = parts.filter(part => {
            const checkMatch = (filter) => {
                const partVal = part[filter.field] ? String(part[filter.field]).toLowerCase() : '';
                return partVal.includes(filter.value.toLowerCase());
            };

            if (filterLogic === 'AND') {
                return activeFilters.every(checkMatch);
            } else {
                return activeFilters.some(checkMatch);
            }
        });

        setFilteredParts(result);
    }, [parts, filters, filterLogic]);

    const handleFilterChange = (id, key, newValue) => {
        setFilters(prev => prev.map(f => (f.id === id ? { ...f, [key]: newValue } : f)));
    };

    const exportPDF = () => {
        const doc = new jsPDF();
        doc.text('Low Stock Alert Report', 14, 15);
        doc.setFontSize(10);
        doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 22);

        const tableColumn = ["Status", "SAP #", "Internal Ref", "Name", "Category", "Current Stock", "Safety Level"];
        const tableRows = [];

        filteredParts.forEach(part => {
            const partData = [
                part.status,
                part.sapNumber,
                part.internalRef,
                part.name,
                part.category,
                part.currentStock,
                part.safetyLevel
            ];
            tableRows.push(partData);
        });

        doc.autoTable({
            head: [tableColumn],
            body: tableRows,
            startY: 25,
            styles: { fontSize: 8 },
        });

        doc.save('low_stock_report.pdf');
    };

    const exportExcel = () => {
        const dataToExport = filteredParts.map(p => ({
            "Status": p.status,
            "SAP Number": p.sapNumber,
            "Internal Ref": p.internalRef,
            "Name": p.name,
            "Category": p.category,
            "Current Stock": p.currentStock,
            "Safety Level": p.safetyLevel
        }));

        const workSheet = XLSX.utils.json_to_sheet(dataToExport);
        const workBook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workBook, workSheet, "Low Stock");
        XLSX.writeFile(workBook, "low_stock_report.xlsx");
    };

    const columns = [
        {
            field: 'status',
            headerName: 'Status',
            width: 130,
            renderCell: (params) => {
                const status = params.value;
                let color = 'success';
                let icon = <CheckCircleIcon fontSize="small" />;

                if (status === 'Critical') {
                    color = 'error';
                    icon = <ErrorOutlineIcon fontSize="small" />;
                } else if (status === 'Warning') {
                    color = 'warning';
                    icon = <WarningIcon fontSize="small" />;
                }

                return (
                    <Chip
                        icon={icon}
                        label={status}
                        color={color}
                        size="small"
                        variant="outlined"
                        sx={{ fontWeight: 'bold' }}
                    />
                );
            }
        },
        { field: 'sapNumber', headerName: 'SAP #', width: 120 },
        { field: 'internalRef', headerName: 'Internal Ref', width: 150 },
        { field: 'name', headerName: 'Part Name', width: 250, flex: 1 },
        { field: 'category', headerName: 'Category', width: 150 },
        {
            field: 'currentStock',
            headerName: 'Current Stock',
            width: 130,
            type: 'number',
            headerAlign: 'left',
            align: 'left',
            renderCell: (params) => (
                <Typography fontWeight="bold" color={params.row.status === 'Critical' ? 'error.main' : 'textSecondary'}>
                    {params.value}
                </Typography>
            )
        },
        { field: 'safetyLevel', headerName: 'Safety Level', width: 130, type: 'number', headerAlign: 'left', align: 'left' },
        { field: 'replenishQty', headerName: 'Replenish Qty', width: 130, type: 'number', headerAlign: 'left', align: 'left' },
    ];

    return (
        <Box sx={{ height: '100%', width: '100%', p: 2 }}>
            <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap">
                    <Typography variant="h5" component="h1" fontWeight="bold" color="primary">
                        Low Stock Alert
                    </Typography>
                    <Box>
                        <Button startIcon={<RefreshIcon />} onClick={fetchParts} sx={{ mr: 1 }}>
                            Refresh
                        </Button>
                        <Button startIcon={<PictureAsPdfIcon />} variant="outlined" color="error" onClick={exportPDF} sx={{ mr: 1 }}>
                            PDF
                        </Button>
                        <Button startIcon={<FileDownloadIcon />} variant="outlined" color="success" onClick={exportExcel}>
                            Excel
                        </Button>
                    </Box>
                </Box>

                {/* Advanced Filters Section */}
                <Box sx={{ p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                    <Box display="flex" alignItems="center" mb={1}>
                        <FormControl component="fieldset">
                            <FormLabel component="legend" sx={{ fontSize: '0.8rem' }}>Filter Logic</FormLabel>
                            <RadioGroup
                                row
                                value={filterLogic}
                                onChange={(e) => setFilterLogic(e.target.value)}
                            >
                                <FormControlLabel value="AND" control={<Radio size="small" />} label="Match All (AND)" />
                                <FormControlLabel value="OR" control={<Radio size="small" />} label="Match Any (OR)" />
                            </RadioGroup>
                        </FormControl>
                    </Box>

                    <Grid container spacing={2}>
                        {filters.map((filter, index) => (
                            <React.Fragment key={filter.id}>
                                <Grid item xs={12} md={4}>
                                    <Box display="flex" gap={1}>
                                        <TextField
                                            select
                                            label={`Criteria ${index + 1}`}
                                            value={filter.field}
                                            onChange={(e) => handleFilterChange(filter.id, 'field', e.target.value)}
                                            size="small"
                                            sx={{ minWidth: '120px' }}
                                        >
                                            {fieldOptions.map((option) => (
                                                <MenuItem key={option.value} value={option.value}>
                                                    {option.label}
                                                </MenuItem>
                                            ))}
                                        </TextField>
                                        <TextField
                                            fullWidth
                                            size="small"
                                            label="Value"
                                            value={filter.value}
                                            onChange={(e) => handleFilterChange(filter.id, 'value', e.target.value)}
                                            placeholder="..."
                                        />
                                    </Box>
                                </Grid>
                            </React.Fragment>
                        ))}
                    </Grid>
                </Box>
            </Paper>

            <Paper elevation={2} sx={{ height: 600, width: '100%' }}>
                <DataGrid
                    rows={filteredParts}
                    columns={columns}
                    loading={loading}
                    getRowClassName={(params) => `row-${params.row.status.toLowerCase()}`}
                    initialState={{
                        pagination: {
                            paginationModel: { page: 0, pageSize: 25 },
                        },
                        sorting: {
                            sortModel: [{ field: 'statusPriority', sort: 'asc' }], // 1 (Critical) first
                        },
                    }}
                    pageSizeOptions={[10, 25, 50, 100]}
                    disableRowSelectionOnClick
                    slots={{ toolbar: GridToolbar }}
                    slotProps={{
                        toolbar: {
                            showQuickFilter: true,
                            quickFilterProps: { debounceMs: 500 },
                        },
                    }}
                    sx={{
                        '& .row-critical': {
                            bgcolor: '#ffebee',
                            '&:hover': { bgcolor: '#ffcdd2' }
                        },
                        '& .row-warning': {
                            bgcolor: '#fffde7',
                            '&:hover': { bgcolor: '#fff9c4' }
                        },
                        '& .MuiDataGrid-cell:hover': {
                            color: 'primary.main',
                        },
                    }}
                />
            </Paper>
        </Box>
    );
};

export default LowStockReport;
