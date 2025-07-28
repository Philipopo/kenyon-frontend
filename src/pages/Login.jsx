import React, { useState, useEffect } from 'react';
import { Box, Typography, TextField, Button, Link, Paper, InputAdornment, IconButton, CircularProgress, Checkbox, FormControlLabel, Alert } from '@mui/material';
import { Visibility, VisibilityOff, Lock, Email } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import API from '../api';


export default function Signin() {


  const theme = useTheme();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [errors, setErrors] = useState({
    email: false,
    password: false
  });
  useEffect(() => {
  const remembered = localStorage.getItem('rememberedEmail');
  if (remembered) {
    setFormData(prev => ({ ...prev, email: remembered }));
    setRememberMe(true);
  }
  }, []);
  const [loginError, setLoginError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear errors when typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: false
      }));
    }
    if (loginError) setLoginError('');
  };

  const validateForm = () => {
    const newErrors = {
      email: !formData.email || !/^\S+@\S+\.\S+$/.test(formData.email),
      password: !formData.password || formData.password.length < 6
    };
    setErrors(newErrors);
    return !Object.values(newErrors).some(error => error);
  };

const handleSubmit = async (e) => {
  e.preventDefault();
  if (!validateForm()) return;

  setLoading(true);
  setLoginError('');

  try {
    console.log('📤 Sending login request with:', formData);

    const response = await API.post('auth/login/', {
      email: formData.email,
      password: formData.password,
    });

    console.log('✅ Login successful. Response:', response.data);

    const { access, refresh } = response.data;

    if (!access || !refresh) {
      console.warn('⚠️ Tokens missing in response');
      throw new Error('Login failed. No token returned.');
    }

    localStorage.setItem('accessToken', access);
    localStorage.setItem('refreshToken', refresh);
    localStorage.setItem('userEmail', formData.email);

    if (rememberMe) {
      localStorage.setItem('rememberedEmail', formData.email);
    } else {
      localStorage.removeItem('rememberedEmail');
    }

    // Optionally fetch user info
    const userResponse = await API.get('auth/me/', {
      headers: {
        Authorization: `Bearer ${access}`,
      },
    });

    console.log('👤 User Info:', userResponse.data);

    navigate('/dashboard');
  } catch (err) {
    console.error('❌ Login error:', err);

    if (err.response) {
      console.log('🛑 Backend returned:', err.response.data);
      setLoginError(
        err.response.data?.detail ||
        'Invalid email or password. Please try again.'
      );
    } else if (err.request) {
      console.warn('⚠️ Request was made but no response received:', err.request);
      setLoginError('No response from server. Please check your connection.');
    } else {
      setLoginError('Something went wrong. Please try again.');
    }
  } finally {
    setLoading(false);
  }
};



  
  return (
    <Box
      sx={{
        display: 'flex',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
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
          <Box textAlign="center" mb={2}>
            <Typography 
              variant="h4" 
              component="h1" 
              fontWeight="700" 
              color="primary"
              gutterBottom
            >
              Welcome Back
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Sign in to continue to your account
            </Typography>
          </Box>

          {loginError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {loginError}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              <TextField
                fullWidth
                label="Email Address"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                error={errors.email}
                helperText={errors.email ? 'Please enter a valid email' : ''}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Email color={errors.email ? 'error' : 'action'} />
                    </InputAdornment>
                  )
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 1,
                    '& fieldset': {
                      borderColor: errors.email ? theme.palette.error.main : ''
                    }
                  }
                }}
              />

              <TextField
                fullWidth
                label="Password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={handleChange}
                error={errors.password}
                helperText={errors.password ? 'Password must be at least 6 characters' : ''}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Lock color={errors.password ? 'error' : 'action'} />
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
                      borderColor: errors.password ? theme.palette.error.main : ''
                    }
                  }
                }}
              />

              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      color="primary"
                    />
                  }
                  label="Remember me"
                />
                <Link
                  href="/forgot-password"
                  variant="body2"
                  underline="hover"
                  color="text.secondary"
                >
                  Forgot password?
                </Link>
              </Box>

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
                  'Sign In'
                )}
              </Button>
            </Box>
          </form>
        </Paper>
      </motion.div>
    </Box>
  );
};
