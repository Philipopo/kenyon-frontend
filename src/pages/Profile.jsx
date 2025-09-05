// src/pages/Profile.jsx
import React, { useState, useEffect } from 'react';
import { Box, Typography, TextField, Button, Paper, FormControlLabel, Checkbox, CircularProgress, Alert } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import API from '../api';

export default function Profile() {
  const theme = useTheme();
  const navigate = useNavigate();
  const [profileData, setProfileData] = useState({
    email: '',
    name: '',
    full_name: '',
    role: '',
    two_factor_enabled: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await API.get('auth/profile/', {
          headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
        });
        setProfileData(response.data);
      } catch (err) {
        setError('Failed to load profile.');
      }
    };
    fetchProfile();
  }, []);

  const handleChange = (e) => {
    const { name, value, checked, type } = e.target;
    setProfileData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    if (error) setError('');
    if (success) setSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await API.patch('auth/profile/', {
        full_name: profileData.full_name,
        two_factor_enabled: profileData.two_factor_enabled
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
      });
      setSuccess('Profile updated successfully.');
      setProfileData(response.data);
    } catch (err) {
      setError('Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 4, maxWidth: 600, mx: 'auto' }}>
      <Paper elevation={3} sx={{ p: 4, borderRadius: 2 }}>
        <Typography variant="h4" gutterBottom>
          Profile
        </Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
        <form onSubmit={handleSubmit}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Email"
              value={profileData.email}
              disabled
              fullWidth
            />
            <TextField
              label="Name"
              value={profileData.name}
              disabled
              fullWidth
            />
            <TextField
              label="Full Name"
              name="full_name"
              value={profileData.full_name}
              onChange={handleChange}
              fullWidth
            />
            <TextField
              label="Role"
              value={profileData.role}
              disabled
              fullWidth
            />
            <FormControlLabel
              control={
                <Checkbox
                  name="two_factor_enabled"
                  checked={profileData.two_factor_enabled}
                  onChange={handleChange}
                  color="primary"
                />
              }
              label="Enable Two-Factor Authentication"
            />
            <Button
              type="submit"
              variant="contained"
              disabled={loading}
              sx={{ mt: 2 }}
            >
              {loading ? <CircularProgress size={24} /> : 'Save Changes'}
            </Button>
          </Box>
        </form>
      </Paper>
    </Box>
  );
}