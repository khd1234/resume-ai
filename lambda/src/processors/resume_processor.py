"""
Core resume processing logic with SNS integration.
"""

import logging
import hashlib
from typing import Dict, Any, Optional
from datetime import datetime
from .text_extractor import TextExtractor
from .ai_analyzer import AIAnalyzer
from .sns_publisher import SNSPublisher

logger = logging.getLogger(__name__)

class ResumeProcessor:
    """Handles core resume processing operations with SNS publishing."""
    
    def __init__(self, sns_publisher: SNSPublisher):
        """
        Initialize the resume processor.
        
        Args:
            sns_publisher: SNS publisher for result communication
        """
        self.text_extractor = TextExtractor()
        self.ai_analyzer = AIAnalyzer()
        self.sns_publisher = sns_publisher
    
    def generate_content_hash(self, file_content: bytes) -> str:
        """
        Generate SHA-256 hash of file content for duplicate detection.
        
        Args:
            file_content: Raw file content bytes
            
        Returns:
            SHA-256 hash string
        """
        return hashlib.sha256(file_content).hexdigest()
    
    def is_already_processed(self, object_key: str, content_hash: str = None) -> bool:
        """
        Check if a file has already been processed using S3 metadata.
        
        This now uses S3 object tags/metadata instead of database lookup.
        
        Args:
            object_key: S3 object key to check
            content_hash: Content hash for duplicate detection
            
        Returns:
            True if file has been processed, False otherwise
        """
        try:
            # TODO: Implement S3 metadata check for processing status
            # This could check S3 object tags or metadata for processing markers
            logger.debug(f"Checking processing status for {object_key}")
            
            # For now, return False to allow processing
            # Future implementation will check S3 tags like:
            # - processing-status: completed/error
            # - content-hash: for duplicate detection
            # - processed-timestamp: when processing completed
            
            return False
            
        except Exception as e:
            logger.warning(f"Error checking processing status for {object_key}: {str(e)}")
            # If we can't check, assume not processed to avoid blocking
            return False
    
    def notify_processing_started(self, s3_info: Dict[str, Any]) -> bool:
        """
        Notify that processing has started via SNS.
        
        Args:
            s3_info: S3 information dictionary from extract_s3_info()
            
        Returns:
            True if notification sent successfully, False otherwise
        """
        try:
            success = self.sns_publisher.publish_processing_started(s3_info)
            
            if success:
                logger.info(f"Notified processing started: "
                           f"bucket={s3_info.get('bucket')}, "
                           f"key={s3_info.get('object_key')}, "
                           f"size={s3_info.get('size')}")
            else:
                logger.warning(f"Failed to notify processing started for {s3_info.get('object_key')}")
            
            return success
            
        except Exception as e:
            logger.error(f"Error notifying processing started: {str(e)}")
            return False
    
    def process_resume_full_pipeline(self, s3_info: Dict[str, Any], file_content: bytes, file_type: str) -> Dict[str, Any]:
        """
        Process resume through the full pipeline: extraction -> analysis -> storage.
        
        This will be the main processing method once all stories are implemented.
        
        Args:
            s3_info: S3 file information
            file_content: Raw file content as bytes
            file_type: Type of file (pdf, docx)
            
        Returns:
            Dict with complete processing results
        """
        try:
            object_key = s3_info['object_key']
            
            # Story 2: Extract text from file
            extraction_result = self.text_extractor.extract_text(file_content, file_type, s3_info)
            
            # Story 3: Analyze with AI
            analysis_result = self.ai_analyzer.analyze_resume(extraction_result['extracted_text'], s3_info)
            
            # Story 4: Publish results via SNS
            logger.info(f"Publishing results via SNS for {object_key}")
            
            # Combine results for publishing
            complete_result = {
                **analysis_result,
                'extraction_metadata': {
                    'text_length': extraction_result.get('text_length', 0),
                    'extraction_method': extraction_result.get('extraction_method'),
                    'extraction_time': extraction_result.get('extraction_time')
                },
                'processing_metadata': {
                    'file_key': object_key,
                    'file_type': file_type,
                    'file_size': s3_info.get('size'),
                    'processing_completed': datetime.utcnow().isoformat()
                }
            }
            
            # Publish completion via SNS
            self.sns_publisher.publish_processing_completed(s3_info, complete_result)
            
            logger.info(f"Successfully completed full pipeline for {object_key}")
            return complete_result
            
        except Exception as e:
            logger.error(f"Full pipeline processing failed for {s3_info.get('object_key', 'unknown')}: {str(e)}")
            
            # Publish error via SNS
            self.sns_publisher.publish_processing_error(
                s3_info, 
                f"Pipeline processing failed: {str(e)}",
                error_type=type(e).__name__
            )
            
            raise
    
    def extract_text_from_file(self, s3_info: Dict[str, Any], file_content: bytes, file_type: str) -> Dict[str, Any]:
        """
        Extract text content from resume file.
        
        This delegates to the TextExtractor for Story 2.
        
        Args:
            s3_info: S3 file information
            file_content: Raw file content as bytes
            file_type: Type of file (pdf, docx)
            
        Returns:
            Dict with extracted text and metadata
        """
        return self.text_extractor.extract_text(file_content, file_type, s3_info)
    
    def analyze_resume_with_ai(self, extracted_text: str, s3_info: Dict[str, Any]) -> Dict[str, Any]:
        """
        Analyze resume content using AI.
        
        This delegates to the AIAnalyzer for Story 3.
        
        Args:
            extracted_text: Text content extracted from resume
            s3_info: S3 file information
            
        Returns:
            Dict with AI analysis results and scoring
        """
        return self.ai_analyzer.analyze_resume(extracted_text, s3_info)
    
    def publish_duplicate_detected(self, s3_info: Dict[str, Any], 
                                 existing_results: Dict[str, Any] = None) -> bool:
        """
        Publish notification that a duplicate file was detected.
        
        Args:
            s3_info: S3 file information
            existing_results: Previously processed results if available
            
        Returns:
            True if published successfully, False otherwise
        """
        try:
            return self.sns_publisher.publish_duplicate_detected(s3_info, existing_results)
        except Exception as e:
            logger.error(f"Failed to publish duplicate detection: {str(e)}")
            return False