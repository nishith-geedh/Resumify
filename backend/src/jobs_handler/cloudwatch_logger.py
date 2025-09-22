"""
Comprehensive CloudWatch Logging System for Resumify

This module provides structured logging with performance metrics tracking
for all Lambda functions in the Resumify application.
"""

import json
import logging
import os
import time
from datetime import datetime
from typing import Dict, Any, Optional, List
from enum import Enum
from functools import wraps
import boto3
from botocore.exceptions import ClientError

class LogLevel(Enum):
    """Standard log levels"""
    DEBUG = "DEBUG"
    INFO = "INFO" 
    WARNING = "WARNING"
    ERROR = "ERROR"
    CRITICAL = "CRITICAL"

class EventType(Enum):
    """Event types for structured logging"""
    FUNCTION_START = "function_start"
    FUNCTION_END = "function_end"
    FUNCTION_ERROR = "function_error"
    UPLOAD_START = "upload_start"
    UPLOAD_SUCCESS = "upload_success"
    UPLOAD_ERROR = "upload_error"
    TEXTRACT_JOB_START = "textract_job_start"
    TEXTRACT_JOB_SUCCESS = "textract_job_success"
    TEXTRACT_JOB_ERROR = "textract_job_error"
    TEXT_EXTRACTION_START = "text_extraction_start"
    TEXT_EXTRACTION_SUCCESS = "text_extraction_success"
    TEXT_EXTRACTION_ERROR = "text_extraction_error"
    ANALYSIS_START = "analysis_start"
    ANALYSIS_SUCCESS = "analysis_success"
    ANALYSIS_ERROR = "analysis_error"
    MATCHING_START = "matching_start"
    MATCHING_SUCCESS = "matching_success"
    MATCHING_ERROR = "matching_error"
    DATABASE_OPERATION = "database_operation"
    EXTERNAL_API_CALL = "external_api_call"
    PERFORMANCE_METRIC = "performance_metric"

class CloudWatchLogger:
    """Centralized CloudWatch logger with structured logging and metrics"""
    
    def __init__(self, function_name: str = None):
        self.function_name = function_name or os.environ.get('AWS_LAMBDA_FUNCTION_NAME', 'unknown')
        self.logger = logging.getLogger(self.function_name)
        self.logger.setLevel(logging.INFO)
        
        # Create structured formatter
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        
        # Ensure we have a handler
        if not self.logger.handlers:
            console_handler = logging.StreamHandler()
            console_handler.setFormatter(formatter)
            self.logger.addHandler(console_handler)
        
        # CloudWatch client for custom metrics
        self.cloudwatch = boto3.client('cloudwatch')
        
        # Performance tracking
        self.start_times = {}
        self.metrics_buffer = []
    
    def log_structured(self, level: LogLevel, event_type: EventType, message: str, 
                      candidate_id: str = None, **kwargs):
        """Log structured event with consistent format"""
        log_data = {
            'timestamp': datetime.utcnow().isoformat(),
            'function_name': self.function_name,
            'event_type': event_type.value,
            'log_message': message,  # Renamed from 'message' to avoid conflict
            'candidate_id': candidate_id,
            'aws_request_id': kwargs.get('aws_request_id'),
            'correlation_id': kwargs.get('correlation_id'),
            **kwargs
        }
        
        # Remove None values
        log_data = {k: v for k, v in log_data.items() if v is not None}
        
        # Log with appropriate level
        log_message = f"[{event_type.value}] {message}"
        
        if level == LogLevel.DEBUG:
            self.logger.debug(log_message, extra=log_data)
        elif level == LogLevel.INFO:
            self.logger.info(log_message, extra=log_data)
        elif level == LogLevel.WARNING:
            self.logger.warning(log_message, extra=log_data)
        elif level == LogLevel.ERROR:
            self.logger.error(log_message, extra=log_data)
        elif level == LogLevel.CRITICAL:
            self.logger.critical(log_message, extra=log_data)
    
    def log_function_start(self, event: Dict[str, Any], context, candidate_id: str = None):
        """Log Lambda function start"""
        self.start_times[context.aws_request_id] = time.time()
        
        self.log_structured(
            LogLevel.INFO,
            EventType.FUNCTION_START,
            f"Function {self.function_name} started",
            candidate_id=candidate_id,
            aws_request_id=context.aws_request_id,
            remaining_time_ms=context.get_remaining_time_in_millis(),
            memory_limit_mb=context.memory_limit_in_mb,
            http_method=event.get('httpMethod'),
            resource_path=event.get('resource'),
            user_agent=event.get('headers', {}).get('User-Agent'),
            source_ip=event.get('requestContext', {}).get('identity', {}).get('sourceIp')
        )
    
    def log_function_end(self, context, candidate_id: str = None, success: bool = True, 
                        result_summary: Dict[str, Any] = None):
        """Log Lambda function completion"""
        request_id = context.aws_request_id
        duration_ms = None
        
        if request_id in self.start_times:
            duration_ms = (time.time() - self.start_times[request_id]) * 1000
            del self.start_times[request_id]
        
        self.log_structured(
            LogLevel.INFO,
            EventType.FUNCTION_END,
            f"Function {self.function_name} completed",
            candidate_id=candidate_id,
            aws_request_id=request_id,
            duration_ms=duration_ms,
            success=success,
            remaining_time_ms=context.get_remaining_time_in_millis(),
            result_summary=result_summary
        )
        
        # Send performance metric to CloudWatch
        if duration_ms:
            self.send_performance_metric('FunctionDuration', duration_ms, 'Milliseconds')
            self.send_performance_metric('FunctionSuccess' if success else 'FunctionError', 1, 'Count')
    
    def log_function_error(self, context, error: Exception, candidate_id: str = None, 
                          error_context: Dict[str, Any] = None):
        """Log Lambda function error"""
        request_id = context.aws_request_id
        duration_ms = None
        
        if request_id in self.start_times:
            duration_ms = (time.time() - self.start_times[request_id]) * 1000
            del self.start_times[request_id]
        
        self.log_structured(
            LogLevel.ERROR,
            EventType.FUNCTION_ERROR,
            f"Function {self.function_name} error: {str(error)}",
            candidate_id=candidate_id,
            aws_request_id=request_id,
            duration_ms=duration_ms,
            error_type=type(error).__name__,
            error_message=str(error),
            error_context=error_context,
            remaining_time_ms=context.get_remaining_time_in_millis()
        )
        
        # Send error metric to CloudWatch
        self.send_performance_metric('FunctionError', 1, 'Count')
        if duration_ms:
            self.send_performance_metric('ErrorDuration', duration_ms, 'Milliseconds')
    
    def log_upload_event(self, event_type: EventType, candidate_id: str, file_info: Dict[str, Any] = None,
                        processing_time_ms: float = None, error: str = None):
        """Log upload-related events"""
        self.log_structured(
            LogLevel.INFO if event_type != EventType.UPLOAD_ERROR else LogLevel.ERROR,
            event_type,
            f"Upload event: {event_type.value}",
            candidate_id=candidate_id,
            file_name=file_info.get('fileName') if file_info else None,
            file_size=file_info.get('fileSize') if file_info else None,
            file_type=file_info.get('fileType') if file_info else None,
            processing_time_ms=processing_time_ms,
            error_message=error
        )
        
        # Send metrics
        if processing_time_ms:
            self.send_performance_metric('UploadProcessingTime', processing_time_ms, 'Milliseconds')
        
        if event_type == EventType.UPLOAD_SUCCESS:
            self.send_performance_metric('UploadSuccess', 1, 'Count')
        elif event_type == EventType.UPLOAD_ERROR:
            self.send_performance_metric('UploadError', 1, 'Count')
    
    def log_textract_event(self, event_type: EventType, candidate_id: str, job_id: str = None,
                          processing_time_ms: float = None, text_length: int = None, 
                          page_count: int = None, error: str = None):
        """Log Textract-related events"""
        self.log_structured(
            LogLevel.INFO if 'ERROR' not in event_type.value else LogLevel.ERROR,
            event_type,
            f"Textract event: {event_type.value}",
            candidate_id=candidate_id,
            textract_job_id=job_id,
            processing_time_ms=processing_time_ms,
            extracted_text_length=text_length,
            page_count=page_count,
            error_message=error
        )
        
        # Send metrics
        if processing_time_ms:
            self.send_performance_metric('TextractProcessingTime', processing_time_ms, 'Milliseconds')
        
        if text_length:
            self.send_performance_metric('ExtractedTextLength', text_length, 'Count')
        
        if event_type == EventType.TEXTRACT_JOB_SUCCESS:
            self.send_performance_metric('TextractSuccess', 1, 'Count')
        elif event_type == EventType.TEXTRACT_JOB_ERROR:
            self.send_performance_metric('TextractError', 1, 'Count')
    
    def log_analysis_event(self, event_type: EventType, candidate_id: str, analysis_id: str = None,
                          processing_time_ms: float = None, skills_count: int = None,
                          overall_score: float = None, error: str = None):
        """Log analysis-related events"""
        self.log_structured(
            LogLevel.INFO if 'ERROR' not in event_type.value else LogLevel.ERROR,
            event_type,
            f"Analysis event: {event_type.value}",
            candidate_id=candidate_id,
            analysis_id=analysis_id,
            processing_time_ms=processing_time_ms,
            skills_extracted=skills_count,
            overall_score=overall_score,
            error_message=error
        )
        
        # Send metrics
        if processing_time_ms:
            self.send_performance_metric('AnalysisProcessingTime', processing_time_ms, 'Milliseconds')
        
        if skills_count:
            self.send_performance_metric('SkillsExtracted', skills_count, 'Count')
        
        if overall_score:
            self.send_performance_metric('OverallScore', overall_score, 'None')
        
        if event_type == EventType.ANALYSIS_SUCCESS:
            self.send_performance_metric('AnalysisSuccess', 1, 'Count')
        elif event_type == EventType.ANALYSIS_ERROR:
            self.send_performance_metric('AnalysisError', 1, 'Count')
    
    def log_matching_event(self, event_type: EventType, candidate_id: str, 
                          processing_time_ms: float = None, matches_found: int = None,
                          top_match_score: float = None, error: str = None):
        """Log job matching events"""
        self.log_structured(
            LogLevel.INFO if 'ERROR' not in event_type.value else LogLevel.ERROR,
            event_type,
            f"Matching event: {event_type.value}",
            candidate_id=candidate_id,
            processing_time_ms=processing_time_ms,
            matches_found=matches_found,
            top_match_score=top_match_score,
            error_message=error
        )
        
        # Send metrics
        if processing_time_ms:
            self.send_performance_metric('MatchingProcessingTime', processing_time_ms, 'Milliseconds')
        
        if matches_found:
            self.send_performance_metric('MatchesFound', matches_found, 'Count')
        
        if top_match_score:
            self.send_performance_metric('TopMatchScore', top_match_score, 'None')
        
        if event_type == EventType.MATCHING_SUCCESS:
            self.send_performance_metric('MatchingSuccess', 1, 'Count')
        elif event_type == EventType.MATCHING_ERROR:
            self.send_performance_metric('MatchingError', 1, 'Count')
    
    def log_database_operation(self, operation: str, table_name: str, candidate_id: str = None,
                              processing_time_ms: float = None, success: bool = True, 
                              error: str = None):
        """Log database operations"""
        self.log_structured(
            LogLevel.INFO if success else LogLevel.ERROR,
            EventType.DATABASE_OPERATION,
            f"Database {operation} on {table_name}",
            candidate_id=candidate_id,
            operation=operation,
            table_name=table_name,
            processing_time_ms=processing_time_ms,
            success=success,
            error_message=error
        )
        
        # Send metrics
        if processing_time_ms:
            self.send_performance_metric(f'Database{operation.title()}Time', processing_time_ms, 'Milliseconds')
        
        metric_name = f'Database{operation.title()}Success' if success else f'Database{operation.title()}Error'
        self.send_performance_metric(metric_name, 1, 'Count')
    
    def log_external_api_call(self, api_name: str, endpoint: str = None, candidate_id: str = None,
                             processing_time_ms: float = None, success: bool = True,
                             status_code: int = None, error: str = None):
        """Log external API calls"""
        self.log_structured(
            LogLevel.INFO if success else LogLevel.ERROR,
            EventType.EXTERNAL_API_CALL,
            f"External API call to {api_name}",
            candidate_id=candidate_id,
            api_name=api_name,
            endpoint=endpoint,
            processing_time_ms=processing_time_ms,
            success=success,
            status_code=status_code,
            error_message=error
        )
        
        # Send metrics
        if processing_time_ms:
            self.send_performance_metric(f'{api_name}ApiCallTime', processing_time_ms, 'Milliseconds')
        
        metric_name = f'{api_name}ApiSuccess' if success else f'{api_name}ApiError'
        self.send_performance_metric(metric_name, 1, 'Count')
    
    def send_performance_metric(self, metric_name: str, value: float, unit: str = 'Count'):
        """Send custom metric to CloudWatch"""
        try:
            self.cloudwatch.put_metric_data(
                Namespace='Resumify/Lambda',
                MetricData=[
                    {
                        'MetricName': metric_name,
                        'Value': value,
                        'Unit': unit,
                        'Dimensions': [
                            {
                                'Name': 'FunctionName',
                                'Value': self.function_name
                            }
                        ],
                        'Timestamp': datetime.utcnow()
                    }
                ]
            )
        except ClientError as e:
            self.logger.warning(f"Failed to send CloudWatch metric {metric_name}: {str(e)}")
    
    def track_performance(self, operation_name: str):
        """Decorator to track performance of operations"""
        def decorator(func):
            @wraps(func)
            def wrapper(*args, **kwargs):
                start_time = time.time()
                success = True
                error = None
                
                try:
                    result = func(*args, **kwargs)
                    return result
                except Exception as e:
                    success = False
                    error = str(e)
                    raise
                finally:
                    duration_ms = (time.time() - start_time) * 1000
                    
                    self.log_structured(
                        LogLevel.INFO if success else LogLevel.ERROR,
                        EventType.PERFORMANCE_METRIC,
                        f"Performance tracking for {operation_name}",
                        operation_name=operation_name,
                        duration_ms=duration_ms,
                        success=success,
                        error_message=error
                    )
                    
                    # Send performance metric
                    self.send_performance_metric(f'{operation_name}Duration', duration_ms, 'Milliseconds')
                    metric_name = f'{operation_name}Success' if success else f'{operation_name}Error'
                    self.send_performance_metric(metric_name, 1, 'Count')
            
            return wrapper
        return decorator

# Global logger instances for each function
upload_logger = CloudWatchLogger('upload-handler')
analysis_logger = CloudWatchLogger('analysis-handler')
matches_logger = CloudWatchLogger('matches-handler')
textract_logger = CloudWatchLogger('textract-result-handler')
textract_worker_logger = CloudWatchLogger('textract-worker')
docx_txt_worker_logger = CloudWatchLogger('docx-txt-worker')
nlp_processor_logger = CloudWatchLogger('nlp-processor')
jobs_logger = CloudWatchLogger('jobs-handler')

def get_logger(function_name: str = None) -> CloudWatchLogger:
    """Get logger instance for a specific function"""
    if not function_name:
        function_name = os.environ.get('AWS_LAMBDA_FUNCTION_NAME', 'unknown')
    
    # Return existing logger if available
    logger_map = {
        'upload-handler': upload_logger,
        'analysis-handler': analysis_logger,
        'matches-handler': matches_logger,
        'textract-result-handler': textract_logger,
        'textract-worker': textract_worker_logger,
        'docx-txt-worker': docx_txt_worker_logger,
        'nlp-processor': nlp_processor_logger,
        'jobs-handler': jobs_logger
    }
    
    return logger_map.get(function_name, CloudWatchLogger(function_name))

def log_lambda_handler(func):
    """Decorator to automatically log Lambda handler start/end/error"""
    @wraps(func)
    def wrapper(event, context):
        logger = get_logger()
        candidate_id = None
        
        # Try to extract candidate ID from event
        try:
            if 'queryStringParameters' in event and event['queryStringParameters']:
                candidate_id = event['queryStringParameters'].get('candidateId')
            elif 'body' in event and event['body']:
                body = json.loads(event['body']) if isinstance(event['body'], str) else event['body']
                candidate_id = body.get('candidateId')
        except:
            pass
        
        logger.log_function_start(event, context, candidate_id)
        
        try:
            result = func(event, context)
            
            # Extract result summary
            result_summary = {}
            if isinstance(result, dict) and 'body' in result:
                try:
                    body = json.loads(result['body']) if isinstance(result['body'], str) else result['body']
                    result_summary = {
                        'success': body.get('success'),
                        'status_code': result.get('statusCode'),
                        'data_keys': list(body.get('data', {}).keys()) if isinstance(body.get('data'), dict) else None
                    }
                except:
                    result_summary = {'status_code': result.get('statusCode')}
            
            logger.log_function_end(context, candidate_id, True, result_summary)
            return result
            
        except Exception as e:
            logger.log_function_error(context, e, candidate_id)
            raise
    
    return wrapper