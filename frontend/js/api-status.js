// API Status Indicator
class ApiStatusIndicator {
    constructor() {
        this.isVisible = false;
        this.statusElement = null;
        this.checkInterval = null;
        this.init();
    }
    
    init() {
        this.createStatusElement();
        this.startHealthChecks();
    }
    
    createStatusElement() {
        this.statusElement = document.createElement('div');
        this.statusElement.id = 'apiStatusIndicator';
        this.statusElement.className = 'fixed top-4 right-4 z-50 px-4 py-2 rounded-lg shadow-lg transition-all duration-300 transform translate-x-full opacity-0';
        this.statusElement.innerHTML = `
            <div class="flex items-center gap-2 text-sm font-medium">
                <div class="w-2 h-2 rounded-full bg-red animate-pulse"></div>
                <span>API Unavailable</span>
            </div>
        `;
        document.body.appendChild(this.statusElement);
    }
    
    show() {
        if (this.isVisible) return;
        
        this.isVisible = true;
        this.statusElement.className = 'fixed top-4 right-4 z-50 px-4 py-2 rounded-lg shadow-lg transition-all duration-300 bg-red/20 border border-red/30 text-red';
        
        // Auto-hide after 10 seconds
        setTimeout(() => {
            if (this.isVisible) {
                this.hide();
            }
        }, 10000);
    }
    
    hide() {
        if (!this.isVisible) return;
        
        this.isVisible = false;
        this.statusElement.className = 'fixed top-4 right-4 z-50 px-4 py-2 rounded-lg shadow-lg transition-all duration-300 transform translate-x-full opacity-0';
    }
    
    startHealthChecks() {
        // Check API health every 30 seconds when there are issues
        this.checkInterval = setInterval(async () => {
            if (!window.resumifyAPI.apiHealthy) {
                const isHealthy = await window.resumifyAPI.checkApiHealth();
                if (!isHealthy && !this.isVisible) {
                    this.show();
                } else if (isHealthy && this.isVisible) {
                    this.hide();
                }
            }
        }, 30000);
    }
    
    destroy() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
        }
        if (this.statusElement) {
            this.statusElement.remove();
        }
    }
}

// Initialize API status indicator when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.apiStatusIndicator = new ApiStatusIndicator();
});