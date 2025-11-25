import React, { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { collection, getDocs, addDoc, updateDoc, doc, Timestamp } from 'firebase/firestore';
import { useSelector } from 'react-redux';
import { Button, Snackbar, TextField, Autocomplete, Paper, Box, Typography } from '@mui/material';

const StockIn = () => {
  const user = useSelector(state => state.auth.user);
  const [parts, setParts] = useState([]);
  const [selectedPart, setSelectedPart] = useState(null);
  const [quantity, setQuantity] = useState('');
  const [remarks, setRemarks] = useState('');
  const [supplier, setSupplier] = useState('');
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

    try {
      const qty = Number(quantity);
      // Update Part Stock
      const newStock = (selectedPart.currentStock || 0) + qty;
      await updateDoc(doc(db, 'parts', selectedPart.id), {
        currentStock: newStock,
        updatedAt: new Date().toISOString()
      });

      // Create Movement Log
      await addDoc(collection(db, 'movement_logs'), {
        partId: selectedPart.id,
        partName: selectedPart.name,
        sapNumber: selectedPart.sapNumber,
        type: 'IN',
        quantity: qty,
        date: Timestamp.now(),
        userId: user.uid,
        userName: user.username || user.email,
        remarks: remarks,
        supplier: supplier
      });

      setSnackbar({ open: true, message: 'Stock In Successful', severity: 'success' });
      setSelectedPart(null);
      setQuantity('');
      setRemarks('');
      setSupplier('');
      
      // Refresh parts locally (optional, or rely on real-time listener if implemented)
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
        <Typography variant="h5" gutterBottom>Stock In (Receive)</Typography>
        
        <Autocomplete
          options={parts}
          getOptionLabel={(option) => `${option.sapNumber} - ${option.name}`}
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
          label="Supplier (Optional)"
          fullWidth
          margin="normal"
          value={supplier}
          onChange={(e) => setSupplier(e.target.value)}
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
          fullWidth 
          size="large" 
          sx={{ mt: 3 }} 
          onClick={handleSubmit}
        >
          CONFIRM STOCK IN
        </Button>
      </Paper>
      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar({ ...snackbar, open: false })} message={snackbar.message} severity={snackbar.severity} />
    </Box>
  );
};

export default StockIn;
