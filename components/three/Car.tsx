import { useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { CarPhysics, toThreeGround, type Spawn } from '../../lib/car'
import { actions, bindControls } from '../../lib/controls'
import { makeMatcap } from '../../lib/matcap'
import { palette, world } from '../../lib/palette'
import { createClayMaterial, createPureMaterial } from './materials/clay'
import { createShadowMaterial, shadowAlpha, shadowOffsetFor } from './Shadow'

/**
 * The car, ported from folio-2019's `World/Car.js` (MIT), models included.
 *
 * The whole rig lives under a -90° X rotation. That single group is what lets
 * every transform below be copied straight off a cannon body with no
 * conversion: the simulation and these models are both Z-up, and the group is
 * the one place that fact meets the rest of the Y-up site. Do not "simplify" it
 * away — the alternative is converting a quaternion per wheel per frame.
 */

const MODELS = {
  chassis: '/models/car/chassis.glb',
  wheel: '/models/car/wheel.glb',
  antena: '/models/car/antena.glb',
  backLightsBrake: '/models/car/backLightsBrake.glb',
  backLightsReverse: '/models/car/backLightsReverse.glb',
} as const

const DRACO = '/draco/'

/** The model's own dark; the palette is all warm mid-tones and has no near-black. */
const CARBON = '#2f2a26'

/** Matches folio: the model hangs this far below the collision body's origin. */
const CHASSIS_OFFSET_Z = -0.28

/* ------------------------------------------------------------------ */
/* Model conversion                                                    */
/* ------------------------------------------------------------------ */

/**
 * The GLBs carry no materials — the mesh *names* are the material assignment,
 * which is how folio reskins a whole scene from one palette. `shade*` names
 * take a matcap; `pure*` names are unlit flat colour.
 */
type CarMaterials = {
  shades: Record<string, THREE.Material>
  pures: Record<string, THREE.Material>
}

function materialFor(
  name: string,
  materials: CarMaterials,
  override?: THREE.Material
): THREE.Material {
  if (override) return override

  const shade = name.match(/^shade([a-z]+)/i)
  if (shade) return materials.shades[shade[1].toLowerCase()] ?? materials.shades.white

  const pure = name.match(/^pure([a-z]+)/i)
  if (pure) return materials.pures[pure[1].toLowerCase()] ?? materials.pures.yellow

  return materials.shades.white
}

/**
 * Clones a loaded GLB into a materialised group.
 *
 * The `center` empty is load-bearing, not decoration: the wheel is modelled in
 * place at the front-left corner, so without re-origining it to its hub every
 * wheel would orbit the car rather than spin. Same mechanism gives the antenna
 * a pivot at its base instead of at the car's centre.
 */
function convert(
  scene: THREE.Object3D,
  materials: CarMaterials,
  override?: THREE.Material
): THREE.Group {
  const container = new THREE.Group()
  const center = new THREE.Vector3()

  for (const child of scene.children) {
    if (/^center[_.]?[0-9]*$/i.test(child.name)) {
      center.copy(child.position)
    }

    const mesh = child as THREE.Mesh
    if (!mesh.isMesh) continue

    const clone = mesh.clone()
    const material = materialFor(mesh.name, materials, override)
    clone.material = material
    clone.traverse((descendant) => {
      const inner = descendant as THREE.Mesh
      if (inner.isMesh) inner.material = material
    })
    container.add(clone)
  }

  if (center.lengthSq() > 0) {
    for (const child of container.children) child.position.sub(center)
    container.position.copy(center)
  }

  return container
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export default function Car({
  spawn,
  onReady,
}: {
  spawn: Spawn
  /** Hands the simulation up, so a route change can respawn the car. */
  onReady?: (physics: CarPhysics) => void
}) {
  // Loading comes first so that suspending discards as little as possible —
  // anything created above a suspending hook is thrown away and rebuilt on
  // retry, and one of the things below is a physics world.
  const chassisScene = useGLTF(MODELS.chassis, DRACO).scene
  const wheelScene = useGLTF(MODELS.wheel, DRACO).scene
  const antenaScene = useGLTF(MODELS.antena, DRACO).scene
  const brakeScene = useGLTF(MODELS.backLightsBrake, DRACO).scene
  const reverseScene = useGLTF(MODELS.backLightsReverse, DRACO).scene

  const { materials, brakeMaterial, reverseMaterial } = useMemo(() => {
    const clay = (hex: string) =>
      createClayMaterial({
        matcap: makeMatcap(hex),
        indirectColor: world.indirect,
      })

    return {
      materials: {
        shades: {
          white: clay(world.bone),
          black: clay(CARBON),
          red: clay(palette.redSalsa),
        },
        pures: {
          red: createPureMaterial({ color: palette.redSalsa }),
          yellow: createPureMaterial({ color: palette.maizeCrayola }),
        },
      } satisfies CarMaterials,
      // The lamps get their own instances because their opacity is animated;
      // sharing with the body's trim would flash the headlights every time you
      // touched the brake.
      brakeMaterial: createPureMaterial({ color: palette.redSalsa }),
      reverseMaterial: createPureMaterial({ color: palette.maizeCrayola }),
    }
  }, [])

  useEffect(
    () => () => {
      Object.values(materials.shades).forEach((m) => m.dispose())
      Object.values(materials.pures).forEach((m) => m.dispose())
      brakeMaterial.dispose()
      reverseMaterial.dispose()
    },
    [materials, brakeMaterial, reverseMaterial]
  )

  const chassisModel = useMemo(
    () => convert(chassisScene, materials),
    [chassisScene, materials]
  )
  const antenaModel = useMemo(
    () => convert(antenaScene, materials),
    [antenaScene, materials]
  )
  const brakeModel = useMemo(
    () => convert(brakeScene, materials, brakeMaterial),
    [brakeScene, materials, brakeMaterial]
  )
  const reverseModel = useMemo(
    () => convert(reverseScene, materials, reverseMaterial),
    [reverseScene, materials, reverseMaterial]
  )
  const wheels = useMemo(() => {
    const base = convert(wheelScene, materials)
    return Array.from({ length: 4 }, () => base.clone(true))
  }, [wheelScene, materials])

  const physics = useMemo(
    () => new CarPhysics(spawn),
    // Respawning is an explicit call, not a remount — see `reset`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

  useEffect(() => {
    physics.attach()
    return () => physics.dispose()
  }, [physics])

  useEffect(
    () => bindControls((event) => event === 'reset' && physics.reset()),
    [physics]
  )

  const chassisRef = useRef<THREE.Group>(null)
  const shadowRef = useRef<THREE.Mesh>(null)

  const shadowMaterial = useMemo(() => createShadowMaterial(0.4), [])
  useEffect(() => () => shadowMaterial.dispose(), [shadowMaterial])

  /**
   * Antenna wobble. Driven by *acceleration*, not speed, which is why it whips
   * on launch and on impact but sits still at a constant cruise — the one
   * detail that makes the car feel like it has mass.
   */
  const antena = useMemo(
    () => ({
      speed: new THREE.Vector2(),
      absolute: new THREE.Vector2(),
      local: new THREE.Vector2(),
      velocity: new THREE.Vector2(),
      lastVelocity: new THREE.Vector2(),
      acceleration: new THREE.Vector2(),
      pullBack: new THREE.Vector2(),
      previous: new THREE.Vector2(),
      origin: new THREE.Vector2(),
    }),
    []
  )

  useFrame((_, delta) => {
    physics.step(delta, actions)

    const body = physics.chassisBody
    const chassis = chassisRef.current
    if (!chassis) return

    chassis.position.set(
      body.position.x,
      body.position.y,
      body.position.z + CHASSIS_OFFSET_Z
    )
    chassis.quaternion.set(
      body.quaternion.x,
      body.quaternion.y,
      body.quaternion.z,
      body.quaternion.w
    )

    for (let i = 0; i < wheels.length; i++) {
      const transform = physics.wheelTransforms[i]
      if (!transform) continue
      const { position, quaternion } = transform
      wheels[i].position.set(position.x, position.y, position.z)
      wheels[i].quaternion.set(
        quaternion.x,
        quaternion.y,
        quaternion.z,
        quaternion.w
      )
    }

    // Ground shadow. It lives outside the Z-up group because the sun offset is
    // expressed in world axes, so it is placed in three coordinates.
    const shadow = shadowRef.current
    if (shadow) {
      const height = Math.max(0, body.position.z)
      const [ox, oz] = shadowOffsetFor(height)
      const [x, z] = toThreeGround(body.position.x, body.position.y)
      shadow.position.set(x + ox, 0.012, z + oz)
      shadow.rotation.z = physics.angle
      shadowMaterial.uniforms.uAlpha.value =
        shadowAlpha.value * 0.7 * Math.max(0, 1 - height / 4)
    }

    // Antenna. Millisecond delta, for the same reason everything in car.ts is.
    const deltaMs = Math.min(delta * 1000, 60)
    antena.velocity
      .set(body.position.x - antena.previous.x, body.position.y - antena.previous.y)
      .multiplyScalar((1 / deltaMs) * 17)
    antena.previous.set(body.position.x, body.position.y)

    antena.acceleration.copy(antena.velocity).sub(antena.lastVelocity)
    antena.lastVelocity.copy(antena.velocity)

    antena.speed.x -= THREE.MathUtils.clamp(antena.acceleration.x, -1, 1) * 10
    antena.speed.y -= THREE.MathUtils.clamp(antena.acceleration.y, -1, 1) * 10

    antena.pullBack
      .copy(antena.absolute)
      .negate()
      .multiplyScalar(antena.absolute.length() * 0.02)
    antena.speed.add(antena.pullBack).multiplyScalar(1 - 0.035)
    antena.absolute.add(antena.speed)

    // The wobble accumulates in world space and is read back in the car's own
    // frame, so spinning on the spot does not drag the antenna round with it.
    antena.local
      .copy(antena.absolute)
      .rotateAround(antena.origin, -physics.angle)
    antenaModel.rotation.y = antena.local.x * 0.1
    antenaModel.rotation.x = antena.local.y * 0.1

    brakeMaterial.opacity = actions.brake ? 1 : 0.5
    reverseMaterial.opacity = actions.down ? 1 : 0.5
  })

  return (
    <>
      {/* cannon Z-up -> three Y-up. See the note at the top of this file. */}
      <group rotation={[-Math.PI / 2, 0, 0]}>
        <group ref={chassisRef}>
          <primitive object={chassisModel} />
          <primitive object={antenaModel} />
          <primitive object={brakeModel} />
          <primitive object={reverseModel} />
        </group>

        {wheels.map((wheel, i) => (
          <primitive key={i} object={wheel} />
        ))}
      </group>

      <mesh
        ref={shadowRef}
        material={shadowMaterial}
        rotation={[-Math.PI / 2, 0, 0]}
        renderOrder={0}
      >
        <planeGeometry args={[3, 2]} />
      </mesh>
    </>
  )
}

Object.values(MODELS).forEach((url) => useGLTF.preload(url, DRACO))
