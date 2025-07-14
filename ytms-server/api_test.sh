#!/bin/bash

# =================================================================
# API Load Test Script
# This script sends 100 POST requests to the /validate-token endpoint
# and prints the full response for each call to test its
# functionality and rate limiting.
#
# Usage:
# 1. Save this file as test_api.sh
# 2. Make it executable: chmod +x test_api.sh
# 3. Run it: ./test_api.sh
# =================================================================

# --- Configuration ---
# The full URL of your API endpoint.
# Make sure to include the correct base path (e.g., /api/auth).
API_URL="http://localhost:8080/api/auth/validate-token"

# The token to be sent in the request body.
# Replace this with a valid or invalid token you want to test with.
TOKEN_TO_TEST="22f70c4f-bc22-4ad1-89ee-6413690b60f0"

# The number of requests to send.
REQUEST_COUNT=100

# --- Script Logic ---

echo "Starting API test..."
echo "Target URL: $API_URL"
echo "Sending $REQUEST_COUNT requests..."

# Loop from 1 to REQUEST_COUNT
for i in $(seq 1 $REQUEST_COUNT)
do
   echo "---------------- Request #$i ----------------"

   # Use curl to send the POST request and capture the output.
   # -s: Silent mode (don't show progress meter)
   # -w "\nHTTP Status: %{http_code}\n": Appends the HTTP status code to the output
   # -X POST: Specify the request method
   # -H "Content-Type: application/json": Set the content type header
   # -d '{"token":"..."}': The JSON data payload

   RESPONSE=$(curl -s -w "\nHTTP_STATUS_CODE:%{http_code}" -X POST \
     -H "Content-Type: application/json" \
     -d "{\"token\":\"$TOKEN_TO_TEST\"}" \
     "$API_URL")

   # Extract the body and status code from the combined response
   # The body is everything before the custom separator
   BODY=$(echo "$RESPONSE" | sed '$d')
   # The status code is the last line
   STATUS_CODE=$(echo "$RESPONSE" | tail -n1 | cut -d: -f2)

   # Print the results for the current request
   echo "Status Code: $STATUS_CODE"
   echo "Response Body:"
   # Check if the body is not empty before printing
   if [ -n "$BODY" ]; then
     echo "$BODY"
   else
     echo "(No response body)"
   fi

   # Optional: Add a small delay between requests
   # sleep 0.1
done

echo "----------------------------------------"
echo "Test finished."
