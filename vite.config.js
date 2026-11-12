import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
    plugins: [
        react(),
    ],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './resources/js'),
        },
    },
    build: {
        chunkSizeWarningLimit: 1000,
        rollupOptions: {
            output: {
                manualChunks(id) {
                    if (id.includes('node_modules')) {
                        if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
                            return 'vendor-react';
                        }
                        if (id.includes('recharts') || id.includes('d3')) {
                            return 'vendor-charts';
                        }
                        if (id.includes('jspdf') || id.includes('html2canvas')) {
                            return 'vendor-pdf';
                        }
                        if (id.includes('lucide-react')) {
                            return 'vendor-icons';
                        }
                        if (id.includes('framer-motion')) {
                            return 'vendor-motion';
                        }
                        return 'vendor-libs';
                    }
                }
            }
        }
    },
    server: {
        proxy: {
            '/api': 'http://127.0.0.1:3001'
        }
    }
});
