# Use AWS Lambda Python 3.11 base image
FROM public.ecr.aws/lambda/python:3.11

# Copy requirements first (better caching)
COPY requirements.txt ${LAMBDA_TASK_ROOT}

# Install dependencies into Lambda task root without caching
RUN pip install -r ${LAMBDA_TASK_ROOT}/requirements.txt --target "${LAMBDA_TASK_ROOT}"

# Copy Lambda function code
COPY src/ ${LAMBDA_TASK_ROOT}/

# Set the handler
CMD ["main.lambda_handler"]
