/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: { ink: '#1c2530' },
      fontFamily: { sans: ['var(--font-figtree)', 'system-ui', 'sans-serif'] },
    },
  },
  plugins: [],
};
