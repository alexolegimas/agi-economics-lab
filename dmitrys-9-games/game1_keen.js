// Game 1: Commander Keen (1990) — Authentic 320x180 16-Color IBM EGA Side-Scrolling Engine
// Features pixel-perfect Billy Blaze (Green Bay Packers helmet, magenta tee, blue jeans, red sneakers,
// centered compressing pogo stick, Neural Stunner raygun), hopping Yorp, Poison Slugs stunned with orbiting stars,
// multi-layer Bayer-dithered EGA parallax, stone cottages, organic boulder cliff, collectibles & score popups.

window.GAMES = window.GAMES || [];

(function () {
  const PW = 320;
  const PH = 180;

  const bufCanvas = document.createElement('canvas');
  bufCanvas.width = PW;
  bufCanvas.height = PH;
  const bctx = bufCanvas.getContext('2d');
  const imgData = bctx.createImageData(PW, PH);
  const pix = new Uint32Array(imgData.data.buffer);

  // Authentic 16-color IBM EGA Palette -> ABGR Uint32 (little-endian)
  function hexToU32(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return (255 << 24) | (b << 16) | (g << 8) | r;
  }

  const C = {
    BLACK: hexToU32('#000000'),
    BLUE: hexToU32('#0000AA'),
    GREEN: hexToU32('#00AA00'),
    CYAN: hexToU32('#00AAAA'),
    RED: hexToU32('#AA0000'),
    MAGENTA: hexToU32('#AA00AA'),
    BROWN: hexToU32('#AA5500'),
    LGRAY: hexToU32('#AAAAAA'),
    DGRAY: hexToU32('#555555'),
    BBLUE: hexToU32('#5555FF'),
    BGREEN: hexToU32('#55FF55'),
    BCYAN: hexToU32('#55FFFF'),
    BRED: hexToU32('#FF5555'),
    BMAGENTA: hexToU32('#FF55FF'),
    YELLOW: hexToU32('#FFFF55'),
    WHITE: hexToU32('#FFFFFF'),
  };

  const CHAR_PAL = {
    '.': null,
    'K': C.BLACK,
    'b': C.BLUE,
    'g': C.GREEN,
    'c': C.CYAN,
    'r': C.RED,
    'm': C.MAGENTA,
    'n': C.BROWN,
    's': C.LGRAY,
    'd': C.DGRAY,
    'B': C.BBLUE,
    'G': C.BGREEN,
    'C': C.BCYAN,
    'R': C.BRED,
    'M': C.BMAGENTA,
    'Y': C.YELLOW,
    'W': C.WHITE,
  };

  function pset(x, y, col) {
    const ix = x | 0;
    const iy = y | 0;
    if (ix < 0 || ix >= PW || iy < 0 || iy >= PH) return;
    pix[iy * PW + ix] = col;
  }

  function fillRect(x, y, w, h, col) {
    const x0 = Math.max(0, x | 0);
    const y0 = Math.max(0, y | 0);
    const x1 = Math.min(PW, (x + w) | 0);
    const y1 = Math.min(PH, (y + h) | 0);
    for (let py = y0; py < y1; py++) {
      const row = py * PW;
      for (let px = x0; px < x1; px++) {
        pix[row + px] = col;
      }
    }
  }

  function drawBox(x, y, w, h, fillCol, borderCol) {
    fillRect(x, y, w, h, borderCol);
    if (w > 2 && h > 2) {
      fillRect(x + 1, y + 1, w - 2, h - 2, fillCol);
    }
  }

  function drawSprite(sx, sy, rows, flipX = false) {
    const baseX = Math.round(sx);
    const baseY = Math.round(sy);
    const h = rows.length;
    for (let ry = 0; ry < h; ry++) {
      const py = baseY + ry;
      if (py < 0 || py >= PH) continue;
      const rowStr = rows[ry];
      const w = rowStr.length;
      for (let rx = 0; rx < w; rx++) {
        const ch = rowStr[flipX ? (w - 1 - rx) : rx];
        const col = CHAR_PAL[ch];
        if (col !== null && col !== undefined) {
          const px = baseX + rx;
          if (px >= 0 && px < PW) {
            pix[py * PW + px] = col;
          }
        }
      }
    }
  }

  // 3x5 Pixel Font for Score Popups ("100", "200", "500") & "EXIT" sign
  const PIXEL_FONT = {
    '0': ['111', '101', '101', '101', '111'],
    '1': ['010', '110', '010', '010', '111'],
    '2': ['111', '001', '111', '100', '111'],
    '5': ['111', '100', '111', '001', '111'],
    'E': ['111', '100', '110', '100', '111'],
    'X': ['101', '101', '010', '101', '101'],
    'I': ['111', '010', '010', '010', '111'],
    'T': ['111', '010', '010', '010', '010'],
  };

  function drawPixelScore(x, y, text, fgCol = C.YELLOW, shadowCol = C.BLACK) {
    const bx = Math.round(x);
    const by = Math.round(y);
    let cx = bx;
    for (let i = 0; i < text.length; i++) {
      const glyph = PIXEL_FONT[text[i]];
      if (!glyph) continue;
      for (let ry = 0; ry < 5; ry++) {
        for (let rx = 0; rx < 3; rx++) {
          if (glyph[ry][rx] === '1') {
            pset(cx + rx + 1, by + ry + 1, shadowCol);
            pset(cx + rx, by + ry + 1, shadowCol);
            pset(cx + rx + 1, by + ry, shadowCol);
          }
        }
      }
      for (let ry = 0; ry < 5; ry++) {
        for (let rx = 0; rx < 3; rx++) {
          if (glyph[ry][rx] === '1') {
            pset(cx + rx, by + ry, fgCol);
          }
        }
      }
      cx += 4;
    }
  }

  // Dithered EGA Circle helper with 1px black outline, highlight & shadow regions
  function drawCanopyLobe(cx, cy, r, worldOffsetX) {
    const ix = Math.round(cx);
    const iy = Math.round(cy);
    const r2 = r * r;
    const rOut2 = (r + 1.2) * (r + 1.2);
    for (let dy = -r - 2; dy <= r + 2; dy++) {
      const py = iy + dy;
      if (py < 0 || py >= PH) continue;
      for (let dx = -r - 2; dx <= r + 2; dx++) {
        const px = ix + dx;
        if (px < 0 || px >= PW) continue;
        const d2 = dx * dx + dy * dy;
        if (d2 <= rOut2) {
          if (d2 > r2) {
            pset(px, py, C.BLACK);
          } else {
            const wx = px + worldOffsetX;
            const lightMetric = dx * 0.65 + dy * 0.75;
            if (lightMetric < -r * 0.42) {
              pset(px, py, ((wx + py) & 1) === 0 ? C.BGREEN : C.GREEN);
            } else if (lightMetric > r * 0.32) {
              pset(px, py, ((wx + py) & 1) === 0 ? C.BLACK : C.GREEN);
            } else {
              pset(px, py, C.GREEN);
            }
          }
        }
      }
    }
  }

  // Organic Rounded Multi-Lobe Foreground Bush (matches frame_001..004)
  function drawOrganicBush(wx, groundY, wScale, scrollX) {
    const sx = Math.round(wx - scrollX);
    if (sx < -30 || sx > PW + 30) return;
    const lobes = [
      [-6 * wScale, -4, 5 * wScale],
      [6 * wScale, -4, 5 * wScale],
      [0, -6, 6.5 * wScale],
    ];
    const rMax = Math.ceil(14 * wScale);
    for (let dy = -rMax; dy <= 0; dy++) {
      const py = groundY + dy;
      if (py < 0 || py >= PH) continue;
      for (let dx = -rMax; dx <= rMax; dx++) {
        const px = sx + dx;
        if (px < 0 || px >= PW) continue;
        let minD = 99;
        for (let i = 0; i < lobes.length; i++) {
          const lx = dx - lobes[i][0];
          const ly = dy - lobes[i][1];
          const lr = lobes[i][2];
          const d = (lx * lx + ly * ly) / (lr * lr);
          if (d < minD) minD = d;
        }
        if (minD <= 1.28) {
          if (minD > 1.0 || dy === 0) {
            pset(px, py, C.BLACK);
          } else if (dx + dy < -5 * wScale) {
            pset(px, py, C.BGREEN);
          } else if (dx - dy > 4 * wScale) {
            pset(px, py, ((px + py) & 1) === 0 ? C.BLACK : C.GREEN);
          } else {
            pset(px, py, C.GREEN);
          }
        }
      }
    }
  }

  // Multi-lobe EGA Tree (authentic Commander Keen style)
  function drawTree(wx, groundY, trunkH, canopyScale, scrollX) {
    const sx = Math.round(wx - scrollX);
    if (sx < -60 || sx > PW + 60) return;

    const tw = Math.round(10 * canopyScale);
    const tx = sx - (tw >> 1);
    const ty = groundY - trunkH;

    // Brown trunk with black border & bark pixel texture
    fillRect(tx - 1, ty, tw + 2, trunkH, C.BLACK);
    fillRect(tx, ty, tw, trunkH, C.BROWN);
    for (let by = ty + 4; by < groundY - 3; by += 6) {
      pset(tx + 2, by, C.BLACK);
      pset(tx + 2, by + 1, C.BLACK);
      if (tw > 6) {
        pset(tx + tw - 3, by + 3, C.BLACK);
        pset(tx + tw - 3, by + 4, C.BLACK);
      }
    }

    // Multi-lobed foliage canopy
    const rMain = Math.round(18 * canopyScale);
    const rSide = Math.round(14 * canopyScale);
    const cy = ty - Math.round(6 * canopyScale);
    const wOff = Math.round(scrollX);

    drawCanopyLobe(sx - Math.round(10 * canopyScale), cy + 2, rSide, wOff);
    drawCanopyLobe(sx + Math.round(11 * canopyScale), cy + 3, rSide, wOff);
    drawCanopyLobe(sx, cy - Math.round(7 * canopyScale), rMain, wOff);

    // Small internal contour detail pixels
    pset(sx - 3, cy - 2, C.BLACK);
    pset(sx - 2, cy - 1, C.BLACK);
    pset(sx + 4, cy - 3, C.BLACK);
  }

  // Fluffy EGA Cloud with dithered cyan/white bottom shadow
  function drawCloud(sx, sy, scale = 1.0) {
    const lobes = [
      [-10 * scale, 2 * scale, 7 * scale],
      [10 * scale, 3 * scale, 6 * scale],
      [-3 * scale, -3 * scale, 9 * scale],
      [5 * scale, -1 * scale, 8 * scale],
    ];
    const rMax = Math.ceil(22 * scale);
    const ix = Math.round(sx);
    const iy = Math.round(sy);

    for (let dy = -rMax; dy <= rMax; dy++) {
      const py = iy + dy;
      if (py < 0 || py >= PH) continue;
      for (let dx = -rMax; dx <= rMax; dx++) {
        const px = ix + dx;
        if (px < 0 || px >= PW) continue;
        let inside = false;
        let minNormDist = 99;
        for (let i = 0; i < lobes.length; i++) {
          const lx = dx - lobes[i][0];
          const ly = dy - lobes[i][1];
          const lr = lobes[i][2];
          const d = (lx * lx + ly * ly) / (lr * lr);
          if (d <= 1.0) {
            inside = true;
            if (d < minNormDist) minNormDist = d;
          }
        }
        if (inside) {
          if (dy > 3 * scale || (dy > 0 && minNormDist > 0.72)) {
            pset(px, py, ((px + py) & 1) === 0 ? C.WHITE : C.BCYAN);
          } else {
            pset(px, py, C.WHITE);
          }
        }
      }
    }
  }

  // Stone Brick Cottage with Red or Brown Tiled Roof, Window & Wooden Door
  function drawStoneCottage(wx, groundY, w, h, roofType, scrollX) {
    const sx = Math.round(wx - scrollX);
    if (sx + w < -20 || sx > PW + 20) return;
    const sy = groundY - h;

    // Stone brick wall body
    drawBox(sx, sy, w, h, C.LGRAY, C.BLACK);

    // Brick courses & highlight/shadow stones
    const courseH = 6;
    for (let by = sy + 1; by < groundY - 1; by += courseH) {
      fillRect(sx + 1, by, w - 2, 1, C.DGRAY);
      const rowIdx = Math.floor((by - sy) / courseH);
      const bw = 12;
      const offset = (rowIdx & 1) ? 6 : 0;
      for (let bx = sx + 1 + offset; bx < sx + w - 2; bx += bw) {
        fillRect(bx, by + 1, 1, Math.min(courseH - 1, groundY - by - 1), C.DGRAY);
        const isWhiteBrick = ((rowIdx * 7 + Math.floor((bx - sx) / bw)) % 3) === 0;
        const brickW = Math.min(bw - 2, sx + w - 2 - bx);
        const brickH = Math.min(courseH - 2, groundY - 1 - (by + 1));
        if (brickW > 0 && brickH > 0) {
          fillRect(bx + 1, by + 1, brickW, brickH, isWhiteBrick ? C.WHITE : C.LGRAY);
          if (!isWhiteBrick && brickH >= 2) {
            fillRect(bx + 1, by + 1, brickW, 1, C.WHITE);
          }
        }
      }
    }

    // Pitched Roof with overhang
    const roofH = Math.round(w * 0.26);
    for (let ry = 0; ry < roofH; ry++) {
      const py = sy - roofH + ry;
      const halfSpan = Math.round(((ry + 1) / roofH) * (w * 0.5 + 4));
      const rx0 = sx + (w >> 1) - halfSpan;
      const rw = halfSpan * 2;
      pset(rx0 - 1, py, C.BLACK);
      pset(rx0 + rw, py, C.BLACK);

      const isTileLine = (ry % 3) === 0;
      for (let rx = 0; rx < rw; rx++) {
        const px = rx0 + rx;
        if (isTileLine || ry === roofH - 1) {
          pset(px, py, C.BLACK);
        } else if (roofType === 'red') {
          const isShingleEdge = ((rx + ry * 2) % 6) === 0;
          const isHighlight = rx < rw * 0.35 && (ry & 1) === 1;
          pset(px, py, isShingleEdge ? C.BLACK : (isHighlight ? C.BRED : C.RED));
        } else {
          const isHighlight = ry < roofH * 0.55 && ((px + py) & 1) === 0;
          pset(px, py, isHighlight ? C.YELLOW : C.BROWN);
        }
      }
    }

    // Paned Cyan Window on left side
    const winX = sx + 8;
    const winY = sy + 10;
    drawBox(winX, winY, 11, 11, C.BCYAN, C.BLACK);
    fillRect(winX + 1, winY + 1, 9, 9, C.BROWN);
    fillRect(winX + 2, winY + 2, 3, 3, C.BCYAN);
    fillRect(winX + 6, winY + 2, 3, 3, C.BCYAN);
    fillRect(winX + 2, winY + 6, 3, 3, C.BCYAN);
    fillRect(winX + 6, winY + 6, 3, 3, C.BCYAN);
    pset(winX + 2, winY + 2, C.WHITE);

    // Brown Wooden Door with yellow knob on right-center
    const doorW = 11;
    const doorH = 21;
    const doorX = sx + w - 22;
    const doorY = groundY - doorH;
    drawBox(doorX, doorY, doorW, doorH, C.BROWN, C.BLACK);
    fillRect(doorX + 2, doorY + 2, 1, doorH - 3, C.BLACK);
    pset(doorX + doorW - 3, doorY + 11, C.YELLOW);
  }

  // Grooved Wooden Stump Platform (from frame_001.jpg)
  function drawWoodStumpPlatform(wx, yTop, groundY, w, scrollX) {
    const sx = Math.round(wx - scrollX);
    if (sx + w < -10 || sx > PW + 10) return;
    const h = groundY - yTop;
    drawBox(sx, yTop + 2, w, h - 2, C.BROWN, C.BLACK);
    for (let gx = sx + 6; gx < sx + w - 4; gx += 6) {
      fillRect(gx, yTop + 4, 1, h - 5, C.BLACK);
    }
    fillRect(sx + 2, yTop, w - 4, 3, C.YELLOW);
    fillRect(sx + 5, yTop + 1, w - 10, 1, C.BROWN);
    pset(sx + 1, yTop + 1, C.BLACK);
    pset(sx + w - 2, yTop + 1, C.BLACK);
  }

  // T-Shaped Stone & Wood Platform (from frame_002.jpg)
  function drawTStonePlatform(wx, yTop, groundY, w, scrollX) {
    const sx = Math.round(wx - scrollX);
    if (sx + w < -10 || sx > PW + 10) return;
    const postW = 10;
    const postX = sx + ((w - postW) >> 1);
    const slabH = 12;

    drawBox(postX, yTop + slabH - 1, postW, groundY - (yTop + slabH - 1), C.BROWN, C.BLACK);
    for (let py = yTop + slabH + 3; py < groundY - 4; py += 6) {
      pset(postX + 3, py, C.BLACK);
      pset(postX + 6, py + 2, C.BLACK);
    }

    drawBox(sx, yTop, w, slabH, C.LGRAY, C.BLACK);
    fillRect(sx + 1, yTop + 1, w - 2, 2, C.WHITE);
    fillRect(sx + 1, yTop + slabH - 3, w - 2, 2, C.DGRAY);
    for (let rx = sx + 5; rx < sx + w - 4; rx += 6) {
      pset(rx, yTop + 4, C.DGRAY);
      pset(rx + 3, yTop + 7, C.DGRAY);
    }
  }

  // Floating Grass-Topped Dirt Platform
  function drawFloatingGrassPlatform(wx, yTop, w, h, scrollX) {
    const sx = Math.round(wx - scrollX);
    if (sx + w < -10 || sx > PW + 10) return;
    drawBox(sx, yTop + 3, w, h - 3, C.BROWN, C.BLACK);
    for (let py = yTop + 5; py < yTop + h - 2; py += 3) {
      for (let px = sx + 3; px < sx + w - 3; px += 5) {
        if (((px + py) & 1) === 0) pset(px, py, C.BLACK);
      }
    }
    drawBox(sx - 1, yTop, w + 2, 5, C.GREEN, C.BLACK);
    fillRect(sx, yTop + 1, w, 2, C.BGREEN);
    for (let gx = sx + 2; gx < sx + w - 2; gx += 4) {
      pset(gx, yTop + 3, C.BGREEN);
    }
  }

  // Collectibles: Cyan Lifewater Raindrop & Red Shikadi Soda Can
  const RAINDROP_SPRITE = [
    '...K...',
    '..KCK..',
    '.KWCWK.',
    '.KCCCK.',
    'KWCCCCK',
    'KCCCCCK',
    'KCCCbCK',
    '.KbbbK.',
    '..KKK..',
  ];

  const SODA_SPRITE = [
    '.KKKKK.',
    'KWWWWWK',
    'KRRRRRK',
    'KRRRRRK',
    'KWWWWWK',
    'KRRRRRK',
    'KRRRRRK',
    'KsssssK',
    '.KKKKK.',
  ];

  // Classic Enemies: Cute One-Eyed Green Yorp & Yellow/Green Poison Slug
  const YORP_SPRITE_OPEN = [
    '..K...K..',
    '..KG.GK..',
    '...KGK...',
    '..KGGGK..',
    '.KGWWWGK.',
    '.KGWKWGK.',
    '.KGWWWGK.',
    'KGGGGGGGK',
    'KGGgGgGGK',
    'KGGGGGGGK',
    '.KgggggK.',
    '.Kdd.ddK.',
    '.KKK.KKK.',
  ];

  const YORP_SPRITE_BLINK = [
    '..K...K..',
    '..KG.GK..',
    '...KGK...',
    '..KGGGK..',
    '.KGGGGGK.',
    '.KGKKKGK.',
    '.KGGGGGK.',
    'KGGGGGGGK',
    'KGGgGgGGK',
    'KGGGGGGGK',
    '.KgggggK.',
    '.Kdd.ddK.',
    '.KKK.KKK.',
  ];

  const SLUG_SPRITE_WALK = [
    '....KKKKK....',
    '...KYYYYYK...',
    '..KYWWYWWYK..',
    '..KYWKYWKYK..',
    '..KYYYYYYYK..',
    '..KYGGGGGYK..',
    '.KYYGGGGGYK..',
    '.KYYYYYYYYK..',
    'KGGGYYYYYGGGK',
    'KGGGGGGGGGGGK',
    '.KKKKKKKKKKK.',
  ];

  const SLUG_SPRITE_STUN = [
    '.............',
    '....KKKKK....',
    '..KKYYYYYKK..',
    '.KYKWWYWWKYK.',
    '.KYYKYYYKYYK.',
    'KYYYGGGGGYK..',
    'KGGGGGGGGGGGK',
    '.KKKKKKKKKKK.',
  ];

  // ============================================================================
  // UNMISTAKABLE PIXEL-ART BILLY BLAZE (COMMANDER KEEN) SPRITES (20x26 & Pogo)
  // Green Bay Packers Yellow/Green Helmet, Black Face Opening & White Eyes,
  // Magenta T-Shirt (#FF55FF / #AA00AA), Blue Jeans (#5555FF), Red Sneakers (#FF5555),
  // AND Centered Pogo Stick with T-Handlebar, Footpegs & Compressing Coil Spring!
  // ============================================================================
  const KEEN_RUN_1 = [
    '....KKKKKKKKK.....',
    '...KYYYYYYYYYK....',
    '..KYGGGGGGGGGYK...',
    '..KYWWWWWWWWWYK...',
    '.KYYGGGGGGGGGYYK..',
    '.KYYYYYYYYYYYYYK..',
    '.KYYYYYKKKKKKKYK..',
    '.KYYYYKWKWWKWK....',
    '.KYYYYKWKWWKWK....',
    '..KYYYKWWWWWWWK...',
    '...KKKKKKKKKKK....',
    '....KMMMMMMMK.....',
    '..KKMMMMMMMMMKK...',
    '.KMMmMMMMMMMmMMK..',
    '.KWWKMMMMMMMKWWK..',
    '..KK.KmmmmmK.KK...',
    '....KBBBBBBBK.....',
    '...KBBBBBBBBBK....',
    '..KBBbKKKKKbBBK...',
    '..KbbK.....KbbK...',
    '.KRRRK.....KRRRK..',
    'KRRRRK.....KRRRRK.',
    'KWWWWK.....KWWWWK.',
    'KKKKKK.....KKKKKK.',
  ];

  const KEEN_RUN_2 = [
    '....KKKKKKKKK.....',
    '...KYYYYYYYYYK....',
    '..KYGGGGGGGGGYK...',
    '..KYWWWWWWWWWYK...',
    '.KYYGGGGGGGGGYYK..',
    '.KYYYYYYYYYYYYYK..',
    '.KYYYYYKKKKKKKYK..',
    '.KYYYYKWKWWKWK....',
    '.KYYYYKWKWWKWK....',
    '..KYYYKWWWWWWWK...',
    '...KKKKKKKKKKK....',
    '....KMMMMMMMK.....',
    '...KMMMMMMMMMK....',
    '..KMMmMMMMMmMMK...',
    '..KWWKMMMMMKWWK...',
    '...KK.KmmmK.KK....',
    '.....KBBBBBK......',
    '....KBBBBBBBK.....',
    '....KBBbKbBBK.....',
    '...KbbK...KbbK....',
    '...KRRRK.KRRRK....',
    '..KRRRRK.KRRRRK...',
    '..KWWWWK.KWWWWK...',
    '..KKKKKK.KKKKKK...',
  ];

  // Keen standing squarely ON his Pogo Stick (pogo pole centered at cols 8..10!)
  const KEEN_POGO_BODY = [
    '....KKKKKKKKK.....',
    '...KYYYYYYYYYK....',
    '..KYGGGGGGGGGYK...',
    '..KYWWWWWWWWWYK...',
    '.KYYGGGGGGGGGYYK..',
    '.KYYYYYYYYYYYYYK..',
    '.KYYYYYKKKKKKKYK..',
    '.KYYYYKWKWWKWK....',
    '.KYYYYKWKWWKWK....',
    '..KYYYKWWWWWWWK...',
    '...KKKKKKKKKKK....',
    '...KMMMKKKMMMK....',
    '..KMMMKdddKMMMK...',
    '..KWWWKWRWKWWWK...',
    '...KKmKWsWKmKK....',
    '....KBBWRWBBK.....',
    '...KBBBWsWBBBK....',
    '...KbbKWRWKbbK....',
    '..KRRRKWsWKRRRK...',
    '..KRRRRWRWRRRRK...',
    '..KWWWWWsWWWWWK...',
    '..KKKKddKddKKKK...',
  ];

  // Keen on his Pogo Stick firing his Neural Stunner Raygun to the right!
  const KEEN_POGO_FIRE = [
    '....KKKKKKKKK.......',
    '...KYYYYYYYYYK......',
    '..KYGGGGGGGGGYK.....',
    '..KYWWWWWWWWWYK.....',
    '.KYYGGGGGGGGGYYK....',
    '.KYYYYYYYYYYYYYK....',
    '.KYYYYYKKKKKKKYK....',
    '.KYYYYKWKWWKWK......',
    '.KYYYYKWKWWKWK......',
    '..KYYYKWWWWWWWK.....',
    '...KKKKKKKKKKK......',
    '...KMMMKKKMMMK..KKKK',
    '..KMMMKdddKMMMKKBBBB',
    '..KWWWKWRWKMMMWWGGGY',
    '...KKmKWsWKMMMKKBBBB',
    '....KBBWRWBBK...KKKK',
    '...KBBBWsWBBBK......',
    '...KbbKWRWKbbK......',
    '..KRRRKWsWKRRRK.....',
    '..KRRRRWRWRRRRK.....',
    '..KWWWWWsWWWWWK.....',
    '..KKKKddKddKKKK.....',
  ];

  function drawCommanderKeenPogo(sx, sy, springCompress, isFiring) {
    const bx = Math.round(sx);
    const by = Math.round(sy);
    drawSprite(bx, by, isFiring ? KEEN_POGO_FIRE : KEEN_POGO_BODY, false);

    // Animated compressing silver/red pogo spring centered right under Keen's sneakers (cols bx + 7..11)
    const springTop = by + 22;
    const springLen = Math.max(3, Math.round(8 - springCompress * 5));
    for (let i = 0; i < springLen; i++) {
      const py = springTop + i;
      const isCoil = (i & 1) === 0;
      pset(bx + 7, py, C.BLACK);
      pset(bx + 8, py, isCoil ? C.WHITE : C.DGRAY);
      pset(bx + 9, py, isCoil ? C.WHITE : C.BRED);
      pset(bx + 10, py, isCoil ? C.LGRAY : C.DGRAY);
      pset(bx + 11, py, C.BLACK);
    }
    // Rubber pogo foot tip
    const tipY = springTop + springLen;
    fillRect(bx + 7, tipY, 5, 2, C.BLACK);
    pset(bx + 8, tipY, C.BRED);
    pset(bx + 9, tipY, C.WHITE);
    pset(bx + 10, tipY, C.RED);

    // Bright green/white muzzle flash when firing Neural Stunner
    if (isFiring) {
      const mx = bx + 20;
      const my = by + 13;
      fillRect(mx, my - 1, 3, 3, C.WHITE);
      pset(mx + 3, my, C.BGREEN);
      pset(mx + 1, my - 2, C.BGREEN);
      pset(mx + 1, my + 2, C.BGREEN);
    }
  }

  function drawCommanderKeenRun(sx, sy, runFrame) {
    const bx = Math.round(sx);
    const by = Math.round(sy);
    const bob = (runFrame & 1) ? -1 : 0;
    drawSprite(bx, by + bob, (runFrame & 1) ? KEEN_RUN_1 : KEEN_RUN_2, false);
  }

  // Deterministic pseudo-random helper
  function hashInt(n) {
    let x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  }

  // Organic rounded grey rock in brown underground dirt (like frame_001 & frame_003)
  function drawUndergroundStone(sx, sy, w, h) {
    if (sx + w < 0 || sx >= PW || sy + h < 0 || sy >= PH) return;
    const rx = w * 0.5;
    const ry = h * 0.5;
    const cx = sx + rx;
    const cy = sy + ry;
    for (let py = sy - 1; py <= sy + h + 1; py++) {
      if (py < 0 || py >= PH) continue;
      for (let px = sx - 1; px <= sx + w + 1; px++) {
        if (px < 0 || px >= PW) continue;
        const nx = (px - cx) / rx;
        const ny = (py - cy) / ry;
        const d = nx * nx + ny * ny;
        if (d <= 1.25) {
          if (d > 0.88) {
            pset(px, py, C.BLACK);
          } else if (nx + ny < -0.35) {
            pset(px, py, C.WHITE);
          } else if (nx + ny > 0.45) {
            pset(px, py, C.DGRAY);
          } else {
            pset(px, py, C.LGRAY);
          }
        }
      }
    }
  }

  // Organic Interlocking Rocky Cliff Boulder (matches frame_004.jpg)
  function drawCliffBoulder(sx, sy, w, h, seed) {
    if (sx + w < 0 || sx >= PW || sy + h < 0 || sy >= PH) return;
    fillRect(sx, sy, w, h, C.BLACK);
    for (let dy = 1; dy < h - 1; dy++) {
      const py = sy + dy;
      if (py < 0 || py >= PH) continue;
      for (let dx = 1; dx < w - 1; dx++) {
        const px = sx + dx;
        if (px < 0 || px >= PW) continue;
        // Organic chamfered corners for interlocking rock look
        const cornerDist =
          Math.min(dx, w - 1 - dx) + Math.min(dy, h - 1 - dy);
        if (cornerDist <= 2 + (seed & 1)) {
          pset(px, py, C.BLACK);
        } else if (dx + dy * 1.4 < w * 0.45) {
          pset(px, py, C.WHITE);
        } else if (dx + dy * 1.3 > w * 0.78 + h * 0.45) {
          pset(px, py, C.DGRAY);
        } else {
          const speck = ((dx * 7 + dy * 13 + seed) % 19) === 0;
          pset(px, py, speck ? C.DGRAY : C.LGRAY);
        }
      }
    }
  }

  // Collectibles list along the level scroll path
  const COLLECTIBLES = [
    { wx: 118, wy: 76, type: 'drop', score: '100', collectT: 1.12 },
    { wx: 165, wy: 64, type: 'soda', score: '200', collectT: 1.42 },
    { wx: 238, wy: 66, type: 'drop', score: '100', collectT: 2.08 },
    { wx: 290, wy: 48, type: 'soda', score: '500', collectT: 2.45 },
    { wx: 412, wy: 54, type: 'soda', score: '500', collectT: 3.55 },
    { wx: 524, wy: 58, type: 'drop', score: '500', collectT: 5.02 },
    { wx: 596, wy: 112, type: 'drop', score: '100', collectT: 6.32 },
    { wx: 620, wy: 112, type: 'drop', score: '100', collectT: 6.72 },
    { wx: 644, wy: 112, type: 'drop', score: '100', collectT: 7.12 },
  ];

  // Pre-configured trees in the foreground world
  const TREES = [
    { wx: 14, groundY: 148, trunkH: 42, scale: 1.15 },
    { wx: 122, groundY: 148, trunkH: 30, scale: 0.90 },
    { wx: 228, groundY: 148, trunkH: 38, scale: 1.10 },
    { wx: 332, groundY: 148, trunkH: 34, scale: 0.95 },
    { wx: 454, groundY: 148, trunkH: 32, scale: 0.88 },
    { wx: 552, groundY: 132, trunkH: 36, scale: 1.05 },
  ];

  function lerp(a, b, t) {
    return a + (b - a) * Math.max(0, Math.min(1, t));
  }

  // Compute Commander Keen's exact world position, state & pogo spring across the 8.0s loop
  function getKeenState(localT) {
    // 0.00..0.80: Runs right past the hopping Yorp
    if (localT < 0.80) {
      const p = localT / 0.80;
      return {
        wx: lerp(32, 92, p),
        wy: 148,
        mode: 'run',
        runFrame: Math.floor(localT * 12),
        spring: 0,
        firing: false,
      };
    }
    // 0.80..1.75: Pogo Jump 1 onto the Wooden Stump (wx=203, wy=106), firing Stunner at t=0.98..1.24
    if (localT < 1.75) {
      const p = (localT - 0.80) / 0.95;
      const arc = 4 * p * (1 - p);
      const baseY = lerp(148, 106, p);
      return {
        wx: lerp(92, 203, p),
        wy: baseY - arc * 44,
        mode: 'pogo',
        spring: p < 0.14 ? (1 - p / 0.14) : (p > 0.86 ? (p - 0.86) / 0.14 : 0),
        firing: localT >= 0.98 && localT <= 1.24,
      };
    }
    // 1.75..3.10: Big Pogo Jump 2 over Red-Roofed Stone Cottage onto Cottage 2 Roof (wx=368, wy=98)
    if (localT < 3.10) {
      const p = (localT - 1.75) / 1.35;
      const arc = 4 * p * (1 - p);
      const baseY = lerp(106, 98, p);
      return {
        wx: lerp(203, 368, p),
        wy: baseY - arc * 56,
        mode: 'pogo',
        spring: p < 0.12 ? (1 - p / 0.12) : (p > 0.88 ? (p - 0.88) / 0.12 : 0),
        firing: false,
      };
    }
    // 3.10..4.45: Pogo Jump 3 from Cottage 2 Roof to T-Stone Platform (wx=462, wy=98), firing Stunner mid-air!
    if (localT < 4.45) {
      const p = (localT - 3.10) / 1.35;
      const arc = 4 * p * (1 - p);
      const baseY = 98;
      return {
        wx: lerp(368, 462, p),
        wy: baseY - arc * 48,
        mode: 'pogo',
        spring: p < 0.12 ? (1 - p / 0.12) : (p > 0.88 ? (p - 0.88) / 0.12 : 0),
        firing: localT >= 3.35 && localT <= 3.65,
      };
    }
    // 4.45..5.65: Pogo Vault 4 past the Silver Exit Pole onto the Elevated Rocky Cliff (wx=542, wy=128)
    if (localT < 5.65) {
      const p = (localT - 4.45) / 1.20;
      const arc = 4 * p * (1 - p);
      const baseY = lerp(98, 128, p);
      return {
        wx: lerp(462, 542, p),
        wy: baseY - arc * 52,
        mode: 'pogo',
        spring: p < 0.12 ? (1 - p / 0.12) : (p > 0.88 ? (p - 0.88) / 0.12 : 0),
        firing: false,
      };
    }
    // 5.65..8.00: Victory Run across the Rocky Cliff Plateau past the Checkered Flag & Raindrops into EXIT!
    const p = (localT - 5.65) / 2.35;
    return {
      wx: lerp(542, 668, p),
      wy: 128,
      mode: 'run',
      runFrame: Math.floor(localT * 12),
      spring: 0,
      firing: false,
    };
  }

  window.GAMES[0] = {
    title: 'Commander Keen',
    year: '1990',
    draw(ctx, w, h, t) {
      const localT = ((t % 8.0) + 8.0) % 8.0;
      const keen = getKeenState(localT);

      // Smooth camera scroll from scrollX = 0 to scrollX = 380 following Keen
      const targetScroll = keen.wx - 142;
      const scrollX = Math.max(0, Math.min(380, targetScroll));
      const iScroll = Math.round(scrollX);
      const skyScroll = Math.round(scrollX * 0.2);
      const mountainScroll = Math.round(scrollX * 0.35);
      const hillScroll = Math.round(scrollX * 0.65);

      // ========================================================================
      // 1. EGA BAYER-DITHERED SKY & FLUFFY PIXEL CLOUDS
      // ========================================================================
      for (let y = 0; y < PH; y++) {
        const row = y * PW;
        for (let x = 0; x < PW; x++) {
          const wx = x + skyScroll;
          if (y < 18) {
            pix[row + x] = ((wx & 1) === 0 && (y & 1) === 0) ? C.BCYAN : C.BBLUE;
          } else if (y < 36) {
            const d = ((wx + y) & 1) === 0 && ((wx & 3) !== 0 || (y & 1) === 0);
            pix[row + x] = d ? C.BCYAN : C.BBLUE;
          } else if (y < 92) {
            pix[row + x] = ((wx + y) & 1) === 0 ? C.BBLUE : C.BCYAN;
          } else {
            pix[row + x] = ((wx & 1) === 0 && (y & 1) === 0) ? C.BBLUE : C.BCYAN;
          }
        }
      }

      // Parallax Fluffy White/Cyan Clouds
      const cloudPositions = [
        [45, 28, 0.9],
        [142, 18, 1.15],
        [275, 32, 1.05],
        [375, 22, 1.1],
        [465, 38, 0.95],
      ];
      for (let i = 0; i < cloudPositions.length; i++) {
        const cx = cloudPositions[i][0] - skyScroll;
        const cy = cloudPositions[i][1];
        const cScale = cloudPositions[i][2];
        if (cx > -40 && cx < PW + 40) {
          drawCloud(cx, cy, cScale);
        }
      }

      // ========================================================================
      // 2. DISTANT CYAN-GREEN MOUNTAINS (Parallax 0.35x)
      // ========================================================================
      for (let x = 0; x < PW; x++) {
        const mwx = x + mountainScroll;
        const mWave =
          Math.sin(mwx * 0.024) * 26 +
          Math.cos(mwx * 0.013 + 1.2) * 18 +
          Math.sin(mwx * 0.052) * 6;
        const mTop = Math.round(78 - mWave);
        for (let y = Math.max(0, mTop); y < 148; y++) {
          const isDot = ((mwx & 1) === 0 && (y & 1) === 0);
          pix[y * PW + x] = isDot ? C.BCYAN : C.CYAN;
        }
      }

      // ========================================================================
      // 3. MIDGROUND GREEN HILLS & DARK DITHERED BUSH LAYER (Parallax 0.65x)
      // ========================================================================
      for (let x = 0; x < PW; x++) {
        const hwx = x + hillScroll;
        const gWave = Math.sin(hwx * 0.038 + 0.7) * 18 + Math.cos(hwx * 0.021) * 12;
        const gTop = Math.round(104 - gWave);
        if (gTop < 148) {
          pset(x, gTop, C.BLACK);
          for (let y = gTop + 1; y < 148; y++) {
            const dy = y - gTop;
            if (dy <= 3) {
              pset(x, y, C.BGREEN);
            } else if (dy <= 7) {
              pset(x, y, ((hwx + y) & 1) === 0 ? C.BGREEN : C.GREEN);
            } else {
              pset(x, y, C.GREEN);
            }
          }
        }

        const worldX = x + iScroll;
        if (worldX < 505) {
          const bWave =
            Math.sin(hwx * 0.055 + 2.1) * 14 +
            Math.cos(hwx * 0.029 - 0.5) * 10;
          const bTop = Math.round(112 - bWave);
          if (bTop < 148) {
            pset(x, bTop, C.BLACK);
            pset(x, bTop + 1, C.BLACK);
            for (let y = bTop + 2; y < 148; y++) {
              pix[y * PW + x] = ((hwx + y) & 1) === 0 ? C.GREEN : C.BLACK;
            }
          }
        } else {
          const cWave = Math.sin((worldX - 480) * 0.06) * 10;
          const cTop = Math.round(124 - cWave);
          if (cTop < 148) {
            pset(x, cTop, C.BLACK);
            for (let y = cTop + 1; y < 148; y++) {
              const dy = y - cTop;
              pset(x, y, dy < 4 ? (((worldX + y) & 1) ? C.BGREEN : C.GREEN) : C.GREEN);
            }
          }
        }
      }

      // ========================================================================
      // 4. FOREGROUND STRUCTURES: COTTAGES, FENCE, TREES, PLATFORMS, EXIT
      // ========================================================================
      // Wooden fence between Cottage 2 and T-Platform (wx = 412..482)
      const fenceStart = 412 - iScroll;
      const fenceEnd = 482 - iScroll;
      if (fenceEnd > 0 && fenceStart < PW) {
        drawBox(fenceStart, 136, 70, 3, C.BROWN, C.BLACK);
        drawBox(fenceStart, 142, 70, 3, C.BROWN, C.BLACK);
        for (let fx = 414; fx <= 480; fx += 11) {
          const sfx = fx - iScroll;
          drawBox(sfx, 131, 4, 17, C.BROWN, C.BLACK);
        }
      }

      // Stone Cottage 1 (Red Roof) & Stone Cottage 2 (Brown/Gold Roof)
      drawStoneCottage(250, 148, 74, 42, 'red', iScroll);
      drawStoneCottage(342, 148, 64, 34, 'brown', iScroll);

      // Foreground Trees
      for (let i = 0; i < TREES.length; i++) {
        const tr = TREES[i];
        drawTree(tr.wx, tr.groundY, tr.trunkH, tr.scale, iScroll);
      }

      // Elevated Platforms:
      drawFloatingGrassPlatform(115, 108, 49, 13, iScroll);
      drawWoodStumpPlatform(188, 106, 148, 32, iScroll);
      drawTStonePlatform(436, 98, 148, 50, iScroll);

      // Organic Rounded Foreground Green Bushes along the ground
      const bushSpots = [16, 92, 178, 242, 330, 408, 495, 584];
      for (let i = 0; i < bushSpots.length; i++) {
        const bwx = bushSpots[i];
        const bgy = bwx >= 505 ? 128 : 148;
        drawOrganicBush(bwx, bgy, 1.0, iScroll);
      }

      // Silver Exit Pole (wx = 524, y = 6..148, exact match to frame_003.jpg)
      const poleSx = 524 - iScroll;
      if (poleSx > -10 && poleSx < PW + 10) {
        fillRect(poleSx - 1, 6, 7, 142, C.BLACK);
        fillRect(poleSx, 8, 2, 140, C.WHITE);
        fillRect(poleSx + 2, 8, 2, 140, C.LGRAY);
        fillRect(poleSx + 4, 8, 1, 140, C.DGRAY);
        fillRect(poleSx - 2, 6, 9, 3, C.BLACK);
        fillRect(poleSx - 1, 7, 7, 1, C.DGRAY);
      }

      // Waving Black & White Checkered Flag on Rocky Cliff (wx = 572, y = 92..128, frame_004.jpg)
      const flagSx = 572 - iScroll;
      if (flagSx > -25 && flagSx < PW + 25) {
        fillRect(flagSx, 92, 2, 36, C.WHITE);
        pset(flagSx, 91, C.YELLOW);
        const fw = 16;
        const fh = 11;
        for (let fy = 0; fy < fh; fy++) {
          const wave = Math.round(Math.sin(t * 8 + fy * 0.5) * 1.2);
          for (let fx = 0; fx < fw; fx++) {
            const wy = 93 + fy + (fx > 8 ? wave : 0);
            const wx = flagSx + 2 + fx;
            if (fy === 0 || fy === fh - 1 || fx === fw - 1) {
              pset(wx, wy, C.BLACK);
            } else {
              const check = (((fx >> 2) + (fy >> 2)) & 1) === 0;
              pset(wx, wy, check ? C.WHITE : C.BLACK);
            }
          }
        }
      }

      // Classic Commander Keen "EXIT" Sign & Stone Exit Archway on Right (wx = 656)
      const exitSx = 656 - iScroll;
      if (exitSx > -40 && exitSx < PW + 40) {
        fillRect(exitSx + 8, 114, 3, 14, C.BROWN);
        drawBox(exitSx, 103, 21, 11, C.RED, C.BLACK);
        drawPixelScore(exitSx + 3, 106, 'EXIT', C.WHITE, C.BLACK);
        drawStoneCottage(682, 128, 42, 38, 'red', iScroll);
      }

      // ========================================================================
      // 5. MAIN GROUND (wx = 0..505) & ELEVATED ROCKY CLIFF (wx = 505..720)
      // ========================================================================
      for (let x = 0; x < PW; x++) {
        const wx = x + iScroll;
        if (wx < 505) {
          pset(x, 147, C.BLACK);
          pset(x, 148, C.BGREEN);
          pset(x, 149, C.BGREEN);
          pset(x, 150, ((wx & 1) === 0) ? C.BGREEN : C.GREEN);
          pset(x, 151, C.GREEN);
          pset(x, 152, ((wx % 5) < 2) ? C.BGREEN : C.GREEN);
          const jag = ((wx * 3) % 7) < 3 ? 1 : 0;
          pset(x, 153 + jag, C.BLACK);
          pset(x, 154 + jag, C.BLACK);
          for (let y = 155 + jag; y < PH; y++) {
            const hVal = hashInt(wx * 37 + y * 131);
            pix[y * PW + x] = hVal < 0.11 ? C.BLACK : C.BROWN;
          }

          if ((wx % 22) === 10 && (wx < 245 || wx > 328)) {
            const flowerType = (Math.floor(wx / 22)) % 3;
            const petalCol = flowerType === 0 ? C.WHITE : (flowerType === 1 ? C.BRED : C.BMAGENTA);
            const centerCol = flowerType === 2 ? C.WHITE : C.YELLOW;
            pset(x, 146, C.BGREEN);
            pset(x, 147, C.BGREEN);
            pset(x, 144, centerCol);
            pset(x - 1, 144, petalCol);
            pset(x + 1, 144, petalCol);
            pset(x, 143, petalCol);
            pset(x, 145, petalCol);
          }
        } else {
          pset(x, 127, C.BLACK);
          pset(x, 128, C.BGREEN);
          pset(x, 129, C.BGREEN);
          pset(x, 130, ((wx & 1) === 0) ? C.BGREEN : C.GREEN);
          pset(x, 131, C.GREEN);
          pset(x, 132, C.BLACK);
          pset(x, 133, C.BLACK);
          for (let y = 134; y < PH; y++) {
            pix[y * PW + x] = C.BLACK;
          }
          if ((wx % 24) === 8) {
            pset(x, 126, C.BGREEN);
            pset(x, 125, C.BGREEN);
            pset(x, 123, C.YELLOW);
            pset(x - 1, 123, C.WHITE);
            pset(x + 1, 123, C.WHITE);
            pset(x, 122, C.WHITE);
            pset(x, 124, C.WHITE);
          }
        }
      }

      // Organic embedded grey stones inside the brown underground dirt (wx = 0..505)
      for (let swx = 18; swx < 495; swx += 28) {
        const stoneSx = swx - iScroll;
        const stoneSy = 158 + Math.floor(hashInt(swx) * 11);
        const stoneW = 12 + Math.floor(hashInt(swx + 7) * 6);
        const stoneH = 7 + Math.floor(hashInt(swx + 13) * 4);
        drawUndergroundStone(stoneSx, stoneSy, stoneW, stoneH);
      }

      // Organic Interlocking Grey Cliff Boulders (wx = 506..720, y = 134..180, frame_004.jpg)
      const rowHeights = [14, 15, 16];
      let cy = 134;
      for (let r = 0; r < 3; r++) {
        const rh = rowHeights[r];
        let bwx = 506 - (r & 1 ? 10 : 0);
        let idx = 0;
        while (bwx < 720) {
          const bw = 20 + ((bwx * 7 + r * 13) % 10);
          const bsx = Math.max(506 - iScroll, bwx - iScroll);
          const actualW = (bwx + bw - iScroll) - bsx;
          if (actualW > 5) {
            drawCliffBoulder(bsx, cy, actualW, rh, idx + r * 17);
          }
          bwx += bw;
          idx++;
        }
        cy += rh;
      }

      // ========================================================================
      // 6. COLLECTIBLES & FLOATING YELLOW PIXEL SCORE POPUPS ("100", "200", "500")
      // ========================================================================
      for (let i = 0; i < COLLECTIBLES.length; i++) {
        const c = COLLECTIBLES[i];
        const csx = c.wx - iScroll;
        if (csx < -20 || csx > PW + 20) continue;

        if (localT < c.collectT) {
          const bob = Math.round(Math.sin(t * 6 + i * 1.4) * 2);
          if (c.type === 'drop') {
            drawSprite(csx - 3, c.wy - 4 + bob, RAINDROP_SPRITE, false);
          } else {
            drawSprite(csx - 3, c.wy - 4 + bob, SODA_SPRITE, false);
          }
        } else if (localT < c.collectT + 1.35) {
          const age = localT - c.collectT;
          const popY = c.wy - Math.round(age * 18);
          drawPixelScore(csx - 6, popY, c.score, C.YELLOW, C.BLACK);

          if (age < 0.35) {
            const rad = Math.round(age * 28);
            pset(csx - rad, c.wy - rad, C.WHITE);
            pset(csx + rad, c.wy - rad, C.BCYAN);
            pset(csx - rad, c.wy + rad, C.YELLOW);
            pset(csx + rad, c.wy + rad, C.WHITE);
          }
        }
      }

      // ========================================================================
      // 7. CLASSIC ENEMIES: HOPPING YORP & POISON SLUGS + NEURAL STUNNER BOLTS
      // ========================================================================
      // Enemy 1: Cute Green One-Eyed Yorp hopping near start (wx = 64, groundY = 148)
      const yorpWx = 64 + Math.sin(t * 2.2) * 10;
      const yorpHop = Math.round(Math.abs(Math.sin(t * 6.5)) * 6);
      const yorpSx = Math.round(yorpWx - iScroll);
      if (yorpSx > -20 && yorpSx < PW + 20) {
        const blink = (Math.sin(t * 3.8) > 0.88);
        drawSprite(yorpSx - 4, 148 - 13 - yorpHop, blink ? YORP_SPRITE_BLINK : YORP_SPRITE_OPEN, keen.wx < yorpWx);
      }

      // Enemy 2: Poison Slug 1 on Platform 1 (wx = 142, y = 108) — shot by Keen at localT = 1.00..1.18!
      const slug1Stunned = localT >= 1.18;
      const slug1Wx = slug1Stunned ? 142 : 138 + Math.sin(t * 3.5) * 10;
      const slug1Sx = Math.round(slug1Wx - iScroll);
      if (slug1Sx > -20 && slug1Sx < PW + 20) {
        fillRect(slug1Sx - 10, 106, 8, 2, C.BGREEN);
        drawSprite(slug1Sx - 6, 108 - (slug1Stunned ? 8 : 11), slug1Stunned ? SLUG_SPRITE_STUN : SLUG_SPRITE_WALK, false);
        if (slug1Stunned) {
          for (let s = 0; s < 3; s++) {
            const ang = t * 8 + (s * Math.PI * 2) / 3;
            const stx = slug1Sx + Math.round(Math.cos(ang) * 7);
            const sty = 94 + Math.round(Math.sin(ang) * 2);
            pset(stx, sty, C.YELLOW);
            pset(stx - 1, sty, C.WHITE);
            pset(stx + 1, sty, C.YELLOW);
            pset(stx, sty - 1, C.YELLOW);
            pset(stx, sty + 1, C.BLACK);
          }
        }
      }

      // Enemy 3: Poison Slug 2 on T-Stone Platform (wx = 458, y = 98) — shot by Keen at localT = 3.35..3.58!
      const slug2Stunned = localT >= 3.58;
      const slug2Wx = slug2Stunned ? 462 : 456 + Math.cos(t * 3.2) * 11;
      const slug2Sx = Math.round(slug2Wx - iScroll);
      if (slug2Sx > -20 && slug2Sx < PW + 20) {
        fillRect(slug2Sx - 9, 96, 7, 2, C.BGREEN);
        drawSprite(slug2Sx - 6, 98 - (slug2Stunned ? 8 : 11), slug2Stunned ? SLUG_SPRITE_STUN : SLUG_SPRITE_WALK, true);
        if (slug2Stunned) {
          for (let s = 0; s < 3; s++) {
            const ang = t * 8 + (s * Math.PI * 2) / 3;
            const stx = slug2Sx + Math.round(Math.cos(ang) * 7);
            const sty = 84 + Math.round(Math.sin(ang) * 2);
            pset(stx, sty, C.YELLOW);
            pset(stx - 1, sty, C.WHITE);
            pset(stx + 1, sty, C.YELLOW);
            pset(stx, sty - 1, C.YELLOW);
            pset(stx, sty + 1, C.BLACK);
          }
        }
      }

      // Neural Stunner Laser Bolt 1 (localT = 0.98 .. 1.22)
      if (localT >= 0.98 && localT <= 1.22) {
        const bp = Math.min(1, (localT - 0.98) / 0.20);
        const bx = Math.round(lerp(118, 142, bp) - iScroll);
        const by = Math.round(lerp(80, 101, bp));
        drawBox(bx - 6, by - 2, 12, 5, C.BGREEN, C.BLACK);
        fillRect(bx - 4, by - 1, 8, 3, C.WHITE);
        pset(bx - 8, by, C.BGREEN);
        pset(bx - 10, by, C.BCYAN);
      }

      // Neural Stunner Laser Bolt 2 (localT = 3.35 .. 3.62)
      if (localT >= 3.35 && localT <= 3.62) {
        const bp = Math.min(1, (localT - 3.35) / 0.23);
        const bx = Math.round(lerp(404, 460, bp) - iScroll);
        const by = Math.round(lerp(66, 91, bp));
        drawBox(bx - 7, by - 2, 14, 5, C.BGREEN, C.BLACK);
        fillRect(bx - 5, by - 1, 10, 3, C.WHITE);
        pset(bx - 9, by, C.BGREEN);
        pset(bx - 11, by, C.BCYAN);
      }

      // ========================================================================
      // 8. COMMANDER KEEN (BILLY BLAZE)
      // ========================================================================
      const keenSx = Math.round(keen.wx - iScroll) - 9;
      const keenSy = Math.round(keen.wy) - (keen.mode === 'pogo' ? 29 : 24);

      if (keen.mode === 'pogo') {
        if (keen.spring > 0.15) {
          const footX = keenSx + 9;
          const footY = Math.round(keen.wy);
          pset(footX - 5, footY - 2, C.YELLOW);
          pset(footX + 5, footY - 2, C.WHITE);
          pset(footX - 3, footY - 4, C.WHITE);
          pset(footX + 4, footY - 4, C.YELLOW);
        }
        drawCommanderKeenPogo(keenSx, keenSy, keen.spring, keen.firing);
      } else {
        drawCommanderKeenRun(keenSx, keenSy, keen.runFrame);
      }

      // Transfer 320x180 EGA pixel buffer to offscreen canvas & scale crisp to (w, h)
      bctx.putImageData(imgData, 0, 0);
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(bufCanvas, 0, 0, w, h);
      ctx.restore();
    },
  };
})();
