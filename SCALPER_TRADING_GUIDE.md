# 📊 Herramienta de Trading Escalonado (Scalper)

## Descripción General

La **Herramienta de Trading Escalonado** es una funcionalidad avanzada diseñada para optimizar tus operaciones de compra y venta en spot mediante órdenes limit distribuidas en múltiples niveles de precio.

## ✨ Características Principales

### 1. **Estrategias Disponibles**

#### 🟢 Compra Escalonada (DCA - Dollar Cost Averaging)
- Distribuye tu capital en múltiples órdenes de compra a diferentes precios
- Reduce el riesgo de comprar en el precio máximo
- Aprovecha las caídas de precio para mejorar tu precio promedio de entrada

#### 🔴 Venta Escalonada (Take Profit Ladder)
- Vende tus activos en múltiples niveles de precio
- Maximiza ganancias capturando diferentes niveles de resistencia
- Asegura beneficios parciales mientras mantienes exposición al alza

### 2. **Configuración Flexible**

#### Parámetros Ajustables:
- **Par de Trading**: Selecciona entre los principales pares (BTC/USDT, ETH/USDT, etc.)
- **Capital Total**: Define cuánto USDT quieres invertir (para compras) o cuánta cantidad del activo quieres vender
- **Número de Niveles**: De 2 a 10 niveles de precio (recomendado: 5-7)
- **Separación entre Niveles**: Porcentaje de diferencia entre cada nivel (recomendado: 1-3%)

#### Distribuciones de Capital:
1. **Igual (Uniforme)**: Cada nivel recibe la misma porción de capital
2. **Pirámide**: Más capital en niveles inferiores (ideal para compras agresivas en caídas)
3. **Pirámide Invertida**: Más capital en niveles superiores (ideal para ventas graduales)

## 🎯 Casos de Uso

### Ejemplo 1: Compra Escalonada de BTC

**Escenario**: Quieres comprar BTC con $1000 USDT, pero el precio está en $50,000 y crees que puede bajar.

**Configuración**:
- Capital Total: 1000 USDT
- Número de Niveles: 5
- Separación: 2%
- Distribución: Pirámide

**Resultado**:
```
Nivel 1: $49,000 → $333.33 USDT (33.3%)
Nivel 2: $48,020 → $266.67 USDT (26.7%)
Nivel 3: $47,060 → $200.00 USDT (20.0%)
Nivel 4: $46,119 → $133.33 USDT (13.3%)
Nivel 5: $45,196 → $66.67 USDT (6.7%)
```

**Ventajas**:
- Si el precio baja, compras más BTC a mejor precio
- Reduces el riesgo de comprar todo en el pico
- Mejoras tu precio promedio de entrada

### Ejemplo 2: Venta Escalonada de ETH

**Escenario**: Tienes 10 ETH comprados a $2,000 y quieres vender con ganancias escalonadas.

**Configuración**:
- Cantidad Total: 10 ETH
- Número de Niveles: 6
- Separación: 2%
- Distribución: Pirámide Invertida

**Resultado Automático** (basado en precio actual de $2,100):
```
Nivel 1: $2,121 (+1%) → 3.0 ETH (30%)
Nivel 2: $2,142 (+2%) → 2.5 ETH (25%)
Nivel 3: $2,163 (+3%) → 2.0 ETH (20%)
Nivel 4: $2,205 (+5%) → 1.5 ETH (15%)
Nivel 5: $2,268 (+8%) → 0.7 ETH (7%)
Nivel 6: $2,373 (+13%) → 0.3 ETH (3%)
```

**Ventajas**:
- Aseguras ganancias parciales en cada nivel
- Mantienes exposición si el precio sigue subiendo
- Optimizas el punto de salida

## 🚀 Cómo Usar la Herramienta

### Paso 1: Configurar Exchange
1. Ve a la pestaña **"Credenciales"**
2. Ingresa tus API Keys de Binance o BingX
3. Asegúrate de que los permisos incluyan **Trading** (no se requiere Withdraw)

### Paso 2: Seleccionar Estrategia
1. Ve a la pestaña **"Escalonado"**
2. Selecciona **"Compra Escalonada"** o **"Venta Escalonada"**

### Paso 3: Configurar Parámetros
1. **Par de Trading**: Selecciona el activo (ej: BTC/USDT)
2. **Capital/Cantidad**: Ingresa el monto total
3. **Niveles**: Ajusta el número de niveles (slider de 2-10)
4. **Separación**: Define el % entre niveles (ej: 1.5%)
5. **Distribución**: Elige cómo distribuir el capital

### Paso 4: Calcular Niveles
1. Haz clic en **"Calcular Niveles"**
2. Revisa la vista previa en el panel derecho
3. Verifica la tabla de niveles generada

### Paso 5: Ejecutar Órdenes
Tienes dos opciones:

**Opción A - Ejecutar Todas**:
- Haz clic en **"Ejecutar Todas"**
- Todas las órdenes se colocarán automáticamente

**Opción B - Ejecutar Individual**:
- Haz clic en **"Ejecutar"** en cada nivel
- Útil si quieres colocar órdenes selectivamente

## 💡 Consejos y Mejores Prácticas

### Para Compras Escalonadas:
1. **Usa separación de 1-3%** en mercados volátiles
2. **Distribución Pirámide** si esperas caídas significativas
3. **5-7 niveles** es óptimo para la mayoría de casos
4. **Monitorea el soporte técnico** para ajustar niveles

### Para Ventas Escalonadas:
1. **Usa separación de 2-5%** para capturar resistencias
2. **Distribución Pirámide Invertida** para asegurar ganancias tempranas
3. **Calcula tu precio de entrada** para definir % de ganancia mínima
4. **Deja el último nivel más alto** para capturar posibles pumps

### Gestión de Riesgo:
- ✅ **Nunca uses todo tu capital** en una sola operación
- ✅ **Define stop loss mental** por debajo del último nivel de compra
- ✅ **Revisa las órdenes abiertas** regularmente en la pestaña "Órdenes"
- ✅ **Ajusta según volatilidad** del mercado

## 🔧 Funcionalidades Técnicas

### Cálculo Automático de Niveles de Venta
Cuando configuras una **Compra Escalonada**, el sistema automáticamente:
1. Calcula el precio promedio ponderado de compra
2. Genera niveles de venta sugeridos con ganancias progresivas (1%, 2%, 3%, 5%, 8%, 13%)
3. Distribuye la cantidad total en porciones decrecientes (30%, 25%, 20%, 15%, 7%, 3%)

### Actualización de Precios en Tiempo Real
- El precio actual se actualiza cada 10 segundos
- Los cálculos se basan en el precio de mercado actual
- Puedes refrescar manualmente con el botón de sincronización

### Integración con Exchange
- Las órdenes se ejecutan como **Limit Orders**
- Compatible con **Binance** y **BingX**
- Respeta los límites de la API del exchange
- Pausa de 500ms entre órdenes para evitar rate limits

## ⚠️ Consideraciones Importantes

### Limitaciones:
- Requiere **API Keys configuradas** con permisos de Trading
- Solo funciona con **órdenes Limit** (no Market)
- Los niveles son **estáticos** (no se ajustan automáticamente)
- Debes tener **saldo suficiente** en el exchange

### Seguridad:
- Las API Keys se almacenan **encriptadas** en Firestore
- Solo se envían al backend mediante **tokens de autenticación**
- No se requieren permisos de **Withdraw**
- Las órdenes se ejecutan en tu cuenta del exchange

## 📈 Métricas y Seguimiento

### Vista Previa:
- Visualización de distribución de capital por nivel
- Indicadores de porcentaje para cada nivel
- Resumen de capital total y número de niveles

### Tabla de Niveles:
- Precio exacto de cada orden
- Cantidad a comprar/vender
- Capital asignado (para compras)
- Porcentaje de ganancia (para ventas)
- Estado de ejecución

### Monitoreo:
- Revisa órdenes abiertas en la pestaña **"Órdenes"**
- Consulta historial en la pestaña **"Historial"**
- Actualiza balance en tiempo real

## 🎓 Estrategias Avanzadas

### Grid Trading Híbrido:
1. Configura compras escalonadas hacia abajo
2. Configura ventas escalonadas hacia arriba
3. Crea una "red" de órdenes que captura volatilidad

### Promediado Dinámico:
1. Ejecuta compras escalonadas en caídas
2. Calcula precio promedio
3. Ajusta ventas escalonadas basadas en nuevo promedio

### Toma de Ganancias Parciales:
1. Vende 50% en niveles cercanos
2. Mantén 30% para niveles medios
3. Reserva 20% para niveles altos (moonshot)

## 🆘 Solución de Problemas

### Error: "No se pudo conectar con el Exchange"
- Verifica que las API Keys estén correctamente configuradas
- Revisa que los permisos incluyan Trading
- Comprueba tu conexión a internet

### Error: "Saldo insuficiente"
- Verifica tu balance en el exchange
- Reduce el capital total o número de niveles
- Asegúrate de tener el activo correcto (USDT para compras, Asset para ventas)

### Las órdenes no se ejecutan:
- Verifica que el precio no haya cambiado drásticamente
- Revisa los límites mínimos del exchange para el par
- Comprueba que no hayas alcanzado el límite de órdenes abiertas

## 📞 Soporte

Si tienes problemas o dudas:
1. Revisa esta documentación
2. Consulta la pestaña **"Soporte"** en el panel de usuario
3. Contacta al equipo técnico con detalles específicos

---

**Última actualización**: Febrero 2026  
**Versión**: 1.0.0  
**Compatible con**: Binance, BingX
