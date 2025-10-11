"""
S3 record processor for handling S3 events.
"""

import logging
from typing import Dict, Any, List
from utils import (
    extract_s3_info, 
    create_processing_context, 
    log_processing_metrics,
    ProcessingError,
    safe_json_dumps
)
from .file_validator import FileValidator
from .resume_processor import ResumeProcessor
from .sns_publisher import SNSPublisher, create_sns_publisher
from config import config

logger = logging.getLogger(__name__)

class S3RecordProcessor:
    """Processes S3 event records for resume files with SNS integration."""
    
    def __init__(self, sns_topic_arn: str = None):
        """
        Initialize the S3 record processor.
        
        Args:
            sns_topic_arn: ARN of SNS topic for result publishing
        """
        self.file_validator = FileValidator()
        
        # Initialize SNS publisher
        if config.SNS_TOPIC_ARN:
            self.sns_publisher = create_sns_publisher(config.SNS_TOPIC_ARN)
            if not self.sns_publisher:
                raise Exception(f"Failed to create SNS publisher for topic: {config.SNS_TOPIC_ARN}")

            self.resume_processor = ResumeProcessor(self.sns_publisher)
        else:
            logger.warning("No SNS topic ARN provided - processing will be limited")
            self.sns_publisher = None
            # Create a dummy processor for testing purposes
            self.resume_processor = None
    
    def process_event(self, event: Dict[str, Any], context: Any) -> Dict[str, Any]:
        """
        Process S3 event containing multiple records.
        
        Args:
            event: S3 event data containing bucket and object information
            context: Lambda runtime context
            
        Returns:
            Dict with status code and processing results
        """
        try:
            # Log the incoming event for debugging
            logger.info(f"Processing S3 event with {len(event.get('Records', []))} records")
            
            # Process each S3 record in the event
            processed_files = []
            errors = []
            
            for record in event.get('Records', []):
                try:
                    result = self.process_s3_record(record)
                    processed_files.append(result)
                    logger.info(f"Successfully processed: {result['file_key']}")
                except Exception as e:
                    error_info = {
                        'error': str(e),
                        'error_type': type(e).__name__,
                        'record_event_name': record.get('eventName', 'unknown')
                    }
                    errors.append(error_info)
                    logger.error(f"Error processing record: {str(e)}", exc_info=True)
            
            # Determine response status
            if not errors:
                status_code = 200  # All successful
            elif processed_files:
                status_code = 207  # Partial success
            else:
                status_code = 500  # All failed
            
            # Return summary of processing results
            response = {
                'statusCode': status_code,
                'body': safe_json_dumps({
                    'message': f'Processed {len(processed_files)} files successfully, {len(errors)} errors',
                    'processed_files': processed_files,
                    'errors': errors,
                    'total_records': len(event.get('Records', []))
                })
            }
            
            logger.info(f"S3 event processing completed with status {status_code}")
            return response
            
        except Exception as e:
            logger.error(f"S3 event processing critical error: {str(e)}", exc_info=True)
            return {
                'statusCode': 500,
                'body': safe_json_dumps({
                    'error': 'Internal server error',
                    'message': str(e),
                    'error_type': type(e).__name__
                })
            }
    
    def process_s3_record(self, record: Dict[str, Any]) -> Dict[str, Any]:
        """
        Process a single S3 record from the event.
        
        Args:
            record: Individual S3 record from the event
            
        Returns:
            Dict with processing result for this record
            
        Raises:
            ProcessingError: If processing fails
        """
        try:
            # Extract and validate S3 event information
            s3_info = extract_s3_info(record)
            processing_context = create_processing_context(s3_info)
            
            log_processing_metrics(processing_context, "started")
            
            # Validate this is a creation event
            if not s3_info['event_name'].startswith('ObjectCreated'):
                raise ProcessingError(
                    f"Ignoring non-creation event: {s3_info['event_name']}",
                    error_type="invalid_event_type",
                    context=processing_context
                )
            
            logger.info(f"Processing S3 event: {s3_info['event_name']} for {s3_info['bucket_name']}/{s3_info['object_key']}")
            
            # Validate file type and path
            validation_result = self.file_validator.validate_resume_file(s3_info['object_key'], s3_info['object_size'])
            if not validation_result['is_valid']:
                raise ProcessingError(
                    f"File validation failed: {validation_result['reason']}",
                    error_type="validation_failed",
                    context=processing_context
                )
            
            # Check for duplicate processing (idempotency)
            if self.resume_processor and self.resume_processor.is_already_processed(s3_info['object_key']):
                logger.info(f"File {s3_info['object_key']} already processed, skipping")
                log_processing_metrics(processing_context, "skipped", {"reason": "already_processed"})
                
                # Publish duplicate detection notification
                if self.resume_processor:
                    self.resume_processor.publish_duplicate_detected(s3_info)
                
                return {
                    'file_key': s3_info['object_key'],
                    'status': 'skipped',
                    'reason': 'already_processed',
                    'bucket': s3_info['bucket_name'],
                    'size': s3_info['object_size'],
                    'processing_id': processing_context['processing_id']
                }
            
            # Validate we have resume processor for full processing
            if not self.resume_processor:
                raise ProcessingError(
                    "Resume processor not available - SNS configuration required",
                    error_type="configuration_error",
                    context=processing_context
                )
            
            # Notify processing started
            self.resume_processor.notify_processing_started(s3_info)
            
            # Use the unified pipeline for processing (Stories 2-4)
            try:
                from utils import download_file_from_s3
                
                logger.info(f"Downloading file for processing: {s3_info['object_key']}")
                file_content = download_file_from_s3(s3_info)
                
                logger.info(f"Starting full pipeline processing for: {s3_info['object_key']}")
                complete_result = self.resume_processor.process_resume_full_pipeline(
                    s3_info, 
                    file_content, 
                    validation_result['file_type']
                )
                
                # Extract metadata for logging
                extraction_metadata = complete_result.get('extraction_metadata', {})
                processing_metadata = complete_result.get('processing_metadata', {})
                
                # Log extraction success
                log_processing_metrics(processing_context, "text_extracted", {
                    "file_type": validation_result['file_type'],
                    "text_length": extraction_metadata.get('text_length', 0),
                    "extraction_method": extraction_metadata.get('extraction_method', 'unknown'),
                    "extraction_time": extraction_metadata.get('extraction_time', 0)
                })
                
                # Log AI analysis completion
                log_processing_metrics(processing_context, "ai_analysis_completed", {
                    "overall_score": complete_result.get('overall_score', 0),
                    "ats_compatibility": complete_result.get('ats_compatibility', 0),
                    "content_quality": complete_result.get('content_quality', 0),
                    "model_used": complete_result.get('analysis_metadata', {}).get('model_used', 'unknown'),
                    "analysis_duration": complete_result.get('analysis_metadata', {}).get('analysis_duration_seconds', 0)
                })
                
                # Log pipeline completion
                log_processing_metrics(processing_context, "pipeline_completed", {
                    "file_type": validation_result['file_type'],
                    "file_size_formatted": processing_context['file_size_formatted'],
                    "overall_score": complete_result.get('overall_score', 0),
                    "processing_complete": True
                })
                
                return {
                    'file_key': s3_info['object_key'],
                    'status': 'done',
                    'bucket': s3_info['bucket_name'],
                    'size': s3_info['object_size'],
                    'file_type': validation_result['file_type'],
                    'processing_id': processing_context['processing_id'],
                    'text_length': extraction_metadata.get('text_length', 0),
                    'extraction_method': extraction_metadata.get('extraction_method', 'unknown'),
                    'analysis_results': {
                        'overall_score': complete_result.get('overall_score'),
                        'ats_compatibility': complete_result.get('ats_compatibility'),
                        'content_quality': complete_result.get('content_quality'),
                        'section_scores': complete_result.get('section_scores'),
                        'feedback': complete_result.get('feedback'),
                        'analysis_metadata': complete_result.get('analysis_metadata')
                    },
                    'complete_result': complete_result
                }
                
            except Exception as e:
                # Log pipeline processing failure
                logger.error(f"Pipeline processing failed for {s3_info['object_key']}: {str(e)}")
                log_processing_metrics(processing_context, "pipeline_failed", {
                    "error": str(e),
                    "error_type": type(e).__name__
                })
                
                # Raise as ProcessingError to maintain error handling consistency
                raise ProcessingError(
                    f"Pipeline processing failed: {str(e)}",
                    error_type="pipeline_processing_failed",
                    context=processing_context
                )
            
        except ProcessingError:
            # Re-raise ProcessingError as-is
            raise
        except Exception as e:
            logger.error(f"Unexpected error processing S3 record: {str(e)}", exc_info=True)
            raise ProcessingError(
                f"Failed to process S3 record: {str(e)}",
                error_type="unexpected_error",
                context=locals().get('processing_context', {})
            )