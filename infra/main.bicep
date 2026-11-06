targetScope = 'subscription'

@minLength(1)
@maxLength(32)
@description('Name of the azd environment; used to derive resource names.')
param environmentName string

@description('Primary location for all resources except Foundry.')
param location string = 'westeurope'

@description('Location of the Foundry (Content Understanding) resource. Must be a region that supports Content Understanding.')
param foundryLocation string = 'westeurope'

@description('Entra tenant ID that issues tokens for the app.')
param tenantId string = ''

@description('Client ID of the API app registration (exposes the access_as_user scope).')
param apiClientId string

@description('Client ID of the SPA app registration.')
param spaClientId string

@description('Optional: object ID of a developer to grant Cognitive Services User for local development.')
param developerPrincipalId string = ''

@description('Set by azd after the first deploy; defaults to a placeholder image listening on 8080.')
param apiImageName string = ''

@description('Capacity (thousands of tokens per minute) for each model deployment.')
param modelCapacity int = 50

@description('Name of the Foundry (AIServices) account. Defaults to the existing cv-field-extractor-resource so the deployment is idempotent against it.')
param foundryName string = 'cv-field-extractor-resource'

@description('Resource group containing the existing Foundry account; must already exist. Empty uses the app resource group.')
param foundryResourceGroupName string = ''

var tags = {
  'azd-env-name': environmentName
  workload: 'content-understanding-client'
}
var token = toLower(uniqueString(subscription().id, environmentName, location))
var resourceGroupName = 'rg-${environmentName}'
var effectiveTenantId = empty(tenantId) ? tenant().tenantId : tenantId

resource rg 'Microsoft.Resources/resourceGroups@2024-03-01' = {
  name: resourceGroupName
  location: location
  tags: tags
}

module monitoring 'modules/monitoring.bicep' = {
  scope: rg
  name: 'monitoring'
  params: {
    location: location
    tags: tags
    logAnalyticsName: 'log-${token}'
    appInsightsName: 'appi-${token}'
  }
}

module identity 'modules/identity.bicep' = {
  scope: rg
  name: 'identity'
  params: {
    location: location
    tags: tags
    name: 'id-${token}'
  }
}

module registry 'modules/registry.bicep' = {
  scope: rg
  name: 'registry'
  params: {
    location: location
    tags: tags
    name: 'cr${token}'
    pullPrincipalId: identity.outputs.principalId
  }
}

module foundry 'modules/foundry.bicep' = {
  scope: resourceGroup(empty(foundryResourceGroupName) ? rg.name : foundryResourceGroupName)
  name: 'foundry'
  params: {
    location: foundryLocation
    tags: tags
    name: foundryName
    modelCapacity: modelCapacity
    appPrincipalId: identity.outputs.principalId
    developerPrincipalId: developerPrincipalId
  }
}

module containerApp 'modules/container-app.bicep' = {
  scope: rg
  name: 'container-app'
  params: {
    location: location
    tags: tags
    environmentName: 'cae-${token}'
    appName: 'ca-${token}'
    logAnalyticsName: monitoring.outputs.logAnalyticsName
    identityId: identity.outputs.id
    identityClientId: identity.outputs.clientId
    registryLoginServer: registry.outputs.loginServer
    image: empty(apiImageName) ? 'mcr.microsoft.com/dotnet/samples:aspnetapp' : apiImageName
    appInsightsConnectionString: monitoring.outputs.appInsightsConnectionString
    foundryEndpoint: foundry.outputs.endpoint
    tenantId: effectiveTenantId
    apiClientId: apiClientId
    spaClientId: spaClientId
  }
}

output AZURE_LOCATION string = location
output AZURE_TENANT_ID string = effectiveTenantId
output AZURE_RESOURCE_GROUP string = rg.name
output AZURE_CONTAINER_REGISTRY_ENDPOINT string = registry.outputs.loginServer
output AZURE_CONTAINER_REGISTRY_NAME string = registry.outputs.name
output AZURE_USER_ASSIGNED_IDENTITY_CLIENT_ID string = identity.outputs.clientId
output CONTENT_UNDERSTANDING_ENDPOINT string = foundry.outputs.endpoint
output SERVICE_API_URI string = 'https://${containerApp.outputs.fqdn}'
