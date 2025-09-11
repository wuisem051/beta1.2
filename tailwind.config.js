/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html",
  ],
  darkMode: 'class', // Habilitar modo oscuro basado en la clase 'dark'
  theme: {
    extend: {
      colors: {
        light_bg: '#F9FAFB', // Fondo muy claro
        light_card: '#FFFFFF', // Fondo de tarjeta claro
        dark_text: '#1F2937', // Texto oscuro
        light_text: '#F9FAFB', // Texto claro para modo oscuro
        dark_bg: '#121212', // Fondo oscuro
        dark_card: '#1F2937', // Fondo de tarjeta oscuro
        accent: '#F59E0B',    // Un color de acento, como amarillo/naranja
        green_check: '#10B981', // Un verde para elementos de éxito
        gray_border: '#E5E7EB', // Borde gris claro
        dark_border: '#374151', // Borde oscuro
        gray_text: '#6B7280', // Texto gris
        blue_link: '#3B82F6', // Azul para enlaces/botones
        red_error: '#EF4444', // Rojo para errores
      }
    },
  },
  plugins: [],
}
