// SRC/src/pages/Admin/SupplierMaster.js

import React, { useEffect, useState } from 'react';
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

// Build single string from structured address fields
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

  const [search, setSearch] = useState('');

  // New supplier form
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

  // Edit state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: '',
  });
  const [editingId, setEditingId] = useState(null);

  // Delete state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Fetch suppliers from Firestore
  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'suppliers'));
      const data = querySnapshot.docs.map((d) => ({ ...d.data(), id: d.id }));
      setSuppliers(data);
    } catch (error) {
      console.error(error);
      setSnackbar({ open: true, message: 'Fetch error', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  // ADD SUPPLIER (with duplicate name check + structured address)
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
      const suppliersRef = collection(db, 'suppliers');

      // Duplicate name check (case-sensitive in Firestore, but we standardise by trimming)
      const qName = query(suppliersRef, where('name', '==', trimmedName));
      const snap = await getDocs(qName);

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
        country: form.country,
      });

      const supplierToSave = {
        name: trimmedName,
        contactPerson: form.contactPerson || '',
        email: form.email || '',
        phone: form.phone || '',
        address: fullAddress,
      };

      await addDoc(suppliersRef, supplierToSave);

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
      console.error('Add supplier error:', e);
      setSnackbar({
        open: true,
        message: 'Add failed',
        severity: 'error',
      });
    }
  };

  // OPEN EDIT DIALOG
  const handleEditClick = (s) => {
    setEditingId(s.id);
    setEditForm({
      name: s.name || '',
      contactPerson: s.contactPerson || '',
      email: s.email || '',
      phone: s.phone || '',
      address: s.address || '',
    });
    setEditDialogOpen(true);
  };

  // SAVE EDIT (with duplicate name check)
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

      // Look for other suppliers with same name
      const qName = query(suppliersRef, where('name', '==', trimmedName));
      const snap = await getDocs(qName);
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
      setSnackbar({
        open: true,
        message: 'Update failed',
        severity: 'error',
      });
    }
  };

  // DELETE SUPPLIER
  const handleDeleteClick = (s) => {
    setDeleteTarget(s);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteDoc(doc(db, 'suppliers', deleteTarget.id));
      setSnackbar({
        open: true,
        message: 'Deleted',
        severity: 'success',
      });
      setDeleteDialogOpen(false);
      fetchSuppliers();
    } catch (e) {
      console.error('Delete error:', e);
      setSnackbar({
        open: true,
        message: 'Delete failed',
        severity: 'error',
      });
    }
  };

  // SEARCH FILTER
  const searchTerm = search.trim().toLowerCase();
  const filteredSuppliers = suppliers.filter((s) => {
    if (!searchTerm) return true;
    const fields = [
      s.name,
      s.contactPerson,
      s.email,
      s.phone,
      s.address,
    ];
    return fields.some(
      (f) => f && f.toString().toLowerCase().includes(searchTerm)
    );
  });

  return (
    <Box>
      {/* HEADER */}
      <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
        <h2 style={{ margin: 0 }}>SUPPLIER MASTER</h2>
      </Paper>

      {/* LIST + SEARCH */}
      <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 2,
            gap: 2,
            flexWrap: 'wrap',
          }}
        >
          <h3 style={{ margin: 0 }}>SUPPLIER LIST</h3>
          <TextField
            size="small"
            label="Search supplier"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, phone..."
          />
        </Box>

        {loading ? (
          <div>Loading...</div>
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
                    <IconButton
                      size="small"
                      onClick={() => handleEditClick(s)}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleDeleteClick(s)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {filteredSuppliers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6}>No suppliers found</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </Paper>

      {/* NEW SUPPLIER ENTRY */}
      <Paper elevation={1} sx={{ p: 2 }}>
        <h3 style={{ marginTop: 0 }}>NEW SUPPLIER ENTRY</h3>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))',
            gap: 2,
          }}
        >
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
            onChange={(e) =>
              setForm({ ...form, contactPerson: e.target.value })
            }
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
            onChange={(e) =>
              setForm({ ...form, postalCode: e.target.value })
            }
            size="small"
          />
          <TextField
            label="State"
            select
            value={form.state}
            onChange={(e) => setForm({ ...form, state: e.target.value })}
            size="small"
          >
            {MALAYSIA_STATES.map((state) => (
              <MenuItem key={state} value={state}>
                {state}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Country"
            value={form.country}
            onChange={(e) => setForm({ ...form, country: e.target.value })}
            size="small"
          />
        </Box>
        <Box sx={{ mt: 2 }}>
          <Button variant="contained" onClick={handleAdd}>
            ADD SUPPLIER
          </Button>
        </Box>
      </Paper>

      {/* EDIT DIALOG */}
      <Dialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>EDIT SUPPLIER</DialogTitle>
        <DialogContent>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
              mt: 1,
            }}
          >
            <TextField
              label="Name"
              value={editForm.name}
              onChange={(e) =>
                setEditForm({ ...editForm, name: e.target.value })
              }
              fullWidth
            />
            <TextField
              label="Contact Person"
              value={editForm.contactPerson}
              onChange={(e) =>
                setEditForm({ ...editForm, contactPerson: e.target.value })
              }
              fullWidth
            />
            <TextField
              label="Email"
              value={editForm.email}
              onChange={(e) =>
                setEditForm({ ...editForm, email: e.target.value })
              }
              fullWidth
            />
            <TextField
              label="Phone"
              value={editForm.phone}
              onChange={(e) =>
                setEditForm({ ...editForm, phone: e.target.value })
              }
              fullWidth
            />
            <TextField
              label="Address"
              value={editForm.address}
              onChange={(e) =>
                setEditForm({ ...editForm, address: e.target.value })
              }
              fullWidth
              multiline
              minRows={2}
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

      {/* DELETE DIALOG */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          Are you sure you want to delete {deleteTarget?.name}?
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>CANCEL</Button>
          <Button
            onClick={handleConfirmDelete}
            color="error"
            variant="contained"
          >
            DELETE
          </Button>
        </DialogActions>
      </Dialog>

      {/* SNACKBAR */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        message={snackbar.message}
      />
    </Box>
  );
};

export default SupplierMaster;
