import * as CANNON from 'cannon-es'
import {
  getObstacleTransform,
  subscribeObstacles,
  type Obstacle,
  type ObstacleTransform,
} from './obstacles'

/**
 * The car, ported from folio-2019's `World/Physics.js` (MIT).
 *
 * Every tuning constant below is carried over verbatim, including the odd
 * factored forms like `0.055 * 3 / 17`. They are unitless in any meaningful
 * sense — they are the numbers Bruno landed on by feel, and the handling falls
 * apart if you "tidy" them. Two consequences of that fidelity leak out into the
 * rest of this file and are worth stating up front:
 *
 *  1. Time is in MILLISECONDS. `speed` is metres per millisecond, and the
 *     steering rate is multiplied by a millisecond delta. Convert once at the
 *     call site and never inside.
 *
 *  2. The simulation is Z-up (Blender/cannon convention) while the rest of this
 *     site is Y-up. Rather than convert the tuning, we keep the whole
 *     simulation in its native frame and convert at the boundary — see
 *     `toThreeGround` below, and the -90° X rotation the car meshes live under.
 */

/* ------------------------------------------------------------------ */
/* Frame conversion                                                    */
/* ------------------------------------------------------------------ */

/**
 * cannon (x, y, z=up) -> three (x, y=up, z). This is a -90° rotation about X,
 * which is exactly the transform on the group the car meshes are parented to;
 * that group is what lets us copy cannon quaternions onto meshes untouched.
 */
export function toThreeGround(x: number, y: number): [number, number] {
  return [x, -y]
}

/** three ground [x, z] -> cannon ground [x, y]. */
export function toCannonGround(x: number, z: number): [number, number] {
  return [x, -z]
}

/**
 * The same -90° X rotation, as a quaternion and its inverse.
 *
 * A rotation changes basis by conjugation, so a body's orientation in three's
 * frame is `C · q · C⁻¹`. The car sidesteps this by parenting its meshes to a
 * group that carries `C` and copying quaternions raw, which is the cheaper
 * trick and the right one there — but it only works when every mesh under that
 * group is authored Z-up too. Scenery is authored Y-up like the rest of the
 * site, so its bodies get converted rather than its meshes reparented.
 */
const C = new CANNON.Quaternion(-Math.SQRT1_2, 0, 0, Math.SQRT1_2)
const C_INV = new CANNON.Quaternion(Math.SQRT1_2, 0, 0, Math.SQRT1_2)
const conversionScratch = new CANNON.Quaternion()
const converted = new CANNON.Quaternion()

/**
 * Publishes a body's pose into the transform its mesh reads.
 *
 * Both shape kinds survive the conjugation without a correction term because
 * the shapes are built with their axes permuted the same way the frames are:
 * a box swaps its y and z extents, and a cylinder is stood up about the
 * simulation's +z, which is exactly where three's +y lands.
 */
function publishTransform(body: CANNON.Body, transform: ObstacleTransform) {
  transform.x = body.position.x
  transform.y = body.position.z
  transform.z = -body.position.y

  C.mult(body.quaternion, conversionScratch)
  conversionScratch.mult(C_INV, converted)

  transform.qx = converted.x
  transform.qy = converted.y
  transform.qz = converted.z
  transform.qw = converted.w
  transform.live = true
}

/* ------------------------------------------------------------------ */
/* Tuning                                                              */
/* ------------------------------------------------------------------ */

export const CAR = {
  chassisWidth: 1.02,
  chassisHeight: 1.16,
  chassisDepth: 2.03,
  chassisOffset: new CANNON.Vec3(0, 0, 0.41),
  chassisMass: 40,
  wheelFrontOffsetDepth: 0.635,
  wheelBackOffsetDepth: -0.475,
  wheelOffsetWidth: 0.39,
  wheelRadius: 0.25,
  wheelHeight: 0.24,
  wheelSuspensionStiffness: 50,
  wheelSuspensionRestLength: 0.1,
  wheelFrictionSlip: 10,
  wheelDampingRelaxation: 1.8,
  wheelDampingCompression: 1.5,
  wheelMaxSuspensionForce: 100000,
  wheelRollInfluence: 0.01,
  wheelMaxSuspensionTravel: 0.3,
  wheelCustomSlidingRotationalSpeed: -30,
  wheelMass: 5,
  controlsSteeringSpeed: 0.005 * 3,
  controlsSteeringMax: Math.PI * 0.17,
  controlsSteeringQuad: false,
  controlsAcceleratingMaxSpeed: (0.055 * 3) / 17,
  controlsAcceleratingMaxSpeedBoost: (0.11 * 3) / 17,
  controlsAcceleratingSpeed: 2 * 4 * 2,
  controlsAcceleratingSpeedBoost: 3.5 * 4 * 2,
  controlsBrakeStrength: 0.45 * 3,
} as const

/** Matches folio's Time.js, which clamps delta so a backgrounded tab cannot
 *  hand the solver a multi-second step and fire the car into orbit. */
const MAX_DELTA_MS = 60

const WHEEL = { frontLeft: 0, frontRight: 1, backLeft: 2, backRight: 3 } as const

export type CarActions = {
  up: boolean
  right: boolean
  down: boolean
  left: boolean
  brake: boolean
  boost: boolean
}

/**
 * A heading to steer toward, rather than a direction to turn.
 *
 * This is the one input the keyboard cannot express and a thumb can: the stick
 * points somewhere on the ground and the car turns until it is pointing there.
 * `angle` is in the simulation's frame, so it is directly comparable with the
 * car's own `angle` — see `bindJoystick` for where a screen gesture becomes one.
 */
export type Joystick = {
  active: boolean
  angle: number
}

const IDLE_JOYSTICK: Joystick = { active: false, angle: 0 }

/* ------------------------------------------------------------------ */
/* Shared read-only state                                              */
/* ------------------------------------------------------------------ */

/**
 * Where the car is, in three's frame, for everyone who is not the simulation:
 * the camera follows it, and each zone tests it for containment.
 *
 * A plain mutable object rather than React state — it changes every frame and
 * is only ever read inside `useFrame`, so a re-render per change would be pure
 * waste. Same reasoning as the focus store in `world.ts`.
 */
export type CarState = {
  /** Ground position in three space. */
  x: number
  z: number
  /** Height, for anything that needs to know the car has left the ground. */
  y: number
  /** Metres per millisecond, per the note at the top of this file. */
  speed: number
  /** False until the first physics step has run. */
  ready: boolean
}

const carState: CarState = { x: 0, z: 0, y: 0, speed: 0, ready: false }

export function getCarState(): CarState {
  return carState
}


/* ------------------------------------------------------------------ */
/* Simulation                                                          */
/* ------------------------------------------------------------------ */

export type WheelTransform = {
  position: CANNON.Vec3
  quaternion: CANNON.Quaternion
}

export type Spawn = {
  /** Ground position in three space [x, z]. */
  position: [number, number]
  /** Heading in three space; 0 faces -z, into the world. */
  heading?: number
}

export class CarPhysics {
  readonly world: CANNON.World
  readonly wheelTransforms: WheelTransform[] = []

  chassisBody!: CANNON.Body
  private vehicle!: CANNON.RaycastVehicle

  /** Live handling state, mirrored from folio for the model to read back. */
  steering = 0
  accelerating = 0
  speed = 0
  angle = 0
  forwardSpeed = 0
  goingForward = true

  /**
   * Reports a knock, with the impact speed along the contact normal in m/s.
   * Set by whoever wants to hear about it; the simulation itself does not care.
   */
  onImpact: ((strength: number) => void) | null = null

  private readonly floorMaterial: CANNON.Material
  private readonly propMaterial: CANNON.Material
  private readonly floorBody: CANNON.Body
  private readonly obstacleBodies = new Map<Obstacle, CANNON.Body>()
  /**
   * Only the bodies that can actually move, so the per-step readback walks four
   * dozen props rather than every static wall and board in the world.
   */
  private readonly simulated: { body: CANNON.Body; transform: ObstacleTransform }[] = []
  private unsubscribeObstacles: (() => void) | null = null
  private readonly worldForward = new CANNON.Vec3()
  private readonly oldPosition = new CANNON.Vec3()
  private deltaMs = 16
  private spawn: Spawn
  private attached = false

  /** Self-righting after a roll, so a flipped car is never a dead end. */
  private upsideDownState: 'watching' | 'pending' | 'turning' = 'watching'
  private pendingTimeout: number | null = null
  private turningTimeout: number | null = null

  constructor(spawn: Spawn) {
    this.spawn = spawn

    this.world = new CANNON.World()
    this.world.gravity.set(0, 0, -3.25 * 4)
    this.world.allowSleep = true
    this.world.defaultContactMaterial.friction = 0
    this.world.defaultContactMaterial.restitution = 0.2

    // folio also declares a wheel material and a floor/wheel contact pair, but
    // a RaycastVehicle's wheels are rays rather than bodies and never generate
    // contacts — their grip comes entirely from `frictionSlip`. Omitted rather
    // than carried over as decoration.
    this.floorMaterial = new CANNON.Material('floorMaterial')

    /**
     * Props need friction; nothing else in this world does.
     *
     * The global default is frictionless, carried over from folio, and that is
     * correct for the car — a raycast vehicle gets its grip from `frictionSlip`
     * and a floor that gripped the chassis box would fight it. But a knocked
     * rock on a frictionless plane never stops: it skates off across the map at
     * whatever speed it left at and is still going when you next look. So props
     * get their own material and their own contact pairs, and the car keeps the
     * frictionless default it was tuned against.
     *
     * Deliberately no pair with the chassis, which has no material and so falls
     * through to that default. The car should knock a prop away, not drag it.
     */
    this.propMaterial = new CANNON.Material('propMaterial')
    this.world.addContactMaterial(
      new CANNON.ContactMaterial(this.propMaterial, this.floorMaterial, {
        friction: 0.4,
        restitution: 0.3,
      })
    )
    this.world.addContactMaterial(
      new CANNON.ContactMaterial(this.propMaterial, this.propMaterial, {
        friction: 0.25,
        restitution: 0.35,
      })
    )

    // The default broadphase is O(n²) over every pair in the world, which was
    // free when the world held a floor and a car. The scenery adds some seventy
    // static bodies, and a sweep-and-prune pass sorts them out for nothing.
    this.world.broadphase = new CANNON.SAPBroadphase(this.world)

    // An infinite plane rather than a big box: the world has no edges, so
    // driving off the far side of the map is impossible by construction.
    this.floorBody = new CANNON.Body({
      mass: 0,
      shape: new CANNON.Plane(),
      material: this.floorMaterial,
    })
    this.world.addBody(this.floorBody)

    this.create()
  }

  private create() {
    const [cx, cy] = toCannonGround(...this.spawn.position)

    const shape = new CANNON.Box(
      new CANNON.Vec3(
        CAR.chassisDepth * 0.5,
        CAR.chassisWidth * 0.5,
        CAR.chassisHeight * 0.5
      )
    )

    this.chassisBody = new CANNON.Body({ mass: CAR.chassisMass })
    this.chassisBody.allowSleep = false
    this.chassisBody.addShape(shape, CAR.chassisOffset)
    // A short drop rather than folio's 12m one: the site already has a reveal
    // animation, and a long fall would land after the world has finished
    // arriving.
    this.chassisBody.position.set(cx, cy, 2)

    // The chassis' local forward is +x. Heading 0 should face three's -z, which
    // is cannon +y, so the base yaw is a quarter turn.
    this.chassisBody.quaternion.setFromAxisAngle(
      new CANNON.Vec3(0, 0, 1),
      Math.PI * 0.5 + (this.spawn.heading ?? 0)
    )

    this.oldPosition.copy(this.chassisBody.position)

    /**
     * The axis indices have to be stated, not defaulted.
     *
     * folio omits them because old `cannon` defaulted to Z-up (right=y, up=z).
     * cannon-es changed the defaults to Y-up (right=z, up=y), so inheriting
     * them here gives the vehicle a sideways idea of which way is up: the
     * suspension pushes along the wrong axis and the friction model resolves
     * "forward" into a yaw. The car does not drive — it slews round on the spot
     * with the steering dead centre, which reads like a physics blow-up rather
     * than a two-line config difference.
     */
    this.vehicle = new CANNON.RaycastVehicle({
      chassisBody: this.chassisBody,
      indexRightAxis: 1,
      indexForwardAxis: 0,
      indexUpAxis: 2,
    })

    const wheelOptions = {
      radius: CAR.wheelRadius,
      suspensionStiffness: CAR.wheelSuspensionStiffness,
      suspensionRestLength: CAR.wheelSuspensionRestLength,
      frictionSlip: CAR.wheelFrictionSlip,
      dampingRelaxation: CAR.wheelDampingRelaxation,
      dampingCompression: CAR.wheelDampingCompression,
      maxSuspensionForce: CAR.wheelMaxSuspensionForce,
      rollInfluence: CAR.wheelRollInfluence,
      maxSuspensionTravel: CAR.wheelMaxSuspensionTravel,
      customSlidingRotationalSpeed: CAR.wheelCustomSlidingRotationalSpeed,
      useCustomSlidingRotationalSpeed: true,
      directionLocal: new CANNON.Vec3(0, 0, -1),
      axleLocal: new CANNON.Vec3(0, 1, 0),
      chassisConnectionPointLocal: new CANNON.Vec3(1, 1, 0),
    }

    const placements: [number, number][] = [
      [CAR.wheelFrontOffsetDepth, CAR.wheelOffsetWidth],
      [CAR.wheelFrontOffsetDepth, -CAR.wheelOffsetWidth],
      [CAR.wheelBackOffsetDepth, CAR.wheelOffsetWidth],
      [CAR.wheelBackOffsetDepth, -CAR.wheelOffsetWidth],
    ]

    for (const [depth, width] of placements) {
      wheelOptions.chassisConnectionPointLocal.set(depth, width, 0)
      this.vehicle.addWheel(wheelOptions)
    }

    // folio parks a kinematic body under each wheel purely to carry a
    // transform; the raycast vehicle already publishes one, so we read that
    // directly and skip four bodies the solver would otherwise walk.
    this.wheelTransforms.length = 0
    for (let i = 0; i < this.vehicle.wheelInfos.length; i++) {
      this.wheelTransforms.push({
        position: new CANNON.Vec3(),
        quaternion: new CANNON.Quaternion(),
      })
    }
  }

  /**
   * Puts the car into the simulation. Split from construction because React
   * runs an effect's cleanup and setup as a matched pair — under StrictMode it
   * does so immediately, on mount — and a teardown with no corresponding setup
   * leaves the vehicle out of the world and the postStep listener unhooked. The
   * car then hangs at its spawn point forever, which is exactly as silent and
   * as confusing as it sounds.
   */
  attach() {
    if (this.attached) return
    this.attached = true
    this.vehicle.addToWorld(this.world)
    this.world.addEventListener('postStep', this.onPostStep)
    this.chassisBody.addEventListener('collide', this.onCollide)
    this.unsubscribeObstacles = subscribeObstacles(this.onObstacleChange)
  }

  detach() {
    if (!this.attached) return
    this.attached = false
    this.world.removeEventListener('postStep', this.onPostStep)
    this.chassisBody.removeEventListener('collide', this.onCollide)
    this.unsubscribeObstacles?.()
    this.unsubscribeObstacles = null
    for (const body of this.obstacleBodies.values()) {
      body.removeEventListener('collide', this.onPropCollide)
      this.world.removeBody(body)
    }
    this.obstacleBodies.clear()
    // Left `live`, and left holding their last pose. `attach` rebuilds every
    // body from the declared rest pose and republishes immediately, so the
    // props snap home on the same frame the car does — which is what makes
    // reset put the whole world back rather than just the car.
    this.simulated.length = 0
    this.vehicle.removeFromWorld(this.world)
    carState.ready = false
  }

  /* ---------------------------------------------------------------- */
  /* Scenery                                                           */
  /* ---------------------------------------------------------------- */

  private onObstacleChange = (obstacle: Obstacle, action: 'add' | 'remove') => {
    if (action === 'remove') {
      const body = this.obstacleBodies.get(obstacle)
      if (!body) return
      body.removeEventListener('collide', this.onPropCollide)
      this.world.removeBody(body)
      this.obstacleBodies.delete(obstacle)
      const index = this.simulated.findIndex((entry) => entry.body === body)
      if (index !== -1) this.simulated.splice(index, 1)
      return
    }

    if (this.obstacleBodies.has(obstacle)) return

    const mass = obstacle.mass ?? 0
    const dynamic = mass > 0

    const [x, y] = toCannonGround(...obstacle.position)
    const body = new CANNON.Body({
      mass,
      material: dynamic ? this.propMaterial : this.floorMaterial,
    })
    body.position.set(x, y, obstacle.y)

    // A yaw about three's +y is a yaw about the simulation's +z, same sign:
    // the frame conversion is a rotation about the shared ground axis, so it
    // leaves rotations *within* the ground plane alone.
    body.quaternion.setFromAxisAngle(
      new CANNON.Vec3(0, 0, 1),
      obstacle.yaw ?? 0
    )

    if (obstacle.kind === 'box') {
      const [hx, hy, hz] = obstacle.halfExtents
      // The prop's height is its y; here it is z. Only the extents swap — the
      // box is centred, so there is no offset to carry.
      body.addShape(new CANNON.Box(new CANNON.Vec3(hx, hz, hy)))
    } else if (obstacle.kind === 'sphere') {
      // Frame-agnostic — the one shape the Z-up/Y-up split cannot touch.
      body.addShape(new CANNON.Sphere(obstacle.radius))
    } else {
      // cannon-es builds cylinders along their own +y, which in a Z-up world
      // lays them on their side. Standing one up is a per-shape orientation
      // rather than a body rotation, so `yaw` above still means what it says.
      const upright = new CANNON.Quaternion().setFromAxisAngle(
        new CANNON.Vec3(1, 0, 0),
        Math.PI * 0.5
      )
      body.addShape(
        new CANNON.Cylinder(obstacle.radius, obstacle.radius, obstacle.height, 8),
        new CANNON.Vec3(),
        upright
      )
    }

    this.world.addBody(body)
    this.obstacleBodies.set(obstacle, body)

    if (!dynamic) return

    /**
     * Damping is what separates a prop from debris.
     *
     * Undamped, a knocked prop keeps most of its energy through every bounce
     * and skitters for ten seconds after the car has driven off. These values
     * are tuned so a hit reads as a solid shunt that travels a couple of metres
     * and stops — the angular term is the higher of the two because tumbling is
     * what looks unphysical longest.
     */
    body.linearDamping = 0.25
    body.angularDamping = 0.45

    /**
     * Props sleep; the car explicitly does not.
     *
     * Sixty-odd dynamic bodies is a real solver cost, and all but the handful
     * you just hit are sitting perfectly still. The limits are loose enough
     * that a prop settles within about half a second of coming to rest and
     * drops out of the simulation until something touches it again.
     */
    body.allowSleep = true
    body.sleepSpeedLimit = 0.15
    body.sleepTimeLimit = 0.5

    body.addEventListener('collide', this.onPropCollide)

    // Published once here rather than waited for: a prop that spawns asleep
    // never sees a postStep, and its mesh would hold the seeded rest pose
    // forever. Identical values in the common case, correct in the other one.
    const transform = getObstacleTransform(obstacle)
    publishTransform(body, transform)
    this.simulated.push({ body, transform })
  }

  /**
   * Props knocking into each other and into the world.
   *
   * Separate from the chassis listener because that one only ever hears about
   * contacts the *car* is part of — a rock the car sends into a second rock is
   * silent otherwise, which is precisely the interaction worth hearing. The
   * floor is filtered for the same reason it is there: props land on it.
   *
   * Car-versus-prop now reports twice, once from each body. That is what the
   * cooldown in `lib/audio` is for, and it collapses the pair into one knock.
   */
  private onPropCollide = (event: {
    body: CANNON.Body
    contact: CANNON.ContactEquation
  }) => {
    if (!this.onImpact || event.body === this.floorBody) return
    const strength = Math.abs(event.contact.getImpactVelocityAlongNormal())
    if (strength > 1) this.onImpact(strength)
  }

  /**
   * Knocks worth hearing about.
   *
   * The floor is filtered out because the car is in contact with it on every
   * step and lands on it after every bump — passing those on would be a
   * continuous rattle rather than an impact.
   */
  private onCollide = (event: { body: CANNON.Body; contact: CANNON.ContactEquation }) => {
    if (!this.onImpact || event.body === this.floorBody) return
    const strength = Math.abs(event.contact.getImpactVelocityAlongNormal())
    if (strength > 1) this.onImpact(strength)
  }

  private onPostStep = () => {
    const positionDelta = this.chassisBody.position.vsub(this.oldPosition)
    this.oldPosition.copy(this.chassisBody.position)
    this.speed = positionDelta.length() / this.deltaMs

    this.chassisBody.vectorToWorldFrame(
      new CANNON.Vec3(1, 0, 0),
      this.worldForward
    )
    this.angle = Math.atan2(this.worldForward.y, this.worldForward.x)
    this.forwardSpeed = this.worldForward.dot(positionDelta)
    this.goingForward = this.forwardSpeed > 0

    this.updateUpsideDown()

    // Sleeping bodies republish the same numbers, which is cheaper than testing
    // for it — and a body woken by a contact is already awake by the time this
    // runs, so there is no frame where a moving prop is skipped.
    for (const entry of this.simulated) {
      publishTransform(entry.body, entry.transform)
    }

    for (let i = 0; i < this.vehicle.wheelInfos.length; i++) {
      this.vehicle.updateWheelTransform(i)
      const transform = this.vehicle.wheelInfos[i].worldTransform
      this.wheelTransforms[i].position.copy(transform.position)
      this.wheelTransforms[i].quaternion.copy(transform.quaternion)

      // The wheel model is modelled for one side; the right-hand pair has to be
      // spun about so its hub faces outward.
      if (i === WHEEL.frontRight || i === WHEEL.backRight) {
        const flip = new CANNON.Quaternion()
        flip.setFromAxisAngle(new CANNON.Vec3(0, 0, 1), Math.PI)
        this.wheelTransforms[i].quaternion =
          this.wheelTransforms[i].quaternion.mult(flip)
      }
    }

    // Coasting drag. Without this the car keeps its momentum forever on a
    // frictionless floor and overshoots every zone it aims for.
    //
    // Applied at the centre of mass. folio passes the chassis' world position
    // here because in `cannon` the second argument was a world point; in
    // cannon-es it is a point *relative* to the centre of mass, so passing a
    // world position applies the drag on a lever arm as long as the car's
    // distance from the origin. The car does not slow down — it is spun up and
    // drives itself off across the floor, faster the further out it already is.
    if (!this.actions.up && !this.actions.down) {
      let slowDown = this.worldForward.clone()
      if (this.goingForward) slowDown = slowDown.negate()
      slowDown = slowDown.scale(this.chassisBody.velocity.length() * 0.1)
      this.chassisBody.applyImpulse(slowDown)
    }

    const [x, z] = toThreeGround(
      this.chassisBody.position.x,
      this.chassisBody.position.y
    )
    carState.x = x
    carState.z = z
    carState.y = this.chassisBody.position.z
    carState.speed = this.speed
    carState.ready = true
  }

  private updateUpsideDown() {
    const localUp = new CANNON.Vec3(0, 0, 1)
    const worldUp = new CANNON.Vec3()
    this.chassisBody.vectorToWorldFrame(localUp, worldUp)

    if (worldUp.dot(localUp) < 0.5) {
      if (this.upsideDownState === 'watching') {
        this.upsideDownState = 'pending'
        this.pendingTimeout = window.setTimeout(() => {
          this.upsideDownState = 'turning'
          this.jump(true)
          this.turningTimeout = window.setTimeout(() => {
            this.upsideDownState = 'watching'
          }, 1000)
        }, 1000)
      }
    } else if (this.upsideDownState === 'pending') {
      this.upsideDownState = 'watching'
      if (this.pendingTimeout !== null) window.clearTimeout(this.pendingTimeout)
    }
  }

  /**
   * Off-centre impulse, so the car both hops and rolls back onto its wheels.
   * The 0.1 is the whole trick: dead centre would only make it hop.
   * Relative to the centre of mass — see the note in `onPostStep`.
   */
  jump(toReturn = true, strength = 150) {
    this.chassisBody.applyImpulse(
      new CANNON.Vec3(0, 0, strength),
      new CANNON.Vec3(toReturn ? 0.1 : 0, 0, 0)
    )
  }

  private actions: CarActions = {
    up: false,
    right: false,
    down: false,
    left: false,
    brake: false,
    boost: false,
  }

  private joystick: Joystick = IDLE_JOYSTICK

  step(deltaSeconds: number, actions: CarActions, joystick = IDLE_JOYSTICK) {
    this.actions = actions
    this.joystick = joystick
    this.deltaMs = Math.min(deltaSeconds * 1000, MAX_DELTA_MS)

    this.updateSteering()
    this.updateEngine()
    this.updateBrakes()

    this.world.step(this.deltaMs / 1000)
  }

  private updateSteering() {
    const steerStrength = this.deltaMs * CAR.controlsSteeringSpeed

    if (this.joystick.active) {
      /**
       * Steer toward a heading rather than by a rate, as folio's joystick does.
       *
       * The error is used as the steering angle directly, which is what makes
       * the stick feel absolute: a heading 90° off locks the wheels over, and
       * they unwind on their own as the car comes round to it, so there is no
       * overshoot to correct and nothing to release. It also self-centres for
       * free — pointing where you are already going is zero error.
       *
       * Negated because a positive `steering` turns the car clockwise, which is
       * a *decreasing* angle in the simulation's frame.
       */
      let error = this.joystick.angle - this.angle
      if (error > Math.PI) error -= Math.PI * 2
      if (error < -Math.PI) error += Math.PI * 2

      // Reversing flips which way the front wheels take the car, so a car
      // backing up would otherwise steer itself away from the stick.
      if (!this.goingForward && this.speed > 0.001) error = -error

      // Left unclamped: the shared clamp below is the one that applies.
      this.steering = -error
    } else if (this.actions.right) {
      this.steering += steerStrength
    } else if (this.actions.left) {
      this.steering -= steerStrength
    } else if (Math.abs(this.steering) > steerStrength) {
      // Self-centring, at the same rate as steering in.
      this.steering -= steerStrength * Math.sign(this.steering)
    } else {
      this.steering = 0
    }

    if (Math.abs(this.steering) > CAR.controlsSteeringMax) {
      this.steering = Math.sign(this.steering) * CAR.controlsSteeringMax
    }

    this.vehicle.setSteeringValue(-this.steering, WHEEL.frontLeft)
    this.vehicle.setSteeringValue(-this.steering, WHEEL.frontRight)

    if (CAR.controlsSteeringQuad) {
      this.vehicle.setSteeringValue(this.steering, WHEEL.backLeft)
      this.vehicle.setSteeringValue(this.steering, WHEEL.backRight)
    }
  }

  private updateEngine() {
    const accelerationSpeed = this.actions.boost
      ? CAR.controlsAcceleratingSpeedBoost
      : CAR.controlsAcceleratingSpeed
    const accelerateStrength = 17 * accelerationSpeed
    const maxSpeed = this.actions.boost
      ? CAR.controlsAcceleratingMaxSpeedBoost
      : CAR.controlsAcceleratingMaxSpeed

    // `|| !goingForward` is what makes the car responsive rather than sluggish:
    // full engine force is always available to reverse the current direction,
    // and the speed cap only applies once you are already going that way.
    if (this.actions.up) {
      this.accelerating =
        this.speed < maxSpeed || !this.goingForward ? accelerateStrength : 0
    } else if (this.actions.down) {
      this.accelerating =
        this.speed < maxSpeed || this.goingForward ? -accelerateStrength : 0
    } else {
      this.accelerating = 0
    }

    this.vehicle.applyEngineForce(-this.accelerating, WHEEL.backLeft)
    this.vehicle.applyEngineForce(-this.accelerating, WHEEL.backRight)

    if (CAR.controlsSteeringQuad) {
      this.vehicle.applyEngineForce(-this.accelerating, WHEEL.frontLeft)
      this.vehicle.applyEngineForce(-this.accelerating, WHEEL.frontRight)
    }
  }

  private updateBrakes() {
    const value = this.actions.brake ? CAR.controlsBrakeStrength : 0
    for (let i = 0; i < 4; i++) this.vehicle.setBrake(value, i)
  }

  /** Respawns the car. Bound to R. */
  reset(spawn: Spawn = this.spawn) {
    const wasAttached = this.attached
    this.detach()
    this.spawn = spawn
    this.steering = 0
    this.accelerating = 0
    this.speed = 0
    this.create()
    if (wasAttached) this.attach()
  }

  dispose() {
    if (this.pendingTimeout !== null) window.clearTimeout(this.pendingTimeout)
    if (this.turningTimeout !== null) window.clearTimeout(this.turningTimeout)
    this.detach()
  }
}
