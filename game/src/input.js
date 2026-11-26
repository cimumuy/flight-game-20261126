// input.js - keyboard state, latched presses, and mouse for the game.
export class Input {
  constructor(canvas) {
    this.down = new Set();
    this.latched = new Set();
    this.mouse = { x: 0.5, y: 0.5, down: false, clicked: false };
    addEventListener("keydown", (e) => {
      const k = e.key.toLowerCase();
      if (!this.down.has(k)) this.latched.add(k);
      this.down.add(k);
      if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(k)) e.preventDefault();
    });
    addEventListener("keyup", (e) => this.down.delete(e.key.toLowerCase()));
    addEventListener("blur", () => this.down.clear());
    if (canvas) {
      canvas.addEventListener("mousemove", (e) => {
        const r = canvas.getBoundingClientRect();
        this.mouse.x = (e.clientX - r.left) / Math.max(1, r.width);
        this.mouse.y = (e.clientY - r.top) / Math.max(1, r.height);
      });
      canvas.addEventListener("mousedown", () => { this.mouse.down = true; this.mouse.clicked = true; });
      addEventListener("mouseup", () => { this.mouse.down = false; });
    }
  }
  held(...keys) { return keys.some((k) => this.down.has(k)); }
  pressed(...keys) {
    for (const k of keys) if (this.latched.has(k)) { this.latched.delete(k); return true; }
    return false;
  }
  consumeClick() { const c = this.mouse.clicked; this.mouse.clicked = false; return c; }
  endFrame() { this.latched.clear(); }
}
