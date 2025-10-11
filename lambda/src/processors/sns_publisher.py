"""
SNS publisher for resume processing results.

This module handles publishing processing results to SNS topic for backend consumption.
Replaces direct database access following AWS best practices.
"""

import json
import logging
import boto3
from typing import Dict, Any, Optional
from datetime import datetime
from exceptions import SNSPublishError

logger = logging.getLogger(__name__)

class SNSPublisher:
    """Handles publishing resume processing results to SNS."""
    
    def __init__(self, topic_arn: str):
        """
        Initialize the SNS publisher.
        
        Args:
            topic_arn: ARN of the SNS topic to publish to
        """
        self.topic_arn = topic_arn
        self.sns_client = boto3.client('sns')
        logger.info(f"SNSPublisher initialized for topic: {topic_arn}")
    
    def publish_processing_started(self, s3_info: Dict[str, Any]) -> bool:
        """
        Publish notification that processing has started.
        
        Args:
            s3_info: S3 information dictionary
            
        Returns:
            True if published successfully, False otherwise
        """
        try:
            message = {
                'event_type': 'processing_started',
                'file_key': s3_info.get('object_key'),
                'bucket': s3_info.get('bucket'),
                'timestamp': datetime.utcnow().isoformat(),
                'file_size': s3_info.get('size'),
                'file_type': s3_info.get('content_type')
            }
            
            return self._publish_message(message, 'Resume Processing Started')
            
        except Exception as e:
            logger.error(f"Failed to publish processing started notification: {str(e)}")
            return False
    
    def publish_processing_completed(self, s3_info: Dict[str, Any], 
                                   analysis_results: Dict[str, Any]) -> bool:
        """
        Publish successful processing results.
        
        Args:
            s3_info: S3 information dictionary
            analysis_results: Complete analysis results from AI processing
            
        Returns:
            True if published successfully, False otherwise
            
        Raises:
            SNSPublishError: If publishing fails after retries
        """
        try:
            message = {
                'event_type': 'processing_completed',
                'file_key': s3_info.get('object_key'),
                'bucket': s3_info.get('bucket'),
                'timestamp': datetime.utcnow().isoformat(),
                'status': 'completed',
                'results': analysis_results
            }
            
            success = self._publish_message(message, 'Resume Processing Completed')
            if not success:
                raise SNSPublishError(f"Failed to publish completion results for {s3_info.get('object_key')}")
            
            logger.info(f"Successfully published completion results for {s3_info.get('object_key')}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to publish processing completed: {str(e)}")
            raise SNSPublishError(f"Failed to publish completion: {str(e)}")
    
    def publish_processing_error(self, s3_info: Dict[str, Any], 
                               error_message: str, error_type: str = None) -> bool:
        """
        Publish processing error notification.
        
        Args:
            s3_info: S3 information dictionary
            error_message: Detailed error message
            error_type: Type of error that occurred
            
        Returns:
            True if published successfully, False otherwise
        """
        try:
            message = {
                'event_type': 'processing_error',
                'file_key': s3_info.get('object_key'),
                'bucket': s3_info.get('bucket'),
                'timestamp': datetime.utcnow().isoformat(),
                'status': 'error',
                'error_message': error_message,
                'error_type': error_type or 'unknown'
            }
            
            success = self._publish_message(message, 'Resume Processing Error')
            if success:
                logger.info(f"Published error notification for {s3_info.get('object_key')}")
            
            return success
            
        except Exception as e:
            logger.error(f"Failed to publish processing error: {str(e)}")
            return False
    
    def publish_duplicate_detected(self, s3_info: Dict[str, Any], 
                                 existing_results: Dict[str, Any] = None) -> bool:
        """
        Publish notification that a duplicate file was detected.
        
        Args:
            s3_info: S3 information dictionary
            existing_results: Previously processed results if available
            
        Returns:
            True if published successfully, False otherwise
        """
        try:
            message = {
                'event_type': 'duplicate_detected',
                'file_key': s3_info.get('object_key'),
                'bucket': s3_info.get('bucket'),
                'timestamp': datetime.utcnow().isoformat(),
                'status': 'duplicate',
                'existing_results': existing_results
            }
            
            success = self._publish_message(message, 'Duplicate Resume Detected')
            if success:
                logger.info(f"Published duplicate notification for {s3_info.get('object_key')}")
            
            return success
            
        except Exception as e:
            logger.error(f"Failed to publish duplicate detection: {str(e)}")
            return False
    
    def _publish_message(self, message: Dict[str, Any], subject: str) -> bool:
        """
        Publish message to SNS topic with retry logic.
        
        Args:
            message: Message dictionary to publish
            subject: Subject for the SNS message
            
        Returns:
            True if published successfully, False otherwise
        """
        max_retries = 3
        retry_count = 0
        
        while retry_count < max_retries:
            try:
                response = self.sns_client.publish(
                    TopicArn=self.topic_arn,
                    Message=json.dumps(message, default=str),
                    Subject=subject,
                    MessageAttributes={
                        'event_type': {
                            'DataType': 'String',
                            'StringValue': message.get('event_type', 'unknown')
                        },
                        'file_key': {
                            'DataType': 'String',
                            'StringValue': message.get('file_key', 'unknown')
                        }
                    }
                )
                
                logger.debug(f"SNS publish successful. MessageId: {response.get('MessageId')}")
                return True
                
            except Exception as e:
                retry_count += 1
                logger.warning(f"SNS publish attempt {retry_count} failed: {str(e)}")
                
                if retry_count >= max_retries:
                    logger.error(f"SNS publish failed after {max_retries} retries: {str(e)}")
                    return False
        
        return False
    
    def test_connection(self) -> bool:
        """
        Test SNS topic connectivity.
        
        Returns:
            True if connection is successful, False otherwise
        """
        try:
            # Try to get topic attributes to test connectivity
            self.sns_client.get_topic_attributes(TopicArn=self.topic_arn)
            logger.info("SNS topic connection test successful")
            return True
            
        except Exception as e:
            logger.error(f"SNS topic connection test failed: {str(e)}")
            return False


def create_sns_publisher(topic_arn: str) -> Optional[SNSPublisher]:
    """
    Factory function to create and test SNS publisher.
    
    Args:
        topic_arn: ARN of the SNS topic
        
    Returns:
        SNSPublisher instance if successful, None otherwise
    """
    try:
        publisher = SNSPublisher(topic_arn)
        
        if publisher.test_connection():
            return publisher
        else:
            logger.error("SNS connection test failed during publisher creation")
            return None
            
    except Exception as e:
        logger.error(f"Failed to create SNS publisher: {str(e)}")
        return None