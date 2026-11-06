# Content Understanding client app

Upload a **PDF, DOCX or TXT** file and view the extracted markdown and summary produced by
[Azure AI Content Understanding](https://learn.microsoft.com/azure/ai-services/content-understanding/)
(`prebuilt-documentSearch` analyzer).

- **Frontend:** Angular 22, Tailwind CSS 4, MSAL (`@azure/msal-angular`) for Entra ID sign-in
- **Backend:** ASP.NET Core (.NET 10) minimal API using `Azure.AI.ContentUnderstanding`, JWT-protected
- **Hosting:** a single Azure Container App; the Angular build is served from the API's `wwwroot`
- **Infra:** Bicep in [`infra/`](infra), deployed with the Azure Developer CLI (`azd`)

```
src/ContentUnderstanding.Api         ASP.NET Core API (+ wwwroot in the container)
src/ContentUnderstanding.ClientApp   Angular SPA
tests/ContentUnderstanding.Api.Tests xUnit tests
infra/                               Bicep (monitoring, identity, ACR, Foundry, Container App)
```

## Identities created

| Identity | Created by | Purpose |
|---|---|---|
| User-assigned managed identity (`id-…`) | Bicep | Runtime identity of the Container App. Holds **Cognitive Services User** on the Foundry resource and **AcrPull** on the registry. No API keys are used (`disableLocalAuth: true`). |
| API app registration | **You** (manual) | Exposes the `access_as_user` scope; the API validates tokens for this audience. |
| SPA app registration | **You** (manual) | Public client used by MSAL to sign users in and request the API scope. |

## Prerequisites

.NET 10 SDK, Node.js 22+ (24 recommended), Azure CLI, Azure Developer CLI (`azd`), Docker (optional, for a local container build),
and permission to create app registrations and role assignments.

## 1. Entra ID app registrations (manual)

1. **API app** – Entra ID → App registrations → *New registration* (single tenant).
   - *Expose an API* → set Application ID URI to `api://<api-client-id>` (the default).
   - Add a scope named **`access_as_user`** (admins and users can consent).
   - *Manifest* → set `requestedAccessTokenVersion` (`api.requestedAccessTokenVersion`) to **2**.
2. **SPA app** – *New registration* (single tenant), then *Authentication* → *Add a platform* → **Single-page application**:
   - Redirect URI (local): `http://localhost:4200`
   - Redirect URI (production): `https://<container-app-fqdn>` (printed as `SERVICE_API_URI` after provisioning)
   - *API permissions* → add the API's `access_as_user` delegated permission and grant consent.
3. Note the **tenant ID**, **API client ID** and **SPA client ID**.

## 2. Environment variables

The SPA has **no build-time configuration**: it fetches its MSAL settings from `GET /api/config`, which the
backend builds from the variables below. You only configure the backend, locally and in production.

| Setting (config key / env var) | Description |
|---|---|
| `ContentUnderstanding:Endpoint` / `ContentUnderstanding__Endpoint` | Foundry endpoint, e.g. `https://cv-field-extractor-resource.services.ai.azure.com/` |
| `ContentUnderstanding:AnalyzerId` | Optional, default `prebuilt-documentSearch` |
| `ContentUnderstanding:MaxFileSizeMb` | Optional, default `20` |
| `ContentUnderstanding:ConfigureDefaultsOnStartup` | Optional, default `true`; maps model names to deployments at start-up |
| `AzureAd:TenantId` / `AzureAd__TenantId` | Entra tenant ID |
| `AzureAd:ClientId` / `AzureAd__ClientId` | **API** app registration client ID |
| `AzureAd:SpaClientId` / `AzureAd__SpaClientId` | **SPA** app registration client ID |
| `AZURE_CLIENT_ID` | Client ID of the user-assigned managed identity (production only; set by Bicep) |
| `APPLICATIONINSIGHTS_CONNECTION_STRING` | Optional locally; set by Bicep in production |

### Local development

Set the backend values with [user secrets](https://learn.microsoft.com/aspnet/core/security/app-secrets) (never commit them):

```powershell
cd src/ContentUnderstanding.Api
dotnet user-secrets set "ContentUnderstanding:Endpoint" "https://<your-foundry>.services.ai.azure.com/"
dotnet user-secrets set "AzureAd:TenantId" "<tenant-id>"
dotnet user-secrets set "AzureAd:ClientId" "<api-client-id>"
dotnet user-secrets set "AzureAd:SpaClientId" "<spa-client-id>"
```

Authenticate to Azure so `DefaultAzureCredential` can call Foundry, and make sure your user has the
**Cognitive Services User** role on the Foundry resource (Bicep grants it if you set `DEVELOPER_PRINCIPAL_ID`, see below):

```powershell
az login
```

Run both halves (two terminals):

```powershell
dotnet run --project src/ContentUnderstanding.Api --launch-profile https   # https://localhost:7080
cd src/ContentUnderstanding.ClientApp; npm install; npm start              # http://localhost:4200 (proxies /api)
```

Run the tests: `dotnet test` from the repo root.

### Production (Azure Container App)

The Bicep deployment sets every variable above on the Container App for you. To change one afterwards:

```powershell
az containerapp update -g <rg> -n <app> --set-env-vars "AzureAd__SpaClientId=<new-id>"
```

or edit it in the portal under *Container App → Settings → Environment variables*.

## 3. Deploy to Azure

```powershell
azd auth login
azd env new <env-name>
azd env set API_CLIENT_ID <api-client-id>
azd env set SPA_CLIENT_ID <spa-client-id>
azd env set DEVELOPER_PRINCIPAL_ID (az ad signed-in-user show --query id -o tsv)   # optional, for local dev access
azd up
```

`azd up` provisions the resources in `infra/` (Log Analytics + Application Insights, managed identity, ACR,
the existing Foundry account `cv-field-extractor-resource` declared in IaC (idempotent) with its `gpt-5.4-mini`, `gpt-5.1` and `text-embedding-3-large` deployments, Container Apps environment and app),
then builds the root `Dockerfile` in ACR and deploys it. Afterwards add the printed `SERVICE_API_URI` as a
redirect URI on the **SPA** app registration.

Optional azd env values: `AZURE_FOUNDRY_NAME` (default `cv-field-extractor-resource`), `AZURE_FOUNDRY_RESOURCE_GROUP` (the existing account's resource group; must already exist, defaults to the app's), `AZURE_LOCATION`, `AZURE_FOUNDRY_LOCATION` (both default to `westeurope`; Foundry must be in a
[Content Understanding region](https://learn.microsoft.com/azure/ai-services/content-understanding/language-region-support)).

Build and run the container locally (single image, Angular in `wwwroot`):

```powershell
docker build -t cu-client:local .
docker run --rm -p 8080:8080 -e ContentUnderstanding__Endpoint=... -e AzureAd__TenantId=... `
  -e AzureAd__ClientId=... -e AzureAd__SpaClientId=... cu-client:local
```

(Add `http://localhost:8080` as a SPA redirect URI to sign in; Azure credentials are not available in the container
unless you pass them, so analysis calls will only work when deployed or with additional credential env vars.)

## Notes

- Logging uses `ILogger` with source-generated `[LoggerMessage]` templates (`Logging/Log.cs`) – structured properties, no string interpolation.
- On start-up the API maps the Foundry model deployments to Content Understanding defaults (`gpt-4.1` to `gpt-5.1`, `gpt-4.1-mini` to `gpt-5.4-mini`; override via `ContentUnderstanding__ModelDeployments__<model>`). If RBAC has not propagated yet it retries and logs a warning.
- `Azure.AI.ContentUnderstanding` is currently a pre-release package; SDK usage is isolated in `ContentUnderstandingAnalysisService`.
- Allowed uploads are validated in both the SPA and the API (extension, magic bytes, size).
