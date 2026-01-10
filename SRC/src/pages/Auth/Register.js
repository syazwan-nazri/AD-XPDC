import React, { useState, useEffect } from "react";
import {
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  CircularProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from "@mui/material";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../../firebase/config";
import { useNavigate, Link } from "react-router-dom";
import { setDoc, doc, collection, getDocs, query } from "firebase/firestore";

const Register = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [username, setUsername] = useState("");
  const [groupId, setGroupId] = useState("");
  const [userGroups, setUserGroups] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Fetch groups dynamically from Firestore
  useEffect(() => {
    const fetchUserGroups = async () => {
      try {
        const q = query(collection(db, "groups"));
        const snapshot = await getDocs(q);
        const groups = snapshot.docs.map(doc => ({
          groupId: doc.id,
          ...doc.data()
        }));
        setUserGroups(groups);
      } catch (err) {
        console.error("Failed to fetch user groups", err);
      }
    };
    fetchUserGroups();
  }, []);

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
        Register
      </Typography>
      <form onSubmit={handleRegister}>
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
            {userGroups.map((group) => (
              <MenuItem key={group.groupId} value={group.groupId}>
                {group.name || group.groupName || group.groupId} ({group.groupId})
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
