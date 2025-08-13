# Use the official .NET runtime as a base image
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS base
WORKDIR /app
EXPOSE 5000

# Build stage
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY ["FileBlogSystem.csproj", "."]
RUN dotnet restore "FileBlogSystem.csproj"
COPY . .
RUN dotnet publish "FileBlogSystem.csproj" -c Release -o /app/publish

# Final stage
FROM base AS final
WORKDIR /app
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "FileBlogSystem.dll"]
