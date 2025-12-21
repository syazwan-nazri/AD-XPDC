import React, { useEffect, useState } from 'react';
import { db } from '../../firebase/config';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import {
    Paper, Box, Typography, Button, TextField, MenuItem,
    Grid, InputAdornment, IconButton, Tooltip
} from '@mui/material';
import { DataGrid, GridToolbar } from '@mui/x-data-grid';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import FilterAltOffIcon from '@mui/icons-material/FilterAltOff';

const MovementHistory = () => {
    const [logs, setLogs] = useState([]);
    const [filteredLogs, setFilteredLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    // Filter States
    const [searchText, setSearchText] = useState('');
    const [typeFilter, setTypeFilter] = useState('All');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const q = query(collection(db, 'movement_logs'), orderBy('date', 'desc'));
            const querySnapshot = await getDocs(q);
            const data = querySnapshot.docs.map(doc => {
                const d = doc.data();
                return {
                    id: doc.id,
                    ...d,
                    // Flatten date for easy sorting/filtering
                    dateObj: d.date?.toDate(),
                    dateStr: d.date?.toDate().toLocaleString() || 'N/A'
                };
            });
            setLogs(data);
            setFilteredLogs(data);
        } catch (error) {
            console.error("Error fetching logs:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, []);

    useEffect(() => {
        let result = logs;

        // 1. Search Filter
        if (searchText) {
            const lower = searchText.toLowerCase();
            result = result.filter(log =>
                (log.partName && log.partName.toLowerCase().includes(lower)) ||
                (log.sapNumber && log.sapNumber.includes(lower)) ||
                (log.userName && log.userName.toLowerCase().includes(lower))
            );
        }

        // 2. Type Filter
        if (typeFilter !== 'All') {
            result = result.filter(log => log.type === typeFilter);
        }

        // 3. Date Range Filter
        if (startDate) {
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            result = result.filter(log => log.dateObj >= start);
        }
        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            result = result.filter(log => log.dateObj <= end);
        }

        setFilteredLogs(result);
    }, [logs, searchText, typeFilter, startDate, endDate]);

    const clearFilters = () => {
        setSearchText('');
        setTypeFilter('All');
        setStartDate('');
        setEndDate('');
    };

    const columns = [
        {
            field: 'dateObj',
            headerName: 'Date & Time',
            width: 180,
            type: 'dateTime',
            valueGetter: (params) => params.row?.dateObj // Ensure compatible with DataGrid v6/v7
        },
        { field: 'type', headerName: 'Type', width: 100 },
        { field: 'partName', headerName: 'Part Name', width: 200, flex: 1 },
        { field: 'sapNumber', headerName: 'SAP #', width: 150 },
        { field: 'quantity', headerName: 'Qty', width: 100, type: 'number' },
        { field: 'userName', headerName: 'User', width: 150 },
        { field: 'remarks', headerName: 'Remarks', width: 250, flex: 1 },
    ];

    const exportPDF = () => {
        const doc = new jsPDF();
        doc.text('Movement History Report', 14, 15);

        const tableColumn = ["Date", "Type", "Part", "SAP #", "Qty", "User", "Remarks"];
        const tableRows = [];

        filteredLogs.forEach(log => {
            const logData = [
                log.dateStr,
                log.type,
                log.partName,
                log.sapNumber,
                log.quantity,
                log.userName,
                log.remarks
            ];
            tableRows.push(logData);
        });

        doc.autoTable({
            head: [tableColumn],
            body: tableRows,
            startY: 20,
        });

        doc.save('movement_history.pdf');
    };

    const exportExcel = () => {
        const workSheet = XLSX.utils.json_to_sheet(filteredLogs.map(log => ({
            "Date": log.dateStr,
            "Type": log.type,
            "Part Name": log.partName,
            "SAP Number": log.sapNumber,
            "Quantity": log.quantity,
            "User": log.userName,
            "Remarks": log.remarks
        })));
        const workBook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workBook, workSheet, "MovementHistory");
        XLSX.writeFile(workBook, "movement_history.xlsx");
    };

    return (
        <Box sx={{ height: '100%', width: '100%', p: 2 }}>
            <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap">
                    <Typography variant="h5" component="h1" fontWeight="bold" color="primary">
                        Movement History
                    </Typography>
                    <Box>
                        <Button
                            startIcon={<RefreshIcon />}
                            onClick={fetchLogs}
                            sx={{ mr: 1 }}
                        >
                            Refresh
                        </Button>
                        <Button
                            variant="outlined"
                            color="error"
                            startIcon={<PictureAsPdfIcon />}
                            onClick={exportPDF}
                            sx={{ mr: 1 }}
                        >
                            PDF
                        </Button>
                        <Button
                            variant="outlined"
                            color="success"
                            startIcon={<FileDownloadIcon />}
                            onClick={exportExcel}
                        >
                            Excel
                        </Button>
                    </Box>
                </Box>

                {/* Filters Section */}
                <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} md={3}>
                        <TextField
                            fullWidth
                            size="small"
                            label="Search"
                            placeholder="Part, SAP, User..."
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon />
                                    </InputAdornment>
                                ),
                            }}
                        />
                    </Grid>
                    <Grid item xs={6} md={2}>
                        <TextField
                            select
                            fullWidth
                            size="small"
                            label="Type"
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value)}
                        >
                            <MenuItem value="All">All Types</MenuItem>
                            <MenuItem value="IN">IN</MenuItem>
                            <MenuItem value="OUT">OUT</MenuItem>
                        </TextField>
                    </Grid>
                    <Grid item xs={6} md={2}>
                        <TextField
                            fullWidth
                            size="small"
                            label="Start Date"
                            type="date"
                            InputLabelProps={{ shrink: true }}
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                        />
                    </Grid>
                    <Grid item xs={6} md={2}>
                        <TextField
                            fullWidth
                            size="small"
                            label="End Date"
                            type="date"
                            InputLabelProps={{ shrink: true }}
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                        />
                    </Grid>
                    <Grid item xs={6} md={2} display="flex" gap={1}>
                        <Button
                            variant="outlined"
                            startIcon={<FilterAltOffIcon />}
                            onClick={clearFilters}
                            fullWidth
                        >
                            Clear
                        </Button>
                    </Grid>
                </Grid>
            </Paper>

            {/* DataGrid */}
            <Paper elevation={2} sx={{ height: 600, width: '100%' }}>
                <DataGrid
                    rows={filteredLogs}
                    columns={columns}
                    loading={loading}
                    initialState={{
                        pagination: {
                            paginationModel: { page: 0, pageSize: 25 },
                        },
                        sorting: {
                            sortModel: [{ field: 'dateObj', sort: 'desc' }],
                        },
                    }}
                    pageSizeOptions={[10, 25, 50, 100]}
                    checkboxSelection
                    disableRowSelectionOnClick
                    slots={{ toolbar: GridToolbar }}
                    slotProps={{
                        toolbar: {
                            showQuickFilter: true,
                            quickFilterProps: { debounceMs: 500 },
                        },
                    }}
                    sx={{
                        '& .MuiDataGrid-cell:hover': {
                            color: 'primary.main',
                        },
                    }}
                />
            </Paper>
        </Box>
    );
};

export default MovementHistory;
