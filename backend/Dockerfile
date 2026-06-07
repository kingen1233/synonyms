# ── Build stage ──────────────────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Copy project manifests first so Docker can cache the restore layer
# independently of source changes.
COPY SynonymsTool.slnx ./
COPY src/SynonymsTool.Api/SynonymsTool.Api.csproj         src/SynonymsTool.Api/
COPY tests/SynonymsTool.Tests/SynonymsTool.Tests.csproj   tests/SynonymsTool.Tests/

RUN dotnet restore SynonymsTool.slnx

# Copy the rest of the source and publish a self-contained release build.
COPY . .
RUN dotnet publish src/SynonymsTool.Api/SynonymsTool.Api.csproj \
      --configuration Release \
      --output /app/publish

# ── Runtime stage ─────────────────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app

COPY --from=build /app/publish .

# ASP.NET Core listens on 8080 inside the container (non-root-friendly port).
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

ENTRYPOINT ["dotnet", "SynonymsTool.Api.dll"]
