import json
import boto3
import base64
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
textract_client = boto3.client('textract', region_name=region)

# Environment variables
CANDIDATES_TABLE = os.environ['CANDIDATES_TABLE']
ANALYSES_TABLE = os.environ['ANALYSES_TABLE']
RESUMES_BUCKET = os.environ['RESUMES_BUCKET']
DOCX_WORKER_FUNCTION = os.environ.get('DOCX_WORKER_FUNCTION')
NLP_PROCESSOR_FUNCTION = os.environ.get('NLP_PROCESSOR_FUNCTION')

def lambda_handler(event, context):
    """
    Handle file uploads and initiate processing
    """
    try:
        # Handle CORS preflight request
        if event.get('httpMethod') == 'OPTIONS':
            return create_cors_response(200, {})
        
        logger.info(f"Upload handler invoked with method: {event.get('httpMethod')}")
        
        # Parse request body
        if event.get('isBase64Encoded', False):
            body = base64.b64decode(event['body']).decode('utf-8')
        else:
            body = event['body']
        
        request_data = json.loads(body)
        
        # Extract file data and metadata - decode base64 directly for binary files
        file_content = base64.b64decode(request_data['file'])
        file_name = request_data['filename']
        candidate_name = request_data.get('name', 'Unknown')
        candidate_email = request_data.get('email', 'unknown@example.com')
        file_type = request_data.get('fileType', file_name.split('.')[-1].lower())
        
        # Debug logging
        logger.info(f"File type: {file_type}, File size: {len(file_content)} bytes")
        logger.info(f"File name: {file_name}, Candidate: {candidate_name}")
        
        # Validate file type
        allowed_types = ['pdf', 'docx', 'doc', 'txt']
        if file_type not in allowed_types:
            return create_cors_response(400, {
                'success': False,
                'error': f'Unsupported file type: {file_type}. Allowed types: {allowed_types}'
            })
        
        # Validate file size (10MB limit)
        if len(file_content) > 10 * 1024 * 1024:
            return create_cors_response(400, {
                'success': False,
                'error': 'File size exceeds 10MB limit'
            })
        
        # Generate unique candidate ID
        candidate_id = str(uuid.uuid4())
        
        # Create S3 key
        s3_key = f"resumes/{candidate_id}/{file_name}"
        
        # Upload file to S3
        s3_client.put_object(
            Bucket=RESUMES_BUCKET,
            Key=s3_key,
            Body=file_content,
            ContentType=get_content_type(file_type)
        )
        
        logger.info(f"File uploaded to S3: {s3_key}")
        
        # Create candidate record
        candidates_table = dynamodb.Table(CANDIDATES_TABLE)
        candidate_record = {
            'candidateId': candidate_id,
            'name': candidate_name,
            'email': candidate_email,
            'fileName': file_name,
            'fileType': file_type,
            'uploadedAt': datetime.utcnow().isoformat(),
            'status': 'uploaded',
            'textExtractionStatus': 'pending',
            's3Key': s3_key
        }
        
        candidates_table.put_item(Item=candidate_record)
        logger.info(f"Candidate record created: {candidate_id}")
        
        # Process based on file type
        if file_type == 'txt':
            # Process TXT files directly
            text_content = file_content.decode('utf-8')
            create_analysis_record(candidate_id, text_content, 'completed')
            update_candidate_status(candidate_id, 'analyzed')
            # Trigger NLP processing
            trigger_nlp_processing(candidate_id)
            
        elif file_type in ['docx', 'doc']:
            # Create basic analysis record immediately
            create_basic_analysis_record(candidate_id, file_name, file_type, 'processing')
            # Invoke DOCX/DOC worker
            if DOCX_WORKER_FUNCTION:
                invoke_docx_worker(candidate_id, s3_key, file_type)
            else:
                logger.error("DOCX_WORKER_FUNCTION not configured")
                update_candidate_status(candidate_id, 'failed')
                
        elif file_type == 'pdf':
            # Create basic analysis record immediately to prevent 404 errors
            create_basic_analysis_record(candidate_id, file_name, file_type, 'processing')
            # Start Textract job - will update analysis record when complete
            start_textract_job(candidate_id, s3_key)
        
        return create_cors_response(200, {
            'success': True,
            'message': 'File uploaded successfully',
            'data': {
                'candidateId': candidate_id,
                'status': 'processing'
            }
        })
        
    except Exception as e:
        logger.error(f"Error in upload handler: {str(e)}")
        return create_cors_response(500, {
            'success': False,
            'error': 'Internal server error',
            'message': str(e)
        })

def get_content_type(file_type):
    """Get content type based on file extension"""
    content_types = {
        'pdf': 'application/pdf',
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'doc': 'application/msword',
        'txt': 'text/plain'
    }
    return content_types.get(file_type, 'application/octet-stream')

def create_analysis_record(candidate_id, text_content, status):
    """Create analysis record in DynamoDB"""
    analyses_table = dynamodb.Table(ANALYSES_TABLE)
    analysis_record = {
        'analysisId': str(uuid.uuid4()),
        'candidateId': candidate_id,
        'extractedText': text_content,
        'textExtractionStatus': status,
        'status': 'processing',
        'createdAt': datetime.utcnow().isoformat(),
        'updatedAt': datetime.utcnow().isoformat()
    }
    
    analyses_table.put_item(Item=analysis_record)
    logger.info(f"Analysis record created for candidate: {candidate_id}")

def create_basic_analysis_record(candidate_id, file_name, file_type, status):
    """Create basic analysis record for non-TXT files"""
    from decimal import Decimal
    
    analyses_table = dynamodb.Table(ANALYSES_TABLE)
    analysis_record = {
        'analysisId': str(uuid.uuid4()),
        'candidateId': candidate_id,
        'extractedText': f"{file_type.upper()} file: {file_name}\n\nProcessing in progress...",
        'textExtractionStatus': status,
        'status': 'processing',
        'skills': [],
        'jobTitles': [],
        'organizations': [],
        'experience': {
            'totalYears': Decimal('0'),
            'currentRole': 'Unknown',
            'previousRoles': []
        },
        'education': {
            'degree': 'Unknown',
            'university': 'Unknown',
            'graduationYear': Decimal('0')
        },
        'overallScore': Decimal('0'),
        'sentimentScore': {
            'positive': Decimal('0.5'),
            'negative': Decimal('0.2'),
            'neutral': Decimal('0.3'),
            'mixed': Decimal('0.0')
        },
        'createdAt': datetime.utcnow().isoformat(),
        'updatedAt': datetime.utcnow().isoformat()
    }
    
    analyses_table.put_item(Item=analysis_record)
    logger.info(f"Basic analysis record created for candidate: {candidate_id} ({file_type})")

def update_candidate_status(candidate_id, status):
    """Update candidate status"""
    candidates_table = dynamodb.Table(CANDIDATES_TABLE)
    candidates_table.update_item(
        Key={'candidateId': candidate_id},
        UpdateExpression='SET #status = :status',
        ExpressionAttributeNames={'#status': 'status'},
        ExpressionAttributeValues={':status': status}
    )

def invoke_docx_worker(candidate_id, s3_key, file_type):
    """Invoke DOCX worker function"""
    try:
        payload = {
            'candidateId': candidate_id,
            's3Key': s3_key,
            'fileType': file_type
        }
        
        response = lambda_client.invoke(
            FunctionName=DOCX_WORKER_FUNCTION,
            InvocationType='Event',  # Asynchronous
            Payload=json.dumps(payload)
        )
        
        logger.info(f"DOCX worker invoked for candidate: {candidate_id}")
        
    except ClientError as e:
        logger.error(f"Error invoking DOCX worker: {str(e)}")
        update_candidate_status(candidate_id, 'failed')

def start_textract_job(candidate_id, s3_key):
    """Start Textract document analysis job with SNS notification"""
    try:
        logger.info(f"Starting Textract job for candidate: {candidate_id}, S3 key: {s3_key}")
        
        # Create or get SNS topic for Textract notifications
        sns_topic_arn = create_or_get_sns_topic()
        logger.info(f"SNS topic ARN: {sns_topic_arn}")
        
        if sns_topic_arn:
            logger.info(f"Starting Textract with SNS notification, role: {TEXTTRACT_ROLE_ARN}")
            response = textract_client.start_document_text_detection(
                DocumentLocation={
                    'S3Object': {
                        'Bucket': RESUMES_BUCKET,
                        'Name': s3_key
                    }
                },
                NotificationChannel={
                    'SNSTopicArn': sns_topic_arn,
                    'RoleArn': TEXTTRACT_ROLE_ARN
                },
                JobTag=candidate_id
            )
        else:
            logger.info("Starting Textract without SNS notification")
            # Fallback without SNS notification
            response = textract_client.start_document_text_detection(
                DocumentLocation={
                    'S3Object': {
                        'Bucket': RESUMES_BUCKET,
                        'Name': s3_key
                    }
                }
            )
        
        job_id = response['JobId']
        logger.info(f"Textract job started successfully: {job_id}")
        
        # Update candidate record with Textract job ID
        candidates_table = dynamodb.Table(CANDIDATES_TABLE)
        logger.info(f"Updating candidate record {candidate_id} with job ID: {job_id}")
        
        candidates_table.update_item(
            Key={'candidateId': candidate_id},
            UpdateExpression='SET textractJobId = :job_id, textExtractionStatus = :status, #status = :candidate_status',
            ExpressionAttributeNames={'#status': 'status'},
            ExpressionAttributeValues={
                ':job_id': job_id,
                ':status': 'processing',
                ':candidate_status': 'processing'
            }
        )
        
        logger.info(f"Successfully updated candidate {candidate_id} with Textract job ID: {job_id}")
        
    except ClientError as e:
        logger.error(f"Error starting Textract job: {str(e)}")
        logger.error(f"Error details: {e.response}")
        update_candidate_status(candidate_id, 'failed')
    except Exception as e:
        logger.error(f"Unexpected error in start_textract_job: {str(e)}")
        update_candidate_status(candidate_id, 'failed')

def create_or_get_sns_topic():
    """Create or get SNS topic for Textract notifications"""
    try:
        sns_client = boto3.client('sns', region_name=region)
        topic_name = 'resumify-textract-dev'
        
        # Try to get existing topic
        try:
            response = sns_client.create_topic(Name=topic_name)
            topic_arn = response['TopicArn']
            logger.info(f"Using SNS topic: {topic_arn}")
        except:
            # Create new topic
            response = sns_client.create_topic(Name=topic_name)
            topic_arn = response['TopicArn']
            logger.info(f"Created new SNS topic: {topic_arn}")
        
        return topic_arn
        
    except Exception as e:
        logger.error(f"Error creating SNS topic: {str(e)}")
        return None

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
        'body': json.dumps(body)
    }
