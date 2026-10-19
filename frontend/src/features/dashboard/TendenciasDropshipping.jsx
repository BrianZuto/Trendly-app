import { Link } from 'react-router-dom'
import './TendenciasDropshipping.css'

const PRODUCTOS_TENDENCIA = [
    {
        id: 'termo-acero-1l',
        nombre: 'Termo de acero 1 L',
        categoria: 'Hogar y Cocina',
        imagen: '/mock/termo.jpg',
        costo: '$28.400',
        costoValor: 28400,
        venta: '$64.900',
        ventaValor: 64900,
        margen: '56%',
        margenValor: 56,
        proveedor: 'AliExpress',
        ranking: 1,
    },
    {
        id: 'reloj-silicona',
        nombre: 'Reloj inteligente correa silicona',
        categoria: 'Tecnología',
        imagen: '/mock/smartwatch.jpg',
        costo: '$52.000',
        costoValor: 52000,
        venta: '$119.900',
        ventaValor: 119900,
        margen: '57%',
        margenValor: 57,
        proveedor: 'AliExpress',
        ranking: 2,
    },
    {
        id: 'mouse-silencioso',
        nombre: 'Mouse inalámbrico silencioso',
        categoria: 'Accesorios PC',
        imagen: '/mock/mouse.jpg',
        costo: '$16.800',
        costoValor: 16800,
        venta: '$45.900',
        ventaValor: 45900,
        margen: '63%',
        margenValor: 63,
        proveedor: 'AliExpress',
        ranking: 3,
    },
    {
        id: 'perfume-100ml',
        nombre: 'Perfume 100 ml',
        categoria: 'Belleza y Cuidado',
        imagen: '/mock/perfume.jpg',
        costo: '$44.000',
        costoValor: 44000,
        venta: '$89.900',
        ventaValor: 89900,
        margen: '51%',
        margenValor: 51,
        proveedor: 'AliExpress',
        ranking: 4,
    },
]

export default function TendenciasDropshipping() {
    return (
        <section className="tablero-panel tendencias-panel" aria-labelledby="tendencias-titulo">
            <div className="tendencias-cabeza">
                <div>
                    <h2 id="tendencias-titulo">En tendencia para dropshipping</h2>
                    <p className="tendencias-descripcion descripcion-seccion">
                        Productos verificados con alta demanda y margen proyectado entre proveedores internacionales y el mercado local.
                    </p>
                </div>
                <Link to="/productos/nuevo" className="tendencias-boton-ranking">
                    Ver ranking completo
                    <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16" aria-hidden="true">
                        <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                    </svg>
                </Link>
            </div>

            <div className="tendencias-grilla">
                {PRODUCTOS_TENDENCIA.map((item) => (
                    <article key={item.id} className="tendencias-tarjeta">
                        <div className="tendencias-imagen-marco">
                            <img
                                src={item.imagen}
                                alt={`Foto de ${item.nombre}`}
                                className="tendencias-imagen"
                                loading="lazy"
                            />
                            <div className="tendencias-imagen-badges">
                                <span className="tendencias-posicion">#{item.ranking}</span>
                                <span className="tendencias-margen-badge">
                                    Margen {item.margen}
                                </span>
                            </div>
                        </div>

                        <div className="tendencias-tarjeta-cuerpo">
                            <h3 className="tendencias-producto-nombre">{item.nombre}</h3>
                            <span className="tendencias-categoria">{item.categoria}</span>

                            <div className="tendencias-cifras">
                                <div className="tendencias-cifra-item">
                                    <span className="tendencias-cifra-etiqueta">Costo {item.proveedor}</span>
                                    <strong className="tendencias-cifra-valor num">{item.costo}</strong>
                                </div>
                                <div className="tendencias-cifra-separador" aria-hidden="true">→</div>
                                <div className="tendencias-cifra-item">
                                    <span className="tendencias-cifra-etiqueta">Se vende a</span>
                                    <strong className="tendencias-cifra-valor num">{item.venta}</strong>
                                </div>
                            </div>
                        </div>

                        <div className="tendencias-tarjeta-pie">
                            <Link
                                to={`/productos/nuevo?${new URLSearchParams({
                                    origen: 'tendencias',
                                    id: item.id,
                                    nombre: item.nombre,
                                    categoria: item.categoria,
                                    costo: String(item.costoValor),
                                    precioVenta: String(item.ventaValor),
                                    margenObjetivo: String(item.margenValor),
                                })}`}
                                state={{
                                    productoTendencia: {
                                        id: item.id,
                                        nombre: item.nombre,
                                        categoria: item.categoria,
                                        costo: item.costoValor,
                                        precioVenta: item.ventaValor,
                                        margenObjetivo: item.margenValor,
                                    },
                                }}
                                className="tendencias-boton-agregar"
                            >
                                Agregar a monitoreo
                            </Link>
                        </div>
                    </article>
                ))}
            </div>
        </section>
    )
}
