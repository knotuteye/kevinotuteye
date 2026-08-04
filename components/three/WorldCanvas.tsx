import { Canvas } from '@react-three/fiber'
import { Suspense } from 'react'
import * as THREE from 'three'
import type { ZoneId } from '../../lib/world'
import Passes from './Passes'
import World from './World'

/**
 * Canvas host. Mounts fixed and fullscreen over the static DOM layer, which
 * stays in the document underneath as the crawler-readable copy.
 */
export default function WorldCanvas({
  entry,
  postProcessing = true,
}: {
  entry: ZoneId
  postProcessing?: boolean
}) {
  return (
    <div className="fixed inset-0 z-10">
      <Canvas
        dpr={[1, 2]}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance',
        }}
        camera={{ fov: 40, near: 1, far: 120, position: [24, 22, 30] }}
        onCreated={({ gl }) => {
          gl.setClearColor(new THREE.Color('#f3722c'))
        }}
      >
        <Suspense fallback={null}>
          <World entry={entry} />
          <Passes enabled={postProcessing} />
        </Suspense>
      </Canvas>
    </div>
  )
}
