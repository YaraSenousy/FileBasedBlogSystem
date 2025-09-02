# Base runtime image
FROM mcr.microsoft.com/dotnet/aspnet:10.0-preview AS base
WORKDIR /app
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

# Build stage
FROM mcr.microsoft.com/dotnet/sdk:10.0-preview AS build
WORKDIR /src
COPY ["FileBlogSystem.csproj", "."]
RUN dotnet restore "FileBlogSystem.csproj"
COPY . .
RUN dotnet publish "FileBlogSystem.csproj" -c Release -o /app/publish

# Final stage
FROM base AS final
WORKDIR /app
COPY --from=build /app/publish .
COPY content /app/content
ENTRYPOINT ["dotnet", "FileBlogSystem.dll"]


