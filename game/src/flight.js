// flight.js - flight model and mission state machine for Kakatua-1.
import { PHYS, RINGS, WORLD, SCORE } from "./config.js";
import { groundHeightAt } from "./world.js";

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export class Flight {
  constructor() { this.reset(); }
  reset() {
    const r = WORLD.startRunway;
    this.x = r.x; this.z = r.z + 90; this.y = PHYS.groundY + 2;
    this.heading = 0; this.pitch = 0; this.roll = 0;
    this.speed = 0; this.throttle = 0; this.vspeed = 0;
    this.fuel = PHYS.fuelStart; this.damage = 0;
    this.state = "ready"; this.ringIndex = 0; this.ringsPassed = 0;
    this.time = 0; this.score = 0; this.stalled = false;
    this.landingQuality = ""; this.message = "";
    this.prevZ = this.z; this.prevX = this.x;
    this.propAngle = 0; this.stallBeepTimer = 0;
    // Takeoff grace: false until the plane has genuinely flown (climbed
    // well clear of the ground) since the last reset. While false, runway
    // plateau contact is pure rolling - pitch input on the ground roll can
    // never damage the hull. Set in update(), cleared only here.
    this.hasAirborne = false;
  }
  get altitude() { return Math.max(0, Math.round(this.y - groundHeightAt(this.x, this.z))); }
  get headingDeg() { return Math.round(((this.heading * 180 / Math.PI) % 360 + 360) % 360); }
  get speedKnots() { return Math.round(this.speed * 1.94); }

  start() { if (this.state === "ready") this.state = "flying"; }

  update(dt, input, audio) {
    if (this.state !== "flying") return;
    this.time += dt;
    // Throttle
    // Throttle: Shift / Ctrl or + / -
    if (input.held("shift", "+", "=")) this.throttle = clamp(this.throttle + dt * 0.7, 0, 1);
    if (input.held("control", "-", "_")) this.throttle = clamp(this.throttle - dt * 0.7, 0, 1);
    // Pitch: W/S or Up/Down (W / Up = climb)
    let pitchIn = 0;
    if (input.held("w", "arrowup")) pitchIn += 1;
    if (input.held("s", "arrowdown")) pitchIn -= 1;
    // Mouse gentle steering
    const mx = (input.mouse.x - 0.5) * 2, my = (input.mouse.y - 0.5) * 2;
    let turnIn = 0;
    if (input.held("a", "arrowleft")) turnIn -= 1;
    if (input.held("d", "arrowright")) turnIn += 1;
    turnIn += mx * 0.35;
    pitchIn += -my * 0.3;
    const targetRoll = clamp(turnIn, -1, 1) * PHYS.maxBank;
    this.roll += (targetRoll - this.roll) * Math.min(1, dt * 4);
    this.heading += Math.sin(this.roll) * PHYS.turnRate * dt * (this.speed > 4 ? 1 : 0.25);
    const targetPitch = clamp(pitchIn, -1, 1) * PHYS.maxPitch;
    this.pitch += (targetPitch - this.pitch) * Math.min(1, dt * 3.2);
    // Speed
    const targetSpeed = PHYS.minThrottleSpeed + this.throttle * (PHYS.maxSpeed - PHYS.minThrottleSpeed);
    this.speed += clamp(targetSpeed - this.speed, -PHYS.accel * dt, PHYS.accel * dt);
    this.speed -= this.pitch * 6 * dt;
    this.speed = clamp(this.speed, 0, PHYS.maxSpeed + 8);
    // Stall
    const airborne = this.y > groundHeightAt(this.x, this.z) + 3.5;
    this.stalled = airborne && this.speed < PHYS.stallSpeed;
    if (this.stalled) {
      this.pitch = Math.max(this.pitch - dt * 0.5, -0.45);
      this.stallBeepTimer -= dt;
      if (this.stallBeepTimer <= 0 && audio) { audio.stall(); this.stallBeepTimer = 0.45; }
    }
    // Vertical
    const lift = clamp((this.speed - PHYS.stallSpeed) / 22, 0, 1);
    this.vspeed = this.pitch * PHYS.climbFactor * lift - PHYS.gravitySink * (1 - lift) + (this.stalled ? -5 : 0);
    if (!airborne && this.speed < PHYS.stallSpeed) this.vspeed = Math.max(0, this.pitch * 4 * (this.speed / PHYS.stallSpeed));
    // Move (forward = sin(heading), -cos(heading))
    this.prevX = this.x; this.prevZ = this.z;
    this.x += Math.sin(this.heading) * this.speed * dt;
    this.z += -Math.cos(this.heading) * this.speed * dt;
    this.y += this.vspeed * dt;
    // Genuine liftoff: only latch once the plane is well clear of the
    // ground (8 m above it), far beyond any bounce height during the
    // takeoff roll, so a pitch-held roll never trips this early.
    if (!this.hasAirborne && this.y > groundHeightAt(this.x, this.z) + 8) this.hasAirborne = true;
    this.propAngle += dt * (4 + this.throttle * 40);
    // Fuel
    this.fuel = Math.max(0, this.fuel - dt * PHYS.fuelBurn * (0.25 + this.throttle));
    if (this.fuel <= 0) { this.throttle = 0; this.message = "Out of fuel - glide to a landing!"; }
    this.checkRings(audio);
    this.checkGround(audio);
  }

  checkRings(audio) {
    if (this.ringIndex >= RINGS.length) return;
    const ring = RINGS[this.ringIndex];
    // Ring plane is roughly facing the course (normal along Z here).
    const crossed = (this.prevZ - ring.z) * (this.z - ring.z) <= 0 && this.prevZ !== this.z;
    if (crossed || Math.hypot(this.x - ring.x, this.z - ring.z) < 6) {
      const d = Math.hypot(this.x - ring.x, this.y - ring.y);
      if (d < ring.r) {
        this.ringsPassed++; this.ringIndex++; this.score += SCORE.perRing;
        this.message = "Ring " + this.ringsPassed + " of " + RINGS.length + "!";
        if (audio) audio.ring();
      } else if (crossed && Math.abs(this.z - ring.z) < 4 && d < ring.r * 2.4) {
        this.message = "Missed the ring - circle back!";
        // Allow retry: do not advance; crossing back will re-trigger.
      }
    }
  }

  checkGround(audio) {
    const g = groundHeightAt(this.x, this.z);
    const floorY = g + 2;
    if (this.y > floorY) return;
    this.y = floorY;
    const nearFinal = Math.hypot(this.x - WORLD.finalRunway.x, this.z - WORLD.finalRunway.z) < 190;
    const nearStart = Math.hypot(this.x - WORLD.startRunway.x, this.z - WORLD.startRunway.z) < 190;
    const onIslandPlateau = g > 2;
    const descent = -this.vspeed;
    if ((nearFinal || nearStart) && onIslandPlateau) {
      const hdgErr = Math.abs(((this.headingDeg + 540) % 360) - 180 - 180); // 0 when heading ~0/360
      const aligned = this.headingDeg < 28 || this.headingDeg > 332;
      if (nearFinal && this.ringIndex >= RINGS.length && aligned && descent < 4.5 && this.speed < 34) {
        this.state = "landed";
        this.landingQuality = descent < 2.2 && this.speed < 26 ? "PERFECT" : "SAFE";
        this.score += (this.landingQuality === "PERFECT" ? SCORE.landingPerfect : SCORE.landingOk)
          + Math.round(this.fuel) * SCORE.fuelBonusPerUnit - Math.round(this.damage);
        if (audio) audio.thud();
        return;
      }
      // Takeoff grace: until the plane has genuinely flown since reset,
      // plateau contact is always pure rolling - no bounce damage and no
      // ground-impact crash from this branch, whatever the pitch input.
      if (!this.hasAirborne) {
        this.vspeed = 0; // still on the takeoff roll
        if (nearFinal && this.ringIndex < RINGS.length) this.message = "Land here only after all 8 rings!";
        return;
      }
      if (this.speed < PHYS.stallSpeed + 2 && this.vspeed <= 0.5) {
        this.vspeed = 0; // rolling on ground / taking off again
        if (nearFinal && this.ringIndex < RINGS.length) this.message = "Land here only after all 8 rings!";
        return;
      }
      if (descent > 7 || this.speed > 42) { this.crash(audio, "Hard impact on the ground."); return; }
      this.damage += descent * 3; this.vspeed = Math.abs(this.vspeed) * 0.25;
      if (this.damage >= 100) { this.crash(audio, "The airframe gave up."); return; }
      return;
    }
    // Water / rough terrain
    if (g <= 2 && this.y <= 2.5) { this.crash(audio, "Ditched in the sea."); return; }
    if (descent > 6) { this.crash(audio, "Struck the hillside."); return; }
    this.damage += 18; this.vspeed = Math.abs(this.vspeed) * 0.3;
    if (this.damage >= 100) this.crash(audio, "The airframe gave up.");
  }

  crash(audio, why) {
    if (this.state !== "flying") return;
    this.state = "crashed"; this.damage = 100; this.message = why;
    this.score = Math.max(0, this.score - 100);
    if (audio) audio.crash();
  }
}
