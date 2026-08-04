import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const COLORS = {
  bg: 0x05090c,
  cyan: 0x49d6e9,
  green: 0x57d68d,
  coral: 0xff6678,
  amber: 0xf4c65d,
  steel: 0x26343d,
  dark: 0x0d151a,
  white: 0xe8f0f4,
};

const laneColors = [
  0x49d6e9, 0x6ee7b7, 0xf4c65d, 0xff8a65,
  0xff6678, 0x7dd3fc, 0xa7f3d0, 0xfde68a,
];

const PATTERNS = [
  {
    id: "integrator",
    nav: "Интегратор",
    title: "Интегратор с утечкой",
    lead: "Серия слабых воздействий становится памятью; редкие следы исчезают.",
    description: "Тайл складывает согласованные импульсы и на каждом такте теряет часть состояния. FIRE возникает только тогда, когда накопление успевает обогнать утечку.",
    equation: "state ← decay_toward_zero(state + W × VSB)",
    detail: "../arch/personality-patterns/#интегратор-с-утечкой",
    create: createIntegrator,
  },
  {
    id: "corridor",
    nav: "Коридор",
    title: "Коридорный детектор",
    lead: "Слишком слабое и слишком сильное воздействие находятся по разные стороны смысла.",
    description: "Орган фиксируется не по правилу «больше порога», а только внутри signed-коридора. Перегруз способен пролететь выше рабочей области и не стать событием.",
    equation: "FIRE ⇔ thr_lo ≤ state ≤ thr_hi",
    detail: "../arch/personality-patterns/#коридорный-детектор",
    create: createCorridor,
  },
  {
    id: "hysteresis",
    nav: "Гистерезис",
    title: "Порог с гистерезисом",
    lead: "Одно прохождение уровня даёт одно событие, а не пачку дребезга.",
    description: "Верхний уровень вызывает FIRE и разоружает орган. Повторный выстрел запрещён, пока вход не вернётся ниже отдельного уровня взвода.",
    equation: "fire_level > rearm_level",
    detail: "../arch/personality-patterns/#порог-с-гистерезисом",
    create: createHysteresis,
  },
  {
    id: "chain",
    nav: "Цепочка",
    title: "Цепочка локального допуска",
    lead: "Предок передаёт потомку право слышать следующий кадр, но не собственные данные.",
    description: "Три условия предъявляются последовательно одной общей VSB. Потомок становится ACTIVE только после lock предка и проверяет уже новый кадр своими весами.",
    equation: "ACTIVE(child) ← locked_before(parent)",
    detail: "../arch/routing/#последовательность-во-времени",
    create: createChain,
  },
  {
    id: "competition",
    nav: "Домен",
    title: "Доменная конкуренция",
    lead: "Несколько объяснений достигают события, но наружу выходит один победитель.",
    description: "Параллельные органы слышат один кадр независимо. Если несколько ветвей фьюзятся одновременно, домен разрешает коллизию по фиксированному приоритету.",
    equation: "winner ← arg max(priority) among fired tiles",
    detail: "../arch/personality-patterns/#схождение-и-доменная-конкуренция",
    create: createCompetition,
  },
  {
    id: "reset",
    nav: "Reset",
    title: "Reset и восприимчивость",
    lead: "Одинаковый импульс после разной истории вызывает разную реакцию.",
    description: "Два одинаковых органа получают одинаковую предысторию. Один сохраняет накопление, второй сбрасывается. Финальный тестовый импульс одинаков, но FIRE зависит от прожитого состояния.",
    equation: "response = F(stimulus, state, decay, reset history)",
    detail: "../arch/personality-patterns/#сброс-как-управление-восприимчивостью",
    create: createResetSusceptibility,
  },
];

const dom = {
  nav: document.querySelector("#pattern-nav"),
  scene: document.querySelector("#scene"),
  fallback: document.querySelector("#webgl-fallback"),
  index: document.querySelector("#pattern-index"),
  title: document.querySelector("#pattern-title"),
  lead: document.querySelector("#pattern-lead"),
  description: document.querySelector("#pattern-description"),
  equation: document.querySelector("#pattern-equation"),
  detail: document.querySelector("#detail-link"),
  metricFrame: document.querySelector("#metric-frame"),
  metricFires: document.querySelector("#metric-fires"),
  metricResets: document.querySelector("#metric-resets"),
  vsb: document.querySelector("#vsb-levels"),
  tiles: document.querySelector("#tile-list"),
  log: document.querySelector("#event-log"),
  play: document.querySelector("#play"),
  step: document.querySelector("#step"),
  reset: document.querySelector("#reset"),
  gain: document.querySelector("#gain"),
  gainValue: document.querySelector("#gain-value"),
  decay: document.querySelector("#decay"),
  decayValue: document.querySelector("#decay-value"),
  speed: [...document.querySelectorAll("[data-speed]")],
};

const simulation = {
  frame: 0,
  fires: 0,
  resets: 0,
  playing: true,
  speed: 700,
  gain: 1,
  decayScale: 1,
  accumulatorMs: 0,
  lastTime: performance.now(),
  logs: [],
};

let currentPattern = PATTERNS[0];
let model = currentPattern.create();
let renderer;
let scene;
let camera;
let controls;
let world;
let laneVisuals = [];
let tileVisuals = [];
let edgeVisuals = [];
let particles = [];

buildNavigation();
initThree();
selectPattern(PATTERNS[0].id);
bindControls();
requestAnimationFrame(animate);

function buildNavigation() {
  PATTERNS.forEach((pattern, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.pattern = pattern.id;
    button.innerHTML = `<span>${String(index + 1).padStart(2, "0")}</span><strong>${pattern.nav}</strong>`;
    button.addEventListener("click", () => selectPattern(pattern.id));
    dom.nav.append(button);
  });
}

function bindControls() {
  dom.play.addEventListener("click", () => {
    simulation.playing = !simulation.playing;
    dom.play.textContent = simulation.playing ? "❚❚" : "▶";
    dom.play.setAttribute("aria-label", simulation.playing ? "Остановить" : "Запустить");
  });

  dom.step.addEventListener("click", () => {
    simulation.playing = false;
    dom.play.textContent = "▶";
    advance();
  });

  dom.reset.addEventListener("click", () => resetModel(true));

  dom.gain.addEventListener("input", () => {
    simulation.gain = Number(dom.gain.value) / 100;
    dom.gainValue.textContent = `${simulation.gain.toFixed(2)}×`;
  });

  dom.decay.addEventListener("input", () => {
    simulation.decayScale = Number(dom.decay.value) / 100;
    dom.decayValue.textContent = `${simulation.decayScale.toFixed(2)}×`;
  });

  dom.speed.forEach((button) => {
    button.addEventListener("click", () => {
      simulation.speed = Number(button.dataset.speed);
      dom.speed.forEach((item) => item.classList.toggle("is-active", item === button));
    });
  });
}

function initThree() {
  try {
    renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
      preserveDrawingBuffer: true,
    });
  } catch (error) {
    dom.fallback.hidden = false;
    console.error(error);
    return;
  }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(COLORS.bg, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  dom.scene.append(renderer.domElement);

  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(COLORS.bg, 0.028);

  camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.set(0, 4.8, 14.5);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.minDistance = 9;
  controls.maxDistance = 22;
  controls.minPolarAngle = Math.PI * 0.24;
  controls.maxPolarAngle = Math.PI * 0.58;
  controls.target.set(0, 0.6, 0);

  scene.add(new THREE.HemisphereLight(0x99ddeb, 0x071015, 1.65));
  const key = new THREE.DirectionalLight(0xe8f0f4, 2.3);
  key.position.set(4, 7, 8);
  scene.add(key);
  const cyanLight = new THREE.PointLight(COLORS.cyan, 9, 16, 2);
  cyanLight.position.set(-5, 2, 4);
  scene.add(cyanLight);
  const warmLight = new THREE.PointLight(COLORS.amber, 5, 12, 2);
  warmLight.position.set(5, 1, 2);
  scene.add(warmLight);

  const grid = new THREE.GridHelper(18, 18, 0x1e333c, 0x111b20);
  grid.position.y = -2.15;
  scene.add(grid);

  const resizeObserver = new ResizeObserver(resizeRenderer);
  resizeObserver.observe(dom.scene);
  resizeRenderer();
}

function resizeRenderer() {
  if (!renderer) return;
  const width = Math.max(dom.scene.clientWidth, 1);
  const height = Math.max(dom.scene.clientHeight, 1);
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.position.z = width < 620 ? 17.5 : 14.5;
  camera.updateProjectionMatrix();
}

function selectPattern(id) {
  const index = PATTERNS.findIndex((item) => item.id === id);
  currentPattern = PATTERNS[Math.max(index, 0)];
  simulation.frame = 0;
  simulation.fires = 0;
  simulation.resets = 0;
  simulation.logs = [];
  simulation.accumulatorMs = 0;
  model = currentPattern.create();

  [...dom.nav.children].forEach((button) => {
    button.classList.toggle("is-active", button.dataset.pattern === currentPattern.id);
  });

  dom.index.textContent = String(index + 1).padStart(2, "0");
  dom.title.textContent = currentPattern.title;
  dom.lead.textContent = currentPattern.lead;
  dom.description.textContent = currentPattern.description;
  dom.equation.textContent = currentPattern.equation;
  dom.detail.href = currentPattern.detail;
  dom.play.textContent = simulation.playing ? "❚❚" : "▶";

  rebuildWorld();
  renderState(new Array(8).fill(0));
  addLog("Орган создан из чистого состояния");
}

function resetModel(manual) {
  const oldResets = simulation.resets;
  model = currentPattern.create();
  simulation.frame = 0;
  simulation.fires = 0;
  simulation.resets = manual ? oldResets + 1 : oldResets;
  simulation.logs = [];
  simulation.accumulatorMs = 0;
  rebuildWorld();
  renderState(new Array(8).fill(0));
  addLog(manual ? "EV_RESET: runtime-состояние очищено" : "Сценарий начат заново");
}

function rebuildWorld() {
  if (!scene) return;
  if (world) scene.remove(world);
  disposeParticles();
  laneVisuals = [];
  tileVisuals = [];
  edgeVisuals = [];
  world = new THREE.Group();
  scene.add(world);

  buildVsbRails();
  model.tiles.forEach((tile) => tileVisuals.push(buildTile(tile)));
  (model.edges || []).forEach(([from, to]) => edgeVisuals.push(buildEdge(model.tiles[from], model.tiles[to], from)));

  if (currentPattern.id === "competition") buildDomainBoundary();
  if (currentPattern.id === "reset") buildResetDivider();
}

function buildVsbRails() {
  const geometry = new THREE.CylinderGeometry(0.025, 0.025, 13.5, 10);
  for (let lane = 0; lane < 8; lane += 1) {
    const material = new THREE.MeshStandardMaterial({
      color: laneColors[lane],
      emissive: laneColors[lane],
      emissiveIntensity: 0.05,
      transparent: true,
      opacity: 0.22,
      roughness: 0.35,
      metalness: 0.2,
    });
    const rail = new THREE.Mesh(geometry, material);
    rail.rotation.z = Math.PI / 2;
    rail.position.set(0, 3.15 + lane * 0.19, -2.65);
    world.add(rail);
    laneVisuals.push({ rail, material, y: rail.position.y, lane });
  }

  const label = makeLabel("COMMON VSB · 8 LANES", COLORS.cyan, 0.58);
  label.position.set(-5.1, 4.95, -2.6);
  world.add(label);
}

function buildTile(tile) {
  const group = new THREE.Group();
  group.position.set(tile.pos[0], tile.pos[1], tile.pos[2] || 0);

  const shellMaterial = new THREE.MeshStandardMaterial({
    color: COLORS.dark,
    emissive: COLORS.cyan,
    emissiveIntensity: 0.06,
    roughness: 0.32,
    metalness: 0.48,
  });
  const shell = new THREE.Mesh(new THREE.BoxGeometry(1.18, 1.18, 1.18), shellMaterial);
  group.add(shell);

  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(1.21, 1.21, 1.21)),
    new THREE.LineBasicMaterial({ color: COLORS.steel, transparent: true, opacity: 0.9 }),
  );
  group.add(edges);

  const barMaterial = new THREE.MeshStandardMaterial({ color: COLORS.cyan, emissive: COLORS.cyan, emissiveIntensity: 0.55 });
  const bar = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.82, 0.2), barMaterial);
  bar.position.z = 0.64;
  group.add(bar);

  const activeRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.82, 0.025, 8, 48),
    new THREE.MeshBasicMaterial({ color: COLORS.green, transparent: true, opacity: 0 }),
  );
  activeRing.rotation.x = Math.PI / 2;
  activeRing.position.y = -0.62;
  group.add(activeRing);

  const fireHalo = new THREE.Mesh(
    new THREE.TorusGeometry(0.78, 0.055, 10, 56),
    new THREE.MeshBasicMaterial({ color: COLORS.coral, transparent: true, opacity: 0 }),
  );
  fireHalo.position.z = 0.72;
  group.add(fireHalo);

  const label = makeLabel(tile.label.toUpperCase(), COLORS.white, 0.43);
  label.position.set(0, 1.02, 0);
  group.add(label);

  world.add(group);
  return { group, shell, shellMaterial, edges, bar, barMaterial, activeRing, fireHalo, tile };
}

function buildEdge(from, to, sourceIndex) {
  const points = [
    new THREE.Vector3(from.pos[0], from.pos[1], from.pos[2] || 0),
    new THREE.Vector3(to.pos[0], to.pos[1], to.pos[2] || 0),
  ];
  const material = new THREE.LineBasicMaterial({ color: COLORS.steel, transparent: true, opacity: 0.55 });
  const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), material);
  line.position.z = -0.1;
  world.add(line);
  return { line, material, sourceIndex };
}

function buildDomainBoundary() {
  const geometry = new THREE.BoxGeometry(8.2, 2.5, 2.1);
  const boundary = new THREE.LineSegments(
    new THREE.EdgesGeometry(geometry),
    new THREE.LineBasicMaterial({ color: COLORS.amber, transparent: true, opacity: 0.35 }),
  );
  boundary.position.set(0, -0.3, 0);
  world.add(boundary);
  const label = makeLabel("DOMAIN 07 · DETERMINISTIC WINNER", COLORS.amber, 0.48);
  label.position.set(0, 1.35, 0);
  world.add(label);
}

function buildResetDivider() {
  const material = new THREE.LineDashedMaterial({ color: COLORS.steel, dashSize: 0.22, gapSize: 0.14, transparent: true, opacity: 0.7 });
  const geometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, -1.8, -0.7),
    new THREE.Vector3(0, 2.0, -0.7),
  ]);
  const line = new THREE.Line(geometry, material);
  line.computeLineDistances();
  world.add(line);
  const label = makeLabel("SAME TEST PULSE", COLORS.amber, 0.48);
  label.position.set(0, 1.45, 0);
  world.add(label);
}

function makeLabel(text, color, scale) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 96;
  const context = canvas.getContext("2d");
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = `#${color.toString(16).padStart(6, "0")}`;
  context.font = "700 30px ui-monospace, SFMono-Regular, monospace";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(text, 256, 48, 500);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(4.8 * scale, 0.9 * scale, 1);
  return sprite;
}

function animate(time) {
  const delta = Math.min(time - simulation.lastTime, 100);
  simulation.lastTime = time;

  if (simulation.playing) {
    simulation.accumulatorMs += delta;
    while (simulation.accumulatorMs >= simulation.speed) {
      advance();
      simulation.accumulatorMs -= simulation.speed;
    }
  }

  updateParticles(delta / 1000);
  updateVisuals(time);
  if (controls) controls.update();
  if (renderer) renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

function advance() {
  simulation.frame += 1;
  const base = model.sequence[(simulation.frame - 1) % model.sequence.length];
  const input = base.map((value) => clampLevel(Math.round(value * simulation.gain)));

  if ((simulation.frame - 1) % model.sequence.length === 0 && simulation.frame > 1) {
    model.resetCycle?.();
  }

  model.advance(input, simulation);
  spawnInputParticles(input);
  renderState(input);
}

function renderState(input) {
  dom.metricFrame.textContent = simulation.frame;
  dom.metricFires.textContent = simulation.fires;
  dom.metricResets.textContent = simulation.resets;
  dom.vsb.textContent = `VSB ${input.join(" ")}`;

  dom.tiles.replaceChildren(...model.tiles.map((tile) => {
    const row = document.createElement("div");
    row.className = `tile-row${tile.fired ? " is-fire" : ""}${tile.locked ? " is-locked" : ""}`;
    const flag = tile.fired ? "FIRE" : tile.status || (tile.locked ? "LOCK" : tile.active ? "ACTIVE" : "IDLE");
    row.innerHTML = `<strong>${escapeHtml(tile.label)}</strong><span class="state">${formatState(tile.state)}</span><span class="flag">${escapeHtml(flag)}</span>`;
    return row;
  }));
}

function updateVisuals(time) {
  if (!renderer) return;

  const input = model.lastInput || new Array(8).fill(0);
  laneVisuals.forEach((visual, lane) => {
    const level = input[lane] || 0;
    visual.material.opacity = 0.16 + level / 22;
    visual.material.emissiveIntensity = 0.04 + level / 5;
  });

  tileVisuals.forEach((visual, index) => {
    const tile = model.tiles[index];
    const normalized = Math.min(Math.abs(tile.state) / Math.max(tile.maxDisplay || 30, 1), 1);
    const directionColor = tile.state < 0 ? COLORS.coral : COLORS.cyan;
    visual.bar.scale.y = Math.max(normalized, 0.025);
    visual.bar.position.y = (visual.bar.scale.y - 1) * 0.41 * (tile.state < 0 ? -1 : 1);
    visual.barMaterial.color.setHex(directionColor);
    visual.barMaterial.emissive.setHex(directionColor);
    visual.shellMaterial.emissive.setHex(tile.winner ? COLORS.amber : tile.locked ? COLORS.green : COLORS.cyan);
    visual.shellMaterial.emissiveIntensity = tile.fired ? 2.4 : tile.locked ? 0.7 : tile.active ? 0.23 : 0.025;
    visual.activeRing.material.opacity = tile.active ? 0.48 : 0;
    visual.fireHalo.material.opacity = tile.fired ? 0.85 : Math.max(0, visual.fireHalo.material.opacity * 0.94);
    visual.fireHalo.scale.setScalar(tile.fired ? 1 + Math.sin(time * 0.02) * 0.08 : 1);
    visual.group.rotation.y += tile.active ? 0.0015 : 0.0003;
  });

  edgeVisuals.forEach((edge) => {
    const source = model.tiles[edge.sourceIndex];
    edge.material.color.setHex(source.locked ? COLORS.green : COLORS.steel);
    edge.material.opacity = source.locked ? 0.95 : 0.4;
  });
}

function spawnInputParticles(input) {
  if (!world) return;
  input.forEach((level, lane) => {
    if (level <= 0) return;
    const material = new THREE.MeshBasicMaterial({ color: laneColors[lane], transparent: true, opacity: 0.92 });
    const particle = new THREE.Mesh(new THREE.SphereGeometry(0.045 + level * 0.006, 12, 12), material);
    particle.position.set(-6.8, laneVisuals[lane].y, -2.65);
    particle.userData.speed = 5.5 + level * 0.18;
    world.add(particle);
    particles.push(particle);
  });
}

function updateParticles(deltaSeconds) {
  for (let index = particles.length - 1; index >= 0; index -= 1) {
    const particle = particles[index];
    particle.position.x += particle.userData.speed * deltaSeconds;
    particle.material.opacity *= 0.997;
    if (particle.position.x > 6.9) {
      world.remove(particle);
      particle.geometry.dispose();
      particle.material.dispose();
      particles.splice(index, 1);
    }
  }
}

function disposeParticles() {
  particles.forEach((particle) => {
    particle.parent?.remove(particle);
    particle.geometry.dispose();
    particle.material.dispose();
  });
  particles = [];
}

function addLog(message) {
  simulation.logs.unshift({ frame: simulation.frame, message });
  simulation.logs = simulation.logs.slice(0, 5);
  dom.log.replaceChildren(...simulation.logs.map((item) => {
    const row = document.createElement("li");
    row.innerHTML = `<time>${String(item.frame).padStart(3, "0")}</time><span>${escapeHtml(item.message)}</span>`;
    return row;
  }));
}

function fire(tile, message) {
  tile.fired = true;
  tile.locked = true;
  simulation.fires += 1;
  addLog(message || `${tile.label}: FIRE`);
}

function resetTile(tile) {
  tile.state = 0;
  tile.locked = false;
  tile.active = Boolean(tile.root);
  tile.fired = false;
  tile.winner = false;
  tile.status = "RESET";
}

function stepAccumulator(tile, input, active) {
  tile.fired = false;
  tile.winner = false;
  tile.status = "";
  tile.active = active;

  if (!active) {
    tile.state = 0;
    tile.locked = false;
    return;
  }

  const decay = tile.decay * simulation.decayScale;
  if (tile.locked) {
    tile.state = decayTowardZero(tile.state, decay);
    if (tile.state < tile.lo || tile.state > tile.hi) tile.locked = false;
    return;
  }

  const delta = tile.weights.reduce((sum, weight, lane) => sum + weight * input[lane], 0);
  tile.state = decayTowardZero(tile.state + delta, decay);
  if (tile.state >= tile.lo && tile.state <= tile.hi) fire(tile);
}

function createIntegrator() {
  const tile = makeTile("memory", "память давления", [-0.2, -0.25, 0], {
    root: true,
    weights: [1.25, 0, 0, 0.35, 0, 0, 0, 0],
    decay: 1,
    lo: 20,
    hi: 28,
    maxDisplay: 32,
  });
  const model = basicModel([tile], [
    frame(0), frame(3, 0, 0, 2), frame(0), frame(4, 0, 0, 1),
    frame(5), frame(6, 0, 0, 2), frame(0), frame(0), frame(0),
    frame(4), frame(5, 0, 0, 2), frame(7), frame(0), frame(0), frame(0), frame(0),
  ]);
  model.advance = (input) => {
    model.lastInput = input;
    const wasFired = tile.fired;
    stepAccumulator(tile, input, true);
    if (tile.fired && !wasFired) addLog("Накопление обогнало утечку: FIRE");
  };
  model.resetCycle = () => resetTile(tile);
  return model;
}

function createCorridor() {
  const tile = makeTile("corridor", "коридор 8..11", [0, -0.25, 0], {
    root: true,
    decay: 0,
    lo: 8,
    hi: 11,
    maxDisplay: 15,
  });
  const model = basicModel([tile], [
    frame(2), frame(5), frame(8), frame(10), frame(13), frame(15), frame(6), frame(9), frame(0),
  ]);
  model.advance = (input) => {
    model.lastInput = input;
    tile.fired = false;
    tile.active = true;
    tile.state = input[0];
    const inside = tile.state >= tile.lo && tile.state <= tile.hi;
    if (!tile.locked && inside) fire(tile, `Состояние ${tile.state} вошло в коридор: FIRE`);
    if (tile.locked && !inside) tile.locked = false;
    if (tile.state > tile.hi) tile.status = "OVER";
  };
  model.resetCycle = () => resetTile(tile);
  return model;
}

function createHysteresis() {
  const tile = makeTile("schmitt", "fire 11 / rearm 4", [0, -0.25, 0], {
    root: true,
    lo: 11,
    hi: 15,
    maxDisplay: 15,
  });
  tile.armed = true;
  const model = basicModel([tile], [
    frame(2), frame(5), frame(9), frame(11), frame(13), frame(10), frame(11),
    frame(9), frame(7), frame(5), frame(4), frame(3), frame(7), frame(11), frame(13), frame(7), frame(3),
  ]);
  model.advance = (input) => {
    model.lastInput = input;
    tile.fired = false;
    tile.active = true;
    tile.state = input[0];
    if (tile.armed && tile.state >= 11) {
      tile.armed = false;
      fire(tile, "Верхний уровень пройден: FIRE, орган разоружён");
    } else if (!tile.armed && tile.state <= 4) {
      tile.armed = true;
      tile.locked = false;
      tile.status = "ARMED";
      addLog("Нижний уровень пройден: повторный взвод");
    } else {
      tile.status = tile.armed ? "ARMED" : "DISARMED";
    }
  };
  model.resetCycle = () => {
    resetTile(tile);
    tile.armed = true;
  };
  return model;
}

function createChain() {
  const root = makeTile("root", "A · давление", [-3.3, -0.35, 0], {
    root: true, weights: [1, 0, 0, 0, 0, 0, 0, 0], decay: 0.4, lo: 6, hi: 11, maxDisplay: 12,
  });
  const child = makeTile("child", "B · release", [0, -0.35, 0], {
    weights: [0, 1, 0, 0, 0, 0, 0, 0], decay: 0.4, lo: 7, hi: 12, maxDisplay: 12,
  });
  const winner = makeTile("winner", "C · confirm", [3.3, -0.35, 0], {
    weights: [0, 0, 1, 0, 0, 0, 0, 0], decay: 0.4, lo: 8, hi: 13, maxDisplay: 13,
  });
  const model = basicModel([root, child, winner], [
    frame(0), frame(7), frame(0, 8), frame(0, 0, 9), frame(0), frame(0), frame(0), frame(0),
  ], [[0, 1], [1, 2]]);
  model.advance = (input) => {
    model.lastInput = input;
    const before = model.tiles.map((tile) => tile.locked);
    stepAccumulator(root, input, true);
    stepAccumulator(child, input, before[0]);
    stepAccumulator(winner, input, before[1]);
    if (root.fired) addLog("A подтверждено: B получит ACTIVE на следующем такте");
    if (child.fired) addLog("B подтверждено: C получит ACTIVE на следующем такте");
    if (winner.fired) addLog("Последовательность A → B → C завершена: FIRE");
  };
  model.resetCycle = () => model.tiles.forEach(resetTile);
  return model;
}

function createCompetition() {
  const tiles = [
    makeTile("hyp-a", "ветвь A · p1", [-3.1, -0.3, 0], {
      root: true, weights: [1.1, 0, 0, 0, 0, 0, 0, 0], lo: 7, hi: 12, priority: 1, maxDisplay: 12,
    }),
    makeTile("hyp-b", "ветвь B · p3", [0, -0.3, 0], {
      root: true, weights: [0, 0, 0, 1.15, 0, 0, 0, 0], lo: 7, hi: 12, priority: 3, maxDisplay: 12,
    }),
    makeTile("hyp-c", "ветвь C · p2", [3.1, -0.3, 0], {
      root: true, weights: [0, 0, 0, 0, 1.05, 0, 0, 0], lo: 7, hi: 12, priority: 2, maxDisplay: 12,
    }),
  ];
  const model = basicModel(tiles, [
    frame(0), frame(7, 0, 0, 7, 8), frame(0), frame(0), frame(0), frame(6, 0, 0, 8, 7), frame(0), frame(0),
  ]);
  model.advance = (input) => {
    model.lastInput = input;
    tiles.forEach((tile) => stepAccumulator(tile, input, true));
    const candidates = tiles.filter((tile) => tile.fired).sort((a, b) => b.priority - a.priority);
    if (candidates.length > 0) {
      const winner = candidates[0];
      winner.winner = true;
      candidates.slice(1).forEach((tile) => {
        tile.locked = false;
        tile.status = "LOSE";
      });
      addLog(`${candidates.length} кандидата; победила ${winner.label}`);
    }
  };
  model.resetCycle = () => tiles.forEach(resetTile);
  return model;
}

function createResetSusceptibility() {
  const kept = makeTile("kept", "история сохранена", [-2.4, -0.25, 0], {
    root: true, weights: [1.5, 0, 0, 0, 0, 0, 0, 0], decay: 1, lo: 23, hi: 29, maxDisplay: 30,
  });
  const cleared = makeTile("cleared", "после RESET", [2.4, -0.25, 0], {
    root: true, weights: [1.5, 0, 0, 0, 0, 0, 0, 0], decay: 1, lo: 23, hi: 29, maxDisplay: 30,
  });
  const sequence = [
    frame(0), frame(4), frame(4), frame(4), frame(4), frame(0), frame(0), frame(5), frame(0), frame(0), frame(0),
  ];
  const model = basicModel([kept, cleared], sequence);
  model.advance = (input, state) => {
    model.lastInput = input;
    const cycleIndex = (state.frame - 1) % sequence.length;
    stepAccumulator(kept, input, true);
    stepAccumulator(cleared, input, true);

    if (cycleIndex === 4) {
      resetTile(cleared);
      state.resets += 1;
      addLog("Правый орган сброшен; левый сохранил историю");
    }
    if (cycleIndex === 7) {
      addLog(kept.fired && !cleared.fired
        ? "Один тестовый импульс: FIRE только у органа с памятью"
        : "Тестовый импульс предъявлен обоим органам");
    }
  };
  model.resetCycle = () => {
    resetTile(kept);
    resetTile(cleared);
  };
  return model;
}

function basicModel(tiles, sequence, edges = []) {
  return {
    tiles,
    sequence,
    edges,
    lastInput: new Array(8).fill(0),
    advance() {},
    resetCycle() {},
  };
}

function makeTile(id, label, pos, options = {}) {
  return {
    id,
    label,
    pos,
    root: Boolean(options.root),
    weights: options.weights || new Array(8).fill(0),
    decay: options.decay ?? 0,
    lo: options.lo ?? 0,
    hi: options.hi ?? 0,
    priority: options.priority ?? 0,
    maxDisplay: options.maxDisplay ?? Math.max(Math.abs(options.lo || 0), Math.abs(options.hi || 0), 15),
    state: 0,
    active: Boolean(options.root),
    locked: false,
    fired: false,
    winner: false,
    status: "",
  };
}

function frame(...values) {
  return Array.from({ length: 8 }, (_, index) => values[index] || 0);
}

function decayTowardZero(value, amount) {
  if (value > 0) return Math.max(0, value - amount);
  if (value < 0) return Math.min(0, value + amount);
  return 0;
}

function clampLevel(value) {
  return Math.max(0, Math.min(15, value));
}

function formatState(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
