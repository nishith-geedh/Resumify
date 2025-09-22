/**
 * Dropdown Enhancements for Resumify
 * Ensures dropdown text visibility and accessibility across all browsers
 */

(function() {
    'use strict';
    
    // Wait for DOM to be ready
    function ready(fn) {
        if (document.readyState !== 'loading') {
            fn();
        } else {
            document.addEventListener('DOMContentLoaded', fn);
        }
    }
    
    // Enhanced dropdown functionality
    function enhanceDropdowns() {
        const dropdowns = document.querySelectorAll('select');
        
        dropdowns.forEach(dropdown => {
            // Add enhanced class if not already present
            if (!dropdown.classList.contains('dropdown-select')) {
                dropdown.classList.add('dropdown-select');
            }
            
            // Ensure proper ARIA attributes for accessibility
            if (!dropdown.getAttribute('aria-label') && !dropdown.getAttribute('aria-labelledby')) {
                const label = dropdown.previousElementSibling;
                if (label && label.tagName === 'LABEL') {
                    const labelId = label.id || `label-${dropdown.id || Math.random().toString(36).substr(2, 9)}`;
                    label.id = labelId;
                    dropdown.setAttribute('aria-labelledby', labelId);
                }
            }
            
            // Add focus enhancement
            dropdown.addEventListener('focus', function() {
                this.style.transform = 'translateY(-2px)';
                this.style.boxShadow = '0 0 0 3px rgba(78, 196, 254, 0.3)';
            });
            
            dropdown.addEventListener('blur', function() {
                this.style.transform = '';
                this.style.boxShadow = '';
            });
            
            // Handle keyboard navigation
            dropdown.addEventListener('keydown', function(e) {
                // Ensure proper keyboard navigation
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.click();
                }
            });
            
            // Handle mobile touch events
            dropdown.addEventListener('touchstart', function() {
                this.style.transform = 'translateY(-1px)';
            });
            
            dropdown.addEventListener('touchend', function() {
                setTimeout(() => {
                    this.style.transform = '';
                }, 150);
            });
            
            // Ensure options are properly styled
            const options = dropdown.querySelectorAll('option');
            options.forEach(option => {
                // Ensure proper contrast for options
                option.style.backgroundColor = '#191919';
                option.style.color = '#FFF2C6';
            });
        });
    }
    
    // Browser-specific fixes
    function applyBrowserFixes() {
        const isFirefox = navigator.userAgent.toLowerCase().indexOf('firefox') > -1;
        const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
        const isEdge = /Edge/.test(navigator.userAgent);
        const isIE = /Trident/.test(navigator.userAgent);
        
        if (isFirefox) {
            // Firefox-specific fixes
            const dropdowns = document.querySelectorAll('select');
            dropdowns.forEach(dropdown => {
                dropdown.style.backgroundImage = 'none';
                dropdown.style.MozAppearance = 'none';
            });
        }
        
        if (isSafari) {
            // Safari-specific fixes
            const dropdowns = document.querySelectorAll('select');
            dropdowns.forEach(dropdown => {
                dropdown.style.webkitAppearance = 'none';
                dropdown.style.appearance = 'none';
            });
        }
        
        if (isEdge || isIE) {
            // Edge/IE-specific fixes
            const dropdowns = document.querySelectorAll('select');
            dropdowns.forEach(dropdown => {
                dropdown.style.msExpand = 'none';
            });
        }
    }
    
    // High contrast mode detection and handling
    function handleHighContrast() {
        if (window.matchMedia && window.matchMedia('(prefers-contrast: high)').matches) {
            const dropdowns = document.querySelectorAll('select');
            dropdowns.forEach(dropdown => {
                dropdown.style.backgroundColor = '#000000';
                dropdown.style.color = '#FFFFFF';
                dropdown.style.border = '2px solid #FFFFFF';
                
                const options = dropdown.querySelectorAll('option');
                options.forEach(option => {
                    option.style.backgroundColor = '#000000';
                    option.style.color = '#FFFFFF';
                });
            });
        }
    }
    
    // Dark mode detection and handling
    function handleDarkMode() {
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            const dropdowns = document.querySelectorAll('select');
            dropdowns.forEach(dropdown => {
                dropdown.style.backgroundColor = 'rgba(25, 25, 25, 0.95)';
                dropdown.style.color = '#FFF2C6';
            });
        }
    }
    
    // Mobile device detection and handling
    function handleMobileDevices() {
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        if (isMobile) {
            const dropdowns = document.querySelectorAll('select');
            dropdowns.forEach(dropdown => {
                dropdown.style.minHeight = '48px';
                dropdown.style.fontSize = '16px'; // Prevent zoom on iOS
                
                // Add touch-friendly styling
                dropdown.addEventListener('touchstart', function() {
                    this.style.backgroundColor = 'rgba(25, 25, 25, 1)';
                });
            });
        }
    }
    
    // Mutation observer to handle dynamically added dropdowns
    function observeDropdowns() {
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                mutation.addedNodes.forEach(function(node) {
                    if (node.nodeType === 1) { // Element node
                        const newDropdowns = node.querySelectorAll ? node.querySelectorAll('select') : [];
                        if (node.tagName === 'SELECT') {
                            enhanceDropdowns();
                        } else if (newDropdowns.length > 0) {
                            enhanceDropdowns();
                        }
                    }
                });
            });
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }
    
    // Accessibility enhancements
    function enhanceAccessibility() {
        const dropdowns = document.querySelectorAll('select');
        
        dropdowns.forEach(dropdown => {
            // Add role if not present
            if (!dropdown.getAttribute('role')) {
                dropdown.setAttribute('role', 'combobox');
            }
            
            // Add aria-expanded for better screen reader support
            dropdown.addEventListener('focus', function() {
                this.setAttribute('aria-expanded', 'true');
            });
            
            dropdown.addEventListener('blur', function() {
                this.setAttribute('aria-expanded', 'false');
            });
            
            // Add aria-describedby if there's help text
            const helpText = dropdown.nextElementSibling;
            if (helpText && helpText.classList.contains('help-text')) {
                const helpId = helpText.id || `help-${dropdown.id || Math.random().toString(36).substr(2, 9)}`;
                helpText.id = helpId;
                dropdown.setAttribute('aria-describedby', helpId);
            }
        });
    }
    
    // Performance optimization - debounce function
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    // Resize handler for responsive adjustments
    const handleResize = debounce(function() {
        handleMobileDevices();
        enhanceDropdowns();
    }, 250);
    
    // Initialize all enhancements
    function init() {
        enhanceDropdowns();
        applyBrowserFixes();
        handleHighContrast();
        handleDarkMode();
        handleMobileDevices();
        observeDropdowns();
        enhanceAccessibility();
        
        // Add resize listener
        window.addEventListener('resize', handleResize);
        
        // Listen for color scheme changes
        if (window.matchMedia) {
            window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', handleDarkMode);
            window.matchMedia('(prefers-contrast: high)').addEventListener('change', handleHighContrast);
        }
    }
    
    // Start when DOM is ready
    ready(init);
    
    // Export for manual initialization if needed
    window.DropdownEnhancements = {
        init: init,
        enhance: enhanceDropdowns,
        applyBrowserFixes: applyBrowserFixes
    };
    
})();