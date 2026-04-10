#!/bin/bash
# Sign up for a free Six Sense Solutions API key
# 500 calls per month, no credit card required

curl -s -X POST https://api.sixsensesolutions.net/v1/signup \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Your Name",
    "email": "your@email.com"
  }' | python3 -m json.tool
