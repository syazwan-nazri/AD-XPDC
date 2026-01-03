import React, { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { collection, getDocs, addDoc, updateDoc, doc, Timestamp } from 'firebase/firestore';
import { useSelector } from 'react-redux';
import { Button, Snackbar, TextField, Autocomplete, Paper, Box, Typography, Grid, Card, CardContent, Divider, Stack, Alert } from '@mui/material';
import { LocalShipping, CheckCircle } from '@mui/icons-material';

const StockIn = () => {
  const user = useSelector(state => state.auth.user);
  const [parts, setParts] = useState([]);
  const [selectedPart, setSelectedPart] = useState(null);
  const [quantity, setQuantity] = useState('');
  const [remarks, setRemarks] = useState('');
  const [supplier, setSupplier] = useState('');
  const [deliveryOrderNumber, setDeliveryOrderNumber] = useState('');
  const [dateOfReceipt, setDateOfReceipt] = useState('');
  const [costPerUnit, setCostPerUnit] = useState('');
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
        supplier: supplier,
        deliveryOrderNumber: deliveryOrderNumber,
        dateOfReceipt: dateOfReceipt,
        costPerUnit: costPerUnit ? Number(costPerUnit) : null
      });

      setSnackbar({ open: true, message: 'Stock In Successful', severity: 'success' });
      setSelectedPart(null);
      setQuantity('');
      setRemarks('');
      setSupplier('');
      setDeliveryOrderNumber('');
      setDateOfReceipt('');
      setCostPerUnit('');
      
      // Refresh parts locally (optional, or rely on real-time listener if implemented)
      const updatedParts = parts.map(p => p.id === selectedPart.id ? { ...p, currentStock: newStock } : p);
      setParts(updatedParts);

    } catch (e) {
      console.error(e);
      setSnackbar({ open: true, message: 'Transaction Failed', severity: 'error' });
    }
  };

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      background: '#ffffff',
      py: 4 
    }}>
      <Box sx={{ maxWidth: 700, mx: 'auto', px: 2 }}>
        {/* Header Card */}
        <Card sx={{ 
          mb: 3, 
          background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
          color: 'white',
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
        }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <LocalShipping sx={{ fontSize: 40 }} />
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>Stock In</Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>Receive & Log Inventory</Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>

        {/* Main Form Card */}
        <Paper elevation={6} sx={{ 
          p: 4,
          borderRadius: 3,
          boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
          backgroundColor: '#ffffff'
        }}>
          
          {/* Part Selection Section */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="subtitle1" sx={{ 
              fontWeight: 600, 
              mb: 2,
              color: '#1976d2',
              textTransform: 'uppercase',
              fontSize: '0.85rem',
              letterSpacing: 1
            }}>
              📦 Item Details
            </Typography>
            <Autocomplete
              options={parts}
              getOptionLabel={(option) => `${option.sapNumber} - ${option.name}`}
              value={selectedPart}
              onChange={(event, newValue) => setSelectedPart(newValue)}
              renderInput={(params) => (
                <TextField 
                  {...params} 
                  label="Select Part" 
                  margin="normal"
                  variant="outlined"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '12px',
                      '&:hover fieldset': {
                        borderColor: '#1976d2',
                      },
                    }
                  }}
                />
              )}
            />
            <TextField
              label="Quantity"
              type="number"
              fullWidth
              margin="normal"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              variant="outlined"
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '12px',
                  '&:hover fieldset': {
                    borderColor: '#1976d2',
                  },
                }
              }}
            />
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* Supplier & Delivery Section */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="subtitle1" sx={{ 
              fontWeight: 600, 
              mb: 2,
              color: '#1976d2',
              textTransform: 'uppercase',
              fontSize: '0.85rem',
              letterSpacing: 1
            }}>
              🚚 Delivery Information
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Supplier"
                  fullWidth
                  margin="normal"
                  value={supplier}
                  onChange={(e) => setSupplier(e.target.value)}
                  variant="outlined"
                  placeholder="Supplier name"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '12px',
                      '&:hover fieldset': {
                        borderColor: '#1976d2',
                      },
                    }
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Delivery Order Number"
                  fullWidth
                  margin="normal"
                  value={deliveryOrderNumber}
                  onChange={(e) => setDeliveryOrderNumber(e.target.value)}
                  variant="outlined"
                  placeholder="DO-XXXXX"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '12px',
                      '&:hover fieldset': {
                        borderColor: '#1976d2',
                      },
                    }
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Date of Receipt"
                  type="date"
                  fullWidth
                  margin="normal"
                  value={dateOfReceipt}
                  onChange={(e) => setDateOfReceipt(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  variant="outlined"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '12px',
                      '&:hover fieldset': {
                        borderColor: '#1976d2',
                      },
                    }
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Cost per Unit"
                  type="number"
                  fullWidth
                  margin="normal"
                  value={costPerUnit}
                  onChange={(e) => setCostPerUnit(e.target.value)}
                  inputProps={{ step: '0.01' }}
                  variant="outlined"
                  placeholder="0.00"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '12px',
                      '&:hover fieldset': {
                        borderColor: '#1976d2',
                      },
                    }
                  }}
                />
              </Grid>
            </Grid>
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* Additional Info Section */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="subtitle1" sx={{ 
              fontWeight: 600, 
              mb: 2,
              color: '#1976d2',
              textTransform: 'uppercase',
              fontSize: '0.85rem',
              letterSpacing: 1
            }}>
              📝 Additional Notes
            </Typography>
            <TextField
              label="Remarks"
              fullWidth
              multiline
              rows={3}
              margin="normal"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              variant="outlined"
              placeholder="Add any special notes or conditions..."
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '12px',
                  '&:hover fieldset': {
                    borderColor: '#1976d2',
                  },
                }
              }}
            />
          </Box>

          {/* Action Button */}
          <Button 
            variant="contained" 
            fullWidth 
            size="large" 
            onClick={handleSubmit}
            startIcon={<CheckCircle />}
            sx={{ 
              mt: 3,
              background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
              py: 1.8,
              fontWeight: 600,
              fontSize: '1rem',
              textTransform: 'uppercase',
              letterSpacing: 1,
              borderRadius: '12px',
              boxShadow: '0 4px 15px rgba(25, 118, 210, 0.4)',
              transition: 'all 0.3s ease',
              '&:hover': {
                boxShadow: '0 8px 25px rgba(25, 118, 210, 0.6)',
                transform: 'translateY(-2px)'
              }
            }}
          >
            Confirm Stock In
          </Button>
        </Paper>
      </Box>
      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar({ ...snackbar, open: false })} message={snackbar.message} severity={snackbar.severity} />
    </Box>
  );
};

export default StockIn;
