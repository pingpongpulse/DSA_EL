module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'editor-bg': '#F7F8FC',
        'card-bg': '#FFFFFF',
        'primary-accent': '#B8C0FF',
        'secondary-accent': '#FFD6E8',
        'suggestion-bg': '#E8FFF5',
        'primary-text': '#3A3A3A',
        'secondary-text': '#6B6B6B',
        'border-color': '#E0E0E0',
      },
      fontFamily: {
        'candy': ['"Comic Neue"', '"Baloo 2"', 'cursive'],
        'mono': ['monospace', 'Courier New', 'Times New Roman'],
      }
    },
  },
  plugins: [],
}