// src/PrivateRoute.jsx
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

const isTokenValid = () => {
  const token = localStorage.getItem('accessToken');
  if (!token) return false;

  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 > Date.now(); // true if not expired
  } catch (e) {
    return false; // invalid token
  }
};

const PrivateRoute = () => {
  return isTokenValid() ? <Outlet /> : <Navigate to="/login" replace />;
};

export default PrivateRoute;