#!/bin/bash

# OEM TechTalk API Test Script
# Usage: ./test-api.sh YOUR_ACCESS_TOKEN

if [ -z "$1" ]; then
  echo "❌ Error: No access token provided"
  echo "Usage: ./test-api.sh YOUR_ACCESS_TOKEN"
  echo ""
  echo "To get your access token:"
  echo "1. Log in to the mobile app"
  echo "2. Check the console logs for '🔑 ACCESS TOKEN'"
  echo "3. Copy the token and run: ./test-api.sh <token>"
  exit 1
fi

TOKEN="$1"
API_URL="http://localhost:3000/api"

echo "🧪 Testing OEM TechTalk API"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Test 1: Health Check (No auth required)
echo "1️⃣  Testing Health Endpoint (no auth)"
curl -s "$API_URL/health" | jq '.'
echo ""
echo ""

# Test 2: Get Current User
echo "2️⃣  Testing GET /users/me (with auth)"
curl -s -H "Authorization: Bearer $TOKEN" "$API_URL/users/me" | jq '.'
echo ""
echo ""

# Test 3: Get Saved Units
echo "3️⃣  Testing GET /saved-units (with auth)"
curl -s -H "Authorization: Bearer $TOKEN" "$API_URL/saved-units" | jq '.'
echo ""
echo ""

# Test 4: Update User Profile
echo "4️⃣  Testing PATCH /users/me (with auth)"
curl -s -X PATCH \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","phone":"555-1234"}' \
  "$API_URL/users/me" | jq '.'
echo ""
echo ""

echo "✅ API tests complete!"
