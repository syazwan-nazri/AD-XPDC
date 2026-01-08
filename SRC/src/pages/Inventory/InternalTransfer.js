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
  SwapHoriz, 
  CheckCircle, 
  Inventory, 
  LocationOn,
  Description,
  TrendingFlat,
  Refresh,
  CompareArrows,
  Warehouse,
  Storage
} from '@mui/icons-material';

const InternalTransfer = () => {
  const user = useSelector(state => state.auth.user);
  const [parts, setParts] = useState([]);
  const [selectedPart, setSelectedPart] = useState(null);
  const [newRackNumber, setNewRackNumber] = useState('');
  const [newRackLevel, setNewRackLevel] = useState('');
  const [remarks, setRemarks] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [recentTransfers, setRecentTransfers] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchParts = async () => {
      const querySnapshot = await getDocs(collection(db, 'parts'));
      setParts(querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
    };
    fetchParts();
    fetchRecentTransfers();
  }, []);

  const fetchRecentTransfers = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'movement_logs'));
      const transfers = querySnapshot.docs
        .map(doc => ({ ...doc.data(), id: doc.id }))
        .filter(t => t.type === 'TRANSFER')
        .sort((a, b) => b.date?.toDate() - a.date?.toDate())
        .slice(0, 5);
      setRecentTransfers(transfers);
    } catch (error) {
      console.error('Error fetching transfers:', error);
    }
  };

  const handleSubmit = async () => {
    if (!selectedPart || !newRackNumber || !newRackLevel) {
      return setSnackbar({ open: true, message: 'Please select a part and specify new location', severity: 'error' });
    }

    // Check if the new location is different from current
    if (selectedPart.rackNumber === newRackNumber && selectedPart.rackLevel === newRackLevel) {
      return setSnackbar({ 
        open: true, 
        message: 'New location must be different from current location', 
        severity: 'error' 
      });
    }

    setIsSubmitting(true);
    try {
      // Update Part Location
      await updateDoc(doc(db, 'parts', selectedPart.id), {
        rackNumber: newRackNumber,
        rackLevel: newRackLevel,
        updatedAt: new Date().toISOString()
      });

      const fromLocation = selectedPart.rackNumber && selectedPart.rackLevel 
        ? `${selectedPart.rackNumber}-${selectedPart.rackLevel}`
        : 'Not Specified';
      const toLocation = `${newRackNumber}-${newRackLevel}`;

      // Create Movement Log
      await addDoc(collection(db, 'movement_logs'), {
        partId: selectedPart.id,
        partName: selectedPart.name,
        sapNumber: selectedPart.sapNumber,
        type: 'TRANSFER',
        quantity: 0, // Transfer doesn't change qty
        date: Timestamp.now(),
        userId: user.uid,
        userName: user.username || user.email,
        remarks: remarks || `Moved from ${fromLocation} to ${toLocation}`,
        fromLocation: fromLocation,
        toLocation: toLocation,
        newRackNumber: newRackNumber,
        newRackLevel: newRackLevel
      });

      setSnackbar({ 
        open: true, 
        message: `Successfully transferred ${selectedPart.name} to ${toLocation}`, 
        severity: 'success' 
      });
      
      // Reset form
      setSelectedPart(null);
      setNewRackNumber('');
      setNewRackLevel('');
      setRemarks('');
      
      // Refresh data
      const updatedParts = parts.map(p => 
        p.id === selectedPart.id 
          ? { ...p, rackNumber: newRackNumber, rackLevel: newRackLevel } 
          : p
      );
      setParts(updatedParts);
      await fetchRecentTransfers();

    } catch (e) {
      console.error(e);
      setSnackbar({ open: true, message: 'Transfer Failed', severity: 'error' });
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

  const getCurrentLocation = () => {
    if (!selectedPart) return 'Not specified';
    return selectedPart.rackNumber && selectedPart.rackLevel 
      ? `${selectedPart.rackNumber}-${selectedPart.rackLevel}`
      : 'Not specified';
  };

  const getNewLocation = () => {
    if (!newRackNumber || !newRackLevel) return '';
    return `${newRackNumber}-${newRackLevel}`;
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
              background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
              color: 'white',
              boxShadow: '0 4px 12px rgba(124, 58, 237, 0.3)'
            }}>
              <SwapHoriz sx={{ fontSize: 28 }} />
            </Box>
            <Box>
              <Typography variant="h4" sx={{ 
                fontWeight: 700, 
                color: '#1e293b',
                mb: 0.5
              }}>
                Internal Transfer
              </Typography>
              <Typography variant="body1" sx={{ color: '#64748b' }}>
                Move inventory items between locations within the warehouse
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
              <CompareArrows sx={{ color: '#7c3aed', fontSize: 20 }} />
              <Box>
                <Typography variant="body2" sx={{ color: '#64748b' }}>
                  Recent Transfers
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 600, color: '#1e293b' }}>
                  {recentTransfers.length}
                </Typography>
              </Box>
            </Box>
          </Card>
        </Box>

        {/* New Transfer Form - Stacked Layout */}
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
            backgroundColor: '#f5f3ff'
          }}>
            <Typography variant="h6" sx={{ 
              fontWeight: 600,
              color: '#1e293b',
              display: 'flex',
              alignItems: 'center',
              gap: 1
            }}>
              <Inventory sx={{ fontSize: 20, color: '#7c3aed' }} />
              New Transfer Entry
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748b', mt: 0.5 }}>
              Select item and specify new storage location
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
                <Inventory sx={{ fontSize: 18, color: '#7c3aed' }} />
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
                            label={`Stock: ${option.currentStock || 0}`} 
                            size="small"
                            color="info"
                            variant="outlined"
                            sx={{ height: 20, fontSize: '0.75rem' }}
                          />
                          <Chip 
                            label={`Loc: ${option.rackNumber || '?'}-${option.rackLevel || '?'}`} 
                            size="small"
                            color="default"
                            variant="outlined"
                            sx={{ height: 20, fontSize: '0.75rem' }}
                          />
                        </Box>
                      </Box>
                    </Box>
                  )}
                />
              </Box>
              
              {/* Selected Part Info */}
              {selectedPart && (
                <Card sx={{ 
                  mt: 2, 
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0',
                  backgroundColor: '#f5f3ff'
                }}>
                  <CardContent sx={{ p: 2 }}>
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={6}>
                        <Box>
                          <Typography variant="body2" sx={{ color: '#7c3aed', fontWeight: 500 }}>
                            Selected Item
                          </Typography>
                          <Typography variant="body1" sx={{ fontWeight: 600 }}>
                            {selectedPart.name}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#5b21b6' }}>
                            SAP: {selectedPart.sapNumber || 'N/A'}
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="body2" sx={{ color: '#64748b' }}>
                              Current Stock:
                            </Typography>
                            <Chip 
                              label={selectedPart.currentStock || 0}
                              color="info"
                              size="small"
                            />
                          </Box>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="body2" sx={{ color: '#64748b' }}>
                              Current Location:
                            </Typography>
                            <Chip 
                              label={getCurrentLocation()}
                              color="default"
                              size="small"
                              icon={<LocationOn sx={{ fontSize: 14 }} />}
                            />
                          </Box>
                        </Box>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              )}
            </Box>

            <Divider sx={{ my: 4 }} />

            {/* TRANSFER INFORMATION SECTION */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="subtitle1" sx={{ 
                fontWeight: 600, 
                color: '#334155',
                mb: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}>
                <LocationOn sx={{ fontSize: 18, color: '#7c3aed' }} />
                Transfer Information
              </Typography>
              
              <Typography variant="body2" sx={{ color: '#94a3b8', mb: 3 }}>
                Specify the new storage location
              </Typography>
              
              {/* Rack Number - Full Width */}
              <Box sx={{ mb: 3 }}>
                <TextField
                  label="New Rack Number"
                  fullWidth
                  value={newRackNumber}
                  onChange={(e) => setNewRackNumber(e.target.value.toUpperCase())}
                  placeholder="e.g., A01, B12, C25"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Warehouse sx={{ color: '#64748b' }} />
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
              
              {/* Rack Level - Full Width */}
              <Box sx={{ mb: 3 }}>
                <TextField
                  label="New Rack Level"
                  fullWidth
                  value={newRackLevel}
                  onChange={(e) => setNewRackLevel(e.target.value.toUpperCase())}
                  placeholder="e.g., 01, 02, A, B"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Storage sx={{ color: '#64748b' }} />
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
              
              {/* Transfer Summary Display */}
              {selectedPart && newRackNumber && newRackLevel && (
                <Card sx={{ 
                  mt: 2,
                  borderRadius: '10px',
                  backgroundColor: '#f5f3ff',
                  border: '1px solid #ddd6fe'
                }}>
                  <CardContent sx={{ p: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="body1" sx={{ color: '#7c3aed', fontWeight: 500 }}>
                        Transfer Summary
                      </Typography>
                      <TrendingFlat sx={{ color: '#7c3aed' }} />
                    </Box>
                    
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <Box sx={{ 
                          p: 2, 
                          borderRadius: '8px',
                          backgroundColor: '#ede9fe',
                          border: '1px solid #ddd6fe'
                        }}>
                          <Typography variant="body2" sx={{ color: '#6d28d9', fontWeight: 500, mb: 1 }}>
                            From
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <LocationOn sx={{ color: '#6d28d9', fontSize: 16 }} />
                            <Typography variant="body1" sx={{ fontWeight: 600, color: '#1e293b' }}>
                              {getCurrentLocation()}
                            </Typography>
                          </Box>
                        </Box>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Box sx={{ 
                          p: 2, 
                          borderRadius: '8px',
                          backgroundColor: '#e0e7ff',
                          border: '1px solid #c7d2fe'
                        }}>
                          <Typography variant="body2" sx={{ color: '#4338ca', fontWeight: 500, mb: 1 }}>
                            To
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <LocationOn sx={{ color: '#4338ca', fontSize: 16 }} />
                            <Typography variant="body1" sx={{ fontWeight: 600, color: '#1e293b' }}>
                              {getNewLocation()}
                            </Typography>
                          </Box>
                        </Box>
                      </Grid>
                    </Grid>
                    
                    {selectedPart.rackNumber === newRackNumber && selectedPart.rackLevel === newRackLevel && (
                      <Alert 
                        severity="warning" 
                        sx={{ 
                          mt: 2,
                          borderRadius: '8px',
                          backgroundColor: '#fef3c7',
                          border: '1px solid #fde68a'
                        }}
                      >
                        New location is same as current location. Please specify a different location.
                      </Alert>
                    )}
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
                <Description sx={{ fontSize: 18, color: '#7c3aed' }} />
                Additional Notes
              </Typography>
              
              <TextField
                label="Remarks (Optional)"
                fullWidth
                multiline
                rows={4}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Add any special notes or reasons for this transfer..."
                helperText="If left blank, a default transfer note will be generated"
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
                disabled={isSubmitting || !selectedPart || !newRackNumber || !newRackLevel || 
                  (selectedPart.rackNumber === newRackNumber && selectedPart.rackLevel === newRackLevel)}
                startIcon={<CheckCircle />}
                sx={{ 
                  minWidth: 300,
                  background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
                  px: 6,
                  py: 1.8,
                  fontWeight: 600,
                  fontSize: '1rem',
                  borderRadius: '10px',
                  textTransform: 'none',
                  boxShadow: '0 4px 14px rgba(124, 58, 237, 0.4)',
                  '&:hover': {
                    boxShadow: '0 6px 20px rgba(124, 58, 237, 0.6)',
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
                {isSubmitting ? 'Processing...' : 'Confirm Transfer'}
              </Button>
            </Box>
          </Box>
        </Paper>

        {/* Recent Transfers Section - Stacked Below */}
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
            backgroundColor: '#f5f3ff',
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
                <CompareArrows sx={{ fontSize: 20, color: '#7c3aed' }} />
                Recent Transfer Transactions
              </Typography>
              <Typography variant="body2" sx={{ color: '#64748b', mt: 0.5 }}>
                Last 5 internal transfer entries
              </Typography>
            </Box>
            <Tooltip title="Refresh transfers">
              <IconButton 
                onClick={fetchRecentTransfers} 
                sx={{ 
                  color: '#7c3aed',
                  backgroundColor: 'white',
                  border: '1px solid #e2e8f0',
                  '&:hover': {
                    backgroundColor: '#f5f3ff'
                  }
                }}
              >
                <Refresh />
              </IconButton>
            </Tooltip>
          </Box>

          <Box sx={{ p: 3 }}>
            {recentTransfers.length === 0 ? (
              <Box sx={{ 
                textAlign: 'center', 
                py: 6,
                color: '#94a3b8'
              }}>
                <SwapHoriz sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} />
                <Typography variant="body1" sx={{ mb: 1 }}>
                  No recent transfers
                </Typography>
                <Typography variant="body2">
                  Transfer transactions will appear here once you start moving items
                </Typography>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {recentTransfers.map((transfer) => (
                  <Card 
                    key={transfer.id}
                    variant="outlined"
                    sx={{ 
                      borderRadius: '10px',
                      borderColor: '#e2e8f0',
                      backgroundColor: '#f8fafc',
                      '&:hover': {
                        borderColor: '#7c3aed',
                        backgroundColor: '#f5f3ff'
                      },
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <CardContent sx={{ p: 3 }}>
                      <Box sx={{ mb: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                          <Typography variant="h6" sx={{ fontWeight: 600, color: '#1e293b' }}>
                            {transfer.partName}
                          </Typography>
                          <Chip 
                            label="TRANSFER"
                            size="small"
                            color="secondary"
                            icon={<SwapHoriz sx={{ fontSize: 16 }} />}
                            sx={{ fontWeight: 600 }}
                          />
                        </Box>
                        <Typography variant="body2" sx={{ color: '#64748b' }}>
                          SAP: {transfer.sapNumber || 'N/A'}
                        </Typography>
                      </Box>
                      
                      <Grid container spacing={2} sx={{ mb: 2 }}>
                        <Grid item xs={12} sm={6}>
                          <Box sx={{ 
                            p: 1.5, 
                            borderRadius: '8px',
                            backgroundColor: '#f1f5f9',
                            border: '1px solid #e2e8f0'
                          }}>
                            <Typography variant="body2" sx={{ color: '#64748b', mb: 0.5 }}>
                              From Location
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <LocationOn sx={{ color: '#64748b', fontSize: 16 }} />
                              <Typography variant="body1" sx={{ fontWeight: 500, color: '#334155' }}>
                                {transfer.fromLocation || 'Not specified'}
                              </Typography>
                            </Box>
                          </Box>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Box sx={{ 
                            p: 1.5, 
                            borderRadius: '8px',
                            backgroundColor: '#f1f5f9',
                            border: '1px solid #e2e8f0'
                          }}>
                            <Typography variant="body2" sx={{ color: '#64748b', mb: 0.5 }}>
                              To Location
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <LocationOn sx={{ color: '#7c3aed', fontSize: 16 }} />
                              <Typography variant="body1" sx={{ fontWeight: 500, color: '#334155' }}>
                                {transfer.toLocation || 'Not specified'}
                              </Typography>
                            </Box>
                          </Box>
                        </Grid>
                      </Grid>
                      
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="body2" sx={{ color: '#64748b', mb: 0.5 }}>
                            Transferred By
                          </Typography>
                          <Typography variant="body1" sx={{ fontWeight: 500, color: '#334155' }}>
                            {transfer.userName || 'N/A'}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="body2" sx={{ color: '#64748b', mb: 0.5 }}>
                            Date Transferred
                          </Typography>
                          <Typography variant="body1" sx={{ fontWeight: 500, color: '#334155' }}>
                            {formatDate(transfer.date)}
                          </Typography>
                        </Grid>
                      </Grid>
                      
                      {transfer.remarks && (
                        <Box sx={{ mt: 3, pt: 2, borderTop: '1px dashed #e2e8f0' }}>
                          <Typography variant="body2" sx={{ color: '#64748b', mb: 0.5 }}>
                            Notes:
                          </Typography>
                          <Typography variant="body2" sx={{ color: '#475569', fontStyle: 'italic' }}>
                            "{transfer.remarks}"
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

export default InternalTransfer;