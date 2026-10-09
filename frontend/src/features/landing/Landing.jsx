import { Link } from 'react-router-dom';
import PublicNavbar from '@core/layout/PublicNavbar'
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
const DATOS_DEMO = {
  nombre: 'Audífonos Bluetooth',
  sku: 'DEMO-001',
  costo: 85000,
  precioVenta: 119900,
  margenObjetivo: 30,
  competidor: 139900,
};

const formatoCOP = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

function ComparacionPrecios() {
  const precioSugerido = Math.round(DATOS_DEMO.costo / (1 - DATOS_DEMO.margenObjetivo / 100));
  const margenActual = ((DATOS_DEMO.precioVenta - DATOS_DEMO.costo) / DATOS_DEMO.precioVenta) * 100;
  const diferenciaCompetidor = DATOS_DEMO.competidor - DATOS_DEMO.precioVenta;
  const porcentajeMenor = (diferenciaCompetidor / DATOS_DEMO.competidor) * 100;
  const barras = [
    { nombre: 'Tu precio', detalle: 'venta', valor: DATOS_DEMO.precioVenta, clase: 'propio' },
    { nombre: 'Competidor', detalle: 'MercadoLibre', valor: DATOS_DEMO.competidor, clase: 'mercado' },
    { nombre: 'Costo', detalle: 'AliExpress', valor: DATOS_DEMO.costo, clase: 'costo' },
  ];
  const maximo = Math.max(...barras.map(({ valor }) => valor));

  return (
    <div className="hero-panel">
      <article className="panel-glass price-preview" aria-label="Vista de ejemplo de comparación de precios">
        <header className="preview-header">
        </header>

        <div className="preview-product">
          <div className="preview-product-art">
            <img
              src="https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=720&q=85"
              alt="Audífonos de diadema sobre fondo claro"
              fetchPriority="high"
            />
          </div>
          <div className="preview-product-info">
            <h3>{DATOS_DEMO.nombre}</h3>
            <span className="preview-sku">SKU {DATOS_DEMO.sku}</span>
            <span className="preview-product-market">MercadoLibre <span aria-hidden="true">·</span> AliExpress</span>
          </div>
        </div>

        <div className="preview-comparison">
          <div className="preview-section-heading">
            <div>
              <h4>Precios de referencia</h4>
            </div>
            <span className="preview-capture">COP</span>
          </div>

          <div className="price-bars">
            {barras.map(({ nombre, detalle, valor, clase }, index) => (
              <div className="price-bar-row" key={nombre} style={{ '--bar-delay': `${index * 140}ms` }}>
                <div className="price-bar-heading">
                  <span className="price-bar-name">
                    <span className={`price-bar-dot ${clase}`} />
                    <span>{nombre}</span>
                    <small>{detalle}</small>
                  </span>
                  <strong>{formatoCOP.format(valor)}</strong>
                </div>
                <div
                  className="price-bar-track"
                  role="meter"
                  aria-label={`${nombre}: ${formatoCOP.format(valor)}`}
                  aria-valuemin="0"
                  aria-valuemax={maximo}
                  aria-valuenow={valor}
                >
                  <span className={`price-bar-fill ${clase}`} style={{ '--bar-size': `${(valor / maximo) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="preview-result">
          <div className="preview-position">
            <span>
              <strong>{formatoCOP.format(diferenciaCompetidor)} menos</strong>
              {' '}
              <small>que el precio observado en MercadoLibre</small>
            </span>
            <span className="position-percent">{porcentajeMenor.toFixed(1)}%</span>
          </div>
          <div className="preview-suggestion">
            <span className="suggestion-copy">
              <span>PRECIO SUGERIDO <span aria-hidden="true">·</span> MARGEN OBJETIVO {DATOS_DEMO.margenObjetivo}%</span>
              <strong>{formatoCOP.format(precioSugerido)}</strong>
              <small>Margen actual: {margenActual.toFixed(1)}%</small>
            </span>
            <span className="suggestion-delta">
              <span>Para alcanzar tu objetivo</span>
              <strong>+{formatoCOP.format(precioSugerido - DATOS_DEMO.precioVenta)}</strong>
            </span>
          </div>
        </div>

      </article>
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

      <PublicNavbar />

      {/* ── Hero ── */}
      <section className="landing-hero" aria-labelledby="hero-heading">
        <div className="hero-copy">
          <h1 id="hero-heading" className="hero-title">
            Domina el mercado y protege tu margen
          </h1>
          <p className="hero-subtitle">
            Trendly monitorea precios y disponibilidad en MercadoLibre y AliExpress, y sugiere un precio y margen a partir del costo y el margen objetivo de tu producto.
          </p>
          <div className="hero-actions">
            <Link to="/registro" className="btn btn-primary btn-lg">
              Crear mi cuenta
              <IconoFlecha />
            </Link>
            <a href="#planes" className="btn btn-outline btn-lg">Ver planes</a>
          </div>
        </div>

        <ComparacionPrecios />
      </section>

      {/* ── Cómo funciona ── */}
      <section className="landing-steps" aria-labelledby="steps-heading">
        <div className="section-container steps-container">
          <p className="section-eyebrow">Cómo funciona</p>
          <h2 id="steps-heading" className="section-title">De tus productos a decisiones de precio</h2>
          <ol className="steps-list">
            <li className="step-card">
              <span className="step-number">1</span>
              <div>
                <h3>Registra tu producto</h3>
                <p>Agrega su costo, precio de venta y margen objetivo</p>
              </div>
            </li>
            <li className="step-card">
              <span className="step-number">2</span>
              <div>
                <h3>Monitoreamos el mercado</h3>
                <p>La recolección programada consulta competidores cada 6 horas</p>
              </div>
            </li>
            <li className="step-card">
              <span className="step-number">3</span>
              <div>
                <h3>Revisa sugerencias y alertas</h3>
                <p>Consulta el precio y margen sugeridos, y las alertas generadas tras cada recolección</p>
              </div>
            </li>
          </ol>
        </div>
      </section>

      {/* ── Planes y precios ── */}
      <section id="planes" className="landing-planes" aria-labelledby="planes-heading">
        <div className="section-container">
          <p className="section-eyebrow">Planes y precios</p>
          <h2 id="planes-heading" className="section-title">Elige el plan que se adapta a tu negocio</h2>
          <div className="planes-grid">
            {/* Plan gratuito */}
            <article className="plan-card">
              <div className="plan-header">
                <h3 className="plan-nombre">Gratuito</h3>
                <div className="plan-precio">
                  <span className="plan-monto">$0</span>
                </div>
                <p className="plan-descripcion">Para empezar a organizar tus productos y monitoreos</p>
              </div>
              <ul className="plan-features" role="list">
                <PlanItem texto="Hasta 10 productos registrados" />
                <PlanItem texto="Recolección programada cada 6 horas" />
                <PlanItem texto="Precio y margen sugeridos según tu objetivo" />
              </ul>
              <Link to="/registro" className="plan-cta btn btn-outline">Crear cuenta gratis</Link>
            </article>

            {/* Plan Pro destacado */}
            <article className="plan-card plan-destacado plan-dark">
              <div className="plan-badge-top">Más popular</div>
              <div className="plan-header">
                <h3 className="plan-nombre">Pro</h3>
                <div className="plan-precio">
                  <span className="plan-monto">$49.900</span>
                  <span className="plan-periodo">COP / mes</span>
                </div>
                <p className="plan-descripcion">Para vendedores que necesitan monitorear más productos</p>
              </div>
              <ul className="plan-features" role="list">
                <PlanItem texto="Hasta 100 productos registrados" />
                <PlanItem texto="Frecuencia configurable desde 1 hora" />
                <PlanItem texto="Recolección programada cada 6 horas por defecto" />
                <PlanItem texto="Precio y margen sugeridos según tu objetivo" />
              </ul>
              <Link to="/registro" className="plan-cta btn btn-outline-light">
                Crear cuenta
              </Link>
            </article>
          </div>
          <p className="planes-legal">Facturacion manual, puedes cancelar en cualquier momento</p>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="landing-footer-dark" role="contentinfo">
        <div className="footer-dark-inner">
          <div className="footer-dark-bottom">
            <div className="footer-logo-row">
              <div className="footer-brand">Trendly</div>
              <p className="footer-tagline">Monitoreo y análisis de precios para vendedores</p>
            </div>
            <div className="footer-legal-links">
              <Link to="/politica-datos">Política de tratamiento de datos</Link>
            </div>
            <p className="footer-copy">© 2026 Trendly</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
