// src/pages/auth/Signin.jsx
import React, { useState, useEffect } from 'react';
import { Box, Typography, TextField, Button, Link, Paper, InputAdornment, IconButton, CircularProgress, Checkbox, FormControlLabel, Alert } from '@mui/material';
import { Visibility, VisibilityOff, Lock, Email, VpnKey } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import API from '../api';
import logo from '../assets/kenyon_logo-removebg-preview.png';

export default function Signin() {
  const theme = useTheme();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [isTwoFactor, setIsTwoFactor] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    otp: '',
    session_id: ''
  });
  const [errors, setErrors] = useState({
    email: false,
    password: false,
    otp: false
  });
  const [loginError, setLoginError] = useState('');
  const [forgotPasswordError, setForgotPasswordError] = useState('');
  const [forgotPasswordSuccess, setForgotPasswordSuccess] = useState('');
  const [otpError, setOtpError] = useState('');

  useEffect(() => {
    const remembered = localStorage.getItem('rememberedEmail');
    if (remembered) {
      setFormData(prev => ({ ...prev, email: remembered }));
      setRememberMe(true);
    }
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: false
      }));
    }
    if (loginError) setLoginError('');
    if (forgotPasswordError) setForgotPasswordError('');
    if (forgotPasswordSuccess) setForgotPasswordSuccess('');
    if (otpError) setOtpError('');
  };

  const validateLoginForm = () => {
    const newErrors = {
      email: !formData.email || !/^\S+@\S+\.\S+$/.test(formData.email),
      password: !formData.password || formData.password.length < 6,
      otp: false
    };
    setErrors(newErrors);
    return !Object.values(newErrors).some(error => error);
  };

  const validateForgotPasswordForm = () => {
    const newErrors = {
      email: !formData.email || !/^\S+@\S+\.\S+$/.test(formData.email),
      password: false,
      otp: false
    };
    setErrors(newErrors);
    return !newErrors.email;
  };

  const validateOTPForm = () => {
    const newErrors = {
      email: !formData.email || !/^\S+@\S+\.\S+$/.test(formData.email),
      password: false,
      otp: !formData.otp || formData.otp.length !== 6
    };
    setErrors(newErrors);
    return !Object.values(newErrors).some(error => error);
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!validateLoginForm()) return;

    setLoading(true);
    setLoginError('');

    try {
      const response = await API.post('auth/login/', {
        email: formData.email,
        password: formData.password,
        ...(formData.session_id && { session_id: formData.session_id })
      });

      if (response.data.two_factor_required) {
        setIsTwoFactor(true);
        setFormData(prev => ({ ...prev, session_id: response.data.session_id }));
        setLoading(false);
        return;
      }

      const { access, refresh } = response.data;

      if (!access || !refresh) {
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

      const userResponse = await API.get('auth/me/', {
        headers: { Authorization: `Bearer ${access}` },
      });

      navigate('/dashboard');
    } catch (err) {
      setLoginError(
        err.response?.data?.detail ||
        'Invalid email or password. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!validateForgotPasswordForm()) return;

    setLoading(true);
    setForgotPasswordError('');
    setForgotPasswordSuccess('');

    try {
      const response = await API.post('auth/forgot-password/', {
        email: formData.email
      });
      setForgotPasswordSuccess(response.data.detail || 'Password reset email sent.');
      setFormData({ email: '', password: '', otp: '', session_id: '' });
    } catch (err) {
      setForgotPasswordError(
        err.response?.data?.detail ||
        'Failed to send reset email. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleOTPSubmit = async (e) => {
    e.preventDefault();
    if (!validateOTPForm()) return;

    setLoading(true);
    setOtpError('');

    try {
      const response = await API.post('auth/verify-otp/', {
        email: formData.email,
        code: formData.otp,
        session_id: formData.session_id
      });

      const { access, refresh } = response.data;

      localStorage.setItem('accessToken', access);
      localStorage.setItem('refreshToken', refresh);
      localStorage.setItem('userEmail', formData.email);

      if (rememberMe) {
        localStorage.setItem('rememberedEmail', formData.email);
      } else {
        localStorage.removeItem('rememberedEmail');
      }

      const userResponse = await API.get('auth/me/', {
        headers: { Authorization: `Bearer ${access}` },
      });

      navigate('/dashboard');
    } catch (err) {
      setOtpError(
        err.response?.data?.detail ||
        'Invalid or expired OTP. Please try again.'
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
              {isForgotPassword ? 'Reset Your Password' : isTwoFactor ? 'Enter OTP' : 'Welcome Back'}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {isForgotPassword ? 'Enter your email to receive a password reset link' :
               isTwoFactor ? 'Enter the OTP sent to your email' : 'Sign in to continue to your account'}
            </Typography>
          </Box>

          {loginError && !isForgotPassword && !isTwoFactor && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {loginError}
            </Alert>
          )}
          {forgotPasswordError && isForgotPassword && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {forgotPasswordError}
            </Alert>
          )}
          {forgotPasswordSuccess && isForgotPassword && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {forgotPasswordSuccess}
            </Alert>
          )}
          {otpError && isTwoFactor && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {otpError}
            </Alert>
          )}

          <form onSubmit={isTwoFactor ? handleOTPSubmit : isForgotPassword ? handleForgotPasswordSubmit : handleLoginSubmit}>
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
                disabled={isTwoFactor}
              />

              {!isForgotPassword && !isTwoFactor && (
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
              )}

              {isTwoFactor && (
                <TextField
                  fullWidth
                  label="One-Time Password"
                  name="otp"
                  value={formData.otp}
                  onChange={handleChange}
                  error={errors.otp}
                  helperText={errors.otp ? 'OTP must be 6 digits' : ''}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <VpnKey color={errors.otp ? 'error' : 'action'} />
                      </InputAdornment>
                    )
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 1,
                      '& fieldset': {
                        borderColor: errors.otp ? theme.palette.error.main : ''
                      }
                    }
                  }}
                />
              )}

              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                {!isForgotPassword && !isTwoFactor && (
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
                )}
                <Link
                  href="#"
                  variant="body2"
                  underline="hover"
                  color="text.secondary"
                  onClick={(e) => {
                    e.preventDefault();
                    if (isTwoFactor) {
                      setIsTwoFactor(false);
                      setFormData(prev => ({ ...prev, otp: '', session_id: '' }));
                      setOtpError('');
                    } else {
                      setIsForgotPassword(!isForgotPassword);
                      setFormData(prev => ({ ...prev, password: '', otp: '', session_id: '' }));
                      setErrors({ email: false, password: false, otp: false });
                      setLoginError('');
                      setForgotPasswordError('');
                      setForgotPasswordSuccess('');
                      setOtpError('');
                    }
                  }}
                >
                  {isTwoFactor ? 'Back to Sign In' : isForgotPassword ? 'Back to Sign In' : 'Forgot password?'}
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
                ) : isTwoFactor ? (
                  'Verify OTP'
                ) : isForgotPassword ? (
                  'Send Reset Link'
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
}