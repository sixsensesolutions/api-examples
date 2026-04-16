# Audit Log Export to S3

Use this script to export the previous day's Six Sense audit log events into your own S3 bucket for long-term retention.

## Environment Variables

Set the following before running:

- `SIX_SENSE_API_KEY` - your Six Sense API key with audit log access
- `S3_BUCKET` - destination S3 bucket name
- `S3_PREFIX` - optional object prefix (default: `sixsense-audit-logs`)
- `AWS_REGION` - optional AWS region (default: `us-east-1`)

## Run Manually

```bash
node export.js
```

The script writes one JSON file per day to:

`s3://<S3_BUCKET>/<S3_PREFIX>/<YYYY-MM-DD>.json`

## Schedule as Daily Cron

Run every day at 01:10 UTC:

```bash
10 1 * * * /usr/bin/env node /path/to/export.js
```

## Schedule as AWS Lambda

1. Package this script into a Lambda function.
2. Set the environment variables listed above.
3. Attach IAM permissions for `s3:PutObject` on your target bucket.
4. Add an EventBridge schedule rule to run once daily.

## S3 Retention Policies

For long-term storage, configure bucket lifecycle rules:

- Keep daily JSON files in Standard or Standard-IA for your active retention window.
- Transition older logs to Glacier/Deep Archive for lower cost.
- Optionally set expiration if your compliance policy has a fixed retention period.
