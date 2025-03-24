# Zedata Block

## Descripción
El **Zedata Block** es el bloque de metadatos de scripts para **Zedmonkey**, diseñado para ser ultra minimalista, ligero y de alto rendimiento. Basado en TOML, permite definir y configurar scripts de forma clara, sencilla y rápida. Además, Zedmonkey ofrece soporte dual, procesando tanto el formato tradicional como el Zedata Block, garantizando la compatibilidad con el ecosistema existente.

---

## Sintaxis

El Zedata Block utiliza la sintaxis de TOML y se estructura en una sección `[script]` que contiene las directivas esenciales para la configuración y ejecución del script. Se coloca al inicio del archivo del script.

**Ejemplo Básico:**

```toml
[script]
name = "Hello World Script"
namespace = "http://zedmonkey.local"
version = "1.0"
description = "Muestra una alerta de 'Hello World' al cargar la página"
author = "Tu Nombre"
match = "*://*/*"
grant = "none"
```

---

## Campos del Zedata Block

### name
**Descripción:**  
El nombre del script. Es el identificador visible en la interfaz de Zedmonkey y se utiliza para diferenciar y gestionar los scripts.

**Ejemplo:**

```toml
name = "Hello World Script"
```

---

### namespace
**Descripción:**  
Un identificador único que, combinado con el nombre, garantiza la unicidad del script. Suele ser una URL o una cadena que delimite el ámbito del autor.

**Ejemplo:**

```toml
namespace = "http://zedmonkey.local"
```

---

### version
**Descripción:**  
Indica la versión del script en semver, lo cual es esencial para gestionar actualizaciones automáticas y mantener el control de cambios.

**Ejemplo:**

```toml
version = "1.0.0"
```

---

### description
**Descripción:**  
Una breve descripción del script, explicando su funcionalidad principal. Se muestra al usuario durante la instalación y en la interfaz de gestión.

**Ejemplo:**

```toml
description = "Muestra una alerta de 'Hello World' al cargar la página"
```

---

### author
**Descripción:**  
El nombre del autor o del equipo que desarrolló el script.

**Ejemplo:**

```toml
author = "Tu Nombre"
```

---

### match
**Descripción:**  
Define las URL o patrones de URL en las cuales se ejecutará el script. Se utilizan comodines para especificar rangos de coincidencia.

**Ejemplo:**

```toml
match = "*://*/*"
```

---

### grant
**Descripción:**  
Especifica los permisos que requiere el script para su ejecución. Si no se necesitan permisos especiales, se puede establecer en `"none"`.

**Ejemplo:**

```toml
grant = "none"
```

---

## Ventajas del Zedata Block

- **Minimalismo y Claridad:**  
  La estructura basada en TOML es intuitiva y facilita la lectura y mantenimiento de los metadatos.

- **Rendimiento:**  
  La simplicidad del formato permite un procesamiento ultra rápido, en línea con la filosofía de Zedmonkey de mantener scripts ligeros y eficientes.

- **Compatibilidad Dual:**  
  Zedmonkey puede interpretar tanto el formato tradicional de metadatos como el Zedata Block, asegurando interoperabilidad con scripts existentes.

- **Extensibilidad:**  
  Aunque el formato es minimalista, se puede ampliar en el futuro para incluir nuevos campos o funcionalidades, manteniendo siempre la coherencia y simplicidad.

---

## Ejemplo Completo

**Archivo de Script con Zedata Block:**

```toml
[script]
name = "Hello World Script"
namespace = "http://zedmonkey.local"
version = "1.0"
description = "Muestra una alerta de 'Hello World' al cargar la página"
author = "Tu Nombre"
match = "*://*/*"
grant = "none"
```

**Código JavaScript Asociado:**

```javascript
(function() {
    'use strict';
    alert('Hello World desde Zedmonkey!');
})();
```

---

## Consideraciones Finales

- **Validación:**  
  Se recomienda implementar funciones de validación para asegurar que todos los campos requeridos estén presentes y que los valores sean correctos.

- **Compatibilidad:**  
  Al ofrecer soporte dual, Zedmonkey procesa tanto el bloque tradicional como el Zedata Block, facilitando la transición y adopción por parte de la comunidad.

- **Documentación y Soporte:**  
  Mantener una documentación actualizada y ejemplos claros ayudará a los desarrolladores a familiarizarse rápidamente con el Zedata Block y aprovechar al máximo sus ventajas.
