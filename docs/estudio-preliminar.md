# Estudio preliminar

## Estructura de test y controles

El programa hace **controles**, cada **control** que no pasa genera un warning en una lista de warnings (esa es la respuesta). 

Como queremos que los tests se puedan hacer *on the fly* y evitar tener demasiados casos o directorios resolvemos:

  1. Tener pocos directorios con ejemplos correctos (que pasen todos los controles o sea sin warnings). 
  2. Para testear un control hacemos una función que diga en qué directorio se basa y cómo se construye la diferencia para obtener el caso a controlar
  3. Para no tener que generar un nuevo directorio con ese caso nuevo el programa se estructura (similar a Multilang) así:
     1. un objeto que accede a al directorio que se necesita levantar y levanta todo: 
        1. El package.json (parseado y sin parsear)
        2. La lista de archivos del directorio principal
        3. El contenido todos los *.md
        4. etc (después vemos)
     2. con esa información hay otra función que ejecuta los controles (esa función podría tener que acceder a disco lo hace a través del objeto del punto anterior)
  
