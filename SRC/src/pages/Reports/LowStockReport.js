import React, { useEffect, useState } from 'react';
import { db } from '../../firebase/config';
import { collection, getDocs } from 'firebase/firestore';
import {
    Paper, Box, Typography, TextField, InputAdornment, Button, Chip
} from '@mui/material';
import { DataGrid, GridToolbar } from '@mui/x-data-grid';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import WarningIcon from '@mui/icons-material/Warning';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

const LowStockReport = () => {
    const [parts, setParts] = useState([]);
    const [filteredParts, setFilteredParts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchText, setSearchText] = useState('');

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
        if (!searchText) {
            setFilteredParts(parts);
            return;
        }
        const lower = searchText.toLowerCase();
        const result = parts.filter(p =>
            (p.name && p.name.toLowerCase().includes(lower)) ||
            (p.sapNumber && p.sapNumber.includes(lower)) ||
            (p.internalRef && p.internalRef.toLowerCase().includes(lower))
        );
        setFilteredParts(result);
    }, [searchText, parts]);

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
                    <Button
                        startIcon={<RefreshIcon />}
                        onClick={fetchParts}
                    >
                        Refresh
                    </Button>
                </Box>

                <TextField
                    fullWidth
                    size="small"
                    label="Search Parts"
                    placeholder="Part Name, SAP, Internal Ref..."
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
