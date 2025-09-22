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
comprehend_client = boto3.client('comprehend', region_name=region)

# Environment variables
CANDIDATES_TABLE = os.environ['CANDIDATES_TABLE']
ANALYSES_TABLE = os.environ['ANALYSES_TABLE']

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
    """Perform NLP analysis on extracted text"""
    try:
        # Handle CORS preflight request
        if event.get('httpMethod') == 'OPTIONS':
            return create_cors_response(200, {})
        
        logger.info(f"NLP handler invoked with event: {json.dumps(event)}")
        
        # Parse request body for direct API calls
        if event.get('httpMethod'):
            if event.get('isBase64Encoded', False):
                body = base64.b64decode(event['body']).decode('utf-8')
            else:
                body = event['body']
            request_data = json.loads(body)
            candidate_id = request_data.get('candidateId')
        else:
            # Direct invocation from other Lambda
            candidate_id = event.get('candidateId')
        
        if not candidate_id:
            return create_cors_response(400, {'error': 'candidateId is required'})
        
        # Get analysis record
        analyses_table = dynamodb.Table(ANALYSES_TABLE)
        response = analyses_table.query(
            IndexName='candidateId-index',
            KeyConditionExpression=boto3.dynamodb.conditions.Key('candidateId').eq(candidate_id)
        )
        
        if not response['Items']:
            return create_cors_response(404, {'error': 'Analysis not found'})
        
        analysis = response['Items'][0]
        text_content = analysis.get('extractedText', '')
        
        if not text_content:
            return create_cors_response(400, {'error': 'No text content found for analysis'})
        
        # Perform NLP analysis
        nlp_results = perform_nlp_analysis(text_content)
        
        # Update analysis record with NLP results
        analyses_table.update_item(
            Key={'analysisId': analysis['analysisId']},
            UpdateExpression='SET nlpResults = :nlp, updatedAt = :updated',
            ExpressionAttributeValues={
                ':nlp': nlp_results,
                ':updated': datetime.utcnow().isoformat()
            }
        )
        
        logger.info(f"NLP analysis completed for candidate: {candidate_id}")
        
        if event.get('httpMethod'):
            return create_cors_response(200, {
                'message': 'NLP analysis completed successfully',
                'candidateId': candidate_id,
                'nlpResults': nlp_results
            })
        else:
            return {'statusCode': 200, 'body': 'NLP analysis completed'}
        
    except Exception as e:
        logger.error(f"Error in NLP handler: {str(e)}")
        if event.get('httpMethod'):
            return create_cors_response(500, {'error': str(e)})
        else:
            raise e

def perform_nlp_analysis(text):
    """Perform comprehensive NLP analysis using Amazon Comprehend"""
    try:
        # Limit text length for Comprehend (5000 chars max)
        text_for_analysis = text[:5000]
        
        # Extract entities (skills, job titles, etc.)
        entities_response = comprehend_client.detect_entities(
            Text=text_for_analysis,
            LanguageCode='en'
        )
        
        # Extract key phrases
        key_phrases_response = comprehend_client.detect_key_phrases(
            Text=text_for_analysis,
            LanguageCode='en'
        )
        
        # Extract sentiment
        sentiment_response = comprehend_client.detect_sentiment(
            Text=text_for_analysis,
            LanguageCode='en'
        )
        
        # Process results
        entities = entities_response.get('Entities', [])
        key_phrases = key_phrases_response.get('KeyPhrases', [])
        
        # Extract skills and job titles
        skills = []
        job_titles = []
        organizations = []
        
        for entity in entities:
            if entity['Type'] == 'PERSON':
                continue
            elif entity['Type'] == 'ORGANIZATION':
                organizations.append(entity['Text'])
            elif entity['Type'] == 'TITLE':
                job_titles.append(entity['Text'])
            elif entity.get('Confidence', 0) > 0.8:  # High confidence entities
                if any(skill_word in entity['Text'].lower() for skill_word in ['python', 'java', 'javascript', 'sql', 'aws', 'docker']):
                    skills.append(entity['Text'])
        
        # Extract job titles from text patterns
        job_title_patterns = [
            'software engineer', 'developer', 'programmer', 'analyst', 'manager',
            'consultant', 'architect', 'lead', 'senior', 'junior', 'intern',
            'director', 'vp', 'vice president', 'ceo', 'cto', 'data scientist',
            'machine learning engineer', 'devops', 'sre', 'qa', 'tester'
        ]
        
        text_lower = text.lower()
        for pattern in job_title_patterns:
            if pattern in text_lower:
                # Find the context around the pattern
                start = text_lower.find(pattern)
                if start != -1:
                    # Extract surrounding text for better job title
                    context_start = max(0, start - 50)
                    context_end = min(len(text), start + len(pattern) + 50)
                    context = text[context_start:context_end]
                    job_titles.append(context.strip())
        
        # Extract skills from key phrases and text patterns
        skill_keywords = [
            'python', 'java', 'javascript', 'sql', 'aws', 'docker', 'kubernetes', 
            'react', 'node', 'angular', 'vue', 'express', 'mongodb', 'mysql', 
            'postgresql', 'git', 'agile', 'scrum', 'linux', 'html', 'css', 
            'typescript', 'php', 'ruby', 'go', 'rust', 'c++', 'c#', '.net',
            'spring', 'django', 'flask', 'laravel', 'rails', 'tensorflow', 
            'pytorch', 'machine learning', 'ai', 'data science', 'analytics'
        ]
        
        # Extract from key phrases
        for phrase in key_phrases:
            phrase_text = phrase['Text'].lower()
            if any(keyword in phrase_text for keyword in skill_keywords):
                skills.append(phrase['Text'])
        
        # Extract from raw text (look for skills section)
        text_lower = text.lower()
        if 'skills' in text_lower:
            # Find skills section and extract comma-separated values
            skills_start = text_lower.find('skills')
            if skills_start != -1:
                skills_section = text[skills_start:skills_start + 500]  # Get next 500 chars
                # Split by common separators and clean up
                potential_skills = []
                for separator in [',', '\n', '|', ';']:
                    parts = skills_section.split(separator)
                    for part in parts:
                        part = part.strip()
                        if len(part) > 2 and len(part) < 50:  # Reasonable skill length
                            potential_skills.append(part)
                
                # Filter for known skills
                for skill in potential_skills:
                    if any(keyword in skill.lower() for keyword in skill_keywords):
                        skills.append(skill)
        
        # Calculate overall score based on various factors
        overall_score = calculate_overall_score(text, skills, job_titles, organizations)
        
        return {
            'skills': list(set(skills))[:20],  # Top 20 unique skills
            'jobTitles': list(set(job_titles))[:10],
            'organizations': list(set(organizations))[:10],
            'keyPhrases': [phrase['Text'] for phrase in key_phrases[:15]],
            'sentiment': sentiment_response.get('Sentiment', 'NEUTRAL'),
            'sentimentScore': {k: Decimal(str(v)) for k, v in sentiment_response.get('SentimentScore', {}).items()},
            'overallScore': Decimal(str(overall_score)),  # Ensure Decimal type
            'experience': extract_experience_info(text),
            'education': extract_education_info(text)
        }
        
    except Exception as e:
        logger.error(f"Error in NLP analysis: {str(e)}")
        return {
            'skills': [],
            'jobTitles': [],
            'organizations': [],
            'keyPhrases': [],
            'sentiment': 'NEUTRAL',
            'sentimentScore': {},
            'overallScore': Decimal('50'),
            'experience': [],
            'education': []
        }

def calculate_overall_score(text, skills, job_titles, organizations):
    """Calculate overall score based on content quality and completeness"""
    score = 50  # Base score
    
    # Skills boost
    if len(skills) > 0:
        score += min(len(skills) * 2, 20)
    
    # Job titles boost
    if len(job_titles) > 0:
        score += min(len(job_titles) * 3, 15)
    
    # Organizations boost
    if len(organizations) > 0:
        score += min(len(organizations) * 2, 10)
    
    # Content length boost
    if len(text) > 1000:
        score += 5
    
    return min(score, 100)

def extract_experience_info(text):
    """Extract experience information from text"""
    experience = []
    lines = text.split('\n')
    
    for line in lines:
        line = line.strip()
        if any(keyword in line.lower() for keyword in ['years', 'experience', 'worked at', 'position']):
            experience.append(line)
    
    return experience[:5]

def extract_education_info(text):
    """Extract education information from text"""
    education = []
    lines = text.split('\n')
    
    for line in lines:
        line = line.strip()
        if any(keyword in line.lower() for keyword in ['university', 'college', 'degree', 'bachelor', 'master', 'phd']):
            education.append(line)
    
    return education[:5]

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

