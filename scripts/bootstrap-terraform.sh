#!/usr/bin/env bash

set -euo pipefail

REGION="us-east-1"
S3_BUCKET="six-sense-terraform-state"
DDB_TABLE="six-sense-terraform-locks"

TAGS=(
  "Key=Project,Value=six-sense-api"
  "Key=Environment,Value=prod"
  "Key=Owner,Value=Six Sense Solutions LLC"
  "Key=ManagedBy,Value=terraform"
  "Key=CostCenter,Value=six-sense-solutions"
  "Key=MigrateReady,Value=true"
)
S3_TAGGING_JSON='{"TagSet":[{"Key":"Project","Value":"six-sense-api"},{"Key":"Environment","Value":"prod"},{"Key":"Owner","Value":"Six Sense Solutions LLC"},{"Key":"ManagedBy","Value":"terraform"},{"Key":"CostCenter","Value":"six-sense-solutions"},{"Key":"MigrateReady","Value":"true"}]}'

echo "Bootstrapping Terraform backend resources in ${REGION}..."

echo "Checking S3 bucket: ${S3_BUCKET}"
if aws s3api head-bucket --bucket "${S3_BUCKET}" 2>/dev/null; then
  echo "S3 bucket ${S3_BUCKET} already exists. Skipping creation."
else
  echo "Creating S3 bucket ${S3_BUCKET} in ${REGION}..."
  aws s3api create-bucket \
    --bucket "${S3_BUCKET}" \
    --region "${REGION}"
  echo "S3 bucket ${S3_BUCKET} created."
fi

echo "Applying S3 bucket configuration..."
aws s3api put-bucket-versioning \
  --bucket "${S3_BUCKET}" \
  --versioning-configuration Status=Enabled

aws s3api put-bucket-encryption \
  --bucket "${S3_BUCKET}" \
  --server-side-encryption-configuration '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'

aws s3api put-public-access-block \
  --bucket "${S3_BUCKET}" \
  --public-access-block-configuration BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true

aws s3api put-bucket-tagging \
  --bucket "${S3_BUCKET}" \
  --tagging "${S3_TAGGING_JSON}"

echo "S3 bucket ${S3_BUCKET} is confirmed with versioning, encryption, public access block, and tags."

echo "Checking DynamoDB table: ${DDB_TABLE}"
if aws dynamodb describe-table --table-name "${DDB_TABLE}" --region "${REGION}" >/dev/null 2>&1; then
  echo "DynamoDB table ${DDB_TABLE} already exists. Skipping creation."
else
  echo "Creating DynamoDB table ${DDB_TABLE}..."
  aws dynamodb create-table \
    --table-name "${DDB_TABLE}" \
    --attribute-definitions AttributeName=LockID,AttributeType=S \
    --key-schema AttributeName=LockID,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST \
    --region "${REGION}" \
    --tags "${TAGS[@]}"

  aws dynamodb wait table-exists \
    --table-name "${DDB_TABLE}" \
    --region "${REGION}"
  echo "DynamoDB table ${DDB_TABLE} created and is now available."
fi

DDB_STATUS="$(aws dynamodb describe-table --table-name "${DDB_TABLE}" --region "${REGION}" --query "Table.TableStatus" --output text)"
DDB_STATUS="${DDB_STATUS//$'\r'/}"
if [[ "${DDB_STATUS}" != "ACTIVE" ]]; then
  echo "DynamoDB table ${DDB_TABLE} is not ACTIVE (current status: ${DDB_STATUS})." >&2
  exit 1
fi

echo "DynamoDB table ${DDB_TABLE} is confirmed ACTIVE with required schema, billing mode, and tags."
echo "Bootstrap complete."
echo "Next step: run cp infra/terraform.tfvars.example infra/terraform.tfvars"
