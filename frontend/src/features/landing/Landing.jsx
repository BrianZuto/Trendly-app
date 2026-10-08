import { Link } from 'react-router-dom';
import './Landing.css';

/* ─── Íconos SVG ─── */
const IconoCheck = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
const IconoFlecha = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
  </svg>
);
const IconoEscudo = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

/* ─── Dato de métrica en el panel ─── */
function MetricaItem({ label, value, delta, positivo }) {
  return (
    <div className="metrica-item">
      <span className="metrica-label">{label}</span>
      <div className="metrica-valores">
        <span className="metrica-value">{value}</span>
        <span className={`metrica-delta ${positivo ? 'positivo' : 'negativo'}`}>{delta}</span>
      </div>
    </div>
  );
}

/* ─── Ítem de plan ─── */
function PlanItem({ texto }) {
  return (
    <li className="plan-item">
      <span className="plan-check"><IconoCheck /></span>
      {texto}
    </li>
  );
}

export default function Landing() {
  return (
    <div className="landing-root">
      {/* ── Fondo ── */}
      <div className="landing-bg" aria-hidden="true">
        <div className="bg-grid"></div>
        <div className="bg-orb orb-1"></div>
        <div className="bg-orb orb-2"></div>
      </div>

      {/* ── Navegación ── */}
      <header className="landing-header">
        <nav className="landing-nav" role="navigation" aria-label="Navegación principal">
          <div className="landing-logo" aria-label="Trendly">
            <span className="logo-icon" aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
            </span>
            Trendly
          </div>
          <ul className="nav-links" role="list">
            <li><a href="#planes" className="nav-link">Planes</a></li>
            <li><Link to="/politica-datos" className="nav-link">Política de datos</Link></li>
          </ul>
          <div className="nav-ctas">
            <Link to="/login" className="btn btn-ghost">Iniciar sesión</Link>
            <Link to="/registro" className="btn btn-primary">Empezar gratis</Link>
          </div>
        </nav>
      </header>

      {/* ── Hero ── */}
      <section className="landing-hero" aria-labelledby="hero-heading">
        <div className="hero-copy">
          <h1 id="hero-heading" className="hero-title">
            Domina el mercado,<br />Protege tu margen
          </h1>
          <p className="hero-subtitle">
            Trendly monitorea a tus competidores en MercadoLibre y AliExpress, analiza tendencias y te sugiere el precio óptimo antes de que pierdas una venta
          </p>
          <div className="hero-actions">
            <Link to="/registro" className="btn btn-primary btn-lg">
              Crear mi cuenta
              <IconoFlecha />
            </Link>
            <a href="#planes" className="btn btn-outline btn-lg">Ver planes</a>
          </div>
        </div>

        {/* Panel glassmorphism */}
        <div className="hero-panel" aria-hidden="true">
          <div className="panel-glass">
            <div className="panel-topbar">
              <div className="panel-dots">
                <span className="pdot"></span><span className="pdot"></span><span className="pdot"></span>
              </div>
              <span className="panel-title-bar">Panel de precios — Hoy</span>
            </div>
            <div className="panel-body">
              <div className="panel-chart-wrap">
                <span className="chart-label">Historial 30 días</span>
                <svg className="mini-chart" viewBox="0 0 260 80" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="grad-indigo" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#4f46e5" stopOpacity="0" />
                    </linearGradient>
                    <linearGradient id="grad-cyan" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0891b2" stopOpacity="0.15" />
                      <stop offset="100%" stopColor="#0891b2" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path d="M0,55 C20,50 40,45 65,40 C90,35 110,30 130,28 C150,26 175,30 200,25 C220,21 240,18 260,15 L260,80 L0,80 Z" fill="url(#grad-indigo)" />
                  <polyline fill="none" stroke="#4f46e5" strokeWidth="2.5" points="0,55 65,40 130,28 200,25 260,15" />
                  <path d="M0,62 C20,60 40,58 65,55 C90,52 110,50 130,48 C150,46 175,50 200,45 C220,42 240,40 260,38 L260,80 L0,80 Z" fill="url(#grad-cyan)" />
                  <polyline fill="none" stroke="#0891b2" strokeWidth="1.5" strokeDasharray="4 3" points="0,62 65,55 130,48 200,45 260,38" />
                  <circle cx="260" cy="15" r="4" fill="#4f46e5" stroke="white" strokeWidth="2" />
                </svg>
              </div>
              <div className="panel-metricas">
                <MetricaItem label="Mi precio" value="$189.900" delta="+2,3%" positivo={true} />
                <MetricaItem label="Competidor 1" value="$195.000" delta="-1,1%" positivo={false} />
                <MetricaItem label="Margen actual" value="38,4%" delta="En objetivo" positivo={true} />
              </div>
              <div className="panel-alerta">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
                Oportunidad — Competidor subió su precio
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Planes y precios ── */}
      <section id="planes" className="landing-planes" aria-labelledby="planes-heading">
        <div className="section-container">
          <p className="section-eyebrow">Planes y precios</p>
          <h2 id="planes-heading" className="section-title">Elige el plan que se adapta a tu negocio</h2>
          <div className="planes-grid">
            {/* Plan Gratuito (Estilo Azul) */}
            <article className="plan-card plan-dark">
              <div className="plan-header">
                <h3 className="plan-nombre">Paquete Básico</h3>
                <div className="plan-precio">
                  <span className="plan-monto">$0</span>
                  <span className="plan-periodo">/ Pago Único</span>
                </div>
                <p className="plan-descripcion">Para emprendedores que quieren explorar la inteligencia de precios.</p>
              </div>
              <ul className="plan-features" role="list">
                <PlanItem texto="Hasta 10 productos registrados" />
                <PlanItem texto="Monitoreo cada 12 horas" />
                <PlanItem texto="Historial de 15 días" />
                <PlanItem texto="Soporte por correo" />
              </ul>
              <Link to="/registro" className="plan-cta btn btn-outline-light">Comprar Ahora</Link>
            </article>

            {/* Plan Pro (Estilo Blanco) */}
            <article className="plan-card plan-destacado">
              <div className="plan-badge-top">Más popular</div>
              <div className="plan-header">
                <h3 className="plan-nombre">Paquete Premium</h3>
                <div className="plan-precio">
                  <span className="plan-monto">$49.900 COP</span>
                  <span className="plan-periodo">/ Pago Único</span>
                </div>
                <p className="plan-descripcion">Para vendedores profesionales que necesitan escalar su operación.</p>
              </div>
              <ul className="plan-features" role="list">
                <PlanItem texto="Hasta 100 productos registrados" />
                <PlanItem texto="Monitoreo configurable (mín. 1 hora)" />
                <PlanItem texto="Historial de 6 meses" />
                <PlanItem texto="Sugerencias de precio con IA" />
                <PlanItem texto="Soporte prioritario" />
              </ul>
              <Link to="/registro" className="plan-cta btn btn-primary">
                Comprar Ahora
              </Link>
            </article>
          </div>
          <p className="planes-legal">
            Facturación mensual, puedes cancelar en cualquier momento
          </p>
        </div>
      </section>

      {/* ── Footer estilo HubSpot (Oscuro, múltiples columnas) ── */}
      <footer className="landing-footer-dark" role="contentinfo">
        <div className="footer-dark-inner">
          <nav className="footer-dark-nav" aria-label="Navegación del pie de página">
            <div className="footer-dark-col">
              <strong>Funciones populares</strong>
              <a href="#" className="footer-link">Monitoreo de precios MercadoLibre</a>
              <a href="#" className="footer-link">Sugerencias de IA</a>
              <a href="#" className="footer-link">Alertas en tiempo real</a>
              <a href="#" className="footer-link">Historial de competidores</a>
              <a href="#" className="footer-link">Análisis de margen</a>
              <a href="#" className="footer-link">Gestión de catálogos</a>
              <a href="#" className="footer-link">Reportes exportables</a>
            </div>

            <div className="footer-dark-col">
              <strong>Herramientas gratuitas</strong>
              <a href="#" className="footer-link">Calculadora de margen</a>
              <a href="#" className="footer-link">Analizador de competidores</a>
              <a href="#" className="footer-link">Plantillas de precios</a>
              <a href="#" className="footer-link">Generador de descripciones</a>
              <a href="#" className="footer-link">Datos de la industria</a>
            </div>

            <div className="footer-dark-col">
              <strong>Empresa</strong>
              <a href="#" className="footer-link">Sobre nosotros</a>
              <a href="#" className="footer-link">Trabaja con nosotros <span className="footer-badge">CO</span></a>
              <a href="#" className="footer-link">Contacto</a>
              <a href="#" className="footer-link">Inversores <span className="footer-badge">EN</span></a>
              <a href="#" className="footer-link">Blog</a>
              <Link to="/politica-datos" className="footer-link">Política de privacidad</Link>
            </div>

            <div className="footer-dark-col">
              <strong>Clientes y Partners</strong>
              <a href="#" className="footer-link">Atención al cliente</a>
              <a href="#" className="footer-link">Comunidad de vendedores</a>
              <a href="#" className="footer-link" style={{ marginTop: '1.5rem' }}>Programa de afiliados</a>
              <a href="#" className="footer-link">Agencias y consultores</a>
              <a href="#" className="footer-link">API para desarrolladores</a>
            </div>
          </nav>

          <div className="footer-dark-bottom">
            <div className="footer-logo-row">
              <div className="footer-brand">Trendly</div>
              <p className="footer-tagline">Inteligencia de precios para dominar el mercado</p>
            </div>
            <div className="footer-legal-links">
              <a href="#">Términos legales</a>
              <Link to="/politica-datos">Política de privacidad</Link>
              <a href="#">Seguridad</a>
            </div>
            <p className="footer-copy">© 2026 Trendly</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
