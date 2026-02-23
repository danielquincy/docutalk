# Script para construir y ejecutar la aplicación en Docker
# Construir la imagen
Write-Host "Construyendo la imagen Docker..."
docker build -t docutalk-app .

# Ejecutar el contenedor
Write-Host "Ejecutando el contenedor Docker..."
docker run -d -p 8080:8080 --name docutalk-container docutalk-app

Write-Host "La aplicación está disponible en http://localhost:8080"
