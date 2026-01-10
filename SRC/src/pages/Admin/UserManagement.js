import React, { useState, useEffect, useMemo } from "react";
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
  updateDoc
} from "firebase/firestore";
import { createUserWithEmailAndPassword, getAuth } from "firebase/auth";
import { initializeApp, deleteApp } from "firebase/app";

const firebaseConfig = {
  apiKey: "AIzaSyBjOXPlypNVC6cDqDA8azZ_7HsGMt7Pb-4",
  authDomain: "sims-e02dc.firebaseapp.com",
  projectId: "sims-e02dc",
  storageBucket: "sims-e02dc.firebasestorage.app",
  messagingSenderId: "782175512315",
  appId: "1:782175512315:web:be2fb5883bd3191d32325e",
  measurementId: "G-NTWRQF93YV"
};

import {
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  Alert,
} from "@mui/material";

import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";
import AddIcon from "@mui/icons-material/Add";
import PersonIcon from "@mui/icons-material/Person";
import VisibilityIcon from "@mui/icons-material/Visibility";
import WarningIcon from "@mui/icons-material/Warning";
import RefreshIcon from "@mui/icons-material/Refresh";

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
  const isAdmin = currentUser?.groupId?.toLowerCase() === 'a' || currentUser?.groupId?.toLowerCase() === 'admin';
  const permissions = currentUser?.groupPermissions?.user_master || {};

  const canAdd = permissions.access === 'add' || isAdmin;
  const canEdit = permissions.access === 'edit' || permissions.access === 'add' || isAdmin;
  const canDelete = permissions.access === 'add' || isAdmin;
  const [users, setUsers] = useState([]);
  const [userGroups, setUserGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [stats, setStats] = useState({ total: 0, active: 0 });
  const [departments, setDepartments] = useState([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

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

  const [createdUserDialog, setCreatedUserDialog] = useState({
    open: false,
    email: "",
    password: "",
  });

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const [emailError, setEmailError] = useState(false);
  const [usernameError, setUsernameError] = useState(false);
  const [departmentError, setDepartmentError] = useState(false);
  const [groupError, setGroupError] = useState(false);

  const calculateStats = (data) => {
    setStats({
      total: data.length,
      active: data.filter(u => (u.status || '').toLowerCase() === 'active').length,
    });
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, "users"));
      const data = querySnapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }));
      setUsers(data);
      calculateStats(data);
    } catch (err) {
      setSnackbar({
        open: true,
        msg: "Failed to fetch users",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUserGroups = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "groups"));
      const groups = querySnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id,
          groupId: data.groupId || doc.id,
          groupName: data.name || data.groupName || doc.id || '',
        };
      });
      setUserGroups(groups);
    } catch (err) {
      console.error("Failed to fetch user groups:", err);
      setUserGroups([]);
    }
  };

  const fetchDepartments = async () => {
    try {
      const q = query(collection(db, "departments"), where("status", "==", "Active"));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      setDepartments(data);
    } catch (err) {
      console.error("Failed to fetch departments:", err);
      setDepartments([]);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchUserGroups();
    fetchDepartments();
  }, []);

  const filteredUsers = useMemo(() => {
    const q = (search || '').trim().toLowerCase();

    return users.filter((user) => {
      const matchesSearch = !q ? true : [
        user.username,
        user.email,
        user.department,
      ]
        .map((x) => (x || '').toString().toLowerCase())
        .join(' | ')
        .includes(q);

      const matchesRole =
        roleFilter === "all" || user.groupId === roleFilter;

      return matchesSearch && matchesRole;
    });
  }, [users, search, roleFilter]);

  const openAdd = () => {
    setModal({ open: true, edit: false, data: defaultForm });
    setEmailError(false);
    setUsernameError(false);
    setDepartmentError(false);
    setGroupError(false);
  };

  const openEdit = (row) => {
    setModal({
      open: true,
      edit: true,
      data: {
        ...row,
        password: "",
        groupId: row.groupId || "",
      },
    });
    setEmailError(false);
    setUsernameError(false);
    setDepartmentError(false);
    setGroupError(false);
  };

  const closeModal = () => {
    setModal({ open: false, edit: false, data: defaultForm });
    setEmailError(false);
    setUsernameError(false);
    setDepartmentError(false);
    setGroupError(false);
  };

  const generatePassword = (length = 8) => {
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%";
    let retVal = "";
    for (let i = 0, n = charset.length; i < length; ++i) {
      retVal += charset.charAt(Math.floor(Math.random() * n));
    }
    return retVal;
  };

  const handleSave = async () => {
    const { email, username, department, groupId, id } = modal.data;

    setEmailError(!email);
    setUsernameError(!username);
    setDepartmentError(!department);
    setGroupError(!groupId);

    if (!email || !username || !department || !groupId) {
      setSnackbar({
        open: true,
        msg: "Fill all required fields",
        severity: "error",
      });
      return;
    }

    if (modal.edit ? !canEdit : !canAdd) {
      setSnackbar({
        open: true,
        msg: `You do not have permission to ${modal.edit ? 'edit' : 'add'} users`,
        severity: "error",
      });
      return;
    }

    try {
      const usersRef = collection(db, "users");

      // Check duplicate username
      const qUsername = query(usersRef, where("username", "==", username));
      const snapUsername = await getDocs(qUsername);
      const isDuplicateUsername = snapUsername.docs.some(doc => doc.id !== id);

      if (isDuplicateUsername) {
        setUsernameError(true);
        setSnackbar({ open: true, msg: "Username already exists", severity: "error" });
        return;
      }

      // Check duplicate email
      const qEmail = query(usersRef, where("email", "==", email));
      const snapEmail = await getDocs(qEmail);
      const isDuplicateEmail = snapEmail.docs.some(doc => doc.id !== id);

      if (isDuplicateEmail) {
        setEmailError(true);
        setSnackbar({ open: true, msg: "Email already exists in the system", severity: "error" });
        return;
      }

      if (modal.edit) {
        await setDoc(doc(db, "users", id), {
          email,
          username,
          department,
          groupId,
          status: modal.data.status || "active",
          updatedAt: new Date().toISOString(),
        }, { merge: true });
        setSnackbar({ open: true, msg: "User updated successfully", severity: "success" });
      } else {
        const generatedPassword = generatePassword(10);
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
            mustChangePassword: true,
            createdAt: new Date().toISOString(),
          });

          setCreatedUserDialog({
            open: true,
            email: email,
            password: generatedPassword,
          });

          setSnackbar({ open: true, msg: "User added successfully", severity: "success" });
        } finally {
          if (secondaryApp) {
            await deleteApp(secondaryApp);
          }
        }
      }
      closeModal();
      fetchUsers();
    } catch (err) {
      let errorMsg = "Save failed: " + err.message;
      if (err.code === 'auth/email-already-in-use') {
        errorMsg = "Email is already in use by another account";
        setEmailError(true);
      }
      setSnackbar({
        open: true,
        msg: errorMsg,
        severity: "error",
      });
    }
  };

  const handleSendInvitation = () => {
    const subject = "Invitation to SIMS";
    const loginLink = `${window.location.origin}/login`;
    const body = `Hello,\n\nYou have been invited to the Stock Inventory Management System.\n\nUsername: ${createdUserDialog.email}\nPassword: ${createdUserDialog.password}\n\nPlease login at: ${loginLink}\n\nIMPORTANT: You will be required to change your password immediately upon your first login.\n\nRegards,\nAdmin`;
    window.location.href = `mailto:${createdUserDialog.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const handleDeleteClick = (row) => {
    setDeleteTarget(row);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    if (!canDelete) {
      setSnackbar({ open: true, msg: "You do not have permission to delete users", severity: "error" });
      return;
    }
    try {
      await deleteDoc(doc(db, "users", deleteTarget.id));
      setUsers((users) => users.filter((u) => u.id !== deleteTarget.id));
      setSnackbar({ open: true, msg: "User deleted successfully", severity: "success" });
    } catch {
      setSnackbar({ open: true, msg: "Delete failed", severity: "error" });
    } finally {
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
    }
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const refreshData = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, "users"));
      const data = querySnapshot.docs.map(d => ({ ...d.data(), id: d.id }));
      setUsers(data);
      calculateStats(data);
      setSnackbar({ open: true, msg: "Data refreshed successfully", severity: "success" });
    } catch (error) {
      setSnackbar({ open: true, msg: "Error refreshing data", severity: "error" });
    } finally {
      setLoading(false);
    }
  };

  if (loading && users.length === 0) {
    return (
      <Box sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: 'calc(100vh - 64px)',
        backgroundColor: '#f8fafc'
      }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{
      minHeight: 'calc(100vh - 64px)',
      backgroundColor: '#f8fafc',
      p: 3,
      width: '100%'
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
            background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
            color: 'white',
            boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)'
          }}>
            <PersonIcon sx={{ fontSize: 28 }} />
          </Box>
          <Box>
            <Typography variant="h4" sx={{
              fontWeight: 700,
              color: '#1e293b',
              mb: 0.5
            }}>
              User Master
            </Typography>
            <Typography variant="body1" sx={{ color: '#64748b' }}>
              User Account & Access Management
            </Typography>
          </Box>
        </Box>

        {/* Stats Cards */}
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Card sx={{
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            backgroundColor: 'white',
            px: 2,
            py: 1.5,
            minWidth: 120
          }}>
            <Box>
              <Typography variant="body2" sx={{ color: '#64748b' }}>
                Total Users
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 600, color: '#1e293b' }}>
                {stats.total}
              </Typography>
            </Box>
          </Card>
          <Card sx={{
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            backgroundColor: 'white',
            px: 2,
            py: 1.5,
            minWidth: 120
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <PersonIcon sx={{ color: '#8b5cf6', fontSize: 18 }} />
              <Box>
                <Typography variant="body2" sx={{ color: '#64748b' }}>
                  Active Users
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 600, color: '#1e293b' }}>
                  {stats.active}
                </Typography>
              </Box>
            </Box>
          </Card>
        </Box>
      </Box>

      {/* Search and Filter Section */}
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
          backgroundColor: '#faf5ff'
        }}>
          <Typography variant="h6" sx={{
            fontWeight: 600,
            color: '#1e293b',
            display: 'flex',
            alignItems: 'center',
            gap: 1
          }}>
            <SearchIcon sx={{ fontSize: 20, color: '#8b5cf6' }} />
            Search & Filter Users
          </Typography>
          <Typography variant="body2" sx={{ color: '#64748b', mt: 0.5 }}>
            Find users by name, email, or department
          </Typography>
        </Box>

        <Box sx={{ p: 3 }}>
          <Grid container spacing={2} alignItems="flex-start">
            <Grid item xs={12} md={8}>
              <TextField
                fullWidth
                label="Search Users"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by username, email, or department..."
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ color: '#64748b' }} />
                    </InputAdornment>
                  ),
                  endAdornment: search && (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setSearch('')} size="small">
                        <ClearIcon fontSize="small" />
                      </IconButton>
                    </InputAdornment>
                  )
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '10px',
                    backgroundColor: '#f8fafc',
                  }
                }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Filter by Group</InputLabel>
                <Select
                  value={roleFilter}
                  label="Filter by Group"
                  onChange={(e) => setRoleFilter(e.target.value)}
                  sx={{
                    borderRadius: '10px',
                    backgroundColor: '#f8fafc',
                  }}
                >
                  <MenuItem value="all">All Groups</MenuItem>
                  {userGroups.map((group) => (
                    <MenuItem
                      key={group.groupId || group.id}
                      value={group.groupId || group.id}
                    >
                      {group.groupName || group.name || group.id}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Box>
      </Paper>

      {/* Users List Section */}
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
          backgroundColor: '#faf5ff',
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
              <PersonIcon sx={{ fontSize: 20, color: '#8b5cf6' }} />
              User List
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748b', mt: 0.5 }}>
              {filteredUsers.length} users found
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {canAdd && (
              <Tooltip title="Add User">
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={openAdd}
                  sx={{
                    background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
                    borderRadius: '10px',
                    textTransform: 'none',
                    fontWeight: 600
                  }}
                >
                  Add User
                </Button>
              </Tooltip>
            )}
            <Tooltip title="Refresh data">
              <IconButton
                onClick={refreshData}
                sx={{
                  color: '#8b5cf6',
                  backgroundColor: 'white',
                  border: '1px solid #e2e8f0',
                  '&:hover': {
                    backgroundColor: '#faf5ff'
                  }
                }}
              >
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Users Table */}
        {loading ? (
          <Box sx={{ p: 6, textAlign: 'center' }}>
            <CircularProgress />
          </Box>
        ) : filteredUsers.length === 0 ? (
          <Box sx={{
            p: 6,
            textAlign: 'center',
            color: '#94a3b8'
          }}>
            <PersonIcon sx={{ fontSize: 64, mb: 2, opacity: 0.5 }} />
            <Typography variant="h6" sx={{ mb: 1 }}>
              No users found
            </Typography>
            <Typography variant="body2">
              {users.length === 0 ?
                "No users found. Add your first user above." :
                "No users match your search or filter criteria."}
            </Typography>
          </Box>
        ) : (
          <>
            <Box sx={{ overflowX: 'auto' }}>
              <Table sx={{ minWidth: 900 }}>
                <TableHead sx={{ backgroundColor: '#f8fafc' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Username</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Email</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Department</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Group</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredUsers
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((u) => (
                      <TableRow key={u.id} hover>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: '#1e293b' }}>
                            {u.username}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={u.email || '—'}
                            size="small"
                            variant="outlined"
                            sx={{ fontWeight: 500 }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ color: '#64748b' }}>
                            {u.department || '—'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ color: '#64748b' }}>
                            {userGroups.find(g => g.groupId === u.groupId)?.groupName || u.groupId || '—'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={(u.status || 'active').charAt(0).toUpperCase() + (u.status || 'active').slice(1)}
                            color={(u.status || 'active').toLowerCase() === 'active' ? 'success' : 'default'}
                            size="small"
                            sx={{ fontWeight: 600 }}
                          />
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 0.5 }}>
                            <Tooltip title={canEdit ? "Edit User" : "View Details"}>
                              <IconButton
                                size="small"
                                onClick={() => openEdit(u)}
                                sx={{
                                  color: canEdit ? '#8b5cf6' : '#64748b',
                                  '&:hover': { backgroundColor: canEdit ? '#faf5ff' : '#f1f5f9' }
                                }}
                              >
                                {canEdit ? <EditIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                              </IconButton>
                            </Tooltip>
                            {canDelete && (
                              <Tooltip title="Delete User">
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => handleDeleteClick(u)}
                                  sx={{
                                    '&:hover': { backgroundColor: '#fef2f2' }
                                  }}
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </Box>

            {/* Pagination */}
            <TablePagination
              rowsPerPageOptions={[10, 25, 50, 100]}
              component="div"
              count={filteredUsers.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              sx={{
                borderTop: '1px solid #e2e8f0',
                '& .MuiTablePagination-toolbar': {
                  padding: 2
                }
              }}
            />
          </>
        )}
      </Paper>

      {/* Add/Edit User Dialog */}
      <Dialog
        open={modal.open}
        onClose={closeModal}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '12px',
            display: 'flex',
            flexDirection: 'column',
          }
        }}
      >
        <DialogTitle sx={{
          pb: 1,
          borderBottom: '1px solid #e2e8f0',
          backgroundColor: '#faf5ff'
        }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              flexDirection: { xs: 'column', sm: 'row' },
              textAlign: { xs: 'center', sm: 'left' },
            }}
          >
            <PersonIcon sx={{ color: '#8b5cf6' }} />

            <Typography variant="h6" sx={{ fontWeight: 600, color: '#1e293b' }}>
              {modal.edit ? 'Edit User' : 'Add New User'}
            </Typography>
          </Box>


        </DialogTitle>
        <DialogContent dividers
          sx={{
            p: 4,
            overflowY: 'auto',
          }}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                label="Email"
                type="email"
                value={modal.data.email}
                onChange={(e) => {
                  setModal((m) => ({ ...m, data: { ...m.data, email: e.target.value } }));
                  setEmailError(false);
                }}
                error={emailError}
                helperText={emailError ? 'Email is required' : ''}
                disabled={modal.edit || !canAdd}
                fullWidth
                required
                InputLabelProps={{ shrink: true }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '10px',
                    backgroundColor: '#f8fafc',
                  }
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Username"
                value={modal.data.username}
                onChange={(e) => {
                  setModal((m) => ({ ...m, data: { ...m.data, username: e.target.value } }));
                  setUsernameError(false);
                }}
                error={usernameError}
                helperText={usernameError ? 'Username is required or already exists' : ''}
                fullWidth
                required
                disabled={modal.edit ? !canEdit : !canAdd}
                InputLabelProps={{ shrink: true }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '10px',
                    backgroundColor: '#f8fafc',
                  }
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth required error={departmentError}>
                <InputLabel shrink>Department</InputLabel>
                <Select
                  value={modal.data.department || ""}
                  onChange={(e) => {
                    setModal((m) => ({ ...m, data: { ...m.data, department: e.target.value } }));
                    setDepartmentError(false);
                  }}
                  disabled={!(modal.edit ? canEdit : canAdd)}
                  displayEmpty
                  sx={{
                    borderRadius: '10px',
                    backgroundColor: '#f8fafc',
                  }}
                >
                  <MenuItem value="" disabled>
                    <em>Select a department</em>
                  </MenuItem>
                  {departments && departments.length > 0 ? (
                    departments.map((d) => (
                      <MenuItem key={d.id} value={d.departmentName}>
                        {d.departmentName}
                      </MenuItem>
                    ))
                  ) : (
                    <MenuItem disabled>No departments available</MenuItem>
                  )}
                </Select>
                {departmentError && (
                  <Typography variant="caption" color="error" sx={{ ml: 1.5, mt: 0.5 }}>
                    Department is required
                  </Typography>
                )}
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth required error={groupError}>
                <InputLabel shrink>User Group</InputLabel>
                <Select
                  label="User Group"
                  value={modal.data.groupId || ""}
                  onChange={(e) => {
                    setModal((m) => ({ ...m, data: { ...m.data, groupId: e.target.value } }));
                    setGroupError(false);
                  }}
                  disabled={!(modal.edit ? canEdit : canAdd)}
                  displayEmpty
                  sx={{
                    borderRadius: '10px',
                    backgroundColor: '#f8fafc',
                  }}
                >
                  <MenuItem value="" disabled>
                    <em>Select a group</em>
                  </MenuItem>
                  {userGroups && userGroups.length > 0 ? (
                    userGroups.map((g) => (
                      <MenuItem key={g.id} value={g.id}>
                        {g.groupName || g.name || g.id}
                      </MenuItem>
                    ))
                  ) : (
                    <MenuItem disabled>No groups available</MenuItem>
                  )}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel shrink>Status</InputLabel>
                <Select
                  label="Status"
                  value={modal.data.status || "pending"}
                  onChange={(e) => {
                    setModal((m) => ({ ...m, data: { ...m.data, status: e.target.value } }));
                  }}
                  disabled={!(modal.edit ? canEdit : canAdd)}
                  displayEmpty
                  sx={{
                    borderRadius: '10px',
                    backgroundColor: '#f8fafc',
                  }}
                >
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="inactive">Inactive</MenuItem>
                  <MenuItem value="pending">Pending</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{
          p: 2,
          borderTop: '1px solid #e2e8f0',
          backgroundColor: '#f8fafc'
        }}>
          <Button
            onClick={closeModal}
            variant="outlined"
            sx={{
              borderRadius: '10px',
              borderColor: '#e2e8f0',
              color: '#64748b',
              textTransform: 'none'
            }}
          >
            {modal.edit ? (canEdit ? 'Cancel' : 'Close') : 'Cancel'}
          </Button>
          {(modal.edit ? canEdit : canAdd) && (
            <Button
              onClick={handleSave}
              variant="contained"
              sx={{
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
                textTransform: 'none',
                fontWeight: 600
              }}
            >
              {modal.edit ? 'Update User' : 'Add User'}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Created User Password Dialog */}
      <Dialog
        open={createdUserDialog.open}
        onClose={() => setCreatedUserDialog({ ...createdUserDialog, open: false })}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '12px',
            overflow: 'hidden'
          }
        }}
      >
        <DialogTitle sx={{
          pb: 1,
          borderBottom: '1px solid #e2e8f0',
          backgroundColor: '#faf5ff'
        }}>
          User Created Successfully
        </DialogTitle>
        <DialogContent sx={{ py: 3 }}>
          <Typography variant="body2" sx={{ mb: 2, color: '#64748b' }}>
            The user has been created. Please share the following password with them. They will be required to change it upon first login.
          </Typography>
          <Box
            sx={{
              bgcolor: '#f8fafc',
              p: 2,
              borderRadius: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              border: '1px solid #e2e8f0'
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
          <Typography variant="caption" sx={{ color: '#64748b', mt: 2, display: 'block' }}>
            Email: {createdUserDialog.email}
          </Typography>
        </DialogContent>
        <DialogActions sx={{
          p: 2,
          borderTop: '1px solid #e2e8f0',
          backgroundColor: '#f8fafc'
        }}>
          <Button
            onClick={handleSendInvitation}
            color="primary"
            sx={{
              borderRadius: '10px',
              textTransform: 'none'
            }}
          >
            Send Invitation
          </Button>
          <Button
            onClick={() => setCreatedUserDialog({ ...createdUserDialog, open: false })}
            variant="contained"
            sx={{
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
              textTransform: 'none',
              fontWeight: 600
            }}
          >
            Done
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '12px',
            overflow: 'hidden'
          }
        }}
      >
        <DialogTitle sx={{
          pb: 1,
          borderBottom: '1px solid #e2e8f0',
          backgroundColor: '#fef2f2'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <WarningIcon sx={{ color: '#ef4444' }} />
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#1e293b' }}>
              Confirm Delete
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ py: 3 }}>
          <Alert
            severity="error"
            sx={{
              mb: 3,
              borderRadius: '10px',
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca'
            }}
          >
            <Typography variant="body2" sx={{ fontWeight: 600, color: '#991b1b' }}>
              This action cannot be undone
            </Typography>
          </Alert>

          {deleteTarget && (
            <Box sx={{ p: 2, backgroundColor: '#f8fafc', borderRadius: '10px' }}>
              <Typography variant="subtitle2" sx={{ color: '#64748b', mb: 2 }}>
                You are about to delete:
              </Typography>
              <Box>
                <Typography variant="body2" sx={{ color: '#64748b' }}>
                  Username
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 600, color: '#1e293b' }}>
                  {deleteTarget.username}
                </Typography>
              </Box>
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" sx={{ color: '#64748b' }}>
                  Email
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 600, color: '#1e293b' }}>
                  {deleteTarget.email}
                </Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{
          p: 2,
          borderTop: '1px solid #e2e8f0',
          backgroundColor: '#f8fafc'
        }}>
          <Button
            onClick={() => setDeleteDialogOpen(false)}
            variant="outlined"
            sx={{
              borderRadius: '10px',
              borderColor: '#e2e8f0',
              color: '#64748b',
              textTransform: 'none'
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirmDelete}
            variant="contained"
            color="error"
            sx={{
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
              textTransform: 'none',
              fontWeight: 600
            }}
          >
            Delete User
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
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
          {snackbar.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default UserManagement;
