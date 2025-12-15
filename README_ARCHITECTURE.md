# Arquitectura de la Aplicación Web

Este documento describe la estructura y las tecnologías utilizadas en la aplicación web para facilitar su comprensión y futuras mejoras.

## 1. Tecnologías Principales

*   **Frontend**:
    *   **React.js**: Biblioteca JavaScript para construir interfaces de usuario.
    *   **React Router DOM**: Para la gestión de rutas y navegación en la aplicación.
    *   **Chart.js**: Para la visualización de datos (gráficos).
    *   **Tailwind CSS**: Framework CSS para estilos rápidos y responsivos.
    *   **CSS Modules**: Para el encapsulamiento de estilos a nivel de componente (ej. `UserPanel.module.css`).
*   **Backend / Base de Datos / Autenticación**:
    *   **Firebase**: Plataforma de Google para el desarrollo de aplicaciones.
        *   **Firestore**: Base de datos NoSQL en la nube para almacenar y sincronizar datos en tiempo real.
        *   **Firebase Authentication**: Para la gestión de usuarios (registro, inicio de sesión, reautenticación).
*   **Gestión de Paquetes**: npm

## 2. Estructura de Directorios

La aplicación sigue una estructura de directorios modular. Se propone la siguiente estructura optimizada:

```
src/
├── api/               # Clientes API y configuraciones
├── assets/            # Recursos estáticos (imágenes, iconos, etc.)
├── components/        # Componentes reutilizables
│   ├── ui/            # Componentes básicos de UI (Botones, Inputs, Modals, etc.)
│   ├── layout/        # Componentes de layout (Header, Sidebar, Footer)
│   └── forms/         # Componentes específicos para formularios
├── context/           # Contextos de React (AuthContext, ThemeContext, etc.)
├── hooks/             # Hooks personalizados (useAuth, useTheme, etc.)
├── pages/             # Páginas principales de la aplicación (Home, Login, UserPanel, AdminPanel)
├── services/          # Servicios para interactuar con backend/APIs (Firebase, API externas)
├── styles/            # Estilos globales, variables CSS y temas
├── utils/             # Funciones utilitarias y helpers
└── constants.js       # Constantes de la aplicación (umbrales, configuraciones, etc.)
```

**Estructura Actual (a refactorizar):**

*   `public/`: Contiene el `index.html` principal y otros activos estáticos.
*   `src/`: Directorio principal del código fuente.
    *   `src/App.js`: Componente raíz de la aplicación.
    *   `src/index.js`: Punto de entrada de la aplicación.
    *   `src/AuthContext.js`: Contexto de React para la gestión de la autenticación del usuario.
    *   `src/ThemeContext.js`: Contexto de React para la gestión del tema (claro/oscuro).
    *   `src/ProtectedRoute.js`: Componente de ruta protegida para restringir el acceso a ciertas páginas.
    *   `src/api/`: Posiblemente para futuras integraciones de API externas.
    *   `src/components/`: Contiene componentes reutilizables de la UI.
        *   `ErrorMessage.jsx`: Componente para mostrar mensajes de error o éxito.
        *   `Sidebar.jsx`: Barra lateral de navegación.
        *   `MainContent.jsx`: Contenedor principal para el contenido de las páginas.
        *   `MinerManagement.jsx`, `PoolConfiguration.jsx`, `UserManagement.jsx`, etc.: Componentes específicos para las funcionalidades del panel de administración.
        *   `UserPoolArbitrage.jsx`: Componente para la funcionalidad de arbitraje de pools de usuario.
    *   `src/firebase/firebase.js`: Configuración e inicialización de Firebase.
    *   `src/lib/`: Posiblemente para librerías o utilidades de terceros.
    *   `src/pages/`: Contiene los componentes de las páginas principales de la aplicación.
        *   `Home.js`: Página de inicio.
        *   `Login.js`, `Signup.js`, `AdminLogin.js`: Páginas de autenticación.
        *   `UserPanel.js`: Panel principal para usuarios autenticados, que incluye sub-secciones como Dashboard, Mining Info, Withdrawals, Contact Support, Referrals, Pool Arbitrage y Settings.
        *   `AdminPanel.js`: Panel principal para administradores, con rutas para la gestión de mineros, usuarios, configuración, etc.
    *   `src/utils/`: Contiene funciones de utilidad (ej. `miners.js`).
    *   `src/App.css`, `src/index.css`: Archivos CSS globales.

## 3. Componentes Clave y Flujo de Datos

*   **`App.js`**: Define las rutas principales de la aplicación y envuelve la aplicación con `AuthContext` y `ThemeContext`.
*   **`AuthContext.js`**: Provee el estado de autenticación del usuario (`currentUser`) y funciones para `login`, `logout`, `signup`. Utiliza `onAuthStateChanged` de Firebase para mantener el estado de autenticación sincronizado.
*   **`ThemeContext.js`**: Provee el estado del tema (`darkMode`) y una función para alternarlo.
*   **`UserPanel.js`**:
    *   Utiliza `useAuth` y `useContext(ThemeContext)`.
    *   Gestiona estados locales para mineros, balances, tasas de pago, umbrales de retiro, historial de pagos y retiros.
    *   Realiza suscripciones en tiempo real a Firestore para obtener datos relevantes del usuario y la configuración global.
    *   Renderiza diferentes sub-componentes (ej. `DashboardContent`, `MiningInfoContent`, `WithdrawalsContent`, `ContactSupportContent`, `SettingsContent`) basados en la ruta actual.
    *   El componente `ErrorMessage` se utiliza en la mayoría de los sub-componentes para mostrar mensajes de error o éxito al usuario.
*   **`AdminPanel.js`**:
    *   Utiliza `useContext(ThemeContext)`.
    *   Gestiona estados para notificaciones de solicitudes de contacto y retiro no leídas, y nuevos mineros.
    *   Define las rutas para los componentes de gestión de administración (ej. `MinerManagement`, `UserManagement`, `PoolConfiguration`).
    *   La gestión de errores y mensajes de éxito se implementa dentro de cada componente de gestión individual (ej. `MinerManagement` tiene su propio `ErrorMessage`).
*   **Interacción con Firebase**:
    *   Se utilizan funciones de Firestore como `collection`, `query`, `where`, `onSnapshot`, `doc`, `getDoc`, `updateDoc`, `setDoc`, `addDoc`, `deleteDoc`, `getDocs`, `orderBy` para interactuar con la base de datos.
    *   Se utilizan funciones de Firebase Authentication como `updateEmail`, `updatePassword`, `reauthenticateWithCredential` para la gestión de credenciales de usuario.

## 4. Manejo de Estado

*   **Estado Global**: `AuthContext` y `ThemeContext` para datos accesibles en toda la aplicación.
*   **Estado Local**: `useState` se utiliza ampliamente en los componentes para gestionar el estado específico de cada uno (ej. valores de formularios, mensajes de carga/error, datos de listas).
*   **Memorización**: `useMemo` se utiliza en `DashboardContent` para optimizar cálculos costosos (hashrate total, ganancias estimadas).

## 5. Estilos

*   **Tailwind CSS**: Clases de utilidad aplicadas directamente en el JSX.
*   **CSS Modules**: Archivos `.module.css` (ej. `UserPanel.module.css`) para estilos con ámbito local, importados como objetos JavaScript.

## 6. Consideraciones para Mejoras

Para mejorar la funcionalidad, rendimiento y mantenibilidad de la aplicación, se sugieren las siguientes áreas de mejora:

*   **Mejoras en la Arquitectura y Organización**:
    *   Refactorizar la estructura de directorios actual para alinearse con la propuesta optimizada (`src/api`, `src/assets`, `src/components/ui`, `src/components/layout`, `src/components/forms`, `src/context`, `src/hooks`, `src/pages`, `src/services`, `src/styles`, `src/utils`, `src/constants.js`).
    *   Mover `AuthContext.js` y `ThemeContext.js` al nuevo directorio `src/context/`.
    *   Mover `src/firebase/firebase.js` a `src/services/firebase.js`.
    *   Mover `src/utils/miners.js` y otras utilidades a `src/utils/`.
    *   Crear un archivo `src/constants.js` para centralizar valores fijos como umbrales de pago, configuraciones de pool, etc.

*   **Manejo de Estado Centralizado**:
    *   Aunque `Context API` es útil para estados globales simples, para una aplicación en crecimiento, considerar soluciones más robustas como **Redux**, **Zustand** o **Jotai**. Esto puede simplificar la gestión de estados complejos y el flujo de datos entre componentes no relacionados directamente.

*   **Validación de Formularios**:
    *   Implementar librerías de validación de formularios más robustas como **Formik** o **React Hook Form** en combinación con esquemas de validación (ej. **Yup** o **Zod**). Esto mejorará la experiencia del usuario con retroalimentación instantánea y la seguridad al asegurar que los datos enviados sean válidos.

*   **Manejo de Errores Global**:
    *   Centralizar la lógica de manejo de errores para evitar la duplicación de código y proporcionar una experiencia de usuario consistente. Esto podría incluir un componente `ErrorBoundary` para errores de renderizado y un servicio global para capturar y mostrar errores de API o lógica de negocio.

*   **Optimización de Rendimiento**:
    *   **Lazy Loading**: Implementar `React.lazy()` y `Suspense` para cargar componentes y rutas de forma diferida, reduciendo el tiempo de carga inicial.
    *   **Memoización**: Extender el uso de `React.memo`, `useMemo` y `useCallback` para evitar re-renderizados innecesarios de componentes y funciones.
    *   **Virtualización de Listas**: Para listas largas (ej. historial de pagos/retiros), usar librerías como `react-window` o `react-virtualized` para renderizar solo los elementos visibles, mejorando el rendimiento.

*   **Seguridad**:
    *   **Reglas de Seguridad de Firebase**: Revisar y fortalecer las reglas de seguridad de Firestore para asegurar que los usuarios solo puedan acceder y modificar sus propios datos, y que los administradores tengan los permisos adecuados.
    *   **Sanitización de Entradas**: Asegurar que todas las entradas de usuario sean sanitizadas en el backend (Firebase Functions si se usan) para prevenir ataques de inyección.
    *   **Protección contra XSS/CSRF**: Aunque React ya ofrece cierta protección, revisar las mejores prácticas para prevenir ataques de Cross-Site Scripting (XSS) y Cross-Site Request Forgery (CSRF).

*   **Pruebas**:
    *   **Pruebas Unitarias**: Escribir pruebas para funciones utilitarias, hooks personalizados y componentes pequeños utilizando librerías como **Jest** y **React Testing Library**.
    *   **Pruebas de Integración**: Probar la interacción entre diferentes componentes y servicios.
    *   **Pruebas End-to-End (E2E)**: Utilizar herramientas como **Cypress** o **Playwright** para simular el flujo de usuario completo en la aplicación.

*   **Documentación**:
    *   **JSDoc**: Añadir comentarios JSDoc a funciones, componentes y hooks para mejorar la legibilidad y mantenibilidad del código.
    *   **Storybook**: Considerar el uso de Storybook para documentar y desarrollar componentes de UI de forma aislada.

*   **Integración Continua / Despliegue Continuo (CI/CD)**:
    *   Configurar un pipeline de CI/CD (ej. GitHub Actions, GitLab CI, Netlify) para automatizar las pruebas, el linting y el despliegue de la aplicación, asegurando un proceso de desarrollo más eficiente y fiable.
