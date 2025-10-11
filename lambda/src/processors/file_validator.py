"""
File validation processor for resume files.
"""

import logging
from typing import Dict, Any
from config import config

logger = logging.getLogger(__name__)

class FileValidator:
    """Handles validation of resume files for processing."""
    
    def validate_resume_file(self, object_key: str, file_size: int) -> Dict[str, Any]:
        """
        Validate resume file for processing.
        
        Args:
            object_key: S3 object key
            file_size: Size of the file in bytes
            
        Returns:
            Dict containing validation results
        """
        # Check file size
        if file_size > config.MAX_FILE_SIZE:
            return {
                'is_valid': False,
                'reason': f'File size {file_size} bytes exceeds maximum {config.MAX_FILE_SIZE} bytes'
            }
        
        if file_size == 0:
            return {
                'is_valid': False,
                'reason': 'File is empty'
            }
        
        # Check file extension using config
        if not config.is_supported_file(object_key):
            return {
                'is_valid': False,
                'reason': f'Unsupported file type. Supported types: {", ".join(config.SUPPORTED_EXTENSIONS)}'
            }
        
        # Determine file type
        file_extension = None
        for ext in config.SUPPORTED_EXTENSIONS:
            if object_key.lower().endswith(ext):
                file_extension = ext
                break
        
        # Check if file is in resume upload path using config
        if not config.is_resume_path(object_key):
            return {
                'is_valid': False,
                'reason': f'File not in resume upload path. Expected prefixes: {", ".join(config.RESUME_PATH_PREFIXES)}'
            }
        
        return {
            'is_valid': True,
            'file_type': file_extension.lstrip('.'),  # Remove the dot
            'size': file_size
        }
    
    def validate_file_content(self, content: bytes, file_type: str) -> Dict[str, Any]:
        """
        Validate file content for processing.
        
        TODO: Story 2 - This method will be used when text extraction is implemented.
        Content validation provides security by checking file signatures before processing.
        
        Args:
            content: File content as bytes
            file_type: Type of file (pdf, docx)
            
        Returns:
            Dict containing validation results
        """
        if not content:
            return {
                'is_valid': False,
                'reason': 'File content is empty'
            }
        
        # Basic file signature validation
        if file_type == 'pdf':
            if not content.startswith(b'%PDF'):
                return {
                    'is_valid': False,
                    'reason': 'Invalid PDF file signature'
                }
        elif file_type == 'docx':
            # DOCX files are ZIP archives with specific structure
            if not content.startswith(b'PK'):
                return {
                    'is_valid': False,
                    'reason': 'Invalid DOCX file signature'
                }
        
        return {
            'is_valid': True,
            'content_size': len(content)
        }