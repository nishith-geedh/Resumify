"""
CORS utilities for standardized CORS handling across all Lambda functions
"""

import json
from typing import Dict, Any, Optional

# Standard CORS headers for all API responses
CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
}

def get_cors_headers() -> Dict[str, str]:
    """
    Get standard CORS headers for API responses
    
    Returns:
        Dict containing standard CORS headers
    """
    return CORS_HEADERS.copy()

def create_cors_response(
    status_code: int,
    body: Dict[str, Any],
    additional_headers: Optional[Dict[str, str]] = None
) -> Dict[str, Any]:
    """
    Create a standardized API response with CORS headers
    
    Args:
        status_code: HTTP status code
        body: Response body dictionary
        additional_headers: Optional additional headers to include
        
    Returns:
        Complete API Gateway response with CORS headers
    """
    headers = get_cors_headers()
    headers['Content-Type'] = 'application/json'
    
    if additional_headers:
        headers.update(additional_headers)
    
    return {
        'statusCode': status_code,
        'headers': headers,
        'body': json.dumps(body)
    }

def create_options_response() -> Dict[str, Any]:
    """
    Create a standardized OPTIONS response for CORS preflight requests
    
    Returns:
        Complete OPTIONS response with CORS headers
    """
    return {
        'statusCode': 200,
        'headers': get_cors_headers(),
        'body': ''
    }

def create_error_response(
    status_code: int,
    error_message: str,
    error_details: Optional[str] = None
) -> Dict[str, Any]:
    """
    Create a standardized error response with CORS headers
    
    Args:
        status_code: HTTP status code
        error_message: Main error message
        error_details: Optional additional error details
        
    Returns:
        Complete error response with CORS headers
    """
    body = {
        'success': False,
        'error': error_message
    }
    
    if error_details:
        body['details'] = error_details
    
    return create_cors_response(status_code, body)

def create_success_response(
    data: Any,
    status_code: int = 200,
    message: Optional[str] = None
) -> Dict[str, Any]:
    """
    Create a standardized success response with CORS headers
    
    Args:
        data: Response data
        status_code: HTTP status code (default: 200)
        message: Optional success message
        
    Returns:
        Complete success response with CORS headers
    """
    body = {
        'success': True,
        'data': data
    }
    
    if message:
        body['message'] = message
    
    return create_cors_response(status_code, body)

def handle_cors_preflight(event: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Handle CORS preflight OPTIONS requests
    
    Args:
        event: Lambda event object
        
    Returns:
        OPTIONS response if this is a preflight request, None otherwise
    """
    if event.get('httpMethod') == 'OPTIONS':
        return create_options_response()
    return None