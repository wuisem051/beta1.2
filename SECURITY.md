# 🔒 Configuración de Seguridad - Firebase

## ⚠️ IMPORTANTE: Configuración de Variables de Entorno

Este proyecto utiliza Firebase y requiere credenciales que **NO deben ser compartidas públicamente**.

### Configuración Inicial

1. **Copia el archivo de ejemplo:**
   ```bash
   cp .env.example .env
   ```

2. **Edita el archivo `.env` con tus credenciales reales de Firebase:**
   - Ve a [Firebase Console](https://console.firebase.google.com/)
   - Selecciona tu proyecto
   - Ve a Project Settings → General → Your apps
   - Copia las credenciales y pégalas en `.env`

3. **NUNCA subas el archivo `.env` a GitHub**
   - El archivo `.gitignore` ya está configurado para ignorarlo
   - Solo sube `.env.example` como plantilla

### Variables Requeridas

```env
REACT_APP_FIREBASE_API_KEY=tu-api-key-aqui
REACT_APP_FIREBASE_AUTH_DOMAIN=tu-proyecto.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=tu-project-id
REACT_APP_FIREBASE_STORAGE_BUCKET=tu-proyecto.firebasestorage.app
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=tu-sender-id
REACT_APP_FIREBASE_APP_ID=tu-app-id
REACT_APP_FIREBASE_MEASUREMENT_ID=tu-measurement-id
```

### 🚨 Si Expusiste Credenciales

Si accidentalmente subiste credenciales a GitHub:

1. **Rotar API Keys en Firebase Console:**
   - Project Settings → General → Web App
   - Regenera las credenciales

2. **Eliminar del historial de Git:**
   ```bash
   git filter-branch --force --index-filter \
   "git rm --cached --ignore-unmatch ruta/al/archivo" \
   --prune-empty --tag-name-filter cat -- --all
   ```

3. **Actualizar tus archivos `.env` con las nuevas credenciales**

### Archivos Protegidos

Los siguientes archivos/directorios están en `.gitignore`:
- `.env`
- `.env.local`
- `.env.development.local`
- `.env.test.local`
- `.env.production.local`
- `scripts/` (contiene scripts con credenciales)

### Despliegue en Netlify

Para configurar las variables de entorno en Netlify:
1. Ve a Site Settings → Build & Deploy → Environment
2. Agrega cada variable `REACT_APP_FIREBASE_*` con sus valores

---

**Recuerda:** La seguridad de tu aplicación depende de mantener estas credenciales privadas. ¡Nunca las compartas en repositorios públicos!
