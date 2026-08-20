import { Routes, Route } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { Insumos } from './pages/Insumos';
import { ActualizacionRapida } from './pages/ActualizacionRapida';
import { Preparaciones } from './pages/Preparaciones';
import { PreparacionDetalle } from './pages/PreparacionDetalle';
import { Recetas } from './pages/Recetas';
import { RecetaDetalle } from './pages/RecetaDetalle';
import { Productos } from './pages/Productos';
import { ProductoDetalle } from './pages/ProductoDetalle';
import { ListaPrecios } from './pages/ListaPrecios';

export default function App() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-8 max-w-[1400px]">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/insumos" element={<Insumos />} />
          <Route path="/insumos/actualizacion-rapida" element={<ActualizacionRapida />} />
          <Route path="/preparaciones" element={<Preparaciones />} />
          <Route path="/preparaciones/:id" element={<PreparacionDetalle />} />
          <Route path="/recetas" element={<Recetas />} />
          <Route path="/recetas/:id" element={<RecetaDetalle />} />
          <Route path="/productos" element={<Productos />} />
          <Route path="/productos/:id" element={<ProductoDetalle />} />
          <Route path="/lista-precios" element={<ListaPrecios />} />
        </Routes>
      </main>
    </div>
  );
}
