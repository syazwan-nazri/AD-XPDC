import React, { useState, useEffect } from "react";
import {
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  CircularProgress,
} from "@mui/material";
import {
  verifyPasswordResetCode,
  confirmPasswordReset,
  updatePassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
<<<<<<< HEAD
import { doc, getDoc, updateDoc } from "firebase/firestore";
=======
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from "firebase/firestore";
>>>>>>> refs/remotes/origin/main
import bcrypt from "bcryptjs";
import { auth, db } from "../../firebase/config";

const PASSWORD_HISTORY_FIELDS = ["lastPasswords", "passwordHistory"];

const ResetPassword = () => {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [oobCode, setOobCode] = useState("");

<<<<<<< HEAD
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("oobCode");
    setOobCode(code);
    if (code) {
      verifyPasswordResetCode(auth, code)
        .then(setEmail)
        .catch(() => setError("Invalid or expired password reset link."));
=======

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("oobCode");
    const mode = params.get("mode");
    
    // If we have the parameters, this is coming from Firebase's action handler
    if (code && mode === "resetPassword") {
      setOobCode(code);
      verifyPasswordResetCode(auth, code)
        .then(setEmail)
        .catch(() => setError("Invalid or expired password reset link."));
    } else if (!code) {
      setError("Invalid password reset link. Please request a new one.");
>>>>>>> refs/remotes/origin/main
    }
  }, []);

  const validatePassword = (password) => {
<<<<<<< HEAD
    if (password.length < 8) return "Password must be at least 8 characters.";
    if (!/[A-Z]/.test(password)) return "Must include an uppercase letter.";
    if (!/[a-z]/.test(password)) return "Must include a lowercase letter.";
    if (!/\d/.test(password)) return "Must include a number.";
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password))
      return "Must include a special character.";
=======
    if (password.length < 6) return "Password must be at least 6 characters.";
>>>>>>> refs/remotes/origin/main
    return null;
  };

  const handleReset = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!oobCode || !email) {
      setError("Invalid password reset link.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      setError(passwordError);
      return;
    }
    setLoading(true);
    try {
      await confirmPasswordReset(auth, oobCode, newPassword);
<<<<<<< HEAD
      const usersRef = doc(db, "users", email);
      const userDoc = await getDoc(usersRef);
      let passwordHistory = [];
      if (userDoc.exists()) {
        const data = userDoc.data();
=======
      
      // Find user document by email (since ID is UID)
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("email", "==", email));
      const querySnapshot = await getDocs(q);
      
      let userDocRef = null;
      let passwordHistory = [];

      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        userDocRef = userDoc.ref;
        const data = userDoc.data();
        
>>>>>>> refs/remotes/origin/main
        for (const field of PASSWORD_HISTORY_FIELDS) {
          if (Array.isArray(data[field])) {
            passwordHistory = data[field];
            break;
          }
        }
      }
<<<<<<< HEAD
      // Compare new password with previous hashes
      const reused = await Promise.all(
        passwordHistory.map((hash) => bcrypt.compare(newPassword, hash))
      );
      if (reused.includes(true)) {
        setError("You cannot reuse your previous password!");
        setLoading(false);
        return;
      }
      // Update password in Firebase Auth (user must be signed in)
      await signInWithEmailAndPassword(auth, email, newPassword);
      await updatePassword(auth.currentUser, newPassword);
      // Hash new password and update Firestore
      const newHash = await bcrypt.hash(newPassword, 10);
      const updatedHistory = [...passwordHistory, newHash].slice(-5);
      await updateDoc(usersRef, {
        lastPasswords: updatedHistory,
        lastUpdated: new Date().toISOString(),
      });
=======

      // Compare new password with previous hashes
      if (passwordHistory.length > 0) {
        const reused = await Promise.all(
          passwordHistory.map((hash) => bcrypt.compare(newPassword, hash))
        );
        if (reused.includes(true)) {
          setError("You cannot reuse your previous password!");
          setLoading(false);
          return;
        }
      }

      // Update password in Firebase Auth (user must be signed in)
      // Note: confirmPasswordReset already updates the auth password. 
      // We sign in to update Firestore if needed, but we might not need to sign in if we just update the doc via admin SDK? 
      // Client SDK requires auth for write if rules say so.
      // After confirmPasswordReset, the user is NOT automatically signed in.
      await signInWithEmailAndPassword(auth, email, newPassword);
      
      // Hash new password and update Firestore
      if (userDocRef) {
        const newHash = await bcrypt.hash(newPassword, 10);
        const updatedHistory = [...passwordHistory, newHash].slice(-5);
        await updateDoc(userDocRef, {
          lastPasswords: updatedHistory,
          lastUpdated: new Date().toISOString(),
        });
      }
      
>>>>>>> refs/remotes/origin/main
      setSuccess("Password reset successful! You may now log in.");
    } catch (err) {
      setError(err.message || "Password reset failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      maxWidth={400}
      mx="auto"
      my={8}
      p={4}
      borderRadius={2}
      boxShadow={2}
      bgcolor="background.paper"
    >
      <Typography variant="h5" mb={2}>
        Reset Password
      </Typography>
      <Typography variant="body2" mb={3} color="text.secondary">
        Enter a new password. You cannot reuse your previous password.
      </Typography>
      <form onSubmit={handleReset}>
        <TextField
          label="New Password"
          type="password"
          fullWidth
          required
          margin="normal"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
<<<<<<< HEAD
        />
=======
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

>>>>>>> refs/remotes/origin/main
        <TextField
          label="Confirm New Password"
          type="password"
          fullWidth
          required
          margin="normal"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
<<<<<<< HEAD
        />
=======
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

>>>>>>> refs/remotes/origin/main
        {error && (
          <Alert severity="error" sx={{ mt: 1 }}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" sx={{ mt: 1 }}>
            {success}
          </Alert>
        )}
        <Button
          type="submit"
          variant="contained"
          color="primary"
          fullWidth
          sx={{ mt: 2 }}
<<<<<<< HEAD
          disabled={loading}
=======
          disabled={loading || newPassword.length < 6 || newPassword !== confirmPassword}
>>>>>>> refs/remotes/origin/main
        >
          {loading ? <CircularProgress size={24} /> : "Reset Password"}
        </Button>
      </form>
    </Box>
  );
};

export default ResetPassword;
