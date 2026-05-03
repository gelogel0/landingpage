/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        geist: ['Geist', 'Inter', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        fadeSlideIn: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInBlur: {
          '0%': { opacity: '0', filter: 'blur(8px)', transform: 'translateY(10px)' },
          '100%': { opacity: '1', filter: 'blur(0)', transform: 'translateY(0)' },
        },
      },
      animation: {
        fadeSlideIn: 'fadeSlideIn 1s ease-out forwards',
      },
    },
  },
  plugins: [],
}
