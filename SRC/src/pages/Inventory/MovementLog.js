import React, { useEffect, useState } from 'react';
import { db } from '../../firebase/config';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { Table, TableHead, TableRow, TableCell, TableBody, Paper, Box, Typography, Chip } from '@mui/material';

const MovementLog = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const q = query(collection(db, 'movement_logs'), orderBy('date', 'desc'));
        const querySnapshot = await getDocs(q);
        const data = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
        setLogs(data);
      } catch (error) {
        console.error("Error fetching logs:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  const getTypeColor = (type) => {
    switch (type) {
      case 'IN': return 'success';
      case 'OUT': return 'warning';
      case 'TRANSFER': return 'info';
      default: return 'default';
    }
  };

  return (
    <Box>
      <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
        <h2 style={{ margin: 0 }}>MOVEMENT LOGS</h2>
      </Paper>

      <Paper elevation={1} sx={{ p: 2 }}>
        {loading ? <div>Loading...</div> : (
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
              {logs.map(log => (
                <TableRow key={log.id}>
                  <TableCell>{log.date?.toDate().toLocaleString()}</TableCell>
                  <TableCell>
                    <Chip label={log.type} color={getTypeColor(log.type)} size="small" />
                  </TableCell>
                  <TableCell>{log.partName}</TableCell>
                  <TableCell>{log.sapNumber}</TableCell>
                  <TableCell>{log.quantity}</TableCell>
                  <TableCell>{log.userName}</TableCell>
                  <TableCell>{log.remarks}</TableCell>
                </TableRow>
              ))}
              {logs.length === 0 && <TableRow><TableCell colSpan={7}>No logs found</TableCell></TableRow>}
            </TableBody>
          </Table>
        )}
      </Paper>
    </Box>
  );
};

export default MovementLog;
