import json
import boto3
import os
from typing import Dict, Any
from boto3.dynamodb.conditions import Key
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
    """Calculate and return job matches for a candidate"""
    try:
        # Handle CORS preflight request
        if event.get('httpMethod') == 'OPTIONS':
            return {
                'statusCode': 200,
                'headers': CORS_HEADERS,
                'body': ''
            }
        
        # Parse query parameters
        query_params = event.get('queryStringParameters', {}) or {}
        candidate_id = query_params.get('candidateId')
        
        if not candidate_id:
            return create_response(400, {
                'success': False,
                'error': 'candidateId is required'
            })
        
        dynamodb = boto3.resource('dynamodb')
        ANALYSES_TABLE = os.environ.get('ANALYSES_TABLE', 'Resumify_Analyses_dev')
        JOBS_TABLE = os.environ.get('JOBS_TABLE', 'Resumify_Jobs_dev')
        
        analyses_table = dynamodb.Table(ANALYSES_TABLE)
        jobs_table = dynamodb.Table(JOBS_TABLE)
        
        # Get candidate analysis
        try:
            analysis_response = analyses_table.query(
                IndexName='candidateId-index',
                KeyConditionExpression=Key('candidateId').eq(candidate_id),
                ScanIndexForward=False,
                Limit=1
            )
        except Exception as e:
            print(f"Error querying analysis: {str(e)}")
            return create_response(500, {
                'success': False,
                'error': f'Error retrieving candidate analysis: {str(e)}'
            })
        
        if not analysis_response['Items']:
            return create_response(404, {
                'success': False,
                'error': 'No analysis found for candidate. Please upload and analyze a resume first.'
            })
        
        # Get jobs
        try:
            jobs_response = jobs_table.scan()
            jobs = jobs_response['Items']
        except Exception as e:
            print(f"Error scanning jobs: {str(e)}")
            return create_response(500, {
                'success': False,
                'error': f'Error retrieving jobs: {str(e)}'
            })
        
        if not jobs:
            return create_response(200, {
                'success': True,
                'data': [],
                'message': 'No jobs available for matching'
            })
        
        # For now, return a simple response with basic job info
        # In a real implementation, this would calculate match scores
        matches = []
        for job in jobs[:5]:  # Limit to 5 jobs for now
            match_data = {
                'jobId': job['jobId'],
                'title': job['title'],
                'company': job.get('company', 'Unknown'),
                'location': job.get('location', 'Remote'),
                'matchPercent': 75,  # Placeholder match score
                'matchedSkills': [],
                'jobType': job.get('type', 'Full-time'),
                'description': job.get('description', 'No description available'),
                'requiredSkills': job.get('requiredSkills', [])
            }
            matches.append(match_data)
        
        return create_response(200, {
            'success': True,
            'data': matches,
            'totalMatches': len(matches),
            'candidateId': candidate_id
        })
        
    except Exception as e:
        print(f"Error in matches handler: {str(e)}")
        return create_response(500, {
            'success': False,
            'error': str(e)
        })