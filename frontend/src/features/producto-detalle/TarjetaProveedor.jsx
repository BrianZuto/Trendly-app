import { formatearDolares, formatearPesos } from '@features/productos/formato'

const numero = (n) => n.toLocaleString('es-CO')

// El proveedor al que le compras: de aquí sale tu costo, que se actualiza en cada captura
export default function TarjetaProveedor({ producto }) {
    const { proveedor, costosExtra = 0 } = producto
    if (!proveedor) {
        return (
            <div className="hoja proveedor proveedor-vacio">
                <p className="mini">
                    Este producto no tiene proveedor en AliExpress: su costo se escribió a mano y no se actualiza solo.
                </p>
            </div>
        )
    }
    const antes = proveedor.precioAnteriorUsd
    const cambio = antes ? Math.round(((proveedor.precioUsd - antes) / antes) * 1000) / 10 : 0
    return (
        <section className="hoja proveedor" aria-labelledby="proveedor-titulo">
            <img src={proveedor.imagen} alt="" />
            <div className="proveedor-texto">
                <p className="mini proveedor-rotulo">
                    <span className="mk mk-ae">AliExpress</span> <span id="proveedor-titulo">Tu proveedor</span>
                </p>
                <strong>{proveedor.titulo}</strong>
                <span className="mini num">
                    {proveedor.tienda} · ★ {numero(proveedor.calificacion)} · {numero(proveedor.resenas)} reseñas · {numero(proveedor.ventas)} vendidos ·
                    llega en {proveedor.diasMin}–{proveedor.diasMax} días
                </span>
                {cambio !== 0 && (
                    <span className={`proveedor-cambio ${cambio > 0 ? 'sube' : 'baja'}`} role="status">
                        El proveedor {cambio > 0 ? 'subió' : 'bajó'} de {formatearDolares(antes)} a {formatearDolares(proveedor.precioUsd)} (
                        {cambio > 0 ? '+' : '−'}
                        {numero(Math.abs(cambio))}%)
                    </span>
                )}
            </div>
            <dl className="proveedor-costo num">
                <div>
                    <dt>Producto + envío</dt>
                    <dd>
                        {formatearDolares(proveedor.precioUsd)} + {proveedor.envioUsd === 0 ? 'gratis' : formatearDolares(proveedor.envioUsd)}
                    </dd>
                </div>
                <div>
                    <dt>En pesos</dt>
                    <dd>{formatearPesos(proveedor.costo)}</dd>
                </div>
                {costosExtra > 0 && (
                    <div>
                        <dt>Costos extra</dt>
                        <dd>{formatearPesos(costosExtra)}</dd>
                    </div>
                )}
            </dl>
            <a className="app-boton app-boton-claro app-boton-chico" href={proveedor.url} target="_blank" rel="noreferrer">
                Ver en AliExpress
            </a>
        </section>
    )
}
