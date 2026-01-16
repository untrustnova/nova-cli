import 'dotenv/config';
import config from './nova.config.js';
import { NovaKernel } from '@untrustnova/nova-framework/kernel';
import { storageModule, cacheModule, logsModule } from '@untrustnova/nova-framework/modules';

const app = new NovaKernel(config);

app.registerModule('storage', storageModule);
app.registerModule('cache', cacheModule);
app.registerModule('logs', logsModule);

app.start();
