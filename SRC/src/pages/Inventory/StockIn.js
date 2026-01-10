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
  Tooltip,
  Select,
  MenuItem,
  FormControl,
  InputLabel
} from '@mui/material';
import {
  LocalShipping,
  CheckCircle,
  Inventory,
  AttachMoney,
  CalendarToday,
  Description,
  Person,
  Receipt,
  TrendingUp,
  Refresh,
  ArrowUpward,
  CurrencyExchange
} from '@mui/icons-material';

const StockIn = () => {
  const user = useSelector(state => state.auth.user);
  const isAdmin = user?.groupId?.toLowerCase() === 'a' || user?.groupId?.toLowerCase() === 'admin';
  const permissions = user?.groupPermissions?.stock_in || {};

  const canAdd = permissions.access === 'add' || isAdmin;
  const [parts, setParts] = useState([]);
  const [selectedPart, setSelectedPart] = useState(null);
  const [quantity, setQuantity] = useState('');
  const [remarks, setRemarks] = useState('');
  const [supplier, setSupplier] = useState('');
  const [deliveryOrderNumber, setDeliveryOrderNumber] = useState('');
  const [dateOfReceipt, setDateOfReceipt] = useState('');
  const [costPerUnit, setCostPerUnit] = useState('');
  const [currency, setCurrency] = useState('USD'); // Default currency
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Common currencies used in inventory management
  const currencyOptions = [
    { code: 'USD', name: 'US Dollar', symbol: '$' },
    { code: 'EUR', name: 'Euro', symbol: '€' },
    { code: 'GBP', name: 'British Pound', symbol: '£' },
    { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
    { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
    { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
    { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
    { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM' },
    { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$' },
    { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
  ];

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
        .filter(t => t.type === 'IN')
        .sort((a, b) => b.date?.toDate() - a.date?.toDate())
        .slice(0, 5);
      setRecentTransactions(transactions);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  };

  const handleSubmit = async () => {
    if (!canAdd) {
      return setSnackbar({ open: true, message: 'You do not have permission to add stock-in entries', severity: 'error' });
    }
    if (!selectedPart || !quantity || Number(quantity) <= 0) {
      return setSnackbar({ open: true, message: 'Please select a part and valid quantity', severity: 'error' });
    }

    setIsSubmitting(true);
    try {
      const qty = Number(quantity);
      const totalCost = costPerUnit ? qty * Number(costPerUnit) : null;

      // Update Part Stock
      const newStock = (selectedPart.currentStock || 0) + qty;
      await updateDoc(doc(db, 'parts', selectedPart.id), {
        currentStock: newStock,
        updatedAt: new Date().toISOString()
      });

      // Create Movement Log with currency
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
        costPerUnit: costPerUnit ? Number(costPerUnit) : null,
        currency: currency, // Added currency field
        totalCost: totalCost
      });

      setSnackbar({
        open: true,
        message: `Successfully added ${qty} units of ${selectedPart.name}`,
        severity: 'success'
      });

      // Reset form (but keep currency as default)
      setSelectedPart(null);
      setQuantity('');
      setRemarks('');
      setSupplier('');
      setDeliveryOrderNumber('');
      setDateOfReceipt('');
      setCostPerUnit('');
      // Note: We don't reset currency to keep user preference

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

  const totalValue = () => {
    if (!quantity || !costPerUnit) return '0.00';
    const qty = Number(quantity);
    const cost = Number(costPerUnit);
    return (qty * cost).toFixed(2);
  };

  // Get currency symbol for display
  const getCurrencySymbol = () => {
    const selectedCurrency = currencyOptions.find(c => c.code === currency);
    return selectedCurrency ? selectedCurrency.symbol : '$';
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
              background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
              color: 'white',
              boxShadow: '0 4px 12px rgba(25, 118, 210, 0.3)'
            }}>
              <LocalShipping sx={{ fontSize: 28 }} />
            </Box>
            <Box>
              <Typography variant="h4" sx={{
                fontWeight: 700,
                color: '#1e293b',
                mb: 0.5
              }}>
                Stock In
              </Typography>
              <Typography variant="body1" sx={{ color: '#64748b' }}>
                Receive new inventory items and update stock levels
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
              <ArrowUpward sx={{ color: '#10b981', fontSize: 20 }} />
              <Box>
                <Typography variant="body2" sx={{ color: '#64748b' }}>
                  Recent Stock Ins
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
              backgroundColor: '#f1f5f9'
            }}>
              <Typography variant="h6" sx={{
                fontWeight: 600,
                color: '#1e293b',
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}>
                <Inventory sx={{ fontSize: 20, color: '#1976d2' }} />
                New Stock Entry
              </Typography>
              <Typography variant="body2" sx={{ color: '#64748b', mt: 0.5 }}>
                Fill in the details below to record new inventory
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
                  <Inventory sx={{ fontSize: 18, color: '#1976d2' }} />
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
                              label={`Current Stock: ${option.currentStock || 0}`}
                              size="small"
                              color="info"
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
                    label="Quantity"
                    type="number"
                    fullWidth
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    size="medium"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <TrendingUp sx={{ color: '#64748b' }} />
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
                    backgroundColor: '#f0f9ff'
                  }}>
                    <CardContent sx={{ p: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box>
                          <Typography variant="body2" sx={{ color: '#0369a1', fontWeight: 500 }}>
                            Selected Item
                          </Typography>
                          <Typography variant="body1" sx={{ fontWeight: 600 }}>
                            {selectedPart.name}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#0c4a6e' }}>
                            SAP: {selectedPart.sapNumber || 'N/A'} • Current Stock: {selectedPart.currentStock || 0}
                          </Typography>
                        </Box>
                        <Chip
                          label={`Current: ${selectedPart.currentStock || 0}`}
                          color="info"
                          size="small"
                        />
                      </Box>
                    </CardContent>
                  </Card>
                )}
              </Box>

              <Divider sx={{ my: 4 }} />

              {/* DELIVERY INFORMATION SECTION */}
              <Box sx={{ mb: 4 }}>
                <Typography variant="subtitle1" sx={{
                  fontWeight: 600,
                  color: '#334155',
                  mb: 2,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1
                }}>
                  <LocalShipping sx={{ fontSize: 18, color: '#1976d2' }} />
                  Delivery Information
                </Typography>

                {/* Supplier - Full Width */}
                <Box sx={{ mb: 3 }}>
                  <TextField
                    label="Supplier Name"
                    fullWidth
                    value={supplier}
                    onChange={(e) => setSupplier(e.target.value)}
                    placeholder="Enter supplier name"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Person sx={{ color: '#64748b' }} />
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

                {/* Delivery Order Number - Full Width */}
                <Box sx={{ mb: 3 }}>
                  <TextField
                    label="Delivery Order Number"
                    fullWidth
                    value={deliveryOrderNumber}
                    onChange={(e) => setDeliveryOrderNumber(e.target.value)}
                    placeholder="DO-XXXXX"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Receipt sx={{ color: '#64748b' }} />
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

                {/* Date of Receipt - Full Width */}
                <Box sx={{ mb: 3 }}>
                  <TextField
                    label="Date of Receipt"
                    type="date"
                    fullWidth
                    value={dateOfReceipt}
                    onChange={(e) => setDateOfReceipt(e.target.value)}
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

                {/* Currency Selection - Full Width */}
                <Box sx={{ mb: 3 }}>
                  <FormControl fullWidth>
                    <TextField
                      label="Currency"
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      select
                      SelectProps={{
                        native: false,
                        MenuProps: {
                          PaperProps: {
                            style: {
                              maxHeight: 300,
                            },
                          },
                        },
                      }}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <CurrencyExchange sx={{ color: '#64748b' }} />
                          </InputAdornment>
                        ),
                      }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: '10px',
                          backgroundColor: '#f8fafc',
                        }
                      }}
                    >
                      {currencyOptions.map((option) => (
                        <MenuItem key={option.code} value={option.code}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography sx={{ fontWeight: 500, minWidth: 40 }}>
                              {option.symbol}
                            </Typography>
                            <Typography>
                              {option.code} - {option.name}
                            </Typography>
                          </Box>
                        </MenuItem>
                      ))}
                    </TextField>
                  </FormControl>
                </Box>

                {/* Cost per Unit - Full Width (No $ sign) */}
                <Box sx={{ mb: 2 }}>
                  <TextField
                    label="Cost per Unit"
                    type="number"
                    fullWidth
                    value={costPerUnit}
                    onChange={(e) => setCostPerUnit(e.target.value)}
                    inputProps={{
                      step: '0.01',
                      min: '0'
                    }}
                    placeholder="0.00"
                    helperText={`Enter amount in ${currency}`}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: '10px',
                        backgroundColor: '#f8fafc',
                      }
                    }}
                  />
                </Box>

                {/* Total Value Display */}
                {quantity && costPerUnit && (
                  <Card sx={{
                    mt: 2,
                    borderRadius: '10px',
                    backgroundColor: '#f0f9ff',
                    border: '1px solid #bae6fd'
                  }}>
                    <CardContent sx={{ p: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box>
                          <Typography variant="body1" sx={{ color: '#0369a1', fontWeight: 500 }}>
                            Total Value
                          </Typography>
                          <Typography variant="body2" sx={{ color: '#0c4a6e' }}>
                            {quantity} units × {Number(costPerUnit).toFixed(2)} {currency} each
                          </Typography>
                        </Box>
                        <Typography variant="h6" sx={{ color: '#0369a1', fontWeight: 700 }}>
                          {getCurrencySymbol()}{totalValue()} {currency}
                        </Typography>
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
                  <Description sx={{ fontSize: 18, color: '#1976d2' }} />
                  Additional Notes
                </Typography>

                <TextField
                  label="Remarks"
                  fullWidth
                  multiline
                  rows={4}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Add any special notes, conditions, or observations about this stock in..."
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
                  disabled={isSubmitting || !selectedPart || !quantity}
                  startIcon={<CheckCircle />}
                  sx={{
                    minWidth: 300,
                    background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
                    px: 6,
                    py: 1.8,
                    fontWeight: 600,
                    fontSize: '1rem',
                    borderRadius: '10px',
                    textTransform: 'none',
                    boxShadow: '0 4px 14px rgba(25, 118, 210, 0.4)',
                    '&:hover': {
                      boxShadow: '0 6px 20px rgba(25, 118, 210, 0.6)',
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
                  {isSubmitting ? 'Processing...' : 'Confirm Stock In'}
                </Button>
              </Box>
            </Box>
          </Paper>
        ) : (
          <Alert severity="info" sx={{ borderRadius: '16px', mb: 4 }}>
            You do not have permission to record new stock entries.
          </Alert>
        )}

        {/* Recent Stock Ins Section - Stacked Below */}
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
            backgroundColor: '#f1f5f9',
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
                <TrendingUp sx={{ fontSize: 20, color: '#1976d2' }} />
                Recent Stock In Transactions
              </Typography>
              <Typography variant="body2" sx={{ color: '#64748b', mt: 0.5 }}>
                Last 5 stock in entries
              </Typography>
            </Box>
            <Tooltip title="Refresh transactions">
              <IconButton
                onClick={fetchRecentTransactions}
                sx={{
                  color: '#1976d2',
                  backgroundColor: 'white',
                  border: '1px solid #e2e8f0',
                  '&:hover': {
                    backgroundColor: '#f1f5f9'
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
                  Stock in transactions will appear here once you start adding items
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
                        borderColor: '#1976d2',
                        backgroundColor: '#f1f5f9'
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
                            label={`+${transaction.quantity}`}
                            size="medium"
                            color="success"
                            icon={<ArrowUpward sx={{ fontSize: 16 }} />}
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
                            Supplier
                          </Typography>
                          <Typography variant="body1" sx={{ fontWeight: 500, color: '#334155' }}>
                            {transaction.supplier || 'Not specified'}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="body2" sx={{ color: '#64748b', mb: 0.5 }}>
                            Delivery Order
                          </Typography>
                          <Typography variant="body1" sx={{ fontWeight: 500, color: '#334155' }}>
                            {transaction.deliveryOrderNumber || 'N/A'}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="body2" sx={{ color: '#64748b', mb: 0.5 }}>
                            Date Received
                          </Typography>
                          <Typography variant="body1" sx={{ fontWeight: 500, color: '#334155' }}>
                            {formatDate(transaction.date)}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="body2" sx={{ color: '#64748b', mb: 0.5 }}>
                            {transaction.currency ? `Cost (${transaction.currency})` : 'Cost per Unit'}
                          </Typography>
                          <Typography variant="body1" sx={{ fontWeight: 500, color: '#334155' }}>
                            {transaction.costPerUnit ?
                              `${transaction.currency || 'USD'} ${transaction.costPerUnit.toFixed(2)}` :
                              'N/A'}
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

export default StockIn;