// Page-specific functionality for Resumify

class PageManager {
    constructor() {
        this.currentCandidateId = null;
        this.currentJobId = null;
        this.matchThreshold = 70;
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.initializeSliders();
    }
    
    setupEventListeners() {
        // Search and filter functionality
        this.setupSearchFilters();
        
        // Match threshold slider
        this.setupMatchThreshold();
        
        // Modal functionality
        this.setupModals();
    }
    
    setupSearchFilters() {
        // Candidate search
        const candidateSearch = document.getElementById('candidateSearch');
        if (candidateSearch) {
            candidateSearch.addEventListener('input', (e) => {
                this.filterCandidates(e.target.value);
            });
        }
        
        // Job search
        const jobSearch = document.getElementById('jobSearch');
        if (jobSearch) {
            jobSearch.addEventListener('input', (e) => {
                this.filterJobs(e.target.value);
            });
        }
        
        // Filter dropdowns
        const filters = ['skillFilter', 'experienceFilter', 'jobTypeFilter', 'locationFilter'];
        filters.forEach(filterId => {
            const filter = document.getElementById(filterId);
            if (filter) {
                filter.addEventListener('change', () => {
                    this.applyFilters();
                });
            }
        });
    }
    
    setupMatchThreshold() {
        const slider = document.getElementById('matchThreshold');
        const valueDisplay = document.getElementById('thresholdValue');
        
        if (slider && valueDisplay) {
            slider.addEventListener('input', (e) => {
                this.matchThreshold = parseInt(e.target.value);
                valueDisplay.textContent = `${this.matchThreshold}%`;
                this.updateMatchDisplay();
            });
        }
    }
    
    setupModals() {
        // Add job modal functionality would go here
        // For now, we'll just log the action
    }
    
    initializeSliders() {
        // Initialize any range sliders with proper styling
        const sliders = document.querySelectorAll('input[type="range"]');
        sliders.forEach(slider => {
            this.updateSliderBackground(slider);
            slider.addEventListener('input', () => {
                this.updateSliderBackground(slider);
            });
        });
    }
    
    updateSliderBackground(slider) {
        const value = ((slider.value - slider.min) / (slider.max - slider.min)) * 100;
        slider.style.background = `linear-gradient(to right, #4EC4FE 0%, #00D7AB ${value}%, rgba(218, 165, 255, 0.2) ${value}%, rgba(218, 165, 255, 0.2) 100%)`;
    }
    
    // Candidate management
    async loadCandidates() {
        const candidatesList = document.getElementById('candidatesList');
        if (!candidatesList) return;
        
        try {
            candidatesList.innerHTML = this.getLoadingHTML('Loading candidates...');
            
            // In a real app, this would be an API call
            const candidates = await this.fetchCandidates();
            
            if (candidates && candidates.length > 0) {
                candidatesList.innerHTML = candidates.map(candidate => 
                    this.renderCandidateCard(candidate)
                ).join('');
            } else {
                candidatesList.innerHTML = this.getEmptyStateHTML(
                    'No candidates found',
                    'Upload some resumes to see candidates here.',
                    '/upload',
                    'Upload Resume'
                );
            }
            
            this.animateCards();
        } catch (error) {
            console.error('Failed to load candidates:', error);
            candidatesList.innerHTML = this.getErrorStateHTML('Failed to load candidates');
        }
    }
    
    async fetchCandidates() {
        // Mock data for demonstration
        return [
            {
                id: 'cand_001',
                name: 'John Doe',
                email: 'john.doe@example.com',
                skills: ['JavaScript', 'React', 'Node.js', 'AWS'],
                experience: '3-5 years',
                experienceLevel: 'mid',
                status: 'active',
                uploadDate: '2024-01-15',
                matchScore: 85
            },
            {
                id: 'cand_002',
                name: 'Jane Smith',
                email: 'jane.smith@example.com',
                skills: ['Python', 'Django', 'PostgreSQL', 'Docker'],
                experience: '5+ years',
                experienceLevel: 'senior',
                status: 'active',
                uploadDate: '2024-01-14',
                matchScore: 92
            },
            {
                id: 'cand_003',
                name: 'Mike Johnson',
                email: 'mike.johnson@example.com',
                skills: ['Java', 'Spring Boot', 'MySQL', 'Kubernetes'],
                experience: '2-3 years',
                experienceLevel: 'junior',
                status: 'pending',
                uploadDate: '2024-01-13',
                matchScore: 78
            }
        ];
    }
    
    renderCandidateCard(candidate) {
        return `
            <div class="gradient-border candidate-card fade-in-up">
                <div class="gradient-border-inner p-6">
                    <div class="card-header">
                        <div>
                            <h3 class="card-title">${candidate.name}</h3>
                            <p class="text-cream/60 text-sm font-montserrat">${candidate.email}</p>
                        </div>
                        <span class="status-indicator ${candidate.status}">
                            <i data-lucide="${this.getStatusIcon(candidate.status)}" class="w-3 h-3"></i>
                            ${candidate.status}
                        </span>
                    </div>
                    
                    <div class="card-content">
                        <div class="mb-4">
                            <div class="experience-level ${candidate.experienceLevel}">
                                <i data-lucide="briefcase" class="w-4 h-4"></i>
                                ${candidate.experience}
                            </div>
                        </div>
                        
                        <div class="skills-container">
                            ${candidate.skills.map(skill => `
                                <span class="skill-tag technical">${skill}</span>
                            `).join('')}
                        </div>
                        
                        <div class="flex justify-between items-center mt-4 pt-4 border-t border-cream/10">
                            <span class="text-cream/60 text-sm font-montserrat">
                                Uploaded: ${this.formatDate(candidate.uploadDate)}
                            </span>
                            <div class="flex gap-2">
                                <button onclick="pageManager.viewCandidate('${candidate.id}')" 
                                        class="px-3 py-1 text-sm bg-blue/20 text-blue rounded-lg hover:bg-blue/30 transition-colors font-montserrat">
                                    View
                                </button>
                                <button onclick="pageManager.analyzeCandidate('${candidate.id}')" 
                                        class="px-3 py-1 text-sm bg-mint/20 text-mint rounded-lg hover:bg-mint/30 transition-colors font-montserrat">
                                    Analyze
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    // Job management
    async loadJobs() {
        const jobsList = document.getElementById('jobsList');
        if (!jobsList) return;
        
        try {
            jobsList.innerHTML = this.getLoadingHTML('Loading jobs...');
            
            const jobs = await this.fetchJobs();
            
            if (jobs && jobs.length > 0) {
                jobsList.innerHTML = jobs.map(job => 
                    this.renderJobCard(job)
                ).join('');
            } else {
                jobsList.innerHTML = this.getEmptyStateHTML(
                    'No jobs posted yet',
                    'Add some job postings to start matching candidates.',
                    '#',
                    'Add Job',
                    'showAddJobModal()'
                );
            }
            
            this.animateCards();
        } catch (error) {
            console.error('Failed to load jobs:', error);
            jobsList.innerHTML = this.getErrorStateHTML('Failed to load jobs');
        }
    }
    
    async fetchJobs() {
        // Mock data for demonstration
        return [
            {
                id: 'job_001',
                title: 'Senior Full Stack Developer',
                company: 'TechCorp Inc.',
                location: 'Remote',
                jobType: 'full-time',
                experienceLevel: 'Senior',
                salary: { min: 1200000, max: 1800000 },
                skills: ['JavaScript', 'React', 'Node.js', 'AWS', 'MongoDB'],
                description: 'Looking for an experienced full stack developer...',
                postedDate: '2024-01-10',
                status: 'active'
            },
            {
                id: 'job_002',
                title: 'Python Backend Developer',
                company: 'DataFlow Solutions',
                location: 'Bangalore',
                jobType: 'full-time',
                experienceLevel: 'Mid-level',
                salary: { min: 800000, max: 1200000 },
                skills: ['Python', 'Django', 'PostgreSQL', 'Redis', 'Docker'],
                description: 'Join our backend team to build scalable APIs...',
                postedDate: '2024-01-08',
                status: 'active'
            },
            {
                id: 'job_003',
                title: 'Junior Java Developer',
                company: 'Enterprise Systems',
                location: 'Mumbai',
                jobType: 'full-time',
                experienceLevel: 'Junior',
                salary: { min: 500000, max: 800000 },
                skills: ['Java', 'Spring Boot', 'MySQL', 'Git'],
                description: 'Great opportunity for fresh graduates...',
                postedDate: '2024-01-05',
                status: 'active'
            }
        ];
    }
    
    renderJobCard(job) {
        return `
            <div class="gradient-border job-card fade-in-up">
                <div class="gradient-border-inner p-6">
                    <div class="card-header">
                        <div>
                            <h3 class="card-title">${job.title}</h3>
                            <div class="company-info">
                                <div class="company-logo">
                                    ${job.company.charAt(0)}
                                </div>
                                <span class="text-cream/80 font-montserrat">${job.company}</span>
                            </div>
                        </div>
                        <span class="status-indicator ${job.status}">
                            <i data-lucide="${this.getStatusIcon(job.status)}" class="w-3 h-3"></i>
                            ${job.status}
                        </span>
                    </div>
                    
                    <div class="card-content">
                        <div class="grid grid-cols-2 gap-4 mb-4">
                            <div>
                                <p class="text-cream/60 text-sm font-montserrat">Location</p>
                                <p class="text-cream font-montserrat">${job.location}</p>
                            </div>
                            <div>
                                <p class="text-cream/60 text-sm font-montserrat">Type</p>
                                <p class="text-cream font-montserrat">${job.jobType}</p>
                            </div>
                        </div>
                        
                        <div class="mb-4">
                            <p class="text-cream/60 text-sm font-montserrat">Salary Range</p>
                            <p class="salary-range">${this.formatSalary(job.salary.min)} - ${this.formatSalary(job.salary.max)}</p>
                        </div>
                        
                        <div class="skills-container">
                            ${job.skills.map(skill => `
                                <span class="skill-tag technical">${skill}</span>
                            `).join('')}
                        </div>
                        
                        <div class="flex justify-between items-center mt-4 pt-4 border-t border-cream/10">
                            <span class="text-cream/60 text-sm font-montserrat">
                                Posted: ${this.formatDate(job.postedDate)}
                            </span>
                            <div class="flex gap-2">
                                <button onclick="pageManager.viewJob('${job.id}')" 
                                        class="px-3 py-1 text-sm bg-purple-light/20 text-purple-light rounded-lg hover:bg-purple-light/30 transition-colors font-montserrat">
                                    View
                                </button>
                                <button onclick="pageManager.findMatches('${job.id}')" 
                                        class="px-3 py-1 text-sm bg-yellow/20 text-yellow rounded-lg hover:bg-yellow/30 transition-colors font-montserrat">
                                    Find Matches
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    // Match management
    async loadMatches(candidateId = null) {
        const matchesList = document.getElementById('matchesList');
        if (!matchesList) return;
        
        const targetCandidateId = candidateId || sessionStorage.getItem('currentCandidateId');
        
        if (!targetCandidateId) {
            matchesList.innerHTML = this.getEmptyStateHTML(
                'No candidate selected',
                'Upload and analyze a resume first to see job matches.',
                '/upload',
                'Upload Resume'
            );
            return;
        }
        
        try {
            matchesList.innerHTML = this.getLoadingHTML('Finding job matches...');
            
            const matches = await this.fetchMatches(targetCandidateId);
            
            if (matches && matches.length > 0) {
                const filteredMatches = matches.filter(match => match.matchPercent >= this.matchThreshold);
                
                if (filteredMatches.length > 0) {
                    matchesList.innerHTML = filteredMatches.map(match => 
                        this.renderMatchCard(match)
                    ).join('');
                } else {
                    matchesList.innerHTML = this.getEmptyStateHTML(
                        'No matches above threshold',
                        `No jobs found with match score above ${this.matchThreshold}%. Try lowering the threshold.`,
                        '#',
                        'Lower Threshold',
                        'pageManager.lowerThreshold()'
                    );
                }
            } else {
                matchesList.innerHTML = this.getEmptyStateHTML(
                    'No matches found',
                    'No suitable job matches found for this candidate.',
                    '/jobs',
                    'View Jobs'
                );
            }
            
            this.animateCards();
        } catch (error) {
            console.error('Failed to load matches:', error);
            matchesList.innerHTML = this.getErrorStateHTML('Failed to load matches');
        }
    }
    
    async fetchMatches(candidateId) {
        // Mock data for demonstration
        return [
            {
                id: 'match_001',
                jobId: 'job_001',
                title: 'Senior Full Stack Developer',
                company: 'TechCorp Inc.',
                location: 'Remote',
                jobType: 'Full-time',
                matchPercent: 92,
                avgSalaryINR: 1500000,
                matchedSkills: ['JavaScript', 'React', 'Node.js', 'AWS'],
                missingSkills: ['MongoDB'],
                matchReasons: [
                    'Strong match in JavaScript and React experience',
                    'AWS cloud experience aligns well',
                    'Node.js backend skills are relevant'
                ]
            },
            {
                id: 'match_002',
                jobId: 'job_002',
                title: 'Python Backend Developer',
                company: 'DataFlow Solutions',
                location: 'Bangalore',
                jobType: 'Full-time',
                matchPercent: 78,
                avgSalaryINR: 1000000,
                matchedSkills: ['Python', 'Docker'],
                missingSkills: ['Django', 'PostgreSQL', 'Redis'],
                matchReasons: [
                    'Python programming experience',
                    'Docker containerization knowledge'
                ]
            },
            {
                id: 'match_003',
                jobId: 'job_003',
                title: 'Junior Java Developer',
                company: 'Enterprise Systems',
                location: 'Mumbai',
                jobType: 'Full-time',
                matchPercent: 65,
                avgSalaryINR: 650000,
                matchedSkills: ['Git'],
                missingSkills: ['Java', 'Spring Boot', 'MySQL'],
                matchReasons: [
                    'Version control experience with Git'
                ]
            }
        ];
    }
    
    renderMatchCard(match) {
        return `
            <div class="gradient-border match-card fade-in-up" style="--percentage: ${match.matchPercent}">
                <div class="gradient-border-inner p-6">
                    <div class="match-score">
                        <span class="match-percentage">${match.matchPercent}%</span>
                    </div>
                    
                    <div class="card-header">
                        <div>
                            <h3 class="card-title">${match.title}</h3>
                            <div class="company-info">
                                <div class="company-logo">
                                    ${match.company.charAt(0)}
                                </div>
                                <span class="text-cream/80 font-montserrat">${match.company}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="card-content">
                        <div class="grid grid-cols-2 gap-4 mb-4">
                            <div>
                                <p class="text-cream/60 text-sm font-montserrat">Location</p>
                                <p class="text-cream font-montserrat">${match.location}</p>
                            </div>
                            <div>
                                <p class="text-cream/60 text-sm font-montserrat">Salary</p>
                                <p class="salary-range">${this.formatSalary(match.avgSalaryINR)}</p>
                            </div>
                        </div>
                        
                        ${match.matchedSkills && match.matchedSkills.length > 0 ? `
                            <div class="mb-4">
                                <p class="text-cream/60 text-sm font-montserrat mb-2">Matched Skills</p>
                                <div class="skills-container">
                                    ${match.matchedSkills.map(skill => `
                                        <span class="skill-tag technical">${skill}</span>
                                    `).join('')}
                                </div>
                            </div>
                        ` : ''}
                        
                        ${match.missingSkills && match.missingSkills.length > 0 ? `
                            <div class="mb-4">
                                <p class="text-cream/60 text-sm font-montserrat mb-2">Skills to Develop</p>
                                <div class="skills-container">
                                    ${match.missingSkills.map(skill => `
                                        <span class="skill-tag soft">${skill}</span>
                                    `).join('')}
                                </div>
                            </div>
                        ` : ''}
                        
                        <div class="flex justify-between items-center mt-4 pt-4 border-t border-cream/10">
                            <span class="text-cream/60 text-sm font-montserrat">
                                Match Score: ${match.matchPercent}%
                            </span>
                            <div class="flex gap-2">
                                <button onclick="pageManager.viewMatchDetails('${match.id}')" 
                                        class="px-3 py-1 text-sm bg-mint/20 text-mint rounded-lg hover:bg-mint/30 transition-colors font-montserrat">
                                    Details
                                </button>
                                <button onclick="pageManager.applyToJob('${match.jobId}')" 
                                        class="px-3 py-1 text-sm bg-blue/20 text-blue rounded-lg hover:bg-blue/30 transition-colors font-montserrat">
                                    Apply
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    // Utility functions
    getLoadingHTML(message = 'Loading...') {
        return `
            <div class="loading-state">
                <div class="loading-spinner"></div>
                <p class="text-cream/70 font-montserrat">${message}</p>
            </div>
        `;
    }
    
    getErrorStateHTML(message = 'Something went wrong') {
        return `
            <div class="error-state">
                <div class="w-16 h-16 bg-gradient-to-r from-red to-yellow rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <i data-lucide="alert-triangle" class="w-8 h-8 text-dark"></i>
                </div>
                <p class="text-red font-montserrat">${message}</p>
                <button onclick="location.reload()" class="mt-4 px-4 py-2 bg-red/20 text-red rounded-lg hover:bg-red/30 transition-colors font-montserrat">
                    Try Again
                </button>
            </div>
        `;
    }
    
    getEmptyStateHTML(title, message, link = '#', buttonText = 'Get Started', onclick = null) {
        const buttonAction = onclick ? `onclick="${onclick}"` : `href="${link}"`;
        const buttonTag = onclick ? 'button' : 'a';
        
        return `
            <div class="empty-state">
                <div class="w-16 h-16 bg-gradient-to-r from-blue to-mint rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <i data-lucide="inbox" class="w-8 h-8 text-dark"></i>
                </div>
                <h3 class="text-xl font-bold text-cream mb-2 heading-font">${title}</h3>
                <p class="text-cream/70 mb-6 font-montserrat">${message}</p>
                <${buttonTag} ${buttonAction} class="px-6 py-3 bg-gradient-to-r from-blue to-mint rounded-xl text-dark font-semibold hover:scale-105 transition-transform font-montserrat">
                    ${buttonText}
                </${buttonTag}>
            </div>
        `;
    }
    
    getStatusIcon(status) {
        const icons = {
            active: 'check-circle',
            pending: 'clock',
            inactive: 'x-circle',
            processing: 'loader-2'
        };
        return icons[status] || 'circle';
    }
    
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        });
    }
    
    formatSalary(amount) {
        if (amount >= 10000000) {
            return `₹${(amount / 10000000).toFixed(1)}Cr`;
        } else if (amount >= 100000) {
            return `₹${(amount / 100000).toFixed(1)}L`;
        } else {
            return `₹${amount.toLocaleString()}`;
        }
    }
    
    animateCards() {
        const cards = document.querySelectorAll('.fade-in-up');
        cards.forEach((card, index) => {
            setTimeout(() => {
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }, index * 100);
        });
        
        // Initialize icons after cards are rendered
        if (window.utils && window.utils.initializeIcons) {
            setTimeout(() => {
                window.utils.initializeIcons();
            }, 500);
        }
    }
    
    // Filter functions
    filterCandidates(searchTerm) {
        const cards = document.querySelectorAll('.candidate-card');
        cards.forEach(card => {
            const text = card.textContent.toLowerCase();
            const matches = text.includes(searchTerm.toLowerCase());
            card.style.display = matches ? 'block' : 'none';
        });
    }
    
    filterJobs(searchTerm) {
        const cards = document.querySelectorAll('.job-card');
        cards.forEach(card => {
            const text = card.textContent.toLowerCase();
            const matches = text.includes(searchTerm.toLowerCase());
            card.style.display = matches ? 'block' : 'none';
        });
    }
    
    applyFilters() {
        // Implementation for applying multiple filters
        console.log('Applying filters...');
    }
    
    updateMatchDisplay() {
        // Re-filter matches based on new threshold
        const currentCandidateId = sessionStorage.getItem('currentCandidateId');
        if (currentCandidateId) {
            this.loadMatches(currentCandidateId);
        }
    }
    
    lowerThreshold() {
        const slider = document.getElementById('matchThreshold');
        if (slider) {
            slider.value = Math.max(0, this.matchThreshold - 10);
            slider.dispatchEvent(new Event('input'));
        }
    }
    
    // Action handlers
    viewCandidate(candidateId) {
        sessionStorage.setItem('currentCandidateId', candidateId);
        window.location.href = `/analysis.html?candidateId=${candidateId}`;
    }
    
    analyzeCandidate(candidateId) {
        sessionStorage.setItem('currentCandidateId', candidateId);
        window.location.href = `/analysis.html?candidateId=${candidateId}`;
    }
    
    viewJob(jobId) {
        this.currentJobId = jobId;
        console.log('Viewing job:', jobId);
        // Implementation for viewing job details
    }
    
    findMatches(jobId) {
        this.currentJobId = jobId;
        window.location.href = `/matches.html?jobId=${jobId}`;
    }
    
    viewMatchDetails(matchId) {
        console.log('Viewing match details:', matchId);
        // Implementation for viewing match details
    }
    
    applyToJob(jobId) {
        console.log('Applying to job:', jobId);
        // Implementation for job application
    }
}

// Global functions for page interactions
window.showAddJobModal = function() {
    console.log('Show add job modal');
    // Implementation for add job modal
};

window.generateMatches = function() {
    const candidateSelect = document.getElementById('candidateSelect');
    if (candidateSelect && candidateSelect.value) {
        pageManager.loadMatches(candidateSelect.value);
    } else {
        alert('Please select a candidate first');
    }
};

window.exportMatches = function() {
    console.log('Export matches');
    // Implementation for exporting matches
};

// Initialize page manager
window.pageManager = new PageManager();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PageManager;
}