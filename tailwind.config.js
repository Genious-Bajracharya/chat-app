/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        sidebar: {
          DEFAULT: '#1e2330',
          hover: '#252d3d',
          active: '#2d3748'
        }
      }
    }
  },
  plugins: []
};
