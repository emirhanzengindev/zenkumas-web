// Zen Kumaş - Tailwind CDN configuration (must be loaded right after tailwindcss script)
tailwind.config = {
    theme: {
        extend: {
            colors: {
                cream: {
                    DEFAULT: '#FAF7F1',
                    dark: '#F1EAE0'
                },
                ink: {
                    DEFAULT: '#221E19',
                    soft: '#5B534A',
                    muted: '#8D857B'
                },
                bronze: {
                    DEFAULT: '#B08968',
                    dark: '#8C6B4F',
                    light: '#D2B48C'
                }
            },
            fontFamily: {
                display: ['"Playfair Display"', 'Georgia', 'serif'],
                sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif']
            },
            boxShadow: {
                soft: '0 12px 40px -16px rgba(34, 30, 25, 0.18)',
                lifted: '0 20px 50px -20px rgba(34, 30, 25, 0.3)'
            }
        }
    }
};
