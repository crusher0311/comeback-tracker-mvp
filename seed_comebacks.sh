#!/bin/bash

API_URL="http://localhost:4000/comebacks"

# Step 1: Wipe existing comebacks and show how many were deleted
echo "🗑  Deleting all existing comebacks..."
DEL_RESP=$(curl -s -X DELETE "$API_URL")
DELETED_COUNT=$(echo "$DEL_RESP" | grep -o '"deletedCount":[0-9]\+' | grep -o '[0-9]\+')
echo "✅ Deleted $DELETED_COUNT existing record(s)."

# Arrays of possible types and statuses
TYPES=("workmanship" "misdiagnosis" "parts_failure" "customer_declined_work" "new_issue")
STATUSES=("open" "in_progress" "resolved" "closed")

# Step 2: Seed new comebacks
for i in {1..10} # change this to add more/less records
do
  type=${TYPES[$RANDOM % ${#TYPES[@]}]}
  status=${STATUSES[$RANDOM % ${#STATUSES[@]}]}

  # Random dates
  orig_day=$(( (RANDOM % 20) + 1 ))               # 1–20 (July)
  comeback_day=$(( (RANDOM % 10) + orig_day + 1 )) # > original, up to ~31 (August)

  orig_day=$(printf "%02d" $orig_day)
  comeback_day=$(printf "%02d" $comeback_day)

  curl -s -X POST "$API_URL" \
    -H "Content-Type: application/json" \
    -d "{
      \"roNumber\": \"RO-300$i\",
      \"customerName\": \"Customer $i\",
      \"vehicle\": {
        \"make\": \"Make$i\",
        \"model\": \"Model$i\",
        \"year\": $((2015 + i)),
        \"vin\": \"VIN0000000000000$i\"
      },
      \"dateOriginalRepair\": \"2025-07-$orig_day\",
      \"dateOfComeback\": \"2025-08-$comeback_day\",
      \"reportedIssue\": \"Random issue for job $i\",
      \"notes\": \"Auto-generated notes for job $i\",
      \"type\": \"$type\",
      \"financial\": { \"partsCost\": $((50 * i)), \"laborCost\": $((80 * i)), \"warrantyOrDiscount\": $((10 * i)) },
      \"resolution\": { \"assignedTo\": \"Advisor $i\", \"status\": \"$status\", \"notes\": \"Pending review\" },
      \"audit\": { \"flaggedBy\": \"Brandon\", \"notes\": \"Seeded record $i\" },
      \"location\": \"HCAC Location $i\",
      \"advisor\": \"Advisor $i\"
    }" > /dev/null

  echo "Created comeback $i | type=$type | status=$status | orig=2025-07-$orig_day | comeback=2025-08-$comeback_day"
done

echo "✅ Done — 10 fresh comeback records created."
