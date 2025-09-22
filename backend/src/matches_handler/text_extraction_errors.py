"""
Text Extraction Error Handling Utilities

This module provides comprehensive error handling for text extraction failures
across different document types and processing methods.
"""

import logging
from enum import Enum
from typing import Dict, Any, Optional, Tuple
from datetime import datetime

# Configure logging for text extraction errors
logger = logging.getLogger(__name__)

class TextExtractionErrorType(Enum):
    """Enumeration of text extraction error types"""
    TEXTRACT_JOB_FAILED = "textract_job_failed"
    TEXTRACT_TIMEOUT = "textract_timeout"
    TEXTRACT_INVALID_JOB = "textract_invalid_job"
    TEXTRACT_SERVICE_ERROR = "textract_service_error"
    DOCUMENT_CORRUPTED = "document_corrupted"
    DOCUMENT_ENCRYPTED = "document_encrypted"
    DOCUMENT_TOO_LARGE = "document_too_large"
    UNSUPPORTED_FORMAT = "unsupported_format"
    NETWORK_ERROR = "network_error"
    PERMISSION_DENIED = "permission_denied"
    PROCESSING_TIMEOUT = "processing_timeout"
    EMPTY_DOCUMENT = "empty_document"
    UNKNOWN_ERROR = "unknown_error"

class TextExtractionError:
    """Represents a text extraction error with detailed information"""
    
    def __init__(self, 
                 error_type: TextExtractionErrorType,
                 message: str,
                 technical_details: str = None,
                 retry_possible: bool = True,
                 suggested_action: str = None):
        self.error_type = error_type
        self.message = message
        self.technical_details = technical_details
        self.retry_possible = retry_possible
        self.suggested_action = suggested_action
        self.timestamp = datetime.utcnow().isoformat()

    def to_dict(self) -> Dict[str, Any]:
        """Convert error to dictionary for storage/API response"""
        return {
            'errorType': self.error_type.value,
            'message': self.message,
            'technicalDetails': self.technical_details,
            'retryPossible': self.retry_possible,
            'suggestedAction': self.suggested_action,
            'timestamp': self.timestamp
        }

class TextExtractionErrorHandler:
    """Handles text extraction errors and provides user-friendly messages"""
    
    # Error message templates for different error types
    ERROR_MESSAGES = {
        TextExtractionErrorType.TEXTRACT_JOB_FAILED: {
            'user_message': 'Text extraction failed due to document processing issues.',
            'suggested_action': 'Try uploading a different version of the document or convert it to a different format.',
            'retry_possible': True
        },
        TextExtractionErrorType.TEXTRACT_TIMEOUT: {
            'user_message': 'Text extraction timed out. The document may be too large or complex.',
            'suggested_action': 'Try uploading a smaller document or split large documents into smaller sections.',
            'retry_possible': True
        },
        TextExtractionErrorType.TEXTRACT_INVALID_JOB: {
            'user_message': 'Text extraction job expired or was invalid.',
            'suggested_action': 'Please upload the document again to restart the extraction process.',
            'retry_possible': True
        },
        TextExtractionErrorType.TEXTRACT_SERVICE_ERROR: {
            'user_message': 'AWS Textract service is temporarily unavailable.',
            'suggested_action': 'This is usually temporary. Please try again in a few minutes.',
            'retry_possible': True
        },
        TextExtractionErrorType.DOCUMENT_CORRUPTED: {
            'user_message': 'The document appears to be corrupted or damaged.',
            'suggested_action': 'Try opening the document in its native application and re-saving it, then upload again.',
            'retry_possible': False
        },
        TextExtractionErrorType.DOCUMENT_ENCRYPTED: {
            'user_message': 'The document is password-protected or encrypted.',
            'suggested_action': 'Remove password protection from the document and upload again.',
            'retry_possible': False
        },
        TextExtractionErrorType.DOCUMENT_TOO_LARGE: {
            'user_message': 'The document is too large for processing.',
            'suggested_action': 'Please use a document smaller than 10MB or compress the file.',
            'retry_possible': False
        },
        TextExtractionErrorType.UNSUPPORTED_FORMAT: {
            'user_message': 'The document format is not supported.',
            'suggested_action': 'Please use PDF, DOCX, or TXT format.',
            'retry_possible': False
        },
        TextExtractionErrorType.NETWORK_ERROR: {
            'user_message': 'Network connection error occurred during processing.',
            'suggested_action': 'Check your internet connection and try again.',
            'retry_possible': True
        },
        TextExtractionErrorType.PERMISSION_DENIED: {
            'user_message': 'Access denied while processing the document.',
            'suggested_action': 'Ensure the document is not restricted and try again.',
            'retry_possible': True
        },
        TextExtractionErrorType.PROCESSING_TIMEOUT: {
            'user_message': 'Document processing timed out.',
            'suggested_action': 'Try uploading a smaller or simpler document.',
            'retry_possible': True
        },
        TextExtractionErrorType.EMPTY_DOCUMENT: {
            'user_message': 'No text content was found in the document.',
            'suggested_action': 'Ensure the document contains selectable text, not just images or scanned content.',
            'retry_possible': False
        },
        TextExtractionErrorType.UNKNOWN_ERROR: {
            'user_message': 'An unexpected error occurred during text extraction.',
            'suggested_action': 'Please try again or contact support if the problem persists.',
            'retry_possible': True
        }
    }

    @classmethod
    def classify_error(cls, error_message: str, error_context: Dict[str, Any] = None) -> TextExtractionErrorType:
        """
        Classify an error based on the error message and context
        
        Args:
            error_message: The error message to classify
            error_context: Additional context about the error
            
        Returns:
            TextExtractionErrorType: The classified error type
        """
        if not error_message:
            return TextExtractionErrorType.UNKNOWN_ERROR
            
        error_lower = error_message.lower()
        
        # Textract-specific errors
        if 'textract' in error_lower:
            if 'invalid' in error_lower or 'expired' in error_lower:
                return TextExtractionErrorType.TEXTRACT_INVALID_JOB
            elif 'timeout' in error_lower or 'timed out' in error_lower:
                return TextExtractionErrorType.TEXTRACT_TIMEOUT
            elif 'failed' in error_lower:
                return TextExtractionErrorType.TEXTRACT_JOB_FAILED
            else:
                return TextExtractionErrorType.TEXTRACT_SERVICE_ERROR
        
        # Document-related errors
        if any(keyword in error_lower for keyword in ['corrupt', 'damaged', 'invalid format']):
            return TextExtractionErrorType.DOCUMENT_CORRUPTED
        
        if any(keyword in error_lower for keyword in ['password', 'encrypted', 'protected']):
            return TextExtractionErrorType.DOCUMENT_ENCRYPTED
        
        if any(keyword in error_lower for keyword in ['too large', 'size limit', 'file size']):
            return TextExtractionErrorType.DOCUMENT_TOO_LARGE
        
        if any(keyword in error_lower for keyword in ['unsupported', 'format not supported']):
            return TextExtractionErrorType.UNSUPPORTED_FORMAT
        
        if 'empty' in error_lower or 'no text' in error_lower:
            return TextExtractionErrorType.EMPTY_DOCUMENT
        
        # Network and service errors
        if any(keyword in error_lower for keyword in ['network', 'connection', 'timeout']):
            if 'timeout' in error_lower:
                return TextExtractionErrorType.PROCESSING_TIMEOUT
            else:
                return TextExtractionErrorType.NETWORK_ERROR
        
        if any(keyword in error_lower for keyword in ['permission', 'access denied', 'forbidden']):
            return TextExtractionErrorType.PERMISSION_DENIED
        
        return TextExtractionErrorType.UNKNOWN_ERROR

    @classmethod
    def create_error(cls, error_message: str, error_context: Dict[str, Any] = None) -> TextExtractionError:
        """
        Create a TextExtractionError from an error message and context
        
        Args:
            error_message: The raw error message
            error_context: Additional context about the error
            
        Returns:
            TextExtractionError: A structured error object
        """
        error_type = cls.classify_error(error_message, error_context)
        error_info = cls.ERROR_MESSAGES.get(error_type, cls.ERROR_MESSAGES[TextExtractionErrorType.UNKNOWN_ERROR])
        
        return TextExtractionError(
            error_type=error_type,
            message=error_info['user_message'],
            technical_details=error_message,
            retry_possible=error_info['retry_possible'],
            suggested_action=error_info['suggested_action']
        )

    @classmethod
    def handle_textract_error(cls, textract_response: Dict[str, Any]) -> TextExtractionError:
        """
        Handle Textract-specific errors
        
        Args:
            textract_response: The response from Textract API
            
        Returns:
            TextExtractionError: A structured error object
        """
        job_status = textract_response.get('JobStatus', 'UNKNOWN')
        status_message = textract_response.get('StatusMessage', 'No details available')
        
        if job_status == 'FAILED':
            error_message = f"Textract job failed: {status_message}"
            error_type = cls.classify_error(error_message)
            error_info = cls.ERROR_MESSAGES.get(error_type, cls.ERROR_MESSAGES[TextExtractionErrorType.TEXTRACT_JOB_FAILED])
            
            return TextExtractionError(
                error_type=error_type,
                message=error_info['user_message'],
                technical_details=error_message,
                retry_possible=error_info['retry_possible'],
                suggested_action=error_info['suggested_action']
            )
        
        return cls.create_error(f"Unexpected Textract status: {job_status}")

    @classmethod
    def log_error(cls, error: TextExtractionError, candidate_id: str = None, additional_context: Dict[str, Any] = None):
        """
        Log text extraction error with structured information
        
        Args:
            error: The TextExtractionError to log
            candidate_id: Optional candidate ID for context
            additional_context: Additional context to include in log
        """
        log_data = {
            'event': 'text_extraction_error',
            'error_type': error.error_type.value,
            'message': error.message,
            'technical_details': error.technical_details,
            'retry_possible': error.retry_possible,
            'timestamp': error.timestamp
        }
        
        if candidate_id:
            log_data['candidate_id'] = candidate_id
            
        if additional_context:
            log_data.update(additional_context)
        
        logger.error(f"Text extraction error: {error.error_type.value}", extra=log_data)

def get_fallback_behavior(error_type: TextExtractionErrorType) -> Dict[str, Any]:
    """
    Get fallback behavior for different error types
    
    Args:
        error_type: The type of error that occurred
        
    Returns:
        Dict containing fallback behavior configuration
    """
    fallback_behaviors = {
        TextExtractionErrorType.TEXTRACT_JOB_FAILED: {
            'show_manual_input': True,
            'allow_retry': True,
            'suggest_format_conversion': True
        },
        TextExtractionErrorType.TEXTRACT_TIMEOUT: {
            'show_manual_input': True,
            'allow_retry': True,
            'suggest_file_splitting': True
        },
        TextExtractionErrorType.DOCUMENT_CORRUPTED: {
            'show_manual_input': True,
            'allow_retry': False,
            'suggest_file_repair': True
        },
        TextExtractionErrorType.DOCUMENT_ENCRYPTED: {
            'show_manual_input': True,
            'allow_retry': False,
            'suggest_password_removal': True
        },
        TextExtractionErrorType.DOCUMENT_TOO_LARGE: {
            'show_manual_input': True,
            'allow_retry': False,
            'suggest_file_compression': True
        },
        TextExtractionErrorType.EMPTY_DOCUMENT: {
            'show_manual_input': True,
            'allow_retry': False,
            'suggest_content_check': True
        }
    }
    
    return fallback_behaviors.get(error_type, {
        'show_manual_input': True,
        'allow_retry': True,
        'suggest_contact_support': True
    })

def format_error_for_api(error: TextExtractionError) -> Dict[str, Any]:
    """
    Format error for API response
    
    Args:
        error: The TextExtractionError to format
        
    Returns:
        Dict formatted for API response
    """
    fallback = get_fallback_behavior(error.error_type)
    
    return {
        'success': False,
        'error': {
            'type': error.error_type.value,
            'message': error.message,
            'suggestedAction': error.suggested_action,
            'retryPossible': error.retry_possible,
            'fallbackOptions': fallback,
            'timestamp': error.timestamp
        },
        'technicalDetails': error.technical_details if error.technical_details else None
    }

def create_extraction_status_update(candidate_id: str, status: str, error: TextExtractionError = None) -> Dict[str, Any]:
    """
    Create a status update for text extraction
    
    Args:
        candidate_id: The candidate ID
        status: The extraction status ('pending', 'completed', 'failed')
        error: Optional error information
        
    Returns:
        Dict containing status update information
    """
    update_data = {
        'candidateId': candidate_id,
        'textExtractionStatus': status,
        'updatedAt': datetime.utcnow().isoformat()
    }
    
    if error:
        update_data.update({
            'textExtractionError': error.to_dict(),
            'extractedText': None
        })
    
    return update_data