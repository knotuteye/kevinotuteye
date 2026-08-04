import * as THREE from 'three'

/**
 * The matcap material every object in the world uses.
 *
 * Technique adapted from Bruno Simon's folio-2019 (MIT, code only) — two
 * additions bolted onto three's MeshMatcapMaterial via onBeforeCompile:
 *
 *  1. Reveal displacement. A radial wave expanding from the world origin sinks
 *     geometry below the ground plane, and the fragment shader clips anything
 *     under it. Objects therefore *grow out of the floor* on load instead of
 *     flying in from off-screen.
 *
 *  2. Fake indirect bounce. Surfaces facing downward and sitting close to the
 *     ground mix toward `world.indirect`. There are no lights in this scene at
 *     all; this is what glues objects to the floor and makes them feel lit.
 *
 * The reference is Z-up (Blender convention). We stay Y-up so drei's helpers
 * behave normally, so every `worldPosition.z` there is `worldPosition.y` here.
 */

/** Shared across every clay material so one tween reveals the whole world. */
export const revealUniforms = {
  uRevealProgress: { value: 0 },
  uRevealRadius: { value: 30 },
  uRevealAmplitude: { value: 3.2 },
}

export type ClayOptions = {
  matcap: THREE.Texture
  indirectColor: string
  /** Skip the ground clip for geometry that legitimately sits below y=0. */
  clipBelowGround?: boolean
  transparent?: boolean
  opacity?: number
}

export function createClayMaterial({
  matcap,
  indirectColor,
  clipBelowGround = true,
  transparent = false,
  opacity = 1,
}: ClayOptions): THREE.MeshMatcapMaterial {
  const material = new THREE.MeshMatcapMaterial({
    matcap,
    transparent,
    opacity,
  })

  const indirectUniforms = {
    uIndirectColor: { value: new THREE.Color(indirectColor) },
    // Tuning carried over from the reference; these numbers are the difference
    // between "objects on a background" and "objects in a place".
    uIndirectAmplitude: { value: 1.75 },
    uIndirectDistanceStrength: { value: 0.5 },
    uIndirectDistancePower: { value: 2.0 },
    uIndirectAngleStrength: { value: 1.5 },
    uIndirectAngleOffset: { value: 0.6 },
    uIndirectAnglePower: { value: 1.0 },
  }

  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, revealUniforms, indirectUniforms)

    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        /* glsl */ `
        #include <common>
        uniform float uRevealProgress;
        uniform float uRevealRadius;
        uniform float uRevealAmplitude;
        varying vec3 vWorldPosition;
        `
      )
      // Rebuild project_vertex so the displacement happens in world space,
      // which is what makes the wave independent of each object's transform.
      .replace(
        '#include <project_vertex>',
        /* glsl */ `
        vec4 worldPosition = modelMatrix * vec4( transformed, 1.0 );

        float distanceToCenter = length( worldPosition.xz );
        float revealProgress = ( uRevealProgress - distanceToCenter / uRevealRadius ) * 5.0;
        revealProgress = 1.0 - clamp( revealProgress, -0.1, 1.0 );
        revealProgress = pow( revealProgress, 2.0 );
        if( uRevealProgress > 0.9 ) { revealProgress = 0.0; }

        worldPosition.y -= revealProgress * uRevealAmplitude;

        vWorldPosition = worldPosition.xyz;

        vec4 mvPosition = viewMatrix * worldPosition;
        gl_Position = projectionMatrix * mvPosition;
        `
      )

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        /* glsl */ `
        #include <common>
        uniform vec3 uIndirectColor;
        uniform float uIndirectAmplitude;
        uniform float uIndirectDistanceStrength;
        uniform float uIndirectDistancePower;
        uniform float uIndirectAngleStrength;
        uniform float uIndirectAngleOffset;
        uniform float uIndirectAnglePower;
        varying vec3 vWorldPosition;
        `
      )
      .replace(
        '#include <tonemapping_fragment>',
        /* glsl */ `
        ${
          clipBelowGround
            ? 'if( vWorldPosition.y < -0.001 ) discard;'
            : /* glsl */ ''
        }

        float indirectDistanceStrength = clamp( 1.0 - vWorldPosition.y / uIndirectAmplitude, 0.0, 1.0 ) * uIndirectDistanceStrength;
        indirectDistanceStrength = pow( indirectDistanceStrength, uIndirectDistancePower );

        vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
        float indirectAngleStrength = dot( normalize( worldNormal ), vec3( 0.0, -1.0, 0.0 ) ) + uIndirectAngleOffset;
        indirectAngleStrength = clamp( indirectAngleStrength * uIndirectAngleStrength, 0.0, 1.0 );
        indirectAngleStrength = pow( indirectAngleStrength, uIndirectAnglePower );

        float indirectStrength = indirectDistanceStrength * indirectAngleStrength;
        gl_FragColor = vec4( mix( gl_FragColor.rgb, uIndirectColor, indirectStrength ), gl_FragColor.a );

        #include <tonemapping_fragment>
        `
      )
  }

  // Materials that differ only by onBeforeCompile must not share a program.
  material.customProgramCacheKey = () =>
    `clay-${clipBelowGround ? 'clip' : 'noclip'}`

  return material
}
