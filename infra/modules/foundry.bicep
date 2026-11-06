param location string
param tags object
param name string
param modelCapacity int

@description('Managed identity principal used by the app at runtime.')
param appPrincipalId string

@description('Optional developer object ID for local development.')
param developerPrincipalId string = ''

var cognitiveServicesUserRoleId = 'a97b65f3-24c7-4388-baec-2e87135dc908'

@description('Model deployments kept in IaC. Names must match the existing deployments.')
param deployments array = [
  { name: 'gpt-5.4-mini', model: 'gpt-5.4-mini', version: '2026-03-17' }
  { name: 'gpt-5.1', model: 'gpt-5.1', version: '2025-11-13' }
  { name: 'text-embedding-3-large', model: 'text-embedding-3-large', version: '1' }
]

resource account 'Microsoft.CognitiveServices/accounts@2025-06-01' = {
  name: name
  location: location
  tags: tags
  kind: 'AIServices'
  sku: { name: 'S0' }
  identity: { type: 'SystemAssigned' }
  properties: {
    customSubDomainName: name
    publicNetworkAccess: 'Enabled'
    disableLocalAuth: true
  }
}

@batchSize(1)
resource modelDeployments 'Microsoft.CognitiveServices/accounts/deployments@2025-06-01' = [for d in deployments: {
  parent: account
  name: d.name
  sku: {
    name: 'GlobalStandard'
    capacity: modelCapacity
  }
  properties: {
    model: {
      format: 'OpenAI'
      name: d.model
      version: d.version
    }
  }
}]

resource appAccess 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(account.id, appPrincipalId, cognitiveServicesUserRoleId)
  scope: account
  properties: {
    principalId: appPrincipalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', cognitiveServicesUserRoleId)
  }
}

resource developerAccess 'Microsoft.Authorization/roleAssignments@2022-04-01' = if (!empty(developerPrincipalId)) {
  name: guid(account.id, developerPrincipalId, cognitiveServicesUserRoleId)
  scope: account
  properties: {
    principalId: developerPrincipalId
    principalType: 'User'
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', cognitiveServicesUserRoleId)
  }
}

output name string = account.name
output endpoint string = 'https://${name}.services.ai.azure.com/'
