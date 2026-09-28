// Game 2: Star Wars: TIE Fighter (1994, LucasArts)
// Authentic 1994 DOS SVGA (480x270) 3D Polygon Software Rasterizer & Volumetric Dithered Fireball Engine
(function () {
  const W = 480;
  const H = 270;
  const CX = 240;
  const CY = 135;
  const FOV = 410;

  let offCanvas = null;
  let offCtx = null;
  let planetCanvas = null;
  let fireCanvas = null;
  let fireCtx = null;
  let fireImgData = null;

  // Deterministic PRNG
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // 4x4 Bayer ordered dither matrix (normalized 0..1) for authentic 1994 SVGA explosions & planet banding
  const BAYER4 = [
    [0 / 16, 8 / 16, 2 / 16, 10 / 16],
    [12 / 16, 4 / 16, 14 / 16, 6 / 16],
    [3 / 16, 11 / 16, 1 / 16, 9 / 16],
    [15 / 16, 7 / 16, 13 / 16, 5 / 16]
  ];

  // 3D Vector / Matrix math helpers
  function vecSub(a, b) {
    return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  }
  function vecCross(a, b) {
    return [
      a[1] * b[2] - a[2] * b[1],
      a[2] * b[0] - a[0] * b[2],
      a[0] * b[1] - a[1] * b[0]
    ];
  }
  function vecDot(a, b) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  }
  function vecNorm(a) {
    const len = Math.hypot(a[0], a[1], a[2]) || 1;
    return [a[0] / len, a[1] / len, a[2] / len];
  }

  // Euler rotation (yaw Y, pitch X, roll Z)
  function makeRotMatrix(yaw, pitch, roll) {
    const cy = Math.cos(yaw), sy = Math.sin(yaw);
    const cp = Math.cos(pitch), sp = Math.sin(pitch);
    const cr = Math.cos(roll), sr = Math.sin(roll);
    return [
      cy * cr + sy * sp * sr, -cy * sr + sy * sp * cr, sy * cp,
      cp * sr, cp * cr, -sp,
      -sy * cr + cy * sp * sr, sy * sr + cy * sp * cr, cy * cp
    ];
  }

  function applyMat3(m, v) {
    return [
      m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
      m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
      m[6] * v[0] + m[7] * v[1] + m[8] * v[2]
    ];
  }

  function applyMat3Transpose(m, v) {
    return [
      m[0] * v[0] + m[3] * v[1] + m[6] * v[2],
      m[1] * v[0] + m[4] * v[1] + m[7] * v[2],
      m[2] * v[0] + m[5] * v[1] + m[8] * v[2]
    ];
  }

  function transformVerts(verts, pos, rotMat) {
    const out = new Array(verts.length);
    for (let i = 0; i < verts.length; i++) {
      const r = applyMat3(rotMat, verts[i]);
      out[i] = [r[0] + pos[0], r[1] + pos[1], r[2] + pos[2]];
    }
    return out;
  }

  // Pre-render the 1994 banded blue-grey planet sphere (matching frame_005.jpg & frame_006.jpg)
  function initBuffers() {
    if (offCanvas) return;
    offCanvas = document.createElement('canvas');
    offCanvas.width = W;
    offCanvas.height = H;
    offCtx = offCanvas.getContext('2d', { alpha: false });
    offCtx.imageSmoothingEnabled = false;

    // Planet texture (270x270 pixel-art sphere with diagonal swirling cloud bands)
    const pSize = 270;
    const pR = 128;
    planetCanvas = document.createElement('canvas');
    planetCanvas.width = pSize;
    planetCanvas.height = pSize;
    const pCtx = planetCanvas.getContext('2d');
    const pImg = pCtx.createImageData(pSize, pSize);
    const pd = pImg.data;

    // 1994 SVGA 256-color palette stops for the blue-grey gas/ice planet in frame_005.jpg
    const lx = -0.42, ly = -0.48, lz = 0.77;
    for (let y = 0; y < pSize; y++) {
      for (let x = 0; x < pSize; x++) {
        const dx = (x - pSize * 0.5) / pR;
        const dy = (y - pSize * 0.5) / pR;
        const r2 = dx * dx + dy * dy;
        if (r2 > 1.0) continue;
        const dz = Math.sqrt(1.0 - r2);

        // Spherical coordinates tilted diagonally like frame_005.jpg
        const u = dx * 0.72 + dy * 0.69;
        const v = -dx * 0.69 + dy * 0.72;
        const lat = Math.asin(Math.max(-1, Math.min(1, v * 0.85 + (1 - dz) * 0.22)));
        const lon = Math.atan2(u, dz);

        // Swirling atmospheric bands
        const swirl =
          Math.sin(lat * 9.5 + Math.sin(lon * 2.5 + lat * 3.0) * 0.65) * 0.5 +
          Math.cos(lat * 18.0 - lon * 1.8) * 0.25 +
          Math.sin((u + v) * 6.0) * 0.25;

        // Base periwinkle / slate blue-grey palette matching frame_005.jpg
        let br = 136 + swirl * 26;
        let bg = 148 + swirl * 28;
        let bb = 190 + swirl * 30;

        if (swirl > 0.25) {
          br += 14;
          bg += 12;
          bb += 8;
        } else if (swirl < -0.25) {
          br -= 16;
          bg -= 14;
          bb -= 10;
        }

        // Lambertian + limb darkening
        const ndotl = Math.max(0, dx * lx + dy * ly + dz * lz);
        const limb = Math.pow(dz, 0.30);
        let shade = (0.30 + 0.82 * ndotl) * limb;

        // Quantize shade with subtle Bayer dithering for authentic 1994 SVGA look
        const dither = (BAYER4[y & 3][x & 3] - 0.5) * 0.05;
        shade = Math.floor((shade + dither) * 14) / 14;

        const idx = (y * pSize + x) * 4;
        pd[idx] = Math.max(18, Math.min(235, Math.round(br * shade)));
        pd[idx + 1] = Math.max(22, Math.min(240, Math.round(bg * shade)));
        pd[idx + 2] = Math.max(34, Math.min(255, Math.round(bb * shade)));
        pd[idx + 3] = 255;
      }
    }
    pCtx.putImageData(pImg, 0, 0);

    // Fireball scratch buffer (180x180) for ultra-authentic 1994 dithered explosion
    fireCanvas = document.createElement('canvas');
    fireCanvas.width = 180;
    fireCanvas.height = 180;
    fireCtx = fireCanvas.getContext('2d');
    fireImgData = fireCtx.createImageData(180, 180);
  }

  // ---------------------------------------------------------------------------
  // 3D STARFIELD (1,500 stars on rotating celestial sphere so ~165 are visible in frustum!)
  // ---------------------------------------------------------------------------
  const starRng = mulberry32(19940501);
  const STARS_3D = [];
  for (let i = 0; i < 1500; i++) {
    const theta = starRng() * Math.PI * 2;
    const phi = Math.acos(2 * starRng() - 1);
    const dist = 900;
    const palettePick = starRng();
    let color = '#ffffff';
    if (palettePick < 0.38) color = '#8894b0';
    else if (palettePick < 0.68) color = '#b8c4dc';
    else if (palettePick < 0.82) color = '#606b85';
    else if (palettePick < 0.88) color = '#d8a878';
    STARS_3D.push({
      pos: [
        Math.sin(phi) * Math.cos(theta) * dist,
        Math.sin(phi) * Math.sin(theta) * dist,
        Math.cos(phi) * dist
      ],
      size: starRng() > 0.86 ? 2 : 1,
      color
    });
  }

  // ---------------------------------------------------------------------------
  // 3D MESH BUILDERS
  // ---------------------------------------------------------------------------
  function addFace(faces, verts, color, opts) {
    faces.push({
      verts,
      color,
      emissive: (opts && opts.emissive) || false,
      doubleSided: (opts && opts.doubleSided) || false,
      bias: (opts && opts.bias) || 0
    });
  }

  function addPrism(faces, p0, p1, w0, h0, w1, h1, colors, bias) {
    const [x0, y0, z0] = p0;
    const [x1, y1, z1] = p1;
    const v = [
      [x0 - w0, y0 + h0, z0], // 0: back top left
      [x0 + w0, y0 + h0, z0], // 1: back top right
      [x0 + w0, y0 - h0, z0], // 2: back bot right
      [x0 - w0, y0 - h0, z0], // 3: back bot left
      [x1 - w1, y1 + h1, z1], // 4: front top left
      [x1 + w1, y1 + h1, z1], // 5: front top right
      [x1 + w1, y1 - h1, z1], // 6: front bot right
      [x1 - w1, y1 - h1, z1]  // 7: front bot left
    ];
    const b = bias || 0;
    if (colors.top !== null) {
      addFace(faces, [v[0], v[1], v[5], v[4]], colors.top || colors.base, { bias: b });
    }
    if (colors.bottom !== null) {
      addFace(faces, [v[3], v[7], v[6], v[2]], colors.bottom || colors.base, { bias: b });
    }
    if (colors.side !== null) {
      addFace(faces, [v[0], v[4], v[7], v[3]], colors.side || colors.base, { bias: b });
      addFace(faces, [v[1], v[2], v[6], v[5]], colors.side || colors.base, { bias: b });
    }
    if (colors.back !== null) {
      addFace(faces, [v[0], v[3], v[2], v[1]], colors.back || colors.base, { bias: b });
    }
    if (colors.front !== null && (w1 > 0.01 || h1 > 0.01)) {
      addFace(faces, [v[4], v[5], v[6], v[7]], colors.front || colors.base, { bias: b });
    }
  }

  // Build Rebel T-65 X-Wing mesh parts (matching frame_005.jpg & torn wings in frame_006.jpg)
  function buildXWingParts() {
    const parts = {
      fuselage: [],
      noseCone: [],
      canopy: [],
      wings: [[], [], [], []] // 0: Top-Right, 1: Bot-Right, 2: Top-Left, 3: Bot-Left
    };

    // Long sleek hexagonal fuselage & prominent conical nose (matching frame_005.jpg!)
    const rRear = 4.2, rMid = 4.0, rFwd = 3.6;
    const zRear = -17, zMid = 0, zFwd = 20, zTip = 39;

    const hexAngles = [];
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3 + Math.PI / 6;
      hexAngles.push([Math.cos(a), Math.sin(a)]);
    }

    const ringRear = hexAngles.map(([cx, sy]) => [cx * rRear, sy * rRear * 0.88, zRear]);
    const ringMid = hexAngles.map(([cx, sy]) => [cx * rMid, sy * rMid * 0.86, zMid]);
    const ringFwd = hexAngles.map(([cx, sy]) => [cx * rFwd, sy * rFwd * 0.84, zFwd]);

    const fuseColors = [
      [130, 140, 174], // top-right
      [152, 162, 196], // top
      [120, 130, 164], // top-left
      [82, 90, 120],   // bot-left
      [66, 74, 102],   // bot
      [92, 100, 132]   // bot-right
    ];

    for (let i = 0; i < 6; i++) {
      const ni = (i + 1) % 6;
      addFace(parts.fuselage, [ringRear[i], ringRear[ni], ringMid[ni], ringMid[i]], fuseColors[i]);
      addFace(parts.fuselage, [ringMid[i], ringMid[ni], ringFwd[ni], ringFwd[i]], fuseColors[i]);
    }

    // Rear circular/hexagonal bulkhead & recessed dark ring
    addFace(parts.fuselage, ringRear.slice().reverse(), [148, 158, 190], { doubleSided: true });
    const ringRearInner = hexAngles.map(([cx, sy]) => [cx * rRear * 0.56, sy * rRear * 0.50, zRear - 0.15]);
    addFace(parts.fuselage, ringRearInner.slice().reverse(), [42, 48, 70], { doubleSided: true, bias: -0.5 });

    // Forward circular collar ring before nose cone (prominent in frame_005.jpg!)
    const collarOuter = hexAngles.map(([cx, sy]) => [cx * (rFwd + 1.2), sy * (rFwd + 1.2) * 0.85, zFwd - 1.2]);
    const collarInner = hexAngles.map(([cx, sy]) => [cx * (rFwd * 0.65), sy * (rFwd * 0.65) * 0.85, zFwd - 0.9]);
    addFace(parts.fuselage, collarOuter, [158, 168, 200], { doubleSided: true, bias: -0.3 });
    addFace(parts.fuselage, collarInner, [44, 50, 72], { doubleSided: true, bias: -0.6 });

    // Tapered Nose Cone (z from +20 to +39)
    const tipVert = [0, -0.2, zTip];
    for (let i = 0; i < 6; i++) {
      const ni = (i + 1) % 6;
      addFace(parts.noseCone, [ringFwd[i], ringFwd[ni], tipVert], fuseColors[i], { doubleSided: true });
    }
    addFace(parts.noseCone, ringFwd.slice().reverse(), [70, 78, 102], { doubleSided: true });

    // Tinted Cockpit Canopy & Dome
    const cTop1 = [-1.5, 4.5, -4], cTop2 = [1.5, 4.5, -4];
    const cTop3 = [1.1, 4.0, 6], cTop4 = [-1.1, 4.0, 6];
    const cBot1 = [-2.4, 2.6, -6], cBot2 = [2.4, 2.6, -6];
    const cBot3 = [1.7, 2.0, 11], cBot4 = [-1.7, 2.0, 11];
    addFace(parts.canopy, [cTop1, cTop2, cTop3, cTop4], [52, 62, 88], { doubleSided: true });
    addFace(parts.canopy, [cTop4, cTop3, cBot3, cBot4], [38, 48, 72], { doubleSided: true });
    addFace(parts.canopy, [cBot1, cTop1, cTop4, cBot4], [44, 54, 78], { doubleSided: true });
    addFace(parts.canopy, [cTop2, cBot2, cBot3, cTop3], [44, 54, 78], { doubleSided: true });

    // Four S-Foil Wings in X Configuration
    const wingConfigs = [
      { side: 1, up: 1, angle: 0.22 },   // Top-Right
      { side: 1, up: -1, angle: -0.22 }, // Bottom-Right
      { side: -1, up: 1, angle: -0.22 }, // Top-Left
      { side: -1, up: -1, angle: 0.22 }  // Bottom-Left
    ];

    wingConfigs.forEach((cfg, idx) => {
      const wFaces = parts.wings[idx];
      const s = cfg.side;
      const u = cfg.up;
      const ca = Math.cos(cfg.angle);
      const sa = Math.sin(cfg.angle);

      function rotW(x, y, z) {
        return [x * ca - y * sa, x * sa + y * ca, z];
      }

      const xRoot = s * 2.8;
      const xTip = s * 25.0;
      const zBackRoot = -16.5;
      const zFrontRoot = -5.5;
      const zBackTip = -15.2;
      const zFrontTip = -8.2;
      const thick = 0.60;

      const wt = [
        rotW(xRoot, thick, zBackRoot),
        rotW(xTip, thick * 0.7, zBackTip),
        rotW(xTip, thick * 0.7, zFrontTip),
        rotW(xRoot, thick, zFrontRoot)
      ];
      const wb = [
        rotW(xRoot, -thick, zBackRoot),
        rotW(xTip, -thick * 0.7, zBackTip),
        rotW(xTip, -thick * 0.7, zFrontTip),
        rotW(xRoot, -thick, zFrontRoot)
      ];

      const topCol = u > 0 ? [84, 94, 126] : [64, 74, 104];
      const botCol = u > 0 ? [54, 62, 90] : [46, 54, 80];
      const edgeCol = [156, 166, 196];

      if (s > 0) {
        addFace(wFaces, [wt[0], wt[1], wt[2], wt[3]], topCol, { doubleSided: true });
        addFace(wFaces, [wb[3], wb[2], wb[1], wb[0]], botCol, { doubleSided: true });
      } else {
        addFace(wFaces, [wt[3], wt[2], wt[1], wt[0]], topCol, { doubleSided: true });
        addFace(wFaces, [wb[0], wb[1], wb[2], wb[3]], botCol, { doubleSided: true });
      }
      addFace(wFaces, [wt[0], wb[0], wb[1], wt[1]], edgeCol, { doubleSided: true });
      addFace(wFaces, [wt[1], wb[1], wb[2], wt[2]], edgeCol, { doubleSided: true });
      addFace(wFaces, [wt[2], wb[2], wb[3], wt[3]], [130, 140, 170], { doubleSided: true });

      // Red Rebel Wing Inlay Stripes
      const rx0 = s * 10.5, rx1 = s * 22.0;
      for (const ySign of [1, -1]) {
        const yOff = ySign * (thick + 0.08);
        const rQuad = [
          rotW(rx0, yOff, -14.8),
          rotW(rx1, yOff, -14.2),
          rotW(rx1, yOff, -10.2),
          rotW(rx0, yOff, -9.6)
        ];
        addFace(wFaces, rQuad, [168, 56, 56], { doubleSided: true, bias: -0.8 });
      }

      // 4L4 Fusial Thrust Engine Cylinder at wing root + Glowing Red-Orange Exhaust Nozzle
      const ex = s * 5.8;
      const ey = u * 1.65;
      const eRad = 1.40;
      const ezBack = -17.8;
      const ezFront = -5.5;
      const eRingB = [], eRingF = [];
      for (let k = 0; k < 6; k++) {
        const ea = (k * Math.PI) / 3;
        const px = ex + Math.cos(ea) * eRad;
        const py = ey + Math.sin(ea) * eRad;
        eRingB.push(rotW(px, py, ezBack));
        eRingF.push(rotW(px, py, ezFront));
      }
      for (let k = 0; k < 6; k++) {
        const nk = (k + 1) % 6;
        addFace(wFaces, [eRingB[k], eRingB[nk], eRingF[nk], eRingF[k]], [92, 102, 132]);
      }
      addFace(wFaces, eRingB.slice().reverse(), [255, 62, 20], { emissive: true, doubleSided: true, bias: -1.2 });
      const eCore = eRingB.map((pt) => {
        const c = rotW(ex, ey, ezBack - 0.12);
        return [
          c[0] + (pt[0] - c[0]) * 0.52,
          c[1] + (pt[1] - c[1]) * 0.52,
          c[2] + (pt[2] - c[2]) * 0.52
        ];
      });
      addFace(wFaces, eCore.slice().reverse(), [255, 185, 65], { emissive: true, doubleSided: true, bias: -1.6 });

      // Taim & Bak KX9 Wingtip Laser Cannon Barrel
      const lx = s * 25.0;
      const b0 = rotW(lx, 0.35, -15.2);
      const b1 = rotW(lx + s * 0.65, 0.35, -15.2);
      const b2 = rotW(lx + s * 0.65, 0.35, 8.5);
      const b3 = rotW(lx, 0.35, 8.5);
      const b4 = rotW(lx, -0.35, -15.2);
      const b5 = rotW(lx + s * 0.65, -0.35, -15.2);
      const b6 = rotW(lx + s * 0.65, -0.35, 8.5);
      const b7 = rotW(lx, -0.35, 8.5);
      addFace(wFaces, [b0, b1, b2, b3], [118, 128, 158], { doubleSided: true });
      addFace(wFaces, [b0, b3, b7, b4], [84, 94, 122], { doubleSided: true });
      addFace(wFaces, [b1, b5, b6, b2], [140, 150, 180], { doubleSided: true });
    });

    return parts;
  }

  // Build Imperial TIE/ln Starfighter 3D Mesh (matching frame_007.jpg!)
  function buildTIEFighterMesh() {
    const faces = [];

    // 1. Central Spherical / Faceted Cockpit Ball (radius ~5.2)
    const rBall = 5.2;
    const latSteps = 4;
    const lonSteps = 8;
    const rings = [];
    for (let i = 0; i <= latSteps; i++) {
      const phi = (i / latSteps) * Math.PI;
      const z = Math.cos(phi) * rBall;
      const rad = Math.sin(phi) * rBall;
      const ring = [];
      for (let j = 0; j < lonSteps; j++) {
        const theta = (j / lonSteps) * Math.PI * 2 + Math.PI / 8;
        ring.push([Math.cos(theta) * rad, Math.sin(theta) * rad, z]);
      }
      rings.push(ring);
    }

    for (let i = 0; i < latSteps; i++) {
      for (let j = 0; j < lonSteps; j++) {
        const nj = (j + 1) % lonSteps;
        const v0 = rings[i][j];
        const v1 = rings[i][nj];
        const v2 = rings[i + 1][nj];
        const v3 = rings[i + 1][j];
        const col = (i === 0) ? [34, 42, 56] : [96, 112, 132];
        addFace(faces, [v0, v1, v2, v3], col);
      }
    }

    // Twin Glowing Red Ion Engine Dots on rear of cockpit pod
    for (const ex of [-1.6, 1.6]) {
      const ez = -rBall - 0.18;
      const s = 0.72;
      addFace(
        faces,
        [
          [ex - s, s, ez],
          [ex + s, s, ez],
          [ex + s, -s, ez],
          [ex - s, -s, ez]
        ],
        [255, 48, 32],
        { emissive: true, doubleSided: true, bias: -1.5 }
      );
    }

    // 2. Horizontal Wing Pylon Struts
    for (const s of [-1, 1]) {
      const xIn = s * 4.2;
      const xOut = s * 14.2;
      const rIn = 2.0;
      const rOut = 1.4;
      const sVerts = [
        [xIn, rIn, -rIn], [xIn, rIn, rIn], [xIn, -rIn, rIn], [xIn, -rIn, -rIn],
        [xOut, rOut, -rOut], [xOut, rOut, rOut], [xOut, -rOut, rOut], [xOut, -rOut, -rOut]
      ];
      addFace(faces, [sVerts[0], sVerts[1], sVerts[5], sVerts[4]], [112, 128, 148], { doubleSided: true });
      addFace(faces, [sVerts[3], sVerts[7], sVerts[6], sVerts[2]], [68, 80, 98], { doubleSided: true });
      addFace(faces, [sVerts[1], sVerts[2], sVerts[6], sVerts[5]], [94, 110, 130], { doubleSided: true });
      addFace(faces, [sVerts[0], sVerts[4], sVerts[7], sVerts[3]], [78, 92, 112], { doubleSided: true });
    }

    // 3. Iconic Hexagonal Solar Array Wings (matching frame_007.jpg)
    const hexY = 19.5;
    const hexZ = 14.5;
    const hexPts = [
      [0, hexY, -hexZ * 0.52],   // 0: top-back
      [0, hexY, hexZ * 0.52],    // 1: top-front
      [0, 0, hexZ],              // 2: mid-front
      [0, -hexY, hexZ * 0.52],   // 3: bot-front
      [0, -hexY, -hexZ * 0.52],  // 4: bot-back
      [0, 0, -hexZ]              // 5: mid-back
    ];

    for (const s of [-1, 1]) {
      const wx = s * 14.2;
      const wThick = 0.72;
      const frameCol = [86, 110, 134];     // Steel blue-grey frame (frame_007.jpg)
      const frameLit = [110, 134, 158];    // Highlighted frame edge
      const panelCol1 = [30, 38, 52];      // Dark charcoal solar panel
      const panelCol2 = [38, 48, 64];      // Alternate solar panel facet

      const outer = hexPts.map(([, y, z]) => [wx, y, z]);
      const rimIn = hexPts.map(([, y, z]) => [wx, y * 0.82, z * 0.82]);
      const hub = [wx + s * 0.3, 0, 0];

      for (let i = 0; i < 6; i++) {
        const ni = (i + 1) % 6;
        addFace(
          faces,
          [outer[i], outer[ni], rimIn[ni], rimIn[i]],
          i % 2 === 0 ? frameLit : frameCol,
          { doubleSided: true, bias: -0.4 }
        );

        const oA0 = [wx - wThick, hexPts[i][1], hexPts[i][2]];
        const oA1 = [wx - wThick, hexPts[ni][1], hexPts[ni][2]];
        const oB1 = [wx + wThick, hexPts[ni][1], hexPts[ni][2]];
        const oB0 = [wx + wThick, hexPts[i][1], hexPts[i][2]];
        addFace(faces, [oA0, oA1, oB1, oB0], frameLit, { doubleSided: true });

        const pMid0 = [wx, hexPts[i][1] * 0.78, hexPts[i][2] * 0.78];
        const pMid1 = [wx, hexPts[ni][1] * 0.78, hexPts[ni][2] * 0.78];
        addFace(
          faces,
          [pMid0, pMid1, hub],
          i % 2 === 0 ? panelCol1 : panelCol2,
          { doubleSided: true, bias: 0.4 }
        );

        const dy = hexPts[i][1];
        const dz = hexPts[i][2];
        const len = Math.hypot(dy, dz) || 1;
        const ny = (-dz / len) * 1.15;
        const nz = (dy / len) * 1.15;
        addFace(
          faces,
          [
            [wx, ny, nz],
            [wx, -ny, -nz],
            [wx, dy * 0.88 - ny, dz * 0.88 - nz],
            [wx, dy * 0.88 + ny, dz * 0.88 + nz]
          ],
          frameCol,
          { doubleSided: true, bias: -0.5 }
        );
      }

      const hubR = 3.4;
      const hubVerts = hexPts.map(([, y, z]) => [wx + s * 0.5, (y / hexY) * hubR, (z / hexZ) * hubR]);
      addFace(faces, hubVerts, frameLit, { doubleSided: true, bias: -0.7 });
    }

    return faces;
  }

  // Build 3D Imperial Modular Cargo Container (seen on bottom-right of frame_006.jpg)
  function buildCargoContainerMesh() {
    const faces = [];
    addPrism(
      faces,
      [0, 0, -18],
      [0, 0, 18],
      11, 12, 11, 12,
      {
        top: [134, 144, 168],
        bottom: [52, 58, 74],
        side: [96, 106, 128],
        back: [74, 82, 102],
        front: [84, 94, 116]
      }
    );
    addPrism(
      faces,
      [0, 0, -4.5],
      [0, 0, 4.5],
      11.6, 12.5, 11.6, 12.5,
      {
        top: [58, 90, 114],
        bottom: [34, 56, 74],
        side: [46, 76, 98],
        back: [40, 66, 86],
        front: [40, 66, 86]
      },
      -0.4
    );
    addFace(
      faces,
      [
        [-11.15, 7.5, 5.5],
        [-11.15, 7.5, 16.5],
        [-11.15, -7.5, 16.5],
        [-11.15, -7.5, 5.5]
      ],
      [42, 48, 66],
      { doubleSided: true, bias: -0.6 }
    );
    return faces;
  }

  // Build 3D Imperial Capital Ship / Dreadnought Convoy (seen on center-right of frame_007.jpg)
  function buildCapitalShipMesh() {
    const faces = [];
    addPrism(
      faces,
      [0, 0, -58],
      [0, 0, 58],
      14, 5.5, 7.5, 3.2,
      {
        top: [76, 90, 122],
        bottom: [42, 50, 72],
        side: [60, 72, 100],
        back: [50, 60, 84],
        front: [68, 80, 110]
      }
    );
    addPrism(
      faces,
      [0, 5.5, -38],
      [0, 5.5, 12],
      8.5, 3.2, 6.0, 2.5,
      {
        top: [90, 104, 138],
        bottom: null,
        side: [68, 80, 112],
        back: [56, 66, 94],
        front: [74, 88, 120]
      }
    );
    addPrism(
      faces,
      [0, 9.5, -28],
      [0, 9.5, -14],
      4.8, 4.0, 3.8, 3.5,
      {
        top: [104, 118, 152],
        bottom: null,
        side: [76, 90, 122],
        back: [62, 74, 102],
        front: [84, 98, 132]
      }
    );
    for (let k = 0; k < 3; k++) {
      const kz = -26 + k * 18;
      const ky = 16 - k * 1.2;
      addPrism(
        faces,
        [0, ky, kz - 4],
        [0, ky, kz + 4],
        2.6, 1.2, 0.8, 0.5,
        {
          top: [96, 110, 142],
          bottom: [48, 56, 78],
          side: [72, 84, 114],
          back: [58, 68, 94],
          front: [84, 98, 128]
        }
      );
    }
    return faces;
  }

  const XWING_PARTS = buildXWingParts();
  const TIE_FIGHTER_MESH = buildTIEFighterMesh();
  const CARGO_MESH = buildCargoContainerMesh();
  const CAPITAL_SHIP_MESH = buildCapitalShipMesh();

  // Small extra triangular/trapezoidal debris shards for explosion
  const EXTRA_SHARDS = [];
  const shardRng = mulberry32(19940999);
  for (let i = 0; i < 12; i++) {
    const s = 1.6 + shardRng() * 2.5;
    const colPick = i % 3;
    const col = colPick === 0 ? [136, 146, 178] : (colPick === 1 ? [162, 54, 54] : [68, 76, 104]);
    EXTRA_SHARDS.push({
      faces: [
        {
          verts: [
            [-s, -s * 0.5, 0],
            [s, -s * 0.2, s * 0.3],
            [0, s * 0.8, -s * 0.2]
          ],
          color: col,
          doubleSided: true
        }
      ],
      vel: [
        (shardRng() - 0.5) * 32,
        (shardRng() - 0.5) * 28,
        (shardRng() - 0.5) * 28
      ],
      rotVel: [
        (shardRng() - 0.5) * 9,
        (shardRng() - 0.5) * 9,
        (shardRng() - 0.5) * 9
      ]
    });
  }

  // ---------------------------------------------------------------------------
  // 1994 VOLUMETRIC PIXEL-DITHERED FIREBALL GENERATOR (matching frame_006 & frame_007)
  // ---------------------------------------------------------------------------
  const FIRE_LOBES = [
    { ox: 0.0, oy: 0.0, r: 0.56, temp: 1.05 },
    { ox: -0.22, oy: -0.18, r: 0.46, temp: 0.92 },
    { ox: 0.24, oy: -0.14, r: 0.44, temp: 0.90 },
    { ox: -0.26, oy: 0.20, r: 0.45, temp: 0.88 },
    { ox: 0.22, oy: 0.22, r: 0.46, temp: 0.92 },
    { ox: 0.02, oy: -0.32, r: 0.38, temp: 0.80 },
    { ox: -0.36, oy: -0.02, r: 0.36, temp: 0.76 },
    { ox: 0.35, oy: 0.04, r: 0.37, temp: 0.78 },
    { ox: -0.08, oy: 0.34, r: 0.38, temp: 0.78 }
  ];

  const FIRE_PALETTE = [
    [38, 10, 4],
    [62, 16, 6],
    [90, 24, 8],
    [122, 34, 10],
    [156, 48, 12],
    [188, 66, 14],
    [216, 88, 16],
    [238, 114, 20],
    [252, 142, 24],
    [255, 170, 32],
    [255, 198, 44],
    [255, 222, 64],
    [255, 240, 96],
    [255, 250, 148],
    [255, 254, 204],
    [255, 255, 245]
  ];

  function renderDitheredFireball(ctx, screenX, screenY, screenRadius, ageSec) {
    if (screenRadius < 4 || ageSec < 0 || ageSec > 3.5) return;

    const fade = Math.max(0, Math.min(1, 1.0 - Math.pow(ageSec / 3.4, 1.35)));
    const size = 180;
    const half = size * 0.5;
    const data = fireImgData.data;
    data.fill(0);

    const rot = ageSec * 0.45;
    const cr = Math.cos(rot), sr = Math.sin(rot);

    for (let py = 0; py < size; py++) {
      const ny = (py - half) / half;
      if (ny < -0.98 || ny > 0.98) continue;
      for (let px = 0; px < size; px++) {
        const nx = (px - half) / half;
        const r2 = nx * nx + ny * ny;
        if (r2 > 0.96) continue;

        let heat = 0;
        for (let l = 0; l < FIRE_LOBES.length; l++) {
          const lobe = FIRE_LOBES[l];
          const lx = lobe.ox * cr - lobe.oy * sr;
          const ly = lobe.ox * sr + lobe.oy * cr;
          const dx = nx - lx * (0.75 + ageSec * 0.18);
          const dy = ny - ly * (0.75 + ageSec * 0.18);
          const d = Math.sqrt(dx * dx + dy * dy) / lobe.r;
          if (d < 1.0) {
            const contrib = (1.0 - d * d) * lobe.temp;
            if (contrib > heat) heat = contrib;
            heat += contrib * 0.18;
          }
        }

        // Only apply cellular turbulence inside actual fire lobes so outer space stays 100% clean!
        if (heat <= 0.02) continue;

        const turb =
          Math.sin(nx * 13.0 + ageSec * 3.0) * Math.cos(ny * 13.0 - ageSec * 2.5) * 0.11 +
          Math.sin((nx + ny) * 23.0) * 0.06;
        heat = (heat + turb) * fade;

        const bayer = BAYER4[py & 3][px & 3];
        if (heat + (bayer - 0.5) * 0.22 < 0.16) continue;

        const palIdx = Math.max(
          0,
          Math.min(
            FIRE_PALETTE.length - 1,
            Math.floor((heat + (bayer - 0.5) * 0.14) * 13.5)
          )
        );
        const rgb = FIRE_PALETTE[palIdx];
        const idx = (py * size + px) * 4;
        data[idx] = rgb[0];
        data[idx + 1] = rgb[1];
        data[idx + 2] = rgb[2];
        data[idx + 3] = 255;
      }
    }

    fireCtx.putImageData(fireImgData, 0, 0);

    const drawDiam = Math.round(screenRadius * 2);
    const drawX = Math.round(screenX - screenRadius);
    const drawY = Math.round(screenY - screenRadius);
    ctx.drawImage(fireCanvas, 0, 0, size, size, drawX, drawY, drawDiam, drawDiam);

    // Horizontal plasma shockwave streaks & vertical laser-capacitor discharge spikes (frame_006.jpg)
    if (ageSec < 1.35) {
      const streakFade = Math.max(0, 1.0 - ageSec / 1.35);
      ctx.fillStyle = '#ffffcc';
      const sw = Math.round(screenRadius * 0.95 * streakFade);
      const sx0 = Math.round(screenX - sw * 0.55);
      const sy0 = Math.round(screenY + screenRadius * 0.12);
      ctx.fillRect(sx0, sy0, sw, 3);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(sx0 + 6, sy0 + 1, Math.max(0, sw - 12), 1);
      ctx.fillStyle = '#ffee77';
      ctx.fillRect(sx0 - 4, sy0 + 6, Math.round(sw * 0.82), 2);
      ctx.fillRect(sx0 + 8, sy0 - 5, Math.round(sw * 0.65), 2);

      // Vertical bright plasma spikes on right of fireball core (frame_006.jpg)
      const vx1 = Math.round(screenX + screenRadius * 0.34);
      const vh1 = Math.round(screenRadius * 0.72 * streakFade);
      ctx.fillStyle = '#ffffaa';
      ctx.fillRect(vx1, Math.round(screenY - vh1 * 0.45), 2, vh1);
      ctx.fillRect(vx1 + 7, Math.round(screenY - vh1 * 0.62), 3, Math.round(vh1 * 0.85));
    }
  }

  // ---------------------------------------------------------------------------
  // 3D SOFTWARE RASTERIZER PIPELINE
  // ---------------------------------------------------------------------------
  const LIGHT_PRIMARY = vecNorm([-0.52, 0.68, -0.51]);
  const LIGHT_FILL = vecNorm([0.45, -0.25, 0.85]);

  function projectCamPoint(p) {
    const z = p[2];
    const invZ = FOV / z;
    return [
      CX + p[0] * invZ,
      CY - p[1] * invZ,
      z
    ];
  }

  const Z_NEAR = 1.8;
  function clipPolygonNear(verts) {
    const out = [];
    const n = verts.length;
    for (let i = 0; i < n; i++) {
      const a = verts[i];
      const b = verts[(i + 1) % n];
      const aIn = a[2] >= Z_NEAR;
      const bIn = b[2] >= Z_NEAR;
      if (aIn && bIn) {
        out.push(b);
      } else if (aIn && !bIn) {
        const t = (Z_NEAR - a[2]) / (b[2] - a[2]);
        out.push([
          a[0] + (b[0] - a[0]) * t,
          a[1] + (b[1] - a[1]) * t,
          Z_NEAR
        ]);
      } else if (!aIn && bIn) {
        const t = (Z_NEAR - a[2]) / (b[2] - a[2]);
        out.push([
          a[0] + (b[0] - a[0]) * t,
          a[1] + (b[1] - a[1]) * t,
          Z_NEAR
        ]);
        out.push(b);
      }
    }
    return out;
  }

  function queueMesh(renderQueue, meshFaces, modelPos, modelRotMat, camPos, camRotMat, explosionLight) {
    for (let i = 0; i < meshFaces.length; i++) {
      const f = meshFaces[i];
      const worldVerts = transformVerts(f.verts, modelPos, modelRotMat);

      const e1 = vecSub(worldVerts[1], worldVerts[0]);
      const e2 = vecSub(worldVerts[2], worldVerts[0]);
      let normal = vecNorm(vecCross(e1, e2));

      const camVerts = new Array(worldVerts.length);
      let avgZ = 0;
      for (let k = 0; k < worldVerts.length; k++) {
        const rel = vecSub(worldVerts[k], camPos);
        const cv = applyMat3Transpose(camRotMat, rel);
        camVerts[k] = cv;
        avgZ += cv[2];
      }
      avgZ /= worldVerts.length;

      const clipped = clipPolygonNear(camVerts);
      if (clipped.length < 3) continue;

      const proj = clipped.map(projectCamPoint);

      const sx1 = proj[1][0] - proj[0][0];
      const sy1 = proj[1][1] - proj[0][1];
      const sx2 = proj[2][0] - proj[0][0];
      const sy2 = proj[2][1] - proj[0][1];
      const cross2D = sx1 * sy2 - sy1 * sx2;

      if (!f.doubleSided && cross2D <= 0) continue;
      if (f.doubleSided && cross2D < 0) {
        normal = [-normal[0], -normal[1], -normal[2]];
      }

      let r = f.color[0];
      let g = f.color[1];
      let b = f.color[2];

      if (!f.emissive) {
        const d1 = Math.max(0, vecDot(normal, LIGHT_PRIMARY));
        const d2 = Math.max(0, vecDot(normal, LIGHT_FILL));
        let intensity = 0.42 + d1 * 0.62 + d2 * 0.22;
        intensity = Math.round(intensity * 16) / 16;

        r = Math.round(r * intensity);
        g = Math.round(g * intensity);
        b = Math.round(b * intensity);

        if (explosionLight && explosionLight.strength > 0.01) {
          const toExp = vecSub(explosionLight.pos, worldVerts[0]);
          const dist = Math.hypot(toExp[0], toExp[1], toExp[2]) || 1;
          const expDir = [toExp[0] / dist, toExp[1] / dist, toExp[2] / dist];
          const expDot = Math.max(0.15, vecDot(normal, expDir));
          const atten = Math.min(1.0, 38 / (dist + 12)) * explosionLight.strength * expDot;
          r += Math.round(255 * atten * 0.85);
          g += Math.round(145 * atten * 0.75);
          b += Math.round(40 * atten * 0.45);
        }
      }

      r = Math.max(0, Math.min(255, r));
      g = Math.max(0, Math.min(255, g));
      b = Math.max(0, Math.min(255, b));

      renderQueue.push({
        type: 'poly',
        z: avgZ + (f.bias || 0),
        pts: proj,
        fill: `rgb(${r},${g},${b})`
      });
    }
  }

  function queueLaserBolt(renderQueue, pStart, pEnd, camPos, camRotMat, coreColor, outerColor) {
    const c0 = applyMat3Transpose(camRotMat, vecSub(pStart, camPos));
    const c1 = applyMat3Transpose(camRotMat, vecSub(pEnd, camPos));
    const clipped = clipPolygonNear([c0, c1]);
    if (clipped.length < 2) return;
    const s0 = projectCamPoint(clipped[0]);
    const s1 = projectCamPoint(clipped[1]);
    const avgZ = (clipped[0][2] + clipped[1][2]) * 0.5;
    renderQueue.push({
      type: 'laser',
      z: avgZ,
      s0,
      s1,
      coreColor,
      outerColor
    });
  }

  // ---------------------------------------------------------------------------
  // MAIN 8.0-SECOND CHOREOGRAPHY LOOP (localT = t % 8.0)
  // ---------------------------------------------------------------------------
  function drawTIEFighter1994(ctx, w, h, t) {
    initBuffers();

    const localT = ((t % 8.0) + 8.0) % 8.0;
    const T_EXPLODE = 3.25;
    const T_WARP = 7.20;

    // 1. Clear 480x270 SVGA buffer to deep space black
    offCtx.fillStyle = '#000000';
    offCtx.fillRect(0, 0, W, H);

    // -------------------------------------------------------------------------
    // PHASE 4: 1994 Hyperspace / High-Speed Radial Starfield Jump (7.20s - 8.00s)
    // Exact match for frame_008.jpg!
    // -------------------------------------------------------------------------
    if (localT >= T_WARP) {
      const wp = (localT - T_WARP) / (8.0 - T_WARP); // 0..1
      const stretch = 0.08 + wp * 0.52;

      for (let i = 0; i < 240; i++) {
        const s = STARS_3D[i];
        const rx = ((i * 73) % 460) - 230;
        const ry = ((i * 137) % 250) - 125;
        const dist = Math.hypot(rx, ry);
        if (dist < 14) continue;

        const scale0 = 0.35 + ((i * 29) % 100) / 100 * 0.85 + wp * 0.55;
        const scale1 = scale0 * (1.0 + stretch * (0.5 + dist / 140));

        const x0 = Math.round(CX + rx * scale0);
        const y0 = Math.round(CY + ry * scale0);
        const x1 = Math.round(CX + rx * scale1);
        const y1 = Math.round(CY + ry * scale1);

        offCtx.strokeStyle = i % 3 === 0 ? '#b8c8e8' : '#ffffff';
        offCtx.lineWidth = s.size;
        offCtx.beginPath();
        offCtx.moveTo(x0, y0);
        offCtx.lineTo(x1, y1);
        offCtx.stroke();
      }

      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(offCanvas, 0, 0, w, h);
      ctx.restore();
      return;
    }

    // -------------------------------------------------------------------------
    // CAMERA TRAJECTORY & ORIENTATION (0.0s - 7.20s)
    // -------------------------------------------------------------------------
    const camPos = [0, 0, localT * 30.0];

    let camYaw = 0;
    let camPitch = -0.05;
    let camRoll = 0;

    if (localT < T_EXPLODE) {
      // Phase 1 (0..3.25s): Pursuing the banking X-Wing above the planet (frame_005.jpg)
      const p = localT / T_EXPLODE;
      camYaw = -0.18 + p * 0.18 + Math.sin(localT * 1.8) * 0.025;
      camPitch = -0.05 + Math.cos(localT * 1.5) * 0.02;
      camRoll = -0.07 + Math.sin(localT * 1.4) * 0.05;
    } else {
      // Phase 2 & 3 (3.25..7.20s): Blast shockwave + banking right past the cargo convoy & Star Destroyer (frame_006 & frame_007)
      const ep = (localT - T_EXPLODE) / (T_WARP - T_EXPLODE); // 0..1
      const shake = Math.max(0, 1.0 - (localT - T_EXPLODE) * 1.8) * 0.018;
      camYaw = 0.02 + ep * 0.56 + Math.sin(localT * 42) * shake;
      camPitch = -0.04 + ep * 0.08 + Math.cos(localT * 37) * shake;
      camRoll = -0.04 + Math.sin(ep * Math.PI) * 0.14;
    }

    const camRotMat = makeRotMatrix(camYaw, camPitch, camRoll);

    // -------------------------------------------------------------------------
    // 1. 3D ROTATING STARFIELD & BANDED BLUE-GREY PLANET (frame_005 & frame_006)
    // -------------------------------------------------------------------------
    for (let i = 0; i < STARS_3D.length; i++) {
      const s = STARS_3D[i];
      const cv = applyMat3Transpose(camRotMat, s.pos);
      if (cv[2] <= 10) continue;
      const sx = Math.round(CX + (cv[0] / cv[2]) * FOV);
      const sy = Math.round(CY - (cv[1] / cv[2]) * FOV);
      if (sx >= 0 && sx < W && sy >= 0 && sy < H) {
        offCtx.fillStyle = s.color;
        offCtx.fillRect(sx, sy, s.size, s.size);
      }
    }

    // Project distant Banded Blue-Grey Planet direction into camera space
    // In frame_005.jpg, planet top limb reaches y ~ 190 and right limb reaches x ~ 280;
    // In frame_006.jpg, planet has panned to the far lower-left edge!
    const planetWorldDir = [-165, -162, 470];
    const planetCam = applyMat3Transpose(camRotMat, planetWorldDir);
    if (planetCam[2] > 50) {
      const px = Math.round(CX + (planetCam[0] / planetCam[2]) * FOV - 135);
      const py = Math.round(CY - (planetCam[1] / planetCam[2]) * FOV - 135);
      if (px + 270 > 0 && px < W && py + 270 > 0 && py < H) {
        offCtx.drawImage(planetCanvas, px, py);
      }
    }

    // -------------------------------------------------------------------------
    // 2. BUILD 3D SCENE RENDER QUEUE
    // -------------------------------------------------------------------------
    const renderQueue = [];

    function getXWingState(timeSec) {
      // Positioned at medium distance (z ~ +130 ahead of camera) so the whole X-Wing + 4 S-foils + tapered nosecone
      // match the exact scale and screen placement of frame_005.jpg!
      const z = timeSec * 30.0 + 132.0 - timeSec * 11.0;
      const x = -5.0 + timeSec * 6.0 + Math.sin(timeSec * 1.6) * 4.0;
      const y = 5.5 + Math.cos(timeSec * 1.3) * 4.0;
      const yaw = 1.06 + Math.cos(timeSec * 1.1) * 0.12;
      const pitch = -0.34 + Math.sin(timeSec * 1.1) * 0.08;
      const roll = -0.34 + Math.sin(timeSec * 1.5) * 0.16;
      return { pos: [x, y, z], yaw, pitch, roll };
    }

    const explodeState = getXWingState(T_EXPLODE);
    // Keep explosion centered in camera view as camera pans right!
    const explodeAge = Math.max(0, localT - T_EXPLODE);
    const explodePos = [
      explodeState.pos[0] + explodeAge * 18.5,
      explodeState.pos[1] - 3.5 - explodeAge * 1.5,
      explodeState.pos[2] + explodeAge * 23.0
    ];

    const isExploded = localT >= T_EXPLODE;
    const explosionLight = isExploded
      ? {
          pos: explodePos,
          strength: Math.max(0, 1.0 - explodeAge / 3.0) * 1.35
        }
      : null;

    // A. Intact Rebel X-Wing (0.0s - 3.25s, matching frame_005.jpg)
    let currentXWingScreen = null;
    let leadCrosshairScreen = null;

    if (!isExploded) {
      const xw = getXWingState(localT);
      const xwRot = makeRotMatrix(xw.yaw, xw.pitch, xw.roll);

      const hitFlash =
        localT > 1.85 && Math.sin(localT * 34) > 0.55
          ? { pos: xw.pos, strength: 0.85 }
          : null;

      queueMesh(renderQueue, XWING_PARTS.fuselage, xw.pos, xwRot, camPos, camRotMat, hitFlash);
      queueMesh(renderQueue, XWING_PARTS.noseCone, xw.pos, xwRot, camPos, camRotMat, hitFlash);
      queueMesh(renderQueue, XWING_PARTS.canopy, xw.pos, xwRot, camPos, camRotMat, hitFlash);
      for (let wIdx = 0; wIdx < 4; wIdx++) {
        queueMesh(renderQueue, XWING_PARTS.wings[wIdx], xw.pos, xwRot, camPos, camRotMat, hitFlash);
      }

      // Compute 2D screen projection of X-Wing center & lead target for the green 1994 HUD brackets (frame_005.jpg)
      const xwCam = applyMat3Transpose(camRotMat, vecSub(xw.pos, camPos));
      if (xwCam[2] > Z_NEAR) {
        currentXWingScreen = projectCamPoint(xwCam);
      }
      const leadWorld = [xw.pos[0] - 15.0, xw.pos[1] - 8.5, xw.pos[2] - 2.0];
      const leadCam = applyMat3Transpose(camRotMat, vecSub(leadWorld, camPos));
      if (leadCam[2] > Z_NEAR) {
        leadCrosshairScreen = projectCamPoint(leadCam);
      }

      // Dual-linked Emerald Green Imperial Laser Cannon Bolts firing into the X-Wing (1.80s - 3.25s)
      if (localT >= 1.80) {
        for (let salvo = 0; salvo < 2; salvo++) {
          const cycle = ((localT * 4.2 + salvo * 0.5) % 1.0);
          const boltLen = 0.22;
          for (const side of [-1, 1]) {
            const origin = [
              camPos[0] + side * 7.5,
              camPos[1] - 5.0,
              camPos[2] + 5.0
            ];
            const target = [
              xw.pos[0] + side * 1.8,
              xw.pos[1] - 0.5,
              xw.pos[2] - 2.0
            ];
            const t0 = cycle;
            const t1 = Math.min(1.0, cycle + boltLen);
            const p0 = [
              origin[0] + (target[0] - origin[0]) * t0,
              origin[1] + (target[1] - origin[1]) * t0,
              origin[2] + (target[2] - origin[2]) * t0
            ];
            const p1 = [
              origin[0] + (target[0] - origin[0]) * t1,
              origin[1] + (target[1] - origin[1]) * t1,
              origin[2] + (target[2] - origin[2]) * t1
            ];
            queueLaserBolt(renderQueue, p0, p1, camPos, camRotMat, '#ccffcc', '#22ff33');
          }
        }
      }
    } else {
      // B. Exploding X-Wing: Volumetric 1994 Dithered Fireball + 3D Spinning S-Foil Wing & Hull Shards!
      // Exact match for frame_006.jpg!
      const expCam = applyMat3Transpose(camRotMat, vecSub(explodePos, camPos));
      if (expCam[2] > Z_NEAR) {
        const expScreen = projectCamPoint(expCam);
        const worldFireRadius = 24.5 * (0.48 + Math.min(1.0, explodeAge * 3.2) * 0.65) * Math.max(0.32, 1.0 - explodeAge * 0.17);
        const screenFireRadius = (worldFireRadius / expCam[2]) * FOV;
        renderQueue.push({
          type: 'fireball',
          z: expCam[2],
          sx: expScreen[0],
          sy: expScreen[1],
          rad: screenFireRadius,
          age: explodeAge
        });
      }

      // 3D Torn S-Foil Wings & Nose Cone flying outward toward the camera (matching frame_006.jpg!)
      if (explodeAge < 2.25) {
        const dt = explodeAge;
        const debrisConfigs = [
          // Left S-foil wing spinning upper-left toward camera (left wing in frame_006.jpg)
          {
            faces: XWING_PARTS.wings[2],
            vel: [-36.0, 12.0, -28.0],
            baseRot: [0.35, 0.48, -0.25],
            rotVel: [0.9, -1.3, 0.8]
          },
          // Lower-right S-foil wing with engine cylinder & cannon spinning lower-right (bottom-right wing in frame_006.jpg)
          {
            faces: XWING_PARTS.wings[1],
            vel: [11.0, -19.5, -28.0],
            baseRot: [-0.85, 0.50, 1.25],
            rotVel: [-1.2, 1.0, -1.1]
          },
          // Nose cone shard flying upper-left of fireball (seen at top-left edge of fireball in frame_006.jpg)
          {
            faces: XWING_PARTS.noseCone,
            vel: [-18.5, 22.0, -12.0],
            baseRot: [0.2, 1.2, 0.4],
            rotVel: [-2.0, 1.4, 2.2]
          },
          // White-heated cockpit canopy dome near center of blast
          {
            faces: XWING_PARTS.canopy,
            vel: [2.0, 4.5, -8.0],
            baseRot: [0.4, -0.3, 0.2],
            rotVel: [1.8, -2.1, 1.2]
          }
        ];

        for (let d = 0; d < debrisConfigs.length; d++) {
          const dc = debrisConfigs[d];
          const dPos = [
            explodePos[0] + dc.vel[0] * dt,
            explodePos[1] + dc.vel[1] * dt,
            explodePos[2] + dc.vel[2] * dt
          ];
          const dRot = makeRotMatrix(
            dc.baseRot[0] + dc.rotVel[0] * dt,
            dc.baseRot[1] + dc.rotVel[1] * dt,
            dc.baseRot[2] + dc.rotVel[2] * dt
          );
          queueMesh(renderQueue, dc.faces, dPos, dRot, camPos, camRotMat, explosionLight);
        }

        for (let sIdx = 0; sIdx < EXTRA_SHARDS.length; sIdx++) {
          const sh = EXTRA_SHARDS[sIdx];
          const sPos = [
            explodePos[0] + sh.vel[0] * dt,
            explodePos[1] + sh.vel[1] * dt,
            explodePos[2] + sh.vel[2] * dt
          ];
          const sRot = makeRotMatrix(
            sh.rotVel[0] * dt,
            sh.rotVel[1] * dt,
            sh.rotVel[2] * dt
          );
          queueMesh(renderQueue, sh.faces, sPos, sRot, camPos, camRotMat, explosionLight);
        }
      }
    }

    // C. 3D Imperial Modular Cargo Container (passes on lower-right in frame_006.jpg!)
    if (localT >= 2.65) {
      const cargoPos = [64.0, -24.0, 192.0];
      const cargoRot = makeRotMatrix(-0.45, 0.12, 0.18);
      queueMesh(renderQueue, CARGO_MESH, cargoPos, cargoRot, camPos, camRotMat, explosionLight);
    }

    // D. 3D Imperial Capital Ship / Star Destroyer Convoy (stretches out on right in frame_007.jpg!)
    if (localT >= 4.10) {
      const capPos = [132.0, 2.0, 338.0];
      const capRot = makeRotMatrix(1.18, -0.14, -0.22);
      queueMesh(renderQueue, CAPITAL_SHIP_MESH, capPos, capRot, camPos, camRotMat, explosionLight);
    }

    // E. Pursuing 3D Imperial TIE Fighter Banking Right Through the Explosion Center!
    // Exact match for frame_007.jpg: at localT ~ 5.65s, the TIE Fighter is right in the center of the screen
    // directly in front of the clearing orange fireball, banking dynamically with both hexagonal solar wings visible!
    if (localT >= 4.35) {
      const tp = (localT - 4.35) / (T_WARP - 4.35); // 0..1
      // Place TIE Fighter right along the camera-to-fireball line of sight at z = camPos[2] + 92
      // so it matches the exact scale and centered composition of frame_007.jpg!
      const tiePos = [
        explodePos[0] * 0.90 + (tp - 0.46) * 18.0,
        explodePos[1] * 0.90 - 1.5 + Math.sin(tp * Math.PI) * 2.5,
        camPos[2] + 78.0 + tp * 34.0
      ];
      const tieYaw = 0.58 - tp * 0.24;
      const tiePitch = 0.16 - tp * 0.20;
      const tieRoll = -0.36 + tp * 0.52;
      const tieRot = makeRotMatrix(tieYaw, tiePitch, tieRoll);

      queueMesh(renderQueue, TIE_FIGHTER_MESH, tiePos, tieRot, camPos, camRotMat, explosionLight);

      // TIE Fighter fires dual green laser bolts ahead (6.0s - 7.1s)
      if (localT >= 6.0) {
        const cycle = ((localT * 4.2) % 1.0);
        for (const side of [-1, 1]) {
          const bStart = [tiePos[0] + side * 2.2, tiePos[1] - 1.5, tiePos[2] + 8.0 + cycle * 95.0];
          const bEnd = [tiePos[0] + side * 2.2, tiePos[1] - 1.5, tiePos[2] + 24.0 + cycle * 95.0];
          queueLaserBolt(renderQueue, bStart, bEnd, camPos, camRotMat, '#ccffcc', '#22ff33');
        }
      }
    }

    // -------------------------------------------------------------------------
    // 3. PAINTER'S ALGORITHM DEPTH SORT (Back-to-Front) & RASTERIZATION
    // -------------------------------------------------------------------------
    renderQueue.sort((a, b) => b.z - a.z);

    for (let i = 0; i < renderQueue.length; i++) {
      const item = renderQueue[i];
      if (item.type === 'poly') {
        const pts = item.pts;
        offCtx.fillStyle = item.fill;
        offCtx.beginPath();
        offCtx.moveTo(Math.round(pts[0][0]), Math.round(pts[0][1]));
        for (let k = 1; k < pts.length; k++) {
          offCtx.lineTo(Math.round(pts[k][0]), Math.round(pts[k][1]));
        }
        offCtx.closePath();
        offCtx.fill();
      } else if (item.type === 'laser') {
        offCtx.strokeStyle = item.outerColor;
        offCtx.lineWidth = 2.2;
        offCtx.beginPath();
        offCtx.moveTo(Math.round(item.s0[0]), Math.round(item.s0[1]));
        offCtx.lineTo(Math.round(item.s1[0]), Math.round(item.s1[1]));
        offCtx.stroke();

        offCtx.strokeStyle = item.coreColor;
        offCtx.lineWidth = 1.0;
        offCtx.beginPath();
        offCtx.moveTo(Math.round(item.s0[0]), Math.round(item.s0[1]));
        offCtx.lineTo(Math.round(item.s1[0]), Math.round(item.s1[1]));
        offCtx.stroke();
      } else if (item.type === 'fireball') {
        renderDitheredFireball(offCtx, item.sx, item.sy, item.rad, item.age);
      }
    }

    // -------------------------------------------------------------------------
    // 4. 1994 GREEN TARGETING BRACKETS & HUD CROSSHAIR (frame_005, 006, 007)
    // -------------------------------------------------------------------------
    offCtx.fillStyle = '#28e828';

    // Center fixed sight crosshair '+' (visible in frame_006.jpg & frame_007.jpg)
    if (isExploded) {
      offCtx.fillRect(CX - 7, CY, 4, 1);
      offCtx.fillRect(CX + 4, CY, 4, 1);
      offCtx.fillRect(CX, CY - 7, 1, 4);
      offCtx.fillRect(CX, CY + 4, 1, 4);
    }

    // Target lock corner brackets '[ ]' & green lead indicator '+' on X-Wing (visible in frame_005.jpg!)
    if (!isExploded && currentXWingScreen) {
      const tx = Math.round(currentXWingScreen[0]);
      const ty = Math.round(currentXWingScreen[1]);
      const bx = 11, by = 10, arm = 4;

      // Top-left corner
      offCtx.fillRect(tx - bx, ty - by, arm, 1);
      offCtx.fillRect(tx - bx, ty - by, 1, arm);
      // Top-right corner
      offCtx.fillRect(tx + bx - arm + 1, ty - by, arm, 1);
      offCtx.fillRect(tx + bx, ty - by, 1, arm);
      // Bottom-left corner
      offCtx.fillRect(tx - bx, ty + by, arm, 1);
      offCtx.fillRect(tx - bx, ty + by - arm + 1, 1, arm);
      // Bottom-right corner
      offCtx.fillRect(tx + bx - arm + 1, ty + by, arm, 1);
      offCtx.fillRect(tx + bx, ty + by - arm + 1, 1, arm);

      if (leadCrosshairScreen) {
        const lx = Math.round(leadCrosshairScreen[0]);
        const ly = Math.round(leadCrosshairScreen[1]);
        offCtx.fillRect(lx - 7, ly, 4, 1);
        offCtx.fillRect(lx + 4, ly, 4, 1);
        offCtx.fillRect(lx, ly - 7, 1, 4);
        offCtx.fillRect(lx, ly + 4, 1, 4);
      }
    }

    // -------------------------------------------------------------------------
    // 5. BLIT 480x270 SVGA BUFFER TO MAIN CANVAS WITH CRISP NEAREST-NEIGHBOR PIXELS
    // -------------------------------------------------------------------------
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(offCanvas, 0, 0, w, h);
    ctx.restore();
  }

  window.GAMES = window.GAMES || [];
  window.GAMES[1] = {
    title: 'Star Wars: TIE Fighter',
    year: '1994',
    draw: drawTIEFighter1994
  };
  if (window.GameAnimations) {
    window.GameAnimations.game2 = drawTIEFighter1994;
  }
})();
