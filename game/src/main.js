// main.js - wires input, flight, world rendering, audio and shots.
// Fixed-timestep loop: simulation always steps at 60 Hz.
import { Input } from "./input.js";
import { GameAudio } from "./audio.js";
import { Flight } from "./flight.js";
import { Renderer } from "./render.js";
import { applyShot, installHooks } from "./shots.js";

const canvas = document.getElementById("game");
const input = new Input(canvas);
const audio = new GameAudio();
const flight = new Flight();
const renderer = new Renderer(canvas);

const params = new URLSearchParams(location.search);
const isShot = applyShot(flight, params.get("shot"));

function step(dt) {
  // Global keys handled in the frame loop too, but step keeps
  // advanceTime() deterministic for screenshots.
  flight.update(dt, input, audio);
}

installHooks(flight, step);

function handleKeys() {
  if (input.pressed("m")) audio.toggleMute();
  if (input.pressed("r")) { flight.reset(); if (isShot) applyShot(flight, params.get("shot")); }
  if (flight.state === "ready" && (input.pressed("enter", " ") || input.consumeClick())) {
    audio.ensure(); flight.start();
  }
  // Pause toggles only between flying and paused, never from end screens.
  if (flight.state === "flying" && input.pressed("p", "escape")) flight.state = "paused";
  else if (flight.state === "paused" && input.pressed("p", "escape", "enter")) flight.state = "flying";
  if ((flight.state === "landed" || flight.state === "crashed") && input.consumeClick()) flight.reset();
}

// Losing tab focus mid-flight pauses instead of piling up dt.
document.addEventListener("visibilitychange", () => {
  if (document.hidden && flight.state === "flying") flight.state = "paused";
});

let last = performance.now();
let acc = 0;
const STEP = 1000 / 60;
let simSteps = 0;

function frame(now) {
  requestAnimationFrame(frame);
  let elapsed = now - last; last = now;
  if (elapsed > 250) elapsed = 250; // clamp: a stalled tab never fast-forwards
  acc += elapsed;
  handleKeys();
  while (acc >= STEP) {
    if (flight.state !== "paused") { step(STEP / 1000); simSteps++; }
    acc -= STEP;
  }
  // Engine sound follows the live state once per frame, not per step.
  audio.setEngine(flight.throttle, flight.state === "flying");
  renderer.draw(flight, input);
  input.endFrame();
}

requestAnimationFrame(frame);
