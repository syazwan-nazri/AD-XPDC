import React, { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { collection, getDocs, addDoc, updateDoc, doc, Timestamp } from 'firebase/firestore';
import { useSelector } from 'react-redux';
import {
  Button,
  Snackbar,
  TextField,
  Autocomplete,
  Paper,
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Divider,
  Alert,
  InputAdornment,
  Chip,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  LocalShipping,
  CheckCircle,
  Inventory,
  CalendarToday,
  Description,
  Person,
  Receipt,
  TrendingDown,
  Refresh,
  ArrowDownward,
  Badge,
  Assignment
} from '@mui/icons-material';

const StockOut = () => {
  const user = useSelector(state => state.auth.user);
  const isAdmin = user?.groupId?.toLowerCase() === 'a' || user?.groupId?.toLowerCase() === 'admin';
  const permissions = user?.groupPermissions?.stock_out || {};

  const canAdd = permissions.access === 'add' || isAdmin;
  const [parts, setParts] = useState([]);
  const [selectedPart, setSelectedPart] = useState(null);
  const [quantity, setQuantity] = useState('');
  const [remarks, setRemarks] = useState('');
  const [receiver, setReceiver] = useState('');
  const [mrfNumber, setMrfNumber] = useState('');
  const [dateOfIssue, setDateOfIssue] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchParts = async () => {
      const querySnapshot = await getDocs(collection(db, 'parts'));
      setParts(querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
    };
    fetchParts();
    fetchRecentTransactions();
  }, []);

  const fetchRecentTransactions = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'movement_logs'));
      const transactions = querySnapshot.docs
        .map(doc => ({ ...doc.data(), id: doc.id }))
        .filter(t => t.type === 'OUT')
        .sort((a, b) => b.date?.toDate() - a.date?.toDate())
        .slice(0, 5);
      setRecentTransactions(transactions);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  };

  const handleSubmit = async () => {
    if (!canAdd) {
      return setSnackbar({ open: true, message: 'You do not have permission to add stock-out entries', severity: 'error' });
    }
    if (!selectedPart || !quantity || Number(quantity) <= 0) {
      return setSnackbar({ open: true, message: 'Please select a part and valid quantity', severity: 'error' });
    }

    const qty = Number(quantity);
    if (qty > (selectedPart.currentStock || 0)) {
      return setSnackbar({
        open: true,
        message: `Insufficient Stock. Available: ${selectedPart.currentStock || 0}`,
        severity: 'error'
      });
    }

    setIsSubmitting(true);
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
        mrfNumber: mrfNumber,
        dateOfIssue: dateOfIssue
      });

      setSnackbar({
        open: true,
        message: `Successfully issued ${qty} units of ${selectedPart.name}`,
        severity: 'success'
      });

      // Reset form
      setSelectedPart(null);
      setQuantity('');
      setRemarks('');
      setReceiver('');
      setMrfNumber('');
      setDateOfIssue('');

      // Refresh data
      const updatedParts = parts.map(p => p.id === selectedPart.id ? { ...p, currentStock: newStock } : p);
      setParts(updatedParts);
      await fetchRecentTransactions();

    } catch (e) {
      console.error(e);
      setSnackbar({ open: true, message: 'Transaction Failed', severity: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getRemainingStock = () => {
    if (!selectedPart || !quantity) return selectedPart?.currentStock || 0;
    const current = selectedPart.currentStock || 0;
    const qty = Number(quantity);
    return current - qty;
  };

  return (
    <Box sx={{
      minHeight: 'calc(100vh - 64px)',
      backgroundColor: '#f8fafc',
      p: 3,
      width: '100%',
      ml: 0,
      mr: 0
    }}>
      {/* Main Content Container - Full width */}
      <Box sx={{
        width: '100%',
        maxWidth: 'none',
        margin: '0 auto'
      }}>
        {/* Header Section */}
        <Box sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 4,
          flexWrap: 'wrap',
          gap: 2
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 56,
              height: 56,
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
              color: 'white',
              boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)'
            }}>
              <LocalShipping sx={{ fontSize: 28 }} />
            </Box>
            <Box>
              <Typography variant="h4" sx={{
                fontWeight: 700,
                color: '#1e293b',
                mb: 0.5
              }}>
                Stock Out
              </Typography>
              <Typography variant="body1" sx={{ color: '#64748b' }}>
                Issue inventory items for use and update stock levels
              </Typography>
            </Box>
          </Box>

          {/* Stats Card */}
          <Card sx={{
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            backgroundColor: 'white',
            px: 3,
            py: 1.5,
            minWidth: 200
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <ArrowDownward sx={{ color: '#dc2626', fontSize: 20 }} />
              <Box>
                <Typography variant="body2" sx={{ color: '#64748b' }}>
                  Recent Stock Outs
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 600, color: '#1e293b' }}>
                  {recentTransactions.length}
                </Typography>
              </Box>
            </Box>
          </Card>
        </Box>

        {canAdd ? (
          <Paper elevation={0} sx={{
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            overflow: 'hidden',
            backgroundColor: 'white',
            mb: 4,
            width: '100%'
          }}>
            <Box sx={{
              p: 3,
              borderBottom: '1px solid #e2e8f0',
              backgroundColor: '#fef2f2'
            }}>
              <Typography variant="h6" sx={{
                fontWeight: 600,
                color: '#1e293b',
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}>
                <Inventory sx={{ fontSize: 20, color: '#dc2626' }} />
                New Stock Out Entry
              </Typography>
              <Typography variant="body2" sx={{ color: '#64748b', mt: 0.5 }}>
                Fill in the details below to issue inventory items
              </Typography>
            </Box>

            <Box sx={{ p: 4 }}>
              {/* ITEM DETAILS SECTION */}
              <Box sx={{ mb: 4 }}>
                <Typography variant="subtitle1" sx={{
                  fontWeight: 600,
                  color: '#334155',
                  mb: 2,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1
                }}>
                  <Inventory sx={{ fontSize: 18, color: '#dc2626' }} />
                  Item Details
                </Typography>

                {/* Autocomplete - Full Width */}
                <Box sx={{ mb: 3 }}>
                  <Autocomplete
                    options={parts}
                    getOptionLabel={(option) => `${option.sapNumber || 'N/A'} - ${option.name}`}
                    value={selectedPart}
                    onChange={(event, newValue) => setSelectedPart(newValue)}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Search and Select Part"
                        placeholder="Type to search parts..."
                        size="medium"
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            borderRadius: '10px',
                            backgroundColor: '#f8fafc',
                          }
                        }}
                      />
                    )}
                    renderOption={(props, option) => (
                      <Box component="li" {...props} sx={{ py: 1.5 }}>
                        <Box sx={{ width: '100%' }}>
                          <Typography variant="body1" sx={{ fontWeight: 500 }}>
                            {option.name}
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 2, mt: 0.5 }}>
                            <Chip
                              label={`SAP: ${option.sapNumber || 'N/A'}`}
                              size="small"
                              sx={{ height: 20, fontSize: '0.75rem' }}
                            />
                            <Chip
                              label={`Current: ${option.currentStock || 0}`}
                              size="small"
                              color={option.currentStock > 0 ? "success" : "error"}
                              variant="outlined"
                              sx={{ height: 20, fontSize: '0.75rem' }}
                            />
                          </Box>
                        </Box>
                      </Box>
                    )}
                  />
                </Box>

                {/* Quantity - Full Width */}
                <Box sx={{ mb: 1 }}>
                  <TextField
                    label="Quantity to Issue"
                    type="number"
                    fullWidth
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    size="medium"
                    helperText={selectedPart && `Maximum available: ${selectedPart.currentStock || 0}`}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <TrendingDown sx={{ color: '#64748b' }} />
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: '10px',
                        backgroundColor: '#f8fafc',
                      }
                    }}
                  />
                </Box>

                {/* Selected Part Info */}
                {selectedPart && (
                  <Card sx={{
                    mt: 2,
                    borderRadius: '10px',
                    border: '1px solid #e2e8f0',
                    backgroundColor: '#fef2f2'
                  }}>
                    <CardContent sx={{ p: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box>
                          <Typography variant="body2" sx={{ color: '#dc2626', fontWeight: 500 }}>
                            Selected Item
                          </Typography>
                          <Typography variant="body1" sx={{ fontWeight: 600 }}>
                            {selectedPart.name}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#7f1d1d' }}>
                            SAP: {selectedPart.sapNumber || 'N/A'} • Current Stock: {selectedPart.currentStock || 0}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5 }}>
                          <Chip
                            label={`Current: ${selectedPart.currentStock || 0}`}
                            color={selectedPart.currentStock > 0 ? "info" : "error"}
                            size="small"
                          />
                          {quantity && (
                            <Chip
                              label={`After: ${getRemainingStock()}`}
                              color={getRemainingStock() >= 0 ? "warning" : "error"}
                              size="small"
                              variant="outlined"
                            />
                          )}
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                )}
              </Box>

              <Divider sx={{ my: 4 }} />

              {/* RECEIVER INFORMATION SECTION */}
              <Box sx={{ mb: 4 }}>
                <Typography variant="subtitle1" sx={{
                  fontWeight: 600,
                  color: '#334155',
                  mb: 2,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1
                }}>
                  <Person sx={{ fontSize: 18, color: '#dc2626' }} />
                  Receiver Information
                </Typography>

                {/* Receiver Name - Full Width */}
                <Box sx={{ mb: 3 }}>
                  <TextField
                    label="Receiver (Technician Name)"
                    fullWidth
                    value={receiver}
                    onChange={(e) => setReceiver(e.target.value)}
                    placeholder="Enter receiver name"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Badge sx={{ color: '#64748b' }} />
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: '10px',
                        backgroundColor: '#f8fafc',
                      }
                    }}
                  />
                </Box>

                {/* MRF Number - Full Width */}
                <Box sx={{ mb: 3 }}>
                  <TextField
                    label="MRF Number"
                    fullWidth
                    value={mrfNumber}
                    onChange={(e) => setMrfNumber(e.target.value)}
                    placeholder="MRF-XXXXX"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Assignment sx={{ color: '#64748b' }} />
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: '10px',
                        backgroundColor: '#f8fafc',
                      }
                    }}
                  />
                </Box>

                {/* Date of Issue - Full Width */}
                <Box sx={{ mb: 2 }}>
                  <TextField
                    label="Date of Issue"
                    type="date"
                    fullWidth
                    value={dateOfIssue}
                    onChange={(e) => setDateOfIssue(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <CalendarToday sx={{ color: '#64748b' }} />
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: '10px',
                        backgroundColor: '#f8fafc',
                      }
                    }}
                  />
                </Box>

                {/* Stock Status Display */}
                {selectedPart && quantity && (
                  <Card sx={{
                    mt: 2,
                    borderRadius: '10px',
                    backgroundColor: getRemainingStock() >= 0 ? '#f0fdf4' : '#fef2f2',
                    border: `1px solid ${getRemainingStock() >= 0 ? '#bbf7d0' : '#fecaca'}`
                  }}>
                    <CardContent sx={{ p: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box>
                          <Typography variant="body1" sx={{
                            color: getRemainingStock() >= 0 ? '#166534' : '#dc2626',
                            fontWeight: 500
                          }}>
                            {getRemainingStock() >= 0 ? 'Stock Status: Sufficient' : 'Stock Status: Insufficient'}
                          </Typography>
                          <Typography variant="body2" sx={{
                            color: getRemainingStock() >= 0 ? '#166534' : '#dc2626'
                          }}>
                            Current: {selectedPart.currentStock || 0} • Issue: {quantity} • Remaining: {getRemainingStock()}
                          </Typography>
                        </Box>
                        {getRemainingStock() < 0 && (
                          <Chip
                            label="Insufficient"
                            color="error"
                            size="small"
                            sx={{ fontWeight: 600 }}
                          />
                        )}
                      </Box>
                    </CardContent>
                  </Card>
                )}
              </Box>

              <Divider sx={{ my: 4 }} />

              {/* ADDITIONAL NOTES SECTION */}
              <Box sx={{ mb: 4 }}>
                <Typography variant="subtitle1" sx={{
                  fontWeight: 600,
                  color: '#334155',
                  mb: 2,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1
                }}>
                  <Description sx={{ fontSize: 18, color: '#dc2626' }} />
                  Additional Notes
                </Typography>

                <TextField
                  label="Remarks"
                  fullWidth
                  multiline
                  rows={4}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Add any special notes, conditions, or reason for issuing this stock..."
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '10px',
                      backgroundColor: '#f8fafc',
                    }
                  }}
                />
              </Box>

              <Divider sx={{ my: 4 }} />

              {/* CONFIRM BUTTON - Centered */}
              <Box sx={{
                display: 'flex',
                justifyContent: 'center',
                pt: 2
              }}>
                <Button
                  variant="contained"
                  size="large"
                  onClick={handleSubmit}
                  disabled={isSubmitting || !selectedPart || !quantity || getRemainingStock() < 0}
                  startIcon={<CheckCircle />}
                  sx={{
                    minWidth: 300,
                    background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
                    px: 6,
                    py: 1.8,
                    fontWeight: 600,
                    fontSize: '1rem',
                    borderRadius: '10px',
                    textTransform: 'none',
                    boxShadow: '0 4px 14px rgba(220, 38, 38, 0.4)',
                    '&:hover': {
                      boxShadow: '0 6px 20px rgba(220, 38, 38, 0.6)',
                      transform: 'translateY(-2px)'
                    },
                    '&:disabled': {
                      background: '#e2e8f0',
                      color: '#94a3b8',
                      transform: 'none',
                      boxShadow: 'none'
                    }
                  }}
                >
                  {isSubmitting ? 'Processing...' : 'Confirm Stock Out'}
                </Button>
              </Box>
            </Box>
          </Paper>
        ) : (
          <Alert severity="info" sx={{ borderRadius: '16px', mb: 4 }}>
            You do not have permission to record new stock out entries.
          </Alert>
        )}

        {/* Recent Stock Outs Section - Stacked Below */}
        <Paper elevation={0} sx={{
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
          backgroundColor: 'white',
          width: '100%'
        }}>
          <Box sx={{
            p: 3,
            borderBottom: '1px solid #e2e8f0',
            backgroundColor: '#fef2f2',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <Box>
              <Typography variant="h6" sx={{
                fontWeight: 600,
                color: '#1e293b',
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}>
                <TrendingDown sx={{ fontSize: 20, color: '#dc2626' }} />
                Recent Stock Out Transactions
              </Typography>
              <Typography variant="body2" sx={{ color: '#64748b', mt: 0.5 }}>
                Last 5 stock out entries
              </Typography>
            </Box>
            <Tooltip title="Refresh transactions">
              <IconButton
                onClick={fetchRecentTransactions}
                sx={{
                  color: '#dc2626',
                  backgroundColor: 'white',
                  border: '1px solid #e2e8f0',
                  '&:hover': {
                    backgroundColor: '#fef2f2'
                  }
                }}
              >
                <Refresh />
              </IconButton>
            </Tooltip>
          </Box>

          <Box sx={{ p: 3 }}>
            {recentTransactions.length === 0 ? (
              <Box sx={{
                textAlign: 'center',
                py: 6,
                color: '#94a3b8'
              }}>
                <Description sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} />
                <Typography variant="body1" sx={{ mb: 1 }}>
                  No recent transactions
                </Typography>
                <Typography variant="body2">
                  Stock out transactions will appear here once you start issuing items
                </Typography>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {recentTransactions.map((transaction) => (
                  <Card
                    key={transaction.id}
                    variant="outlined"
                    sx={{
                      borderRadius: '10px',
                      borderColor: '#e2e8f0',
                      backgroundColor: '#f8fafc',
                      '&:hover': {
                        borderColor: '#dc2626',
                        backgroundColor: '#fef2f2'
                      },
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <CardContent sx={{ p: 3 }}>
                      <Box sx={{ mb: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                          <Typography variant="h6" sx={{ fontWeight: 600, color: '#1e293b' }}>
                            {transaction.partName}
                          </Typography>
                          <Chip
                            label={`-${transaction.quantity}`}
                            size="medium"
                            color="error"
                            icon={<ArrowDownward sx={{ fontSize: 16 }} />}
                            sx={{ fontWeight: 600 }}
                          />
                        </Box>
                        <Typography variant="body2" sx={{ color: '#64748b' }}>
                          SAP: {transaction.sapNumber || 'N/A'}
                        </Typography>
                      </Box>

                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="body2" sx={{ color: '#64748b', mb: 0.5 }}>
                            Receiver
                          </Typography>
                          <Typography variant="body1" sx={{ fontWeight: 500, color: '#334155' }}>
                            {transaction.receiver || 'Not specified'}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="body2" sx={{ color: '#64748b', mb: 0.5 }}>
                            MRF Number
                          </Typography>
                          <Typography variant="body1" sx={{ fontWeight: 500, color: '#334155' }}>
                            {transaction.mrfNumber || 'N/A'}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="body2" sx={{ color: '#64748b', mb: 0.5 }}>
                            Date Issued
                          </Typography>
                          <Typography variant="body1" sx={{ fontWeight: 500, color: '#334155' }}>
                            {formatDate(transaction.date)}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="body2" sx={{ color: '#64748b', mb: 0.5 }}>
                            Issued By
                          </Typography>
                          <Typography variant="body1" sx={{ fontWeight: 500, color: '#334155' }}>
                            {transaction.userName || 'N/A'}
                          </Typography>
                        </Grid>
                      </Grid>

                      {transaction.remarks && (
                        <Box sx={{ mt: 3, pt: 2, borderTop: '1px dashed #e2e8f0' }}>
                          <Typography variant="body2" sx={{ color: '#64748b', mb: 0.5 }}>
                            Notes:
                          </Typography>
                          <Typography variant="body2" sx={{ color: '#475569', fontStyle: 'italic' }}>
                            "{transaction.remarks}"
                          </Typography>
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </Box>
            )}
          </Box>
        </Paper>
      </Box>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{
            width: '100%',
            borderRadius: '10px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
          }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default StockOut;