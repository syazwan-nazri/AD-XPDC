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
  confirmPasswordReset,
  verifyPasswordResetCode,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { auth, db } from "../../firebase/config";
import { useNavigate, useLocation } from "react-router-dom";
import { doc, updateDoc, arrayUnion, getDoc } from "firebase/firestore";
import * as bcrypt from "bcryptjs";
import { getUserDocByEmail } from "../../utils/userManagement";

const ResetPassword = () => {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  // Get the oobCode from URL parameters
  const queryParams = new URLSearchParams(location.search);
  const oobCode = queryParams.get("oobCode");

  useEffect(() => {
    const verifyCode = async () => {
      if (!oobCode) {
        setError("Invalid password reset link");
        return;
      }

      try {
        const email = await verifyPasswordResetCode(auth, oobCode);
        setEmail(email);
      } catch (error) {
        setError("This password reset link is invalid or has expired.");
      }
    };

    verifyCode();
  }, [oobCode]);

  const validatePassword = (password) => {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (password.length < minLength) {
      return "Password must be at least 8 characters long";
    }
    if (!hasUpperCase) {
      return "Password must contain at least one uppercase letter";
    }
    if (!hasLowerCase) {
      return "Password must contain at least one lowercase letter";
    }
    if (!hasNumbers) {
      return "Password must contain at least one number";
    }
    if (!hasSpecialChar) {
      return "Password must contain at least one special character";
    }

    return null;
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    setError("");
    setLoading(true);

    try {
      // Try to verify current password is not being reused
      try {
        await signInWithEmailAndPassword(auth, email, newPassword);
        // If login successful, it means the password is the same as current
        setError("New password must be different from your current password");
        setLoading(false);
        return;
      } catch (loginError) {
        // Login failed, which is good - means password is different
      }

      // Get user document from Firestore
      const userDoc = await getUserDocByEmail(email);

      if (userDoc) {
        const userData = userDoc.data();
        const passwordHistory = userData.passwordHistory || [];

        // Check if new password matches any of the previous passwords
        const isPasswordReused = await Promise.all(
          passwordHistory.map(async (hashedPassword) => {
            return await bcrypt.compare(newPassword, hashedPassword);
          })
        );

        if (isPasswordReused.includes(true)) {
          setError(
            "Cannot reuse a previous password. Please choose a different password."
          );
          setLoading(false);
          return;
        }

        // Hash the new password for storage
        const hashedNewPassword = await bcrypt.hash(newPassword, 10);

        // Complete the password reset
        await confirmPasswordReset(auth, oobCode, newPassword);

        // Update password history in Firestore
        // Keep only the last 5 passwords in history
        const updatedHistory = [...passwordHistory, hashedNewPassword].slice(
          -5
        );
        await updateDoc(doc(db, "users", userDoc.id), {
          passwordHistory: updatedHistory,
          lastPasswordChange: new Date().toISOString(),
        });

        setSuccess("Password has been reset successfully!");
        setTimeout(() => {
          navigate("/login");
        }, 2000);
      } else {
        setError("User not found");
      }
    } catch (error) {
      console.error("Reset password error:", error);
      if (error.code === "auth/expired-action-code") {
        setError(
          "This password reset link has expired. Please request a new one."
        );
      } else if (error.code === "auth/weak-password") {
        setError("Password is too weak. Please choose a stronger password.");
      } else {
        setError(error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      maxWidth={360}
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
        Please enter your new password. The password must:
        <ul>
          <li>Be at least 8 characters long</li>
          <li>Include at least one uppercase letter</li>
          <li>Include at least one lowercase letter</li>
          <li>Include at least one number</li>
          <li>Include at least one special character</li>
        </ul>
      </Typography>
      <form onSubmit={handleResetPassword}>
        <TextField
          label="New Password"
          type="password"
          fullWidth
          required
          margin="normal"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
        <TextField
          label="Confirm New Password"
          type="password"
          fullWidth
          required
          margin="normal"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
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
          disabled={loading || !oobCode}
        >
          {loading ? <CircularProgress size={24} /> : "Reset Password"}
        </Button>
      </form>
    </Box>
  );
};

export default ResetPassword;
