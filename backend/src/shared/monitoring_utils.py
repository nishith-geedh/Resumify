"""
Enhanced monitoring and alerting utilities for comprehensive API endpoint monitoring
"""

import json
import time
import logging
from typing import Dict, Any, Optional, List, Callable
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta
from enum import Enum
import boto3
from botocore.exceptions import ClientError

logger = logging.getLogger(__name__)

class AlertSeverity(Enum):
    """Alert severity levels"""
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"

class MetricType(Enum):
    """Types of metrics to track"""
    COUNTER = "counter"
    GAUGE = "gauge"
    HISTOGRAM = "histogram"
    TIMER = "timer"

@dataclass
class MetricData:
    """Structured metric data"""
    name: str
    value: float
    unit: str
    timestamp: float
    dimensions: Dict[str, str]
    metric_type: MetricType
    tags: Dict[str, str] = None

@dataclass
class AlertRule:
    """Alert rule configuration"""
    name: str
    metric_name: str
    threshold: float
    comparison: str  # 'gt', 'lt', 'eq', 'gte', 'lte'
    severity: AlertSeverity
    duration_minutes: int = 5  # How long condition must persist
    cooldown_minutes: int = 15  # Minimum time between alerts

class EnhancedMonitor:
    """
    Enhanced monitoring system with custom metrics, alerting, and dashboards
    """
    
    def __init__(self, namespace: str = "Resumify/Enhanced"):
        self.namespace = namespace
        self.cloudwatch = boto3.client('cloudwatch')
        self.sns = boto3.client('sns')
        self.metrics_buffer: List[MetricData] = []
        self.alert_rules: List[AlertRule] = []
        self.last_alert_times: Dict[str, float] = {}
        
        # Performance tracking
        self.request_times: Dict[str, List[float]] = {}
        self.error_counts: Dict[str, int] = {}
        self.success_counts: Dict[str, int] = {}
        
        # Initialize default alert rules
        self._setup_default_alerts()
    
    def _setup_default_alerts(self):
        """Setup default alert rules for common issues"""
        default_rules = [
            AlertRule(
                name="HighErrorRate",
                metric_name="ErrorRate",
                threshold=0.05,  # 5% error rate
                comparison="gt",
                severity=AlertSeverity.WARNING,
                duration_minutes=3
            ),
            AlertRule(
                name="CriticalErrorRate", 
                metric_name="ErrorRate",
                threshold=0.15,  # 15% error rate
                comparison="gt",
                severity=AlertSeverity.CRITICAL,
                duration_minutes=2
            ),
            AlertRule(
                name="HighLatency",
                metric_name="AverageResponseTime",
                threshold=5000,  # 5 seconds
                comparison="gt",
                severity=AlertSeverity.WARNING,
                duration_minutes=5
            ),
            AlertRule(
                name="VeryHighLatency",
                metric_name="AverageResponseTime", 
                threshold=10000,  # 10 seconds
                comparison="gt",
                severity=AlertSeverity.ERROR,
                duration_minutes=2
            ),
            AlertRule(
                name="NoRequests",
                metric_name="RequestCount",
                threshold=0,
                comparison="eq",
                severity=AlertSeverity.WARNING,
                duration_minutes=10
            )
        ]
        
        self.alert_rules.extend(default_rules)
    
    def record_metric(
        self, 
        name: str, 
        value: float, 
        unit: str = "Count",
        dimensions: Dict[str, str] = None,
        metric_type: MetricType = MetricType.COUNTER,
        tags: Dict[str, str] = None
    ):
        """Record a custom metric"""
        metric = MetricData(
            name=name,
            value=value,
            unit=unit,
            timestamp=time.time(),
            dimensions=dimensions or {},
            metric_type=metric_type,
            tags=tags or {}
        )
        
        self.metrics_buffer.append(metric)
        
        # Send metrics in batches to avoid API limits
        if len(self.metrics_buffer) >= 20:
            self.flush_metrics()
    
    def record_request(
        self, 
        endpoint: str, 
        method: str, 
        status_code: int, 
        duration_ms: float,
        user_agent: str = None,
        source_ip: str = None
    ):
        """Record API request metrics"""
        dimensions = {
            'Endpoint': endpoint,
            'Method': method,
            'StatusCode': str(status_code)
        }
        
        # Record basic metrics
        self.record_metric("RequestCount", 1, "Count", dimensions)
        self.record_metric("ResponseTime", duration_ms, "Milliseconds", dimensions, MetricType.TIMER)
        
        # Track success/error rates
        if status_code < 400:
            self.record_metric("SuccessCount", 1, "Count", dimensions)
            self.success_counts[endpoint] = self.success_counts.get(endpoint, 0) + 1
        else:
            self.record_metric("ErrorCount", 1, "Count", dimensions)
            self.error_counts[endpoint] = self.error_counts.get(endpoint, 0) + 1
        
        # Track response times for percentile calculations
        if endpoint not in self.request_times:
            self.request_times[endpoint] = []
        self.request_times[endpoint].append(duration_ms)
        
        # Keep only recent data (last 100 requests per endpoint)
        if len(self.request_times[endpoint]) > 100:
            self.request_times[endpoint] = self.request_times[endpoint][-100:]
        
        # Record additional context metrics
        if user_agent:
            self.record_metric("UserAgentCount", 1, "Count", 
                             {**dimensions, 'UserAgent': user_agent[:50]})  # Truncate long user agents
        
        if source_ip:
            self.record_metric("SourceIPCount", 1, "Count", 
                             {**dimensions, 'SourceIP': source_ip})
    
    def record_business_metric(
        self, 
        metric_name: str, 
        value: float, 
        candidate_id: str = None,
        job_id: str = None,
        additional_dimensions: Dict[str, str] = None
    ):
        """Record business-specific metrics"""
        dimensions = additional_dimensions or {}
        
        if candidate_id:
            dimensions['CandidateId'] = candidate_id
        if job_id:
            dimensions['JobId'] = job_id
        
        self.record_metric(metric_name, value, "Count", dimensions)
    
    def calculate_percentiles(self, values: List[float], percentiles: List[int] = None) -> Dict[str, float]:
        """Calculate percentiles for a list of values"""
        if not values:
            return {}
        
        percentiles = percentiles or [50, 90, 95, 99]
        sorted_values = sorted(values)
        n = len(sorted_values)
        
        result = {}
        for p in percentiles:
            index = int((p / 100.0) * (n - 1))
            result[f"p{p}"] = sorted_values[index]
        
        return result
    
    def generate_summary_metrics(self):
        """Generate summary metrics from collected data"""
        current_time = time.time()
        
        for endpoint, times in self.request_times.items():
            if not times:
                continue
            
            # Calculate percentiles
            percentiles = self.calculate_percentiles(times)
            dimensions = {'Endpoint': endpoint}
            
            for percentile, value in percentiles.items():
                self.record_metric(f"ResponseTime_{percentile}", value, "Milliseconds", dimensions)
            
            # Calculate average
            avg_time = sum(times) / len(times)
            self.record_metric("AverageResponseTime", avg_time, "Milliseconds", dimensions)
            
            # Calculate error rate
            total_requests = self.success_counts.get(endpoint, 0) + self.error_counts.get(endpoint, 0)
            if total_requests > 0:
                error_rate = self.error_counts.get(endpoint, 0) / total_requests
                self.record_metric("ErrorRate", error_rate, "Percent", dimensions)
    
    def flush_metrics(self):
        """Send buffered metrics to CloudWatch"""
        if not self.metrics_buffer:
            return
        
        try:
            # Convert metrics to CloudWatch format
            metric_data = []
            
            for metric in self.metrics_buffer:
                cloudwatch_metric = {
                    'MetricName': metric.name,
                    'Value': metric.value,
                    'Unit': metric.unit,
                    'Timestamp': datetime.fromtimestamp(metric.timestamp)
                }
                
                if metric.dimensions:
                    cloudwatch_metric['Dimensions'] = [
                        {'Name': k, 'Value': v} for k, v in metric.dimensions.items()
                    ]
                
                metric_data.append(cloudwatch_metric)
            
            # Send metrics in batches (CloudWatch limit is 20 per request)
            for i in range(0, len(metric_data), 20):
                batch = metric_data[i:i+20]
                self.cloudwatch.put_metric_data(
                    Namespace=self.namespace,
                    MetricData=batch
                )
            
            logger.info(f"Sent {len(self.metrics_buffer)} metrics to CloudWatch")
            self.metrics_buffer.clear()
            
        except Exception as e:
            logger.error(f"Failed to send metrics to CloudWatch: {str(e)}")
    
    def check_alert_rules(self):
        """Check alert rules and trigger alerts if needed"""
        current_time = time.time()
        
        for rule in self.alert_rules:
            try:
                # Check if we're in cooldown period
                last_alert = self.last_alert_times.get(rule.name, 0)
                if current_time - last_alert < rule.cooldown_minutes * 60:
                    continue
                
                # Get metric data from CloudWatch
                end_time = datetime.utcnow()
                start_time = end_time - timedelta(minutes=rule.duration_minutes)
                
                response = self.cloudwatch.get_metric_statistics(
                    Namespace=self.namespace,
                    MetricName=rule.metric_name,
                    StartTime=start_time,
                    EndTime=end_time,
                    Period=60,  # 1 minute periods
                    Statistics=['Average', 'Maximum', 'Minimum']
                )
                
                if not response['Datapoints']:
                    continue
                
                # Use the most recent datapoint
                latest_datapoint = max(response['Datapoints'], key=lambda x: x['Timestamp'])
                metric_value = latest_datapoint['Average']
                
                # Check if alert condition is met
                if self._evaluate_condition(metric_value, rule.threshold, rule.comparison):
                    self._trigger_alert(rule, metric_value, latest_datapoint['Timestamp'])
                    self.last_alert_times[rule.name] = current_time
                
            except Exception as e:
                logger.error(f"Failed to check alert rule {rule.name}: {str(e)}")
    
    def _evaluate_condition(self, value: float, threshold: float, comparison: str) -> bool:
        """Evaluate alert condition"""
        if comparison == 'gt':
            return value > threshold
        elif comparison == 'lt':
            return value < threshold
        elif comparison == 'eq':
            return value == threshold
        elif comparison == 'gte':
            return value >= threshold
        elif comparison == 'lte':
            return value <= threshold
        else:
            return False
    
    def _trigger_alert(self, rule: AlertRule, value: float, timestamp: datetime):
        """Trigger an alert"""
        alert_message = {
            'alert_name': rule.name,
            'severity': rule.severity.value,
            'metric_name': rule.metric_name,
            'current_value': value,
            'threshold': rule.threshold,
            'comparison': rule.comparison,
            'timestamp': timestamp.isoformat(),
            'namespace': self.namespace
        }
        
        logger.error(f"ALERT TRIGGERED: {rule.name} - {rule.metric_name} {rule.comparison} {rule.threshold} (current: {value})")
        
        # Send to SNS if configured
        try:
            topic_arn = self._get_alert_topic_arn(rule.severity)
            if topic_arn:
                self.sns.publish(
                    TopicArn=topic_arn,
                    Subject=f"Resumify Alert: {rule.name}",
                    Message=json.dumps(alert_message, indent=2)
                )
        except Exception as e:
            logger.error(f"Failed to send alert to SNS: {str(e)}")
    
    def _get_alert_topic_arn(self, severity: AlertSeverity) -> Optional[str]:
        """Get SNS topic ARN for alert severity"""
        # This would typically be configured via environment variables
        # or AWS Systems Manager Parameter Store
        topic_mapping = {
            AlertSeverity.INFO: None,  # Don't send INFO alerts to SNS
            AlertSeverity.WARNING: None,  # Configure as needed
            AlertSeverity.ERROR: None,    # Configure as needed
            AlertSeverity.CRITICAL: None  # Configure as needed
        }
        
        return topic_mapping.get(severity)
    
    def get_dashboard_data(self) -> Dict[str, Any]:
        """Get data for monitoring dashboard"""
        self.generate_summary_metrics()
        
        dashboard_data = {
            'timestamp': time.time(),
            'endpoints': {},
            'overall_stats': {
                'total_requests': sum(self.success_counts.values()) + sum(self.error_counts.values()),
                'total_errors': sum(self.error_counts.values()),
                'total_successes': sum(self.success_counts.values())
            }
        }
        
        # Calculate overall error rate
        total_requests = dashboard_data['overall_stats']['total_requests']
        if total_requests > 0:
            dashboard_data['overall_stats']['error_rate'] = (
                dashboard_data['overall_stats']['total_errors'] / total_requests
            )
        else:
            dashboard_data['overall_stats']['error_rate'] = 0
        
        # Per-endpoint statistics
        for endpoint in set(list(self.request_times.keys()) + list(self.success_counts.keys()) + list(self.error_counts.keys())):
            endpoint_data = {
                'request_count': self.success_counts.get(endpoint, 0) + self.error_counts.get(endpoint, 0),
                'success_count': self.success_counts.get(endpoint, 0),
                'error_count': self.error_counts.get(endpoint, 0),
                'error_rate': 0,
                'response_times': {}
            }
            
            if endpoint_data['request_count'] > 0:
                endpoint_data['error_rate'] = endpoint_data['error_count'] / endpoint_data['request_count']
            
            if endpoint in self.request_times and self.request_times[endpoint]:
                times = self.request_times[endpoint]
                endpoint_data['response_times'] = {
                    'average': sum(times) / len(times),
                    'min': min(times),
                    'max': max(times),
                    **self.calculate_percentiles(times)
                }
            
            dashboard_data['endpoints'][endpoint] = endpoint_data
        
        return dashboard_data

# Global monitor instance
enhanced_monitor = EnhancedMonitor()

def record_api_request(endpoint: str, method: str, status_code: int, duration_ms: float, **kwargs):
    """Convenience function to record API request metrics"""
    enhanced_monitor.record_request(endpoint, method, status_code, duration_ms, **kwargs)

def record_business_event(event_name: str, value: float = 1, **dimensions):
    """Convenience function to record business events"""
    enhanced_monitor.record_business_metric(event_name, value, additional_dimensions=dimensions)

def get_monitoring_dashboard() -> Dict[str, Any]:
    """Get current monitoring dashboard data"""
    return enhanced_monitor.get_dashboard_data()

def flush_all_metrics():
    """Flush all buffered metrics"""
    enhanced_monitor.flush_metrics()

# Decorator for automatic request monitoring
def monitor_api_endpoint(endpoint_name: str = None):
    """Decorator to automatically monitor API endpoint performance"""
    def decorator(func: Callable) -> Callable:
        def wrapper(*args, **kwargs):
            # Extract endpoint name from function if not provided
            actual_endpoint = endpoint_name or func.__name__
            
            start_time = time.time()
            status_code = 200
            
            try:
                result = func(*args, **kwargs)
                
                # Try to extract status code from result if it's a Lambda response
                if isinstance(result, dict) and 'statusCode' in result:
                    status_code = result['statusCode']
                
                return result
                
            except Exception as e:
                status_code = 500
                raise
                
            finally:
                duration_ms = (time.time() - start_time) * 1000
                enhanced_monitor.record_request(
                    actual_endpoint, 
                    'UNKNOWN',  # Method would need to be extracted from event
                    status_code, 
                    duration_ms
                )
        
        return wrapper
    return decorator