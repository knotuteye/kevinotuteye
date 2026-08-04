import { EffectComposer } from '@react-three/postprocessing'
import { useFrame } from '@react-three/fiber'
import { BlendFunction, Effect } from 'postprocessing'
import { TiltShiftEffect } from '@react-three/postprocessing'
import { forwardRef, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { world } from '../../lib/palette'
import { getWorldState } from '../../lib/world'

/**
 * Two cheap post passes are most of what turns a flat render into a diorama:
 *
 *  - a tilt-shift that keeps a horizontal band sharp and blurs everything above
 *    and below it, which reads as miniature scale
 *  - a pale pink radial glow, standing in for atmosphere
 *
 * The reference hand-rolls the tilt-shift as two separable blur passes masked
 * by `1.0 - sin(vUv.y * PI)`. postprocessing's TiltShiftEffect is the same
 * effect with a better sample kernel, so we use it rather than porting that
 * shader.
 *
 * The blur dissolving away as you focus a zone is the reference's page
 * transition — the scene visibly "focuses" on what you asked to read.
 */

const BLUR = { idle: 0.06, focused: 0.012 }

const glowShader = /* glsl */ `
  uniform vec3 uColor;
  uniform vec2 uPosition;
  uniform float uRadius;
  uniform float uAlpha;

  void mainImage( const in vec4 inputColor, const in vec2 uv, out vec4 outputColor ) {
    float glowStrength = clamp( 1.0 - distance( uv, uPosition ) / uRadius, 0.0, 1.0 ) * uAlpha;
    outputColor = vec4( mix( inputColor.rgb, uColor, glowStrength ), inputColor.a );
  }
`

class GlowEffectImpl extends Effect {
  constructor({
    color = world.glow,
    position = new THREE.Vector2(0.5, 0.78),
    radius = 0.85,
    alpha = 0.16,
  } = {}) {
    super('GlowEffect', glowShader, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, THREE.Uniform>([
        ['uColor', new THREE.Uniform(new THREE.Color(color))],
        ['uPosition', new THREE.Uniform(position)],
        ['uRadius', new THREE.Uniform(radius)],
        ['uAlpha', new THREE.Uniform(alpha)],
      ]),
    })
  }
}

const Glow = forwardRef<GlowEffectImpl>(function Glow(_props, ref) {
  const effect = useMemo(() => new GlowEffectImpl(), [])
  return <primitive ref={ref} object={effect} dispose={null} />
})

/** Tilt-shift whose strength eases toward zero while the car is in a zone. */
function FocusTiltShift() {
  const effect = useMemo(
    () => new TiltShiftEffect({ blur: BLUR.idle, taper: 0.9, samples: 10 }),
    []
  )
  const current = useRef(BLUR.idle)

  useFrame((_, delta) => {
    const focused = getWorldState().activeZone !== null
    const target = focused ? BLUR.focused : BLUR.idle
    current.current += (target - current.current) * Math.min(1, delta * 1.2)

    const uniform = effect.uniforms.get('blur')
    if (uniform) uniform.value = current.current
  })

  return <primitive object={effect} dispose={null} />
}

export default function Passes({ enabled = true }: { enabled?: boolean }) {
  if (!enabled) return null

  return (
    <EffectComposer multisampling={0} enableNormalPass={false}>
      <FocusTiltShift />
      <Glow />
    </EffectComposer>
  )
}
