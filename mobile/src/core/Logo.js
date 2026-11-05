import { View } from 'react-native'
import Svg, { Rect } from 'react-native-svg'

const AMARILLO = '#ffd23f'
const TINTA = '#15120b'

// El logo de la web (frontend/public/favicon.svg): cuatro paletas, la última encendida
export function MarcaTrendly({ tamano = 24, color = TINTA }) {
    return (
        <Svg width={tamano} height={tamano} viewBox="5 5 22 22" accessibilityElementsHidden importantForAccessibility="no">
            <Rect x="5" y="5" width="10" height="10" rx="2" fill={color} />
            <Rect x="17" y="5" width="10" height="10" rx="2" fill={color} />
            <Rect x="5" y="17" width="10" height="10" rx="2" fill={color} />
            <Rect x="18.25" y="18.25" width="7.5" height="7.5" rx="1.5" fill="none" stroke={color} strokeWidth="2.5" />
        </Svg>
    )
}

// La marca sobre su baldosa amarilla, igual que el ícono de la app
export function LogoTrendly({ tamano = 56 }) {
    return (
        <View
            accessible
            accessibilityRole="image"
            accessibilityLabel="Trendly"
            style={{
                width: tamano,
                height: tamano,
                borderRadius: tamano * 0.24,
                backgroundColor: AMARILLO,
                alignItems: 'center',
                justifyContent: 'center',
                borderCurve: 'continuous',
            }}
        >
            <MarcaTrendly tamano={tamano * 0.56} />
        </View>
    )
}
