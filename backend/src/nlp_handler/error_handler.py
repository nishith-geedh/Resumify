"""
Standardized error handling utilities for Lambda functions
"""

import json
import logging
from typing import Dict, Any, Optional
from cors_utils import create_error_response

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

class APIError(Exception):
    """Custom exception for API errors with status codes"""
    
    def __init__(self, message: str, status_code: int = 500, details: Optional[str] = None):
        self.message = message
        self.status_code = status_code
        self.details = details
        super().__init__(self.message)

def handle_lambda_error(func):
    """
    Decorator to handle Lambda function errors with standardized responses
    """
    def wrapper(event: Dict[str, Any], context) -> Dict[str, Any]:
        try:
            return func(event, context)
        except APIError as e:
            logger.error(f"API Error in {func.__name__}: {e.message}")
            if e.details:
                logger.error(f"Error details: {e.details}")
            return create_error_response(e.status_code, e.message, e.details)
        except Exception as e:
            logger.error(f"Unexpected error in {func.__name__}: {str(e)}")
            return create_error_response(500, "Internal server error", str(e))
    
    return wrapper

def validate_required_fields(data: Dict[str, Any], required_fields: list) -> None:
    """
    Validate that required fields are present in the data
    
    Args:
        data: Data dictionary to validate
        required_fields: List of required field names
        
    Raises:
        APIError: If any required field is missing
    """
    missing_fields = []
    for field in required_fields:
        if not data.get(field):
            missing_fields.append(field)
    
    if missing_fields:
        raise APIError(
            f"Missing required fields: {', '.join(missing_fields)}",
            status_code=400
        )

def validate_query_parameter(event: Dict[str, Any], param_name: str, required: bool = True) -> Optional[str]:
    """
    Validate and extract a query parameter from the event
    
    Args:
        event: Lambda event object
        param_name: Name of the query parameter
        required: Whether the parameter is required
        
    Returns:
        Parameter value or None if not required and not present
        
    Raises:
        APIError: If required parameter is missing
    """
    query_params = event.get('queryStringParameters', {}) or {}
    value = query_params.get(param_name)
    
    if required and not value:
        raise APIError(f"Missing required query parameter: {param_name}", status_code=400)
    
    return value

def parse_json_body(event: Dict[str, Any]) -> Dict[str, Any]:
    """
    Parse JSON body from Lambda event
    
    Args:
        event: Lambda event object
        
    Returns:
        Parsed JSON data
        
    Raises:
        APIError: If body is missing or invalid JSON
    """
    body = event.get('body')
    if not body:
        raise APIError("Request body is required", status_code=400)
    
    try:
        if isinstance(body, str):
            return json.loads(body)
        return body
    except json.JSONDecodeError as e:
        raise APIError("Invalid JSON in request body", status_code=400, details=str(e))

def log_api_call(function_name: str, event: Dict[str, Any], response: Dict[str, Any]) -> None:
    """
    Log API call details for monitoring and debugging
    
    Args:
        function_name: Name of the Lambda function
        event: Lambda event object
        response: Response object
    """
    method = event.get('httpMethod', 'UNKNOWN')
    path = event.get('path', 'UNKNOWN')
    status_code = response.get('statusCode', 'UNKNOWN')
    
    logger.info(f"{function_name}: {method} {path} -> {status_code}")
    
    # Log query parameters if present
    query_params = event.get('queryStringParameters')
    if query_params:
        logger.info(f"Query params: {json.dumps(query_params)}")
    
    # Log error details if it's an error response
    if status_code >= 400:
        try:
            body = json.loads(response.get('body', '{}'))
            if body.get('error'):
                logger.error(f"Error response: {body['error']}")
        except:
            pass