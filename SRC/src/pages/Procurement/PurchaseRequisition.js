import React, { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { collection, getDocs, addDoc, updateDoc, doc, Timestamp, query, orderBy } from 'firebase/firestore';
import { useSelector } from 'react-redux';
import { Button, Snackbar, TextField, Autocomplete, Paper, Box, Typography, Table, TableHead, TableRow, TableCell, TableBody, Chip, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';

const PurchaseRequisition = () => {
  const user = useSelector(state => state.auth.user);
  const [parts, setParts] = useState([]);
  const [prs, setPrs] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Create PR Form
  const [selectedPart, setSelectedPart] = useState(null);
  const [quantity, setQuantity] = useState('');
  const [remarks, setRemarks] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const fetchPrs = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'purchase_requisitions'), orderBy('date', 'desc'));
      const querySnapshot = await getDocs(q);
      setPrs(querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchParts = async () => {
      const querySnapshot = await getDocs(collection(db, 'parts'));
      setParts(querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
    };
    fetchParts();
    fetchPrs();
  }, []);

  const handleCreatePr = async () => {
    if (!selectedPart || !quantity) return setSnackbar({ open: true, message: 'Part and Quantity required', severity: 'error' });
    
    try {
      await addDoc(collection(db, 'purchase_requisitions'), {
        requesterId: user.uid,
        requesterName: user.username || user.email,
        date: Timestamp.now(),
        status: 'Pending',
        items: [{ partId: selectedPart.id, partName: selectedPart.name, sapNumber: selectedPart.sapNumber, quantity: Number(quantity) }],
        remarks: remarks
      });
      setSnackbar({ open: true, message: 'PR Created', severity: 'success' });
      setCreateDialogOpen(false);
      setSelectedPart(null);
      setQuantity('');
      setRemarks('');
      fetchPrs();
    } catch (e) {
      setSnackbar({ open: true, message: 'Creation Failed', severity: 'error' });
    }
  };

  const handleStatusChange = async (prId, newStatus) => {
    try {
      await updateDoc(doc(db, 'purchase_requisitions', prId), {
        status: newStatus,
        approverId: user.uid,
        approvedAt: Timestamp.now()
      });
      setSnackbar({ open: true, message: `PR ${newStatus}`, severity: 'success' });
      fetchPrs();
    } catch (e) {
      setSnackbar({ open: true, message: 'Update Failed', severity: 'error' });
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Approved': return 'success';
      case 'Rejected': return 'error';
      default: return 'warning';
    }
  };

  return (
    <Box>
      <Paper elevation={2} sx={{ p: 2, mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>PURCHASE REQUISITIONS</h2>
        <Button variant="contained" onClick={() => setCreateDialogOpen(true)}>CREATE PR</Button>
      </Paper>

      <Paper elevation={1} sx={{ p: 2 }}>
        {loading ? <div>Loading...</div> : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Requester</TableCell>
                <TableCell>Part</TableCell>
                <TableCell>Qty</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Remarks</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {prs.map(pr => (
                <TableRow key={pr.id}>
                  <TableCell>{pr.date?.toDate().toLocaleDateString()}</TableCell>
                  <TableCell>{pr.requesterName}</TableCell>
                  <TableCell>{pr.items[0]?.partName} ({pr.items[0]?.sapNumber})</TableCell>
                  <TableCell>{pr.items[0]?.quantity}</TableCell>
                  <TableCell>
                    <Chip label={pr.status} color={getStatusColor(pr.status)} size="small" />
                  </TableCell>
                  <TableCell>{pr.remarks}</TableCell>
                  <TableCell>
                    {pr.status === 'Pending' && (
                      <>
                        <Button size="small" color="success" onClick={() => handleStatusChange(pr.id, 'Approved')}>Approve</Button>
                        <Button size="small" color="error" onClick={() => handleStatusChange(pr.id, 'Rejected')}>Reject</Button>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {prs.length === 0 && <TableRow><TableCell colSpan={7}>No PRs found</TableCell></TableRow>}
            </TableBody>
          </Table>
        )}
      </Paper>

      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>NEW PURCHASE REQUISITION</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            <Autocomplete
              options={parts}
              getOptionLabel={(option) => `${option.sapNumber} - ${option.name}`}
              value={selectedPart}
              onChange={(event, newValue) => setSelectedPart(newValue)}
              renderInput={(params) => <TextField {...params} label="Select Part" fullWidth />}
            />
            <TextField
              label="Quantity"
              type="number"
              fullWidth
              margin="normal"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
            <TextField
              label="Remarks"
              fullWidth
              multiline
              rows={3}
              margin="normal"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>CANCEL</Button>
          <Button onClick={handleCreatePr} variant="contained">SUBMIT</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar({ ...snackbar, open: false })} message={snackbar.message} severity={snackbar.severity} />
    </Box>
  );
};

export default PurchaseRequisition;
