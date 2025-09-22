// Resumify API Client

class ResumifyAPI {
    constructor() {
        this.baseURL = window.RESUMIFY_CONFIG?.API_BASE_URL || 'http://localhost:3000';
        this.client = axios.create({
            baseURL: this.baseURL,
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json'
            }
        });

        // Track API health
        this.apiHealthy = true;
        this.lastHealthCheck = null;

        // Add response interceptor for error handling
        this.client.interceptors.response.use(
            response => {
                this.apiHealthy = true;
                return response;
            },
            error => {
                // Track API health based on error types
                if (error.response?.status >= 500) {
                    this.apiHealthy = false;
                    this.lastHealthCheck = Date.now();
                }
                console.error('API Error:', error);
                return Promise.reject(error);
            }
        );
    }

    // Upload resume
    async uploadResume(formData) {
        try {
            // Convert file to base64 for API Gateway
            const file = formData.get('file');
            const name = formData.get('name');
            const email = formData.get('email');

            const base64File = await this.fileToBase64(file);

            const payload = {
                filename: file.name,
                file: base64File,
                name: name,
                email: email
            };

            const response = await this.client.post('/upload', payload);
            return response.data;
        } catch (error) {
            throw new Error(`Upload failed: ${error.message}`);
        }
    }

    // Get analysis results with retry logic
    async getAnalysis(candidateId, retryCount = 0) {
        const maxRetries = 3;
        const baseDelay = 1000; // 1 second

        try {
            // Add timestamp to prevent caching
            const timestamp = new Date().getTime();
            const response = await this.client.get(`/analysis?candidateId=${candidateId}&t=${timestamp}`);
            return response.data;
        } catch (error) {
            const status = error.response?.status;

            // Retry logic for temporary server errors
            if ((status === 502 || status === 503 || status === 504) && retryCount < maxRetries) {
                const delay = baseDelay * Math.pow(2, retryCount); // Exponential backoff
                console.log(`🔄 Retrying API call in ${delay}ms (attempt ${retryCount + 1}/${maxRetries})`);

                await new Promise(resolve => setTimeout(resolve, delay));
                return this.getAnalysis(candidateId, retryCount + 1);
            }

            // Provide more specific error messages for common issues
            if (status === 502) {
                throw new Error('Server temporarily unavailable. Please try again later.');
            } else if (status === 503) {
                throw new Error('Service temporarily unavailable. Please try again.');
            } else if (status === 504) {
                throw new Error('Request timeout. The server is taking too long to respond.');
            } else if (status === 404) {
                throw new Error('Analysis not found. The candidate may still be processing.');
            } else {
                throw new Error(this.getUserFriendlyError(error));
            }
        }
    }

    // Get job matches with retry logic
    async getMatches(candidateId, top = 10, retryCount = 0) {
        const maxRetries = 3;
        const baseDelay = 1000;

        try {
            const response = await this.client.get(`/matches?candidateId=${candidateId}&top=${top}`);
            return response.data;
        } catch (error) {
            const status = error.response?.status;

            if ((status === 502 || status === 503 || status === 504) && retryCount < maxRetries) {
                const delay = baseDelay * Math.pow(2, retryCount);
                console.log(`🔄 Retrying matches API call in ${delay}ms (attempt ${retryCount + 1}/${maxRetries})`);

                await new Promise(resolve => setTimeout(resolve, delay));
                return this.getMatches(candidateId, top, retryCount + 1);
            }

            throw new Error(this.getUserFriendlyError(error));
        }
    }

    // Get all jobs with retry logic
    async getJobs(retryCount = 0) {
        const maxRetries = 3;
        const baseDelay = 1000;

        try {
            const response = await this.client.get('/jobs');
            return response.data;
        } catch (error) {
            const status = error.response?.status;

            if ((status === 502 || status === 503 || status === 504) && retryCount < maxRetries) {
                const delay = baseDelay * Math.pow(2, retryCount);
                console.log(`🔄 Retrying jobs API call in ${delay}ms (attempt ${retryCount + 1}/${maxRetries})`);

                await new Promise(resolve => setTimeout(resolve, delay));
                return this.getJobs(retryCount + 1);
            }

            throw new Error(this.getUserFriendlyError(error));
        }
    }

    // Create new job
    async createJob(jobData) {
        try {
            const response = await this.client.post('/jobs', jobData);
            return response.data;
        } catch (error) {
            throw new Error(`Failed to create job: ${error.message}`);
        }
    }

    // Delete job
    async deleteJob(jobId) {
        try {
            const response = await this.client.delete(`/jobs/${jobId}`);
            return response.data;
        } catch (error) {
            throw new Error(`Failed to delete job: ${error.message}`);
        }
    }

    // Update job
    async updateJob(jobId, jobData) {
        try {
            const response = await this.client.put(`/jobs/${jobId}`, jobData);
            return response.data;
        } catch (error) {
            throw new Error(`Failed to update job: ${error.message}`);
        }
    }

    // Trigger analysis
    async analyzeCandidate(candidateId) {
        try {
            const response = await this.client.post('/analyze', { candidateId });
            return response.data;
        } catch (error) {
            throw new Error(`Failed to analyze candidate: ${error.message}`);
        }
    }

    // Check Textract job status
    async getTextractResult(jobId) {
        try {
            const response = await this.client.get(`/textract-result?jobId=${jobId}`);
            return response.data;
        } catch (error) {
            throw new Error(`Failed to get Textract result: ${error.message}`);
        }
    }

    // Utility: Convert file to base64
    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => {
                // Remove data:mime;base64, prefix
                const base64 = reader.result.split(',')[1];
                resolve(base64);
            };
            reader.onerror = error => reject(error);
        });
    }

    // Utility: Format currency
    formatCurrency(amount) {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    }

    // Generate analysis report
    async generateReport(candidateId, format = 'pdf') {
        try {
            const response = await this.client.post('/generate-report', {
                candidateId,
                format
            });
            return response.data;
        } catch (error) {
            throw new Error(`Failed to generate report: ${error.message}`);
        }
    }

    // Get all candidates with retry logic
    async getCandidates(retryCount = 0) {
        const maxRetries = 3;
        const baseDelay = 1000;

        try {
            const response = await this.client.get('/candidates');
            return response.data;
        } catch (error) {
            const status = error.response?.status;

            if ((status === 502 || status === 503 || status === 504) && retryCount < maxRetries) {
                const delay = baseDelay * Math.pow(2, retryCount);
                console.log(`🔄 Retrying candidates API call in ${delay}ms (attempt ${retryCount + 1}/${maxRetries})`);

                await new Promise(resolve => setTimeout(resolve, delay));
                return this.getCandidates(retryCount + 1);
            }

            throw new Error(this.getUserFriendlyError(error));
        }
    }

    // Utility: Format date
    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    // Check API health
    async checkApiHealth() {
        try {
            const response = await this.client.get('/candidates', { timeout: 5000 });
            this.apiHealthy = true;
            return true;
        } catch (error) {
            this.apiHealthy = false;
            this.lastHealthCheck = Date.now();
            return false;
        }
    }

    // Get user-friendly error message
    getUserFriendlyError(error) {
        const status = error.response?.status;

        if (status === 502) {
            return 'The server is temporarily unavailable. This usually resolves within a few minutes. Please try again shortly.';
        } else if (status === 503) {
            return 'The service is temporarily overloaded. Please wait a moment and try again.';
        } else if (status === 504) {
            return 'The request timed out. The server may be processing a large number of requests.';
        } else if (status >= 500) {
            return 'We\'re experiencing technical difficulties. Our team has been notified and is working to resolve this.';
        } else if (status === 404) {
            return 'The requested data was not found. It may still be processing.';
        } else if (!navigator.onLine) {
            return 'You appear to be offline. Please check your internet connection.';
        } else {
            return 'An unexpected error occurred. Please try again.';
        }
    }
}

// Create global API instance
window.resumifyAPI = new ResumifyAPI();