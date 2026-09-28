// ============================================================================
// GAME 5: STARCRAFT (1998) — Brood War / Char Volcanic Plateau Night Ops & Nuke
// ============================================================================
// Choreography (8.0s loop):
//   0.0s – 2.6s: Illuminated Terran Base at night on a Char volcanic plateau.
//                Central domed Command Center with yellow/black hazard stripes
//                & glowing blue/amber viewports, two clusters of 3 cylindrical
//                Supply Depots with glowing orange furnace vents, Factory &
//                Barracks with cyan bay lights, circular Starport pad with
//                yellow '+' cross, green perimeter lights & bright blue
//                spotlight, plus active Marines, SCVs welding with blue sparks,
//                and a deployed Siege Tank in Siege Mode.
//                At t = 1.0s, a pulsing bright red Ghost Nuclear Target laser
//                dot locks onto the Command Center.
//   2.6s – 3.8s: The Terran Tactical Nuke streaks down from the top of the
//                screen as a searing white-orange vertical plasma beam/trail
//                slamming straight into the Command Center.
//   3.8s – 6.2s: NUCLEAR DETONATION! Blinding white-gold flash, violent camera
//                shake, expanding spherical shockwave & ground dust wave,
//                flying burning debris, and a towering volumetric nuclear
//                mushroom cloud rising above the molten ember crater.
//   6.2s – 8.0s: Smoke clears to reveal the devastated ruins—a glowing
//                molten ember crater, burning perimeter wreckage, and drifting
//                mushroom cloud & ash where the Terran base stood.
// ============================================================================

window.GAMES = window.GAMES || [];

(function () {
  // Fast deterministic PRNG
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function hash2D(ix, iy) {
    let n = Math.imul(ix, 374761393) + Math.imul(iy, 668265263);
    n = (n ^ (n >>> 13)) >>> 0;
    n = Math.imul(n, 1274126177) >>> 0;
    return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
  }

  function valueNoise(x, y) {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    const fx = x - ix;
    const fy = y - iy;
    const u = fx * fx * (3 - 2 * fx);
    const v = fy * fy * (3 - 2 * fy);
    const a = hash2D(ix, iy);
    const b = hash2D(ix + 1, iy);
    const c = hash2D(ix, iy + 1);
    const d = hash2D(ix + 1, iy + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }

  function fbm(x, y, octaves) {
    let val = 0;
    let amp = 0.5;
    let freq = 1.0;
    for (let i = 0; i < octaves; i++) {
      val += amp * valueNoise(x * freq, y * freq);
      freq *= 2.07;
      amp *= 0.5;
    }
    return val;
  }

  function clamp(v, lo, hi) {
    return v < lo ? lo : v > hi ? hi : v;
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function smoothstep(edge0, edge1, x) {
    const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
    return t * t * (3 - 2 * t);
  }

  // Pre-generated deterministic particle tables
  const rng = mulberry32(19981130);

  // Crater glowing embers (matches frame_020 & frame_021)
  const CRATER_EMBERS = [];
  for (let i = 0; i < 98; i++) {
    const angle = rng() * Math.PI * 2;
    const r = Math.pow(rng(), 0.60);
    const rx = 0.202;
    const ry = 0.132;
    CRATER_EMBERS.push({
      dx: Math.cos(angle) * r * rx,
      dy: Math.sin(angle) * r * ry,
      dist: r,
      size: 2.3 + rng() * 2.6,
      phase: rng() * Math.PI * 2,
      speed: 2.5 + rng() * 5.0,
      heat: 0.5 + rng() * 0.5,
    });
  }

  // Flying ballistic debris during explosion (3.8s – 5.8s)
  const DEBRIS_PARTICLES = [];
  for (let i = 0; i < 76; i++) {
    const angle = rng() * Math.PI * 2;
    const speed = 0.14 + rng() * 0.38;
    DEBRIS_PARTICLES.push({
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed * 0.65 - (0.14 + rng() * 0.28),
      gravity: 0.34 + rng() * 0.25,
      size: 2.2 + rng() * 4.8,
      rotSpeed: (rng() - 0.5) * 14,
      life: 0.7 + rng() * 1.35,
      isFiery: rng() > 0.22,
    });
  }

  // Volumetric mushroom cloud puff geometry
  const MUSHROOM_CAP_PUFFS = [];
  const capRings = [
    // Under-cap ring (catches strong orange crater light in frame_020)
    { yOff: 0.052, rRing: 0.088, count: 16, rad: 0.044, layer: 0 },
    // Outer lower equator
    { yOff: 0.020, rRing: 0.122, count: 20, rad: 0.050, layer: 1 },
    // Main wide billowy equator
    { yOff: -0.014, rRing: 0.132, count: 22, rad: 0.055, layer: 2 },
    // Upper shoulder ring
    { yOff: -0.050, rRing: 0.100, count: 18, rad: 0.048, layer: 3 },
    // Top toroidal crown
    { yOff: -0.076, rRing: 0.058, count: 14, rad: 0.040, layer: 4 },
  ];
  for (let rIdx = 0; rIdx < capRings.length; rIdx++) {
    const ring = capRings[rIdx];
    for (let i = 0; i < ring.count; i++) {
      const a = (i / ring.count) * Math.PI * 2 + rIdx * 0.42;
      const jitterX = (rng() - 0.5) * 0.018;
      const jitterY = (rng() - 0.5) * 0.014;
      MUSHROOM_CAP_PUFFS.push({
        angle: a,
        nx: Math.cos(a) * ring.rRing + jitterX,
        ny: Math.sin(a) * (ring.rRing * 0.44) + ring.yOff + jitterY,
        depth: Math.sin(a), // -1 back, +1 front
        rad: ring.rad * (0.86 + rng() * 0.30),
        layer: ring.layer,
        seed: rng() * Math.PI * 2,
      });
    }
  }
  MUSHROOM_CAP_PUFFS.sort((a, b) => a.depth - b.depth || a.layer - b.layer);

  // Mushroom stem puffs
  const STEM_PUFFS = [];
  for (let i = 0; i < 24; i++) {
    const frac = i / 23;
    STEM_PUFFS.push({
      frac,
      dx: (rng() - 0.5) * 0.042 * (1 - frac * 0.35),
      rad: 0.028 + (1 - frac * 0.3) * 0.022 + rng() * 0.01,
      seed: rng() * 6.28,
    });
  }

  // Rolling ground dust shockwave puffs (visible in frame_020)
  const DUST_WAVE_PUFFS = [];
  for (let i = 0; i < 44; i++) {
    const a = (i / 44) * Math.PI * 2 + (rng() - 0.5) * 0.12;
    DUST_WAVE_PUFFS.push({
      angle: a,
      cos: Math.cos(a),
      sin: Math.sin(a),
      rad: 0.038 + rng() * 0.045,
      heightOff: (rng() - 0.5) * 0.02,
      alphaScale: 0.6 + rng() * 0.4,
    });
  }

  // Drifting ash particles (post-detonation)
  const ASH_PARTICLES = [];
  for (let i = 0; i < 65; i++) {
    ASH_PARTICLES.push({
      x: rng(),
      y: rng(),
      vx: -0.015 + rng() * 0.03,
      vy: 0.02 + rng() * 0.04,
      size: 1.0 + rng() * 2.0,
      phase: rng() * 6.28,
      isEmber: rng() > 0.6,
    });
  }

  // Cached offscreen volcanic plateau & lava cliff canvas
  let cachedTerrain = null;
  let cachedW = 0;
  let cachedH = 0;

  function isLavaRegion(nx, ny) {
    if (ny > 0.34) return false;

    const warp = (fbm(nx * 18 + 2.3, ny * 24 + 1.7, 2) - 0.5) * 0.032;

    // Main lower cliff edge separating elevated plateau from the lava lake
    let mainCliffY =
      0.308 +
      0.015 * Math.sin(nx * 15.0 + 0.8) +
      0.009 * Math.cos(nx * 37.0) +
      warp * 0.65;
    if (nx > 0.55) {
      mainCliffY -= (nx - 0.55) * 0.14;
    }
    if (ny > mainCliffY) return false;

    // Left dark volcanic headland / cliff wall
    let leftEdge =
      0.368 +
      (0.26 - ny) * 0.09 +
      0.022 * Math.sin(ny * 25.0 + 0.5) +
      warp;

    // Upper-left overhanging peninsula jutting right at the top (frame_018)
    if (ny < 0.115) {
      const tPen = smoothstep(0.0, 0.115, 0.115 - ny);
      const penEdge =
        0.38 +
        tPen * 0.21 +
        0.028 * Math.sin(ny * 65.0) +
        warp * 0.8;
      leftEdge = Math.max(leftEdge, penEdge);
    }
    if (nx < leftEdge) return false;

    // Right jagged volcanic peninsula jutting into the lava sea from the right (frame_018)
    const dyLobe = (ny - 0.135) / 0.062;
    const lobeReach =
      0.625 +
      dyLobe * dyLobe * 0.14 +
      0.022 * Math.sin(ny * 48.0) +
      warp * 1.1;
    if (ny > 0.068 && ny < 0.205 && nx > lobeReach) {
      return false;
    }

    // Far-right shoreline closing the lava cove at x ≈ 0.885
    const rightShore =
      0.885 -
      Math.max(0, ny - 0.18) * 0.35 +
      0.018 * Math.sin(ny * 35.0) +
      warp;
    if (ny > 0.065 && nx > rightShore) {
      return false;
    }

    // Small dark volcanic islets inside the molten lake (visible in frame_018)
    const dIsle1 = Math.hypot((nx - 0.648) * 1.5, (ny - 0.232) * 3.2);
    if (dIsle1 < 0.016 + warp * 0.15) return false;
    const dIsle2 = Math.hypot((nx - 0.760) * 1.4, (ny - 0.240) * 3.0);
    if (dIsle2 < 0.019 + warp * 0.15) return false;

    return true;
  }

  function getTerrainCanvas(w, h) {
    if (cachedTerrain && cachedW === w && cachedH === h) {
      return cachedTerrain;
    }
    cachedW = w;
    cachedH = h;
    // Render at crisp SVGA-style resolution (480x270) for authentic 1998 pre-rendered grit
    const tw = 480;
    const th = 270;
    const off = document.createElement('canvas');
    off.width = tw;
    off.height = th;
    const octx = off.getContext('2d');
    const img = octx.createImageData(tw, th);
    const data = img.data;

    for (let py = 0; py < th; py++) {
      const ny = py / th;
      for (let px = 0; px < tw; px++) {
        const nx = px / tw;
        const idx = (py * tw + px) * 4;

        if (isLavaRegion(nx, ny)) {
          // Molten lava sea gradient (brightest orange-gold near lower-left cliff, deeper crimson toward top/right)
          const heatX = Math.exp(-Math.pow((nx - 0.485) / 0.21, 2));
          const heatY = clamp((ny - 0.01) / 0.29, 0, 1);
          const n1 = fbm(nx * 14, ny * 26, 3);
          const intensity = clamp(
            0.24 + 0.52 * heatY + 0.28 * heatX * heatY + (n1 - 0.5) * 0.15,
            0.12,
            1.0
          );
          const r = clamp(Math.floor(78 + intensity * 177), 0, 255);
          const g = clamp(
            Math.floor(14 + Math.pow(intensity, 1.52) * 106),
            0,
            255
          );
          const b = clamp(
            Math.floor(4 + Math.pow(intensity, 2.6) * 28),
            0,
            255
          );
          data[idx] = r;
          data[idx + 1] = g;
          data[idx + 2] = b;
          data[idx + 3] = 255;
        } else {
          // Seamless Char volcanic rock texture across both the main plateau and the dark cliffs
          const nCoarse = fbm(nx * 16, ny * 22, 3);
          const nMed = fbm(nx * 46 + 11.3, ny * 62 + 7.1, 3);
          const nFine = valueNoise(nx * 135, ny * 165);
          const nWarm = valueNoise(nx * 38 + 5.0, ny * 48 + 9.0);
          const nCool = valueNoise(nx * 42 + 19.0, ny * 54 + 3.0);

          const plateauMask = smoothstep(0.18, 0.34, ny);

          const distBase = Math.hypot((nx - 0.49) * 1.1, (ny - 0.50) * 1.35);
          const baseLift = Math.max(0, 1 - distBase * 1.45) * 11 * plateauMask;

          let r =
            9 +
            (5 + nCoarse * 18 + (nMed - 0.45) * 22 + (nFine - 0.5) * 16) *
              (0.38 + 0.62 * plateauMask) +
            baseLift;
          let g =
            7 +
            (4 + nCoarse * 13 + (nMed - 0.45) * 15 + (nFine - 0.5) * 12) *
              (0.38 + 0.62 * plateauMask) +
            baseLift * 0.68;
          let b =
            10 +
            (6 + nCoarse * 19 + (nMed - 0.45) * 20 + (nFine - 0.5) * 15) *
              (0.38 + 0.62 * plateauMask) +
            baseLift * 0.78;

          if (nWarm > 0.61) {
            const wAmt = (nWarm - 0.61) * 2.6 * (0.35 + 0.65 * plateauMask);
            r += wAmt * 28;
            g += wAmt * 6;
            b += wAmt * 4;
          }
          if (nCool > 0.63) {
            const cAmt = (nCool - 0.63) * 2.5 * (0.35 + 0.65 * plateauMask);
            r += cAmt * 5;
            g += cAmt * 7;
            b += cAmt * 19;
          }
          if (nFine < 0.28) {
            r *= 0.62;
            g *= 0.62;
            b *= 0.68;
          }

          if (ny < 0.345) {
            const nearLava =
              isLavaRegion(nx + 0.006, ny) ||
              isLavaRegion(nx - 0.006, ny) ||
              isLavaRegion(nx, ny - 0.006) ||
              isLavaRegion(nx, ny + 0.006);
            if (nearLava) {
              r += 22;
              g += 7;
              b += 2;
            }
          }

          data[idx] = clamp(r | 0, 0, 255);
          data[idx + 1] = clamp(g | 0, 0, 255);
          data[idx + 2] = clamp(b | 0, 0, 255);
          data[idx + 3] = 255;
        }
      }
    }

    octx.putImageData(img, 0, 0);
    cachedTerrain = off;
    return off;
  }

  // Helper to draw soft radial ground/air glow
  function drawGlow(ctx, x, y, rx, ry, colorInner, colorOuter, alpha) {
    if (alpha <= 0.005) return;
    ctx.save();
    ctx.globalAlpha = clamp(alpha, 0, 1);
    ctx.translate(x, y);
    ctx.scale(1, ry / Math.max(1, rx));
    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
    grad.addColorStop(0, colorInner);
    grad.addColorStop(0.45, colorOuter);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, rx, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Draw glowing blue StarCraft Mineral Crystal cluster on the left perimeter
  function drawMineralPatch(ctx, w, h, localT, blastFade) {
    if (blastFade <= 0.01) return;
    const clusters = [
      { x: 0.195 * w, y: 0.465 * h, scale: 1.0 },
      { x: 0.218 * w, y: 0.442 * h, scale: 0.85 },
      { x: 0.178 * w, y: 0.488 * h, scale: 0.78 },
    ];
    ctx.save();
    ctx.globalAlpha = blastFade;
    for (let c = 0; c < clusters.length; c++) {
      const cl = clusters[c];
      const s = cl.scale * (w / 1280);
      drawGlow(
        ctx,
        cl.x,
        cl.y,
        28 * s,
        16 * s,
        'rgba(56, 210, 255, 0.32)',
        'rgba(14, 116, 190, 0.10)',
        0.75 + 0.15 * Math.sin(localT * 3 + c)
      );
      const shards = [
        { dx: -10, dy: 2, w: 7, h: 18, tilt: -0.28, col: '#1890d8', hi: '#7ce8ff' },
        { dx: -3, dy: 4, w: 8, h: 24, tilt: -0.08, col: '#22b8f0', hi: '#c4f8ff' },
        { dx: 5, dy: 3, w: 8, h: 20, tilt: 0.22, col: '#1478b8', hi: '#68dcff' },
        { dx: 11, dy: 6, w: 6, h: 14, tilt: 0.42, col: '#0e5a90', hi: '#48b8f0' },
      ];
      for (let i = 0; i < shards.length; i++) {
        const sh = shards[i];
        ctx.save();
        ctx.translate(cl.x + sh.dx * s, cl.y + sh.dy * s);
        ctx.rotate(sh.tilt);
        ctx.fillStyle = sh.col;
        ctx.beginPath();
        ctx.moveTo(-sh.w * 0.5 * s, 0);
        ctx.lineTo(0, -sh.h * s);
        ctx.lineTo(sh.w * 0.5 * s, 0);
        ctx.lineTo(0, 3 * s);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = sh.hi;
        ctx.beginPath();
        ctx.moveTo(-sh.w * 0.45 * s, 0);
        ctx.lineTo(0, -sh.h * s);
        ctx.lineTo(0, 2 * s);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    }
    ctx.restore();
  }

  // Draw a cluster of 3 cylindrical Supply Depot silos (matches left & right clusters in frame_018)
  function drawSupplyDepotCluster(ctx, w, h, x, y, opts, localT) {
    const s = (w / 1280) * (opts.scale || 1.0);
    const isLit = opts.litFurnace;
    const dxStep = opts.dxStep * w;
    const dyStep = opts.dyStep * h;

    ctx.save();
    if (isLit) {
      const pulse = 0.90 + 0.10 * Math.sin(localT * 6.0);
      drawGlow(
        ctx,
        x + dxStep + 22 * s,
        y + dyStep + 34 * s,
        108 * s,
        58 * s,
        'rgba(255, 145, 35, 0.56)',
        'rgba(215, 75, 12, 0.20)',
        pulse
      );
    }

    ctx.strokeStyle = isLit ? '#684e32' : '#2a2d35';
    ctx.lineWidth = 5 * s;
    ctx.beginPath();
    ctx.moveTo(x - 22 * s, y + 18 * s);
    ctx.lineTo(x + dxStep * 2 + 24 * s, y + dyStep * 2 + 18 * s);
    ctx.stroke();

    if (isLit) {
      ctx.strokeStyle = '#ffbe4d';
      ctx.lineWidth = 2.4 * s;
      ctx.beginPath();
      ctx.moveTo(x - 18 * s, y + 16 * s);
      ctx.lineTo(x + dxStep * 2 + 20 * s, y + dyStep * 2 + 16 * s);
      ctx.stroke();
    }

    for (let i = 0; i < 3; i++) {
      const cx = x + dxStep * i;
      const cy = y + dyStep * i;
      const rad = (opts.radius || 17.5) * s;
      const cylH = (opts.height || 45) * s;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.58)';
      ctx.beginPath();
      ctx.ellipse(cx + 4 * s, cy + 12 * s, rad * 1.15, rad * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();

      const bodyGrad = ctx.createLinearGradient(cx - rad, cy, cx + rad, cy);
      if (isLit) {
        bodyGrad.addColorStop(0, '#181516');
        bodyGrad.addColorStop(0.26, '#463830');
        bodyGrad.addColorStop(0.58, '#8c6438');
        bodyGrad.addColorStop(0.85, '#3a261a');
        bodyGrad.addColorStop(1, '#141012');
      } else {
        bodyGrad.addColorStop(0, '#12141a');
        bodyGrad.addColorStop(0.3, '#343944');
        bodyGrad.addColorStop(0.5, '#4e5462');
        bodyGrad.addColorStop(0.82, '#20232b');
        bodyGrad.addColorStop(1, '#0e1014');
      }

      ctx.fillStyle = bodyGrad;
      ctx.beginPath();
      ctx.moveTo(cx - rad, cy - cylH * 0.5);
      ctx.lineTo(cx - rad, cy + cylH * 0.32);
      ctx.ellipse(cx, cy + cylH * 0.32, rad, rad * 0.42, 0, Math.PI, 0, true);
      ctx.lineTo(cx + rad, cy - cylH * 0.5);
      ctx.closePath();
      ctx.fill();

      const domeGrad = ctx.createRadialGradient(
        cx - rad * 0.32,
        cy - cylH * 0.58,
        rad * 0.1,
        cx,
        cy - cylH * 0.48,
        rad * 1.05
      );
      domeGrad.addColorStop(0, isLit ? '#b8bcc8' : '#7c8494');
      domeGrad.addColorStop(0.55, isLit ? '#464852' : '#323640');
      domeGrad.addColorStop(1, '#15171c');
      ctx.fillStyle = domeGrad;
      ctx.beginPath();
      ctx.arc(cx, cy - cylH * 0.46, rad, Math.PI, 0, false);
      ctx.ellipse(cx, cy - cylH * 0.46, rad, rad * 0.36, 0, 0, Math.PI, false);
      ctx.fill();

      if (isLit) {
        const ventFlicker = 0.92 + 0.08 * Math.sin(localT * 11 + i * 2.1);
        drawGlow(
          ctx,
          cx + rad * 0.18,
          cy - cylH * 0.05,
          rad * 1.55,
          cylH * 0.78,
          'rgba(255, 225, 115, 0.88)',
          'rgba(255, 120, 20, 0.30)',
          ventFlicker
        );

        const vGrad = ctx.createLinearGradient(
          cx - rad * 0.35,
          cy,
          cx + rad * 0.65,
          cy
        );
        vGrad.addColorStop(0, 'rgba(255, 110, 10, 0)');
        vGrad.addColorStop(0.35, 'rgba(255, 165, 35, 0.94)');
        vGrad.addColorStop(0.6, 'rgba(255, 250, 195, 0.99)');
        vGrad.addColorStop(0.85, 'rgba(255, 150, 25, 0.88)');
        vGrad.addColorStop(1, 'rgba(180, 60, 5, 0)');
        ctx.fillStyle = vGrad;
        ctx.fillRect(
          cx - rad * 0.3,
          cy - cylH * 0.42,
          rad * 0.95,
          cylH * 0.72
        );
      } else {
        ctx.strokeStyle = 'rgba(135, 115, 55, 0.42)';
        ctx.lineWidth = 3 * s;
        ctx.beginPath();
        ctx.ellipse(cx, cy - cylH * 0.12, rad * 0.98, rad * 0.34, 0, 0, Math.PI);
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(cx, cy + cylH * 0.08, rad * 0.98, rad * 0.34, 0, 0, Math.PI);
        ctx.stroke();
      }

      ctx.strokeStyle = 'rgba(15, 14, 18, 0.78)';
      ctx.lineWidth = 2.2 * s;
      ctx.beginPath();
      ctx.ellipse(cx, cy - cylH * 0.05, rad, rad * 0.32, 0, 0, Math.PI);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Draw small rectangular Terran Bunker / Barracks Outpost with 3 cyan slit windows
  function drawOutpostBunker(ctx, w, h, x, y, opts, localT) {
    const s = (w / 1280) * (opts.scale || 1.0);
    const bw = (opts.bw || 54) * s;
    const bh = (opts.bh || 38) * s;
    const skew = opts.skew || 0;

    ctx.save();
    ctx.translate(x, y);

    drawGlow(
      ctx,
      4 * s,
      bh * 0.45,
      bw * 0.8,
      bh * 0.55,
      'rgba(65, 225, 255, 0.32)',
      'rgba(20, 130, 210, 0.08)',
      0.9
    );

    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.beginPath();
    ctx.ellipse(2 * s, bh * 0.42, bw * 0.68, bh * 0.38, 0, 0, Math.PI * 2);
    ctx.fill();

    const bodyGrad = ctx.createLinearGradient(-bw * 0.5, -bh * 0.5, bw * 0.5, bh * 0.5);
    bodyGrad.addColorStop(0, '#323844');
    bodyGrad.addColorStop(0.45, '#1f242d');
    bodyGrad.addColorStop(1, '#101218');
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.moveTo(-bw * 0.5, -bh * 0.2);
    ctx.lineTo(0, -bh * 0.5);
    ctx.lineTo(bw * 0.55, -bh * 0.25 + skew * s);
    ctx.lineTo(bw * 0.55, bh * 0.32 + skew * s);
    ctx.lineTo(-bw * 0.05, bh * 0.52);
    ctx.lineTo(-bw * 0.5, bh * 0.28);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#282e3a';
    ctx.beginPath();
    ctx.ellipse(0, -bh * 0.38, bw * 0.34, bh * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();

    const blink = 0.5 + 0.5 * Math.sin(localT * 5.0 + x);
    drawGlow(
      ctx,
      -2 * s,
      -bh * 0.52,
      9 * s,
      9 * s,
      'rgba(255, 50, 50, 0.95)',
      'rgba(200, 10, 10, 0.2)',
      blink
    );
    ctx.fillStyle = '#ff3b3b';
    ctx.beginPath();
    ctx.arc(-2 * s, -bh * 0.52, 2.2 * s, 0, Math.PI * 2);
    ctx.fill();

    for (let i = -1; i <= 1; i++) {
      const wx = i * (bw * 0.24) + 3 * s;
      const wy = bh * 0.15 + i * skew * 0.28 * s;
      drawGlow(
        ctx,
        wx,
        wy,
        10 * s,
        7 * s,
        'rgba(180, 250, 255, 0.9)',
        'rgba(40, 200, 255, 0.35)',
        1.0
      );
      ctx.fillStyle = '#b8f8ff';
      ctx.save();
      ctx.translate(wx, wy);
      ctx.rotate(opts.winAngle || -0.18);
      ctx.fillRect(-4.2 * s, -2.0 * s, 8.4 * s, 4.0 * s);
      ctx.restore();
    }

    ctx.restore();
  }

  // Draw the Left-Foreground Angled Cylindrical Quonset / Machine Shop
  function drawLeftMachineVault(ctx, w, h) {
    const s = w / 1280;
    const cx = 0.325 * w;
    const cy = 0.562 * h;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-0.52);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.68)';
    ctx.beginPath();
    ctx.ellipse(0, 14 * s, 68 * s, 32 * s, 0, 0, Math.PI * 2);
    ctx.fill();

    const hullGrad = ctx.createLinearGradient(0, -34 * s, 0, 28 * s);
    hullGrad.addColorStop(0, '#121318');
    hullGrad.addColorStop(0.28, '#282930');
    hullGrad.addColorStop(0.46, '#7a7066');
    hullGrad.addColorStop(0.56, '#3f3b3a');
    hullGrad.addColorStop(0.85, '#16161c');
    hullGrad.addColorStop(1, '#0c0d10');

    ctx.fillStyle = hullGrad;
    ctx.beginPath();
    ctx.roundRect(-56 * s, -28 * s, 112 * s, 54 * s, 18 * s);
    ctx.fill();

    ctx.fillStyle = '#0e0f14';
    ctx.beginPath();
    ctx.ellipse(-52 * s, 0, 12 * s, 25 * s, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // Draw the Right-Center Terran Factory / Vehicle Hangar (frame_018)
  function drawRightFactory(ctx, w, h, localT) {
    const s = w / 1280;
    const cx = 0.648 * w;
    const cy = 0.432 * h;

    ctx.save();
    const bayX = 0.642 * w;
    const bayY = 0.495 * h;
    drawGlow(
      ctx,
      bayX,
      bayY + 8 * s,
      46 * s,
      28 * s,
      'rgba(165, 245, 255, 0.78)',
      'rgba(50, 175, 255, 0.22)',
      0.95
    );

    ctx.translate(cx, cy);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.beginPath();
    ctx.ellipse(0, 26 * s, 68 * s, 38 * s, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.rotate(0.16);
    const roofGrad = ctx.createLinearGradient(0, -42 * s, 0, 32 * s);
    roofGrad.addColorStop(0, '#181d26');
    roofGrad.addColorStop(0.24, '#889ab5');
    roofGrad.addColorStop(0.38, '#424f66');
    roofGrad.addColorStop(0.68, '#1d222d');
    roofGrad.addColorStop(1, '#0e1118');

    ctx.fillStyle = roofGrad;
    ctx.beginPath();
    ctx.roundRect(-54 * s, -36 * s, 106 * s, 68 * s, 10 * s);
    ctx.fill();

    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.ellipse(52 * s, 2 * s, 4.5 * s, 24 * s, 0.12, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.restore();

    drawGlow(
      ctx,
      bayX,
      bayY,
      24 * s,
      15 * s,
      'rgba(235, 252, 255, 0.98)',
      'rgba(70, 205, 255, 0.45)',
      0.95 + 0.05 * Math.sin(localT * 8)
    );
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(bayX - 9 * s, bayY - 4 * s, 18 * s, 7.5 * s, 2.5 * s);
    ctx.fill();
  }

  // Draw the Circular Starport / Landing Control Pad with yellow '+' and blue spotlight (frame_018)
  function drawStarportPad(ctx, w, h, localT) {
    const s = w / 1280;
    const cx = 0.662 * w;
    const cy = 0.635 * h;
    const rx = 64 * s;
    const ry = 38 * s;

    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.68)';
    ctx.beginPath();
    ctx.ellipse(cx + 3 * s, cy + 6 * s, rx * 1.08, ry * 1.12, 0, 0, Math.PI * 2);
    ctx.fill();

    const rimGrad = ctx.createLinearGradient(cx - rx, cy - ry, cx + rx, cy + ry);
    rimGrad.addColorStop(0, '#444e60');
    rimGrad.addColorStop(0.5, '#242b37');
    rimGrad.addColorStop(1, '#12161e');
    ctx.fillStyle = rimGrad;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#1b2028';
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx * 0.84, ry * 0.84, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#ca9a18';
    ctx.lineWidth = 3.2 * s;
    ctx.beginPath();
    ctx.moveTo(cx - 22 * s, cy);
    ctx.lineTo(cx + 22 * s, cy);
    ctx.moveTo(cx - 3 * s, cy - 14 * s);
    ctx.lineTo(cx + 3 * s, cy + 14 * s);
    ctx.stroke();

    const numLights = 8;
    for (let i = 0; i < numLights; i++) {
      const a = (i / numLights) * Math.PI * 2 + 0.25;
      const lx = cx + Math.cos(a) * rx * 0.88;
      const ly = cy + Math.sin(a) * ry * 0.88;
      const isGreen = Math.cos(a) > 0.15;
      const colCore = isGreen ? '#86efac' : '#e0f2fe';
      const colGlow = isGreen ? 'rgba(34, 197, 94, 0.85)' : 'rgba(125, 211, 252, 0.85)';
      drawGlow(ctx, lx, ly, 9 * s, 9 * s, colGlow, 'rgba(0,0,0,0)', 0.9);
      ctx.fillStyle = colCore;
      ctx.beginPath();
      ctx.arc(lx, ly, 2.3 * s, 0, Math.PI * 2);
      ctx.fill();
    }

    const spotX = cx - 39 * s;
    const spotY = cy - 6 * s;
    const spotPulse = 0.94 + 0.06 * Math.sin(localT * 7.0);
    drawGlow(
      ctx,
      spotX,
      spotY,
      62 * s,
      48 * s,
      'rgba(225, 248, 255, 0.95)',
      'rgba(56, 189, 248, 0.42)',
      spotPulse
    );
    drawGlow(
      ctx,
      spotX,
      spotY,
      28 * s,
      25 * s,
      '#ffffff',
      'rgba(186, 230, 253, 0.88)',
      1.0
    );
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(spotX, spotY, 13 * s, 15 * s, -0.15, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // Draw the Central Domed Terran Command Center (Hero centerpiece in frame_018 & frame_019)
  function drawCommandCenter(ctx, w, h, localT, nukeGlow) {
    const s = w / 1280;
    const cx = 0.515 * w;
    const cy = 0.448 * h;
    const baseRx = 80 * s;
    const baseRy = 43 * s;
    const domeH = 76 * s;

    ctx.save();

    // Warm & cool ground light pools around the Command Center
    drawGlow(
      ctx,
      cx - 54 * s,
      cy + 20 * s,
      92 * s,
      54 * s,
      'rgba(255, 165, 60, 0.46)',
      'rgba(200, 90, 20, 0.14)',
      0.95
    );
    drawGlow(
      ctx,
      cx + 15 * s,
      cy + 42 * s,
      95 * s,
      56 * s,
      'rgba(235, 145, 70, 0.34)',
      'rgba(140, 70, 35, 0.10)',
      0.9
    );
    drawGlow(
      ctx,
      cx + 32 * s,
      cy + 26 * s,
      75 * s,
      42 * s,
      'rgba(80, 200, 255, 0.35)',
      'rgba(30, 110, 200, 0.10)',
      0.95
    );

    // Ground contact shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.76)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 16 * s, baseRx * 1.12, baseRy * 1.12, 0, 0, Math.PI * 2);
    ctx.fill();

    // Lower cylindrical skirt / landing gear base under the hazard stripe ring
    const skirtGrad = ctx.createLinearGradient(cx - baseRx, cy, cx + baseRx, cy);
    skirtGrad.addColorStop(0, '#181c24');
    skirtGrad.addColorStop(0.25, '#424c5e');
    skirtGrad.addColorStop(0.55, '#252c38');
    skirtGrad.addColorStop(0.75, '#526884');
    skirtGrad.addColorStop(1, '#10141c');
    ctx.fillStyle = skirtGrad;
    ctx.beginPath();
    ctx.ellipse(cx, cy + 10 * s, baseRx * 0.94, baseRy * 0.92, 0, 0, Math.PI * 2);
    ctx.fill();

    // Main Domed Frustum Body with dramatic 3D metallic shading matching frame_018
    const domeGrad = ctx.createRadialGradient(
      cx - 34 * s,
      cy - 22 * s,
      6 * s,
      cx + 4 * s,
      cy - 14 * s,
      baseRx * 1.12
    );
    domeGrad.addColorStop(0, '#a8bad0');
    domeGrad.addColorStop(0.28, '#546478');
    domeGrad.addColorStop(0.62, '#252e3c');
    domeGrad.addColorStop(1, '#11151d');

    ctx.fillStyle = domeGrad;
    ctx.beginPath();
    ctx.moveTo(cx - baseRx, cy - 2 * s);
    ctx.quadraticCurveTo(cx - baseRx * 0.75, cy - domeH, cx, cy - domeH);
    ctx.quadraticCurveTo(cx + baseRx * 0.75, cy - domeH, cx + baseRx, cy - 2 * s);
    ctx.ellipse(cx, cy - 2 * s, baseRx, baseRy * 0.88, 0, 0, Math.PI, false);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = 'rgba(10, 13, 18, 0.55)';
    ctx.lineWidth = 1.4 * s;
    ctx.beginPath();
    ctx.ellipse(cx, cy - 24 * s, baseRx * 0.82, baseRy * 0.64, 0, 0, Math.PI);
    ctx.stroke();

    // Iconic Yellow & Black Diagonal Hazard Stripe Ring around the base skirt!
    const numStripes = 28;
    for (let i = 0; i < numStripes; i++) {
      const a0 = (i / numStripes) * Math.PI * 1.06 - 0.03 * Math.PI;
      const a1 = ((i + 1) / numStripes) * Math.PI * 1.06 - 0.03 * Math.PI;
      const x0Top = cx + Math.cos(a0) * baseRx * 0.99;
      const y0Top = cy - 5 * s + Math.sin(a0) * baseRy * 0.84;
      const x1Top = cx + Math.cos(a1) * baseRx * 0.99;
      const y1Top = cy - 5 * s + Math.sin(a1) * baseRy * 0.84;

      const a0Bot = a0 + 0.045;
      const a1Bot = a1 + 0.045;
      const x0Bot = cx + Math.cos(a0Bot) * baseRx * 0.99;
      const y0Bot = cy + 4 * s + Math.sin(a0Bot) * baseRy * 0.86;
      const x1Bot = cx + Math.cos(a1Bot) * baseRx * 0.99;
      const y1Bot = cy + 4 * s + Math.sin(a1Bot) * baseRy * 0.86;

      const shade = 0.45 + 0.55 * Math.sin(a0);
      if (i % 2 === 0) {
        const r = Math.floor(235 * shade);
        const g = Math.floor(178 * shade);
        const b = Math.floor(24 * shade);
        ctx.fillStyle = `rgb(${r},${g},${b})`;
      } else {
        ctx.fillStyle = '#12141a';
      }
      ctx.beginPath();
      ctx.moveTo(x0Top, y0Top);
      ctx.lineTo(x1Top, y1Top);
      ctx.lineTo(x1Bot, y1Bot);
      ctx.lineTo(x0Bot, y0Bot);
      ctx.closePath();
      ctx.fill();
    }

    // Glowing Rectangular Viewport Windows (2 concentric tiers: warm amber & cool cyan-blue)
    const upperWindows = [
      { a: 2.62, rFrac: 0.56, yOff: -52, col: '#b8f0ff', glow: 'rgba(110,225,255,0.92)', w: 9, h: 6 },
      { a: 2.18, rFrac: 0.62, yOff: -37, col: '#ffd670', glow: 'rgba(255,185,55,0.95)', w: 10, h: 6.5 },
      { a: 1.68, rFrac: 0.46, yOff: -44, col: '#ffffff', glow: 'rgba(165,230,255,0.98)', w: 12, h: 8 },
      { a: 1.34, rFrac: 0.60, yOff: -29, col: '#ffc44d', glow: 'rgba(255,175,45,0.92)', w: 10, h: 6.5 },
      { a: 0.96, rFrac: 0.66, yOff: -29, col: '#8ee8ff', glow: 'rgba(90,215,255,0.95)', w: 11, h: 6.5 },
      { a: 0.42, rFrac: 0.72, yOff: -31, col: '#70dcff', glow: 'rgba(65,195,255,0.85)', w: 8.5, h: 5.5 },
    ];
    const lowerWindows = [
      { a: 2.52, rFrac: 0.78, yOff: -22, col: '#ffe898', glow: 'rgba(255,198,75,0.95)', w: 11, h: 6.5 },
      { a: 2.05, rFrac: 0.82, yOff: -14, col: '#98ecff', glow: 'rgba(95,220,255,0.92)', w: 10.5, h: 5.5 },
      { a: 1.42, rFrac: 0.84, yOff: -11, col: '#84e6ff', glow: 'rgba(85,215,255,0.95)', w: 11.5, h: 6.0 },
      { a: 0.82, rFrac: 0.84, yOff: -15, col: '#88e8ff', glow: 'rgba(85,215,255,0.92)', w: 10.5, h: 5.5 },
    ];

    const allWindows = upperWindows.concat(lowerWindows);
    for (let i = 0; i < allWindows.length; i++) {
      const win = allWindows[i];
      const wx = cx + Math.cos(win.a) * baseRx * win.rFrac;
      const wy = cy + win.yOff * s + Math.sin(win.a) * baseRy * 0.32;
      drawGlow(ctx, wx, wy, win.w * 2.8 * s, win.h * 2.8 * s, win.glow, 'rgba(0,0,0,0)', 0.98);
      ctx.save();
      ctx.translate(wx, wy);
      ctx.rotate((win.a - Math.PI * 0.5) * -0.22);
      ctx.fillStyle = win.col;
      ctx.beginPath();
      ctx.roundRect(-win.w * 0.5 * s, -win.h * 0.5 * s, win.w * s, win.h * s, 1.8 * s);
      ctx.fill();
      ctx.restore();
    }

    // Top cupola & tall vertical antenna spire
    ctx.fillStyle = '#202834';
    ctx.beginPath();
    ctx.ellipse(cx + 2 * s, cy - domeH + 4 * s, 22 * s, 9 * s, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#323d4c';
    ctx.lineWidth = 2.4 * s;
    ctx.beginPath();
    ctx.moveTo(cx + 2 * s, cy - domeH + 2 * s);
    ctx.lineTo(cx + 2 * s, cy - domeH - 22 * s);
    ctx.stroke();

    if (nukeGlow > 0.01) {
      drawGlow(
        ctx,
        cx,
        cy - domeH * 0.65,
        baseRx * 1.35,
        domeH * 1.1,
        'rgba(255, 150, 50, 0.78)',
        'rgba(255, 60, 10, 0.24)',
        nukeGlow
      );
    }

    ctx.restore();
  }

  // Draw active Terran Units (Siege Tank in Siege Mode, Welding & Mining SCVs, Marines, Missile Turret)
  function drawTerranUnits(ctx, w, h, localT, panicFactor) {
    const s = w / 1280;
    ctx.save();

    // 1. Missile Turret near the left Supply Depots (0.28w, 0.455h)
    const turX = 0.282 * w;
    const turY = 0.455 * h;
    const turAngle = localT * 1.8;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.beginPath();
    ctx.ellipse(turX, turY + 5 * s, 12 * s, 7 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2d3542';
    ctx.beginPath();
    ctx.ellipse(turX, turY + 2 * s, 9 * s, 5 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.translate(turX, turY - 4 * s);
    ctx.fillStyle = '#4f5d73';
    ctx.fillRect(-6 * s + Math.cos(turAngle) * 2 * s, -5 * s, 12 * s, 8 * s);
    ctx.fillStyle = '#9aa8bc';
    ctx.fillRect(-8 * s, -4 * s, 3 * s, 6 * s);
    ctx.fillRect(5 * s, -4 * s, 3 * s, 6 * s);
    ctx.restore();

    // 2. Deployed Siege Tank in Siege Mode at (0.448w, 0.562h)
    const tankX = 0.448 * w;
    const tankY = 0.562 * h;
    ctx.save();
    ctx.translate(tankX, tankY);
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.beginPath();
    ctx.ellipse(0, 3 * s, 25 * s, 14 * s, 0, 0, Math.PI * 2);
    ctx.fill();

    const struts = [
      { dx: -18, dy: -7 },
      { dx: 18, dy: -7 },
      { dx: -16, dy: 9 },
      { dx: 16, dy: 9 },
    ];
    ctx.strokeStyle = '#4a5568';
    ctx.lineWidth = 3.2 * s;
    for (let i = 0; i < struts.length; i++) {
      const st = struts[i];
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(st.dx * s, st.dy * s);
      ctx.stroke();
      ctx.fillStyle = '#d99b16';
      ctx.beginPath();
      ctx.ellipse(st.dx * s, st.dy * s, 4.5 * s, 2.8 * s, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = '#384456';
    ctx.beginPath();
    ctx.ellipse(0, 0, 13 * s, 8.5 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#60728a';
    ctx.beginPath();
    ctx.ellipse(-2 * s, -3 * s, 9 * s, 6 * s, 0, 0, Math.PI * 2);
    ctx.fill();

    const fireCycle = (localT + 0.3) % 1.45;
    const recoil = fireCycle < 0.14 ? (1 - fireCycle / 0.14) * 4.5 * s : 0;
    ctx.strokeStyle = '#8fa4bd';
    ctx.lineWidth = 2.4 * s;
    ctx.beginPath();
    ctx.moveTo(-2 * s + recoil, -4 * s + recoil * 0.5);
    ctx.lineTo(-17 * s + recoil, -15 * s + recoil * 0.5);
    ctx.moveTo(2 * s + recoil, -2 * s + recoil * 0.5);
    ctx.lineTo(-13 * s + recoil, -13 * s + recoil * 0.5);
    ctx.stroke();

    if (fireCycle < 0.09) {
      const mAlpha = 1 - fireCycle / 0.09;
      drawGlow(
        ctx,
        -16 * s,
        -15 * s,
        24 * s,
        18 * s,
        'rgba(255, 240, 170, 0.95)',
        'rgba(255, 130, 30, 0.45)',
        mAlpha
      );
    }
    ctx.restore();

    // 3. SCV #1 (Arc-Welding & Repairing beside the Command Center at 0.575w, 0.505h)
    const scv1X = (0.575 + panicFactor * 0.04) * w;
    const scv1Y = (0.505 + panicFactor * 0.03) * h;
    ctx.save();
    ctx.translate(scv1X, scv1Y);
    drawGlow(ctx, 5 * s, 3 * s, 8 * s, 6 * s, 'rgba(80,210,255,0.85)', 'rgba(0,0,0,0)', 0.9);
    ctx.fillStyle = '#3b4859';
    ctx.beginPath();
    ctx.roundRect(-6 * s, -6 * s, 12 * s, 10 * s, 3 * s);
    ctx.fill();
    ctx.fillStyle = '#eab308';
    ctx.fillRect(-5 * s, -5 * s, 4 * s, 3 * s);
    ctx.fillStyle = '#7ce8ff';
    ctx.fillRect(-4 * s, -2 * s, 4 * s, 2.5 * s);

    if (panicFactor < 0.2) {
      const weldOn = Math.sin(localT * 28.0) > -0.25;
      if (weldOn) {
        const arcX = -9 * s;
        const arcY = -3 * s;
        drawGlow(
          ctx,
          arcX,
          arcY,
          22 * s,
          16 * s,
          'rgba(220, 250, 255, 0.95)',
          'rgba(56, 189, 248, 0.45)',
          0.95
        );
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(arcX, arcY, 2.5 * s, 0, Math.PI * 2);
        ctx.fill();

        for (let sp = 0; sp < 5; sp++) {
          const spT = ((localT * 9 + sp * 0.21) % 1.0);
          const sx = arcX + Math.cos(sp * 1.7 + 1.2) * spT * 14 * s;
          const sy = arcY - Math.sin(sp * 1.3 + 0.5) * spT * 10 * s + spT * spT * 12 * s;
          ctx.fillStyle = sp % 2 === 0 ? '#a5f3fc' : '#fde047';
          ctx.fillRect(sx, sy, 1.8 * s, 1.8 * s);
        }
      }
    }
    ctx.restore();

    // 4. SCV #2 (Harvesting minerals between the left Mineral Patch & Command Center)
    const harvestCycle = (localT * 0.42) % 1.0;
    const leg = harvestCycle < 0.5 ? harvestCycle * 2 : (1 - harvestCycle) * 2;
    const scv2X = lerp(0.225 * w, 0.445 * w, leg) - panicFactor * 0.05 * w;
    const scv2Y = lerp(0.462 * h, 0.468 * h, leg) + panicFactor * 0.03 * h;
    ctx.save();
    ctx.translate(scv2X, scv2Y);
    drawGlow(ctx, 0, 2 * s, 10 * s, 7 * s, 'rgba(56,195,255,0.75)', 'rgba(0,0,0,0)', 0.85);
    ctx.fillStyle = '#475569';
    ctx.beginPath();
    ctx.roundRect(-5.5 * s, -5 * s, 11 * s, 9 * s, 2.5 * s);
    ctx.fill();
    ctx.fillStyle = '#eab308';
    ctx.fillRect(-3 * s, -4 * s, 6 * s, 2.5 * s);
    if (harvestCycle < 0.5) {
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(5 * s, -1 * s, 3.2 * s, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // 5. Squad of 4 Terran Marines in CMC-300 Powered Combat Armor (detailed isometric silhouettes)
    const marines = [
      { x: 0.485, y: 0.585, vx: -0.04, vy: 0.05, phase: 0.0, dir: -1 },
      { x: 0.512, y: 0.602, vx: 0.01, vy: 0.06, phase: 1.4, dir: -1 },
      { x: 0.538, y: 0.578, vx: 0.05, vy: 0.04, phase: 2.7, dir: 1 },
      { x: 0.458, y: 0.498, vx: -0.05, vy: -0.02, phase: 4.1, dir: -1 },
    ];
    for (let i = 0; i < marines.length; i++) {
      const m = marines[i];
      const mx = (m.x + m.vx * panicFactor + Math.sin(localT * 2.5 + m.phase) * 0.003) * w;
      const my = (m.y + m.vy * panicFactor + Math.cos(localT * 2.5 + m.phase) * 0.002) * h;
      ctx.save();
      ctx.translate(mx, my);
      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.beginPath();
      ctx.ellipse(0, 4 * s, 5.5 * s, 3 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      // Armored legs
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(-3 * s, 0, 2.2 * s, 4 * s);
      ctx.fillRect(0.8 * s, 0, 2.2 * s, 4 * s);
      // Bulky CMC-300 Pauldron Shoulder Pads & Torso
      ctx.fillStyle = '#2563eb';
      ctx.beginPath();
      ctx.ellipse(-3.2 * s, -2.5 * s, 2.8 * s, 3.2 * s, -0.2, 0, Math.PI * 2);
      ctx.ellipse(3.2 * s, -2.5 * s, 2.8 * s, 3.2 * s, 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#3b82f6';
      ctx.fillRect(-3 * s, -4.5 * s, 6 * s, 5 * s);
      // Helmet dome & glowing amber visor
      ctx.fillStyle = '#93c5fd';
      ctx.beginPath();
      ctx.arc(0, -4.8 * s, 2.2 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(-1.4 * s, -5.0 * s, 2.8 * s, 1.3 * s);
      // C-14 Impaler Gauss Rifle
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1.6 * s;
      ctx.beginPath();
      ctx.moveTo(0, -1.8 * s);
      ctx.lineTo(m.dir * 6.5 * s, -0.5 * s);
      ctx.stroke();

      const mBurst = Math.sin(localT * 18 + m.phase * 3) > 0.78 && panicFactor < 0.25;
      if (mBurst) {
        drawGlow(ctx, m.dir * 8 * s, -0.5 * s, 9 * s, 6 * s, '#fef08a', 'rgba(250,204,21,0)', 0.9);
      }
      ctx.restore();
    }

    ctx.restore();
  }

  // Draw the Pulsing Red Ghost Nuclear Target Dot on the Command Center (1.0s – 3.8s)
  function drawNuclearTargetDot(ctx, w, h, localT) {
    if (localT < 1.0 || localT >= 3.8) return;
    const s = w / 1280;
    const tx = 0.518 * w;
    const ty = 0.302 * h;
    const gx = 0.548 * w;
    const gy = 0.468 * h;

    const urgency = clamp((localT - 1.0) / 2.8, 0, 1);
    const freq = 7.0 + urgency * 20.0;
    const pulse = 0.55 + 0.45 * Math.sin(localT * freq);

    ctx.save();
    // Upper red laser dot (exact red beacon/dot visible above CC in frame_018)
    drawGlow(
      ctx,
      tx,
      ty,
      18 * s,
      18 * s,
      'rgba(255, 45, 45, 0.95)',
      'rgba(220, 10, 10, 0.25)',
      pulse
    );
    ctx.fillStyle = '#ff2a2a';
    ctx.beginPath();
    ctx.arc(tx, ty, (2.6 + pulse * 1.4) * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(tx, ty, 1.2 * s, 0, Math.PI * 2);
    ctx.fill();

    // Pulsing Ghost Nuclear Target Laser Dot right beside the Command Center
    drawGlow(
      ctx,
      gx,
      gy,
      16 * s,
      11 * s,
      'rgba(255, 30, 30, 0.95)',
      'rgba(220, 0, 0, 0.25)',
      pulse
    );
    ctx.fillStyle = '#ff1e1e';
    ctx.beginPath();
    ctx.arc(gx, gy, (2.2 + pulse * 1.2) * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(gx, gy, 1.0 * s, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // Draw the Descending Tactical Nuke & Searing Vertical Plasma Trail (2.6s – 3.8s, frame_019.jpg)
  function drawTacticalNukeDescent(ctx, w, h, localT) {
    if (localT < 2.6 || localT >= 3.82) return;
    const s = w / 1280;
    const p = clamp((localT - 2.6) / 1.18, 0, 1);
    const d = Math.pow(p, 1.25);

    const startX = 0.495 * w;
    const startY = -0.04 * h;
    const endX = 0.510 * w;
    const endY = 0.325 * h;

    const headX = lerp(startX, endX, d);
    const headY = lerp(startY, endY, d);

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    const plumeIntensity = smoothstep(0.25, 0.85, p);
    if (plumeIntensity > 0.01) {
      drawGlow(
        ctx,
        endX,
        0.268 * h,
        95 * s,
        62 * s,
        'rgba(255, 135, 45, 0.82)',
        'rgba(220, 45, 8, 0.26)',
        plumeIntensity
      );
      drawGlow(
        ctx,
        headX,
        headY,
        55 * s,
        55 * s,
        'rgba(255, 220, 140, 0.92)',
        'rgba(255, 95, 20, 0.35)',
        plumeIntensity
      );
    }

    ctx.strokeStyle = 'rgba(255, 80, 15, 0.45)';
    ctx.lineWidth = 26 * s;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(startX, 0);
    ctx.lineTo(headX, headY);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255, 165, 55, 0.82)';
    ctx.lineWidth = 11 * s;
    ctx.beginPath();
    ctx.moveTo(startX, 0);
    ctx.lineTo(headX, headY);
    ctx.stroke();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4.2 * s;
    ctx.beginPath();
    ctx.moveTo(startX, 0);
    ctx.lineTo(headX, headY);
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(headX, headY, 5 * s, 14 * s, -0.05, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // Draw the Scorched Blast Crater & Glowing Molten Embers (3.8s – 8.0s, frame_020 & frame_021)
  function drawEmberCrater(ctx, w, h, localT, craterAlpha) {
    if (craterAlpha <= 0.01) return;
    const s = w / 1280;
    const cx = 0.515 * w;
    const cy = 0.565 * h;
    const rx = 0.225 * w;
    const ry = 0.148 * h;

    ctx.save();
    ctx.globalAlpha = craterAlpha;

    // Deep pitch-black scorched crater basin centered at (0,0) in translated space!
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(1, ry / rx);
    const craterGrad = ctx.createRadialGradient(0, 0, rx * 0.18, 0, 0, rx);
    craterGrad.addColorStop(0, 'rgba(3, 2, 4, 0.99)');
    craterGrad.addColorStop(0.66, 'rgba(5, 4, 6, 0.96)');
    craterGrad.addColorStop(0.86, 'rgba(12, 9, 12, 0.78)');
    craterGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = craterGrad;
    ctx.beginPath();
    ctx.arc(0, 0, rx, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Crisp glowing yellow-orange-red square pixel embers scattered across the pitch-black crater (frame_020 & frame_021)
    const heatDecay = clamp(1 - (localT - 3.8) / 4.5, 0.35, 1.0);
    for (let i = 0; i < CRATER_EMBERS.length; i++) {
      const em = CRATER_EMBERS[i];
      const ex = cx + em.dx * w;
      const ey = cy + em.dy * h;
      const flicker = 0.62 + 0.38 * Math.sin(localT * em.speed + em.phase);
      const intensity = em.heat * flicker * (0.78 + 0.22 * heatDecay);
      if (intensity < 0.22) continue;

      const sz = em.size * s;
      if (intensity > 0.55) {
        ctx.fillStyle = `rgba(255, 135, 15, ${intensity * 0.42})`;
        ctx.fillRect(ex - sz * 1.1, ey - sz * 1.1, sz * 2.2, sz * 2.2);
      }

      if (intensity > 0.68) {
        ctx.fillStyle = '#ffea55';
      } else if (intensity > 0.45) {
        ctx.fillStyle = '#ff9c1a';
      } else {
        ctx.fillStyle = '#e04f10';
      }
      ctx.fillRect(ex - sz * 0.5, ey - sz * 0.5, sz, sz);
    }

    ctx.restore();
  }

  // Draw the 5 Charred, Burning Perimeter Ruins (frame_020 & frame_021)
  function drawBurningRuins(ctx, w, h, localT, ruinAlpha) {
    if (ruinAlpha <= 0.01) return;
    const s = w / 1280;
    ctx.save();
    ctx.globalAlpha = ruinAlpha;

    const ruins = [
      { x: 0.265 * w, y: 0.515 * h, rad: 22 * s, type: 'rubble', seed: 1.1 },
      { x: 0.405 * w, y: 0.355 * h, rad: 20 * s, type: 'rubble', seed: 2.3 },
      { x: 0.722 * w, y: 0.332 * h, rad: 22 * s, type: 'rubble', seed: 3.7 },
      { x: 0.745 * w, y: 0.535 * h, rad: 24 * s, type: 'rubble', seed: 4.9 },
      { x: 0.838 * w, y: 0.692 * h, rad: 36 * s, type: 'depots', seed: 6.2 },
    ];

    for (let i = 0; i < ruins.length; i++) {
      const r = ruins[i];
      ctx.fillStyle = 'rgba(6, 5, 7, 0.86)';
      ctx.beginPath();
      ctx.ellipse(r.x, r.y + 4 * s, r.rad * 1.35, r.rad * 0.75, 0, 0, Math.PI * 2);
      ctx.fill();

      if (r.type === 'depots') {
        const offsets = [
          { dx: -32, dy: -12, rx: 16, ry: 12 },
          { dx: -2, dy: 0, rx: 17, ry: 13 },
          { dx: 28, dy: 12, rx: 18, ry: 13 },
        ];
        for (let k = 0; k < offsets.length; k++) {
          const o = offsets[k];
          ctx.fillStyle = '#141113';
          ctx.beginPath();
          ctx.ellipse(
            r.x + o.dx * s,
            r.y + o.dy * s,
            o.rx * s,
            o.ry * s,
            0.2,
            0,
            Math.PI * 2
          );
          ctx.fill();
          ctx.strokeStyle = '#2a201e';
          ctx.lineWidth = 2 * s;
          ctx.stroke();
        }
      } else {
        ctx.fillStyle = '#141114';
        ctx.beginPath();
        ctx.ellipse(r.x, r.y, r.rad, r.rad * 0.58, -0.15, 0, Math.PI * 2);
        ctx.fill();
      }

      const flicker = 0.75 + 0.25 * Math.sin(localT * 12 + r.seed * 3);
      drawGlow(
        ctx,
        r.x,
        r.y - 4 * s,
        r.rad * 1.25,
        r.rad * 1.0,
        'rgba(255, 180, 60, 0.88)',
        'rgba(220, 75, 15, 0.28)',
        flicker
      );

      for (let sp = 0; sp < 4; sp++) {
        const pAge = ((localT * 0.65 + sp * 0.25 + r.seed) % 1.0);
        const sx = r.x + Math.sin(pAge * 5 + r.seed) * 8 * s;
        const sy = r.y - 6 * s - pAge * 38 * s;
        const sRad = (7 + pAge * 14) * s;
        ctx.fillStyle = `rgba(82, 70, 62, ${(1 - pAge) * 0.45})`;
        ctx.beginPath();
        ctx.arc(sx, sy, sRad, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = '#ffaa2b';
      ctx.beginPath();
      ctx.arc(r.x - 4 * s, r.y - 2 * s, 3.2 * s * flicker, 0, Math.PI * 2);
      ctx.arc(r.x + 5 * s, r.y + 1 * s, 2.5 * s * flicker, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff3b0';
      ctx.beginPath();
      ctx.arc(r.x - 4 * s, r.y - 2 * s, 1.5 * s, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  // Draw the Towering Volumetric Nuclear Mushroom Cloud, Shockwave & Debris (3.8s – 8.0s, frame_020 & frame_021)
  function drawNuclearExplosionAndCloud(ctx, w, h, localT) {
    if (localT < 3.8) return;
    const s = w / 1280;
    const dt = localT - 3.8;
    const cx = 0.518 * w;
    const baseY = 0.485 * h;

    ctx.save();

    // 1. Expanding Atmospheric Shockwave Condensation Arc near the top horizon (frame_020)
    if (dt < 2.2) {
      const shockP = dt / 2.2;
      const shockRx = lerp(0.18, 0.85, Math.pow(shockP, 0.62)) * w;
      const shockRy = shockRx * 0.28;
      const shockAlpha = (1 - shockP) * 0.36;
      ctx.strokeStyle = `rgba(185, 165, 148, ${shockAlpha})`;
      ctx.lineWidth = (14 * (1 - shockP * 0.45)) * s;
      ctx.beginPath();
      ctx.ellipse(cx, 0.26 * h, shockRx, shockRy, 0, Math.PI * 1.04, Math.PI * 1.96);
      ctx.stroke();
    }

    // 2. Broad Rolling Dust & Smoke Wave across the left/center plateau (prominent in frame_020, clears by frame_021)
    if (dt < 2.4) {
      const dustP = clamp(dt / 2.35, 0, 1);
      const dustFade = Math.sin(dustP * Math.PI) * (1 - dustP * 0.35);

      drawGlow(
        ctx,
        0.24 * w,
        0.58 * h,
        0.26 * w,
        0.22 * h,
        `rgba(160, 108, 72, ${dustFade * 0.42})`,
        `rgba(95, 62, 42, ${dustFade * 0.16})`,
        1.0
      );

      const ringRx = lerp(0.10, 0.39, Math.pow(dustP, 0.68)) * w;
      const ringRy = ringRx * 0.58;
      for (let i = 0; i < DUST_WAVE_PUFFS.length; i++) {
        const dp = DUST_WAVE_PUFFS[i];
        const px = cx + dp.cos * ringRx;
        const py = 0.53 * h + dp.sin * ringRy + dp.heightOff * h;
        const pr = dp.rad * (0.85 + dustP * 0.75) * w;
        const pAlpha = dustFade * dp.alphaScale * 0.34;
        drawGlow(
          ctx,
          px,
          py,
          pr,
          pr * 0.75,
          `rgba(145, 102, 72, ${pAlpha})`,
          `rgba(80, 55, 40, ${pAlpha * 0.4})`,
          1.0
        );
      }
    }

    // 3. Flying Ballistic Burning Debris Chunks (dt: 0.0s – 1.8s)
    if (dt < 1.8) {
      for (let i = 0; i < DEBRIS_PARTICLES.length; i++) {
        const deb = DEBRIS_PARTICLES[i];
        if (dt > deb.life) continue;
        const lifeFrac = dt / deb.life;
        const dx = cx + deb.vx * dt * w;
        const dy = baseY + (deb.vy * dt + 0.5 * deb.gravity * dt * dt) * h;
        const sz = deb.size * (1 - lifeFrac * 0.4) * s;

        ctx.save();
        ctx.translate(dx, dy);
        ctx.rotate(dt * deb.rotSpeed);
        if (deb.isFiery) {
          ctx.fillStyle = lifeFrac < 0.4 ? '#fff3a8' : '#ff6b18';
        } else {
          ctx.fillStyle = '#332d30';
        }
        ctx.fillRect(-sz * 0.5, -sz * 0.5, sz, sz * 0.7);
        ctx.restore();
      }
    }

    // 4. Towering Volumetric Nuclear Mushroom Cloud (Stem + Billowing Multi-Lobed Cap)
    const riseP = 1 - Math.exp(-dt * 2.5);
    const slowRise = clamp(dt / 4.2, 0, 1) * 0.032;
    const capY = lerp(0.43, 0.242, riseP) * h - slowRise * h;
    const capScale = lerp(0.45, 1.08, riseP) + slowRise * 0.42;

    const fireHeat = clamp(1 - (dt - 0.35) / 2.15, 0.06, 1.0);

    const stemBottomY = 0.435 * h;
    const stemAlpha = clamp(1 - (dt - 2.0) / 2.2, 0.16, 0.82);
    for (let i = 0; i < STEM_PUFFS.length; i++) {
      const sp = STEM_PUFFS[i];
      const sy = lerp(stemBottomY, capY + 0.04 * h, sp.frac);
      const sx =
        cx +
        sp.dx * w +
        Math.sin(dt * 2.2 + sp.seed) * 0.008 * w;
      const sr = sp.rad * capScale * w;

      const rCol = Math.floor(lerp(72, 205, fireHeat * (1 - sp.frac * 0.35)));
      const gCol = Math.floor(lerp(62, 102, fireHeat * (1 - sp.frac * 0.35)));
      const bCol = Math.floor(lerp(56, 38, fireHeat));

      drawGlow(
        ctx,
        sx,
        sy,
        sr,
        sr * 0.85,
        `rgba(${rCol}, ${gCol}, ${bCol}, ${stemAlpha * 0.55})`,
        `rgba(${Math.floor(rCol * 0.6)}, ${Math.floor(gCol * 0.55)}, ${Math.floor(bCol * 0.55)}, 0)`,
        1.0
      );
    }

    for (let i = 0; i < MUSHROOM_CAP_PUFFS.length; i++) {
      const pf = MUSHROOM_CAP_PUFFS[i];
      const billowX = Math.sin(dt * 1.4 + pf.seed) * 0.004;
      const billowY = Math.cos(dt * 1.2 + pf.seed) * 0.003;
      const px = cx + (pf.nx + billowX) * capScale * w;
      const py = capY + (pf.ny + billowY) * capScale * h;
      const pr = pf.rad * capScale * w;

      const underFactor = clamp((2.2 - pf.layer) / 2.2, 0, 1);
      const topFactor = clamp((pf.layer - 1.4) / 2.6, 0, 1);

      const rAsh = lerp(64, 134, topFactor * 0.72 + (pf.depth + 1) * 0.14);
      const gAsh = lerp(55, 118, topFactor * 0.72 + (pf.depth + 1) * 0.14);
      const bAsh = lerp(49, 106, topFactor * 0.72 + (pf.depth + 1) * 0.14);

      const rFire = 248;
      const gFire = 118;
      const bFire = 28;

      const mixFire = underFactor * fireHeat * 0.86;
      const rFinal = Math.floor(lerp(rAsh, rFire, mixFire));
      const gFinal = Math.floor(lerp(gAsh, gFire, mixFire));
      const bFinal = Math.floor(lerp(bAsh, bFire, mixFire));

      const rEdge = Math.floor(rFinal * 0.64);
      const gEdge = Math.floor(gFinal * 0.58);
      const bEdge = Math.floor(bFinal * 0.54);

      const puffGrad = ctx.createRadialGradient(
        px - pr * 0.18,
        py - pr * 0.22,
        pr * 0.08,
        px,
        py,
        pr
      );
      puffGrad.addColorStop(0, `rgba(${rFinal}, ${gFinal}, ${bFinal}, 0.76)`);
      puffGrad.addColorStop(0.58, `rgba(${rEdge}, ${gEdge}, ${bEdge}, 0.54)`);
      puffGrad.addColorStop(1, `rgba(${rEdge}, ${gEdge}, ${bEdge}, 0)`);

      ctx.fillStyle = puffGrad;
      ctx.beginPath();
      ctx.arc(px, py, pr, 0, Math.PI * 2);
      ctx.fill();
    }

    drawGlow(
      ctx,
      cx,
      capY - 0.052 * capScale * h,
      0.068 * capScale * w,
      0.028 * capScale * h,
      'rgba(42, 36, 32, 0.58)',
      'rgba(60, 52, 46, 0)',
      0.85
    );

    // 5. Initial Blinding Nuclear Flash & Expanding Fireball (dt: 0.0s – 0.65s)
    if (dt < 0.65) {
      const flashP = dt / 0.65;
      const fireballRad = lerp(0.06, 0.34, Math.pow(flashP, 0.55)) * w;
      drawGlow(
        ctx,
        cx,
        0.44 * h,
        fireballRad,
        fireballRad * 0.75,
        'rgba(255, 255, 240, 0.98)',
        'rgba(255, 140, 30, 0.55)',
        1 - Math.pow(flashP, 1.4)
      );

      if (dt < 0.28) {
        const screenFlash = Math.pow(1 - dt / 0.28, 1.8) * 0.85;
        ctx.fillStyle = `rgba(255, 245, 210, ${screenFlash})`;
        ctx.fillRect(-50, -50, w + 100, h + 100);
      }
    }

    // 6. Drifting Post-Nuclear Ash & Floating Cinders (dt > 0.6s)
    const ashAlpha = smoothstep(0.6, 1.8, dt);
    if (ashAlpha > 0.01) {
      for (let i = 0; i < ASH_PARTICLES.length; i++) {
        const a = ASH_PARTICLES[i];
        const ax = ((a.x + a.vx * dt + Math.sin(dt * 2 + a.phase) * 0.015 + 1) % 1) * w;
        const ay = ((a.y + a.vy * dt) % 1) * h;
        const sz = a.size * s;
        ctx.fillStyle = a.isEmber
          ? `rgba(255, 145, 40, ${ashAlpha * 0.65})`
          : `rgba(165, 150, 140, ${ashAlpha * 0.42})`;
        ctx.fillRect(ax, ay, sz, sz);
      }
    }

    ctx.restore();
  }

  // Register Game 5: StarCraft (1998)
  window.GAMES[4] = {
    title: 'StarCraft',
    year: '1998',
    draw(ctx, w, h, t) {
      const localT = ((t % 8.0) + 8.0) % 8.0;
      const s = w / 1280;

      ctx.save();

      // Decaying violent camera shake during nuclear detonation (3.8s – 5.3s)
      if (localT >= 3.8 && localT < 5.3) {
        const shakeDecay = Math.pow(1 - (localT - 3.8) / 1.5, 2.1);
        const shakeMag = 16 * s * shakeDecay;
        const sx = Math.sin(localT * 95.0) * shakeMag;
        const sy = Math.cos(localT * 113.0) * shakeMag * 0.75;
        ctx.translate(sx, sy);
      }

      // 1. Draw cached Char Volcanic Plateau & Lava Sea base layer
      const terrain = getTerrainCanvas(w, h);
      ctx.drawImage(terrain, 0, 0, w, h);

      // 2. Animated Molten Lava Sea Ripples & Convection Glow in Upper Background
      const lavaPulse = 0.75 + 0.25 * Math.sin(localT * 2.4);
      drawGlow(
        ctx,
        0.50 * w,
        0.22 * h,
        0.16 * w,
        0.09 * h,
        'rgba(255, 125, 20, 0.22)',
        'rgba(200, 50, 5, 0.05)',
        lavaPulse
      );

      // 3. Determine phase weights (Intact Terran Base vs Post-Nuclear Ruins)
      const isPreBlast = localT < 3.92;
      const baseFade = localT < 3.8 ? 1.0 : clamp(1 - (localT - 3.8) / 0.12, 0, 1);
      const ruinFade = localT < 3.85 ? 0.0 : clamp((localT - 3.85) / 0.25, 0, 1);

      // 4. Draw Intact Illuminated Terran Base & Units (0.0s – 3.92s)
      if (isPreBlast && baseFade > 0.01) {
        ctx.save();
        ctx.globalAlpha = baseFade;

        // Glowing blue Mineral Crystal patches on the far left
        drawMineralPatch(ctx, w, h, localT, baseFade);

        // Upper-Left & Upper-Right Outpost Bunkers (with 3 cyan slit windows)
        drawOutpostBunker(ctx, w, h, 0.405 * w, 0.322 * h, { scale: 0.92, winAngle: 0.05 }, localT);
        drawOutpostBunker(ctx, w, h, 0.728 * w, 0.288 * h, { scale: 0.88, winAngle: -0.25 }, localT);

        // Left Supply Depot Cluster (3 Cylindrical Silos with blazing orange furnace vents)
        drawSupplyDepotCluster(
          ctx,
          w,
          h,
          0.335 * w,
          0.422 * h,
          {
            litFurnace: true,
            dxStep: 0.031,
            dyStep: -0.014,
            scale: 1.0,
          },
          localT
        );

        // Right-Center Factory / Vehicle Hangar (with bright cyan-white bay light)
        drawRightFactory(ctx, w, h, localT);

        // Central Domed Terran Command Center (with hazard stripes & glowing blue/amber viewports)
        const nukeGlow =
          localT >= 2.6 && localT < 3.82
            ? smoothstep(2.6, 3.65, localT)
            : 0.0;
        drawCommandCenter(ctx, w, h, localT, nukeGlow);

        // Left-Foreground Cylindrical Machine Shop / Quonset Vault
        drawLeftMachineVault(ctx, w, h);

        // Active Terran Units: Siege Tank in Siege Mode, Welding & Mining SCVs, Marines, Missile Turret
        const panicFactor =
          localT >= 2.8 ? clamp((localT - 2.8) / 1.0, 0, 1) : 0.0;
        drawTerranUnits(ctx, w, h, localT, panicFactor);

        // Circular Starport Control Pad (yellow '+' cross, green perimeter lights, bright blue spotlight)
        drawStarportPad(ctx, w, h, localT);

        // Lower-Right Supply Depot Cluster (3 Dark Cylindrical Silos)
        drawSupplyDepotCluster(
          ctx,
          w,
          h,
          0.798 * w,
          0.602 * h,
          {
            litFurnace: false,
            dxStep: 0.036,
            dyStep: 0.024,
            scale: 1.05,
          },
          localT
        );

        // Lower-Center-Right Foreground Barracks / Outpost (with 3 cyan bay lights)
        drawOutpostBunker(
          ctx,
          w,
          h,
          0.610 * w,
          0.728 * h,
          { scale: 1.18, bw: 58, bh: 44, winAngle: -0.16 },
          localT
        );

        // Pulsing Red Ghost Nuclear Target Dot (1.0s – 3.8s)
        drawNuclearTargetDot(ctx, w, h, localT);

        ctx.restore();
      }

      // 5. Draw the Descending Tactical Nuke & Vertical Plasma Beam (2.6s – 3.8s, frame_019.jpg)
      drawTacticalNukeDescent(ctx, w, h, localT);

      // 6. Draw Post-Nuclear Scorched Ember Crater & Burning Perimeter Ruins (3.85s – 8.0s, frame_020 & frame_021)
      if (ruinFade > 0.01) {
        drawEmberCrater(ctx, w, h, localT, ruinFade);
        drawBurningRuins(ctx, w, h, localT, ruinFade);
      }

      // 7. Draw Nuclear Detonation, Shockwave, Debris & Volumetric Mushroom Cloud (3.8s – 8.0s)
      drawNuclearExplosionAndCloud(ctx, w, h, localT);

      // Subtle atmospheric dark vignette around screen edges
      const vig = ctx.createRadialGradient(
        w * 0.5,
        h * 0.5,
        w * 0.32,
        w * 0.5,
        h * 0.5,
        w * 0.72
      );
      vig.addColorStop(0, 'rgba(0,0,0,0)');
      vig.addColorStop(1, 'rgba(0,0,0,0.42)');
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, w, h);

      ctx.restore();
    },
  };
})();
