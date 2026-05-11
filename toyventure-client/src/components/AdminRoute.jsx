import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useGetUserProfileQuery } from '../features/api/apiSlice';

const AdminRoute = () => {
  // Use your RTK Query hook to get the user's profile data
  const { data: userInfo, isLoading } = useGetUserProfileQuery();

  // While the API is checking who the user is, show a loading state
  // so it doesn't instantly kick them out before the data arrives
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600"></div>
      </div>
    );
  }

  // Once data arrives, check if user exists AND is an admin
  const isUserAdmin = userInfo && userInfo.role === 'admin';

  // Render the requested admin page (Outlet) or redirect to Home
  return isUserAdmin ? (
    <Outlet />
  ) : (
    <Navigate to="/" replace />
  );
};

export default AdminRoute;