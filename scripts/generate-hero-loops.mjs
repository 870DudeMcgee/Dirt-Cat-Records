import { createRequire } from "module";
import { spawnSync } from "child_process";
import { readFile, writeFile } from "fs/promises";
import path from "path";
import os from "os";

const require = createRequire(import.meta.url);
const { fal } = require(
  path.join(
    os.homedir(),
    "Desktop/scripts/fal-node/node_modules/@fal-ai/client"
  )
);

function loadKey() {
  const result = spawnSync(
    "bash",
    [
      "-lc",
      'source "$HOME/Desktop/scripts/load-fal-keychain.sh" >/dev/null && printf %s "$FAL_KEY"',
    ],
    { encoding: "utf8" }
  );
  if (result.status !== 0 || !result.stdout) {
    throw new Error("Keychain FAL_KEY miss");
  }
  return result.stdout.trim();
}

const root = path.resolve(import.meta.dirname, "..");
const roomPath = path.join(root, "prototypes/home/media/room.jpg");
const outDir = path.join(root, "prototypes/home/media");
const endpoint = "fal-ai/kling-video/v3/standard/image-to-video";

const negative =
  "big camera move, whip pan, crash zoom, glitch, lens flare, text, subtitles, watermark, waveform, plugin interface, neon overlay, morphing room, warped furniture, extra objects, flickering storm, people walking through, face, cinematic promo";

const variants = [
  {
    id: "alive",
    file: "hero-alive.mp4",
    prompt:
      "A quiet real recording studio, already occupied by the work. Very slow subtle camera push-in only. The computer screen changes gently, as if a session is open. Practical lamps and small rack lights breathe softly. The hanging headphone cable sways a little. Keep the exact room, furniture, and framing. No people. Restrained, believable, loopable.",
  },
  {
    id: "operator",
    file: "hero-operator.mp4",
    prompt:
      "A quiet real recording studio. Very slow subtle camera push-in. One human hand enters briefly from the right, touches the mouse or one knob, then leaves so the room is empty again. The screen moves gently. Practical lights breathe softly. The hanging headphone cable sways a little. Keep the exact room and framing. No face. No second person. Restrained and loopable.",
  },
  {
    id: "energy",
    file: "hero-energy.mp4",
    prompt:
      "A quiet recording studio that is awake before a session. Slow gentle camera drift, not a sweep. The screen moves. The stool shifts a tiny amount. The hanging headphone cable sways. Small LEDs and practical lights change softly. One knob or fader moves slightly. Keep the exact room and framing. No people. No drama. Loopable.",
  },
];

const key = loadKey();
fal.config({ credentials: key });

const bytes = await readFile(roomPath);
const imageUrl = await fal.storage.upload(
  new File([bytes], "room.jpg", { type: "image/jpeg" })
);
console.log(JSON.stringify({ uploaded: true, roomBytes: bytes.length }));

async function makeOne(variant) {
  console.log(JSON.stringify({ start: variant.id }));
  const result = await fal.subscribe(endpoint, {
    input: {
      prompt: variant.prompt,
      start_image_url: imageUrl,
      end_image_url: imageUrl,
      duration: "8",
      generate_audio: false,
      cfg_scale: 0.5,
      shot_type: "customize",
      negative_prompt: negative,
    },
    logs: false,
  });
  const videoUrl = result?.data?.video?.url || result?.video?.url;
  if (!videoUrl) {
    throw new Error(variant.id + " missing video url");
  }
  const response = await fetch(videoUrl);
  if (!response.ok) {
    throw new Error(variant.id + " download " + response.status);
  }
  const filePath = path.join(outDir, variant.file);
  const body = Buffer.from(await response.arrayBuffer());
  await writeFile(filePath, body);
  console.log(
    JSON.stringify({ done: variant.id, bytes: body.length, file: variant.file })
  );
  return variant.file;
}

const settled = await Promise.allSettled(variants.map(makeOne));
const report = settled.map((item, index) => ({
  id: variants[index].id,
  status: item.status,
  value:
    item.status === "fulfilled"
      ? item.value
      : String(
          item.reason && item.reason.message ? item.reason.message : item.reason
        ),
}));
console.log(JSON.stringify({ report }, null, 2));
if (report.some((item) => item.status !== "fulfilled")) {
  process.exit(1);
}
