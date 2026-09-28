// Game 8: Borderlands 2 (2012) — True 3D Perspective Cel-Shaded Engine & Loot Fountain
// Registers window.GAMES[7] (and window.GameAnimations.game8 for compatibility)
(function () {
  window.GAMES = window.GAMES || [];
  window.GameAnimations = window.GameAnimations || {};

  // Deterministic PRNG (Mulberry32)
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      let t = (a += 0x6d2b79f5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const lerp = (a, b, t) => a + (b - a) * clamp(t, 0, 1);
  const smoothstep = (e0, e1, x) => {
    const t = clamp((x - e0) / (e1 - e0), 0, 1);
    return t * t * (3 - 2 * t);
  };
  const smootherstep = (e0, e1, x) => {
    const t = clamp((x - e0) / (e1 - e0), 0, 1);
    return t * t * t * (t * (t * 6 - 15) + 10);
  };
  const easeOutBack = (x) => {
    const t = clamp(x, 0, 1);
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  };

  // ============================================================================
  // 1. STATIC 3D WORLD GEOMETRY (Plateau Sketch Lines, Horizon Mountains, Rocks)
  // ============================================================================
  const rng = mulberry32(20120918);

  // 680 3D Cross-Hatch Sketch Strokes concentrated in the camera frustum (y = 0)
  const groundStrokes = [];
  for (let i = 0; i < 680; i++) {
    const isNear = i < 490;
    const gx = (rng() - 0.5) * (isNear ? 10.2 : 26.0);
    const gz = isNear
      ? -6.8 + rng() * 14.2
      : 4.0 + Math.pow(rng(), 1.1) * 34.0;

    if (Math.abs(gx) < 0.95 && Math.abs(gz) < 0.58) continue;

    const angle = (rng() - 0.5) * 0.72 + (rng() > 0.7 ? 0.32 : -0.12);
    const len = isNear ? 0.14 + rng() * 0.34 : 0.25 + rng() * 0.55;
    const dx = Math.cos(angle) * len;
    const dz = Math.sin(angle) * len * 0.48;
    groundStrokes.push({
      x0: gx - dx * 0.5,
      z0: gz - dz * 0.5,
      x1: gx + dx * 0.5,
      z1: gz + dz * 0.5,
      alpha: 0.34 + rng() * 0.38,
      width: 1.15 + rng() * 1.45
    });
  }

  // Hand-sketched irregular horizon ridge segments (z = 16 .. 65)
  const horizonSegments = [];
  const ridgeZs = [16, 21, 27, 34, 42, 51, 60, 65];
  for (let r = 0; r < ridgeZs.length; r++) {
    const zBase = ridgeZs[r];
    let curX = -52;
    while (curX < 52) {
      const segLen = 5.5 + rng() * 11.0;
      const gap = rng() > 0.35 ? rng() * 2.2 : -0.8;
      const pts = [];
      const steps = 6;
      for (let s = 0; s <= steps; s++) {
        const x = curX + (s / steps) * segLen;
        const z = zBase + Math.sin(x * 0.22 + r * 1.7) * 1.1 + (rng() - 0.5) * 0.4;
        pts.push({ x, y: 0, z });
      }
      horizonSegments.push({ pts, width: 1.3 + (r > 4 ? 0.7 : 0.2) });
      curX += segLen + gap;
    }
  }

  // Jagged Horizon Mountain Peaks at z = 66 (matching frames 031, 032, 033)
  const mountainPeaks = [
    { x: -45.0, w: 12.5, h: 21.0, fork: 0.95, contourH: 0.48 },
    { x: -33.5, w: 11.0, h: 16.2, fork: 0.75, contourH: 0.52 },
    { x: -20.5, w: 10.5, h: 19.5, fork: 0.85, contourH: 0.46 },
    { x: -9.2, w: 12.8, h: 26.8, fork: 1.15, contourH: 0.52 },
    { x: 1.8, w: 13.2, h: 27.2, fork: 1.15, contourH: 0.54 },
    { x: 16.2, w: 10.2, h: 17.6, fork: 0.80, contourH: 0.49 },
    { x: 28.5, w: 11.8, h: 18.0, fork: 0.85, contourH: 0.48 },
    { x: 40.5, w: 12.5, h: 22.4, fork: 1.05, contourH: 0.53 },
    { x: 53.0, w: 11.5, h: 17.8, fork: 0.75, contourH: 0.50 }
  ];

  // Stylized Comic-Book Cloud Banks in 3D sky space (z = 70)
  const skyCloudBanks = [
    { x: -36, y: 24.8, w: 14.0, h: 2.3, seed: 11 },
    { x: -18, y: 21.6, w: 16.5, h: 2.7, seed: 22 },
    { x: -3, y: 25.8, w: 13.5, h: 2.1, seed: 33 },
    { x: 12, y: 20.4, w: 14.0, h: 2.3, seed: 44 },
    { x: 24, y: 16.6, w: 10.5, h: 1.6, seed: 55 },
    { x: 42, y: 23.6, w: 13.0, h: 2.0, seed: 66 }
  ];

  // Build a solid, ground-flush 3D faceted polyhedron boulder mesh
  function createBoulderMesh(bx, bz, rx, ry, rz, seedVal) {
    const bRng = mulberry32(seedVal);
    const sides = 7;
    const ring0 = []; // ground contact ring (y = 0, widest)
    const ring1 = []; // mid-lower belt (y = 0.44 * ry)
    const ring2 = []; // upper shoulder (y = 0.80 * ry)
    const ring3 = []; // top crown (y = 0.98 * ry)

    for (let i = 0; i < sides; i++) {
      const a = (i / sides) * Math.PI * 2 + (bRng() - 0.5) * 0.15;
      const r0 = 0.95 + bRng() * 0.14;
      const r1 = r0 * (0.82 + bRng() * 0.08);
      const r2 = r1 * (0.62 + bRng() * 0.10);
      const r3 = r2 * (0.38 + bRng() * 0.10);

      ring0.push({
        x: bx + Math.cos(a) * rx * r0,
        y: 0.0,
        z: bz - Math.sin(a) * rz * r0
      });
      ring1.push({
        x: bx + Math.cos(a + 0.05) * rx * r1,
        y: ry * (0.42 + bRng() * 0.08),
        z: bz - Math.sin(a + 0.05) * rz * r1
      });
      ring2.push({
        x: bx + Math.cos(a + 0.11) * rx * r2,
        y: ry * (0.78 + bRng() * 0.08),
        z: bz - Math.sin(a + 0.11) * rz * r2
      });
      ring3.push({
        x: bx + Math.cos(a + 0.16) * rx * r3,
        y: ry * (0.96 + bRng() * 0.06),
        z: bz - Math.sin(a + 0.16) * rz * r3
      });
    }

    const faces = [];
    for (let i = 0; i < sides; i++) {
      const ni = (i + 1) % sides;
      faces.push({ verts: [ring0[i], ring0[ni], ring1[ni], ring1[i]] });
      faces.push({ verts: [ring1[i], ring1[ni], ring2[ni], ring2[i]] });
      faces.push({ verts: [ring2[i], ring2[ni], ring3[ni], ring3[i]] });
    }
    faces.push({ verts: ring3.slice() });

    return { bx, bz, rx, ry, rz, faces };
  }

  const boulderSpecs = [
    // Large foreground-left faceted dark rock (frame_031, frame_032, frame_033)
    { x: -2.85, z: 0.25, rx: 0.96, ry: 0.88, rz: 0.90, seed: 101 },
    // Left-midground cluster
    { x: -3.25, z: 3.1, rx: 0.52, ry: 0.44, rz: 0.48, seed: 102 },
    { x: -2.35, z: 1.9, rx: 0.34, ry: 0.29, rz: 0.32, seed: 103 },
    { x: -2.75, z: 5.4, rx: 0.40, ry: 0.34, rz: 0.38, seed: 104 },
    { x: -1.42, z: 2.5, rx: 0.20, ry: 0.18, rz: 0.20, seed: 105 },
    { x: -1.62, z: 4.8, rx: 0.26, ry: 0.22, rz: 0.25, seed: 106 },
    // Center-back cluster behind the Red Chest
    { x: -0.28, z: 3.7, rx: 0.24, ry: 0.22, rz: 0.23, seed: 107 },
    { x: 0.16, z: 5.7, rx: 0.34, ry: 0.30, rz: 0.32, seed: 108 },
    { x: 0.56, z: 6.1, rx: 0.50, ry: 0.48, rz: 0.46, seed: 109 },
    { x: 1.12, z: 5.5, rx: 0.42, ry: 0.38, rz: 0.40, seed: 110 },
    { x: 1.65, z: 5.0, rx: 0.26, ry: 0.22, rz: 0.24, seed: 111 },
    { x: 1.16, z: 3.0, rx: 0.30, ry: 0.26, rz: 0.28, seed: 112 },
    // Right rock cluster (catches green & orange loot light in frames 032-034!)
    { x: 2.48, z: 4.1, rx: 0.54, ry: 0.48, rz: 0.50, seed: 113 },
    { x: 2.62, z: 3.4, rx: 0.35, ry: 0.30, rz: 0.34, seed: 114 },
    { x: 3.08, z: 4.5, rx: 0.46, ry: 0.42, rz: 0.44, seed: 115 },
    { x: 3.58, z: 4.8, rx: 0.40, ry: 0.36, rz: 0.38, seed: 116 },
    { x: 4.05, z: 3.5, rx: 0.52, ry: 0.44, rz: 0.48, seed: 117 },
    { x: 4.02, z: 2.6, rx: 0.46, ry: 0.40, rz: 0.44, seed: 118 }
  ];

  const boulders = boulderSpecs.map((s) =>
    createBoulderMesh(s.x, s.z, s.rx, s.ry, s.rz, s.seed)
  );

  // ============================================================================
  // 2. LOOT FOUNTAIN ITEMS & BALLISTIC DEFINITIONS
  // ============================================================================
  const lootItems = [
    // 1. HERO LEGENDARY ORANGE ASSAULT RIFLE (High arc -> hovers front-right)
    {
      id: 'legendary_rifle',
      type: 'legendary_rifle',
      rarityColor: '#ff8800',
      beamCore: '#fff8e2',
      lightRGB: [255, 140, 15],
      lightIntensity: 1.85,
      tSpawn: 2.38,
      flightDur: 1.12,
      endX: 1.28,
      endY: 0.40,
      endZ: -0.92,
      peakH: 2.92,
      rotSpins: { x: 2.0, y: 1.0, z: -2.0 },
      endRot: { x: 0.06, y: -0.16, z: 0.12 },
      beamWidth: 0.20,
      beamHeight: 7.8,
      sparkleCount: 44
    },
    // 2. PURPLE EPIC SHOTGUN / RIFLE (Far-right foreground)
    {
      id: 'epic_shotgun',
      type: 'epic_shotgun',
      rarityColor: '#a335ee',
      beamCore: '#f2d8ff',
      lightRGB: [168, 55, 245],
      lightIntensity: 0.65,
      tSpawn: 2.32,
      flightDur: 0.56,
      endX: 2.15,
      endY: 0.13,
      endZ: -1.12,
      peakH: 1.35,
      rotSpins: { x: 1.0, y: -1.0, z: 1.0 },
      endRot: { x: 0.0, y: 0.12, z: -0.04 },
      beamWidth: 0.10,
      beamHeight: 6.8,
      sparkleCount: 14
    },
    // 3. GREEN UNCOMMON SMG (Right midground, visible in frame_032 before Legendary lands)
    {
      id: 'green_smg',
      type: 'green_smg',
      rarityColor: '#1eff00',
      beamCore: '#dcffd6',
      lightRGB: [35, 235, 45],
      lightIntensity: 1.05,
      tSpawn: 2.28,
      flightDur: 0.48,
      endX: 1.44,
      endY: 0.12,
      endZ: -0.58,
      peakH: 1.25,
      rotSpins: { x: -1.0, y: 1.0, z: -1.0 },
      endRot: { x: 0.0, y: -0.08, z: 0.02 },
      beamWidth: 0.12,
      beamHeight: 7.2,
      sparkleCount: 12
    },
    // 4. BLUE RARE GRENADE MOD (Between chest and orange rifle)
    {
      id: 'blue_grenade',
      type: 'blue_grenade',
      rarityColor: '#0070dd',
      beamCore: '#d8eeff',
      lightRGB: [30, 135, 255],
      lightIntensity: 0.45,
      tSpawn: 2.30,
      flightDur: 0.46,
      endX: 0.74,
      endY: 0.10,
      endZ: -0.38,
      peakH: 1.15,
      rotSpins: { x: 2.0, y: 1.0, z: 1.0 },
      endRot: { x: 0.0, y: 0.2, z: 0.0 },
      beamWidth: 0.075,
      beamHeight: 6.2,
      sparkleCount: 8
    },
    // 5. GREEN CASH STACK (Front-left of chest)
    {
      id: 'cash_left',
      type: 'cash_stack',
      rarityColor: '#1eff00',
      beamCore: '#e2ffdc',
      lightRGB: [40, 225, 40],
      lightIntensity: 0.35,
      tSpawn: 2.26,
      flightDur: 0.46,
      endX: -0.64,
      endY: 0.10,
      endZ: -1.08,
      peakH: 1.18,
      rotSpins: { x: 1.0, y: 2.0, z: -1.0 },
      endRot: { x: 0.0, y: 0.55, z: 0.0 },
      beamWidth: 0.095,
      beamHeight: 6.6,
      sparkleCount: 6
    },
    // 6. GREEN CASH STACK (Foreground center-right in front of Legendary Rifle)
    {
      id: 'cash_front',
      type: 'cash_stack',
      rarityColor: '#1eff00',
      beamCore: '#e2ffdc',
      lightRGB: [40, 225, 40],
      lightIntensity: 0.35,
      tSpawn: 2.34,
      flightDur: 0.54,
      endX: 1.08,
      endY: 0.10,
      endZ: -1.78,
      peakH: 1.42,
      rotSpins: { x: -1.0, y: 1.0, z: 1.0 },
      endRot: { x: 0.0, y: -0.52, z: 0.0 },
      beamWidth: 0.095,
      beamHeight: 6.4,
      sparkleCount: 8
    },
    // 7. WHITE COMMON PISTOL (Left of chest)
    {
      id: 'white_pistol',
      type: 'white_pistol',
      rarityColor: '#ffffff',
      beamCore: '#ffffff',
      lightRGB: [220, 230, 245],
      lightIntensity: 0.30,
      tSpawn: 2.25,
      flightDur: 0.44,
      endX: -0.84,
      endY: 0.09,
      endZ: -0.78,
      peakH: 1.12,
      rotSpins: { x: 1.0, y: -1.0, z: 2.0 },
      endRot: { x: 0.1, y: 1.15, z: 0.0 },
      beamWidth: 0.09,
      beamHeight: 5.8,
      sparkleCount: 6
    },
    // 8. WHITE COMMON AMMO PACK (Far-left of chest)
    {
      id: 'ammo_left',
      type: 'ammo_box',
      rarityColor: '#ffffff',
      beamCore: '#ffffff',
      lightRGB: [210, 220, 235],
      lightIntensity: 0.25,
      tSpawn: 2.27,
      flightDur: 0.45,
      endX: -1.08,
      endY: 0.08,
      endZ: -0.52,
      peakH: 1.08,
      rotSpins: { x: -1.0, y: 1.0, z: -1.0 },
      endRot: { x: 0.0, y: 0.35, z: 0.0 },
      beamWidth: 0.085,
      beamHeight: 5.4,
      sparkleCount: 5
    },
    // 9. WHITE COMMON AMMO CRATE (Foreground far-right, bright white beam in frames 033-034)
    {
      id: 'ammo_front_right',
      type: 'ammo_box_large',
      rarityColor: '#ffffff',
      beamCore: '#ffffff',
      lightRGB: [235, 242, 255],
      lightIntensity: 0.45,
      tSpawn: 2.36,
      flightDur: 0.58,
      endX: 1.98,
      endY: 0.11,
      endZ: -1.84,
      peakH: 1.48,
      rotSpins: { x: 1.0, y: -2.0, z: 1.0 },
      endRot: { x: 0.0, y: -0.28, z: 0.0 },
      beamWidth: 0.13,
      beamHeight: 7.4,
      sparkleCount: 10
    }
  ];

  // ============================================================================
  // 3. 3D MATH & MESH HELPERS
  // ============================================================================
  function sub3(a, b) {
    return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
  }
  function cross3(a, b) {
    return {
      x: a.y * b.z - a.z * b.y,
      y: a.z * b.x - a.x * b.z,
      z: a.x * b.y - a.y * b.x
    };
  }
  function dot3(a, b) {
    return a.x * b.x + a.y * b.y + a.z * b.z;
  }
  function norm3(v) {
    const len = Math.hypot(v.x, v.y, v.z) || 1;
    return { x: v.x / len, y: v.y / len, z: v.z / len };
  }

  function transformPoint(p, rx, ry, rz, tx, ty, tz) {
    let x = p.x;
    let y = p.y;
    let z = p.z;

    if (rz !== 0) {
      const cz = Math.cos(rz), sz = Math.sin(rz);
      const nx = x * cz - y * sz;
      const ny = x * sz + y * cz;
      x = nx;
      y = ny;
    }
    if (rx !== 0) {
      const cx = Math.cos(rx), sx = Math.sin(rx);
      const ny = y * cx - z * sx;
      const nz = y * sx + z * cx;
      y = ny;
      z = nz;
    }
    if (ry !== 0) {
      const cy = Math.cos(ry), sy = Math.sin(ry);
      const nx = x * cy + z * sy;
      const nz = -x * sy + z * cy;
      x = nx;
      z = nz;
    }
    return { x: x + tx, y: y + ty, z: z + tz };
  }

  function buildBoxFaces(x0, x1, y0, y1, z0, z1, colors, transformFn) {
    const v = [
      { x: x0, y: y0, z: z0 }, // 0: front-bottom-left
      { x: x1, y: y0, z: z0 }, // 1: front-bottom-right
      { x: x1, y: y1, z: z0 }, // 2: front-top-right
      { x: x0, y: y1, z: z0 }, // 3: front-top-left
      { x: x0, y: y0, z: z1 }, // 4: back-bottom-left
      { x: x1, y: y0, z: z1 }, // 5: back-bottom-right
      { x: x1, y: y1, z: z1 }, // 6: back-top-right
      { x: x0, y: y1, z: z1 }  // 7: back-top-left
    ].map((pt) => (transformFn ? transformFn(pt) : pt));

    const cFront = colors.front || colors.base || '#b0140c';
    const cBack = colors.back || colors.side || cFront;
    const cLeft = colors.left || colors.side || cFront;
    const cRight = colors.right || colors.side || cFront;
    const cTop = colors.top || colors.base || cFront;
    const cBottom = colors.bottom || colors.side || cFront;
    const strokeW = colors.strokeWidth !== undefined ? colors.strokeWidth : 2.2;

    return [
      { verts: [v[0], v[1], v[2], v[3]], color: cFront, strokeW },  // Front (-Z)
      { verts: [v[5], v[4], v[7], v[6]], color: cBack, strokeW },   // Back (+Z)
      { verts: [v[4], v[0], v[3], v[7]], color: cLeft, strokeW },   // Left (-X)
      { verts: [v[1], v[5], v[6], v[2]], color: cRight, strokeW },  // Right (+X)
      { verts: [v[3], v[2], v[6], v[7]], color: cTop, strokeW },    // Top (+Y)
      { verts: [v[4], v[5], v[1], v[0]], color: cBottom, strokeW }  // Bottom (-Y)
    ];
  }

  function buildLootItemFaces(item, rx, ry, rz, tx, ty, tz) {
    const tf = (pt) => transformPoint(pt, rx, ry, rz, tx, ty, tz);
    const faces = [];
    const pushBox = (x0, x1, y0, y1, z0, z1, cols) => {
      const bf = buildBoxFaces(x0, x1, y0, y1, z0, z1, cols, tf);
      for (let i = 0; i < bf.length; i++) faces.push(bf[i]);
    };

    if (item.type === 'legendary_rifle') {
      pushBox(-0.56, -0.28, -0.09, 0.06, -0.045, 0.045, {
        base: '#14171c', side: '#0d0f12', top: '#222730', strokeWidth: 2.4
      });
      pushBox(-0.28, -0.06, -0.08, 0.09, -0.055, 0.055, {
        front: '#d4b818', top: '#f59810', side: '#a67c10', strokeWidth: 2.5
      });
      pushBox(-0.06, 0.26, -0.08, 0.09, -0.055, 0.055, {
        front: '#e87810', top: '#ff9d1a', side: '#b85608', strokeWidth: 2.5
      });
      pushBox(-0.08, 0.05, -0.27, -0.08, -0.038, 0.038, {
        base: '#2b1d12', side: '#1a110a', strokeWidth: 2.2
      });
      pushBox(-0.14, 0.14, 0.09, 0.17, -0.038, 0.038, {
        base: '#24221e', top: '#3b362e', side: '#161412', strokeWidth: 2.2
      });
      pushBox(0.26, 0.38, -0.06, 0.06, -0.04, 0.04, {
        base: '#1c2026', top: '#2c323b', strokeWidth: 2.2
      });
      pushBox(0.38, 0.68, -0.01, 0.05, -0.025, 0.025, {
        base: '#12151a', top: '#242933', strokeWidth: 2.2
      });
      pushBox(0.28, 0.48, -0.08, -0.03, -0.02, 0.02, {
        base: '#16191f', strokeWidth: 1.8
      });
    } else if (item.type === 'epic_shotgun') {
      pushBox(-0.46, -0.24, -0.06, 0.04, -0.04, 0.04, {
        base: '#15161c', strokeWidth: 2.0
      });
      pushBox(-0.24, 0.24, -0.06, 0.06, -0.05, 0.05, {
        front: '#5e239d', top: '#7b32c9', side: '#431673', strokeWidth: 2.2
      });
      pushBox(-0.06, 0.12, 0.06, 0.11, -0.035, 0.035, {
        base: '#1c1e26', strokeWidth: 1.8
      });
      pushBox(0.24, 0.52, -0.03, 0.03, -0.025, 0.025, {
        base: '#181a20', strokeWidth: 2.0
      });
    } else if (item.type === 'green_smg') {
      pushBox(-0.36, -0.18, -0.04, 0.03, -0.035, 0.035, {
        base: '#181c18', strokeWidth: 1.8
      });
      pushBox(-0.18, 0.20, -0.05, 0.05, -0.045, 0.045, {
        front: '#288a22', top: '#38b830', side: '#1b6117', strokeWidth: 2.0
      });
      pushBox(-0.05, 0.08, 0.05, 0.10, -0.03, 0.03, {
        base: '#182218', strokeWidth: 1.8
      });
      pushBox(0.20, 0.44, -0.025, 0.025, -0.02, 0.02, {
        base: '#151815', strokeWidth: 1.8
      });
    } else if (item.type === 'blue_grenade') {
      pushBox(-0.075, 0.075, -0.075, 0.075, -0.075, 0.075, {
        front: '#162852', top: '#244285', side: '#0f1b38', strokeWidth: 2.0
      });
      pushBox(-0.035, 0.035, 0.075, 0.115, -0.035, 0.035, {
        base: '#455266', strokeWidth: 1.6
      });
    } else if (item.type === 'cash_stack') {
      pushBox(-0.16, 0.16, -0.09, 0.09, -0.10, 0.10, {
        front: '#1e5c1e', top: '#2e852e', side: '#154215', strokeWidth: 2.0
      });
      pushBox(-0.045, 0.045, -0.094, 0.094, -0.104, 0.104, {
        front: '#bfa328', top: '#e0c438', side: '#8f781a', strokeWidth: 1.8
      });
    } else if (item.type === 'white_pistol') {
      pushBox(-0.15, 0.15, -0.01, 0.07, -0.035, 0.035, {
        front: '#323842', top: '#687385', side: '#1e2229', strokeWidth: 1.9
      });
      pushBox(-0.14, -0.03, -0.11, -0.01, -0.03, 0.03, {
        base: '#181b20', strokeWidth: 1.8
      });
    } else if (item.type === 'ammo_box' || item.type === 'ammo_box_large') {
      const s = item.type === 'ammo_box_large' ? 1.28 : 0.88;
      pushBox(-0.11 * s, 0.11 * s, -0.08 * s, 0.08 * s, -0.10 * s, 0.10 * s, {
        front: '#22241e', top: '#3c4035', side: '#161814', strokeWidth: 2.0
      });
      pushBox(-0.114 * s, 0.114 * s, -0.02 * s, 0.025 * s, -0.104 * s, 0.104 * s, {
        front: '#9e7b18', top: '#c49a22', side: '#785c10', strokeWidth: 1.5
      });
    }

    return faces;
  }

  function hexToRgb(hex) {
    const clean = hex.replace('#', '');
    const num = parseInt(clean, 16);
    return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
  }

  function rgbToCss(r, g, b) {
    return `rgb(${clamp(Math.round(r), 0, 255)},${clamp(Math.round(g), 0, 255)},${clamp(Math.round(b), 0, 255)})`;
  }

  function drawFirstPersonViewmodel(ctx, w, h, localT, bobX, bobY) {
    if (localT >= 1.52) return;
    const holsterP = smoothstep(1.12, 1.50, localT);
    const scale = Math.min(w, h) / 720;

    ctx.save();
    const vx = w * 0.78 + bobX * 180 * scale + holsterP * 110 * scale;
    const vy = h * 0.86 + bobY * 160 * scale + holsterP * 220 * scale;
    ctx.translate(vx, vy);
    ctx.scale(scale, scale);
    ctx.rotate(-0.14 + holsterP * 0.38);

    const poly = (pts, fill, lw = 3.5) => {
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.lineWidth = lw;
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#07080b';
      ctx.stroke();
    };

    poly([[-165, -92], [-75, -62], [-75, -34], [-165, -68]], '#282d36', 3.5);
    poly([[-182, -98], [-158, -90], [-158, -64], [-182, -74]], '#181b20', 3.2);
    poly([[-95, -68], [55, -18], [55, 28], [-95, -24]], '#d96b14', 4.0);
    poly([[-85, -56], [42, -14], [42, 4], [-85, -38]], '#f5931e', 2.5);

    ctx.fillStyle = '#00f0ff';
    ctx.strokeStyle = '#07080b';
    ctx.lineWidth = 3.0;
    ctx.beginPath();
    ctx.ellipse(-22, -22, 18, 11, 0.32, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    poly([[-48, -82], [12, -62], [18, -32], [-42, -52]], '#1e2229', 3.2);
    ctx.fillStyle = '#00ff66';
    ctx.beginPath();
    ctx.arc(-16, -58, 5, 0, Math.PI * 2);
    ctx.fill();

    poly([[-18, 4], [75, 32], [115, 145], [10, 145]], '#2e2622', 3.8);
    ctx.restore();
  }

  // ============================================================================
  // 4. MAIN RENDER FUNCTION: draw(ctx, w, h, t)
  // ============================================================================
  function drawBorderlands2(ctx, w, h, t) {
    const localT = ((t % 8.0) + 8.0) % 8.0;

    ctx.save();

    // --------------------------------------------------------------------------
    // A. CAMERA CHOREOGRAPHY ACROSS 0.0s .. 8.0s
    // --------------------------------------------------------------------------
    const walkP = smootherstep(0.0, 1.72, localT);
    const tiltUpP = smootherstep(1.82, 2.75, localT);
    const settleTiltP = smootherstep(3.1, 4.5, localT);
    const closeupP = smootherstep(5.25, 7.25, localT);

    const walkActive = 1 - smoothstep(1.35, 1.72, localT);
    const bobY = Math.abs(Math.sin(localT * 9.5)) * 0.075 * walkActive;
    const bobX = Math.cos(localT * 4.75) * 0.045 * walkActive;

    const camPos = {
      x: lerp(0.0, 0.82, closeupP) + bobX,
      y: lerp(1.62, 1.24, closeupP) + bobY,
      z: lerp(-8.8, -4.95, walkP) + lerp(0.0, 2.05, closeupP)
    };

    let lookY = 0.22;
    lookY += tiltUpP * 0.88;
    lookY -= settleTiltP * 0.16;
    lookY = lerp(lookY, 0.34, closeupP);

    const camTarget = {
      x: lerp(0.0, 0.96, closeupP),
      y: lookY + bobY * 0.4,
      z: lerp(0.0, -0.78, closeupP)
    };

    const forward = norm3(sub3(camTarget, camPos));
    const worldUp = { x: 0, y: 1, z: 0 };
    const right = norm3(cross3(worldUp, forward));
    const upVec = cross3(forward, right);

    const fov = Math.min(w, h) * 1.02;
    const screenCX = w * 0.5;
    const screenCY = h * 0.5;

    function worldToCam(p) {
      const dx = p.x - camPos.x;
      const dy = p.y - camPos.y;
      const dz = p.z - camPos.z;
      return {
        x: dx * right.x + dy * right.y + dz * right.z,
        y: dx * upVec.x + dy * upVec.y + dz * upVec.z,
        z: dx * forward.x + dy * forward.y + dz * forward.z
      };
    }

    function camToScreen(cp) {
      const invZ = fov / Math.max(0.08, cp.z);
      return {
        x: screenCX + cp.x * invZ,
        y: screenCY - cp.y * invZ,
        z: cp.z,
        scale: invZ
      };
    }

    function projectPoint(p) {
      const cp = worldToCam(p);
      if (cp.z <= 0.12) return null;
      return camToScreen(cp);
    }

    function projectPolygon(worldVerts) {
      const nearZ = 0.15;
      const camVerts = worldVerts.map(worldToCam);
      const clipped = [];
      for (let i = 0; i < camVerts.length; i++) {
        const cur = camVerts[i];
        const prev = camVerts[(i + camVerts.length - 1) % camVerts.length];
        const curIn = cur.z >= nearZ;
        const prevIn = prev.z >= nearZ;
        if (curIn !== prevIn) {
          const tClip = (nearZ - prev.z) / (cur.z - prev.z);
          clipped.push({
            x: prev.x + (cur.x - prev.x) * tClip,
            y: prev.y + (cur.y - prev.y) * tClip,
            z: nearZ
          });
        }
        if (curIn) clipped.push(cur);
      }
      if (clipped.length < 3) return null;
      return clipped.map(camToScreen);
    }

    function projectLine(p0, p1) {
      const nearZ = 0.15;
      let c0 = worldToCam(p0);
      let c1 = worldToCam(p1);
      if (c0.z < nearZ && c1.z < nearZ) return null;
      if (c0.z < nearZ) {
        const tc = (nearZ - c0.z) / (c1.z - c0.z);
        c0 = { x: c0.x + (c1.x - c0.x) * tc, y: c0.y + (c1.y - c0.y) * tc, z: nearZ };
      } else if (c1.z < nearZ) {
        const tc = (nearZ - c1.z) / (c0.z - c1.z);
        c1 = { x: c1.x + (c0.x - c1.x) * tc, y: c1.y + (c0.y - c1.y) * tc, z: nearZ };
      }
      return [camToScreen(c0), camToScreen(c1)];
    }

    // --------------------------------------------------------------------------
    // B. COMPUTE ACTIVE LOOT ITEM POSITIONS & DYNAMIC POINT LIGHTS
    // --------------------------------------------------------------------------
    const activeLootStates = [];
    const activePointLights = [];

    for (let i = 0; i < lootItems.length; i++) {
      const item = lootItems[i];
      if (localT < item.tSpawn) continue;

      const elapsed = localT - item.tSpawn;
      const u = clamp(elapsed / item.flightDur, 0, 1);

      const startX = 0.0;
      const startY = 0.58;
      const startZ = 0.0;

      const x = lerp(startX, item.endX, u);
      const z = lerp(startZ, item.endZ, u);

      const linearY = lerp(startY, item.endY, u);
      const arcBump = 4 * u * (1 - u) * (item.peakH - (startY + item.endY) * 0.5);
      let y = linearY + Math.max(0, arcBump);

      if (elapsed > item.flightDur) {
        const postT = elapsed - item.flightDur;
        if (item.id === 'legendary_rifle') {
          y = item.endY + Math.sin(postT * 3.2) * 0.022;
        } else if (postT < 0.26) {
          y = item.endY + Math.sin((postT / 0.26) * Math.PI) * 0.08;
        }
      }

      const spinDecay = Math.pow(1 - u, 1.15);
      const rx = item.endRot.x + spinDecay * item.rotSpins.x * Math.PI * 2;
      const ry = item.endRot.y + spinDecay * item.rotSpins.y * Math.PI * 2;
      const rz = item.endRot.z + spinDecay * item.rotSpins.z * Math.PI * 2;

      const beamStartT = item.tSpawn + item.flightDur * 0.72;
      let beamAlpha = smoothstep(beamStartT, beamStartT + 0.22, localT);

      // Once the Hero Legendary Rifle lands at ~3.5s, let the green_smg body tuck/fade so the
      // Legendary Rifle silhouette in front of it is 100% clean in frames 033 & 034!
      const hideBody = item.id === 'green_smg' && localT >= 3.38;

      activeLootStates.push({
        item,
        x,
        y,
        z,
        rx,
        ry,
        rz,
        u,
        beamAlpha,
        hideBody
      });

      if (beamAlpha > 0.05 && (item.id === 'legendary_rifle' || item.id === 'green_smg')) {
        activePointLights.push({
          x: item.id === 'legendary_rifle' ? 2.4 : 2.1,
          y: 0.75,
          z: 3.6,
          rgb: item.lightRGB,
          intensity: item.lightIntensity * beamAlpha
        });
      }
    }

    // --------------------------------------------------------------------------
    // C. SKY, CEL-SHADED CLOUDS, SUN BLOOM & JAGGED HORIZON MOUNTAINS
    // --------------------------------------------------------------------------
    const horizonRef = projectPoint({ x: 0, y: 0, z: 68 });
    const horizonY = horizonRef ? clamp(horizonRef.y, -h * 0.3, h * 0.85) : h * 0.25;

    const skyGrad = ctx.createLinearGradient(0, 0, 0, Math.max(80, horizonY + 20));
    skyGrad.addColorStop(0, '#4d6a88');
    skyGrad.addColorStop(0.55, '#7f9cb6');
    skyGrad.addColorStop(1, '#c5d8e8');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, Math.max(0, horizonY + 15));

    const sunPt = projectPoint({ x: 20.5, y: 7.2, z: 68 });
    if (sunPt) {
      const sunR = fov * 0.38;
      const sunGrad = ctx.createRadialGradient(sunPt.x, sunPt.y, sunR * 0.08, sunPt.x, sunPt.y, sunR);
      sunGrad.addColorStop(0, 'rgba(255, 255, 250, 0.98)');
      sunGrad.addColorStop(0.32, 'rgba(255, 250, 230, 0.72)');
      sunGrad.addColorStop(0.65, 'rgba(215, 232, 245, 0.25)');
      sunGrad.addColorStop(1, 'rgba(180, 205, 225, 0)');
      ctx.fillStyle = sunGrad;
      ctx.beginPath();
      ctx.arc(sunPt.x, sunPt.y, sunR, 0, Math.PI * 2);
      ctx.fill();
    }

    for (let c = 0; c < skyCloudBanks.length; c++) {
      const cl = skyCloudBanks[c];
      const cp = projectPoint({ x: cl.x + Math.sin(localT * 0.15 + c) * 0.25, y: cl.y, z: 70 });
      if (!cp || cp.y > horizonY + 40) continue;
      const cw = cl.w * cp.scale;
      const ch = cl.h * cp.scale;

      ctx.save();
      ctx.translate(cp.x, cp.y);

      ctx.beginPath();
      ctx.moveTo(-cw, ch * 0.25);
      ctx.bezierCurveTo(-cw * 0.95, -ch * 0.55, -cw * 0.45, -ch * 0.75, -cw * 0.25, -ch * 0.42);
      ctx.bezierCurveTo(-cw * 0.10, -ch * 1.05, cw * 0.35, -ch * 0.95, cw * 0.48, -ch * 0.35);
      ctx.bezierCurveTo(cw * 0.72, -ch * 0.65, cw * 1.02, -ch * 0.25, cw, ch * 0.28);
      ctx.bezierCurveTo(cw * 0.55, ch * 0.62, -cw * 0.55, ch * 0.62, -cw, ch * 0.25);
      ctx.closePath();

      ctx.fillStyle = '#9db4c9';
      ctx.fill();
      ctx.lineWidth = Math.max(1.8, cp.scale * 0.15);
      ctx.strokeStyle = '#1b2430';
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(-cw * 0.88, ch * 0.18);
      ctx.quadraticCurveTo(0, ch * 0.52, cw * 0.88, ch * 0.20);
      ctx.quadraticCurveTo(0, ch * 0.02, -cw * 0.88, ch * 0.18);
      ctx.fillStyle = '#687f96';
      ctx.fill();

      ctx.restore();
    }

    const groundGrad = ctx.createLinearGradient(0, Math.max(0, horizonY - 4), 0, h);
    groundGrad.addColorStop(0, '#a0a7b0');
    groundGrad.addColorStop(0.25, '#9197a0');
    groundGrad.addColorStop(0.75, '#828891');
    groundGrad.addColorStop(1, '#757b84');
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, Math.max(0, horizonY - 2), w, h - Math.max(0, horizonY - 2) + 4);

    for (let m = 0; m < mountainPeaks.length; m++) {
      const pk = mountainPeaks[m];
      const zM = 66;
      const pLeft = projectPoint({ x: pk.x - pk.w, y: 0, z: zM });
      const pRight = projectPoint({ x: pk.x + pk.w, y: 0, z: zM });
      const pTip = projectPoint({ x: pk.x, y: pk.h, z: zM });
      const pRidgeBase = projectPoint({ x: pk.x + pk.w * 0.08, y: 0, z: zM });

      if (!pLeft || !pRight || !pTip || !pRidgeBase) continue;

      ctx.fillStyle = '#6d8299';
      ctx.beginPath();
      ctx.moveTo(pLeft.x, pLeft.y);
      ctx.lineTo(pTip.x, pTip.y);
      ctx.lineTo(pRidgeBase.x, pRidgeBase.y);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#89a0b8';
      ctx.beginPath();
      ctx.moveTo(pRidgeBase.x, pRidgeBase.y);
      ctx.lineTo(pTip.x, pTip.y);
      ctx.lineTo(pRight.x, pRight.y);
      ctx.closePath();
      ctx.fill();

      const ch = pk.contourH;
      const cLeft = { x: lerp(pLeft.x, pTip.x, ch), y: lerp(pLeft.y, pTip.y, ch) };
      const cMid = { x: lerp(pRidgeBase.x, pTip.x, ch + 0.05), y: lerp(pRidgeBase.y, pTip.y, ch + 0.05) };
      const cRight = { x: lerp(pRight.x, pTip.x, ch), y: lerp(pRight.y, pTip.y, ch) };

      ctx.fillStyle = '#9db3c9';
      ctx.beginPath();
      ctx.moveTo(cMid.x, cMid.y);
      ctx.lineTo(pTip.x, pTip.y);
      ctx.lineTo(cRight.x, cRight.y);
      ctx.closePath();
      ctx.fill();

      const mainInkW = Math.max(3.5, pTip.scale * 0.95);
      ctx.strokeStyle = '#08090c';
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.lineWidth = mainInkW;
      ctx.beginPath();
      ctx.moveTo(pLeft.x, pLeft.y);
      ctx.lineTo(pTip.x, pTip.y);
      ctx.lineTo(pRight.x, pRight.y);
      ctx.stroke();

      ctx.lineWidth = Math.max(1.6, mainInkW * 0.42);
      ctx.beginPath();
      ctx.moveTo(pTip.x, pTip.y);
      ctx.lineTo(pRidgeBase.x, pRidgeBase.y);
      ctx.stroke();

      ctx.lineWidth = Math.max(1.5, mainInkW * 0.38);
      ctx.beginPath();
      ctx.moveTo(cLeft.x, cLeft.y);
      ctx.quadraticCurveTo(cMid.x, cMid.y - 3, cRight.x, cRight.y);
      ctx.stroke();

      const fk = pk.fork * pTip.scale;
      ctx.lineWidth = Math.max(1.8, mainInkW * 0.48);
      ctx.beginPath();
      ctx.moveTo(pTip.x - fk * 0.7, pTip.y + fk * 1.4);
      ctx.lineTo(pTip.x - fk * 0.35, pTip.y - fk * 0.25);
      ctx.moveTo(pTip.x + fk * 0.7, pTip.y + fk * 1.4);
      ctx.lineTo(pTip.x + fk * 0.35, pTip.y - fk * 0.25);
      ctx.stroke();
    }

    // --------------------------------------------------------------------------
    // D. 3D PLATEAU HORIZON CONTOURS, SKETCH STROKES & COLORED LIGHT POOLS
    // --------------------------------------------------------------------------
    ctx.strokeStyle = '#0c0e12';
    ctx.lineCap = 'round';
    for (let c = 0; c < horizonSegments.length; c++) {
      const seg = horizonSegments[c];
      ctx.lineWidth = seg.width;
      ctx.beginPath();
      let started = false;
      for (let s = 0; s < seg.pts.length; s++) {
        const pt = projectPoint(seg.pts[s]);
        if (!pt) continue;
        if (!started) {
          ctx.moveTo(pt.x, pt.y);
          started = true;
        } else {
          ctx.lineTo(pt.x, pt.y);
        }
      }
      ctx.stroke();
    }

    for (let i = 0; i < groundStrokes.length; i++) {
      const st = groundStrokes[i];
      const seg = projectLine({ x: st.x0, y: 0, z: st.z0 }, { x: st.x1, y: 0, z: st.z1 });
      if (!seg) continue;
      const avgZ = (seg[0].z + seg[1].z) * 0.5;
      if (avgZ > 36) continue;
      const distFade = clamp(1 - avgZ / 34, 0.18, 1);
      ctx.strokeStyle = `rgba(22, 26, 32, ${(st.alpha * distFade).toFixed(3)})`;
      ctx.lineWidth = clamp(st.width * (5.2 / avgZ), 0.8, 3.4);
      ctx.beginPath();
      ctx.moveTo(seg[0].x, seg[0].y);
      ctx.lineTo(seg[1].x, seg[1].y);
      ctx.stroke();
    }

    for (let i = 0; i < activeLootStates.length; i++) {
      const st = activeLootStates[i];
      if (st.beamAlpha <= 0.02) continue;
      const gp = projectPoint({ x: st.x, y: 0.02, z: st.z });
      if (!gp) continue;
      const poolR = st.item.beamWidth * gp.scale * (st.item.id === 'legendary_rifle' ? 4.8 : 2.6);
      if (poolR < 2) continue;
      ctx.save();
      ctx.translate(gp.x, gp.y);
      ctx.scale(1.0, 0.50);
      const [lr, lg, lb] = st.item.lightRGB;
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, poolR);
      g.addColorStop(0, `rgba(255, 255, 255, ${(0.52 * st.beamAlpha).toFixed(3)})`);
      g.addColorStop(0.35, `rgba(${lr}, ${lg}, ${lb}, ${(0.38 * st.beamAlpha).toFixed(3)})`);
      g.addColorStop(1, `rgba(${lr}, ${lg}, ${lb}, 0)`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, poolR, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // --------------------------------------------------------------------------
    // E. COLLECT & DEPTH-SORT ALL 3D SCENE FACES (Boulders, Red Chest, Loot Items)
    // --------------------------------------------------------------------------
    const renderQueue = [];
    const sunDir = norm3({ x: 0.45, y: 0.78, z: -0.45 });

    function enqueueFace(verts, baseHex, strokeW, receiveLootLight = false, extraBiasZ = 0) {
      const proj = projectPolygon(verts);
      if (!proj) return;

      let cx = 0, cy = 0, cz = 0;
      for (let i = 0; i < verts.length; i++) {
        cx += verts[i].x;
        cy += verts[i].y;
        cz += verts[i].z;
      }
      cx /= verts.length;
      cy /= verts.length;
      cz /= verts.length;

      const e1 = sub3(verts[1], verts[0]);
      const e2 = sub3(verts[2], verts[0]);
      const normal = norm3(cross3(e2, e1));

      const viewVec = sub3(camPos, { x: cx, y: cy, z: cz });
      if (dot3(normal, viewVec) < -0.05) return;

      const ndl = dot3(normal, sunDir);
      let shadeMul = ndl > 0.35 ? 1.08 : ndl > -0.15 ? 0.90 : 0.72;
      let [r, g, b] = hexToRgb(baseHex);
      r *= shadeMul;
      g *= shadeMul;
      b *= shadeMul;

      if (receiveLootLight && activePointLights.length > 0 && cx > 1.2 && cz > 2.2) {
        for (let l = 0; l < activePointLights.length; l++) {
          const pl = activePointLights[l];
          const ldx = pl.x - cx;
          const ldy = pl.y - cy;
          const ldz = pl.z - cz;
          const distSq = ldx * ldx + ldy * ldy + ldz * ldz;
          if (distSq < 6.5) {
            const dist = Math.sqrt(distSq) || 0.1;
            const lDir = { x: ldx / dist, y: ldy / dist, z: ldz / dist };
            const nDotL = Math.max(0.1, dot3(normal, lDir) * 0.6 + 0.4);
            const atten = clamp((pl.intensity * nDotL) / (1.0 + 0.65 * distSq), 0, 0.62);
            r = lerp(r, pl.rgb[0], atten * 0.68);
            g = lerp(g, pl.rgb[1], atten * 0.68);
            b = lerp(b, pl.rgb[2], atten * 0.68);
          }
        }
      }

      const camC = worldToCam({ x: cx, y: cy, z: cz });
      renderQueue.push({
        type: 'face',
        depth: camC.z + extraBiasZ,
        proj,
        fill: rgbToCss(r, g, b),
        strokeW: strokeW * clamp(5.0 / Math.max(1.6, camC.z), 0.55, 1.75)
      });
    }

    // 1. Enqueue 3D Faceted Boulders
    for (let b = 0; b < boulders.length; b++) {
      const rock = boulders[b];
      for (let f = 0; f < rock.faces.length; f++) {
        const face = rock.faces[f];
        enqueueFace(face.verts, '#1d2128', 2.0, true, 0);
      }
    }

    // 2. Enqueue 3D Red Loot Chest at (0, 0, 0)
    const lidOpenProgress = easeOutBack(smoothstep(1.95, 2.72, localT));
    const lidAngle = lidOpenProgress * 1.62;
    const latchGreen = localT >= 1.80;

    const chestBodyFaces = buildBoxFaces(-0.90, 0.90, 0.06, 0.68, -0.50, 0.50, {
      front: '#8c0e07',
      top: '#a6140a',
      side: '#6e0a05',
      back: '#5c0804',
      strokeWidth: 2.8
    });
    for (let i = 0; i < chestBodyFaces.length; i++) {
      enqueueFace(chestBodyFaces[i].verts, chestBodyFaces[i].color, chestBodyFaces[i].strokeW, false, 0);
    }

    const chestBaseTrim = buildBoxFaces(-0.93, 0.93, 0.0, 0.07, -0.53, 0.53, {
      base: '#090b0e',
      strokeWidth: 2.4
    });
    for (let i = 0; i < chestBaseTrim.length; i++) {
      enqueueFace(chestBaseTrim[i].verts, chestBaseTrim[i].color, chestBaseTrim[i].strokeW, false, -0.18);
    }

    // Two vertical black structural straps on the chest lower body (bias -0.25 so never occluded by chest panel)
    for (const sx of [-0.66, 0.66]) {
      const strapFaces = buildBoxFaces(sx - 0.09, sx + 0.09, 0.04, 0.695, -0.52, 0.52, {
        base: '#090b0e',
        strokeWidth: 2.0
      });
      for (let i = 0; i < strapFaces.length; i++) {
        enqueueFace(strapFaces[i].verts, strapFaces[i].color, strapFaces[i].strokeW, false, -0.26);
      }
    }

    // Central Front Latch Plate (turns bright glowing green #00ff22 at localT >= 1.80!)
    const latchFaces = buildBoxFaces(-0.19, 0.19, 0.25, 0.41, -0.53, -0.49, {
      base: latchGreen ? '#00ff22' : '#420705',
      strokeWidth: 2.2
    });
    for (let i = 0; i < latchFaces.length; i++) {
      enqueueFace(latchFaces[i].verts, latchFaces[i].color, latchFaces[i].strokeW, false, -0.32);
    }

    const hingeY = 0.68;
    const hingeZ = 0.50;
    function rotateLidPoint(pt) {
      const dy = pt.y - hingeY;
      const dz = pt.z - hingeZ;
      const ca = Math.cos(lidAngle);
      const sa = Math.sin(lidAngle);
      return {
        x: pt.x,
        y: hingeY + dy * ca - dz * sa,
        z: hingeZ + dy * sa + dz * ca
      };
    }

    const lidFaces = buildBoxFaces(
      -0.89, 0.89,
      0.68, 0.96,
      -0.49, 0.50,
      {
        front: '#9e1108',
        top: '#b5150b',
        bottom: '#941008',
        side: '#780b05',
        strokeWidth: 2.8
      },
      rotateLidPoint
    );
    for (let i = 0; i < lidFaces.length; i++) {
      enqueueFace(lidFaces[i].verts, lidFaces[i].color, lidFaces[i].strokeW, false, 0);
    }

    for (const sx of [-0.66, 0.66]) {
      const lidStrapFaces = buildBoxFaces(
        sx - 0.09, sx + 0.09,
        0.675, 0.975,
        -0.508, 0.508,
        {
          base: '#090b0e',
          strokeWidth: 2.0
        },
        rotateLidPoint
      );
      for (let i = 0; i < lidStrapFaces.length; i++) {
        enqueueFace(lidStrapFaces[i].verts, lidStrapFaces[i].color, lidStrapFaces[i].strokeW, false, -0.26);
      }
    }

    if (lidAngle < 1.1) {
      const lidHandleFaces = buildBoxFaces(
        -0.25, 0.25,
        0.95, 1.01,
        -0.22, 0.14,
        {
          base: '#090b0e',
          strokeWidth: 2.0
        },
        rotateLidPoint
      );
      for (let i = 0; i < lidHandleFaces.length; i++) {
        enqueueFace(lidHandleFaces[i].verts, lidHandleFaces[i].color, lidHandleFaces[i].strokeW, false, -0.30);
      }
    }

    // 3. Enqueue 3D Loot Fountain Weapons & Items + Rarity Light Pillars
    for (let i = 0; i < activeLootStates.length; i++) {
      const st = activeLootStates[i];
      if (!st.hideBody) {
        const itemFaces = buildLootItemFaces(st.item, st.rx, st.ry, st.rz, st.x, st.y, st.z);
        for (let f = 0; f < itemFaces.length; f++) {
          const fc = itemFaces[f];
          enqueueFace(fc.verts, fc.color, fc.strokeW, false, -0.15);
        }
      }

      if (st.beamAlpha > 0.01) {
        const camItem = worldToCam({ x: st.x, y: st.y, z: st.z });
        if (camItem.z > 0.18) {
          renderQueue.push({
            type: 'beam',
            depth: camItem.z + 0.05,
            state: st
          });
          renderQueue.push({
            type: 'sparkles',
            depth: camItem.z - 0.12,
            state: st
          });
        }
      }

      if (st.item.id === 'legendary_rifle') {
        const muzzleWorld = transformPoint(
          { x: 0.70, y: 0.02, z: 0.0 },
          st.rx, st.ry, st.rz,
          st.x, st.y, st.z
        );
        const camMuz = worldToCam(muzzleWorld);
        if (camMuz.z > 0.18) {
          renderQueue.push({
            type: 'muzzle_ring',
            depth: camMuz.z - 0.22,
            pt: camToScreen(camMuz)
          });
        }
      }
    }

    renderQueue.sort((a, b) => b.depth - a.depth);

    // --------------------------------------------------------------------------
    // F. EXECUTE DEPTH-SORTED 3D RENDER QUEUE
    // --------------------------------------------------------------------------
    for (let i = 0; i < renderQueue.length; i++) {
      const cmd = renderQueue[i];

      if (cmd.type === 'face') {
        const pts = cmd.proj;
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let k = 1; k < pts.length; k++) {
          ctx.lineTo(pts[k].x, pts[k].y);
        }
        ctx.closePath();
        ctx.fillStyle = cmd.fill;
        ctx.fill();
        if (cmd.strokeW > 0) {
          ctx.strokeStyle = '#07080b';
          ctx.lineWidth = cmd.strokeW;
          ctx.lineJoin = 'round';
          ctx.lineCap = 'round';
          ctx.stroke();
        }
      } else if (cmd.type === 'muzzle_ring') {
        const mp = cmd.pt;
        const r = Math.max(3.5, mp.scale * 0.068);
        ctx.save();
        ctx.strokeStyle = '#07080b';
        ctx.lineWidth = Math.max(3.2, r * 0.72);
        ctx.beginPath();
        ctx.arc(mp.x, mp.y, r, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = '#ffae19';
        ctx.lineWidth = Math.max(1.8, r * 0.38);
        ctx.beginPath();
        ctx.arc(mp.x, mp.y, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      } else if (cmd.type === 'beam') {
        // Feathered Vertical Borderlands Rarity Light Pillar (fades smoothly at both base & top!)
        const st = cmd.state;
        const item = st.item;
        const pBase = projectPoint({ x: st.x, y: Math.max(0.04, st.y - 0.04), z: st.z });
        if (!pBase) continue;
        const pTop = {
          x: pBase.x,
          y: pBase.y - item.beamHeight * pBase.scale
        };

        const isHero = item.id === 'legendary_rifle';
        const bw = clamp(item.beamWidth * pBase.scale, 3.5, isHero ? 56 : 26);
        const [lr, lg, lb] = item.lightRGB;

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = st.beamAlpha * (isHero ? 0.90 : 0.68);

        // 1. Soft base flare centered at the weapon/item
        const baseGlowR = bw * (isHero ? 2.4 : 1.5);
        const baseGrad = ctx.createRadialGradient(pBase.x, pBase.y, 0, pBase.x, pBase.y, baseGlowR);
        baseGrad.addColorStop(0, 'rgba(255, 255, 255, 0.88)');
        baseGrad.addColorStop(0.4, `rgba(${lr}, ${lg}, ${lb}, 0.55)`);
        baseGrad.addColorStop(1, `rgba(${lr}, ${lg}, ${lb}, 0)`);
        ctx.fillStyle = baseGrad;
        ctx.beginPath();
        ctx.arc(pBase.x, pBase.y, baseGlowR, 0, Math.PI * 2);
        ctx.fill();

        // 2. Layered vertical gradient strokes (zero hard bottom/top rectangle edges!)
        const vGradOuter = ctx.createLinearGradient(pBase.x, pBase.y + bw * 0.4, pTop.x, pTop.y);
        vGradOuter.addColorStop(0, `rgba(${lr}, ${lg}, ${lb}, 0)`);
        vGradOuter.addColorStop(0.06, `rgba(${lr}, ${lg}, ${lb}, 0.52)`);
        vGradOuter.addColorStop(0.65, `rgba(${lr}, ${lg}, ${lb}, 0.36)`);
        vGradOuter.addColorStop(1, `rgba(${lr}, ${lg}, ${lb}, 0)`);

        ctx.strokeStyle = vGradOuter;
        ctx.lineCap = 'round';
        ctx.lineWidth = bw * 1.45;
        ctx.beginPath();
        ctx.moveTo(pBase.x, pBase.y);
        ctx.lineTo(pTop.x, pTop.y);
        ctx.stroke();

        ctx.lineWidth = bw * 0.85;
        ctx.beginPath();
        ctx.moveTo(pBase.x, pBase.y);
        ctx.lineTo(pTop.x, pTop.y);
        ctx.stroke();

        // 3. Narrow laser-bright white inner core with soft bottom & top taper
        const vGradCore = ctx.createLinearGradient(pBase.x, pBase.y + bw * 0.2, pTop.x, pTop.y);
        vGradCore.addColorStop(0, 'rgba(255, 255, 255, 0)');
        vGradCore.addColorStop(0.05, '#ffffff');
        vGradCore.addColorStop(0.58, item.beamCore);
        vGradCore.addColorStop(1, 'rgba(255, 255, 255, 0)');

        ctx.strokeStyle = vGradCore;
        ctx.lineWidth = Math.max(2.0, bw * (isHero ? 0.38 : 0.28));
        ctx.beginPath();
        ctx.moveTo(pBase.x, pBase.y);
        ctx.lineTo(pTop.x, pTop.y);
        ctx.stroke();

        ctx.restore();
      } else if (cmd.type === 'sparkles') {
        // Crisp 3D Sparkle Motes swirling around the Rarity Light Pillar (frames 033 & 034)
        const st = cmd.state;
        const item = st.item;
        const sRng = mulberry32(item.id.length * 9973 + 17);
        const [lr, lg, lb] = item.lightRGB;

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (let s = 0; s < item.sparkleCount; s++) {
          const phase = (sRng() + localT * (0.28 + sRng() * 0.35)) % 1.0;
          const angle = sRng() * Math.PI * 2 + localT * (sRng() - 0.5) * 1.4;
          const spreadR = (0.08 + sRng() * (item.id === 'legendary_rifle' ? 0.68 : 0.25)) * (0.45 + phase * 0.75);
          const sy = st.y - 0.08 + phase * (item.id === 'legendary_rifle' ? 2.55 : 1.55);
          const sx = st.x + Math.cos(angle) * spreadR;
          const sz = st.z + Math.sin(angle) * spreadR;

          const sp = projectPoint({ x: sx, y: sy, z: sz });
          if (!sp) continue;

          const env = Math.sin(phase * Math.PI) * st.beamAlpha;
          if (env <= 0.04) continue;
          // Clamp screen radius so close-up sparkles remain crisp jewel-like motes!
          const rad = clamp((0.014 + (s % 3) * 0.006) * sp.scale, 1.8, 6.2);

          const g = ctx.createRadialGradient(sp.x, sp.y, 0, sp.x, sp.y, rad * 2.0);
          g.addColorStop(0, `rgba(255, 255, 255, ${(0.96 * env).toFixed(3)})`);
          g.addColorStop(0.42, `rgba(255, 255, 255, ${(0.82 * env).toFixed(3)})`);
          g.addColorStop(0.72, `rgba(${lr}, ${lg}, ${lb}, ${(0.55 * env).toFixed(3)})`);
          g.addColorStop(1, `rgba(${lr}, ${lg}, ${lb}, 0)`);
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(sp.x, sp.y, rad * 2.0, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
    }

    // --------------------------------------------------------------------------
    // G. GLOWING GREEN LATCH BLOOM ON FRONT OF OPEN RED CHEST
    // --------------------------------------------------------------------------
    if (latchGreen) {
      const lp = projectPoint({ x: 0, y: 0.33, z: -0.53 });
      if (lp) {
        const gr = clamp(lp.scale * 0.14, 6, 22);
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const lg = ctx.createRadialGradient(lp.x, lp.y, 0, lp.x, lp.y, gr);
        lg.addColorStop(0, 'rgba(80, 255, 110, 0.38)');
        lg.addColorStop(1, 'rgba(0, 255, 40, 0)');
        ctx.fillStyle = lg;
        ctx.beginPath();
        ctx.arc(lp.x, lp.y, gr, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    // --------------------------------------------------------------------------
    // H. FIRST-PERSON VIEWMODEL WEAPON DURING WALK-UP (0.0s .. 1.50s)
    // --------------------------------------------------------------------------
    drawFirstPersonViewmodel(ctx, w, h, localT, bobX, bobY);

    // --------------------------------------------------------------------------
    // I. SUBTLE CINEMATIC LENS VIGNETTE (No title overlay per contract!)
    // --------------------------------------------------------------------------
    const vig = ctx.createRadialGradient(
      w * 0.5, h * 0.5, Math.min(w, h) * 0.38,
      w * 0.5, h * 0.5, Math.max(w, h) * 0.75
    );
    vig.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vig.addColorStop(1, 'rgba(0, 0, 0, 0.28)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, w, h);

    ctx.restore();
  }

  // Register on both window.GAMES[7] and window.GameAnimations.game8
  window.GAMES[7] = {
    title: 'Borderlands 2',
    year: '2012',
    draw: drawBorderlands2
  };
  window.GameAnimations.game8 = drawBorderlands2;
})();
