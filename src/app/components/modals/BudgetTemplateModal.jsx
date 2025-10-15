// src/components/modals/BudgetTemplateModal.jsx
import React, { useState, useEffect } from 'react';
import { apiClient } from '../../../lib/apiClient';
import Modal from './Modal';
import { 
  Target, 
  Clock, 
  DollarSign, 
  TrendingUp, 
  AlertCircle, 
  ChevronRight,
  Info,
  Sparkles,
  PiggyBank,
  Calendar
} from 'lucide-react';

const BudgetTemplateModal = ({ userId, isOpen, onClose, onBudgetApplied }) => {
  const [templates, setTemplates] = useState([]);
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [activeTab, setActiveTab] = useState('templates');

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Fetch both templates and insights in parallel
      const [templatesData, insightsData] = await Promise.all([
        apiClient.getBudgetTemplates(),
        apiClient.getSpendingInsights()
      ]);
      
      setTemplates(templatesData);
      setInsights(insightsData);
    } catch (err) {
      setError(err.message || "Failed to load budget templates");
    } finally {
      setLoading(false);
    }
  };

  const groupTemplatesByGoal = () => {
    const grouped = {};
    templates.forEach(template => {
      if (!grouped[template.goal_name]) {
        grouped[template.goal_name] = [];
      }
      grouped[template.goal_name].push(template);
    });
    return grouped;
  };

  const getTimelineIcon = (timeline) => {
    switch(timeline) {
      case 'Short-term':
        return <Clock className="w-4 h-4 text-red-500" />;
      case 'Medium-term':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'Long-term':
        return <Clock className="w-4 h-4 text-green-500" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getTimelineColor = (timeline) => {
    switch(timeline) {
      case 'Short-term':
        return 'border-red-200 bg-red-50 hover:bg-red-100';
      case 'Medium-term':
        return 'border-yellow-200 bg-yellow-50 hover:bg-yellow-100';
      case 'Long-term':
        return 'border-green-200 bg-green-50 hover:bg-green-100';
      default:
        return 'border-gray-200 bg-gray-50 hover:bg-gray-100';
    }
  };

  const handleApplyTemplate = async () => {
    if (!selectedTemplate) return;

    setApplying(true);
    setError(null);
    setSuccess(null);

    try {
      await apiClient.applyBudgetTemplate(selectedTemplate);
      setSuccess("Budget template applied successfully!");
      
      if (onBudgetApplied) {
        onBudgetApplied();
      }
      
      setTimeout(() => {
        handleClose();
      }, 1500);
    } catch (err) {
      setError(err.message || "Failed to apply budget template");
    } finally {
      setApplying(false);
    }
  };

  const handleClose = () => {
    setSelectedTemplate(null);
    setError(null);
    setSuccess(null);
    setActiveTab('templates');
    onClose();
  };

  const renderTemplateCard = (template) => {
    const isSelected = selectedTemplate?.goal_name === template.goal_name && 
                      selectedTemplate?.timeline === template.timeline;
    
    return (
      <div
        key={`${template.goal_name}-${template.timeline}`}
        onClick={() => setSelectedTemplate(template)}
        className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
          isSelected 
            ? 'border-blue-500 bg-blue-50 shadow-lg' 
            : getTimelineColor(template.timeline)
        }`}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            {getTimelineIcon(template.timeline)}
            <span className="font-medium text-gray-900">{template.timeline}</span>
          </div>
          <span className="text-sm text-gray-600">{template.duration_months} months</span>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Monthly Goal Payment</span>
            <span className="font-semibold text-green-600">
              ${template.monthly_goal_contribution.toFixed(2)}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Monthly Income</span>
            <span className="font-medium">${template.income.toFixed(2)}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Savings Rate</span>
            <span className="font-medium">{template.insights?.savings_rate || 0}%</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Buffer Amount</span>
            <span className="font-medium text-blue-600">
              ${template.remaining_unallocated.toFixed(2)}
            </span>
          </div>

          {template.insights?.estimated_completion_date && (
            <div className="pt-2 border-t">
              <div className="flex items-center gap-1 text-sm text-gray-600">
                <Calendar className="w-3 h-3" />
                <span>Complete by {template.insights.estimated_completion_date}</span>
              </div>
            </div>
          )}
        </div>

        {isSelected && (
          <div className="mt-3 pt-3 border-t">
            <div className="flex items-center gap-2 text-sm text-blue-600">
              <Sparkles className="w-4 h-4" />
              <span className="font-medium">Selected Template</span>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderInsights = () => {
    if (!insights) return null;

    return (
      <div className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
            <Info className="w-4 h-4" />
            Your Spending Patterns
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <div className="bg-white rounded p-3">
              <p className="text-sm text-gray-600">Frivolous Spending</p>
              <p className="text-lg font-semibold text-red-600">
                {insights.frivolous_spending_percentage}%
              </p>
            </div>
            <div className="bg-white rounded p-3">
              <p className="text-sm text-gray-600">Potential Monthly Savings</p>
              <p className="text-lg font-semibold text-green-600">
                ${insights.potential_monthly_savings}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">Top Spending Categories:</p>
            {insights.top_spending_categories?.map((cat, idx) => (
              <div key={idx} className="flex justify-between items-center text-sm">
                <span className="text-gray-600">{cat.category.replace(/_/g, ' ')}</span>
                <span className="font-medium">${cat.amount.toFixed(2)}/month</span>
              </div>
            ))}
          </div>
        </div>

        {insights.recommendations && insights.recommendations.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="font-semibold text-yellow-900 mb-2 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Recommendations
            </h4>
            <ul className="space-y-2">
              {insights.recommendations.map((rec, idx) => (
                <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                  <ChevronRight className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Generating personalized budget templates...</p>
          </div>
        </div>
      );
    }

    if (templates.length === 0) {
      return (
        <div className="text-center py-8">
          <PiggyBank className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-2">No budget templates available</p>
          <p className="text-sm text-gray-500">Please create some financial goals first</p>
        </div>
      );
    }

    const groupedTemplates = groupTemplatesByGoal();

    return (
      <div>
        {/* Tabs */}
        <div className="flex border-b mb-4">
          <button
            onClick={() => setActiveTab('templates')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'templates'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Budget Templates
          </button>
          <button
            onClick={() => setActiveTab('insights')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'insights'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Spending Insights
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'templates' ? (
          <div className="space-y-6">
            <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
              <p className="flex items-center gap-2">
                <Info className="w-4 h-4" />
                Select a budget template that aligns with your financial goals and timeline preferences.
              </p>
            </div>

            {Object.entries(groupedTemplates).map(([goalName, goalTemplates]) => (
              <div key={goalName} className="space-y-3">
                <div className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-blue-600" />
                  <h3 className="font-semibold text-lg text-gray-900">{goalName}</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {goalTemplates.map(template => renderTemplateCard(template))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          renderInsights()
        )}
      </div>
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Smart Budget Templates" size="xl">
      <div className="p-6">
        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 border border-red-400 rounded flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}
        
        {success && (
          <div className="mb-4 p-3 bg-green-100 text-green-700 border border-green-400 rounded flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            {success}
          </div>
        )}

        {renderContent()}

        {/* Action Buttons */}
        {!loading && templates.length > 0 && activeTab === 'templates' && (
          <div className="flex gap-3 pt-6 border-t mt-6">
            <button
              onClick={handleClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleApplyTemplate}
              disabled={!selectedTemplate || applying}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {applying ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Applying...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Apply Selected Template
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default BudgetTemplateModal;