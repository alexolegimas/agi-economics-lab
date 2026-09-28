// Game 6: World of Warcraft (2004) — 3D Elwynn Forest, Goldshire Cottage, Alliance Paladin & Iconic 2004 Level-Up
// True 3D perspective engine:
// - Winding Elwynn Forest dirt road with organic cross-road shading, worn wheel ruts & soft grass verges
// - Dozens of 3D cylindrical tree trunks with lush, multi-lobe 3D low-poly faceted green canopy meshes overhead
// - Warm golden morning mist and sunlight shining between distant tree trunks on the upper-left horizon
// - Iconic Goldshire cottage nestled among the left trees (steep royal-blue pitched roof, cream stucco walls,
//   dark timber framing, and two glowing golden-yellow windows casting warm light)
// - 3D wooden post-and-rail fence following the right curve of the dirt road
// - 3,600+ 3D-projected swaying green grass blades and 420+ tiny white/yellow wildflowers
// - 3D third-person Human Paladin (royal-blue Stormwind cloak, golden pauldrons, Lionheart shield & greatsword)
//   walking along the road who triggers the iconic 2004 WoW Level-Up at localT = 2.5s!
(function() {
  window.GAMES = window.GAMES || [];
  window.GameAnimations = window.GameAnimations || {};

  function mulberry32(a) {
    return function() {
      let t = (a += 0x6D2B79F5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const lerp = (a, b, t) => a + (b - a) * clamp(t, 0, 1);
  const smoothstep = (e0, e1, x) => {
    const t = clamp((x - e0) / (e1 - e0), 0, 1);
    return t * t * (3 - 2 * t);
  };

  // --- 3D World Curves: Winding Elwynn Forest Dirt Road & Terrain ---
  function roadCenterX(z) {
    const curveLeft = -1.05 * Math.sin(clamp(z, 0, 34) * 0.135);
    const farBendRight = z > 14 ? Math.pow(z - 14, 1.48) * 0.068 : 0;
    return 1.22 + z * 0.045 + curveLeft + farBendRight;
  }

  function roadHalfWidth(z) {
    return 1.18 + 0.08 * Math.sin(z * 0.25);
  }

  function terrainHeight(x, z) {
    const distFromRoad = Math.abs(x - roadCenterX(z));
    const roadFlatten = smoothstep(1.1, 3.5, distFromRoad);
    const leftHill = x < -2.0 ? Math.sin((x + 2.0) * 0.14) * Math.sin(z * 0.08) * 0.35 : 0;
    return roadFlatten * (Math.sin(x * 0.22 + z * 0.11) * 0.12 + leftHill);
  }

  // --- Precompute Low-Poly 3D Faceted Canopy Sphere Template ---
  // Creates an authentic 3D faceted low-poly foliage mesh shaded like Opus 5.5's Elwynn canopies
  function buildLowPolyCanopyMesh(seed, rx, ry, rz, latRings, lonSegs, brightnessBoost = 0) {
    const rng = mulberry32(seed);
    const rings = [];
    for (let i = 0; i <= latRings; i++) {
      const v = i / latRings;
      const phi = v * Math.PI;
      const sinP = Math.sin(phi);
      const cosP = Math.cos(phi);
      const ring = [];
      const segs = (i === 0 || i === latRings) ? 1 : lonSegs;
      for (let j = 0; j < segs; j++) {
        const u = j / segs;
        const theta = u * Math.PI * 2 + (i % 2) * (Math.PI / segs);
        const bump = (i === 0 || i === latRings) ? 1.0 : (0.88 + rng() * 0.24);
        const px = Math.cos(theta) * sinP * rx * bump;
        const py = cosP * ry * (cosP < 0 ? 0.78 : 1.0) * bump;
        const pz = Math.sin(theta) * sinP * rz * bump;
        ring.push({ x: px, y: py, z: pz });
      }
      rings.push(ring);
    }

    const faces = [];
    // Directional light from upper-left-front so front-facing canopy clusters show crisp faceted moss-green polygons
    const sunX = -0.38, sunY = 0.58, sunZ = -0.72;

    function addTri(p0, p1, p2) {
      const ux = p1.x - p0.x, uy = p1.y - p0.y, uz = p1.z - p0.z;
      const vx = p2.x - p0.x, vy = p2.y - p0.y, vz = p2.z - p0.z;
      let nx = uy * vz - uz * vy;
      let ny = uz * vx - ux * vz;
      let nz = ux * vy - uy * vx;
      const cx = (p0.x + p1.x + p2.x) / 3;
      const cy = (p0.y + p1.y + p2.y) / 3;
      const cz = (p0.z + p1.z + p2.z) / 3;
      if (nx * cx + ny * cy + nz * cz < 0) {
        nx = -nx; ny = -ny; nz = -nz;
      }
      const len = Math.hypot(nx, ny, nz) || 1;
      nx /= len; ny /= len; nz /= len;

      const dotSun = nx * sunX + ny * sunY + nz * sunZ;
      const heightFactor = clamp((cy / ry + 0.85) / 1.85, 0, 1);
      let lit = clamp(
        dotSun * 0.52 + heightFactor * 0.42 + brightnessBoost + (rng() - 0.5) * 0.16,
        0.03,
        1.0
      );
      if (cy < -ry * 0.22) lit *= 0.46;

      const r = Math.round(lerp(8, 114, Math.pow(lit, 1.12)));
      const g = Math.round(lerp(18, 162, Math.pow(lit, 1.0)));
      const b = Math.round(lerp(3, 34, Math.pow(lit, 1.32)));

      faces.push({
        p0, p1, p2,
        cx, cy, cz,
        nz,
        color: `rgb(${r},${g},${b})`
      });
    }

    const topP = rings[0][0];
    const r1 = rings[1];
    for (let j = 0; j < r1.length; j++) {
      addTri(topP, r1[j], r1[(j + 1) % r1.length]);
    }
    for (let i = 1; i < latRings - 1; i++) {
      const ra = rings[i];
      const rb = rings[i + 1];
      const n = ra.length;
      for (let j = 0; j < n; j++) {
        const a0 = ra[j];
        const a1 = ra[(j + 1) % n];
        const b0 = rb[j];
        const b1 = rb[(j + 1) % n];
        addTri(a0, b0, a1);
        addTri(a1, b0, b1);
      }
    }
    const botP = rings[latRings][0];
    const rLast = rings[latRings - 1];
    for (let j = 0; j < rLast.length; j++) {
      addTri(rLast[j], botP, rLast[(j + 1) % rLast.length]);
    }

    faces.sort((a, b) => b.cz - a.cz);
    return faces;
  }

  // --- Deterministic Scene Data Generation ---
  const sceneRng = mulberry32(20041123);

  // 1. Trees: Rich multi-sphere low-poly canopies filling the upper forest arch (matching frame_022.jpg!)
  const treeSpecs = [
    // Foreground-left hero tree (x ≈ 0.065w in frame_022)
    { x: -3.62, z: 5.85, rBase: 0.43, hTrunk: 3.85, tint: 0.0, lobes: [
      { ox: 0.1, oy: 4.5, oz: 0.0, rx: 1.9, ry: 1.45, rz: 1.6, boost: -0.06 },
      { ox: 1.45, oy: 4.3, oz: 0.2, rx: 1.65, ry: 1.35, rz: 1.4, boost: -0.04 },
      { ox: -1.3, oy: 4.4, oz: -0.1, rx: 1.75, ry: 1.4, rz: 1.5, boost: -0.08 },
      { ox: 0.5, oy: 5.6, oz: -0.2, rx: 2.1, ry: 1.6, rz: 1.6, boost: 0.02 }
    ]},
    // Tree directly in front of Goldshire Cottage between its two windows (x ≈ 0.31w in frame_022)
    { x: -3.02, z: 11.15, rBase: 0.39, hTrunk: 4.15, tint: 0.03, lobes: [
      { ox: -0.2, oy: 4.7, oz: 0.0, rx: 1.85, ry: 1.5, rz: 1.6, boost: 0.02 },
      { ox: 1.25, oy: 4.4, oz: 0.2, rx: 1.65, ry: 1.35, rz: 1.4, boost: -0.02 },
      { ox: -1.5, oy: 4.5, oz: 0.1, rx: 1.65, ry: 1.35, rz: 1.4, boost: -0.04 },
      { ox: 0.0, oy: 6.1, oz: -0.2, rx: 2.3, ry: 1.75, rz: 1.8, boost: 0.08 },
      { ox: -1.8, oy: 6.3, oz: 0.0, rx: 2.1, ry: 1.65, rz: 1.6, boost: 0.04 },
      { ox: 1.8, oy: 6.0, oz: 0.0, rx: 2.0, ry: 1.6, rz: 1.6, boost: 0.05 }
    ]},
    // Mid-left tree left of the cottage (x ≈ 0.19w in frame_022)
    { x: -7.05, z: 14.2, rBase: 0.40, hTrunk: 4.2, tint: 0.07, lobes: [
      { ox: 0.2, oy: 4.8, oz: 0.0, rx: 1.95, ry: 1.5, rz: 1.6, boost: -0.05 },
      { ox: -1.4, oy: 4.5, oz: 0.2, rx: 1.75, ry: 1.35, rz: 1.4, boost: -0.06 },
      { ox: 0.0, oy: 6.4, oz: -0.2, rx: 2.4, ry: 1.8, rz: 1.8, boost: 0.02 }
    ]},
    // Far-left mid trunk
    { x: -7.4, z: 9.6, rBase: 0.36, hTrunk: 4.0, tint: 0.04, lobes: [
      { ox: 0.3, oy: 4.6, oz: 0.0, rx: 1.9, ry: 1.45, rz: 1.5, boost: -0.06 },
      { ox: -0.8, oy: 5.9, oz: 0.0, rx: 2.2, ry: 1.65, rz: 1.6, boost: -0.02 }
    ]},
    // Row of trees lining the left side of the winding dirt road (brightly lit moss-green clusters in frame_022!)
    { x: -0.12, z: 12.6, rBase: 0.33, hTrunk: 3.75, tint: 0.04, lobes: [
      { ox: -0.35, oy: 4.05, oz: -0.1, rx: 1.45, ry: 1.22, rz: 1.35, boost: 0.18 },
      { ox: 0.85, oy: 3.85, oz: -0.2, rx: 1.32, ry: 1.12, rz: 1.25, boost: 0.22 },
      { ox: -0.1, oy: 5.15, oz: 0.0, rx: 1.68, ry: 1.38, rz: 1.45, boost: 0.20 },
      { ox: -1.3, oy: 5.5, oz: 0.1, rx: 1.75, ry: 1.4, rz: 1.5, boost: 0.10 }
    ]},
    { x: 1.92, z: 14.8, rBase: 0.31, hTrunk: 3.65, tint: 0.06, lobes: [
      { ox: 0.15, oy: 3.92, oz: -0.25, rx: 1.38, ry: 1.18, rz: 1.3, boost: 0.24 },
      { ox: 1.12, oy: 3.58, oz: -0.1, rx: 1.22, ry: 1.05, rz: 1.15, boost: 0.22 },
      { ox: -0.75, oy: 4.55, oz: 0.0, rx: 1.48, ry: 1.25, rz: 1.35, boost: 0.20 },
      { ox: 0.35, oy: 5.25, oz: 0.1, rx: 1.62, ry: 1.35, rz: 1.4, boost: 0.22 }
    ]},
    { x: -2.25, z: 16.5, rBase: 0.34, hTrunk: 3.95, tint: 0.09, lobes: [
      { ox: 0.0, oy: 4.4, oz: 0.0, rx: 1.65, ry: 1.35, rz: 1.4, boost: 0.08 },
      { ox: 0.5, oy: 5.6, oz: 0.0, rx: 1.9, ry: 1.5, rz: 1.5, boost: 0.12 }
    ]},
    { x: -1.65, z: 19.6, rBase: 0.33, hTrunk: 4.05, tint: 0.13, lobes: [
      { ox: 0.0, oy: 4.5, oz: 0.0, rx: 1.75, ry: 1.4, rz: 1.4, boost: 0.12 },
      { ox: 0.8, oy: 5.8, oz: 0.0, rx: 1.9, ry: 1.5, rz: 1.5, boost: 0.16 }
    ]},
    { x: 1.65, z: 22.0, rBase: 0.32, hTrunk: 4.1, tint: 0.15, lobes: [
      { ox: 0.2, oy: 4.5, oz: 0.0, rx: 1.75, ry: 1.4, rz: 1.4, boost: 0.15 },
      { ox: -0.5, oy: 5.9, oz: 0.0, rx: 1.95, ry: 1.5, rz: 1.5, boost: 0.18 }
    ]},
    { x: 4.85, z: 24.4, rBase: 0.35, hTrunk: 4.2, tint: 0.17, lobes: [
      { ox: -0.2, oy: 4.7, oz: 0.0, rx: 1.85, ry: 1.45, rz: 1.5, boost: 0.14 },
      { ox: 1.1, oy: 5.8, oz: 0.2, rx: 2.0, ry: 1.55, rz: 1.5, boost: 0.16 }
    ]},
    // Trees on the right side of the winding dirt road (behind the wooden fence)
    { x: 6.05, z: 10.9, rBase: 0.39, hTrunk: 3.75, tint: 0.02, lobes: [
      { ox: -0.35, oy: 4.25, oz: -0.2, rx: 1.78, ry: 1.42, rz: 1.55, boost: 0.06 },
      { ox: 1.25, oy: 4.05, oz: 0.0, rx: 1.68, ry: 1.35, rz: 1.45, boost: 0.04 },
      { ox: -1.45, oy: 4.45, oz: 0.1, rx: 1.55, ry: 1.28, rz: 1.4, boost: 0.08 },
      { ox: 0.2, oy: 5.55, oz: -0.1, rx: 2.15, ry: 1.65, rz: 1.7, boost: 0.12 },
      { ox: 1.85, oy: 5.4, oz: 0.1, rx: 1.95, ry: 1.55, rz: 1.6, boost: 0.08 }
    ]},
    { x: 6.95, z: 15.3, rBase: 0.35, hTrunk: 3.9, tint: 0.07, lobes: [
      { ox: -0.2, oy: 4.4, oz: 0.0, rx: 1.8, ry: 1.45, rz: 1.5, boost: 0.08 },
      { ox: 1.3, oy: 4.2, oz: 0.1, rx: 1.65, ry: 1.35, rz: 1.4, boost: 0.05 },
      { ox: 0.3, oy: 5.8, oz: 0.0, rx: 2.15, ry: 1.65, rz: 1.6, boost: 0.14 }
    ]},
    { x: 5.95, z: 19.2, rBase: 0.34, hTrunk: 4.0, tint: 0.11, lobes: [
      { ox: -0.2, oy: 4.5, oz: 0.0, rx: 1.8, ry: 1.45, rz: 1.5, boost: 0.10 },
      { ox: 0.4, oy: 6.0, oz: 0.0, rx: 2.1, ry: 1.6, rz: 1.6, boost: 0.16 }
    ]},
    { x: 11.2, z: 16.8, rBase: 0.36, hTrunk: 4.1, tint: 0.11, lobes: [
      { ox: 0.0, oy: 4.5, oz: 0.0, rx: 1.95, ry: 1.5, rz: 1.5, boost: 0.06 },
      { ox: 0.8, oy: 5.9, oz: 0.0, rx: 2.2, ry: 1.65, rz: 1.6, boost: 0.10 }
    ]},
    // Distant misty horizon trunks on upper-left and upper-right
    { x: -15.5, z: 25.5, rBase: 0.40, hTrunk: 4.8, tint: 0.48, lobes: [
      { ox: 0.0, oy: 5.6, oz: 0.0, rx: 2.3, ry: 1.6, rz: 1.7, boost: -0.05 }
    ]},
    { x: -10.6, z: 23.5, rBase: 0.36, hTrunk: 4.6, tint: 0.42, lobes: [
      { ox: 0.0, oy: 5.4, oz: 0.0, rx: 2.1, ry: 1.5, rz: 1.6, boost: -0.04 }
    ]},
    { x: -8.8, z: 28.5, rBase: 0.34, hTrunk: 4.8, tint: 0.55, lobes: [
      { ox: 0.0, oy: 5.5, oz: 0.0, rx: 2.0, ry: 1.4, rz: 1.5, boost: -0.02 }
    ]},
    { x: 15.8, z: 24.5, rBase: 0.36, hTrunk: 4.5, tint: 0.26, lobes: [
      { ox: 0.0, oy: 5.0, oz: 0.0, rx: 2.1, ry: 1.5, rz: 1.6, boost: 0.05 }
    ]},
    { x: 19.5, z: 28.0, rBase: 0.38, hTrunk: 4.6, tint: 0.32, lobes: [
      { ox: 0.0, oy: 5.1, oz: 0.0, rx: 2.1, ry: 1.5, rz: 1.6, boost: 0.04 }
    ]}
  ];

  const trees = treeSpecs.map((spec, idx) => {
    const builtLobes = spec.lobes.map((lobe, lIdx) => ({
      ...lobe,
      faces: buildLowPolyCanopyMesh(
        1000 + idx * 41 + lIdx * 17,
        lobe.rx,
        lobe.ry,
        lobe.rz,
        6,
        10,
        lobe.boost || 0
      )
    }));
    return {
      ...spec,
      yBase: terrainHeight(spec.x, spec.z),
      builtLobes
    };
  });

  // 2. 3D Wooden Post-and-Rail Fence Posts along the right edge of the road
  const fencePosts = [];
  for (let z = 1.9; z <= 31.5; z += 1.42) {
    const fx = roadCenterX(z) + roadHalfWidth(z) + 0.18;
    const fy = terrainHeight(fx, z);
    fencePosts.push({ x: fx, y: fy, z, h: 0.88 });
  }

  // 3. 3,650 Individual 3D-Projected Swaying Grass Blades + 420 Wildflowers!
  const grassBlades = [];
  const wildflowers = [];
  const NUM_GRASS = 3650;
  for (let i = 0; i < NUM_GRASS; i++) {
    const u = sceneRng();
    const z = 1.55 + Math.pow(u, 1.28) * 23.5;
    const maxSpread = 2.3 + z * 0.78;
    const x = (sceneRng() * 2 - 1) * maxSpread;

    const rcx = roadCenterX(z);
    const rhw = roadHalfWidth(z);
    const distRoad = Math.abs(x - rcx);
    if (distRoad < rhw * 0.90) continue;

    // Exclude inside the Goldshire cottage footprint
    if (x > -6.25 && x < -2.8 && z > 14.4 && z < 17.6) continue;

    const y = terrainHeight(x, z);
    const edgeFactor = clamp((distRoad - rhw * 0.88) / 0.65, 0.35, 1.0);
    const hBlade = (0.36 + sceneRng() * 0.36) * edgeFactor;
    const lean = (sceneRng() - 0.5) * 0.16;
    const phase = x * 0.65 + z * 0.45 + sceneRng() * 1.8;
    const shade = sceneRng();

    const rCol = Math.round(lerp(34, 96, shade));
    const gCol = Math.round(lerp(70, 146, shade));
    const bCol = Math.round(lerp(12, 32, shade));

    grassBlades.push({
      x, y, z,
      h: hBlade,
      lean,
      phase,
      color: `rgb(${rCol},${gCol},${bCol})`
    });

    if (sceneRng() < 0.13 && z < 21.5) {
      const fRoll = sceneRng();
      const fColor = fRoll < 0.54
        ? '#f5fae8'
        : (fRoll < 0.82 ? '#ffe885' : (fRoll < 0.93 ? '#f7d4d8' : '#d8e4ff'));
      wildflowers.push({
        x: x + (sceneRng() - 0.5) * 0.10,
        y: y + hBlade * (0.40 + sceneRng() * 0.45),
        z: z + 0.01,
        size: 1.25 + sceneRng() * 1.05,
        phase,
        color: fColor
      });
    }
  }

  // 4. 420 Crisp Meadow Golden Bokeh Motes (matching frame_023.jpg & frame_025.jpg!)
  const meadowBokeh = [];
  for (let i = 0; i < 420; i++) {
    const u = sceneRng();
    const z = 2.1 + Math.pow(u, 1.18) * 19.5;
    const maxSpread = 2.0 + z * 0.66;
    const x = (sceneRng() * 2 - 1) * maxSpread;
    const y = terrainHeight(x, z) + 0.05 + sceneRng() * 0.52;
    meadowBokeh.push({
      x, y, z,
      riseSpeed: 0.14 + sceneRng() * 0.28,
      swayAmp: 0.06 + sceneRng() * 0.11,
      phase: sceneRng() * Math.PI * 2,
      size: 0.036 + sceneRng() * 0.048,
      appearDelay: sceneRng() * 0.32
    });
  }

  // 5. 240 Level-Up Pillar Fountain / Canopy Crown Sparkles (matching frame_024.jpg!)
  const pillarSparkles = [];
  for (let i = 0; i < 240; i++) {
    const angle = sceneRng() * Math.PI * 2;
    const isCrown = i < 185;
    const radialSpread = isCrown
      ? (0.22 + Math.pow(sceneRng(), 0.72) * 2.25)
      : (0.08 + sceneRng() * 0.58);
    const targetHeight = isCrown
      ? (2.25 + sceneRng() * 1.55 + Math.sin(angle * 3) * 0.25)
      : (0.35 + sceneRng() * 2.2);
    pillarSparkles.push({
      angle,
      radialSpread,
      targetHeight,
      size: isCrown ? (0.042 + sceneRng() * 0.068) : (0.035 + sceneRng() * 0.052),
      twinklePhase: sceneRng() * Math.PI * 2,
      driftSpeed: 0.35 + sceneRng() * 0.65,
      isCrown
    });
  }

  // --- Helper: Draw Soft Radial Glow ---
  function drawSoftGlow(ctx, x, y, r, innerColor, midColor, outerColor = 'rgba(255, 200, 50, 0)') {
    if (r <= 0.5) return;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, innerColor);
    g.addColorStop(0.38, midColor);
    g.addColorStop(1, outerColor);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // --- Draw Goldshire Cottage / Inn in 3D Perspective ---
  function drawGoldshireCottage(ctx, project) {
    const xL = -6.12, xR = -2.92, xMid = (xL + xR) * 0.5;
    const zFront = 15.4, zBack = 18.0;
    const yGround = terrainHeight(xMid, zFront) - 0.05;
    const yEaves = yGround + 2.22;
    const yPeak = yGround + 3.88;

    const pBL = project(xL, yGround, zFront);
    const pBR = project(xR, yGround, zFront);
    const pTL = project(xL, yEaves, zFront);
    const pTR = project(xR, yEaves, zFront);
    if (!pBL || !pBR || !pTL || !pTR) return;

    // 1. Warm window light spill on the grass in front of the cottage
    const pGrassGlow = project(xMid, yGround, zFront - 1.2);
    if (pGrassGlow) {
      drawSoftGlow(
        ctx,
        pGrassGlow.x,
        pGrassGlow.y,
        pGrassGlow.scaleY * 1.9,
        'rgba(255, 215, 95, 0.24)',
        'rgba(255, 180, 55, 0.09)',
        'rgba(255, 160, 40, 0)'
      );
    }

    // 2. Right side wall (receding slightly in 3D)
    const pBackBR = project(xR + 0.12, yGround, zBack);
    const pBackTR = project(xR + 0.12, yEaves, zBack);
    if (pBackBR && pBackTR) {
      ctx.fillStyle = '#8c724c';
      ctx.beginPath();
      ctx.moveTo(pBR.x, pBR.y);
      ctx.lineTo(pBackBR.x, pBackBR.y);
      ctx.lineTo(pBackTR.x, pBackTR.y);
      ctx.lineTo(pTR.x, pTR.y);
      ctx.closePath();
      ctx.fill();
    }

    // 3. Cream / warm stucco front facade wall
    const wallGrad = ctx.createLinearGradient(pTL.x, pTL.y, pBL.x, pBL.y);
    wallGrad.addColorStop(0, '#c2a478');
    wallGrad.addColorStop(0.55, '#d9bc90');
    wallGrad.addColorStop(1, '#b8996c');
    ctx.fillStyle = wallGrad;
    ctx.beginPath();
    ctx.moveTo(pBL.x, pBL.y);
    ctx.lineTo(pBR.x, pBR.y);
    ctx.lineTo(pTR.x, pTR.y);
    ctx.lineTo(pTL.x, pTL.y);
    ctx.closePath();
    ctx.fill();

    // Dark timber framing posts on left, right, and eaves
    const timberW = Math.max(2.0, pBL.scaleX * 0.11);
    ctx.strokeStyle = '#24160c';
    ctx.lineWidth = timberW;
    ctx.lineCap = 'butt';
    ctx.beginPath();
    ctx.moveTo(pBL.x, pBL.y); ctx.lineTo(pTL.x, pTL.y);
    ctx.moveTo(pBR.x, pBR.y); ctx.lineTo(pTR.x, pTR.y);
    ctx.moveTo(pTL.x, pTL.y); ctx.lineTo(pTR.x, pTR.y);
    ctx.stroke();

    // 4. Stone chimney rising behind the right roof slope
    const pChimBL = project(xMid + 0.35, yEaves + 0.4, zFront + 0.6);
    const pChimTR = project(xMid + 0.78, yPeak + 0.15, zFront + 0.6);
    if (pChimBL && pChimTR) {
      ctx.fillStyle = '#4f463d';
      ctx.fillRect(
        pChimBL.x,
        pChimTR.y,
        pChimTR.x - pChimBL.x,
        pChimBL.y - pChimTR.y
      );
    }

    // 5. Steep Royal-Blue Stormwind Pitched Roof
    const roofOverhang = 0.34;
    const pRoofL = project(xL - roofOverhang, yEaves - 0.06, zFront - 0.15);
    const pRoofR = project(xR + roofOverhang, yEaves - 0.06, zFront - 0.15);
    const pRoofPeak = project(xMid, yPeak, zFront + 0.35);
    if (pRoofL && pRoofR && pRoofPeak) {
      const roofGrad = ctx.createLinearGradient(pRoofL.x, pRoofPeak.y, pRoofR.x, pRoofR.y);
      roofGrad.addColorStop(0, '#16358f');
      roofGrad.addColorStop(0.5, '#132d7a');
      roofGrad.addColorStop(1, '#0b1c52');
      ctx.fillStyle = roofGrad;
      ctx.beginPath();
      ctx.moveTo(pRoofL.x, pRoofL.y);
      ctx.lineTo(pRoofPeak.x, pRoofPeak.y);
      ctx.lineTo(pRoofR.x, pRoofR.y);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = '#071133';
      ctx.lineWidth = Math.max(1.5, pBL.scaleY * 0.06);
      ctx.stroke();
    }

    // 6. Two Iconic Glowing Golden-Yellow Windows
    const winCenters = [xL + 0.84, xR - 0.84];
    for (const wx of winCenters) {
      const wyBot = yGround + 0.76;
      const wyTop = yGround + 1.48;
      const wHalf = 0.31;
      const wBL = project(wx - wHalf, wyBot, zFront - 0.02);
      const wTR = project(wx + wHalf, wyTop, zFront - 0.02);
      const wCenter = project(wx, (wyBot + wyTop) * 0.5, zFront - 0.02);
      if (!wBL || !wTR || !wCenter) continue;

      drawSoftGlow(
        ctx,
        wCenter.x,
        wCenter.y,
        wCenter.scaleY * 0.95,
        'rgba(255, 245, 160, 0.65)',
        'rgba(255, 195, 65, 0.25)',
        'rgba(255, 160, 30, 0)'
      );

      const ww = wTR.x - wBL.x;
      const wh = wBL.y - wTR.y;
      ctx.fillStyle = '#fff9c4';
      ctx.fillRect(wBL.x, wTR.y, ww, wh);
      ctx.strokeStyle = '#d49b35';
      ctx.lineWidth = Math.max(1.2, wCenter.scaleX * 0.04);
      ctx.strokeRect(wBL.x, wTR.y, ww, wh);
    }
  }

  // --- Draw a Single 3D Tree Trunk ---
  function drawTreeTrunk(ctx, tree, project) {
    const pBase = project(tree.x, tree.yBase - 0.08, tree.z);
    const pTop = project(tree.x, tree.yBase + tree.hTrunk, tree.z);
    if (!pBase || !pTop) return;

    const rBotPx = tree.rBase * pBase.scaleX;
    const rTopPx = tree.rBase * 0.72 * pTop.scaleX;
    if (rBotPx < 0.8) return;

    const leanPx = Math.sin(tree.x * 1.7 + tree.z) * rTopPx * 0.22;
    const tx = pTop.x + leanPx;
    const ty = pTop.y;
    const bx = pBase.x;
    const by = pBase.y;

    if (tree.z < 22) {
      ctx.fillStyle = 'rgba(12, 24, 5, 0.36)';
      ctx.beginPath();
      ctx.ellipse(bx, by, rBotPx * 1.42, rBotPx * 0.36, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    const mist = clamp(tree.tint || 0, 0, 0.75);
    const litLeft = tree.x > -1.0;
    const cLit = `rgb(${Math.round(lerp(158, 172, mist))},${Math.round(lerp(92, 144, mist))},${Math.round(lerp(52, 106, mist))})`;
    const cMid = `rgb(${Math.round(lerp(114, 148, mist))},${Math.round(lerp(62, 122, mist))},${Math.round(lerp(32, 88, mist))})`;
    const cDark = `rgb(${Math.round(lerp(56, 118, mist))},${Math.round(lerp(28, 96, mist))},${Math.round(lerp(12, 70, mist))})`;

    const grad = ctx.createLinearGradient(bx - rBotPx, by, bx + rBotPx, by);
    if (litLeft) {
      grad.addColorStop(0, cLit);
      grad.addColorStop(0.42, cMid);
      grad.addColorStop(1, cDark);
    } else {
      grad.addColorStop(0, cDark);
      grad.addColorStop(0.58, cMid);
      grad.addColorStop(1, cLit);
    }

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(bx - rBotPx, by);
    ctx.lineTo(tx - rTopPx, ty);
    ctx.lineTo(tx + rTopPx, ty);
    ctx.lineTo(bx + rBotPx, by);
    ctx.closePath();
    ctx.fill();

    if (rBotPx > 8 && mist < 0.25) {
      ctx.strokeStyle = 'rgba(30, 14, 5, 0.20)';
      ctx.lineWidth = Math.max(1, rBotPx * 0.07);
      ctx.beginPath();
      ctx.moveTo(bx - rBotPx * 0.18, by);
      ctx.lineTo(tx - rTopPx * 0.18, ty);
      ctx.stroke();
    }
  }

  // --- Draw a Tree's 3D Faceted Low-Poly Canopy Clusters ---
  function drawTreeCanopy(ctx, tree, project, levelUpFlash) {
    for (const lobe of tree.builtLobes) {
      const lx = tree.x + lobe.ox;
      const ly = tree.yBase + lobe.oy;
      const lz = tree.z + lobe.oz;
      const pCenter = project(lx, ly, lz);
      if (!pCenter) continue;

      for (const f of lobe.faces) {
        if (f.nz > 0.38) continue;

        const v0 = project(lx + f.p0.x, ly + f.p0.y, lz + f.p0.z);
        const v1 = project(lx + f.p1.x, ly + f.p1.y, lz + f.p1.z);
        const v2 = project(lx + f.p2.x, ly + f.p2.y, lz + f.p2.z);
        if (!v0 || !v1 || !v2) continue;

        ctx.fillStyle = f.color;
        ctx.strokeStyle = f.color;
        ctx.lineWidth = 0.65;
        ctx.beginPath();
        ctx.moveTo(v0.x, v0.y);
        ctx.lineTo(v1.x, v1.y);
        ctx.lineTo(v2.x, v2.y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }

      if (levelUpFlash > 0.02 && Math.abs(lx - 1.2) < 4.2 && lz > 7 && lz < 19) {
        drawSoftGlow(
          ctx,
          pCenter.x,
          pCenter.y + pCenter.scaleY * 0.5,
          pCenter.scaleX * 1.4,
          `rgba(255, 238, 120, ${levelUpFlash * 0.18})`,
          `rgba(235, 195, 50, ${levelUpFlash * 0.06})`,
          'rgba(255, 160, 0, 0)'
        );
      }
    }
  }

  // --- Draw Sculpted 3D Third-Person Human Paladin / Alliance Hero Walking Along the Road ---
  function drawPaladinHero3D(ctx, project, heroX, heroY, heroZ, localT, levelUpIntensity) {
    const pFeet = project(heroX, heroY, heroZ);
    if (!pFeet) return;

    const s = pFeet.scaleY * 0.78;
    const x = pFeet.x;
    const y = pFeet.y;

    const walkCycle = localT * 6.2;
    const isCheering = localT >= 2.42 && localT < 6.0;
    const cheerBlend = isCheering
      ? smoothstep(2.42, 2.68, localT) * (1 - smoothstep(5.2, 6.0, localT))
      : 0;
    const stride = Math.sin(walkCycle) * (1 - cheerBlend * 0.55);
    const bob = Math.abs(Math.cos(walkCycle)) * 0.048 * s * (1 - cheerBlend * 0.45);

    ctx.save();
    ctx.translate(x, y - bob);

    // 1. Soft 3D ground contact shadow & golden Paladin Retribution/Devotion Aura circle
    const shGrad = ctx.createRadialGradient(0, bob, 0, 0, bob, s * 0.52);
    shGrad.addColorStop(0, 'rgba(18, 11, 4, 0.58)');
    shGrad.addColorStop(0.65, 'rgba(28, 18, 8, 0.25)');
    shGrad.addColorStop(1, 'rgba(28, 18, 8, 0)');
    ctx.save();
    ctx.translate(0, bob);
    ctx.scale(1.0, 0.34);
    ctx.fillStyle = shGrad;
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.52, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Subtle golden Paladin aura rune ring at feet
    const auraAlpha = 0.22 + levelUpIntensity * 0.55;
    ctx.strokeStyle = `rgba(255, 220, 95, ${auraAlpha})`;
    ctx.lineWidth = Math.max(1.2, s * 0.024);
    ctx.beginPath();
    ctx.ellipse(0, bob, s * 0.48, s * 0.16, 0, 0, Math.PI * 2);
    ctx.stroke();

    // 2. Sculpted 3D Armored Plate Greaves & Sabatons (Left & Right Striding Legs)
    for (const side of [-1, 1]) {
      const legPhase = side * stride;
      const legLift = Math.max(0, -legPhase) * 0.09 * s;
      const legScale = 1.0 - legPhase * 0.06;
      const lx = side * 0.135 * s;
      const lyTop = -0.68 * s;
      const lyBot = -0.02 * s - legLift;
      const gw = 0.155 * s * legScale;

      const legGrad = ctx.createLinearGradient(lx - gw * 0.5, lyTop, lx + gw * 0.5, lyTop);
      legGrad.addColorStop(0, '#3e4756');
      legGrad.addColorStop(0.45, '#8c9bb3');
      legGrad.addColorStop(1, '#2b323d');

      ctx.fillStyle = legGrad;
      ctx.strokeStyle = '#181c24';
      ctx.lineWidth = Math.max(1.0, s * 0.018);
      ctx.beginPath();
      ctx.roundRect(lx - gw * 0.5, lyTop, gw, lyBot - lyTop, 0.035 * s);
      ctx.fill();
      ctx.stroke();

      // Golden Paladin knee-guard & boot cuff
      ctx.fillStyle = '#d9a626';
      ctx.fillRect(lx - gw * 0.52, lyTop + 0.18 * s, gw * 1.04, 0.055 * s);
      ctx.fillStyle = '#5c4314';
      ctx.fillRect(lx - gw * 0.52, lyBot - 0.065 * s, gw * 1.04, 0.065 * s);
    }

    // 3. Left Arm carrying the Sculpted 3D Stormwind Lionheart Heater Shield
    ctx.save();
    ctx.translate(-0.33 * s, -1.06 * s);
    ctx.rotate(0.10 - stride * 0.14);
    const shBodyGrad = ctx.createLinearGradient(-0.18 * s, -0.24 * s, 0.18 * s, 0.28 * s);
    shBodyGrad.addColorStop(0, '#1e4bc2');
    shBodyGrad.addColorStop(0.5, '#112c78');
    shBodyGrad.addColorStop(1, '#081642');
    ctx.fillStyle = shBodyGrad;
    ctx.strokeStyle = '#d9a828';
    ctx.lineWidth = Math.max(1.6, s * 0.035);
    ctx.beginPath();
    ctx.moveTo(-0.17 * s, -0.22 * s);
    ctx.lineTo(0.15 * s, -0.22 * s);
    ctx.lineTo(0.17 * s, 0.06 * s);
    ctx.lineTo(0, 0.30 * s);
    ctx.lineTo(-0.19 * s, 0.06 * s);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Sculpted Golden Lion Crest on Shield
    ctx.fillStyle = '#f5c838';
    ctx.beginPath();
    ctx.arc(-0.01 * s, -0.02 * s, 0.07 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 4. Right Arm & Gleaming Alliance Greatsword (Quel'Serrar / Highlord Runeblade)
    ctx.save();
    ctx.translate(0.33 * s, -1.12 * s);
    const baseSwordAngle = 0.42 + stride * 0.16;
    const cheerSwordAngle = -0.14 + Math.sin(localT * 8) * 0.04;
    ctx.rotate(lerp(baseSwordAngle, cheerSwordAngle, cheerBlend));

    // Subtle Holy Light enchant shimmer on the blade
    drawSoftGlow(
      ctx,
      0.02 * s,
      -0.52 * s,
      (0.36 + levelUpIntensity * 0.35) * s,
      `rgba(255, 245, 165, ${0.38 + levelUpIntensity * 0.42})`,
      'rgba(255, 195, 50, 0.14)',
      'rgba(255, 160, 0, 0)'
    );

    // Beveled 3D steel blade (left lit facet, right shaded facet)
    ctx.fillStyle = '#eef6ff';
    ctx.beginPath();
    ctx.moveTo(-0.048 * s, -0.10 * s);
    ctx.lineTo(0, -1.04 * s);
    ctx.lineTo(0, -0.10 * s);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#8fa4bf';
    ctx.beginPath();
    ctx.moveTo(0, -0.10 * s);
    ctx.lineTo(0, -1.04 * s);
    ctx.lineTo(0.048 * s, -0.10 * s);
    ctx.closePath();
    ctx.fill();

    // Golden central fuller & winged Paladin crossguard
    ctx.fillStyle = '#e6b429';
    ctx.strokeStyle = '#3d2804';
    ctx.lineWidth = Math.max(1.0, s * 0.018);
    ctx.beginPath();
    ctx.moveTo(-0.20 * s, -0.13 * s);
    ctx.lineTo(0, -0.05 * s);
    ctx.lineTo(0.20 * s, -0.13 * s);
    ctx.lineTo(0, -0.18 * s);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Armored right gauntlet gripping the hilt
    ctx.fillStyle = '#7c8a9e';
    ctx.beginPath();
    ctx.arc(0, -0.02 * s, 0.075 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 5. Armored Plate Torso, Libram of Hope at Hip & Flowing 3D Stormwind Cloak
    const capeSway = Math.sin(walkCycle * 0.5 + 0.6) * 0.075 * s;

    // Plate cuirass shoulders/back
    const torsoGrad = ctx.createLinearGradient(-0.26 * s, -1.26 * s, 0.26 * s, -0.64 * s);
    torsoGrad.addColorStop(0, '#6e7d91');
    torsoGrad.addColorStop(0.5, '#9eb0c7');
    torsoGrad.addColorStop(1, '#434d5c');
    ctx.fillStyle = torsoGrad;
    ctx.strokeStyle = '#181d26';
    ctx.lineWidth = Math.max(1.1, s * 0.02);
    ctx.beginPath();
    ctx.moveTo(-0.26 * s, -1.26 * s);
    ctx.lineTo(0.26 * s, -1.26 * s);
    ctx.lineTo(0.19 * s, -0.62 * s);
    ctx.lineTo(-0.19 * s, -0.62 * s);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Billowing Royal-Blue Stormwind Cloak with 3D cloth fold shading & gold embroidery
    const capeGrad = ctx.createLinearGradient(-0.28 * s, -1.24 * s, 0.28 * s, -0.26 * s);
    capeGrad.addColorStop(0, '#0f2769');
    capeGrad.addColorStop(0.38, '#1d46b5');
    capeGrad.addColorStop(0.7, '#122f80');
    capeGrad.addColorStop(1, '#0a1b4f');
    ctx.fillStyle = capeGrad;
    ctx.strokeStyle = '#d4a328';
    ctx.lineWidth = Math.max(1.4, s * 0.026);
    ctx.beginPath();
    ctx.moveTo(-0.22 * s, -1.23 * s);
    ctx.lineTo(0.22 * s, -1.23 * s);
    ctx.quadraticCurveTo(0.30 * s + capeSway, -0.74 * s, 0.28 * s + capeSway * 1.35, -0.26 * s);
    ctx.lineTo(-0.28 * s + capeSway * 1.35, -0.26 * s);
    ctx.quadraticCurveTo(-0.30 * s + capeSway, -0.74 * s, -0.22 * s, -1.23 * s);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Subtle vertical cloth fold shadows on cloak
    ctx.strokeStyle = 'rgba(5, 14, 42, 0.42)';
    ctx.lineWidth = Math.max(1.0, s * 0.02);
    ctx.beginPath();
    ctx.moveTo(-0.08 * s, -1.20 * s);
    ctx.quadraticCurveTo(-0.10 * s + capeSway, -0.74 * s, -0.11 * s + capeSway * 1.3, -0.28 * s);
    ctx.moveTo(0.08 * s, -1.20 * s);
    ctx.quadraticCurveTo(0.10 * s + capeSway, -0.74 * s, 0.11 * s + capeSway * 1.3, -0.28 * s);
    ctx.stroke();

    // Embroidered Golden Alliance Lion Diamond on Cloak
    ctx.fillStyle = '#e8b930';
    ctx.beginPath();
    ctx.moveTo(capeSway * 0.55, -0.94 * s);
    ctx.lineTo(0.075 * s + capeSway * 0.55, -0.80 * s);
    ctx.lineTo(capeSway * 0.55, -0.66 * s);
    ctx.lineTo(-0.075 * s + capeSway * 0.55, -0.80 * s);
    ctx.closePath();
    ctx.fill();

    // 6. Iconic 2004 WoW Multi-Faceted Golden Paladin Pauldrons
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.translate(side * 0.28 * s, -1.22 * s);
      ctx.rotate(side * (0.08 + Math.sin(walkCycle) * 0.04));

      const pGrad = ctx.createLinearGradient(-side * 0.05 * s, -0.22 * s, side * 0.25 * s, 0.12 * s);
      pGrad.addColorStop(0, '#fff099');
      pGrad.addColorStop(0.45, '#e0ac24');
      pGrad.addColorStop(1, '#7a5208');

      ctx.fillStyle = pGrad;
      ctx.strokeStyle = '#2e1d02';
      ctx.lineWidth = Math.max(1.2, s * 0.022);
      ctx.beginPath();
      ctx.moveTo(-side * 0.06 * s, -0.11 * s);
      ctx.lineTo(side * 0.25 * s, -0.21 * s);
      ctx.lineTo(side * 0.21 * s, 0.09 * s);
      ctx.lineTo(-side * 0.04 * s, 0.11 * s);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Inner silver-steel plate trim & sapphire runestone
      ctx.fillStyle = '#cfdbe8';
      ctx.beginPath();
      ctx.moveTo(0, -0.07 * s);
      ctx.lineTo(side * 0.17 * s, -0.14 * s);
      ctx.lineTo(side * 0.14 * s, 0.03 * s);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#1ca3ff';
      ctx.beginPath();
      ctx.arc(side * 0.085 * s, -0.03 * s, 0.032 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 7. Sculpted 3D Paladin Helm, Golden Winged Crown & Tawny-Gold Hair
    // Hair at nape of neck
    ctx.fillStyle = '#8c6224';
    ctx.beginPath();
    ctx.arc(0, -1.36 * s, 0.12 * s, 0, Math.PI);
    ctx.fill();

    // Steel greathelm dome
    const helmGrad = ctx.createRadialGradient(-0.04 * s, -1.48 * s, 0.02 * s, 0, -1.44 * s, 0.15 * s);
    helmGrad.addColorStop(0, '#b8c7db');
    helmGrad.addColorStop(0.6, '#6e7d91');
    helmGrad.addColorStop(1, '#2b323d');
    ctx.fillStyle = helmGrad;
    ctx.strokeStyle = '#181c24';
    ctx.lineWidth = Math.max(1.1, s * 0.02);
    ctx.beginPath();
    ctx.arc(0, -1.44 * s, 0.14 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Golden Paladin crown circlet
    ctx.fillStyle = '#ebbc2e';
    ctx.strokeStyle = '#3b2604';
    ctx.lineWidth = Math.max(1.0, s * 0.018);
    ctx.beginPath();
    ctx.moveTo(-0.15 * s, -1.46 * s);
    ctx.lineTo(-0.18 * s, -1.61 * s);
    ctx.lineTo(-0.07 * s, -1.51 * s);
    ctx.lineTo(0, -1.63 * s);
    ctx.lineTo(0.07 * s, -1.51 * s);
    ctx.lineTo(0.18 * s, -1.61 * s);
    ctx.lineTo(0.15 * s, -1.46 * s);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Golden rim-light halo around the Paladin during Level-Up!
    if (levelUpIntensity > 0.02) {
      drawSoftGlow(
        ctx,
        0,
        -0.95 * s,
        0.95 * s,
        `rgba(255, 245, 160, ${0.38 * levelUpIntensity})`,
        `rgba(255, 200, 50, ${0.14 * levelUpIntensity})`,
        'rgba(255, 160, 0, 0)'
      );
    }

    ctx.restore();
  }

  // --- Draw the Iconic 2004 WoW Level-Up Pillar, Ground Burst & Sparkle Crown (matching frame_023..025!) ---
  function drawLevelUpPillarAndCrown(ctx, project, heroX, heroY, heroZ, localT, w, h) {
    if (localT < 2.32 || localT > 7.5) return;

    const pBase = project(heroX + 0.10, heroY, heroZ);
    const pTop = project(heroX + 0.16, heroY + 3.10, heroZ);
    if (!pBase || !pTop) return;

    const burstRise = smoothstep(2.35, 2.72, localT);
    const pillarDecay = 1.0 - smoothstep(4.65, 6.35, localT);
    const pillarIntensity = burstRise * pillarDecay;
    const s = pBase.scaleY;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    // 1. Expanding Golden Ground Shockwave Ring on the Dirt Road
    if (localT >= 2.45 && localT < 4.5) {
      const ringP = (localT - 2.45) / 2.05;
      const ringAlpha = Math.pow(1 - ringP, 1.5) * 0.72;
      const rx = (0.40 + ringP * 2.1) * pBase.scaleX;
      const ry = rx * 0.28;
      ctx.strokeStyle = `rgba(255, 230, 105, ${ringAlpha})`;
      ctx.lineWidth = Math.max(1.4, (1 - ringP) * 4.2);
      ctx.beginPath();
      ctx.ellipse(pBase.x, pBase.y, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (pillarIntensity > 0.01) {
      // 2. Warm Golden Ground Illumination Pool on the Dirt Road (matching frame_024.jpg!)
      const groundGlowGrad = ctx.createRadialGradient(
        pBase.x, pBase.y, 0,
        pBase.x, pBase.y, s * 1.25
      );
      groundGlowGrad.addColorStop(0, `rgba(255, 238, 130, ${0.48 * pillarIntensity})`);
      groundGlowGrad.addColorStop(0.42, `rgba(245, 175, 45, ${0.22 * pillarIntensity})`);
      groundGlowGrad.addColorStop(1, 'rgba(255, 140, 10, 0)');
      ctx.save();
      ctx.translate(pBase.x, pBase.y);
      ctx.scale(1.0, 0.32);
      ctx.fillStyle = groundGlowGrad;
      ctx.beginPath();
      ctx.arc(0, 0, s * 1.25, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // 3. Semi-Transparent Volumetric Golden Light Rays shooting upward from road to canopy (matching frame_024.jpg!)
      const numRays = 15;
      for (let i = 0; i < numRays; i++) {
        const frac = (i / (numRays - 1)) - 0.5;
        const raySway = Math.sin(localT * 4.5 + i * 1.7) * 0.03 * s;
        const botX = pBase.x + frac * 0.34 * s;
        const botY = pBase.y + 0.02 * s;
        const topX = pTop.x + frac * 1.65 * s + raySway;
        const topY = pTop.y - (0.25 + (i % 3) * 0.18) * s;
        const rayWBot = (0.045 + (1 - Math.abs(frac)) * 0.055) * s;
        const rayWTop = rayWBot * 2.1;

        const rayAlpha = (0.045 + (1 - Math.abs(frac) * 1.5) * 0.075) * pillarIntensity;
        if (rayAlpha <= 0.005) continue;

        const rGrad = ctx.createLinearGradient(botX, botY, topX, topY);
        rGrad.addColorStop(0, `rgba(255, 225, 110, ${rayAlpha * 1.35})`);
        rGrad.addColorStop(0.5, `rgba(255, 205, 65, ${rayAlpha})`);
        rGrad.addColorStop(0.85, `rgba(225, 240, 95, ${rayAlpha * 0.75})`);
        rGrad.addColorStop(1, 'rgba(255, 240, 120, 0)');

        ctx.fillStyle = rGrad;
        ctx.beginPath();
        ctx.moveTo(botX - rayWBot, botY);
        ctx.lineTo(topX - rayWTop, topY);
        ctx.lineTo(topX + rayWTop, topY);
        ctx.lineTo(botX + rayWBot, botY);
        ctx.closePath();
        ctx.fill();
      }

      // 4. Compact Blazing White-Gold Starburst at the Pillar Base on the Road (matching frame_024.jpg!)
      drawSoftGlow(
        ctx,
        pBase.x,
        pBase.y - 0.10 * s,
        0.48 * s,
        `rgba(255, 255, 240, ${0.88 * pillarIntensity})`,
        `rgba(255, 215, 70, ${0.48 * pillarIntensity})`,
        'rgba(255, 150, 0, 0)'
      );

      for (let sp = 0; sp < 7; sp++) {
        const a = -Math.PI * 0.5 + ((sp / 6) - 0.5) * 1.05;
        const len = (0.28 + (sp % 2) * 0.20) * s;
        ctx.strokeStyle = `rgba(255, 250, 190, ${0.48 * pillarIntensity})`;
        ctx.lineWidth = Math.max(1.2, s * 0.022);
        ctx.beginPath();
        ctx.moveTo(pBase.x, pBase.y - 0.04 * s);
        ctx.lineTo(pBase.x + Math.cos(a) * len, pBase.y - 0.04 * s + Math.sin(a) * len);
        ctx.stroke();
      }

      // 5. Warm Golden-Green Canopy Glow where the pillar illuminates the foliage (matching frame_024.jpg!)
      drawSoftGlow(
        ctx,
        pTop.x,
        pTop.y + 0.22 * s,
        1.15 * s,
        `rgba(255, 252, 165, ${0.42 * pillarIntensity})`,
        `rgba(220, 238, 65, ${0.18 * pillarIntensity})`,
        'rgba(180, 220, 40, 0)'
      );
    }

    // 6. Crown of 240 Crisp Individual Golden-White Sparkle Orbs (matching frame_024.jpg!)
    const elapsed = Math.max(0, localT - 2.38);
    const crownExpand = smoothstep(0, 0.55, elapsed);
    const sparkleFade = 1.0 - smoothstep(2.4, 4.6, elapsed);

    if (sparkleFade > 0.01) {
      for (const sp of pillarSparkles) {
        const rad = sp.radialSpread * crownExpand;
        const cascadeDrop = sp.isCrown
          ? Math.max(0, elapsed - 0.45) * sp.driftSpeed * 0.32
          : -elapsed * sp.driftSpeed * 0.45;
        const wx = heroX + 0.14 + Math.cos(sp.angle + elapsed * 0.25) * rad;
        const wz = heroZ + Math.sin(sp.angle + elapsed * 0.25) * rad * 0.65;
        const wy = heroY + sp.targetHeight * crownExpand - cascadeDrop;
        if (wy < heroY + 0.05) continue;

        const pt = project(wx, wy, wz);
        if (!pt) continue;

        const twinkle = 0.68 + 0.32 * Math.sin(localT * 14 + sp.twinklePhase);
        const alpha = clamp(sparkleFade * twinkle, 0, 1);
        const rPx = clamp(sp.size * pt.scaleY, 1.8, 7.5);

        drawSoftGlow(
          ctx,
          pt.x,
          pt.y,
          rPx * 1.65,
          `rgba(255, 255, 245, ${alpha * 0.92})`,
          `rgba(255, 232, 85, ${alpha * 0.55})`,
          'rgba(255, 180, 20, 0)'
        );
      }
    }

    ctx.restore();
  }

  // --- Main Render Function ---
  function drawWoW(ctx, w, h, t) {
    const localT = ((t % 8.0) + 8.0) % 8.0;

    // Camera glides smoothly forward along the Elwynn Forest dirt path, keeping hero trees & cottage framed
    const camZ = localT * 0.21;
    const camX = roadCenterX(camZ) - 1.18 + Math.sin(localT * 1.6) * 0.035;
    const camY = 3.18 + Math.sin(localT * 3.2) * 0.022;

    const horizonY = h * 0.282;
    const fovX = w * 0.62;
    const fovY = h * 0.82;

    function project(wx, wy, wz) {
      const dz = wz - camZ;
      if (dz <= 0.25) return null;
      const scaleX = fovX / dz;
      const scaleY = fovY / dz;
      return {
        x: w * 0.5 + (wx - camX) * scaleX,
        y: horizonY + (camY - wy) * scaleY,
        dz,
        scaleX,
        scaleY
      };
    }

    const levelUpFlash = (localT >= 2.38 && localT < 6.0)
      ? smoothstep(2.38, 2.70, localT) * (1.0 - smoothstep(4.5, 6.0, localT))
      : 0;

    // 1. Sky & Upper Canopy Gap with Divine Level-Up Sky Flash (matching frame_022..025)
    const skyGrad = ctx.createLinearGradient(0, 0, 0, horizonY + h * 0.04);
    skyGrad.addColorStop(0, '#788ca1');
    skyGrad.addColorStop(0.55, '#9ab0b8');
    skyGrad.addColorStop(1, '#d8e0be');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, horizonY + h * 0.04);

    // Upper-center sky burst when Level-Up pillar shoots into the heavens (matching top of frame_024.jpg!)
    if (levelUpFlash > 0.01) {
      drawSoftGlow(
        ctx,
        w * 0.635,
        h * 0.025,
        w * 0.14,
        `rgba(255, 255, 250, ${0.96 * levelUpFlash})`,
        `rgba(235, 245, 210, ${0.58 * levelUpFlash})`,
        'rgba(180, 205, 160, 0)'
      );
    }

    // 2. Blazing Warm Morning Sunlight on Upper-Left Horizon Sky (drawn BEFORE ground fill so green hills stay rich!)
    drawSoftGlow(
      ctx,
      w * 0.14,
      horizonY - h * 0.045,
      w * 0.26,
      'rgba(255, 255, 252, 1.0)',
      'rgba(255, 252, 215, 0.92)',
      'rgba(210, 222, 165, 0)'
    );
    drawSoftGlow(
      ctx,
      w * 0.27,
      horizonY - h * 0.03,
      w * 0.17,
      'rgba(255, 255, 248, 0.98)',
      'rgba(248, 245, 195, 0.78)',
      'rgba(190, 205, 145, 0)'
    );

    // 3. Lush Rolling Elwynn Forest Meadow Ground Base (rich saturated forest greens matching frame_022..025!)
    const groundGrad = ctx.createLinearGradient(0, horizonY, 0, h);
    groundGrad.addColorStop(0, '#4f6b2c');
    groundGrad.addColorStop(0.08, '#38571b');
    groundGrad.addColorStop(0.32, '#2a4711');
    groundGrad.addColorStop(0.68, '#20380b');
    groundGrad.addColorStop(1, '#162b06');
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, horizonY, w, h - horizonY);

    // Subtle golden horizon rim haze right along the distant hill crest
    const mistGrad = ctx.createLinearGradient(0, horizonY - h * 0.025, 0, horizonY + h * 0.065);
    mistGrad.addColorStop(0, 'rgba(248, 250, 215, 0.55)');
    mistGrad.addColorStop(0.45, 'rgba(175, 195, 128, 0.28)');
    mistGrad.addColorStop(1, 'rgba(60, 90, 30, 0)');
    ctx.fillStyle = mistGrad;
    ctx.fillRect(0, horizonY - h * 0.025, w, h * 0.09);

    // 4. 3D Winding Dirt Road through Elwynn Forest (Smooth continuous ribbon without horizontal stepping)
    const roadZMax = 35.0;
    const roadZMin = camZ + 0.35;
    const roadStep = 0.35;
    const leftEdgePts = [];
    const rightEdgePts = [];
    const leftRutPts = [];
    const rightRutPts = [];

    for (let z = roadZMin; z <= roadZMax; z += roadStep) {
      const rcx = roadCenterX(z);
      const rhw = roadHalfWidth(z);
      const ry = terrainHeight(rcx, z);
      const pL = project(rcx - rhw, ry, z);
      const pR = project(rcx + rhw, ry, z);
      const pRutL = project(rcx - rhw * 0.52, ry, z);
      const pRutR = project(rcx + rhw * 0.52, ry, z);
      if (pL && pR) {
        leftEdgePts.push(pL);
        rightEdgePts.push(pR);
      }
      if (pRutL && pRutR) {
        leftRutPts.push(pRutL);
        rightRutPts.push(pRutR);
      }
    }

    if (leftEdgePts.length > 1) {
      // Soft outer dirt-grass verge blend
      ctx.fillStyle = 'rgba(58, 46, 24, 0.58)';
      ctx.beginPath();
      for (let i = 0; i < leftEdgePts.length; i++) {
        const p = leftEdgePts[i];
        if (i === 0) ctx.moveTo(p.x - p.scaleX * 0.26, p.y);
        else ctx.lineTo(p.x - p.scaleX * 0.26, p.y);
      }
      for (let i = rightEdgePts.length - 1; i >= 0; i--) {
        const p = rightEdgePts[i];
        ctx.lineTo(p.x + p.scaleX * 0.26, p.y);
      }
      ctx.closePath();
      ctx.fill();

      // Main earthy brown dirt road surface
      const roadGrad = ctx.createLinearGradient(0, horizonY, 0, h);
      roadGrad.addColorStop(0, '#625238');
      roadGrad.addColorStop(0.25, '#694e32');
      roadGrad.addColorStop(0.65, '#5c4228');
      roadGrad.addColorStop(1, '#4c351e');
      ctx.fillStyle = roadGrad;
      ctx.beginPath();
      for (let i = 0; i < leftEdgePts.length; i++) {
        const p = leftEdgePts[i];
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      }
      for (let i = rightEdgePts.length - 1; i >= 0; i--) {
        const p = rightEdgePts[i];
        ctx.lineTo(p.x, p.y);
      }
      ctx.closePath();
      ctx.fill();

      // Warm worn center dirt track
      const centerGrad = ctx.createLinearGradient(w * 0.48, horizonY, w * 0.78, h);
      centerGrad.addColorStop(0, 'rgba(130, 100, 66, 0.35)');
      centerGrad.addColorStop(0.5, 'rgba(138, 102, 64, 0.45)');
      centerGrad.addColorStop(1, 'rgba(118, 86, 52, 0.38)');
      ctx.fillStyle = centerGrad;
      ctx.beginPath();
      for (let i = 0; i < leftRutPts.length; i++) {
        const p = leftRutPts[i];
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      }
      for (let i = rightRutPts.length - 1; i >= 0; i--) {
        const p = rightRutPts[i];
        ctx.lineTo(p.x, p.y);
      }
      ctx.closePath();
      ctx.fill();
    }

    // 5. Build Depth-Sorted Render Queue (Back-to-Front Painter's Algorithm)
    const drawOps = [];

    // 5a. Goldshire Cottage at z = 15.8
    drawOps.push({
      z: 15.8,
      draw() {
        drawGoldshireCottage(ctx, project);
      }
    });

    // 5b. Trees (Trunks and Overhead Low-Poly Faceted Canopies)
    for (const tree of trees) {
      if (tree.z <= camZ + 0.4) continue;
      drawOps.push({
        z: tree.z,
        draw() {
          drawTreeTrunk(ctx, tree, project);
        }
      });
      drawOps.push({
        z: tree.z - 0.35,
        draw() {
          drawTreeCanopy(ctx, tree, project, levelUpFlash);
        }
      });
    }

    // 5c. 3D Wooden Post-and-Rail Fence along right side of road
    for (let i = 0; i < fencePosts.length; i++) {
      const post = fencePosts[i];
      if (post.z <= camZ + 0.35) continue;
      const nextPost = i + 1 < fencePosts.length ? fencePosts[i + 1] : null;

      drawOps.push({
        z: post.z,
        draw() {
          if (nextPost) {
            for (const railH of [0.64, 0.34]) {
              const pA = project(post.x, post.y + railH, post.z);
              const pB = project(nextPost.x, nextPost.y + railH, nextPost.z);
              if (pA && pB) {
                const railThick = Math.max(1.4, pA.scaleY * (railH > 0.5 ? 0.085 : 0.055));
                ctx.strokeStyle = '#1c1008';
                ctx.lineWidth = railThick;
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(pA.x, pA.y);
                ctx.lineTo(pB.x, pB.y);
                ctx.stroke();

                if (railH > 0.5 && railThick > 2.5) {
                  ctx.strokeStyle = '#4a2c16';
                  ctx.lineWidth = Math.max(0.8, railThick * 0.32);
                  ctx.beginPath();
                  ctx.moveTo(pA.x, pA.y - railThick * 0.28);
                  ctx.lineTo(pB.x, pB.y - railThick * 0.28);
                  ctx.stroke();
                }
              }
            }
          }

          const pBot = project(post.x, post.y - 0.05, post.z);
          const pTop = project(post.x, post.y + post.h, post.z);
          if (pBot && pTop) {
            const postW = Math.max(1.8, pBot.scaleX * 0.13);
            ctx.fillStyle = '#1a0e06';
            ctx.fillRect(pTop.x - postW * 0.5, pTop.y, postW, pBot.y - pTop.y);
            ctx.fillStyle = '#3d2312';
            ctx.fillRect(pTop.x - postW * 0.5, pTop.y, postW * 0.38, pBot.y - pTop.y);
          }
        }
      });
    }

    // 5d. 3,650 Swaying 3D Grass Blades
    const windTime = localT * 2.4;
    for (const blade of grassBlades) {
      if (blade.z <= camZ + 0.4) continue;
      drawOps.push({
        z: blade.z,
        draw() {
          const pBot = project(blade.x, blade.y, blade.z);
          if (!pBot || pBot.x < -20 || pBot.x > w + 20 || pBot.y < horizonY || pBot.y > h + 30) return;
          const sway = Math.sin(windTime + blade.phase) * 0.085 + blade.lean;
          const pTip = project(blade.x + sway, blade.y + blade.h, blade.z);
          if (!pTip) return;

          const bw = Math.max(0.85, pBot.scaleX * 0.022);
          ctx.strokeStyle = blade.color;
          ctx.lineWidth = bw;
          ctx.beginPath();
          ctx.moveTo(pBot.x, pBot.y);
          ctx.lineTo(pTip.x, pTip.y);
          ctx.stroke();
        }
      });
    }

    // 5e. 420 Tiny White/Cream/Yellow Wildflower Specks in the Meadow
    for (const fl of wildflowers) {
      if (fl.z <= camZ + 0.45) continue;
      drawOps.push({
        z: fl.z,
        draw() {
          const sway = Math.sin(windTime + fl.phase) * 0.06;
          const p = project(fl.x + sway, fl.y, fl.z);
          if (!p || p.x < 0 || p.x > w || p.y < horizonY || p.y > h) return;
          const sz = clamp(fl.size * (p.scaleX / 44), 1.3, 3.0);
          ctx.fillStyle = fl.color;
          ctx.fillRect(p.x - sz * 0.5, p.y - sz * 0.5, sz, sz);
        }
      });
    }

    // 5f. 420 Crisp Meadow Golden Bokeh Motes (matching frame_023..025!)
    const meadowBokehMaster = localT < 1.80
      ? 0.08
      : smoothstep(1.80, 2.32, localT) * (1.0 - smoothstep(6.2, 7.85, localT) * 0.72);

    for (const m of meadowBokeh) {
      if (m.z <= camZ + 0.45) continue;
      drawOps.push({
        z: m.z - 0.05,
        draw() {
          const localActive = smoothstep(1.75 + m.appearDelay, 2.25 + m.appearDelay, localT);
          const alpha = clamp(
            (localT < 1.80 ? (m.appearDelay < 0.06 ? 0.42 : 0) : localActive * meadowBokehMaster) *
              (0.65 + 0.35 * Math.sin(localT * 6.5 + m.phase)),
            0,
            1
          );
          if (alpha <= 0.02) return;

          const floatY = m.y + ((localT * m.riseSpeed + m.phase * 0.1) % 0.48);
          const floatX = m.x + Math.sin(localT * 2.2 + m.phase) * m.swayAmp;
          const p = project(floatX, floatY, m.z);
          if (!p || p.x < -20 || p.x > w + 20 || p.y < horizonY || p.y > h + 20) return;

          const rPx = clamp(m.size * p.scaleY, 1.8, 6.8);
          drawSoftGlow(
            ctx,
            p.x,
            p.y,
            rPx * 1.6,
            `rgba(255, 255, 220, ${alpha * 0.96})`,
            `rgba(245, 225, 65, ${alpha * 0.58})`,
            'rgba(220, 180, 20, 0)'
          );
        }
      });
    }

    // 5g. 3D Human Paladin Hero Walking Along the Dirt Road & Triggering Level 60!
    const heroZ = camZ + 5.45;
    const heroX = roadCenterX(heroZ) - 0.08;
    const heroY = terrainHeight(heroX, heroZ);

    drawOps.push({
      z: heroZ,
      draw() {
        drawPaladinHero3D(ctx, project, heroX, heroY, heroZ, localT, levelUpFlash);
      }
    });

    drawOps.push({
      z: heroZ - 0.12,
      draw() {
        drawLevelUpPillarAndCrown(ctx, project, heroX, heroY, heroZ, localT, w, h);
      }
    });

    // Execute Back-to-Front Painter's Algorithm
    drawOps.sort((a, b) => b.z - a.z);
    for (let i = 0; i < drawOps.length; i++) {
      drawOps[i].draw();
    }

    // 6. Subtle Cinematic Vignette
    const vig = ctx.createRadialGradient(w * 0.5, h * 0.48, Math.min(w, h) * 0.38, w * 0.5, h * 0.5, Math.max(w, h) * 0.78);
    vig.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vig.addColorStop(1, 'rgba(0, 0, 0, 0.26)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, w, h);
  }

  window.GAMES[5] = {
    title: 'World of Warcraft',
    year: '2004',
    draw: drawWoW
  };
  window.GameAnimations.game6 = drawWoW;
})();
