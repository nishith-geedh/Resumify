# Resumify Application Architecture - Complete End-to-End Documentation

## Table of Contents
1. [High-Level Architecture Overview](#1-high-level-architecture-overview)
2. [Detailed Component Architecture](#2-detailed-component-architecture)
3. [Data Flow Architecture](#3-data-flow-architecture)
4. [User Workflows](#4-user-workflows)
5. [Error Handling and Recovery](#5-error-handling-and-recovery)
6. [Security Architecture](#6-security-architecture)
7. [Performance Considerations](#7-performance-considerations)
8. [Deployment and Operations](#8-deployment-and-operations)
9. [Monitoring and Observability](#9-monitoring-and-observability)
10. [Cost Optimization](#10-cost-optimization)

---

## 1. High-Level Architecture Overview

Resumify is a serverless resume analysis and job matching platform built on AWS. The application follows a microservices architecture with a React-based frontend and AWS Lambda-powered backend.

### 1.1 System Architecture Diagram

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │   API Gateway    │    │   Lambda        │
│   (Static Web)  │◄──►│   (REST API)     │◄──►│   Functions     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                                         │
                       ┌──────────────────┐             │
                       │   CloudWatch     │◄────────────┤
                       │   (Logging)      │             │
                       └──────────────────┘             │
                                                         │
┌─────────────────┐    ┌──────────────────┐             │
│   S3 Bucket     │◄───│   DynamoDB       │◄────────────┘
│   (File Storage)│    │   (Database)     │
└─────────────────┘    └──────────────────┘
         │
         ▼
┌─────────────────┐
│   AWS Textract  │
│   (OCR Service) │
└─────────────────┘
```

### 1.2 Technology Stack

**Frontend:**
- HTML5, CSS3, JavaScript (ES6+)
- Axios for HTTP requests
- Lucide icons for UI elements
- Responsive design with CSS Grid/Flexbox

**Backend:**
- AWS Lambda (Python 3.10)
- API Gateway (REST API)
- DynamoDB (NoSQL Database)
- S3 (File Storage)
- AWS Textract (OCR)
- Amazon Comprehend (NLP)

**Infrastructure:**
- AWS SAM (Serverless Application Model)
- CloudWatch (Monitoring & Logging)
- IAM (Identity and Access Management)

---

## 2. Detailed Component Architecture

### 2.1 Frontend Layer

#### 2.1.1 Frontend Structure
```
frontend/
├── index.html              # Landing/upload page
├── candidates.html         # Candidate management
├── jobs.html              # Job management
├── matches.html           # Job-candidate matching
├── analysis.html          # Individual candidate analysis
├── js/
│   ├── api.js             # API client wrapper
│   ├── upload.js          # File upload handling
│   ├── navigation.js      # Page navigation
│   ├── realtime-data-updates.js  # Real-time polling
│   ├── realtime-text-extraction.js  # Status monitoring
│   └── dropdown-enhancements.js   # UI enhancements
├── styles/
│   ├── main.css           # Core styles
│   └── dropdown-fixes.css # UI fixes
└── assets/                # Static assets
```

#### 2.1.2 Key Frontend Components

**API Client (api.js)**
- Centralized HTTP client using Axios
- Handles authentication, retries, and error handling
- Base URL: `https://z768cmg327.execute-api.us-east-1.amazonaws.com/dev`
- Features:
  - Exponential backoff retry logic
  - User-friendly error messages
  - API health monitoring
  - Request/response interceptors

**Upload Manager (upload.js)**
- File validation and base64 encoding
- Progress tracking and real-time status updates
- Supports PDF, DOCX, DOC, TXT files
- Features:
  - File type validation
  - Size limit enforcement (10MB)
  - Progress indicators
  - Error handling and recovery

**Real-time Updates (realtime-data-updates.js)**
- Polls backend APIs every 30 seconds
- Updates candidate lists, job lists, and match results
- Handles page visibility changes
- Features:
  - Intelligent polling intervals
  - Change detection and notifications
  - Page visibility optimization
  - Error recovery mechanisms

**Status Monitoring (realtime-text-extraction.js)**
- Monitors text extraction progress
- Dynamic polling intervals (3s to 30s)
- Progress indicators and status messages
- Features:
  - Adaptive polling based on processing stage
  - Visual progress indicators
  - Status message updates
  - Timeout handling

### 2.2 API Gateway Layer

#### 2.2.1 Configuration
- REST API with CORS enabled
- Base URL: `https://z768cmg327.execute-api.us-east-1.amazonaws.com/dev`
- Handles preflight OPTIONS requests
- Routes requests to appropriate Lambda functions

#### 2.2.2 API Endpoints
| Method | Endpoint | Handler Function | Description |
|--------|----------|------------------|-------------|
| POST | `/upload` | UploadHandlerFunction | Upload resume file |
| GET | `/candidates` | CandidatesHandler | Get all candidates |
| GET | `/analysis` | AnalysisHandlerFunction | Get analysis results |
| GET | `/jobs` | JobsHandlerFunction | Get all jobs |
| POST | `/jobs` | JobsHandlerFunction | Create new job |
| GET | `/matches` | MatchingHandlerFunction | Get job matches |
| POST | `/analyze` | NlpHandlerFunction | Trigger re-analysis |
| POST | `/generate-report` | ReportHandlerFunction | Generate analysis report |

### 2.3 Lambda Functions Layer

#### 2.3.1 Core Lambda Functions

**UploadHandlerFunction**
- **Purpose**: Handle file uploads and initiate processing
- **Runtime**: Python 3.10
- **Memory**: 512MB
- **Timeout**: 60 seconds
- **Triggers**: API Gateway POST /upload
- **Responsibilities**:
  - Validate uploaded files
  - Store files in S3
  - Create candidate records in DynamoDB
  - Trigger appropriate processing based on file type
  - Handle CORS preflight requests

**AnalysisHandlerFunction**
- **Purpose**: Retrieve and format analysis results
- **Runtime**: Python 3.10
- **Memory**: 256MB
- **Timeout**: 45 seconds
- **Triggers**: API Gateway GET /analysis
- **Responsibilities**:
  - Query analysis data from DynamoDB
  - Merge candidate information
  - Format response for frontend consumption
  - Handle missing analysis scenarios

**CandidatesHandler**
- **Purpose**: Manage candidate data retrieval
- **Runtime**: Python 3.10
- **Memory**: 256MB
- **Timeout**: 45 seconds
- **Triggers**: API Gateway GET /candidates
- **Responsibilities**:
  - Scan/query candidates table
  - Return paginated results
  - Include processing status information

**JobsHandlerFunction**
- **Purpose**: Manage job postings
- **Runtime**: Python 3.10
- **Memory**: 256MB
- **Timeout**: 45 seconds
- **Triggers**: API Gateway GET/POST /jobs
- **Responsibilities**:
  - CRUD operations for job postings
  - Validate job data
  - Return formatted job listings

**MatchingHandlerFunction**
- **Purpose**: Calculate job-candidate matches
- **Runtime**: Python 3.10
- **Memory**: 512MB
- **Timeout**: 60 seconds
- **Triggers**: API Gateway GET /matches
- **Responsibilities**:
  - Compare candidate skills with job requirements
  - Calculate match percentages using Jaccard similarity
  - Rank and sort matches
  - Return match results with explanations

**DocxTxtWorkerFunction**
- **Purpose**: Process DOCX and DOC files
- **Runtime**: Python 3.10
- **Memory**: 1024MB
- **Timeout**: 300 seconds
- **Triggers**: Invoked by UploadHandlerFunction
- **Responsibilities**:
  - Download files from S3
  - Extract text from DOCX/DOC files using python-docx and docx2txt
  - Create analysis records
  - Update candidate status

**TextractWorkerFunction**
- **Purpose**: Handle Textract job initiation
- **Runtime**: Python 3.10
- **Memory**: 256MB
- **Timeout**: 300 seconds
- **Triggers**: Invoked by UploadHandlerFunction
- **Responsibilities**:
  - Start Textract document analysis jobs
  - Monitor job status
  - Handle Textract responses
  - Process extracted text

**NlpHandlerFunction**
- **Purpose**: Perform NLP analysis on extracted text
- **Runtime**: Python 3.10
- **Memory**: 1024MB
- **Timeout**: 300 seconds
- **Triggers**: API Gateway POST /analyze
- **Responsibilities**:
  - Extract skills, experience, education using Amazon Comprehend
  - Calculate overall scores
  - Identify job titles and achievements
  - Store analysis results

**EnhancedDocumentMonitorFunction**
- **Purpose**: Monitor and recover stuck document processing
- **Runtime**: Python 3.10
- **Memory**: 512MB
- **Timeout**: 300 seconds
- **Triggers**: CloudWatch Events (every 5 minutes)
- **Responsibilities**:
  - Monitor stuck processing jobs
  - Retry failed operations
  - Clean up orphaned records
  - Send alerts for persistent failures

### 2.4 Storage Layer

#### 2.4.1 Amazon S3 Bucket
- **Bucket Name**: `resumify-resumes-471112714808-us-east-1-dev`
- **Purpose**: Store uploaded resume files
- **Structure**:
  ```
  resumify-resumes-bucket/
  └── resumes/
      └── {candidateId}/
          └── {filename}
  ```
- **Access**: Lambda functions have read/write access
- **Lifecycle**: Files retained indefinitely
- **Security**: Server-side encryption (AES256)

#### 2.4.2 DynamoDB Tables

**Resumify_Candidates_dev**
- **Purpose**: Store candidate information
- **Partition Key**: `candidateId` (String)
- **Attributes**:
  ```json
  {
    "candidateId": "uuid",
    "name": "string",
    "email": "string", 
    "fileName": "string",
    "fileType": "string",
    "uploadedAt": "ISO timestamp",
    "status": "uploaded|processing|analyzed|failed",
    "textExtractionStatus": "pending|processing|completed|failed",
    "s3Key": "string",
    "textractJobId": "string (optional)"
  }
  ```

**Resumify_Analyses_dev**
- **Purpose**: Store analysis results
- **Partition Key**: `analysisId` (String)
- **Global Secondary Index**: `candidateId-index`
- **Attributes**:
  ```json
  {
    "analysisId": "uuid",
    "candidateId": "uuid",
    "candidateName": "string",
    "candidateEmail": "string",
    "extractedText": "string",
    "textExtractionStatus": "string",
    "status": "processing|analyzed|failed",
    "skills": ["array of skill objects"],
    "jobTitles": ["array"],
    "experience": ["array"],
    "education": ["array"],
    "overallScore": "number",
    "createdAt": "ISO timestamp",
    "updatedAt": "ISO timestamp"
  }
  ```

**Resumify_Jobs_dev**
- **Purpose**: Store job postings
- **Partition Key**: `jobId` (String)
- **Attributes**:
  ```json
  {
    "jobId": "uuid",
    "title": "string",
    "company": "string",
    "location": "string",
    "experienceRequired": "string",
    "salaryRange": "string",
    "jobType": "string",
    "requiredSkills": ["array"],
    "description": "string",
    "createdAt": "ISO timestamp"
  }
  ```

**Resumify_Matches_dev**
- **Purpose**: Store match results (optional caching)
- **Partition Key**: `candidateId` (String)
- **Sort Key**: `jobId` (String)
- **Attributes**:
  ```json
  {
    "matchId": "uuid",
    "candidateId": "uuid",
    "jobId": "uuid",
    "matchScore": "number",
    "matchingSkills": ["array"],
    "missingSkills": ["array"],
    "createdAt": "ISO timestamp"
  }
  ```

### 2.5 External Services

#### 2.5.1 AWS Textract
- **Purpose**: OCR for PDF files
- **Integration**: Asynchronous job-based processing
- **Workflow**:
  1. Lambda starts Textract job
  2. Textract processes document
  3. Results retrieved via polling or SNS notification

#### 2.5.2 Amazon Comprehend
- **Purpose**: NLP analysis for skill extraction
- **Integration**: Synchronous API calls
- **Use Cases**: 
  - Entity recognition
  - Key phrase extraction
  - Sentiment analysis
  - Skill categorization

---

## 3. Data Flow Architecture

### 3.1 File Upload Flow

```
User Upload → Frontend → API Gateway → UploadHandler → S3 + DynamoDB
                                           ↓
                                    File Type Decision
                                           ↓
                        ┌─────────────────┼─────────────────┐
                        ▼                 ▼                 ▼
                   TXT (Direct)      PDF (Textract)    DOCX (Worker)
                        │                 │                 │
                        ▼                 ▼                 ▼
                   Analysis          TextractWorker    DocxWorker
                   Created               │                 │
                        │                ▼                 ▼
                        └──────► Analysis Created ◄────────┘
```

### 3.2 Analysis Retrieval Flow

```
Frontend Request → API Gateway → AnalysisHandler → DynamoDB Query
                                        ↓
                                 Merge Candidate Data
                                        ↓
                                 Format Response
                                        ↓
                                 Return to Frontend
```

### 3.3 Matching Flow

```
Match Request → API Gateway → MatchingHandler → Query Candidates & Jobs
                                    ↓
                            Calculate Match Scores
                                    ↓
                            Rank and Sort Results
                                    ↓
                            Return Match Results
```

---

## 4. User Workflows

### 4.1 Resume Upload Workflow

**Step 1: File Selection**
- User navigates to upload page (index.html)
- Selects file (PDF, DOCX, DOC, or TXT)
- Enters name and email
- File validation occurs client-side

**Step 2: Upload Process**
- File converted to base64 encoding
- POST request to /upload endpoint
- UploadHandler processes request:
  - Validates file and metadata
  - Generates unique candidateId
  - Stores file in S3
  - Creates candidate record in DynamoDB
  - Triggers appropriate processing based on file type

**Step 3: Processing**
- **TXT Files**: Processed immediately, analysis created
- **PDF Files**: Textract job initiated, async processing
- **DOCX/DOC Files**: DocxWorker invoked, text extraction

**Step 4: Status Monitoring**
- Frontend starts real-time polling
- Status updates every 3-30 seconds
- Progress indicators show processing stages
- User can navigate away and return

**Step 5: Completion**
- Analysis record created with extracted text
- Candidate status updated to "analyzed"
- User can view results in candidates page

### 4.2 Candidate Management Workflow

**Step 1: View Candidates**
- User navigates to candidates.html
- Page loads all candidates via /candidates API
- Real-time updates refresh list every 30 seconds

**Step 2: View Individual Analysis**
- User clicks "View Analysis" button
- Navigates to analysis.html?candidateId={id}
- Analysis data loaded via /analysis API
- Displays extracted text, skills, experience, etc.

**Step 3: View Resume Text**
- User clicks "View Resume" button
- Modal displays extracted text
- Handles processing states gracefully

### 4.3 Job Management Workflow

**Step 1: View Jobs**
- User navigates to jobs.html
- Page loads all jobs via /jobs GET API
- Jobs displayed in card format

**Step 2: Create Job**
- User fills job creation form
- POST request to /jobs endpoint
- Job stored in DynamoDB
- Page refreshes to show new job

**Step 3: Edit/Delete Jobs**
- User can modify existing jobs
- Updates sent via API
- Real-time updates reflect changes

### 4.4 Job Matching Workflow

**Step 1: Initiate Matching**
- User navigates to matches.html
- Can access via "Find Matches" from candidates page
- URL parameters pre-select candidate/job

**Step 2: Select Criteria**
- User selects candidate from dropdown
- Optionally selects specific job
- System loads available options via APIs

**Step 3: Calculate Matches**
- Request sent to /matches endpoint
- MatchingHandler processes request:
  - Retrieves candidate skills and experience
  - Compares with job requirements
  - Calculates match percentages using Jaccard similarity
  - Ranks results by score

**Step 4: View Results**
- Matches displayed in ranked order
- Shows match percentage, matching skills, missing skills
- User can click through to detailed analysis

### 4.5 Real-time Updates Workflow

**Continuous Background Process:**
- All pages implement real-time polling
- Updates occur every 30 seconds
- Faster polling (3s) during active processing
- Page visibility API pauses updates when tab inactive

**Update Types:**
- Candidate list updates (new uploads, status changes)
- Job list updates (new jobs, modifications)
- Analysis completion notifications
- Match result updates

---

## 5. Error Handling and Recovery

### 5.1 Frontend Error Handling

**Network Error Retry:**
- Exponential backoff with jitter
- Maximum 3 retry attempts
- User-friendly error messages
- Graceful degradation when APIs unavailable

**Loading States:**
- Progress indicators during file upload
- Status messages for processing stages
- Skeleton loaders for data fetching

**Error Recovery:**
- Automatic retry for transient failures
- Manual retry options for users
- Offline detection and messaging

### 5.2 Backend Error Handling

**Comprehensive Error Handling:**
- Try-catch blocks in all Lambda functions
- Structured error logging to CloudWatch
- CORS-compliant error responses
- Database transaction rollbacks where applicable

**Error Types:**
- Validation errors (400)
- Not found errors (404)
- Server errors (500)
- Timeout errors (504)

**Recovery Mechanisms:**
- Dead letter queues for failed messages
- Retry policies for transient failures
- Circuit breaker patterns for external services

### 5.3 File Processing Error Recovery

**Failed Uploads:**
- Marked with error status in DynamoDB
- User notification of processing failures
- Retry mechanisms for transient failures

**Timeout Handling:**
- Configurable timeouts for different operations
- Graceful degradation for long-running processes
- User feedback on processing delays

---

## 6. Security Architecture

### 6.1 API Security

**CORS Configuration:**
- Properly configured for frontend domain
- Preflight OPTIONS request handling
- Allowed headers and methods specified

**Input Validation:**
- File type and size validation
- SQL injection prevention (NoSQL, but still validated)
- XSS protection through proper encoding

**Rate Limiting:**
- API Gateway throttling
- Per-endpoint rate limits
- IP-based rate limiting

### 6.2 Data Security

**S3 Security:**
- Private bucket access
- Server-side encryption (AES256)
- IAM roles for Lambda access only
- No public read access

**DynamoDB Security:**
- Encryption at rest and in transit
- IAM least-privilege access
- VPC endpoints for private access

**File Content Security:**
- No sensitive data in logs
- Secure file handling in Lambda
- Temporary file cleanup

### 6.3 Infrastructure Security

**Lambda Security:**
- Functions run in isolated environments
- IAM roles with minimal permissions
- VPC configuration (if required)
- Environment variable encryption

**Monitoring:**
- CloudWatch monitoring for security events
- Failed authentication attempts tracking
- Unusual access pattern detection

---

## 7. Performance Considerations

### 7.1 Frontend Performance

**Optimization Strategies:**
- Lazy loading of large datasets
- Efficient polling strategies
- Client-side caching where appropriate
- Optimized asset loading
- Progressive enhancement

**Real-time Updates:**
- Intelligent polling intervals
- Page visibility optimization
- Change detection to minimize unnecessary updates
- Background processing for non-critical updates

### 7.2 Backend Performance

**Lambda Optimization:**
- Cold start optimization
- Memory allocation tuning
- Connection pooling for external services
- Concurrent processing where possible

**Database Performance:**
- DynamoDB query optimization with indexes
- Batch operations for multiple items
- On-demand scaling for variable workloads
- Query result caching

**S3 Performance:**
- Transfer acceleration for global uploads
- Multipart uploads for large files
- CDN integration for static assets

### 7.3 Scalability

**Serverless Architecture:**
- Auto-scaling based on demand
- No infrastructure management required
- Pay-per-use pricing model

**Database Scaling:**
- DynamoDB on-demand scaling
- Global secondary indexes for query patterns
- Partition key design for even distribution

**Storage Scaling:**
- S3 unlimited storage capacity
- Lifecycle policies for cost optimization
- Intelligent tiering for access patterns

---

## 8. Deployment and Operations

### 8.1 Deployment Process

**Backend Deployment:**
```bash
cd backend
sam build
sam deploy --guided
```

**Frontend Deployment:**
```bash
cd frontend
npm install
npm run build
# Deploy to S3 + CloudFront or other hosting
```

### 8.2 Environment Configuration

**Development:**
- Local development with SAM local
- Mock services for testing
- Debug logging enabled

**Production:**
- Production-ready configuration
- Monitoring and alerting enabled
- Backup policies configured
- Security hardening applied

### 8.3 Monitoring and Alerting

**CloudWatch Metrics:**
- Lambda function metrics
- DynamoDB performance metrics
- S3 access patterns
- API Gateway metrics

**Custom Metrics:**
- Processing success rates
- File processing times
- User engagement metrics
- Error rates by component

**Alerts:**
- High error rates
- Processing timeouts
- Resource utilization
- Security events

---

## 9. Monitoring and Observability

### 9.1 Logging Strategy

**Structured Logging:**
- JSON format for all logs
- Correlation IDs for request tracing
- Log levels (DEBUG, INFO, WARN, ERROR)
- Contextual information included

**Log Aggregation:**
- CloudWatch Logs for centralized logging
- Log groups by function
- Log retention policies
- Search and filtering capabilities

### 9.2 Metrics and Dashboards

**Key Metrics:**
- Request count and latency
- Error rates and types
- Processing success rates
- Resource utilization

**Dashboards:**
- Real-time operational dashboard
- Business metrics dashboard
- Error tracking dashboard
- Performance monitoring dashboard

### 9.3 Distributed Tracing

**X-Ray Integration:**
- End-to-end request tracing
- Performance bottleneck identification
- Service dependency mapping
- Error root cause analysis

---

## 10. Cost Optimization

### 10.1 AWS Service Costs

**Estimated Monthly Costs (100 resumes/month):**
- **Lambda**: ~$5-10 (execution time)
- **DynamoDB**: ~$2-5 (on-demand pricing)
- **S3**: ~$1-3 (storage and requests)
- **Textract**: ~$10-20 (per page processed)
- **Comprehend**: ~$5-10 (per request)
- **API Gateway**: ~$1-2 (requests)

**Total**: ~$25-50/month for moderate usage

### 10.2 Cost Optimization Strategies

**Lambda Optimization:**
- Right-size memory allocation
- Optimize execution time
- Use provisioned concurrency for consistent performance
- Monitor cold start impact

**DynamoDB Optimization:**
- Use on-demand billing for variable workloads
- Optimize query patterns
- Implement data lifecycle policies
- Monitor read/write capacity

**S3 Optimization:**
- Use appropriate storage classes
- Implement lifecycle policies
- Monitor access patterns
- Use S3 Intelligent Tiering

### 10.3 Cost Monitoring

**AWS Budgets:**
- Set up budget alerts
- Track spending by service
- Monitor cost trends
- Set up billing alarms

**Cost Analysis:**
- Regular cost reviews
- Identify optimization opportunities
- Track cost per transaction
- Monitor cost growth patterns

---

## Conclusion

This architecture provides a robust, scalable, and maintainable platform for resume analysis and job matching. The serverless design ensures automatic scaling, while the microservices architecture provides clear separation of concerns and enables independent development and deployment of components.

The system is designed to handle moderate to high loads efficiently while maintaining cost-effectiveness through AWS's pay-per-use model. The comprehensive error handling, monitoring, and security measures ensure reliability and data protection.

For production deployment, additional considerations include implementing authentication, setting up comprehensive monitoring, and establishing disaster recovery procedures.
