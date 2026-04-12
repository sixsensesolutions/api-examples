#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}/infra"

TABLE_NAME="$(terraform output -raw dynamodb_table_name)"
NOW_ISO="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

put_key() {
  local api_key="$1"
  local tier="$2"
  local monthly_limit="$3"

  aws dynamodb put-item \
    --table-name "${TABLE_NAME}" \
    --item "{
      \"api_key\": {\"S\": \"${api_key}\"},
      \"customer_id\": {\"S\": \"${api_key}_customer\"},
      \"tier\": {\"S\": \"${tier}\"},
      \"calls_this_month\": {\"N\": \"0\"},
      \"monthly_limit\": {\"N\": \"${monthly_limit}\"},
      \"created_at\": {\"S\": \"${NOW_ISO}\"}
    }" >/dev/null

  echo "Inserted key: ${api_key} (tier=${tier}, monthly_limit=${monthly_limit})"
}

put_key "test_free_key" "free" "500"
put_key "test_pro_key" "pro" "50000"
put_key "test_enterprise_key" "enterprise" "-1"

echo "Database seeding complete for table ${TABLE_NAME}."
