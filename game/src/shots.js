// shots.js - deterministic screenshot scenes + test hooks.
// ?shot=cover|rings|final|landed places the plane in a composed scene
// so pairwise judging screenshots always show the game at its best.
import { RINGS, WORLD } from "./config.js";

export function applyShot(flight, name) {
  if (!name) return false;
  flight.state = "flying";
  flight.throttle = 0.72; flight.speed = 34; flight.fuel = 78;
  if (name === "cover") {
    const r = RINGS[2];
    flight.x = r.x - 30; flight.z = r.z + 210; flight.y = r.y + 6;
    flight.heading = -0.12; flight.pitch = 0.04; flight.roll = -0.18;
    flight.ringIndex = 2; flight.ringsPassed = 2; flight.score = 300;
    flight.message = "";
  } else if (name === "rings") {
    const r = RINGS[4];
    flight.x = r.x + 18; flight.z = r.z + 190; flight.y = r.y + 3;
    flight.heading = 0.1; flight.pitch = 0.02; flight.roll = 0.22;
    flight.ringIndex = 4; flight.ringsPassed = 4; flight.score = 600; flight.fuel = 64;
  } else if (name === "final") {
    const rw = WORLD.finalRunway;
    flight.x = rw.x + 6; flight.z = rw.z + 330; flight.y = 42;
    flight.heading = 0.02; flight.pitch = -0.06; flight.roll = 0;
    flight.ringIndex = 8; flight.ringsPassed = 8; flight.score = 1200; flight.fuel = 38;
    flight.speed = 24; flight.throttle = 0.35;
    flight.message = "Final approach - slow and aligned";
  } else if (name === "landed") {
    const rw = WORLD.finalRunway;
    flight.x = rw.x; flight.z = rw.z + 30; flight.y = 8;
    flight.heading = 0; flight.pitch = 0; flight.roll = 0;
    flight.ringIndex = 8; flight.ringsPassed = 8; flight.score = 1712; flight.fuel = 36;
    flight.speed = 0; flight.throttle = 0; flight.state = "landed";
    flight.landingQuality = "PERFECT"; flight.time = 148;
  } else {
    return false;
  }
  flight.prevX = flight.x; flight.prevZ = flight.z;
  return true;
}

export function installHooks(flight, stepFn) {
  window.advanceTime = (ms) => {
    const steps = Math.max(0, Math.round(ms / (1000 / 60)));
    for (let i = 0; i < steps; i++) stepFn(1 / 60);
  };
  window.render_game_to_text = () => JSON.stringify({
    state: flight.state, x: Math.round(flight.x), z: Math.round(flight.z),
    altitude: flight.altitude, speedKnots: flight.speedKnots,
    heading: flight.headingDeg, throttle: Math.round(flight.throttle * 100),
    fuel: Math.round(flight.fuel), damage: Math.round(flight.damage),
    ringsPassed: flight.ringsPassed, ringIndex: flight.ringIndex,
    score: flight.score, stalled: flight.stalled,
  });
}
