import React from 'react';

const DashboardHeader = ({ userData }) => {
  return (
    <div className="mb-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome back, {userData?.firstname || 'User'}!
        </h1>
        <p className="text-gray-700 mt-2">Track your budget, goals, and spending in one place</p>
      </div>
    </div>
  );
};

export default DashboardHeader;