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
region = boto3.Session().region_name or 'ap-south-1'
dynamodb = boto3.resource('dynamodb', region_name=region)
s3_client = boto3.client('s3', region_name=region)
lambda_client = boto3.client('lambda', region_name=region)

# Environment variables
CANDIDATES_TABLE = os.environ['CANDIDATES_TABLE']
ANALYSES_TABLE = os.environ['ANALYSES_TABLE']
RESUMES_BUCKET = os.environ['RESUMES_BUCKET']
NLP_PROCESSOR_FUNCTION = os.environ.get('NLP_PROCESSOR_FUNCTION')

def lambda_handler(event, context):
    """Process DOCX, DOC, and TXT files to extract text"""
    try:
        logger.info(f"DOCX worker invoked with event: {json.dumps(event)}")
        
        # Handle direct invocation (from upload handler)
        if 'candidateId' in event:
            candidate_id = event['candidateId']
            s3_key = event['s3Key']
            file_type = event['fileType']
            
            logger.info(f"Processing file: {s3_key} for candidate: {candidate_id}")
            
            # Download file from S3
            response = s3_client.get_object(Bucket=RESUMES_BUCKET, Key=s3_key)
            file_content = response['Body'].read()
            
            # Extract text based on file type
            if file_type == 'txt':
                text_content = file_content.decode('utf-8')
            elif file_type == 'docx':
                text_content = extract_docx_text(file_content)
            elif file_type == 'doc':
                text_content = extract_doc_text(file_content)
            else:
                raise ValueError(f"Unsupported file type: {file_type}")
            
            # Create analysis record
            create_analysis_record(candidate_id, text_content)
            
            # Update candidate status
            update_candidate_status(candidate_id, 'analyzed')
            
            # Trigger NLP processing
            trigger_nlp_processing(candidate_id)
            
            return {'statusCode': 200, 'body': 'Processing completed successfully'}
        
        # Handle S3 event (legacy)
        elif 'Records' in event:
            for record in event['Records']:
                bucket = record['s3']['bucket']['name']
                key = record['s3']['object']['key']
                
                # Extract candidate ID from S3 key pattern: resumes/{candidateId}/{filename}
                path_parts = key.split('/')
                if len(path_parts) >= 3 and path_parts[0] == 'resumes':
                    candidate_id = path_parts[1]
                    filename = path_parts[2]
                    file_type = filename.split('.')[-1].lower()
                    
                    # Download and process file
        response = s3_client.get_object(Bucket=bucket, Key=key)
        file_content = response['Body'].read()
        
                    if file_type == 'txt':
                        text_content = file_content.decode('utf-8')
                    elif file_type == 'docx':
                        text_content = extract_docx_text(file_content)
                    elif file_type == 'doc':
                        text_content = extract_doc_text(file_content)
        else:
                continue
        
                    create_analysis_record(candidate_id, text_content)
                    update_candidate_status(candidate_id, 'analyzed')
                    trigger_nlp_processing(candidate_id)
        
        return {'statusCode': 200, 'body': 'Processing completed successfully'}
        
    except Exception as e:
        logger.error(f"Error in DOCX worker: {str(e)}")
        return {'statusCode': 500, 'body': f'Error: {str(e)}'}

def extract_docx_text(file_content):
    """Extract text from DOCX file"""
    try:
        from docx import Document
        import io
        doc = Document(io.BytesIO(file_content))
        return '\n'.join([p.text for p in doc.paragraphs if p.text.strip()])
    except ImportError:
        raise ImportError("python-docx library is required")

def extract_doc_text(file_content):
    """Extract text from DOC file"""
    try:
        import subprocess
        import tempfile
        with tempfile.NamedTemporaryFile(suffix='.doc', delete=False) as f:
            f.write(file_content)
            result = subprocess.run(['antiword', f.name], capture_output=True, text=True)
            os.unlink(f.name)
            return result.stdout
    except FileNotFoundError:
        raise ImportError("Antiword binary is required")

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
    """Trigger NLP processing for the candidate"""
    try:
        if NLP_PROCESSOR_FUNCTION:
            payload = {'candidateId': candidate_id}
            
            response = lambda_client.invoke(
                FunctionName=NLP_PROCESSOR_FUNCTION,
                InvocationType='Event',  # Asynchronous
                Payload=json.dumps(payload)
            )
            
            logger.info(f"NLP processing triggered for candidate: {candidate_id}")
        else:
            logger.warning("NLP_PROCESSOR_FUNCTION not configured")
            
    except ClientError as e:
        logger.error(f"Error triggering NLP processing: {str(e)}")