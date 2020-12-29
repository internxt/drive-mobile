# Cómo contribuir al desarrollo del proyecto

* Asegúrate de tener la última versión del proyecto, y que te encuentras en la rama master.

  `git checkout master`

  `git fetch`

  `git pull`

* Abre una nueva rama desde **master**, ponle el nombre de la tarea. Los nombres de las ramas se escriben en inglés, deben describir la tarea y se debe usar la convención *kebap-case*.

* Desarrolla tu tarea en esta rama.

* Si tu tarea requiere nuevas dependencias, instálalas con `expo install`. Si tienes que quitar una dependencia, bien porque no te ha servido o porque ya existía y hay que reemplazarla o eliminarla, utiliza `yarn remove`. Si modificas dependencias, debes incluir en el commit el package.json y el yarn.lock que se ha generado.

* Este proyecto no utiliza npm, usa **expo** y **yarn**. Por tanto, si aparece en el proyecto el fichero *package-lock.json*, algo has hecho mal. Tendrás que corregirlo, los errores personales que cometas no deben aparecer en el repositorio de git.

* Asegúrate de que al finalizar tu tarea, `yarn run lint` no dé errores. Si da errores, corrígelos y haz un commit resolviendo esos problemas. Si el linter solo arroja warnings, es recomendable solucionarlos, en el futuro serán errores.

* Testea tu tarea, asegúrate de que nada de lo que has hecho rompe el funcionamiento de lo que ya había.

* Cuando termines la tarea, haz un **merge de master hacia tu rama** (no de tu rama hacia master). Resuelve los conflictos que puedan aparecer en tu propia rama. Esto dejará tu tarea preparada para ser mergeada a master.

* Si por alguna razón debes cambiar a otra tarea y debes pausar la actual, sube todos los cambios que tengas pendientes a la rama, vuelve a master, y comienza estos pasos desde cero. No abras una nueva rama desde tu propia rama. No mezcles tareas entre ramas.
