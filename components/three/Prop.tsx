import { useFrame } from '@react-three/fiber'
import { useRef, type ReactNode } from 'react'
import * as THREE from 'three'
import { getObstacleTransform, type Obstacle } from '../../lib/obstacles'
import GroundShadow from './Shadow'

/**
 * A prop whose mesh follows its physics body.
 *
 * Everything else in this world is placed once and never moves, so its meshes
 * carry their own position props and the collision volume is a parallel fact
 * declared alongside. A prop with mass inverts that: the body is the authority
 * and the mesh is a readout, so the group below owns no transform of its own
 * and writes both from `lib/obstacles`' transform channel each frame.
 *
 * Children are authored about the body's *centre*, not its base — the obstacle
 * declares `y` as the centre of its volume and that is the point the simulation
 * tracks, so a 0.7m cube's mesh sits at the origin here rather than 0.35 up.
 */

type Props = {
  obstacle: Obstacle
  children: ReactNode
  /**
   * Ground shadow footprint. Omitted means no shadow, which is right for props
   * small enough that a contact patch would be a smudge.
   */
  shadow?: [number, number]
  shadowIntensity?: number
}

export default function Prop({
  obstacle,
  children,
  shadow,
  shadowIntensity = 0.85,
}: Props) {
  const ref = useRef<THREE.Group>(null)
  // Same identity in and out — `getObstacleTransform` memoises on the obstacle
  // object, which is the same one the section handed to `useObstacles`.
  const transform = getObstacleTransform(obstacle)

  useFrame(() => {
    const group = ref.current
    if (!group) return
    group.position.set(transform.x, transform.y, transform.z)
    group.quaternion.set(
      transform.qx,
      transform.qy,
      transform.qz,
      transform.qw
    )
  })

  return (
    <>
      {/* Seeded from the rest pose so the first frame is right even if the
          physics world has not mounted yet. */}
      <group
        ref={ref}
        position={[transform.x, transform.y, transform.z]}
        quaternion={
          new THREE.Quaternion(
            transform.qx,
            transform.qy,
            transform.qz,
            transform.qw
          )
        }
      >
        {children}
      </group>

      {shadow ? (
        <GroundShadow
          position={obstacle.position}
          size={shadow}
          intensity={shadowIntensity}
          height={obstacle.y}
          source={transform}
        />
      ) : null}
    </>
  )
}
