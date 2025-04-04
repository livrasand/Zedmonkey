# Documentación Zedata Block

## 1. Introducción
Zedata Block es un formato innovador para describir usuarioscripts, diseñado para reemplazar el Metadata Block tradicional. Zedata permite definir la configuración del script de forma clara en un editor, para luego compilarse en una cadena ultra-compacta que optimiza el tiempo de análisis (parsing) y reduce el consumo de memoria.

### Ventajas principales
- **Reducción de tamaño**: Elimina la redundancia de la sintaxis tradicional y utiliza un formato posicional.
- **Velocidad de parsing**: La estructura delimitada y sin etiquetas superfluas permite un análisis mucho más rápido.
- **Compatibilidad**: Se mantiene la capacidad de trabajar con scripts existentes, permitiendo una migración progresiva.
- **Extensibilidad**: La estructura se puede ampliar en el futuro sin perder la simplicidad básica.

## 2. Sintaxis de Zedata
Zedata se compone de dos etapas principales: la definición en el editor y la compilación al formato final.

### 2.1. Definición en el Editor
En el editor, los desarrolladores escriben el bloque de configuración en un estilo similar a TOML. Cada línea define un atributo del script mediante una clave y un valor separados por dos puntos y finalizados con una coma. Además, se delimita el bloque con una etiqueta de encabezado.

**Ejemplo:**
```javascript
// [script]
// name:Hello World Script,
// namespace:zedmonkey,
// version:1.0.0,
// description:Hello World!,
// match:*://*/*,
// grant:,
```

**Puntos a destacar:**
- **Encabezado**: La línea `// [script]` identifica el inicio del bloque.
- **Separación clave-valor**: Se utiliza el carácter `:` para separar cada clave de su valor.
- **Delimitación**: La coma final en cada línea indica el término del valor.
- **Formato de comentarios**: Se usan comentarios de línea (`//`) para mantener la compatibilidad visual y evitar conflictos con el código.

### 2.2. Compilación al Formato Final
El compilador integrado de Zedmonkey transforma el bloque Zedata en una cadena compacta que incluye la metadata y el código del script en una sola línea. Este formato final se utiliza para cargar el script de forma ultra-rápida.

**Ejemplo de salida:**
```
script,HelloWorldScript,zedmonkey,1.0.0,HelloWorld,ZedmonkeyUser,*,none((function(){"use strict";window.alert("Hello World!")}))();
```

**Explicación de la estructura resultante (orden posicional):**
1. **Tipo de bloque**: Siempre es `script` para identificar que se trata de la metadata de un script.
2. **Nombre del script**: Versión compacta del valor name (ej. HelloWorldScript sin espacios).
3. **Namespace**: Valor tomado del campo namespace.
4. **Versión**: Valor del campo version.
5. **Descripción**: Valor resumido del campo description (se recomienda un resumen breve).
6. **Autor**: Se asigna un valor por defecto (ej. ZedmonkeyUser) si no se especifica.
7. **Patrón de URL**: Valor de match o include, normalizado (por ejemplo, se puede simplificar *://*/* a *).
8. **Permisos (@grant)**: Si no se especifica, se asigna none.
9. **Código compilado**: Función autoejecutable (IIFE) que contiene el código JavaScript del script.

## 3. Esquema de Campos y Claves
A continuación se detalla la definición de cada campo, sus posibles valores y consideraciones:

### 3.1. Campos obligatorios
**name:**
- Descripción: Nombre completo del script, usado para identificarlo en el menú y la base de datos.
- Ejemplo: `Hello World Script`
- Consideración: Durante la compilación, se elimina espacios y caracteres especiales para formar el identificador (ej. HelloWorldScript).

**namespace:**
- Descripción: Identificador único que, en conjunto con el nombre, distingue el script. Suele ser una URL o cadena única.
- Ejemplo: `zedmonkey`

**version:**
- Descripción: Versión del script, utilizada en actualizaciones automáticas.
- Ejemplo: `1.0.0`
- Formato: Se recomienda usar notación semántica (semver).

**description:**
- Descripción: Breve resumen de la funcionalidad del script.
- Ejemplo: `Hello World!`
- Consideración: Debe ser concisa y clara.

**match / include:**
- Descripción: Especifica las URL o patrones donde el script se ejecuta.
- Ejemplo: `*://*/*`
- Formato: Se pueden admitir múltiples valores usando delimitadores secundarios (por ejemplo, separarlos con punto y coma).

### 3.2. Campos opcionales y extendibles
**grant:**
- Descripción: Permisos o funciones especiales requeridas (como acceso a GM_*).
- Ejemplo: Si no se especifica, se asume `none`.

**author:**
- Descripción: Nombre del autor del script.
- Ejemplo: `Zedmonkey User`
- Valor por defecto: Si no se define, se usa un valor preestablecido.

**icon:**
- Descripción: URL del icono del script.
- Ejemplo: `http://www.example.com/icon.png`

**exclude:**
- Descripción: URLs o patrones donde el script no debe ejecutarse.
- Formato: Se pueden listar múltiples entradas.

**require / resource:**
- Descripción: URL de scripts o recursos adicionales que se deben cargar previamente.
- Formato: Se admite múltiples entradas.

**run-at:**
- Descripción: Momento en el que el script se inyecta en la página (por ejemplo, document-start, document-end).
- Ejemplo: `document-end`

**noframes:**
- Descripción: Indicador para que el script se ejecute sólo en el documento principal y no en iframes.
- Ejemplo: Se define sin valor.

Otros campos adicionales pueden ser integrados en futuras versiones, siempre respetando la posición o utilizando sub-delimitadores para campos con múltiples valores.

## 4. Ejemplos de Uso
### 4.1. Ejemplo básico en el editor (Zedata)
```javascript
// [script]
// name:Hello World Script,
// namespace:zedmonkey,
// version:1.0.0,
// description:Hello World!,
// match:*://*/*,
// grant:,
```

### 4.2. Ejemplo compilado final
```
script,HelloWorldScript,zedmonkey,1.0.0,HelloWorld,ZedmonkeyUser,*,none((function(){"use strict";window.alert("Hello World!")}))();
```

### 4.3. Ejemplo con múltiples valores
Para campos que admiten múltiples valores, se pueden utilizar delimitadores secundarios como punto y coma.
```javascript
// [script]
// name:Multi-Site Script,
// namespace:zedmonkey,
// version:1.0.0,
// description:Works on multiple sites,
// match:*://example.com/*;*://demo.com/*,
// grant:GM_setValue;GM_getValue,
```

```
script,MultiSiteScript,zedmonkey,1.0.0,WorksOnMultipleSites,ZedmonkeyUser,*://example.com/*;*://demo.com/*,GM_setValue;GM_getValue((function(){"use strict";/* código del script */}))();
```