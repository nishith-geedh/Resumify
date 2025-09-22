import json
import boto3
import uuid
from datetime import datetime
import os
from botocore.exceptions import ClientError
import logging

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Initialize AWS clients
dynamodb = boto3.resource('dynamodb', region_name=os.environ['AWS_REGION'])
textract_client = boto3.client('textract', region_name=os.environ['AWS_REGION'])
lambda_client = boto3.client('lambda', region_name=os.environ['AWS_REGION'])

# Environment variables
CANDIDATES_TABLE = os.environ['CANDIDATES_TABLE']
ANALYSES_TABLE = os.environ['ANALYSES_TABLE']
RESUMES_BUCKET = os.environ['RESUMES_BUCKET']
NLP_HANDLER_FUNCTION = os.environ.get('NLP_HANDLER_FUNCTION')

def lambda_handler(event, context):
    """Handle Textract job completion and process results"""
    try:
        logger.info(f"Textract worker invoked with event: {json.dumps(event)}")
        
        # Handle Textract job completion event
        if 'jobId' in event:
            job_id = event['jobId']
            candidate_id = event.get('candidateId')
            
            # Get Textract results
            text_content = get_textract_results(job_id)
            
            if text_content:
                # Create analysis record
                create_analysis_record(candidate_id, text_content)
                
                # Update candidate status
                update_candidate_status(candidate_id, 'analyzed')
                
                # Trigger NLP processing
                if NLP_HANDLER_FUNCTION:
                    trigger_nlp_processing(candidate_id)
                
                logger.info(f"Successfully processed Textract job {job_id}")
            else:
                logger.error(f"No text extracted from Textract job {job_id}")
                update_candidate_status(candidate_id, 'failed')
        
        return {'statusCode': 200, 'body': 'Processing completed successfully'}
        
    except Exception as e:
        logger.error(f"Error in Textract worker: {str(e)}")
        return {'statusCode': 500, 'body': f'Error: {str(e)}'}

def get_textract_results(job_id):
    """Get text extraction results from Textract job"""
    try:
        # Get job status first
        response = textract_client.get_document_text_detection(JobId=job_id)
        
        if response['JobStatus'] != 'SUCCEEDED':
            logger.error(f"Textract job {job_id} failed with status: {response['JobStatus']}")
            return None
        
        # Extract text from blocks
        text_blocks = []
        for block in response['Blocks']:
            if block['BlockType'] == 'LINE':
                text_blocks.append(block['Text'])
        
        return '\n'.join(text_blocks)
        
    except ClientError as e:
        logger.error(f"Error getting Textract results: {str(e)}")
        return None

def create_analysis_record(candidate_id, text_content):
    """Create analysis record in DynamoDB"""
    analyses_table = dynamodb.Table(ANALYSES_TABLE)
    analysis_record = {
        'analysisId': str(uuid.uuid4()),
        'candidateId': candidate_id,
        'extractedText': text_content,
        'textExtractionStatus': 'completed',
        'status': 'processing',
        'createdAt': datetime.utcnow().isoformat(),
        'updatedAt': datetime.utcnow().isoformat()
    }
    analyses_table.put_item(Item=analysis_record)

def update_candidate_status(candidate_id, status):
    """Update candidate status"""
    candidates_table = dynamodb.Table(CANDIDATES_TABLE)
    candidates_table.update_item(
        Key={'candidateId': candidate_id},
        UpdateExpression='SET #status = :status, textExtractionStatus = :text_status',
        ExpressionAttributeNames={'#status': 'status'},
        ExpressionAttributeValues={
            ':status': status,
            ':text_status': 'completed' if status == 'analyzed' else 'failed'
        }
    )

def trigger_nlp_processing(candidate_id):
    """Trigger NLP processing for the extracted text"""
    try:
        payload = {
            'candidateId': candidate_id
        }
        
        response = lambda_client.invoke(
            FunctionName=NLP_HANDLER_FUNCTION,
            InvocationType='Event',  # Asynchronous
            Payload=json.dumps(payload)
        )
        
        logger.info(f"NLP processing triggered for candidate: {candidate_id}")
        
    except ClientError as e:
        logger.error(f"Error triggering NLP processing: {str(e)}")
