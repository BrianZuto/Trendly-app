export function Miniaturas({ fotos, activa, onElegir }) {
    if (fotos.length < 2) return null
    return (
        <div className="galeria-miniaturas" style={{ '--columnas': Math.min(fotos.length, 4) }}>
            {fotos.map((foto, i) => (
                <button
                    key={foto.imagen}
                    type="button"
                    className="miniatura"
                    aria-pressed={i === activa}
                    aria-label={`Ver la foto de ${foto.vendedor}`}
                    onClick={() => onElegir(i)}
                >
                    <img src={foto.imagen} alt="" />
                </button>
            ))}
        </div>
    )
}

export function NotaGaleria({ giratoria }) {
    return (
        <p className="mini galeria-nota">
            La foto viene del proveedor y de las publicaciones que vigilas. Elige cuál mostrar en Trendly.
            {giratoria && ' Arrastra para girarlas.'}
        </p>
    )
}
