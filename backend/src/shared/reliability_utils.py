"""
Reliability utilities for enhanced API endpoint reliability including
circuit breaker pattern, health checks, and service degradation handling
"""

import time
import json
import logging
from typing import Dict, Any, Optional, Callable, List
from enum import Enum
from dataclasses import dataclass, field
from threading import Lock
import boto3
from botocore.exceptions import ClientError

logger = logging.getLogger(__name__)

class CircuitState(Enum):
    """Circuit breaker states"""
    CLOSED = "closed"      # Normal operation
    OPEN = "open"          # Failing, reject requests
    HALF_OPEN = "half_open"  # Testing if service recovered

class ServiceHealth(Enum):
    """Service health status"""
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNHEALTHY = "unhealthy"

@dataclass
class CircuitBreakerConfig:
    """Configuration for circuit breaker"""
    failure_threshold: int = 5  # Number of failures before opening
    recovery_timeout: int = 60  # Seconds before trying half-open
    success_threshold: int = 3  # Successes needed to close from half-open
    timeout_seconds: int = 30   # Request timeout

@dataclass
class CircuitBreakerState:
    """Current state of a circuit breaker"""
    state: CircuitState = CircuitState.CLOSED
    failure_count: int = 0
    success_count: int = 0
    last_failure_time: float = 0
    last_success_time: float = 0
    lock: Lock = field(default_factory=Lock)

class CircuitBreaker:
    """
    Circuit breaker implementation for external service calls
    """
    
    def __init__(self, name: str, config: CircuitBreakerConfig = None):
        self.name = name
        self.config = config or CircuitBreakerConfig()
        self.state = CircuitBreakerState()
        
    def call(self, func: Callable, *args, **kwargs):
        """
        Execute function with circuit breaker protection
        """
        with self.state.lock:
            current_time = time.time()
            
            # Check if we should transition from OPEN to HALF_OPEN
            if (self.state.state == CircuitState.OPEN and 
                current_time - self.state.last_failure_time > self.config.recovery_timeout):
                self.state.state = CircuitState.HALF_OPEN
                self.state.success_count = 0
                logger.info(f"Circuit breaker {self.name} transitioning to HALF_OPEN")
            
            # Reject requests if circuit is OPEN
            if self.state.state == CircuitState.OPEN:
                logger.warning(f"Circuit breaker {self.name} is OPEN, rejecting request")
                raise CircuitBreakerOpenError(
                    f"Circuit breaker {self.name} is open. Service unavailable."
                )
        
        # Execute the function
        try:
            start_time = time.time()
            result = func(*args, **kwargs)
            duration = time.time() - start_time
            
            # Record success
            self._record_success(duration)
            return result
            
        except Exception as e:
            # Record failure
            self._record_failure(e)
            raise
    
    def _record_success(self, duration: float):
        """Record successful operation"""
        with self.state.lock:
            current_time = time.time()
            self.state.last_success_time = current_time
            
            if self.state.state == CircuitState.HALF_OPEN:
                self.state.success_count += 1
                if self.state.success_count >= self.config.success_threshold:
                    self.state.state = CircuitState.CLOSED
                    self.state.failure_count = 0
                    logger.info(f"Circuit breaker {self.name} closed after recovery")
            elif self.state.state == CircuitState.CLOSED:
                # Reset failure count on success
                self.state.failure_count = 0
            
            logger.debug(f"Circuit breaker {self.name} recorded success in {duration:.2f}s")
    
    def _record_failure(self, error: Exception):
        """Record failed operation"""
        with self.state.lock:
            current_time = time.time()
            self.state.last_failure_time = current_time
            self.state.failure_count += 1
            
            # Open circuit if failure threshold exceeded
            if (self.state.state == CircuitState.CLOSED and 
                self.state.failure_count >= self.config.failure_threshold):
                self.state.state = CircuitState.OPEN
                logger.error(
                    f"Circuit breaker {self.name} opened after {self.state.failure_count} failures"
                )
            elif self.state.state == CircuitState.HALF_OPEN:
                # Go back to OPEN on any failure in HALF_OPEN
                self.state.state = CircuitState.OPEN
                logger.warning(f"Circuit breaker {self.name} reopened during recovery test")
            
            logger.warning(f"Circuit breaker {self.name} recorded failure: {str(error)}")
    
    def get_status(self) -> Dict[str, Any]:
        """Get current circuit breaker status"""
        with self.state.lock:
            return {
                'name': self.name,
                'state': self.state.state.value,
                'failure_count': self.state.failure_count,
                'success_count': self.state.success_count,
                'last_failure_time': self.state.last_failure_time,
                'last_success_time': self.state.last_success_time,
                'config': {
                    'failure_threshold': self.config.failure_threshold,
                    'recovery_timeout': self.config.recovery_timeout,
                    'success_threshold': self.config.success_threshold
                }
            }

class CircuitBreakerOpenError(Exception):
    """Exception raised when circuit breaker is open"""
    pass

class ServiceHealthMonitor:
    """
    Monitor health of external services and dependencies
    """
    
    def __init__(self):
        self.circuit_breakers: Dict[str, CircuitBreaker] = {}
        self.health_checks: Dict[str, Callable] = {}
        self.last_health_check: Dict[str, float] = {}
        self.health_status: Dict[str, ServiceHealth] = {}
    
    def register_service(self, name: str, health_check: Callable, 
                        circuit_config: CircuitBreakerConfig = None):
        """Register a service for monitoring"""
        self.circuit_breakers[name] = CircuitBreaker(name, circuit_config)
        self.health_checks[name] = health_check
        self.health_status[name] = ServiceHealth.HEALTHY
        logger.info(f"Registered service {name} for health monitoring")
    
    def call_service(self, service_name: str, func: Callable, *args, **kwargs):
        """Call a service through its circuit breaker"""
        if service_name not in self.circuit_breakers:
            logger.warning(f"Service {service_name} not registered, calling directly")
            return func(*args, **kwargs)
        
        circuit_breaker = self.circuit_breakers[service_name]
        return circuit_breaker.call(func, *args, **kwargs)
    
    def check_service_health(self, service_name: str) -> ServiceHealth:
        """Check health of a specific service"""
        if service_name not in self.health_checks:
            return ServiceHealth.HEALTHY
        
        try:
            health_check = self.health_checks[service_name]
            health_check()
            self.health_status[service_name] = ServiceHealth.HEALTHY
            return ServiceHealth.HEALTHY
            
        except Exception as e:
            logger.warning(f"Health check failed for {service_name}: {str(e)}")
            
            # Determine health status based on circuit breaker state
            circuit_breaker = self.circuit_breakers.get(service_name)
            if circuit_breaker:
                if circuit_breaker.state.state == CircuitState.OPEN:
                    self.health_status[service_name] = ServiceHealth.UNHEALTHY
                else:
                    self.health_status[service_name] = ServiceHealth.DEGRADED
            else:
                self.health_status[service_name] = ServiceHealth.DEGRADED
            
            return self.health_status[service_name]
    
    def get_overall_health(self) -> Dict[str, Any]:
        """Get overall system health status"""
        current_time = time.time()
        service_statuses = {}
        
        for service_name in self.health_checks:
            # Check if we need to refresh health status
            last_check = self.last_health_check.get(service_name, 0)
            if current_time - last_check > 60:  # Check every minute
                self.check_service_health(service_name)
                self.last_health_check[service_name] = current_time
            
            # Get circuit breaker status
            circuit_status = self.circuit_breakers[service_name].get_status()
            service_statuses[service_name] = {
                'health': self.health_status[service_name].value,
                'circuit_breaker': circuit_status
            }
        
        # Determine overall health
        unhealthy_services = [name for name, status in service_statuses.items() 
                            if status['health'] == ServiceHealth.UNHEALTHY.value]
        degraded_services = [name for name, status in service_statuses.items() 
                           if status['health'] == ServiceHealth.DEGRADED.value]
        
        if unhealthy_services:
            overall_health = ServiceHealth.UNHEALTHY
        elif degraded_services:
            overall_health = ServiceHealth.DEGRADED
        else:
            overall_health = ServiceHealth.HEALTHY
        
        return {
            'overall_health': overall_health.value,
            'services': service_statuses,
            'unhealthy_services': unhealthy_services,
            'degraded_services': degraded_services,
            'timestamp': current_time
        }

# Global service health monitor instance
service_monitor = ServiceHealthMonitor()

def register_aws_services():
    """Register common AWS services for monitoring"""
    
    def dynamodb_health_check():
        """Health check for DynamoDB"""
        dynamodb = boto3.client('dynamodb')
        dynamodb.describe_limits()
    
    def s3_health_check():
        """Health check for S3"""
        s3 = boto3.client('s3')
        s3.list_buckets()
    
    def textract_health_check():
        """Health check for Textract"""
        textract = boto3.client('textract')
        # Just check if we can access the service
        try:
            textract.get_document_text_detection(JobId='dummy-job-id')
        except ClientError as e:
            # We expect this to fail, but it means the service is accessible
            if e.response['Error']['Code'] != 'InvalidJobIdException':
                raise
    
    # Register services with appropriate circuit breaker configs
    service_monitor.register_service(
        'dynamodb', 
        dynamodb_health_check,
        CircuitBreakerConfig(failure_threshold=3, recovery_timeout=30)
    )
    
    service_monitor.register_service(
        's3', 
        s3_health_check,
        CircuitBreakerConfig(failure_threshold=3, recovery_timeout=30)
    )
    
    service_monitor.register_service(
        'textract', 
        textract_health_check,
        CircuitBreakerConfig(failure_threshold=5, recovery_timeout=60)
    )

def get_health_status() -> Dict[str, Any]:
    """Get current health status of all monitored services"""
    return service_monitor.get_overall_health()

def call_with_circuit_breaker(service_name: str, func: Callable, *args, **kwargs):
    """Call a function with circuit breaker protection"""
    return service_monitor.call_service(service_name, func, *args, **kwargs)

# Initialize AWS services monitoring
try:
    register_aws_services()
    logger.info("AWS services registered for health monitoring")
except Exception as e:
    logger.warning(f"Failed to register AWS services for monitoring: {str(e)}")