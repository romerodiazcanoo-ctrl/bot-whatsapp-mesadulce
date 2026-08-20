import express from 'express';
import { insumosRouter } from './routes/insumos.js';
import { preparacionesRouter } from './routes/preparaciones.js';
import { recetasRouter } from './routes/recetas.js';
import { packagingRouter } from './routes/packaging.js';
import { productosRouter } from './routes/productos.js';
import { configRouter } from './routes/config.js';
import { dashboardRouter } from './routes/dashboard.js';
import './db.js';

const app = express();
app.use(express.json());

app.use('/api/insumos', insumosRouter);
app.use('/api/preparaciones', preparacionesRouter);
app.use('/api/recetas', recetasRouter);
app.use('/api/packaging', packagingRouter);
app.use('/api/productos', productosRouter);
app.use('/api/config', configRouter);
app.use('/api/dashboard', dashboardRouter);

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: err.message });
});

const PORT = process.env.PORT ?? 3001;
app.listen(PORT, () => {
  console.log(`Mesa Dulce API escuchando en http://localhost:${PORT}`);
});
