import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [
        laravel({
            // Update the input path to your main React entry file
            input: ['resources/js/index.css', 'resources/js/main.jsx'], // Assuming your entry file is main.jsx
            refresh: true,
        }),
        react(),
    ],
});
