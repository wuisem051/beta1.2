# 🚀 Trading Escalonado - Guía Rápida

## ¿Qué es?

Una herramienta profesional para optimizar tus operaciones de trading spot mediante **órdenes limit distribuidas en múltiples niveles de precio**. Perfecta para estrategias de DCA (Dollar Cost Averaging) y toma de ganancias escalonadas.

![Scalper Tool Preview](./scalper_tool_preview.png)

## ✅ Características Principales

- ✨ **Compras Escalonadas**: Distribuye tu capital en múltiples niveles de precio hacia abajo
- 📈 **Ventas Escalonadas**: Vende en niveles progresivos para maximizar ganancias
- 🎯 **Cálculo Automático**: Genera niveles óptimos basados en tu configuración
- 💰 **3 Distribuciones**: Igual, Pirámide, Pirámide Invertida
- 🔄 **Auto-sugerencia de Ventas**: Calcula automáticamente niveles de venta tras compras
- 🌐 **Multi-Exchange**: Compatible con Binance y BingX
- ⚡ **Ejecución Rápida**: Ejecuta todas las órdenes o una por una

## 🎮 Inicio Rápido

### 1. Configurar API Keys
```
Panel Usuario → Conexión Exchange → Credenciales
→ Ingresa API Key y Secret de Binance/BingX
→ Guarda configuración
```

### 2. Acceder a la Herramienta
```
Panel Usuario → Conexión Exchange → Pestaña "Escalonado"
```

### 3. Configurar Operación

**Para Compras:**
1. Selecciona "Compra Escalonada"
2. Elige el par (ej: BTC/USDT)
3. Ingresa capital total en USDT
4. Ajusta niveles (recomendado: 5-7)
5. Define separación (recomendado: 1-3%)
6. Selecciona distribución (Pirámide para DCA)
7. Click "Calcular Niveles"
8. Revisa y ejecuta

**Para Ventas:**
1. Selecciona "Venta Escalonada"
2. Elige el par
3. Ingresa cantidad del activo
4. Ajusta niveles
5. Define separación (recomendado: 2-5%)
6. Selecciona distribución (Pirámide Invertida)
7. Click "Calcular Niveles"
8. Revisa y ejecuta

## 📊 Ejemplo Práctico

### Compra Escalonada de BTC

**Configuración:**
- Capital: $1,000 USDT
- Niveles: 5
- Separación: 2%
- Distribución: Pirámide
- Precio actual: $50,000

**Resultado:**
| Nivel | Precio | Capital | % |
|-------|--------|---------|---|
| 1 | $49,000 | $333 | 33% |
| 2 | $48,020 | $267 | 27% |
| 3 | $47,060 | $200 | 20% |
| 4 | $46,119 | $133 | 13% |
| 5 | $45,196 | $67 | 7% |

**Ventaja:** Si BTC cae a $46,000, habrás ejecutado 4 niveles con un precio promedio de ~$47,500 en lugar de $50,000.

## 💡 Mejores Prácticas

### ✅ Hacer:
- Usar 5-7 niveles para balance entre cobertura y ejecución
- Separación de 1-3% en mercados volátiles
- Distribución Pirámide para compras (más capital abajo)
- Distribución Pirámide Invertida para ventas (asegurar ganancias)
- Revisar niveles antes de ejecutar
- Monitorear órdenes abiertas regularmente

### ❌ Evitar:
- Usar todo tu capital en una sola operación
- Niveles muy juntos (< 0.5%) o muy separados (> 5%)
- Ignorar el soporte/resistencia técnica
- Ejecutar sin revisar la tabla de niveles
- Olvidar configurar stop loss mental

## 🔧 Distribuciones Explicadas

### 1. **Igual (Uniforme)**
- Cada nivel recibe la misma porción
- Ideal para: Mercados estables, principiantes
- Ejemplo: 20% en cada uno de 5 niveles

### 2. **Pirámide**
- Más capital en niveles inferiores
- Ideal para: Compras en caídas, DCA agresivo
- Ejemplo: 33%, 27%, 20%, 13%, 7%

### 3. **Pirámide Invertida**
- Más capital en niveles superiores
- Ideal para: Ventas graduales, asegurar ganancias
- Ejemplo: 7%, 13%, 20%, 27%, 33%

## 📈 Estrategias Recomendadas

### DCA Defensivo (Compras)
```
Niveles: 7
Separación: 2%
Distribución: Pirámide
```
Captura caídas progresivas con más capital en niveles bajos.

### Toma de Ganancias Conservadora (Ventas)
```
Niveles: 6
Separación: 3%
Distribución: Pirámide Invertida
```
Asegura ganancias tempranas mientras mantiene exposición.

### Grid Trading Básico
```
1. Compras: 5 niveles, -2% cada uno, Pirámide
2. Ventas: 5 niveles, +2% cada uno, Pirámide Invertida
```
Crea una red que captura volatilidad en ambas direcciones.

## 🆘 Solución Rápida de Problemas

| Problema | Solución |
|----------|----------|
| No veo la pestaña "Escalonado" | Configura API Keys primero |
| Error al calcular niveles | Verifica capital y precio actual |
| Órdenes no se ejecutan | Revisa saldo en exchange |
| Precio no se actualiza | Click en botón de sincronización |

## 📚 Recursos Adicionales

- **Documentación Completa**: Ver `SCALPER_TRADING_GUIDE.md`
- **Soporte Técnico**: Panel Usuario → Soporte
- **Monitoreo**: Panel Usuario → Conexión Exchange → Órdenes

## ⚠️ Advertencias

- Esta herramienta ejecuta **órdenes reales** en tu exchange
- Asegúrate de tener **saldo suficiente** antes de ejecutar
- Las órdenes son **limit orders** (no market)
- Revisa **siempre** la tabla antes de ejecutar
- Usa solo con **API Keys sin permisos de Withdraw**

## 🎯 Próximas Mejoras

- [ ] Stop loss automático configurable
- [ ] Trailing stop para ventas
- [ ] Templates de estrategias guardadas
- [ ] Backtesting de configuraciones
- [ ] Notificaciones de ejecución
- [ ] Análisis de rendimiento histórico

---

**¿Necesitas ayuda?** Consulta la documentación completa o contacta soporte técnico.

**Versión**: 1.0.0 | **Compatible**: Binance, BingX | **Última actualización**: Feb 2026
