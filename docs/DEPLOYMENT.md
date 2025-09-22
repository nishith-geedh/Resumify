# Resumify Deployment Guide

## Prerequisites

- AWS CLI configured with appropriate permissions
- AWS SAM CLI installed
- Node.js and npm installed
- Python 3.10 or later

## Backend Deployment

### 1. Install AWS SAM CLI

```bash
# macOS
brew install aws-sam-cli

# Windows
choco install aws-sam-cli

# Linux
pip install aws-sam-cli
```

### 2. Deploy Backend Infrastructure

```bash
cd backend
sam build
sam deploy --guided
```

During the guided deployment, you'll be prompted for:
- Stack name (e.g., `resumify-dev`)
- AWS Region (e.g., `us-east-1`)
- Parameter Environment (dev/staging/prod)
- Confirm changes before deploy: Y
- Allow SAM to create IAM roles: Y
- Save parameters to samconfig.toml: Y

### 3. Note the API Gateway URL

After deployment, SAM will output the API Gateway URL. Copy this URL - you'll need it for frontend configuration.

Example output:
```
Outputs:
ResumifyApiUrl: https://abc123def.execute-api.us-east-1.amazonaws.com/dev/
```

## Frontend Deployment

### 1. Configure API URL

Edit `frontend/config.js` and update the API_BASE_URL:

```javascript
const CONFIG = {
    API_BASE_URL: 'https://your-api-gateway-url.execute-api.region.amazonaws.com/dev',
    // ... rest of config
};
```

### 2. Install Dependencies and Run

```bash
cd frontend
npm install
npm run dev
```

The application will be available at `http://localhost:3000`.

## Production Deployment

### Backend Production Settings

For production deployment, update the following:

1. **Environment Parameter**: Set to `prod`
2. **API Gateway**: Enable API keys or Cognito authentication
3. **CloudWatch**: Set up alarms for Lambda errors
4. **S3**: Enable versioning and lifecycle policies

### Frontend Production Deployment

Deploy the frontend to:
- **AWS S3 + CloudFront**: Static website hosting
- **Vercel**: Connect GitHub repository
- **Netlify**: Drag and drop deployment

#### S3 + CloudFront Deployment

```bash
# Build for production
cd frontend
npm run build

# Upload to S3 bucket
aws s3 sync . s3://your-frontend-bucket --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation --distribution-id YOUR_DISTRIBUTION_ID --paths "/*"
```

## Environment Variables

### Backend Lambda Environment Variables

Set in `template.yaml`:
- `CANDIDATES_TABLE`: DynamoDB table name
- `ANALYSES_TABLE`: DynamoDB table name  
- `JOBS_TABLE`: DynamoDB table name
- `MATCHES_TABLE`: DynamoDB table name
- `RESUMES_BUCKET`: S3 bucket name

### Frontend Environment Variables

Set in `config.js`:
- `API_BASE_URL`: API Gateway endpoint
- `THEME`: UI theme configuration
- `FEATURES`: Feature flags

## Security Configuration

### IAM Roles

Each Lambda function has minimal required permissions:

- **upload-handler**: S3 write, DynamoDB write, Textract start
- **textract-worker**: Textract read, DynamoDB write, Lambda invoke
- **nlp-handler**: DynamoDB read/write, Comprehend detect
- **matching-handler**: DynamoDB read/write

### API Gateway Security

For production, enable:
- API Keys for rate limiting
- AWS Cognito for authentication
- CORS configuration
- Request validation

### S3 Security

- Block public access
- Enable server-side encryption
- Set up bucket policies for Lambda access only

## Monitoring and Logging

### CloudWatch Logs

All Lambda functions log to CloudWatch. Set up log retention:

```bash
aws logs put-retention-policy --log-group-name /aws/lambda/function-name --retention-in-days 30
```

### CloudWatch Alarms

Create alarms for:
- Lambda function errors
- DynamoDB throttling
- S3 upload failures
- API Gateway 4xx/5xx errors

### X-Ray Tracing

Enable X-Ray tracing for Lambda functions to debug performance issues.

## Scaling Considerations

### DynamoDB

- Use on-demand billing for variable workloads
- Set up auto-scaling for provisioned capacity
- Consider Global Secondary Indexes for query patterns

### Lambda

- Set appropriate memory and timeout values
- Use provisioned concurrency for consistent performance
- Monitor cold start metrics

### S3

- Use S3 Transfer Acceleration for global uploads
- Set up lifecycle policies for cost optimization
- Consider S3 Intelligent Tiering

## Troubleshooting

### Common Issues

1. **CORS Errors**: Check API Gateway CORS configuration
2. **Lambda Timeouts**: Increase timeout values in template.yaml
3. **DynamoDB Throttling**: Switch to on-demand or increase capacity
4. **Textract Limits**: Implement retry logic with exponential backoff

### Debug Commands

```bash
# Check SAM deployment status
sam list stack-outputs --stack-name resumify-dev

# View Lambda logs
sam logs -n UploadHandlerFunction --stack-name resumify-dev --tail

# Test API endpoints
curl -X POST https://your-api-url/upload -d '{"test": "data"}'
```

## Cost Optimization

### AWS Services Costs

- **Lambda**: Pay per request and execution time
- **DynamoDB**: On-demand pricing recommended for development
- **S3**: Standard storage with lifecycle policies
- **Textract**: Pay per page processed
- **Comprehend**: Pay per request

### Cost Monitoring

Set up AWS Budgets to monitor spending and get alerts when costs exceed thresholds.

## Backup and Recovery

### DynamoDB Backups

Enable point-in-time recovery:

```bash
aws dynamodb put-backup-policy --table-name Resumify_Candidates_dev --backup-policy BackupEnabled=true
```

### S3 Versioning

Enable versioning on the resumes bucket for data protection.

## Next Steps

After successful deployment:

1. Test all functionality with sample resumes
2. Set up monitoring and alerting
3. Configure backup policies
4. Implement CI/CD pipeline
5. Add authentication for production use