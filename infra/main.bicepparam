using './main.bicep'

param environmentName = readEnvironmentVariable('AZURE_ENV_NAME', 'cu-client')
param location = readEnvironmentVariable('AZURE_LOCATION', 'westeurope')
param foundryLocation = readEnvironmentVariable('AZURE_FOUNDRY_LOCATION', 'westeurope')
param tenantId = readEnvironmentVariable('AZURE_TENANT_ID', '')
param apiClientId = readEnvironmentVariable('API_CLIENT_ID', '')
param spaClientId = readEnvironmentVariable('SPA_CLIENT_ID', '')
param developerPrincipalId = readEnvironmentVariable('DEVELOPER_PRINCIPAL_ID', '')
param apiImageName = readEnvironmentVariable('SERVICE_API_IMAGE_NAME', '')
param foundryName = readEnvironmentVariable('AZURE_FOUNDRY_NAME', 'cv-field-extractor-resource')
param foundryResourceGroupName = readEnvironmentVariable('AZURE_FOUNDRY_RESOURCE_GROUP', '')
