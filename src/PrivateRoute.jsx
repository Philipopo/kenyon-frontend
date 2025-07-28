import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

const isAuthenticated = () => {
  const token = localStorage.getItem('accessToken');
  return !!token;
};

const PrivateRoute = () => {
  return isAuthenticated() ? <Outlet /> : <Navigate to="/login" />;
};

export default PrivateRoute;
