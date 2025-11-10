import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { getRoleByGroupId, hasPermission } from '../utils/roles';

const ProtectedRoute = ({ requiredPermission }) => {
  const user = useSelector((state) => state.auth.user);
  
  if (!user) {
    return <Navigate to="/login" />;
  }

  const userRole = getRoleByGroupId(user.groupId);
  
  if (requiredPermission && !hasPermission(userRole, requiredPermission)) {
    return <Navigate to="/unauthorized" />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
