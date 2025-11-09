import React, { useState } from 'react';
import { TextField, Button, Typography, Box, Alert, CircularProgress, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../../firebase/config';
import { useNavigate, Link } from 'react-router-dom';
import { collection, setDoc, doc } from 'firebase/firestore';
import { Roles } from '../../utils/roles';
// Optionally: import Redux and dispatch setUser if you'd like to store logged in user

const Register = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [groupId, setGroupId] = useState('');
  const [userGroups, setUserGroups] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Use predefined roles instead of fetching from database
  useState(() => {
    setUserGroups(Object.values(Roles));
  }, []);

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!email || !password || !username || !groupId) {
      setError('All fields are required');
      return;
    }
    setError('');
    setLoading(true);
    try {
      // Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Create user document in Firestore
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        email,
        username,
        groupId,
        createdAt: new Date().toISOString(),
        status: 'pending' // Admin needs to approve
      });

      setLoading(false);
      navigate('/login'); // Redirect to login after registration
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <Box maxWidth={360} mx="auto" my={8} p={4} borderRadius={2} boxShadow={2} bgcolor="background.paper">
      <Typography variant="h5" mb={2}>Register</Typography>
      <form onSubmit={handleRegister}>
        <TextField
          label="Email"
          type="email"
          fullWidth
          required
          margin="normal"
          value={email}
          onChange={e => setEmail(e.target.value)}
        />
        <TextField
          label="Password"
          type="password"
          fullWidth
          required
          margin="normal"
          value={password}
          onChange={e => setPassword(e.target.value)}
        />
        <TextField
          label="Username"
          fullWidth
          required
          margin="normal"
          value={username}
          onChange={e => setUsername(e.target.value)}
        />
        <FormControl fullWidth margin="normal" required>
          <InputLabel>User Group</InputLabel>
          <Select
            value={groupId}
            label="User Group"
            onChange={e => setGroupId(e.target.value)}
          >
            {Object.values(Roles).map(role => (
              <MenuItem key={role.groupId} value={role.groupId}>
                {role.name} ({role.groupId})
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        {error && <Alert severity="error" sx={{ mt: 1 }}>{error}</Alert>}
        <Button
          type="submit"
          variant="contained"
          color="primary"
          fullWidth
          sx={{ mt: 2 }}
          disabled={loading}
        >
          {loading ? <CircularProgress size={24} /> : 'Register'}
        </Button>
        <Typography mt={2} textAlign="center">
          Already have an account?{' '}
          <Button component={Link} to="/login" size="small">Login</Button>
        </Typography>
      </form>
    </Box>
  );
};

export default Register;
