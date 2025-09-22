"""
Enhanced error handling utilities for Lambda functions with comprehensive monitoring,
timeout handling, retry mechanisms, and user-friendly error messages
"""

import json
import logging
import time
import functools
from typing import Dict, Any, Optional, Callable, List, Union
from enum import Enum
import boto3
from botocore.exceptions import ClientError, BotoCoreError
from cors_utils import create_error_response

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

class ErrorSeverity(Enum):
    """Error severity levels for monitoring and alerting"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class ErrorCategory(Enum):
    """Error categories for better classification and handling"""
    VALIDATION = "validation"
    AUTHENTICATION = "authentication"
    AUTHORIZATION = "authorization"
    RESOURCE_NOT_FOUND = "resource_not_found"
    EXTERNAL_SERVICE = "external_service"
    DATABASE = "database"
    TIMEOUT = "timeout"
    RATE_LIMIT = "rate_limit"
    INTERNAL = "internal"
    CONFIGURATION = "configuration"

class APIError(Exception):
    """Enhanced custom exception for API errors with comprehensive metadata"""
    
    def __init__(
        self, 
        message: str, 
        status_code: int = 500, 
        details: Optional[str] = None,
        category: ErrorCategory = ErrorCategory.INTERNAL,
        severity: ErrorSeverity = ErrorSeverity.MEDIUM,
        user_message: Optional[str] = None,
        retry_after: Optional[int] = None,
        correlation_id: Optional[str] = None
    ):
        self.message = message
        self.status_code = status_code
        self.details = details
        self.category = category
        self.severity = severity
        self.user_message = user_message or self._generate_user_friendly_message()
        self.retry_after = retry_after
        self.correlation_id = correlation_id
        super().__init__(self.message)
    
    def _generate_user_friendly_message(self) -> str:
        """Generate user-friendly error messages based on status code and category"""
        if self.status_code == 400:
            if self.category == ErrorCategory.VALIDATION:
                return "Please check your input and try again."
            return "The request contains invalid data. Please review and try again."
        elif self.status_code == 401:
            return "Authentication is required to access this resource."
        elif self.status_code == 403:
            return "You don't have permission to access this resource."
        elif self.status_code == 404:
            return "The requested resource was not found."
        elif self.status_code == 409:
            return "This operation conflicts with the current state. Please refresh and try again."
        elif self.status_code == 429:
            return "Too many requests. Please wait a moment and try again."
        elif self.status_code == 503:
            return "The service is temporarily unavailable. Please try again in a few minutes."
        elif self.status_code >= 500:
            return "We're experiencing technical difficulties. Please try again later."
        else:
            return "An unexpected error occurred. Please try again."

class TimeoutError(APIError):
    """Specific error for timeout scenarios"""
    
    def __init__(self, operation: str, timeout_seconds: int, details: Optional[str] = None):
        message = f"Operation '{operation}' timed out after {timeout_seconds} seconds"
        user_message = f"The operation is taking longer than expected. Please try again."
        super().__init__(
            message=message,
            status_code=408,
            details=details,
            category=ErrorCategory.TIMEOUT,
            severity=ErrorSeverity.MEDIUM,
            user_message=user_message,
            retry_after=30
        )

class RetryableError(APIError):
    """Error that indicates the operation should be retried"""
    
    def __init__(self, message: str, retry_after: int = 5, max_retries: int = 3, **kwargs):
        super().__init__(message=message, retry_after=retry_after, **kwargs)
        self.max_retries = max_retries

def handle_lambda_error(func):
    """
    Enhanced decorator to handle Lambda function errors with comprehensive monitoring,
    user-friendly messages, and detailed logging
    """
    @functools.wraps(func)
    def wrapper(event: Dict[str, Any], context) -> Dict[str, Any]:
        start_time = time.time()
        function_name = func.__name__
        correlation_id = context.aws_request_id
        
        try:
            # Check for potential timeout early
            remaining_time = context.get_remaining_time_in_millis()
            if remaining_time < 5000:  # Less than 5 seconds remaining
                raise TimeoutError(
                    operation=function_name,
                    timeout_seconds=context.memory_limit_in_mb / 1000,  # Approximate timeout
                    details=f"Insufficient time remaining: {remaining_time}ms"
                )
            
            result = func(event, context)
            
            # Log successful execution
            duration = (time.time() - start_time) * 1000
            logger.info(f"Function {function_name} completed successfully in {duration:.2f}ms")
            
            return result
            
        except APIError as e:
            duration = (time.time() - start_time) * 1000
            
            # Enhanced error logging with context
            error_context = {
                'function_name': function_name,
                'correlation_id': correlation_id,
                'duration_ms': duration,
                'error_category': e.category.value,
                'error_severity': e.severity.value,
                'status_code': e.status_code,
                'remaining_time_ms': context.get_remaining_time_in_millis(),
                'memory_limit_mb': context.memory_limit_in_mb
            }
            
            # Log with appropriate level based on severity
            if e.severity in [ErrorSeverity.HIGH, ErrorSeverity.CRITICAL]:
                logger.error(f"[{e.severity.value.upper()}] API Error in {function_name}: {e.message}", 
                           extra=error_context)
            else:
                logger.warning(f"[{e.severity.value.upper()}] API Error in {function_name}: {e.message}", 
                             extra=error_context)
            
            if e.details:
                logger.error(f"Error details: {e.details}")
            
            # Send CloudWatch metrics for monitoring
            _send_error_metrics(function_name, e.category.value, e.severity.value, e.status_code)
            
            # Create user-friendly error response
            return create_enhanced_error_response(e, correlation_id)
            
        except TimeoutError as e:
            duration = (time.time() - start_time) * 1000
            logger.error(f"Timeout in {function_name} after {duration:.2f}ms: {e.message}")
            _send_error_metrics(function_name, "timeout", "high", 408)
            return create_enhanced_error_response(e, correlation_id)
            
        except (ClientError, BotoCoreError) as e:
            duration = (time.time() - start_time) * 1000
            error_code = getattr(e, 'response', {}).get('Error', {}).get('Code', 'Unknown')
            
            # Convert AWS errors to user-friendly messages
            api_error = _convert_aws_error(e, error_code)
            
            logger.error(f"AWS Service Error in {function_name}: {error_code} - {str(e)}")
            _send_error_metrics(function_name, "external_service", "high", api_error.status_code)
            
            return create_enhanced_error_response(api_error, correlation_id)
            
        except Exception as e:
            duration = (time.time() - start_time) * 1000
            
            # Log unexpected errors with full context
            logger.error(f"Unexpected error in {function_name} after {duration:.2f}ms: {str(e)}", 
                        exc_info=True)
            
            _send_error_metrics(function_name, "internal", "critical", 500)
            
            # Create generic error for unexpected exceptions
            generic_error = APIError(
                message=f"Internal server error in {function_name}",
                status_code=500,
                details=str(e),
                category=ErrorCategory.INTERNAL,
                severity=ErrorSeverity.CRITICAL,
                correlation_id=correlation_id
            )
            
            return create_enhanced_error_response(generic_error, correlation_id)
    
    return wrapper

def _convert_aws_error(error: Exception, error_code: str) -> APIError:
    """Convert AWS service errors to user-friendly APIError instances"""
    error_mappings = {
        'ThrottlingException': (429, ErrorCategory.RATE_LIMIT, ErrorSeverity.MEDIUM),
        'ServiceUnavailableException': (503, ErrorCategory.EXTERNAL_SERVICE, ErrorSeverity.HIGH),
        'AccessDeniedException': (403, ErrorCategory.AUTHORIZATION, ErrorSeverity.MEDIUM),
        'ResourceNotFoundException': (404, ErrorCategory.RESOURCE_NOT_FOUND, ErrorSeverity.LOW),
        'ValidationException': (400, ErrorCategory.VALIDATION, ErrorSeverity.LOW),
        'ConditionalCheckFailedException': (409, ErrorCategory.DATABASE, ErrorSeverity.MEDIUM),
        'ProvisionedThroughputExceededException': (429, ErrorCategory.RATE_LIMIT, ErrorSeverity.HIGH),
        'RequestTimeoutException': (408, ErrorCategory.TIMEOUT, ErrorSeverity.MEDIUM),
    }
    
    status_code, category, severity = error_mappings.get(
        error_code, 
        (500, ErrorCategory.EXTERNAL_SERVICE, ErrorSeverity.HIGH)
    )
    
    return APIError(
        message=f"AWS service error: {error_code}",
        status_code=status_code,
        details=str(error),
        category=category,
        severity=severity
    )

def _send_error_metrics(function_name: str, category: str, severity: str, status_code: int):
    """Send error metrics to CloudWatch for monitoring and alerting"""
    try:
        cloudwatch = boto3.client('cloudwatch')
        
        metrics = [
            {
                'MetricName': 'ErrorCount',
                'Value': 1,
                'Unit': 'Count',
                'Dimensions': [
                    {'Name': 'FunctionName', 'Value': function_name},
                    {'Name': 'ErrorCategory', 'Value': category},
                    {'Name': 'ErrorSeverity', 'Value': severity}
                ]
            },
            {
                'MetricName': 'HTTPStatusCode',
                'Value': status_code,
                'Unit': 'Count',
                'Dimensions': [
                    {'Name': 'FunctionName', 'Value': function_name},
                    {'Name': 'StatusCode', 'Value': str(status_code)}
                ]
            }
        ]
        
        cloudwatch.put_metric_data(
            Namespace='Resumify/Errors',
            MetricData=metrics
        )
    except Exception as e:
        logger.warning(f"Failed to send error metrics: {str(e)}")

def create_enhanced_error_response(error: APIError, correlation_id: str) -> Dict[str, Any]:
    """Create enhanced error response with user-friendly messages and debugging info"""
    response_body = {
        'success': False,
        'error': {
            'message': error.user_message,
            'code': error.status_code,
            'category': error.category.value,
            'correlation_id': correlation_id
        }
    }
    
    # Add retry information for retryable errors
    if error.retry_after:
        response_body['error']['retry_after'] = error.retry_after
    
    # Add technical details in development/debug mode
    # In production, you might want to exclude these details
    if logger.level <= logging.DEBUG:
        response_body['error']['technical_details'] = {
            'message': error.message,
            'details': error.details
        }
    
    headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
        'Content-Type': 'application/json',
        'X-Correlation-ID': correlation_id
    }
    
    # Add retry-after header for rate limiting
    if error.retry_after:
        headers['Retry-After'] = str(error.retry_after)
    
    return {
        'statusCode': error.status_code,
        'headers': headers,
        'body': json.dumps(response_body)
    }

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

def with_retry(
    max_retries: int = 3,
    backoff_factor: float = 1.0,
    retryable_exceptions: tuple = (RetryableError, ClientError, BotoCoreError),
    timeout_seconds: Optional[int] = None
):
    """
    Decorator to add retry logic with exponential backoff to functions
    
    Args:
        max_retries: Maximum number of retry attempts
        backoff_factor: Multiplier for exponential backoff (seconds)
        retryable_exceptions: Tuple of exception types that should trigger retries
        timeout_seconds: Maximum time to spend on all retry attempts
    """
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            start_time = time.time()
            last_exception = None
            
            for attempt in range(max_retries + 1):
                try:
                    # Check timeout before each attempt
                    if timeout_seconds and (time.time() - start_time) > timeout_seconds:
                        raise TimeoutError(
                            operation=func.__name__,
                            timeout_seconds=timeout_seconds,
                            details=f"Timeout after {attempt} attempts"
                        )
                    
                    result = func(*args, **kwargs)
                    
                    # Log successful retry if this wasn't the first attempt
                    if attempt > 0:
                        logger.info(f"Function {func.__name__} succeeded on attempt {attempt + 1}")
                    
                    return result
                    
                except retryable_exceptions as e:
                    last_exception = e
                    
                    # Don't retry on the last attempt
                    if attempt == max_retries:
                        break
                    
                    # Calculate backoff delay with jitter
                    delay = backoff_factor * (2 ** attempt) + (time.time() % 1)  # Add jitter
                    
                    logger.warning(
                        f"Function {func.__name__} failed on attempt {attempt + 1}/{max_retries + 1}: {str(e)}. "
                        f"Retrying in {delay:.2f} seconds..."
                    )
                    
                    time.sleep(delay)
                    
                except Exception as e:
                    # Non-retryable exception, fail immediately
                    logger.error(f"Non-retryable error in {func.__name__}: {str(e)}")
                    raise
            
            # All retries exhausted
            logger.error(f"Function {func.__name__} failed after {max_retries + 1} attempts")
            
            if isinstance(last_exception, RetryableError):
                # Convert to a regular APIError after exhausting retries
                raise APIError(
                    message=f"Operation failed after {max_retries + 1} attempts: {last_exception.message}",
                    status_code=503,
                    details=str(last_exception),
                    category=ErrorCategory.EXTERNAL_SERVICE,
                    severity=ErrorSeverity.HIGH,
                    user_message="The service is temporarily unavailable. Please try again later."
                )
            else:
                raise last_exception
        
        return wrapper
    return decorator

def with_timeout(timeout_seconds: int):
    """
    Decorator to add timeout handling to functions
    
    Args:
        timeout_seconds: Maximum execution time in seconds
    """
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            start_time = time.time()
            
            try:
                result = func(*args, **kwargs)
                duration = time.time() - start_time
                
                if duration > timeout_seconds * 0.8:  # Warn if close to timeout
                    logger.warning(
                        f"Function {func.__name__} took {duration:.2f}s, "
                        f"close to timeout of {timeout_seconds}s"
                    )
                
                return result
                
            except Exception as e:
                duration = time.time() - start_time
                
                if duration >= timeout_seconds:
                    raise TimeoutError(
                        operation=func.__name__,
                        timeout_seconds=timeout_seconds,
                        details=f"Function exceeded timeout after {duration:.2f}s"
                    )
                else:
                    raise
        
        return wrapper
    return decorator

def monitor_operation(operation_name: str, critical: bool = False):
    """
    Decorator to monitor operations with detailed logging and metrics
    
    Args:
        operation_name: Name of the operation for logging and metrics
        critical: Whether this is a critical operation that should trigger alerts
    """
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            start_time = time.time()
            success = False
            error_details = None
            
            try:
                logger.info(f"Starting {operation_name}")
                result = func(*args, **kwargs)
                success = True
                return result
                
            except Exception as e:
                error_details = str(e)
                severity = ErrorSeverity.CRITICAL if critical else ErrorSeverity.MEDIUM
                
                logger.error(f"Failed {operation_name}: {error_details}")
                
                # Send metrics for critical operations
                if critical:
                    _send_operation_metrics(operation_name, success=False, critical=True)
                
                raise
                
            finally:
                duration = (time.time() - start_time) * 1000
                
                if success:
                    logger.info(f"Completed {operation_name} in {duration:.2f}ms")
                    if critical:
                        _send_operation_metrics(operation_name, success=True, critical=True)
                else:
                    logger.error(f"Failed {operation_name} after {duration:.2f}ms")
        
        return wrapper
    return decorator

def _send_operation_metrics(operation_name: str, success: bool, critical: bool = False):
    """Send operation metrics to CloudWatch"""
    try:
        cloudwatch = boto3.client('cloudwatch')
        
        metrics = [
            {
                'MetricName': 'OperationSuccess' if success else 'OperationFailure',
                'Value': 1,
                'Unit': 'Count',
                'Dimensions': [
                    {'Name': 'OperationName', 'Value': operation_name},
                    {'Name': 'Critical', 'Value': str(critical)}
                ]
            }
        ]
        
        cloudwatch.put_metric_data(
            Namespace='Resumify/Operations',
            MetricData=metrics
        )
    except Exception as e:
        logger.warning(f"Failed to send operation metrics: {str(e)}")

def log_api_call(function_name: str, event: Dict[str, Any], response: Dict[str, Any]) -> None:
    """
    Enhanced API call logging with comprehensive request/response details
    
    Args:
        function_name: Name of the Lambda function
        event: Lambda event object
        response: Response object
    """
    method = event.get('httpMethod', 'UNKNOWN')
    path = event.get('path', 'UNKNOWN')
    status_code = response.get('statusCode', 'UNKNOWN')
    correlation_id = event.get('requestContext', {}).get('requestId', 'unknown')
    
    # Extract user agent and IP for monitoring
    headers = event.get('headers', {})
    user_agent = headers.get('User-Agent', 'unknown')
    source_ip = event.get('requestContext', {}).get('identity', {}).get('sourceIp', 'unknown')
    
    # Log basic request info
    logger.info(
        f"{function_name}: {method} {path} -> {status_code} "
        f"[{correlation_id}] from {source_ip}"
    )
    
    # Log query parameters if present
    query_params = event.get('queryStringParameters')
    if query_params:
        # Filter out sensitive parameters
        safe_params = {k: v for k, v in query_params.items() 
                      if k.lower() not in ['password', 'token', 'key', 'secret']}
        logger.info(f"Query params: {json.dumps(safe_params)}")
    
    # Log request body size if present (but not content for security)
    body = event.get('body')
    if body:
        body_size = len(body) if isinstance(body, str) else len(json.dumps(body))
        logger.info(f"Request body size: {body_size} bytes")
    
    # Enhanced error logging
    if status_code >= 400:
        try:
            response_body = json.loads(response.get('body', '{}'))
            error_info = response_body.get('error', {})
            
            if error_info:
                logger.error(
                    f"Error response [{correlation_id}]: "
                    f"Category: {error_info.get('category', 'unknown')}, "
                    f"Message: {error_info.get('message', 'unknown')}"
                )
                
                # Log technical details if available
                if error_info.get('technical_details'):
                    logger.debug(f"Technical details: {error_info['technical_details']}")
        except Exception as e:
            logger.warning(f"Failed to parse error response: {str(e)}")
    
    # Log performance metrics for slow requests
    if hasattr(response, '_processing_time_ms'):
        processing_time = response._processing_time_ms
        if processing_time > 1000:  # Log slow requests (>1s)
            logger.warning(f"Slow request [{correlation_id}]: {processing_time:.2f}ms")