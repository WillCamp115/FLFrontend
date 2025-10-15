// src/app/components/common/HashLink.jsx
'use client';
import React from 'react';

/**
 * HashLink component for smooth scrolling to sections with hash navigation
 * 
 * @param {Object} props
 * @param {string} props.to - Section ID to navigate to (without #)
 * @param {React.ReactNode} props.children - Link content
 * @param {string} props.className - Additional CSS classes
 * @param {Function} props.onClick - Optional click handler
 */
const HashLink = ({ to, children, className = '', onClick, ...props }) => {
  const handleClick = (e) => {
    e.preventDefault();
    
    // Update URL hash
    const hash = to.startsWith('#') ? to : `#${to}`;
    window.history.pushState(null, '', hash);
    
    // Trigger hashchange event for the hook to pick up
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    
    // Call custom onClick if provided
    if (onClick) {
      onClick(e);
    }
  };

  const href = to.startsWith('#') ? to : `#${to}`;

  return (
    <a
      href={href}
      className={className}
      onClick={handleClick}
      {...props}
    >
      {children}
    </a>
  );
};

export default HashLink;

