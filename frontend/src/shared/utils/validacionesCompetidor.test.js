import { describe, expect, it } from 'vitest'
import { MENSAJE_ES_PROVEEDOR, MENSAJE_MARKETPLACE, marketplaceDeUrl, validarCompetidorUrl, validarPalabraClave } from './validaciones'

describe('validarCompetidorUrl (SCRUM-38)', () => {
    it('acepta publicaciones de MercadoLibre, Falabella y Amazon', () => {
        expect(validarCompetidorUrl('https://articulo.mercadolibre.com.co/MCO-123456-reloj')).toBe('')
        expect(validarCompetidorUrl('https://www.falabella.com.co/falabella-co/product/123/reloj')).toBe('')
        expect(validarCompetidorUrl('https://www.amazon.com/dp/B0ABC12345')).toBe('')
    })

    it('rechaza vacío y URLs mal escritas', () => {
        expect(validarCompetidorUrl('   ')).toBe('Pega la URL de la publicación')
        expect(validarCompetidorUrl('mercadolibre.com.co/MCO-1')).toMatch(/no está bien escrita/)
        expect(validarCompetidorUrl('https//articulo.mercadolibre.com.co')).toMatch(/no está bien escrita/)
    })

    it('rechaza otros sitios con un mensaje claro', () => {
        expect(validarCompetidorUrl('https://www.ebay.com/itm/123')).toBe(MENSAJE_MARKETPLACE)
        expect(validarCompetidorUrl('https://mercadolibre.com.co.falso.net/MCO-1')).toBe(MENSAJE_MARKETPLACE)
        expect(validarCompetidorUrl('ftp://articulo.mercadolibre.com.co/MCO-1')).toBe(MENSAJE_MARKETPLACE)
    })

    it('AliExpress es el proveedor, no un competidor', () => {
        expect(validarCompetidorUrl('https://es.aliexpress.com/item/1005001.html')).toBe(MENSAJE_ES_PROVEEDOR)
    })

    it('reconoce el marketplace por el dominio', () => {
        expect(marketplaceDeUrl('https://articulo.mercadolibre.com.co/MCO-1')).toBe('MERCADOLIBRE')
        expect(marketplaceDeUrl('https://www.falabella.com/falabella-co/product/1')).toBe('FALABELLA')
        expect(marketplaceDeUrl('https://www.amazon.com/dp/B0')).toBe('AMAZON')
        expect(marketplaceDeUrl('no es una url')).toBeNull()
    })
})

describe('validarPalabraClave (SCRUM-38)', () => {
    const valida = { valor: 'smartwatch amoled', marketplace: 'MERCADOLIBRE', topN: '5' }

    it('acepta de 3 a 80 caracteres con marketplace y top N de 1 a 10', () => {
        expect(validarPalabraClave(valida)).toEqual({})
        expect(validarPalabraClave({ ...valida, valor: 'abc', topN: '1' })).toEqual({})
        expect(validarPalabraClave({ ...valida, valor: 'a'.repeat(80), topN: '10' })).toEqual({})
    })

    it('rechaza palabras muy cortas o muy largas, contando sin espacios de los bordes', () => {
        expect(validarPalabraClave({ ...valida, valor: '  ab  ' }).valor).toBe('Escribe al menos 3 caracteres')
        expect(validarPalabraClave({ ...valida, valor: 'a'.repeat(81) }).valor).toBe('Usa máximo 80 caracteres')
    })

    it('exige marketplace y un top N entero entre 1 y 10', () => {
        expect(validarPalabraClave({ ...valida, marketplace: '' }).marketplace).toBe('Elige el marketplace')
        expect(validarPalabraClave({ ...valida, topN: '0' }).topN).toMatch(/entre 1 y 10/)
        expect(validarPalabraClave({ ...valida, topN: '11' }).topN).toMatch(/entre 1 y 10/)
        expect(validarPalabraClave({ ...valida, topN: '2.5' }).topN).toMatch(/entre 1 y 10/)
    })
})
