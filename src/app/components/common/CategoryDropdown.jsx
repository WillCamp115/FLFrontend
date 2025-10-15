import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Search, Check } from 'lucide-react';
import { getPrimaryCategories, getDetailedCategories, searchCategories } from '../../utils/categoryData';

const CategoryDropdown = ({ 
  value = '', 
  onChange, 
  placeholder = 'Select a category',
  className = '',
  required = false 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPrimary, setSelectedPrimary] = useState('');
  const [showDetailed, setShowDetailed] = useState(false);
  const [primaryCategories, setPrimaryCategories] = useState([]);
  const [detailedCategories, setDetailedCategories] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [isSearchMode, setIsSearchMode] = useState(false);
  
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);
  
  useEffect(() => {
    setPrimaryCategories(getPrimaryCategories());
  }, []);
  
  useEffect(() => {
    if (searchTerm) {
      const results = searchCategories(searchTerm);
      setSearchResults(results);
      setIsSearchMode(true);
    } else {
      setSearchResults([]);
      setIsSearchMode(false);
    }
  }, [searchTerm]);
  
  useEffect(() => {
    if (selectedPrimary && !isSearchMode) {
      setDetailedCategories(getDetailedCategories(selectedPrimary));
      setShowDetailed(true);
    }
  }, [selectedPrimary, isSearchMode]);
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  const handleToggle = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      // Focus search input when opening
      setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
      }, 100);
    }
  };
  
  const handlePrimarySelect = (primary) => {
    setSelectedPrimary(primary);
    setSearchTerm('');
    setIsSearchMode(false);
  };
  
  const handlePrimaryDirectSelect = (primary) => {
    onChange(primary); // Select the primary category directly
    setIsOpen(false);
    setSearchTerm('');
    setSelectedPrimary('');
    setShowDetailed(false);
    setIsSearchMode(false);
  };
  
  const handleDetailedSelect = (detailed, primary) => {
    onChange(detailed.fullName);
    setIsOpen(false);
    setSearchTerm('');
    setSelectedPrimary('');
    setShowDetailed(false);
    setIsSearchMode(false);
  };
  
  const handleSearchResultSelect = (result) => {
    if (result.type === 'primary') {
      handlePrimaryDirectSelect(result.primary); // Select primary directly from search
    } else {
      handleDetailedSelect(result, result.primary);
    }
  };
  
  const handleBackToPrimary = () => {
    setShowDetailed(false);
    setSelectedPrimary('');
    setSearchTerm('');
  };
  
  const handleClear = () => {
    onChange('');
    setSelectedPrimary('');
    setShowDetailed(false);
    setSearchTerm('');
    setIsSearchMode(false);
  };
  
  const renderPrimaryCategories = () => (
    <div className="space-y-1">
      {primaryCategories
        .filter(cat => !searchTerm || cat.toLowerCase().includes(searchTerm.toLowerCase()))
        .map((category) => (
        <div key={category} className="border-b border-gray-100 last:border-b-0">
          {/* Primary category selection option */}
          <div
            onClick={() => handlePrimaryDirectSelect(category)}
            className="px-3 py-2 hover:bg-blue-50 cursor-pointer flex items-center justify-between group"
          >
            <div className="flex items-center gap-2">
              <span className="text-gray-900 font-medium">{category}</span>
              <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">
                Use Category
              </span>
            </div>
          </div>
          
          {/* Expand to detailed categories option */}
          <div
            onClick={() => handlePrimarySelect(category)}
            className="px-3 py-2 hover:bg-gray-100 cursor-pointer flex items-center justify-between group text-sm text-gray-600"
          >
            <span>View detailed subcategories</span>
            <ChevronDown className="w-4 h-4 text-gray-400 rotate-[-90deg] opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>
      ))}
    </div>
  );
  
  const renderDetailedCategories = () => (
    <div className="space-y-1">
      <div 
        onClick={handleBackToPrimary}
        className="px-3 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-200 text-sm font-medium text-blue-600"
      >
        ← Back to categories
      </div>
      
      {/* Option to select the main category */}
      <div
        onClick={() => handlePrimaryDirectSelect(selectedPrimary)}
        className="px-3 py-2 hover:bg-blue-50 cursor-pointer border-b border-gray-200 bg-green-50"
      >
        <div className="flex items-center gap-2">
          <span className="text-gray-900 font-medium">Use "{selectedPrimary}" (All subcategories)</span>
          <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">
            Recommended
          </span>
        </div>
        <div className="text-xs text-gray-600 mt-1">
          Include all {selectedPrimary.toLowerCase()} spending without specifying details
        </div>
      </div>
      
      {/* Detailed subcategories */}
      {detailedCategories.map((detailed) => (
        <div
          key={detailed.id}
          onClick={() => handleDetailedSelect(detailed, selectedPrimary)}
          className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
        >
          <div className="text-gray-900">{detailed.name}</div>
          {detailed.description && (
            <div className="text-xs text-gray-500 mt-1">{detailed.description}</div>
          )}
        </div>
      ))}
    </div>
  );
  
  const renderSearchResults = () => (
    <div className="space-y-1">
      {searchResults.length === 0 ? (
        <div className="px-3 py-4 text-gray-500 text-center">
          No categories found for "{searchTerm}"
        </div>
      ) : (
        searchResults.slice(0, 10).map((result, index) => (
          <div
            key={`${result.type}-${result.primary}-${index}`}
            onClick={() => handleSearchResultSelect(result)}
            className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-gray-900">
                  {result.type === 'primary' ? result.name : result.name}
                </div>
                <div className="text-xs text-gray-500">
                  {result.type === 'primary' ? 'Primary Category' : `${result.primary} > ${result.name}`}
                </div>
                {result.description && result.type === 'detailed' && (
                  <div className="text-xs text-gray-400 mt-1">{result.description}</div>
                )}
              </div>
              {result.type === 'primary' && (
                <ChevronDown className="w-4 h-4 text-gray-400 rotate-[-90deg]" />
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
  
  const getDisplayValue = () => {
    if (value) return value;
    return placeholder;
  };
  
  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      {/* Main dropdown trigger */}
      <div
        onClick={handleToggle}
        className={`
          w-full p-2 border border-gray-300 rounded-lg cursor-pointer
          focus:ring-2 focus:ring-blue-500 focus:border-blue-500
          ${!value ? 'text-gray-500' : 'text-gray-900'}
          ${isOpen ? 'ring-2 ring-blue-500 border-blue-500' : ''}
        `}
      >
        <div className="flex items-center justify-between">
          <span className="truncate">{getDisplayValue()}</span>
          <div className="flex items-center gap-2">
            {value && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleClear();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            )}
            <ChevronDown 
              className={`w-4 h-4 text-gray-400 transition-transform ${
                isOpen ? 'rotate-180' : ''
              }`} 
            />
          </div>
        </div>
      </div>
      
      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-80 overflow-hidden">
          {/* Search input */}
          <div className="p-3 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search categories..."
                className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          
          {/* Dropdown content */}
          <div className="max-h-60 overflow-y-auto">
            {isSearchMode && searchTerm ? (
              renderSearchResults()
            ) : showDetailed ? (
              renderDetailedCategories()
            ) : (
              renderPrimaryCategories()
            )}
          </div>
        </div>
      )}
      
      {/* Hidden input for form validation */}
      {required && (
        <input
          type="hidden"
          value={value}
          required
          onChange={() => {}} // Controlled by parent
        />
      )}
    </div>
  );
};

export default CategoryDropdown;