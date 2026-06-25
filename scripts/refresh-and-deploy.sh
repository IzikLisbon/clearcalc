#!/bin/zsh
# refresh-and-deploy.sh — weekly refresh of ClearCalc's live mortgage rates.
#
# Pulls the latest 30/15-year averages from FRED (Freddie Mac PMMS, public CSV,
# no key), rewrites the on-page "Today's average mortgage rates" box + JSON-LD
# dateModified + sitemap lastmod (via update-rates.js), and — ONLY when the data
# actually changed — commits the refresh and redeploys the static site to Azure
# Static Web Apps through the ACR build agent (the same recipe used for manual
# deploys). The SWA deployment token is fetched fresh from Azure each run and
# rotated afterwards, so nothing secret is ever stored on disk or in git.
#
# Scheduled weekly (Fridays) by ~/Library/LaunchAgents/com.clearcalc.rates.weekly.plist
# because Freddie Mac publishes the survey weekly on Thursdays. Safe to run by hand.

set -euo pipefail

# Resolve the repo root from this script's location (scripts/ -> repo root).
REPO="$(cd "$(dirname "$0")/.." && pwd)"
ACR="prospectacr20260613"
SWA_NAME="clearcalc"
SWA_RG="ClearCalc"
LOG="$HOME/Library/Logs/clearcalc-rates.log"

log() { print -r -- "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG"; }

cd "$REPO"
log "=== weekly rate refresh start (repo: $REPO) ==="

# 1) Refresh the rate box / dateModified / sitemap from FRED.
node update-rates.js 2>&1 | tee -a "$LOG"

# 2) Deploy ONLY if the refresh changed tracked files (FRED moved this week).
if git diff --quiet -- mortgage-calculator.html refinance-calculator.html sitemap.xml; then
  log "no rate change since last run — skipping deploy."
  log "=== done (no-op) ==="
  exit 0
fi
log "rate data changed — committing and deploying."

# 3) Keep the repo in sync with the live site.
git add -A
git -c user.email="bot@clearcalc" -c user.name="ClearCalc" \
  commit -q -m "chore: weekly live mortgage-rate refresh (FRED)" || true
git push origin main 2>&1 | tee -a "$LOG" || log "warn: git push failed (continuing to deploy)."

# 4) Stage the site (exclude the build script + screenshots) and write the ACR task.
STAGE="/tmp/clearcalc-deploy"
rm -rf "$STAGE"; mkdir -p "$STAGE/site"
rsync -a --exclude '.git' --exclude '.github' --exclude 'node_modules' \
  --exclude '.DS_Store' --exclude 'update-rates.js' --exclude 'scripts' \
  --exclude '_shot-*.png' "$REPO/" "$STAGE/site/"
cat > "$STAGE/deploy.yaml" <<'YAML'
version: v1.1.0
steps:
  - cmd: node:20-bookworm npx -y @azure/static-web-apps-cli@latest deploy ./site --deployment-token {{.Values.token}} --env production
YAML

# 5) Fetch a fresh deployment token, deploy via the ACR Linux build agent.
TOKEN="$(az staticwebapp secrets list -n "$SWA_NAME" -g "$SWA_RG" --query 'properties.apiKey' -o tsv)"
( cd "$STAGE" && az acr run -r "$ACR" -f deploy.yaml --set token="$TOKEN" "$STAGE" ) 2>&1 | tail -6 | tee -a "$LOG"

# 6) Rotate the token (it was passed via a logged --set value).
SUB="$(az account show --query id -o tsv)"
az rest --method post \
  --uri "https://management.azure.com/subscriptions/$SUB/resourceGroups/$SWA_RG/providers/Microsoft.Web/staticSites/$SWA_NAME/resetapikey?api-version=2023-12-01" \
  --body '{"properties":{"repositoryToken":"","shouldUpdateRepository":false}}' -o none
unset TOKEN

# 7) Verify the live site is healthy.
CODE="$(curl -s -o /dev/null -w '%{http_code}' https://getclearcalc.com/mortgage-calculator.html)"
log "deploy complete — mortgage page HTTP $CODE"
log "=== done (deployed) ==="
