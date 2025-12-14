import React, { useEffect, useMemo, useState } from 'react';
import { db } from '../../firebase/config';
import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  updateDoc,
  doc,
  query,
  where,
} from 'firebase/firestore';

import {
  Button,
  Snackbar,
  TextField,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Paper,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  MenuItem,
  Alert,
  Typography,
} from '@mui/material';

import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

const MALAYSIA_STATES = [
  'Johor',
  'Kedah',
  'Kelantan',
  'Melaka',
  'Negeri Sembilan',
  'Pahang',
  'Perak',
  'Perlis',
  'Pulau Pinang',
  'Sabah',
  'Sarawak',
  'Selangor',
  'Terengganu',
  'Wilayah Persekutuan Kuala Lumpur',
  'Wilayah Persekutuan Putrajaya',
  'Wilayah Persekutuan Labuan',
];

const normalize = (v) => (v || '').trim().toLowerCase();

const buildAddress = ({ houseNo, building, street, postalCode, state, country }) =>
  [houseNo, building, street, postalCode, state, country].filter(Boolean).join(', ');

const SupplierMaster = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success',
  });

  // NEW: search state
  const [search, setSearch] = useState('');

  // Form states
  const [form, setForm] = useState({
    name: '',
    contactPerson: '',
    email: '',
    phone: '',
    houseNo: '',
    building: '',
    street: '',
    postalCode: '',
    state: '',
    country: 'Malaysia',
  });

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: '',
  });
  const [editingId, setEditingId] = useState(null);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'suppliers'));
      const data = querySnapshot.docs.map((d) => ({ ...d.data(), id: d.id }));
      setSuppliers(data);
    } catch (error) {
      setSnackbar({ open: true, message: 'Fetch error', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  // NEW: filtered suppliers
  const filteredSuppliers = useMemo(() => {
    const q = normalize(search);
    if (!q) return suppliers;

    return suppliers.filter((s) => {
      const haystack = [
        s.name,
        s.contactPerson,
        s.email,
        s.phone,
        s.address,
      ]
        .map((x) => (x || '').toString().toLowerCase())
        .join(' | ');

      return haystack.includes(q);
    });
  }, [suppliers, search]);

  // NEW: disable add button until valid
  const isSupplierFormValid = useMemo(() => {
    const nameOk = normalize(form.name).length > 0;
    // Optional: you can tighten address validation if you want
    return nameOk;
  }, [form.name]);

  const handleAdd = async () => {
    const trimmedName = (form.name || '').trim();

    if (!trimmedName) {
      return setSnackbar({
        open: true,
        message: 'Name is required',
        severity: 'error',
      });
    }

    try {
      // Stronger duplicate check: Firestore query
      const suppliersRef = collection(db, 'suppliers');
      const q = query(suppliersRef, where('name', '==', trimmedName));
      const snap = await getDocs(q);

      if (!snap.empty) {
        return setSnackbar({
          open: true,
          message: 'Supplier name already exists',
          severity: 'error',
        });
      }

      const fullAddress = buildAddress({
        houseNo: form.houseNo,
        building: form.building,
        street: form.street,
        postalCode: form.postalCode,
        state: form.state,
        country: form.country || 'Malaysia',
      });

      const supplierToSave = {
        name: trimmedName,
        contactPerson: form.contactPerson || '',
        email: form.email || '',
        phone: form.phone || '',
        address: fullAddress,
      };

      await addDoc(collection(db, 'suppliers'), supplierToSave);

      setSnackbar({
        open: true,
        message: 'Supplier added successfully',
        severity: 'success',
      });

      setForm({
        name: '',
        contactPerson: '',
        email: '',
        phone: '',
        houseNo: '',
        building: '',
        street: '',
        postalCode: '',
        state: '',
        country: 'Malaysia',
      });

      fetchSuppliers();
    } catch (e) {
      console.error(e);
      setSnackbar({ open: true, message: 'Add failed', severity: 'error' });
    }
  };

  const handleEditClick = (s) => {
    setEditingId(s.id);
    setEditForm({ ...s });
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    const trimmedName = (editForm.name || '').trim();

    if (!trimmedName) {
      return setSnackbar({
        open: true,
        message: 'Name is required',
        severity: 'error',
      });
    }

    try {
      const suppliersRef = collection(db, 'suppliers');
      const q = query(suppliersRef, where('name', '==', trimmedName));
      const snap = await getDocs(q);

      const hasOtherDuplicate = snap.docs.some((d) => d.id !== editingId);
      if (hasOtherDuplicate) {
        return setSnackbar({
          open: true,
          message: 'Another supplier with this name already exists',
          severity: 'error',
        });
      }

      const { id, ...data } = editForm;
      const updated = { ...data, name: trimmedName };

      await updateDoc(doc(db, 'suppliers', editingId), updated);

      setSnackbar({
        open: true,
        message: 'Supplier updated',
        severity: 'success',
      });
      setEditDialogOpen(false);
      fetchSuppliers();
    } catch (e) {
      console.error('Update supplier error:', e);
      setSnackbar({ open: true, message: 'Update failed', severity: 'error' });
    }
  };

  const handleDeleteClick = (s) => {
    setDeleteTarget(s);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteDoc(doc(db, 'suppliers', deleteTarget.id));
      setSnackbar({ open: true, message: 'Deleted', severity: 'success' });
      setDeleteDialogOpen(false);
      fetchSuppliers();
    } catch (e) {
      setSnackbar({ open: true, message: 'Delete failed', severity: 'error' });
    }
  };

  return (
    <Box>
      <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
        <h2 style={{ margin: 0 }}>SUPPLIER MASTER</h2>
      </Paper>

      {/* NEW: Search Bar */}
      <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
        <TextField
          label="Search suppliers (name / email / phone / address)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          size="small"
          fullWidth
        />
      </Paper>

      <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ marginTop: 0 }}>SUPPLIER LIST</h3>
          {!!search && (
            <Button size="small" onClick={() => setSearch('')}>
              Clear Search
            </Button>
          )}
        </Box>

        {loading ? (
          <div>Loading...</div>
        ) : filteredSuppliers.length === 0 ? (
          // NEW: Better empty state
          <Alert severity="info">
            <Typography variant="body2">
              No suppliers found{search ? ' for your search.' : '.'}
            </Typography>
          </Alert>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Contact Person</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Phone</TableCell>
                <TableCell>Address</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredSuppliers.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>{s.name}</TableCell>
                  <TableCell>{s.contactPerson}</TableCell>
                  <TableCell>{s.email}</TableCell>
                  <TableCell>{s.phone}</TableCell>
                  <TableCell>{s.address}</TableCell>
                  <TableCell>
                    <IconButton size="small" onClick={() => handleEditClick(s)}>
                      <EditIcon />
                    </IconButton>
                    <IconButton size="small" color="error" onClick={() => handleDeleteClick(s)}>
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Paper>

      <Paper elevation={1} sx={{ p: 2 }}>
        <h3 style={{ marginTop: 0 }}>NEW SUPPLIER ENTRY</h3>

        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 2 }}>
          <TextField
            label="Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
            size="small"
          />

          <TextField
            label="Contact Person"
            value={form.contactPerson}
            onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
            size="small"
          />

          <TextField
            label="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            size="small"
          />

          <TextField
            label="Phone"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            size="small"
          />

          <TextField
            label="House No."
            value={form.houseNo}
            onChange={(e) => setForm({ ...form, houseNo: e.target.value })}
            size="small"
          />

          <TextField
            label="Building"
            value={form.building}
            onChange={(e) => setForm({ ...form, building: e.target.value })}
            size="small"
          />

          <TextField
            label="Street"
            value={form.street}
            onChange={(e) => setForm({ ...form, street: e.target.value })}
            size="small"
          />

          <TextField
            label="Postal Code"
            value={form.postalCode}
            onChange={(e) => setForm({ ...form, postalCode: e.target.value })}
            size="small"
          />

          <TextField
            label="State"
            select
            value={form.state}
            onChange={(e) => setForm({ ...form, state: e.target.value })}
            size="small"
          >
            {MALAYSIA_STATES.map((st) => (
              <MenuItem key={st} value={st}>
                {st}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            label="Country"
            value={form.country}
            onChange={(e) => setForm({ ...form, country: e.target.value })}
            placeholder="Malaysia"
            size="small"
          />
        </Box>

        <Box sx={{ mt: 2 }}>
          {/* NEW: disabled until valid */}
          <Button variant="contained" onClick={handleAdd} disabled={!isSupplierFormValid}>
            ADD SUPPLIER
          </Button>
          {!isSupplierFormValid && (
            <Typography variant="caption" sx={{ ml: 2 }}>
              *Supplier name is required
            </Typography>
          )}
        </Box>
      </Paper>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>EDIT SUPPLIER</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Name"
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              fullWidth
            />
            <TextField
              label="Contact Person"
              value={editForm.contactPerson}
              onChange={(e) => setEditForm({ ...editForm, contactPerson: e.target.value })}
              fullWidth
            />
            <TextField
              label="Email"
              value={editForm.email}
              onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
              fullWidth
            />
            <TextField
              label="Phone"
              value={editForm.phone}
              onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
              fullWidth
            />
            <TextField
              label="Address"
              value={editForm.address}
              onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>CANCEL</Button>
          <Button onClick={handleSaveEdit} variant="contained">
            SAVE
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          Are you sure you want to delete {deleteTarget?.name}?
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>CANCEL</Button>
          <Button onClick={handleConfirmDelete} color="error" variant="contained">
            DELETE
          </Button>
        </DialogActions>
      </Dialog>

      {/* FIXED: Snackbar severity via Alert */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default SupplierMaster;
