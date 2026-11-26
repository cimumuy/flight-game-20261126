// render.js - canvas renderer: one warm late-afternoon style.
// Chase view over the archipelago, a built-looking prop plane, and a
// cockpit frame with lit instruments along the bottom of the screen.
import { COLOURS as C, ISLANDS, RINGS, WORLD } from "./config.js";
import { project, makeCamera, groundHeightAt } from "./world.js";

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function poly(ctx, pts, fill) {
  if (pts.some((p) => !p)) return;
  ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
}

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas; this.ctx = canvas.getContext("2d");
    this.clouds = [];
    for (let i = 0; i < 26; i++) this.clouds.push({ x: (i * 733 % 4000) - 2000, y: 150 + (i * 37 % 120), z: (i * 911 % 5000) - 3200, s: 40 + (i * 53 % 70) });
  }

  draw(flight, input) {
    const { ctx, canvas } = this; const w = canvas.width, h = canvas.height;
    const cam = makeCamera(flight);
    this.drawSky(cam, w, h);
    this.drawSea(cam, w, h);
    this.drawIslands(cam, w, h);
    this.drawRunway(cam, WORLD.startRunway, w, h);
    this.drawRunway(cam, WORLD.finalRunway, w, h);
    this.drawRings(cam, flight, w, h);
    this.drawPlane(flight, w, h);
    this.drawCockpit(flight, w, h);
    if (flight.state === "ready") this.drawStart(flight, w, h);
    if (flight.state === "paused") this.drawCentred(w, h, "PAUSED", "Press P or Esc to resume");
    if (flight.state === "landed") this.drawEnd(flight, w, h, true);
    if (flight.state === "crashed") this.drawEnd(flight, w, h, false);
  }

  drawSky(cam, w, h) {
    const { ctx } = this; const horizon = h * 0.52 + Math.tan(cam.pitch) * h * 0.7;
    const g = ctx.createLinearGradient(0, 0, 0, Math.max(1, horizon));
    g.addColorStop(0, C.skyTop); g.addColorStop(0.7, C.skyMid); g.addColorStop(1, C.skyLow);
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, Math.max(0, horizon));
    // Sun, low in the west (left of the course)
    ctx.fillStyle = C.sun; ctx.beginPath(); ctx.arc(w * 0.2, horizon - h * 0.24, 30, 0, 7); ctx.fill();
    ctx.fillStyle = "rgba(255,243,196,0.35)"; ctx.beginPath(); ctx.arc(w * 0.2, horizon - h * 0.24, 52, 0, 7); ctx.fill();
    // Clouds
    ctx.fillStyle = "rgba(255,250,238,0.9)";
    for (const cl of this.clouds) {
      const p = project(cam, cl.x, cl.y, cl.z, w, h); if (!p) continue;
      const s = clamp(p.scale * cl.s * 0.14, 4, 90);
      ctx.beginPath(); ctx.ellipse(p.x, p.y, s, s * 0.32, 0, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.ellipse(p.x + s * 0.5, p.y + 3, s * 0.6, s * 0.24, 0, 0, 7); ctx.fill();
    }
    this.horizon = horizon;
  }

  drawSea(cam, w, h) {
    const { ctx } = this; const horizon = this.horizon ?? h * 0.52;
    const g = ctx.createLinearGradient(0, horizon, 0, h);
    g.addColorStop(0, C.sea); g.addColorStop(1, C.seaDeep);
    ctx.fillStyle = g; ctx.fillRect(0, horizon, w, h - horizon);
    ctx.strokeStyle = "rgba(255,255,255,0.14)"; ctx.lineWidth = 1;
    for (let i = 0; i < 7; i++) {
      const y = horizon + ((i * 53 + 20) / 400) * (h - horizon);
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }
  }

  drawIslands(cam, w, h) {
    const { ctx } = this;
    const sorted = [...ISLANDS].sort((a, b) =>
      Math.hypot(b.x - cam.x, b.z - cam.z) - Math.hypot(a.x - cam.x, a.z - cam.z));
    for (const isl of sorted) {
      const base = project(cam, isl.x, 0, isl.z, w, h); if (!base) continue;
      const edge = project(cam, isl.x + isl.r, 0, isl.z, w, h);
      const rw = edge ? Math.abs(edge.x - base.x) : base.scale * isl.r * 0.1;
      if (rw < 6) continue;
      const topY = project(cam, isl.x, isl.h, isl.z, w, h);
      const top = topY ? topY.y : base.y - rw * 0.2;
      // Sand beach + grass body
      ctx.fillStyle = C.sand; ctx.beginPath(); ctx.ellipse(base.x, base.y, rw, rw * 0.16, 0, 0, 7); ctx.fill();
      ctx.fillStyle = C.grass; ctx.beginPath(); ctx.ellipse(base.x, base.y - (base.y - top) * 0.4, rw * 0.82, rw * 0.13, 0, 0, 7); ctx.fill();
      if (isl.volcano) {
        const peak = project(cam, isl.x, isl.h + 26, isl.z, w, h);
        if (peak) {
          poly(ctx, [project(cam, isl.x - isl.r * 0.55, isl.h * 0.3, isl.z, w, h), peak,
            project(cam, isl.x + isl.r * 0.55, isl.h * 0.3, isl.z, w, h)], C.volcano);
          ctx.fillStyle = C.lava; ctx.beginPath(); ctx.ellipse(peak.x, peak.y, rw * 0.13, rw * 0.035, 0, 0, 7); ctx.fill();
        }
      } else {
        // Terraced fields: stacked arcs on the slope
        ctx.strokeStyle = C.terrace; ctx.lineWidth = Math.max(1, rw * 0.03);
        for (let i = 1; i <= 3; i++) {
          ctx.beginPath(); ctx.ellipse(base.x, base.y - (base.y - top) * i * 0.22, rw * (0.72 - i * 0.13), rw * 0.09, 0, 0.15, Math.PI - 0.15); ctx.stroke();
        }
        // Palms
        ctx.strokeStyle = "#3f7a34"; ctx.lineWidth = Math.max(1, rw * 0.015);
        for (let i = 0; i < 4; i++) {
          const px = base.x + rw * (-0.5 + i * 0.3), py = base.y - (base.y - top) * 0.35;
          ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + 3, py - rw * 0.09); ctx.stroke();
          ctx.beginPath(); ctx.arc(px + 3, py - rw * 0.09, rw * 0.05, Math.PI, 0); ctx.stroke();
        }
      }
      if (isl.village) {
        ctx.fillStyle = C.village;
        for (let i = 0; i < 5; i++) {
          const vx = base.x + rw * (-0.45 + i * 0.22), vy = base.y - (base.y - top) * 0.3 + (i % 2) * 3;
          const s = Math.max(2, rw * 0.05);
          ctx.fillRect(vx, vy, s, s * 0.7);
          ctx.fillStyle = C.roof; ctx.fillRect(vx - 1, vy - s * 0.35, s + 2, s * 0.35); ctx.fillStyle = C.village;
        }
      }
      if (rw > 90) {
        ctx.fillStyle = "rgba(30,40,30,0.75)"; ctx.font = "600 13px system-ui";
        ctx.textAlign = "center"; ctx.fillText(isl.name, base.x, base.y + 16);
      }
    }
  }

  drawRunway(cam, rwDef, w, h) {
    const { ctx } = this; const L = rwDef.length, Wd = rwDef.width;
    const c = [[-Wd / 2, -L / 2], [Wd / 2, -L / 2], [Wd / 2, L / 2], [-Wd / 2, L / 2]]
      .map(([dx, dz]) => project(cam, rwDef.x + dx, 7, rwDef.z + dz, w, h));
    poly(ctx, c, C.runway);
    if (c.some((p) => !p)) return;
    // Centreline dashes + threshold bars + edge lights
    ctx.strokeStyle = C.runwayLine; ctx.lineWidth = 2; ctx.setLineDash([10, 10]);
    const a = project(cam, rwDef.x, 7, rwDef.z - L / 2, w, h), b = project(cam, rwDef.x, 7, rwDef.z + L / 2, w, h);
    if (a && b) { ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
    ctx.setLineDash([]);
    ctx.fillStyle = "#ffe27a";
    for (let i = 0; i <= 6; i++) {
      for (const side of [-1, 1]) {
        const p = project(cam, rwDef.x + side * (Wd / 2 + 2), 7, rwDef.z - L / 2 + i * L / 6, w, h);
        if (p) { ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(1.5, p.scale * 0.5), 0, 7); ctx.fill(); }
      }
    }
  }

  drawRings(cam, flight, w, h) {
    const { ctx } = this;
    RINGS.forEach((ring, i) => {
      if (i < flight.ringIndex) return; // already flown
      const p = project(cam, ring.x, ring.y, ring.z, w, h); if (!p) return;
      const rPx = p.scale * ring.r; if (rPx < 3 || rPx > w) return;
      const next = i === flight.ringIndex;
      ctx.strokeStyle = next ? C.gold : C.goldDim; ctx.lineWidth = next ? 6 : 3;
      ctx.beginPath(); ctx.ellipse(p.x, p.y, rPx, rPx * 0.92, 0, 0, 7); ctx.stroke();
      ctx.strokeStyle = "rgba(255,255,255,0.5)"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(p.x, p.y, rPx * 0.8, rPx * 0.72, 0, 0, 7); ctx.stroke();
      if (next) {
        // Beacon above the next ring + guide arrow label
        ctx.fillStyle = C.gold; ctx.beginPath(); ctx.arc(p.x, p.y - rPx - 14, 5 + Math.sin(performance.now() / 200) * 2, 0, 7); ctx.fill();
        ctx.font = "700 15px system-ui"; ctx.textAlign = "center";
        ctx.fillText("RING " + (i + 1), p.x, p.y - rPx - 26);
        const dist = Math.round(Math.hypot(flight.x - ring.x, flight.z - ring.z));
        ctx.font = "600 12px system-ui"; ctx.fillText(dist + " m", p.x, p.y + rPx + 20);
      }
    });
  }

  drawPlane(flight, w, h) {
    const { ctx } = this;
    const cx = w / 2, cy = h * 0.62;
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(flight.roll * 0.55);
    const s = 1 + clamp(flight.speed / 300, 0, 0.2);
    ctx.scale(s, s);
    // Shadow of wings / tail behind fuselage
    ctx.fillStyle = C.planeTrim;
    ctx.beginPath(); ctx.moveTo(-72, 8); ctx.lineTo(0, -4); ctx.lineTo(72, 8); ctx.lineTo(58, 20); ctx.lineTo(-58, 20); ctx.closePath(); ctx.fill(); // main wing
    ctx.fillStyle = C.planeBody;
    ctx.beginPath(); ctx.ellipse(0, 0, 20, 34, 0, 0, 7); ctx.fill(); // fuselage (top view-ish chase)
    ctx.fillStyle = C.planeTrim; ctx.beginPath(); ctx.ellipse(0, 26, 15, 12, 0, 0, 7); ctx.fill(); // tail cone
    ctx.fillStyle = C.planeBody;
    ctx.beginPath(); ctx.moveTo(-30, 30); ctx.lineTo(0, 22); ctx.lineTo(30, 30); ctx.lineTo(24, 40); ctx.lineTo(-24, 40); ctx.closePath(); ctx.fill(); // tailplane
    ctx.fillStyle = "#2b4a5e"; ctx.beginPath(); ctx.ellipse(0, -10, 10, 14, 0, 0, 7); ctx.fill(); // canopy
    // Spinning prop at the nose (top)
    ctx.strokeStyle = "rgba(40,40,40,0.8)"; ctx.lineWidth = 3;
    const a = flight.propAngle;
    ctx.beginPath(); ctx.moveTo(Math.cos(a) * -18, -36 + Math.sin(a) * 4); ctx.lineTo(Math.cos(a) * 18, -36 - Math.sin(a) * 4); ctx.stroke();
    ctx.fillStyle = "#333"; ctx.beginPath(); ctx.arc(0, -36, 4, 0, 7); ctx.fill();
    ctx.restore();
    if (flight.state === "crashed") {
      ctx.fillStyle = "rgba(255,110,40,0.5)"; ctx.beginPath(); ctx.arc(cx, cy, 46, 0, 7); ctx.fill();
    }
  }

  dial(cx, cy, r, frac, label, value, ctx) {
    ctx.fillStyle = "#11151c"; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.fill();
    ctx.strokeStyle = C.panelLit; ctx.lineWidth = 2; ctx.stroke();
    ctx.strokeStyle = "#e8e8e8";
    for (let i = 0; i <= 10; i++) {
      const a = Math.PI * 0.75 + i * Math.PI * 1.5 / 10;
      ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * r * 0.78, cy + Math.sin(a) * r * 0.78);
      ctx.lineTo(cx + Math.cos(a) * r * 0.92, cy + Math.sin(a) * r * 0.92); ctx.stroke();
    }
    const a = Math.PI * 0.75 + clamp(frac, 0, 1) * Math.PI * 1.5;
    ctx.strokeStyle = "#ff5d43"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * r * 0.72, cy + Math.sin(a) * r * 0.72); ctx.stroke();
    ctx.fillStyle = "#fff"; ctx.font = "700 " + Math.round(r * 0.42) + "px system-ui"; ctx.textAlign = "center";
    ctx.fillText(value, cx, cy + r * 0.62);
    ctx.fillStyle = C.panelLit; ctx.font = "600 " + Math.round(r * 0.3) + "px system-ui";
    ctx.fillText(label, cx, cy - r * 0.45);
  }

  drawCockpit(flight, w, h) {
    const { ctx } = this; const panelH = 148; const y0 = h - panelH;
    // Cockpit frame
    ctx.fillStyle = "rgba(24,28,36,0.92)"; ctx.fillRect(0, y0, w, panelH);
    ctx.fillStyle = "rgba(24,28,36,0.55)";
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(70, 0); ctx.lineTo(150, y0); ctx.lineTo(0, y0); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(w, 0); ctx.lineTo(w - 70, 0); ctx.lineTo(w - 150, y0); ctx.lineTo(w, y0); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "#0c0e12"; ctx.lineWidth = 3; ctx.strokeRect(-2, y0, w + 4, 3);
    // Attitude indicator (moving horizon ball)
    const ax = 110, ay = y0 + panelH / 2, ar = 52;
    ctx.save(); ctx.beginPath(); ctx.arc(ax, ay, ar, 0, 7); ctx.clip();
    ctx.translate(ax, ay); ctx.rotate(-flight.roll * 0.7);
    const off = flight.pitch * 90;
    ctx.fillStyle = "#3a7bd5"; ctx.fillRect(-ar, -ar + off, ar * 2, ar);
    ctx.fillStyle = "#8a5a2b"; ctx.fillRect(-ar, off, ar * 2, ar);
    ctx.strokeStyle = "#fff"; ctx.beginPath(); ctx.moveTo(-ar, off); ctx.lineTo(ar, off); ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = C.panelLit; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(ax, ay, ar, 0, 7); ctx.stroke();
    ctx.strokeStyle = "#ffd76a"; ctx.beginPath(); ctx.moveTo(ax - 18, ay); ctx.lineTo(ax + 18, ay); ctx.moveTo(ax, ay); ctx.lineTo(ax, ay + 8); ctx.stroke();
    ctx.fillStyle = C.panelLit; ctx.font = "600 11px system-ui"; ctx.textAlign = "center"; ctx.fillText("ATTITUDE", ax, ay + ar + 14);
    // Dials: airspeed + altimeter
    this.dial(250, ay, 46, flight.speed / 75, "SPD kt", String(flight.speedKnots), ctx);
    this.dial(380, ay, 46, flight.altitude / 220, "ALT m", String(flight.altitude), ctx);
    // Heading strip
    ctx.fillStyle = "#11151c"; ctx.fillRect(470, y0 + 26, 340, 42);
    ctx.strokeStyle = C.panelLit; ctx.strokeRect(470, y0 + 26, 340, 42);
    ctx.fillStyle = "#fff"; ctx.font = "700 20px system-ui"; ctx.textAlign = "center";
    const hdg = flight.headingDeg;
    for (let d = -40; d <= 40; d += 10) {
      const deg = ((hdg + d) % 360 + 360) % 360; const x = 640 + d * 4;
      ctx.fillText(String(Math.round(deg / 10) * 10 === 360 ? 0 : Math.round(deg / 10) * 10), x, y0 + 54);
    }
    ctx.fillStyle = "#ff5d43"; ctx.beginPath(); ctx.moveTo(640, y0 + 26); ctx.lineTo(634, y0 + 18); ctx.lineTo(646, y0 + 18); ctx.closePath(); ctx.fill();
    ctx.fillStyle = C.panelLit; ctx.font = "600 11px system-ui"; ctx.fillText("HEADING", 640, y0 + 84);
    // Big HUD readouts (right of panel)
    ctx.textAlign = "left"; ctx.fillStyle = "#fff"; ctx.font = "800 27px system-ui";
    ctx.fillText("ALT " + flight.altitude + " m", 850, y0 + 52);
    ctx.fillText("SPD " + flight.speedKnots + " kt", 850, y0 + 86);
    ctx.fillText("HDG " + String(hdg).padStart(3, "0") + "°", 850, y0 + 120);
    ctx.textAlign = "right"; ctx.font = "800 24px system-ui";
    ctx.fillText("RING " + flight.ringsPassed + "/8", w - 18, y0 + 52);
    ctx.font = "700 19px system-ui"; ctx.fillText("SCORE " + flight.score, w - 18, y0 + 82);
    ctx.fillText("THR " + Math.round(flight.throttle * 100) + "%", w - 18, y0 + 110);
    // Fuel + damage bars
    this.bar(w - 210, y0 + 122, 190, 10, flight.fuel / 100, "#57c84c", "FUEL", ctx);
    this.bar(470, y0 + 122, 190, 10, 1 - flight.damage / 100, "#e8b23a", "HULL", ctx);
    // Top objective + warnings
    ctx.textAlign = "center"; ctx.fillStyle = "rgba(10,16,24,0.55)"; ctx.fillRect(w / 2 - 330, 10, 660, 34);
    ctx.fillStyle = "#fff"; ctx.font = "700 17px system-ui";
    const obj = flight.ringIndex < 8 ? "Objective: fly through ring " + (flight.ringIndex + 1) + " of 8" : "Objective: land on Far Island runway";
    ctx.fillText(obj, w / 2, 33);
    if (flight.message) { ctx.font = "600 15px system-ui"; ctx.fillStyle = "#ffe27a"; ctx.fillText(flight.message, w / 2, 66); }
    if (flight.stalled) {
      ctx.fillStyle = "#ff3b30"; ctx.font = "900 30px system-ui";
      if (Math.floor(performance.now() / 350) % 2 === 0) ctx.fillText("STALL", w / 2, 110);
    }
    if (flight.fuel < 25 && flight.state === "flying") {
      ctx.fillStyle = "#ffb02e"; ctx.font = "800 16px system-ui"; ctx.fillText("LOW FUEL", w / 2, 92);
    }
  }

  bar(x, y, wdt, hgt, frac, colour, label, ctx) {
    ctx.fillStyle = "#11151c"; ctx.fillRect(x, y, wdt, hgt);
    ctx.fillStyle = colour; ctx.fillRect(x, y, wdt * clamp(frac, 0, 1), hgt);
    ctx.strokeStyle = "#888"; ctx.strokeRect(x, y, wdt, hgt);
    ctx.fillStyle = "#ddd"; ctx.font = "600 10px system-ui"; ctx.textAlign = "left"; ctx.fillText(label, x, y - 3);
  }

  drawCentred(w, h, title, sub) {
    const { ctx } = this;
    ctx.fillStyle = "rgba(8,14,22,0.62)"; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#fff"; ctx.textAlign = "center";
    ctx.font = "900 52px system-ui"; ctx.fillText(title, w / 2, h * 0.42);
    ctx.font = "600 20px system-ui"; ctx.fillText(sub, w / 2, h * 0.5);
  }

  drawStart(flight, w, h) {
    const { ctx } = this;
    ctx.fillStyle = "rgba(8,14,22,0.45)"; ctx.fillRect(0, 0, w, h - 148);
    ctx.textAlign = "center"; ctx.fillStyle = "#ffc93c";
    ctx.font = "900 58px system-ui"; ctx.fillText("ARCHIPELAGO RING RUN", w / 2, 120);
    ctx.fillStyle = "#fff"; ctx.font = "600 20px system-ui";
    ctx.fillText("Deliver the mail in Kakatua-1: thread 8 golden rings, then land on Far Island.", w / 2, 158);
    ctx.font = "500 18px system-ui"; ctx.textAlign = "left";
    const lines = [
      "Shift / Ctrl or + / -  -  throttle",
      "W / S or Up / Down     -  pitch (climb / dive)",
      "A / D or Left / Right  -  bank and turn",
      "Mouse                    -  gentle steering, click to start",
      "Enter / Space start -  P pause  -  R restart  -  M mute",
      "Watch your stall speed and fuel. Land slow, aligned, and gentle.",
    ];
    lines.forEach((ln, i) => ctx.fillText(ln, w / 2 - 300, 210 + i * 28));
    ctx.textAlign = "center"; ctx.fillStyle = "#ffc93c"; ctx.font = "800 24px system-ui";
    ctx.fillText("Press Enter or click to take off", w / 2, 420);
  }

  drawEnd(flight, w, h, landed) {
    const { ctx } = this;
    ctx.fillStyle = "rgba(8,14,22,0.6)"; ctx.fillRect(0, 0, w, h - 148);
    ctx.textAlign = "center";
    ctx.fillStyle = landed ? "#7be382" : "#ff6b5e";
    ctx.font = "900 54px system-ui";
    ctx.fillText(landed ? "DELIVERED! " + flight.landingQuality + " LANDING" : "CRASHED", w / 2, 150);
    ctx.fillStyle = "#fff"; ctx.font = "600 21px system-ui";
    if (!landed && flight.message) ctx.fillText(flight.message, w / 2, 190);
    const rows = [
      "Rings: " + flight.ringsPassed + " / 8",
      "Time: " + Math.round(flight.time) + " s",
      "Fuel left: " + Math.round(flight.fuel) + "%",
      "Damage: " + Math.round(flight.damage) + "%",
      "FINAL SCORE: " + flight.score,
    ];
    rows.forEach((r, i) => ctx.fillText(r, w / 2, 240 + i * 32));
    ctx.fillStyle = "#ffc93c"; ctx.font = "800 22px system-ui";
    ctx.fillText("Press R to fly again", w / 2, 430);
  }
}
