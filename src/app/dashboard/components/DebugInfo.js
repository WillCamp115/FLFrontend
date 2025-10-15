import React from 'react';

const DebugInfo = ({ budgets, goals, debtGoals, userHasBudget, userHasGoals, userHasDebtGoals }) => {
  return (
    <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm">
      <p>Debug - Section Visibility:</p>
      <p>Budget Section: {userHasBudget ? 'VISIBLE' : 'HIDDEN'} (budgets: {budgets.length}, valid: {budgets.filter(b => b && b.budget).length})</p>
      <p>Goals Section: {userHasGoals ? 'VISIBLE' : 'HIDDEN'} (goals: {goals.length})</p>
      <p>Debt Section: {userHasDebtGoals ? 'VISIBLE' : 'HIDDEN'} (debt goals: {debtGoals.length})</p>
    </div>
  );
};

export default DebugInfo;