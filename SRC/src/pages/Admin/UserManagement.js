import React, { useState, useEffect } from 'react';
import { db, auth } from '../../firebase/config';
import { collection, getDocs, doc, setDoc, updateDoc, deleteDoc, query, where } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { DataGrid } from '@mui/x-data-grid';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';
import Snackbar from '@mui/material/Snackbar';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import Chip from '@mui/material/Chip';
import { Roles } from '../../utils/roles';

const defaultForm = { 
  email: '', 
  username: '', 
  password: '', 
  department: '', 
  groupId: '',
  status: 'pending'
};

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [userGroups, setUserGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState({ open: false, edit: false, data: defaultForm });
  const [snackbar, setSnackbar] = useState({ open: false, msg: '', severity: 'success' });

  // Fetch users from Firestore
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'users'));
      setUsers(
        querySnapshot.docs.map((doc) => ({
          ...doc.data(),
          id: doc.id,
          uid: doc.id,
        }))
      );
    } catch (err) {
      setSnackbar({ open: true, msg: 'Failed to fetch users', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Fetch user groups (roles)
  const fetchUserGroups = async () => {
    try {
      // Get groups from the 'groups' collection in Firestore
      const querySnapshot = await getDocs(collection(db, 'groups'));
      const groups = querySnapshot.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
      }));
      setUserGroups(groups.length > 0 ? groups : Object.values(Roles));
    } catch {
      setUserGroups(Object.values(Roles));
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchUserGroups();
  }, []);

  const openAdd = () => setModal({ open: true, edit: false, data: defaultForm });
  const openEdit = (row) => {
    const editData = { ...row, id: row.uid };
    setModal({ open: true, edit: true, data: editData });
  };
  const closeModal = () => setModal({ open: false, edit: false, data: defaultForm });

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setModal((prev) => ({
      ...prev,
      data: { ...prev.data, [name]: value },
    }));
  };

  // Save user (add or update)
  const handleSave = async () => {
    const { email, username, password, department, groupId, status, id } = modal.data;

    if (!email || !username || !groupId) {
      return setSnackbar({
        open: true,
        msg: 'Email, Username, and Group are required!',
        severity: 'error',
      });
    }

    try {
      if (modal.edit) {
        // Update existing user
        const userRef = doc(db, 'users', id);
        await updateDoc(userRef, {
          email,
          username,
          groupId,
          department,
          status,
        });
        setSnackbar({ open: true, msg: 'User updated successfully', severity: 'success' });
      } else {
        // Create new user
        if (!password) {
          return setSnackbar({
            open: true,
            msg: 'Password is required for new users',
            severity: 'error',
          });
        }

        // Create Firebase Auth user
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);

        // Create user document in Firestore
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          uid: userCredential.user.uid,
          email: email.toLowerCase(),
          username,
          groupId,
          department,
          status: status || 'active',
          createdAt: new Date().toISOString(),
          passwordHistory: [],
        });

        setSnackbar({ open: true, msg: 'User created successfully', severity: 'success' });
      }
      closeModal();
      fetchUsers();
    } catch (err) {
      setSnackbar({
        open: true,
        msg: err.message || 'Failed to save user',
        severity: 'error',
      });
    }
  };

  // Delete user
  const handleDelete = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;

    try {
      await deleteDoc(doc(db, 'users', userId));
      setSnackbar({ open: true, msg: 'User deleted successfully', severity: 'success' });
      fetchUsers();
    } catch (err) {
      setSnackbar({
        open: true,
        msg: 'Failed to delete user',
        severity: 'error',
      });
    }
  };

  // DataGrid columns
  const columns = [
    { field: 'email', headerName: 'Email', flex: 1.5, minWidth: 200 },
    { field: 'username', headerName: 'Username', flex: 1, minWidth: 120 },
    {
      field: 'groupId',
      headerName: 'Group',
      flex: 1,
      minWidth: 120,
      renderCell: (params) => {
        const role = Object.values(Roles).find((r) => r.groupId === params.value);
        return <Chip label={role?.name || params.value} size="small" />;
      },
    },
    { field: 'department', headerName: 'Department', flex: 1, minWidth: 120 },
    {
      field: 'status',
      headerName: 'Status',
      flex: 0.8,
      minWidth: 100,
      renderCell: (params) => (
        <Chip
          label={params.value || 'pending'}
          color={params.value === 'active' ? 'success' : 'warning'}
          size="small"
        />
      ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      flex: 0.8,
      minWidth: 120,
      sortable: false,
      renderCell: (params) => (
        <Box>
          <IconButton
            size="small"
            color="primary"
            onClick={() => openEdit(params.row)}
          >
            <EditIcon />
          </IconButton>
          <IconButton
            size="small"
            color="error"
            onClick={() => handleDelete(params.row.id)}
          >
            <DeleteIcon />
          </IconButton>
        </Box>
      ),
    },
  ];

  if (loading)
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );

  return (
    <Box
      sx={{
        maxWidth: 950,
        mx: "auto",
        mt: 4,
        p: 3,
        bgcolor: "background.paper",
        borderRadius: 2,
        boxShadow: 2,
      }}
    >
      <Box
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        mb={2}
      >
        <Typography variant="h5">User Master</Typography>
        {isAdmin && (
          <Button variant="contained" onClick={openAdd}>
            Add User
          </Button>
        )}
      </Box>

      {/* DataGrid Table */}
      <Box sx={{ height: 500, width: '100%' }}>
        <DataGrid
          rows={users}
          columns={columns}
          pageSize={10}
          rowsPerPageOptions={[5, 10, 20]}
          pagination
          checkboxSelection
          disableSelectionOnClick
        />
      </Box>

      {/* Modal Dialog */}
      <Dialog open={modal.open} onClose={closeModal} maxWidth="sm" fullWidth>
        <DialogTitle>{modal.edit ? 'Edit User' : 'Add New User'}</DialogTitle>
        <DialogContent>
          <Box mt={2} display="flex" flexDirection="column" gap={2}>
            <TextField
              label="Email"
              type="email"
              fullWidth
              name="email"
              value={modal.data.email}
              onChange={handleInputChange}
              disabled={modal.edit}
            />
            <TextField
              label="Username"
              fullWidth
              name="username"
              value={modal.data.username}
              onChange={handleInputChange}
            />
            <FormControl fullWidth>
              <InputLabel>Group</InputLabel>
              <Select
                name="groupId"
                value={modal.data.groupId}
                label="Group"
                onChange={handleInputChange}
              >
                {userGroups.map((group) => (
                  <MenuItem key={group.groupId || group.id} value={group.groupId || group.id}>
                    {group.name || group.groupName}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Department"
              fullWidth
              name="department"
              value={modal.data.department}
              onChange={handleInputChange}
            />
            {!modal.edit && (
              <TextField
                label="Password"
                type="password"
                fullWidth
                name="password"
                value={modal.data.password}
                onChange={handleInputChange}
              />
            )}
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                name="status"
                value={modal.data.status}
                label="Status"
                onChange={handleInputChange}
              >
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeModal}>Cancel</Button>
          <Button onClick={handleSave} variant="contained" color="primary">
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        message={snackbar.msg}
      />
    </Box>
  );
};

export default UserManagement;
