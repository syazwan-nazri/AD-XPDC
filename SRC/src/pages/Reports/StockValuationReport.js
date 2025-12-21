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

const StockValuationReport = () => {
  const [parts, setParts] = useState([]);
  const [filteredParts, setFilteredParts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Advanced Filter State
  const [filterLogic, setFilterLogic] = useState('AND');
  const [filters, setFilters] = useState([
    { id: 1, field: 'sapNumber', value: '' },
    { id: 2, field: 'name', value: '' },
    { id: 3, field: 'category', value: '' },
    { id: 4, field: 'internalRef', value: '' },
  ]);

  const fieldOptions = [
    { value: 'sapNumber', label: 'SAP Number' },
    { value: 'name', label: 'Part Name' },
    { value: 'category', label: 'Category' },
    { value: 'internalRef', label: 'Internal Ref' },
    { value: 'currentStock', label: 'Quantity' }, // Numeric treated as text for "includes" or exact? simplified to includes string for now
  ];

  const fetchParts = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'parts'));
      const data = querySnapshot.docs.map(doc => {
        const d = doc.data();
        return {
          ...d,
          id: doc.id,
          unitPrice: Number(d.unitPrice) || 0,
          currentStock: Number(d.currentStock) || 0,
          totalValue: (Number(d.currentStock) || 0) * (Number(d.unitPrice) || 0)
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
      // Helper to check match
      const checkMatch = (filter) => {
        const partVal = part[filter.field] ? String(part[filter.field]).toLowerCase() : '';
        return partVal.includes(filter.value.toLowerCase());
      };

      if (filterLogic === 'AND') {
        // Must match ALL active filters
        return activeFilters.every(checkMatch);
      } else {
        // OR: Must match ANY active filter
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
    { field: 'category', headerName: 'Category', width: 150 },
    {
      field: 'currentStock',
      headerName: 'Qty',
      width: 100,
      type: 'number',
      headerAlign: 'right',
      align: 'right'
    },
    {
      field: 'unitPrice',
      headerName: 'Unit Price',
      width: 120,
      type: 'number',
      headerAlign: 'right',
      align: 'right',
      valueFormatter: (params) => {
        return params.value == null ? '' : `$${params.value.toFixed(2)}`;
      }
    },
    {
      field: 'totalValue',
      headerName: 'Total Value',
      width: 140,
      type: 'number',
      headerAlign: 'right',
      align: 'right',
      valueFormatter: (params) => {
        return params.value == null ? '' : `$${params.value.toFixed(2)}`;
      },
      renderCell: (params) => (
        <Typography fontWeight="bold" color="primary.main">
          ${(params.value || 0).toFixed(2)}
        </Typography>
      )
    },
  ];

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text('Stock Valuation Report', 14, 15);
    // Removed Grand Total display as per request ("remove the grand total for the stock valuation report")
    // If specifically requested in PDF, I can add it back. User said "details... already in pdf". 
    // Usually reports imply a summary. I will optionally add it at bottom. 
    // But strict compliance to "remove grand total" might mean everywhere. 
    // I'll leave it as a footer row in the table only.

    const tableColumn = ["SAP #", "Internal Ref", "Name", "Category", "Qty", "Unit Price", "Total Value"];
    const tableRows = [];

    filteredParts.forEach(part => {
      const partData = [
        part.sapNumber,
        part.internalRef,
        part.name,
        part.category,
        part.currentStock,
        `$${part.unitPrice.toFixed(2)}`,
        `$${part.totalValue.toFixed(2)}`
      ];
      tableRows.push(partData);
    });

    doc.autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 20,
    });

    doc.save('stock_valuation_report.pdf');
  };

  const exportExcel = () => {
    const dataToExport = filteredParts.map(p => ({
      "SAP Number": p.sapNumber,
      "Internal Ref": p.internalRef,
      "Name": p.name,
      "Category": p.category,
      "Current Stock": p.currentStock,
      "Unit Price": p.unitPrice,
      "Total Value": p.totalValue
    }));



    const workSheet = XLSX.utils.json_to_sheet(dataToExport);
    const workBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workBook, workSheet, "Stock Valuation");
    XLSX.writeFile(workBook, "stock_valuation_report.xlsx");
  };

  return (
    <Box sx={{ height: '100%', width: '100%', p: 2 }}>
      <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" mb={2}>
          <Typography variant="h5" fontWeight="bold">Stock Valuation Report</Typography>
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
                {/* Search Bar {index + 1} */}
                <Grid item xs={12} md={3}>
                  <Box display="flex" gap={1}>
                    <TextField
                      select
                      label={`Criteria ${index + 1}`}
                      value={filter.field}
                      onChange={(e) => handleFilterChange(filter.id, 'field', e.target.value)}
                      size="small"
                      sx={{ minWidth: '110px' }}
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
          initialState={{
            pagination: {
              paginationModel: { page: 0, pageSize: 25 },
            },
            sorting: {
              sortModel: [{ field: 'totalValue', sort: 'desc' }],
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

export default StockValuationReport;
