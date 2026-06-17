# Multi-stage build for .NET 10 backend
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS builder
WORKDIR /src

# Copy project file and restore dependencies
COPY ["WeatherChatApi.csproj", "./"]
RUN dotnet restore "WeatherChatApi.csproj"

# Copy source code and build
COPY . .
RUN dotnet build "WeatherChatApi.csproj" -c Release -o /app/build

# Publish
FROM builder AS publish
RUN dotnet publish "WeatherChatApi.csproj" -c Release -o /app/publish

# Runtime image
FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
COPY --from=publish /app/publish .

# Set environment variables
ENV ASPNETCORE_URLS=http://+:5000
ENV OLLAMA_URL=http://host.docker.internal:11434

EXPOSE 5000

ENTRYPOINT ["dotnet", "WeatherChatApi.dll"]
