#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "Checking AWS credentials..."
if ! aws sts get-caller-identity >/dev/null 2>&1; then
  echo "ERROR: AWS credentials are not configured or are invalid." >&2
  exit 1
fi

echo "Running test suite..."
if ! npm test --prefix "${ROOT_DIR}"; then
  echo "ERROR: npm test failed. Aborting deployment." >&2
  exit 1
fi

cd "${ROOT_DIR}/infra"

echo "Initializing Terraform..."
terraform init

echo "Creating Terraform plan..."
terraform plan -out=tfplan

read -r -p "Review the Terraform plan above. Type 'apply' to continue: " CONFIRM
if [[ "${CONFIRM}" != "apply" ]]; then
  echo "Deployment cancelled by user."
  exit 1
fi

echo "Applying Terraform plan..."
terraform apply tfplan

API_GATEWAY_URL="$(terraform output -raw api_gateway_url)"
ENDPOINT="${API_GATEWAY_URL}/v1/generate"

echo "Running smoke test against ${ENDPOINT}..."
SMOKE_BODY='{"length":20,"quantity":1,"options":{"uppercase":true,"lowercase":true,"numbers":true,"symbols":true,"exclude_ambiguous":true},"compliance":"NIST"}'
HTTP_CODE="$(curl -sS -o /tmp/six-sense-smoke.json -w "%{http_code}" \
  -X POST "${ENDPOINT}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test_pro_key" \
  -d "${SMOKE_BODY}")"

if [[ "${HTTP_CODE}" != "200" ]]; then
  echo "Smoke test failed with HTTP ${HTTP_CODE}."
  echo "Response body:"
  cat /tmp/six-sense-smoke.json
  exit 1
fi

echo "==============================================="
echo "Deployment successful."
echo "Live endpoint: ${ENDPOINT}"
echo "==============================================="
