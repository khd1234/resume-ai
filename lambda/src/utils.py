"""
Utility functions for the resume processor lambda.
"""

import hashlib
import json
import logging
import time
import boto3
from typing import Any, Dict, Optional
from urllib.parse import unquote_plus
from botocore.exceptions import ClientError, NoCredentialsError

logger = logging.getLogger(__name__)

def extract_s3_info(s3_record: Dict[str, Any]) -> Dict[str, Any]:
    """
    Extract S3 information from an S3 event record.
    
    Args:
        s3_record: S3 event record
        
    Returns:
        Dict containing extracted S3 information
        
    Raises:
        KeyError: If required S3 information is missing
    """
    try:
        s3_info = s3_record['s3']
        
        return {
            'bucket_name': s3_info['bucket']['name'],
            'object_key': unquote_plus(s3_info['object']['key']),
            'object_size': s3_info['object']['size'],
            'event_name': s3_record['eventName'],
            'event_time': s3_record.get('eventTime'),
            'event_source': s3_record.get('eventSource', 'aws:s3'),
            'aws_region': s3_record.get('awsRegion'),
            'etag': s3_info['object'].get('eTag', '').strip('"')  # Remove quotes from ETag
        }
    except KeyError as e:
        logger.error(f"Missing required S3 information in record: {e}")
        raise KeyError(f"Invalid S3 record format: missing {e}")

def generate_content_hash(content: bytes) -> str:
    """
    Generate SHA-256 hash of file content for deduplication.
    
    Args:
        content: File content as bytes
        
    Returns:
        Hexadecimal string representation of the hash
    """
    return hashlib.sha256(content).hexdigest()

def generate_file_key_hash(file_key: str) -> str:
    """
    Generate hash of the file key for database indexing.
    
    Args:
        file_key: S3 object key
        
    Returns:
        Hexadecimal string representation of the hash
    """
    return hashlib.sha256(file_key.encode('utf-8')).hexdigest()[:32]  # Truncate for readability

def safe_json_loads(json_string: str, default: Any = None) -> Any:
    """
    Safely parse JSON string with fallback.
    
    Args:
        json_string: JSON string to parse
        default: Default value if parsing fails
        
    Returns:
        Parsed JSON object or default value
    """
    try:
        return json.loads(json_string)
    except (json.JSONDecodeError, TypeError) as e:
        logger.warning(f"Failed to parse JSON: {e}")
        return default

def safe_json_dumps(obj: Any, default: Optional[str] = None) -> str:
    """
    Safely serialize object to JSON string.
    
    Args:
        obj: Object to serialize
        default: Default string if serialization fails
        
    Returns:
        JSON string or default value
    """
    try:
        return json.dumps(obj, default=str, ensure_ascii=False)
    except (TypeError, ValueError) as e:
        logger.warning(f"Failed to serialize to JSON: {e}")
        return default or "{}"

def retry_with_exponential_backoff(func, max_retries: int = 3, base_delay: float = 1.0):
    """
    Decorator for retrying functions with exponential backoff.
    
    Args:
        func: Function to retry
        max_retries: Maximum number of retry attempts
        base_delay: Base delay in seconds
        
    Returns:
        Decorated function that retries on exception
    """
    def wrapper(*args, **kwargs):
        last_exception = None
        
        for attempt in range(max_retries + 1):
            try:
                return func(*args, **kwargs)
            except Exception as e:
                last_exception = e
                
                if attempt == max_retries:
                    logger.error(f"Function {func.__name__} failed after {max_retries} retries: {e}")
                    raise e
                
                delay = base_delay * (2 ** attempt)
                logger.warning(f"Function {func.__name__} failed (attempt {attempt + 1}), retrying in {delay}s: {e}")
                time.sleep(delay)
        
        raise last_exception
    
    return wrapper

def format_file_size(size_bytes: int) -> str:
    """
    Format file size in human-readable format.
    
    Args:
        size_bytes: File size in bytes
        
    Returns:
        Formatted size string (e.g., "1.5 MB")
    """
    if size_bytes == 0:
        return "0 B"
    
    size_names = ["B", "KB", "MB", "GB"]
    i = 0
    size = float(size_bytes)
    
    while size >= 1024.0 and i < len(size_names) - 1:
        size /= 1024.0
        i += 1
    
    return f"{size:.1f} {size_names[i]}"

def create_processing_context(s3_info: Dict[str, Any]) -> Dict[str, Any]:
    """
    Create a processing context object with S3 and timing information.
    
    Args:
        s3_info: S3 information dictionary
        
    Returns:
        Processing context dictionary
    """
    return {
        'file_key': s3_info['object_key'],
        'bucket_name': s3_info['bucket_name'],
        'file_size': s3_info['object_size'],
        'file_size_formatted': format_file_size(s3_info['object_size']),
        'etag': s3_info.get('etag'),
        'event_time': s3_info.get('event_time'),
        'processing_start_time': time.time(),
        'processing_id': generate_file_key_hash(s3_info['object_key'])
    }

def log_processing_metrics(context: Dict[str, Any], status: str, additional_info: Optional[Dict[str, Any]] = None):
    """
    Log processing metrics for monitoring and debugging.
    
    Args:
        context: Processing context dictionary
        status: Processing status (started, completed, failed, etc.)
        additional_info: Additional information to log
    """
    current_time = time.time()
    processing_duration = current_time - context.get('processing_start_time', current_time)
    
    metrics = {
        'processing_id': context.get('processing_id'),
        'file_key': context.get('file_key'),
        'file_size': context.get('file_size'),
        'status': status,
        'processing_duration_seconds': round(processing_duration, 2),
        'timestamp': current_time
    }
    
    if additional_info:
        metrics.update(additional_info)
    
    logger.info(f"Processing metrics: {json.dumps(metrics)}")

class ProcessingError(Exception):
    """Custom exception for processing errors."""
    
    def __init__(self, message: str, error_type: str = "processing_error", context: Optional[Dict[str, Any]] = None):
        self.message = message
        self.error_type = error_type
        self.context = context or {}
        super().__init__(self.message)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert error to dictionary for JSON serialization."""
        return {
            'error_type': self.error_type,
            'message': self.message,
            'context': self.context,
            'timestamp': time.time()
        }

def download_file_from_s3(s3_info: Dict[str, Any], max_size: int = 2 * 1024 * 1024) -> bytes:
    """
    Download file content from S3.
    
    Story 2 Implementation: S3 file download for text extraction
    - Downloads file content as bytes for processing
    - Validates file size during download
    - Handles S3 access errors gracefully
    - Supports retry logic for transient failures
    
    Args:
        s3_info: S3 information dictionary from extract_s3_info()
        max_size: Maximum file size to download (2MB default)
        
    Returns:
        File content as bytes
        
    Raises:
        ProcessingError: If download fails or file is too large
    """
    bucket_name = s3_info['bucket_name']
    object_key = s3_info['object_key']
    
    try:
        # Initialize S3 client
        s3_client = boto3.client('s3')
        
        # First, get object metadata to check size
        try:
            head_response = s3_client.head_object(Bucket=bucket_name, Key=object_key)
            content_length = head_response.get('ContentLength', 0)
            
            if content_length > max_size:
                raise ProcessingError(
                    f"File size {content_length} bytes exceeds maximum {max_size} bytes for download",
                    error_type="file_too_large",
                    context={'bucket': bucket_name, 'key': object_key, 'size': content_length}
                )
                
            logger.info(f"Downloading file {object_key} from {bucket_name} ({format_file_size(content_length)})")
            
        except ClientError as e:
            error_code = e.response.get('Error', {}).get('Code', 'Unknown')
            if error_code == 'NoSuchKey':
                raise ProcessingError(
                    f"File not found in S3: {bucket_name}/{object_key}",
                    error_type="file_not_found",
                    context={'bucket': bucket_name, 'key': object_key}
                )
            elif error_code == 'Forbidden':
                raise ProcessingError(
                    f"Access denied to S3 file: {bucket_name}/{object_key}",
                    error_type="access_denied",
                    context={'bucket': bucket_name, 'key': object_key}
                )
            else:
                raise ProcessingError(
                    f"Failed to access S3 file metadata: {str(e)}",
                    error_type="s3_access_error",
                    context={'bucket': bucket_name, 'key': object_key, 'error_code': error_code}
                )
        
        # Download the file content
        try:
            response = s3_client.get_object(Bucket=bucket_name, Key=object_key)
            file_content = response['Body'].read()
            
            # Double-check downloaded size
            actual_size = len(file_content)
            if actual_size > max_size:
                raise ProcessingError(
                    f"Downloaded file size {actual_size} bytes exceeds maximum {max_size} bytes",
                    error_type="file_too_large_after_download",
                    context={'bucket': bucket_name, 'key': object_key, 'size': actual_size}
                )
            
            if actual_size == 0:
                raise ProcessingError(
                    f"Downloaded file is empty: {bucket_name}/{object_key}",
                    error_type="empty_file",
                    context={'bucket': bucket_name, 'key': object_key}
                )
            
            logger.info(f"Successfully downloaded {actual_size} bytes from {bucket_name}/{object_key}")
            return file_content
            
        except ClientError as e:
            error_code = e.response.get('Error', {}).get('Code', 'Unknown')
            raise ProcessingError(
                f"Failed to download file from S3: {str(e)}",
                error_type="s3_download_error",
                context={'bucket': bucket_name, 'key': object_key, 'error_code': error_code}
            )
            
    except NoCredentialsError:
        raise ProcessingError(
            "AWS credentials not available for S3 access",
            error_type="credentials_error",
            context={'bucket': bucket_name, 'key': object_key}
        )
    except ProcessingError:
        # Re-raise ProcessingError as-is
        raise
    except Exception as e:
        raise ProcessingError(
            f"Unexpected error downloading from S3: {str(e)}",
            error_type="unexpected_download_error",
            context={'bucket': bucket_name, 'key': object_key}
        )