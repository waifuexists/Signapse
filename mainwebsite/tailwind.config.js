/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: '#0066FF',
        secondary: '#111827',
        accent: '#10B981',
        'primary-dark': '#0047B3',
        'gray-light': '#F3F4F6',
        'gray-medium': '#9CA3AF',
        'gray-dark': '#4B5563',
        'surface': '#FFFFFF',
        'surface-dark': '#1F2937',
        'error': '#EF4444',
        'warning': '#F59E0B',
        'success': '#10B981',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-primary': 'linear-gradient(135deg, #0066FF 0%, #0047B3 100%)',
      },
    },
  },
  plugins: [],
} 