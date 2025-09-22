// Enhanced Loading States for Real-time Updates
// Provides better user feedback during data operations

class LoadingStates {
    constructor() {
        this.activeLoadings = new Map(); // Track active loading states
        this.loadingQueue = new Set(); // Queue of pending operations
        
        console.log('🔄 Loading states system initialized');
    }

    /**
     * Show loading state for a specific operation
     * @param {string} operation - Operation identifier
     * @param {string} message - Loading message
     * @param {string} elementId - Target element ID
     * @param {Object} options - Additional options
     */
    showLoading(operation, message = 'Loading...', elementId = null, options = {}) {
        const loadingInfo = {
            operation,
            message,
            elementId,
            startTime: Date.now(),
            options: {
                showProgress: false,
                showCancel: false,
                timeout: 30000, // 30 seconds default timeout
                ...options
            }
        };

        this.activeLoadings.set(operation, loadingInfo);
        this.loadingQueue.add(operation);

        if (elementId) {
            this.renderLoadingInElement(elementId, loadingInfo);
        } else {
            this.showGlobalLoading(loadingInfo);
        }

        // Set timeout if specified
        if (loadingInfo.options.timeout > 0) {
            setTimeout(() => {
                if (this.activeLoadings.has(operation)) {
                    this.hideLoading(operation, 'timeout');
                }
            }, loadingInfo.options.timeout);
        }

        console.log(`🔄 Started loading: ${operation} - ${message}`);
    }

    /**
     * Update loading progress
     * @param {string} operation - Operation identifier
     * @param {number} progress - Progress percentage (0-100)
     * @param {string} message - Updated message
     */
    updateProgress(operation, progress, message = null) {
        const loadingInfo = this.activeLoadings.get(operation);
        if (!loadingInfo) return;

        loadingInfo.progress = Math.max(0, Math.min(100, progress));
        if (message) {
            loadingInfo.message = message;
        }

        if (loadingInfo.elementId) {
            this.updateLoadingInElement(loadingInfo.elementId, loadingInfo);
        } else {
            this.updateGlobalLoading(loadingInfo);
        }

        console.log(`📊 Progress update: ${operation} - ${progress}% - ${loadingInfo.message}`);
    }

    /**
     * Hide loading state
     * @param {string} operation - Operation identifier
     * @param {string} reason - Reason for hiding (success, error, timeout, cancel)
     */
    hideLoading(operation, reason = 'success') {
        const loadingInfo = this.activeLoadings.get(operation);
        if (!loadingInfo) return;

        const duration = Date.now() - loadingInfo.startTime;
        
        this.activeLoadings.delete(operation);
        this.loadingQueue.delete(operation);

        if (loadingInfo.elementId) {
            this.clearLoadingFromElement(loadingInfo.elementId, reason);
        } else {
            this.hideGlobalLoading(reason);
        }

        console.log(`✅ Completed loading: ${operation} - ${reason} (${duration}ms)`);
    }

    /**
     * Render loading state in specific element
     * @param {string} elementId - Target element ID
     * @param {Object} loadingInfo - Loading information
     */
    renderLoadingInElement(elementId, loadingInfo) {
        const element = document.getElementById(elementId);
        if (!element) return;

        const loadingHTML = this.createLoadingHTML(loadingInfo);
        element.innerHTML = loadingHTML;
        element.classList.remove('hidden');

        // Initialize icons if lucide is available
        if (window.lucide) {
            lucide.createIcons();
        }
    }

    /**
     * Update loading state in element
     * @param {string} elementId - Target element ID
     * @param {Object} loadingInfo - Loading information
     */
    updateLoadingInElement(elementId, loadingInfo) {
        const element = document.getElementById(elementId);
        if (!element) return;

        const progressBar = element.querySelector('.loading-progress-bar');
        const messageElement = element.querySelector('.loading-message');

        if (progressBar && loadingInfo.progress !== undefined) {
            progressBar.style.width = `${loadingInfo.progress}%`;
        }

        if (messageElement) {
            messageElement.textContent = loadingInfo.message;
        }
    }

    /**
     * Clear loading from element
     * @param {string} elementId - Target element ID
     * @param {string} reason - Completion reason
     */
    clearLoadingFromElement(elementId, reason) {
        const element = document.getElementById(elementId);
        if (!element) return;

        if (reason === 'success') {
            // Show brief success state before clearing
            element.innerHTML = this.createSuccessHTML();
            setTimeout(() => {
                element.classList.add('hidden');
            }, 1000);
        } else if (reason === 'error' || reason === 'timeout') {
            // Show error state
            element.innerHTML = this.createErrorHTML(reason);
            setTimeout(() => {
                element.classList.add('hidden');
            }, 3000);
        } else {
            element.classList.add('hidden');
        }

        if (window.lucide) {
            lucide.createIcons();
        }
    }

    /**
     * Show global loading overlay
     * @param {Object} loadingInfo - Loading information
     */
    showGlobalLoading(loadingInfo) {
        let overlay = document.getElementById('globalLoadingOverlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'globalLoadingOverlay';
            overlay.className = 'fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50';
            document.body.appendChild(overlay);
        }

        overlay.innerHTML = `
            <div class="gradient-border">
                <div class="gradient-border-inner p-8 max-w-md">
                    ${this.createLoadingHTML(loadingInfo)}
                </div>
            </div>
        `;

        overlay.classList.remove('hidden');

        if (window.lucide) {
            lucide.createIcons();
        }
    }

    /**
     * Update global loading overlay
     * @param {Object} loadingInfo - Loading information
     */
    updateGlobalLoading(loadingInfo) {
        const overlay = document.getElementById('globalLoadingOverlay');
        if (!overlay) return;

        const progressBar = overlay.querySelector('.loading-progress-bar');
        const messageElement = overlay.querySelector('.loading-message');

        if (progressBar && loadingInfo.progress !== undefined) {
            progressBar.style.width = `${loadingInfo.progress}%`;
        }

        if (messageElement) {
            messageElement.textContent = loadingInfo.message;
        }
    }

    /**
     * Hide global loading overlay
     * @param {string} reason - Completion reason
     */
    hideGlobalLoading(reason) {
        const overlay = document.getElementById('globalLoadingOverlay');
        if (!overlay) return;

        if (reason === 'success') {
            overlay.innerHTML = `
                <div class="gradient-border">
                    <div class="gradient-border-inner p-8 max-w-md">
                        ${this.createSuccessHTML()}
                    </div>
                </div>
            `;
            setTimeout(() => {
                overlay.classList.add('hidden');
            }, 1000);
        } else if (reason === 'error' || reason === 'timeout') {
            overlay.innerHTML = `
                <div class="gradient-border">
                    <div class="gradient-border-inner p-8 max-w-md">
                        ${this.createErrorHTML(reason)}
                    </div>
                </div>
            `;
            setTimeout(() => {
                overlay.classList.add('hidden');
            }, 3000);
        } else {
            overlay.classList.add('hidden');
        }

        if (window.lucide) {
            lucide.createIcons();
        }
    }

    /**
     * Create loading HTML
     * @param {Object} loadingInfo - Loading information
     * @returns {string} HTML string
     */
    createLoadingHTML(loadingInfo) {
        const showProgress = loadingInfo.options.showProgress && loadingInfo.progress !== undefined;
        
        return `
            <div class="text-center">
                <div class="relative mx-auto mb-6" style="width: fit-content;">
                    <div class="w-16 h-16 border-4 border-cream/20 border-t-mint rounded-full animate-spin"></div>
                    <div class="absolute inset-0 w-16 h-16 border-4 border-transparent border-r-blue rounded-full animate-spin" style="animation-direction: reverse; animation-duration: 1.5s;"></div>
                </div>
                
                <h3 class="text-xl font-semibold text-cream mb-2 heading-font loading-message">
                    ${loadingInfo.message}
                </h3>
                
                ${showProgress ? `
                    <div class="w-full bg-cream/20 rounded-full h-2 mb-4">
                        <div class="loading-progress-bar bg-gradient-to-r from-mint to-blue h-2 rounded-full transition-all duration-300" 
                             style="width: ${loadingInfo.progress || 0}%"></div>
                    </div>
                    <p class="text-sm text-cream/70 font-montserrat">${loadingInfo.progress || 0}% complete</p>
                ` : `
                    <div class="flex items-center justify-center gap-2 text-sm text-cream/50 font-montserrat">
                        <div class="w-2 h-2 bg-mint rounded-full animate-pulse"></div>
                        <div class="w-2 h-2 bg-blue rounded-full animate-pulse" style="animation-delay: 0.2s;"></div>
                        <div class="w-2 h-2 bg-yellow rounded-full animate-pulse" style="animation-delay: 0.4s;"></div>
                    </div>
                `}
                
                ${loadingInfo.options.showCancel ? `
                    <button onclick="window.loadingStates.cancelOperation('${loadingInfo.operation}')" 
                            class="mt-4 px-4 py-2 border border-red/50 rounded-lg text-red hover:bg-red/10 transition-colors font-montserrat text-sm">
                        Cancel
                    </button>
                ` : ''}
            </div>
        `;
    }

    /**
     * Create success HTML
     * @returns {string} HTML string
     */
    createSuccessHTML() {
        return `
            <div class="text-center">
                <div class="w-16 h-16 bg-gradient-to-r from-mint to-blue rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <i data-lucide="check" class="w-8 h-8 text-dark"></i>
                </div>
                <h3 class="text-xl font-semibold text-cream mb-2 heading-font">Success!</h3>
                <p class="text-cream/70 font-montserrat">Operation completed successfully</p>
            </div>
        `;
    }

    /**
     * Create error HTML
     * @param {string} reason - Error reason
     * @returns {string} HTML string
     */
    createErrorHTML(reason) {
        const messages = {
            error: 'An error occurred',
            timeout: 'Operation timed out',
            cancel: 'Operation cancelled'
        };

        const icons = {
            error: 'alert-circle',
            timeout: 'clock',
            cancel: 'x-circle'
        };

        return `
            <div class="text-center">
                <div class="w-16 h-16 bg-gradient-to-r from-red to-yellow rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <i data-lucide="${icons[reason] || 'alert-circle'}" class="w-8 h-8 text-dark"></i>
                </div>
                <h3 class="text-xl font-semibold text-cream mb-2 heading-font">${messages[reason] || 'Error'}</h3>
                <p class="text-cream/70 font-montserrat">Please try again</p>
            </div>
        `;
    }

    /**
     * Cancel an operation
     * @param {string} operation - Operation identifier
     */
    cancelOperation(operation) {
        this.hideLoading(operation, 'cancel');
        
        // Emit cancel event for cleanup
        const event = new CustomEvent('loadingCancelled', { 
            detail: { operation } 
        });
        document.dispatchEvent(event);
    }

    /**
     * Get current loading status
     * @returns {Object} Status information
     */
    getStatus() {
        return {
            activeOperations: Array.from(this.activeLoadings.keys()),
            queueSize: this.loadingQueue.size,
            operations: Object.fromEntries(this.activeLoadings)
        };
    }

    /**
     * Clear all loading states
     */
    clearAll() {
        for (const operation of this.activeLoadings.keys()) {
            this.hideLoading(operation, 'cancel');
        }
        
        console.log('🧹 Cleared all loading states');
    }
}

// Create global instance
window.loadingStates = new LoadingStates();

// Clean up on page unload
window.addEventListener('beforeunload', () => {
    window.loadingStates.clearAll();
});

console.log('🚀 Loading states system loaded');