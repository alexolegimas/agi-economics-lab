// Game 9: The Elder Scrolls Online (2014) — Coldharbour Dark Anchor Dolmen Simulation
// 3D Low-Angle Night Scene: Planar Vortex of Coldharbour churning above an ancient stone
// Dolmen ruin atop a wind-swept grassy hill, harpooned by Molag Bal's Daedric Dark Anchor
// pinion spire and four spiked cold-iron chains with volumetric mist, glowing Daedric runes,
// and thousands of wind-blown 3D grass blades.
(function() {
  window.GAMES = window.GAMES || [];
  window.GameAnimations = window.GameAnimations || {};

  // Deterministic PRNG (Mulberry32)
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function() {
      let t = (a += 0x6D2B79F5);
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

  // Fast 2D Value Noise & Fractional Brownian Motion (FBM) for procedural textures
  const perm = new Uint8Array(512);
  (function initNoise() {
    const rng = mulberry32(20140404);
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const tmp = p[i];
      p[i] = p[j];
      p[j] = tmp;
    }
    for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  })();

  function hash2(ix, iy) {
    return perm[(ix & 255) + perm[iy & 255]] / 255.0;
  }

  function noise2D(x, y) {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    const fx = x - ix;
    const fy = y - iy;
    const ux = fx * fx * (3.0 - 2.0 * fx);
    const uy = fy * fy * (3.0 - 2.0 * fy);
    const a = hash2(ix, iy);
    const b = hash2(ix + 1, iy);
    const c = hash2(ix, iy + 1);
    const d = hash2(ix + 1, iy + 1);
    return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
  }

  function fbm2D(x, y, octaves = 4) {
    let val = 0.0;
    let amp = 0.5;
    let freq = 1.0;
    for (let i = 0; i < octaves; i++) {
      val += amp * noise2D(x * freq, y * freq);
      freq *= 2.03;
      amp *= 0.5;
    }
    return val;
  }

  // Pre-baked Offscreen Procedural Shader Textures (initialized lazily once)
  let assets = null;

  function ensureAssets() {
    if (assets) return assets;

    // 1. Planar Vortex Primary Spiral Layer (440x440) — 100% continuous radial & spiral shading
    const vSize = 440;
    const vortexCanvasA = document.createElement('canvas');
    vortexCanvasA.width = vSize;
    vortexCanvasA.height = vSize;
    const vCtxA = vortexCanvasA.getContext('2d');
    const imgA = vCtxA.createImageData(vSize, vSize);
    const dA = imgA.data;
    const halfV = vSize * 0.5;

    for (let py = 0; py < vSize; py++) {
      for (let px = 0; px < vSize; px++) {
        const dx = (px - halfV) / halfV;
        const dy = (py - halfV) / halfV;
        const r = Math.hypot(dx, dy);
        if (r >= 1.0) continue;

        const theta = Math.atan2(dy, dx);
        const effR = Math.sqrt(r * r + 0.018);
        const logR = Math.log(effR);
        const spiral5 = theta * 5.0 - logR * 6.4 - r * 2.2;
        const spiral3 = theta * 3.0 - logR * 4.8 + 1.1;

        const n1 = fbm2D(dx * 3.6 + 4.2, dy * 3.6 + 1.7, 4);
        const n2 = fbm2D(dx * 6.4 + 9.1, dy * 6.4 + 3.4, 3);

        const arm1 = 0.5 + 0.5 * Math.sin(spiral5 + (n1 - 0.5) * 3.2);
        const arm2 = 0.5 + 0.5 * Math.cos(spiral3 + (n2 - 0.5) * 2.6);
        const ridge = Math.pow(arm1 * 0.68 + arm2 * 0.32, 1.35);

        const eyeDepth = smoothstep(0.03, 0.48, r);
        const torusBell = Math.exp(-Math.pow((r - 0.58) / 0.24, 2.0));
        const outerFade = 1.0 - smoothstep(0.64, 0.99, r);

        const heat = clamp(
          (torusBell * (0.48 + 0.62 * ridge) + (1.0 - eyeDepth) * ridge * 0.36) *
            (0.28 + 0.72 * eyeDepth) *
            outerFade,
          0,
          1.15
        );

        const hNorm = clamp(heat, 0, 1);
        const cr = lerp(34, 255, Math.pow(hNorm, 0.52));
        const cg = lerp(11, 142, Math.pow(hNorm, 1.18));
        const cb = lerp(12, 38, Math.pow(hNorm, 2.05));
        const ca = clamp(outerFade * (0.72 * (1.0 - eyeDepth) + eyeDepth * (0.42 + 0.58 * hNorm)), 0, 1);

        const idx = (py * vSize + px) * 4;
        dA[idx] = Math.round(clamp(cr, 0, 255));
        dA[idx + 1] = Math.round(clamp(cg, 0, 255));
        dA[idx + 2] = Math.round(clamp(cb, 0, 255));
        dA[idx + 3] = Math.round(clamp(ca * 255, 0, 255));
      }
    }
    vCtxA.putImageData(imgA, 0, 0);

    // 2. Planar Vortex Secondary Filament Layer (360x360, rotates at faster speed for live shearing)
    const vSizeB = 360;
    const vortexCanvasB = document.createElement('canvas');
    vortexCanvasB.width = vSizeB;
    vortexCanvasB.height = vSizeB;
    const vCtxB = vortexCanvasB.getContext('2d');
    const imgB = vCtxB.createImageData(vSizeB, vSizeB);
    const dB = imgB.data;
    const halfVB = vSizeB * 0.5;

    for (let py = 0; py < vSizeB; py++) {
      for (let px = 0; px < vSizeB; px++) {
        const dx = (px - halfVB) / halfVB;
        const dy = (py - halfVB) / halfVB;
        const r = Math.hypot(dx, dy);
        if (r >= 1.0) continue;

        const theta = Math.atan2(dy, dx);
        const effR = Math.sqrt(r * r + 0.02);
        const logR = Math.log(effR);
        const n = fbm2D(dx * 4.8 + 11.3, dy * 4.8 + 7.9, 3);
        const wave = Math.pow(0.5 + 0.5 * Math.sin(theta * 4.0 - logR * 7.2 + n * 3.6), 2.0);
        const env =
          smoothstep(0.06, 0.36, r) *
          Math.exp(-Math.pow((r - 0.56) / 0.22, 2.0)) *
          (1.0 - smoothstep(0.70, 0.98, r));
        const alpha = clamp(wave * env * 0.58, 0, 1);

        const idx = (py * vSizeB + px) * 4;
        dB[idx] = 255;
        dB[idx + 1] = Math.round(lerp(75, 168, wave));
        dB[idx + 2] = Math.round(lerp(14, 48, wave));
        dB[idx + 3] = Math.round(alpha * 255);
      }
    }
    vCtxB.putImageData(imgB, 0, 0);

    // 3. Night Sky Streaked Storm Cloud Panorama (640x240 tileable horizontal stratus cloud layer)
    const skyW = 640;
    const skyH = 240;
    const cloudCanvas = document.createElement('canvas');
    cloudCanvas.width = skyW;
    cloudCanvas.height = skyH;
    const cCtx = cloudCanvas.getContext('2d');
    const cImg = cCtx.createImageData(skyW, skyH);
    const cData = cImg.data;

    for (let y = 0; y < skyH; y++) {
      const ny = y / skyH;
      for (let x = 0; x < skyW; x++) {
        const nx = x / skyW;
        const ang = nx * Math.PI * 2.0;
        const u = Math.cos(ang) * 1.4 + 3.1;
        const v = Math.sin(ang) * 1.4 + 5.7;
        // High-aspect horizontal stratus streaks matching frame_036..039 night sky
        const f1 = fbm2D(u + nx * 2.6, ny * 9.5 + 2.0, 4);
        const f2 = fbm2D(v + nx * 5.2 + 4.4, ny * 18.0 + 8.1, 3);
        const raw = clamp((f1 * 0.65 + f2 * 0.35 - 0.32) * 2.25, 0, 1);
        const streak = 0.42 + 0.58 * Math.sin(ny * 38.0 + f1 * 5.8);
        const density =
          Math.pow(raw * streak, 1.15) *
          smoothstep(0.01, 0.18, ny) *
          (0.35 + 0.65 * Math.pow(ny, 0.75));

        const idx = (y * skyW + x) * 4;
        cData[idx] = Math.round(lerp(10, 78, density));
        cData[idx + 1] = Math.round(lerp(14, 88, density));
        cData[idx + 2] = Math.round(lerp(24, 110, density));
        cData[idx + 3] = Math.round(clamp(density * 235, 0, 255));
      }
    }
    cCtx.putImageData(cImg, 0, 0);

    // 4. Volumetric Mist Puff Sprite (128x128 FBM turbulent cloud patch)
    const mSize = 128;
    const mistSprite = document.createElement('canvas');
    mistSprite.width = mSize;
    mistSprite.height = mSize;
    const mCtx = mistSprite.getContext('2d');
    const mImg = mCtx.createImageData(mSize, mSize);
    const mData = mImg.data;
    const halfM = mSize * 0.5;

    for (let y = 0; y < mSize; y++) {
      for (let x = 0; x < mSize; x++) {
        const dx = (x - halfM) / halfM;
        const dy = (y - halfM) / halfM;
        const r = Math.hypot(dx, dy);
        if (r >= 1.0) continue;
        const falloff = Math.pow(1.0 - r * r, 1.85);
        const turb = fbm2D(dx * 3.2 + 6.1, dy * 3.2 + 2.9, 4);
        const a = clamp(falloff * (0.35 + 0.85 * turb), 0, 1);
        const shade = lerp(142, 198, turb * (1.0 - r * 0.35));
        const idx = (y * mSize + x) * 4;
        mData[idx] = Math.round(shade);
        mData[idx + 1] = Math.round(shade + 3);
        mData[idx + 2] = Math.round(shade + 7);
        mData[idx + 3] = Math.round(a * 170);
      }
    }
    mCtx.putImageData(mImg, 0, 0);

    // 5. Pre-generated deterministic scene elements
    const rng = mulberry32(20140928);

    const skySparks = Array.from({ length: 70 }, () => ({
      x: rng(),
      y: rng() * 0.62,
      size: 0.55 + rng() * 1.3,
      twinkleSpeed: 1.5 + rng() * 3.5,
      phase: rng() * Math.PI * 2,
      isWarm: rng() < 0.40
    }));

    const embers = Array.from({ length: 64 }, () => ({
      xSpread: (rng() - 0.5) * 0.44,
      yOffset: rng(),
      speed: 0.055 + rng() * 0.105,
      size: 0.85 + rng() * 1.65,
      wobbleFreq: 1.8 + rng() * 3.2,
      wobbleAmp: 0.008 + rng() * 0.016,
      phase: rng() * Math.PI * 2,
      isCyan: rng() < 0.14
    }));

    const mistPuffs = Array.from({ length: 48 }, (_, i) => {
      const norm = i / 47;
      const spreadX = (norm - 0.5) * 0.66 + (rng() - 0.5) * 0.07;
      return {
        baseX: 0.51 + spreadX,
        baseY: 0.64 + (rng() - 0.5) * 0.12 + Math.abs(spreadX) * 0.11,
        radiusX: 0.075 + rng() * 0.085,
        radiusY: 0.055 + rng() * 0.065,
        driftX: (spreadX >= 0 ? 1 : -1) * (0.018 + rng() * 0.035),
        driftY: -0.005 - rng() * 0.012,
        rot0: rng() * Math.PI * 2,
        rotSpeed: (rng() - 0.5) * 0.25,
        alphaScale: 0.52 + rng() * 0.48,
        isFront: i % 3 !== 0
      };
    });

    // 3,200 3D-projected wind-swept grass blades sorted back-to-front across the hillside
    const grassBlades = [];
    // First 260 blades: dedicated dense ridge-crest grass across the full horizon so no smooth ground curve shows
    for (let i = 0; i < 260; i++) {
      const xNorm = -0.05 + (i / 259) * 1.10 + (rng() - 0.5) * 0.008;
      const zNorm = rng() * 0.035;
      grassBlades.push({
        xNorm,
        zNorm,
        heightScale: 0.85 + rng() * 0.65,
        leanBase: -0.15 + (rng() - 0.48) * 0.50,
        windPhase: xNorm * 9.5 + zNorm * 4.2 + rng() * 1.5,
        hueShift: rng(),
        lumaScale: 0.65 + rng() * 0.65,
        widthScale: 0.80 + rng() * 0.50
      });
    }
    const totalSlopeGrass = 2940;
    for (let i = 0; i < totalSlopeGrass; i++) {
      const zRaw = i / totalSlopeGrass;
      const zNorm = 0.01 + Math.pow(zRaw, 1.46) * 0.99;
      let xNorm;
      if (rng() < 0.36) {
        xNorm = 0.52 + (rng() - 0.5) * (0.52 + zNorm * 0.48);
      } else {
        xNorm = -0.06 + rng() * 1.12;
      }
      grassBlades.push({
        xNorm,
        zNorm,
        heightScale: 0.68 + rng() * 0.68,
        leanBase: -0.16 + (rng() - 0.48) * 0.52,
        windPhase: xNorm * 9.5 + zNorm * 4.2 + rng() * 1.5,
        hueShift: rng(),
        lumaScale: 0.62 + rng() * 0.68,
        widthScale: 0.75 + rng() * 0.55
      });
    }

    // Crisp blue-cyan ritual rune glyphs nestled into the ground around the monolith bases (frame_038, frame_039)
    const groundRunes = [
      { x: 0.368, y: 0.768, w: 0.0042, phase: 0.2 },
      { x: 0.376, y: 0.771, w: 0.0050, phase: 1.1 },
      { x: 0.385, y: 0.769, w: 0.0038, phase: 2.3 },
      { x: 0.394, y: 0.772, w: 0.0046, phase: 3.4 },
      { x: 0.403, y: 0.768, w: 0.0040, phase: 4.0 },
      { x: 0.412, y: 0.770, w: 0.0036, phase: 5.1 },
      { x: 0.522, y: 0.756, w: 0.0040, phase: 1.7 },
      { x: 0.535, y: 0.758, w: 0.0045, phase: 2.9 },
      { x: 0.548, y: 0.755, w: 0.0038, phase: 4.4 }
    ];

    assets = {
      vortexCanvasA,
      vortexCanvasB,
      cloudCanvas,
      mistSprite,
      skySparks,
      embers,
      mistPuffs,
      grassBlades,
      groundRunes
    };
    return assets;
  }

  // Helper: Hilltop terrain elevation curve yNorm(xNorm, zNorm)
  function getHillY(xNorm, zNorm, pushOffset) {
    const dx = xNorm - 0.51;
    const crestArch =
      0.746 +
      dx * dx * 0.22 +
      (xNorm < 0.36 ? Math.pow(0.36 - xNorm, 2) * 0.15 : 0);
    return crestArch - pushOffset * 0.012 + zNorm * (1.05 - crestArch + 0.04);
  }

  // Helper: Draw a craggy, weathered 3D stone monolith pillar
  function drawStoneMonolith(ctx, w, h, spec, vortexGlow, anchorGlow) {
    const xL = spec.x * w;
    const xR = (spec.x + spec.w) * w;
    const yT = spec.yTop * h;
    const yB = spec.yBot * h;
    const bevelH = (spec.bevel || 0.014) * h;
    const sideW = (spec.sideW || 0.010) * w;
    const taper = (spec.taper || 0.003) * w;

    ctx.save();

    const frontGrad = ctx.createLinearGradient(xL, yT, xR, yB);
    const baseLuma = spec.baseLuma || 9;
    const mistLift = spec.mistLift || 0;
    const topWarmth = (vortexGlow * 0.25 + anchorGlow * 0.55) * (spec.warmTop || 0.4);

    const rTop = Math.round(baseLuma + mistLift * 28 + topWarmth * 24);
    const gTop = Math.round(baseLuma + 1 + mistLift * 29 + topWarmth * 11);
    const bTop = Math.round(baseLuma + 2 + mistLift * 31 + topWarmth * 5);

    const rMid = Math.round(baseLuma * 0.72 + mistLift * 24);
    const gMid = Math.round((baseLuma + 1) * 0.72 + mistLift * 25);
    const bMid = Math.round((baseLuma + 2) * 0.72 + mistLift * 27);

    frontGrad.addColorStop(0, `rgb(${rTop},${gTop},${bTop})`);
    frontGrad.addColorStop(0.5, `rgb(${rMid},${gMid},${bMid})`);
    frontGrad.addColorStop(1, '#040507');

    ctx.fillStyle = frontGrad;
    ctx.beginPath();
    ctx.moveTo(xL + taper, yT + bevelH * 0.45);
    ctx.lineTo(xL + (spec.w * 0.28) * w, yT);
    ctx.lineTo(xR - (spec.w * 0.22) * w, yT + bevelH * 0.18);
    ctx.lineTo(xR - taper * 0.5, yT + bevelH * 0.6);
    ctx.lineTo(xR, yB);
    ctx.lineTo(xL, yB);
    ctx.closePath();
    ctx.fill();

    if (spec.showTexture && mistLift > 0.05) {
      ctx.save();
      ctx.clip();
      const texGrad = ctx.createLinearGradient(xL, yT, xR, yT + (yB - yT) * 0.7);
      texGrad.addColorStop(0, `rgba(170, 175, 182, ${mistLift * 0.12})`);
      texGrad.addColorStop(0.5, 'rgba(30, 32, 36, 0.08)');
      texGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = texGrad;
      ctx.fillRect(xL, yT, xR - xL, yB - yT);
      ctx.restore();
    }

    if (spec.innerSide === 'right') {
      const innerGrad = ctx.createLinearGradient(xR, yT, xR + sideW, yB);
      const fire = clamp(vortexGlow * 0.22 + anchorGlow * 0.78, 0, 1) * (spec.innerGlowScale || 0.45);
      innerGrad.addColorStop(0, `rgb(${Math.round(14 + fire * 135)},${Math.round(10 + fire * 42)},${Math.round(10 + fire * 10)})`);
      innerGrad.addColorStop(0.55, `rgb(${Math.round(10 + fire * 65)},${Math.round(8 + fire * 18)},8)`);
      innerGrad.addColorStop(1, '#050608');
      ctx.fillStyle = innerGrad;
      ctx.beginPath();
      ctx.moveTo(xR - taper * 0.5, yT + bevelH * 0.6);
      ctx.lineTo(xR + sideW, yT + bevelH * 1.05);
      ctx.lineTo(xR + sideW * 0.65, yB);
      ctx.lineTo(xR, yB);
      ctx.closePath();
      ctx.fill();
    } else if (spec.innerSide === 'left') {
      const innerGrad = ctx.createLinearGradient(xL - sideW, yT, xL, yB);
      const fire = clamp(vortexGlow * 0.22 + anchorGlow * 0.75, 0, 1) * (spec.innerGlowScale || 0.45);
      innerGrad.addColorStop(0, `rgb(${Math.round(14 + fire * 120)},${Math.round(10 + fire * 36)},${Math.round(10 + fire * 8)})`);
      innerGrad.addColorStop(0.55, `rgb(${Math.round(10 + fire * 55)},${Math.round(8 + fire * 15)},8)`);
      innerGrad.addColorStop(1, '#050608');
      ctx.fillStyle = innerGrad;
      ctx.beginPath();
      ctx.moveTo(xL + taper, yT + bevelH * 0.45);
      ctx.lineTo(xL - sideW, yT + bevelH * 0.9);
      ctx.lineTo(xL - sideW * 0.65, yB);
      ctx.lineTo(xL, yB);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }

  // Helper: Draw a heavy, solid 3D spiked dark-iron Daedric chain cable
  function drawSpikedDaedricChain(ctx, x1, y1, x2, y2, numLinks, linkWidth, fireGlow, progress = 1.0) {
    if (progress <= 0.01) return;
    const ex = lerp(x1, x2, progress);
    const ey = lerp(y1, y2, progress);
    const dx = ex - x1;
    const dy = ey - y1;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    const nx = -uy;
    const ny = ux;

    ctx.save();

    ctx.strokeStyle = '#0e0706';
    ctx.lineWidth = linkWidth * 0.72;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(ex, ey);
    ctx.stroke();

    const activeLinks = Math.max(1, Math.floor(numLinks * progress));
    for (let i = 0; i < activeLinks; i++) {
      const f0 = i / numLinks;
      const fMid = (i + 0.5) / numLinks;
      const cx = x1 + dx * (fMid / progress);
      const cy = y1 + dy * (fMid / progress);
      const segLen = (len / activeLinks) * 0.68;
      const scale = lerp(0.52, 1.16, f0);
      const wHalf = linkWidth * 0.55 * scale;
      const hHalf = segLen * 0.54;

      ctx.fillStyle = i % 2 === 0 ? '#120807' : '#1b0c09';
      ctx.beginPath();
      ctx.moveTo(cx - ux * hHalf + nx * wHalf * 0.55, cy - uy * hHalf + ny * wHalf * 0.55);
      ctx.lineTo(cx - ux * hHalf * 0.15 + nx * wHalf * 1.35, cy - uy * hHalf * 0.15 + ny * wHalf * 1.35);
      ctx.lineTo(cx + ux * hHalf + nx * wHalf * 0.5, cy + uy * hHalf + ny * wHalf * 0.5);
      ctx.lineTo(cx + ux * hHalf - nx * wHalf * 0.5, cy + uy * hHalf - ny * wHalf * 0.5);
      ctx.lineTo(cx - ux * hHalf * 0.15 - nx * wHalf * 1.35, cy - uy * hHalf * 0.15 - ny * wHalf * 1.35);
      ctx.lineTo(cx - ux * hHalf - nx * wHalf * 0.55, cy - uy * hHalf - ny * wHalf * 0.55);
      ctx.closePath();
      ctx.fill();

      const rim = clamp((1.0 - f0 * 0.5) * 0.65 + fireGlow * 0.5, 0.2, 1.0);
      ctx.strokeStyle = `rgba(${Math.round(165 + rim * 85)}, ${Math.round(35 + rim * 48)}, ${Math.round(10 + rim * 14)}, ${0.38 + rim * 0.42})`;
      ctx.lineWidth = Math.max(0.8, 1.15 * scale);
      ctx.beginPath();
      ctx.moveTo(cx - ux * hHalf + nx * wHalf * 0.55, cy - uy * hHalf + ny * wHalf * 0.55);
      ctx.lineTo(cx - ux * hHalf * 0.15 + nx * wHalf * 1.35, cy - uy * hHalf * 0.15 + ny * wHalf * 1.35);
      ctx.moveTo(cx - ux * hHalf - nx * wHalf * 0.55, cy - uy * hHalf - ny * wHalf * 0.55);
      ctx.lineTo(cx - ux * hHalf * 0.15 - nx * wHalf * 1.35, cy - uy * hHalf * 0.15 - ny * wHalf * 1.35);
      ctx.stroke();
    }

    ctx.restore();
  }

  // Helper: Draw curved interlocking 3D Daedric anchor rings at the base of the Dolmen chamber (matching frame_038, frame_039)
  function drawLowerCurvedAnchorChains(ctx, w, h, fireGlow) {
    ctx.save();
    const links = [
      { x: 0.558, y: 0.575, rx: 0.008, ry: 0.022, rot: -0.25 },
      { x: 0.566, y: 0.615, rx: 0.009, ry: 0.024, rot: 0.20 },
      { x: 0.572, y: 0.658, rx: 0.010, ry: 0.026, rot: -0.22 },
      { x: 0.578, y: 0.702, rx: 0.011, ry: 0.028, rot: 0.18 },
      { x: 0.582, y: 0.745, rx: 0.011, ry: 0.026, rot: -0.15 },
      { x: 0.560, y: 0.728, rx: 0.009, ry: 0.022, rot: -0.35 }
    ];
    for (let i = 0; i < links.length; i++) {
      const l = links[i];
      ctx.save();
      ctx.translate(l.x * w, l.y * h);
      ctx.rotate(l.rot);
      // Dark cold-iron body
      ctx.strokeStyle = '#120807';
      ctx.lineWidth = w * 0.0065;
      ctx.beginPath();
      ctx.ellipse(0, 0, l.rx * w, l.ry * h, 0, 0, Math.PI * 2);
      ctx.stroke();
      // Warm crimson-orange molten rim reflection
      ctx.strokeStyle = `rgba(${Math.round(165 + fireGlow * 80)}, ${Math.round(38 + fireGlow * 42)}, 14, ${0.42 + fireGlow * 0.42})`;
      ctx.lineWidth = w * 0.0024;
      ctx.beginPath();
      ctx.ellipse(-w * 0.001, -h * 0.001, l.rx * w, l.ry * h, 0, -Math.PI * 0.75, Math.PI * 0.55);
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }

  // Main Render Function
  function drawESO(ctx, w, h, t) {
    const A = ensureAssets();

    // 8.0-second cycle matching reference frames 036..040
    const localT = ((t % 8.0) + 8.0) % 8.0;

    const pushProg = smoothstep(0.0, 8.0, localT);
    const dropProg = smoothstep(2.10, 2.40, localT);
    const isAnchored = localT >= 2.36 ? smoothstep(2.36, 2.55, localT) : 0.0;

    const runeIgnite = smoothstep(3.05, 3.85, localT);
    const blueSparkIgnite = smoothstep(4.25, 4.95, localT);

    const mistIn = smoothstep(2.18, 2.52, localT);
    const mistOut = 1.0 - smoothstep(3.15, 5.35, localT) * 0.93;
    const mistAlpha = mistIn * mistOut;

    let shakeX = 0;
    let shakeY = 0;
    if (localT > 2.32 && localT < 3.60) {
      const dt = localT - 2.32;
      const env = Math.exp(-dt * 4.2) * smoothstep(2.32, 2.40, localT);
      shakeX = Math.sin(dt * 54.0) * 0.0045 * w * env;
      shakeY = Math.cos(dt * 68.0) * 0.0065 * h * env;
    }

    ctx.save();

    const camZoom = 1.0 + pushProg * 0.065;
    const focusX = w * 0.51 + shakeX;
    const focusY = h * 0.56 + shakeY;
    ctx.translate(w * 0.5, h * 0.5);
    ctx.scale(camZoom, camZoom);
    ctx.translate(-focusX, -focusY);

    // =========================================================================
    // 1. DEEP NIGHT SKY & DRIFTING STREAKED STORM CLOUDS
    // =========================================================================
    const skyGrad = ctx.createLinearGradient(0, -h * 0.08, 0, h * 0.78);
    skyGrad.addColorStop(0.0, '#03050a');
    skyGrad.addColorStop(0.35, '#060911');
    skyGrad.addColorStop(0.70, '#0c121e');
    skyGrad.addColorStop(1.0, '#171f2e');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(-w * 0.1, -h * 0.1, w * 1.2, h * 0.9);

    const cloudShift = ((t * 12.0) % w + w) % w;
    ctx.save();
    ctx.globalAlpha = 0.92;
    ctx.drawImage(A.cloudCanvas, -cloudShift, -h * 0.04, w * 1.15, h * 0.82);
    ctx.drawImage(A.cloudCanvas, w * 1.15 - cloudShift, -h * 0.04, w * 1.15, h * 0.82);
    ctx.restore();

    // Distant stars & faint sky specks
    for (const sp of A.skySparks) {
      const sx = sp.x * w;
      const sy = sp.y * h;
      const tw = 0.35 + 0.65 * Math.sin(t * sp.twinkleSpeed + sp.phase);
      ctx.fillStyle = sp.isWarm
        ? `rgba(255, 175, 110, ${tw * 0.52})`
        : `rgba(195, 215, 245, ${tw * 0.45})`;
      ctx.beginPath();
      ctx.arc(sx, sy, sp.size, 0, Math.PI * 2);
      ctx.fill();
    }

    // =========================================================================
    // 2. THE FIERY ORANGE/RED PLANAR VORTEX OF COLDHARBOUR
    // =========================================================================
    const vx = w * 0.502;
    const vy = h * 0.072;
    const vRadius = Math.min(w * 0.225, h * 0.345);

    const outerBloom = ctx.createRadialGradient(vx, vy, vRadius * 0.12, vx, vy, vRadius * 1.50);
    const pulse = 0.94 + 0.06 * Math.sin(t * 3.2) + isAnchored * 0.08;
    outerBloom.addColorStop(0.0, `rgba(180, 52, 16, ${0.38 * pulse})`);
    outerBloom.addColorStop(0.46, `rgba(230, 68, 14, ${0.36 * pulse})`);
    outerBloom.addColorStop(0.75, `rgba(125, 26, 8, ${0.15 * pulse})`);
    outerBloom.addColorStop(1.0, 'rgba(20, 6, 4, 0)');
    ctx.fillStyle = outerBloom;
    ctx.beginPath();
    ctx.arc(vx, vy, vRadius * 1.50, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.translate(vx, vy);
    ctx.scale(1.06, 0.96);
    ctx.rotate(-t * 0.38);
    ctx.drawImage(A.vortexCanvasA, -vRadius, -vRadius, vRadius * 2.0, vRadius * 2.0);
    ctx.restore();

    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = 0.72 + 0.18 * Math.sin(t * 2.4);
    ctx.translate(vx, vy);
    ctx.scale(1.04, 0.94);
    ctx.rotate(-t * 0.64 + 1.2);
    ctx.drawImage(A.vortexCanvasB, -vRadius * 0.96, -vRadius * 0.96, vRadius * 1.92, vRadius * 1.92);
    ctx.restore();

    // =========================================================================
    // 3. DISTANT MOUNTAIN RIDGES & RIGHT CRAG SILHOUETTE
    // =========================================================================
    ctx.save();
    const mtnGrad = ctx.createLinearGradient(0, h * 0.40, 0, h * 0.78);
    mtnGrad.addColorStop(0.0, '#060608');
    mtnGrad.addColorStop(0.45, '#040507');
    mtnGrad.addColorStop(1.0, '#020304');
    ctx.fillStyle = mtnGrad;

    ctx.beginPath();
    ctx.moveTo(-w * 0.08, h * 0.82);
    ctx.lineTo(-w * 0.08, h * 0.435);
    ctx.quadraticCurveTo(w * 0.035, h * 0.412, w * 0.095, h * 0.452);
    ctx.quadraticCurveTo(w * 0.135, h * 0.478, w * 0.165, h * 0.468);
    ctx.quadraticCurveTo(w * 0.225, h * 0.435, w * 0.285, h * 0.462);
    ctx.quadraticCurveTo(w * 0.322, h * 0.486, w * 0.345, h * 0.482);
    ctx.quadraticCurveTo(w * 0.382, h * 0.458, w * 0.435, h * 0.495);
    ctx.lineTo(w * 0.485, h * 0.555);
    ctx.lineTo(w * 0.515, h * 0.568);
    ctx.lineTo(w * 0.548, h * 0.566);
    ctx.lineTo(w * 0.578, h * 0.535);
    ctx.quadraticCurveTo(w * 0.685, h * 0.598, w * 0.735, h * 0.625);
    ctx.quadraticCurveTo(w * 0.762, h * 0.642, w * 0.785, h * 0.635);
    ctx.lineTo(w * 0.818, h * 0.618);
    ctx.lineTo(w * 0.829, h * 0.736);
    ctx.lineTo(w * 1.08, h * 0.738);
    ctx.lineTo(w * 1.08, h * 0.84);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // =========================================================================
    // 4. DOLMEN BACK MONOLITHS, LINTEL ARCH & DAEDRIC DARK ANCHOR SPIRE
    // =========================================================================
    const vortexGlow = 0.65 + 0.15 * Math.sin(t * 2.8);
    const anchorGlow = isAnchored * (0.45 + 0.55 * runeIgnite);

    // 4A. Left outer & recessed Dolmen stone monoliths
    drawStoneMonolith(ctx, w, h, {
      x: 0.300,
      w: 0.048,
      yTop: 0.575,
      yBot: 0.778,
      bevel: 0.012,
      sideW: 0.006,
      baseLuma: 6,
      mistLift: mistAlpha * 0.32,
      warmTop: 0.15,
      innerSide: 'right',
      innerGlowScale: 0.12
    }, vortexGlow, anchorGlow);

    drawStoneMonolith(ctx, w, h, {
      x: 0.360,
      w: 0.056,
      yTop: 0.525,
      yBot: 0.775,
      bevel: 0.014,
      sideW: 0.007,
      baseLuma: 8,
      mistLift: mistAlpha * 0.42,
      warmTop: 0.22,
      innerSide: 'right',
      innerGlowScale: 0.18
    }, vortexGlow, anchorGlow);

    drawStoneMonolith(ctx, w, h, {
      x: 0.646,
      w: 0.050,
      yTop: 0.532,
      yBot: 0.782,
      bevel: 0.014,
      sideW: 0.007,
      baseLuma: 7,
      mistLift: mistAlpha * 0.38,
      warmTop: 0.20,
      innerSide: 'left',
      innerGlowScale: 0.15
    }, vortexGlow, anchorGlow);

    // Inner supporting arch jamb pillars that physically hold up the horizontal stone lintel (zero floating gap!)
    ctx.fillStyle = '#07080b';
    ctx.fillRect(w * 0.478, h * 0.486, w * 0.028, h * 0.28);
    ctx.fillRect(w * 0.576, h * 0.486, w * 0.048, h * 0.28);

    // Central recessed altar wall inside the Dolmen chamber (below the open archway gap)
    ctx.fillStyle = '#06070a';
    ctx.beginPath();
    ctx.moveTo(w * 0.495, h * 0.552);
    ctx.lineTo(w * 0.532, h * 0.566);
    ctx.lineTo(w * 0.555, h * 0.554);
    ctx.lineTo(w * 0.585, h * 0.538);
    ctx.lineTo(w * 0.585, h * 0.768);
    ctx.lineTo(w * 0.495, h * 0.768);
    ctx.closePath();
    ctx.fill();

    const chamberGlow = ctx.createRadialGradient(
      w * 0.535, h * 0.60, w * 0.005,
      w * 0.535, h * 0.62, w * 0.085
    );
    const chInt = 0.20 + isAnchored * 0.50;
    chamberGlow.addColorStop(0.0, `rgba(245, 88, 18, ${chInt})`);
    chamberGlow.addColorStop(0.55, `rgba(165, 38, 8, ${chInt * 0.52})`);
    chamberGlow.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = chamberGlow;
    ctx.fillRect(w * 0.45, h * 0.46, w * 0.18, h * 0.32);

    // 4B. HORIZONTAL STONE LINTEL ARCH SPANNING THE CENTRAL DOLMEN PILLARS
    ctx.save();
    const lintelX1 = w * 0.476;
    const lintelX2 = w * 0.634;
    const lintelY1 = h * 0.448;
    const lintelY2 = h * 0.500;

    ctx.fillStyle = '#08090c';
    ctx.beginPath();
    ctx.moveTo(lintelX1, lintelY1 + h * 0.006);
    ctx.lineTo(lintelX1 + w * 0.02, lintelY1);
    ctx.lineTo(lintelX2 - w * 0.01, lintelY1 + h * 0.004);
    ctx.lineTo(lintelX2, lintelY1 + h * 0.012);
    ctx.lineTo(lintelX2, lintelY2);
    ctx.lineTo(lintelX1, lintelY2 - h * 0.002);
    ctx.closePath();
    ctx.fill();

    // Glowing warm orange underside of the stone lintel
    const underGrad = ctx.createLinearGradient(lintelX1, lintelY2 - h * 0.014, lintelX2, lintelY2);
    const uFire = 0.42 + anchorGlow * 0.58;
    underGrad.addColorStop(0.0, `rgba(140, 38, 8, ${uFire * 0.65})`);
    underGrad.addColorStop(0.45, `rgba(235, 78, 16, ${uFire * 0.85})`);
    underGrad.addColorStop(0.85, `rgba(165, 45, 10, ${uFire * 0.6})`);
    underGrad.addColorStop(1.0, 'rgba(30, 10, 5, 0)');
    ctx.fillStyle = underGrad;
    ctx.beginPath();
    ctx.moveTo(lintelX1 + w * 0.012, lintelY2 - h * 0.011);
    ctx.lineTo(lintelX2 - w * 0.018, lintelY2 - h * 0.007);
    ctx.lineTo(lintelX2 - w * 0.025, lintelY2 + h * 0.002);
    ctx.lineTo(lintelX1 + w * 0.016, lintelY2 - h * 0.002);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // 4C. THE DAEDRIC DARK ANCHOR SPIRE, 4 SPIKED CHAINS, TORUS RING & CONICAL PINION
    if (dropProg > 0.005) {
      const apexX = w * 0.501;
      const apexY = h * 0.168;
      const dropSlideY = (1.0 - dropProg) * (-h * 0.42);

      ctx.save();
      ctx.translate(0, dropSlideY);

      const chainTargets = [
        { x1: apexX - w * 0.003, y1: apexY + h * 0.015, x2: w * 0.460, y2: h * 0.495, links: 22, width: w * 0.0082 },
        { x1: apexX + w * 0.003, y1: apexY + h * 0.015, x2: w * 0.542, y2: h * 0.495, links: 22, width: w * 0.0082 },
        { x1: apexX - w * 0.002, y1: apexY + h * 0.008, x2: w * 0.474, y2: h * 0.482, links: 20, width: w * 0.0098 },
        { x1: apexX + w * 0.002, y1: apexY + h * 0.008, x2: w * 0.526, y2: h * 0.482, links: 20, width: w * 0.0098 }
      ];

      drawSpikedDaedricChain(ctx, chainTargets[0].x1, chainTargets[0].y1, chainTargets[0].x2, chainTargets[0].y2, chainTargets[0].links, chainTargets[0].width, anchorGlow, 1.0);
      drawSpikedDaedricChain(ctx, chainTargets[1].x1, chainTargets[1].y1, chainTargets[1].x2, chainTargets[1].y2, chainTargets[1].links, chainTargets[1].width, anchorGlow, 1.0);

      // Central dark-iron vertical spine rod inside the upper chain pyramid
      ctx.strokeStyle = '#0e0706';
      ctx.lineWidth = w * 0.0085;
      ctx.beginPath();
      ctx.moveTo(apexX, apexY);
      ctx.lineTo(w * 0.501, h * 0.475);
      ctx.stroke();

      // Central 3D Dark-Iron Torus Ring suspended at y = 0.352 * h (visible in frame_038, frame_039)
      const ringX = w * 0.501;
      const ringY = h * 0.352;
      const ringRX = w * 0.022;
      const ringRY = h * 0.036;
      ctx.save();
      ctx.translate(ringX, ringY);
      ctx.rotate(-0.14);
      ctx.strokeStyle = '#070506';
      ctx.lineWidth = w * 0.011;
      ctx.beginPath();
      ctx.ellipse(0, 0, ringRX, ringRY, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = `rgb(${Math.round(28 + runeIgnite * 26)}, ${Math.round(18 + runeIgnite * 12)}, 18)`;
      ctx.lineWidth = w * 0.0055;
      ctx.beginPath();
      ctx.ellipse(-w * 0.001, -h * 0.001, ringRX, ringRY, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      drawSpikedDaedricChain(ctx, chainTargets[2].x1, chainTargets[2].y1, chainTargets[2].x2, chainTargets[2].y2, chainTargets[2].links, chainTargets[2].width, anchorGlow, 1.0);
      drawSpikedDaedricChain(ctx, chainTargets[3].x1, chainTargets[3].y1, chainTargets[3].x2, chainTargets[3].y2, chainTargets[3].links, chainTargets[3].width, anchorGlow, 1.0);

      // Sharp Gothic Dark-Iron Apex Cap at top of the spire
      ctx.fillStyle = '#0e0706';
      ctx.beginPath();
      ctx.moveTo(apexX, apexY - h * 0.012);
      ctx.lineTo(apexX + w * 0.0085, apexY + h * 0.036);
      ctx.lineTo(apexX, apexY + h * 0.028);
      ctx.lineTo(apexX - w * 0.0085, apexY + h * 0.036);
      ctx.closePath();
      ctx.fill();

      // Blazing Red-Orange Molten Apex Core Jewel (ignites in frame_038, frame_039)
      if (runeIgnite > 0.01) {
        const coreY = apexY + h * 0.024;
        const coreGlow = ctx.createRadialGradient(apexX, coreY, 0, apexX, coreY, w * 0.024);
        coreGlow.addColorStop(0.0, `rgba(255, 240, 200, ${runeIgnite})`);
        coreGlow.addColorStop(0.25, `rgba(255, 95, 20, ${runeIgnite * 0.95})`);
        coreGlow.addColorStop(0.60, `rgba(220, 25, 5, ${runeIgnite * 0.55})`);
        coreGlow.addColorStop(1.0, 'rgba(180, 10, 0, 0)');
        ctx.fillStyle = coreGlow;
        ctx.beginPath();
        ctx.arc(apexX, coreY, w * 0.024, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = `rgba(255, 235, 190, ${runeIgnite})`;
        ctx.beginPath();
        ctx.moveTo(apexX, coreY - h * 0.0065);
        ctx.lineTo(apexX + w * 0.0042, coreY);
        ctx.lineTo(apexX, coreY + h * 0.0065);
        ctx.lineTo(apexX - w * 0.0042, coreY);
        ctx.closePath();
        ctx.fill();
      }

      // Lower curved interlocking Daedric anchor rings snaking down into the right side of the Dolmen floor (frame_037..039)
      drawLowerCurvedAnchorChains(ctx, w, h, 0.5 + anchorGlow * 0.5);

      // Massive Conical / Faceted Dark-Iron Pinion wedged inside the Dolmen Chamber (y = 0.478 * h down to 0.742 * h)
      const coneTopY = h * 0.478;
      const coneBotY = h * 0.742;
      const coneLeftX = w * 0.468;
      const coneRightX = w * 0.562;
      const coneTipX = w * 0.514;

      ctx.fillStyle = '#0b0708';
      ctx.beginPath();
      ctx.moveTo(coneLeftX, coneTopY);
      ctx.lineTo(w * 0.520, coneTopY);
      ctx.lineTo(coneTipX, coneBotY);
      ctx.closePath();
      ctx.fill();

      const coneRightGrad = ctx.createLinearGradient(w * 0.514, coneTopY, coneRightX, coneBotY);
      const cWarm = 0.28 + runeIgnite * 0.72;
      coneRightGrad.addColorStop(0.0, `rgb(${Math.round(44 + cWarm * 115)}, ${Math.round(16 + cWarm * 36)}, 10)`);
      coneRightGrad.addColorStop(0.55, `rgb(${Math.round(30 + cWarm * 72)}, ${Math.round(11 + cWarm * 20)}, 8)`);
      coneRightGrad.addColorStop(1.0, '#100706');
      ctx.fillStyle = coneRightGrad;
      ctx.beginPath();
      ctx.moveTo(w * 0.520, coneTopY);
      ctx.lineTo(coneRightX, coneTopY + h * 0.022);
      ctx.lineTo(coneTipX, coneBotY);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = '#050304';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(w * 0.502, h * 0.568);
      ctx.lineTo(w * 0.552, h * 0.585);
      ctx.stroke();

      // TWO BLAZING MOLTEN ORANGE-GOLD HORIZONTAL ENERGY BANDS wrapping around the upper conical pinion (frame_038, frame_039)
      if (runeIgnite > 0.01) {
        ctx.save();
        const bandBloom = ctx.createRadialGradient(
          w * 0.528, h * 0.515, w * 0.005,
          w * 0.528, h * 0.515, w * 0.072
        );
        bandBloom.addColorStop(0.0, `rgba(255, 120, 22, ${0.72 * runeIgnite})`);
        bandBloom.addColorStop(0.6, `rgba(215, 45, 5, ${0.34 * runeIgnite})`);
        bandBloom.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = bandBloom;
        ctx.beginPath();
        ctx.arc(w * 0.528, h * 0.515, w * 0.072, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowColor = '#ff5500';
        ctx.shadowBlur = 12;
        ctx.lineCap = 'round';

        // Band 1: Upper curved molten ring sweeping from above the left pillar to the right edge of the cone
        ctx.strokeStyle = `rgba(255, 145, 28, ${runeIgnite})`;
        ctx.lineWidth = Math.max(2.6, h * 0.0075);
        ctx.beginPath();
        ctx.moveTo(w * 0.468, h * 0.480);
        ctx.quadraticCurveTo(w * 0.532, h * 0.480, w * 0.555, h * 0.512);
        ctx.stroke();

        ctx.strokeStyle = `rgba(255, 242, 190, ${runeIgnite * 0.95})`;
        ctx.lineWidth = Math.max(1.3, h * 0.0032);
        ctx.beginPath();
        ctx.moveTo(w * 0.470, h * 0.480);
        ctx.quadraticCurveTo(w * 0.532, h * 0.480, w * 0.554, h * 0.510);
        ctx.stroke();

        // Band 2: Lower curved molten ring (split into left dash and right arc, matching frame_039!)
        ctx.strokeStyle = `rgba(255, 140, 25, ${runeIgnite})`;
        ctx.lineWidth = Math.max(2.5, h * 0.0070);
        ctx.beginPath();
        ctx.moveTo(w * 0.506, h * 0.526);
        ctx.lineTo(w * 0.516, h * 0.528);
        ctx.moveTo(w * 0.531, h * 0.532);
        ctx.quadraticCurveTo(w * 0.548, h * 0.538, w * 0.556, h * 0.554);
        ctx.stroke();

        ctx.strokeStyle = `rgba(255, 240, 185, ${runeIgnite * 0.92})`;
        ctx.lineWidth = Math.max(1.2, h * 0.0028);
        ctx.beginPath();
        ctx.moveTo(w * 0.507, h * 0.526);
        ctx.lineTo(w * 0.515, h * 0.528);
        ctx.moveTo(w * 0.532, h * 0.532);
        ctx.quadraticCurveTo(w * 0.548, h * 0.538, w * 0.555, h * 0.552);
        ctx.stroke();

        ctx.restore();
      }

      // Left lower curved red-lit Daedric chain hook peeking out at x = 0.428 * w, y = 0.685 * h (frame_039)
      ctx.strokeStyle = `rgba(145, 36, 15, ${0.42 + anchorGlow * 0.42})`;
      ctx.lineWidth = w * 0.003;
      ctx.beginPath();
      ctx.arc(w * 0.433, h * 0.692, w * 0.010, Math.PI * 0.7, Math.PI * 1.35);
      ctx.stroke();

      ctx.restore();
    }

    // =========================================================================
    // 5. BACK VOLUMETRIC MIST LAYER (Behind the Foreground Stone Monoliths!)
    // =========================================================================
    if (mistAlpha > 0.005) {
      ctx.save();
      const mistTime = Math.max(0, localT - 2.18);
      for (const p of A.mistPuffs) {
        if (p.isFront) continue;
        const px = (p.baseX + p.driftX * mistTime) * w;
        const py = (p.baseY + p.driftY * mistTime) * h;
        const rx = p.radiusX * w * (0.88 + 0.18 * Math.min(1.5, mistTime));
        const ry = p.radiusY * h * (0.88 + 0.15 * Math.min(1.5, mistTime));

        ctx.save();
        ctx.globalAlpha = clamp(mistAlpha * p.alphaScale * 0.95, 0, 1);
        ctx.translate(px, py);
        ctx.rotate(p.rot0 + mistTime * p.rotSpeed);
        ctx.drawImage(A.mistSprite, -rx, -ry, rx * 2, ry * 2);
        ctx.restore();
      }
      ctx.restore();
    }

    // =========================================================================
    // 6. FOREGROUND DOLMEN STONE MONOLITH PILLARS & BLUE-WHITE ARCANE FLARE
    // =========================================================================
    drawStoneMonolith(ctx, w, h, {
      x: 0.436,
      w: 0.064,
      yTop: 0.502,
      yBot: 0.802,
      bevel: 0.015,
      sideW: 0.009,
      baseLuma: 10,
      mistLift: mistAlpha * 0.88,
      warmTop: 0.75,
      innerSide: 'right',
      innerGlowScale: 0.65,
      showTexture: true
    }, vortexGlow, anchorGlow);

    drawStoneMonolith(ctx, w, h, {
      x: 0.588,
      w: 0.064,
      yTop: 0.496,
      yBot: 0.804,
      bevel: 0.015,
      sideW: 0.009,
      baseLuma: 9,
      mistLift: mistAlpha * 0.82,
      warmTop: 0.55,
      innerSide: 'left',
      innerGlowScale: 0.50,
      showTexture: true
    }, vortexGlow, anchorGlow);

    // Blue-White Arcane Discharge Flame atop the Left Foreground Pillar (frame_039)
    if (blueSparkIgnite > 0.01) {
      const spX = w * 0.480;
      const spY = h * 0.478;
      const flicker = 0.88 + 0.12 * Math.sin(t * 24.0);
      const bInt = blueSparkIgnite * flicker;

      ctx.save();
      const bGlow = ctx.createRadialGradient(spX, spY - h * 0.01, 0, spX, spY - h * 0.01, w * 0.025);
      bGlow.addColorStop(0.0, `rgba(220, 240, 255, ${bInt})`);
      bGlow.addColorStop(0.35, `rgba(105, 165, 255, ${bInt * 0.82})`);
      bGlow.addColorStop(0.70, `rgba(65, 90, 220, ${bInt * 0.32})`);
      bGlow.addColorStop(1.0, 'rgba(30, 40, 180, 0)');
      ctx.fillStyle = bGlow;
      ctx.beginPath();
      ctx.arc(spX, spY - h * 0.01, w * 0.025, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = `rgba(245, 250, 255, ${bInt})`;
      ctx.beginPath();
      ctx.moveTo(spX - w * 0.0048, spY + h * 0.002);
      ctx.lineTo(spX + w * 0.0015, spY - h * 0.035 * flicker);
      ctx.lineTo(spX + w * 0.0048, spY + h * 0.002);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // =========================================================================
    // 7. FRONT VOLUMETRIC MIST LAYER (Wrapping in Front of the Monoliths!)
    // =========================================================================
    if (mistAlpha > 0.005) {
      ctx.save();
      const mistTime = Math.max(0, localT - 2.18);
      for (const p of A.mistPuffs) {
        if (!p.isFront) continue;
        const px = (p.baseX + p.driftX * mistTime) * w;
        const py = (p.baseY + p.driftY * mistTime) * h;
        const rx = p.radiusX * w * (0.92 + 0.22 * Math.min(1.6, mistTime));
        const ry = p.radiusY * h * (0.90 + 0.16 * Math.min(1.6, mistTime));

        ctx.save();
        ctx.globalAlpha = clamp(mistAlpha * p.alphaScale * 0.72, 0, 1);
        ctx.translate(px, py);
        ctx.rotate(p.rot0 + mistTime * p.rotSpeed);
        ctx.drawImage(A.mistSprite, -rx, -ry, rx * 2, ry * 2);
        ctx.restore();
      }
      ctx.restore();
    }

    // =========================================================================
    // 8. HILLTOP EARTH BASE, BLUE RITUAL FLOOR RUNES & 3,200 WIND-BLOWN GRASS BLADES
    // =========================================================================
    ctx.fillStyle = '#050703';
    ctx.beginPath();
    ctx.moveTo(-w * 0.08, h * 1.08);
    for (let i = 0; i <= 32; i++) {
      const xn = -0.08 + (i / 32) * 1.16;
      const yn = getHillY(xn, 0.0, pushProg);
      ctx.lineTo(xn * w, yn * h);
    }
    ctx.lineTo(w * 1.08, h * 1.08);
    ctx.closePath();
    ctx.fill();

    ctx.save();
    ctx.lineCap = 'round';

    const drawGrassRange = (startIdx, endIdx) => {
      for (let i = startIdx; i < endIdx; i++) {
        const b = A.grassBlades[i];
        const bx = b.xNorm * w;
        const by = getHillY(b.xNorm, b.zNorm, pushProg) * h;

        const bladeH = lerp(h * 0.024, h * 0.108, b.zNorm) * b.heightScale;
        const windGust =
          Math.sin(t * 2.35 - b.windPhase) * 0.24 +
          Math.cos(t * 4.10 - b.windPhase * 1.6) * 0.09 +
          mistAlpha * (b.xNorm - 0.52) * 0.52;

        const tipDX = (b.leanBase + windGust) * bladeH * 0.65;
        const tipX = bx + tipDX;
        const tipY = by - bladeH;

        const centerDist = Math.abs(b.xNorm - 0.53);
        const hillSpot = clamp(1.0 - Math.pow(centerDist / 0.44, 1.85), 0.08, 1.0);
        const dolmenProximity = Math.exp(-Math.pow((b.xNorm - 0.53) / 0.10, 2.0)) * (1.0 - b.zNorm * 0.85);
        const fireBounce = dolmenProximity * (0.25 + anchorGlow * 0.68);

        const luma = hillSpot * b.lumaScale * (1.0 - b.zNorm * 0.22);
        const rTip = Math.round(clamp(16 + luma * 78 + fireBounce * 105 + b.hueShift * 12, 8, 205));
        const gTip = Math.round(clamp(22 + luma * 84 + fireBounce * 34 + b.hueShift * 10, 12, 168));
        const bTip = Math.round(clamp(10 + luma * 32 + fireBounce * 10, 5, 80));

        ctx.strokeStyle = `rgb(${rTip},${gTip},${bTip})`;
        ctx.lineWidth = lerp(0.65, 1.60, b.zNorm) * b.widthScale;

        ctx.beginPath();
        ctx.moveTo(bx, by + bladeH * 0.12);
        ctx.quadraticCurveTo(bx + tipDX * 0.35, by - bladeH * 0.48, tipX, tipY);
        ctx.stroke();
      }
    };

    const splitIdx = Math.floor(A.grassBlades.length * 0.22);
    drawGrassRange(0, splitIdx);

    // Crisp glowing cyan-blue Daedric ritual rune glyphs nestled among the hilltop grass (frame_038, frame_039)
    const runeVis = smoothstep(0.6, 3.2, localT);
    if (runeVis > 0.02) {
      for (const gr of A.groundRunes) {
        const gx = gr.x * w;
        const gy = (gr.y - pushProg * 0.008) * h;
        const rw = gr.w * w;
        const tw = (0.65 + 0.35 * Math.sin(t * 4.5 + gr.phase)) * runeVis;

        const rGlow = ctx.createRadialGradient(gx, gy, 0, gx, gy, rw * 2.0);
        rGlow.addColorStop(0.0, `rgba(160, 240, 255, ${0.72 * tw})`);
        rGlow.addColorStop(0.5, `rgba(45, 185, 255, ${0.32 * tw})`);
        rGlow.addColorStop(1.0, 'rgba(0, 110, 210, 0)');
        ctx.fillStyle = rGlow;
        ctx.beginPath();
        ctx.ellipse(gx, gy, rw * 2.0, rw * 0.65, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = `rgba(220, 252, 255, ${0.88 * tw})`;
        ctx.lineWidth = 1.05;
        ctx.beginPath();
        ctx.moveTo(gx - rw * 0.55, gy);
        ctx.lineTo(gx + rw * 0.55, gy);
        ctx.moveTo(gx, gy - rw * 0.22);
        ctx.lineTo(gx, gy + rw * 0.22);
        ctx.stroke();
      }
    }

    drawGrassRange(splitIdx, A.grassBlades.length);
    ctx.restore();

    // =========================================================================
    // 9. RISING COLDHARBOUR EMBERS & ARCANE SPARKS
    // =========================================================================
    ctx.save();
    const emberCount = isAnchored > 0.1 ? A.embers.length : Math.floor(A.embers.length * 0.45);
    for (let i = 0; i < emberCount; i++) {
      const e = A.embers[i];
      const prog = ((e.yOffset - t * e.speed) % 1.0 + 1.0) % 1.0;
      const ey = lerp(h * 0.06, h * 0.76, prog);
      const converge = lerp(0.45, 1.0, prog);
      const ex =
        w * 0.51 +
        e.xSpread * w * converge +
        Math.sin(t * e.wobbleFreq + e.phase) * w * e.wobbleAmp;

      const fade = Math.sin(prog * Math.PI);
      if (fade <= 0.05) continue;

      if (e.isCyan) {
        ctx.fillStyle = `rgba(145, 225, 255, ${fade * 0.75})`;
      } else {
        ctx.fillStyle = `rgba(255, ${Math.round(110 + prog * 95)}, 45, ${fade * (0.62 + isAnchored * 0.35)})`;
      }
      ctx.beginPath();
      ctx.arc(ex, ey, e.size * (0.7 + 0.4 * fade), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    ctx.restore();

    // Subtle atmospheric night vignette around the frame edges
    const vig = ctx.createRadialGradient(
      w * 0.5, h * 0.46, Math.min(w, h) * 0.38,
      w * 0.5, h * 0.50, Math.max(w, h) * 0.78
    );
    vig.addColorStop(0.0, 'rgba(0, 0, 0, 0)');
    vig.addColorStop(1.0, 'rgba(0, 0, 0, 0.42)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, w, h);
  }

  // Register in both window.GAMES[8] (per technical contract) and window.GameAnimations.game9
  window.GAMES[8] = {
    title: 'The Elder Scrolls Online',
    year: '2014',
    draw: drawESO
  };
  window.GameAnimations.game9 = drawESO;
})();
