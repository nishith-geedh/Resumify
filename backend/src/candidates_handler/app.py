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
CANDIDATES_TABLE = os.environ['CANDIDATES_TABLE']
ANALYSES_TABLE = os.environ['ANALYSES_TABLE']

def lambda_handler(event, context):
    """Retrieve candidate information with real-time data"""
    try:
        # Handle CORS preflight request
        if event.get('httpMethod') == 'OPTIONS':
            return create_cors_response(200, {})
        
        logger.info(f"Candidates handler invoked with event: {json.dumps(event)}")
        
        # Get all candidates with their analysis status
        candidates_data = get_all_candidates_with_status()
        
        return create_cors_response(200, {'candidates': candidates_data})
        
    except Exception as e:
        logger.error(f"Error in candidates handler: {str(e)}")
        return create_cors_response(500, {'error': str(e)})

def get_all_candidates_with_status():
    """Get all candidates with their processing status"""
    try:
        candidates_table = dynamodb.Table(CANDIDATES_TABLE)
        
        # Scan all candidates
        response = candidates_table.scan()
        candidates = response.get('Items', [])
        
        # Get analysis status for each candidate
        analyses_table = dynamodb.Table(ANALYSES_TABLE)
        
        formatted_candidates = []
        for candidate in candidates:
            candidate_id = candidate.get('candidateId')
            
            # Check if analysis exists
            analysis_response = analyses_table.query(
                IndexName='candidateId-index',
                KeyConditionExpression='candidateId = :candidate_id',
                ExpressionAttributeValues={':candidate_id': candidate_id}
            )
            
            analysis_data = analysis_response['Items'][0] if analysis_response['Items'] else None
            
            # Format candidate data with real-time status
            formatted_candidate = {
                    'candidateId': candidate_id,
                'name': candidate.get('name', 'Unknown'),
                'email': candidate.get('email', 'Unknown'),
                'fileName': candidate.get('fileName', 'Unknown'),
                'fileType': candidate.get('fileType', 'Unknown'),
                'uploadedAt': candidate.get('uploadedAt'),
                'status': candidate.get('status', 'uploaded'),
                'textExtractionStatus': candidate.get('textExtractionStatus', 'pending'),
                'textractJobId': candidate.get('textractJobId'),
                's3Key': candidate.get('s3Key'),
                'hasAnalysis': analysis_data is not None,
                'analysisStatus': analysis_data.get('status', 'processing') if analysis_data else 'pending',
                'overallScore': analysis_data.get('overallScore', 0) if analysis_data else 0,
                'skillsCount': len(analysis_data.get('skills', [])) if analysis_data else 0,
                'updatedAt': candidate.get('updatedAt', candidate.get('uploadedAt'))
            }
            formatted_candidates.append(formatted_candidate)
        
        # Sort by upload date (newest first)
        formatted_candidates.sort(key=lambda x: x.get('uploadedAt') or x.get('createdAt') or '', reverse=True)
        
        logger.info(f"Retrieved {len(formatted_candidates)} candidates")
        return formatted_candidates
                
            except Exception as e:
        logger.error(f"Error getting candidates with status: {str(e)}")
        return []

def convert_decimals(obj):
    """Convert Decimal objects to float for JSON serialization"""
    if isinstance(obj, Decimal):
        return float(obj)
    elif isinstance(obj, dict):
        return {key: convert_decimals(value) for key, value in obj.items()}
    elif isinstance(obj, list):
        return [convert_decimals(item) for item in obj]
    return obj

def create_cors_response(status_code, body):
    """Create CORS-enabled response"""
    return {
        'statusCode': status_code,
        'headers': {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
            'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
            'Content-Type': 'application/json'
        },
        'body': json.dumps(convert_decimals(body))
    }