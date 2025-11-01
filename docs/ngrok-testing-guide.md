# Testing SNS Webhook with ngrok

This guide helps you test the SNS webhook integration locally using ngrok.

## Prerequisites

1. Install ngrok: https://ngrok.com/download
2. AWS CLI configured with appropriate permissions
3. Next.js app running locally on port 3000

## Step 1: Start Your Development Server

```bash
npm run dev
```

Your app should be running at `http://localhost:3000`

## Step 2: Start ngrok Tunnel

Open a new terminal and run:

```bash
ngrok http 3000
```

You'll see output like:

```
Forwarding  https://abc123.ngrok.io -> http://localhost:3000
```

Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)

## Step 3: Subscribe SNS Topic to Your Webhook

### Option A: Using AWS Console

1. Go to AWS SNS Console
2. Select your topic: `resume-processed`
3. Click "Create subscription"
4. Protocol: HTTPS
5. Endpoint: `https://abc123.ngrok.io/api/webhooks/sns`
6. Click "Create subscription"

### Option B: Using AWS CLI

```bash
aws sns subscribe \
  --topic-arn arn:aws:sns:us-east-1:851109399811:resume-processed \
  --protocol https \
  --notification-endpoint https://abc123.ngrok.io/api/webhooks/sns \
  --region us-east-1
```

## Step 4: Verify Subscription

The webhook will automatically confirm the subscription. Check your console logs:

```
Confirming SNS subscription...
SNS subscription confirmed successfully
```

You can also verify in AWS SNS Console - status should be "Confirmed"

## Step 5: Test the Flow

1. Log in to your app: `http://localhost:3000/auth/signin`
2. Go to dashboard: `http://localhost:3000/dashboard`
3. Upload a resume (PDF or DOCX)
4. Watch the logs in both terminals:
   - **ngrok terminal**: See incoming HTTPS requests
   - **dev server terminal**: See SNS message processing

## Expected Log Flow

### 1. Upload Success

```
Received SNS message: { type: 'Notification', ... }
Processing SNS notification: { eventType: 'processing_started', ... }
Updated resume status to PROCESSING: cm...
```

### 2. Processing Complete

```
Received SNS message: { type: 'Notification', ... }
Processing SNS notification: { eventType: 'processing_completed', ... }
Successfully stored results for resume: cm... { score: 82, skillsCount: 15 }
```

### 3. Refresh Dashboard

- Status badge should update: PENDING → PROCESSING → COMPLETED
- Score and skills count should appear
- Results should be displayed

## Troubleshooting

### Subscription Not Confirmed

- Check webhook endpoint is accessible: `https://abc123.ngrok.io/api/webhooks/sns`
- Check ngrok is running and forwarding requests
- Check console logs for errors

### Invalid Signature Error

- Ensure message is really from SNS (check SigningCertURL)
- Certificate validation might fail locally - this is expected
- For production, implement full certificate validation

### Resume Not Found

- Verify S3 key format matches: `uploads/{userId}/{timestamp}-{filename}`
- Check user ID in database matches S3 key
- Verify resume was created in database during upload

### No Notifications Received

- Check Lambda logs in CloudWatch
- Verify Lambda published to SNS (look for "Published" log)
- Check SNS subscription is confirmed
- Verify ngrok tunnel is active

## Monitor CloudWatch Logs

```bash
# Get latest Lambda logs
aws logs tail /aws/lambda/resume-processor --follow --region us-east-1
```

Look for:

```
Publishing results via SNS for uploads/...
Successfully published completion results for uploads/...
```

## Clean Up

When done testing:

1. Stop ngrok: `Ctrl+C` in ngrok terminal
2. Unsubscribe from SNS (optional):
   ```bash
   aws sns unsubscribe \
     --subscription-arn arn:aws:sns:us-east-1:851109399811:resume-processed:... \
     --region us-east-1
   ```

## Production Deployment

For production, replace ngrok URL with your deployed URL:

- Vercel: `https://your-app.vercel.app/api/webhooks/sns`
- Custom domain: `https://api.yourdomain.com/webhooks/sns`

Update SNS subscription to point to production endpoint.

## Security Notes

- ngrok URLs are temporary and change each restart
- For persistent testing, use ngrok paid plan with custom subdomain
- In production, ensure HTTPS is enabled
- SNS signature validation provides security
- No API keys needed in webhook endpoint (validated by signature)

## Testing Different Scenarios

### Test Processing Error

Manually trigger error by uploading unsupported file type or corrupted PDF:

- Upload should succeed
- Lambda should process and detect error
- Webhook should receive `processing_error` event
- Resume status should update to FAILED

### Test Duplicate Upload

Upload same file twice:

- Both should process successfully
- Results should be upserted (no duplicates)
- Latest results should be stored

### Test Large File

Upload 10MB PDF:

- Upload should succeed
- Processing might take longer
- Watch for timeout issues (increase Lambda timeout if needed)
