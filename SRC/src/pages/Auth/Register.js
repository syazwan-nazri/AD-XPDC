import React, { useState } from "react";
import {
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  CircularProgress,
<<<<<<< HEAD
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from "@mui/material";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../../firebase/config";
import { useNavigate, Link } from "react-router-dom";
import { setDoc, doc } from "firebase/firestore";
import { Roles } from "../../utils/roles";

const Register = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [username, setUsername] = useState("");
  const [groupId, setGroupId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();

    // Validation
    if (!email || !password || !confirmPassword || !username || !groupId) {
      setError("All fields are required");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setError("");
    setLoading(true);

    try {
      // Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      // Create user document in Firestore with groupId
      await setDoc(doc(db, "users", userCredential.user.uid), {
        uid: userCredential.user.uid,
        email: email.toLowerCase(),
        username,
        groupId,
        department: "",
        createdAt: new Date().toISOString(),
        status: "pending", // Admin needs to approve
        passwordHistory: [],
      });

      setLoading(false);
      navigate("/login"); // Redirect to login after registration
    } catch (err) {
      setError(err.message);
=======
} from "@mui/material";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../../firebase/config";
import { useNavigate, Link } from "react-router-dom";

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
      await sendPasswordResetEmail(auth, email);
      setSuccess("Password reset email sent! Please check your inbox.");
      setTimeout(() => {
        navigate("/login");
      }, 3000);
    } catch (err) {
      setError(err.message);
    } finally {
>>>>>>> refs/remotes/origin/main
      setLoading(false);
    }
  };

  return (
    <Box
<<<<<<< HEAD
      maxWidth={400}
=======
      maxWidth={360}
>>>>>>> refs/remotes/origin/main
      mx="auto"
      my={8}
      p={4}
      borderRadius={2}
      boxShadow={2}
      bgcolor="background.paper"
    >
      <Typography variant="h5" mb={2}>
<<<<<<< HEAD
        Register
      </Typography>
      <form onSubmit={handleRegister}>
=======
        Forgot Password
      </Typography>
      <Typography variant="body2" mb={3} color="text.secondary">
        Enter your email address and we'll send you a link to reset your
        password.
      </Typography>
      <form onSubmit={handleForgotPassword}>
>>>>>>> refs/remotes/origin/main
        <TextField
          label="Email"
          type="email"
          fullWidth
          required
          margin="normal"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
<<<<<<< HEAD
        <TextField
          label="Username"
          fullWidth
          required
          margin="normal"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <FormControl fullWidth margin="normal" required>
          <InputLabel>User Group</InputLabel>
          <Select
            value={groupId}
            label="User Group"
            onChange={(e) => setGroupId(e.target.value)}
          >
            {Object.values(Roles).map((role) => (
              <MenuItem key={role.groupId} value={role.groupId}>
                {role.name} ({role.groupId})
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField
          label="Password"
          type="password"
          fullWidth
          required
          margin="normal"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <TextField
          label="Confirm Password"
          type="password"
          fullWidth
          required
          margin="normal"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
=======
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
>>>>>>> refs/remotes/origin/main
        <Button
          type="submit"
          variant="contained"
          color="primary"
          fullWidth
          sx={{ mt: 2 }}
          disabled={loading}
        >
          {loading ? <CircularProgress size={24} /> : "Register"}
        </Button>
        <Typography mt={2} textAlign="center">
          Already have an account?{" "}
          <Button component={Link} to="/login" size="small">
            Login
          </Button>
        </Typography>
      </form>
    </Box>
  );
};

export default Register;
