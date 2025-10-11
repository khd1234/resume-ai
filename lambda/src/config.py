"""
Configuration module for the resume processor lambda function.
Handles environment variables and application settings.
"""

import os
from typing import List, Optional

class Config:
    """Configuration class for resume processor lambda."""
    
    # Environment variables
    SNS_TOPIC_ARN: Optional[str] = os.getenv('SNS_TOPIC_ARN')
    OPENAI_API_KEY: Optional[str] = os.getenv('OPENAI_API_KEY')
    S3_BUCKET_NAME: Optional[str] = os.getenv('S3_BUCKET_NAME')
    
    # Processing settings
    PROCESSING_TIMEOUT: int = int(os.getenv('PROCESSING_TIMEOUT', '30'))  # 30 seconds default
    MAX_FILE_SIZE: int = int(os.getenv('MAX_FILE_SIZE', '2097152'))  # 2MB default
    
    # Supported file types
    SUPPORTED_EXTENSIONS: List[str] = ['.pdf', '.docx']
    
    # S3 path prefixes for resume files
    RESUME_PATH_PREFIXES: List[str] = [
        'uploads/',
        'user-uploads/',
        'temp-uploads/'  # For temporary uploads during processing
    ]
    
    # OpenAI settings (for future stories)
    OPENAI_MODEL: str = os.getenv('OPENAI_MODEL', 'gpt-4o-mini')
    OPENAI_MAX_TOKENS: int = int(os.getenv('OPENAI_MAX_TOKENS', '500'))
    OPENAI_TEMPERATURE: float = float(os.getenv('OPENAI_TEMPERATURE', '0'))  # Low for consistent results
    
    # Retry settings
    MAX_RETRIES: int = int(os.getenv('MAX_RETRIES', '3'))
    RETRY_DELAY: int = int(os.getenv('RETRY_DELAY', '1'))  # seconds
    
    # Logging settings
    LOG_LEVEL: str = os.getenv('LOG_LEVEL', 'INFO')
    
    @classmethod
    def validate_config(cls) -> List[str]:
        """
        Validate required configuration variables.
        
        Returns:
            List of missing or invalid configuration items
        """
        errors = []
        
        # Check required environment variables for production
        if not cls.SNS_TOPIC_ARN:
            errors.append("SNS_TOPIC_ARN environment variable is required")
        
        if not cls.OPENAI_API_KEY:
            errors.append("OPENAI_API_KEY environment variable is required")
        
        # Validate numeric settings
        if cls.PROCESSING_TIMEOUT <= 0:
            errors.append("PROCESSING_TIMEOUT must be positive")
        
        if cls.MAX_FILE_SIZE <= 0:
            errors.append("MAX_FILE_SIZE must be positive")
        
        if cls.MAX_RETRIES < 0:
            errors.append("MAX_RETRIES must be non-negative")
        
        return errors
    
    @classmethod
    def is_supported_file(cls, filename: str) -> bool:
        """
        Check if a file has a supported extension.
        
        Args:
            filename: Name of the file to check
            
        Returns:
            True if file extension is supported, False otherwise
        """
        return any(filename.lower().endswith(ext) for ext in cls.SUPPORTED_EXTENSIONS)
    
    @classmethod
    def is_resume_path(cls, object_key: str) -> bool:
        """
        Check if an S3 object key is in a valid resume path.
        
        Args:
            object_key: S3 object key to check
            
        Returns:
            True if path is valid for resume processing, False otherwise
        """
        return any(object_key.startswith(prefix) for prefix in cls.RESUME_PATH_PREFIXES)

# Global configuration instance
config = Config()