// Main application initialization and utilities

class ResumifyApp {
    constructor() {
        this.initialized = false;
        this.init();
    }
    
    async init() {
        if (this.initialized) return;
        
        try {
            // Wait for DOM to be ready
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.init());
                return;
            }
            
            // Initialize app components
            this.initializeTheme();
            this.initializeErrorHandling();
            this.initializeUtilities();
            this.checkAPIConnection();
            
            this.initialized = true;
            console.log('Resumify app initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize Resumify app:', error);
            this.showGlobalError('Failed to initialize application');
        }
    }
    
    initializeTheme() {
        // Apply theme from config
        const theme = window.RESUMIFY_CONFIG?.THEME;
        if (theme) {
            const root = document.documentElement;
            
            // Set CSS custom properties
            Object.entries(theme.colors).forEach(([key, value]) => {
                root.style.setProperty(`--${key}`, value);
            });
        }
        
        // Handle theme switching (if implemented)
        this.setupThemeToggle();
    }
    
    setupThemeToggle() {
        // Placeholder for theme toggle functionality
        // Could add dark/light mode toggle here
    }
    
    initializeErrorHandling() {
        // Global error handler
        window.addEventListener('error', (event) => {
            console.error('Global error:', event.error);
            this.logError(event.error);
        });
        
        // Unhandled promise rejection handler
        window.addEventListener('unhandledrejection', (event) => {
            console.error('Unhandled promise rejection:', event.reason);
            this.logError(event.reason);
        });
    }
    
    initializeUtilities() {
        // Add utility functions to window
        window.utils = {
            formatFileSize: this.formatFileSize,
            formatCurrency: this.formatCurrency,
            formatDate: this.formatDate,
            debounce: this.debounce,
            throttle: this.throttle,
            copyToClipboard: this.copyToClipboard,
            showNotification: this.showNotification,
            initializeIcons: this.initializeIcons
        };
    }
    
    initializeIcons() {
        // Reinitialize Lucide icons after dynamic content updates
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }
    
    async checkAPIConnection() {
        try {
            // Test API connection with a simple request
            const response = await fetch(window.RESUMIFY_CONFIG.API_BASE_URL + '/candidates', {
                method: 'GET',
                timeout: 5000
            });
            
            if (response.ok) {
                console.log('API connection successful');
                this.showNotification('Connected to Resumify API', 'success');
            } else {
                throw new Error('API health check failed');
            }
        } catch (error) {
            console.warn('API connection failed:', error);
            this.showNotification('API connection failed - some features may not work', 'warning');
        }
    }
    
    // Utility Functions
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    formatCurrency(amount, currency = 'INR') {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    }
    
    formatDate(dateString, options = {}) {
        const defaultOptions = {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        };
        
        return new Date(dateString).toLocaleDateString('en-IN', {
            ...defaultOptions,
            ...options
        });
    }
    
    debounce(func, wait) {
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
    
    throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
    
    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            this.showNotification('Copied to clipboard', 'success');
            return true;
        } catch (error) {
            console.error('Failed to copy to clipboard:', error);
            this.showNotification('Failed to copy to clipboard', 'error');
            return false;
        }
    }
    
    showNotification(message, type = 'info', duration = 3000) {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 2rem;
            right: 2rem;
            z-index: 9999;
            padding: 1rem 1.5rem;
            border-radius: 0.5rem;
            color: white;
            font-weight: 500;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
            transform: translateX(100%);
            transition: transform 0.3s ease;
            max-width: 400px;
            font-family: 'Montserrat', sans-serif;
        `;
        
        // Set background color based on type
        const colors = {
            success: '#10b981',
            error: '#ef4444',
            warning: '#f59e0b',
            info: '#6366f1'
        };
        
        notification.style.background = colors[type] || colors.info;
        notification.textContent = message;
        
        // Add to DOM
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        // Auto remove
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 300);
        }, duration);
        
        // Click to dismiss
        notification.addEventListener('click', () => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 300);
        });
    }
    
    showGlobalError(message) {
        // Show critical error overlay
        const errorOverlay = document.createElement('div');
        errorOverlay.className = 'error-overlay';
        errorOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.9);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            color: white;
            text-align: center;
            padding: 2rem;
        `;
        
        errorOverlay.innerHTML = `
            <div class="error-content">
                <h2>Application Error</h2>
                <p>${message}</p>
                <button class="btn btn-primary" onclick="location.reload()">
                    Reload Application
                </button>
            </div>
        `;
        
        document.body.appendChild(errorOverlay);
    }
    
    logError(error) {
        // In production, send errors to logging service
        const errorData = {
            message: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href
        };
        
        console.error('Logged error:', errorData);
        
        // Could send to external logging service here
        // this.sendToLoggingService(errorData);
    }
}

// Global utility functions
window.downloadReport = async function() {
    const candidateId = sessionStorage.getItem('currentCandidateId');
    if (!candidateId) {
        window.utils.showNotification('No candidate selected for report generation', 'error');
        return;
    }
    
    let downloadButton = null;
    let originalText = '';
    
    try {
        // Show loading state
        downloadButton = document.querySelector('button[onclick="downloadReport()"]');
        originalText = downloadButton ? downloadButton.textContent : '';
        if (downloadButton) {
            downloadButton.disabled = true;
            downloadButton.textContent = 'Generating Report...';
            downloadButton.style.opacity = '0.7';
        }
        
        // Get analysis data with validation
        const analysisResponse = await window.resumifyAPI.getAnalysis(candidateId);
        if (!analysisResponse.success) {
            throw new Error(analysisResponse.error || 'Failed to retrieve analysis data');
        }
        
        if (!analysisResponse.data) {
            throw new Error('No analysis data found for this candidate');
        }
        
        const analysisData = analysisResponse.data;
        
        // Validate analysis data has minimum required fields
        if (!analysisData.skills && !analysisData.experience && !analysisData.jobTitles) {
            throw new Error('Insufficient analysis data to generate report. Please ensure the resume has been fully analyzed.');
        }
        
        // Get candidate data with fallbacks
        const candidateData = {
            name: analysisData.candidateName || analysisData.name || 'Not specified',
            email: analysisData.candidateEmail || analysisData.email || 'Not specified',
            fileName: analysisData.fileName || 'resume.pdf'
        };
        
        // Update button text to show progress
        if (downloadButton) {
            downloadButton.textContent = 'Creating PDF...';
        }
        
        // Try client-side PDF generation first, fallback to server-side
        try {
            await generatePDFReport(candidateData, analysisData);
            window.utils.showNotification('Report downloaded successfully', 'success');
        } catch (pdfError) {
            console.warn('Client-side PDF generation failed, trying server-side:', pdfError);
            
            // Update button text for server-side generation
            if (downloadButton) {
                downloadButton.textContent = 'Generating on Server...';
            }
            
            // Fallback to server-side report generation
            try {
                const reportResponse = await window.resumifyAPI.generateReport(candidateId, 'pdf');
                if (reportResponse.success && reportResponse.data) {
                    // Download the server-generated PDF
                    downloadBase64PDF(reportResponse.data.reportData, reportResponse.data.filename);
                    window.utils.showNotification('Report downloaded successfully', 'success');
                } else {
                    throw new Error(reportResponse.error || 'Server-side report generation failed');
                }
            } catch (serverError) {
                // If server-side also fails, provide helpful error message
                const errorMessage = serverError.message.includes('404') ? 
                    'Report generation service is not available. Please try again later.' :
                    `Report generation failed: ${serverError.message}`;
                throw new Error(errorMessage);
            }
        }
        
    } catch (error) {
        console.error('Failed to download report:', error);
        
        // Provide user-friendly error messages
        let userMessage = 'Failed to download report';
        if (error.message.includes('No candidate selected')) {
            userMessage = 'Please select a candidate first';
        } else if (error.message.includes('No analysis data')) {
            userMessage = 'No analysis data available. Please upload and analyze a resume first.';
        } else if (error.message.includes('Insufficient analysis data')) {
            userMessage = 'Resume analysis is incomplete. Please wait for analysis to finish or try re-uploading.';
        } else if (error.message.includes('network') || error.message.includes('timeout')) {
            userMessage = 'Network error. Please check your connection and try again.';
        } else {
            userMessage = `Report generation failed: ${error.message}`;
        }
        
        window.utils.showNotification(userMessage, 'error');
    } finally {
        // Restore button state
        if (downloadButton) {
            downloadButton.disabled = false;
            downloadButton.textContent = originalText || 'Download Report';
            downloadButton.style.opacity = '1';
        }
    }
};

// PDF Report Generation Function
async function generatePDFReport(candidateData, analysisData) {
    // Check if jsPDF is available
    if (typeof window.jsPDF === 'undefined') {
        // Load jsPDF dynamically
        await loadJsPDF();
    }
    
    const { jsPDF } = window.jsPDF;
    const doc = new jsPDF();
    
    // Set up document properties
    doc.setProperties({
        title: `Resume Analysis Report - ${candidateData.name}`,
        subject: 'AI-Generated Resume Analysis',
        author: 'Resumify',
        creator: 'Resumify AI Platform'
    });
    
    // Define colors and styles
    const colors = {
        primary: [78, 196, 254], // #4EC4FE
        secondary: [0, 215, 171], // #00D7AB
        accent: [255, 214, 70], // #FFD646
        dark: [31, 41, 55], // #1F2937
        text: [55, 65, 81], // #374151
        light: [249, 250, 251] // #F9FAFB
    };
    
    let yPosition = 20;
    const pageWidth = doc.internal.pageSize.width;
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);
    
    // Header Section
    doc.setFillColor(...colors.primary);
    doc.rect(0, 0, pageWidth, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('Resume Analysis Report', margin, 25);
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated on ${new Date().toLocaleDateString()}`, pageWidth - margin - 60, 32);
    
    yPosition = 60;
    
    // Candidate Information Section
    doc.setTextColor(...colors.dark);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Candidate Information', margin, yPosition);
    
    yPosition += 15;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Name: ${candidateData.name}`, margin, yPosition);
    yPosition += 8;
    doc.text(`Email: ${candidateData.email}`, margin, yPosition);
    yPosition += 8;
    doc.text(`Resume File: ${candidateData.fileName}`, margin, yPosition);
    yPosition += 8;
    doc.text(`Analysis Date: ${new Date(analysisData.createdAt || Date.now()).toLocaleDateString()}`, margin, yPosition);
    
    yPosition += 20;
    
    // Overall Score Section
    if (analysisData.overallScore !== undefined) {
        doc.setFillColor(...colors.light);
        doc.rect(margin, yPosition - 5, contentWidth, 25, 'F');
        
        doc.setTextColor(...colors.dark);
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('Overall Score', margin + 5, yPosition + 5);
        
        const score = Math.round(analysisData.overallScore);
        const scoreColor = score >= 80 ? colors.secondary : score >= 60 ? colors.accent : [242, 78, 50];
        doc.setTextColor(...scoreColor);
        doc.setFontSize(20);
        doc.text(`${score}/100`, pageWidth - margin - 30, yPosition + 8);
        
        yPosition += 35;
    }
    
    // Skills Section
    if (analysisData.skills && analysisData.skills.length > 0) {
        if (yPosition > 250) {
            doc.addPage();
            yPosition = 20;
        }
        
        doc.setTextColor(...colors.dark);
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('Skills Identified', margin, yPosition);
        
        yPosition += 12;
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        
        // Filter out empty or invalid skills
        const validSkills = analysisData.skills.filter(skill => 
            skill && typeof skill === 'string' && skill.trim().length > 0
        );
        
        if (validSkills.length > 0) {
            const skillsText = validSkills.join(', ');
            const skillsLines = doc.splitTextToSize(skillsText, contentWidth);
            
            skillsLines.forEach(line => {
                if (yPosition > 270) { // Check if we need a new page
                    doc.addPage();
                    yPosition = 20;
                }
                doc.text(line, margin, yPosition);
                yPosition += 6;
            });
        } else {
            doc.text('No specific skills identified', margin, yPosition);
            yPosition += 6;
        }
        
        yPosition += 10;
    }
    
    // Experience Section
    if (analysisData.experience) {
        doc.setTextColor(...colors.dark);
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('Experience Analysis', margin, yPosition);
        
        yPosition += 12;
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        
        if (analysisData.experience.totalYears !== undefined) {
            doc.text(`Total Experience: ${analysisData.experience.totalYears} years`, margin, yPosition);
            yPosition += 8;
        }
        
        if (analysisData.experience.rawText) {
            doc.text('Experience Details:', margin, yPosition);
            yPosition += 8;
            
            doc.setFontSize(11);
            const expLines = doc.splitTextToSize(analysisData.experience.rawText, contentWidth);
            expLines.forEach(line => {
                if (yPosition > 270) {
                    doc.addPage();
                    yPosition = 20;
                }
                doc.text(line, margin + 5, yPosition);
                yPosition += 6;
            });
        }
        
        yPosition += 10;
    }
    
    // Job Titles Section
    if (analysisData.jobTitles && analysisData.jobTitles.length > 0) {
        if (yPosition > 250) {
            doc.addPage();
            yPosition = 20;
        }
        
        doc.setTextColor(...colors.dark);
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('Job Titles', margin, yPosition);
        
        yPosition += 12;
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        
        analysisData.jobTitles.forEach(title => {
            if (yPosition > 270) {
                doc.addPage();
                yPosition = 20;
            }
            doc.text(`• ${title}`, margin, yPosition);
            yPosition += 8;
        });
        
        yPosition += 10;
    }
    
    // Education Section
    if (analysisData.education && analysisData.education.length > 0) {
        if (yPosition > 250) {
            doc.addPage();
            yPosition = 20;
        }
        
        doc.setTextColor(...colors.dark);
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('Education', margin, yPosition);
        
        yPosition += 12;
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        
        analysisData.education.forEach(edu => {
            if (yPosition > 270) {
                doc.addPage();
                yPosition = 20;
            }
            const eduText = typeof edu === 'string' ? edu : `${edu.degree || ''} ${edu.field || ''} - ${edu.institution || ''}`.trim();
            doc.text(`• ${eduText}`, margin, yPosition);
            yPosition += 8;
        });
        
        yPosition += 10;
    }
    
    // Projects Section
    if (analysisData.projects && analysisData.projects.length > 0) {
        if (yPosition > 250) {
            doc.addPage();
            yPosition = 20;
        }
        
        doc.setTextColor(...colors.dark);
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('Projects', margin, yPosition);
        
        yPosition += 12;
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        
        analysisData.projects.forEach(project => {
            if (yPosition > 270) {
                doc.addPage();
                yPosition = 20;
            }
            const projectText = typeof project === 'string' ? project : project.name || project.title || 'Unnamed Project';
            doc.text(`• ${projectText}`, margin, yPosition);
            yPosition += 8;
        });
        
        yPosition += 10;
    }
    
    // Processing Metrics Section (if available)
    if (analysisData.processingMetrics) {
        if (yPosition > 230) {
            doc.addPage();
            yPosition = 20;
        }
        
        doc.setFillColor(...colors.light);
        doc.rect(margin, yPosition - 5, contentWidth, 35, 'F');
        
        doc.setTextColor(...colors.dark);
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('Processing Metrics', margin + 5, yPosition + 5);
        
        yPosition += 15;
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        
        if (analysisData.processingMetrics.extractionTime) {
            doc.text(`Text Extraction Time: ${analysisData.processingMetrics.extractionTime}ms`, margin + 5, yPosition);
            yPosition += 6;
        }
        if (analysisData.processingMetrics.analysisTime) {
            doc.text(`Analysis Time: ${analysisData.processingMetrics.analysisTime}ms`, margin + 5, yPosition);
            yPosition += 6;
        }
        if (analysisData.processingMetrics.totalTime) {
            doc.text(`Total Processing Time: ${analysisData.processingMetrics.totalTime}ms`, margin + 5, yPosition);
        }
        
        yPosition += 20;
    }
    
    // Footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setTextColor(128, 128, 128);
        doc.setFontSize(10);
        doc.text(`Generated by Resumify AI Platform - Page ${i} of ${pageCount}`, margin, doc.internal.pageSize.height - 10);
    }
    
    // Generate filename
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `Resumify_Analysis_${candidateData.name.replace(/[^a-zA-Z0-9]/g, '_')}_${timestamp}.pdf`;
    
    // Download the PDF
    doc.save(filename);
}

// Function to dynamically load jsPDF
async function loadJsPDF() {
    return new Promise((resolve, reject) => {
        if (typeof window.jsPDF !== 'undefined') {
            resolve();
            return;
        }
        
        // Check if script is already being loaded
        const existingScript = document.querySelector('script[src*="jspdf"]');
        if (existingScript) {
            // Wait for existing script to load
            existingScript.onload = () => {
                if (typeof window.jsPDF !== 'undefined') {
                    resolve();
                } else {
                    reject(new Error('jsPDF library failed to initialize'));
                }
            };
            existingScript.onerror = () => reject(new Error('Failed to load jsPDF library'));
            return;
        }
        
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
        script.async = true;
        script.onload = () => {
            // Give it a moment to initialize
            setTimeout(() => {
                if (typeof window.jsPDF !== 'undefined') {
                    resolve();
                } else {
                    reject(new Error('jsPDF library failed to initialize'));
                }
            }, 100);
        };
        script.onerror = () => reject(new Error('Failed to load jsPDF library from CDN'));
        document.head.appendChild(script);
        
        // Timeout after 10 seconds
        setTimeout(() => {
            reject(new Error('jsPDF library loading timed out'));
        }, 10000);
    });
}

// Function to download base64 PDF data
function downloadBase64PDF(base64Data, filename) {
    try {
        // Convert base64 to blob
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'application/pdf' });
        
        // Create download link
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename || 'report.pdf';
        
        // Trigger download
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up
        window.URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Error downloading PDF:', error);
        throw new Error('Failed to download PDF file');
    }
}

window.showAddJobModal = function() {
    // Create job creation modal
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 2000;
        padding: 2rem;
    `;
    
    modal.innerHTML = `
        <div class="modal-content" style="
            background: var(--surface);
            border: 1px solid var(--border);
            border-radius: 1rem;
            padding: 2rem;
            max-width: 600px;
            width: 100%;
            backdrop-filter: blur(12px);
        ">
            <div class="modal-header" style="
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 1.5rem;
            ">
                <h3>Add New Job</h3>
                <button class="close-modal" style="
                    background: none;
                    border: none;
                    color: var(--text);
                    font-size: 1.5rem;
                    cursor: pointer;
                ">✕</button>
            </div>
            
            <form id="addJobForm" class="job-form">
                <div class="form-group">
                    <label for="jobTitle">Job Title</label>
                    <input type="text" id="jobTitle" name="title" required>
                </div>
                
                <div class="form-group">
                    <label for="jobCompany">Company</label>
                    <input type="text" id="jobCompany" name="company" required>
                </div>
                
                <div class="form-group">
                    <label for="jobDescription">Description</label>
                    <textarea id="jobDescription" name="description" rows="4" required></textarea>
                </div>
                
                <div class="form-group">
                    <label for="jobSkills">Required Skills (comma-separated)</label>
                    <input type="text" id="jobSkills" name="skills" placeholder="Python, AWS, React">
                </div>
                
                <div class="form-group">
                    <label for="jobSalary">Average Salary (INR)</label>
                    <input type="number" id="jobSalary" name="avgSalaryINR" min="0">
                </div>
                
                <div class="modal-actions" style="
                    margin-top: 1.5rem;
                    display: flex;
                    gap: 1rem;
                    justify-content: flex-end;
                ">
                    <button type="button" class="btn btn-secondary close-modal">Cancel</button>
                    <button type="submit" class="btn btn-primary">Add Job</button>
                </div>
            </form>
        </div>
    `;
    
    // Add event listeners
    modal.addEventListener('click', (e) => {
        if (e.target === modal || e.target.classList.contains('close-modal')) {
            modal.remove();
        }
    });
    
    modal.querySelector('#addJobForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const jobData = {
            title: formData.get('title'),
            company: formData.get('company'),
            description: formData.get('description'),
            skills: formData.get('skills').split(',').map(s => s.trim()).filter(s => s),
            avgSalaryINR: parseInt(formData.get('avgSalaryINR')) || 0
        };
        
        try {
            const response = await window.resumifyAPI.createJob(jobData);
            
            if (response.success) {
                window.utils.showNotification('Job added successfully', 'success');
                modal.remove();
                
                // Reload jobs section if currently active
                if (window.navigationManager.currentSection === 'jobs') {
                    window.navigationManager.loadJobs();
                }
            } else {
                throw new Error(response.error || 'Failed to add job');
            }
        } catch (error) {
            console.error('Failed to add job:', error);
            window.utils.showNotification('Failed to add job', 'error');
        }
    });
    
    document.body.appendChild(modal);
};

// Initialize the application
const resumifyApp = new ResumifyApp();