# Resume Processor Lambda Deployment Script
# 
# ✅ Story 1: S3 Event-Driven Lambda Trigger - COMPLETED
# ✅ Story 2: Text Extraction from Resume Files - COMPLETED
# 
# Ready for deployment with:
# • Complete S3 event processing pipeline
# • PDF/DOCX text extraction with fallback methods
# • Advanced text cleaning and section detection
# • Comprehensive error handling and logging
# • Production-ready monitoring and metrics

# Variables
$FunctionName = "resume-processor-lambda"
$ImageName = "resume-processor-lambda:latest"
$AWSAccountId = "851109399811"
$Region = "us-east-1"  

# Clear any existing Docker logins
docker logout

# Step 1: Build Docker image
Write-Host "Building Docker image..." -ForegroundColor Green
docker build --provenance=false -t $ImageName .
if ($LASTEXITCODE -ne 0) {
    Write-Error "Docker build failed"
    exit 1
}

# Step 2: Tag image for ECR
$ECRRepo = "$AWSAccountId.dkr.ecr.$Region.amazonaws.com/$FunctionName"
Write-Host "Tagging image for ECR..." -ForegroundColor Green
docker tag $ImageName "$ECRRepo`:latest"

# Step 3: Login to ECR
Write-Host "Logging into ECR..." -ForegroundColor Green
aws ecr get-login-password --region $Region | docker login --username AWS --password-stdin "$AWSAccountId.dkr.ecr.$Region.amazonaws.com"
if ($LASTEXITCODE -ne 0) {
    Write-Error "ECR login failed"
    exit 1
}

# Step 4: Push image to ECR
Write-Host "Pushing image to ECR..." -ForegroundColor Green
docker push "$ECRRepo`:latest"
if ($LASTEXITCODE -ne 0) {
    Write-Error "Docker push failed"
    exit 1
}

# Step 5: Check if Lambda function exists
Write-Host "Checking if Lambda function exists..." -ForegroundColor Green
$functionExists = $false
try {
    aws lambda get-function --function-name $FunctionName --region $Region > $null 2>&1
    if ($LASTEXITCODE -eq 0) {
        $functionExists = $true
    }
} catch {
    $functionExists = $false
}

if (-not $functionExists) {
    # Step 6: Create Lambda (first time only)
    Write-Host "Creating Lambda function..." -ForegroundColor Green
    aws lambda create-function `
      --function-name $FunctionName `
      --package-type Image `
      --code "ImageUri=$ECRRepo`:latest" `
      --role arn:aws:iam::851109399811:role/service-role/resume-processor-lambda-docker-role-7moislru `
      --region $Region
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Lambda creation failed"
        exit 1
    }
} else {
    # Step 7: Update Lambda for subsequent deploys
    Write-Host "Updating Lambda function..." -ForegroundColor Green
    aws lambda update-function-code `
      --function-name $FunctionName `
      --image-uri "$ECRRepo`:latest" `
      --region $Region
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Lambda update failed"
        exit 1
    }
}

Write-Host "Deployment completed successfully!" -ForegroundColor Green
