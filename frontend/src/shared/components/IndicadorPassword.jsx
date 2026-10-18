import { RECOMENDACIONES, REQUISITOS, nivelSeguridad, requisitosCumplidos } from '@shared/utils/passwordSeguridad'

function Elemento({ cumple, texto }) {
    return (
        <li className={cumple ? 'cumple' : ''}>
            <span aria-hidden="true">{cumple ? '✓' : '○'}</span>
            <span className="sr-only">{cumple ? 'Cumplido: ' : 'Pendiente: '}</span>
            {texto}
        </li>
    )
}

export default function IndicadorPassword({ valor }) {
    const { nivel, etiqueta } = nivelSeguridad(valor)
    const obligatoriosListos = requisitosCumplidos(valor)

    return (
        <div className="indicador">
            <div className="indicador-barra" aria-hidden="true">
                {[1, 2, 3].map((tramo) => (
                    <span key={tramo} className={`segmento ${nivel >= tramo ? `nivel-${nivel}` : ''}`} />
                ))}
            </div>
            <p className="indicador-texto">{valor ? `Seguridad: ${etiqueta}` : 'Crea una contraseña segura'}</p>

            <ul className="requisitos" aria-label="Requisitos obligatorios">
                {REQUISITOS.map((requisito) => (
                    <Elemento key={requisito.id} cumple={requisito.cumple(valor)} texto={requisito.texto} />
                ))}
            </ul>

            {obligatoriosListos && (
                <>
                    <p className="recomendado-titulo">Para hacerla más fuerte (recomendado)</p>
                    <ul className="requisitos" aria-label="Recomendaciones">
                        {RECOMENDACIONES.map((recomendacion) => (
                            <Elemento key={recomendacion.id} cumple={recomendacion.cumple(valor)} texto={recomendacion.texto} />
                        ))}
                    </ul>
                </>
            )}
        </div>
    )
}