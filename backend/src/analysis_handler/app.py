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
    """Retrieve and format analysis results for frontend"""
    try:
        # Handle CORS preflight request
        if event.get('httpMethod') == 'OPTIONS':
            return create_cors_response(200, {})
        
        logger.info(f"Analysis handler invoked with event: {json.dumps(event)}")
        
        # Get query parameters
        query_params = event.get('queryStringParameters') or {}
        candidate_id = query_params.get('candidateId')
        
        if candidate_id:
            # Get specific candidate analysis
            analysis_data = get_candidate_analysis(candidate_id)
            if analysis_data:
                return create_cors_response(200, analysis_data)
            else:
                return create_cors_response(404, {'error': 'Analysis not found'})
        else:
            # Get all analyses
            analyses_data = get_all_analyses()
            return create_cors_response(200, {'analyses': analyses_data})
        
                        except Exception as e:
        logger.error(f"Error in analysis handler: {str(e)}")
        return create_cors_response(500, {'error': str(e)})

def get_candidate_analysis(candidate_id):
    """Get analysis data for a specific candidate"""
    try:
        analyses_table = dynamodb.Table(ANALYSES_TABLE)
        
        # Query analysis by candidate ID
        response = analyses_table.query(
            IndexName='candidateId-index',
            KeyConditionExpression='candidateId = :candidate_id',
            ExpressionAttributeValues={':candidate_id': candidate_id}
        )
        
        if not response['Items']:
            return None
        
        analysis_record = response['Items'][0]
        
        # Get candidate info
        candidates_table = dynamodb.Table(CANDIDATES_TABLE)
        candidate_response = candidates_table.get_item(Key={'candidateId': candidate_id})
        candidate_data = candidate_response.get('Item', {})
        
        # Format response with real data from uploaded resume
        formatted_analysis = {
            'analysisId': analysis_record.get('analysisId'),
            'candidateId': candidate_id,
            'candidateName': candidate_data.get('name', 'Unknown'),
            'candidateEmail': candidate_data.get('email', 'Unknown'),
            'fileName': candidate_data.get('fileName', 'Unknown'),
            'uploadedAt': candidate_data.get('uploadedAt'),
            'status': analysis_record.get('status', 'processing'),
            'textExtractionStatus': analysis_record.get('textExtractionStatus', 'pending'),
            'extractedText': analysis_record.get('extractedText', ''),
            'skills': analysis_record.get('skills', []),
            'jobTitles': analysis_record.get('jobTitles', []),
            'experience': analysis_record.get('experience', []),
            'education': analysis_record.get('education', []),
            'overallScore': analysis_record.get('overallScore', 0),
            'organizations': analysis_record.get('organizations', []),
            'keyPhrases': analysis_record.get('keyPhrases', []),
            'sentiment': analysis_record.get('sentiment', 'NEUTRAL'),
            'createdAt': analysis_record.get('createdAt'),
            'updatedAt': analysis_record.get('updatedAt')
        }
        
        logger.info(f"Retrieved analysis for candidate: {candidate_id}")
        return formatted_analysis
        
    except Exception as e:
        logger.error(f"Error getting candidate analysis: {str(e)}")
        return None

def get_all_analyses():
    """Get all analysis records"""
    try:
        analyses_table = dynamodb.Table(ANALYSES_TABLE)
        
        # Scan all analyses
        response = analyses_table.scan()
        analyses = response.get('Items', [])
        
        # Format each analysis
        formatted_analyses = []
        for analysis in analyses:
            candidate_id = analysis.get('candidateId')
            
            # Get candidate info
            candidates_table = dynamodb.Table(CANDIDATES_TABLE)
            candidate_response = candidates_table.get_item(Key={'candidateId': candidate_id})
            candidate_data = candidate_response.get('Item', {})
            
            formatted_analysis = {
                'analysisId': analysis.get('analysisId'),
            'candidateId': candidate_id,
                'candidateName': candidate_data.get('name', 'Unknown'),
                'candidateEmail': candidate_data.get('email', 'Unknown'),
                'fileName': candidate_data.get('fileName', 'Unknown'),
                'uploadedAt': candidate_data.get('uploadedAt'),
                'status': analysis.get('status', 'processing'),
                'textExtractionStatus': analysis.get('textExtractionStatus', 'pending'),
                'overallScore': analysis.get('overallScore', 0),
                'skills': analysis.get('skills', [])[:5],  # Show top 5 skills
                'createdAt': analysis.get('createdAt'),
                'updatedAt': analysis.get('updatedAt')
            }
            formatted_analyses.append(formatted_analysis)
        
        # Sort by updated date (newest first)
        formatted_analyses.sort(key=lambda x: x.get('updatedAt', ''), reverse=True)
        
        logger.info(f"Retrieved {len(formatted_analyses)} analyses")
        return formatted_analyses
            
    except Exception as e:
        logger.error(f"Error getting all analyses: {str(e)}")
        return []

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