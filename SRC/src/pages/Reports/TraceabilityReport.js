import React, { useEffect, useState } from 'react';
import { db } from '../../firebase/config';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { Button, Paper, Table, TableBody, TableCell, TableHead, TableRow, Box, Typography, TextField, InputAdornment } from '@mui/material';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import SearchIcon from '@mui/icons-material/Search';

const TraceabilityReport = () => {
  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const q = query(collection(db, 'movement_logs'), orderBy('date', 'desc'));
        const querySnapshot = await getDocs(q);
        const data = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
        setLogs(data);
        setFilteredLogs(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  useEffect(() => {
    const lower = searchQuery.toLowerCase();
    const filtered = logs.filter(log => 
      (log.partName && log.partName.toLowerCase().includes(lower)) ||
      (log.sapNumber && log.sapNumber.includes(lower)) ||
      (log.userName && log.userName.toLowerCase().includes(lower))
    );
    setFilteredLogs(filtered);
  }, [searchQuery, logs]);

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text('Traceability Report', 14, 15);
    
    const tableColumn = ["Date", "Type", "Part", "SAP #", "Qty", "User", "Remarks"];
    const tableRows = [];

    filteredLogs.forEach(log => {
      const logData = [
        log.date?.toDate().toLocaleDateString(),
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

    doc.save('traceability_report.pdf');
  };

  const exportExcel = () => {
    const workSheet = XLSX.utils.json_to_sheet(filteredLogs.map(log => ({
      "Date": log.date?.toDate().toLocaleString(),
      "Type": log.type,
      "Part Name": log.partName,
      "SAP Number": log.sapNumber,
      "Quantity": log.quantity,
      "User": log.userName,
      "Remarks": log.remarks
    })));
    const workBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workBook, workSheet, "Traceability");
    XLSX.writeFile(workBook, "traceability_report.xlsx");
  };

  return (
    <Box>
      <Paper elevation={2} sx={{ p: 2, mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h5">Traceability Report</Typography>
        <Box display="flex" gap={2}>
          <TextField 
            size="small" 
            placeholder="Search Part, SAP, User..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment>,
            }}
          />
          <Button startIcon={<PictureAsPdfIcon />} variant="outlined" color="error" onClick={exportPDF}>
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
                <TableCell>Date</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Part Name</TableCell>
                <TableCell>SAP #</TableCell>
                <TableCell>Qty</TableCell>
                <TableCell>User</TableCell>
                <TableCell>Remarks</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredLogs.map(log => (
                <TableRow key={log.id}>
                  <TableCell>{log.date?.toDate().toLocaleString()}</TableCell>
                  <TableCell>{log.type}</TableCell>
                  <TableCell>{log.partName}</TableCell>
                  <TableCell>{log.sapNumber}</TableCell>
                  <TableCell>{log.quantity}</TableCell>
                  <TableCell>{log.userName}</TableCell>
                  <TableCell>{log.remarks}</TableCell>
                </TableRow>
              ))}
              {filteredLogs.length === 0 && <TableRow><TableCell colSpan={7}>No logs found</TableCell></TableRow>}
            </TableBody>
          </Table>
        )}
      </Paper>
    </Box>
  );
};

export default TraceabilityReport;
