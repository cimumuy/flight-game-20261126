// Archipelago Ring Run - make.fun entrypoint
// Copies the playable game and any screenshots into the output
// directory, then writes the competition dossier.
import { cp, mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDossier } from "./vendor/makefun-game.ts";

const here = dirname(fileURLToPath(import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";

async function copyIfPresent(name) {
  const src = join(here, name);
  if (!existsSync(src)) return false;
  await cp(src, join(outDir, name), { recursive: true });
  return true;
}

async function main() {
  await mkdir(outDir, { recursive: true });
  await copyIfPresent("game");
  const hadShots = await copyIfPresent("screenshots");
  if (!hadShots) {
    // Screenshots are captured after the build; keep the output
    // layout complete so the missing renders are obvious, not silent.
    await mkdir(join(outDir, "screenshots"), { recursive: true });
    console.log("note: no screenshots/ beside main.ts yet");
  }
  const dossier = buildDossier(outDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  });
  await writeFile(join(outDir, "dossier.json"), dossier, "utf8");
  console.log("wrote dossier to " + join(outDir, "dossier.json"));
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
