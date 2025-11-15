import React, { useState } from "react";
import {
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  CircularProgress,
} from "@mui/material";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../firebase/config";
import { useNavigate, Link } from "react-router-dom";
import { useDispatch } from "react-redux";
import { setUser } from "../../redux/authSlice";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      dispatch(
        setUser({
          email: result.user.email,
          uid: result.user.uid,
        })
      );
      setLoading(false);
      navigate("/"); // Redirect to homepage/dashboard after login
    } catch (err) {
      setLoading(false);
      // Handle specific Firebase authentication errors with user-friendly messages
      let errorMessage = "An error occurred during login. Please try again.";
      
      switch (err.code) {
        case "auth/invalid-credential":
        case "auth/wrong-password":
          errorMessage = "Incorrect password. Please try again or use 'Forgot Password?' to reset it.";
          break;
        case "auth/user-not-found":
          errorMessage = "No account found with this email address.";
          break;
        case "auth/invalid-email":
          errorMessage = "Invalid email address. Please check and try again.";
          break;
        case "auth/user-disabled":
          errorMessage = "This account has been disabled. Please contact support.";
          break;
        case "auth/too-many-requests":
          errorMessage = "Too many failed login attempts. Please try again later.";
          break;
        case "auth/network-request-failed":
          errorMessage = "Network error. Please check your internet connection and try again.";
          break;
        default:
          // For other errors, use a more user-friendly message if available
          if (err.message) {
            errorMessage = err.message;
          }
      }
      
      setError(errorMessage);
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
        Login to SIMS
      </Typography>
      <form onSubmit={handleSubmit}>
        <TextField
          label="Email"
          type="email"
          fullWidth
          required
          margin="normal"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <TextField
          label="Password"
          type="password"
          fullWidth
          required
          margin="normal"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && (
          <Alert severity="error" sx={{ mt: 1 }}>
            {error}
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
          {loading ? <CircularProgress size={24} /> : "Login"}
        </Button>
        <Box display="flex" justifyContent="center" mt={2}>
          <Button
            component={Link}
            to="/forgot-password"
            size="small"
            color="primary"
          >
            Forgot Password?
          </Button>
        </Box>
      </form>
    </Box>
  );
};

export default Login;
