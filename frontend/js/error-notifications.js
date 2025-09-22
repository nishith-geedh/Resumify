/**
 * Error Notification System for Resumify
 * Provides user-friendly notifications for API errors and server issues
 */

class ErrorNotificationManager {
    constructor() {
        this.notifications = new Map();
        this.init();
    }
    
    init() {
        // Create notification container if it doesn't exist
        if (!document.getElementById('error-notifications') && document.body) {
            const container = document.createElement('div');
            container.id = 'error-notifications';
            container.className = 'fixed top-20 right-4 z-50 space-y-2 max-w-sm';
            document.body.appendChild(container);
        }
    }
    
    showNotification(type, title, message, duration = 5000) {
        const id = Date.now().toString();
        const notification = this.createNotification(id, type, title, message);
        
        const container = document.getElementById('error-notifications');
        container.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.classList.remove('translate-x-full', 'opacity-0');
        }, 100);
        
        // Store notification
        this.notifications.set(id, notification);
        
        // Auto-remove after duration
        if (duration > 0) {
            setTimeout(() => {
                this.removeNotification(id);
            }, duration);
        }
        
        return id;
    }
    
    createNotification(id, type, title, message) {
        const notification = document.createElement('div');
        notification.id = `notification-${id}`;
        notification.className = `transform translate-x-full opacity-0 transition-all duration-300 ease-in-out`;
        
        const colors = this.getTypeColors(type);
        
        notification.innerHTML = `
            <div class="rounded-xl shadow-lg border ${colors.bg} ${colors.border} p-4 min-w-80">
                <div class="flex items-start gap-3">
                    <div class="flex-shrink-0">
                        <div class="w-8 h-8 rounded-full ${colors.iconBg} flex items-center justify-center">
                            <i data-lucide="${this.getTypeIcon(type)}" class="w-4 h-4 ${colors.iconColor}"></i>
                        </div>
                    </div>
                    <div class="flex-1 min-w-0">
                        <h4 class="text-sm font-semibold ${colors.titleColor} font-montserrat">${title}</h4>
                        <p class="text-sm ${colors.messageColor} mt-1 font-montserrat">${message}</p>
                    </div>
                    <button onclick="window.errorNotificationManager.removeNotification('${id}')" 
                            class="${colors.closeColor} hover:opacity-70 transition-opacity">
                        <i data-lucide="x" class="w-4 h-4"></i>
                    </button>
                </div>
            </div>
        `;
        
        return notification;
    }
    
    getTypeColors(type) {
        switch (type) {
            case 'error':
                return {
                    bg: 'bg-red/10 backdrop-blur-sm',
                    border: 'border-red/30',
                    iconBg: 'bg-red/20',
                    iconColor: 'text-red',
                    titleColor: 'text-red',
                    messageColor: 'text-red/80',
                    closeColor: 'text-red/60'
                };
            case 'warning':
                return {
                    bg: 'bg-yellow/10 backdrop-blur-sm',
                    border: 'border-yellow/30',
                    iconBg: 'bg-yellow/20',
                    iconColor: 'text-yellow',
                    titleColor: 'text-yellow',
                    messageColor: 'text-yellow/80',
                    closeColor: 'text-yellow/60'
                };
            case 'info':
                return {
                    bg: 'bg-blue/10 backdrop-blur-sm',
                    border: 'border-blue/30',
                    iconBg: 'bg-blue/20',
                    iconColor: 'text-blue',
                    titleColor: 'text-blue',
                    messageColor: 'text-blue/80',
                    closeColor: 'text-blue/60'
                };
            case 'success':
                return {
                    bg: 'bg-mint/10 backdrop-blur-sm',
                    border: 'border-mint/30',
                    iconBg: 'bg-mint/20',
                    iconColor: 'text-mint',
                    titleColor: 'text-mint',
                    messageColor: 'text-mint/80',
                    closeColor: 'text-mint/60'
                };
            default:
                return {
                    bg: 'bg-cream/10 backdrop-blur-sm',
                    border: 'border-cream/30',
                    iconBg: 'bg-cream/20',
                    iconColor: 'text-cream',
                    titleColor: 'text-cream',
                    messageColor: 'text-cream/80',
                    closeColor: 'text-cream/60'
                };
        }
    }
    
    getTypeIcon(type) {
        switch (type) {
            case 'error':
                return 'alert-circle';
            case 'warning':
                return 'alert-triangle';
            case 'info':
                return 'info';
            case 'success':
                return 'check-circle';
            default:
                return 'bell';
        }
    }
    
    removeNotification(id) {
        const notification = this.notifications.get(id);
        if (notification) {
            // Animate out
            notification.classList.add('translate-x-full', 'opacity-0');
            
            // Remove from DOM after animation
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
                this.notifications.delete(id);
            }, 300);
        }
    }
    
    // Convenience methods for different notification types
    showError(title, message, duration = 8000) {
        return this.showNotification('error', title, message, duration);
    }
    
    showWarning(title, message, duration = 6000) {
        return this.showNotification('warning', title, message, duration);
    }
    
    showInfo(title, message, duration = 5000) {
        return this.showNotification('info', title, message, duration);
    }
    
    showSuccess(title, message, duration = 4000) {
        return this.showNotification('success', title, message, duration);
    }
    
    // Specific method for server errors
    showServerError(retryCount = 0) {
        const title = 'Server Temporarily Unavailable';
        const message = retryCount > 0 
            ? `Retrying connection... (Attempt ${retryCount})`
            : 'We\'re experiencing temporary server issues. Your request will continue automatically.';
        
        return this.showWarning(title, message, 6000);
    }
    
    clearAll() {
        this.notifications.forEach((notification, id) => {
            this.removeNotification(id);
        });
    }
}

// Initialize global error notification manager
window.errorNotificationManager = new ErrorNotificationManager();

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
});