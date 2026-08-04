import { useMemo } from 'react'
import * as THREE from 'three'
import { palette, world } from '../../lib/palette'

/**
 * The "ground" is not geometry — it is a fullscreen gradient drawn behind
 * everything, exactly as in folio-2019. Four corner colors live in a 2x2
 * DataTexture and the GPU bilinearly stretches them across the viewport, which
 * is why the horizon never shows a seam and the gradient never shifts when the
 * camera moves.
 *
 * The four stops are Kevin's existing warm palette: they already sat almost
 * exactly on the reference's floor colors.
 */
export default function Floor() {
  const texture = useMemo(() => {
    const corners = [
      // DataTexture rows run bottom-to-top, so the bottom pair comes first.
      new THREE.Color(palette.yellowOrange), // bottom left
      new THREE.Color(palette.maizeCrayola), // bottom right
      new THREE.Color(palette.orangeRed), // top left
      new THREE.Color(world.floorTopRight), // top right
    ]

    const data = new Uint8Array(4 * 4)
    corners.forEach((color, i) => {
      data[i * 4 + 0] = Math.round(color.r * 255)
      data[i * 4 + 1] = Math.round(color.g * 255)
      data[i * 4 + 2] = Math.round(color.b * 255)
      data[i * 4 + 3] = 255
    })

    const tex = new THREE.DataTexture(data, 2, 2, THREE.RGBAFormat)
    tex.magFilter = THREE.LinearFilter
    tex.minFilter = THREE.LinearFilter
    tex.colorSpace = THREE.SRGBColorSpace
    tex.needsUpdate = true
    return tex
  }, [])

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { tBackground: { value: texture } },
        depthTest: false,
        depthWrite: false,
        // Forced to the far plane in NDC, so this is a background pass that
        // ignores the camera entirely.
        vertexShader: /* glsl */ `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = vec4( position.xy, 1.0, 1.0 );
          }
        `,
        fragmentShader: /* glsl */ `
          uniform sampler2D tBackground;
          varying vec2 vUv;
          void main() {
            gl_FragColor = texture2D( tBackground, vUv );
            #include <colorspace_fragment>
          }
        `,
      }),
    [texture]
  )

  return (
    <mesh material={material} renderOrder={-1} frustumCulled={false}>
      <planeGeometry args={[2, 2]} />
    </mesh>
  )
}
