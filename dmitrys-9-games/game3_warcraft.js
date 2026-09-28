// ============================================================================
// GAME 3: WARCRAFT: ORCS & HUMANS (1994) — Specialist RTS Pixel-Art Engine
// Renders an authentic 320x180 VGA pixel-art settlement, Peasant/Footman/Orc
// RTS choreography, flaming Catapult/Daemon fireball barrage, checkerboard-
// dithered explosion spheres, scorched craters, and Town Hall collapse.
// ============================================================================

window.GAMES = window.GAMES || [];

(function () {
  const GW = 320;
  const GH = 180;

  let bufCanvas = null;
  let bufCtx = null;
  let frameImgData = null;
  let framePixels = null; // Uint8ClampedArray (GW * GH * 4)
  let basePixels = null;  // Uint8ClampedArray (GW * GH * 4)

  // Deterministic PRNG
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0;
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function hash2i(x, y) {
    let h = (x * 374761393 + y * 668265263) ^ 0x5bd1e995;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }

  function valueNoise(x, y, scale) {
    const sx = x / scale;
    const sy = y / scale;
    const ix = Math.floor(sx);
    const iy = Math.floor(sy);
    const fx = sx - ix;
    const fy = sy - iy;
    const u = fx * fx * (3 - 2 * fx);
    const v = fy * fy * (3 - 2 * fy);
    const n00 = hash2i(ix, iy);
    const n10 = hash2i(ix + 1, iy);
    const n01 = hash2i(ix, iy + 1);
    const n11 = hash2i(ix + 1, iy + 1);
    return (n00 * (1 - u) + n10 * u) * (1 - v) + (n01 * (1 - u) + n11 * u) * v;
  }

  // Pixel-art buffer helpers
  function pset(buf, x, y, r, g, b) {
    x |= 0;
    y |= 0;
    if (x < 0 || x >= GW || y < 0 || y >= GH) return;
    const idx = (y * GW + x) << 2;
    buf[idx] = r;
    buf[idx + 1] = g;
    buf[idx + 2] = b;
    buf[idx + 3] = 255;
  }

  function pblend(buf, x, y, r, g, b, a) {
    x |= 0;
    y |= 0;
    if (x < 0 || x >= GW || y < 0 || y >= GH || a <= 0) return;
    const idx = (y * GW + x) << 2;
    if (a >= 1) {
      buf[idx] = r;
      buf[idx + 1] = g;
      buf[idx + 2] = b;
      buf[idx + 3] = 255;
      return;
    }
    const inv = 1 - a;
    buf[idx] = (buf[idx] * inv + r * a) | 0;
    buf[idx + 1] = (buf[idx + 1] * inv + g * a) | 0;
    buf[idx + 2] = (buf[idx + 2] * inv + b * a) | 0;
  }

  function padd(buf, x, y, r, g, b, a) {
    x |= 0;
    y |= 0;
    if (x < 0 || x >= GW || y < 0 || y >= GH || a <= 0) return;
    const idx = (y * GW + x) << 2;
    buf[idx] = Math.min(255, (buf[idx] + r * a) | 0);
    buf[idx + 1] = Math.min(255, (buf[idx + 1] + g * a) | 0);
    buf[idx + 2] = Math.min(255, (buf[idx + 2] + b * a) | 0);
  }

  function fillRect(buf, x0, y0, w, h, r, g, b) {
    const xStart = Math.max(0, x0 | 0);
    const yStart = Math.max(0, y0 | 0);
    const xEnd = Math.min(GW, (x0 + w) | 0);
    const yEnd = Math.min(GH, (y0 + h) | 0);
    for (let y = yStart; y < yEnd; y++) {
      let idx = (y * GW + xStart) << 2;
      for (let x = xStart; x < xEnd; x++) {
        buf[idx] = r;
        buf[idx + 1] = g;
        buf[idx + 2] = b;
        buf[idx + 3] = 255;
        idx += 4;
      }
    }
  }

  // Road centerline across the 320x180 village
  function roadCenterY(x) {
    if (x < 55) {
      const t = x / 55;
      return 107 + Math.sin(t * Math.PI * 0.65) * 8.5;
    } else if (x < 150) {
      const t = (x - 55) / 95;
      const s = t * t * (3 - 2 * t);
      return 114.5 - s * 29.0;
    } else if (x < 194) {
      return 85.5 + ((x - 150) / 44) * 2.0;
    } else if (x < 266) {
      const t = (x - 194) / 72;
      const s = t * t * (3 - 2 * t);
      return 87.5 + s * 16.5;
    } else {
      const t = (x - 266) / 54;
      return 104.0 - t * 8.5;
    }
  }

  // Draw an authentic 1994 Warcraft multi-lobed foliage tree canopy
  function drawTreeCanopy(buf, cx, cy, radius, seed) {
    const rInt = Math.ceil(radius + 4);
    const rng = mulberry32(seed + 101);

    // 1. Dithered drop shadow offset (+3, +3)
    for (let dy = -rInt; dy <= rInt + 3; dy++) {
      for (let dx = -rInt; dx <= rInt + 3; dx++) {
        const sdx = dx - 3;
        const sdy = dy - 3;
        const dist = Math.sqrt(sdx * sdx + sdy * sdy * 1.15);
        if (dist <= radius + 0.4) {
          const px = (cx + dx) | 0;
          const py = (cy + dy) | 0;
          if (dist > radius - 1.8) {
            if (((px + py) & 1) === 0) pblend(buf, px, py, 8, 15, 5, 0.62);
          } else {
            pblend(buf, px, py, 8, 15, 5, 0.62);
          }
        }
      }
    }

    // 2. 7 distinct sub-lobes (drawn back-to-front so each lobe has a dark bottom rim and sunlit top-left crown)
    const lobeOffsets = [
      [-0.42, -0.35, 0.50],
      [ 0.38, -0.32, 0.48],
      [-0.46,  0.18, 0.50],
      [ 0.42,  0.22, 0.50],
      [-0.12,  0.40, 0.52],
      [-0.14, -0.12, 0.58],
      [ 0.16,  0.06, 0.54]
    ];

    for (let i = 0; i < lobeOffsets.length; i++) {
      const ox = (lobeOffsets[i][0] + (rng() - 0.5) * 0.14) * radius;
      const oy = (lobeOffsets[i][1] + (rng() - 0.5) * 0.14) * radius;
      const lr = lobeOffsets[i][2] * radius;
      const lInt = Math.ceil(lr + 1);
      const lcx = cx + ox;
      const lcy = cy + oy;

      for (let dy = -lInt; dy <= lInt; dy++) {
        for (let dx = -lInt; dx <= lInt; dx++) {
          const d = Math.sqrt(dx * dx + dy * dy);
          const px = (lcx + dx) | 0;
          const py = (lcy + dy) | 0;
          const n = hash2i(px + i * 19, py + seed * 7);
          if (d > lr + (n - 0.5) * 0.9) continue;

          // Local spherical lighting on each leaf cluster + global tree shading
          const localLight = (-dx * 0.65 - dy * 0.75) / lr;
          const globalLight = (-(px - cx) * 0.5 - (py - cy) * 0.6) / radius;
          const rimDark = d > lr * 0.78 ? -0.38 : 0;
          const shade = localLight * 0.55 + globalLight * 0.45 + rimDark + (n - 0.5) * 0.25;

          let r, g, b;
          if (shade < -0.32) {
            r = 18; g = 34; b = 11; // Deep crevice / bottom-right outline
          } else if (shade < -0.04) {
            r = 30; g = 52; b = 19; // Dark forest green
          } else if (shade < 0.24) {
            r = 44; g = 72; b = 27; // Mid canopy green
          } else if (shade < 0.52) {
            r = 58; g = 92; b = 36; // Lit leaf cluster
          } else {
            r = 76; g = 112; b = 46; // Bright top-left leaf highlight
          }
          pset(buf, px, py, r, g, b);
        }
      }
    }
  }

  // Tree positions matching frame_010.jpg - frame_013.jpg with organic staggering
  const TREES = [];
  function buildTreeList() {
    if (TREES.length > 0) return;
    const rng = mulberry32(199403);

    function addOrganicCluster(coords) {
      for (const [x, y, r] of coords) {
        const jx = x + ((rng() - 0.5) * 4.5);
        const jy = y + ((rng() - 0.5) * 4.5);
        TREES.push({ x: jx, y: jy, r: r + (rng() - 0.5) * 1.2, seed: (rng() * 10000) | 0 });
      }
    }

    // 1. Top-Left dense forest block (x: -4..86, y: -4..66)
    addOrganicCluster([
      [5, 5, 8], [16, 4, 8.5], [29, 6, 8], [42, 4, 8.5], [55, 6, 8], [68, 5, 8], [79, 8, 7.5],
      [3, 16, 8.5], [14, 15, 8], [26, 17, 9], [38, 15, 8.5], [51, 16, 8], [64, 15, 8.5], [76, 17, 8], [85, 20, 7],
      [6, 27, 8], [18, 28, 9], [31, 27, 8.5], [44, 27, 8], [57, 28, 8.5], [70, 27, 8], [81, 30, 7],
      [4, 39, 8.5], [16, 40, 8.5], [29, 39, 9], [42, 38, 8.5], [55, 40, 7.5], [69, 39, 8], [80, 41, 7],
      [5, 51, 8.5], [17, 51, 8], [28, 50, 8.5], [40, 50, 7.5], [75, 50, 7.5],
      [6, 63, 8], [18, 62, 7.5], [29, 60, 7.5], [39, 59, 6.5]
    ]);

    // 2. Mid-Left roadside tree cluster (x: 52..78, y: 84..110)
    addOrganicCluster([
      [58, 86, 7.5], [68, 85, 7.5], [76, 90, 6.5],
      [53, 95, 7.5], [64, 95, 8], [73, 98, 7.5],
      [60, 104, 7.5], [69, 106, 6.5]
    ]);

    // 3. Top-Center tree copse (x: 170..214, y: 10..34)
    addOrganicCluster([
      [172, 14, 7.5], [183, 12, 8], [195, 13, 8], [206, 15, 7.5],
      [176, 23, 7.5], [188, 22, 8.5], [200, 23, 8], [210, 24, 7.5],
      [191, 30, 7.5], [202, 30, 6.5]
    ]);

    // 4. Top-Right & East forest mass (x: 238..320, y: 0..126)
    addOrganicCluster([
      [242, 6, 7.5], [254, 5, 8], [268, 6, 8.5], [280, 12, 8],
      [238, 16, 7.5], [250, 16, 8.5], [264, 17, 8], [278, 20, 8.5], [292, 22, 8], [306, 22, 8], [316, 24, 7.5],
      [246, 27, 7.5], [260, 28, 8.5], [274, 30, 8], [288, 32, 8.5], [302, 33, 8], [314, 35, 8],
      [266, 40, 8], [280, 42, 8.5], [294, 43, 9], [308, 45, 8.5], [318, 46, 7.5],
      [272, 52, 8], [286, 54, 8.5], [300, 56, 8], [312, 57, 8],
      [282, 66, 8], [296, 68, 8.5], [310, 69, 8],
      [276, 78, 8], [290, 80, 8.5], [304, 81, 8], [316, 82, 7.5],
      [272, 90, 8], [286, 92, 8], [298, 92, 7.5], [312, 91, 8],
      [276, 102, 7.5], [288, 103, 7.5], [314, 102, 7.5],
      [274, 113, 8], [286, 114, 8], [296, 116, 7.5], [312, 114, 8],
      [280, 122, 7.5], [290, 123, 6.5]
    ]);

    // 5. Bottom-Right Pondside copse (x: 248..274, y: 144..172)
    addOrganicCluster([
      [256, 146, 7.5], [266, 147, 7.5],
      [250, 155, 7.5], [261, 156, 8], [270, 157, 6.5],
      [254, 165, 7.5], [264, 166, 7.5]
    ]);

    TREES.sort((a, b) => a.y - b.y);
  }

  function drawSmallRock(buf, cx, cy, size) {
    for (let dy = -size; dy <= size; dy++) {
      for (let dx = -size - 1; dx <= size + 1; dx++) {
        const d = Math.sqrt(dx * dx * 0.75 + dy * dy * 1.2);
        if (d <= size + 0.4) {
          if (dy >= size - 0.5 || dx >= size) {
            pblend(buf, cx + dx + 1, cy + dy + 1, 16, 26, 10, 0.6);
          }
          let c = 105;
          if (dx + dy < -0.5) c = 142;
          else if (dx + dy > 1.0) c = 72;
          pset(buf, cx + dx, cy + dy, c, c + 4, c + 4);
        }
      }
    }
  }

  function drawWheatField(buf, x0, y0, w, h) {
    fillRect(buf, x0 - 1, y0 - 1, w + 2, h + 2, 42, 52, 22);
    fillRect(buf, x0, y0, w, h, 68, 58, 26);
    for (let ry = 1; ry < h - 1; ry += 3) {
      for (let rx = 1; rx < w - 1; rx++) {
        const n = (hash2i(x0 + rx, y0 + ry) - 0.5) * 14;
        pset(buf, x0 + rx, y0 + ry, (144 + n) | 0, (126 + n) | 0, (54 + n * 0.5) | 0);
        if (ry + 1 < h - 1) {
          pset(buf, x0 + rx, y0 + ry + 1, (118 + n) | 0, (102 + n) | 0, (42 + n * 0.5) | 0);
        }
      }
    }
  }

  function drawHaystack(buf, cx, cy) {
    for (let dx = -2; dx <= 3; dx++) pblend(buf, cx + dx, cy + 2, 16, 26, 10, 0.55);
    for (let dy = -2; dy <= 1; dy++) {
      const hw = 2 - Math.max(0, -dy - 1);
      for (let dx = -hw; dx <= hw; dx++) {
        const hi = dx + dy < 0 ? 18 : -10;
        pset(buf, cx + dx, cy + dy, 182 + hi, 148 + hi, 68 + hi);
      }
    }
  }

  // Build static base map once
  function initBuffers() {
    if (bufCanvas) return;
    bufCanvas = document.createElement('canvas');
    bufCanvas.width = GW;
    bufCanvas.height = GH;
    bufCtx = bufCanvas.getContext('2d');
    frameImgData = bufCtx.createImageData(GW, GH);
    framePixels = frameImgData.data;
    basePixels = new Uint8ClampedArray(GW * GH * 4);

    buildTreeList();

    // 1. Grass field + Dirt road + Pond shoreline
    for (let y = 0; y < GH; y++) {
      for (let x = 0; x < GW; x++) {
        const n1 = valueNoise(x, y, 26);
        const n2 = valueNoise(x + 113, y + 71, 9);
        const fine = hash2i(x, y);

        const cdx = (x - 165) / 135;
        const cdy = (y - 92) / 85;
        const clearing = Math.max(0, 1 - (cdx * cdx + cdy * cdy) * 0.65);

        let r = 38 + clearing * 22 + (n1 - 0.5) * 16 + (n2 - 0.5) * 9 + (fine - 0.5) * 5;
        let g = 64 + clearing * 30 + (n1 - 0.5) * 22 + (n2 - 0.5) * 12 + (fine - 0.5) * 7;
        let b = 24 + clearing * 12 + (n1 - 0.5) * 10 + (n2 - 0.5) * 6 + (fine - 0.5) * 4;

        // Dirt road check
        const rcy = roadCenterY(x);
        const rDist = Math.abs(y - rcy);
        const roadHW = 6.6 + (n2 - 0.5) * 1.8;

        if (rDist < roadHW + 1.8) {
          const isRoad = rDist < roadHW - 0.8 || (((x + y) & 1) === 0 && rDist < roadHW + 0.6) || (fine > 0.65 && rDist < roadHW + 1.5);
          if (isRoad) {
            const edgeDark = rDist > roadHW - 1.5 ? -12 : 0;
            const dNoise = (n2 - 0.5) * 18 + (fine - 0.5) * 20 + edgeDark;
            r = 110 + dNoise;
            g = 78 + dNoise * 0.76;
            b = 48 + dNoise * 0.52;
          }
        }

        // Bottom-right water pond & shoreline
        const pdx = (x - 294) / 46;
        const pdy = (y - 166) / 29;
        const pDist = Math.sqrt(pdx * pdx + pdy * pdy) + (n2 - 0.5) * 0.08;
        if (pDist < 1.06) {
          if (pDist > 0.88) {
            const sNoise = (fine - 0.5) * 16;
            r = 96 + sNoise;
            g = 68 + sNoise * 0.75;
            b = 42 + sNoise * 0.5;
          } else {
            const wDepth = (0.88 - pDist) * 24;
            r = 24 - wDepth * 0.25;
            g = 48 - wDepth * 0.35;
            b = 88 - wDepth * 0.3;
          }
        }

        pset(basePixels, x, y, Math.max(0, Math.min(255, r | 0)), Math.max(0, Math.min(255, g | 0)), Math.max(0, Math.min(255, b | 0)));
      }
    }

    // 2. Grass speckles & tiny wildflowers
    const rng = mulberry32(941994);
    for (let i = 0; i < 420; i++) {
      const sx = (rng() * GW) | 0;
      const sy = (rng() * GH) | 0;
      const rcy = roadCenterY(sx);
      if (Math.abs(sy - rcy) < 9.5) continue;
      const pdx = (sx - 294) / 46;
      const pdy = (sy - 166) / 29;
      if (pdx * pdx + pdy * pdy < 1.18) continue;

      const kind = rng();
      if (kind < 0.28) {
        pset(basePixels, sx, sy, 212, 224, 142);
      } else if (kind < 0.65) {
        pset(basePixels, sx, sy, 138, 168, 78);
      } else {
        pset(basePixels, sx, sy, 30, 50, 18);
      }
    }

    // 3. Wheat fields & haystacks
    drawWheatField(basePixels, 121, 106, 19, 15);
    drawWheatField(basePixels, 259, 106, 18, 15);
    drawHaystack(basePixels, 229, 133);
    drawHaystack(basePixels, 237, 136);

    // 4. Small field rocks
    const rocks = [
      [92, 123, 2], [112, 136, 2], [122, 82, 1], [131, 84, 2],
      [170, 118, 2], [188, 67, 1], [252, 40, 1], [114, 15, 1]
    ];
    for (const [rx, ry, rs] of rocks) {
      drawSmallRock(basePixels, rx, ry, rs);
    }

    // 5. Upper wooden palisade fence above Barracks
    for (let fx = 88; fx <= 150; fx++) {
      pset(basePixels, fx, 42, 82, 50, 28);
      if ((fx - 88) % 4 === 0) {
        pset(basePixels, fx, 40, 118, 74, 42);
        pset(basePixels, fx, 41, 98, 60, 34);
        pset(basePixels, fx, 43, 62, 38, 20);
      }
    }

    // 6. Render static forest trees onto basePixels
    for (let i = 0; i < TREES.length; i++) {
      const tr = TREES[i];
      drawTreeCanopy(basePixels, tr.x, tr.y, tr.r, tr.seed);
    }
  }

  // Draw a dithered building drop shadow
  function drawDropShadow(buf, x0, y0, w, h, size) {
    for (let y = y0 + 2; y < y0 + h + size; y++) {
      for (let x = x0 + 2; x < x0 + w + size; x++) {
        if (x < x0 + w && y < y0 + h) continue;
        if (((x + y) & 1) === 0) {
          pblend(buf, x, y, 8, 14, 6, 0.65);
        } else {
          pblend(buf, x, y, 8, 14, 6, 0.35);
        }
      }
    }
  }

  // Draw a Human Farm (pitched brown roof + timber/plaster walls)
  function drawFarm(buf, x0, y0, w, h, isLargeBarn, damage) {
    drawDropShadow(buf, x0, y0, w, h, 4);
    const roofH = Math.floor(h * 0.62);
    const ridgeY = Math.floor(roofH * 0.48);

    for (let dy = 0; dy < roofH; dy++) {
      for (let dx = 0; dx < w; dx++) {
        const px = x0 + dx;
        const py = y0 + dy;
        const n = (hash2i(px, py) - 0.5) * 14;
        let r, g, b;
        if (dy < ridgeY) {
          r = 142 + n; g = 114 + n * 0.8; b = 68 + n * 0.5;
          if (dy === 0 || dx === 0 || dx === w - 1) { r -= 24; g -= 20; b -= 12; }
        } else if (dy === ridgeY) {
          r = 166 + n; g = 136 + n * 0.8; b = 82 + n * 0.5;
        } else {
          r = 104 + n; g = 80 + n * 0.8; b = 46 + n * 0.5;
          if ((dx & 1) === 0 && dy % 2 === 1) { r += 10; g += 8; b += 4; }
        }
        pset(buf, px, py, r | 0, g | 0, b | 0);
      }
    }

    for (let dy = roofH; dy < h; dy++) {
      for (let dx = 1; dx < w - 1; dx++) {
        const px = x0 + dx;
        const py = y0 + dy;
        const isTimber = dy === roofH || dy === h - 1 || dx === 1 || dx === w - 2 || dx === Math.floor(w * 0.33) || dx === Math.floor(w * 0.66);
        if (isTimber) {
          pset(buf, px, py, 58, 40, 24);
        } else {
          const n = (hash2i(px, py) - 0.5) * 12;
          pset(buf, px, py, (152 + n) | 0, (122 + n * 0.8) | 0, (74 + n * 0.5) | 0);
        }
      }
    }

    const doorX = x0 + Math.floor(w * 0.42);
    const doorW = Math.max(2, Math.floor(w * 0.16));
    fillRect(buf, doorX, y0 + roofH + 1, doorW, h - roofH - 1, 24, 18, 12);

    if (isLargeBarn) {
      const straw = [
        [4, 2], [5, 3], [6, 3], [11, 0], [12, 1], [13, 2], [14, 1], [15, 0],
        [9, 6], [8, 7], [8, 8], [16, 4], [17, 5], [18, 5]
      ];
      for (const [sx, sy] of straw) {
        pset(buf, x0 + sx, y0 + sy, 206, 174, 88);
      }
    }

    if (damage > 0) {
      const cx = x0 + Math.floor(w * 0.5);
      const cy = y0 + Math.floor(roofH * 0.65);
      const rad = 3.6 + damage * 2.5;
      for (let dy = -6; dy <= 6; dy++) {
        for (let dx = -6; dx <= 6; dx++) {
          const d = Math.sqrt(dx * dx + dy * dy * 1.3);
          if (d < rad) {
            if (d < rad * 0.6 || ((dx + dy) & 1) === 0) {
              pset(buf, cx + dx, cy + dy, 20, 16, 12);
            }
          }
        }
      }
    }
  }

  // Draw Human Barracks (x0=110, y0=44, w=34, h=22)
  function drawBarracks(buf, x0, y0, damage) {
    const w = 34;
    const h = 22;
    drawDropShadow(buf, x0, y0, w, h, 4);

    for (let dy = 0; dy < 13; dy++) {
      for (let dx = 0; dx < w; dx++) {
        const px = x0 + dx;
        const py = y0 + dy;
        const n = (hash2i(px, py) - 0.5) * 14;
        let c = 104 + n;
        if (dy === 0 || dy === 5) {
          c = 132 + n;
        } else if (dy >= 1 && dy <= 4) {
          // Angled slate roof ribs matching frame_010.jpg
          c = (((dx + dy) % 3 === 0) ? 88 : 122) + n;
        } else {
          c = 76 + n;
        }
        pset(buf, px, py, c | 0, (c + 3) | 0, (c + 6) | 0);
      }
    }

    for (let dy = 13; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        const px = x0 + dx;
        const py = y0 + dy;
        const isMortar = (dy % 2 === 0) || ((dx + (dy >> 1) * 2) % 4 === 0);
        const n = (hash2i(px, py) - 0.5) * 16;
        let c = (isMortar ? 76 : 114) + n;
        pset(buf, px, py, c | 0, (c + 2) | 0, (c + 5) | 0);
      }
    }

    const winX = [5, 10, 22, 27];
    for (const wx of winX) {
      fillRect(buf, x0 + wx, y0 + 15, 3, 2, 178, 168, 122);
    }
    fillRect(buf, x0 + 15, y0 + 16, 4, 6, 26, 28, 30);

    if (damage > 0) {
      for (let dy = 1; dy < 15; dy++) {
        for (let dx = 6; dx < 24; dx++) {
          const d = Math.sqrt((dx - 15) * (dx - 15) * 0.6 + (dy - 7) * (dy - 7));
          if (d < 6.8 * damage && (((dx + dy) & 1) === 0 || d < 3.8)) {
            pset(buf, x0 + dx, y0 + dy, 46, 42, 40);
          }
        }
      }
    }
  }

  // Draw Scout / Guard Tower (x0=215, y0=43)
  function drawGuardTower(buf, x0, y0, damage) {
    const cx = x0 + 10;
    const cy = y0 + 10;
    drawDropShadow(buf, x0 + 2, y0 + 2, 17, 20, 4);

    if (damage < 0.65) {
      for (let dy = 12; dy < 22; dy++) {
        for (let dx = 2; dx < 18; dx++) {
          const isSlot = (dx % 3 === 1) && dy >= 17 && dy <= 19;
          const c = isSlot ? 38 : (dx < 10 ? 118 : 88);
          pset(buf, x0 + dx, y0 + dy, c, c + 3, c + 6);
        }
      }
      for (let dy = -9; dy <= 9; dy++) {
        for (let dx = -9; dx <= 9; dx++) {
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d <= 9.2) {
            if (d <= 3.6) {
              const light = (-dx - dy) > 0 ? 22 : -12;
              pset(buf, cx + dx, cy + dy, 164 + light, 48 + (light >> 1), 36 + (light >> 1));
            } else {
              const light = ((-dx * 0.6 - dy * 0.6) * 3.5) | 0;
              const c = Math.max(68, Math.min(156, 114 + light));
              pset(buf, cx + dx, cy + dy, c, c + 3, c + 6);
            }
          }
        }
      }
    } else {
      // Fractured stone ruins matching frame_012 / frame_013
      for (let dy = 2; dy < 25; dy++) {
        for (let dx = -2; dx < 22; dx++) {
          const d = Math.sqrt((dx - 10) * (dx - 10) + (dy - 13) * (dy - 13));
          const n = hash2i(x0 + dx, y0 + dy);
          if (d < 10.5 + (n - 0.5) * 3.5) {
            const c = n > 0.6 ? 132 : (n > 0.25 ? 98 : 64);
            pset(buf, x0 + dx, y0 + dy, c + 16, c + 4, c - 4);
          }
        }
      }
    }
  }

  // Draw Central Human Town Hall (intact vs collapsed rubble)
  function drawTownHall(buf, x0, y0, collapsed) {
    const w = 44;
    const h = 46;

    if (!collapsed) {
      drawDropShadow(buf, x0, y0 + 10, w, h - 10, 5);

      // 1. Upper cupola spire
      pset(buf, x0 + 22, y0 - 3, 148, 48, 36);
      pset(buf, x0 + 22, y0 - 2, 148, 48, 36);
      for (let dy = 0; dy < 6; dy++) {
        for (let dx = 15; dx < 29; dx++) {
          const r = dy < 3 ? 162 : 118;
          const g = dy < 3 ? 48 : 32;
          const b = dy < 3 ? 36 : 24;
          pset(buf, x0 + dx, y0 + dy, r, g, b);
        }
      }
      for (let dy = 6; dy < 12; dy++) {
        for (let dx = 16; dx < 28; dx++) {
          const isWin = dy >= 8 && dy <= 9 && (dx === 18 || dx === 22 || dx === 25);
          const c = isWin ? 44 : (((dx + dy) & 1) ? 122 : 98);
          pset(buf, x0 + dx, y0 + dy, c, c + 3, c + 6);
        }
      }

      // 2. Main wide red tiled roof (dy = 12..34)
      for (let dy = 12; dy < 34; dy++) {
        for (let dx = 0; dx < w; dx++) {
          const px = x0 + dx;
          const py = y0 + dy;
          const n = (hash2i(px, py) - 0.5) * 14;
          let r, g, b;
          if (dy < 22) {
            const shingle = ((dx + (dy & 1) * 2) % 4 === 0) ? -16 : 10;
            r = 162 + shingle + n;
            g = 52 + (shingle >> 1) + n * 0.4;
            b = 38 + (shingle >> 1) + n * 0.3;
          } else if (dy === 22) {
            r = 188 + n; g = 68 + n * 0.4; b = 48 + n * 0.3;
          } else {
            const rib = (dx % 3 === 0) ? -10 : 4;
            r = 108 + rib + n * 0.7;
            g = 28 + (rib >> 1) + n * 0.3;
            b = 20 + (rib >> 1) + n * 0.2;
          }
          if (dx === 0 || dx === w - 1) { r *= 0.72; g *= 0.72; b *= 0.72; }
          pset(buf, px, py, r | 0, g | 0, b | 0);
        }
      }

      // 3. Grey stone brick front wall (dy = 34..46)
      for (let dy = 34; dy < h; dy++) {
        for (let dx = 1; dx < w - 1; dx++) {
          const px = x0 + dx;
          const py = y0 + dy;
          const isMortar = (dy % 3 === 0) || ((dx + (dy >> 1) * 3) % 5 === 0);
          const n = (hash2i(px, py) - 0.5) * 18;
          const c = (isMortar ? 76 : 124) + n;
          pset(buf, px, py, c | 0, (c + 3) | 0, (c + 7) | 0);
        }
      }

      const winCols = [6, 13, 29, 36];
      for (const wx of winCols) {
        fillRect(buf, x0 + wx, y0 + 36, 3, 2, 184, 174, 126);
      }

      fillRect(buf, x0 + 20, y0 + 40, 4, 6, 22, 24, 26);
      fillRect(buf, x0 + 21, y0 + 39, 2, 1, 22, 24, 26);
    } else {
      // COLLAPSED TOWN HALL RUBBLE (exact match to frame_013.jpg!)
      // 1. Scorched dirt & ash foundation patch under the collapsed footprint
      for (let dy = 16; dy < 49; dy++) {
        for (let dx = -2; dx < w + 2; dx++) {
          const d = Math.sqrt(((dx - 22) / 23) ** 2 + ((dy - 33) / 16) ** 2);
          const n = hash2i(x0 + dx, y0 + dy);
          if (d < 0.95 + (n - 0.5) * 0.25) {
            pblend(buf, x0 + dx, y0 + dy, 58, 44, 30, 0.55);
          }
        }
      }

      // 2. Standing ruined chimney/pillar stub at center-top (engulfed in fire)
      for (let dy = 11; dy < 29; dy++) {
        for (let dx = 16; dx < 26; dx++) {
          const n = hash2i(x0 + dx, y0 + dy);
          if (dy < 14 && (dx < 18 || dx > 23) && n > 0.5) continue;
          const c = (dx < 21 ? 116 : 86) + ((n - 0.5) * 22);
          pset(buf, x0 + dx, y0 + dy, c | 0, (c * 0.76) | 0, (c * 0.54) | 0);
        }
      }

      // 3. Organic pile of broken timber beams, irregular stone blocks & roof tile shards
      const rng = mulberry32(199409);
      for (let i = 0; i < 190; i++) {
        const a = rng() * Math.PI * 2;
        const rad = Math.pow(rng(), 0.65);
        const rx = (x0 + 22 + Math.cos(a) * rad * 21) | 0;
        const ry = (y0 + 34 + Math.sin(a) * rad * 14) | 0;
        const kind = rng();
        if (kind < 0.46) {
          // Irregular grey stone masonry chunk with highlight & shadow
          const sw = 2 + ((rng() * 2.5) | 0);
          const sh = 1 + ((rng() * 2.2) | 0);
          const c = (84 + rng() * 56) | 0;
          fillRect(buf, rx + 1, ry + 1, sw, sh, 34, 28, 22);
          fillRect(buf, rx, ry, sw, sh, c, c + 3, c + 6);
          pset(buf, rx, ry, Math.min(200, c + 22), Math.min(204, c + 24), Math.min(208, c + 26));
        } else if (kind < 0.82) {
          // Broken brown timber rafter
          const horiz = rng() > 0.35;
          const tw = horiz ? (3 + ((rng() * 3) | 0)) : (1 + ((rng() * 2) | 0));
          const th = horiz ? (1 + ((rng() * 2) | 0)) : (3 + ((rng() * 2) | 0));
          const b = (88 + rng() * 42) | 0;
          fillRect(buf, rx, ry, tw, th, b, (b * 0.72) | 0, (b * 0.45) | 0);
        } else {
          // Shattered terracotta roof tile or dark char
          fillRect(buf, rx, ry, 2, 1 + ((rng() * 2) | 0), 132, 44, 32);
        }
      }
    }
  }

  // Draw a scorched black crater (1994 dithered impact mark)
  function drawCrater(buf, cx, cy, radius) {
    const rInt = Math.ceil(radius + 1);
    for (let dy = -rInt; dy <= rInt; dy++) {
      for (let dx = -rInt; dx <= rInt; dx++) {
        const d = Math.sqrt(dx * dx * 0.85 + dy * dy * 1.18);
        if (d > radius) continue;
        const px = (cx + dx) | 0;
        const py = (cy + dy) | 0;
        if (d < radius * 0.54) {
          pset(buf, px, py, 14, 12, 10);
        } else if (d < radius * 0.80) {
          if (((px + py) & 1) === 0) pset(buf, px, py, 16, 14, 10);
          else pblend(buf, px, py, 32, 24, 16, 0.75);
        } else if (((px + py) & 1) === 0) {
          pblend(buf, px, py, 24, 18, 12, 0.65);
        }
      }
    }
  }

  // Draw a classic 1994 checkerboard-dithered pixel explosion sphere
  function drawExplosionSphere(buf, cx, cy, maxR, progress) {
    const expand = progress < 0.25 ? (progress / 0.25) : 1.0;
    const fade = progress > 0.65 ? (1.0 - (progress - 0.65) / 0.35) : 1.0;
    const rad = maxR * (0.45 + 0.55 * expand);
    const rInt = Math.ceil(rad + 4);

    const glowR = rad * 1.55;
    const gInt = Math.ceil(glowR);
    for (let dy = -gInt; dy <= gInt; dy++) {
      for (let dx = -gInt; dx <= gInt; dx++) {
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < glowR) {
          const a = (1 - d / glowR) * 0.32 * fade;
          padd(buf, cx + dx, cy + dy, 220, 110, 20, a);
        }
      }
    }

    for (let dy = -rInt; dy <= rInt; dy++) {
      for (let dx = -rInt; dx <= rInt; dx++) {
        const px = (cx + dx) | 0;
        const py = (cy + dy) | 0;
        const n = (hash2i(px * 3, py * 3) - 0.5) * 0.22;
        const d = Math.sqrt(dx * dx + dy * dy) / rad + n;
        if (d > 1.05) continue;

        const checker = ((px + py) & 1) === 0;
        if (d < 0.34 * fade) {
          if (checker) pset(buf, px, py, 255, 250, 195);
          else pset(buf, px, py, 255, 218, 90);
        } else if (d < 0.65) {
          if (checker) pset(buf, px, py, 255, 196, 54);
          else if (fade > 0.45) pset(buf, px, py, 232, 96, 24);
        } else if (d < 0.92) {
          if (checker) pset(buf, px, py, 224, 82, 20);
          else if (((px * 3 + py) & 3) === 0) pset(buf, px, py, 148, 36, 12);
        } else {
          if (checker && ((px ^ py) & 2) === 0) {
            pset(buf, px, py, 168, 42, 14);
          }
        }
      }
    }
  }

  // Draw an animated multi-tongue pixel fire with warm ground glow
  function drawPixelFire(buf, cx, cy, scale, t, seed) {
    if (scale <= 0.05) return;

    // 1. Warm flickering firelight glow on surrounding pixels
    const glowR = (12 + Math.sin(t * 14 + seed) * 2) * scale;
    const gInt = Math.ceil(glowR);
    for (let dy = -gInt; dy <= gInt; dy++) {
      for (let dx = -gInt; dx <= gInt; dx++) {
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < glowR) {
          const a = (1 - d / glowR) * 0.24 * Math.min(1, scale);
          padd(buf, cx + dx, cy + dy, 215, 110, 22, a);
        }
      }
    }

    // 2. Multi-tongue stepped pixel flames (white-yellow flat base -> gold -> orange -> red tips)
    const tongues = [
      { ox: -2.6 * scale, oy: 0.5, w: 3.6 * scale, h: 7.5 * scale, phase: seed + 0.0 },
      { ox:  2.4 * scale, oy: 0.8, w: 3.4 * scale, h: 7.0 * scale, phase: seed + 2.1 },
      { ox: -0.2 * scale, oy: -1.2 * scale, w: 3.8 * scale, h: 9.8 * scale, phase: seed + 4.3 }
    ];

    const stepT = Math.floor(t * 12);
    for (let i = 0; i < tongues.length; i++) {
      const tg = tongues[i];
      const fcx = cx + tg.ox;
      const fcy = cy + tg.oy;
      const fh = Math.max(3, tg.h + Math.sin(stepT * 0.9 + tg.phase) * 1.5);
      const fw = Math.max(2.2, tg.w);

      for (let dy = -Math.ceil(fh); dy <= 1; dy++) {
        const v = Math.max(0, Math.min(1, -dy / fh));
        const sway = Math.round(Math.sin(stepT * 0.8 + tg.phase + v * 2.4) * (v * 1.6 * scale));
        const halfW = fw * (1.0 - v * 0.78);

        for (let dx = -Math.ceil(halfW + 2); dx <= Math.ceil(halfW + 2); dx++) {
          const dist = Math.abs(dx - sway) / Math.max(0.6, halfW);
          if (dist > 1.0) continue;

          const px = (fcx + dx) | 0;
          const py = (fcy + dy) | 0;
          const heat = (1.0 - v * 0.70) * (1.0 - dist * 0.55);

          if (heat > 0.62 || (dy >= -1 && dist < 0.75)) {
            pset(buf, px, py, 255, 252, 215); // Crisp white-yellow base core
          } else if (heat > 0.44) {
            pset(buf, px, py, 255, 208, 52);  // Golden yellow
          } else if (heat > 0.25) {
            pset(buf, px, py, 240, 114, 22);  // Fiery orange
          } else {
            pset(buf, px, py, 202, 42, 14);   // Crimson flame tip
          }
        }
      }
    }

    // 3. Flying 1px orange/yellow embers above fire
    for (let e = 0; e < 2; e++) {
      const ep = ((t * 1.8 + seed * 0.37 + e * 0.5) % 1.0);
      const ex = cx + Math.sin(ep * 8 + seed + e) * 4 * scale + ep * 3;
      const ey = cy - 4 * scale - ep * 12 * scale;
      if (ep < 0.7) pset(buf, ex, ey, 255, 190, 40);
      else pset(buf, ex, ey, 210, 55, 18);
    }
  }

  // Draw rising translucent grey smoke plume above a fire site (matching frame_012/013)
  function drawSmokePlume(buf, cx, cy, scale, t, seed) {
    if (scale <= 0.05) return;
    for (let i = 0; i < 7; i++) {
      const p = ((t * 0.48 + i * (1 / 7) + seed * 0.13) % 1.0);
      const sx = cx + p * 16 * scale + Math.sin(p * 6 + seed) * 2.5;
      const sy = cy - 5 * scale - p * 32 * scale;
      const rad = (3.2 + p * 6.5) * scale;
      const alpha = Math.sin(p * Math.PI) * 0.38 * Math.min(1, scale);
      const rInt = Math.ceil(rad);

      for (let dy = -rInt; dy <= rInt; dy++) {
        for (let dx = -rInt; dx <= rInt; dx++) {
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d <= rad) {
            const px = (sx + dx) | 0;
            const py = (sy + dy) | 0;
            if (d > rad * 0.65 && ((px + py) & 1) !== 0) continue;
            const shade = (dx - dy > 0) ? 112 : 82;
            pblend(buf, px, py, shade, shade + 4, shade, alpha * (1 - d / rad * 0.45));
          }
        }
      }
    }
  }

  // Draw a streaking Catapult fireball with a long pixel-dithered fire trail
  function drawFireballStreak(buf, x0, y0, x1, y1, p) {
    const cx = x0 + (x1 - x0) * p;
    const cy = y0 + (y1 - y0) * p;
    const vx = x1 - x0;
    const vy = y1 - y0;
    const len = Math.sqrt(vx * vx + vy * vy) || 1;
    const ux = vx / len;
    const uy = vy / len;

    const tailLen = 28;
    for (let s = tailLen; s >= 0; s--) {
      const u = s / tailLen;
      const tx = cx - ux * s;
      const ty = cy - uy * s;
      const rad = (1.0 - u * 0.78) * 2.6;
      const rInt = Math.ceil(rad + 1);

      for (let dy = -rInt; dy <= rInt; dy++) {
        for (let dx = -rInt; dx <= rInt; dx++) {
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d > rad) continue;
          const px = (tx + dx) | 0;
          const py = (ty + dy) | 0;
          if (u > 0.55 && ((px + py) & 1) !== 0) continue;

          if (u < 0.16 && d < 1.6) {
            pset(buf, px, py, 255, 252, 220);
          } else if (u < 0.42) {
            pset(buf, px, py, 255, 214, 68);
          } else if (u < 0.72) {
            pset(buf, px, py, 236, 124, 28);
          } else {
            pset(buf, px, py, 184, 52, 16);
          }
        }
      }
    }
  }

  // Draw 1994 pixel-art RTS units (Peasants, Human Footmen, Orc Grunts, Catapults)
  function drawPeasant(buf, x, y, carrying, walkPhase) {
    const ix = x | 0;
    const iy = y | 0;
    const bob = (Math.floor(walkPhase * 6) & 1);
    pblend(buf, ix, iy + 3, 10, 18, 6, 0.6);
    pblend(buf, ix + 1, iy + 3, 10, 18, 6, 0.6);
    pset(buf, ix - 1 + bob, iy + 2, 92, 64, 36);
    pset(buf, ix + 1 - bob, iy + 2, 92, 64, 36);
    fillRect(buf, ix - 1, iy, 3, 2, 42, 98, 196);
    pset(buf, ix, iy - 1, 224, 172, 124);
    if (carrying === 'gold') {
      fillRect(buf, ix + 1, iy - 1, 2, 2, 236, 196, 56);
    } else if (carrying === 'wood') {
      fillRect(buf, ix - 2, iy - 1, 4, 1, 132, 86, 42);
    }
  }

  function drawFootman(buf, x, y, selected, attacking, phase) {
    const ix = x | 0;
    const iy = y | 0;
    if (selected) {
      for (let dx = -4; dx <= 4; dx++) {
        pset(buf, ix + dx, iy - 4, 32, 228, 32);
        pset(buf, ix + dx, iy + 4, 32, 228, 32);
      }
      for (let dy = -4; dy <= 4; dy++) {
        pset(buf, ix - 4, iy + dy, 32, 228, 32);
        pset(buf, ix + 4, iy + dy, 32, 228, 32);
      }
      fillRect(buf, ix - 3, iy - 6, 7, 1, 20, 40, 20);
      fillRect(buf, ix - 3, iy - 6, 6, 1, 40, 235, 40);
    }

    pblend(buf, ix, iy + 3, 10, 18, 6, 0.65);
    pset(buf, ix - 1, iy + 2, 140, 148, 156);
    pset(buf, ix + 1, iy + 2, 140, 148, 156);
    fillRect(buf, ix - 1, iy, 3, 2, 36, 92, 192);
    pset(buf, ix, iy, 192, 200, 210);
    fillRect(buf, ix - 1, iy - 2, 3, 2, 188, 196, 206);
    pset(buf, ix, iy - 1, 216, 164, 120);
    pset(buf, ix - 2, iy, 32, 80, 178);
    pset(buf, ix - 2, iy + 1, 220, 180, 48);
    const swing = attacking ? ((Math.floor(phase * 10) & 1) ? -2 : 1) : 0;
    pset(buf, ix + 2, iy + swing, 220, 228, 238);
    pset(buf, ix + 3, iy - 1 + swing, 240, 246, 255);
  }

  function drawOrcGrunt(buf, x, y, attacking, phase) {
    const ix = x | 0;
    const iy = y | 0;
    pblend(buf, ix, iy + 3, 10, 18, 6, 0.65);
    pset(buf, ix - 1, iy + 2, 62, 44, 28);
    pset(buf, ix + 1, iy + 2, 62, 44, 28);
    fillRect(buf, ix - 1, iy, 3, 2, 76, 138, 46);
    pset(buf, ix - 2, iy, 204, 42, 28);
    pset(buf, ix + 2, iy, 204, 42, 28);
    pset(buf, ix, iy - 1, 86, 152, 52);
    pset(buf, ix, iy - 2, 196, 38, 24);
    pset(buf, ix - 1, iy - 2, 220, 210, 180);
    pset(buf, ix + 1, iy - 2, 220, 210, 180);
    const swing = attacking ? ((Math.floor(phase * 10) & 1) ? -1 : 2) : 0;
    pset(buf, ix - 2, iy - 1 + swing, 176, 184, 192);
    pset(buf, ix - 3, iy - 1 + swing, 212, 220, 228);
  }

  function drawCatapult(buf, x, y, firing) {
    const ix = x | 0;
    const iy = y | 0;
    fillRect(buf, ix - 3, iy - 2, 2, 5, 42, 36, 30);
    fillRect(buf, ix + 2, iy - 2, 2, 5, 42, 36, 30);
    fillRect(buf, ix - 2, iy - 2, 4, 5, 132, 92, 48);
    const armY = firing ? iy - 3 : iy + 1;
    pset(buf, ix, iy, 164, 118, 64);
    pset(buf, ix, armY, 245, 140, 30);
  }

  // Stepped 1994 Fog of War (bottom-left and top-right corners matching frame_010.jpg)
  function drawFogOfWar(buf) {
    const steps = [
      [104, 116, 8, 17],
      [116, 128, 23, 33],
      [128, 139, 36, 55],
      [139, 153, 64, 83],
      [153, 168, 88, 105],
      [168, 180, 108, 121]
    ];

    for (let s = 0; s < steps.length; s++) {
      const [y0, y1, solidX, ditherX] = steps[s];
      for (let y = y0; y < y1; y++) {
        for (let x = 0; x < ditherX; x++) {
          if (x < solidX) {
            if (y < y0 + 2 && s > 0 && x >= steps[s - 1][2]) {
              if ((x % 3 !== 0) && ((x + y) & 1) === 0) {
                pset(buf, x, y, 0, 0, 0);
              }
            } else {
              pset(buf, x, y, 0, 0, 0);
            }
          } else {
            if (((x + y) & 1) === 0 && (y > y0 + 1 || (x & 2) === 0)) {
              pset(buf, x, y, 0, 0, 0);
            }
          }
        }
      }
    }

    for (let y = 0; y < 18; y++) {
      const startX = y < 10 ? 280 : 298;
      for (let x = startX - 4; x < GW; x++) {
        if (x >= startX) {
          pset(buf, x, y, 0, 0, 0);
        } else if (((x + y) & 1) === 0) {
          pset(buf, x, y, 0, 0, 0);
        }
      }
    }
  }

  // Choreographed projectile barrage (localT in 0..8.0s)
  const BARRAGE = [
    // Wave 1 (2.0s - 3.2s): captures exact frame_011.jpg moment around localT ~ 2.72s!
    { t0: 1.95, t1: 2.40, x0: 95,  y0: -8,  x1: 62,  y1: 35,  r: 9,  craterR: 4.5 }, // NW trees
    { t0: 2.05, t1: 2.55, x0: 155, y0: -10, x1: 123, y1: 52,  r: 12, craterR: 5.5 }, // Barracks hit
    { t0: 2.12, t1: 2.60, x0: 258, y0: -8,  x1: 226, y1: 54,  r: 10, craterR: 5.0 }, // Guard Tower hit
    { t0: 2.18, t1: 2.65, x0: 205, y0: 10,  x1: 176, y1: 76,  r: 9,  craterR: 4.0 }, // Town Hall roof ignite
    { t0: 2.22, t1: 2.68, x0: 138, y0: 45,  x1: 104, y1: 109, r: 9,  craterR: 4.5 }, // Mid-Left Farm
    { t0: 2.30, t1: 2.72, x0: 280, y0: 42,  x1: 244, y1: 108, r: 14, craterR: 6.0 }, // Big East explosion (frame_011!)
    { t0: 2.34, t1: 2.74, x0: 192, y0: 55,  x1: 160, y1: 122, r: 9,  craterR: 5.8 }, // South courtyard explosion (frame_011!)
    { t0: 2.38, t1: 2.86, x0: 226, y0: 84,  x1: 205, y1: 123, r: 10, craterR: 5.2 }, // Streaking into SE Barn (frame_011!)
    { t0: 2.58, t1: 3.12, x0: 168, y0: -6,  x1: 142, y1: 88,  r: 10, craterR: 5.5 }, // Entering top at frame_011 -> road crater!

    // Wave 2 (3.2s - 5.3s): captures exact frame_012.jpg & Town Hall collapse into frame_013.jpg!
    { t0: 3.10, t1: 3.62, x0: 215, y0: 12,  x1: 185, y1: 58,  r: 9,  craterR: 5.5 }, // Crater NE of Town Hall
    { t0: 3.35, t1: 3.88, x0: 150, y0: 10,  x1: 116, y1: 68,  r: 10, craterR: 5.5 }, // Dithered sphere next to Barracks (frame_012!)
    { t0: 3.50, t1: 4.05, x0: 308, y0: 72,  x1: 278, y1: 128, r: 9,  craterR: 4.8 }, // SE clearing fire
    { t0: 4.15, t1: 4.68, x0: 232, y0: 34,  x1: 198, y1: 92,  r: 10, craterR: 5.5 }, // East road crater
    { t0: 4.65, t1: 5.20, x0: 210, y0: 14,  x1: 172, y1: 84,  r: 17, craterR: 7.5 }  // Final cataclysmic hit collapsing Town Hall!
  ];

  // Persistent fires once ignited
  const FIRES = [
    { x: 62,  y: 36,  tStart: 2.40, scale: 1.00, seed: 1.1 }, // NW Forest
    { x: 124, y: 50,  tStart: 2.55, scale: 1.25, seed: 2.3 }, // Barracks roof
    { x: 226, y: 56,  tStart: 2.60, scale: 1.35, seed: 3.7 }, // Guard Tower
    { x: 222, y: 46,  tStart: 3.20, scale: 1.15, seed: 4.9 }, // Guard Tower upper
    { x: 104, y: 110, tStart: 2.68, scale: 1.00, seed: 5.4 }, // Mid-Left Farm
    { x: 208, y: 124, tStart: 2.95, scale: 1.25, seed: 6.8 }, // SE Barn
    { x: 244, y: 110, tStart: 2.90, scale: 0.95, seed: 7.2 }, // Mid-Right Farm
    { x: 278, y: 129, tStart: 4.05, scale: 1.05, seed: 8.5 }, // SE Tree edge
    { x: 176, y: 79,  tStart: 2.65, scale: 1.00, seed: 9.1 }, // Town Hall roof / rubble lower
    { x: 170, y: 71,  tStart: 3.50, scale: 1.15, seed: 10.4 } // Town Hall upper / rubble
  ];

  window.GAMES[2] = {
    title: 'Warcraft: Orcs & Humans',
    year: '1994',
    draw(ctx, w, h, t) {
      initBuffers();
      const localT = ((t % 8.0) + 8.0) % 8.0;

      // 1. Copy precomputed terrain & forest into framePixels
      framePixels.set(basePixels);

      // 2. Animate water wave highlights in bottom-right pond
      const wavePhase = Math.floor(t * 4);
      for (let y = 142; y < 179; y += 3) {
        for (let x = 254; x < 319; x++) {
          const pdx = (x - 294) / 46;
          const pdy = (y - 166) / 29;
          if (pdx * pdx + pdy * pdy < 0.72) {
            if (((x + (y * 3) + wavePhase) % 9) < 2) {
              pset(framePixels, x, y, 54, 88, 136);
            }
          }
        }
      }

      // 3. Draw scorched ground craters for all projectiles that have impacted
      for (let i = 0; i < BARRAGE.length; i++) {
        const b = BARRAGE[i];
        if (localT >= b.t1) {
          drawCrater(framePixels, b.x1, b.y1, b.craterR);
        }
      }

      // 4. Draw Buildings (with progressive battle damage and Town Hall collapse)
      const barracksDmg = localT < 2.55 ? 0 : Math.min(1, (localT - 2.55) * 0.8);
      drawBarracks(framePixels, 110, 44, barracksDmg);

      const towerDmg = localT < 2.60 ? 0 : Math.min(1, (localT - 2.60) * 0.7);
      drawGuardTower(framePixels, 215, 43, towerDmg);

      // Seven Human Farms
      drawFarm(framePixels, 84, 65, 18, 14, false, 0);
      drawFarm(framePixels, 96, 105, 22, 16, false, localT >= 2.68 ? 0.6 : 0);
      drawFarm(framePixels, 128, 128, 16, 14, false, 0);
      drawFarm(framePixels, 150, 136, 16, 14, false, 0);
      drawFarm(framePixels, 196, 118, 24, 20, true, localT >= 2.86 ? 0.9 : 0);
      drawFarm(framePixels, 234, 105, 22, 16, false, localT >= 2.72 ? 0.6 : 0);
      drawFarm(framePixels, 254, 65, 16, 14, false, 0);

      // Central Human Town Hall (collapses at localT >= 5.20s into frame_013 rubble)
      const thCollapsed = localT >= 5.20;
      drawTownHall(framePixels, 150, 58, thCollapsed);

      if (thCollapsed) {
        drawCrater(framePixels, 142, 88, 5.8);
        drawCrater(framePixels, 198, 92, 5.8);
      }

      // 5. RTS Units: Peasants, Footmen, Orc Grunts, Catapults & Selection Box
      drawCatapult(framePixels, 152, 16, localT > 1.9 && localT < 4.8 && ((localT * 3) % 1) < 0.35);
      drawCatapult(framePixels, 242, 82, localT > 2.1 && localT < 4.6 && ((localT * 3 + 0.5) % 1) < 0.35);

      if (localT < 5.2) {
        const p1x = localT < 2.3 ? (78 + localT * 16) : (115 - (localT - 2.3) * 22);
        const p1y = roadCenterY(p1x) - 1;
        drawPeasant(framePixels, p1x, p1y, 'gold', localT);

        const p2x = localT < 2.3 ? (228 - localT * 12) : (200 + (localT - 2.3) * 18);
        const p2y = roadCenterY(p2x) + 1;
        drawPeasant(framePixels, p2x, p2y, 'wood', localT + 0.4);
      }

      const selected = localT >= 1.15 && localT < 2.35;
      const inCombat = localT >= 2.4;

      const footmen = [
        { x0: 138, y0: 90,  x1: 135, y1: 82 },
        { x0: 148, y0: 108, x1: 146, y1: 98 },
        { x0: 184, y0: 106, x1: 192, y1: 96 },
        { x0: 199, y0: 84,  x1: 204, y1: 84 }
      ];
      const moveP = Math.max(0, Math.min(1, (localT - 1.3) / 1.1));
      for (let i = 0; i < footmen.length; i++) {
        const fm = footmen[i];
        const fx = fm.x0 + (fm.x1 - fm.x0) * moveP;
        const fy = fm.y0 + (fm.y1 - fm.y0) * moveP;
        drawFootman(framePixels, fx, fy, selected && i < 3, inCombat, localT + i * 0.3);
      }

      if (localT >= 1.2) {
        const orcP = Math.max(0, Math.min(1, (localT - 1.2) / 1.5));
        const orcs = [
          { x0: 128, y0: 24, x1: 132, y1: 80 },
          { x0: 144, y0: 20, x1: 143, y1: 95 },
          { x0: 248, y0: 94, x1: 195, y1: 95 },
          { x0: 236, y0: 76, x1: 207, y1: 83 }
        ];
        for (let i = 0; i < orcs.length; i++) {
          const oc = orcs[i];
          const ox = oc.x0 + (oc.x1 - oc.x0) * orcP;
          const oy = oc.y0 + (oc.y1 - oc.y0) * orcP;
          drawOrcGrunt(framePixels, ox, oy, inCombat, localT + i * 0.4);
        }
      }

      // RTS green rubber-band drag selection box (0.45s - 1.15s)
      if (localT >= 0.45 && localT < 1.15) {
        const dp = (localT - 0.45) / 0.70;
        const bx0 = 131;
        const by0 = 83;
        const bx1 = (131 + dp * 60) | 0;
        const by1 = (83 + dp * 31) | 0;
        for (let x = bx0; x <= bx1; x++) {
          pset(framePixels, x, by0, 32, 236, 32);
          pset(framePixels, x, by1, 32, 236, 32);
        }
        for (let y = by0; y <= by1; y++) {
          pset(framePixels, bx0, y, 32, 236, 32);
          pset(framePixels, bx1, y, 32, 236, 32);
        }
      }

      // 6. Active Fires & Rising Smoke Plumes
      for (let i = 0; i < FIRES.length; i++) {
        const f = FIRES[i];
        if (localT >= f.tStart) {
          const grow = Math.min(1, (localT - f.tStart) / 0.35);
          drawSmokePlume(framePixels, f.x, f.y, f.scale * grow, localT, f.seed);
          drawPixelFire(framePixels, f.x, f.y, f.scale * grow, localT, f.seed);
        }
      }

      // 7. Streaking Projectiles & Checkerboard-Dithered Explosion Spheres
      let shakeAmp = 0;
      for (let i = 0; i < BARRAGE.length; i++) {
        const b = BARRAGE[i];
        if (localT >= b.t0 && localT <= b.t1) {
          const p = (localT - b.t0) / (b.t1 - b.t0);
          drawFireballStreak(framePixels, b.x0, b.y0, b.x1, b.y1, p);
        } else if (localT > b.t1 && localT <= b.t1 + 0.68) {
          const ep = (localT - b.t1) / 0.68;
          drawExplosionSphere(framePixels, b.x1, b.y1, b.r, ep);
          shakeAmp = Math.max(shakeAmp, (1 - ep) * (b.r > 14 ? 2.5 : 1.2));
        }
      }

      // 8. Authentic Stepped Black Fog of War (bottom-left & top-right corners)
      drawFogOfWar(framePixels);

      // 9. Blit 320x180 pixel buffer to main canvas with nearest-neighbor scaling
      bufCtx.putImageData(frameImgData, 0, 0);

      ctx.save();
      ctx.imageSmoothingEnabled = false;
      const sx = shakeAmp > 0 ? Math.sin(t * 55) * shakeAmp * (w / GW) : 0;
      const sy = shakeAmp > 0 ? Math.cos(t * 63) * shakeAmp * (h / GH) : 0;
      ctx.fillStyle = '#000';
      if (shakeAmp > 0) ctx.fillRect(0, 0, w, h);
      ctx.drawImage(bufCanvas, sx, sy, w, h);
      ctx.restore();
    }
  };
})();
