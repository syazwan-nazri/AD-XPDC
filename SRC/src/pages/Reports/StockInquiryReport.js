import React, { useEffect, useState } from 'react';
import { db } from '../../firebase/config';
import { collection, getDocs } from 'firebase/firestore';
import {
    Paper, Box, Typography, Button, TextField, MenuItem,
    Grid, Radio, RadioGroup, FormControlLabel, FormControl, FormLabel
} from '@mui/material';
import { DataGrid, GridToolbar } from '@mui/x-data-grid';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import RefreshIcon from '@mui/icons-material/Refresh';

const StockInquiryReport = () => {
    const [parts, setParts] = useState([]);
    const [filteredParts, setFilteredParts] = useState([]);
    const [loading, setLoading] = useState(true);

    // Advanced Filter State
    const [filterLogic, setFilterLogic] = useState('AND');
    const [filters, setFilters] = useState([
        { id: 1, field: 'name', value: '' },
        { id: 2, field: 'sapNumber', value: '' },
        { id: 3, field: 'rackNumber', value: '' }, // Added location search
        { id: 4, field: 'stockStatus', value: '' }, // All/InStock/OutOfStock
    ]);

    const fieldOptions = [
        { value: 'name', label: 'Part Name' },
        { value: 'sapNumber', label: 'SAP Number' },
        { value: 'internalRef', label: 'Internal Ref' },
        { value: 'category', label: 'Category' },
        { value: 'rackNumber', label: 'Rack Number' },
        { value: 'rackLevel', label: 'Rack Level' },
        { value: 'stockStatus', label: 'Stock Status' }, // Custom Logic
    ];

    const fetchParts = async () => {
        setLoading(true);
        try {
            const querySnapshot = await getDocs(collection(db, 'parts'));
            const data = querySnapshot.docs.map(doc => {
                const d = doc.data();
                const currentStock = Number(d.currentStock) || 0;
                const safetyLevel = Number(d.safetyLevel) || 0;

                let status = 'In Stock';
                if (currentStock === 0) status = 'Out of Stock';
                else if (currentStock < safetyLevel) status = 'Low Stock';

                return {
                    ...d,
                    id: doc.id,
                    currentStock,
                    safetyLevel,
                    rackLocation: (d.rackNumber && d.rackLevel) ? `${d.rackNumber}-${d.rackLevel}` : 'No Loc',
                    stockStatus: status, // Derived field for filtering
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

    // Filter Logic
    useEffect(() => {
        const activeFilters = filters.filter(f => f.value.trim() !== '');

        if (activeFilters.length === 0) {
            setFilteredParts(parts);
            return;
        }

        const result = parts.filter(part => {
            const checkMatch = (filter) => {
                // Special case for 'stockStatus' which is derived
                if (filter.field === 'stockStatus') {
                    return part.stockStatus.toLowerCase().includes(filter.value.toLowerCase());
                }

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

    const columns = [
        { field: 'sapNumber', headerName: 'SAP #', width: 120 },
        { field: 'internalRef', headerName: 'Internal Ref', width: 120 },
        { field: 'name', headerName: 'Part Name', width: 250, flex: 1 },
        { field: 'category', headerName: 'Category', width: 130 },
        { field: 'rackLocation', headerName: 'Location', width: 100 },
        {
            field: 'currentStock',
            headerName: 'Current Stock',
            width: 120,
            type: 'number',
            headerAlign: 'right',
            align: 'right',
            renderCell: (params) => (
                <Typography fontWeight="bold" color={params.value > 0 ? 'success.main' : 'error.main'}>
                    {params.value}
                </Typography>
            )
        },
        { field: 'stockStatus', headerName: 'Status', width: 120 },
    ];

    const exportPDF = () => {
        const doc = new jsPDF();
        doc.text('Stock Inquiry Report', 14, 15);
        doc.setFontSize(10);
        doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 22);

        const tableColumn = ["SAP #", "Internal Ref", "Name", "Category", "Location", "Qty", "Status"];
        const tableRows = [];

        filteredParts.forEach(part => {
            const partData = [
                part.sapNumber,
                part.internalRef,
                part.name,
                part.category,
                part.rackLocation,
                part.currentStock,
                part.stockStatus
            ];
            tableRows.push(partData);
        });

        doc.autoTable({
            head: [tableColumn],
            body: tableRows,
            startY: 25,
            styles: { fontSize: 8 },
        });

        doc.save('stock_inquiry_report.pdf');
    };

    const exportExcel = () => {
        const dataToExport = filteredParts.map(p => ({
            "SAP Number": p.sapNumber,
            "Internal Ref": p.internalRef,
            "Name": p.name,
            "Category": p.category,
            "Location": p.rackLocation,
            "Current Stock": p.currentStock,
            "Stock Status": p.stockStatus
        }));

        const workSheet = XLSX.utils.json_to_sheet(dataToExport);
        const workBook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workBook, workSheet, "Stock Inquiry");
        XLSX.writeFile(workBook, "stock_inquiry_report.xlsx");
    };

    return (
        <Box sx={{ height: '100%', width: '100%', p: 2 }}>
            <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" mb={2}>
                    <Typography variant="h5" fontWeight="bold">Stock Inquiry Report</Typography>
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
                                <Grid item xs={12} md={3}>
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
                                            placeholder={filter.field === 'stockStatus' ? 'e.g. low' : '...'}
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
                    initialState={{
                        pagination: {
                            paginationModel: { page: 0, pageSize: 25 },
                        },
                        sorting: {
                            sortModel: [{ field: 'currentStock', sort: 'asc' }],
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
                />
            </Paper>
        </Box>
    );
};

export default StockInquiryReport;
