import logging
from typing import Dict, Any

# Import local modules
from config import config
from processors import S3RecordProcessor
from utils import safe_json_dumps

# Configure logging for AWS Lambda
import os
logging.getLogger().setLevel(getattr(logging, config.LOG_LEVEL.upper()))
logger = logging.getLogger(__name__)

def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    AWS Lambda handler for processing S3 events when resume files are uploaded.
    
    This function implements Story 1: S3 Event-Driven Lambda Trigger
    - Processes S3 ObjectCreated events
    - Validates resume files (PDF/DOCX only)
    - Implements idempotency checks
    - Provides comprehensive error handling
    
    Args:
        event: S3 event data containing bucket and object information
        context: Lambda runtime context
        
    Returns:
        Dict with status code and processing results
    """
    try:
        # Log the incoming event for debugging
        logger.info(f"Lambda invoked with event: {safe_json_dumps(event, '{}')}")
        
        # Validate configuration
        config_errors = config.validate_config()
        if config_errors:
            logger.warning(f"Configuration issues detected: {config_errors}")
        
        # Initialize S3 record processor with SNS configuration
        processor = S3RecordProcessor(sns_topic_arn=config.SNS_TOPIC_ARN)
        response = processor.process_event(event, context)
        
        logger.info(f"Lambda execution completed with status {response.get('statusCode', 'unknown')}")
        return response
        
    except Exception as e:
        logger.error(f"Lambda handler critical error: {str(e)}", exc_info=True)
        return {
            'statusCode': 500,
            'body': safe_json_dumps({
                'error': 'Internal server error',
                'message': str(e),
                'error_type': type(e).__name__
            })
        }

