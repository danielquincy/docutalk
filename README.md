# DocuTalk

DocuTalk es una aplicación para cargar documentos, seleccionar avatares y generar respuestas usando Gemini API. 
Permite la interacción con documentos y audio de manera sencilla y eficiente.


## Características
- Carga de documentos
- Selección de avatares
- Generación de respuestas con Gemini API
- Reproducción de audio

## Requisitos
- Node.js (versión recomendada: 18+)
- Docker (opcional para despliegue)

## Instalación y Ejecución Local

1. Instala las dependencias:
   ```bash
   npm install
   ```
2. Configura la clave de Gemini API:
   - Crea el archivo `.env.local` en la raíz del proyecto.
   - Añade la variable:
     ```env
     GEMINI_API_KEY=tu_clave_api
     ```
3. Ejecuta la aplicación:
   ```bash
   npm run dev
   ```

## Ejecución con Docker

1. Construye la imagen Docker:
   ```powershell
   docker build -t docutalk-app .
   ```
2. Ejecuta el contenedor:
   ```powershell
   docker run -d -p 8080:8080 --name docutalk-container docutalk-app
   ```
   O ejecuta el script:
   ```powershell
   .\run-docker.ps1
   ```
3. Accede a la aplicación en [http://localhost:8080](http://localhost:80)

> **Nota:** Para usar Gemini API en Docker, asegúrate de pasar la variable de entorno al contenedor si es necesario.

## Estructura del Proyecto

```
├── index.html
├── metadata.json
├── package.json
├── tsconfig.json
├── vite.config.ts
├── src/
│   ├── App.tsx
│   ├── constants.ts
│   ├── index.css
│   ├── main.tsx
│   ├── types.ts
│   ├── components/
│   │   ├── AvatarSelector.tsx
│   │   └── DocumentUploader.tsx
│   └── utils/
│       └── audio.ts
├── Dockerfile
├── run-docker.ps1
└── README.md
```

## Contribución

¡Las contribuciones son bienvenidas! Por favor, abre un issue o pull request para sugerencias o mejoras.

## Licencia

Este proyecto está bajo la licencia MIT.

---
 
