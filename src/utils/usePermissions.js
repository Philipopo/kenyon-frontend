// src/utils/usePermissions.js
import { useState, useEffect } from 'react';
import api from '../api';

export const usePermissions = (pageName, actionName) => {
  const [userRole, setUserRole] = useState(null);
  const [hasPageAccess, setHasPageAccess] = useState(false);
  const [canPerformAction, setCanPerformAction] = useState(false);
  const [error, setError] = useState('');

  const roleHierarchy = {
    staff: 1,
    finance_manager: 2,
    operations_manager: 3,
    md: 4,
    admin: 5,
  };

  useEffect(() => {
    const fetchPermissions = async () => {
      try {
        // Fetch user role
        const userRes = await api.get('auth/me');
        const role = userRes.data.role;
        setUserRole(role);

        // Check page permission
        try {
          const pageRes = await api.get(`permissions/page/${pageName}/`);
          setHasPageAccess(pageRes.data.allowed || false);
          if (!pageRes.data.allowed) {
            setError(`⚠ Access denied: ${pageRes.data.reason || 'No reason provided'}`);
          }
        } catch (pageErr) {
          console.error('❌ Error fetching page permission:', pageErr);
          if (pageErr.response?.status === 404) {
            setError(`Page permission endpoint for '${pageName}' not found. Check backend configuration.`);
          } else {
            setError(pageErr.response?.data?.reason || 'Failed to load page permissions.');
          }
          setHasPageAccess(false);
        }

        // Check action permission if provided
        if (actionName) {
          try {
            const actionRes = await api.get(`permissions/action/${actionName}/`);
            setCanPerformAction(actionRes.data.allowed || false);
            if (!actionRes.data.allowed && !error) {
              setError(`⚠ Action denied: ${actionRes.data.reason || 'No reason provided'}`);
            }
          } catch (actionErr) {
            console.error('❌ Error fetching action permission:', actionErr);
            if (actionErr.response?.status === 404) {
              setError(`Action permission endpoint for '${actionName}' not found. Check backend configuration.`);
            } else {
              setError(actionErr.response?.data?.reason || 'Failed to load action permissions.');
            }
            setCanPerformAction(false);
          }
        } else {
          setCanPerformAction(true); // No action check needed
        }
      } catch (err) {
        console.error('❌ Error fetching user role:', err);
        setError(err.response?.data?.detail || 'Failed to load user role.');
        setHasPageAccess(false);
        setCanPerformAction(false);
      }
    };

    fetchPermissions();
  }, [pageName, actionName]);

  return { userRole, hasPageAccess, canPerformAction, error };
};