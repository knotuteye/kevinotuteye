---
title: Weaving kente in a fragment shader
date: 2026-11-20
summary: The cloth on this site is not an image. Every pixel works out which thread it falls on and lights it as twisted yarn, and a second texture keeps it calm when the camera pulls back. This is how it works.
tags: WebGL, Graphics, This site
source: knotuteye/kevinotuteye · components/cloth/engine.ts
---

Kente is woven in narrow strips, about a hand wide, on a horizontal loom. The strips are then sewn edge to edge into a cloth, and the pattern only appears once they are together. This site tells my career the same way: each role is a strip, and the current one is still on the loom.

I wanted that cloth to be woven, not printed. So nothing on the home page is a picture of fabric. It is one WebGL2 fragment shader that, for every pixel, works out which thread it is looking at and shades it like yarn.

## Drafting the cloth as data

A kente strip alternates between two kinds of section. In a warp-faced section the lengthwise warp threads hide the weft, and you see fine vertical stripes. In a weft-faced block the crosswise weft covers the warp and carries the motif. Neighbouring strips are offset by half a block, so once they are sewn the blocks fall into a checkerboard.

`lib/kente.ts` describes each strip in exactly those terms: a symmetric warp stripe, and a sequence of blocks, each with a motif and colors. It compiles them into one small texture with one texel per thread crossing:

```ts
// R: warp dye, G: weft dye, B: 255 when the weft is on top, A: block id
structure[o] = warp
structure[o + 1] = weft
structure[o + 2] = weftFaced ? 255 : 0
```

Each strip is 48 warp ends wide and the repeat is 280 picks tall, so the whole cloth, eight strips of it, fits in a texture smaller than a thumbnail.

## One pixel, one thread

In the shader, each pixel is moved into cloth space, measured in threads: x across the strips, y down the cloth. The integer part of that position says which warp end and which pick the pixel falls on; one `texelFetch` from the structure texture says which dyes cross there and which is on top.

The fractional part says where on that thread the pixel is. That is enough to model the thread as a small cylinder: a normal that curves across its width, a bulge along its length where it rises over a neighbour, fine diagonal ridges for the ply, and a little noise for loose fibres. Where a thread dives under its neighbour there is a narrow crease of ambient occlusion.

Then it is lit. Silk and rayon do not catch light in round spots; they catch it in streaks along the fibre. So the specular term is Kajiya-Kay, the hair-shading model, which is brightest where the fibre runs perpendicular to the half vector:

```glsl
// Kajiya-Kay: brightest where the fibre is perpendicular to the half vector.
vec3 H1 = normalize(L1 + V);
float s1 = sqrt(max(0.0, 1.0 - pow(dot(t, H1), 2.0)));
float spec = pow(s1, 60.0) * 0.42 + pow(s1, 8.0) * 0.1;
```

The light follows your pointer, which is why the threads shimmer as you move across them.

## Keeping it calm from far away

Close up, each thread is several pixels wide and all of that detail is worth drawing. When the camera pulls back to show the whole cloth, a thread is smaller than a pixel. Sampling exact crossings at that size produces moiré and crawling sparkle: aliasing, in its most textile form.

So the cloth is compiled twice. Alongside the structure texture is a color texture of what each crossing looks like, and that one is mipmapped. The shader works out how many screen pixels one thread covers and crossfades between the two:

```glsl
float threadPx = uCam.z * uDpr;
float detail = smoothstep(1.6, 4.5, threadPx);
vec3 avg = textureGrad(uColour, uv, vec2(dUV.x, 0.0), vec2(0.0, dUV.y)).rgb;
col = mix(far, near, detail);
```

The far view averages the threads the way an eye does, lit only by the large folds of the drape. The near view takes over smoothly as the threads become big enough to see.

## The loom itself

Above the fell, the edge where weaving stops, the shader draws the bare warp: alternate ends lifted into a shed near the fell and pulled together further up. A wooden beater with a tooth between every end swings in after each pick. A shuttle crosses, laying the next weft thread from the same structure texture, so the pick it lays is the one the cloth will show. Scrolling the hero speeds it up.

Everything else is ordinary: a slow drape of three sine waves for folds, a dent where you press, whip stitches where strips meet, and dye that is never quite even from one thread to the next.

## Making it cheap enough to keep

A shader that runs for every pixel of a full-screen canvas has to earn its place. A few things keep it cheap:

- The canvas only gets a WebGL context once it nears the viewport, and the loop only runs while it is on screen and the tab is visible.
- Frame times are sampled. If too many frames run long, the device pixel ratio is lowered a step at a time until they do not.
- Before the first frame, and on devices without WebGL2, each strip is drawn as a CSS gradient of its warp stripe, rendered on the server, so the first paint already has the right colors in the right places.
- The cloth is always `aria-hidden`. Everything it says, the page also says in text.

The drafts are interpretations made for a screen, not reproductions of any named cloth. But the structure is the real one: warp and weft, strip by strip, sewn into one cloth.
