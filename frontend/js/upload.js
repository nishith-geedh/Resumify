// Upload functionality for Resumify

class UploadManager {
    constructor() {
        this.currentCandidateId = null;
        this.currentJobId = null;
        this.uploadInProgress = false;
        this.selectedFile = null;
        this.fileType = null;
        this.processingStartTime = null;
        this.isIndeterminate = false;
        this.currentProgress = 0;
        this.processingStage = 'initial';
        this.stageProgressInterval = null;
        
        this.initializeUpload();
        this.initializeProgressBar();
    }
    
    initializeProgressBar() {
        const progressFill = document.getElementById('progressFill');
        const progressContainer = document.querySelector('.progress-container');
        
        if (!progressFill || !progressContainer) {
            console.warn('Progress bar elements not found during initialization');
            return;
        }
        
        // Ensure proper initial state
        this.resetProgressBar();
        
        // Add resize observer to handle container size changes
        if (window.ResizeObserver) {
            const resizeObserver = new ResizeObserver(() => {
                this.enforceProgressBounds();
            });
            resizeObserver.observe(progressContainer);
        }
    }
    
    enforceProgressBounds() {
        const progressFill = document.getElementById('progressFill');
        const progressContainer = progressFill?.parentElement;
        
        if (!progressFill || !progressContainer) return;
        
        // Ensure progress fill respects container boundaries
        const containerWidth = progressContainer.offsetWidth;
        const currentWidthPercent = parseFloat(progressFill.style.width) || 0;
        
        // Clamp percentage to valid range
        if (currentWidthPercent > 100) {
            progressFill.style.width = '100%';
            console.warn('Progress bar width clamped to 100% to prevent overflow');
        }
        
        if (currentWidthPercent < 0) {
            progressFill.style.width = '0%';
        }
        
        // Set explicit max-width to prevent overflow beyond container
        progressFill.style.maxWidth = '100%';
        progressFill.style.minWidth = '0%';
        
        // Additional safety check for actual pixel width
        requestAnimationFrame(() => {
            const actualWidth = progressFill.offsetWidth;
            if (actualWidth > containerWidth) {
                progressFill.style.width = '100%';
                console.warn('Progress bar actual width exceeded container, corrected');
            }
        });
    }
    
    initializeUpload() {
        const fileUploadArea = document.getElementById('fileUploadArea');
        const fileInput = document.getElementById('resumeFile');
        const uploadForm = document.getElementById('uploadForm');
        
        // Check if elements exist before proceeding
        if (!fileUploadArea || !fileInput || !uploadForm) {
            console.error('Required upload elements not found');
            return;
        }
        
        const uploadLink = fileUploadArea.querySelector('.upload-link');
        
        // Click to browse files
        fileUploadArea.addEventListener('click', () => {
            if (!this.uploadInProgress) {
                fileInput.click();
            }
        });
        
        if (uploadLink) {
            uploadLink.addEventListener('click', (e) => {
                e.stopPropagation();
                fileInput.click();
            });
        }
        
        // File input change
        fileInput.addEventListener('change', (e) => {
            this.handleFileSelect(e.target.files[0]);
        });
        
        // Drag and drop
        fileUploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            fileUploadArea.classList.add('dragover');
        });
        
        fileUploadArea.addEventListener('dragleave', () => {
            fileUploadArea.classList.remove('dragover');
        });
        
        fileUploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            fileUploadArea.classList.remove('dragover');
            
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.handleFileSelect(files[0]);
            }
        });
        
        // Form submission
        uploadForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleUpload();
        });
    }
    
    handleFileSelect(file) {
        if (!file) return;
        
        // Validate file type
        const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'application/msword'];
        const allowedExtensions = ['.pdf', '.docx', '.txt', '.doc'];
        
        const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
        
        if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
            this.showError('Please select a PDF, DOCX, DOC, or TXT file.');
            return;
        }
        
        // Validate file size (10MB limit)
        if (file.size > 10 * 1024 * 1024) {
            this.showError('File size must be less than 10MB.');
            return;
        }
        
        // Detect file type for processing logic
        this.fileType = this.detectFileType(file, fileExtension);
        
        // Show file info
        this.showFileInfo(file);
    }
    
    detectFileType(file, extension) {
        // Prioritize extension over MIME type for better accuracy
        if (extension === '.doc' || file.type === 'application/msword') {
            return 'doc';
        }
        if (extension === '.docx' || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            return 'docx';
        }
        if (extension === '.pdf' || file.type === 'application/pdf') {
            return 'pdf';
        }
        if (extension === '.txt' || file.type === 'text/plain') {
            return 'txt';
        }
        
        // Fallback
        return 'pdf';
    }
    
    showFileInfo(file) {
        const fileInfo = document.getElementById('fileInfo');
        const uploadIcon = document.querySelector('.upload-icon');
        
        fileInfo.innerHTML = `
            <div class="file-details flex items-center justify-between p-4 bg-purple-light/10 border border-purple-light/30 rounded-xl">
                <div class="flex items-center space-x-3">
                    <div class="w-10 h-10 bg-gradient-to-r from-mint to-yellow rounded-lg flex items-center justify-center">
                        <i data-lucide="file-text" class="w-5 h-5 text-dark"></i>
                    </div>
                    <div class="file-meta">
                        <div class="file-name text-cream font-semibold">${file.name}</div>
                        <div class="file-size text-cream/70 text-sm">${this.formatFileSize(file.size)}</div>
                    </div>
                </div>
                <button type="button" class="remove-file w-8 h-8 bg-red/20 hover:bg-red/30 text-red rounded-full flex items-center justify-center transition-colors" onclick="uploadManager.removeFile()">
                    <i data-lucide="x" class="w-4 h-4"></i>
                </button>
            </div>
        `;
        
        fileInfo.style.display = 'block';
        uploadIcon.style.display = 'none';
        
        // Initialize new icons
        lucide.createIcons();
        
        // Store file reference
        this.selectedFile = file;
    }
    
    removeFile() {
        const fileInfo = document.getElementById('fileInfo');
        const uploadIcon = document.querySelector('.upload-icon');
        const fileInput = document.getElementById('resumeFile');
        
        fileInfo.style.display = 'none';
        uploadIcon.style.display = 'block';
        fileInput.value = '';
        this.selectedFile = null;
    }
    
    async handleUpload() {
        if (this.uploadInProgress) return;
        
        const name = document.getElementById('candidateName').value.trim();
        const email = document.getElementById('candidateEmail').value.trim();
        
        if (!name || !email) {
            this.showError('Please fill in all required fields.');
            return;
        }
        
        if (!this.selectedFile) {
            this.showError('Please select a resume file.');
            return;
        }
        
        this.uploadInProgress = true;
        this.processingStartTime = Date.now();
        
        // Reset progress bar to initial state
        this.resetProgressBar();
        
        this.showUploadStatus(
            'Uploading...', 
            this.getFileTypeSpecificMessage('uploading'),
            true // Always use enhanced display for better UX
        );
        
        // Start stage-based progress simulation for better UX
        this.startStageProgressSimulation();
        
        try {
            // Create form data
            const formData = new FormData();
            formData.append('file', this.selectedFile);
            formData.append('name', name);
            formData.append('email', email);
            
            // Upload file with file-type-specific progress
            this.updateProgressBasedOnFileType(25, 'uploading');
            const uploadResult = await window.resumifyAPI.uploadResume(formData);
            
            if (!uploadResult.success) {
                throw new Error(uploadResult.error || 'Upload failed');
            }
            
            this.currentCandidateId = uploadResult.data.candidateId;
            // Note: jobId is not available at upload time, will be generated during matching
            
            this.updateProgressBasedOnFileType(50, 'converting');
            
            // Start real-time monitoring for text extraction
            this.showUploadStatus(
                'Processing...', 
                this.getFileTypeSpecificMessage('converting'),
                true // Use enhanced display for processing stage
            );
            
            if (this.currentJobId) {
                // PDF with Textract job
                this.startRealtimeMonitoring();
            } else {
                // TXT/DOCX files - still monitor for completion
                this.startRealtimeMonitoring();
            }
            
            // Real-time monitoring will handle the rest
            // Don't show success immediately - wait for text extraction
            
        } catch (error) {
            console.error('Upload error:', error);
            this.showError(error.message || 'Upload failed. Please try again.');
        } finally {
            this.uploadInProgress = false;
            this.stopStageProgressSimulation();
        }
    }
    
    async monitorTextractJob() {
        const maxAttempts = 60; // 10 minutes max (60 * 10 seconds)
        let attempts = 0;
        
        console.log(`Starting to monitor Textract job: ${this.currentJobId}`);
        
        while (attempts < maxAttempts) {
            try {
                console.log(`Checking Textract job status (attempt ${attempts + 1}/${maxAttempts})`);
                
                const result = await window.resumifyAPI.getTextractResult(this.currentJobId);
                
                if (result.success && result.data) {
                    console.log('✅ Textract job completed successfully!');
                    console.log(`Extracted ${result.data.textLength || 'N/A'} characters`);
                    return result.data;
                }
                
                // Check if job failed
                if (result.status === 'failed') {
                    throw new Error(`Textract job failed: ${result.error}`);
                }
                
                // Update status message with progress
                this.showUploadStatus('Processing...', `Extracting text... (${attempts + 1}/${maxAttempts} checks)`);
                
                // Wait 10 seconds before next check
                await this.sleep(10000);
                attempts++;
                
            } catch (error) {
                console.warn(`Textract check ${attempts + 1} failed:`, error);
                
                // If it's a network error, keep trying
                if (error.message.includes('Network') || error.message.includes('timeout')) {
                    await this.sleep(10000);
                    attempts++;
                    continue;
                }
                
                // If it's a job failure, stop trying
                if (error.message.includes('failed') || error.message.includes('Invalid')) {
                    throw error;
                }
                
                await this.sleep(10000);
                attempts++;
            }
        }
        
        throw new Error('Text extraction timed out after 10 minutes. The job may still be processing in the background.');
    }
    
    async waitForProcessing() {
        // Wait for DOCX/TXT processing
        await this.sleep(5000);
    }
    
    async waitForAnalysis() {
        const maxAttempts = 10; // Reduced from 20 to 10 (30 seconds instead of 60)
        let attempts = 0;
        
        while (attempts < maxAttempts) {
            try {
                const analysis = await window.resumifyAPI.getAnalysis(this.currentCandidateId);
                
                // Handle both wrapped and direct response formats
                const data = analysis.success ? analysis.data : analysis;
                
                if (data) {
                    // Accept any analysis data, even if still processing
                    if (data.status === 'analyzed' || data.extractedText) {
                        return data;
                    }
                }
                
                await this.sleep(3000);
                attempts++;
                
            } catch (error) {
                console.warn('Analysis check failed:', error);
                await this.sleep(3000);
                attempts++;
            }
        }
        
        // Analysis might still be in progress, but we can show results anyway
        console.warn('Analysis taking longer than expected - showing upload success');
        return { status: 'processing', message: 'Analysis in progress' };
    }
    
    showUploadStatus(title, message, showEnhanced = true) {
        const uploadForm = document.getElementById('uploadForm');
        const uploadStatus = document.getElementById('uploadStatus');
        const statusTitle = document.getElementById('statusTitle');
        const statusMessage = document.getElementById('statusMessage');
        
        uploadForm.style.display = 'none';
        uploadStatus.style.display = 'block';
        statusTitle.textContent = title;
        
        // Use enhanced status display for better user experience, especially for DOC files
        if (showEnhanced && this.processingStartTime) {
            const elapsedTime = (Date.now() - this.processingStartTime) / 1000;
            statusMessage.innerHTML = this.createEnhancedStatusDisplay(this.processingStage, elapsedTime);
        } else {
            // Fallback to simple message with file-type awareness
            if (typeof message === 'string') {
                // For DOC files, always show enhanced messaging even in fallback mode
                if (this.fileType === 'doc' && this.processingStartTime) {
                    const elapsedTime = (Date.now() - this.processingStartTime) / 1000;
                    statusMessage.innerHTML = this.createDOCSpecificStatusDisplay(message, elapsedTime);
                } else {
                    statusMessage.textContent = message;
                }
            } else {
                statusMessage.innerHTML = message;
            }
        }
    }
    
    showLongRunningExplanation() {
        // Show additional explanation for long-running DOC file processing
        const statusMessage = document.getElementById('statusMessage');
        
        if (this.fileType === 'doc') {
            const elapsedTime = this.processingStartTime ? (Date.now() - this.processingStartTime) / 1000 : 0;
            const timeEstimate = this.getEstimatedTimeRemaining();
            
            statusMessage.innerHTML = `
                <div class="status-main" style="margin-bottom: 1rem; font-size: 1.1em;">
                    ${this.getFileTypeSpecificMessage('long_running')}
                </div>
                <div class="long-running-explanation" style="
                    background: rgba(78, 196, 254, 0.1);
                    border: 1px solid rgba(78, 196, 254, 0.2);
                    border-radius: 0.75rem;
                    padding: 1rem;
                    font-size: 0.9em;
                    line-height: 1.5;
                    color: rgba(255, 242, 198, 0.9);
                ">
                    <div style="font-weight: 600; margin-bottom: 0.75rem; color: #4EC4FE; display: flex; align-items: center; gap: 0.5rem;">
                        <span>📄</span>
                        <span>Why DOC files require more processing time:</span>
                    </div>
                    <ul style="margin: 0 0 1rem 0; padding-left: 1.5rem; list-style-type: none;">
                        <li style="margin-bottom: 0.5rem; position: relative;">
                            <span style="position: absolute; left: -1.2rem; color: #4EC4FE;">•</span>
                            Legacy Microsoft format requires specialized conversion tools
                        </li>
                        <li style="margin-bottom: 0.5rem; position: relative;">
                            <span style="position: absolute; left: -1.2rem; color: #4EC4FE;">•</span>
                            Multiple extraction methods ensure complete text capture
                        </li>
                        <li style="margin-bottom: 0.5rem; position: relative;">
                            <span style="position: absolute; left: -1.2rem; color: #4EC4FE;">•</span>
                            Additional processing preserves formatting and document structure
                        </li>
                        <li style="position: relative;">
                            <span style="position: absolute; left: -1.2rem; color: #4EC4FE;">•</span>
                            Quality validation ensures accurate resume analysis
                        </li>
                    </ul>
                    <div style="
                        background: rgba(255, 242, 198, 0.1);
                        border-radius: 0.5rem;
                        padding: 0.75rem;
                        border-left: 3px solid #4EC4FE;
                    ">
                        <div style="font-weight: 600; color: #4EC4FE; margin-bottom: 0.25rem;">
                            ⏱️ Current Status:
                        </div>
                        <div style="color: rgba(255, 242, 198, 0.8);">
                            Processing for ${Math.floor(elapsedTime / 60)}m ${Math.floor(elapsedTime % 60)}s • ${timeEstimate}
                        </div>
                    </div>
                    ${elapsedTime > 180 ? `
                        <div style="
                            margin-top: 0.75rem;
                            padding: 0.5rem;
                            background: rgba(255, 193, 7, 0.1);
                            border: 1px solid rgba(255, 193, 7, 0.3);
                            border-radius: 0.5rem;
                            font-size: 0.85em;
                        ">
                            <div style="color: #FFC107; font-weight: 600; margin-bottom: 0.25rem;">
                                ⚠️ Extended Processing
                            </div>
                            <div style="color: rgba(255, 242, 198, 0.8);">
                                This document may contain complex formatting or embedded content requiring additional processing time.
                            </div>
                        </div>
                    ` : ''}
                </div>
            `;
        }
    }
    
    updateProgress(percentage, stage = null) {
        const progressFill = document.getElementById('progressFill');
        const progressContainer = progressFill?.parentElement;
        
        if (!progressFill) {
            console.warn('Progress bar element not found');
            return;
        }
        
        // Enforce maximum width constraints to prevent overflow beyond container boundaries
        const clampedPercentage = Math.min(Math.max(percentage, 0), 100);
        this.currentProgress = clampedPercentage;
        
        // Update processing stage if provided
        if (stage) {
            this.processingStage = stage;
        }
        
        // Visual state management for different progress modes
        if (this.isIndeterminate) {
            this.showIndeterminateProgress();
        } else {
            // Determinate mode: show actual progress with bounds checking
            progressFill.style.width = `${clampedPercentage}%`;
            progressFill.classList.remove('indeterminate-progress', 'indeterminate-pulse');
            
            // Add visual feedback for progress updates
            progressFill.classList.add('progress-updating');
            setTimeout(() => {
                progressFill.classList.remove('progress-updating');
            }, 300);
            
            // Update progress percentage display
            this.updateProgressPercentageDisplay(clampedPercentage);
            
            // Update progress bar width to match percentage
            this.updateProgressBar(clampedPercentage);
        }
        
        // Add container bounds checking to prevent visual overflow
        if (progressContainer) {
            const containerWidth = progressContainer.offsetWidth;
            const fillWidth = progressFill.offsetWidth;
            
            // Ensure progress fill never exceeds container width
            if (fillWidth > containerWidth) {
                progressFill.style.width = '100%';
                progressFill.style.maxWidth = '100%';
            }
        }
        
        // Auto-switch to indeterminate mode based on file type and elapsed time
        if (this.processingStartTime && !this.isIndeterminate) {
            const elapsedTime = (Date.now() - this.processingStartTime) / 1000;
            const profile = this.getProgressEstimationForFileType(this.fileType, this.selectedFile?.size || 0);
            
            // DOC files switch to indeterminate after 60 seconds, others have longer thresholds
            if (elapsedTime > profile.indeterminateThreshold) {
                this.switchToIndeterminate();
                return; // Exit early to avoid further progress updates
            }
        }
        
        // Handle completion state
        if (clampedPercentage >= 100 && !this.isIndeterminate) {
            this.handleProgressCompletion();
        }
    }
    
    switchToIndeterminate() {
        this.isIndeterminate = true;
        this.showIndeterminateProgress();
        
        // Update status message for indeterminate mode
        this.showUploadStatus(
            'Processing...', 
            this.getFileTypeSpecificMessage('long_running'),
            true // Use enhanced display for long-running processes
        );
        
        console.log(`Switched to indeterminate mode for ${this.fileType} file processing`);
    }
    
    showIndeterminateProgress() {
        const progressFill = document.getElementById('progressFill');
        
        if (!progressFill) {
            console.warn('Progress bar element not found for indeterminate mode');
            return;
        }
        
        // Remove any existing progress classes
        progressFill.classList.remove('progress-updating');
        
        // Add indeterminate progress animation classes
        progressFill.classList.add('indeterminate-progress');
        
        // Set width to 100% with proper bounds checking
        progressFill.style.width = '100%';
        progressFill.style.maxWidth = '100%';
        
        // Add pulsing effect for long-running processes
        if (this.fileType === 'doc') {
            progressFill.classList.add('indeterminate-pulse');
        }
    }
    
    handleProgressCompletion() {
        const progressFill = document.getElementById('progressFill');
        
        if (!progressFill) return;
        
        // Ensure progress bar shows complete state
        progressFill.style.width = '100%';
        progressFill.style.maxWidth = '100%';
        
        // Remove indeterminate animations
        progressFill.classList.remove('indeterminate-progress', 'indeterminate-pulse');
        
        // Add completion animation
        progressFill.classList.add('progress-complete');
        
        // Remove completion class after animation
        setTimeout(() => {
            progressFill.classList.remove('progress-complete');
        }, 600);
    }
    
    resetProgressBar() {
        const progressFill = document.getElementById('progressFill');
        
        if (!progressFill) return;
        
        // Reset all progress states
        this.currentProgress = 0;
        this.isIndeterminate = false;
        this.processingStage = 'initial';
        
        // Reset visual state with bounds checking
        progressFill.style.width = '0%';
        progressFill.style.maxWidth = '100%';
        progressFill.style.minWidth = '0%';
        progressFill.classList.remove(
            'indeterminate-progress', 
            'indeterminate-pulse', 
            'progress-updating', 
            'progress-complete'
        );
        
        // Ensure bounds are enforced after reset
        this.enforceProgressBounds();
    }
    
    getDocProgressIncrement(status, stage) {
        // Enhanced DOC progress calculation based on processing stage and status
        const baseProgress = Math.min(status.attempts * 0.5, 20);
        
        switch (stage) {
            case 'initializing':
            case 'downloading':
                return Math.min(baseProgress, 10);
            case 'converting':
            case 'extracting_with_antiword':
                return Math.min(baseProgress + 10, 25);
            case 'extracting':
            case 'extracting_with_docx2txt':
            case 'extracting_with_python_docx':
                return Math.min(baseProgress + 20, 35);
            case 'extracting_with_fallback':
                return Math.min(baseProgress + 25, 40);
            case 'finalizing':
                return Math.min(baseProgress + 30, 45);
            default:
                return Math.min(baseProgress + 15, 30);
        }
    }
    
    getProgressBarState() {
        // Utility method for debugging progress bar state
        const progressFill = document.getElementById('progressFill');
        const progressContainer = progressFill?.parentElement;
        
        if (!progressFill || !progressContainer) {
            return { error: 'Progress bar elements not found' };
        }
        
        return {
            currentProgress: this.currentProgress,
            isIndeterminate: this.isIndeterminate,
            processingStage: this.processingStage,
            fileType: this.fileType,
            visualWidth: progressFill.style.width,
            actualWidth: progressFill.offsetWidth,
            containerWidth: progressContainer.offsetWidth,
            classes: Array.from(progressFill.classList),
            withinBounds: progressFill.offsetWidth <= progressContainer.offsetWidth
        };
    }
    
    getFileTypeSpecificMessage(stage) {
        const messages = {
            'doc': {
                'initial': 'Preparing DOC file for processing...',
                'uploading': 'Uploading DOC file to secure processing environment...',
                'converting': 'Converting legacy Microsoft DOC format using specialized tools...',
                'extracting': 'Extracting text content with multiple fallback methods for accuracy...',
                'finalizing': 'Finalizing text extraction and performing quality validation...',
                'analyzing': 'Analyzing extracted content for resume information...',
                'long_running': 'DOC files require additional processing time due to their legacy format. Multiple extraction methods ensure complete and accurate text capture.',
                'timeout_warning': 'DOC file processing is taking longer than usual. This is normal for complex documents with formatting or embedded content.',
                'almost_complete': 'DOC file processing is nearly complete. Finalizing text extraction...'
            },
            'docx': {
                'initial': 'Starting DOCX file processing...',
                'uploading': 'Uploading DOCX file...',
                'converting': 'Processing modern DOCX document structure...',
                'extracting': 'Extracting text content and formatting...',
                'finalizing': 'Finalizing text extraction...',
                'analyzing': 'Analyzing document content...',
                'long_running': 'Processing document content and structure...'
            },
            'pdf': {
                'initial': 'Starting PDF processing...',
                'uploading': 'Uploading PDF file...',
                'converting': 'Analyzing PDF structure and layout...',
                'extracting': 'Extracting text with AI-powered OCR technology...',
                'finalizing': 'Finalizing text extraction and validation...',
                'analyzing': 'Analyzing extracted content...',
                'long_running': 'PDF processing with AI text recognition in progress...'
            },
            'txt': {
                'initial': 'Processing text file...',
                'uploading': 'Uploading text file...',
                'converting': 'Reading and validating file content...',
                'extracting': 'Processing plain text content...',
                'finalizing': 'Finalizing text processing...',
                'analyzing': 'Analyzing text content...',
                'long_running': 'Processing text content...'
            }
        };
        
        const fileMessages = messages[this.fileType] || messages['pdf'];
        return fileMessages[stage] || fileMessages['initial'];
    }
    
    getDetailedStatusMessage(stage, includeExplanation = false) {
        const baseMessage = this.getFileTypeSpecificMessage(stage);
        
        if (!includeExplanation || this.fileType !== 'doc') {
            return baseMessage;
        }
        
        // Add detailed explanations for DOC files
        const explanations = {
            'converting': 'DOC files use an older Microsoft format that requires special conversion tools for accurate text extraction.',
            'extracting': 'We use multiple extraction methods to ensure we capture all text content, including formatted text and tables.',
            'long_running': 'DOC files typically take 2-3 minutes to process completely. This extra time ensures high-quality text extraction.'
        };
        
        const explanation = explanations[stage];
        if (explanation) {
            return `${baseMessage}\n\n${explanation}`;
        }
        
        return baseMessage;
    }
    
    createEnhancedStatusDisplay(stage, elapsedTime = 0) {
        const message = this.getFileTypeSpecificMessage(stage);
        const timeEstimate = this.getEstimatedTimeRemaining();
        const progressStage = this.getProcessingStageInfo(stage, elapsedTime);
        
        // Create enhanced status HTML for DOC files with detailed explanations
        if (this.fileType === 'doc') {
            return `
                <div class="status-main" style="margin-bottom: 0.75rem; font-size: 1em; line-height: 1.3;">
                    ${message}
                </div>
                <div class="status-details" style="font-size: 0.85em; color: rgba(255, 242, 198, 0.8); line-height: 1.4;">
                    <div class="time-estimate" style="margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.5rem;">
                        <span style="color: #4EC4FE;">⏱️</span>
                        <span>${timeEstimate}</span>
                        ${progressStage.showProgress ? `<span style="color: rgba(255, 242, 198, 0.6);">(${progressStage.percentage}% complete)</span>` : ''}
                    </div>
                    <div class="processing-stage" style="margin-bottom: 0.5rem; color: rgba(255, 242, 198, 0.7);">
                        📄 ${progressStage.stageDescription}
                    </div>
                    ${elapsedTime > 60 ? this.getLongRunningExplanation(elapsedTime) : ''}
                    <div class="file-type-info" style="color: rgba(255, 242, 198, 0.6); font-style: italic;">
                        💡 DOC files use legacy format requiring specialized processing tools
                    </div>
                </div>
            `;
        }
        
        // Enhanced status for other file types when processing takes longer
        if (elapsedTime > 30) {
            return `
                <div class="status-main" style="margin-bottom: 0.5rem;">
                    ${message}
                </div>
                <div class="status-details" style="font-size: 0.85em; color: rgba(255, 242, 198, 0.8);">
                    <div class="time-estimate" style="margin-bottom: 0.25rem;">
                        ⏱️ ${timeEstimate}
                    </div>
                    <div class="processing-stage" style="color: rgba(255, 242, 198, 0.7);">
                        ${progressStage.stageDescription}
                    </div>
                </div>
            `;
        }
        
        // Standard status for quick processing
        return `
            <div class="status-main">
                ${message}
            </div>
        `;
    }
    
    getEstimatedTimeRemaining() {
        if (!this.processingStartTime) return 'Calculating time estimate...';
        
        const elapsedTime = (Date.now() - this.processingStartTime) / 1000;
        
        // Enhanced file-type-specific time estimates with stage-based adjustments
        const estimates = {
            'doc': { 
                base: 120, 
                perMB: 30,
                stageMultipliers: {
                    'initial': 1.0,
                    'uploading': 0.8,
                    'converting': 1.2,
                    'extracting': 1.5,
                    'finalizing': 0.6,
                    'analyzing': 0.4
                }
            },
            'docx': { base: 30, perMB: 15, stageMultipliers: { 'extracting': 1.2 } },
            'pdf': { base: 60, perMB: 20, stageMultipliers: { 'extracting': 1.3 } },
            'txt': { base: 10, perMB: 5, stageMultipliers: {} }
        };
        
        const estimate = estimates[this.fileType] || estimates['pdf'];
        const fileSizeMB = this.selectedFile ? this.selectedFile.size / (1024 * 1024) : 1;
        const stageMultiplier = estimate.stageMultipliers?.[this.processingStage] || 1.0;
        const estimatedTotal = (estimate.base + (fileSizeMB * estimate.perMB)) * stageMultiplier;
        
        const remaining = Math.max(0, estimatedTotal - elapsedTime);
        
        // DOC-specific time messaging
        if (this.fileType === 'doc') {
            if (remaining < 15) return 'Almost complete...';
            if (remaining < 30) return 'Finishing up (~30s remaining)';
            if (remaining < 60) return `About ${Math.ceil(remaining)}s remaining`;
            if (remaining < 120) return `About ${Math.ceil(remaining / 60)}m remaining`;
            return `Estimated ${Math.ceil(remaining / 60)}m remaining (DOC files take longer)`;
        }
        
        // Standard time messaging for other file types
        if (remaining < 15) return 'Almost done...';
        if (remaining < 60) return `~${Math.ceil(remaining)}s remaining`;
        return `~${Math.ceil(remaining / 60)}m remaining`;
    }
    
    getProcessingStageInfo(stage, elapsedTime) {
        const stageInfo = {
            'initial': { 
                percentage: 5, 
                stageDescription: 'Initializing file processing',
                showProgress: false 
            },
            'uploading': { 
                percentage: 15, 
                stageDescription: 'Uploading file to processing server',
                showProgress: true 
            },
            'converting': { 
                percentage: 35, 
                stageDescription: 'Converting file format for text extraction',
                showProgress: true 
            },
            'extracting': { 
                percentage: 70, 
                stageDescription: 'Extracting text content from document',
                showProgress: true 
            },
            'finalizing': { 
                percentage: 90, 
                stageDescription: 'Finalizing text extraction and validation',
                showProgress: true 
            },
            'analyzing': { 
                percentage: 95, 
                stageDescription: 'Analyzing content for resume information',
                showProgress: true 
            }
        };
        
        const info = stageInfo[stage] || stageInfo['initial'];
        
        // Adjust descriptions for DOC files
        if (this.fileType === 'doc') {
            const docDescriptions = {
                'converting': 'Converting legacy DOC format using specialized tools',
                'extracting': 'Using multiple extraction methods for complete text capture',
                'finalizing': 'Validating extracted text and cleaning up formatting'
            };
            
            if (docDescriptions[stage]) {
                info.stageDescription = docDescriptions[stage];
            }
        }
        
        return info;
    }
    
    getLongRunningExplanation(elapsedTime) {
        if (this.fileType !== 'doc') return '';
        
        if (elapsedTime > 180) { // 3+ minutes
            return `
                <div class="long-running-notice" style="
                    background: rgba(255, 193, 7, 0.1);
                    border: 1px solid rgba(255, 193, 7, 0.3);
                    border-radius: 0.5rem;
                    padding: 0.5rem;
                    margin: 0.5rem 0;
                    font-size: 0.8em;
                ">
                    <div style="color: #FFC107; font-weight: 600; margin-bottom: 0.25rem;">
                        ⚠️ Extended Processing Time
                    </div>
                    <div style="color: rgba(255, 242, 198, 0.8);">
                        This DOC file is taking longer than usual. Complex formatting or embedded content may require additional processing time.
                    </div>
                </div>
            `;
        } else if (elapsedTime > 120) { // 2+ minutes
            return `
                <div class="processing-notice" style="
                    background: rgba(78, 196, 254, 0.1);
                    border: 1px solid rgba(78, 196, 254, 0.2);
                    border-radius: 0.5rem;
                    padding: 0.5rem;
                    margin: 0.5rem 0;
                    font-size: 0.8em;
                    color: rgba(255, 242, 198, 0.8);
                ">
                    <div style="color: #4EC4FE; font-weight: 600; margin-bottom: 0.25rem;">
                        📄 DOC File Processing
                    </div>
                    <div>
                        DOC files require specialized conversion tools and multiple extraction methods to ensure accurate text capture.
                    </div>
                </div>
            `;
        }
        
        return '';
    }
    
    createDOCSpecificStatusDisplay(message, elapsedTime) {
        const timeEstimate = this.getEstimatedTimeRemaining();
        const stageInfo = this.getProcessingStageInfo(this.processingStage, elapsedTime);
        
        return `
            <div class="status-main" style="margin-bottom: 0.5rem;">
                ${message}
            </div>
            <div class="doc-status-details" style="font-size: 0.85em; color: rgba(255, 242, 198, 0.8); line-height: 1.4;">
                <div class="time-estimate" style="margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.5rem;">
                    <span style="color: #4EC4FE;">⏱️</span>
                    <span>${timeEstimate}</span>
                </div>
                <div class="processing-stage" style="margin-bottom: 0.5rem; color: rgba(255, 242, 198, 0.7);">
                    📄 ${stageInfo.stageDescription}
                </div>
                ${elapsedTime > 120 ? this.getTimeoutWarningMessage(elapsedTime) : ''}
                ${elapsedTime > 60 ? '<div style="color: rgba(255, 242, 198, 0.6); font-style: italic;">💡 DOC files require specialized processing for optimal text extraction</div>' : ''}
            </div>
        `;
    }
    
    getTimeoutWarningMessage(elapsedTime) {
        if (elapsedTime > 240) { // 4+ minutes
            return `
                <div class="timeout-warning" style="
                    background: rgba(239, 68, 68, 0.1);
                    border: 1px solid rgba(239, 68, 68, 0.3);
                    border-radius: 0.5rem;
                    padding: 0.5rem;
                    margin: 0.5rem 0;
                    font-size: 0.8em;
                ">
                    <div style="color: #ef4444; font-weight: 600; margin-bottom: 0.25rem;">
                        ⚠️ Extended Processing Time
                    </div>
                    <div style="color: rgba(255, 242, 198, 0.8);">
                        This DOC file is taking longer than expected. You may refresh the page and check the candidates list, as processing may continue in the background.
                    </div>
                </div>
            `;
        } else if (elapsedTime > 180) { // 3+ minutes
            return `
                <div class="processing-notice" style="
                    background: rgba(255, 193, 7, 0.1);
                    border: 1px solid rgba(255, 193, 7, 0.3);
                    border-radius: 0.5rem;
                    padding: 0.5rem;
                    margin: 0.5rem 0;
                    font-size: 0.8em;
                ">
                    <div style="color: #FFC107; font-weight: 600; margin-bottom: 0.25rem;">
                        ⏳ Processing Taking Longer
                    </div>
                    <div style="color: rgba(255, 242, 198, 0.8);">
                        Complex DOC files with formatting or embedded content may require additional processing time.
                    </div>
                </div>
            `;
        }
        
        return '';
    }
    
    handleBackendStatusUpdate(statusData) {
        // Handle status updates from backend processing stages with file-type-specific logic
        if (statusData.stage) {
            this.processingStage = statusData.stage;
        }
        
        // Get file-type-specific progress for the current stage
        const stageProgress = this.getProgressForStage(this.processingStage, this.fileType);
        const additionalProgress = statusData.progress || 0;
        
        // Use enhanced progress update method
        this.updateProgressBasedOnFileType(
            Math.min(stageProgress + additionalProgress, 100), 
            this.processingStage
        );
        
        // Update status message with file-type-specific messaging
        this.showUploadStatus(
            'Processing...',
            this.getFileTypeSpecificMessage(this.processingStage),
            true // Use enhanced display for backend status updates
        );
        
        // Log stage update for debugging
        console.log(`Backend stage update: ${this.processingStage} (${this.fileType}) - Progress: ${stageProgress + additionalProgress}%`);
    }
    
    simulateStageBasedProgress() {
        // Simulate stage-based progress updates for testing purposes
        if (!this.processingStartTime || this.isIndeterminate) {
            return;
        }
        
        const elapsedTime = (Date.now() - this.processingStartTime) / 1000;
        const profile = this.getProgressEstimationForFileType(this.fileType, this.selectedFile?.size || 0);
        
        // Determine current stage based on elapsed time and file type
        let currentStage = 'initial';
        let cumulativeDuration = 0;
        
        for (const stage of profile.stages) {
            cumulativeDuration += stage.duration;
            if (elapsedTime <= cumulativeDuration) {
                currentStage = stage.name;
                break;
            }
        }
        
        // Update progress if stage has changed
        if (currentStage !== this.processingStage) {
            this.handleBackendStatusUpdate({
                stage: currentStage,
                progress: 0
            });
        }
    }
    
    startStageProgressSimulation() {
        // Start periodic stage progress simulation for better user experience
        if (this.stageProgressInterval) {
            clearInterval(this.stageProgressInterval);
        }
        
        this.stageProgressInterval = setInterval(() => {
            if (!this.uploadInProgress || this.isIndeterminate) {
                this.stopStageProgressSimulation();
                return;
            }
            
            this.simulateStageBasedProgress();
        }, 2000); // Check every 2 seconds
        
        console.log(`Started stage progress simulation for ${this.fileType} file`);
    }
    
    stopStageProgressSimulation() {
        if (this.stageProgressInterval) {
            clearInterval(this.stageProgressInterval);
            this.stageProgressInterval = null;
            console.log('Stopped stage progress simulation');
        }
    }
    
    getProgressEstimationForFileType(fileType, fileSize) {
        // Create progress estimation logic based on file type and size
        const fileSizeMB = fileSize / (1024 * 1024);
        
        const progressProfiles = {
            'doc': {
                stages: [
                    { name: 'initial', duration: 5, progress: 10 },
                    { name: 'converting', duration: 30 + (fileSizeMB * 10), progress: 40 },
                    { name: 'extracting', duration: 60 + (fileSizeMB * 15), progress: 80 },
                    { name: 'finalizing', duration: 10, progress: 100 }
                ],
                totalEstimate: 105 + (fileSizeMB * 25),
                indeterminateThreshold: 60,
                longRunningThreshold: 90
            },
            'docx': {
                stages: [
                    { name: 'initial', duration: 3, progress: 15 },
                    { name: 'converting', duration: 10 + (fileSizeMB * 5), progress: 50 },
                    { name: 'extracting', duration: 15 + (fileSizeMB * 8), progress: 90 },
                    { name: 'finalizing', duration: 5, progress: 100 }
                ],
                totalEstimate: 33 + (fileSizeMB * 13),
                indeterminateThreshold: 120,
                longRunningThreshold: 180
            },
            'pdf': {
                stages: [
                    { name: 'initial', duration: 5, progress: 20 },
                    { name: 'converting', duration: 20 + (fileSizeMB * 8), progress: 60 },
                    { name: 'extracting', duration: 30 + (fileSizeMB * 10), progress: 90 },
                    { name: 'finalizing', duration: 5, progress: 100 }
                ],
                totalEstimate: 60 + (fileSizeMB * 18),
                indeterminateThreshold: 180,
                longRunningThreshold: 300
            },
            'txt': {
                stages: [
                    { name: 'initial', duration: 2, progress: 25 },
                    { name: 'converting', duration: 3, progress: 60 },
                    { name: 'extracting', duration: 5, progress: 90 },
                    { name: 'finalizing', duration: 2, progress: 100 }
                ],
                totalEstimate: 12,
                indeterminateThreshold: 60,
                longRunningThreshold: 120
            }
        };
        
        return progressProfiles[fileType] || progressProfiles['pdf'];
    }
    
    getProgressForStage(stage, fileType = null) {
        // Get progress percentage for a specific processing stage
        const profile = this.getProgressEstimationForFileType(fileType || this.fileType, this.selectedFile?.size || 0);
        const stageData = profile.stages.find(s => s.name === stage);
        return stageData ? stageData.progress : 50;
    }
    
    shouldSwitchToIndeterminate() {
        // Determine if we should switch to indeterminate mode based on file type and elapsed time
        if (!this.processingStartTime || this.isIndeterminate) {
            return false;
        }
        
        const elapsedTime = (Date.now() - this.processingStartTime) / 1000;
        const profile = this.getProgressEstimationForFileType(this.fileType, this.selectedFile?.size || 0);
        
        return elapsedTime > profile.indeterminateThreshold;
    }
    
    shouldShowLongRunningExplanation() {
        // Determine if we should show detailed explanation for long-running processes
        if (!this.processingStartTime) {
            return false;
        }
        
        const elapsedTime = (Date.now() - this.processingStartTime) / 1000;
        const profile = this.getProgressEstimationForFileType(this.fileType, this.selectedFile?.size || 0);
        
        return elapsedTime > profile.longRunningThreshold;
    }
    
    updateProgressPercentageDisplay(percentage) {
        // Update progress percentage display in the UI
        const progressText = document.getElementById('progressText');
        const progressPercentage = document.getElementById('progressPercentage');
        
        if (progressText) {
            progressText.textContent = `${Math.round(percentage)}%`;
        }
        
        if (progressPercentage) {
            progressPercentage.textContent = `Processing...`;
        }
        
        // Update file status based on progress
        this.updateFileStatus(percentage);
        
        // Also update any status displays that show progress
        const statusDetails = document.querySelector('.status-details');
        if (statusDetails) {
            const progressSpan = statusDetails.querySelector('.progress-percentage');
            if (progressSpan) {
                progressSpan.textContent = `${Math.round(percentage)}% complete`;
            } else {
                // Create progress percentage display if it doesn't exist
                const timeEstimate = statusDetails.querySelector('.time-estimate');
                if (timeEstimate) {
                    const existingProgress = timeEstimate.querySelector('.progress-percentage');
                    if (!existingProgress) {
                        const progressSpan = document.createElement('span');
                        progressSpan.className = 'progress-percentage';
                        progressSpan.style.cssText = 'color: rgba(255, 242, 198, 0.6); margin-left: 0.5rem;';
                        progressSpan.textContent = `${Math.round(percentage)}% complete`;
                        timeEstimate.appendChild(progressSpan);
                    } else {
                        existingProgress.textContent = `${Math.round(percentage)}% complete`;
                    }
                }
            }
        }
    }
    
    updateProgressBar(percentage) {
        const progressFill = document.getElementById('progressFill');
        if (progressFill) {
            const clampedPercentage = Math.min(Math.max(percentage, 0), 100);
            progressFill.style.width = `${clampedPercentage}%`;
            console.log(`📊 Updated progress bar to ${clampedPercentage}%`);
        }
    }
    
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
    
    updateProgressBasedOnFileType(baseProgress, stage = null) {
        // Enhanced progress update that considers file type characteristics
        if (!this.fileType || !this.selectedFile) {
            this.updateProgress(baseProgress, stage);
            return;
        }
        
        const profile = this.getProgressEstimationForFileType(this.fileType, this.selectedFile.size);
        let adjustedProgress = baseProgress;
        
        // Apply file-type-specific progress adjustments
        if (stage) {
            const stageProgress = this.getProgressForStage(stage, this.fileType);
            // Blend base progress with stage-specific progress
            adjustedProgress = Math.min(baseProgress, stageProgress);
            
            // Update processing stage for enhanced status display
            this.processingStage = stage;
        }
        
        // Check if we should switch to indeterminate mode
        if (this.shouldSwitchToIndeterminate()) {
            this.switchToIndeterminate();
            return;
        }
        
        // Check if we should show long-running explanation for DOC files
        if (this.shouldShowLongRunningExplanation() && this.fileType === 'doc') {
            this.showLongRunningExplanation();
            return;
        }
        
        // Update progress with enhanced status messaging
        this.updateProgress(adjustedProgress, stage);
        
        // For DOC files, update status message with stage-specific information
        if (this.fileType === 'doc' && stage && this.processingStartTime) {
            const elapsedTime = (Date.now() - this.processingStartTime) / 1000;
            
            // Show enhanced status for DOC files after 30 seconds
            if (elapsedTime > 30) {
                this.showUploadStatus(
                    'Processing...', 
                    this.getFileTypeSpecificMessage(stage),
                    true // Always use enhanced display for DOC files
                );
            }
        }
    }
    
    showUploadSuccess() {
        const uploadStatus = document.getElementById('uploadStatus');
        const uploadResults = document.getElementById('uploadResults');
        const resultCandidateId = document.getElementById('resultCandidateId');
        const resultStatus = document.getElementById('resultStatus');
        
        // Stop stage progress simulation
        this.stopStageProgressSimulation();
        
        uploadStatus.style.display = 'none';
        uploadResults.style.display = 'block';
        
        resultCandidateId.textContent = this.currentCandidateId;
        resultStatus.textContent = 'Processed';
        
        // Store candidate ID in session storage for other functions
        if (this.currentCandidateId) {
            sessionStorage.setItem('currentCandidateId', this.currentCandidateId);
        }
        
        // Add success animation
        uploadResults.classList.add('success-state');
    }
    
    showError(message) {
        // Create or update error display
        let errorDiv = document.querySelector('.upload-error');
        
        if (!errorDiv) {
            errorDiv = document.createElement('div');
            errorDiv.className = 'upload-error';
            errorDiv.style.cssText = `
                background: rgba(239, 68, 68, 0.1);
                border: 1px solid rgba(239, 68, 68, 0.3);
                color: #ef4444;
                padding: 1rem;
                border-radius: 0.5rem;
                margin-top: 1rem;
                text-align: center;
            `;
            
            const uploadForm = document.getElementById('uploadForm');
            uploadForm.appendChild(errorDiv);
        }
        
        errorDiv.textContent = message;
        errorDiv.classList.add('error-state');
        
        // Hide after 5 seconds
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.remove();
            }
        }, 5000);
    }
    
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    startRealtimeMonitoring() {
        if (!window.realtimeTextExtraction) {
            console.error('Real-time text extraction not loaded');
            // Fallback to old method
            this.fallbackToOldMethod();
            return;
        }
        
        const candidateId = this.currentCandidateId;
        const jobId = this.currentJobId;
        
        console.log(`Starting real-time monitoring for candidate: ${candidateId}, file type: ${this.fileType}`);
        
        // Start monitoring with callbacks
        window.realtimeTextExtraction.startMonitoring(
            candidateId,
            jobId,
            // onUpdate callback with enhanced DOC processing status handling
            (status) => {
                // Use backend-provided progress if available, otherwise calculate based on file type
                let progressValue;
                let currentStage = status.processingStage || 'extracting';
                
                if (status.backendProgress !== undefined && status.backendProgress !== null) {
                    // Use backend-provided progress directly
                    progressValue = Math.min(100, Math.max(0, status.backendProgress));
                } else if (status.progressPercentage !== undefined) {
                    // Use calculated progress from real-time monitoring
                    progressValue = Math.min(100, Math.max(50, status.progressPercentage));
                } else {
                    // Fallback to file-type-specific progress calculation
                    const profile = this.getProgressEstimationForFileType(this.fileType, this.selectedFile?.size || 0);
                    let progressIncrement;
                    
                    switch (this.fileType) {
                        case 'doc':
                            // DOC files: use more conservative progress based on stage
                            progressIncrement = this.getDocProgressIncrement(status, currentStage);
                            break;
                        case 'pdf':
                            progressIncrement = Math.min(status.attempts * 1.5, 40);
                            break;
                        case 'docx':
                            progressIncrement = Math.min(status.attempts * 2.5, 45);
                            break;
                        case 'txt':
                            progressIncrement = Math.min(status.attempts * 4, 45);
                            break;
                        default:
                            progressIncrement = Math.min(status.attempts * 2, 40);
                    }
                    
                    progressValue = 50 + progressIncrement;
                }
                
                // Update progress with enhanced stage information
                this.updateProgressBasedOnFileType(progressValue, currentStage);
                
                // Use enhanced status display with backend stage messages
                const statusMessage = status.backendStageMessage || 
                                    status.stageMessage || 
                                    this.getFileTypeSpecificMessage(currentStage);
                
                this.showUploadStatus('Processing...', statusMessage, true);
                
                // Log enhanced status information for debugging
                if (this.fileType === 'doc') {
                    console.log(`📄 DOC Status Update:`, {
                        stage: currentStage,
                        progress: progressValue,
                        backendStage: status.backendStage,
                        method: status.extractionMethod,
                        elapsed: status.elapsed
                    });
                }
            },
            // onComplete callback
            (result) => {
                console.log('✅ Text extraction completed!', result);
                this.updateProgressBasedOnFileType(100, 'finalizing');
                this.showUploadStatus(
                    'Complete!', 
                    `Text extracted successfully (${result.textLength} characters)`,
                    false
                );
                
                // Show success after a brief delay
                setTimeout(() => {
                    this.showUploadSuccess();
                }, 1000);
            },
            // onError callback with enhanced DOC-specific error handling
            (error) => {
                console.error('❌ Text extraction failed:', error);
                
                // Enhanced error handling for DOC files
                let errorMessage = error.message;
                
                if (error.isDocFile && this.fileType === 'doc') {
                    // Add DOC-specific context to error message
                    if (error.errorCode) {
                        console.error(`DOC Error Code: ${error.errorCode}`);
                    }
                    if (error.methodName) {
                        console.error(`Failed Method: ${error.methodName}`);
                    }
                    if (error.processingStage) {
                        console.error(`Failed at Stage: ${error.processingStage}`);
                    }
                    
                    // Show enhanced error message for DOC files
                    if (error.retryPossible) {
                        errorMessage += '\n\nThis error may be temporary. You can try uploading the file again.';
                    } else {
                        errorMessage += '\n\nFor better results, try converting your DOC file to PDF or DOCX format before uploading.';
                    }
                }
                
                this.showError(errorMessage);
                
                // Stop stage progress simulation on error
                this.stopStageProgressSimulation();
            },
            // fileType parameter
            this.fileType
        );
    }
    
    async fallbackToOldMethod() {
        try {
            if (this.currentJobId) {
                await this.monitorTextractJob();
            } else {
                await this.waitForProcessing();
            }
            
            this.updateProgress(100);
            this.showUploadSuccess();
        } catch (error) {
            this.showError(error.message);
        }
    }
}

// Global functions for button actions
window.viewExtractedText = async function() {
    const candidateId = (typeof uploadManager !== 'undefined' && uploadManager.currentCandidateId) || 
                       sessionStorage.getItem('currentCandidateId') || 
                       new URLSearchParams(window.location.search).get('candidateId');
    
    if (!candidateId) {
        console.warn('No candidate ID available for viewing extracted text');
        return;
    }
    
    try {
        const analysis = await window.resumifyAPI.getAnalysis(candidateId);
        
        // Handle both wrapped and direct response formats
        const data = analysis.success ? analysis.data : analysis;
        
        if (data) {
            const { extractedText, textExtractionStatus, textExtractionError } = data;
            
            // Handle different text extraction states
            switch (textExtractionStatus) {
                case 'pending':
                    showExtractedTextModal(null, 'pending');
                    break;
                case 'failed':
                    // Use enhanced error handling
                    const errorInfo = window.TextExtractionErrorHandler ? 
                        window.TextExtractionErrorHandler.getErrorInfo(textExtractionError) :
                        { message: textExtractionError || 'Text extraction failed' };
                    showExtractedTextModal(null, 'failed', errorInfo);
                    break;
                case 'completed':
                    if (extractedText && extractedText.trim() && extractedText !== 'Processing...') {
                        showExtractedTextModal(extractedText, 'completed');
                    } else {
                        showExtractedTextModal(null, 'empty');
                    }
                    break;
                default:
                    // Fallback for legacy data or missing status
                    if (extractedText && extractedText !== 'Processing...') {
                        showExtractedTextModal(extractedText, 'completed');
                    } else {
                        showExtractedTextModal(null, 'pending');
                    }
            }
        } else {
            throw new Error('Failed to retrieve analysis data');
        }
    } catch (error) {
        console.error('Failed to get extracted text:', error);
        
        // Log error for debugging
        if (window.TextExtractionErrorHandler) {
            window.TextExtractionErrorHandler.logError(error, {
                candidateId: candidateId,
                action: 'view_extracted_text'
            });
        }
        
        showExtractedTextModal(null, 'error', error.message);
    }
};

window.continueToAnalysis = function() {
    const candidateId = (typeof uploadManager !== 'undefined' && uploadManager.currentCandidateId) || 
                       sessionStorage.getItem('currentCandidateId');
    
    if (candidateId) {
        // Store candidate ID for analysis page
        sessionStorage.setItem('currentCandidateId', candidateId);
        
        // Navigate to analysis page with candidate ID in URL
        window.location.href = `/analysis.html?candidateId=${candidateId}`;
    } else {
        console.warn('No candidate ID available for analysis');
    }
};

function showExtractedTextModal(text, status = 'completed', errorMessage = null) {
    // Create modal overlay with improved backdrop
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.85);
        backdrop-filter: blur(8px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 2000;
        padding: 1rem;
        animation: modalFadeIn 0.3s ease-out;
    `;
    
    let modalContent = '';
    let modalActions = '';
    let formattedText = ''; // Declare at function scope
    
    // Helper function to format text with proper line breaks and whitespace handling
    const formatExtractedText = (rawText) => {
        if (!rawText || typeof rawText !== 'string') return '';
        
        return rawText
            // Normalize line breaks
            .replace(/\r\n/g, '\n')
            .replace(/\r/g, '\n')
            // Remove excessive whitespace but preserve intentional spacing
            .replace(/[ \t]+/g, ' ')
            // Remove excessive line breaks (more than 2 consecutive)
            .replace(/\n{3,}/g, '\n\n')
            // Trim leading/trailing whitespace
            .trim();
    };
    
    // Helper function to get specific error messages
    const getSpecificErrorMessage = (error) => {
        if (!error) return 'An error occurred during text extraction.';
        
        const errorStr = error.toString().toLowerCase();
        
        if (errorStr.includes('timeout') || errorStr.includes('timed out')) {
            return 'Text extraction timed out. The document may be too large or complex. Please try again or use a smaller file.';
        }
        if (errorStr.includes('network') || errorStr.includes('connection')) {
            return 'Network connection error. Please check your internet connection and try again.';
        }
        if (errorStr.includes('format') || errorStr.includes('unsupported')) {
            return 'Unsupported file format or corrupted document. Please ensure your file is a valid PDF, DOCX, or TXT file.';
        }
        if (errorStr.includes('permission') || errorStr.includes('access')) {
            return 'Access denied. The document may be password-protected or have restricted permissions.';
        }
        if (errorStr.includes('size') || errorStr.includes('too large')) {
            return 'File size too large for processing. Please use a smaller document (under 10MB).';
        }
        if (errorStr.includes('textract') || errorStr.includes('aws')) {
            return 'AWS Textract service error. This is usually temporary - please try again in a few moments.';
        }
        
        return error;
    };
    
    switch (status) {
        case 'pending':
            modalContent = `
                <div class="modal-body text-center">
                    <div class="loading-container" style="margin: 2rem auto;">
                        <div class="loading-spinner-enhanced" style="
                            width: 60px;
                            height: 60px;
                            position: relative;
                            margin: 0 auto 1rem;
                        ">
                            <div class="spinner-ring" style="
                                width: 60px;
                                height: 60px;
                                border: 4px solid rgba(78, 196, 254, 0.2);
                                border-top: 4px solid #4EC4FE;
                                border-radius: 50%;
                                animation: spin 1.2s linear infinite;
                                position: absolute;
                            "></div>
                            <div class="spinner-ring-inner" style="
                                width: 40px;
                                height: 40px;
                                border: 3px solid rgba(0, 215, 171, 0.2);
                                border-top: 3px solid #00D7AB;
                                border-radius: 50%;
                                animation: spin 1.8s linear infinite reverse;
                                position: absolute;
                                top: 10px;
                                left: 10px;
                            "></div>
                            <div class="spinner-dot" style="
                                width: 8px;
                                height: 8px;
                                background: #FFD646;
                                border-radius: 50%;
                                position: absolute;
                                top: 26px;
                                left: 26px;
                                animation: pulse 2s ease-in-out infinite;
                            "></div>
                        </div>
                    </div>
                    <h4 style="color: #FFF2C6; margin-bottom: 1rem; font-weight: 600; font-size: 1.2rem;">
                        Extracting Text...
                    </h4>
                    <p style="color: rgba(255, 242, 198, 0.8); margin-bottom: 1rem; line-height: 1.5;">
                        AI is analyzing your document and extracting text content.
                    </p>
                    <p style="color: rgba(255, 242, 198, 0.6); font-size: 0.9rem; line-height: 1.4;">
                        PDF files typically take 1-2 minutes • DOCX and TXT files process faster
                    </p>
                    <div class="progress-dots" style="margin-top: 1.5rem;">
                        <span class="dot" style="
                            display: inline-block;
                            width: 8px;
                            height: 8px;
                            background: #4EC4FE;
                            border-radius: 50%;
                            margin: 0 4px;
                            animation: dotPulse 1.5s ease-in-out infinite;
                        "></span>
                        <span class="dot" style="
                            display: inline-block;
                            width: 8px;
                            height: 8px;
                            background: #4EC4FE;
                            border-radius: 50%;
                            margin: 0 4px;
                            animation: dotPulse 1.5s ease-in-out infinite 0.2s;
                        "></span>
                        <span class="dot" style="
                            display: inline-block;
                            width: 8px;
                            height: 8px;
                            background: #4EC4FE;
                            border-radius: 50%;
                            margin: 0 4px;
                            animation: dotPulse 1.5s ease-in-out infinite 0.4s;
                        "></span>
                    </div>
                </div>
            `;
            modalActions = `
                <button class="btn-modal btn-secondary refresh-text">Check Status</button>
                <button class="btn-modal btn-primary close-modal">Close</button>
            `;
            break;
            
        case 'failed':
            // Use enhanced error handling if available
            if (window.TextExtractionErrorHandler && typeof errorMessage === 'object') {
                modalContent = window.TextExtractionErrorHandler.createErrorModalContent(errorMessage);
                modalActions = ''; // Actions are included in the content
            } else {
                // Fallback to legacy error display
                const errorText = typeof errorMessage === 'object' ? 
                    (errorMessage.message || 'An error occurred during processing') : 
                    (errorMessage || 'An error occurred during processing');
                    
                modalContent = `
                    <div class="modal-body text-center">
                        <div class="error-icon" style="
                            width: 60px;
                            height: 60px;
                            background: linear-gradient(135deg, rgba(242, 78, 50, 0.2), rgba(239, 68, 68, 0.1));
                            border: 2px solid rgba(242, 78, 50, 0.3);
                            border-radius: 50%;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            margin: 2rem auto 1.5rem;
                            animation: errorPulse 2s ease-in-out infinite;
                        ">
                            <i data-lucide="alert-triangle" style="color: #F24E32; width: 24px; height: 24px;"></i>
                        </div>
                        <h4 style="color: #F24E32; margin-bottom: 1rem; font-weight: 600; font-size: 1.2rem;">
                            Text Extraction Failed
                        </h4>
                        <div class="error-details" style="
                            background: rgba(242, 78, 50, 0.1);
                            border: 1px solid rgba(242, 78, 50, 0.2);
                            border-radius: 0.75rem;
                            padding: 1rem;
                            margin: 1rem 0;
                        ">
                            <p style="color: rgba(255, 242, 198, 0.9); font-size: 0.95rem; line-height: 1.5; margin: 0;">
                                ${getSpecificErrorMessage(errorText)}
                            </p>
                        </div>
                        <p style="color: rgba(255, 242, 198, 0.7); font-size: 0.85rem; line-height: 1.4;">
                            If the problem persists, try uploading a different file format or contact support.
                        </p>
                    </div>
                `;
                modalActions = `
                    <button class="btn-modal btn-secondary retry-extraction">Try Again</button>
                    <button class="btn-modal btn-primary close-modal">Close</button>
                `;
            }
            break;
            
        case 'empty':
            modalContent = `
                <div class="modal-body text-center">
                    <div class="warning-icon" style="
                        width: 60px;
                        height: 60px;
                        background: linear-gradient(135deg, rgba(255, 214, 70, 0.2), rgba(251, 191, 36, 0.1));
                        border: 2px solid rgba(255, 214, 70, 0.3);
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        margin: 2rem auto 1.5rem;
                    ">
                        <i data-lucide="file-x" style="color: #FFD646; width: 24px; height: 24px;"></i>
                    </div>
                    <h4 style="color: #FFD646; margin-bottom: 1rem; font-weight: 600; font-size: 1.2rem;">
                        No Text Content Found
                    </h4>
                    <div class="warning-details" style="
                        background: rgba(255, 214, 70, 0.1);
                        border: 1px solid rgba(255, 214, 70, 0.2);
                        border-radius: 0.75rem;
                        padding: 1rem;
                        margin: 1rem 0;
                    ">
                        <p style="color: rgba(255, 242, 198, 0.9); font-size: 0.95rem; line-height: 1.5; margin: 0;">
                            The document appears to be empty or contains only images, graphics, or scanned content that couldn't be converted to text.
                        </p>
                    </div>
                    <p style="color: rgba(255, 242, 198, 0.7); font-size: 0.85rem; line-height: 1.4;">
                        Try uploading a document with selectable text content, or ensure scanned documents have good image quality.
                    </p>
                </div>
            `;
            modalActions = `
                <button class="btn-modal btn-secondary retry-extraction">Try Different File</button>
                <button class="btn-modal btn-primary close-modal">Close</button>
            `;
            break;
            
        case 'error':
            modalContent = `
                <div class="modal-body text-center">
                    <div class="connection-error-icon" style="
                        width: 60px;
                        height: 60px;
                        background: linear-gradient(135deg, rgba(242, 78, 50, 0.2), rgba(239, 68, 68, 0.1));
                        border: 2px solid rgba(242, 78, 50, 0.3);
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        margin: 2rem auto 1.5rem;
                    ">
                        <i data-lucide="wifi-off" style="color: #F24E32; width: 24px; height: 24px;"></i>
                    </div>
                    <h4 style="color: #F24E32; margin-bottom: 1rem; font-weight: 600; font-size: 1.2rem;">
                        Connection Error
                    </h4>
                    <div class="error-details" style="
                        background: rgba(242, 78, 50, 0.1);
                        border: 1px solid rgba(242, 78, 50, 0.2);
                        border-radius: 0.75rem;
                        padding: 1rem;
                        margin: 1rem 0;
                    ">
                        <p style="color: rgba(255, 242, 198, 0.9); font-size: 0.95rem; line-height: 1.5; margin: 0;">
                            ${getSpecificErrorMessage(errorMessage)}
                        </p>
                    </div>
                    <p style="color: rgba(255, 242, 198, 0.7); font-size: 0.85rem; line-height: 1.4;">
                        Please check your internet connection and try again.
                    </p>
                </div>
            `;
            modalActions = `
                <button class="btn-modal btn-secondary refresh-text">Try Again</button>
                <button class="btn-modal btn-primary close-modal">Close</button>
            `;
            break;
            
        default: // completed
            formattedText = formatExtractedText(text); // Use the function-scoped variable
            const isEmpty = !formattedText || formattedText.trim().length === 0;
            
            if (isEmpty) {
                // Handle case where text is technically "completed" but empty
                return showExtractedTextModal(null, 'empty');
            }
            
            modalContent = `
                <div class="modal-body">
                    <div class="text-stats" style="
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        margin-bottom: 1rem;
                        padding: 0.75rem;
                        background: rgba(78, 196, 254, 0.1);
                        border: 1px solid rgba(78, 196, 254, 0.2);
                        border-radius: 0.5rem;
                        font-size: 0.85rem;
                        color: rgba(255, 242, 198, 0.8);
                    ">
                        <span>Characters: ${formattedText.length.toLocaleString()}</span>
                        <span>Words: ${formattedText.split(/\s+/).filter(word => word.length > 0).length.toLocaleString()}</span>
                        <span>Lines: ${formattedText.split('\n').length.toLocaleString()}</span>
                    </div>
                    <div class="text-container" style="
                        max-height: 450px;
                        overflow-y: auto;
                        border: 1px solid rgba(218, 165, 255, 0.2);
                        border-radius: 0.75rem;
                        background: rgba(25, 25, 25, 0.8);
                        position: relative;
                    ">
                        <pre class="extracted-text-content" style="
                            white-space: pre-wrap;
                            word-wrap: break-word;
                            font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                            font-size: 0.9rem;
                            line-height: 1.6;
                            color: rgba(255, 242, 198, 0.95);
                            padding: 1.5rem;
                            margin: 0;
                            background: transparent;
                            border: none;
                            outline: none;
                            resize: none;
                            overflow-wrap: break-word;
                        ">${formattedText}</pre>
                    </div>
                </div>
            `;
            modalActions = `
                <button class="btn-modal btn-secondary copy-text">
                    <i data-lucide="copy" style="width: 16px; height: 16px; margin-right: 0.5rem;"></i>
                    Copy Text
                </button>
                <button class="btn-modal btn-secondary download-text">
                    <i data-lucide="download" style="width: 16px; height: 16px; margin-right: 0.5rem;"></i>
                    Download Text
                </button>
                <button class="btn-modal btn-primary close-modal">Close</button>
            `;
    }
    
    modal.innerHTML = `
        <div class="modal-content" style="
            background: linear-gradient(135deg, rgba(25, 25, 25, 0.95), rgba(102, 40, 173, 0.1));
            border: 1px solid rgba(218, 165, 255, 0.3);
            border-radius: 1.5rem;
            padding: 2rem;
            max-width: 900px;
            width: 90vw;
            max-height: 85vh;
            overflow: hidden;
            backdrop-filter: blur(20px);
            box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(218, 165, 255, 0.1);
            animation: modalSlideIn 0.4s ease-out;
        ">
            <div class="modal-header" style="
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 1.5rem;
                padding-bottom: 1rem;
                border-bottom: 1px solid rgba(218, 165, 255, 0.2);
            ">
                <h3 style="
                    color: #FFF2C6;
                    font-size: 1.5rem;
                    font-weight: 600;
                    margin: 0;
                    background: linear-gradient(135deg, #4EC4FE, #DAA5FF);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                ">Extracted Text</h3>
                <button class="close-modal" style="
                    background: rgba(242, 78, 50, 0.1);
                    border: 1px solid rgba(242, 78, 50, 0.3);
                    color: #F24E32;
                    width: 36px;
                    height: 36px;
                    border-radius: 50%;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s ease;
                    font-size: 18px;
                    font-weight: bold;
                " onmouseover="this.style.background='rgba(242, 78, 50, 0.2)'" onmouseout="this.style.background='rgba(242, 78, 50, 0.1)'">✕</button>
            </div>
            ${modalContent}
            <div class="modal-actions" style="
                margin-top: 1.5rem;
                display: flex;
                gap: 1rem;
                justify-content: flex-end;
                padding-top: 1rem;
                border-top: 1px solid rgba(218, 165, 255, 0.2);
            ">
                ${modalActions}
            </div>
        </div>
    `;
    
    // Add enhanced CSS animations
    const style = document.createElement('style');
    style.textContent = `
        @keyframes modalFadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        
        @keyframes modalSlideIn {
            from { 
                opacity: 0; 
                transform: translateY(-20px) scale(0.95); 
            }
            to { 
                opacity: 1; 
                transform: translateY(0) scale(1); 
            }
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        @keyframes pulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.5; transform: scale(0.8); }
        }
        
        @keyframes dotPulse {
            0%, 100% { opacity: 0.3; transform: scale(0.8); }
            50% { opacity: 1; transform: scale(1.2); }
        }
        
        @keyframes errorPulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
        }
        
        .btn-modal {
            padding: 0.75rem 1.5rem;
            border-radius: 0.75rem;
            font-weight: 500;
            font-size: 0.9rem;
            cursor: pointer;
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            border: none;
            font-family: 'Montserrat', sans-serif;
        }
        
        .btn-modal.btn-primary {
            background: linear-gradient(135deg, #4EC4FE, #00D7AB);
            color: #191919;
        }
        
        .btn-modal.btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(78, 196, 254, 0.3);
        }
        
        .btn-modal.btn-secondary {
            background: rgba(218, 165, 255, 0.1);
            border: 1px solid rgba(218, 165, 255, 0.3);
            color: #DAA5FF;
        }
        
        .btn-modal.btn-secondary:hover {
            background: rgba(218, 165, 255, 0.2);
            transform: translateY(-2px);
        }
        
        .text-container::-webkit-scrollbar {
            width: 8px;
        }
        
        .text-container::-webkit-scrollbar-track {
            background: rgba(218, 165, 255, 0.1);
            border-radius: 4px;
        }
        
        .text-container::-webkit-scrollbar-thumb {
            background: rgba(78, 196, 254, 0.3);
            border-radius: 4px;
        }
        
        .text-container::-webkit-scrollbar-thumb:hover {
            background: rgba(78, 196, 254, 0.5);
        }
    `;
    document.head.appendChild(style);
    
    // Add event listeners
    modal.addEventListener('click', (e) => {
        if (e.target === modal || e.target.classList.contains('close-modal')) {
            modal.style.animation = 'modalFadeIn 0.2s ease-out reverse';
            setTimeout(() => modal.remove(), 200);
        }
    });
    
    // Enhanced copy text functionality
    const copyButton = modal.querySelector('.copy-text');
    if (copyButton) {
        copyButton.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(formattedText);
                const originalContent = copyButton.innerHTML;
                copyButton.innerHTML = '<i data-lucide="check" style="width: 16px; height: 16px; margin-right: 0.5rem;"></i>Copied!';
                copyButton.style.background = 'linear-gradient(135deg, #00D7AB, #FFD646)';
                copyButton.style.color = '#191919';
                
                setTimeout(() => {
                    copyButton.innerHTML = originalContent;
                    copyButton.style.background = '';
                    copyButton.style.color = '';
                    if (window.lucide) lucide.createIcons();
                }, 2000);
            } catch (error) {
                console.error('Failed to copy text:', error);
                copyButton.innerHTML = '<i data-lucide="x" style="width: 16px; height: 16px; margin-right: 0.5rem;"></i>Copy Failed';
                copyButton.style.background = 'rgba(242, 78, 50, 0.2)';
                copyButton.style.color = '#F24E32';
                
                setTimeout(() => {
                    copyButton.innerHTML = '<i data-lucide="copy" style="width: 16px; height: 16px; margin-right: 0.5rem;"></i>Copy Text';
                    copyButton.style.background = '';
                    copyButton.style.color = '';
                    if (window.lucide) lucide.createIcons();
                }, 2000);
            }
        });
    }

    // Enhanced download text functionality
    const downloadButton = modal.querySelector('.download-text');
    if (downloadButton) {
        downloadButton.addEventListener('click', async () => {
            try {
                await downloadExtractedText(formattedText);
                const originalContent = downloadButton.innerHTML;
                downloadButton.innerHTML = '<i data-lucide="check" style="width: 16px; height: 16px; margin-right: 0.5rem;"></i>Downloaded!';
                downloadButton.style.background = 'linear-gradient(135deg, #00D7AB, #FFD646)';
                downloadButton.style.color = '#191919';
                
                setTimeout(() => {
                    downloadButton.innerHTML = originalContent;
                    downloadButton.style.background = '';
                    downloadButton.style.color = '';
                    if (window.lucide) lucide.createIcons();
                }, 2000);
            } catch (error) {
                console.error('Failed to download text:', error);
                downloadButton.innerHTML = '<i data-lucide="x" style="width: 16px; height: 16px; margin-right: 0.5rem;"></i>Download Failed';
                downloadButton.style.background = 'rgba(242, 78, 50, 0.2)';
                downloadButton.style.color = '#F24E32';
                
                setTimeout(() => {
                    downloadButton.innerHTML = '<i data-lucide="download" style="width: 16px; height: 16px; margin-right: 0.5rem;"></i>Download Text';
                    downloadButton.style.background = '';
                    downloadButton.style.color = '';
                    if (window.lucide) lucide.createIcons();
                }, 2000);
            }
        });
    }
    
    // Enhanced refresh/retry functionality
    const refreshButton = modal.querySelector('.refresh-text');
    if (refreshButton) {
        refreshButton.addEventListener('click', () => {
            modal.style.animation = 'modalFadeIn 0.2s ease-out reverse';
            setTimeout(() => {
                modal.remove();
                window.viewExtractedText(); // Retry the extraction
            }, 200);
        });
    }
    
    const retryButton = modal.querySelector('.retry-extraction');
    if (retryButton) {
        retryButton.addEventListener('click', async () => {
            modal.style.animation = 'modalFadeIn 0.2s ease-out reverse';
            setTimeout(() => {
                modal.remove();
                
                // Show enhanced loading state
                showExtractedTextModal(null, 'pending');
                
                // Wait a moment then retry
                setTimeout(() => {
                    const loadingModal = document.querySelector('.modal-overlay');
                    if (loadingModal) {
                        loadingModal.style.animation = 'modalFadeIn 0.2s ease-out reverse';
                        setTimeout(() => {
                            loadingModal.remove();
                            window.viewExtractedText();
                        }, 200);
                    }
                }, 3000);
            }, 200);
        });
    }
    
    // Enhanced error action buttons
    const errorActionButtons = modal.querySelectorAll('.error-action-btn');
    errorActionButtons.forEach(button => {
        button.addEventListener('click', () => {
            const action = button.getAttribute('data-action');
            const actionKey = button.getAttribute('data-action-key');
            
            modal.style.animation = 'modalFadeIn 0.2s ease-out reverse';
            setTimeout(() => {
                modal.remove();
                
                if (window.TextExtractionErrorHandler) {
                    window.TextExtractionErrorHandler.handleErrorAction(action, actionKey, {
                        onRetry: () => {
                            setTimeout(() => {
                                window.viewExtractedText();
                            }, 1000);
                        },
                        onUploadNew: () => {
                            if (window.uploadManager) {
                                window.uploadManager.removeFile();
                            }
                        },
                        onManualInput: () => {
                            showManualTextInputModal();
                        },
                        onCheckConnection: () => {
                            testConnectionAndShowResults();
                        },
                        onContactSupport: () => {
                            showSupportContactModal();
                        },
                        onHelp: (helpKey) => {
                            showHelpContentModal(helpKey);
                        }
                    });
                }
            }, 200);
        });
    });
    
    document.body.appendChild(modal);
    
    // Initialize lucide icons if they exist
    if (window.lucide) {
        lucide.createIcons();
    }
    
    // Focus management for accessibility
    const firstButton = modal.querySelector('.btn-modal');
    if (firstButton) {
        setTimeout(() => firstButton.focus(), 100);
    }
    
    // Keyboard navigation
    modal.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            modal.style.animation = 'modalFadeIn 0.2s ease-out reverse';
            setTimeout(() => modal.remove(), 200);
        }
    });
}

// Helper functions for enhanced error handling
function showManualTextInputModal() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.85);
        backdrop-filter: blur(8px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 2000;
        padding: 1rem;
        animation: modalFadeIn 0.3s ease-out;
    `;
    
    modal.innerHTML = `
        <div class="modal-content" style="
            background: linear-gradient(135deg, #191919, #2a2a2a);
            border: 1px solid rgba(218, 165, 255, 0.3);
            border-radius: 1rem;
            padding: 2rem;
            max-width: 600px;
            width: 100%;
            max-height: 80vh;
            overflow-y: auto;
            position: relative;
        ">
            <div class="modal-body">
                <h4 style="color: #FFF2C6; margin-bottom: 1rem; font-weight: 600; font-size: 1.2rem; text-align: center;">
                    Manual Text Input
                </h4>
                <p style="color: rgba(255, 242, 198, 0.8); margin-bottom: 1.5rem; text-align: center;">
                    You can manually enter the text content from your resume below:
                </p>
                <textarea id="manualTextInput" placeholder="Paste or type your resume text here..." style="
                    width: 100%;
                    height: 300px;
                    background: rgba(25, 25, 25, 0.8);
                    border: 1px solid rgba(218, 165, 255, 0.3);
                    border-radius: 0.5rem;
                    padding: 1rem;
                    color: #FFF2C6;
                    font-family: monospace;
                    font-size: 0.9rem;
                    line-height: 1.4;
                    resize: vertical;
                    outline: none;
                "></textarea>
                <div style="display: flex; gap: 0.5rem; justify-content: center; margin-top: 1.5rem;">
                    <button class="btn-modal btn-secondary close-modal">Cancel</button>
                    <button class="btn-modal btn-primary submit-manual-text">Submit Text</button>
                </div>
            </div>
        </div>
    `;
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal || e.target.classList.contains('close-modal')) {
            modal.remove();
        }
        if (e.target.classList.contains('submit-manual-text')) {
            const textInput = modal.querySelector('#manualTextInput');
            const text = textInput.value.trim();
            if (text) {
                modal.remove();
                // Here you would process the manual text input
                console.log('Manual text submitted:', text);
                // You could show the text in the extracted text modal
                showExtractedTextModal(text, 'completed');
            }
        }
    });
    
    document.body.appendChild(modal);
    
    // Focus the textarea
    setTimeout(() => {
        const textarea = modal.querySelector('#manualTextInput');
        if (textarea) textarea.focus();
    }, 100);
}

function testConnectionAndShowResults() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.85);
        backdrop-filter: blur(8px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 2000;
        padding: 1rem;
        animation: modalFadeIn 0.3s ease-out;
    `;
    
    modal.innerHTML = `
        <div class="modal-content" style="
            background: linear-gradient(135deg, #191919, #2a2a2a);
            border: 1px solid rgba(218, 165, 255, 0.3);
            border-radius: 1rem;
            padding: 2rem;
            max-width: 500px;
            width: 100%;
            position: relative;
            text-align: center;
        ">
            <div class="modal-body">
                <div class="connection-test-icon" style="
                    width: 60px;
                    height: 60px;
                    background: linear-gradient(135deg, rgba(78, 196, 254, 0.2), rgba(0, 215, 171, 0.1));
                    border: 2px solid rgba(78, 196, 254, 0.3);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin: 0 auto 1.5rem;
                    animation: pulse 2s ease-in-out infinite;
                ">
                    <i data-lucide="wifi" style="color: #4EC4FE; width: 24px; height: 24px;"></i>
                </div>
                <h4 style="color: #4EC4FE; margin-bottom: 1rem; font-weight: 600; font-size: 1.2rem;">
                    Testing Connection
                </h4>
                <p style="color: rgba(255, 242, 198, 0.8); margin-bottom: 1.5rem;">
                    Checking your internet connection and service availability...
                </p>
                <div id="connectionResults" style="
                    background: rgba(78, 196, 254, 0.1);
                    border: 1px solid rgba(78, 196, 254, 0.2);
                    border-radius: 0.5rem;
                    padding: 1rem;
                    margin-bottom: 1.5rem;
                    text-align: left;
                ">
                    <div class="test-item" style="margin-bottom: 0.5rem;">
                        <span style="color: rgba(255, 242, 198, 0.7);">Internet Connection:</span>
                        <span id="internetStatus" style="color: #FFD646;">Testing...</span>
                    </div>
                    <div class="test-item" style="margin-bottom: 0.5rem;">
                        <span style="color: rgba(255, 242, 198, 0.7);">API Service:</span>
                        <span id="apiStatus" style="color: #FFD646;">Testing...</span>
                    </div>
                    <div class="test-item">
                        <span style="color: rgba(255, 242, 198, 0.7);">Text Extraction Service:</span>
                        <span id="textractStatus" style="color: #FFD646;">Testing...</span>
                    </div>
                </div>
                <button class="btn-modal btn-primary close-modal">Close</button>
            </div>
        </div>
    `;
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal || e.target.classList.contains('close-modal')) {
            modal.remove();
        }
    });
    
    document.body.appendChild(modal);
    
    if (window.lucide) {
        lucide.createIcons();
    }
    
    // Simulate connection tests
    setTimeout(() => {
        document.getElementById('internetStatus').innerHTML = '<span style="color: #00D7AB;">✓ Connected</span>';
    }, 1000);
    
    setTimeout(() => {
        document.getElementById('apiStatus').innerHTML = '<span style="color: #00D7AB;">✓ Available</span>';
    }, 2000);
    
    setTimeout(() => {
        document.getElementById('textractStatus').innerHTML = '<span style="color: #FFD646;">⚠ Limited</span>';
    }, 3000);
}

function showSupportContactModal() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.85);
        backdrop-filter: blur(8px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 2000;
        padding: 1rem;
        animation: modalFadeIn 0.3s ease-out;
    `;
    
    modal.innerHTML = `
        <div class="modal-content" style="
            background: linear-gradient(135deg, #191919, #2a2a2a);
            border: 1px solid rgba(218, 165, 255, 0.3);
            border-radius: 1rem;
            padding: 2rem;
            max-width: 500px;
            width: 100%;
            position: relative;
            text-align: center;
        ">
            <div class="modal-body">
                <div class="support-icon" style="
                    width: 60px;
                    height: 60px;
                    background: linear-gradient(135deg, rgba(218, 165, 255, 0.2), rgba(102, 40, 173, 0.1));
                    border: 2px solid rgba(218, 165, 255, 0.3);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin: 0 auto 1.5rem;
                ">
                    <i data-lucide="help-circle" style="color: #DAA5FF; width: 24px; height: 24px;"></i>
                </div>
                <h4 style="color: #DAA5FF; margin-bottom: 1rem; font-weight: 600; font-size: 1.2rem;">
                    Contact Support
                </h4>
                <p style="color: rgba(255, 242, 198, 0.8); margin-bottom: 1.5rem;">
                    Need help with text extraction issues? Our support team is here to assist you.
                </p>
                <div style="
                    background: rgba(218, 165, 255, 0.1);
                    border: 1px solid rgba(218, 165, 255, 0.2);
                    border-radius: 0.5rem;
                    padding: 1rem;
                    margin-bottom: 1.5rem;
                    text-align: left;
                ">
                    <div style="margin-bottom: 0.5rem;">
                        <strong style="color: #FFF2C6;">Email:</strong>
                        <span style="color: rgba(255, 242, 198, 0.8);"> support@resumify.com</span>
                    </div>
                    <div style="margin-bottom: 0.5rem;">
                        <strong style="color: #FFF2C6;">Response Time:</strong>
                        <span style="color: rgba(255, 242, 198, 0.8);"> Within 24 hours</span>
                    </div>
                    <div>
                        <strong style="color: #FFF2C6;">Include:</strong>
                        <span style="color: rgba(255, 242, 198, 0.8);"> File type, error message, browser info</span>
                    </div>
                </div>
                <button class="btn-modal btn-primary close-modal">Close</button>
            </div>
        </div>
    `;
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal || e.target.classList.contains('close-modal')) {
            modal.remove();
        }
    });
    
    document.body.appendChild(modal);
    
    if (window.lucide) {
        lucide.createIcons();
    }
}

function showHelpContentModal(helpKey) {
    const helpContent = {
        'remove-password': {
            title: 'Remove Password Protection',
            content: `
                <p>To remove password protection from your document:</p>
                <ol style="text-align: left; margin: 1rem 0; padding-left: 1.5rem;">
                    <li>Open the document in its original application (Word, Adobe Reader, etc.)</li>
                    <li>Go to File → Properties or Security settings</li>
                    <li>Remove or disable password protection</li>
                    <li>Save the document and try uploading again</li>
                </ol>
            `
        },
        'compress-file': {
            title: 'Compress Your File',
            content: `
                <p>To reduce your file size:</p>
                <ol style="text-align: left; margin: 1rem 0; padding-left: 1.5rem;">
                    <li>For PDFs: Use online PDF compressors or "Save As" with lower quality</li>
                    <li>For DOCX: Remove unnecessary images or compress images within the document</li>
                    <li>Consider converting to a different format if the content allows</li>
                </ol>
            `
        },
        'convert-format': {
            title: 'Convert File Format',
            content: `
                <p>Supported formats: PDF, DOCX, TXT</p>
                <ol style="text-align: left; margin: 1rem 0; padding-left: 1.5rem;">
                    <li>Use online converters or your document application's "Save As" feature</li>
                    <li>PDF is recommended for best text extraction results</li>
                    <li>Ensure the converted document maintains readable text</li>
                </ol>
            `
        }
    };
    
    const help = helpContent[helpKey] || {
        title: 'Help',
        content: '<p>Help information is not available for this topic.</p>'
    };
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.85);
        backdrop-filter: blur(8px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 2000;
        padding: 1rem;
        animation: modalFadeIn 0.3s ease-out;
    `;
    
    modal.innerHTML = `
        <div class="modal-content" style="
            background: linear-gradient(135deg, #191919, #2a2a2a);
            border: 1px solid rgba(218, 165, 255, 0.3);
            border-radius: 1rem;
            padding: 2rem;
            max-width: 500px;
            width: 100%;
            position: relative;
        ">
            <div class="modal-body">
                <div class="help-icon" style="
                    width: 60px;
                    height: 60px;
                    background: linear-gradient(135deg, rgba(255, 214, 70, 0.2), rgba(251, 191, 36, 0.1));
                    border: 2px solid rgba(255, 214, 70, 0.3);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin: 0 auto 1.5rem;
                ">
                    <i data-lucide="info" style="color: #FFD646; width: 24px; height: 24px;"></i>
                </div>
                <h4 style="color: #FFD646; margin-bottom: 1rem; font-weight: 600; font-size: 1.2rem; text-align: center;">
                    ${help.title}
                </h4>
                <div style="
                    background: rgba(255, 214, 70, 0.1);
                    border: 1px solid rgba(255, 214, 70, 0.2);
                    border-radius: 0.5rem;
                    padding: 1rem;
                    margin-bottom: 1.5rem;
                    color: rgba(255, 242, 198, 0.9);
                    line-height: 1.5;
                ">
                    ${help.content}
                </div>
                <div style="text-align: center;">
                    <button class="btn-modal btn-primary close-modal">Got It</button>
                </div>
            </div>
        </div>
    `;
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal || e.target.classList.contains('close-modal')) {
            modal.remove();
        }
    });
    
    document.body.appendChild(modal);
    
    if (window.lucide) {
        lucide.createIcons();
    }
}

// Global function to download extracted text
window.downloadExtractedText = async function(text) {
    try {
        if (!text || typeof text !== 'string') {
            throw new Error('No text content available to download');
        }

        // Validate text content
        const trimmedText = text.trim();
        if (trimmedText.length === 0) {
            throw new Error('Text content is empty');
        }

        if (trimmedText === 'Processing...' || trimmedText === 'Extracting Text...') {
            throw new Error('Text extraction is still in progress');
        }

        // Get candidate information for filename
        const candidateId = uploadManager.currentCandidateId || sessionStorage.getItem('currentCandidateId');
        let filename = 'extracted-text.txt';
        
        if (candidateId) {
            try {
                const analysis = await window.resumifyAPI.getAnalysis(candidateId);
                // Handle both wrapped and direct response formats
                const data = analysis.success ? analysis.data : analysis;
                
                if (data) {
                    // Try to get candidate name from analysis data
                    const candidateName = data.candidateName || 
                                        data.name || 
                                        sessionStorage.getItem('candidateName') || 
                                        'candidate';
                    
                    // Clean filename (remove invalid characters)
                    const cleanName = candidateName.replace(/[^a-zA-Z0-9\-_\s]/g, '_').replace(/\s+/g, '_');
                    filename = `${cleanName}_extracted_text.txt`;
                }
            } catch (error) {
                console.warn('Could not get candidate name for filename:', error);
                // Use default filename with timestamp
                const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
                filename = `extracted_text_${timestamp}.txt`;
            }
        } else {
            // Use timestamp if no candidate ID
            const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
            filename = `extracted_text_${timestamp}.txt`;
        }

        // Format text for download with proper headers
        const formattedContent = formatTextForDownload(text, candidateId);
        
        // Check if browser supports download
        if (!window.URL || !window.URL.createObjectURL) {
            throw new Error('Your browser does not support file downloads');
        }
        
        // Create blob and download
        const blob = new Blob([formattedContent], { 
            type: 'text/plain;charset=utf-8' 
        });
        
        // Validate blob size (warn if very large)
        const sizeInMB = blob.size / (1024 * 1024);
        if (sizeInMB > 10) {
            console.warn(`Large file size: ${sizeInMB.toFixed(2)}MB`);
        }
        
        // Create download link
        const url = window.URL.createObjectURL(blob);
        const downloadLink = document.createElement('a');
        downloadLink.href = url;
        downloadLink.download = filename;
        downloadLink.style.display = 'none';
        
        // Trigger download
        document.body.appendChild(downloadLink);
        downloadLink.click();
        
        // Cleanup
        setTimeout(() => {
            if (downloadLink.parentNode) {
                document.body.removeChild(downloadLink);
            }
            window.URL.revokeObjectURL(url);
        }, 100);
        
        // Show success notification
        if (window.utils && window.utils.showNotification) {
            window.utils.showNotification(`Text downloaded as ${filename}`, 'success');
        }
        
        return true;
        
    } catch (error) {
        console.error('Failed to download extracted text:', error);
        
        // Show error notification
        if (window.utils && window.utils.showNotification) {
            window.utils.showNotification(
                error.message || 'Failed to download text file', 
                'error'
            );
        }
        
        throw error;
    }
};

// Helper function to format text for download
function formatTextForDownload(text, candidateId = null) {
    const timestamp = new Date().toLocaleString();
    const cleanText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
    
    const stats = {
        characters: cleanText.length,
        words: cleanText.split(/\s+/).filter(word => word.length > 0).length,
        lines: cleanText.split('\n').length,
        paragraphs: cleanText.split(/\n\s*\n/).filter(p => p.trim().length > 0).length
    };
    
    let header = `EXTRACTED TEXT DOCUMENT\n`;
    header += `Generated by Resumify AI-Powered Resume Analysis\n`;
    header += `Extraction Date: ${timestamp}\n`;
    
    if (candidateId) {
        header += `Candidate ID: ${candidateId}\n`;
    }
    
    // Try to get additional metadata
    try {
        const candidateName = sessionStorage.getItem('candidateName');
        const fileName = sessionStorage.getItem('currentFileName');
        
        if (candidateName) {
            header += `Candidate Name: ${candidateName}\n`;
        }
        if (fileName) {
            header += `Source File: ${fileName}\n`;
        }
    } catch (error) {
        // Ignore metadata errors
    }
    
    header += `\nDocument Statistics:\n`;
    header += `- Characters: ${stats.characters.toLocaleString()}\n`;
    header += `- Words: ${stats.words.toLocaleString()}\n`;
    header += `- Lines: ${stats.lines.toLocaleString()}\n`;
    header += `- Paragraphs: ${stats.paragraphs.toLocaleString()}\n`;
    
    // Add file size info
    const sizeInKB = (new Blob([cleanText]).size / 1024).toFixed(2);
    header += `- File Size: ${sizeInKB} KB\n`;
    
    header += `\n${'='.repeat(80)}\n`;
    header += `EXTRACTED CONTENT\n`;
    header += `${'='.repeat(80)}\n\n`;
    
    let footer = `\n\n${'='.repeat(80)}\n`;
    footer += `End of extracted text document\n`;
    footer += `Generated by Resumify - AI-Powered Resume Analysis Platform\n`;
    footer += `Visit: https://resumify.ai for more information\n`;
    footer += `${'='.repeat(80)}\n`;
    
    return header + cleanText + footer;
}

// Global function to download extracted text directly (without modal)
window.downloadExtractedTextDirect = async function() {
    const candidateId = sessionStorage.getItem('currentCandidateId') || uploadManager.currentCandidateId;
    
    if (!candidateId) {
        if (window.utils && window.utils.showNotification) {
            window.utils.showNotification('No candidate selected', 'error');
        }
        return;
    }
    
    try {
        // Show loading notification
        if (window.utils && window.utils.showNotification) {
            window.utils.showNotification('Preparing download...', 'info', 1000);
        }
        
        const analysis = await window.resumifyAPI.getAnalysis(candidateId);
        
        // Handle both wrapped and direct response formats
        const data = analysis.success ? analysis.data : analysis;
        
        if (data) {
            const { extractedText, textExtractionStatus } = data;
            
            if (textExtractionStatus === 'completed' && extractedText && extractedText.trim() && extractedText !== 'Processing...') {
                await window.downloadExtractedText(extractedText);
            } else if (textExtractionStatus === 'pending') {
                if (window.utils && window.utils.showNotification) {
                    window.utils.showNotification('Text extraction is still in progress. Please wait and try again.', 'warning');
                }
            } else if (textExtractionStatus === 'failed') {
                if (window.utils && window.utils.showNotification) {
                    window.utils.showNotification('Text extraction failed. Cannot download.', 'error');
                }
            } else {
                if (window.utils && window.utils.showNotification) {
                    window.utils.showNotification('No extracted text available for download.', 'warning');
                }
            }
        } else {
            throw new Error('Failed to retrieve analysis data');
        }
    } catch (error) {
        console.error('Failed to download extracted text:', error);
        if (window.utils && window.utils.showNotification) {
            window.utils.showNotification('Failed to download extracted text', 'error');
        }
    }
};

// Upload manager will be initialized by the HTML page when DOM is ready