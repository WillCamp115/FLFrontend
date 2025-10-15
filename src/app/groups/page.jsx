'use client';

import React from 'react';
import GroupsSection from '../components/sections/GroupsSection';

const GroupsPage = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Groups</h1>
          <p className="mt-2 text-gray-600">
            Manage your group memberships and collaborative budgeting with shared bank accounts.
          </p>
        </div>
        
        <GroupsSection />
      </div>
    </div>
  );
};

export default GroupsPage;