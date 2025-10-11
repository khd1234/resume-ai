"""
AI-powered resume analysis processor.

Story 3: OpenAI-Powered Resume Analysis and Scoring - Implementation
Analyzes resume content using OpenAI API and provides comprehensive scoring.
"""

import logging
import json
import time
import re
from typing import Dict, Any, List, Optional
from datetime import datetime

# OpenAI integration
try:
    import openai
    from openai import OpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False

from exceptions import AIAnalysisError
from config import config

logger = logging.getLogger(__name__)

class AIAnalyzer:
    """
    Handles AI-powered resume analysis and scoring.
    
    Implements Story 3 requirements:
    - OpenAI GPT integration for comprehensive resume analysis
    - Structured scoring based on ATS optimization criteria
    - Detailed breakdown with section-specific scores
    - Actionable improvement recommendations
    - Consistent scoring for identical content
    """
    
    def __init__(self):
        """Initialize the AI analyzer with OpenAI client and scoring rubric."""
        self.openai_available = OPENAI_AVAILABLE
        self.openai_client = None
        self.scoring_rubric = self._load_scoring_rubric()
        
        if self.openai_available and config.OPENAI_API_KEY:
            try:
                import httpx
                
                # Initialize OpenAI client with explicit parameters only
                self.openai_client = OpenAI(
                    api_key=config.OPENAI_API_KEY,
                    timeout=30.0,
                    http_client=httpx.Client(timeout=30.0, proxies=None)
                )
                
                logger.info("OpenAI client initialized successfully")
            except Exception as e:
                logger.warning(f"Failed to initialize OpenAI client: {str(e)}")
                logger.warning(f"Error type: {type(e).__name__}")
                self.openai_available = False
                self.openai_client = None
        else:
            logger.warning("OpenAI not available: missing library or API key")
            self.openai_client = None
    
    def analyze_resume(self, extracted_text: str, s3_info: Dict[str, Any]) -> Dict[str, Any]:
        """
        Analyze resume content using OpenAI API.
        
        Story 3 Implementation:
        - Uses OpenAI GPT for intelligent resume analysis
        - Applies comprehensive scoring rubric
        - Provides section-specific analysis and recommendations
        - Ensures consistent scoring through structured prompts
        - Handles API rate limits and errors gracefully
        
        Args:
            extracted_text: Text content extracted from resume
            s3_info: S3 file information
            
        Returns:
            Dict with comprehensive analysis results and scoring
            
        Raises:
            AIAnalysisError: If AI analysis fails
        """
        file_key = s3_info.get('object_key', 'unknown')
        start_time = time.time()
        
        try:
            logger.info(f"Starting AI analysis for {file_key}")
            
            # Validate input
            if not extracted_text or not extracted_text.strip():
                raise AIAnalysisError(
                    "Cannot analyze empty or whitespace-only text",
                    file_key=file_key,
                    api_response="empty_text"
                )
            
            # Check text length (OpenAI has token limits)
            if len(extracted_text) > 15000:  # ~3750 tokens at 4 chars/token
                logger.warning(f"Text length {len(extracted_text)} may exceed optimal size, truncating")
                extracted_text = extracted_text[:15000] + "...[truncated for analysis]"
            
            if self.openai_available and self.openai_client is not None:
                # Use OpenAI for analysis
                logger.info(f"Using OpenAI for analysis of {file_key}")
                analysis_result = self._analyze_with_openai(extracted_text, s3_info)
            else:
                # Fallback to rule-based analysis
                logger.warning(f"OpenAI not available for {file_key}, using fallback analysis")
                analysis_result = self._analyze_with_rules(extracted_text, file_key)
            
            # Add timing and metadata
            analysis_time = time.time() - start_time
            analysis_result['analysis_metadata']['analysis_duration_seconds'] = round(analysis_time, 3)
            analysis_result['analysis_metadata']['text_analyzed_length'] = len(extracted_text)
            
            logger.info(f"AI analysis completed for {file_key} in {analysis_time:.3f}s, score: {analysis_result.get('overall_score', 0)}")
            return analysis_result
            
        except AIAnalysisError:
            # Re-raise AIAnalysisError as-is
            raise
        except Exception as e:
            logger.error(f"AI analysis failed for {file_key}: {str(e)}", exc_info=True)
            raise AIAnalysisError(
                f"Failed to analyze resume: {str(e)}",
                file_key=file_key,
                api_response=str(e)
            )
    
    def _analyze_with_openai(self, text: str, s3_info: Dict[str, Any]) -> Dict[str, Any]:
        """
        Perform AI analysis using OpenAI GPT models.
        
        Story 3 Implementation:
        - Uses structured prompts for consistent analysis
        - Implements retry logic for API reliability
        - Parses and validates AI responses
        - Applies scoring rubric consistently
        
        Args:
            text: Resume text content
            s3_info: S3 file information
            
        Returns:
            Comprehensive analysis results
        """
        file_key = s3_info.get('object_key', 'unknown')
        
        try:
            # Generate comprehensive analysis prompt
            analysis_prompt = self._generate_analysis_prompt(text)
            
            # Make API call with retry logic
            response = self._call_openai_api_with_retry(analysis_prompt, file_key)
            
            # Parse and validate response
            analysis_result = self._parse_ai_response(response, file_key)
            
            # Enhance with additional analysis
            # analysis_result = self._enhance_analysis_with_rules(analysis_result, text, s3_info)
            
            return analysis_result
            
        except Exception as e:
            logger.error(f"OpenAI analysis failed for {file_key}: {str(e)}")
            # Fallback to rule-based analysis if OpenAI fails
            logger.info(f"Falling back to rule-based analysis for {file_key}")
            return self._analyze_with_rules(text, file_key)
    
    def _call_openai_api_with_retry(self, prompt: str, file_key: str, max_retries: int = 3) -> str:
        """
        Make API call to OpenAI with retry logic and error handling.
        
        Args:
            prompt: Analysis prompt for OpenAI
            file_key: File key for logging
            max_retries: Maximum number of retry attempts
            
        Returns:
            AI analysis response
            
        Raises:
            AIAnalysisError: If all retry attempts fail
        """
        last_error = None
        
        for attempt in range(max_retries):
            try:
                response = self.openai_client.chat.completions.create(
                    model=config.OPENAI_MODEL,
                    messages=[
                        {
                            "role": "system",
                            "content": "You are an expert ATS and resume optimization specialist. Provide detailed, structured analysis of resumes with specific scores and actionable recommendations."
                        },
                        {
                            "role": "user",
                            "content": prompt
                        }
                    ],
                    max_tokens=config.OPENAI_MAX_TOKENS,
                    temperature=config.OPENAI_TEMPERATURE,
                    response_format={"type": "json_object"}
                )
                
                return response.choices[0].message.content
                
            except Exception as e:
                last_error = e
                wait_time = 2 ** attempt  # Exponential backoff
                logger.warning(f"OpenAI API attempt {attempt + 1} failed for {file_key}: {str(e)}")
                
                if attempt < max_retries - 1:
                    logger.info(f"Retrying in {wait_time} seconds...")
                    time.sleep(wait_time)
                else:
                    logger.error(f"All OpenAI API attempts failed for {file_key}")
        
        raise AIAnalysisError(
            f"OpenAI API failed after {max_retries} attempts: {str(last_error)}",
            file_key=file_key,
            api_response=str(last_error)
        )
    
    def _load_scoring_rubric(self) -> Dict[str, Any]:
        """
        Load the comprehensive scoring rubric for resume analysis.
        
        TODO: Story 3 - Define comprehensive scoring rubric
        - ATS compatibility scoring
        - Content quality assessment
        - Structure and organization
        - Professional language evaluation
        - Industry-specific relevance
        
        Returns:
            Scoring rubric configuration
        """
        return {
            'sections': {
                'contact_information': {
                    'weight': 0.15,
                    'criteria': [
                        'Professional email address',
                        'Phone number present',
                        'LinkedIn profile',
                        'Location information'
                    ]
                },
                'professional_summary': {
                    'weight': 0.20,
                    'criteria': [
                        'Clear value proposition',
                        'Industry-specific keywords',
                        'Quantifiable achievements',
                        'Professional tone'
                    ]
                },
                'work_experience': {
                    'weight': 0.35,
                    'criteria': [
                        'Action verbs usage',
                        'Quantified results',
                        'Relevant experience',
                        'Career progression'
                    ]
                },
                'education': {
                    'weight': 0.15,
                    'criteria': [
                        'Relevant degrees',
                        'Institution reputation',
                        'Graduation dates',
                        'Additional certifications'
                    ]
                },
                'skills': {
                    'weight': 0.10,
                    'criteria': [
                        'Technical skills relevance',
                        'Skill categorization',
                        'Proficiency indicators',
                        'Industry alignment'
                    ]
                },
                'formatting': {
                    'weight': 0.05,
                    'criteria': [
                        'ATS-friendly format',
                        'Consistent styling',
                        'Appropriate length',
                        'Clean structure'
                    ]
                }
            },
            'ats_factors': [
                'Standard section headings',
                'Simple formatting',
                'Keyword density',
                'File type compatibility'
            ],
            'content_quality_factors': [
                'Achievement quantification',
                'Action verb usage',
                'Professional language',
                'Relevance to target role'
            ]
        }
    
    def _call_openai_api(self, text: str, prompt: str) -> str:
        """
        Make API call to OpenAI for resume analysis.
        
        TODO: Story 3 - Implement OpenAI API integration
        - Set up OpenAI client with API key
        - Design comprehensive analysis prompts
        - Implement rate limiting and retries
        - Handle API errors gracefully
        - Cache results for efficiency
        
        Args:
            text: Resume text content
            prompt: Analysis prompt for OpenAI
            
        Returns:
            AI analysis response
        """
        # Placeholder for OpenAI integration
        logger.debug("OpenAI API integration pending - Story 3")
        return "OpenAI analysis pending implementation"
    
    def _generate_analysis_prompt(self, text: str) -> str:
        """
        Generate comprehensive analysis prompt for OpenAI.
        
        Story 3 Implementation:
        - Structured prompt for consistent analysis
        - Includes scoring criteria and rubric
        - Requests specific JSON output format
        - Ensures deterministic results through clear instructions
        
        Args:
            text: Resume text content
            
        Returns:
            Formatted prompt for AI analysis
        """
        return f"""
Analyze the following resume text and provide a comprehensive evaluation. Return your analysis as a JSON object with the following structure:

{{
    "overall_score": <number 0-100>,
    "section_scores": {{
        "contact_information": <number 0-100>,
        "professional_summary": <number 0-100>,
        "work_experience": <number 0-100>,
        "education": <number 0-100>,
        "skills": <number 0-100>,
        "formatting": <number 0-100>
    }},
    "ats_compatibility": <number 0-100>,
    "content_quality": <number 0-100>,
    "keyword_density": <number 0-100>,
    "recommendations": [<array of specific improvement suggestions>],
    "keywords_found": [<array of relevant keywords identified>],
    "improvement_areas": [<array of specific areas needing work>],
    "strengths": [<array of resume strengths>]
}}

SCORING CRITERIA:

Contact Information (Weight: 15%):
- Professional email address present (20 points)
- Phone number included (20 points)
- LinkedIn profile or professional website (30 points)
- Clear location/availability information (30 points)

Professional Summary (Weight: 20%):
- Clear value proposition and career focus (25 points)
- Industry-specific keywords and terminology (25 points)
- Quantifiable achievements or experience metrics (25 points)
- Professional tone and compelling language (25 points)

Work Experience (Weight: 35%):
- Use of strong action verbs to start bullet points (20 points)
- Quantified results and achievements with numbers/percentages (30 points)
- Relevant experience for target roles (25 points)
- Clear career progression and growth (25 points)

Education (Weight: 15%):
- Relevant degrees and certifications (40 points)
- Proper formatting of institutions and dates (30 points)
- Additional relevant coursework or honors (30 points)

Skills (Weight: 10%):
- Technical skills relevant to target role (30 points)
- Proper categorization and organization (25 points)
- Balance of hard and soft skills (25 points)
- Industry alignment and current technologies (20 points)

Formatting (Weight: 5%):
- ATS-friendly structure and layout (40 points)
- Consistent formatting and styling (30 points)
- Appropriate length (1-2 pages) (15 points)
- Clean, professional appearance (15 points)

ATS Compatibility:
- Standard section headings used
- Simple, clean formatting without graphics
- Appropriate keyword density for target roles
- Compatible file format and structure

Content Quality:
- Achievement quantification with specific metrics
- Professional language and tone
- Relevance to target positions
- Clear and concise communication

Provide specific, actionable recommendations for improvement. Focus on concrete steps the candidate can take to enhance their resume's effectiveness.

RESUME TEXT TO ANALYZE:

{text}

Remember to return ONLY valid JSON format as specified above.
"""
    
    def _parse_ai_response(self, response: str, file_key: str) -> Dict[str, Any]:
        """
        Parse and validate AI analysis response.
        
        Story 3 Implementation:
        - Parses structured JSON response from OpenAI
        - Validates all scoring ranges (0-100)
        - Ensures required fields are present
        - Handles malformed responses gracefully
        
        Args:
            response: Raw AI response
            file_key: S3 object key for context
            
        Returns:
            Parsed and validated analysis results
        """
        try:
            # Parse JSON response
            analysis_data = json.loads(response)
            
            # Validate and normalize scores
            analysis_result = self._validate_and_normalize_scores(analysis_data, file_key)
            
            # Add metadata
            analysis_result['analysis_metadata'] = {
                'text_length': 0,  # Will be set by caller
                'analysis_time': datetime.utcnow().isoformat(),
                'model_used': config.OPENAI_MODEL,
                'file_key': file_key,
                'status': 'ai_analysis_complete',
                'api_version': 'openai_v1'
            }
            
            return analysis_result
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse AI response as JSON for {file_key}: {str(e)}")
            logger.debug(f"Raw response: {response[:500]}...")
            
            # Try to extract JSON from response if embedded in text
            json_match = re.search(r'\{.*\}', response, re.DOTALL)
            if json_match:
                try:
                    analysis_data = json.loads(json_match.group())
                    return self._validate_and_normalize_scores(analysis_data, file_key)
                except json.JSONDecodeError:
                    pass
            
            # If all parsing fails, create fallback analysis
            logger.warning(f"Using fallback analysis due to JSON parsing failure for {file_key}")
            return self._create_fallback_analysis(response, file_key)
            
        except Exception as e:
            logger.error(f"Error processing AI response for {file_key}: {str(e)}")
            return self._create_fallback_analysis(response, file_key)
    
    def _validate_and_normalize_scores(self, data: Dict[str, Any], file_key: str) -> Dict[str, Any]:
        """
        Validate and normalize all scores to ensure they're within valid ranges.
        
        Args:
            data: Parsed AI response data
            file_key: File key for logging
            
        Returns:
            Validated and normalized analysis results
        """
        def normalize_score(score: Any, field_name: str) -> int:
            """Normalize a score to 0-100 range."""
            try:
                if score is None:
                    return 0
                
                # Convert to number
                if isinstance(score, str):
                    score = float(score)
                
                # Clamp to 0-100 range
                normalized = max(0, min(100, int(round(score))))
                
                if normalized != score:
                    logger.debug(f"Normalized {field_name} score from {score} to {normalized} for {file_key}")
                
                return normalized
                
            except (ValueError, TypeError):
                logger.warning(f"Invalid score '{score}' for {field_name} in {file_key}, defaulting to 0")
                return 0
        
        # Validate main scores
        overall_score = normalize_score(data.get('overall_score'), 'overall_score')
        ats_compatibility = normalize_score(data.get('ats_compatibility'), 'ats_compatibility')
        content_quality = normalize_score(data.get('content_quality'), 'content_quality')
        keyword_density = normalize_score(data.get('keyword_density'), 'keyword_density')
        
        # Validate section scores
        section_scores = {}
        expected_sections = ['contact_information', 'professional_summary', 'work_experience', 
                           'education', 'skills', 'formatting']
        
        raw_section_scores = data.get('section_scores', {})
        for section in expected_sections:
            section_scores[section] = normalize_score(raw_section_scores.get(section), f'section_scores.{section}')
        
        # Calculate overall score if not provided or invalid
        if overall_score == 0 and any(score > 0 for score in section_scores.values()):
            # Calculate weighted average based on rubric
            weights = {
                'contact_information': 0.15,
                'professional_summary': 0.20,
                'work_experience': 0.35,
                'education': 0.15,
                'skills': 0.10,
                'formatting': 0.05
            }
            
            weighted_sum = sum(section_scores[section] * weights[section] for section in expected_sections)
            overall_score = int(round(weighted_sum))
            logger.info(f"Calculated overall score {overall_score} from section scores for {file_key}")
        
        # Ensure required arrays exist
        recommendations = data.get('recommendations', [])
        if not isinstance(recommendations, list):
            recommendations = []
            
        keywords_found = data.get('keywords_found', [])
        if not isinstance(keywords_found, list):
            keywords_found = []
            
        improvement_areas = data.get('improvement_areas', [])
        if not isinstance(improvement_areas, list):
            improvement_areas = []
            
        strengths = data.get('strengths', [])
        if not isinstance(strengths, list):
            strengths = []
        
        return {
            'overall_score': overall_score,
            'section_scores': section_scores,
            'ats_compatibility': ats_compatibility,
            'content_quality': content_quality,
            'keyword_density': keyword_density,
            'recommendations': recommendations,
            'keywords_found': keywords_found,
            'improvement_areas': improvement_areas,
            'strengths': strengths
        }
    
    def _create_fallback_analysis(self, response: str, file_key: str) -> Dict[str, Any]:
        """
        Create fallback analysis when OpenAI response cannot be parsed.
        
        Story 3 Implementation:
        - Provides reasonable baseline scores
        - Generates generic but helpful recommendations
        - Maintains consistent output format
        - Logs failure for monitoring and improvement
        
        Args:
            response: Raw response that failed to parse
            file_key: File key for context
            
        Returns:
            Fallback analysis with basic scoring
        """
        logger.warning(f"Creating fallback analysis for {file_key} due to parsing failure")
        
        # Generate basic scores (slightly below average to encourage improvement)
        fallback_score = 65
        
        # Create baseline analysis
        return {
            'overall_score': fallback_score,
            'section_scores': {
                'contact_information': 60,
                'professional_summary': 65,
                'work_experience': 70,
                'education': 65,
                'skills': 60,
                'formatting': 65
            },
            'ats_compatibility': 60,
            'content_quality': 65,
            'keyword_density': 55,
            'recommendations': [
                'Consider improving resume formatting for better ATS compatibility',
                'Add quantified achievements with specific numbers and metrics',
                'Include relevant industry keywords for your target role',
                'Enhance professional summary with clear value proposition',
                'Review contact information for completeness and professionalism'
            ],
            'keywords_found': ['experience', 'professional', 'skills', 'education'],
            'improvement_areas': [
                'ATS optimization',
                'Quantified achievements',
                'Keyword optimization',
                'Professional formatting'
            ],
            'strengths': [
                'Contains basic resume sections',
                'Professional document structure'
            ],
            'analysis_metadata': {
                'text_length': 0,  # Will be set by caller
                'analysis_time': datetime.utcnow().isoformat(),
                'model_used': 'fallback_analysis',
                'file_key': file_key,
                'status': 'fallback_analysis_used',
                'api_version': 'fallback_v1',
                'failure_reason': 'ai_response_parsing_failed'
            }
        }
    
    def _analyze_with_fallback(self, text: str, file_key: str) -> Dict[str, Any]:
        """
        Perform analysis with OpenAI fallback to rule-based analysis.
        
        Story 3 Implementation:
        - Primary attempt with OpenAI API
        - Fallback to rule-based analysis on any failure
        - Ensures analysis always completes successfully
        - Comprehensive error handling and logging
        
        Args:
            text: Resume text content
            file_key: S3 object key for context
            
        Returns:
            Analysis results from either AI or fallback
        """
        try:
            # Try OpenAI analysis first
            if config.OPENAI_API_KEY:
                logger.info(f"Attempting OpenAI analysis for {file_key}")
                ai_result = self._analyze_with_openai(text, file_key)
                
                # Validate that we got a proper analysis
                if (ai_result.get('overall_score', 0) > 0 or 
                    any(score > 0 for score in ai_result.get('section_scores', {}).values())):
                    ai_result['analysis_metadata']['text_length'] = len(text)
                    logger.info(f"OpenAI analysis successful for {file_key}, overall score: {ai_result.get('overall_score', 0)}")
                    return ai_result
                else:
                    logger.warning(f"OpenAI analysis returned zero scores for {file_key}, falling back to rule-based")
            else:
                logger.info(f"No OpenAI API key configured, using rule-based analysis for {file_key}")
            
        except Exception as e:
            logger.warning(f"OpenAI analysis failed for {file_key}: {str(e)}, falling back to rule-based analysis")
        
        # Fallback to rule-based analysis
        logger.info(f"Using rule-based fallback analysis for {file_key}")
        fallback_result = self._analyze_with_rules(text, file_key)
        fallback_result['analysis_metadata']['text_length'] = len(text)
        return fallback_result
    
    def _analyze_with_rules(self, text: str, file_key: str) -> Dict[str, Any]:
        """
        Rule-based resume analysis as fallback when OpenAI is unavailable.
        
        Story 3 Implementation:
        - Comprehensive rule-based scoring system
        - Keyword detection and density analysis
        - Section presence and quality checks
        - Provides consistent baseline analysis
        
        Args:
            text: Resume text content
            file_key: File key for context
            
        Returns:
            Rule-based analysis results
        """
        try:
            # Initialize scores
            scores = {
                'contact_information': 0,
                'professional_summary': 0,
                'work_experience': 0,
                'education': 0,
                'skills': 0,
                'formatting': 0
            }
            
            text_lower = text.lower()
            lines = text.split('\n')
            total_length = len(text)
            
            # Contact Information Analysis
            contact_score = 0
            if re.search(r'\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b', text):
                contact_score += 25  # Email found
            if re.search(r'\b\d{3}[-.]?\d{3}[-.]?\d{4}\b', text):
                contact_score += 20  # Phone number found
            if 'linkedin' in text_lower or 'github' in text_lower:
                contact_score += 25  # Professional profile found
            if any(keyword in text_lower for keyword in ['address', 'location', 'city', 'state']):
                contact_score += 15  # Location info found
            scores['contact_information'] = min(100, contact_score)
            
            # Professional Summary Analysis
            summary_indicators = ['summary', 'profile', 'objective', 'about']
            summary_score = 0
            if any(indicator in text_lower for indicator in summary_indicators):
                summary_score += 30
            
            # Check for quantified achievements
            if re.search(r'\d+%|\d+\+|\$\d+|\d+ years?', text):
                summary_score += 25
            
            # Check for professional keywords
            professional_keywords = ['experienced', 'professional', 'skilled', 'expert', 'leader', 'manager']
            if any(keyword in text_lower for keyword in professional_keywords):
                summary_score += 25
            
            scores['professional_summary'] = min(100, summary_score)
            
            # Work Experience Analysis
            experience_score = 0
            experience_indicators = ['experience', 'employment', 'work history', 'career', 'professional experience']
            if any(indicator in text_lower for indicator in experience_indicators):
                experience_score += 25
            
            # Look for dates (years)
            year_pattern = r'\b(19|20)\d{2}\b'
            years_found = len(re.findall(year_pattern, text))
            if years_found >= 2:
                experience_score += 25  # Multiple dates suggest work history
            
            # Look for action verbs
            action_verbs = ['managed', 'developed', 'created', 'implemented', 'led', 'achieved', 'improved', 'designed']
            action_verb_count = sum(1 for verb in action_verbs if verb in text_lower)
            experience_score += min(30, action_verb_count * 5)
            
            # Look for quantified results
            if re.search(r'\d+%|\$\d+|increased|decreased|improved|reduced', text_lower):
                experience_score += 20
            
            scores['work_experience'] = min(100, experience_score)
            
            # Education Analysis
            education_score = 0
            education_indicators = ['education', 'degree', 'university', 'college', 'bachelor', 'master', 'phd', 'certification']
            if any(indicator in text_lower for indicator in education_indicators):
                education_score += 40
            
            # Look for graduation years
            if re.search(r'\b(19|20)\d{2}\b.*?(degree|graduated|bachelor|master)', text_lower):
                education_score += 30
            
            # Look for GPA or honors
            if any(keyword in text_lower for keyword in ['gpa', 'honors', 'cum laude', 'magna cum laude', 'summa cum laude']):
                education_score += 30
            
            scores['education'] = min(100, education_score)
            
            # Skills Analysis
            skills_score = 0
            skill_indicators = ['skills', 'technical skills', 'competencies', 'technologies', 'tools']
            if any(indicator in text_lower for indicator in skill_indicators):
                skills_score += 30
            
            # Count technical terms (simplified)
            technical_keywords = ['python', 'java', 'javascript', 'sql', 'aws', 'docker', 'git', 'linux', 'windows', 'excel']
            tech_count = sum(1 for tech in technical_keywords if tech in text_lower)
            skills_score += min(50, tech_count * 10)
            
            scores['skills'] = min(100, skills_score)
            
            # Formatting Analysis
            formatting_score = 0
            
            # Check length (1-2 pages approximation)
            if 1000 <= total_length <= 4000:
                formatting_score += 25
            elif total_length > 0:
                formatting_score += 15
            
            # Check for consistent structure
            if len(lines) > 10:  # Reasonable number of lines
                formatting_score += 25
            
            # Check for bullets or structure
            if '•' in text or '*' in text or '-' in text:
                formatting_score += 25
            
            # Check for section headers
            section_headers = ['experience', 'education', 'skills', 'summary']
            header_count = sum(1 for header in section_headers if header in text_lower)
            formatting_score += min(25, header_count * 8)
            
            scores['formatting'] = min(100, formatting_score)
            
            # Calculate overall score (weighted average)
            weights = {
                'contact_information': 0.15,
                'professional_summary': 0.20,
                'work_experience': 0.35,
                'education': 0.15,
                'skills': 0.10,
                'formatting': 0.05
            }
            
            overall_score = int(sum(scores[section] * weights[section] for section in scores.keys()))
            
            # Calculate additional metrics
            ats_compatibility = min(100, (scores['formatting'] + scores['contact_information']) // 2)
            content_quality = min(100, (scores['work_experience'] + scores['professional_summary']) // 2)
            
            # Simple keyword density calculation
            total_words = len(text.split())
            keyword_count = sum(1 for keyword in technical_keywords + professional_keywords if keyword in text_lower)
            keyword_density = min(100, int((keyword_count / max(total_words, 1)) * 1000)) if total_words > 0 else 0
            
            # Generate recommendations based on low scores
            recommendations = []
            if scores['contact_information'] < 70:
                recommendations.append("Add complete contact information including email, phone, and professional profile links")
            if scores['professional_summary'] < 70:
                recommendations.append("Include a compelling professional summary with quantified achievements")
            if scores['work_experience'] < 70:
                recommendations.append("Enhance work experience with action verbs and measurable results")
            if scores['education'] < 70:
                recommendations.append("Provide complete education information including degrees and institutions")
            if scores['skills'] < 70:
                recommendations.append("Add relevant technical and professional skills section")
            if scores['formatting'] < 70:
                recommendations.append("Improve resume formatting and structure for better readability")
            
            return {
                'overall_score': overall_score,
                'section_scores': scores,
                'ats_compatibility': ats_compatibility,
                'content_quality': content_quality,
                'keyword_density': keyword_density,
                'recommendations': recommendations,
                'keywords_found': [kw for kw in technical_keywords + professional_keywords if kw in text_lower],
                'improvement_areas': [section.replace('_', ' ').title() for section, score in scores.items() if score < 70],
                'strengths': [section.replace('_', ' ').title() for section, score in scores.items() if score >= 80],
                'analysis_metadata': {
                    'text_length': total_length,
                    'analysis_time': datetime.utcnow().isoformat(),
                    'model_used': 'rule_based_analyzer',
                    'file_key': file_key,
                    'status': 'rule_based_analysis_complete',
                    'api_version': 'rules_v1'
                }
            }
            
        except Exception as e:
            logger.error(f"Rule-based analysis failed for {file_key}: {str(e)}")
            return self._generate_placeholder_analysis(text, {'object_key': file_key})
    
    def _generate_placeholder_analysis(self, text: str, s3_info: Dict[str, str]) -> Dict[str, Any]:
        """
        Generate placeholder analysis results for testing and development.
        
        Story 3 Implementation:
        This method provides a consistent response format as a final fallback
        when both OpenAI and rule-based analysis fail.
        
        Args:
            text: Resume text content
            s3_info: S3 object information
            
        Returns:
            Placeholder analysis with basic structure
        """
        return {
            'overall_score': 50,
            'section_scores': {
                'contact_information': 50,
                'professional_summary': 50,
                'work_experience': 50,
                'education': 50,
                'skills': 50,
                'formatting': 50
            },
            'ats_compatibility': 50,
            'content_quality': 50,
            'keyword_density': 50,
            'recommendations': [
                'Resume analysis could not be completed - please review manually',
                'Ensure resume contains standard sections: contact, summary, experience, education, skills',
                'Use clear formatting and professional language'
            ],
            'keywords_found': [],
            'improvement_areas': ['Manual review required'],
            'strengths': [],
            'analysis_metadata': {
                'text_length': len(text),
                'analysis_time': datetime.utcnow().isoformat(),
                'model_used': 'placeholder_fallback',
                'file_key': s3_info.get('object_key', 'unknown'),
                'status': 'placeholder_analysis_emergency_fallback',
                'api_version': 'emergency_v1'
            }
        }