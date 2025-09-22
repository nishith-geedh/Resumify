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
    """Handle jobs operations"""
    try:
        # Handle CORS preflight request
        if event.get('httpMethod') == 'OPTIONS':
            return create_cors_response(200, {})
        
        logger.info(f"Jobs handler invoked with event: {json.dumps(event)}")
        
        http_method = event.get('httpMethod', 'GET')
        
        if http_method == 'GET':
            return get_jobs()
        elif http_method == 'POST':
            return create_job(event)
        elif http_method == 'PUT':
            return update_job(event)
        elif http_method == 'DELETE':
            return delete_job(event)
        else:
            return create_cors_response(405, {'error': 'Method not allowed'})
        
    except Exception as e:
        logger.error(f"Error in jobs handler: {str(e)}")
        return create_cors_response(500, {'error': str(e)})

def get_jobs():
    """Get all jobs"""
    try:
        jobs_table = dynamodb.Table(JOBS_TABLE)
        response = jobs_table.scan()
        
        jobs = response.get('Items', [])
        
        return create_cors_response(200, {
            'jobs': jobs,
            'count': len(jobs)
        })
        
    except Exception as e:
        logger.error(f"Error getting jobs: {str(e)}")
        return create_cors_response(500, {'error': str(e)})

def create_job(event):
    """Create a new job"""
    try:
        body = json.loads(event['body'])
        
        job_id = f"job_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}_{len(body.get('title', ''))}"
        
        job_data = {
            'jobId': job_id,
            'title': body.get('title', ''),
            'company': body.get('company', ''),
            'location': body.get('location', ''),
            'description': body.get('description', ''),
            'requirements': body.get('requirements', []),
            'skills': body.get('skills', []),
            'experience': body.get('experience', ''),
            'salary': body.get('salary', ''),
            'type': body.get('type', 'full-time'),
            'status': 'active',
            'createdAt': datetime.utcnow().isoformat(),
            'updatedAt': datetime.utcnow().isoformat()
        }
        
        jobs_table = dynamodb.Table(JOBS_TABLE)
        jobs_table.put_item(Item=job_data)
        
        return create_cors_response(201, {
            'message': 'Job created successfully',
            'job': job_data
        })
        
    except Exception as e:
        logger.error(f"Error creating job: {str(e)}")
        return create_cors_response(500, {'error': str(e)})

def delete_job(event):
    """Delete a job by ID"""
    try:
        # Extract job ID from path parameters
        job_id = event.get('pathParameters', {}).get('jobId')
        
        if not job_id:
            return create_cors_response(400, {'error': 'Job ID is required'})
        
        jobs_table = dynamodb.Table(JOBS_TABLE)
        
        # Check if job exists
        response = jobs_table.get_item(Key={'jobId': job_id})
        if 'Item' not in response:
            return create_cors_response(404, {'error': 'Job not found'})
        
        # Delete the job
        jobs_table.delete_item(Key={'jobId': job_id})
        
        return create_cors_response(200, {
            'message': 'Job deleted successfully',
            'jobId': job_id
        })
        
    except Exception as e:
        logger.error(f"Error deleting job: {str(e)}")
        return create_cors_response(500, {'error': str(e)})

def update_job(event):
    """Update a job by ID"""
    try:
        # Extract job ID from path parameters
        job_id = event.get('pathParameters', {}).get('jobId')
        
        if not job_id:
            return create_cors_response(400, {'error': 'Job ID is required'})
        
        # Parse request body
        body = json.loads(event.get('body', '{}'))
        
        if not body:
            return create_cors_response(400, {'error': 'Request body is required'})
        
        jobs_table = dynamodb.Table(JOBS_TABLE)
        
        # Check if job exists
        response = jobs_table.get_item(Key={'jobId': job_id})
        if 'Item' not in response:
            return create_cors_response(404, {'error': 'Job not found'})
        
        existing_job = response['Item']
        
        # Prepare updated job data
        updated_job = {
            'jobId': job_id,
            'title': body.get('title', existing_job.get('title', '')),
            'company': body.get('company', existing_job.get('company', '')),
            'location': body.get('location', existing_job.get('location', '')),
            'description': body.get('description', existing_job.get('description', '')),
            'requirements': body.get('requirements', existing_job.get('requirements', [])),
            'skills': body.get('skills', existing_job.get('skills', [])),
            'experience': body.get('experience', existing_job.get('experience', '')),
            'salary': body.get('salary', existing_job.get('salary', '')),
            'type': body.get('type', existing_job.get('type', 'full-time')),
            'status': existing_job.get('status', 'active'),  # Keep existing status
            'createdAt': existing_job.get('createdAt'),  # Keep original creation date
            'updatedAt': datetime.utcnow().isoformat()
        }
        
        # Update the job
        jobs_table.put_item(Item=updated_job)
        
        return create_cors_response(200, {
            'message': 'Job updated successfully',
            'job': updated_job
        })
        
    except Exception as e:
        logger.error(f"Error updating job: {str(e)}")
        return create_cors_response(500, {'error': str(e)})

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