import React, { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { collection, getDocs, addDoc, updateDoc, doc, Timestamp } from 'firebase/firestore';
import { useSelector } from 'react-redux';
import { Button, Snackbar, TextField, Autocomplete, Paper, Box, Typography } from '@mui/material';

const StockOut = () => {
  const user = useSelector(state => state.auth.user);
  const [parts, setParts] = useState([]);
  const [selectedPart, setSelectedPart] = useState(null);
  const [quantity, setQuantity] = useState('');
  const [remarks, setRemarks] = useState('');
  const [receiver, setReceiver] = useState('');
  const [workOrder, setWorkOrder] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    const fetchParts = async () => {
      const querySnapshot = await getDocs(collection(db, 'parts'));
      setParts(querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
    };
    fetchParts();
  }, []);

  const handleSubmit = async () => {
    if (!selectedPart || !quantity || Number(quantity) <= 0) {
      return setSnackbar({ open: true, message: 'Please select a part and valid quantity', severity: 'error' });
    }

    const qty = Number(quantity);
    if (qty > (selectedPart.currentStock || 0)) {
      return setSnackbar({ open: true, message: 'Insufficient Stock', severity: 'error' });
    }

    try {
      // Update Part Stock
      const newStock = (selectedPart.currentStock || 0) - qty;
      await updateDoc(doc(db, 'parts', selectedPart.id), {
        currentStock: newStock,
        updatedAt: new Date().toISOString()
      });

      // Create Movement Log
      await addDoc(collection(db, 'movement_logs'), {
        partId: selectedPart.id,
        partName: selectedPart.name,
        sapNumber: selectedPart.sapNumber,
        type: 'OUT',
        quantity: qty,
        date: Timestamp.now(),
        userId: user.uid,
        userName: user.username || user.email,
        remarks: remarks,
        receiver: receiver,
        workOrder: workOrder
      });

      setSnackbar({ open: true, message: 'Stock Out Successful', severity: 'success' });
      setSelectedPart(null);
      setQuantity('');
      setRemarks('');
      setReceiver('');
      setWorkOrder('');
      
      const updatedParts = parts.map(p => p.id === selectedPart.id ? { ...p, currentStock: newStock } : p);
      setParts(updatedParts);

    } catch (e) {
      console.error(e);
      setSnackbar({ open: true, message: 'Transaction Failed', severity: 'error' });
    }
  };

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto', mt: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h5" gutterBottom>Stock Out (Issue)</Typography>
        
        <Autocomplete
          options={parts}
          getOptionLabel={(option) => `${option.sapNumber} - ${option.name} (Stock: ${option.currentStock || 0})`}
          value={selectedPart}
          onChange={(event, newValue) => setSelectedPart(newValue)}
          renderInput={(params) => <TextField {...params} label="Select Part" margin="normal" />}
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
          label="Receiver (Technician Name)"
          fullWidth
          margin="normal"
          value={receiver}
          onChange={(e) => setReceiver(e.target.value)}
        />

        <TextField
          label="Work Order #"
          fullWidth
          margin="normal"
          value={workOrder}
          onChange={(e) => setWorkOrder(e.target.value)}
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

        <Button 
          variant="contained" 
          color="warning"
          fullWidth 
          size="large" 
          sx={{ mt: 3 }} 
          onClick={handleSubmit}
        >
          CONFIRM STOCK OUT
        </Button>
      </Paper>
      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar({ ...snackbar, open: false })} message={snackbar.message} severity={snackbar.severity} />
    </Box>
  );
};

export default StockOut;
