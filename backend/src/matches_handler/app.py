import json
import boto3
from datetime import datetime
import os
from botocore.exceptions import ClientError
import logging
from decimal import Decimal

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Initialize AWS clients
region = boto3.Session().region_name or 'ap-south-1'
dynamodb = boto3.resource('dynamodb', region_name=region)

# Environment variables
MATCHES_TABLE = os.environ['MATCHES_TABLE']
CANDIDATES_TABLE = os.environ['CANDIDATES_TABLE']
ANALYSES_TABLE = os.environ['ANALYSES_TABLE']
JOBS_TABLE = os.environ['JOBS_TABLE']

def convert_decimals(obj):
    """Convert Decimal types to regular numbers for JSON serialization"""
        if isinstance(obj, Decimal):
        return float(obj)
    elif isinstance(obj, dict):
        return {k: convert_decimals(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [convert_decimals(item) for item in obj]
    else:
        return obj

def lambda_handler(event, context):
    """Handle matches operations"""
    try:
        # Handle CORS preflight request
        if event.get('httpMethod') == 'OPTIONS':
            return create_cors_response(200, {})
        
        logger.info(f"Matches handler invoked with event: {json.dumps(event)}")
        
        http_method = event.get('httpMethod', 'GET')
        
        if http_method == 'GET':
            return get_matches(event)
        elif http_method == 'POST':
            return create_match(event)
        else:
            return create_cors_response(405, {'error': 'Method not allowed'})
        
    except Exception as e:
        logger.error(f"Error in matches handler: {str(e)}")
        return create_cors_response(500, {'error': str(e)})

def get_matches(event):
    """Get matches for a specific job or candidate"""
    try:
        query_params = event.get('queryStringParameters') or {}
        job_id = query_params.get('jobId')
        candidate_id = query_params.get('candidateId')
        
        matches_table = dynamodb.Table(MATCHES_TABLE)
        
        if job_id:
            # Get matches for a specific job
            response = matches_table.query(
                KeyConditionExpression=boto3.dynamodb.conditions.Key('jobId').eq(job_id)
            )
            matches = response.get('Items', [])
            
            # Get candidate details for each match
            for match in matches:
                candidate_id = match['candidateId']
                candidate = get_candidate_details(candidate_id)
                match['candidate'] = candidate
                
        elif candidate_id:
            # Get matches for a specific candidate
            response = matches_table.query(
                IndexName='candidateId-index',
                KeyConditionExpression=boto3.dynamodb.conditions.Key('candidateId').eq(candidate_id)
            )
            matches = response.get('Items', [])
            
            # If no matches exist, generate them dynamically
            if not matches:
                matches = generate_matches_for_candidate(candidate_id)
            
            # Get job details for each match
            for match in matches:
                job_id = match['jobId']
                job = get_job_details(job_id)
                match['job'] = job
                
            else:
            # Get all matches
            response = matches_table.scan()
            matches = response.get('Items', [])
            
            # Get details for each match
            for match in matches:
                candidate_id = match['candidateId']
                job_id = match['jobId']
                candidate = get_candidate_details(candidate_id)
                job = get_job_details(job_id)
                match['candidate'] = candidate
                match['job'] = job
        
        return create_cors_response(200, {
            'matches': matches,
            'count': len(matches)
        })
        
    except Exception as e:
        logger.error(f"Error getting matches: {str(e)}")
        return create_cors_response(500, {'error': str(e)})

def create_match(event):
    """Create a new match between candidate and job"""
    try:
        body = json.loads(event['body'])
        candidate_id = body.get('candidateId')
        job_id = body.get('jobId')
        
        if not candidate_id or not job_id:
            return create_cors_response(400, {'error': 'candidateId and jobId are required'})
        
        # Calculate match score
        match_score = calculate_match_score(candidate_id, job_id)
        
        match_data = {
            'candidateId': candidate_id,
            'jobId': job_id,
            'score': Decimal(str(match_score)),
            'status': 'pending',
            'createdAt': datetime.utcnow().isoformat(),
            'updatedAt': datetime.utcnow().isoformat()
        }
        
        matches_table = dynamodb.Table(MATCHES_TABLE)
        matches_table.put_item(Item=match_data)
        
        return create_cors_response(201, {
            'message': 'Match created successfully',
            'match': match_data
        })
        
    except Exception as e:
        logger.error(f"Error creating match: {str(e)}")
        return create_cors_response(500, {'error': str(e)})

def extract_skills_from_text(text):
    """Extract skills from resume text using simple pattern matching"""
    if not text:
        return []
    
    # Common technical skills to look for
    skill_keywords = [
        'python', 'java', 'javascript', 'react', 'node.js', 'aws', 'azure', 'docker', 'kubernetes',
        'terraform', 'git', 'linux', 'sql', 'mongodb', 'postgresql', 'html', 'css', 'vue.js',
        'angular', 'spring', 'django', 'flask', 'express', 'typescript', 'php', 'ruby', 'go',
        'c++', 'c#', 'swift', 'kotlin', 'android', 'ios', 'machine learning', 'ai', 'tensorflow',
        'pytorch', 'pandas', 'numpy', 'scikit-learn', 'jenkins', 'ci/cd', 'devops', 'agile',
        'scrum', 'kubernetes', 'ansible', 'chef', 'puppet', 'elasticsearch', 'redis', 'kafka'
    ]
    
    text_lower = text.lower()
    found_skills = []
    
    for skill in skill_keywords:
        if skill in text_lower:
            found_skills.append(skill.title())
    
    return list(set(found_skills))  # Remove duplicates

def generate_matches_for_candidate(candidate_id):
    """Generate matches for a candidate against all jobs"""
    try:
        # Get all jobs
        jobs_table = dynamodb.Table(JOBS_TABLE)
        jobs_response = jobs_table.scan()
        jobs = jobs_response.get('Items', [])
        
        matches = []
        for job in jobs:
            job_id = job['jobId']
            match_score = calculate_match_score(candidate_id, job_id)
            
            if match_score > 0:  # Only include matches with score > 0
                match = {
                    'candidateId': candidate_id,
                    'jobId': job_id,
                    'matchScore': Decimal(str(match_score)),
                    'createdAt': datetime.utcnow().isoformat()
                }
                matches.append(match)
        
        # Sort by match score (highest first)
        matches.sort(key=lambda x: x['matchScore'], reverse=True)
        
        return matches
        
    except Exception as e:
        logger.error(f"Error generating matches for candidate {candidate_id}: {str(e)}")
        return []

def calculate_match_score(candidate_id, job_id):
    """Calculate match score between candidate and job"""
    try:
        # Get candidate analysis
        analyses_table = dynamodb.Table(ANALYSES_TABLE)
        analysis_response = analyses_table.query(
            IndexName='candidateId-index',
            KeyConditionExpression=boto3.dynamodb.conditions.Key('candidateId').eq(candidate_id)
        )
        
        if not analysis_response['Items']:
        return 0

        analysis = analysis_response['Items'][0]
        
        # Handle both old format (nlpResults) and new format (direct fields)
        candidate_skills = []
        if 'nlpResults' in analysis and analysis['nlpResults']:
            nlp_results = analysis.get('nlpResults', {})
            candidate_skills = nlp_results.get('skills', [])
        else:
            # Fallback to direct fields if nlpResults is not available
            candidate_skills = analysis.get('skills', [])
            
        # If still no skills, try to extract from extractedText
        if not candidate_skills and 'extractedText' in analysis:
            candidate_skills = extract_skills_from_text(analysis['extractedText'])
        
        # Get job requirements
        jobs_table = dynamodb.Table(JOBS_TABLE)
        job_response = jobs_table.get_item(Key={'jobId': job_id})
        
        if 'Item' not in job_response:
            return 0
        
        job = job_response['Item']
        job_requirements = job.get('requirements', [])
        job_skills = job.get('skills', [])
        
        # Calculate skill match
        skill_matches = 0
        total_skills = len(job_skills)
        
        if total_skills > 0:
            for skill in job_skills:
                if any(candidate_skill.lower() in skill.lower() or skill.lower() in candidate_skill.lower() 
                      for candidate_skill in candidate_skills):
                    skill_matches += 1
        
        # Calculate overall score
        skill_score = (skill_matches / total_skills * 100) if total_skills > 0 else 0
        
        # Get experience score from analysis
        experience_score = 50  # Default score
        if 'nlpResults' in analysis and analysis['nlpResults']:
            experience_score = nlp_results.get('overallScore', 50)
            else:
            experience_score = analysis.get('overallScore', 50)
        
        # Weighted average
        overall_score = (skill_score * 0.6) + (float(experience_score) * 0.4)
        
        return round(overall_score, 2)
        
    except Exception as e:
        logger.error(f"Error calculating match score: {str(e)}")
        return 0

def get_candidate_details(candidate_id):
    """Get candidate details with analysis"""
    try:
        candidates_table = dynamodb.Table(CANDIDATES_TABLE)
        candidate_response = candidates_table.get_item(Key={'candidateId': candidate_id})
        
        if 'Item' not in candidate_response:
            return None
        
        candidate = candidate_response['Item']
        
        # Get analysis
        analyses_table = dynamodb.Table(ANALYSES_TABLE)
        analysis_response = analyses_table.query(
            IndexName='candidateId-index',
            KeyConditionExpression=boto3.dynamodb.conditions.Key('candidateId').eq(candidate_id)
        )
        
        if analysis_response['Items']:
            candidate['analysis'] = analysis_response['Items'][0]
        
        return candidate
        
    except Exception as e:
        logger.error(f"Error getting candidate details: {str(e)}")
        return None

def get_job_details(job_id):
    """Get job details"""
    try:
        jobs_table = dynamodb.Table(JOBS_TABLE)
        job_response = jobs_table.get_item(Key={'jobId': job_id})
        
        if 'Item' not in job_response:
            return None
        
        return job_response['Item']
        
    except Exception as e:
        logger.error(f"Error getting job details: {str(e)}")
        return None

def create_cors_response(status_code, body):
    """Create CORS-enabled response"""
    # Convert Decimal types before JSON serialization
    body = convert_decimals(body)
    return {
        'statusCode': status_code,
        'headers': {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
            'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
            'Content-Type': 'application/json'
        },
        'body': json.dumps(body)
    }