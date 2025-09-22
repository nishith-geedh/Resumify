/**
 * Text Extraction Error Handling Utilities for Frontend
 * 
 * This module provides comprehensive error handling for text extraction failures
 * and user-friendly error messages with fallback behaviors.
 */

class TextExtractionErrorHandler {
    
    /**
     * Error type constants matching backend error types
     */
    static ErrorTypes = {
        TEXTRACT_JOB_FAILED: 'textract_job_failed',
        TEXTRACT_TIMEOUT: 'textract_timeout',
        TEXTRACT_INVALID_JOB: 'textract_invalid_job',
        TEXTRACT_SERVICE_ERROR: 'textract_service_error',
        DOCUMENT_CORRUPTED: 'document_corrupted',
        DOCUMENT_ENCRYPTED: 'document_encrypted',
        DOCUMENT_TOO_LARGE: 'document_too_large',
        UNSUPPORTED_FORMAT: 'unsupported_format',
        NETWORK_ERROR: 'network_error',
        PERMISSION_DENIED: 'permission_denied',
        PROCESSING_TIMEOUT: 'processing_timeout',
        EMPTY_DOCUMENT: 'empty_document',
        UNKNOWN_ERROR: 'unknown_error'
    };

    /**
     * User-friendly error messages and actions
     */
    static ErrorMessages = {
        [this.ErrorTypes.TEXTRACT_JOB_FAILED]: {
            title: 'Document Processing Failed',
            message: 'We encountered an issue while processing your document.',
            icon: 'alert-triangle',
            color: '#F24E32',
            actions: ['retry', 'try-different-file', 'manual-input']
        },
        [this.ErrorTypes.TEXTRACT_TIMEOUT]: {
            title: 'Processing Timeout',
            message: 'Document processing took too long. The file may be too large or complex.',
            icon: 'clock',
            color: '#FFD646',
            actions: ['retry', 'try-smaller-file', 'manual-input']
        },
        [this.ErrorTypes.TEXTRACT_INVALID_JOB]: {
            title: 'Processing Session Expired',
            message: 'The processing session has expired. Please upload your document again.',
            icon: 'refresh-cw',
            color: '#4EC4FE',
            actions: ['upload-again', 'manual-input']
        },
        [this.ErrorTypes.TEXTRACT_SERVICE_ERROR]: {
            title: 'Service Temporarily Unavailable',
            message: 'Our text extraction service is temporarily unavailable. Please try again in a few minutes.',
            icon: 'server',
            color: '#FFD646',
            actions: ['retry-later', 'manual-input']
        },
        [this.ErrorTypes.DOCUMENT_CORRUPTED]: {
            title: 'Document Appears Corrupted',
            message: 'The document file appears to be damaged or corrupted.',
            icon: 'file-x',
            color: '#F24E32',
            actions: ['try-different-file', 'repair-document', 'manual-input']
        },
        [this.ErrorTypes.DOCUMENT_ENCRYPTED]: {
            title: 'Document is Password Protected',
            message: 'This document is password-protected or encrypted and cannot be processed.',
            icon: 'lock',
            color: '#FFD646',
            actions: ['remove-password', 'try-different-file', 'manual-input']
        },
        [this.ErrorTypes.DOCUMENT_TOO_LARGE]: {
            title: 'File Too Large',
            message: 'The document file is too large for processing. Please use a file smaller than 10MB.',
            icon: 'file-minus',
            color: '#F24E32',
            actions: ['compress-file', 'try-smaller-file', 'manual-input']
        },
        [this.ErrorTypes.UNSUPPORTED_FORMAT]: {
            title: 'Unsupported File Format',
            message: 'This file format is not supported. Please use PDF, DOCX, or TXT files.',
            icon: 'file-type',
            color: '#F24E32',
            actions: ['convert-format', 'try-different-file', 'manual-input']
        },
        [this.ErrorTypes.NETWORK_ERROR]: {
            title: 'Connection Error',
            message: 'Network connection error occurred. Please check your internet connection.',
            icon: 'wifi-off',
            color: '#F24E32',
            actions: ['check-connection', 'retry', 'manual-input']
        },
        [this.ErrorTypes.PERMISSION_DENIED]: {
            title: 'Access Denied',
            message: 'Access was denied while processing the document.',
            icon: 'shield-x',
            color: '#F24E32',
            actions: ['check-permissions', 'try-different-file', 'manual-input']
        },
        [this.ErrorTypes.PROCESSING_TIMEOUT]: {
            title: 'Processing Timeout',
            message: 'Document processing timed out. Please try a smaller or simpler document.',
            icon: 'clock',
            color: '#FFD646',
            actions: ['try-smaller-file', 'retry', 'manual-input']
        },
        [this.ErrorTypes.EMPTY_DOCUMENT]: {
            title: 'No Text Content Found',
            message: 'The document appears to be empty or contains only images without selectable text.',
            icon: 'file-text',
            color: '#FFD646',
            actions: ['check-content', 'try-different-file', 'manual-input']
        },
        [this.ErrorTypes.UNKNOWN_ERROR]: {
            title: 'Unexpected Error',
            message: 'An unexpected error occurred during text extraction.',
            icon: 'help-circle',
            color: '#F24E32',
            actions: ['retry', 'contact-support', 'manual-input']
        }
    };

    /**
     * Action button configurations
     */
    static ActionButtons = {
        'retry': {
            text: 'Try Again',
            class: 'btn-secondary',
            icon: 'refresh-cw',
            action: 'retry'
        },
        'retry-later': {
            text: 'Try Again Later',
            class: 'btn-secondary',
            icon: 'clock',
            action: 'retry'
        },
        'try-different-file': {
            text: 'Try Different File',
            class: 'btn-secondary',
            icon: 'upload',
            action: 'upload-new'
        },
        'try-smaller-file': {
            text: 'Try Smaller File',
            class: 'btn-secondary',
            icon: 'file-minus',
            action: 'upload-new'
        },
        'upload-again': {
            text: 'Upload Again',
            class: 'btn-secondary',
            icon: 'upload',
            action: 'upload-new'
        },
        'manual-input': {
            text: 'Enter Text Manually',
            class: 'btn-primary',
            icon: 'edit-3',
            action: 'manual-input'
        },
        'check-connection': {
            text: 'Check Connection',
            class: 'btn-secondary',
            icon: 'wifi',
            action: 'check-connection'
        },
        'contact-support': {
            text: 'Contact Support',
            class: 'btn-secondary',
            icon: 'help-circle',
            action: 'contact-support'
        },
        'remove-password': {
            text: 'Remove Password',
            class: 'btn-secondary',
            icon: 'unlock',
            action: 'help'
        },
        'compress-file': {
            text: 'Compress File',
            class: 'btn-secondary',
            icon: 'archive',
            action: 'help'
        },
        'convert-format': {
            text: 'Convert Format',
            class: 'btn-secondary',
            icon: 'file-type',
            action: 'help'
        },
        'repair-document': {
            text: 'Repair Document',
            class: 'btn-secondary',
            icon: 'tool',
            action: 'help'
        },
        'check-permissions': {
            text: 'Check Permissions',
            class: 'btn-secondary',
            icon: 'shield',
            action: 'help'
        },
        'check-content': {
            text: 'Check Content',
            class: 'btn-secondary',
            icon: 'search',
            action: 'help'
        }
    };

    /**
     * Get error information for display
     * @param {Object} error - Error object from API
     * @returns {Object} Formatted error information
     */
    static getErrorInfo(error) {
        let errorType = this.ErrorTypes.UNKNOWN_ERROR;
        let errorMessage = 'An unexpected error occurred during processing.';
        let suggestedAction = null;
        let retryPossible = true;

        if (error && typeof error === 'object') {
            if (error.type) {
                errorType = error.type;
            }
            if (error.message) {
                errorMessage = error.message;
            }
            if (error.suggestedAction) {
                suggestedAction = error.suggestedAction;
            }
            if (typeof error.retryPossible === 'boolean') {
                retryPossible = error.retryPossible;
            }
        } else if (typeof error === 'string') {
            errorMessage = error;
            errorType = this.classifyErrorFromMessage(error);
        }

        const errorConfig = this.ErrorMessages[errorType] || this.ErrorMessages[this.ErrorTypes.UNKNOWN_ERROR];

        return {
            type: errorType,
            title: errorConfig.title,
            message: errorMessage,
            suggestedAction: suggestedAction,
            retryPossible: retryPossible,
            icon: errorConfig.icon,
            color: errorConfig.color,
            actions: errorConfig.actions
        };
    }

    /**
     * Classify error type from error message string
     * @param {string} message - Error message
     * @returns {string} Error type
     */
    static classifyErrorFromMessage(message) {
        const messageLower = message.toLowerCase();

        if (messageLower.includes('textract')) {
            if (messageLower.includes('invalid') || messageLower.includes('expired')) {
                return this.ErrorTypes.TEXTRACT_INVALID_JOB;
            } else if (messageLower.includes('timeout') || messageLower.includes('timed out')) {
                return this.ErrorTypes.TEXTRACT_TIMEOUT;
            } else if (messageLower.includes('failed')) {
                return this.ErrorTypes.TEXTRACT_JOB_FAILED;
            } else {
                return this.ErrorTypes.TEXTRACT_SERVICE_ERROR;
            }
        }

        if (messageLower.includes('corrupt') || messageLower.includes('damaged')) {
            return this.ErrorTypes.DOCUMENT_CORRUPTED;
        }

        if (messageLower.includes('password') || messageLower.includes('encrypted')) {
            return this.ErrorTypes.DOCUMENT_ENCRYPTED;
        }

        if (messageLower.includes('too large') || messageLower.includes('size limit')) {
            return this.ErrorTypes.DOCUMENT_TOO_LARGE;
        }

        if (messageLower.includes('unsupported') || messageLower.includes('format')) {
            return this.ErrorTypes.UNSUPPORTED_FORMAT;
        }

        if (messageLower.includes('empty') || messageLower.includes('no text')) {
            return this.ErrorTypes.EMPTY_DOCUMENT;
        }

        if (messageLower.includes('network') || messageLower.includes('connection')) {
            return this.ErrorTypes.NETWORK_ERROR;
        }

        if (messageLower.includes('permission') || messageLower.includes('access denied')) {
            return this.ErrorTypes.PERMISSION_DENIED;
        }

        if (messageLower.includes('timeout')) {
            return this.ErrorTypes.PROCESSING_TIMEOUT;
        }

        return this.ErrorTypes.UNKNOWN_ERROR;
    }

    /**
     * Create error modal content
     * @param {Object} errorInfo - Error information from getErrorInfo
     * @returns {string} HTML content for error modal
     */
    static createErrorModalContent(errorInfo) {
        const actionButtons = errorInfo.actions.map(actionKey => {
            const action = this.ActionButtons[actionKey];
            if (!action) return '';

            return `
                <button class="btn-modal ${action.class} error-action-btn" 
                        data-action="${action.action}" 
                        data-action-key="${actionKey}">
                    <i data-lucide="${action.icon}" class="w-4 h-4 mr-2"></i>
                    ${action.text}
                </button>
            `;
        }).join('');

        return `
            <div class="modal-body text-center">
                <div class="error-icon" style="
                    width: 60px;
                    height: 60px;
                    background: linear-gradient(135deg, ${errorInfo.color}33, ${errorInfo.color}1A);
                    border: 2px solid ${errorInfo.color}4D;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin: 2rem auto 1.5rem;
                    animation: errorPulse 2s ease-in-out infinite;
                ">
                    <i data-lucide="${errorInfo.icon}" style="color: ${errorInfo.color}; width: 24px; height: 24px;"></i>
                </div>
                <h4 style="color: ${errorInfo.color}; margin-bottom: 1rem; font-weight: 600; font-size: 1.2rem;">
                    ${errorInfo.title}
                </h4>
                <div class="error-details" style="
                    background: ${errorInfo.color}1A;
                    border: 1px solid ${errorInfo.color}33;
                    border-radius: 0.75rem;
                    padding: 1rem;
                    margin: 1rem 0;
                ">
                    <p style="color: rgba(255, 242, 198, 0.9); font-size: 0.95rem; line-height: 1.5; margin: 0;">
                        ${errorInfo.message}
                    </p>
                    ${errorInfo.suggestedAction ? `
                        <p style="color: rgba(255, 242, 198, 0.7); font-size: 0.85rem; line-height: 1.4; margin-top: 0.5rem;">
                            <strong>Suggestion:</strong> ${errorInfo.suggestedAction}
                        </p>
                    ` : ''}
                </div>
                <div class="error-actions" style="display: flex; gap: 0.5rem; justify-content: center; flex-wrap: wrap; margin-top: 1.5rem;">
                    ${actionButtons}
                    <button class="btn-modal btn-primary close-modal">
                        <i data-lucide="x" class="w-4 h-4 mr-2"></i>
                        Close
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Handle error action button clicks
     * @param {string} action - Action type
     * @param {string} actionKey - Action key
     * @param {Function} callbacks - Callback functions for different actions
     */
    static handleErrorAction(action, actionKey, callbacks = {}) {
        switch (action) {
            case 'retry':
                if (callbacks.onRetry) {
                    callbacks.onRetry();
                } else {
                    // Default retry behavior
                    window.location.reload();
                }
                break;

            case 'upload-new':
                if (callbacks.onUploadNew) {
                    callbacks.onUploadNew();
                } else {
                    // Default upload new behavior
                    if (window.uploadManager) {
                        window.uploadManager.removeFile();
                    }
                }
                break;

            case 'manual-input':
                if (callbacks.onManualInput) {
                    callbacks.onManualInput();
                } else {
                    // Default manual input behavior
                    this.showManualInputModal();
                }
                break;

            case 'check-connection':
                if (callbacks.onCheckConnection) {
                    callbacks.onCheckConnection();
                } else {
                    // Default connection check
                    this.showConnectionCheckModal();
                }
                break;

            case 'contact-support':
                if (callbacks.onContactSupport) {
                    callbacks.onContactSupport();
                } else {
                    // Default support contact
                    this.showSupportModal();
                }
                break;

            case 'help':
                if (callbacks.onHelp) {
                    callbacks.onHelp(actionKey);
                } else {
                    // Default help behavior
                    this.showHelpModal(actionKey);
                }
                break;

            default:
                console.warn(`Unknown error action: ${action}`);
        }
    }

    /**
     * Show manual input modal
     */
    static showManualInputModal() {
        // This would be implemented based on the specific application needs
        console.log('Manual input modal would be shown here');
    }

    /**
     * Show connection check modal
     */
    static showConnectionCheckModal() {
        // This would be implemented to show connection troubleshooting
        console.log('Connection check modal would be shown here');
    }

    /**
     * Show support modal
     */
    static showSupportModal() {
        // This would be implemented to show support contact information
        console.log('Support modal would be shown here');
    }

    /**
     * Show help modal for specific actions
     * @param {string} actionKey - The action key for specific help
     */
    static showHelpModal(actionKey) {
        // This would be implemented to show specific help content
        console.log(`Help modal for ${actionKey} would be shown here`);
    }

    /**
     * Log error for debugging and analytics
     * @param {Object} error - Error object
     * @param {Object} context - Additional context
     */
    static logError(error, context = {}) {
        const logData = {
            timestamp: new Date().toISOString(),
            error: error,
            context: context,
            userAgent: navigator.userAgent,
            url: window.location.href
        };

        console.error('Text extraction error:', logData);

        // Here you could send to analytics service
        // analytics.track('text_extraction_error', logData);
    }
}

// Export for use in other modules
window.TextExtractionErrorHandler = TextExtractionErrorHandler;