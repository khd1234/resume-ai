# Epic: AI Resume Processing Lambda

## Overview

Create a Python AWS Lambda function that automatically processes resume files uploaded to S3, extracts text content, analyzes it using OpenAI API, and stores the results in the database. This lambda will be triggered whenever a resume file is uploaded to the S3 bucket.

## Business Context

The AI Resume Builder application currently handles file uploads to S3 and polls for processing status, but lacks the actual resume processing functionality. This epic fills that gap by implementing the core AI analysis engine that:

- Extracts text from PDF and DOCX files
- Analyzes resume content using OpenAI GPT models
- Provides consistent scoring based on resume sections
- Publishes results to SNS for backend processing (following AWS best practices)

## Current Architecture Integration

### Frontend Flow (Already Implemented)

1. User uploads resume via drag-and-drop interface (`upload-interface.tsx`)
2. Frontend gets presigned S3 URL (`/api/upload/presigned-url`)
3. File is uploaded directly to S3
4. Frontend polls `/api/resume-status` endpoint for processing completion
5. Results are displayed with score and breakdown

### Updated Backend Integration Points (SNS-Based Architecture)

- **SNS Topic**: `resume-processing-results` for Lambda → Backend communication
- **Database**: Backend handles all database operations via Next.js API routes
- **Processing Flow**:
  1. S3 Upload → Lambda Processing → SNS Publish
  2. Backend SNS Handler → Database Storage → Frontend Notification
- **API Endpoint**: `/api/resume-status` serves processing status from backend database
- **Webhook**: `/api/webhooks/sns` handles SNS notifications from Lambda

## User Stories

### Story 1: S3 Event-Driven Lambda Trigger

**As a** system administrator  
**I want** the lambda to automatically trigger when files are uploaded to S3  
**So that** resume processing happens immediately without manual intervention

**Acceptance Criteria:**

- Lambda is triggered by S3 `ObjectCreated` events
- Only processes files in the resume upload path/prefix
- Handles both PDF and DOCX file types
- Includes error handling for trigger failures

**Technical Requirements:**

- Configure S3 bucket notifications for lambda trigger
- Filter events by file prefix/suffix (.pdf, .docx)
- Parse S3 event to extract bucket and object key information
- Implement idempotent processing to handle duplicate triggers

### Story 2: Text Extraction from Resume Files

**As a** resume processing system  
**I want** to extract clean text content from PDF and DOCX files  
**So that** the AI can analyze the resume content effectively

**Acceptance Criteria:**

- Successfully extracts text from PDF files preserving structure
- Successfully extracts text from DOCX files preserving formatting
- Handles corrupted or password-protected files gracefully
- Maintains text layout for proper section identification
- Maximum file size validation (2MB limit)

**Technical Requirements:**

- Use libraries like `PyPDF2`/`pdfplumber` for PDF extraction
- Use `python-docx` for DOCX extraction
- Implement text cleaning and formatting preservation
- Handle encoding issues and special characters
- Return structured text with section boundaries

### Story 3: OpenAI-Powered Resume Analysis and Scoring

**As a** job seeker  
**I want** my resume to be analyzed by AI for comprehensive scoring  
**So that** I receive actionable feedback on multiple resume aspects

**Acceptance Criteria:**

- Analyzes resume across key sections: Contact Info, Summary, Experience, Education, Skills
- Provides overall score out of 100 based on ATS optimization
- Generates detailed breakdown with section-specific scores
- Includes specific improvement recommendations
- Consistent scoring for identical resume content (deterministic results)

**Technical Requirements:**

- Integrate with OpenAI GPT-3.5/GPT-4 API
- Design comprehensive scoring rubric covering:
  - ATS compatibility (keyword usage, formatting)
  - Content quality (achievements, quantifiable results)
  - Structure and organization
  - Professional language and tone
  - Industry-specific relevance
- Implement consistent prompt engineering for deterministic results
- Handle API rate limits and retries
- Cache results to avoid reprocessing identical content

### Story 4: SNS Integration for Result Publishing

**As a** Lambda function  
**I want** to publish processing results to SNS instead of directly updating the database  
**So that** the architecture follows AWS best practices with proper separation of concerns

**Acceptance Criteria:**

- Publishes processing results to SNS topic when analysis completes
- Sends error notifications via SNS if processing fails
- Includes comprehensive result data in SNS message payload
- Handles SNS publishing failures gracefully
- Maintains processing history and audit trail

**Technical Requirements:**

- Connect to AWS SNS using boto3
- Design standardized message format for different result types
- Implement retry logic for SNS publishing failures
- Include file metadata and processing context in messages
- Support both success and error result publishing

### Story 6: Error Handling and Monitoring

**As a** system administrator  
**I want** comprehensive error handling and monitoring  
**So that** processing failures are logged and can be debugged effectively

**Acceptance Criteria:**

- Logs all processing steps with appropriate detail levels
- Catches and handles file processing errors gracefully
- Provides meaningful error messages for different failure types
- Implements retry logic for transient failures
- Tracks processing metrics and performance

**Technical Requirements:**

- Use AWS CloudWatch for logging and monitoring
- Implement structured logging with JSON format
- Set up CloudWatch alarms for error rates and processing times
- Create retry mechanisms for API failures
- Log processing duration and file size metrics

### Story 5: Idempotency and Duplicate Prevention

**As a** system  
**I want** to prevent duplicate processing of the same resume  
**So that** resources are used efficiently and results remain consistent

**Acceptance Criteria:**

- Detects if a file has already been processed using S3 metadata
- Returns existing results for duplicate uploads via SNS
- Uses content hash for true duplicate detection (not just filename)
- Allows reprocessing if explicitly requested
- Publishes duplicate detection results to SNS

**Technical Requirements:**

- Generate content hash (SHA-256) of file contents
- Store processing metadata in S3 object tags
- Implement content-based deduplication
- Compare file metadata for similarity detection
- Provide option to force reprocessing if needed

## Technical Architecture

### Lambda Function Structure

```
resume-processor-lambda/
├── src/
│   ├── main.py                  # Lambda entry point and orchestration
│   ├── processors/              # Modular processing components
│   │   ├── __init__.py         # Processor module exports
│   │   ├── s3_processor.py     # S3 event handling and orchestration
│   │   ├── file_validator.py   # File validation logic
│   │   ├── resume_processor.py # Core resume processing coordinator
│   │   ├── text_extractor.py   # PDF/DOCX text extraction (Story 2)
│   │   ├── ai_analyzer.py      # OpenAI integration and scoring (Story 3)
│   │   └── sns_publisher.py    # SNS result publishing (Story 4)
│   ├── exceptions.py           # Custom exception classes
│   ├── utils.py                # Utility functions (S3, logging, etc.)
│   └── config.py               # Configuration and environment variables
├── requirements.txt            # Python dependencies
├── Dockerfile                  # Container for deployment
└── lambda_deployment.yaml     # AWS deployment configuration
```

### Architecture Benefits

The new modular architecture provides:

- **Separation of Concerns**: Each module handles a specific aspect of processing
- **Testability**: Individual modules can be unit tested independently
- **Maintainability**: Changes to one processing step don't affect others
- **Extensibility**: New processors can be added easily
- **Future-Proofing**: Ready for upcoming stories with dedicated modules

### Module Responsibilities

#### Core Modules (Story 1 - Complete)

- **`main.py`**: Lambda entry point, configuration validation, error handling
- **`s3_processor.py`**: S3 event processing, record iteration, error aggregation
- **`file_validator.py`**: File type validation, size checks, path validation
- **`resume_processor.py`**: Processing coordination, status tracking, pipeline orchestration
- **`exceptions.py`**: Custom exception classes for different failure types

#### Story 2 Modules (Text Extraction)

- **`text_extractor.py`**:
  - PDF text extraction using PyPDF2/pdfplumber
  - DOCX text extraction using python-docx
  - Text cleaning and formatting preservation
  - Section boundary detection

#### Story 3 Modules (AI Analysis)

- **`ai_analyzer.py`**:
  - OpenAI API integration with rate limiting
  - Comprehensive scoring rubric implementation
  - Prompt engineering for consistent results
  - Response parsing and validation

#### Story 4 Modules (SNS Integration)

- **`sns_publisher.py`**:
  - AWS SNS client integration
  - Standardized message format design
  - Result publishing with retry logic
  - Error notification handling

### Processing Pipeline Flow

```
1. S3 Event → main.lambda_handler()
2. Event Processing → S3RecordProcessor.process_event()
3. Record Processing → S3RecordProcessor.process_s3_record()
4. File Validation → FileValidator.validate_resume_file()
5. Idempotency Check → ResumeProcessor.is_already_processed()
6. Status Tracking → ResumeProcessor.mark_file_for_processing()
7. [Story 2] Text Extraction → TextExtractor.extract_text()
8. [Story 3] AI Analysis → AIAnalyzer.analyze_resume()
9. [Story 4] Result Publishing → SNSPublisher.publish_results()
```

### Key Dependencies

- `boto3` - AWS SDK for S3 and SNS operations
- `openai` - OpenAI API client
- `PyPDF2` or `pdfplumber` - PDF text extraction
- `python-docx` - DOCX text extraction
- `hashlib` - Content hashing for deduplication

### Environment Variables

- `SNS_TOPIC_ARN` - SNS topic ARN for result publishing
- `OPENAI_API_KEY` - OpenAI API authentication
- `S3_BUCKET_NAME` - Target S3 bucket name
- `PROCESSING_TIMEOUT` - Maximum processing time per file

### Integration with Backend API

The lambda will integrate with the backend via SNS messaging:

1. **Processing Start**: Lambda begins processing and optionally sends start notification
2. **Progress Updates**: Lambda can send intermediate progress via SNS (optional)
3. **Completion**: Lambda publishes comprehensive results to SNS topic
4. **Error Handling**: Lambda sends error details via SNS
5. **Backend Processing**: Backend SNS handler processes messages and updates database
6. **Frontend Polling**: Existing polling mechanism retrieves updated status from backend

### Scoring Rubric Framework

The AI analyzer will use a structured scoring approach:

```json
{
  "overall_score": 85,
  "section_scores": {
    "contact_information": 95,
    "professional_summary": 80,
    "work_experience": 90,
    "education": 85,
    "skills": 75,
    "formatting": 88
  },
  "recommendations": [
    "Add quantifiable achievements in work experience",
    "Include more industry-specific keywords",
    "Improve skills section organization"
  ],
  "ats_compatibility": 92,
  "content_quality": 78,
  "keyword_density": 85
}
```

## Success Metrics

- **Processing Speed**: 95% of resumes processed within 30 seconds
- **Accuracy**: Consistent scoring (±3 points) for identical resume content
- **Reliability**: 99.5% successful processing rate
- **Error Recovery**: Graceful handling of malformed files and API failures
- **Resource Usage**: Memory usage stays within Lambda limits (1GB)

## Dependencies and Prerequisites

### AWS Infrastructure

- S3 bucket configured with event notifications
- Lambda execution role with appropriate permissions
- CloudWatch logging and monitoring setup

### External Services

- OpenAI API account with sufficient usage limits
- PostgreSQL database accessible from Lambda

### Security Considerations

- Encrypted environment variables for API keys
- VPC configuration for database access if required
- IAM roles with minimal necessary permissions

## Current Implementation Status

### ✅ Story 1: S3 Event-Driven Lambda Trigger (Complete)

**Implemented Components:**

- Modular architecture with separated concerns
- S3 event processing with proper error handling
- File validation for PDF/DOCX files
- Idempotency checks (placeholder for database integration)
- Comprehensive logging and error tracking
- Configuration validation

**Key Files:**

- `src/main.py` - Lambda handler with orchestration
- `src/processors/s3_processor.py` - S3 event processing
- `src/processors/file_validator.py` - File validation logic
- `src/processors/resume_processor.py` - Processing coordination
- `src/exceptions.py` - Custom exception handling

### 🔄 Story 2: Text Extraction (Ready for Implementation)

**Prepared Framework:**

- `src/processors/text_extractor.py` - Text extraction module with placeholder methods
- PDF extraction method stub (`_extract_from_pdf`)
- DOCX extraction method stub (`_extract_from_docx`)
- Text cleaning framework (`clean_extracted_text`)

**Next Steps:**

- Implement PyPDF2/pdfplumber integration
- Implement python-docx integration
- Add text cleaning and formatting logic

### 🔄 Story 3: AI Analysis (Ready for Implementation)

**Prepared Framework:**

- `src/processors/ai_analyzer.py` - AI analysis module with comprehensive structure
- Scoring rubric framework defined
- OpenAI API integration stubs
- Prompt engineering framework

**Next Steps:**

- OpenAI API client setup
- Implement comprehensive scoring prompts
- Add response parsing and validation

### 🔄 Story 4: SNS Integration (Ready for Implementation)

**Prepared Framework:**

- `src/processors/sns_publisher.py` - SNS publishing module (to be created)
- Standardized message format design
- Result publishing with retry logic
- Error notification handling

**Next Steps:**

- SNS client setup with environment variables
- Implement message publishing for results and errors
- Add retry mechanisms and error handling

### 📋 Ready for Future Stories

**Story 5: Idempotency and Duplicate Prevention**

- Content hashing framework ready
- S3 metadata-based duplicate detection
- SNS-based result publishing for duplicates

**Story 6: Error Handling and Monitoring**

- Comprehensive logging already implemented
- Custom exception classes created
- CloudWatch integration ready

## Architecture Benefits Achieved

✅ **Modularity**: Each processing step is in its own module  
✅ **Testability**: Components can be tested independently  
✅ **Maintainability**: Clean separation of concerns  
✅ **Extensibility**: Easy to add new processors or modify existing ones  
✅ **Future-Proofing**: Framework ready for all upcoming stories

## Timeline and Phases

### Phase 1: Core Infrastructure (Week 1) ✅ **COMPLETE**

- Lambda function setup with modular architecture
- S3 trigger configuration and event processing
- File validation and error handling framework
- Database integration framework prepared

### Phase 2: Text Processing (Week 2)

- PDF and DOCX text extraction implementation
- Content cleaning and formatting preservation
- File validation and security checks
- Integration with existing processing pipeline

### Phase 3: AI Integration (Week 3)

- OpenAI API integration and prompt engineering
- Scoring rubric development and testing
- Result formatting and storage
- Performance optimization

### Phase 4: Production Readiness (Week 4)

- Comprehensive error handling and monitoring
- Database integration completion
- Performance optimization and testing
- Documentation and deployment procedures

### Deployment Notes

The modular architecture allows for:

- **Incremental Deployment**: Each story can be deployed independently
- **Easy Testing**: Individual modules can be tested in isolation
- **Rollback Safety**: Issues in one module don't affect others
- **Development Efficiency**: Multiple developers can work on different stories simultaneously

Current deployment status:

- ✅ Core infrastructure deployed and tested
- 🔄 Text extraction module ready for Story 2 implementation
- 🔄 AI analysis module ready for Story 3 implementation
- 🔄 SNS integration ready for Story 4 implementation

## Risk Mitigation

### Technical Risks

- **OpenAI API Rate Limits**: Implement exponential backoff and queuing
- **Large File Processing**: Stream processing for memory efficiency
- **SNS Message Delivery**: Implement retry mechanisms and dead letter queues

### Operational Risks

- **Cost Management**: Monitor API usage and implement budget alerts
- **Security**: Encrypt sensitive data and use least-privilege access
- **Monitoring**: Comprehensive logging and alerting for production issues

## Definition of Done

- [ ] Lambda function processes PDF and DOCX files successfully
- [ ] Integration with OpenAI API provides consistent scoring
- [ ] SNS integration publishes results correctly to backend
- [ ] Error handling covers all identified failure modes
- [ ] Monitoring and logging are configured
- [ ] Performance meets defined metrics
- [ ] Security best practices are implemented
- [ ] Documentation is complete and deployment is automated
- [ ] Integration testing with backend SNS handler is successful
- [ ] Production deployment is validated and stable
