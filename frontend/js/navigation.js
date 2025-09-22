/**
 * Navigation Consistency Manager for Resumify
 * Ensures consistent navigation behavior and styling across all pages
 */

(function() {
    'use strict';
    
    class NavigationManager {
        constructor() {
            this.currentPage = this.getCurrentPage();
            this.mobileMenuOpen = false;
            this.init();
        }
        
        init() {
            this.setupActiveStates();
            this.setupMobileMenu();
            this.setupLogoNavigation();
            this.setupKeyboardNavigation();
            this.setupResponsiveHandling();
            this.setupScrollEffects();
        }
        
        getCurrentPage() {
            const path = window.location.pathname;
            
            // Map paths to page identifiers
            const pageMap = {
                '/': 'home',
                '/index.html': 'home',
                '/upload.html': 'upload',
                '/analysis.html': 'analysis',
                '/candidates.html': 'candidates',
                '/jobs.html': 'jobs',
                '/matches.html': 'matches'
            };
            
            return pageMap[path] || 'home';
        }
        
        setupActiveStates() {
            // Remove all active states first
            const navLinks = document.querySelectorAll('.nav-link');
            navLinks.forEach(link => {
                link.classList.remove('active');
            });
            
            // Add active state to current page links
            const currentPageLinks = document.querySelectorAll(`a[href="/${this.currentPage === 'home' ? '' : this.currentPage + '.html'}"]`);
            currentPageLinks.forEach(link => {
                if (link.classList.contains('nav-link')) {
                    link.classList.add('active');
                }
            });
            
            // Special handling for home page
            if (this.currentPage === 'home') {
                const homeLinks = document.querySelectorAll('a[href="/"], a[href="/index.html"]');
                homeLinks.forEach(link => {
                    if (link.classList.contains('nav-link')) {
                        link.classList.add('active');
                    }
                });
            }
        }
        
        setupMobileMenu() {
            const mobileMenuBtn = document.getElementById('mobileMenuBtn');
            const mobileMenu = document.getElementById('mobileMenu');
            
            if (!mobileMenuBtn || !mobileMenu) {
                console.warn('Mobile menu elements not found');
                return;
            }
            
            // Remove existing event listeners to prevent duplicates
            const newMobileMenuBtn = mobileMenuBtn.cloneNode(true);
            mobileMenuBtn.parentNode.replaceChild(newMobileMenuBtn, mobileMenuBtn);
            
            newMobileMenuBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggleMobileMenu();
            });
            
            // Close mobile menu when clicking outside
            document.addEventListener('click', (e) => {
                if (this.mobileMenuOpen && 
                    !newMobileMenuBtn.contains(e.target) && 
                    !mobileMenu.contains(e.target)) {
                    this.closeMobileMenu();
                }
            });
            
            // Close mobile menu on escape key
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && this.mobileMenuOpen) {
                    this.closeMobileMenu();
                }
            });
            
            // Close mobile menu when navigating
            const mobileNavLinks = mobileMenu.querySelectorAll('a');
            mobileNavLinks.forEach(link => {
                link.addEventListener('click', () => {
                    this.closeMobileMenu();
                });
            });
        }
        
        toggleMobileMenu() {
            const mobileMenu = document.getElementById('mobileMenu');
            const mobileMenuBtn = document.getElementById('mobileMenuBtn');
            
            if (!mobileMenu || !mobileMenuBtn) return;
            
            this.mobileMenuOpen = !this.mobileMenuOpen;
            
            if (this.mobileMenuOpen) {
                this.openMobileMenu();
            } else {
                this.closeMobileMenu();
            }
        }
        
        openMobileMenu() {
            const mobileMenu = document.getElementById('mobileMenu');
            const mobileMenuBtn = document.getElementById('mobileMenuBtn');
            
            if (!mobileMenu || !mobileMenuBtn) return;
            
            mobileMenu.classList.remove('hidden');
            this.mobileMenuOpen = true;
            
            // Update button icon
            const icon = mobileMenuBtn.querySelector('i');
            if (icon) {
                icon.setAttribute('data-lucide', 'x');
                if (typeof lucide !== 'undefined') {
                    lucide.createIcons();
                }
            }
            
            // Add animation class
            mobileMenu.style.opacity = '0';
            mobileMenu.style.transform = 'translateY(-10px)';
            
            requestAnimationFrame(() => {
                mobileMenu.style.transition = 'all 0.3s ease';
                mobileMenu.style.opacity = '1';
                mobileMenu.style.transform = 'translateY(0)';
            });
            
            // Focus management for accessibility
            const firstLink = mobileMenu.querySelector('a');
            if (firstLink) {
                firstLink.focus();
            }
        }
        
        closeMobileMenu() {
            const mobileMenu = document.getElementById('mobileMenu');
            const mobileMenuBtn = document.getElementById('mobileMenuBtn');
            
            if (!mobileMenu || !mobileMenuBtn) return;
            
            this.mobileMenuOpen = false;
            
            // Update button icon
            const icon = mobileMenuBtn.querySelector('i');
            if (icon) {
                icon.setAttribute('data-lucide', 'menu');
                if (typeof lucide !== 'undefined') {
                    lucide.createIcons();
                }
            }
            
            // Add closing animation
            mobileMenu.style.transition = 'all 0.3s ease';
            mobileMenu.style.opacity = '0';
            mobileMenu.style.transform = 'translateY(-10px)';
            
            setTimeout(() => {
                mobileMenu.classList.add('hidden');
                mobileMenu.style.transition = '';
                mobileMenu.style.opacity = '';
                mobileMenu.style.transform = '';
            }, 300);
        }
        
        setupLogoNavigation() {
            const logoLinks = document.querySelectorAll('.logo-link');
            
            logoLinks.forEach(link => {
                // Ensure logo links navigate to home
                if (!link.getAttribute('href') || link.getAttribute('href') === '#') {
                    link.setAttribute('href', '/');
                }
                
                // Add proper accessibility attributes
                if (!link.getAttribute('aria-label')) {
                    link.setAttribute('aria-label', 'Resumify Home');
                }
                
                // Add keyboard navigation
                link.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        window.location.href = '/';
                    }
                });
            });
        }
        
        setupKeyboardNavigation() {
            const navLinks = document.querySelectorAll('.nav-link');
            
            navLinks.forEach((link, index) => {
                link.addEventListener('keydown', (e) => {
                    switch (e.key) {
                        case 'ArrowRight':
                        case 'ArrowDown':
                            e.preventDefault();
                            const nextLink = navLinks[index + 1] || navLinks[0];
                            nextLink.focus();
                            break;
                            
                        case 'ArrowLeft':
                        case 'ArrowUp':
                            e.preventDefault();
                            const prevLink = navLinks[index - 1] || navLinks[navLinks.length - 1];
                            prevLink.focus();
                            break;
                            
                        case 'Home':
                            e.preventDefault();
                            navLinks[0].focus();
                            break;
                            
                        case 'End':
                            e.preventDefault();
                            navLinks[navLinks.length - 1].focus();
                            break;
                    }
                });
            });
        }
        
        setupResponsiveHandling() {
            let resizeTimeout;
            
            window.addEventListener('resize', () => {
                clearTimeout(resizeTimeout);
                resizeTimeout = setTimeout(() => {
                    // Close mobile menu on desktop resize
                    if (window.innerWidth >= 768 && this.mobileMenuOpen) {
                        this.closeMobileMenu();
                    }
                }, 250);
            });
        }
        
        // Public method to update active state when navigating via JavaScript
        updateActiveState(newPage) {
            this.currentPage = newPage;
            this.setupActiveStates();
        }
        
        setupScrollEffects() {
            let lastScrollY = window.scrollY;
            
            window.addEventListener('scroll', () => {
                const nav = document.querySelector('nav');
                if (!nav) return;
                
                const currentScrollY = window.scrollY;
                
                // Add scrolled class for shadow effect
                if (currentScrollY > 10) {
                    nav.classList.add('scrolled');
                } else {
                    nav.classList.remove('scrolled');
                }
                
                lastScrollY = currentScrollY;
            }, { passive: true });
        }
        
        // Public method to refresh navigation
        refresh() {
            this.currentPage = this.getCurrentPage();
            this.setupActiveStates();
        }
    }
    
    // Auto-initialize when DOM is ready
    function ready(fn) {
        if (document.readyState !== 'loading') {
            fn();
        } else {
            document.addEventListener('DOMContentLoaded', fn);
        }
    }
    
    ready(() => {
        // Initialize navigation manager
        window.navigationManager = new NavigationManager();
        
        // Initialize Lucide icons if available
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    });
    
    // Export for manual use
    window.NavigationManager = NavigationManager;
    
})();