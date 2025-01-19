import baseConfig from '@extension/tailwindcss-config';
import { withUI } from '@extension/ui';

export default withUI({
  ...baseConfig,
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    container: {
      padding: {
        DEFAULT: '1rem',
        sm: '2rem',
        lg: '8rem',
        xl: '10rem',
        '2xl': '20rem',
      },
    },
  },
});
