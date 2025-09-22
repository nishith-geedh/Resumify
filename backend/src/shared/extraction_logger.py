"""
Text Extraction Logging Utilities

This module provides structured logging for text extraction processes
to help with debugging and monitoring.
"""

import json
import logging
import os
from datetime import datetime
from typing import Dict, Any, Optional
from enum import Enum

class LogLevel(Enum):
    """Log levels for text extraction events"""
    DEBUG = "DEBUG"
    INFO = "INFO"
    WARNING = "WARNING"
    ERROR = "ERROR"
    CRITICAL = "CRITICAL"

class ExtractionLogger:
    """Structured logger for text extraction events"""
    
    def __init__(self, logger_name: str = "text_extraction"):
        self.logger = logging.getLogger(logger_name)
        self.logger.setLevel(logging.INFO)
        
        # Create formatter for structured logging
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        
        # Console handler
        if not self.logger.handlers:
            console_handler = logging.StreamHandler()
            console_handler.setFormatter(formatter)
            self.logger.addHandler(console_handler)
    
    def log_extraction_start(self, candidate_id: str, file_info: Dict[str, Any]):
        """Log the start of text extraction process"""
        log_data = {
            'event': 'extraction_start',
            'candidate_id': candidate_id,
            'file_name': file_info.get('fileName'),
            'file_size': file_info.get('fileSize'),
            'file_type': file_info.get('fileType'),
            'extraction_method': self._determine_extraction_method(file_info.get('fileName', '')),
            'timestamp': datetime.utcnow().isoformat()
        }
        
        self.logger.info(f"Text extraction started for candidate {candidate_id}", extra=log_data)
    
    def log_textract_job_created(self, candidate_id: str, job_id: str, s3_key: str):
        """Log Textract job creation"""
        log_data = {
            'event': 'textract_job_created',
            'candidate_id': candidate_id,
            'textract_job_id': job_id,
            's3_key': s3_key,
            'timestamp': datetime.utcnow().isoformat()
        }
        
        self.logger.info(f"Textract job created: {job_id}", extra=log_data)
    
    def log_textract_job_completed(self, candidate_id: str, job_id: str, text_length: int, page_count: int = None):
        """Log successful Textract job completion"""
        log_data = {
            'event': 'textract_job_completed',
            'candidate_id': candidate_id,
            'textract_job_id': job_id,
            'extracted_text_length': text_length,
            'page_count': page_count,
            'timestamp': datetime.utcnow().isoformat()
        }
        
        self.logger.info(f"Textract job completed successfully: {job_id}", extra=log_data)
    
    def log_textract_job_failed(self, candidate_id: str, job_id: str, error_message: str, status_message: str = None):
        """Log Textract job failure"""
        log_data = {
            'event': 'textract_job_failed',
            'candidate_id': candidate_id,
            'textract_job_id': job_id,
            'error_message': error_message,
            'status_message': status_message,
            'timestamp': datetime.utcnow().isoformat()
        }
        
        self.logger.error(f"Textract job failed: {job_id}", extra=log_data)
    
    def log_docx_txt_processing(self, candidate_id: str, file_name: str, text_length: int, processing_time: float = None):
        """Log DOCX/TXT processing completion"""
        log_data = {
            'event': 'docx_txt_processed',
            'candidate_id': candidate_id,
            'file_name': file_name,
            'extracted_text_length': text_length,
            'processing_time_seconds': processing_time,
            'timestamp': datetime.utcnow().isoformat()
        }
        
        self.logger.info(f"DOCX/TXT processing completed for {file_name}", extra=log_data)
    
    def log_extraction_error(self, candidate_id: str, error_type: str, error_message: str, context: Dict[str, Any] = None):
        """Log text extraction error"""
        log_data = {
            'event': 'extraction_error',
            'candidate_id': candidate_id,
            'error_type': error_type,
            'error_message': error_message,
            'context': context or {},
            'timestamp': datetime.utcnow().isoformat()
        }
        
        self.logger.error(f"Text extraction error: {error_type}", extra=log_data)
    
    def log_analysis_update(self, candidate_id: str, analysis_id: str, status: str, has_extracted_text: bool):
        """Log analysis record update"""
        log_data = {
            'event': 'analysis_updated',
            'candidate_id': candidate_id,
            'analysis_id': analysis_id,
            'status': status,
            'has_extracted_text': has_extracted_text,
            'timestamp': datetime.utcnow().isoformat()
        }
        
        self.logger.info(f"Analysis record updated: {analysis_id}", extra=log_data)
    
    def log_retry_attempt(self, candidate_id: str, retry_count: int, reason: str):
        """Log retry attempt"""
        log_data = {
            'event': 'extraction_retry',
            'candidate_id': candidate_id,
            'retry_count': retry_count,
            'reason': reason,
            'timestamp': datetime.utcnow().isoformat()
        }
        
        self.logger.warning(f"Text extraction retry attempt {retry_count}", extra=log_data)
    
    def log_performance_metrics(self, candidate_id: str, metrics: Dict[str, Any]):
        """Log performance metrics for text extraction"""
        log_data = {
            'event': 'extraction_metrics',
            'candidate_id': candidate_id,
            'metrics': metrics,
            'timestamp': datetime.utcnow().isoformat()
        }
        
        self.logger.info(f"Text extraction metrics for {candidate_id}", extra=log_data)
    
    def log_fallback_triggered(self, candidate_id: str, fallback_type: str, reason: str):
        """Log when fallback behavior is triggered"""
        log_data = {
            'event': 'fallback_triggered',
            'candidate_id': candidate_id,
            'fallback_type': fallback_type,
            'reason': reason,
            'timestamp': datetime.utcnow().isoformat()
        }
        
        self.logger.warning(f"Fallback triggered: {fallback_type}", extra=log_data)
    
    def _determine_extraction_method(self, file_name: str) -> str:
        """Determine extraction method based on file extension"""
        if not file_name:
            return 'unknown'
        
        extension = file_name.lower().split('.')[-1] if '.' in file_name else ''
        
        if extension == 'pdf':
            return 'textract'
        elif extension in ['docx', 'doc']:
            return 'docx_worker'
        elif extension == 'txt':
            return 'txt_worker'
        else:
            return 'unknown'

# Global logger instance
extraction_logger = ExtractionLogger()

def log_extraction_event(event_type: str, candidate_id: str, **kwargs):
    """Convenience function for logging extraction events"""
    log_data = {
        'event': event_type,
        'candidate_id': candidate_id,
        'timestamp': datetime.utcnow().isoformat(),
        **kwargs
    }
    
    extraction_logger.logger.info(f"Extraction event: {event_type}", extra=log_data)

def log_extraction_error_simple(candidate_id: str, error_message: str, **kwargs):
    """Convenience function for logging extraction errors"""
    log_data = {
        'event': 'extraction_error',
        'candidate_id': candidate_id,
        'error_message': error_message,
        'timestamp': datetime.utcnow().isoformat(),
        **kwargs
    }
    
    extraction_logger.logger.error(f"Extraction error for {candidate_id}: {error_message}", extra=log_data)

def create_debug_report(candidate_id: str, context: Dict[str, Any]) -> Dict[str, Any]:
    """Create a debug report for troubleshooting"""
    return {
        'candidate_id': candidate_id,
        'timestamp': datetime.utcnow().isoformat(),
        'context': context,
        'environment': {
            'aws_region': os.environ.get('AWS_REGION', 'unknown'),
            'lambda_function_name': os.environ.get('AWS_LAMBDA_FUNCTION_NAME', 'unknown'),
            'lambda_function_version': os.environ.get('AWS_LAMBDA_FUNCTION_VERSION', 'unknown')
        }
    }