export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        meiko: {
          50: '#edf7ff',
          100: '#d9efff',
          200: '#bce0ff',
          300: '#82c6ff',
          400: '#41a6ff',
          500: '#1f87ff',
          600: '#005A9C',
          700: '#0b3f69',
          800: '#102f4a',
          900: '#112538'
        }
      },
      boxShadow: {
        soft: '0 10px 30px rgba(0, 90, 156, 0.08)'
      }
    }
  },
  plugins: []
};
