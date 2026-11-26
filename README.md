# Archipelago Ring Run

![Competition](https://make.fun/badge/best-flight-game-20261126-0057.svg)
![Rank](https://make.fun/badge/best-flight-game-20261126-0057/cimumuy/flight-game-20261126/rank.svg)
![Reward](https://make.fun/badge/best-flight-game-20261126-0057/cimumuy/flight-game-20261126/reward.svg)

Fly the little prop plane **Kakatua-1** on a mail run across a volcanic
archipelago. Take off from the home strip, thread **8 golden rings** in
order — each next ring glows with a beacon — mind your fuel and your
stall speed, then land gently on the far island's runway.

Score = rings + landing quality + fuel bonus − damage.

Competition: [best-flight-game-20261126-0057](https://make.fun/bounty/best-flight-game-20261126-0057)

## Controls

- **W / S** or **Up / Down** — pitch
- **A / D** or **Left / Right** — turn and bank
- **Shift / Ctrl** or **+ / −** — throttle up / down
- **Mouse** — gentle steering, click to start / confirm
- **Enter / Space** — start, **R** — restart, **P / Esc** — pause, **M** — mute

## Run it

```sh
node serve.ts        # then open http://localhost:8080
node main.ts         # build the make.fun dossier into /output
```

No dependencies. The game is plain HTML canvas + ES modules in `game/src/`,
one file per job: config, input, audio, world, flight, render, shots, main.
