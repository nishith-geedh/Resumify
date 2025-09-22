import json
import boto3
import uuid
from datetime import datetime
from decimal import Decimal
import os

# Initialize AWS clients
region = boto3.Session().region_name or 'ap-south-1'
dynamodb = boto3.resource('dynamodb', region_name=region)
textract_client = boto3.client('textract', region_name=region)
lambda_client = boto3.client('lambda', region_name=region)

# Environment variables
CANDIDATES_TABLE = os.environ.get('CANDIDATES_TABLE', 'Resumify_Candidates_dev')
ANALYSES_TABLE = os.environ.get('ANALYSES_TABLE', 'Resumify_Analyses_dev')
NLP_PROCESSOR_FUNCTION = os.environ.get('NLP_PROCESSOR_FUNCTION')

def lambda_handler(event, context):
    """Handle Textract completion notifications"""
    try:
        print(f"Textract result handler invoked with event: {json.dumps(event)}")
        
        # Process SNS message
        for record in event['Records']:
            message = json.loads(record['Sns']['Message'])
            job_id = message['JobId']
            status = message['Status']
            
            print(f"Processing Textract job {job_id} with status: {status}")
            
            if status == 'SUCCEEDED':
                process_textract_results(job_id)
            else:
                print(f"Textract job {job_id} failed with status: {status}")
                # Update candidate status to failed
                update_candidate_status_failed(job_id)
                
    except Exception as e:
        print(f"Error processing Textract results: {str(e)}")
        raise e

def process_textract_results(job_id):
    """Process completed Textract job results"""
    try:
        print(f"Processing Textract results for job: {job_id}")
        
        # Get job results
        response = textract_client.get_document_text_detection(JobId=job_id)
        
        # Extract text from all pages
        text_blocks = []
        for block in response.get('Blocks', []):
            if block['BlockType'] == 'LINE':
                text_blocks.append(block['Text'])
        
        extracted_text = '\n'.join(text_blocks)
        print(f"Extracted text length: {len(extracted_text)} characters")
        
        # Find candidate by job ID
        candidates_table = dynamodb.Table(CANDIDATES_TABLE)
        print(f"Searching for candidate with textractJobId: {job_id}")
        
        response = candidates_table.scan(
            FilterExpression='textractJobId = :job_id',
            ExpressionAttributeValues={':job_id': job_id}
        )
        
        print(f"Scan response: {len(response['Items'])} items found")
        
        if response['Items']:
            candidate = response['Items'][0]
            candidate_id = candidate['candidateId']
            print(f"Found candidate: {candidate_id}")
            print(f"Candidate details: {candidate}")
            
            # Create analysis record with extracted text
            print(f"Creating analysis record for candidate: {candidate_id}")
            create_analysis_record(candidate_id, extracted_text)
            print(f"Analysis record created successfully")
            
            # Update candidate status
            print(f"Updating candidate {candidate_id} status to analyzed")
            candidates_table.update_item(
                Key={'candidateId': candidate_id},
                UpdateExpression='SET #status = :status, textExtractionStatus = :text_status',
                ExpressionAttributeNames={'#status': 'status'},
                ExpressionAttributeValues={
                    ':status': 'analyzed',
                    ':text_status': 'completed'
                }
            )
            
            print(f"Updated candidate {candidate_id} status to analyzed")
            
            # Trigger NLP processing
            print(f"Triggering NLP processing for candidate: {candidate_id}")
            trigger_nlp_processing(candidate_id)
            print(f"NLP processing triggered successfully")
            
            print(f"Successfully processed Textract results for candidate: {candidate_id}")
        else:
            print(f"No candidate found with Textract job ID: {job_id}")
        
    except Exception as e:
        print(f"Error processing Textract results: {str(e)}")
        raise e

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
    print(f"Analysis record created for candidate: {candidate_id}")

def update_candidate_status_failed(job_id):
    """Update candidate status to failed when Textract fails"""
    try:
        candidates_table = dynamodb.Table(CANDIDATES_TABLE)
        response = candidates_table.scan(
            FilterExpression='textractJobId = :job_id',
            ExpressionAttributeValues={':job_id': job_id}
        )
        
        if response['Items']:
            candidate = response['Items'][0]
            candidate_id = candidate['candidateId']
            
            candidates_table.update_item(
                Key={'candidateId': candidate_id},
                UpdateExpression='SET #status = :status, textExtractionStatus = :text_status',
                ExpressionAttributeNames={'#status': 'status'},
                ExpressionAttributeValues={
                    ':status': 'failed',
                    ':text_status': 'failed'
                }
            )
            
            print(f"Updated candidate {candidate_id} status to failed")
    except Exception as e:
        print(f"Error updating candidate status to failed: {str(e)}")

def trigger_nlp_processing(candidate_id):
    """Trigger NLP processing for the candidate"""
    try:
        if NLP_PROCESSOR_FUNCTION:
            payload = {'candidateId': candidate_id}
            
            response = lambda_client.invoke(
                FunctionName=NLP_PROCESSOR_FUNCTION,
                InvocationType='Event',
                Payload=json.dumps(payload)
            )
            
            print(f"NLP processing triggered for candidate: {candidate_id}")
        else:
            print("NLP_PROCESSOR_FUNCTION not configured")
            
    except Exception as e:
        print(f"Error triggering NLP processing: {str(e)}")