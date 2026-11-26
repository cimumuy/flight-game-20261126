// world.js - archipelago geometry and camera projection helpers.
// A tiny software 3D: rotate world points into camera space, then
// perspective-divide. Camera sits behind and above the plane.
import { ISLANDS, RINGS, WORLD } from "./config.js";

export function groundHeightAt(x, z) {
  let h = 0;
  for (const isl of ISLANDS) {
    const d = Math.hypot(x - isl.x, z - isl.z);
    if (d < isl.r) {
      const t = 1 - d / isl.r;
      const hh = isl.volcano ? isl.h * t * t : isl.h * Math.min(1, t * 2.2);
      if (hh > h) h = hh;
    }
  }
  return h;
}

export function makeCamera(plane) {
  const back = 17, up = 6;
  const sx = Math.sin(plane.heading), cz = Math.cos(plane.heading);
  return {
    x: plane.x - sx * back,
    y: Math.max(plane.y + up, groundHeightAt(plane.x, plane.z) + up),
    z: plane.z + cz * back,
    heading: plane.heading,
    pitch: plane.pitch * 0.55,
    roll: plane.roll * 0.45,
  };
}

// Project a world point. Returns {x,y,scale,depth} or null if behind.
export function project(cam, px, py, pz, w, h) {
  const dx = px - cam.x, dy = py - cam.y, dz = pz - cam.z;
  const sh = Math.sin(cam.heading), ch = Math.cos(cam.heading);
  // Right vector (ch, sh); forward vector (sh, -ch) in world XZ.
  let lx = dx * ch + dz * sh;
  let lz = dx * sh - dz * ch;
  let ly = dy;
  // Pitch
  const sp = Math.sin(cam.pitch), cp = Math.cos(cam.pitch);
  const lz2 = lz * cp - ly * sp;
  ly = lz * sp + ly * cp; lz = lz2;
  // Roll
  const sr = Math.sin(cam.roll || 0), cr = Math.cos(cam.roll || 0);
  const lx2 = lx * cr - ly * sr;
  ly = lx * sr + ly * cr; lx = lx2;
  if (lz < 2) return null;
  const f = (h * 0.9) / Math.tan(0.42);
  return { x: w / 2 + (lx / lz) * f, y: h / 2 - (ly / lz) * f, scale: f / lz, depth: lz };
}

export function horizonY(cam, h) {
  return h / 2 + Math.tan(cam.pitch) * h * 0.9;
}

export { ISLANDS, RINGS, WORLD };
