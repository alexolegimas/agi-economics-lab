// Game 7: Fallout 3 (2008) — "Power of the Atom" (Tenpenny Tower Balcony Megaton Detonation)
// 3D First-Person Perspective: Looking down at the round balcony patio table (Fusion Pulse Charge
// detonator box with glossy red plunger button, red LED indicator, antenna, whiskey tumbler & dark
// green glass bottle), pressing the red button at t = 1.3s, smoothly pitching up over the rusted
// balcony railing to reveal the Capitol Wasteland panorama & ruined D.C. skyline (Capitol Dome,
// Washington Monument, collapsed highway overpass, dead trees), and witnessing the blinding atomic
// flash, boiling multi-layered volumetric mushroom cloud, and supersonic ground shockwave!
(function() {
  window.GAMES = window.GAMES || [];
  window.GameAnimations = window.GameAnimations || {};

  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const lerp = (a, b, t) => a + (b - a) * clamp(t, 0, 1);
  const smoothstep = (e0, e1, x) => {
    const t = clamp((x - e0) / (e1 - e0), 0, 1);
    return t * t * (3 - 2 * t);
  };
  const smootherstep = (e0, e1, x) => {
    const t = clamp((x - e0) / (e1 - e0), 0, 1);
    return t * t * t * (t * (t * 6 - 15) + 10);
  };
  const easeOutCubic = t => 1 - Math.pow(1 - clamp(t, 0, 1), 3);

  function mulberry32(a) {
    return function() {
      let t = (a += 0x6D2B79F5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Deterministic precomputed scene elements
  const rng = mulberry32(20081028);

  // Ruined Washington D.C. skyline blocks along the horizon (normalized x in 0..1)
  // Leaves room around x = 0.308 for the U.S. Capitol Dome and x = 0.602 for the Washington Monument
  const skylineBlocks = [
    { x: 0.080, w: 0.024, h: 0.044, jag: 1 },
    { x: 0.146, w: 0.013, h: 0.036, jag: 0 },
    { x: 0.194, w: 0.018, h: 0.046, jag: 1 },
    { x: 0.218, w: 0.015, h: 0.033, jag: 0 },
    { x: 0.238, w: 0.048, h: 0.024, jag: 0 },
    // U.S. Capitol Dome sits at x = 0.290..0.326
    { x: 0.332, w: 0.044, h: 0.022, jag: 0 },
    { x: 0.386, w: 0.018, h: 0.034, jag: 1 },
    { x: 0.402, w: 0.022, h: 0.038, jag: 0 },
    { x: 0.448, w: 0.015, h: 0.050, jag: 1 },
    { x: 0.465, w: 0.021, h: 0.027, jag: 0 },
    { x: 0.486, w: 0.016, h: 0.048, jag: 1 },
    // Ground zero Megaton gap at x = 0.505..0.550
    { x: 0.555, w: 0.014, h: 0.044, jag: 0 },
    { x: 0.571, w: 0.013, h: 0.039, jag: 1 },
    // Washington Monument obelisk at x = 0.601
    { x: 0.606, w: 0.022, h: 0.040, jag: 0 },
    { x: 0.666, w: 0.012, h: 0.034, jag: 0 },
    { x: 0.742, w: 0.018, h: 0.030, jag: 1 },
    { x: 0.762, w: 0.025, h: 0.023, jag: 0 },
    { x: 0.787, w: 0.014, h: 0.056, jag: 1 },
    { x: 0.800, w: 0.011, h: 0.035, jag: 0 },
    { x: 0.820, w: 0.020, h: 0.048, jag: 1 },
    { x: 0.848, w: 0.016, h: 0.038, jag: 0 }
  ];

  // Scattered leafless dead wasteland trees across the Capitol Wasteland floor
  // Includes distant/midground trees AND closer foreground wasteland trees seen through the railing in frame_027..030!
  const wastelandTrees = [
    { x: 0.105, d: 0.34, s: 0.78, tilt: -0.08, type: 1 },
    { x: 0.188, d: 0.40, s: 0.72, tilt: 0.12, type: 0 },
    { x: 0.240, d: 0.38, s: 0.82, tilt: -0.05, type: 1 },
    { x: 0.292, d: 0.92, s: 1.42, tilt: 0.06, type: 2 },
    { x: 0.315, d: 0.16, s: 0.62, tilt: -0.10, type: 0 },
    { x: 0.334, d: 0.28, s: 0.85, tilt: 0.04, type: 1 },
    { x: 0.380, d: 0.26, s: 0.76, tilt: -0.14, type: 0 },
    { x: 0.408, d: 0.27, s: 0.65, tilt: 0.08, type: 0 },
    { x: 0.436, d: 0.36, s: 0.95, tilt: -0.06, type: 2 },
    { x: 0.440, d: 0.96, s: 1.48, tilt: 0.05, type: 2 },
    { x: 0.464, d: 0.42, s: 0.68, tilt: -0.12, type: 0 },
    { x: 0.512, d: 0.46, s: 0.74, tilt: 0.09, type: 1 },
    { x: 0.628, d: 0.43, s: 0.96, tilt: -0.15, type: 2 },
    { x: 0.635, d: 0.45, s: 0.88, tilt: 0.18, type: 1 },
    { x: 0.652, d: 0.48, s: 0.82, tilt: 0.07, type: 1 },
    { x: 0.654, d: 0.90, s: 1.38, tilt: -0.04, type: 2 },
    { x: 0.682, d: 0.22, s: 0.58, tilt: 0.10, type: 0 },
    { x: 0.703, d: 0.24, s: 0.60, tilt: -0.08, type: 0 },
    { x: 0.733, d: 0.36, s: 0.76, tilt: 0.05, type: 1 },
    { x: 0.848, d: 0.30, s: 0.78, tilt: -0.12, type: 1 },
    { x: 0.892, d: 0.36, s: 0.86, tilt: 0.08, type: 2 },
    { x: 0.901, d: 0.38, s: 0.78, tilt: -0.06, type: 1 },
    // Closer dead wasteland trees visible between the railing posts when camera is pitched down in frame_027!
    { x: 0.372, d: 2.85, s: 3.60, tilt: 0.04, type: 2 },
    { x: 0.320, d: 2.15, s: 2.10, tilt: -0.08, type: 1 },
    { x: 0.602, d: 2.60, s: 2.45, tilt: -0.05, type: 1 }
  ];

  // Soft overlapping volumetric cauliflower lobes for the mushroom cloud cap
  const capRimLobes = Array.from({ length: 28 }, (_, i) => {
    const a = (i / 28) * Math.PI * 2;
    return {
      ox: Math.cos(a) * (0.62 + 0.24 * rng()),
      oy: Math.sin(a) * (0.54 + 0.24 * rng()),
      r: 0.42 + rng() * 0.22,
      shade: clamp(0.52 - Math.sin(a) * 0.42 + (rng() - 0.5) * 0.14, 0, 1),
      phase: rng() * Math.PI * 2
    };
  });

  const capInnerLobes = Array.from({ length: 22 }, (_, i) => {
    const a = (i / 22) * Math.PI * 2 + 0.3;
    const rad = 0.22 + 0.34 * rng();
    return {
      ox: Math.cos(a) * rad,
      oy: Math.sin(a) * rad * 0.85 - 0.05,
      r: 0.45 + rng() * 0.25,
      shade: clamp(0.55 - Math.sin(a) * 0.38 + (rng() - 0.5) * 0.15, 0, 1),
      phase: rng() * Math.PI * 2
    };
  });

  const stemPuffs = Array.from({ length: 32 }, (_, i) => {
    const frac = i / 31;
    return {
      frac,
      ox: (rng() - 0.5) * 0.38,
      r: 0.68 + (1 - Math.sin(frac * Math.PI) * 0.26) * 0.34 + rng() * 0.14,
      shade: rng(),
      phase: rng() * Math.PI * 2
    };
  });

  const baseDustPuffs = Array.from({ length: 18 }, (_, i) => {
    const s = (i / 17) * 2 - 1;
    return {
      sx: s * 0.92 + (rng() - 0.5) * 0.08,
      sy: (rng() - 0.5) * 0.18,
      r: 0.42 + (1 - Math.abs(s) * 0.45) * 0.35 + rng() * 0.12,
      phase: rng() * Math.PI * 2
    };
  });

  const ashParticles = Array.from({ length: 38 }, () => ({
    x: rng(),
    y: rng(),
    size: 0.7 + rng() * 1.6,
    speedX: 0.03 + rng() * 0.07,
    speedY: 0.01 + rng() * 0.03,
    alpha: 0.12 + rng() * 0.28,
    phase: rng() * Math.PI * 2
  }));

  function drawSoftDisc(ctx, x, y, r, colorCenter, colorMid, colorEdge = 'rgba(0,0,0,0)') {
    if (r <= 0.5) return;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, colorCenter);
    g.addColorStop(0.52, colorMid);
    g.addColorStop(1, colorEdge);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawDeadTree(ctx, x, y, scale, tilt, type, windBend) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(tilt + windBend);
    ctx.strokeStyle = '#1b1c13';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const h = 26 * scale;
    ctx.lineWidth = Math.max(0.9, 2.1 * scale);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(1.5 * scale, -h * 0.45, 0, -h * 0.65);
    ctx.stroke();

    ctx.lineWidth = Math.max(0.7, 1.4 * scale);
    ctx.beginPath();
    ctx.moveTo(0, -h * 0.55);
    ctx.quadraticCurveTo(-4 * scale, -h * 0.78, -6.5 * scale, -h * 0.98);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, -h * 0.62);
    ctx.quadraticCurveTo(4.5 * scale, -h * 0.82, 6 * scale, -h * 1.04);
    ctx.stroke();

    if (type >= 1) {
      ctx.lineWidth = Math.max(0.5, 1.0 * scale);
      ctx.beginPath();
      ctx.moveTo(-3.5 * scale, -h * 0.76);
      ctx.lineTo(-1.2 * scale, -h * 1.02);
      ctx.moveTo(3.2 * scale, -h * 0.80);
      ctx.lineTo(8.2 * scale, -h * 0.92);
      ctx.stroke();
    }
    if (type >= 2) {
      ctx.beginPath();
      ctx.moveTo(0.5 * scale, -h * 0.38);
      ctx.lineTo(5.5 * scale, -h * 0.58);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Draw the Round Tenpenny Tower Balcony Patio Table with:
  // - Fusion Pulse Charge Detonator Box (with glossy red plunger button, red LED, and vertical antenna)
  // - Half-full Whiskey Tumbler Glass
  // - Tall Dark-Green Glass Bottle with dynamic nuclear flash reflection
  function drawBalconyTable(ctx, cx, cy, S, buttonPress, ledGlow, nukeFlash, shockRipple) {
    const rx = 250 * S;
    const ry = 104 * S;
    const rimThickness = 18 * S;

    ctx.save();
    ctx.translate(cx, cy);

    // 1. Central Cylindrical Table Pedestal Leg underneath tabletop
    const legW = 24 * S;
    const legH = 210 * S;
    const legGrad = ctx.createLinearGradient(-legW * 0.5, 0, legW * 0.5, 0);
    legGrad.addColorStop(0, '#070806');
    legGrad.addColorStop(0.35, '#181a14');
    legGrad.addColorStop(1, '#050604');
    ctx.fillStyle = legGrad;
    ctx.fillRect(-legW * 0.5, ry * 0.6, legW, legH);

    // 2. 3D Tabletop Outer Rim & Under-bevel Shadow
    ctx.fillStyle = '#0c0d09';
    ctx.beginPath();
    ctx.ellipse(0, rimThickness, rx, ry * 1.02, 0, 0, Math.PI * 2);
    ctx.fill();

    // 3. Dark Weathered Wood / Metal Patio Tabletop Surface
    const topGrad = ctx.createRadialGradient(-rx * 0.2, -ry * 0.2, rx * 0.05, 0, 0, rx);
    const flashLift = Math.round(nukeFlash * 16);
    topGrad.addColorStop(0, `rgb(${24 + flashLift}, ${23 + Math.round(flashLift * 0.8)}, ${16 + Math.round(flashLift * 0.4)})`);
    topGrad.addColorStop(0.7, `rgb(${16 + Math.round(flashLift * 0.4)}, ${15 + Math.round(flashLift * 0.3)}, 11)`);
    topGrad.addColorStop(1, '#0c0d09');
    ctx.fillStyle = topGrad;
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();

    // Subtle tabletop crimson sheen from the red LED
    if (ledGlow > 0.05) {
      drawSoftDisc(
        ctx,
        -rx * 0.16,
        -ry * 0.12,
        48 * S,
        `rgba(255, 38, 18, ${0.18 * ledGlow})`,
        `rgba(200, 20, 10, ${0.06 * ledGlow})`,
        'rgba(0,0,0,0)'
      );
    }

    // =========================================================================
    // ITEM A: Half-Full Whiskey / Scotch Tumbler Glass (Center-Right of Table)
    // =========================================================================
    const glassX = -12 * S;
    const glassY = -52 * S;
    const glassW = 36 * S;
    const glassH = 48 * S;

    ctx.save();
    ctx.translate(glassX, glassY);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.beginPath();
    ctx.ellipse(2 * S, 3 * S, glassW * 0.56, 7 * S, 0, 0, Math.PI * 2);
    ctx.fill();

    const gBodyGrad = ctx.createLinearGradient(-glassW * 0.5, 0, glassW * 0.5, 0);
    gBodyGrad.addColorStop(0, `rgba(210, 195, 165, ${0.42 + nukeFlash * 0.25})`);
    gBodyGrad.addColorStop(0.45, 'rgba(155, 145, 120, 0.26)');
    gBodyGrad.addColorStop(1, 'rgba(90, 85, 70, 0.38)');
    ctx.fillStyle = gBodyGrad;
    ctx.beginPath();
    ctx.moveTo(-glassW * 0.52, -glassH);
    ctx.lineTo(glassW * 0.52, -glassH);
    ctx.lineTo(glassW * 0.45, 0);
    ctx.quadraticCurveTo(0, 6 * S, -glassW * 0.45, 0);
    ctx.closePath();
    ctx.fill();

    const liqH = glassH * 0.58;
    const liqGrad = ctx.createLinearGradient(-glassW * 0.48, -liqH, glassW * 0.48, 0);
    liqGrad.addColorStop(0, `rgba(225, 155, 88, ${0.78 + nukeFlash * 0.18})`);
    liqGrad.addColorStop(0.5, 'rgba(182, 112, 58, 0.76)');
    liqGrad.addColorStop(1, 'rgba(128, 72, 34, 0.82)');
    ctx.fillStyle = liqGrad;
    ctx.beginPath();
    ctx.moveTo(-glassW * 0.48, -liqH);
    ctx.quadraticCurveTo(0, -liqH + 4 * S, glassW * 0.48, -liqH);
    ctx.lineTo(glassW * 0.44, -2 * S);
    ctx.quadraticCurveTo(0, 4 * S, -glassW * 0.44, -2 * S);
    ctx.closePath();
    ctx.fill();

    const ripple = Math.sin(shockRipple * 35) * 1.5 * S * clamp(shockRipple, 0, 1);
    ctx.fillStyle = `rgba(235, 175, 110, ${0.55 + nukeFlash * 0.25})`;
    ctx.beginPath();
    ctx.ellipse(0, -liqH + ripple, glassW * 0.47, 4.5 * S, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = `rgba(220, 212, 182, ${0.65 + nukeFlash * 0.25})`;
    ctx.beginPath();
    ctx.ellipse(0, -glassH, glassW * 0.52, 5.2 * S, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 250, 225, 0.45)';
    ctx.lineWidth = 1.2 * S;
    ctx.stroke();

    if (nukeFlash > 0.02) {
      ctx.fillStyle = `rgba(255, 235, 165, ${nukeFlash * 0.65})`;
      ctx.fillRect(-glassW * 0.42, -glassH + 5 * S, 3.5 * S, glassH - 9 * S);
    }
    ctx.restore();

    // =========================================================================
    // ITEM B: Fusion Pulse Charge Detonator Box (Left-Center of Table)
    // =========================================================================
    const detX = -68 * S;
    const detY = -28 * S;

    ctx.save();
    ctx.translate(detX, detY);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.beginPath();
    ctx.moveTo(-58 * S, 6 * S);
    ctx.lineTo(18 * S, -14 * S);
    ctx.lineTo(64 * S, 18 * S);
    ctx.lineTo(-14 * S, 42 * S);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#161812';
    ctx.beginPath();
    ctx.moveTo(-52 * S, 0);
    ctx.lineTo(14 * S, -18 * S);
    ctx.lineTo(56 * S, 10 * S);
    ctx.lineTo(-10 * S, 30 * S);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#0d0e0a';
    ctx.beginPath();
    ctx.moveTo(-52 * S, 0);
    ctx.lineTo(-10 * S, 30 * S);
    ctx.lineTo(-10 * S, 44 * S);
    ctx.lineTo(-52 * S, 14 * S);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#11120d';
    ctx.beginPath();
    ctx.moveTo(-10 * S, 30 * S);
    ctx.lineTo(56 * S, 10 * S);
    ctx.lineTo(56 * S, 24 * S);
    ctx.lineTo(-10 * S, 44 * S);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#171912';
    ctx.lineWidth = 3.2 * S;
    ctx.beginPath();
    ctx.moveTo(-36 * S, -4 * S);
    ctx.lineTo(-36 * S, -112 * S);
    ctx.stroke();

    const btnX = 6 * S;
    const btnY = -4 * S;
    const btnRX = 18.5 * S;
    const btnRY = 11.5 * S;

    ctx.fillStyle = '#080706';
    ctx.beginPath();
    ctx.ellipse(btnX, btnY + 3 * S, btnRX * 1.08, btnRY * 0.88, 0, 0, Math.PI * 2);
    ctx.fill();

    const pressY = btnY + buttonPress * 4.2 * S;
    const domeH = (15.5 - buttonPress * 3.8) * S;

    const btnGrad = ctx.createRadialGradient(
      btnX - 6 * S,
      pressY - domeH * 0.55,
      1.5 * S,
      btnX,
      pressY - domeH * 0.2,
      btnRX * 1.2
    );
    btnGrad.addColorStop(0, '#ff7a66');
    btnGrad.addColorStop(0.28, '#ee2416');
    btnGrad.addColorStop(0.72, '#a81108');
    btnGrad.addColorStop(1, '#4d0603');

    ctx.fillStyle = btnGrad;
    ctx.beginPath();
    ctx.ellipse(btnX, pressY, btnRX, btnRY * 0.72, 0, 0, Math.PI);
    ctx.bezierCurveTo(
      btnX - btnRX,
      pressY - domeH * 1.15,
      btnX + btnRX,
      pressY - domeH * 1.15,
      btnX + btnRX,
      pressY
    );
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = `rgba(255, 215, 205, ${0.78 + nukeFlash * 0.22})`;
    ctx.beginPath();
    ctx.ellipse(btnX - 6.5 * S, pressY - domeH * 0.52, 4.2 * S, 2.3 * S, -0.42, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 160, 140, 0.55)';
    ctx.beginPath();
    ctx.arc(btnX + 8 * S, pressY - domeH * 0.25, 1.6 * S, 0, Math.PI * 2);
    ctx.fill();

    const ledX = -2 * S;
    const ledY = 19 * S;
    if (ledGlow > 0.05) {
      drawSoftDisc(
        ctx,
        ledX,
        ledY,
        15 * S * (0.8 + 0.4 * ledGlow),
        `rgba(255, 50, 25, ${0.85 * ledGlow})`,
        `rgba(220, 20, 10, ${0.35 * ledGlow})`,
        'rgba(0,0,0,0)'
      );
    }
    ctx.fillStyle = ledGlow > 0.2 ? '#ff3820' : '#bd2416';
    ctx.beginPath();
    ctx.arc(ledX, ledY, 3.8 * S, 0, Math.PI * 2);
    ctx.fill();
    if (ledGlow > 0.2) {
      ctx.fillStyle = '#ffaa99';
      ctx.beginPath();
      ctx.arc(ledX - 1 * S, ledY - 1 * S, 1.5 * S, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // =========================================================================
    // ITEM C: Tall Dark-Green Glass Liquor/Wine Bottle (Right of Table)
    // =========================================================================
    const botX = 116 * S;
    const botY = -12 * S;
    const botW = 62 * S;
    const botBodyH = 98 * S;
    const botShoulderH = 138 * S;
    const botTopH = 192 * S;
    const neckW = 19 * S;

    ctx.save();
    ctx.translate(botX, botY);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.beginPath();
    ctx.ellipse(0, 2 * S, botW * 0.54, 10 * S, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(-botW * 0.5, 0);
    ctx.lineTo(-botW * 0.5, -botBodyH);
    ctx.bezierCurveTo(
      -botW * 0.5,
      -botShoulderH,
      -neckW * 0.55,
      -botShoulderH + 8 * S,
      -neckW * 0.5,
      -botTopH
    );
    ctx.lineTo(neckW * 0.5, -botTopH);
    ctx.bezierCurveTo(
      neckW * 0.55,
      -botShoulderH + 8 * S,
      botW * 0.5,
      -botShoulderH,
      botW * 0.5,
      -botBodyH
    );
    ctx.lineTo(botW * 0.5, 0);
    ctx.ellipse(0, 0, botW * 0.5, 8 * S, 0, 0, Math.PI);
    ctx.closePath();

    const botGrad = ctx.createLinearGradient(-botW * 0.5, -botBodyH, botW * 0.5, 0);
    botGrad.addColorStop(0, '#141f10');
    botGrad.addColorStop(0.35, '#23351c');
    botGrad.addColorStop(0.75, '#1a2714');
    botGrad.addColorStop(1, '#0e160b');
    ctx.fillStyle = botGrad;
    ctx.fill();

    ctx.fillStyle = 'rgba(180, 195, 150, 0.52)';
    ctx.beginPath();
    ctx.ellipse(0, -botTopH, neckW * 0.54, 3.0 * S, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(235, 240, 205, 0.72)';
    ctx.lineWidth = 2.0 * S;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-neckW * 0.38, -botTopH + 14 * S);
    ctx.lineTo(-neckW * 0.44, -botShoulderH - 8 * S);
    ctx.stroke();

    ctx.fillStyle = '#f5f2ce';
    ctx.beginPath();
    ctx.ellipse(-botW * 0.34, -botBodyH - 12 * S, 2.2 * S, 3.8 * S, 0.25, 0, Math.PI * 2);
    ctx.fill();

    if (nukeFlash > 0.01) {
      ctx.save();
      ctx.globalAlpha = clamp(nukeFlash * 1.25, 0, 1);

      drawSoftDisc(
        ctx,
        -botW * 0.36,
        -botBodyH - 18 * S,
        32 * S,
        'rgba(255, 245, 170, 0.75)',
        'rgba(255, 175, 45, 0.28)',
        'rgba(0,0,0,0)'
      );

      ctx.strokeStyle = '#fff8c4';
      ctx.lineWidth = 4.2 * S;
      ctx.beginPath();
      ctx.moveTo(-botW * 0.44, -botBodyH + 4 * S);
      ctx.quadraticCurveTo(
        -botW * 0.42,
        -botBodyH - 22 * S,
        -neckW * 0.52,
        -botShoulderH - 4 * S
      );
      ctx.stroke();

      ctx.strokeStyle = '#ffe28a';
      ctx.lineWidth = 2.4 * S;
      ctx.beginPath();
      ctx.moveTo(-neckW * 0.42, -botShoulderH - 14 * S);
      ctx.lineTo(-neckW * 0.38, -botTopH + 8 * S);
      ctx.stroke();

      ctx.restore();
    }

    ctx.restore();
    ctx.restore();
  }

  // Draw the Volumetric Multi-Layered Boiling Mushroom Cloud & Blinding Atomic Flash
  function drawMegatonDetonation(ctx, w, h, S, nukeX, nukeBaseY, horizonY, detTime, flashIntensity) {
    if (detTime <= 0) return;

    ctx.save();

    const riseP = clamp(detTime / 4.2, 0, 1);
    const riseCurve = easeOutCubic(riseP);

    const earlyBoost = smoothstep(0.0, 0.65, detTime);
    const stemH = (85 * earlyBoost + 245 * riseCurve) * S;
    const capCY = nukeBaseY - stemH;
    const capRX = (64 * earlyBoost + 122 * riseCurve) * S;
    const capRY = (32 * earlyBoost + 54 * riseCurve) * S;
    const stemW = (28 * earlyBoost + 44 * riseCurve) * S;

    // 1. Atmospheric Sky & Horizon Flash Behind/Around Ground Zero (frame_028.jpg)
    if (flashIntensity > 0.01) {
      drawSoftDisc(
        ctx,
        nukeX,
        horizonY - 20 * S,
        390 * S,
        `rgba(255, 245, 165, ${0.86 * flashIntensity})`,
        `rgba(255, 175, 50, ${0.42 * flashIntensity})`,
        'rgba(255, 110, 15, 0)'
      );
    }

    // 2. Supersonic Ground Shockwave Dust Wave (Strictly foreshortened on the wasteland floor!)
    const shockP = clamp((detTime - 0.35) / 3.4, 0, 1);
    if (shockP > 0 && shockP < 1) {
      const sRX = lerp(110 * S, 640 * S, easeOutCubic(shockP));
      const sRY = lerp(10 * S, 24 * S, easeOutCubic(shockP));
      const sAlpha = Math.pow(1 - shockP, 1.5) * 0.48;

      ctx.save();
      ctx.translate(nukeX, nukeBaseY + 14 * S);
      ctx.scale(1, sRY / sRX);
      const waveGrad = ctx.createRadialGradient(0, 0, sRX * 0.72, 0, 0, sRX);
      waveGrad.addColorStop(0, 'rgba(185, 172, 122, 0)');
      waveGrad.addColorStop(0.65, `rgba(215, 198, 142, ${sAlpha})`);
      waveGrad.addColorStop(1, 'rgba(185, 172, 122, 0)');
      ctx.fillStyle = waveGrad;
      ctx.beginPath();
      ctx.arc(0, 0, sRX, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 3. Churning Base Pedestal Dust Cushion & Residual Ember Glow (frame_029.jpg, frame_030.jpg)
    const emberGlow = clamp(1 - (detTime - 0.5) / 3.4, 0, 1);
    const baseSpreadX = (95 * earlyBoost + 118 * riseCurve) * S;
    const baseSpreadY = (20 * earlyBoost + 24 * riseCurve) * S;

    ctx.save();
    ctx.translate(nukeX, nukeBaseY + 4 * S);
    ctx.scale(1, 0.28);
    if (emberGlow > 0.02) {
      drawSoftDisc(
        ctx,
        0,
        0,
        baseSpreadX * 1.22,
        `rgba(255, 205, 105, ${0.88 * emberGlow})`,
        `rgba(225, 120, 35, ${0.46 * emberGlow})`,
        'rgba(120, 50, 12, 0)'
      );
    }
    drawSoftDisc(
      ctx,
      0,
      0,
      baseSpreadX * 1.12,
      'rgba(118, 112, 86, 0.68)',
      'rgba(88, 84, 64, 0.38)',
      'rgba(60, 58, 44, 0)'
    );
    ctx.restore();

    for (const bp of baseDustPuffs) {
      const boilX = Math.sin(detTime * 1.4 + bp.phase) * 4 * S;
      const px = nukeX + bp.sx * baseSpreadX + boilX;
      const py = nukeBaseY + bp.sy * baseSpreadY;
      const pr = bp.r * (58 * S) * (0.65 + 0.35 * riseCurve);

      const fireTint = emberGlow * (1 - Math.abs(bp.sx) * 0.55);
      const rCol = Math.round(lerp(106, 225, fireTint));
      const gCol = Math.round(lerp(100, 152, fireTint));
      const bCol = Math.round(lerp(78, 76, fireTint));

      drawSoftDisc(
        ctx,
        px,
        py,
        pr,
        `rgba(${rCol}, ${gCol}, ${bCol}, 0.34)`,
        `rgba(${Math.round(rCol * 0.85)}, ${Math.round(gCol * 0.85)}, ${Math.round(bCol * 0.85)}, 0.16)`,
        'rgba(60, 58, 44, 0)'
      );
    }

    // 4. Unified Feathered Volumetric Stem Core + Soft Boiling Column Puffs (zero rectangular seams!)
    ctx.save();
    const stemMidY = (nukeBaseY + capCY + capRY * 0.2) * 0.5;
    ctx.translate(nukeX, stemMidY);
    ctx.scale(1, (stemH * 0.62) / stemW);
    drawSoftDisc(
      ctx,
      0,
      0,
      stemW * 1.18,
      'rgba(82, 78, 60, 0.88)',
      'rgba(68, 65, 50, 0.58)',
      'rgba(52, 50, 38, 0)'
    );
    ctx.restore();

    for (const sp of stemPuffs) {
      const y = lerp(nukeBaseY, capCY + capRY * 0.25, sp.frac);
      const waist = 1 - Math.sin(sp.frac * Math.PI) * 0.22;
      const turbX = Math.sin(detTime * 1.8 - sp.frac * 4.5 + sp.phase) * 3.5 * S;
      const x = nukeX + sp.ox * stemW * waist + turbX;
      const r = sp.r * stemW * (0.88 + 0.22 * waist);

      const fireMix = emberGlow * Math.pow(1 - sp.frac, 1.5) * (0.45 + 0.55 * flashIntensity);
      const lightBias = clamp(0.52 - sp.ox * 0.55, 0, 1);

      const baseR = lerp(64, 114, lightBias);
      const baseG = lerp(60, 108, lightBias);
      const baseB = lerp(46, 84, lightBias);

      const cr = Math.round(lerp(baseR, 255, fireMix));
      const cg = Math.round(lerp(baseG, 182, fireMix));
      const cb = Math.round(lerp(baseB, 72, fireMix));

      drawSoftDisc(
        ctx,
        x,
        y,
        r,
        `rgba(${cr}, ${cg}, ${cb}, 0.48)`,
        `rgba(${Math.round(cr * 0.86)}, ${Math.round(cg * 0.86)}, ${Math.round(cb * 0.84)}, 0.24)`,
        'rgba(48, 45, 35, 0)'
      );
    }

    // 5. Incandescent Ground Fireball & Volumetric Twin Plasma Columns during Flash Phase (frame_028.jpg!)
    if (flashIntensity > 0.02) {
      const jetH = stemH * 0.62;
      for (const jOffset of [-0.34, 0.36]) {
        const jx = nukeX + jOffset * stemW;
        ctx.save();
        ctx.translate(jx, nukeBaseY - jetH * 0.45);
        ctx.scale(0.32, 1.25);
        drawSoftDisc(
          ctx,
          0,
          0,
          jetH * 0.75,
          `rgba(255, 255, 245, ${0.98 * flashIntensity})`,
          `rgba(255, 225, 110, ${0.75 * flashIntensity})`,
          'rgba(255, 140, 20, 0)'
        );
        ctx.restore();
      }

      const fbRX = 185 * S * (0.75 + 0.25 * flashIntensity);
      const fbRY = 46 * S * (0.75 + 0.25 * flashIntensity);

      ctx.save();
      ctx.translate(nukeX, nukeBaseY + 6 * S);
      ctx.scale(1, fbRY / fbRX);
      drawSoftDisc(
        ctx,
        0,
        0,
        fbRX * 1.45,
        `rgba(255, 255, 245, ${0.98 * flashIntensity})`,
        `rgba(255, 195, 55, ${0.85 * flashIntensity})`,
        'rgba(255, 95, 0, 0)'
      );
      drawSoftDisc(
        ctx,
        0,
        0,
        fbRX * 0.85,
        `rgba(255, 255, 255, ${flashIntensity})`,
        `rgba(255, 245, 165, ${0.92 * flashIntensity})`,
        'rgba(255, 170, 30, 0)'
      );
      ctx.restore();
    }

    // 6. Volumetric Toroidal Mushroom Cloud Cap (Cohesive 3D Core + Soft Cauliflower Rim Lobes)
    ctx.save();
    ctx.translate(nukeX, capCY);
    ctx.scale(1, capRY / capRX);
    drawSoftDisc(
      ctx,
      0,
      0,
      capRX * 1.08,
      'rgba(62, 58, 45, 0.94)',
      'rgba(74, 70, 54, 0.78)',
      'rgba(55, 52, 40, 0)'
    );
    ctx.restore();

    for (const lobe of capRimLobes) {
      const boilX = Math.cos(detTime * 1.3 + lobe.phase) * 3.5 * S;
      const boilY = Math.sin(detTime * 1.3 + lobe.phase) * 2.8 * S;
      const lx = nukeX + lobe.ox * capRX + boilX;
      const ly = capCY + lobe.oy * capRY + boilY;
      const lr = lobe.r * capRX * 0.54;

      const isUnder = clamp(lobe.oy + 0.25, 0, 1);
      const underFire = isUnder * (flashIntensity * 0.78 + emberGlow * 0.26);

      let rCol = lerp(58, 128, lobe.shade);
      let gCol = lerp(55, 122, lobe.shade);
      let bCol = lerp(43, 96, lobe.shade);

      rCol = Math.round(lerp(rCol, 255, underFire));
      gCol = Math.round(lerp(gCol, 188, underFire));
      bCol = Math.round(lerp(bCol, 82, underFire));

      drawSoftDisc(
        ctx,
        lx,
        ly,
        lr,
        `rgba(${rCol}, ${gCol}, ${bCol}, 0.56)`,
        `rgba(${Math.round(rCol * 0.88)}, ${Math.round(gCol * 0.88)}, ${Math.round(bCol * 0.86)}, 0.28)`,
        `rgba(${Math.round(rCol * 0.75)}, ${Math.round(gCol * 0.75)}, ${Math.round(bCol * 0.75)}, 0)`
      );
    }

    for (const lobe of capInnerLobes) {
      const boilX = Math.sin(detTime * 1.5 + lobe.phase) * 3.0 * S;
      const boilY = Math.cos(detTime * 1.4 + lobe.phase) * 2.5 * S;
      const lx = nukeX + lobe.ox * capRX + boilX;
      const ly = capCY + lobe.oy * capRY + boilY;
      const lr = lobe.r * capRX * 0.52;

      const isUnder = clamp(lobe.oy + 0.3, 0, 1);
      const underFire = isUnder * (flashIntensity * 0.72 + emberGlow * 0.22);

      let rCol = lerp(54, 118, lobe.shade);
      let gCol = lerp(51, 112, lobe.shade);
      let bCol = lerp(39, 88, lobe.shade);

      rCol = Math.round(lerp(rCol, 255, underFire));
      gCol = Math.round(lerp(gCol, 185, underFire));
      bCol = Math.round(lerp(bCol, 80, underFire));

      drawSoftDisc(
        ctx,
        lx,
        ly,
        lr,
        `rgba(${rCol}, ${gCol}, ${bCol}, 0.36)`,
        `rgba(${Math.round(rCol * 0.9)}, ${Math.round(gCol * 0.9)}, ${Math.round(bCol * 0.88)}, 0.18)`,
        'rgba(50, 48, 36, 0)'
      );
    }

    ctx.save();
    ctx.translate(nukeX, capCY - capRY * 0.58);
    ctx.scale(1, 0.34);
    drawSoftDisc(
      ctx,
      0,
      0,
      capRX * 0.88,
      'rgba(168, 162, 132, 0.42)',
      'rgba(135, 128, 102, 0.18)',
      'rgba(105, 100, 78, 0)'
    );
    ctx.restore();

    if (emberGlow > 0.05 || flashIntensity > 0.05) {
      const collarGlow = clamp(flashIntensity * 0.88 + emberGlow * 0.34, 0, 1);
      ctx.save();
      ctx.translate(nukeX, capCY + capRY * 0.62);
      ctx.scale(1, 0.35);
      drawSoftDisc(
        ctx,
        0,
        0,
        capRX * 0.72,
        `rgba(255, 210, 110, ${0.62 * collarGlow})`,
        `rgba(230, 130, 40, ${0.25 * collarGlow})`,
        'rgba(0,0,0,0)'
      );
      ctx.restore();
    }

    ctx.restore();
  }

  function drawScene(ctx, w, h, t) {
    // 8.0-second seamless loop as specified in the Technical Contract
    const localT = ((t % 8.0) + 8.0) % 8.0;
    const S = Math.min(w / 1280, h / 720);

    // =========================================================================
    // 1. CAMERA CHOREOGRAPHY & TIMING (0.0s -> 8.0s)
    // =========================================================================
    const buttonPress = smootherstep(1.22, 1.38, localT) * (1 - 0.35 * smootherstep(1.55, 1.85, localT));
    const ledGlow = smootherstep(1.24, 1.34, localT);

    const mainPitchUp = smootherstep(1.65, 3.10, localT);
    const aweTiltUp = smootherstep(3.10, 6.60, localT);
    const pitchProgress = 0.74 * mainPitchUp + 0.26 * aweTiltUp;

    const detTime = Math.max(0, localT - 2.12);
    const flashRise = smootherstep(2.12, 2.52, localT);
    const flashDecay = 1 - smootherstep(2.85, 4.25, localT);
    const flashIntensity = flashRise * flashDecay;

    const shockHit = smootherstep(4.85, 5.15, localT) * (1 - smootherstep(5.15, 7.35, localT));
    const shakeX = (Math.sin(localT * 62) * 7.5 + Math.cos(localT * 113) * 3.5) * shockHit * S;
    const shakeY = (Math.cos(localT * 54) * 6.5 + Math.sin(localT * 97) * 3.0) * shockHit * S;
    const shakeRoll = Math.sin(localT * 41) * 0.006 * shockHit;

    ctx.save();
    ctx.translate(w * 0.5 + shakeX, h * 0.5 + shakeY);
    ctx.rotate(shakeRoll);
    ctx.translate(-w * 0.5, -h * 0.5);

    const horizonY = lerp(-0.34 * h, 0.680 * h, pitchProgress);
    const railYLeft = lerp(0.148 * h, 0.875 * h, pitchProgress);
    const railYRight = lerp(0.075 * h, 0.858 * h, pitchProgress);
    const ledgeOffset = 315 * S * (1 - pitchProgress * 0.72);
    const ledgeYLeft = railYLeft + ledgeOffset;
    const ledgeYRight = railYRight + ledgeOffset * 0.86;

    // =========================================================================
    // 2. CAPITOL WASTELAND SKY, STRATIFIED CLOUDS & LOW HORIZON SUN
    // =========================================================================
    if (horizonY > -0.25 * h) {
      const skyGrad = ctx.createLinearGradient(0, 0, 0, Math.max(h * 0.2, horizonY));
      const f = flashIntensity * 0.35;
      skyGrad.addColorStop(0.0, `rgb(${Math.round(30 + f * 70)}, ${Math.round(35 + f * 65)}, ${Math.round(24 + f * 35)})`);
      skyGrad.addColorStop(0.42, `rgb(${Math.round(66 + f * 95)}, ${Math.round(72 + f * 85)}, ${Math.round(48 + f * 45)})`);
      skyGrad.addColorStop(0.76, `rgb(${Math.round(122 + f * 105)}, ${Math.round(124 + f * 95)}, ${Math.round(82 + f * 55)})`);
      skyGrad.addColorStop(1.0, `rgb(${Math.round(198 + f * 55)}, ${Math.round(188 + f * 62)}, ${Math.round(124 + f * 75)})`);
      ctx.fillStyle = skyGrad;
      ctx.fillRect(-20, -20, w + 40, Math.max(0, horizonY + 12 * S) + 20);

      const cloudBands = [
        { x: 0.22, yOff: -0.28, rx: 0.26, ry: 0.022, a: 0.36 },
        { x: 0.72, yOff: -0.23, rx: 0.28, ry: 0.026, a: 0.42 },
        { x: 0.18, yOff: -0.15, rx: 0.22, ry: 0.018, a: 0.32 },
        { x: 0.78, yOff: -0.14, rx: 0.25, ry: 0.020, a: 0.38 },
        { x: 0.48, yOff: -0.34, rx: 0.32, ry: 0.024, a: 0.28 }
      ];
      for (const cb of cloudBands) {
        const cy = horizonY + cb.yOff * h;
        if (cy > -40 && cy < horizonY) {
          ctx.save();
          ctx.translate(cb.x * w, cy);
          ctx.scale(1, cb.ry / cb.rx);
          drawSoftDisc(
            ctx,
            0,
            0,
            cb.rx * w,
            `rgba(62, 66, 44, ${cb.a})`,
            `rgba(74, 78, 52, ${cb.a * 0.5})`,
            'rgba(74, 78, 52, 0)'
          );
          ctx.restore();
        }
      }

      const sunX = w * 0.015;
      const sunY = horizonY - 12 * S;
      const sunRadius = lerp(135 * S, 340 * S, flashIntensity);
      drawSoftDisc(
        ctx,
        sunX,
        sunY,
        sunRadius,
        `rgba(255, 255, 230, ${0.88 + 0.12 * flashIntensity})`,
        `rgba(255, 232, 138, ${0.52 + 0.38 * flashIntensity})`,
        'rgba(210, 190, 110, 0)'
      );
      if (flashIntensity > 0.05) {
        ctx.save();
        ctx.translate(w * 0.08, horizonY - 18 * S);
        ctx.scale(2.2, 0.55);
        drawSoftDisc(
          ctx,
          0,
          0,
          185 * S,
          `rgba(255, 255, 240, ${0.95 * flashIntensity})`,
          `rgba(255, 230, 125, ${0.65 * flashIntensity})`,
          'rgba(255, 180, 60, 0)'
        );
        ctx.restore();
      }
    }

    // =========================================================================
    // 3. WASTELAND GROUND TERRAIN & DISTANT D.C. SKYLINE SILHOUETTE
    // =========================================================================
    const groundTopY = Math.max(-20, horizonY - 2 * S);
    const groundGrad = ctx.createLinearGradient(0, horizonY, 0, h);
    groundGrad.addColorStop(0.0, '#2a2c1e');
    groundGrad.addColorStop(0.22, '#3d3c28');
    groundGrad.addColorStop(0.55, '#46432c');
    groundGrad.addColorStop(1.0, '#262519');
    ctx.fillStyle = groundGrad;
    ctx.fillRect(-20, groundTopY, w + 40, h - groundTopY + 40);

    if (horizonY > -40) {
      const skySilColor = '#23261a';
      ctx.fillStyle = skySilColor;

      ctx.beginPath();
      ctx.moveTo(-10, horizonY + 18 * S);
      ctx.lineTo(-10, horizonY - 3 * S);
      ctx.quadraticCurveTo(w * 0.15, horizonY + 2 * S, w * 0.35, horizonY - 1 * S);
      ctx.quadraticCurveTo(w * 0.55, horizonY + 3 * S, w * 0.72, horizonY - 2 * S);
      ctx.quadraticCurveTo(w * 0.88, horizonY - 4 * S, w + 10, horizonY + 1 * S);
      ctx.lineTo(w + 10, horizonY + 18 * S);
      ctx.closePath();
      ctx.fill();

      for (const b of skylineBlocks) {
        const bx = b.x * w;
        const bw = b.w * w;
        const bh = b.h * h;
        const by = horizonY - bh;
        ctx.fillStyle = skySilColor;
        ctx.fillRect(bx, by, bw, bh + 4 * S);

        if (b.jag) {
          ctx.beginPath();
          ctx.moveTo(bx, by);
          ctx.lineTo(bx + bw * 0.35, by - 4 * S);
          ctx.lineTo(bx + bw * 0.65, by);
          ctx.closePath();
          ctx.fill();
        }
      }

      // Landmark 1: Shattered U.S. Capitol Dome Silhouette at x = 0.308 * w
      const capDomeX = w * 0.308;
      const capDomeR = 22 * S;
      ctx.fillStyle = skySilColor;
      ctx.fillRect(capDomeX - capDomeR * 1.15, horizonY - 10 * S, capDomeR * 2.3, 12 * S);
      ctx.beginPath();
      ctx.arc(capDomeX, horizonY - 8 * S, capDomeR, Math.PI, 0);
      ctx.closePath();
      ctx.fill();
      ctx.fillRect(capDomeX - 2.5 * S, horizonY - 8 * S - capDomeR - 5 * S, 5 * S, 6 * S);

      // Landmark 2: Tall Washington Monument Obelisk at x = 0.602 * w
      const monX = w * 0.602;
      const monH = 44 * S;
      const monW = 4.6 * S;
      ctx.beginPath();
      ctx.moveTo(monX - monW * 0.6, horizonY + 2 * S);
      ctx.lineTo(monX - monW * 0.38, horizonY - monH + 5 * S);
      ctx.lineTo(monX, horizonY - monH);
      ctx.lineTo(monX + monW * 0.38, horizonY - monH + 5 * S);
      ctx.lineTo(monX + monW * 0.6, horizonY + 2 * S);
      ctx.closePath();
      ctx.fill();
    }

    // =========================================================================
    // 4. WASTELAND MIDGROUND: ELEVATED PIPELINE, COLLAPSED OVERPASS & DEAD TREES
    // =========================================================================
    const ridgeY = horizonY + 85 * S;
    const ridgeGrad = ctx.createLinearGradient(0, horizonY + 15 * S, 0, ridgeY + 110 * S);
    ridgeGrad.addColorStop(0, 'rgba(78, 74, 48, 0.55)');
    ridgeGrad.addColorStop(0.5, 'rgba(62, 59, 38, 0.75)');
    ridgeGrad.addColorStop(1, 'rgba(38, 36, 24, 0.85)');
    ctx.fillStyle = ridgeGrad;
    ctx.beginPath();
    ctx.moveTo(-20, horizonY + 55 * S);
    ctx.quadraticCurveTo(w * 0.25, horizonY + 42 * S, w * 0.52, horizonY + 62 * S);
    ctx.quadraticCurveTo(w * 0.76, horizonY + 38 * S, w + 20, horizonY + 58 * S);
    ctx.lineTo(w + 20, h);
    ctx.lineTo(-20, h);
    ctx.closePath();
    ctx.fill();

    // Left Wasteland Ruined Viaduct / Aqueduct Pipeline on Support Stanchions
    const pipeX0 = w * 0.02;
    const pipeY0 = horizonY + 95 * S;
    const pipeX1 = w * 0.372;
    const pipeY1 = horizonY + 68 * S;

    ctx.strokeStyle = '#25261a';
    ctx.lineWidth = 4.5 * S;
    ctx.beginPath();
    ctx.moveTo(pipeX0, pipeY0);
    ctx.lineTo(pipeX1, pipeY1);
    ctx.stroke();

    ctx.lineWidth = 2.4 * S;
    for (let i = 0; i <= 6; i++) {
      const f = i / 6;
      const px = lerp(pipeX0 + 25 * S, pipeX1, f);
      const py = lerp(pipeY0, pipeY1, f);
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px, py + (22 - f * 6) * S);
      ctx.stroke();
    }
    ctx.fillStyle = '#28291c';
    ctx.beginPath();
    ctx.moveTo(pipeX1 + 6 * S, pipeY1 + 18 * S);
    ctx.lineTo(pipeX1 + 28 * S, pipeY1 + 12 * S);
    ctx.lineTo(pipeX1 + 33 * S, pipeY1 + 25 * S);
    ctx.lineTo(pipeX1 + 4 * S, pipeY1 + 28 * S);
    ctx.closePath();
    ctx.fill();

    // Right Wasteland Collapsed Highway Overpass Ramp
    const rampX0 = w * 0.772;
    const rampY0 = horizonY + 108 * S;
    const rampX1 = w * 0.865;
    const rampY1 = horizonY + 46 * S;

    ctx.strokeStyle = '#1e2016';
    ctx.lineWidth = 3.2 * S;
    for (const pf of [0.38, 0.68, 0.88]) {
      const px = lerp(rampX0, rampX1, pf);
      const py = lerp(rampY0, rampY1, pf);
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px, rampY0 + 4 * S);
      ctx.stroke();
    }

    ctx.fillStyle = '#25261b';
    ctx.beginPath();
    ctx.moveTo(rampX0, rampY0);
    ctx.lineTo(rampX1, rampY1);
    ctx.lineTo(rampX1 + 8 * S, rampY1 + 10 * S);
    ctx.lineTo(rampX0 + 18 * S, rampY0 + 6 * S);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = `rgba(115, 112, 78, ${0.45 + flashIntensity * 0.45})`;
    ctx.lineWidth = 2 * S;
    ctx.beginPath();
    ctx.moveTo(rampX0, rampY0);
    ctx.lineTo(rampX1, rampY1);
    ctx.stroke();

    // =========================================================================
    // 5. MEGATON NUCLEAR DETONATION & MULTI-LAYERED VOLUMETRIC MUSHROOM CLOUD
    // =========================================================================
    const nukeX = w * 0.520;
    const nukeBaseY = horizonY + 26 * S;
    drawMegatonDetonation(ctx, w, h, S, nukeX, nukeBaseY, horizonY, detTime, flashIntensity);

    // =========================================================================
    // 6. FOREGROUND WASTELAND MOUND & SCATTERED DEAD TREES (Seen Above & Through Railing!)
    // =========================================================================
    ctx.fillStyle = '#333120';
    ctx.beginPath();
    ctx.moveTo(-20, horizonY + 135 * S);
    ctx.quadraticCurveTo(w * 0.25, horizonY + 128 * S, w * 0.42, horizonY + 102 * S);
    ctx.quadraticCurveTo(w * 0.58, horizonY + 78 * S, w * 0.76, horizonY + 112 * S);
    ctx.quadraticCurveTo(w * 0.90, horizonY + 132 * S, w + 20, horizonY + 126 * S);
    ctx.lineTo(w + 20, h + 40);
    ctx.lineTo(-20, h + 40);
    ctx.closePath();
    ctx.fill();

    const shockWaveRadiusNorm = clamp((detTime - 0.35) / 3.2, 0, 1.5);
    for (const tree of wastelandTrees) {
      const tx = tree.x * w;
      const ty = horizonY + (24 + tree.d * 185) * S;
      // Allow closer wasteland trees to be visible between the balcony railing posts down to ledgeY!
      if (ty > -30 && ty < ledgeYLeft + 25 * S) {
        const distFromNuke = Math.hypot(tree.x - 0.52, tree.d * 0.45);
        const waveDelta = shockWaveRadiusNorm - distFromNuke;
        const treeWind = (waveDelta > 0 && waveDelta < 0.45)
          ? Math.sin((waveDelta / 0.45) * Math.PI) * (tree.x < 0.52 ? -0.22 : 0.22)
          : 0;
        drawDeadTree(ctx, tx, ty, tree.s * S, tree.tilt, tree.type, treeWind);
      }
    }

    // =========================================================================
    // 7. TENPENNY TOWER BALCONY FLOOR, SEMI-REFLECTIVE BALUSTRADE & IRON RAILING
    // =========================================================================
    // Semi-transparent smoky balustrade panel between railY and ledgeY (lets wasteland trees show through
    // in frame_027/028/030 while catching sky & mushroom stem reflections in frame_029!)
    const parapetGrad = ctx.createLinearGradient(0, railYRight, 0, Math.max(railYLeft + 10, ledgeYLeft));
    parapetGrad.addColorStop(0, 'rgba(38, 36, 25, 0.38)');
    parapetGrad.addColorStop(0.6, 'rgba(50, 47, 32, 0.45)');
    parapetGrad.addColorStop(1, 'rgba(30, 28, 19, 0.52)');
    ctx.fillStyle = parapetGrad;
    ctx.beginPath();
    ctx.moveTo(-20, railYLeft);
    ctx.lineTo(w + 20, railYRight);
    ctx.lineTo(w + 20, h + 40);
    ctx.lineTo(-20, h + 40);
    ctx.closePath();
    ctx.fill();

    // Smooth, seamless reflection of the bright sky & dark mushroom column on the balcony panel (frame_029.jpg!)
    if (pitchProgress > 0.45 && detTime > 0.2) {
      const reflAlpha = smoothstep(0.45, 0.85, pitchProgress) * (1 - 0.55 * smoothstep(5.4, 6.8, localT)) * 0.46;
      ctx.save();
      ctx.globalAlpha = reflAlpha;

      const skyReflH = ctx.createLinearGradient(w * 0.15, 0, w * 0.85, 0);
      skyReflH.addColorStop(0.0, 'rgba(135, 142, 102, 0)');
      skyReflH.addColorStop(0.28, 'rgba(148, 155, 112, 0.52)');
      skyReflH.addColorStop(0.50, 'rgba(36, 35, 25, 0.72)');
      skyReflH.addColorStop(0.72, 'rgba(148, 155, 112, 0.52)');
      skyReflH.addColorStop(1.0, 'rgba(135, 142, 102, 0)');
      ctx.fillStyle = skyReflH;
      ctx.fillRect(0, railYRight, w, h - railYRight);

      ctx.restore();
    }

    // Opaque Concrete Balcony Floor Slab (from ledgeY down to bottom of screen, where the table & posts stand!)
    if (ledgeYRight < h + 20) {
      const floorGrad = ctx.createLinearGradient(0, ledgeYRight, 0, h);
      floorGrad.addColorStop(0, '#2e2b1d');
      floorGrad.addColorStop(0.4, '#211f15');
      floorGrad.addColorStop(1, '#14130d');
      ctx.fillStyle = floorGrad;
      ctx.beginPath();
      ctx.moveTo(-20, ledgeYLeft);
      ctx.lineTo(w + 20, ledgeYRight);
      ctx.lineTo(w + 20, h + 40);
      ctx.lineTo(-20, h + 40);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = 'rgba(110, 102, 72, 0.42)';
      ctx.lineWidth = 3.5 * S;
      ctx.beginPath();
      ctx.moveTo(-20, ledgeYLeft);
      ctx.lineTo(w + 20, ledgeYRight);
      ctx.stroke();
    }

    const postXNorms = [0.165, 0.372, 0.578, 0.785, 0.962];
    const postHeight = lerp(245 * S, 185 * S, pitchProgress);

    for (const pxNorm of postXNorms) {
      const panShift = (1 - pitchProgress) * 58 * S;
      const px = pxNorm * w + panShift;
      const pyTop = lerp(railYLeft, railYRight, px / w);
      const pyBot = pyTop + postHeight;

      const postW = 18 * S;
      const postGrad = ctx.createLinearGradient(px - postW * 0.5, 0, px + postW * 0.5, 0);
      postGrad.addColorStop(0, '#0c0d09');
      postGrad.addColorStop(0.35, '#1c1d14');
      postGrad.addColorStop(1, '#090a07');
      ctx.fillStyle = postGrad;
      ctx.fillRect(px - postW * 0.5, pyTop + 8 * S, postW, pyBot - pyTop);
    }

    const railThickness = 26 * S;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(-20, railYLeft - railThickness * 0.5);
    ctx.lineTo(w + 20, railYRight - railThickness * 0.5);
    ctx.lineTo(w + 20, railYRight + railThickness * 0.5);
    ctx.lineTo(-20, railYLeft + railThickness * 0.5);
    ctx.closePath();

    const railGrad = ctx.createLinearGradient(0, railYRight - railThickness * 0.5, 0, railYLeft + railThickness * 0.5);
    railGrad.addColorStop(0, '#222419');
    railGrad.addColorStop(0.3, '#181a12');
    railGrad.addColorStop(0.65, '#0d0e0a');
    railGrad.addColorStop(1, '#1c1d14');
    ctx.fillStyle = railGrad;
    ctx.fill();

    ctx.strokeStyle = '#070805';
    ctx.lineWidth = 3.5 * S;
    ctx.beginPath();
    ctx.moveTo(-20, railYLeft + 2 * S);
    ctx.lineTo(w + 20, railYRight + 2 * S);
    ctx.stroke();

    const railSpecAlpha = 0.25 + flashIntensity * 0.55;
    ctx.strokeStyle = flashIntensity > 0.05
      ? `rgba(255, 210, 115, ${railSpecAlpha})`
      : `rgba(110, 115, 82, ${railSpecAlpha})`;
    ctx.lineWidth = 2.0 * S;
    ctx.beginPath();
    ctx.moveTo(-20, railYLeft - railThickness * 0.42);
    ctx.lineTo(w + 20, railYRight - railThickness * 0.42);
    ctx.stroke();
    ctx.restore();

    // =========================================================================
    // 8. FOREGROUND ROUND PATIO TABLE (Detonator Box, Whiskey Glass & Bottle)
    // =========================================================================
    const tableCX = lerp(w * 0.642, w * 0.845, mainPitchUp) + aweTiltUp * 28 * S;
    const tableCY = lerp(h * 0.568, h * 0.918, mainPitchUp) + aweTiltUp * 235 * S;
    const tableScale = S * lerp(1.0, 0.72, mainPitchUp);

    if (tableCY - 220 * tableScale < h + 40) {
      drawBalconyTable(ctx, tableCX, tableCY, tableScale, buttonPress, ledGlow, flashIntensity, shockHit);
    }

    // =========================================================================
    // 9. ATMOSPHERIC FALLOUT ASH PARTICLES, SHOCKWAVE DUST & CINEMATIC GRADING
    // =========================================================================
    for (const p of ashParticles) {
      const windSpeed = p.speedX * (1 + shockHit * 4.5);
      const px = ((p.x + localT * windSpeed) % 1.0) * w;
      const py = ((p.y + localT * p.speedY + Math.sin(localT * 2 + p.phase) * 0.01) % 1.0) * h;
      const isEmber = detTime > 0.3 && p.phase > 4.2;

      ctx.fillStyle = isEmber
        ? `rgba(255, 195, 95, ${p.alpha * (0.5 + 0.5 * flashIntensity + shockHit * 0.5)})`
        : `rgba(175, 180, 135, ${p.alpha * (0.45 + shockHit * 0.45)})`;
      ctx.beginPath();
      ctx.arc(px, py, p.size * S, 0, Math.PI * 2);
      ctx.fill();
    }

    if (flashIntensity > 0.01) {
      ctx.fillStyle = `rgba(255, 225, 130, ${flashIntensity * 0.12})`;
      ctx.fillRect(0, 0, w, h);
    }

    const vig = ctx.createRadialGradient(w * 0.5, h * 0.5, Math.min(w, h) * 0.35, w * 0.5, h * 0.5, Math.max(w, h) * 0.75);
    vig.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vig.addColorStop(0.7, 'rgba(18, 20, 12, 0.18)');
    vig.addColorStop(1, 'rgba(8, 9, 5, 0.62)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, w, h);

    ctx.restore();
  }

  window.GAMES[6] = {
    title: 'Fallout 3',
    year: '2008',
    draw: drawScene
  };

  window.GameAnimations.game7 = drawScene;
})();
