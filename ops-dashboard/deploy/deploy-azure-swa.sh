#!/bin/bash
# Azure Static Web Apps Deployment Script
# Reusable deployment for ops-dashboard

set -e

# Configuration
RESOURCE_GROUP="${RESOURCE_GROUP:-devops}"
APP_NAME="${APP_NAME:-ops-dashboard}"
LOCATION="${LOCATION:-eastus2}"
SKU="${SKU:-Free}"
SUBSCRIPTION="${SUBSCRIPTION:-b2a80749-7cd2-4ef4-bb5b-fab5b010f275}"

echo "=========================================="
echo "Azure Static Web Apps Deployment"
echo "=========================================="
echo "Resource Group: $RESOURCE_GROUP"
echo "App Name: $APP_NAME"
echo "Location: $LOCATION"
echo "SKU: $SKU"
echo "=========================================="

# Set subscription
echo "Setting subscription..."
az account set --subscription "$SUBSCRIPTION"

# Create resource group if it doesn't exist
echo "Creating resource group '$RESOURCE_GROUP' in '$LOCATION'..."
az group create --name "$RESOURCE_GROUP" --location "$LOCATION" --output none 2>/dev/null || true

# Check if Static Web App already exists
EXISTING=$(az staticwebapp list --resource-group "$RESOURCE_GROUP" --query "[?name=='$APP_NAME'].name" -o tsv 2>/dev/null || echo "")

if [ -n "$EXISTING" ]; then
    echo "Static Web App '$APP_NAME' already exists. Updating..."
else
    echo "Creating Static Web App '$APP_NAME'..."
    az staticwebapp create \
        --name "$APP_NAME" \
        --resource-group "$RESOURCE_GROUP" \
        --location "$LOCATION" \
        --sku "$SKU" \
        --source "https://github.com/azendtech-dumindu/devops-dashboard" \
        --branch "main" \
        --app-location "/ops-dashboard" \
        --output-location ".next" \
        --login-with-github
fi

# Get deployment token
echo ""
echo "Getting deployment token..."
DEPLOYMENT_TOKEN=$(az staticwebapp secrets list --name "$APP_NAME" --resource-group "$RESOURCE_GROUP" --query "properties.apiKey" -o tsv)

echo ""
echo "=========================================="
echo "Deployment Complete!"
echo "=========================================="

# Get the URL
URL=$(az staticwebapp show --name "$APP_NAME" --resource-group "$RESOURCE_GROUP" --query "defaultHostname" -o tsv)
echo "App URL: https://$URL"
echo ""
echo "Deployment Token (for CI/CD):"
echo "$DEPLOYMENT_TOKEN"
echo ""
echo "To configure environment variables, run:"
echo "  az staticwebapp appsettings set --name $APP_NAME --resource-group $RESOURCE_GROUP --setting-names KEY=VALUE"
echo ""
