"""
Custom exceptions for the resume processor lambda.
"""

from typing import Dict, Any, Optional

class ResumeProcessingError(Exception):
    """Base exception for resume processing errors."""
    
    def __init__(self, message: str, error_type: str = None, context: Dict[str, Any] = None):
        """
        Initialize the processing error.
        
        Args:
            message: Error message
            error_type: Type of error for categorization
            context: Additional context information
        """
        super().__init__(message)
        self.message = message
        self.error_type = error_type or 'unknown_error'
        self.context = context or {}

class FileValidationError(ResumeProcessingError):
    """Exception raised when file validation fails."""
    
    def __init__(self, message: str, file_key: str = None, validation_details: Dict[str, Any] = None):
        """
        Initialize file validation error.
        
        Args:
            message: Error message
            file_key: S3 object key that failed validation
            validation_details: Details about the validation failure
        """
        context = {'file_key': file_key}
        if validation_details:
            context.update(validation_details)
        
        super().__init__(message, 'file_validation_error', context)
        self.file_key = file_key
        self.validation_details = validation_details or {}

class TextExtractionError(ResumeProcessingError):
    """Exception raised when text extraction fails."""
    
    def __init__(self, message: str, file_key: str = None, file_type: str = None):
        """
        Initialize text extraction error.
        
        Args:
            message: Error message
            file_key: S3 object key that failed extraction
            file_type: Type of file that failed
        """
        context = {
            'file_key': file_key,
            'file_type': file_type
        }
        
        super().__init__(message, 'text_extraction_error', context)
        self.file_key = file_key
        self.file_type = file_type

class AIAnalysisError(ResumeProcessingError):
    """Exception raised when AI analysis fails."""
    
    def __init__(self, message: str, file_key: str = None, api_response: str = None):
        """
        Initialize AI analysis error.
        
        Args:
            message: Error message
            file_key: S3 object key that failed analysis
            api_response: Response from AI API if available
        """
        context = {
            'file_key': file_key,
            'api_response': api_response
        }
        
        super().__init__(message, 'ai_analysis_error', context)
        self.file_key = file_key
        self.api_response = api_response

class SNSPublishError(ResumeProcessingError):
    """Exception raised when SNS publishing fails."""
    
    def __init__(self, message: str, topic_arn: str = None, file_key: str = None):
        """
        Initialize SNS publish error.
        
        Args:
            message: Error message
            topic_arn: SNS topic ARN that failed
            file_key: S3 object key related to the operation
        """
        context = {
            'topic_arn': topic_arn,
            'file_key': file_key
        }
        
        super().__init__(message, 'sns_publish_error', context)
        self.topic_arn = topic_arn
        self.file_key = file_key

class S3Error(ResumeProcessingError):
    """Exception raised when S3 operations fail."""
    
    def __init__(self, message: str, bucket: str = None, object_key: str = None, operation: str = None):
        """
        Initialize S3 error.
        
        Args:
            message: Error message
            bucket: S3 bucket name
            object_key: S3 object key
            operation: S3 operation that failed
        """
        context = {
            'bucket': bucket,
            'object_key': object_key,
            'operation': operation
        }
        
        super().__init__(message, 's3_error', context)
        self.bucket = bucket
        self.object_key = object_key
        self.operation = operation