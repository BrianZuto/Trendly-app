import { Navigate, Route, Routes } from 'react-router-dom'
import MainLayout from '@core/layout/MainLayout'
import PublicLayout from '@core/layout/PublicLayout'
import RutaProtegida from '@core/guards/RutaProtegida'
import RutaPublica from '@core/guards/RutaPublica'
import Dashboard from '@features/dashboard/Dashboard'
import Login from '@features/login/Login'
import PoliticaDatos from '@features/politica-datos/PoliticaDatos'
import Productos from '@features/productos/Productos'
import Registro from '@features/registro/Registro'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      {/* Solo sin sesión: con sesión abierta llevan al dashboard */}
      <Route element={<RutaPublica />}>
        <Route element={<PublicLayout />}>
          <Route path="/login" element={<Login />} />
          <Route path="/registro" element={<Registro />} />
        </Route>
      </Route>

      {/* Pública para todos */}
      <Route path="/politica-datos" element={<PoliticaDatos />} />

      {/* Solo con sesión: sin ella redirigen a /login */}
      <Route element={<RutaProtegida />}>
        <Route element={<MainLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/productos" element={<Productos />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}