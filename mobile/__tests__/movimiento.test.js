import { act, fireEvent, render, screen } from '@testing-library/react-native'
import { AccessibilityInfo, Text } from 'react-native'
import { Aparecer, Presionable } from '@/core/movimiento'

describe('movimiento', () => {
    it('con "Reducir movimiento" activo no desplaza ni escala, solo cambia la opacidad', async () => {
        jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true)
        const alPresionar = jest.fn()
        await render(
            <Aparecer>
                <Presionable accessibilityRole="button" accessibilityLabel="Guardar" onPress={alPresionar}>
                    <Text>Guardar</Text>
                </Presionable>
            </Aparecer>,
        )
        await act(async () => {})

        const boton = screen.getByRole('button', { name: 'Guardar' })
        await fireEvent(boton, 'pressIn')
        await fireEvent(boton, 'pressOut')
        await fireEvent.press(boton)

        expect(alPresionar).toHaveBeenCalledTimes(1)
        const capa = screen.getByText('Guardar').parent
        expect(JSON.stringify(capa.props.style)).not.toContain('scale')
    })
})
