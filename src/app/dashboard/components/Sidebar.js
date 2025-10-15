import React from 'react';
import { ChevronLeft, ChevronRight, Home, MessageSquare, Users, User, Sparkles, Settings } from 'lucide-react';

const Sidebar = ({ 
  sidebarOpen, 
  setSidebarOpen, 
  activeSection, 
  setActiveSection,
  navigationItems,
  userHasBudget,
  userHasGoals,
  userHasDebtGoals,
  onCreateGoal,
  onEditBudget,
  onBudgetTemplate,
  onManageGoals,
  hideQuickActions = false
}) => {
  return (
    <div className={`${sidebarOpen ? 'w-64' : 'w-16'} transition-all duration-300 bg-white shadow-lg`}>
      <div className="flex flex-col h-full">
        {/* Sidebar Header */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <h2 className={`font-bold text-xl text-gray-900 ${!sidebarOpen && 'hidden'}`}>
              FreedomLedger
            </h2>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-lg hover:bg-gray-100"
            >
              {sidebarOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
            </button>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 p-4">
          {navigationItems.map((item) => (
            item.show && (
              <button
                key={item.id}
                onClick={() => {
                  setActiveSection(item.id);
                  // Update URL hash for shareable links
                  window.history.pushState(null, '', `#${item.id}`);
                  if (item.id === 'dashboard') {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }
                }}
                className={`w-full flex items-center gap-3 p-3 rounded-lg mb-2 transition-colors
                ${activeSection === item.id
                    ? 'bg-blue-50 text-blue-600'
                    : 'hover:bg-gray-100 text-gray-800'}`}
              >
                <item.icon size={20} />
                {sidebarOpen && <span className="font-medium">{item.label}</span>}
              </button>
            )
          ))}
        </nav>

        {/* Quick Actions in Sidebar */}
        {sidebarOpen && !hideQuickActions && (
          <div className="p-4 border-t">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Quick Actions</p>
            <div className="space-y-2">
              <button
                onClick={onCreateGoal}
                className="w-full text-left text-sm text-gray-700 hover:text-blue-600 transition-colors"
              >
                + Add Goal
              </button>
              <button
                onClick={onEditBudget}
                className="w-full text-left text-sm text-gray-700 hover:text-blue-600 transition-colors"
              >
                {userHasBudget ? '✏ Edit Budget' : '+ Create Budget'}
              </button>
              {userHasGoals && (
                <button
                  onClick={onBudgetTemplate}
                  className="w-full text-left text-sm text-gray-700 hover:text-blue-600 transition-colors flex items-center gap-1"
                >
                  <Sparkles size={12} className="inline" />
                  Smart Budgets
                </button>
              )}
              {(userHasGoals || userHasDebtGoals) && (
                <button
                  onClick={onManageGoals}
                  className="w-full text-left text-sm text-gray-700 hover:text-blue-600 transition-colors"
                >
                  <Settings size={12} className="inline mr-1" />
                  Manage Goals
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;