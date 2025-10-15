import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { getDetailedCategories } from '../../utils/categoryData';

const DetailedCategoryDropdown = ({ 
  primaryCategory,
  value = '', 
  onChange, 
  placeholder = 'Select detailed category',
  className = '',
  required = false 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [detailedCategories, setDetailedCategories] = useState([]);
  const [filteredCategories, setFilteredCategories] = useState([]);
  
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);
  
  // Load detailed categories when primary category changes
  useEffect(() => {
    if (primaryCategory) {
      const categories = getDetailedCategories(primaryCategory);
      setDetailedCategories(categories);
      setFilteredCategories(categories);
    } else {
      setDetailedCategories([]);
      setFilteredCategories([]);
    }
  }, [primaryCategory]);
  
  // Filter categories based on search term
  useEffect(() => {
    if (searchTerm) {
      const filtered = detailedCategories.filter(cat =>
        cat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cat.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredCategories(filtered);
    } else {
      setFilteredCategories(detailedCategories);
    }
  }, [searchTerm, detailedCategories]);
  
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
    if (!primaryCategory) return;
    
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
  
  const handleCategorySelect = (category) => {
    onChange(category.fullName);
    setIsOpen(false);
    setSearchTerm('');
  };
  
  const handleClear = () => {
    onChange('');
    setSearchTerm('');
  };
  
  const getDisplayValue = () => {
    if (value) return value;
    if (!primaryCategory) return 'Select primary category first';
    return placeholder;
  };
  
  const isDisabled = !primaryCategory;
  
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
          ${isDisabled ? 'bg-gray-100 cursor-not-allowed opacity-75' : ''}
        `}
      >
        <div className="flex items-center justify-between">
          <span className="truncate text-sm">{getDisplayValue()}</span>
          <div className="flex items-center gap-2">
            {value && !isDisabled && (
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
              className={`w-3 h-3 text-gray-400 transition-transform ${
                isOpen ? 'rotate-180' : ''
              }`} 
            />
          </div>
        </div>
      </div>
      
      {/* Dropdown menu */}
      {isOpen && !isDisabled && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-80 overflow-hidden">
          {/* Search input */}
          <div className="p-2 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search detailed categories..."
                className="w-full pl-7 pr-2 py-1 text-sm border border-gray-200 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          
          {/* Categories list */}
          <div className="max-h-48 overflow-y-auto">
            {filteredCategories.length === 0 ? (
              <div className="px-3 py-4 text-gray-500 text-center text-sm">
                {searchTerm ? `No categories found for "${searchTerm}"` : 'No detailed categories available'}
              </div>
            ) : (
              <div className="space-y-1 p-1">
                {filteredCategories.map((category) => (
                  <div
                    key={category.id}
                    onClick={() => handleCategorySelect(category)}
                    className="px-2 py-2 hover:bg-gray-100 cursor-pointer rounded"
                  >
                    <div className="text-sm text-gray-900">{category.name}</div>
                    {category.description && (
                      <div className="text-xs text-gray-500 mt-1">{category.description}</div>
                    )}
                  </div>
                ))}
              </div>
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

export default DetailedCategoryDropdown;