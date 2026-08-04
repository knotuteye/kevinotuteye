import { Text } from '@react-three/drei'
import * as THREE from 'three'
import { palette, type PaletteName } from '../../lib/palette'

/**
 * Copy painted flat on the ground, the way the reference paints its signage.
 *
 * The one place we deliberately diverge from folio-2019: this is SDF text
 * (troika) fed from JSON at runtime, not a pre-rendered alpha map. Same look,
 * but editing content stays a JSON edit instead of an asset rebuild.
 *
 * Positions are local to the caller's group, which is expected to be yawed by
 * WORLD_YAW so the type squares up with the camera.
 */
export default function GroundText({
  children,
  position,
  size = 0.6,
  color = '#ffffff',
  paletteColor,
  anchorX = 'left',
  letterSpacing = 0.06,
  maxWidth,
  opacity = 1,
  lineHeight = 1.35,
}: {
  children: string
  /** [x, z] in the parent's local space. */
  position: [number, number]
  size?: number
  color?: string
  paletteColor?: PaletteName
  anchorX?: 'left' | 'center' | 'right'
  letterSpacing?: number
  maxWidth?: number
  opacity?: number
  lineHeight?: number
}) {
  return (
    <Text
      font="/fonts/montserrat-700.ttf"
      position={[position[0], 0.06, position[1]]}
      rotation={[-Math.PI / 2, 0, 0]}
      fontSize={size}
      color={paletteColor ? palette[paletteColor] : color}
      anchorX={anchorX}
      anchorY="middle"
      letterSpacing={letterSpacing}
      maxWidth={maxWidth}
      lineHeight={lineHeight}
      fillOpacity={opacity}
      // Crisp, slightly aliased edges rather than smooth — a signature of the
      // reference's ground decals.
      material-toneMapped={false}
      material-side={THREE.DoubleSide}
      material-depthWrite={false}
    >
      {children}
    </Text>
  )
}
