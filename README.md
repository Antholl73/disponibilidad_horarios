# 🗓️ Disponibilidad de Horarios (Coordinador Grupal)

Aplicación web moderna y ligera para coordinar horarios y encontrar la disponibilidad común de un grupo de personas (similar a When2meet / LettuceMeet).

## 🚀 Características
- **Creación de eventos y salas compartidas:** define nombre, fechas o días de la semana y rangos de horario.
- **Enlace compartible único:** comparte la URL con los integrantes del grupo sin requerir registros obligatorios.
- **Grilla horaria interactiva individual:** marca tus horas libres fácilmente mediante arrastre (*drag-and-drop*).
- **Mapa de calor grupal (Heatmap):** visualiza al instante los mejores momentos para reunirse con un degradado dinámico de color.
- **Diferenciación de disponibilidad:** identifica claramente si están libres 5 de 5, 4 de 5 o menos, con tooltip detallado que muestra nombres disponibles y ausentes.

## 🛠️ Tecnologías
- **Frontend & Backend:** [Next.js](https://nextjs.org/) (App Router, React 19, TypeScript).
- **Estilos:** [Tailwind CSS v4](https://tailwindcss.com/) + [Lucide React](https://lucide.dev/).
- **Base de Datos:** SQLite nativo integrado (`node:sqlite`) de alto rendimiento sin dependencias externas pesadas.

## 💻 Instalación y Ejecución

```bash
# 1. Instalar dependencias
npm install

# 2. Iniciar servidor de desarrollo
npm run dev

# 3. Compilar para producción
npm run build
npm run start
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.
