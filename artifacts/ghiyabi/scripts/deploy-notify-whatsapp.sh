#!/usr/bin/env bash
# Deploy notify-whatsapp and set secrets on your Supabase project.
#
# Prerequisites: Supabase CLI (https://supabase.com/docs/guides/cli)
#   npm i -g supabase
#
# Auth (pick one):
#   export SUPABASE_ACCESS_TOKEN="your-personal-access-token"
#   # or: supabase login
#
# Required env vars:
#   SUPABASE_PROJECT_REF
#   WHATSAPP_ACCESS_TOKEN
#   WHATSAPP_PHONE_NUMBER_ID
#
# Optional:
#   NOTIFY_WEBHOOK_SECRET
#   WHATSAPP_GRAPH_API_VERSION
#
# Optional file: load secrets from a gitignored file:
#   cp .env.supabase.example .env.supabase   # then fill values
#   set -a && source .env.supabase && set +a && ./scripts/deploy-notify-whatsapp.sh

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [ -z "${SUPABASE_PROJECT_REF:-}" ]; then
  echo "ERROR: Set SUPABASE_PROJECT_REF (Supabase dashboard → Project Settings → Reference ID)"
  exit 1
fi
if [ -z "${WHATSAPP_ACCESS_TOKEN:-}" ] || [ -z "${WHATSAPP_PHONE_NUMBER_ID:-}" ]; then
  echo "ERROR: Set WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID"
  exit 1
fi

ARGS=(
  "WHATSAPP_ACCESS_TOKEN=${WHATSAPP_ACCESS_TOKEN}"
  "WHATSAPP_PHONE_NUMBER_ID=${WHATSAPP_PHONE_NUMBER_ID}"
)
if [ -n "${NOTIFY_WEBHOOK_SECRET:-}" ]; then
  ARGS+=("NOTIFY_WEBHOOK_SECRET=${NOTIFY_WEBHOOK_SECRET}")
fi
if [ -n "${WHATSAPP_GRAPH_API_VERSION:-}" ]; then
  ARGS+=("WHATSAPP_GRAPH_API_VERSION=${WHATSAPP_GRAPH_API_VERSION}")
fi

echo "Setting secrets on project ${SUPABASE_PROJECT_REF}..."
supabase secrets set "${ARGS[@]}" --project-ref "$SUPABASE_PROJECT_REF"

echo "Deploying notify-whatsapp..."
supabase functions deploy notify-whatsapp --project-ref "$SUPABASE_PROJECT_REF"

echo "Done. Function URL:"
echo "https://${SUPABASE_PROJECT_REF}.supabase.co/functions/v1/notify-whatsapp"
