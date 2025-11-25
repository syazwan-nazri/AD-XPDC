import React, { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { collection, getDocs, addDoc, updateDoc, doc, Timestamp } from 'firebase/firestore';
import { useSelector } from 'react-redux';
import { Button, Snackbar, TextField, Autocomplete, Paper, Box, Typography } from '@mui/material';

const InternalTransfer = () => {
  const user = useSelector(state => state.auth.user);
  const [parts, setParts] = useState([]);
  const [selectedPart, setSelectedPart] = useState(null);
  const [newRackNumber, setNewRackNumber] = useState('');
  const [newRackLevel, setNewRackLevel] = useState('');
  const [remarks, setRemarks] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    const fetchParts = async () => {
      const querySnapshot = await getDocs(collection(db, 'parts'));
      setParts(querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
    };
    fetchParts();
  }, []);

  const handleSubmit = async () => {
    if (!selectedPart || !newRackNumber || !newRackLevel) {
      return setSnackbar({ open: true, message: 'Please select a part and new location', severity: 'error' });
    }

    try {
      // Update Part Location
      await updateDoc(doc(db, 'parts', selectedPart.id), {
        rackNumber: newRackNumber,
        rackLevel: newRackLevel,
        updatedAt: new Date().toISOString()
      });

      // Create Movement Log
      await addDoc(collection(db, 'movement_logs'), {
        partId: selectedPart.id,
        partName: selectedPart.name,
        sapNumber: selectedPart.sapNumber,
        type: 'TRANSFER',
        quantity: 0, // Transfer doesn't change qty in this simple model
        date: Timestamp.now(),
        userId: user.uid,
        userName: user.username || user.email,
        remarks: `Moved from ${selectedPart.rackNumber}-${selectedPart.rackLevel} to ${newRackNumber}-${newRackLevel}. ${remarks}`,
        fromLocation: `${selectedPart.rackNumber}-${selectedPart.rackLevel}`,
        toLocation: `${newRackNumber}-${newRackLevel}`
      });

      setSnackbar({ open: true, message: 'Transfer Successful', severity: 'success' });
      setSelectedPart(null);
      setNewRackNumber('');
      setNewRackLevel('');
      setRemarks('');
      
      // Refresh parts
      const updatedParts = parts.map(p => p.id === selectedPart.id ? { ...p, rackNumber: newRackNumber, rackLevel: newRackLevel } : p);
      setParts(updatedParts);

    } catch (e) {
      console.error(e);
      setSnackbar({ open: true, message: 'Transaction Failed', severity: 'error' });
    }
  };

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto', mt: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h5" gutterBottom>Internal Stock Transfer</Typography>
        
        <Autocomplete
          options={parts}
          getOptionLabel={(option) => `${option.sapNumber} - ${option.name} (Loc: ${option.rackNumber}-${option.rackLevel})`}
          value={selectedPart}
          onChange={(event, newValue) => setSelectedPart(newValue)}
          renderInput={(params) => <TextField {...params} label="Select Part" margin="normal" />}
        />

        <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
          <TextField
            label="New Rack Number"
            fullWidth
            value={newRackNumber}
            onChange={(e) => setNewRackNumber(e.target.value)}
          />
          <TextField
            label="New Rack Level"
            fullWidth
            value={newRackLevel}
            onChange={(e) => setNewRackLevel(e.target.value)}
          />
        </Box>

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
          color="info"
          fullWidth 
          size="large" 
          sx={{ mt: 3 }} 
          onClick={handleSubmit}
        >
          CONFIRM TRANSFER
        </Button>
      </Paper>
      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar({ ...snackbar, open: false })} message={snackbar.message} severity={snackbar.severity} />
    </Box>
  );
};

export default InternalTransfer;
