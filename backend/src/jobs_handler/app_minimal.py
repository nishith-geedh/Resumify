import json
import boto3
import uuid
import os
from datetime import datetime
from typing import Dict, Any
from decimal import Decimal

class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            return int(obj) if obj % 1 == 0 else float(obj)
        return super(DecimalEncoder, self).default(obj)

# Standard CORS headers
CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
}

def create_response(status_code: int, body: Dict[str, Any]) -> Dict[str, Any]:
    """Create standardized response with CORS headers"""
    headers = CORS_HEADERS.copy()
    headers['Content-Type'] = 'application/json'
    
    return {
        'statusCode': status_code,
        'headers': headers,
        'body': json.dumps(body, cls=DecimalEncoder)
    }

def lambda_handler(event: Dict[str, Any], context) -> Dict[str, Any]:
    """Handle CRUD operations for jobs"""
    try:
        http_method = event.get('httpMethod', 'GET')
        
        # Handle CORS preflight request
        if http_method == 'OPTIONS':
            return {
                'statusCode': 200,
                'headers': CORS_HEADERS,
                'body': ''
            }
        
        if http_method == 'GET':
            return get_jobs(event)
        elif http_method == 'POST':
            return create_job(event)
        else:
            return create_response(405, {
                'success': False,
                'error': 'Method not allowed'
            })
            
    except Exception as e:
        print(f"Error in jobs handler: {str(e)}")
        return create_response(500, {
            'success': False,
            'error': str(e)
        })

def get_jobs(event: Dict[str, Any]) -> Dict[str, Any]:
    """Get all jobs"""
    try:
        dynamodb = boto3.resource('dynamodb')
        JOBS_TABLE = os.environ.get('JOBS_TABLE', 'Resumify_Jobs_dev')
        jobs_table = dynamodb.Table(JOBS_TABLE)
        
        response = jobs_table.scan()
        jobs = response['Items']
        
        return create_response(200, {
            'success': True,
            'data': jobs
        })
        
    except Exception as e:
        print(f"Error getting jobs: {str(e)}")
        return create_response(500, {
            'success': False,
            'error': str(e)
        })

def create_job(event: Dict[str, Any]) -> Dict[str, Any]:
    """Create a new job"""
    try:
        body = json.loads(event['body']) if event.get('body') else {}
        
        # Validate required fields
        required_fields = ['title', 'company', 'location']
        for field in required_fields:
            if not body.get(field):
                return create_response(400, {
                    'success': False,
                    'error': f'Missing required field: {field}'
                })
        
        dynamodb = boto3.resource('dynamodb')
        JOBS_TABLE = os.environ.get('JOBS_TABLE', 'Resumify_Jobs_dev')
        jobs_table = dynamodb.Table(JOBS_TABLE)
        
        job_id = str(uuid.uuid4())
        
        # Parse required skills
        required_skills = []
        if body.get('requiredSkills'):
            if isinstance(body['requiredSkills'], list):
                required_skills = body['requiredSkills']
            else:
                required_skills = [skill.strip() for skill in body['requiredSkills'].split(',') if skill.strip()]
        
        job_data = {
            'jobId': job_id,
            'title': body['title'].strip(),
            'company': body['company'].strip(),
            'location': body['location'].strip(),
            'experienceRequired': body.get('experienceRequired', '').strip(),
            'salaryRange': body.get('salaryRange', '').strip(),
            'type': body.get('type', 'full-time'),
            'requiredSkills': required_skills,
            'description': body.get('description', '').strip(),
            'createdAt': datetime.utcnow().isoformat(),
            'updatedAt': datetime.utcnow().isoformat(),
            'status': 'active'
        }
        
        jobs_table.put_item(Item=job_data)
        
        return create_response(201, {
            'success': True,
            'data': job_data
        })
        
    except Exception as e:
        print(f"Error creating job: {str(e)}")
        return create_response(500, {
            'success': False,
            'error': str(e)
        })