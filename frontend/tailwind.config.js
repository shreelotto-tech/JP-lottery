/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'lottery-dark': '#0B0F19',
        'lottery-card': '#1C2438',
        'lottery-purple': '#A020F0',
        'lottery-bright': '#FF007F',
        'lottery-cyan': '#00F0FF',
        'lottery-green': '#00FF66',
        'lottery-yellow': '#FFD700',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-vibrant': 'linear-gradient(to right, #A020F0, #FF007F)',
      }
    },
  },
  plugins: [],
}
