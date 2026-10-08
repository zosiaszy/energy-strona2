/* Hero: a dusk wind farm in real 3D. The near turbine's rotor is driven by
   scroll (plus a slow idle wind), the camera dollies in across the pinned hero,
   and the far turbines give true parallax against the sky. */
import * as THREE from 'three';

const canvas = document.querySelector('.hero__gl');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

if (canvas) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (e) {
    canvas.remove();
  }
  if (renderer) init(renderer);
}

function makeTurbine(mat, bladeMat) {
  const t = new THREE.Group();

  // tower: tapered steel tube with two subtle section joints
  const tower = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 2.7, 80, 48, 1), mat);
  tower.position.y = 40;
  t.add(tower);
  for (const y of [28, 54]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(2.7 - (y / 80) * 1.45, 0.05, 6, 48), mat);
    ring.rotation.x = Math.PI / 2; ring.position.y = y; t.add(ring);
  }

  const head = new THREE.Group();
  head.position.y = 81.2;
  t.add(head);

  const nacelle = new THREE.Mesh(new THREE.CapsuleGeometry(2.0, 8.5, 8, 28), mat);
  nacelle.rotation.x = Math.PI / 2;
  nacelle.scale.set(1, 1, 0.92);
  nacelle.position.z = -2.6;
  head.add(nacelle);

  const rotor = new THREE.Group();
  rotor.position.z = 3.2;
  head.add(rotor);

  const spinner = new THREE.Mesh(new THREE.SphereGeometry(2.0, 32, 20), mat);
  spinner.scale.set(1, 1, 1.45);
  rotor.add(spinner);

  // blade planform: root collar, max chord near the root, long taper to a tip
  // sampled as a simple polygon: trailing edge bulges near the root,
  // leading edge stays almost straight, both converge to a narrow tip
  const LEN = 38.5, N = 40, trail = [], lead = [];
  for (let i = 0; i <= N; i++) {
    const u = i / N, y = u * LEN;
    const root = Math.min(1, u / 0.16);
    const chord = (0.55 + 2.6 * Math.sin(Math.min(1, u / 0.18) * Math.PI / 2)) * (1 - 0.86 * Math.pow(Math.max(0, u - 0.16) / 0.84, 0.85));
    const c = u < 0.16 ? 0.55 + (chord - 0.55) * root : chord;
    trail.push([c * 0.72, y]);
    lead.push([-c * 0.28, y]);
  }
  const s = new THREE.Shape();
  s.moveTo(lead[0][0], 0);
  for (const [x, y] of trail) s.lineTo(x, y);
  for (let i = lead.length - 1; i >= 0; i--) s.lineTo(lead[i][0], lead[i][1]);
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.3, bevelEnabled: true, bevelThickness: 0.1, bevelSize: 0.08, bevelSegments: 2 });
  g.translate(0, 1.6, -0.18);
  for (let i = 0; i < 3; i++) {
    const pivot = new THREE.Group();
    pivot.rotation.z = (i * Math.PI * 2) / 3;
    const blade = new THREE.Mesh(g, bladeMat);
    blade.rotation.y = 0.2; // pitch
    pivot.add(blade);
    rotor.add(pivot);
  }

  // aviation light on top of the nacelle
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 8), new THREE.MeshBasicMaterial({ color: 0xff3b2f }));
  beacon.position.set(0, 2.2, -6);
  head.add(beacon);

  t.userData = { rotor, head, beacon };
  return t;
}

function init(renderer) {
  const scene = new THREE.Scene();
  const FOG = new THREE.Color('#B47E6C');
  scene.fog = new THREE.FogExp2(FOG, 0.00105);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(9000, 9000), new THREE.MeshStandardMaterial({ color: '#1B2029', roughness: 1 }));
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  const camera = new THREE.PerspectiveCamera(32, 1, 1, 3000);

  scene.add(new THREE.HemisphereLight('#7D97BC', '#2A2224', 1.05));
  const sun = new THREE.DirectionalLight('#FFB27E', 3.2);
  sun.position.set(-260, 50, -300);
  scene.add(sun);
  const fill = new THREE.DirectionalLight('#A9BCD6', 0.55);
  fill.position.set(80, 60, 200);
  scene.add(fill);

  const mat = new THREE.MeshStandardMaterial({ color: '#E7EBEE', roughness: 0.48, metalness: 0.08 });
  const bladeMat = new THREE.MeshStandardMaterial({ color: '#EEF1F3', roughness: 0.38, metalness: 0.05 });

  const hero = makeTurbine(mat, bladeMat);
  hero.position.set(40, 0, -110);
  hero.userData.head.rotation.y = -0.5;
  scene.add(hero);

  const far = [];
  const spots = [
    [-260, -760, 0.3], [-120, -980, -0.2], [20, -1250, 0.5], [170, -900, 0.1],
    [320, -1100, -0.35], [-420, -1300, 0.25], [470, -1450, 0.4], [-40, -1650, -0.1],
    [620, -1700, 0.2], [-640, -1550, -0.3]
  ];
  for (const [x, z, yaw] of spots) {
    const f = makeTurbine(mat, bladeMat);
    f.position.set(x, 0, z);
    f.userData.head.rotation.y = yaw - 0.4;
    f.userData.phase = Math.random() * 6;
    f.userData.speed = 0.85 + Math.random() * 0.3;
    scene.add(f);
    far.push(f);
  }

  let w = 0, h = 0, visibleW = 172;
  const LOOK = new THREE.Vector3(0, 45, -110);
  function resize() {
    const r = canvas.getBoundingClientRect();
    w = Math.max(1, Math.round(r.width)); h = Math.max(1, Math.round(r.height));
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, matchMedia('(pointer: coarse)').matches ? 1.5 : 1.75));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const narrow = camera.aspect < 0.9;
    camera.fov = narrow ? 44 : 32;
    camera.updateProjectionMatrix();
    const dist = 170;
    const visH = 2 * dist * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    visibleW = visH * camera.aspect;
    hero.position.x = narrow ? visibleW * 0.12 : visibleW * 0.24;
    LOOK.set(0, narrow ? 58 : 45, -110);
  }
  resize();
  addEventListener('resize', resize, { passive: true });

  let angle = 0.35, last = performance.now();
  let px = 0, py = 0, tpx = 0, tpy = 0;
  if (matchMedia('(hover: hover) and (pointer: fine)').matches && !reduce) {
    addEventListener('pointermove', (e) => {
      tpx = e.clientX / innerWidth - 0.5; tpy = e.clientY / innerHeight - 0.5;
    }, { passive: true });
  }

  let running = true;
  const io = new IntersectionObserver(([e]) => { running = e.isIntersecting; if (running) loop(performance.now()); });
  io.observe(canvas);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && running) loop(performance.now()); });

  let rafId = 0;
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const p = window.HeroP || 0;
    const scrollTurns = (window.scrollY || 0) / innerHeight;
    // scroll owns the rotor; a slow idle keeps the farm alive at rest
    const target = scrollTurns * 2.4;
    const idle = reduce ? 0 : 0.16;
    // smoothed so a trackpad flick reads as a gust, not a jump
    const prev = frame.sT ?? target;
    frame.sT = prev + (target - prev) * Math.min(1, dt * 7);
    if (!reduce) angle += idle * dt + (frame.sT - prev);

    hero.userData.rotor.rotation.z = -angle;
    for (const f of far) f.userData.rotor.rotation.z = -(angle * f.userData.speed + f.userData.phase);

    const blink = reduce ? 1 : (Math.sin(now / 420) > 0.6 ? 1 : 0.15);
    hero.userData.beacon.material.color.setRGB(1, 0.23 * blink, 0.18 * blink);

    px += (tpx - px) * 0.05; py += (tpy - py) * 0.05;
    const e = reduce ? 0 : p;
    camera.position.set(px * 6, 4 + e * 10 - py * 3, 60 - e * 70);
    camera.lookAt(LOOK.x + px * 4, LOOK.y + e * 6, LOOK.z);
    renderer.render(scene, camera);
  }
  function loop(now) {
    cancelAnimationFrame(rafId);
    const step = (t) => {
      if (!running || document.hidden) return;
      frame(t);
      if (!reduce) rafId = requestAnimationFrame(step);
    };
    rafId = requestAnimationFrame(step);
  }
  if (reduce) {
    // static composition, but scroll still advances the camera so the scene stays complete
    addEventListener('scroll', () => requestAnimationFrame(frame), { passive: true });
  }
  loop(performance.now());
  canvas.classList.add('is-live');
  canvas.parentElement.classList.add('gl-live');
}
