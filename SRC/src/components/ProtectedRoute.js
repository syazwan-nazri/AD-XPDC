import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { checkAccess } from '../utils/roles';

const ProtectedRoute = ({ resourceId, requiredLevel = 'view' }) => {
  const user = useSelector((state) => state.auth.user);

  if (!user) {
    return <Navigate to="/login" />;
  }

  // If a specific resource ID is required, check access
  if (resourceId && !checkAccess(user, resourceId, requiredLevel)) {
    return <Navigate to="/" replace />; // Redirect to home/dashboard if unauthorized
  }

  return <Outlet />;
};

export default ProtectedRoute;
