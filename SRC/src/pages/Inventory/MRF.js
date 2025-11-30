import React, { useEffect, useState, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { db } from '../../firebase/config';
import { collection, getDocs, addDoc, deleteDoc, updateDoc, doc } from 'firebase/firestore';
import {
  Box,
  Paper,
  TextField,
  Button,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Checkbox,
  FormControl,
  FormControlLabel,
  RadioGroup,
  Radio,
  Select,
  MenuItem,
  InputLabel,
  IconButton,
  Tooltip,
  Typography,
  Snackbar,
  Alert,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';

const MRF = () => {
  const parts = useSelector(state => state.parts.parts || []);
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // MRF Form states
  const [mrfHeader, setMrfHeader] = useState({
    mrfNumber: '',
    date: new Date().toISOString().split('T')[0],
    requestedBy: '',
    department: '',
    project: '',
    priority: 'Medium',
    requiredDate: '',
  });

  const [mrfItems, setMrfItems] = useState([]);
  const [justification, setJustification] = useState('');

  // Dialog states
  const [addItemDialogOpen, setAddItemDialogOpen] = useState(false);
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [newItem, setNewItem] = useState({
    sapNumber: '',
    partName: '',
    quantity: '',
    unit: '',
    stockAvailable: 0,
    urgent: false,
  });

  const [mrfList, setMrfList] = useState([]);
  const [pageStart, setPageStart] = useState(0);
  const pageSize = 20;

  // Fetch MRF data from Firestore
  useEffect(() => {
    const fetchMRFData = async () => {
      setLoading(true);
      try {
        const mrfSnapshot = await getDocs(collection(db, 'mrf'));
        const mrfData = mrfSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
        setMrfList(mrfData);

        // Generate MRF number if new
        if (mrfData.length === 0) {
          setMrfHeader(prev => ({ ...prev, mrfNumber: 'MRF-2024-001' }));
        } else {
          const lastMRF = mrfData[mrfData.length - 1];
          const newNumber = `MRF-${new Date().getFullYear()}-${String(mrfData.length + 1).padStart(3, '0')}`;
          setMrfHeader(prev => ({ ...prev, mrfNumber: newNumber }));
        }
      } catch (error) {
        console.error('Error fetching MRF data:', error);
        setSnackbar({ open: true, message: 'Error fetching data', severity: 'error' });
      } finally {
        setLoading(false);
      }
    };
    fetchMRFData();
  }, []);

  // Handle add item to MRF
  const handleAddItem = () => {
    if (!newItem.sapNumber || !newItem.quantity) {
      setSnackbar({ open: true, message: 'Please fill SAP# and Quantity', severity: 'error' });
      return;
    }

    const selectedPart = parts.find(p => p.sapNumber === newItem.sapNumber);
    if (!selectedPart) {
      setSnackbar({ open: true, message: 'Part not found', severity: 'error' });
      return;
    }

    const item = {
      id: Date.now(),
      sapNumber: newItem.sapNumber,
      partName: selectedPart.name,
      quantity: newItem.quantity,
      unit: selectedPart.unit || 'PCS',
      stockAvailable: selectedPart.currentStock || 0,
      urgent: newItem.urgent,
    };

    setMrfItems([...mrfItems, item]);
    setNewItem({ sapNumber: '', partName: '', quantity: '', unit: '', stockAvailable: 0, urgent: false });
    setAddItemDialogOpen(false);
    setSnackbar({ open: true, message: 'Item added', severity: 'success' });
  };

  // Handle remove item
  const handleRemoveItem = (itemId) => {
    setMrfItems(mrfItems.filter(item => item.id !== itemId));
  };

  // Handle SAP# search
  const handleSapSearch = (sapNumber) => {
    const selectedPart = parts.find(p => p.sapNumber === sapNumber);
    if (selectedPart) {
      setNewItem(prev => ({
        ...prev,
        sapNumber,
        partName: selectedPart.name,
        unit: selectedPart.unit || 'PCS',
        stockAvailable: selectedPart.currentStock || 0,
      }));
    }
  };

  // Handle save MRF
  const handleSaveMRF = async (status = 'Draft') => {
    if (!mrfHeader.requestedBy) {
      setSnackbar({ open: true, message: 'Please fill Requested By', severity: 'error' });
      return;
    }

    if (mrfItems.length === 0) {
      setSnackbar({ open: true, message: 'Please add at least one item', severity: 'error' });
      return;
    }

    try {
      const mrfData = {
        ...mrfHeader,
        items: mrfItems,
        justification,
        status,
        createdAt: new Date().toISOString(),
      };

      await addDoc(collection(db, 'mrf'), mrfData);
      setSnackbar({ open: true, message: `MRF ${status} saved successfully`, severity: 'success' });

      // Reset form
      setMrfHeader({
        mrfNumber: '',
        date: new Date().toISOString().split('T')[0],
        requestedBy: '',
        department: '',
        project: '',
        priority: 'Medium',
        requiredDate: '',
      });
      setMrfItems([]);
      setJustification('');
    } catch (error) {
      console.error('Error saving MRF:', error);
      setSnackbar({ open: true, message: 'Error saving MRF', severity: 'error' });
    }
  };

  // Pagination for MRF list
  const pageEnd = Math.min(pageStart + pageSize, mrfList.length);
  const mrfPaginated = mrfList.slice(pageStart, pageEnd);

  if (loading) {
    return <Box sx={{ p: 3 }}><Typography>Loading...</Typography></Box>;
  }

  return (
    <Box sx={{ m: 0, p: 0 }}>
      {/* Title */}
      <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <h2 style={{ margin: 0 }}>MRF - MATERIAL REQUISITION FORM</h2>
        </Box>
      </Paper>

      {/* MRF Header Section */}
      <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
          MRF HEADER
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 2 }}>
          <TextField
            label="MRF #"
            value={mrfHeader.mrfNumber}
            disabled
            fullWidth
            size="small"
          />
          <TextField
            label="Date"
            type="date"
            value={mrfHeader.date}
            disabled
            fullWidth
            size="small"
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="Requested By"
            value={mrfHeader.requestedBy}
            onChange={(e) => setMrfHeader({ ...mrfHeader, requestedBy: e.target.value })}
            fullWidth
            size="small"
            required
          />
          <TextField
            label="Department"
            value={mrfHeader.department}
            onChange={(e) => setMrfHeader({ ...mrfHeader, department: e.target.value })}
            fullWidth
            size="small"
          />
          <TextField
            label="Project"
            value={mrfHeader.project}
            onChange={(e) => setMrfHeader({ ...mrfHeader, project: e.target.value })}
            fullWidth
            size="small"
          />
          <TextField
            label="Required Date"
            type="date"
            value={mrfHeader.requiredDate}
            onChange={(e) => setMrfHeader({ ...mrfHeader, requiredDate: e.target.value })}
            fullWidth
            size="small"
            InputLabelProps={{ shrink: true }}
          />
        </Box>

        {/* Priority Selection */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>Priority</Typography>
          <FormControl component="fieldset">
            <RadioGroup
              row
              value={mrfHeader.priority}
              onChange={(e) => setMrfHeader({ ...mrfHeader, priority: e.target.value })}
            >
              <FormControlLabel value="High" control={<Radio />} label="High" />
              <FormControlLabel value="Medium" control={<Radio />} label="Medium" />
              <FormControlLabel value="Low" control={<Radio />} label="Low" />
            </RadioGroup>
          </FormControl>
        </Box>
      </Paper>

      {/* Requested Items Section */}
      <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
            REQUESTED ITEMS ({mrfItems.length} ITEMS)
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setAddItemDialogOpen(true)}
            size="small"
          >
            ADD ITEM
          </Button>
        </Box>

        {/* Items Table */}
        <Box sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold', width: '10%' }}>SAP#</TableCell>
                <TableCell sx={{ fontWeight: 'bold', width: '25%' }}>Part Name</TableCell>
                <TableCell sx={{ fontWeight: 'bold', width: '12%' }}>Quantity</TableCell>
                <TableCell sx={{ fontWeight: 'bold', width: '10%' }}>Unit</TableCell>
                <TableCell sx={{ fontWeight: 'bold', width: '15%' }}>Stock Available</TableCell>
                <TableCell sx={{ fontWeight: 'bold', width: '10%' }}>Urgent</TableCell>
                <TableCell sx={{ fontWeight: 'bold', width: '10%' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {mrfItems.length > 0 ? (
                mrfItems.map((item) => (
                  <TableRow key={item.id} hover>
                    <TableCell>{item.sapNumber}</TableCell>
                    <TableCell>{item.partName}</TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>{item.unit}</TableCell>
                    <TableCell>{item.stockAvailable}</TableCell>
                    <TableCell>
                      <Checkbox checked={item.urgent} disabled size="small" />
                    </TableCell>
                    <TableCell>
                      <Tooltip title="Delete">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleRemoveItem(item.id)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 3, color: '#999' }}>
                    No items added. Click ADD ITEM to add requested parts.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Box>
      </Paper>

      {/* Justification Section */}
      <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
          JUSTIFICATION
        </Typography>
        <TextField
          label="Reason / Comments"
          multiline
          rows={4}
          value={justification}
          onChange={(e) => setJustification(e.target.value)}
          fullWidth
          placeholder="Enter reason for this requisition..."
        />
      </Paper>

      {/* Approval Workflow Section */}
      <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
          APPROVAL WORKFLOW
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography>Requester:</Typography>
            <Checkbox disabled />
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography>Supervisor:</Typography>
            <Checkbox disabled />
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography>Store Manager:</Typography>
            <Checkbox disabled />
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography>HOD:</Typography>
            <Checkbox disabled />
          </Box>
        </Box>
      </Paper>

      {/* Actions Section */}
      <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
          ACTIONS
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" onClick={() => handleSaveMRF('Draft')}>
            SAVE DRAFT
          </Button>
          <Button variant="contained" onClick={() => handleSaveMRF('Submitted')}>
            SUBMIT
          </Button>
          <Button variant="outlined">PRINT</Button>
          <Button variant="outlined" color="error">
            CANCEL
          </Button>
        </Box>
      </Paper>

      {/* MRF History & Status Section */}
      <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
          MRF HISTORY & STATUS ({mrfList.length} MRFs)
        </Typography>

        {/* History Table */}
        <Box sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold', width: '12%' }}>MRF#</TableCell>
                <TableCell sx={{ fontWeight: 'bold', width: '12%' }}>Date</TableCell>
                <TableCell sx={{ fontWeight: 'bold', width: '20%' }}>Requested By</TableCell>
                <TableCell sx={{ fontWeight: 'bold', width: '12%' }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 'bold', width: '20%' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {mrfPaginated.length > 0 ? (
                mrfPaginated.map((mrf) => (
                  <TableRow key={mrf.id} hover>
                    <TableCell>{mrf.mrfNumber}</TableCell>
                    <TableCell>{mrf.date}</TableCell>
                    <TableCell>{mrf.requestedBy}</TableCell>
                    <TableCell>
                      <Typography
                        variant="body2"
                        sx={{
                          backgroundColor:
                            mrf.status === 'Draft'
                              ? '#e3f2fd'
                              : mrf.status === 'Approved'
                              ? '#c8e6c9'
                              : mrf.status === 'Rejected'
                              ? '#ffcdd2'
                              : '#fff9c4',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          display: 'inline-block',
                        }}
                      >
                        {mrf.status}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Tooltip title="View">
                        <IconButton size="small">
                          <SearchIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      {mrf.status === 'Draft' && (
                        <Tooltip title="Edit">
                          <IconButton size="small">
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      {mrf.status === 'Pending' && (
                        <Tooltip title="Track">
                          <IconButton size="small">
                            <SearchIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      {mrf.status === 'Approved' && (
                        <Tooltip title="Print">
                          <IconButton size="small">
                            <SearchIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 3, color: '#999' }}>
                    No MRF records found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Box>

        {/* Pagination */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
          <Box>
            <Button
              variant="outlined"
              size="small"
              onClick={() => setPageStart(Math.max(0, pageStart - pageSize))}
              disabled={pageStart === 0}
              sx={{ mr: 1 }}
            >
              &lt;&lt; Previous
            </Button>
            <Button
              variant="outlined"
              size="small"
              onClick={() => setPageStart(pageStart + pageSize)}
              disabled={pageEnd >= mrfList.length}
            >
              Next &gt;&gt;
            </Button>
          </Box>
          <Typography variant="body2" sx={{ color: '#666' }}>
            Showing {mrfList.length > 0 ? pageStart + 1 : 0}-{pageEnd} of {mrfList.length} MRFs
          </Typography>
        </Box>
      </Paper>

      {/* Add Item Dialog */}
      <Dialog open={addItemDialogOpen} onClose={() => setAddItemDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Request Item</DialogTitle>
        <DialogContent sx={{ py: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Select Part (SAP# - Part Name)</InputLabel>
              <Select
                value={newItem.sapNumber}
                onChange={(e) => {
                  const selectedPart = parts.find(p => p.sapNumber === e.target.value);
                  if (selectedPart) {
                    setNewItem({
                      ...newItem,
                      sapNumber: selectedPart.sapNumber,
                      partName: selectedPart.name,
                      unit: selectedPart.unit || 'PCS',
                      stockAvailable: selectedPart.currentStock || 0,
                    });
                  }
                }}
                label="Select Part (SAP# - Part Name)"
              >
                <MenuItem value="">-- Select a Part --</MenuItem>
                {parts.map((part) => (
                  <MenuItem key={part.id} value={part.sapNumber}>
                    {part.sapNumber} - {part.name} (Stock: {part.currentStock || 0})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Part Name"
              value={newItem.partName}
              disabled
              fullWidth
              size="small"
            />

            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <TextField
                label="Current Stock"
                value={newItem.stockAvailable}
                disabled
                fullWidth
                size="small"
                type="number"
              />
              <TextField
                label="Unit"
                value={newItem.unit}
                disabled
                fullWidth
                size="small"
              />
            </Box>

            <TextField
              label="Quantity Required"
              type="number"
              value={newItem.quantity}
              onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })}
              fullWidth
              size="small"
              required
              inputProps={{ min: 1 }}
            />

            <FormControlLabel
              control={
                <Checkbox
                  checked={newItem.urgent}
                  onChange={(e) => setNewItem({ ...newItem, urgent: e.target.checked })}
                />
              }
              label="Mark as Urgent"
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setAddItemDialogOpen(false)} variant="outlined">
            CANCEL
          </Button>
          <Button onClick={handleAddItem} variant="contained">
            ADD ITEM
          </Button>
        </DialogActions>
      </Dialog>

      {/* Approval Dialog */}
      <Dialog open={approvalDialogOpen} onClose={() => setApprovalDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Approve MRF</DialogTitle>
        <DialogContent sx={{ py: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Requested By"
              disabled
              fullWidth
              size="small"
            />
            <TextField
              label="Department"
              disabled
              fullWidth
              size="small"
            />
            <TextField
              label="Total Items"
              disabled
              fullWidth
              size="small"
            />
            <TextField
              label="Comments"
              multiline
              rows={3}
              fullWidth
              size="small"
              placeholder="Add your comments here..."
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setApprovalDialogOpen(false)} variant="outlined" color="error">
            REJECT
          </Button>
          <Button onClick={() => setApprovalDialogOpen(false)} variant="contained">
            APPROVE
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar Notification */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default MRF;
