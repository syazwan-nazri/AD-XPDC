import React, { useState } from "react";
import {
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  CircularProgress,
} from "@mui/material";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth, db } from "../../firebase/config";
import { useNavigate, Link } from "react-router-dom";
import { collection, query, where, getDocs } from "firebase/firestore";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!email) {
      setError("Email is required");
      return;
    }
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      // Check if email exists in the users collection
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("email", "==", email.toLowerCase()));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setError(
          "No account found with this email address. Please contact your system administrator."
        );
        setLoading(false);
        return;
      }

      // If email exists, send the reset link
      // Firebase will send an email with a link to their action handler
      // which will then redirect to our continueUrl after the user clicks the link
      await sendPasswordResetEmail(auth, email, {
        url: window.location.origin + "/login", // Where to redirect after clicking the email link
        handleCodeInApp: false, // Let Firebase handle the initial click
      });
      setSuccess(
        "Password reset email sent! Please check your inbox and spam folder."
      );
      setTimeout(() => {
        navigate("/login");
      }, 3000);
    } catch (err) {
      if (err.code === "auth/user-not-found") {
        setError(
          "No account found with this email address. Please contact your system administrator."
        );
      } else {
        setError(err.message);
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
        Forgot Password
      </Typography>
      <Typography variant="body2" mb={3} color="text.secondary">
        Enter your email address and we'll send you a link to reset your
        password.
      </Typography>
      <form onSubmit={handleForgotPassword}>
        <TextField
          label="Email"
          type="email"
          fullWidth
          required
          margin="normal"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
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
          disabled={loading}
        >
          {loading ? <CircularProgress size={24} /> : "Send Reset Link"}
        </Button>
        <Typography mt={2} textAlign="center">
          Remember your password?{" "}
          <Button component={Link} to="/login" size="small">
            Back to Login
          </Button>
        </Typography>
      </form>
    </Box>
  );
};

export default ForgotPassword;
