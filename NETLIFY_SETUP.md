# Firebase Service Account Setup for Netlify Functions

## ¿Por qué es necesario?

Las Netlify Functions necesitan acceso a Firestore para leer las API Keys del usuario. Para esto, necesitan un **Service Account** de Firebase.

## Pasos para configurar

### 1. Generar Service Account Key

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Selecciona tu proyecto: **pool-btc**
3. Click en el ícono de ⚙️ (Settings) → **Project Settings**
4. Ve a la pestaña **Service Accounts**
5. Click en **Generate New Private Key**
6. Confirma y descarga el archivo JSON

### 2. Configurar en Netlify

1. Ve a tu [Netlify Dashboard](https://app.netlify.com/)
2. Selecciona tu sitio
3. Ve a **Site settings** → **Environment variables**
4. Click en **Add a variable**
5. Configura:
   - **Key**: `FIREBASE_SERVICE_ACCOUNT`
   - **Value**: Pega TODO el contenido del archivo JSON descargado (debe empezar con `{` y terminar con `}`)
   - **Scopes**: Selecciona "All scopes" o específicamente "Functions"
6. Click en **Save**

### 3. Desplegar

Una vez configurada la variable de entorno:

```bash
git add .
git commit -m "feat: Migrate to Netlify Functions"
git push origin master
```

Netlify detectará los cambios y desplegará automáticamente las funciones.

## Verificar que funciona

1. Ve al panel de usuario
2. Navega a "Conexión Exchange"
3. Configura tus API Keys (Binance o BingX)
4. Intenta cargar el balance

Si todo está bien configurado, deberías ver tu balance del exchange.

## Troubleshooting

### Error: "API Keys no configuradas"
- Verifica que hayas guardado las keys en la sección "Configuración API"
- Revisa que las reglas de Firestore permitan acceso a `users/{uid}/secrets/exchange`

### Error: "Authentication required"
- Verifica que la variable `FIREBASE_SERVICE_ACCOUNT` esté correctamente configurada en Netlify
- Asegúrate de que el JSON esté completo (sin espacios extra al inicio/final)

### Error de conexión con Exchange
- Verifica que tus API Keys sean correctas
- Para BingX: Asegúrate de que las keys tengan permisos de "Spot Trading"
- Para Binance: Verifica que las keys tengan permisos de "Read" y "Spot & Margin Trading"

## Costos

✅ **100% Gratis**
- Netlify Functions: 125,000 invocaciones/mes gratis
- Firebase Firestore: Plan Spark es suficiente
- No se requiere tarjeta de crédito
