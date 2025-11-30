import React, { useEffect, useState } from 'react';
import { db } from '../../firebase/config';
import { collection, getDocs } from 'firebase/firestore';
import { Button, Paper, Table, TableBody, TableCell, TableHead, TableRow, Box, Typography } from '@mui/material';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';

const StockValuationReport = () => {
  const [parts, setParts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchParts = async () => {
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
      setLoading(false);
    };
    fetchParts();
  }, []);

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text('Stock Valuation Report', 14, 15);
    
    const tableColumn = ["SAP #", "Name", "Category", "Qty", "Unit Price", "Total Value"];
    const tableRows = [];

    parts.forEach(part => {
      const partData = [
        part.sapNumber,
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
    const workSheet = XLSX.utils.json_to_sheet(parts.map(p => ({
      "SAP Number": p.sapNumber,
      "Name": p.name,
      "Category": p.category,
      "Current Stock": p.currentStock,
      "Unit Price": p.unitPrice,
      "Total Value": p.totalValue
    })));
    const workBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workBook, workSheet, "Stock Valuation");
    XLSX.writeFile(workBook, "stock_valuation_report.xlsx");
  };

  return (
    <Box>
      <Paper elevation={2} sx={{ p: 2, mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5">Stock Valuation Report</Typography>
        <Box>
          <Button startIcon={<PictureAsPdfIcon />} variant="outlined" color="error" onClick={exportPDF} sx={{ mr: 1 }}>
            PDF
          </Button>
          <Button startIcon={<FileDownloadIcon />} variant="outlined" color="success" onClick={exportExcel}>
            Excel
          </Button>
        </Box>
      </Paper>

      <Paper elevation={1} sx={{ p: 2 }}>
        {loading ? <Typography>Loading...</Typography> : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>SAP #</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Category</TableCell>
                <TableCell align="right">Quantity</TableCell>
                <TableCell align="right">Unit Price</TableCell>
                <TableCell align="right">Total Value</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {parts.map(part => (
                <TableRow key={part.id}>
                  <TableCell>{part.sapNumber}</TableCell>
                  <TableCell>{part.name}</TableCell>
                  <TableCell>{part.category}</TableCell>
                  <TableCell align="right">{part.currentStock}</TableCell>
                  <TableCell align="right">${part.unitPrice.toFixed(2)}</TableCell>
                  <TableCell align="right">${part.totalValue.toFixed(2)}</TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell colSpan={5} align="right"><strong>Grand Total</strong></TableCell>
                <TableCell align="right"><strong>${parts.reduce((sum, p) => sum + p.totalValue, 0).toFixed(2)}</strong></TableCell>
              </TableRow>
            </TableBody>
          </Table>
        )}
      </Paper>
    </Box>
  );
};

export default StockValuationReport;
