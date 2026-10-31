import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { access, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import net from "node:net";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const projectRoot = resolve(import.meta.dirname, "..");
const edgeCandidates = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
];

const delay = (milliseconds) => new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds));

async function availablePort() {
  return new Promise((resolvePort, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      server.close(() => resolvePort(address.port));
    });
  });
}

async function firstExistingPath(paths) {
  for (const path of paths) {
    try {
      await access(path);
      return path;
    } catch {
      // Try the next known installation path.
    }
  }
  throw new Error("Microsoft Edge was not found in a standard installation directory.");
}

async function waitForJson(url, timeoutMilliseconds = 20_000) {
  const deadline = Date.now() + timeoutMilliseconds;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return response.json();
      lastError = new Error(`${url} returned HTTP ${response.status}.`);
    } catch (error) {
      lastError = error;
    }
    await delay(150);
  }
  throw lastError ?? new Error(`Timed out waiting for ${url}.`);
}

async function waitForHttp(url, timeoutMilliseconds = 20_000) {
  const deadline = Date.now() + timeoutMilliseconds;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
      lastError = new Error(`${url} returned HTTP ${response.status}.`);
    } catch (error) {
      lastError = error;
    }
    await delay(150);
  }
  throw lastError ?? new Error(`Timed out waiting for ${url}.`);
}

async function connectCdp(webSocketUrl) {
  const socket = new WebSocket(webSocketUrl);
  await new Promise((resolveOpen, reject) => {
    socket.addEventListener("open", resolveOpen, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });

  let nextId = 1;
  const pending = new Map();
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (!message.id || !pending.has(message.id)) return;
    const { resolveRequest, rejectRequest } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) rejectRequest(new Error(message.error.message));
    else resolveRequest(message.result);
  });

  const call = (method, params = {}) => new Promise((resolveRequest, rejectRequest) => {
    const id = nextId;
    nextId += 1;
    pending.set(id, { resolveRequest, rejectRequest });
    socket.send(JSON.stringify({ id, method, params }));
  });

  return { call, close: () => socket.close() };
}

async function waitForPage(cdp) {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    const evaluation = await cdp.call("Runtime.evaluate", {
      expression: `document.readyState === "complete"
        && document.querySelector("[data-logo]")?.naturalWidth > 0
        && document.querySelector(".hero-slideshow")?.classList.contains("is-ready")`,
      returnByValue: true,
    });
    if (evaluation.result.value === true) return;
    await delay(100);
  }
  throw new Error("Timed out waiting for the localized page, its logo, and slideshow photos.");
}

async function evaluate(cdp, expression) {
  const response = await cdp.call("Runtime.evaluate", { expression, returnByValue: true });
  assert(!response.exceptionDetails, `Browser evaluation failed: ${response.exceptionDetails?.text}`);
  return response.result.value;
}

async function validateSlideshow(cdp) {
  const photos = await evaluate(cdp, `Array.from(document.querySelectorAll(".slideshow-slide"), (image) => ({
    loaded: image.complete && image.naturalWidth > 0,
    description: image.alt,
    duration: getComputedStyle(image).animationDuration,
  }))`);
  assert.equal(photos.length, 8, "The slideshow must contain all eight supplied photographs.");
  assert(photos.every((photo) => photo.loaded && photo.description && photo.duration === "12s"));

  const pausedAt = await evaluate(cdp, `(() => {
    document.querySelector(".slideshow-pause").click();
    return document.querySelector(".slideshow-slide").getAnimations()[0].currentTime;
  })()`);
  await delay(100);
  const paused = await evaluate(cdp, `(() => {
    const image = document.querySelector(".slideshow-slide");
    return { time: image.getAnimations()[0].currentTime, state: getComputedStyle(image).animationPlayState };
  })()`);
  assert.equal(paused.state, "paused");
  // A pending pause may settle on the next animation frame.
  assert(Math.abs(paused.time - pausedAt) < 50, "The pause control did not stop the slideshow.");
  await evaluate(cdp, 'document.querySelector(".slideshow-pause").click()');
  const resumedAt = await evaluate(cdp, 'document.querySelector(".slideshow-slide").getAnimations()[0].currentTime');
  await delay(100);
  const resumed = await evaluate(cdp, 'document.querySelector(".slideshow-slide").getAnimations()[0].currentTime');
  assert(resumed > resumedAt, "The play control did not resume the slideshow.");

  // Seek the real CSS animations through the entire loop. Check each 1.5 s
  // change, the 300 ms dissolve, and the last-to-first transition.
  for (let index = 0; index < 8; index += 1) {
    const result = await evaluate(cdp, `(() => {
      const images = Array.from(document.querySelectorAll(".slideshow-slide"));
      const sample = (time) => {
        for (const image of images) {
          const animation = image.getAnimations()[0];
          animation.pause();
          animation.currentTime = time;
        }
        return images.map((image) => {
          const style = getComputedStyle(image);
          return { opacity: Number(style.opacity), layer: Number(style.zIndex) };
        });
      };
      return { still: sample(${index * 1500 + 300}), dissolve: sample(${index * 1500 + 1350}) };
    })()`);
    assert(result.still[index].opacity > 0.99 && result.still[index].layer === 2,
      `Photograph ${index + 1} is out of sequence.`);
    const next = (index + 1) % 8;
    assert(result.dissolve[index].opacity > 0.99, "A dissolve exposed an empty frame.");
    assert(result.dissolve[next].opacity > 0.4 && result.dissolve[next].opacity < 0.6,
      `Missing smooth transition from photograph ${index + 1} to ${next + 1}.`);
  }
  await evaluate(cdp, `document.querySelectorAll(".slideshow-slide").forEach((image) => {
    image.getAnimations()[0].currentTime = 300;
  })`);
}

const previewPort = await availablePort();
const debuggingPort = await availablePort();
const profileDirectory = await mkdtemp(join(tmpdir(), "d3-glow-edge-"));
const edgePath = await firstExistingPath(edgeCandidates);
const viteScript = resolve(projectRoot, "node_modules", "vite", "bin", "vite.js");
const baseUrl = `http://127.0.0.1:${previewPort}`;

const preview = spawn(process.execPath, [
  viteScript,
  "preview",
  "--host",
  "127.0.0.1",
  "--port",
  String(previewPort),
  "--strictPort",
], {
  cwd: projectRoot,
  stdio: "ignore",
  windowsHide: true,
});

let edge;
let cdp;
try {
  await waitForHttp(`${baseUrl}/en/`);
  edge = spawn(edgePath, [
    "--headless=new",
    "--disable-extensions",
    "--disable-gpu",
    "--hide-scrollbars",
    "--no-first-run",
    `--remote-debugging-port=${debuggingPort}`,
    `--user-data-dir=${profileDirectory}`,
    `${baseUrl}/en/`,
  ], {
    stdio: "ignore",
    windowsHide: true,
  });

  await waitForJson(`http://127.0.0.1:${debuggingPort}/json/version`);
  const targets = await waitForJson(`http://127.0.0.1:${debuggingPort}/json`);
  const pageTarget = targets.find((target) => target.type === "page");
  assert(pageTarget?.webSocketDebuggerUrl, "Edge did not expose a debuggable page target.");

  cdp = await connectCdp(pageTarget.webSocketDebuggerUrl);
  await Promise.all([
    cdp.call("Page.enable"),
    cdp.call("Runtime.enable"),
  ]);

  const cases = [320, 390, 1440].flatMap((width) => (
    ["/es/", "/en/"].map((path) => ({ width, path }))
  ));
  const screenshotDirectory = resolve(projectRoot, "artifacts", "screenshots", "slideshow");
  await mkdir(screenshotDirectory, { recursive: true });

  for (const testCase of cases) {
    await cdp.call("Emulation.setDeviceMetricsOverride", {
      width: testCase.width,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await cdp.call("Page.navigate", { url: `${baseUrl}${testCase.path}` });
    await waitForPage(cdp);

    const evaluation = await cdp.call("Runtime.evaluate", {
      expression: `(() => {
        const logo = document.querySelector("[data-logo]");
        const fallback = document.querySelector(".brand-placeholder");
        const header = document.querySelector(".site-header");
        const headerRect = header.getBoundingClientRect();
        return {
          innerWidth,
          scrollWidth: document.documentElement.scrollWidth,
          bodyWidth: document.body.scrollWidth,
          logoHidden: logo.hidden,
          logoNaturalWidth: logo.naturalWidth,
          fallbackHidden: fallback.hidden,
          headerLeft: headerRect.left,
          headerRight: headerRect.right,
        };
      })()`,
      returnByValue: true,
    });
    const metrics = evaluation.result.value;

    assert(metrics.scrollWidth <= metrics.innerWidth + 1, `Horizontal overflow at ${testCase.width}px.`);
    assert(metrics.bodyWidth <= metrics.innerWidth + 1, `Body overflow at ${testCase.width}px.`);
    assert.equal(metrics.logoHidden, false, `Logo is hidden at ${testCase.width}px.`);
    assert(metrics.logoNaturalWidth > 0, `Logo failed to load at ${testCase.width}px.`);
    assert.equal(metrics.fallbackHidden, true, `Text fallback is duplicated at ${testCase.width}px.`);
    assert(metrics.headerLeft >= -1 && metrics.headerRight <= metrics.innerWidth + 1,
      `Header exceeds the viewport at ${testCase.width}px.`);

    await validateSlideshow(cdp);
    const screenshot = await cdp.call("Page.captureScreenshot", { format: "png" });
    await writeFile(join(screenshotDirectory, `${testCase.path.split("/")[1]}-${testCase.width}.png`),
      Buffer.from(screenshot.data, "base64"));
    console.log(`${testCase.path} ${testCase.width}px: no overflow, eight photos, 1.5 s cadence, smooth loop, pause/play passed.`);
  }

  await cdp.call("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-reduced-motion", value: "reduce" }],
  });
  const reduced = await evaluate(cdp, `({
    animations: Array.from(document.querySelectorAll(".slideshow-slide"), (image) => getComputedStyle(image).animationName),
    opacity: Array.from(document.querySelectorAll(".slideshow-slide"), (image) => Number(getComputedStyle(image).opacity)),
    control: getComputedStyle(document.querySelector(".slideshow-pause")).display,
  })`);
  assert(reduced.animations.every((name) => name === "none"));
  assert.deepEqual(reduced.opacity, [1, 0, 0, 0, 0, 0, 0, 0]);
  assert.equal(reduced.control, "none");
  console.log("Reduced motion passed: a static first photograph replaces the animation.");
} finally {
  cdp?.close();
  edge?.kill();
  preview.kill();
  await delay(500);
  await rm(profileDirectory, { recursive: true, force: true, maxRetries: 4, retryDelay: 250 });
}

console.log("Browser check passed in both languages at 320px, 390px, and 1440px.");
