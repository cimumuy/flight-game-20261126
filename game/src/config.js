// config.js - course layout and tuning constants for Archipelago Ring Run.
// World units are metres. X east, Z south, Y up. Heading 0 = north (-Z).

export const WORLD = {
  seaLevel: 0,
  startRunway: { x: 0, z: 900, heading: 0, length: 260, width: 22 },
  finalRunway: { x: -260, z: -2350, heading: 0, length: 300, width: 24 },
};

export const ISLANDS = [
  { name: "Home Island", x: 0, z: 950, r: 300, h: 26, volcano: false, village: true },
  { name: "Palm Cay", x: 260, z: 250, r: 150, h: 14, volcano: false, village: true },
  { name: "Terrace Island", x: -320, z: -250, r: 210, h: 34, volcano: false, village: true },
  { name: "Volcano Island", x: 180, z: -900, r: 260, h: 120, volcano: true, village: false },
  { name: "Twin Rocks", x: -420, z: -1450, r: 130, h: 18, volcano: false, village: false },
  { name: "Far Island", x: -260, z: -2400, r: 320, h: 24, volcano: false, village: true },
  { name: "South Sandbar", x: 520, z: 700, r: 110, h: 8, volcano: false, village: false },
  { name: "North Reef Isle", x: 420, z: -1900, r: 140, h: 12, volcano: false, village: true },
];

// Eight golden rings, flown in order from home toward Far Island.
export const RINGS = [
  { x: 40, z: 420, y: 70, r: 26 },
  { x: 220, z: 60, y: 80, r: 26 },
  { x: 60, z: -320, y: 95, r: 25 },
  { x: -260, z: -620, y: 110, r: 25 },
  { x: -120, z: -1050, y: 120, r: 24 },
  { x: 140, z: -1420, y: 105, r: 24 },
  { x: -180, z: -1780, y: 90, r: 24 },
  { x: -260, z: -2080, y: 70, r: 23 },
];

export const PHYS = {
  maxSpeed: 68,          // m/s at full throttle
  minThrottleSpeed: 9,
  stallSpeed: 17,
  accel: 14,
  drag: 0.16,
  turnRate: 0.85,        // rad/s at full bank
  maxBank: 0.95,         // rad
  pitchRate: 0.75,
  maxPitch: 0.5,
  climbFactor: 9.5,
  gravitySink: 3.2,
  fuelStart: 100,
  fuelBurn: 0.55,        // per second at full throttle
  groundY: 6,            // island plateau height near runways
};

export const COLOURS = {
  skyTop: "#2e6da8",
  skyMid: "#e8a56b",
  skyLow: "#f7d9a0",
  sun: "#fff3c4",
  sea: "#1d6f77",
  seaDeep: "#14525e",
  sand: "#ecd28a",
  grass: "#5d9c4e",
  terrace: "#7fb069",
  rock: "#8a7360",
  volcano: "#6e5546",
  lava: "#ff7b33",
  village: "#f2e6c9",
  roof: "#c95d3c",
  gold: "#ffc93c",
  goldDim: "#9c7c2e",
  runway: "#4a4a52",
  runwayLine: "#ffffff",
  planeBody: "#f4f1e6",
  planeTrim: "#d64533",
  panel: "#20242c",
  panelLit: "#ffd76a",
};

export const SCORE = {
  perRing: 150,
  landingPerfect: 300,
  landingOk: 150,
  fuelBonusPerUnit: 4,
};
