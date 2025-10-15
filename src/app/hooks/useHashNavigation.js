// src/app/hooks/useHashNavigation.js
'use client';
import { useEffect, useCallback, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';

/**
 * Hook for hash-based navigation in a single-page app
 * - Scrolls to section on hash change
 * - Updates hash as user scrolls
 * - Supports smooth scrolling
 * 
 * @param {Object} options
 * @param {string[]} options.sectionIds - Array of section IDs to track
 * @param {number} options.offset - Offset from top in pixels (default: 80)
 * @param {boolean} options.updateOnScroll - Whether to update hash on scroll (default: true)
 */
export const useHashNavigation = ({ 
  sectionIds = [], 
  offset = 80,
  updateOnScroll = true 
} = {}) => {
  const router = useRouter();
  const pathname = usePathname();
  const scrollingRef = useRef(false);
  const timeoutRef = useRef(null);

  // Scroll to section based on hash
  const scrollToHash = useCallback((hash) => {
    if (!hash) return;

    // Remove # if present
    const sectionId = hash.startsWith('#') ? hash.slice(1) : hash;
    const element = document.getElementById(sectionId);

    if (element) {
      scrollingRef.current = true;
      
      // Calculate position with offset
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });

      // Reset scrolling flag after animation
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        scrollingRef.current = false;
      }, 1000);
    }
  }, [offset]);

  // Navigate to section and update hash
  const navigateTo = useCallback((sectionId) => {
    const hash = sectionId.startsWith('#') ? sectionId : `#${sectionId}`;
    
    // Update URL without triggering page reload
    window.history.pushState(null, '', `${pathname}${hash}`);
    
    // Scroll to section
    scrollToHash(hash);
  }, [pathname, scrollToHash]);

  // Handle initial hash on mount and hash changes
  useEffect(() => {
    // Scroll to hash on initial load
    const initialHash = window.location.hash;
    if (initialHash) {
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        scrollToHash(initialHash);
      }, 100);
    }

    // Listen for hash changes (browser back/forward)
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash) {
        scrollToHash(hash);
      }
    };

    window.addEventListener('hashchange', handleHashChange);

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [scrollToHash]);

  // Track scroll position and update hash
  useEffect(() => {
    if (!updateOnScroll || sectionIds.length === 0) return;

    const handleScroll = () => {
      // Don't update hash if we're programmatically scrolling
      if (scrollingRef.current) return;

      // Find which section is currently in view
      const scrollPosition = window.scrollY + offset + 100; // Extra offset for better UX

      for (let i = sectionIds.length - 1; i >= 0; i--) {
        const section = document.getElementById(sectionIds[i]);
        if (section) {
          const sectionTop = section.offsetTop;
          
          if (scrollPosition >= sectionTop) {
            const newHash = `#${sectionIds[i]}`;
            const currentHash = window.location.hash;
            
            // Only update if hash actually changed
            if (currentHash !== newHash) {
              window.history.replaceState(null, '', `${pathname}${newHash}`);
            }
            break;
          }
        }
      }
    };

    // Throttle scroll handler for performance
    let ticking = false;
    const throttledScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          handleScroll();
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', throttledScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', throttledScroll);
    };
  }, [sectionIds, offset, pathname, updateOnScroll]);

  return {
    navigateTo,
    scrollToHash,
    currentHash: typeof window !== 'undefined' ? window.location.hash : ''
  };
};

export default useHashNavigation;

