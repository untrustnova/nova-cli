import { defineConfig } from 'vite';
import novaConfig from './nova.config.js';
import { resolveViteConfig } from '@untrustnova/nova-framework/config/resolveVite';

export default defineConfig(async () => resolveViteConfig(novaConfig));
