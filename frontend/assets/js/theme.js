// Tailwind theme: warm stone neutrals + one muted sage accent.
tailwind.config = {
  theme: {
    extend: {
      colors: {
        sage: {
          50: '#F3F6F4', 100: '#E3EBE6', 200: '#C7D7CD', 300: '#A0BAAA',
          400: '#769B84', 500: '#567F66', 600: '#436652', 700: '#365243',
          800: '#2C4136', 900: '#243429',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'Inter', 'sans-serif'],
      },
    },
  },
};