# Resumify API Documentation

## Base URL

```
https://your-api-gateway-url.execute-api.region.amazonaws.com/dev
```

## Response Format

All API responses follow this format:

```json
{
  "success": boolean,
  "data": object | array,
  "error": string
}
```

## Endpoints

### POST /upload

Upload a resume file for processing. Supports multiple file formats with automatic format detection and appropriate processing pipeline routing.

**Supported File Formats:**
- **PDF (.pdf)** - Processed with AWS Textract for high-accuracy text extraction
- **Microsoft Word (.docx)** - Processed with python-docx library
- **Legacy Word (.doc)** - Processed with docx2txt library with fallback support
- **Plain Text (.txt)** - Direct UTF-8 text extraction

**Request:**
- Method: POST
- Content-Type: application/json
- Body:
```json
{
  "filename": "resume.pdf",
  "file": "base64-encoded-file-content",
  "name": "John Doe",
  "email": "john@example.com"
}
```

**Response (PDF files):**
```json
{
  "success": true,
  "data": {
    "candidateId": "uuid",
    "s3Key": "resumes/uuid/filename.pdf",
    "jobId": "textract-job-id"
  }
}
```

**Response (DOCX/DOC/TXT files):**
```json
{
  "success": true,
  "data": {
    "candidateId": "uuid",
    "s3Key": "resumes/uuid/filename.docx"
  }
}
```

**Error Response (Unsupported format):**
```json
{
  "success": false,
  "error": "Unsupported file type: xyz. Supported types: PDF, DOCX, DOC, TXT"
}
```

### GET /analysis

Get analysis results for a candidate.

**Request:**
- Method: GET
- Query Parameters:
  - `candidateId` (required): Candidate UUID

**Response:**
```json
{
  "success": true,
  "data": {
    "analysisId": "uuid",
    "candidateId": "uuid",
    "extractedText": "Full resume text...",
    "skills": [
      {
        "name": "Python",
        "type": "technical",
        "category": "Programming Languages",
        "confidence": 0.98
      }
    ],
    "jobTitles": [
      {
        "title": "Software Engineer",
        "confidence": 0.9
      }
    ],
    "experience": [
      {
        "title": "Senior Developer",
        "company": "TechCorp",
        "duration": "2020-2023",
        "description": "Led development team..."
      }
    ],
    "education": [
      {
        "degree": "Bachelor of Technology",
        "field": "Computer Science",
        "institution": "University",
        "year": "2020"
      }
    ],
    "projects": [
      {
        "name": "E-commerce Platform",
        "description": "Built scalable platform...",
        "technologies": ["React", "Node.js", "MongoDB"]
      }
    ],
    "achievements": [
      "Led team of 5 developers",
      "Increased system performance by 40%"
    ],
    "overallScore": 85,
    "metrics": {
      "words": 1200,
      "characters": 7000,
      "estimatedReadingTime": 6
    },
    "status": "analyzed",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
}
```

### GET /matches

Get job matches for a candidate.

**Request:**
- Method: GET
- Query Parameters:
  - `candidateId` (required): Candidate UUID
  - `top` (optional): Number of top matches to return (default: 10)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "jobId": "uuid",
      "title": "Senior Software Engineer",
      "company": "TechCorp",
      "location": "Bangalore",
      "avgSalaryINR": 1800000,
      "matchPercent": 87,
      "matchedSkills": ["Python", "AWS", "React"],
      "jobType": "Full-time",
      "experienceLevel": "Senior"
    }
  ]
}
```

### GET /jobs

Get all job postings.

**Request:**
- Method: GET

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "jobId": "uuid",
      "title": "Software Engineer",
      "company": "TechCorp",
      "description": "We are looking for...",
      "skills": ["Python", "Django", "AWS"],
      "avgSalaryINR": 1500000,
      "location": "Mumbai",
      "jobType": "Full-time",
      "experienceLevel": "Mid-level",
      "minExperienceYears": 3,
      "postedAt": "2024-01-15T10:30:00Z"
    }
  ]
}
```

### POST /jobs

Create a new job posting.

**Request:**
- Method: POST
- Content-Type: application/json
- Body:
```json
{
  "title": "Software Engineer",
  "company": "TechCorp",
  "description": "We are looking for a talented software engineer...",
  "skills": ["Python", "Django", "AWS"],
  "avgSalaryINR": 1500000,
  "location": "Mumbai",
  "jobType": "Full-time",
  "experienceLevel": "Mid-level",
  "minExperienceYears": 3
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "jobId": "uuid",
    "title": "Software Engineer",
    "company": "TechCorp",
    "description": "We are looking for a talented software engineer...",
    "skills": ["Python", "Django", "AWS"],
    "avgSalaryINR": 1500000,
    "location": "Mumbai",
    "jobType": "Full-time",
    "experienceLevel": "Mid-level",
    "minExperienceYears": 3,
    "postedAt": "2024-01-15T10:30:00Z",
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

### POST /analyze

Trigger analysis for a candidate (manual re-analysis).

**Request:**
- Method: POST
- Content-Type: application/json
- Body:
```json
{
  "candidateId": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "analysisId": "uuid",
    "status": "started"
  }
}
```

### GET /textract-result

Check Textract job completion status (for PDF processing).

**Request:**
- Method: GET
- Query Parameters:
  - `jobId` (required): Textract job ID

**Response:**
```json
{
  "success": true,
  "data": {
    "candidateId": "uuid",
    "extractedText": "Full resume text...",
    "analysisId": "uuid"
  }
}
```

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "error": "Missing required parameter: candidateId"
}
```

### 404 Not Found
```json
{
  "success": false,
  "error": "Candidate not found"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "error": "Internal server error occurred"
}
```

## Rate Limits

- Upload endpoint: 10 requests per minute per IP
- Analysis endpoints: 100 requests per minute per IP
- Job endpoints: 50 requests per minute per IP

## File Upload Specifications

### Supported Formats
- **PDF (.pdf)** - Processed with AWS Textract for high-accuracy OCR and text extraction
- **Microsoft Word (.docx)** - Processed with python-docx library for structured text extraction
- **Legacy Word (.doc)** - Processed with docx2txt library with intelligent fallback methods
- **Plain Text (.txt)** - Direct UTF-8 text extraction with encoding error tolerance

### File Size Limits
- Maximum file size: 10MB
- PDF: Up to 3000 pages
- DOCX: No page limit within size constraint
- DOC: No page limit within size constraint
- TXT: No size limit within 10MB

### Processing Times
- **TXT**: ~2-5 seconds (fastest processing)
- **DOCX**: ~5-10 seconds (structured extraction)
- **DOC**: ~10-15 seconds (includes fallback processing)
- **PDF**: ~30-120 seconds (depends on pages and complexity)

### Content Type Detection
The system automatically detects file types based on file extensions and sets appropriate MIME types:
- PDF: `application/pdf`
- DOCX: `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
- DOC: `application/msword`
- TXT: `text/plain`

## Skills Ontology

The system recognizes skills in these categories:

### Technical Skills
- **Programming**: Python, Java, JavaScript, TypeScript, C++, C#, Go, Rust, PHP, Ruby
- **Web**: HTML, CSS, React, Angular, Vue, Node.js, Express, Django, Flask
- **Cloud**: AWS, Azure, GCP, Docker, Kubernetes, Terraform, CloudFormation
- **Database**: MySQL, PostgreSQL, MongoDB, Redis, Elasticsearch, DynamoDB
- **Tools**: Git, Jenkins, JIRA, Confluence, Slack, Figma, Photoshop

### Soft Skills
- Leadership, Communication, Teamwork, Problem Solving
- Analytical Thinking, Project Management, Time Management
- Adaptability, Creativity, Collaboration

## Matching Algorithm

The job matching uses Jaccard similarity:

```
Match Score = (|Candidate Skills ∩ Job Skills| / |Candidate Skills ∪ Job Skills|) × 100
```

Additional factors:
- Experience level match: +5% bonus
- Location preference: Future enhancement
- Salary range: Future enhancement

## Authentication

Currently, the API is open for development. For production deployment:

1. Enable API Gateway API Keys
2. Implement AWS Cognito authentication
3. Add request signing for server-to-server calls

## SDK Examples

### JavaScript/Node.js

```javascript
const axios = require('axios');

const api = axios.create({
  baseURL: 'https://your-api-url.com/dev',
  timeout: 30000
});

// Upload resume
const uploadResume = async (file, name, email) => {
  const base64File = file.toString('base64');
  
  const response = await api.post('/upload', {
    filename: file.name,
    file: base64File,
    name,
    email
  });
  
  return response.data;
};

// Get analysis
const getAnalysis = async (candidateId) => {
  const response = await api.get(`/analysis?candidateId=${candidateId}`);
  return response.data;
};
```

### Python

```python
import requests
import base64

class ResumifyAPI:
    def __init__(self, base_url):
        self.base_url = base_url
    
    def upload_resume(self, file_path, name, email):
        with open(file_path, 'rb') as f:
            file_content = base64.b64encode(f.read()).decode()
        
        payload = {
            'filename': file_path.split('/')[-1],
            'file': file_content,
            'name': name,
            'email': email
        }
        
        response = requests.post(f'{self.base_url}/upload', json=payload)
        return response.json()
    
    def get_analysis(self, candidate_id):
        response = requests.get(f'{self.base_url}/analysis', 
                              params={'candidateId': candidate_id})
        return response.json()
```

## Webhooks (Future Enhancement)

Planned webhook events:
- `resume.uploaded` - Resume successfully uploaded
- `analysis.completed` - NLP analysis finished
- `matches.generated` - Job matches calculated

## Changelog

### v1.0.0 (Current)
- Initial release with core functionality
- Resume upload and text extraction
- NLP analysis with Amazon Comprehend
- Job matching with Jaccard similarity
- Basic CRUD operations for jobs