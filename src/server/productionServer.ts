import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createApiApp } from './apiApp';

dotenv.config();

// Compatibilidad cruzada CJS / ESM para calcular el directorio base de dist
const rootDir = process.cwd();
const distPath = path.resolve(rootDir, 'dist');

const app = express();
const port = process.env.PORT || 3000;
const host = process.env.HOST || '0.0.0.0';

// Montar la API REST en /api
const apiApp = createApiApp();
app.use(apiApp);

// Servir estáticos generados por Vite (SPA React)
app.use(express.static(distPath));

// Redirección SPA hacia index.html para rutas frontend
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(distPath, 'index.html'));
});

// Inicio del servidor HTTP
if (process.env.IISNODE_VERSION) {
  // Cuando corre bajo IIS con iisnode, el puerto lo asigna IIS a través de Named Pipe en process.env.PORT
  app.listen(process.env.PORT, () => {
    console.log(`[IISNODE] Servidor de producción ejecutándose en Named Pipe: ${process.env.PORT}`);
  });
} else if (process.env.NODE_ENV !== 'test') {
  app.listen(Number(port), host, () => {
    console.log(`Servidor de producción ejecutándose en http://${host}:${port}`);
  });
}

export default app;
