/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bordo: {
          DEFAULT: '#54110e',
          50: '#fbecec',
          100: '#f3d0cf',
          400: '#8a2b26',
          600: '#6b1a15',
          700: '#54110e',
          800: '#3c0b09',
        },
        celeste: {
          DEFAULT: '#a4c8d2',
          100: '#eef5f7',
          300: '#c7dfe5',
          500: '#a4c8d2',
        },
        manteca: {
          DEFAULT: '#f7e594',
          100: '#fdf8e3',
          300: '#f9edb6',
          500: '#f7e594',
        },
      },
      fontFamily: {
        display: ['Fredoka', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
