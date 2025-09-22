// Real-time Data Updates System for Resumify
// Handles automatic refresh of candidates, jobs, and matches data

class RealtimeDataUpdates {
    constructor() {
        this.updateIntervals = new Map(); // Track update intervals by page type
        this.lastDataCounts = new Map(); // Track data counts for change detection
        this.isPageVisible = true;
        this.defaultUpdateInterval = 30000; // 30 seconds
        this.fastUpdateInterval = 10000; // 10 seconds for active operations
        this.callbacks = new Map(); // Store callbacks for different data types
        
        // Initialize page visibility handling
        this.initializeVisibilityHandling();
        
        console.log('🔄 Real-time data updates system initialized');
    }

    /**
     * Initialize page visibility handling to pause updates when page is hidden
     */
    initializeVisibilityHandling() {
        document.addEventListener('visibilitychange', () => {
            this.isPageVisible = !document.hidden;
            
            if (this.isPageVisible) {
                console.log('📱 Page became visible - resuming real-time updates');
                this.resumeAllUpdates();
            } else {
                console.log('📱 Page became hidden - pausing real-time updates');
                this.pauseAllUpdates();
            }
        });
    }

    /**
     * Start real-time updates for candidates data
     * @param {Function} onUpdate - Callback when candidates data changes
     * @param {Function} onError - Callback when error occurs
     * @param {number} interval - Update interval in milliseconds
     */
    startCandidatesUpdates(onUpdate, onError = null, interval = this.defaultUpdateInterval) {
        const updateKey = 'candidates';
        
        // Clear existing interval if any
        this.stopUpdates(updateKey);
        
        // Store callbacks
        this.callbacks.set(updateKey, { onUpdate, onError });
        
        // Initial data load
        this.checkCandidatesUpdates();
        
        // Set up periodic updates
        const intervalId = setInterval(() => {
            if (this.isPageVisible) {
                this.checkCandidatesUpdates();
            }
        }, interval);
        
        this.updateIntervals.set(updateKey, intervalId);
        
        console.log(`🔄 Started candidates real-time updates (${interval}ms interval)`);
    }

    /**
     * Start real-time updates for jobs data
     * @param {Function} onUpdate - Callback when jobs data changes
     * @param {Function} onError - Callback when error occurs
     * @param {number} interval - Update interval in milliseconds
     */
    startJobsUpdates(onUpdate, onError = null, interval = this.defaultUpdateInterval) {
        const updateKey = 'jobs';
        
        // Clear existing interval if any
        this.stopUpdates(updateKey);
        
        // Store callbacks
        this.callbacks.set(updateKey, { onUpdate, onError });
        
        // Initial data load
        this.checkJobsUpdates();
        
        // Set up periodic updates
        const intervalId = setInterval(() => {
            if (this.isPageVisible) {
                this.checkJobsUpdates();
            }
        }, interval);
        
        this.updateIntervals.set(updateKey, intervalId);
        
        console.log(`🔄 Started jobs real-time updates (${interval}ms interval)`);
    }

    /**
     * Start real-time updates for matches data
     * @param {string} candidateId - Candidate ID to monitor matches for
     * @param {Function} onUpdate - Callback when matches data changes
     * @param {Function} onError - Callback when error occurs
     * @param {number} interval - Update interval in milliseconds
     */
    startMatchesUpdates(candidateId, onUpdate, onError = null, interval = this.defaultUpdateInterval) {
        const updateKey = `matches_${candidateId}`;
        
        // Clear existing interval if any
        this.stopUpdates(updateKey);
        
        // Store callbacks and candidate ID
        this.callbacks.set(updateKey, { onUpdate, onError, candidateId });
        
        // Initial data load
        this.checkMatchesUpdates(candidateId);
        
        // Set up periodic updates
        const intervalId = setInterval(() => {
            if (this.isPageVisible) {
                this.checkMatchesUpdates(candidateId);
            }
        }, interval);
        
        this.updateIntervals.set(updateKey, intervalId);
        
        console.log(`🔄 Started matches real-time updates for candidate ${candidateId} (${interval}ms interval)`);
    }

    /**
     * Check for candidates data updates
     */
    async checkCandidatesUpdates() {
        try {
            const response = await window.resumifyAPI.getCandidates();
            
            if (response.success && response.data) {
                const newCount = response.data.length;
                const lastCount = this.lastDataCounts.get('candidates') || 0;
                
                // Check if data has changed
                if (newCount !== lastCount) {
                    const changeType = newCount > lastCount ? 'added' : 'removed';
                    const changeCount = Math.abs(newCount - lastCount);
                    
                    console.log(`📊 Candidates data changed: ${changeCount} ${changeType} (${lastCount} → ${newCount})`);
                    
                    // Update stored count
                    this.lastDataCounts.set('candidates', newCount);
                    
                    // Call update callback
                    const callbacks = this.callbacks.get('candidates');
                    if (callbacks && callbacks.onUpdate) {
                        callbacks.onUpdate(response.data, {
                            changeType,
                            changeCount,
                            previousCount: lastCount,
                            newCount
                        });
                    }
                } else {
                    // Data hasn't changed, but still call update for refresh
                    const callbacks = this.callbacks.get('candidates');
                    if (callbacks && callbacks.onUpdate) {
                        callbacks.onUpdate(response.data, {
                            changeType: 'none',
                            changeCount: 0,
                            previousCount: lastCount,
                            newCount
                        });
                    }
                }
            }
        } catch (error) {
            console.error('❌ Failed to check candidates updates:', error);
            
            const callbacks = this.callbacks.get('candidates');
            if (callbacks && callbacks.onError) {
                callbacks.onError(error);
            }
        }
    }

    /**
     * Check for jobs data updates
     */
    async checkJobsUpdates() {
        try {
            const response = await window.resumifyAPI.getJobs();
            
            if (response.success && response.data) {
                const newCount = response.data.length;
                const lastCount = this.lastDataCounts.get('jobs') || 0;
                
                // Check if data has changed
                if (newCount !== lastCount) {
                    const changeType = newCount > lastCount ? 'added' : 'removed';
                    const changeCount = Math.abs(newCount - lastCount);
                    
                    console.log(`📊 Jobs data changed: ${changeCount} ${changeType} (${lastCount} → ${newCount})`);
                    
                    // Update stored count
                    this.lastDataCounts.set('jobs', newCount);
                    
                    // Call update callback
                    const callbacks = this.callbacks.get('jobs');
                    if (callbacks && callbacks.onUpdate) {
                        callbacks.onUpdate(response.data, {
                            changeType,
                            changeCount,
                            previousCount: lastCount,
                            newCount
                        });
                    }
                } else {
                    // Data hasn't changed, but still call update for refresh
                    const callbacks = this.callbacks.get('jobs');
                    if (callbacks && callbacks.onUpdate) {
                        callbacks.onUpdate(response.data, {
                            changeType: 'none',
                            changeCount: 0,
                            previousCount: lastCount,
                            newCount
                        });
                    }
                }
            }
        } catch (error) {
            console.error('❌ Failed to check jobs updates:', error);
            
            const callbacks = this.callbacks.get('jobs');
            if (callbacks && callbacks.onError) {
                callbacks.onError(error);
            }
        }
    }

    /**
     * Check for matches data updates
     * @param {string} candidateId - Candidate ID to check matches for
     */
    async checkMatchesUpdates(candidateId) {
        try {
            const response = await window.resumifyAPI.getMatches(candidateId, 10);
            
            if (response.success && response.data) {
                const updateKey = `matches_${candidateId}`;
                const newCount = response.data.length;
                const lastCount = this.lastDataCounts.get(updateKey) || 0;
                
                // Check if data has changed
                if (newCount !== lastCount) {
                    const changeType = newCount > lastCount ? 'added' : 'removed';
                    const changeCount = Math.abs(newCount - lastCount);
                    
                    console.log(`📊 Matches data changed for ${candidateId}: ${changeCount} ${changeType} (${lastCount} → ${newCount})`);
                    
                    // Update stored count
                    this.lastDataCounts.set(updateKey, newCount);
                    
                    // Call update callback
                    const callbacks = this.callbacks.get(updateKey);
                    if (callbacks && callbacks.onUpdate) {
                        callbacks.onUpdate(response.data, {
                            changeType,
                            changeCount,
                            previousCount: lastCount,
                            newCount,
                            candidateId
                        });
                    }
                } else {
                    // Data hasn't changed, but still call update for refresh
                    const callbacks = this.callbacks.get(updateKey);
                    if (callbacks && callbacks.onUpdate) {
                        callbacks.onUpdate(response.data, {
                            changeType: 'none',
                            changeCount: 0,
                            previousCount: lastCount,
                            newCount,
                            candidateId
                        });
                    }
                }
            }
        } catch (error) {
            console.error(`❌ Failed to check matches updates for ${candidateId}:`, error);
            
            const updateKey = `matches_${candidateId}`;
            const callbacks = this.callbacks.get(updateKey);
            if (callbacks && callbacks.onError) {
                callbacks.onError(error);
            }
        }
    }

    /**
     * Stop updates for a specific data type
     * @param {string} updateKey - Key identifying the update type
     */
    stopUpdates(updateKey) {
        const intervalId = this.updateIntervals.get(updateKey);
        if (intervalId) {
            clearInterval(intervalId);
            this.updateIntervals.delete(updateKey);
            this.callbacks.delete(updateKey);
            console.log(`⏹️ Stopped real-time updates for: ${updateKey}`);
        }
    }

    /**
     * Stop all real-time updates
     */
    stopAllUpdates() {
        for (const [updateKey, intervalId] of this.updateIntervals) {
            clearInterval(intervalId);
            console.log(`⏹️ Stopped real-time updates for: ${updateKey}`);
        }
        
        this.updateIntervals.clear();
        this.callbacks.clear();
        this.lastDataCounts.clear();
        
        console.log('⏹️ All real-time updates stopped');
    }

    /**
     * Pause all updates (keeps intervals but stops execution)
     */
    pauseAllUpdates() {
        // Updates are automatically paused when isPageVisible is false
        console.log('⏸️ Real-time updates paused');
    }

    /**
     * Resume all updates
     */
    resumeAllUpdates() {
        // Immediately check for updates when page becomes visible
        for (const [updateKey, callbacks] of this.callbacks) {
            if (updateKey === 'candidates') {
                this.checkCandidatesUpdates();
            } else if (updateKey === 'jobs') {
                this.checkJobsUpdates();
            } else if (updateKey.startsWith('matches_')) {
                const candidateId = callbacks.candidateId;
                if (candidateId) {
                    this.checkMatchesUpdates(candidateId);
                }
            }
        }
        
        console.log('▶️ Real-time updates resumed');
    }

    /**
     * Enable fast updates (shorter interval) for active operations
     * @param {string} updateKey - Key identifying the update type
     */
    enableFastUpdates(updateKey) {
        const callbacks = this.callbacks.get(updateKey);
        if (!callbacks) return;
        
        // Stop current updates
        this.stopUpdates(updateKey);
        
        // Restart with fast interval
        if (updateKey === 'candidates') {
            this.startCandidatesUpdates(callbacks.onUpdate, callbacks.onError, this.fastUpdateInterval);
        } else if (updateKey === 'jobs') {
            this.startJobsUpdates(callbacks.onUpdate, callbacks.onError, this.fastUpdateInterval);
        } else if (updateKey.startsWith('matches_')) {
            this.startMatchesUpdates(callbacks.candidateId, callbacks.onUpdate, callbacks.onError, this.fastUpdateInterval);
        }
        
        console.log(`⚡ Enabled fast updates for: ${updateKey}`);
    }

    /**
     * Disable fast updates (return to normal interval)
     * @param {string} updateKey - Key identifying the update type
     */
    disableFastUpdates(updateKey) {
        const callbacks = this.callbacks.get(updateKey);
        if (!callbacks) return;
        
        // Stop current updates
        this.stopUpdates(updateKey);
        
        // Restart with normal interval
        if (updateKey === 'candidates') {
            this.startCandidatesUpdates(callbacks.onUpdate, callbacks.onError, this.defaultUpdateInterval);
        } else if (updateKey === 'jobs') {
            this.startJobsUpdates(callbacks.onUpdate, callbacks.onError, this.defaultUpdateInterval);
        } else if (updateKey.startsWith('matches_')) {
            this.startMatchesUpdates(callbacks.candidateId, callbacks.onUpdate, callbacks.onError, this.defaultUpdateInterval);
        }
        
        console.log(`🔄 Disabled fast updates for: ${updateKey}`);
    }

    /**
     * Get current update status
     * @returns {Object} Status information
     */
    getStatus() {
        return {
            activeUpdates: Array.from(this.updateIntervals.keys()),
            isPageVisible: this.isPageVisible,
            dataCounts: Object.fromEntries(this.lastDataCounts),
            intervals: {
                default: this.defaultUpdateInterval,
                fast: this.fastUpdateInterval
            }
        };
    }

    /**
     * Show notification for data changes
     * @param {string} type - Type of data (candidates, jobs, matches)
     * @param {Object} changeInfo - Information about the change
     */
    showChangeNotification(type, changeInfo) {
        if (changeInfo.changeType === 'none') return;
        
        // Create notification element
        let notification = document.getElementById('dataChangeNotification');
        if (!notification) {
            notification = document.createElement('div');
            notification.id = 'dataChangeNotification';
            notification.className = 'fixed top-24 right-6 z-50 transform translate-x-full transition-transform duration-300';
            document.body.appendChild(notification);
        }

        const icon = type === 'candidates' ? 'user-plus' : type === 'jobs' ? 'briefcase' : 'zap';
        const color = changeInfo.changeType === 'added' ? 'mint' : 'yellow';
        
        notification.innerHTML = `
            <div class="gradient-border">
                <div class="gradient-border-inner p-4 min-w-80">
                    <div class="flex items-center space-x-3">
                        <div class="w-10 h-10 bg-gradient-to-r from-${color} to-blue rounded-xl flex items-center justify-center">
                            <i data-lucide="${icon}" class="w-5 h-5 text-dark"></i>
                        </div>
                        <div class="flex-1">
                            <h4 class="text-sm font-semibold text-cream heading-font">
                                ${type.charAt(0).toUpperCase() + type.slice(1)} Updated!
                            </h4>
                            <p class="text-xs text-cream/70 font-montserrat">
                                ${changeInfo.changeCount} ${type} ${changeInfo.changeType}
                            </p>
                        </div>
                        <button onclick="this.parentElement.parentElement.parentElement.parentElement.classList.add('translate-x-full')" 
                                class="text-cream/50 hover:text-cream transition-colors">
                            <i data-lucide="x" class="w-4 h-4"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Show notification
        setTimeout(() => {
            notification.classList.remove('translate-x-full');
            if (window.lucide) {
                lucide.createIcons();
            }
        }, 100);

        // Auto-hide after 5 seconds
        setTimeout(() => {
            notification.classList.add('translate-x-full');
        }, 5000);
    }
}

// Create global instance
window.realtimeDataUpdates = new RealtimeDataUpdates();

// Clean up on page unload
window.addEventListener('beforeunload', () => {
    window.realtimeDataUpdates.stopAllUpdates();
});

console.log('🚀 Real-time data updates system loaded');