# syntax=docker/dockerfile:1

# 1) Build the Angular SPA
FROM node:24-alpine AS spa
WORKDIR /spa
COPY src/ContentUnderstanding.ClientApp/package*.json ./
RUN npm ci
COPY src/ContentUnderstanding.ClientApp/ ./
RUN npm run build -- --configuration production

# 2) Publish the ASP.NET Core API with the SPA in wwwroot
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY Directory.Build.props ./
COPY src/ContentUnderstanding.Api/ContentUnderstanding.Api.csproj src/ContentUnderstanding.Api/
RUN dotnet restore src/ContentUnderstanding.Api/ContentUnderstanding.Api.csproj
COPY src/ContentUnderstanding.Api/ src/ContentUnderstanding.Api/
COPY --from=spa /spa/dist/ContentUnderstanding.ClientApp/browser/ src/ContentUnderstanding.Api/wwwroot/
RUN dotnet publish src/ContentUnderstanding.Api/ContentUnderstanding.Api.csproj -c Release -o /app --no-restore

# 3) Runtime
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080
COPY --from=build /app ./
USER $APP_UID
ENTRYPOINT ["dotnet", "ContentUnderstanding.Api.dll"]
