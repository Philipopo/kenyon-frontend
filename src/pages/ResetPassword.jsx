// src/pages/auth/ResetPassword.jsx
import React, { useState } from 'react';
import { Box, Typography, TextField, Button, Paper, InputAdornment, IconButton, CircularProgress, Alert } from '@mui/material';
import { Lock, Visibility, VisibilityOff } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import API from '../api';
import logo from '../assets/kenyon_logo-removebg-preview.png';

export default function ResetPassword() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { uid, token } = useParams();
  const [formData, setFormData] = useState({ new_password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e) => {
    setFormData({ new_password: e.target.value });
    if (error) setError('');
    if (success) setSuccess('');
  };

  const validateForm = () => {
    return formData.new_password.length >= 6;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await API.post('auth/reset-password/', {
        new_password: formData.new_password,
        token,
        uid
      });
      setSuccess(response.data.detail || 'Password reset successfully.');
      setTimeout(() => navigate('/signin'), 2000);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        'Failed to reset password. The link may be invalid or expired.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #060c15ff 0%, #c3cfe2 100%)',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Paper
          elevation={6}
          sx={{
            width: '100%',
            maxWidth: 450,
            p: 4,
            borderRadius: 3,
            display: 'flex',
            flexDirection: 'column',
            gap: 3
          }}
        >
          <Box sx={{ textAlign: 'center', mb: 2 }}>
            <img
              src={logo}
              alt="Kenyon Logo"
              style={{
                width: '80px',
                height: '80px',
                objectFit: 'contain',
                marginBottom: '16px'
              }}
            />
            <Typography
              variant="h4"
              component="h1"
              fontWeight="700"
              color="primary"
              gutterBottom
            >
              Reset Password
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Enter your new password
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          {success && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {success}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              <TextField
                fullWidth
                label="New Password"
                name="new_password"
                type={showPassword ? 'text' : 'password'}
                value={formData.new_password}
                onChange={handleChange}
                error={!!error}
                helperText={error || ''}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Lock color={error ? 'error' : 'action'} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  )
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 1,
                    '& fieldset': {
                      borderColor: error ? theme.palette.error.main : ''
                    }
                  }
                }}
              />

              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={loading}
                sx={{
                  py: 1.5,
                  borderRadius: 1,
                  textTransform: 'none',
                  fontSize: '1rem',
                  fontWeight: 600,
                  boxShadow: 'none',
                  '&:hover': {
                    boxShadow: 'none',
                    backgroundColor: theme.palette.primary.dark
                  }
                }}
              >
                {loading ? (
                  <CircularProgress size={24} color="inherit" />
                ) : (
                  'Reset Password'
                )}
              </Button>
            </Box>
          </form>
        </Paper>
      </motion.div>
    </Box>
  );
}