# ─── Stage 1: Build React frontend ───────────────────────────────────────────
FROM node:22-alpine AS frontend-build
WORKDIR /src/TaxiBot.Web

COPY TaxiBot.Web/package.json TaxiBot.Web/package-lock.json* ./
RUN npm ci

COPY TaxiBot.Web/ ./
RUN npm run build
# vite outDir: '../wwwroot' → output lands at /src/wwwroot


# ─── Stage 2: Build .NET backend ──────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS backend-build
WORKDIR /src

COPY *.csproj ./
RUN dotnet restore

COPY . .
# Inject the pre-built React app
COPY --from=frontend-build /src/wwwroot ./wwwroot

RUN dotnet publish -c Release -o /app/publish


# ─── Stage 3: Runtime image ───────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS runtime
WORKDIR /app

COPY --from=backend-build /app/publish .

# SQLite db and backups live here — mount as named volumes
VOLUME ["/app/data", "/app/backups"]

ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

ENTRYPOINT ["dotnet", "TaxiBotTest.dll"]
