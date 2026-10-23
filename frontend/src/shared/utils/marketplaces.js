// Sitios con los que trabaja Trendly. AliExpress es el proveedor (de donde compras);
// MercadoLibre, Falabella y Amazon son la reventa (contra quien compites)
export const MARKETPLACES = {
    ALIEXPRESS: { nombre: 'AliExpress', corto: 'AE', clase: 'mk-ae' },
    MERCADOLIBRE: { nombre: 'MercadoLibre', corto: 'ML', clase: 'mk-ml' },
    FALABELLA: { nombre: 'Falabella', corto: 'FA', clase: 'mk-fa' },
    AMAZON: { nombre: 'Amazon', corto: 'AZ', clase: 'mk-az' },
}

export const SITIOS_REVENTA = ['MERCADOLIBRE', 'FALABELLA', 'AMAZON']

// Lo que el API acepta hoy para crear competidores (SCRUM-37): solo MercadoLibre, y por URL solo productos
// de catálogo. Falabella y Amazon quedan para mostrar datos existentes hasta que tengan scraper en el backend
export const SITIOS_SOPORTADOS = ['MERCADOLIBRE']
