// Real-time text extraction status checker

class RealtimeTextExtraction {
    constructor() {
        this.pollingIntervals = new Map(); // Track polling intervals by candidate ID
        this.maxPollingTime = 10 * 60 * 1000; // 10 minutes max
        this.pollingInterval = 3000; // 3 seconds for ultra-fast detection
        
        // DOC-specific configuration
        this.docPollingConfig = {
            initialInterval: 3000,     // 3 seconds initially
            extendedInterval: 8000,    // 8 seconds after initial period
            switchThreshold: 60000,    // Switch to extended interval after 60 seconds
            maxPollingTime: 15 * 60 * 1000, // 15 minutes max for DOC files
            longRunningThreshold: 120000 // 2 minutes before showing long-running message
        };
    }
    
    /**
     * Start monitoring text extraction for a candidate
     * @param {string} candidateId - The candidate ID to monitor
     * @param {string} jobId - The Textract job ID (optional)
     * @param {function} onUpdate - Callback for status updates
     * @param {function} onComplete - Callback when extraction completes
     * @param {function} onError - Callback for errors
     * @param {string} fileType - The file type being processed (optional)
     */
    startMonitoring(candidateId, jobId = null, onUpdate = null, onComplete = null, onError = null, fileType = null) {
        console.log(`🔄 Starting real-time monitoring for candidate: ${candidateId}${fileType ? ` (${fileType})` : ''}`);
        
        // Clear any existing polling for this candidate
        this.stopMonitoring(candidateId);
        
        // Detect DOC file type
        const isDocFile = this.isDocFile(fileType, candidateId);
        const config = isDocFile ? this.docPollingConfig : {
            maxPollingTime: this.maxPollingTime,
            longRunningThreshold: 120000
        };
        
        console.log(`📋 Using ${isDocFile ? 'DOC-specific' : 'standard'} monitoring configuration`);
        
        const startTime = Date.now();
        let attempts = 0;
        let lastStatus = null;
        let currentInterval = isDocFile ? this.docPollingConfig.initialInterval : this.pollingInterval;
        
        const checkStatus = async () => {
            attempts++;
            const elapsed = Date.now() - startTime;
            
            // Check if we've exceeded max polling time (DOC-specific timeout)
            if (elapsed > config.maxPollingTime) {
                const timeoutMinutes = Math.round(config.maxPollingTime / 60000);
                console.log(`⏰ Polling timeout for candidate ${candidateId} after ${timeoutMinutes} minutes`);
                this.stopMonitoring(candidateId);
                if (onError) {
                    onError(new Error(`Text extraction monitoring timed out after ${timeoutMinutes} minutes. ${isDocFile ? 'DOC files may require additional processing time.' : 'The job may still be processing in the background.'}`));
                }
                return;
            }
            
            // Adjust polling interval for DOC files
            if (isDocFile && elapsed > this.docPollingConfig.switchThreshold && currentInterval === this.docPollingConfig.initialInterval) {
                currentInterval = this.docPollingConfig.extendedInterval;
                console.log(`🔄 Switching to extended polling interval (${currentInterval/1000}s) for DOC file processing`);
            }
            
            try {
                console.log(`📊 Checking status for candidate ${candidateId} (attempt ${attempts})`);
                
                // Get current analysis status
                const response = await window.resumifyAPI.getAnalysis(candidateId);
                
                // Handle both wrapped and direct response formats
                const data = response.success ? response.data : response;
                
                if (data) {
                    const textStatus = data.textExtractionStatus;
                    const hasText = data.extractedText && data.extractedText !== 'Processing...';
                    
                    // Handle DOC-specific processing stages with enhanced backend integration
                    const processingStage = this.getProcessingStage(data, isDocFile);
                    const progressPercentage = this.calculateProgress(textStatus, processingStage, elapsed, isDocFile, data);
                    
                    // Check for backend processing stage updates
                    const backendStage = data.processingStage || data.docProcessingStage;
                    const backendProgress = data.processingProgress;
                    const stageMessage = data.stageMessage;
                    
                    console.log(`📋 Status: ${textStatus}, Stage: ${processingStage}, Progress: ${progressPercentage}%, Has text: ${hasText}`);
                    
                    if (backendStage) {
                        console.log(`🔧 Backend stage: ${backendStage}${backendProgress !== undefined ? ` (${backendProgress}%)` : ''}`);
                    }
                    
                    if (stageMessage) {
                        console.log(`💬 Stage message: ${stageMessage}`);
                    }
                    
                    // Detect status changes for better logging
                    if (lastStatus && lastStatus !== textStatus) {
                        console.log(`🔄 Status changed from ${lastStatus} to ${textStatus}`);
                        if (isDocFile) {
                            console.log(`📄 DOC processing stage: ${processingStage}`);
                        }
                    }
                    lastStatus = textStatus;
                    
                    // Call update callback with enhanced information including backend status updates
                    if (onUpdate) {
                        onUpdate({
                            status: textStatus,
                            hasText: hasText,
                            textLength: hasText ? data.extractedText.length : 0,
                            attempts: attempts,
                            elapsed: Math.round(elapsed / 1000),
                            jobId: jobId,
                            fileType: fileType || data.fileType || data.fileName?.split('.').pop()?.toLowerCase(),
                            isDocFile: isDocFile,
                            processingStage: processingStage,
                            progressPercentage: progressPercentage,
                            estimatedTimeRemaining: this.estimateTimeRemaining(textStatus, elapsed, attempts, isDocFile),
                            stageMessage: this.getStageMessage(processingStage, isDocFile),
                            // Enhanced backend integration
                            backendStage: backendStage,
                            backendProgress: backendProgress,
                            backendStageMessage: stageMessage,
                            processingMethod: data.processingMethod,
                            errorDetails: data.processingError || data.textExtractionError,
                            // Additional DOC-specific information
                            extractionMethod: data.extractionMethod,
                            partialResults: data.partialResults,
                            qualityScore: data.textQualityScore
                        });
                    }
                    
                    // Update progress percentage display in the UI
                    this.updateProgressPercentageDisplay(progressPercentage);
                    
                    // Update the progress bar width to match the percentage
                    this.updateProgressBar(progressPercentage);
                    
                    // Also update the upload.js progress bar
                    if (window.uploadManager && window.uploadManager.updateProgressBar) {
                        window.uploadManager.updateProgressBar(progressPercentage);
                    }
                    
                    // Check if extraction is complete
                    if (textStatus === 'completed') {
                        console.log(`✅ Text extraction completed for candidate ${candidateId}`);
                        console.log(`📊 Final progress: 100%`);
                        console.log(`📄 Has text: ${hasText}, Text length: ${data.extractedText ? data.extractedText.length : 'undefined'}`);
                        
                        this.stopMonitoring(candidateId);
                        
                        // Update progress to 100% when completed
                        this.updateProgressBar(100);
                        this.updateProgressPercentageDisplay(100);
                        
                        if (onComplete) {
                            onComplete({
                                candidateId: candidateId,
                                extractedText: data.extractedText,
                                textLength: data.extractedText ? data.extractedText.length : 0,
                                totalTime: Math.round(elapsed / 1000),
                                totalAttempts: attempts
                            });
                        }
                        return;
                    }
                    
                    // Check if extraction failed with enhanced DOC-specific error handling
                    if (textStatus === 'failed') {
                        console.log(`❌ Text extraction failed for candidate ${candidateId}`);
                        this.stopMonitoring(candidateId);
                        
                        if (onError) {
                            // Enhanced error handling with structured error data
                            const errorData = data.textExtractionError || data.processingError;
                            const errorMessage = this.getDocSpecificErrorMessage(
                                data.textExtractionError || 'Processing failed', 
                                isDocFile, 
                                errorData
                            );
                            
                            // Create enhanced error object with additional context
                            const error = new Error(errorMessage);
                            error.errorCode = errorData?.error_code;
                            error.methodName = errorData?.method_name;
                            error.isDocFile = isDocFile;
                            error.processingStage = processingStage;
                            error.retryPossible = errorData?.retry_possible;
                            
                            onError(error);
                        }
                        return;
                    }
                    
                    // Special handling for long-running jobs (DOC-specific messaging)
                    if ((textStatus === 'pending' || textStatus === 'processing') && elapsed > config.longRunningThreshold) {
                        const elapsedMinutes = Math.round(elapsed / 60000);
                        if (isDocFile) {
                            console.log(`⚠️ DOC file processing in progress (${elapsedMinutes}m). DOC files require additional conversion time.`);
                        } else {
                            console.log(`⚠️ Long-running job detected (${elapsedMinutes}m). This is normal for large PDF files.`);
                        }
                    }
                    
                    // If still processing, continue polling
                    if (textStatus === 'pending' || textStatus === 'processing') {
                        console.log(`⏳ Still processing, will check again in ${currentInterval/1000} seconds`);
                        return;
                    }
                    
                    // Handle unknown status
                    if (!textStatus || textStatus === 'unknown') {
                        console.warn(`⚠️ Text extraction status not available for candidate ${candidateId}`);
                        if (attempts > 10) { // After 10 attempts, treat as error
                            this.stopMonitoring(candidateId);
                            if (onError) {
                                onError(new Error('Text extraction status is not available after multiple attempts'));
                            }
                            return;
                        }
                    }
                }
                
            } catch (error) {
                console.warn(`⚠️ Status check failed for candidate ${candidateId}:`, error);
                
                // Don't stop polling for network errors, 502 errors, or timeouts - these are often temporary
                if (error.message.includes('Network') || 
                    error.message.includes('timeout') || 
                    error.message.includes('fetch') ||
                    error.message.includes('502') ||
                    error.message.includes('Bad Gateway') ||
                    error.message.includes('503') ||
                    error.message.includes('Service Unavailable')) {
                    console.log('🔄 Temporary server error, continuing to poll...');
                    
                    // Show user-friendly notification for server errors
                    if (window.errorNotificationManager && attempts > 2) {
                        window.errorNotificationManager.showServerError(attempts - 2);
                    }
                    
                    return;
                }
                
                // For persistent errors after many attempts, stop polling
                if (attempts > 20) {
                    console.error(`❌ Too many failed attempts (${attempts}) for candidate ${candidateId}`);
                    this.stopMonitoring(candidateId);
                    if (onError) {
                        onError(new Error(`Monitoring failed after ${attempts} attempts: ${error.message}`));
                    }
                    return;
                }
            }
        };
        
        // Start immediate check
        checkStatus();
        
        // Set up interval for subsequent checks with dynamic interval adjustment
        const pollWithDynamicInterval = () => {
            // Check if we need to adjust interval for DOC files
            if (isDocFile) {
                const currentElapsed = Date.now() - startTime;
                if (currentElapsed > this.docPollingConfig.switchThreshold && 
                    currentInterval === this.docPollingConfig.initialInterval) {
                    
                    // Switch to extended interval
                    currentInterval = this.docPollingConfig.extendedInterval;
                    console.log(`🔄 Switching to extended polling interval (${currentInterval/1000}s) for DOC file processing`);
                    
                    // Clear current interval and restart with new interval
                    const intervalData = this.pollingIntervals.get(candidateId);
                    if (intervalData) {
                        clearInterval(intervalData.intervalId);
                        const newIntervalId = setInterval(pollWithDynamicInterval, currentInterval);
                        this.pollingIntervals.set(candidateId, {
                            ...intervalData,
                            intervalId: newIntervalId,
                            currentInterval: currentInterval
                        });
                    }
                    return;
                }
            }
            checkStatus();
        };
        
        let intervalId = setInterval(pollWithDynamicInterval, currentInterval);
        
        // Store interval info for potential adjustment
        this.pollingIntervals.set(candidateId, {
            intervalId: intervalId,
            currentInterval: currentInterval,
            isDocFile: isDocFile,
            startTime: startTime
        });
        
        console.log(`🎯 Monitoring started for candidate ${candidateId} with ${currentInterval/1000}s interval`);
    }
    
    /**
     * Detect if a file is a DOC file based on file type or candidate data
     * @param {string} fileType - The file type if available
     * @param {string} candidateId - The candidate ID for additional context
     * @returns {boolean} - True if this is a DOC file
     */
    isDocFile(fileType, candidateId) {
        if (fileType) {
            const type = fileType.toLowerCase();
            // Check for DOC file extensions and MIME types
            return type === 'doc' || 
                   type === '.doc' || 
                   type === 'application/msword' ||
                   type.includes('msword') ||
                   type.endsWith('.doc');
        }
        
        // If no file type provided, we can't determine - assume not DOC
        // In a real implementation, you might want to check candidate data or filename
        return false;
    }
    
    /**
     * Get the current processing stage for DOC files
     * @param {Object} data - The analysis data from the API
     * @param {boolean} isDocFile - Whether this is a DOC file
     * @returns {string} - The current processing stage
     */
    getProcessingStage(data, isDocFile) {
        if (!isDocFile) {
            return data.textExtractionStatus || 'unknown';
        }
        
        // Check for DOC-specific processing stage information from backend
        if (data.processingStage) {
            return data.processingStage;
        }
        
        // Check for intermediate DOC processing states
        if (data.docProcessingStage) {
            return data.docProcessingStage;
        }
        
        // Handle backend status updates with stage information
        if (data.statusUpdate && data.statusUpdate.stage) {
            return data.statusUpdate.stage;
        }
        
        // Infer stage from status and other indicators with enhanced logic for DOC files
        const status = data.textExtractionStatus;
        const hasText = data.extractedText && data.extractedText !== 'Processing...';
        const processingProgress = data.processingProgress || 0;
        
        if (status === 'completed' && hasText) {
            return 'completed';
        } else if (status === 'failed') {
            return 'failed';
        } else if (status === 'processing') {
            // Enhanced stage inference for DOC files based on progress and text availability
            if (processingProgress >= 90) {
                return 'finalizing';
            } else if (processingProgress >= 60) {
                return 'extracting';
            } else if (processingProgress >= 20) {
                return 'converting';
            } else if (data.extractedText === 'Processing...') {
                return 'extracting';
            } else if (!data.extractedText) {
                return 'converting';
            } else {
                return 'finalizing';
            }
        } else if (status === 'pending') {
            // Check if we have any processing indicators
            if (processingProgress > 0) {
                return processingProgress < 20 ? 'initializing' : 'converting';
            }
            return 'initial';
        }
        
        return 'unknown';
    }
    
    /**
     * Calculate progress percentage based on processing stage and elapsed time
     * @param {string} status - The extraction status
     * @param {string} stage - The processing stage
     * @param {number} elapsed - Elapsed time in milliseconds
     * @param {boolean} isDocFile - Whether this is a DOC file
     * @param {Object} data - Additional data from backend including progress updates
     * @returns {number} - Progress percentage (0-100)
     */
    calculateProgress(status, stage, elapsed, isDocFile, data = {}) {
        if (status === 'completed') {
            console.log(`🎯 Status is completed, returning 100% progress`);
            return 100;
        }
        if (status === 'failed') return 0;
        
        // Use backend-provided progress if available
        if (data.processingProgress !== undefined && data.processingProgress !== null) {
            return Math.min(100, Math.max(0, data.processingProgress));
        }
        
        if (!isDocFile) {
            // Enhanced progress calculation for non-DOC files (PDF, DOCX, TXT)
            const elapsedSeconds = elapsed / 1000;
            
            // For PDF files with Textract, show more realistic progress with granular steps
            if (data.fileType === 'pdf' || stage === 'processing') {
                if (elapsedSeconds < 5) return Math.min(15, elapsedSeconds * 3);
                if (elapsedSeconds < 10) return Math.min(25, 15 + (elapsedSeconds - 5) * 2);
                if (elapsedSeconds < 20) return Math.min(40, 25 + (elapsedSeconds - 10) * 1.5);
                if (elapsedSeconds < 35) return Math.min(55, 40 + (elapsedSeconds - 20) * 1);
                if (elapsedSeconds < 50) return Math.min(70, 55 + (elapsedSeconds - 35) * 1);
                if (elapsedSeconds < 70) return Math.min(80, 70 + (elapsedSeconds - 50) * 0.5);
                if (elapsedSeconds < 90) return Math.min(85, 80 + (elapsedSeconds - 70) * 0.25);
                if (elapsedSeconds < 120) return Math.min(90, 85 + (elapsedSeconds - 90) * 0.17);
                if (elapsedSeconds < 180) return Math.min(93, 90 + (elapsedSeconds - 120) * 0.05);
                if (elapsedSeconds < 240) return Math.min(95, 93 + (elapsedSeconds - 180) * 0.03);
                if (elapsedSeconds < 300) return Math.min(97, 95 + (elapsedSeconds - 240) * 0.03);
                if (elapsedSeconds < 360) return Math.min(98, 97 + (elapsedSeconds - 300) * 0.02);
                if (elapsedSeconds < 420) return Math.min(99, 98 + (elapsedSeconds - 360) * 0.02);
                return 99; // Cap at 99% until actually completed
            }
            
            // For DOCX/TXT files, show faster progress with granular steps
            if (data.fileType === 'docx' || data.fileType === 'txt' || data.fileType === 'doc') {
                if (elapsedSeconds < 2) return Math.min(20, elapsedSeconds * 10);
                if (elapsedSeconds < 5) return Math.min(35, 20 + (elapsedSeconds - 2) * 5);
                if (elapsedSeconds < 10) return Math.min(50, 35 + (elapsedSeconds - 5) * 3);
                if (elapsedSeconds < 15) return Math.min(65, 50 + (elapsedSeconds - 10) * 3);
                if (elapsedSeconds < 25) return Math.min(80, 65 + (elapsedSeconds - 15) * 1.5);
                if (elapsedSeconds < 40) return Math.min(90, 80 + (elapsedSeconds - 25) * 0.67);
                return 90; // Cap at 90% until actually completed
            }
            
            // Default fallback
            if (elapsedSeconds < 30) return Math.min(90, elapsedSeconds * 3);
            return 90;
        }
        
        // Enhanced DOC-specific progress calculation with stage-based logic
        const elapsedSeconds = elapsed / 1000;
        
        switch (stage) {
            case 'initial':
            case 'pending':
            case 'initializing':
                return Math.min(10, elapsedSeconds * 0.3);
                
            case 'downloading':
                return Math.min(15, 5 + (elapsedSeconds - 5) * 0.5);
                
            case 'converting':
            case 'extracting_with_antiword':
            case 'extracting_with_docx2txt':
                // Converting stage: 15% to 50%
                const convertProgress = Math.min(35, (elapsedSeconds - 10) * 0.4);
                return Math.min(50, 15 + convertProgress);
                
            case 'extracting':
            case 'processing':
            case 'extracting_with_python_docx':
            case 'extracting_with_fallback':
                // Extracting stage: 50% to 85%
                const extractProgress = Math.min(35, (elapsedSeconds - 60) * 0.25);
                return Math.min(85, 50 + extractProgress);
                
            case 'finalizing':
                // Finalizing stage: 85% to 95%
                const finalizeProgress = Math.min(10, (elapsedSeconds - 120) * 0.1);
                return Math.min(95, 85 + finalizeProgress);
                
            case 'completed':
                return 100;
                
            case 'failed':
                return 0;
                
            default:
                // Enhanced fallback progress calculation for unknown stages
                if (elapsedSeconds < 30) {
                    return Math.min(20, elapsedSeconds * 0.6);
                } else if (elapsedSeconds < 90) {
                    return Math.min(50, 20 + (elapsedSeconds - 30) * 0.5);
                } else if (elapsedSeconds < 180) {
                    return Math.min(80, 50 + (elapsedSeconds - 90) * 0.3);
                } else {
                    return Math.min(90, 80 + (elapsedSeconds - 180) * 0.05);
                }
        }
    }
    
    /**
     * Get user-friendly message for current processing stage
     * @param {string} stage - The processing stage
     * @param {boolean} isDocFile - Whether this is a DOC file
     * @returns {string} - User-friendly stage message
     */
    getStageMessage(stage, isDocFile) {
        if (!isDocFile) {
            switch (stage) {
                case 'pending': return 'Preparing file for processing...';
                case 'processing': return 'Extracting text content...';
                case 'completed': return 'Text extraction completed';
                case 'failed': return 'Text extraction failed';
                default: return 'Processing file...';
            }
        }
        
        // Enhanced DOC-specific stage messages with detailed processing information
        switch (stage) {
            case 'initial':
            case 'pending':
                return 'Starting DOC file processing...';
            case 'initializing':
                return 'Initializing DOC file processing environment...';
            case 'downloading':
                return 'Downloading DOC file for processing...';
            case 'converting':
                return 'Converting legacy DOC format using specialized tools...';
            case 'extracting':
                return 'Extracting text content from DOC file...';
            case 'extracting_with_antiword':
                return 'Using primary extraction method (antiword) for DOC file...';
            case 'extracting_with_docx2txt':
                return 'Using alternative extraction method (docx2txt) for DOC file...';
            case 'extracting_with_python_docx':
                return 'Using DOCX-compatible extraction method for DOC file...';
            case 'extracting_with_fallback':
                return 'Using fallback extraction method for DOC file...';
            case 'processing':
                return 'Processing DOC file content with multiple extraction methods...';
            case 'finalizing':
                return 'Finalizing DOC text extraction and quality validation...';
            case 'completed':
                return 'DOC file processing completed successfully';
            case 'failed':
                return 'DOC file processing failed';
            default:
                return 'Processing DOC file with advanced extraction methods...';
        }
    }
    
    /**
     * Get DOC-specific error message with enhanced error handling
     * @param {string} originalError - The original error message
     * @param {boolean} isDocFile - Whether this is a DOC file
     * @param {Object} errorData - Additional error data from backend
     * @returns {string} - Enhanced error message
     */
    getDocSpecificErrorMessage(originalError, isDocFile, errorData = {}) {
        if (!isDocFile) {
            return originalError || 'Text extraction failed';
        }
        
        // Handle structured error data from backend
        if (errorData && typeof errorData === 'object') {
            if (errorData.error_code) {
                return this.getErrorMessageForCode(errorData.error_code, errorData.method_name);
            }
            if (errorData.message) {
                originalError = errorData.message;
            }
        }
        
        // Enhance error messages for DOC files
        if (!originalError) {
            return 'DOC file processing failed. The file may be corrupted or in an unsupported format.';
        }
        
        const errorLower = originalError.toLowerCase();
        
        // Check for specific DOC processing error patterns
        if (errorLower.includes('timeout') || errorLower.includes('timed out')) {
            return 'DOC file processing timed out. Large or complex DOC files may require additional processing time. Please try again or use a smaller file.';
        }
        
        if (errorLower.includes('all extraction methods failed')) {
            return 'Unable to extract text from this DOC file using any available method. Please try converting the file to PDF or DOCX format.';
        }
        
        if (errorLower.includes('antiword') && errorLower.includes('failed')) {
            return 'Primary DOC extraction method failed. The system tried alternative methods but was unable to extract readable text.';
        }
        
        if (errorLower.includes('conversion') || errorLower.includes('format')) {
            return 'DOC file format conversion failed. The file may be corrupted, password-protected, or use an unsupported DOC format version.';
        }
        
        if (errorLower.includes('extraction') || errorLower.includes('text')) {
            return 'Text extraction from DOC file failed. The file content may be inaccessible, corrupted, or contain only images.';
        }
        
        if (errorLower.includes('memory') || errorLower.includes('resource')) {
            return 'DOC file is too large or complex to process. Please try a smaller file or convert to PDF format.';
        }
        
        if (errorLower.includes('permission') || errorLower.includes('access')) {
            return 'Unable to access DOC file content. The file may be password-protected or have restricted permissions.';
        }
        
        if (errorLower.includes('corrupted') || errorLower.includes('invalid')) {
            return 'DOC file appears to be corrupted or invalid. Please check the file and try uploading again.';
        }
        
        // Return enhanced error with DOC context
        return `DOC file processing failed: ${originalError}`;
    }
    
    /**
     * Get user-friendly error message for specific error codes
     * @param {string} errorCode - The error code from backend
     * @param {string} methodName - The extraction method that failed
     * @returns {string} - User-friendly error message
     */
    getErrorMessageForCode(errorCode, methodName = null) {
        const errorMessages = {
            'TIMEOUT_ERROR': 'Processing took too long. The DOC file may be too large or complex.',
            'EXTRACTION_FAILED': 'Unable to extract text from this DOC file. Please try converting to PDF or DOCX format.',
            'ANTIWORD_NOT_AVAILABLE': 'Primary DOC extraction tool is not available. Using alternative methods.',
            'ANTIWORD_FAILED': 'Primary extraction method failed. Trying alternative approaches.',
            'FILE_CORRUPTED': 'The DOC file appears to be corrupted or in an unsupported format.',
            'FORMAT_ERROR': 'The file format is not supported or contains formatting errors.',
            'FORMAT_NOT_SUPPORTED': 'This extraction method does not support the file format.',
            'INSUFFICIENT_MEMORY': 'Not enough memory to process this large DOC file.',
            'INSUFFICIENT_TEXT': 'The extraction method returned insufficient text content.',
            'LOW_QUALITY_TEXT': 'The extracted text quality is too low to be useful.',
            'NO_TEXT_EXTRACTED': 'No text content could be extracted from the file.',
            'PERMISSION_ERROR': 'Unable to access temporary files during processing.',
            'LIBRARY_NOT_AVAILABLE': 'Required text extraction library is not available.',
            'DOCX2TXT_FAILED': 'Alternative extraction method failed.',
            'PYTHON_DOCX_FAILED': 'DOCX-based extraction method failed (file may not be DOCX format).',
            'FALLBACK_FAILED': 'All fallback extraction methods failed.',
        };
        
        const baseMessage = errorMessages[errorCode] || 'An unexpected error occurred during DOC processing.';
        
        if (methodName) {
            return `${baseMessage} (Method: ${methodName})`;
        }
        
        return baseMessage;
    }
    
    /**
     * Estimate remaining time based on current status and elapsed time
     * @param {string} status - Current extraction status
     * @param {number} elapsed - Elapsed time in milliseconds
     * @param {number} attempts - Number of attempts so far
     * @param {boolean} isDocFile - Whether this is a DOC file
     * @returns {string} - Estimated time remaining
     */
    estimateTimeRemaining(status, elapsed, attempts, isDocFile = false) {
        if (status === 'completed') return 'Complete';
        if (status === 'failed') return 'Failed';
        
        const elapsedSeconds = elapsed / 1000;
        const elapsedMinutes = Math.floor(elapsedSeconds / 60);
        
        // DOC-specific time estimation with more granular feedback
        if (isDocFile) {
            if (elapsedSeconds < 30) {
                return 'Starting DOC conversion...';
            } else if (elapsedSeconds < 90) {
                return 'Converting DOC format (1-2 min remaining)...';
            } else if (elapsedSeconds < 180) {
                return 'Extracting text content (1-3 min remaining)...';
            } else if (elapsedSeconds < 300) {
                return 'Processing complex DOC (2-5 min remaining)...';
            } else if (elapsedSeconds < 600) {
                return `Processing large DOC file (${Math.max(1, 10 - elapsedMinutes)} min remaining)...`;
            } else if (elapsedSeconds < 900) {
                return 'Processing very large or complex DOC file...';
            } else {
                return `Still processing DOC file (${elapsedMinutes} min elapsed)...`;
            }
        }
        
        // For TXT/DOCX files (usually complete quickly)
        if (elapsedSeconds < 30) {
            return 'Almost complete...';
        } else if (elapsedSeconds < 60) {
            return '< 1 minute remaining';
        }
        
        // For PDF files (Textract processing)
        if (elapsedSeconds < 120) {
            return '1-2 minutes remaining';
        } else if (elapsedSeconds < 300) {
            return '2-5 minutes remaining';
        } else if (elapsedSeconds < 600) {
            return `Processing large file (${Math.max(1, 10 - elapsedMinutes)} min remaining)...`;
        } else {
            return `Processing very large file (${elapsedMinutes} min elapsed)...`;
        }
    }
    
    /**
     * Stop monitoring for a specific candidate
     * @param {string} candidateId - The candidate ID to stop monitoring
     */
    stopMonitoring(candidateId) {
        const intervalData = this.pollingIntervals.get(candidateId);
        if (intervalData) {
            const intervalId = intervalData.intervalId || intervalData; // Handle both old and new format
            clearInterval(intervalId);
            this.pollingIntervals.delete(candidateId);
            console.log(`🛑 Stopped monitoring for candidate ${candidateId}`);
        }
    }
    
    /**
     * Update progress percentage display in the UI
     * @param {number} percentage - Progress percentage (0-100)
     */
    updateProgressPercentageDisplay(percentage) {
        // Update progress percentage display in the UI
        const progressText = document.getElementById('progressText');
        const progressPercentage = document.getElementById('progressPercentage');
        
        // Update progress text with percentage
        if (progressText) {
            progressText.textContent = `${Math.round(percentage)}%`;
        }
        
        if (progressPercentage) {
            if (percentage >= 100) {
                progressPercentage.textContent = `Completed!`;
            } else {
                progressPercentage.textContent = `Processing... ${Math.round(percentage)}%`;
            }
        }
        
        // Update file status based on progress
        this.updateFileStatus(percentage);
        
        // Also update any status displays that show progress
        const statusDetails = document.querySelector('.status-details');
        if (statusDetails) {
            const progressSpan = statusDetails.querySelector('.progress-percentage');
            if (progressSpan) {
                progressSpan.textContent = `${Math.round(percentage)}%`;
            }
        }
    }
    
    /**
     * Update file status based on progress percentage
     * @param {number} percentage - Progress percentage (0-100)
     */
    updateFileStatus(percentage) {
        const fileStatus = document.getElementById('fileStatus');
        const fileDetails = document.getElementById('fileDetails');
        
        if (fileStatus && fileDetails) {
            if (percentage < 20) {
                fileStatus.textContent = 'Initializing file processing...';
                fileDetails.textContent = 'Preparing your resume for analysis';
            } else if (percentage < 40) {
                fileStatus.textContent = 'Reading file contents...';
                fileDetails.textContent = 'Extracting text from your resume';
            } else if (percentage < 60) {
                fileStatus.textContent = 'Analyzing document structure...';
                fileDetails.textContent = 'Identifying sections and formatting';
            } else if (percentage < 80) {
                fileStatus.textContent = 'Processing text content...';
                fileDetails.textContent = 'Extracting skills, experience, and education';
            } else if (percentage < 95) {
                fileStatus.textContent = 'Finalizing analysis...';
                fileDetails.textContent = 'Completing text extraction and validation';
            } else if (percentage < 99) {
                fileStatus.textContent = 'Almost complete...';
                fileDetails.textContent = 'Performing final quality checks';
            } else {
                fileStatus.textContent = 'Processing complete!';
                fileDetails.textContent = 'Your resume has been successfully analyzed';
            }
        }
    }
    
    /**
     * Update progress bar width to match percentage
     * @param {number} percentage - Progress percentage (0-100)
     */
    updateProgressBar(percentage) {
        const progressFill = document.getElementById('progressFill');
        if (progressFill) {
            const clampedPercentage = Math.min(Math.max(percentage, 0), 100);
            progressFill.style.width = `${clampedPercentage}%`;
            // Remove duplicate logging - let upload.js handle the logging
        }
    }
    
    /**
     * Stop all monitoring
     */
    stopAllMonitoring() {
        for (const [candidateId, intervalData] of this.pollingIntervals) {
            const intervalId = intervalData.intervalId || intervalData; // Handle both old and new format
            clearInterval(intervalId);
            console.log(`🛑 Stopped monitoring for candidate ${candidateId}`);
        }
        this.pollingIntervals.clear();
    }
    
    /**
     * Check if monitoring is active for a candidate
     * @param {string} candidateId - The candidate ID to check
     * @returns {boolean} - True if monitoring is active
     */
    isMonitoring(candidateId) {
        return this.pollingIntervals.has(candidateId);
    }
    
    /**
     * Get list of candidates currently being monitored
     * @returns {string[]} - Array of candidate IDs being monitored
     */
    getMonitoredCandidates() {
        return Array.from(this.pollingIntervals.keys());
    }
}

// Create global instance
window.realtimeTextExtraction = new RealtimeTextExtraction();

// Clean up on page unload
window.addEventListener('beforeunload', () => {
    window.realtimeTextExtraction.stopAllMonitoring();
});

console.log('🚀 Real-time text extraction monitoring loaded');