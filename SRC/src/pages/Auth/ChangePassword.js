import React, { useState } from "react";
import {
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  CircularProgress,
  Paper,
} from "@mui/material";
import {
  updatePassword,
  signInWithEmailAndPassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from "firebase/auth";
import { collection, query, where, getDocs, updateDoc } from "firebase/firestore";
import bcrypt from "bcryptjs";
import { auth, db } from "../../firebase/config";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { setUser } from "../../redux/authSlice";

const PASSWORD_HISTORY_FIELDS = ["lastPasswords", "passwordHistory"];

const ChangePassword = () => {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const user = useSelector((state) => state.auth.user);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const validatePassword = (password) => {
    if (password.length < 6) return "Password must be at least 6 characters.";
    return null;
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!user || !user.email) {
      setError("You must be logged in to change your password.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    if (oldPassword === newPassword) {
      setError("New password cannot be the same as old password.");
      return;
    }

    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    setLoading(true);
    try {
      // Re-authenticate user with old password
      const credential = EmailAuthProvider.credential(user.email, oldPassword);
      await reauthenticateWithCredential(auth.currentUser, credential);

      // Find user document by email
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("email", "==", user.email));
      const querySnapshot = await getDocs(q);

      let userDocRef = null;
      let passwordHistory = [];

      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        userDocRef = userDoc.ref;
        const data = userDoc.data();

        for (const field of PASSWORD_HISTORY_FIELDS) {
          if (Array.isArray(data[field])) {
            passwordHistory = data[field];
            break;
          }
        }
      }

      // Check if new password was used before
      if (passwordHistory.length > 0) {
        const reused = await Promise.all(
          passwordHistory.map((hash) => bcrypt.compare(newPassword, hash))
        );
        if (reused.includes(true)) {
          setError("You cannot reuse a previous password!");
          setLoading(false);
          return;
        }
      }

      // Update password in Firebase Auth
      await updatePassword(auth.currentUser, newPassword);

      // Hash new password and update Firestore
      if (userDocRef) {
        const newHash = await bcrypt.hash(newPassword, 10);
        const updatedHistory = [...passwordHistory, newHash].slice(-5);
        await updateDoc(userDocRef, {
          lastPasswords: updatedHistory,
          lastUpdated: new Date().toISOString(),
          mustChangePassword: false, // Reset the flag
        });
      }

      setSuccess("Password changed successfully!");
      
      // Update Redux state immediately
      dispatch(setUser({ ...user, mustChangePassword: false }));
      
      // Clear form
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");

      setTimeout(() => {
        navigate("/reports/dashboard-kpis");
      }, 2000);
    } catch (err) {
      if (err.code === "auth/wrong-password") {
        setError("Current password is incorrect.");
      } else {
        setError(err.message || "Password change failed.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box maxWidth={500} mx="auto" my={8}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h5" mb={2}>
          Change Password
        </Typography>
        <Typography variant="body2" mb={3} color="text.secondary">
          Enter your current password and choose a new password. You cannot reuse previous passwords.
        </Typography>
        <form onSubmit={handleChangePassword}>
          <TextField
            label="Current Password"
            type="password"
            fullWidth
            required
            margin="normal"
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
          />
          
          <TextField
            label="New Password"
            type="password"
            fullWidth
            required
            margin="normal"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            error={newPassword.length > 0 && newPassword.length < 6}
          />
          {/* Length Indicator */}
          <Typography 
            variant="caption" 
            display="block" 
            sx={{ 
              color: newPassword.length >= 6 ? 'success.main' : (newPassword.length > 0 ? 'error.main' : 'text.secondary'),
              mt: 0.5 
            }}
          >
            {newPassword.length >= 6 ? "✓ Password is at least 6 characters" : "• Password must be at least 6 characters"}
          </Typography>

          <TextField
            label="Confirm New Password"
            type="password"
            fullWidth
            required
            margin="normal"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            error={confirmPassword.length > 0 && newPassword !== confirmPassword}
          />
          {/* Match Indicator */}
          {confirmPassword.length > 0 && (
            <Typography 
              variant="caption" 
              display="block" 
              sx={{ 
                color: newPassword === confirmPassword ? 'success.main' : 'error.main',
                mt: 0.5 
              }}
            >
              {newPassword === confirmPassword ? "✓ Passwords match" : "• Passwords do not match"}
            </Typography>
          )}

          {/* Old vs New Check */}
          {oldPassword.length > 0 && newPassword.length > 0 && oldPassword === newPassword && (
            <Typography 
              variant="caption" 
              display="block" 
              sx={{ color: 'error.main', mt: 0.5 }}
            >
              • New password cannot be the same as current password
            </Typography>
          )}

          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
          {success && (
            <Alert severity="success" sx={{ mt: 2 }}>
              {success}
            </Alert>
          )}
          <Button
            type="submit"
            variant="contained"
            color="primary"
            fullWidth
            sx={{ mt: 3 }}
            disabled={loading || newPassword.length < 6 || newPassword !== confirmPassword || oldPassword === newPassword}
          >
            {loading ? <CircularProgress size={24} /> : "Change Password"}
          </Button>
        </form>
      </Paper>
    </Box>
  );
};

export default ChangePassword;
