<<<<<<< HEAD
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
=======
import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { db, auth } from "../../firebase/config";
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  setDoc,
  query,
  where,
} from "firebase/firestore";
import { createUserWithEmailAndPassword, getAuth } from "firebase/auth";
import { initializeApp, deleteApp } from "firebase/app";
// import { firebaseConfig } from "../../firebase/config"; 

const firebaseConfig = {
  apiKey: "AIzaSyBjOXPlypNVC6cDqDA8azZ_7HsGMt7Pb-4",
  authDomain: "sims-e02dc.firebaseapp.com",
  projectId: "sims-e02dc",
  storageBucket: "sims-e02dc.firebasestorage.app",
  messagingSenderId: "782175512315",
  appId: "1:782175512315:web:be2fb5883bd3191d32325e",
  measurementId: "G-NTWRQF93YV"
};
import { DataGrid } from "@mui/x-data-grid";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import TextField from "@mui/material/TextField";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import InputLabel from "@mui/material/InputLabel";
import FormControl from "@mui/material/FormControl";
import Snackbar from "@mui/material/Snackbar";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";

const defaultForm = {
  email: "",
  username: "",
  password: "",
  department: "",
  groupId: "",
  status: "pending", // pending, active, inactive
};

const UserManagement = () => {
  const currentUser = useSelector((state) => state.auth.user);
  const isAdmin = currentUser?.groupId === "A";
  const [users, setUsers] = useState([]);
  const [userGroups, setUserGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState({
    open: false,
    edit: false,
    data: defaultForm,
  });
  const [snackbar, setSnackbar] = useState({
    open: false,
    msg: "",
    severity: "success",
  });

  // State for showing generated password
  const [createdUserDialog, setCreatedUserDialog] = useState({
    open: false,
    email: "",
    password: "",
  });

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, "users"));
      setUsers(
        querySnapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }))
      );
    } catch (err) {
      setSnackbar({
        open: true,
        msg: "Failed to fetch users",
        severity: "error",
      });
>>>>>>> refs/remotes/origin/main
    } finally {
      setLoading(false);
    }
  };
<<<<<<< HEAD

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

=======
  // Always fetch groups from 'groups' collection
  const fetchUserGroups = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "groups"));
      const groups = querySnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          groupId: data.groupId || doc.id,
          groupName: data.name || data.groupName || doc.id,
          ...data,
        };
      });
      setUserGroups(groups);
    } catch (err) {
      console.error("Failed to fetch user groups:", err);
      setUserGroups([]);
    }
  };
>>>>>>> refs/remotes/origin/main
  useEffect(() => {
    fetchUsers();
    fetchUserGroups();
  }, []);

<<<<<<< HEAD
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
=======
  const openAdd = () =>
    setModal({ open: true, edit: false, data: defaultForm });
  const openEdit = (row) => {
    console.log("Edit row:", row);
    setModal({
      open: true,
      edit: true,
      data: {
        ...row,
        password: "",
        groupId: row.groupId || "",
      },
    });
  };

  // Helper to generate random password
  const generatePassword = (length = 8) => {
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%";
    let retVal = "";
    for (let i = 0, n = charset.length; i < length; ++i) {
      retVal += charset.charAt(Math.floor(Math.random() * n));
    }
    return retVal;
  };

  // Add/Edit user doc
  const handleSave = async () => {
    const { email, username, department, groupId, id } = modal.data;
    console.log("Save user - groupId:", groupId, "isAdmin:", isAdmin);
    
    if (!email || !username || !department || !groupId) {
      setSnackbar({
        open: true,
        msg: "Fill all fields",
        severity: "error",
      });
      return;
    }
    if (!isAdmin) {
      setSnackbar({
        open: true,
        msg: "Only admins can add or edit users",
        severity: "error",
      });
      return;
    }

    try {
      // Check for username uniqueness (if adding new user or changing username)
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("username", "==", username));
      const querySnapshot = await getDocs(q);
      
      const isDuplicateUsername = querySnapshot.docs.some(doc => doc.id !== id); // Exclude current user if editing
      
      if (isDuplicateUsername) {
        setSnackbar({
          open: true,
          msg: "Username already exists. Please choose another.",
          severity: "error",
        });
        return;
      }

      if (modal.edit) {
        await setDoc(doc(db, "users", id), {
          email,
          username,
          department,
          groupId,
          status: modal.data.status || "active",
        }, { merge: true });
        setSnackbar({ open: true, msg: "User updated.", severity: "success" });
      } else {
        // On create: generate password, create user in Firebase Auth using SECONDARY APP
        const generatedPassword = generatePassword(10);
        
        // Initialize a secondary app to create user without logging out the admin
        const secondaryApp = initializeApp(firebaseConfig, "SecondaryApp");
        const secondaryAuth = getAuth(secondaryApp);
        
        try {
            const cred = await createUserWithEmailAndPassword(
              secondaryAuth,
              email,
              generatedPassword
            );
            
            await setDoc(doc(db, "users", cred.user.uid), {
              email,
              username,
              department,
              groupId,
              uid: cred.user.uid,
              status: "active",
              mustChangePassword: true, // Force password change
              createdAt: new Date().toISOString(),
            });
            
            // Show the generated password to the admin
            setCreatedUserDialog({
              open: true,
              email: email,
              password: generatedPassword,
            });
            
            setSnackbar({ open: true, msg: "User added.", severity: "success" });
        } finally {
            // Clean up the secondary app
            if (secondaryApp) {
              await deleteApp(secondaryApp);
            }
        }
>>>>>>> refs/remotes/origin/main
      }
      closeModal();
      fetchUsers();
    } catch (err) {
<<<<<<< HEAD
      setSnackbar({
        open: true,
        msg: err.message || 'Failed to save user',
        severity: 'error',
=======
      let errorMsg = "Save failed: " + err.message;
      if (err.code === 'auth/email-already-in-use') {
        errorMsg = "Email is already in use by another account.";
      }
      setSnackbar({
        open: true,
        msg: errorMsg,
        severity: "error",
>>>>>>> refs/remotes/origin/main
      });
    }
  };

<<<<<<< HEAD
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
=======
  const closeModal = () =>
    setModal({ open: false, edit: false, data: defaultForm });

  const handleSendInvitation = () => {
    const subject = "Invitation to SIMS";
    const loginLink = `${window.location.origin}/login`;
    const body = `Hello,\n\nYou have been invited to the Stock Inventory Management System.\n\nUsername: ${createdUserDialog.email}\nPassword: ${createdUserDialog.password}\n\nPlease login at: ${loginLink}\n\nIMPORTANT: You will be required to change your password immediately upon your first login.\n\nRegards,\nAdmin`;
    window.location.href = `mailto:${createdUserDialog.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete user?")) return;
    try {
      await deleteDoc(doc(db, "users", id));
      setUsers((users) => users.filter((u) => u.id !== id));
      setSnackbar({ open: true, msg: "User deleted.", severity: "success" });
    } catch {
      setSnackbar({ open: true, msg: "Delete failed", severity: "error" });
    }
  };

  const columns = [
    { field: "email", headerName: "Email", flex: 1 },
    { field: "username", headerName: "Username", flex: 0.7 },
    { field: "department", headerName: "Department", width: 140 },
    {
      field: "groupId",
      headerName: "Group",
      width: 180,
      renderCell: ({ row }) =>
        userGroups.find((g) => g.groupId === row.groupId)?.groupName ||
        row.groupId,
    },
    {
      field: "actions",
      headerName: "Actions",
      width: 130,
      renderCell: ({ row }) => (
        <>
          <IconButton size="small" onClick={() => openEdit(row)}>
>>>>>>> refs/remotes/origin/main
            <EditIcon />
          </IconButton>
          <IconButton
            size="small"
            color="error"
<<<<<<< HEAD
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
    <Box p={2}>
      <Box mb={2} display="flex" justifyContent="space-between" alignItems="center">
        <Typography variant="h6">User Management</Typography>
        <Button variant="contained" color="primary" onClick={openAdd}>
          Add User
        </Button>
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
=======
            onClick={() => handleDelete(row.id)}
          >
            <DeleteIcon />
          </IconButton>
        </>
      ),
      sortable: false,
    },
  ];

  return (
    <Box
      sx={{
        width: "100%",
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
      <div style={{ height: 520, width: "100%" }}>
        {loading ? (
          <Box
            display="flex"
            alignItems="center"
            justifyContent="center"
            height={300}
          >
            <CircularProgress />
          </Box>
        ) : (
          <DataGrid
            rows={users}
            columns={columns}
            autoHeight
            pageSize={8}
            disableSelectionOnClick
          />
        )}
      </div>
      {/* Add/Edit Modal */}
      <Dialog open={modal.open} onClose={closeModal} maxWidth="sm" fullWidth>
        <DialogTitle>{modal.edit ? "Edit User" : "Add User"}</DialogTitle>
        <DialogContent sx={{ minHeight: "400px", overflow: "auto" }}>
          <TextField
            margin="normal"
            label="Email"
            type="email"
            value={modal.data.email}
            onChange={(e) =>
              setModal((m) => ({
                ...m,
                data: { ...m.data, email: e.target.value },
              }))
            }
            fullWidth
            disabled={modal.edit}
          />
          <TextField
            margin="normal"
            label="Username"
            value={modal.data.username}
            onChange={(e) =>
              setModal((m) => ({
                ...m,
                data: { ...m.data, username: e.target.value },
              }))
            }
            fullWidth
          />
          <TextField
            margin="normal"
            label="Department"
            value={modal.data.department}
            onChange={(e) =>
              setModal((m) => ({
                ...m,
                data: { ...m.data, department: e.target.value },
              }))
            }
            fullWidth
          />
          {/* Password field removed - auto-generated now */}
          <FormControl margin="normal" fullWidth sx={{ mt: 2 }}>
            <InputLabel id="group-select-label">User Group</InputLabel>
            <Select
              labelId="group-select-label"
              id="group-select"
              label="User Group"
              value={modal.data.groupId || ""}
              onChange={(e) => {
                setModal((m) => ({
                  ...m,
                  data: { ...m.data, groupId: e.target.value },
                }));
              }}
              disabled={!isAdmin}
            >
              <MenuItem value="">
                <em>Select a group</em>
              </MenuItem>
              {userGroups && userGroups.length > 0 ? (
                userGroups.map((g) => (
                  <MenuItem key={g.groupId || g.id} value={g.groupId || g.id}>
                    {g.groupName || g.name || g.id}
                  </MenuItem>
                ))
              ) : (
                <MenuItem disabled>No groups available</MenuItem>
              )}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={closeModal}>Cancel</Button>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={handleSave}
            disabled={!isAdmin}
          >
            {modal.edit ? "Save" : "Add"}
>>>>>>> refs/remotes/origin/main
          </Button>
        </DialogActions>
      </Dialog>

<<<<<<< HEAD
      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        message={snackbar.msg}
=======
      {/* Created User Password Dialog */}
      <Dialog 
        open={createdUserDialog.open} 
        onClose={() => setCreatedUserDialog({ ...createdUserDialog, open: false })}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>User Created Successfully</DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            The user has been created. Please share the following password with them. They will be required to change it upon first login.
          </Typography>
          <Box 
            sx={{ 
              bgcolor: 'action.hover', 
              p: 2, 
              borderRadius: 1, 
              mt: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <Typography variant="h6" sx={{ fontFamily: 'monospace', fontWeight: 'bold' }}>
              {createdUserDialog.password}
            </Typography>
            <IconButton onClick={() => {
              navigator.clipboard.writeText(createdUserDialog.password);
              setSnackbar({ open: true, msg: "Password copied to clipboard", severity: "success" });
            }} size="small">
              <ContentCopyIcon />
            </IconButton>
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            Email: {createdUserDialog.email}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleSendInvitation} color="primary">
            Send Invitation
          </Button>
          <Button onClick={() => setCreatedUserDialog({ ...createdUserDialog, open: false })} variant="contained">
            Done
          </Button>
        </DialogActions>
      </Dialog>
      <Snackbar
        open={snackbar.open}
        autoHideDuration={2600}
        message={snackbar.msg}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
>>>>>>> refs/remotes/origin/main
      />
    </Box>
  );
};

export default UserManagement;
