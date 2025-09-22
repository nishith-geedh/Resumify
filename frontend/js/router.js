// SPA Router for Resumify application

class Router {
    constructor() {
        this.routes = new Map();
        this.currentRoute = null;
        this.defaultRoute = '/';
        this.notFoundRoute = '/404';
        
        // Initialize router
        this.init();
    }
    
    init() {
        try {
            // Define application routes
            this.defineRoutes();
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Handle initial route
            this.handleInitialRoute();
            
            console.log('Router initialized successfully');
        } catch (error) {
            console.error('Failed to initialize router:', error);
        }
    }
    
    defineRoutes() {
        // Define all application routes
        this.addRoute('/', {
            name: 'home',
            title: 'Resumify - AI-Powered Resume Parser',
            handler: () => this.showPage('home'),
            showHero: true
        });
        
        this.addRoute('/upload', {
            name: 'upload',
            title: 'Upload Resume - Resumify',
            handler: () => this.showPage('upload'),
            showHero: false
        });
        
        this.addRoute('/analysis', {
            name: 'analysis',
            title: 'Resume Analysis - Resumify',
            handler: () => this.showPage('analysis'),
            showHero: false
        });
        
        this.addRoute('/candidates', {
            name: 'candidates',
            title: 'Candidates - Resumify',
            handler: () => this.showPage('candidates'),
            showHero: false
        });
        
        this.addRoute('/jobs', {
            name: 'jobs',
            title: 'Jobs - Resumify',
            handler: () => this.showPage('jobs'),
            showHero: false
        });
        
        this.addRoute('/matches', {
            name: 'matches',
            title: 'Job Matches - Resumify',
            handler: () => this.showPage('matches'),
            showHero: false
        });
        
        // 404 route
        this.addRoute('/404', {
            name: '404',
            title: 'Page Not Found - Resumify',
            handler: () => this.show404Page(),
            showHero: false
        });
    }
    
    addRoute(path, config) {
        this.routes.set(path, config);
    }
    
    setupEventListeners() {
        // Handle browser back/forward buttons
        window.addEventListener('popstate', (event) => {
            const path = event.state?.path || window.location.pathname;
            this.navigateTo(path, false);
        });
        
        // Handle navigation link clicks
        document.addEventListener('click', (event) => {
            const link = event.target.closest('a[href]');
            if (link && this.isInternalLink(link)) {
                event.preventDefault();
                const href = link.getAttribute('href');
                this.navigateTo(href);
            }
        });
    }
    
    isInternalLink(link) {
        const href = link.getAttribute('href');
        
        // Don't intercept links to .html files - let them navigate normally
        if (href.endsWith('.html')) {
            return false;
        }
        
        // Check if it's an internal route
        if (href.startsWith('/') && !href.startsWith('//')) {
            return true;
        }
        
        // Check if it's a hash link that should be converted to route
        if (href.startsWith('#')) {
            const sectionId = href.substring(1);
            const routeMap = {
                'home': '/',
                'upload': '/upload',
                'analysis': '/analysis',
                'candidates': '/candidates',
                'jobs': '/jobs',
                'matches': '/matches',
                'analytics': '/analysis' // Map analytics to analysis
            };
            
            if (routeMap[sectionId]) {
                // Update the href to use proper route
                link.setAttribute('href', routeMap[sectionId]);
                return true;
            }
        }
        
        return false;
    }
    
    handleInitialRoute() {
        const currentPath = window.location.pathname;
        const hash = window.location.hash;
        
        // Handle legacy hash-based navigation
        if (hash && currentPath === '/') {
            const sectionId = hash.substring(1);
            const routeMap = {
                'home': '/',
                'upload': '/upload',
                'analysis': '/analysis',
                'candidates': '/candidates',
                'jobs': '/jobs',
                'matches': '/matches',
                'analytics': '/analysis'
            };
            
            if (routeMap[sectionId]) {
                this.navigateTo(routeMap[sectionId], true);
                return;
            }
        }
        
        // For development servers that don't handle SPA routing,
        // default to home if path doesn't exist as a route
        if (currentPath !== '/' && !this.routes.has(currentPath)) {
            console.warn(`Route ${currentPath} not found, redirecting to home`);
            this.navigateTo('/', true);
            return;
        }
        
        // Navigate to current path
        this.navigateTo(currentPath, false);
    }
    
    navigateTo(path, updateHistory = true) {
        try {
            // Normalize path
            path = this.normalizePath(path);
            
            // Check if route exists
            const route = this.routes.get(path);
            if (!route) {
                console.warn(`Route not found: ${path}`);
                path = this.notFoundRoute;
            }
            
            // Update browser history
            if (updateHistory) {
                const state = { path };
                const title = route?.title || 'Resumify';
                history.pushState(state, title, path);
            }
            
            // Update document title
            if (route?.title) {
                document.title = route.title;
            }
            
            // Execute route handler
            if (route?.handler) {
                route.handler();
            }
            
            // Update navigation state
            this.updateNavigation(path);
            
            // Handle hero section visibility
            this.handleHeroSection(route);
            
            this.currentRoute = path;
            
        } catch (error) {
            console.error('Navigation failed:', error);
            this.navigateTo('/404', false);
        }
    }
    
    normalizePath(path) {
        // Remove trailing slash except for root
        if (path !== '/' && path.endsWith('/')) {
            path = path.slice(0, -1);
        }
        
        // Ensure path starts with /
        if (!path.startsWith('/')) {
            path = '/' + path;
        }
        
        return path;
    }
    
    showPage(pageId) {
        try {
            // Hide all sections with fade out
            const sections = document.querySelectorAll('.section');
            sections.forEach(section => {
                if (section && section.classList) {
                    section.classList.remove('active');
                }
            });
            
            // Show target section with fade in
            const targetSection = document.getElementById(pageId);
            if (targetSection) {
                // Small delay to ensure smooth transition
                setTimeout(() => {
                    targetSection.classList.add('active');
                    
                    // Load section data if needed
                    this.loadPageData(pageId);
                    
                    // Trigger animations
                    this.triggerPageAnimations(targetSection);
                    
                    // Reinitialize icons
                    if (window.utils && window.utils.initializeIcons) {
                        window.utils.initializeIcons();
                    }
                }, 50);
            } else {
                console.error(`Page element not found: ${pageId}`);
                this.navigateTo('/404', false);
            }
            
        } catch (error) {
            console.error(`Failed to show page: ${pageId}`, error);
            this.navigateTo('/404', false);
        }
    }
    
    show404Page() {
        // Create or show 404 page
        let notFoundSection = document.getElementById('not-found');
        
        if (!notFoundSection) {
            notFoundSection = document.createElement('section');
            notFoundSection.id = 'not-found';
            notFoundSection.className = 'section min-h-screen bg-gradient-to-br from-dark via-purple-dark/20 to-dark pt-32 pb-20';
            
            notFoundSection.innerHTML = `
                <div class="max-w-4xl mx-auto px-6 text-center">
                    <div class="gradient-border">
                        <div class="gradient-border-inner p-12">
                            <div class="w-24 h-24 bg-gradient-to-r from-red to-yellow rounded-3xl flex items-center justify-center mx-auto mb-8">
                                <i data-lucide="alert-triangle" class="w-12 h-12 text-dark"></i>
                            </div>
                            <h1 class="text-6xl font-bold text-cream mb-4 heading-font">404</h1>
                            <h2 class="text-2xl font-semibold text-cream mb-6 heading-font">Page Not Found</h2>
                            <p class="text-cream/70 mb-8 font-montserrat">
                                The page you're looking for doesn't exist or has been moved.
                            </p>
                            <div class="space-x-4">
                                <button onclick="router.navigateTo('/')" class="px-8 py-4 bg-gradient-to-r from-blue to-mint rounded-xl font-semibold text-dark transition-all duration-300 hover:scale-105 glow-box font-montserrat">
                                    Go Home
                                </button>
                                <button onclick="history.back()" class="px-8 py-4 border-2 border-purple-light/50 rounded-xl font-semibold text-purple-light hover:bg-purple-light/10 transition-all duration-300 hover:border-purple-light font-montserrat">
                                    Go Back
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            document.querySelector('main').appendChild(notFoundSection);
        }
        
        this.showPage('not-found');
    }
    
    updateNavigation(currentPath) {
        try {
            const navLinks = document.querySelectorAll('.nav-link');
            
            navLinks.forEach(link => {
                if (link && link.classList) {
                    link.classList.remove('active');
                    
                    const href = link.getAttribute('href');
                    if (href === currentPath || (currentPath === '/' && href === '#home')) {
                        link.classList.add('active');
                    }
                }
            });
        } catch (error) {
            console.error('Failed to update navigation:', error);
        }
    }
    
    handleHeroSection(route) {
        try {
            const heroSection = document.getElementById('home');
            
            if (heroSection) {
                if (route?.showHero) {
                    // Keep hero section visible for home page
                    heroSection.classList.add('active');
                    heroSection.style.display = 'block';
                } else {
                    // Keep hero section in DOM but hide it for other pages
                    // This ensures smooth transitions and maintains the layout
                    heroSection.classList.remove('active');
                    heroSection.style.display = 'none';
                }
            }
        } catch (error) {
            console.error('Failed to handle hero section:', error);
        }
    }
    
    async loadPageData(pageId) {
        try {
            // Use existing navigation manager's data loading methods
            if (window.navigationManager && typeof window.navigationManager.loadSectionData === 'function') {
                await window.navigationManager.loadSectionData(pageId);
            }
        } catch (error) {
            console.error(`Failed to load data for page: ${pageId}`, error);
        }
    }
    
    triggerPageAnimations(section) {
        try {
            // Use existing navigation manager's animation methods
            if (window.navigationManager && typeof window.navigationManager.triggerSectionAnimations === 'function') {
                window.navigationManager.triggerSectionAnimations(section);
            }
        } catch (error) {
            console.error('Failed to trigger page animations:', error);
        }
    }
    
    // Public API methods
    getCurrentRoute() {
        return this.currentRoute;
    }
    
    getRouteConfig(path) {
        return this.routes.get(this.normalizePath(path));
    }
    
    getAllRoutes() {
        return Array.from(this.routes.keys());
    }
}

// Global router instance - DISABLED for separate HTML files
// window.router = new Router();

// Global navigation function for backward compatibility
window.showSection = function(sectionId) {
    const routeMap = {
        'home': '/',
        'upload': '/upload.html',
        'analysis': '/analysis.html',
        'candidates': '/candidates.html',
        'jobs': '/jobs.html',
        'matches': '/matches.html',
        'analytics': '/analysis.html'
    };
    
    const route = routeMap[sectionId] || '/';
    window.location.href = route;
};

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Router;
}