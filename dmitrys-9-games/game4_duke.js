// Game 4: Duke Nukem 3D (1996) — True Build-Engine 2.5D Perspective Software Renderer
// Authentic 360x202 low-res pixel buffer with per-column perspective-correct textured 3D walls,
// Z-buffered building demolition (SE-13 collapsible skyscraper revealing rear building),
// Demolition Switch wall -> 3D street whip-pan, cyan DINER & hot-pink vertical neon signs,
// sidewalk streetlamps with warm light pools, billboarded L.A.P.D. Pig Cops, first-person RPG,
// and cellular quantized 1996 pixel-art fireballs, black smoke plumes & flying brick debris.
(function () {
  const PW = 360;
  const PH = 202;

  let offCanvas = null;
  let offCtx = null;
  let imgData = null;
  let buf32 = null;
  let zbuf = null;

  function initBuffers() {
    if (offCanvas) return;
    offCanvas = document.createElement('canvas');
    offCanvas.width = PW;
    offCanvas.height = PH;
    offCtx = offCanvas.getContext('2d');
    imgData = offCtx.createImageData(PW, PH);
    buf32 = new Uint32Array(imgData.data.buffer);
    zbuf = new Float32Array(PW * PH);
  }

  function packRGB(r, g, b) {
    const cr = r < 0 ? 0 : r > 255 ? 255 : r | 0;
    const cg = g < 0 ? 0 : g > 255 ? 255 : g | 0;
    const cb = b < 0 ? 0 : b > 255 ? 255 : b | 0;
    return (255 << 24) | (cb << 16) | (cg << 8) | cr;
  }

  function hash2(x, y) {
    let h = (x * 374761393 + y * 668265263) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }

  function valueNoise(x, y) {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    const fx = x - ix;
    const fy = y - iy;
    const u = fx * fx * (3 - 2 * fx);
    const v = fy * fy * (3 - 2 * fy);
    const a = hash2(ix, iy);
    const b = hash2(ix + 1, iy);
    const c = hash2(ix, iy + 1);
    const d = hash2(ix + 1, iy + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }

  function fbm2(x, y) {
    return valueNoise(x, y) * 0.65 + valueNoise(x * 2.13 + 17.3, y * 2.13 - 9.1) * 0.35;
  }

  // ---------------------------------------------------------------------------
  // Precomputed Procedural Build-Engine .ART Textures (256x256 RGB arrays)
  // ---------------------------------------------------------------------------
  const TEX_W = 256;
  const TEX_H = 256;
  let texLeftBldg = null;
  let texCenterBldg = null;
  let texRightBldg = null;
  let texBackBldg = null;

  // 5x5 pixel font for neon signs ("DINER", "BABES", "HOTEL")
  const FONT_5X5 = {
    D: [0b11110, 0b10001, 0b10001, 0b10001, 0b11110],
    I: [0b11111, 0b00100, 0b00100, 0b00100, 0b11111],
    N: [0b10001, 0b11001, 0b10101, 0b10011, 0b10001],
    E: [0b11111, 0b10000, 0b11110, 0b10000, 0b11111],
    R: [0b11110, 0b10001, 0b11110, 0b10010, 0b10001],
    B: [0b11110, 0b10001, 0b11110, 0b10001, 0b11110],
    A: [0b01110, 0b10001, 0b11111, 0b10001, 0b10001],
    S: [0b01111, 0b10000, 0b01110, 0b00001, 0b11110],
    X: [0b10001, 0b01010, 0b00100, 0b01010, 0b10001]
  };

  function generateBuildingTexture(seed, shadeMul, hasDinerSign, hasPurpleSign) {
    const data = new Uint8Array(TEX_W * TEX_H * 3);
    for (let y = 0; y < TEX_H; y++) {
      const floorIdx = (y >> 5) & 7;
      const fy = y & 31;
      for (let x = 0; x < TEX_W; x++) {
        const bayIdx = (x >> 5) & 7;
        const fx = x & 31;
        const idx = (y * TEX_W + x) * 3;

        let r = 74, g = 45, b = 30;

        // Horizontal concrete ledge between floors (fy = 0..3)
        if (fy < 4) {
          if (fy === 0) {
            r = 40; g = 26; b = 18;
          } else if (fy === 1) {
            r = 104; g = 82; b = 64;
          } else if (fy === 2) {
            r = 84; g = 65; b = 50;
          } else {
            r = 46; g = 32; b = 22;
          }
          const n = (hash2(x + seed, y) - 0.5) * 12;
          r += n; g += n * 0.8; b += n * 0.6;
        } else {
          // Running-bond brickwork
          const brickRow = (fy - 4) >> 2;
          const brickY = (fy - 4) & 3;
          const brickX = (x + (brickRow & 1) * 4) & 7;
          const brickIdX = (x + (brickRow & 1) * 4) >> 3;
          const bHash = hash2(brickIdX + seed * 13, brickRow + floorIdx * 11);

          if (brickY === 0 || brickX === 0) {
            r = 34; g = 20; b = 14;
          } else {
            r = 76 + (bHash - 0.5) * 26;
            g = 46 + (bHash - 0.5) * 18;
            b = 30 + (bHash - 0.5) * 12;
            if (fx < 3 || fx > 29) {
              r *= 1.12; g *= 1.1; b *= 1.08;
            }
          }

          // 4-Pane Window (fx = 6..25, fy = 7..26)
          if (fx >= 6 && fx <= 25 && fy >= 7 && fy <= 26) {
            const inDinerZone = hasDinerSign && floorIdx === 5 && bayIdx >= 2 && bayIdx <= 4;
            if (!inDinerZone) {
              const isOuterFrame = fx === 6 || fx === 25 || fy === 7 || fy === 26;
              const isMullionV = fx === 15 || fx === 16;
              const isTransomH = fy === 16 || fy === 17;

              if (isOuterFrame) {
                r = 26; g = 15; b = 10;
              } else if (isMullionV || isTransomH) {
                r = 32; g = 20; b = 12;
              } else {
                const paneX = fx > 16 ? 1 : 0;
                const paneY = fy > 17 ? 1 : 0;
                const winSeed = hash2(bayIdx * 37 + seed, floorIdx * 53);
                const paneSeed = hash2(bayIdx * 19 + paneX * 7 + seed, floorIdx * 29 + paneY * 11);

                if (winSeed < 0.23) {
                  r = 16 + paneY * 4;
                  g = 20 + paneY * 5;
                  b = 22 + paneY * 6;
                } else {
                  const warm = 0.78 + 0.38 * winSeed;
                  const vGrad = 1.0 - ((fy - 8) / 18) * 0.25;
                  r = 212 * warm * vGrad;
                  g = 148 * warm * vGrad;
                  b = 58 * warm * vGrad;

                  if (paneSeed < 0.28 && fx > 9 && fx < 14) {
                    r *= 0.28; g *= 0.28; b *= 0.32;
                  } else if (paneSeed > 0.82 && fy > 20) {
                    r *= 0.35; g *= 0.32; b *= 0.3;
                  }
                }
              }
            }
          }
        }

        data[idx] = Math.max(0, Math.min(255, r * shadeMul)) | 0;
        data[idx + 1] = Math.max(0, Math.min(255, g * shadeMul)) | 0;
        data[idx + 2] = Math.max(0, Math.min(255, b * shadeMul)) | 0;
      }
    }

    // Stamp glowing cyan "DINER" sign across floorIdx 5, bays 2..4
    if (hasDinerSign) {
      const sx0 = 72, sy0 = 166, sw = 76, sh = 20;
      for (let y = sy0 - 4; y < sy0 + sh + 4; y++) {
        for (let x = sx0 - 4; x < sx0 + sw + 4; x++) {
          if (x < 0 || x >= TEX_W || y < 0 || y >= TEX_H) continue;
          const idx = (y * TEX_W + x) * 3;
          if (x >= sx0 && x < sx0 + sw && y >= sy0 && y < sy0 + sh) {
            const isBorder = x === sx0 || x === sx0 + sw - 1 || y === sy0 || y === sy0 + sh - 1;
            data[idx] = isBorder ? 20 : 6;
            data[idx + 1] = isBorder ? 52 : 12;
            data[idx + 2] = isBorder ? 64 : 18;
          } else {
            data[idx] = Math.min(255, data[idx] + 6);
            data[idx + 1] = Math.min(255, data[idx + 1] + 22);
            data[idx + 2] = Math.min(255, data[idx + 2] + 28);
          }
        }
      }
      const word = 'DINER';
      for (let c = 0; c < word.length; c++) {
        const glyph = FONT_5X5[word[c]];
        const lx = sx0 + 9 + c * 12;
        const ly = sy0 + 5;
        for (let gy = 0; gy < 5; gy++) {
          const rowBits = glyph[gy];
          for (let gx = 0; gx < 5; gx++) {
            if ((rowBits >> (4 - gx)) & 1) {
              for (let py = 0; py < 2; py++) {
                for (let px = 0; px < 2; px++) {
                  const tx = lx + gx * 2 + px;
                  const ty = ly + gy * 2 + py;
                  const idx = (ty * TEX_W + tx) * 3;
                  const isCore = px === 0 && py === 0;
                  data[idx] = isCore ? 185 : 75;
                  data[idx + 1] = isCore ? 255 : 235;
                  data[idx + 2] = isCore ? 255 : 245;
                }
              }
            }
          }
        }
      }
    }

    // Stamp glowing purple/magenta neon sign on Right Building
    if (hasPurpleSign) {
      const sx0 = 36, sy0 = 198, sw = 24, sh = 12;
      for (let y = sy0; y < sy0 + sh; y++) {
        for (let x = sx0; x < sx0 + sw; x++) {
          const idx = (y * TEX_W + x) * 3;
          data[idx] = 18;
          data[idx + 1] = 8;
          data[idx + 2] = 24;
        }
      }
      const pts = [
        [42, 202], [43, 202], [46, 202], [47, 202], [50, 202], [51, 202],
        [44, 205], [45, 205], [46, 205], [48, 205], [49, 205], [50, 205],
        [43, 207], [47, 207], [48, 207], [51, 207]
      ];
      for (let i = 0; i < pts.length; i++) {
        const [px, py] = pts[i];
        const idx = (py * TEX_W + px) * 3;
        data[idx] = 245;
        data[idx + 1] = 95;
        data[idx + 2] = 255;
      }
    }

    return data;
  }

  function ensureTextures() {
    if (texLeftBldg) return;
    texLeftBldg = generateBuildingTexture(101, 1.0, true, false);
    texCenterBldg = generateBuildingTexture(202, 1.08, false, false);
    texRightBldg = generateBuildingTexture(303, 0.94, false, true);
    texBackBldg = generateBuildingTexture(404, 0.88, false, false);
  }

  // ---------------------------------------------------------------------------
  // Act 1 (frame_014.jpg): Close-up Demolition Switch Wall Renderer
  // ---------------------------------------------------------------------------
  function renderSwitchWallScene(localT, turnBlend) {
    const panOffsetX = Math.round(turnBlend * PW * 1.18);
    const flipAnim = Math.max(0, Math.min(1, (localT - 0.38) / 0.14));
    const leverAngle = (-0.58) + flipAnim * 1.85;

    for (let y = 0; y < PH; y++) {
      const rowOff = y * PW;
      for (let x = 0; x < PW; x++) {
        const wx = x + panOffsetX;
        if (wx >= PW) continue;

        const by = y + (wx - 180) * 0.025;
        const brickCourse = Math.floor(by / 13.5);
        const courseY = by - brickCourse * 13.5;
        const brickW = 30.0;
        const bx = wx + (brickCourse & 1) * (brickW * 0.5);
        const brickCol = Math.floor(bx / brickW);
        const courseX = bx - brickCol * brickW;

        let r = 58, g = 20, b = 10;
        if (courseY < 2.1 || courseX < 2.1) {
          r = 18; g = 7; b = 4;
        } else {
          const bh = hash2(brickCol + 19, brickCourse + 47);
          const subNoise = (hash2((wx >> 2) + 7, (y >> 2) + 13) - 0.5) * 10;
          r = 62 + (bh - 0.5) * 32 + subNoise;
          g = 22 + (bh - 0.5) * 14 + subNoise * 0.4;
          b = 11 + (bh - 0.5) * 8 + subNoise * 0.2;
          if (courseY < 4.0) {
            r += 12; g += 5; b += 2;
          }
        }

        const swY = y + (wx - 181) * 0.025;
        if (wx >= 136 && wx <= 226 && swY >= 20 && swY <= 140) {
          if (swY < 31) {
            r = 175; g = 104; b = 16;
          } else if (swY < 33) {
            r = 16; g = 12; b = 8;
          } else if (swY < 40) {
            const stripe = Math.floor((wx - 136) / 8.2);
            if (stripe % 2 === 0) {
              r = 182; g = 110; b = 18;
            } else {
              r = 24; g = 26; b = 30;
            }
          } else {
            const inFrame = wx < 142 || wx > 220 || swY > 134;
            if (inFrame) {
              r = 38; g = 41; b = 46;
            } else {
              r = 20; g = 22; b = 25;
            }

            const isBoltX = (wx >= 142 && wx <= 148) || (wx >= 214 && wx <= 220);
            const isBoltY = (swY >= 38 && swY <= 44) || (swY >= 127 && swY <= 133);
            if (isBoltX && isBoltY) {
              r = 88; g = 93; b = 102;
            }

            if (wx >= 188 && wx <= 204 && swY >= 33 && swY <= 60) {
              r = 86; g = 18; b = 12;
            }
            if (wx >= 170 && wx <= 192 && swY >= 64 && swY <= 118) {
              r = 4; g = 5; b = 7;
            }

            const dx = wx - 176;
            const dy = swY - 94;
            const ca = Math.cos(leverAngle);
            const sa = Math.sin(leverAngle);
            const lu = dx * (-sa) + dy * (-ca);
            const lv = dx * ca - dy * sa;

            const sdx = (wx - 4) - 176;
            const sdy = (swY - 4) - 94;
            const slu = sdx * (-sa) + sdy * (-ca);
            const slv = sdx * ca - sdy * sa;
            if (slu >= -14 && slu <= 48 && Math.abs(slv) <= 8) {
              r *= 0.55; g *= 0.55; b *= 0.55;
            }

            if (lu >= -14 && lu <= 30 && Math.abs(lv) <= 6.2) {
              r = 118; g = 123; b = 132;
            }
            if (lu >= 26 && lu <= 48 && Math.abs(lv) <= 8.5) {
              r = 138; g = 18; b = 16;
              if (lv > 3) {
                r = 105; g = 12; b = 10;
              }
            }
          }
        }

        if (localT >= 0.42 && localT <= 0.72) {
          const spk = 1.0 - Math.abs(localT - 0.52) / 0.18;
          if (spk > 0) {
            const d2 = (wx - 178) * (wx - 178) + (y - 96) * (y - 96);
            const glow = Math.max(0, 1 - d2 / 4200) * spk;
            r += glow * 210;
            g += glow * 150;
            b += glow * 45;
          }
        }

        buf32[rowOff + x] = packRGB(r, g, b);
        zbuf[rowOff + x] = 1.2;
      }
    }

    if (localT >= 0.44 && localT <= 0.78 && turnBlend < 0.5) {
      const st = (localT - 0.44) / 0.34;
      for (let i = 0; i < 14; i++) {
        const ang = i * 0.48 + 0.3;
        const spd = 22 + (i % 4) * 18;
        const sx = Math.round(176 - panOffsetX + Math.cos(ang) * spd * st);
        const sy = Math.round(96 + Math.sin(ang) * spd * st + st * st * 28);
        if (sx >= 1 && sx < PW - 1 && sy >= 1 && sy < PH - 1) {
          const col = (i & 1) ? packRGB(255, 250, 160) : packRGB(255, 140, 30);
          buf32[sy * PW + sx] = col;
          buf32[sy * PW + sx + 1] = col;
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // 3D Perspective Wall Column Renderer (Exact 1996 Build-Engine Algorithm)
  // ---------------------------------------------------------------------------
  function drawWall3D(
    x0, z0, x1, z1, yBot, yTop,
    tex, uScale, uOffset, vScale, vOffset,
    camX, camY, camZ, cosYaw, sinYaw, fovX, fovY, cx, cy,
    ambientLight, expLightX, expLightZ, expLightIntensity
  ) {
    const dx0 = x0 - camX, dz0 = z0 - camZ;
    const dx1 = x1 - camX, dz1 = z1 - camZ;
    let rx0 = dx0 * cosYaw - dz0 * sinYaw;
    let rz0 = dx0 * sinYaw + dz0 * cosYaw;
    let rx1 = dx1 * cosYaw - dz1 * sinYaw;
    let rz1 = dx1 * sinYaw + dz1 * cosYaw;

    let u0 = uOffset;
    let u1 = uOffset + uScale;

    const zNear = 0.5;
    if (rz0 < zNear && rz1 < zNear) return;
    if (rz0 < zNear) {
      const t = (zNear - rz0) / (rz1 - rz0);
      rx0 = rx0 + t * (rx1 - rx0);
      rz0 = zNear;
      u0 = u0 + t * (u1 - u0);
    } else if (rz1 < zNear) {
      const t = (zNear - rz1) / (rz0 - rz1);
      rx1 = rx1 + t * (rx0 - rx1);
      rz1 = zNear;
      u1 = u1 + t * (u0 - u1);
    }

    let sx0 = cx + (rx0 / rz0) * fovX;
    let sx1 = cx + (rx1 / rz1) * fovX;

    if (Math.abs(sx1 - sx0) < 0.01) return;
    if (sx0 > sx1) {
      let tmp = sx0; sx0 = sx1; sx1 = tmp;
      tmp = rz0; rz0 = rz1; rz1 = tmp;
      tmp = u0; u0 = u1; u1 = tmp;
      tmp = x0; x0 = x1; x1 = tmp;
      tmp = z0; z0 = z1; z1 = tmp;
    }

    const minX = Math.max(0, Math.ceil(sx0));
    const maxX = Math.min(PW - 1, Math.floor(sx1));
    if (minX > maxX) return;

    const invZ0 = 1.0 / rz0;
    const invZ1 = 1.0 / rz1;
    const uOverZ0 = u0 * invZ0;
    const uOverZ1 = u1 * invZ1;
    const wxOverZ0 = x0 * invZ0;
    const wxOverZ1 = x1 * invZ1;
    const wzOverZ0 = z0 * invZ0;
    const wzOverZ1 = z1 * invZ1;
    const invSpan = 1.0 / (sx1 - sx0);

    for (let sx = minX; sx <= maxX; sx++) {
      const alpha = (sx - sx0) * invSpan;
      const invZ = invZ0 + alpha * (invZ1 - invZ0);
      const z = 1.0 / invZ;

      const syTopF = cy - ((yTop - camY) * invZ) * fovY;
      const syBotF = cy - ((yBot - camY) * invZ) * fovY;
      const sySpan = syBotF - syTopF;
      if (sySpan <= 0.1) continue;

      const minY = Math.max(0, Math.ceil(syTopF));
      const maxY = Math.min(PH - 1, Math.floor(syBotF));
      if (minY > maxY) continue;

      const u = (uOverZ0 + alpha * (uOverZ1 - uOverZ0)) * z;
      const wx = (wxOverZ0 + alpha * (wxOverZ1 - wxOverZ0)) * z;
      const wz = (wzOverZ0 + alpha * (wzOverZ1 - wzOverZ0)) * z;

      let colLightR = ambientLight;
      let colLightG = ambientLight;
      let colLightB = ambientLight;

      if (expLightIntensity > 0) {
        const edx = wx - expLightX;
        const edz = wz - expLightZ;
        const ed2 = edx * edx + edz * edz;
        const boost = expLightIntensity / (1.0 + ed2 * 0.025);
        colLightR += boost * 0.75;
        colLightG += boost * 0.38;
        colLightB += boost * 0.08;
      }

      const tx = ((u | 0) & (TEX_W - 1));
      const dvDy = vScale / sySpan;
      let v = vOffset + (minY - syTopF) * dvDy;

      for (let sy = minY; sy <= maxY; sy++) {
        const pIdx = sy * PW + sx;
        if (z < zbuf[pIdx]) {
          zbuf[pIdx] = z;
          const ty = ((v | 0) & (TEX_H - 1));
          const tIdx = (ty * TEX_W + tx) * 3;
          const r = tex[tIdx] * colLightR;
          const g = tex[tIdx + 1] * colLightG;
          const b = tex[tIdx + 2] * colLightB;
          buf32[pIdx] = packRGB(r, g, b);
        }
        v += dvDy;
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Vertical Hot-Pink Neon Sign attached to the Central Corner Tower
  // ---------------------------------------------------------------------------
  function drawVerticalNeonSign3D(
    wx, wz, yBot, yTop,
    camX, camY, camZ, cosYaw, sinYaw, fovX, fovY, cx, cy
  ) {
    const dx = wx - camX, dz = wz - camZ;
    const rx = dx * cosYaw - dz * sinYaw;
    const rz = dx * sinYaw + dz * cosYaw;
    if (rz < 1.0) return;

    const sxCenter = Math.round(cx + (rx / rz) * fovX);
    const syTop = Math.round(cy - ((yTop - camY) / rz) * fovY);
    const syBot = Math.round(cy - ((yBot - camY) / rz) * fovY);
    const halfW = Math.max(2, Math.round((0.35 / rz) * fovX));

    const minY = Math.max(0, syTop);
    const maxY = Math.min(PH - 1, syBot);
    const spanY = Math.max(1, syBot - syTop);

    for (let sy = minY; sy <= maxY; sy++) {
      const v = ((sy - syTop) / spanY) * 120;
      for (let sx = sxCenter - halfW; sx <= sxCenter + halfW; sx++) {
        if (sx < 0 || sx >= PW) continue;
        if (sy > syBot - 6 && (sx - (sxCenter - halfW)) < (sy - (syBot - 6))) continue;

        const pIdx = sy * PW + sx;
        if (rz - 0.3 < zbuf[pIdx]) {
          zbuf[pIdx] = rz - 0.3;
          const isEdge = sx === sxCenter - halfW || sx === sxCenter + halfW || sy === syTop || sy >= syBot - 2;
          if (isEdge) {
            buf32[pIdx] = (sx === sxCenter + halfW) ? packRGB(255, 50, 185) : packRGB(210, 25, 140);
          } else {
            const charCell = ((v | 0) % 16);
            const isCharPixel = charCell >= 4 && charCell <= 11 && sx >= sxCenter - 1 && sx <= sxCenter + 1 && (((v | 0) + sx) % 3 !== 0);
            if (isCharPixel) {
              buf32[pIdx] = (charCell & 2) ? packRGB(255, 210, 55) : packRGB(255, 95, 190);
            } else {
              buf32[pIdx] = packRGB(18, 8, 16);
            }
          }
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // 3D Streetlamps (Exact proportions from frame_015..017)
  // ---------------------------------------------------------------------------
  function drawStreetlamp3D(
    wx, wz, poleH, isRightLamp,
    camX, camY, camZ, cosYaw, sinYaw, fovX, fovY, cx, cy
  ) {
    const dx = wx - camX, dz = wz - camZ;
    const rx = dx * cosYaw - dz * sinYaw;
    const rz = dx * sinYaw + dz * cosYaw;
    if (rz < 1.0) return;

    const sxPole = Math.round(cx + (rx / rz) * fovX);
    const syTop = Math.round(cy - ((poleH - camY) / rz) * fovY);
    const syBot = Math.round(cy - ((0 - camY) / rz) * fovY);

    // Vertical dark grey metal pole (2-3px wide)
    const minY = Math.max(0, syTop);
    const maxY = Math.min(PH - 1, syBot);
    for (let sy = minY; sy <= maxY; sy++) {
      for (let ox = -1; ox <= 1; ox++) {
        const sx = sxPole + ox;
        if (sx < 0 || sx >= PW) continue;
        const pIdx = sy * PW + sx;
        if (rz < zbuf[pIdx]) {
          zbuf[pIdx] = rz;
          buf32[pIdx] = ox === -1 ? packRGB(52, 54, 58) : packRGB(28, 30, 34);
        }
      }
    }

    if (!isRightLamp) {
      // Left streetlamp: compact 7x7 slanted warm-yellow lamp head directly atop pole
      for (let dy = -3; dy <= 3; dy++) {
        const sy = syTop + dy;
        if (sy < 0 || sy >= PH) continue;
        for (let dx2 = -5; dx2 <= 2; dx2++) {
          const sx = sxPole + dx2;
          if (sx < 0 || sx >= PW) continue;
          if (dy === -3 && dx2 > 0) continue;
          if (dy === 3 && dx2 < -3) continue;
          const pIdx = sy * PW + sx;
          if (rz - 0.1 < zbuf[pIdx]) {
            zbuf[pIdx] = rz - 0.1;
            buf32[pIdx] = packRGB(252, 204, 64);
          }
        }
      }
    } else {
      // Right streetlamp: sleek horizontal cobra-head luminaire extending right (12x3px)
      for (let sx = sxPole; sx <= sxPole + 15; sx++) {
        if (sx < 0 || sx >= PW) continue;
        for (let dy = -1; dy <= 1; dy++) {
          const sy = syTop + dy - (sx > sxPole + 6 ? 1 : 0);
          if (sy < 0 || sy >= PH) continue;
          const pIdx = sy * PW + sx;
          if (rz - 0.1 < zbuf[pIdx]) {
            zbuf[pIdx] = rz - 0.1;
            if (sx < sxPole + 4) {
              buf32[pIdx] = packRGB(55, 55, 58);
            } else {
              buf32[pIdx] = dy === 0 ? packRGB(255, 212, 72) : packRGB(215, 158, 42);
            }
          }
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Billboarded 3D Pixel-Art L.A.P.D. Pig Cop & Red Hazard Barrel
  // ---------------------------------------------------------------------------
  function drawPigCopBillboard(
    wx, wy, wz, firingShotgun, hitFlash,
    camX, camY, camZ, cosYaw, sinYaw, fovX, fovY, cx, cy
  ) {
    const dx = wx - camX, dz = wz - camZ;
    const rx = dx * cosYaw - dz * sinYaw;
    const rz = dx * sinYaw + dz * cosYaw;
    if (rz < 1.5) return;

    const sxCenter = Math.round(cx + (rx / rz) * fovX);
    const syFoot = Math.round(cy - ((wy - camY) / rz) * fovY);
    const sprH = Math.max(8, Math.round((2.25 / rz) * fovY));
    const sprW = Math.max(6, Math.round(sprH * 0.72));

    const rows = [
      '....CCCC....',
      '...CCCCCC...',
      '...CRPRRC...',
      '..TPPPPPPT..',
      '...PPPPPP...',
      '..BBBBBBBB..',
      '.PBBGBBBBBP.',
      '.PPSSSSSSSMM',
      '..BBBBBBBB..',
      '...BBBBBB...',
      '...CCCCCC...',
      '..CCC..CCC..',
      '..CCC..CCC..',
      '..KKK..KKK..'
    ];

    const syTop = syFoot - sprH;
    for (let py = 0; py < sprH; py++) {
      const sy = syTop + py;
      if (sy < 0 || sy >= PH) continue;
      const ty = Math.min(rows.length - 1, Math.floor((py / sprH) * rows.length));
      const rowStr = rows[ty];

      for (let px = 0; px < sprW; px++) {
        const sx = sxCenter - (sprW >> 1) + px;
        if (sx < 0 || sx >= PW) continue;
        const tx = Math.min(11, Math.floor((px / sprW) * 12));
        const ch = rowStr[tx];
        if (ch === '.') continue;
        if (ch === 'M' && !firingShotgun) continue;

        const pIdx = sy * PW + sx;
        if (rz < zbuf[pIdx]) {
          zbuf[pIdx] = rz;
          let r = 0, g = 0, b = 0;
          if (hitFlash) {
            r = 255; g = 180; b = 120;
          } else if (ch === 'C') {
            r = 24; g = 42; b = 82;
          } else if (ch === 'B') {
            r = 34; g = 62; b = 118;
          } else if (ch === 'G') {
            r = 245; g = 195; b = 40;
          } else if (ch === 'P') {
            r = 208; g = 132; b = 114;
          } else if (ch === 'R') {
            r = 255; g = 35; b = 15;
          } else if (ch === 'T') {
            r = 245; g = 240; b = 220;
          } else if (ch === 'S') {
            r = 55; g = 60; b = 68;
          } else if (ch === 'M') {
            r = 255; g = 225; b = 85;
          } else if (ch === 'K') {
            r = 18; g = 20; b = 24;
          }
          buf32[pIdx] = packRGB(r, g, b);
        }
      }
    }
  }

  function drawHazardBarrelBillboard(
    wx, wy, wz,
    camX, camY, camZ, cosYaw, sinYaw, fovX, fovY, cx, cy
  ) {
    const dx = wx - camX, dz = wz - camZ;
    const rx = dx * cosYaw - dz * sinYaw;
    const rz = dx * sinYaw + dz * cosYaw;
    if (rz < 1.5) return;

    const sxCenter = Math.round(cx + (rx / rz) * fovX);
    const syFoot = Math.round(cy - ((wy - camY) / rz) * fovY);
    const sprH = Math.max(5, Math.round((1.25 / rz) * fovY));
    const sprW = Math.max(4, Math.round(sprH * 0.68));
    const syTop = syFoot - sprH;

    for (let py = 0; py < sprH; py++) {
      const sy = syTop + py;
      if (sy < 0 || sy >= PH) continue;
      const v = py / sprH;
      for (let px = 0; px < sprW; px++) {
        const sx = sxCenter - (sprW >> 1) + px;
        if (sx < 0 || sx >= PW) continue;
        const pIdx = sy * PW + sx;
        if (rz < zbuf[pIdx]) {
          zbuf[pIdx] = rz;
          const shade = px < sprW * 0.35 ? 1.15 : px > sprW * 0.75 ? 0.68 : 0.95;
          if (v > 0.35 && v < 0.62) {
            buf32[pIdx] = packRGB(230 * shade, 180 * shade, 25 * shade);
          } else {
            buf32[pIdx] = packRGB(185 * shade, 28 * shade, 22 * shade);
          }
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Authentic 1996 Build-Engine Cellular Pixel-Art Fireball & Black Smoke Puff
  // ---------------------------------------------------------------------------
  function drawCellularExplosionPuff(
    wx, wy, wz, worldRadius, mode, seed, localT,
    camX, camY, camZ, cosYaw, sinYaw, fovX, fovY, cx, cy
  ) {
    const dx = wx - camX, dz = wz - camZ;
    const rx = dx * cosYaw - dz * sinYaw;
    const rz = dx * sinYaw + dz * cosYaw;
    if (rz < 1.2) return;

    const sxCenter = cx + (rx / rz) * fovX;
    const syCenter = cy - ((wy - camY) / rz) * fovY;
    const radPx = (worldRadius / rz) * fovY;
    if (radPx < 1.5) return;

    const pad = Math.ceil(radPx * 1.25);
    const minX = Math.max(0, Math.floor(sxCenter - pad));
    const maxX = Math.min(PW - 1, Math.ceil(sxCenter + pad));
    const minY = Math.max(0, Math.floor(syCenter - pad));
    const maxY = Math.min(PH - 1, Math.ceil(syCenter + pad));
    const invRad = 1.0 / radPx;

    for (let sy = minY; sy <= maxY; sy++) {
      const dy = (sy - syCenter) * invRad;
      const rowOff = sy * PW;
      for (let sx = minX; sx <= maxX; sx++) {
        const pIdx = rowOff + sx;
        if (rz > zbuf[pIdx]) continue;

        const dx2 = (sx - sxCenter) * invRad;
        const rNorm = Math.sqrt(dx2 * dx2 + dy * dy);
        if (rNorm > 1.22) continue;

        const qx = sx >> 1;
        const qy = sy >> 1;
        const n1 = fbm2(qx * 0.22 + seed, qy * 0.22 - localT * 1.4);
        const n2 = valueNoise(qx * 0.36 - seed * 1.7, qy * 0.36 + localT * 0.9);
        const edgeDist = rNorm + (n1 - 0.5) * 0.48;

        if (edgeDist > 0.96) continue;

        zbuf[pIdx] = rz;

        if (mode === 0) {
          if (edgeDist > 0.72 && n2 > 0.52) {
            buf32[pIdx] = packRGB(26, 14, 12);
          } else if (edgeDist < 0.34) {
            buf32[pIdx] = packRGB(255, 252, 168);
          } else if (edgeDist < 0.52) {
            buf32[pIdx] = packRGB(255, 204, 38);
          } else if (edgeDist < 0.69) {
            buf32[pIdx] = packRGB(242, 108, 12);
          } else if (edgeDist < 0.84) {
            buf32[pIdx] = packRGB(168, 38, 8);
          } else {
            buf32[pIdx] = packRGB(68, 16, 8);
          }
        } else if (mode === 1) {
          const fireCrack = n2 + (1.0 - rNorm) * 0.32;
          if (fireCrack > 0.74) {
            if (fireCrack > 0.88) {
              buf32[pIdx] = packRGB(255, 165, 28);
            } else {
              buf32[pIdx] = packRGB(225, 78, 10);
            }
          } else {
            if (n1 > 0.56) {
              buf32[pIdx] = packRGB(10, 10, 13);
            } else if (n1 > 0.38) {
              buf32[pIdx] = packRGB(22, 22, 26);
            } else {
              buf32[pIdx] = packRGB(36, 35, 38);
            }
          }
        } else {
          if (n1 > 0.62) {
            buf32[pIdx] = packRGB(46, 46, 48);
          } else if (n1 > 0.36) {
            buf32[pIdx] = packRGB(32, 32, 35);
          } else {
            buf32[pIdx] = packRGB(19, 19, 22);
          }
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // First-Person Duke Nukem RPG Launcher Sprite (Bottom-Right Corner)
  // ---------------------------------------------------------------------------
  function drawFirstPersonRPG(localT, recoilOffset, muzzleFlashAlpha) {
    const bobX = Math.round(Math.sin(localT * 4.5) * 2.5 + recoilOffset * 7);
    const bobY = Math.round(Math.abs(Math.cos(localT * 4.5)) * 2.0 + recoilOffset * 6);

    const baseX = 284 + bobX;
    const baseY = 156 + bobY;

    if (muzzleFlashAlpha > 0.05) {
      const mx = baseX + 6;
      const my = baseY + 4;
      const mRad = Math.round(18 * muzzleFlashAlpha);
      for (let dy = -mRad; dy <= mRad; dy++) {
        const sy = my + dy;
        if (sy < 0 || sy >= PH) continue;
        for (let dx = -mRad; dx <= mRad; dx++) {
          const sx = mx + dx;
          if (sx < 0 || sx >= PW) continue;
          const d = Math.sqrt(dx * dx + dy * dy) / mRad;
          if (d < 0.4) {
            buf32[sy * PW + sx] = packRGB(255, 250, 170);
          } else if (d < 0.75 && ((sx + sy) & 1) === 0) {
            buf32[sy * PW + sx] = packRGB(255, 160, 30);
          }
        }
      }
    }

    for (let sy = Math.max(0, baseY); sy < PH; sy++) {
      for (let sx = Math.max(0, baseX); sx < PW; sx++) {
        const lx = sx - baseX;
        const ly = sy - baseY;
        const u = lx * 0.82 + ly * 0.57;
        const v = -lx * 0.57 + ly * 0.82;

        if (u >= 8 && u <= 22 && v >= -14 && v <= -8) {
          buf32[sy * PW + sx] = (v === -14 || u === 8) ? packRGB(85, 92, 80) : packRGB(38, 42, 36);
          continue;
        }

        if (u >= 2 && Math.abs(v) <= 9.5) {
          if (u < 6) {
            buf32[sy * PW + sx] = Math.abs(v) < 5.5 ? packRGB(14, 12, 10) : packRGB(95, 72, 28);
            continue;
          }
          const cyl = 1.0 - Math.abs(v + 2.0) / 12.5;
          const isVent = u > 14 && u < 56 && ((u | 0) % 7 < 3) && Math.abs(v) < 4.5;
          const isBand = Math.abs(u - 11) < 2.0 || Math.abs(u - 36) < 2.0;

          if (isVent) {
            buf32[sy * PW + sx] = packRGB(26, 20, 14);
          } else if (isBand) {
            buf32[sy * PW + sx] = packRGB(70 * cyl, 74 * cyl, 68 * cyl);
          } else {
            buf32[sy * PW + sx] = packRGB(198 * cyl, 144 * cyl, 52 * cyl);
          }
        }

        if (u >= 18 && u <= 38 && v > 9.5 && v <= 20) {
          if (v < 15) {
            const isStud = ((u | 0) % 5 === 0) && v > 11 && v < 14;
            buf32[sy * PW + sx] = isStud ? packRGB(170, 178, 190) : packRGB(20, 22, 26);
          } else {
            buf32[sy * PW + sx] = packRGB(196, 128, 90);
          }
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Main Draw Entry Point (8.0-second seamless loop)
  // ---------------------------------------------------------------------------
  function drawDukeNukem3D(ctx, w, h, t) {
    initBuffers();
    ensureTextures();

    const localT = ((t % 8.0) + 8.0) % 8.0;

    let turnBlend = 1.0;
    if (localT < 0.90) {
      turnBlend = 0.0;
    } else if (localT < 1.48) {
      const p = (localT - 0.90) / 0.58;
      turnBlend = p * p * (3 - 2 * p);
    }

    let shakeAmp = 0.0;
    if (localT >= 0.44 && localT < 0.68) shakeAmp = 1.8 * (1 - (localT - 0.44) / 0.24);
    if (localT >= 2.00 && localT < 4.90) {
      shakeAmp = Math.max(shakeAmp, 2.2 * Math.sin(((localT - 2.0) / 2.9) * Math.PI));
    }
    if (localT >= 5.65 && localT < 6.30) {
      shakeAmp = Math.max(shakeAmp, 1.4 * (1 - (localT - 5.65) / 0.65));
    }

    const shakeX = Math.sin(localT * 62.0) * shakeAmp;
    const shakeY = Math.cos(localT * 51.0) * shakeAmp;

    const streetDrift = Math.max(0, Math.min(1, (localT - 1.5) / 5.5));
    const camX = -0.35 * streetDrift;
    const camY = 1.62;
    const camZ = 1.65 * streetDrift;
    const camYaw = (1.0 - turnBlend) * (-0.52) + streetDrift * 0.025;
    const cosYaw = Math.cos(camYaw);
    const sinYaw = Math.sin(camYaw);

    const fovX = 258.0;
    const fovY = 258.0;
    const cx = 180.0 + shakeX;
    const cy = 135.0 + shakeY;

    // 1. Clear Depth Buffer & Fill Night Sky + Stars
    zbuf.fill(1e9);

    for (let y = 0; y < PH; y++) {
      const rowOff = y * PW;
      const skyCol = y < cy ? packRGB(2, 2, 5) : packRGB(7, 9, 13);
      buf32.fill(skyCol, rowOff, rowOff + PW);
    }

    if (turnBlend > 0.02) {
      for (let s = 0; s < 42; s++) {
        const sx = ((s * 97 + 43) % PW);
        const sy = ((s * 53 + 11) % 105);
        if (sy < cy) {
          const b = (s % 3 === 0) ? 145 : 85;
          buf32[sy * PW + sx] = packRGB(b, b, b + 15);
        }
      }
    }

    // 2. Render 3D Street Buildings, Neon Signs, Ground & Explosions (when visible)
    if (turnBlend > 0.01) {
      let expLightIntensity = 0.0;
      let expLightX = 1.2;
      let expLightZ = 20.5;
      if (localT >= 2.0 && localT < 5.2) {
        expLightIntensity = 0.95 * Math.sin(((localT - 2.0) / 3.2) * Math.PI) * (0.85 + 0.15 * Math.sin(localT * 38));
      } else if (localT >= 5.2) {
        expLightIntensity = 0.25 + 0.08 * Math.sin(localT * 24);
      }

      let collapseP = 0.0;
      if (localT > 2.72) {
        collapseP = Math.min(1.0, (localT - 2.72) / 1.68);
        collapseP = collapseP * collapseP * (3.0 - 2.0 * collapseP);
      }
      const collapseY = -collapseP * 18.8;
      const collapseJitterX = (collapseP > 0.01 && collapseP < 0.98)
        ? Math.sin(localT * 68.0) * 0.18
        : 0.0;

      // A. Left Building (7 stories, brown brick, 4-pane windows, glowing cyan DINER sign)
      drawWall3D(
        -16.5, 17.8, -2.35, 27.8, 0.0, 14.5,
        texLeftBldg, 192, 0, 224, 32,
        camX, camY, camZ, cosYaw, sinYaw, fovX, fovY, cx, cy,
        0.96, expLightX, expLightZ, expLightIntensity
      );
      drawWall3D(
        -2.35, 27.8, -2.35, 31.2, 0.0, 14.5,
        texLeftBldg, 32, 192, 224, 32,
        camX, camY, camZ, cosYaw, sinYaw, fovX, fovY, cx, cy,
        0.58, expLightX, expLightZ, expLightIntensity
      );

      // B. Central Collapsible 8-Story Corner Tower (Sinks into rubble during Act 3!)
      if (collapseY > -18.2) {
        drawWall3D(
          -2.15 + collapseJitterX, 24.4, 0.65 + collapseJitterX, 21.8,
          collapseY, 18.2 + collapseY,
          texCenterBldg, 64, 0, 256, 0,
          camX, camY, camZ, cosYaw, sinYaw, fovX, fovY, cx, cy,
          0.92, expLightX, expLightZ, expLightIntensity
        );
        drawWall3D(
          0.65 + collapseJitterX, 21.8, 6.65 + collapseJitterX, 25.6,
          collapseY, 18.2 + collapseY,
          texCenterBldg, 128, 64, 256, 0,
          camX, camY, camZ, cosYaw, sinYaw, fovX, fovY, cx, cy,
          1.06, expLightX, expLightZ, expLightIntensity
        );

        drawVerticalNeonSign3D(
          -2.05 + collapseJitterX, 24.1,
          5.8 + collapseY, 18.2 + collapseY,
          camX, camY, camZ, cosYaw, sinYaw, fovX, fovY, cx, cy
        );
      }

      // C. Shorter 4-Story Background Building Behind Central Tower (Clearly revealed in frame_016.jpg!)
      drawWall3D(
        -2.35, 31.0, 0.15, 27.2, 0.0, 8.8,
        texBackBldg, 64, 0, 128, 128,
        camX, camY, camZ, cosYaw, sinYaw, fovX, fovY, cx, cy,
        0.78, expLightX, expLightZ, expLightIntensity
      );
      drawWall3D(
        0.15, 27.2, 5.2, 30.2, 0.0, 8.8,
        texBackBldg, 96, 64, 128, 128,
        camX, camY, camZ, cosYaw, sinYaw, fovX, fovY, cx, cy,
        0.92, expLightX, expLightZ, expLightIntensity
      );

      // D. Right Building (5 stories, left receding wall + front-right wall with purple neon sign)
      drawWall3D(
        4.0, 30.2, 8.8, 22.0, 0.0, 10.6,
        texRightBldg, 128, 128, 160, 96,
        camX, camY, camZ, cosYaw, sinYaw, fovX, fovY, cx, cy,
        0.84, expLightX, expLightZ, expLightIntensity
      );
      drawWall3D(
        8.8, 22.0, 15.8, 24.2, 0.0, 10.6,
        texRightBldg, 128, 0, 160, 96,
        camX, camY, camZ, cosYaw, sinYaw, fovX, fovY, cx, cy,
        0.96, expLightX, expLightZ, expLightIntensity
      );
      drawWall3D(
        15.8, 24.2, 22.5, 26.2, 0.0, 8.8,
        texRightBldg, 96, 128, 128, 128,
        camX, camY, camZ, cosYaw, sinYaw, fovX, fovY, cx, cy,
        0.92, expLightX, expLightZ, expLightIntensity
      );

      // E. 3D Perspective Floor Casting: Sidewalk, Curbs, Warm Lamp Pools & Asphalt
      const startGroundY = Math.max(0, Math.ceil(cy + 1));
      for (let sy = startGroundY; sy < PH; sy++) {
        const dy = sy - cy;
        const rz = (camY * fovY) / dy;
        const rowOff = sy * PW;
        const invFovX = rz / fovX;

        for (let sx = 0; sx < PW; sx++) {
          const pIdx = rowOff + sx;
          if (zbuf[pIdx] < 1e8) continue;
          zbuf[pIdx] = rz;

          const rx = (sx - cx) * invFovX;
          const gx = camX + rx * cosYaw + rz * sinYaw;
          const gz = camZ - rx * sinYaw + rz * cosYaw;

          const leftWallZ = 27.8 + (gx + 2.35) * (10.0 / 14.15);
          const distLeftSidewalk = leftWallZ - gz;

          const rightSidewalkZ = gx < 8.8
            ? 22.0 + (8.8 - gx) * 0.55
            : 22.0 + (gx - 8.8) * 0.31;
          const distRightSidewalk = rightSidewalkZ - gz;

          const isSidewalk = (gx < -1.8 && distLeftSidewalk < 4.2) ||
                             (gx >= -1.8 && distRightSidewalk < 3.6);
          const isCurb = (gx < -1.8 && Math.abs(distLeftSidewalk - 4.2) < 0.45) ||
                         (gx >= -1.8 && Math.abs(distRightSidewalk - 3.6) < 0.45);

          let r = 8, g = 10, b = 15;

          if (isCurb) {
            const cn = (hash2((gx * 4) | 0, (gz * 4) | 0) - 0.5) * 14;
            r = 76 + cn; g = 75 + cn; b = 70 + cn;
          } else if (isSidewalk) {
            const tileX = (gx * 3.2) | 0;
            const tileZ = (gz * 3.2) | 0;
            const tn = (hash2(tileX, tileZ) - 0.5) * 16;
            r = 58 + tn; g = 58 + tn; b = 54 + tn;
          } else {
            const grit = hash2((gx * 7.5) | 0, (gz * 7.5) | 0);
            if (grit > 0.86) {
              r = 22; g = 26; b = 34;
            } else if (grit < 0.25) {
              r = 4; g = 5; b = 8;
            } else {
              r = 8; g = 10; b = 15;
            }

            const laneLineZ = 10.6 + gx * 0.36;
            if (Math.abs(gz - laneLineZ) < 0.22) {
              const dashPhase = ((gx * 0.24) % 1.0 + 1.0) % 1.0;
              if (dashPhase < 0.48) {
                r = 206; g = 136; b = 22;
              }
            }
          }

          // Pool 1: Under Left Streetlamp at (-4.6, 18.8)
          const d1x = (gx - (-4.6)) * 0.72;
          const d1z = (gz - 18.8) * 0.95;
          const d1 = d1x * d1x + d1z * d1z;
          if (d1 < 9.5) {
            const boost = d1 < 4.5 ? 1.48 : 1.24;
            r = r * boost + (d1 < 4.5 ? 18 : 8);
            g = g * boost + (d1 < 4.5 ? 12 : 5);
            b = b * (boost * 0.88);
          }

          // Pool 2: Foreground Right Warm Light Pool on Street at (6.4, 11.4)
          const d2x = (gx - 6.4) * 0.65;
          const d2z = (gz - 11.4) * 0.85;
          const d2 = d2x * d2x + d2z * d2z;
          if (d2 < 8.5) {
            r = Math.max(r, d2 < 4.0 ? 64 : 52);
            g = Math.max(g, d2 < 4.0 ? 55 : 44);
            b = Math.max(b, d2 < 4.0 ? 38 : 30);
          }

          // Pool 3: Under Right Streetlamp at (7.8, 19.6)
          const d3x = (gx - 7.8) * 0.8;
          const d3z = (gz - 19.6) * 0.9;
          if (d3x * d3x + d3z * d3z < 6.0) {
            r *= 1.28; g *= 1.22; b *= 1.1;
          }

          if (expLightIntensity > 0) {
            const edx = gx - expLightX;
            const edz = gz - expLightZ;
            const eg = expLightIntensity / (1.0 + (edx * edx + edz * edz) * 0.04);
            r += eg * 55;
            g += eg * 24;
            b += eg * 5;
          }

          buf32[pIdx] = packRGB(r, g, b);
        }
      }

      // F. Dark Blue Parked Car Silhouette at Far Right + 3D Streetlamps
      drawStreetlamp3D(
        -4.6, 18.8, 6.85, false,
        camX, camY, camZ, cosYaw, sinYaw, fovX, fovY, cx, cy
      );
      drawStreetlamp3D(
        7.8, 19.6, 5.35, true,
        camX, camY, camZ, cosYaw, sinYaw, fovX, fovY, cx, cy
      );

      drawWall3D(
        10.6, 19.2, 14.5, 19.8, 0.0, 1.55,
        texRightBldg, 32, 0, 16, 0,
        camX, camY, camZ, cosYaw, sinYaw, fovX, fovY, cx, cy,
        0.0, 0, 0, 0
      );
      for (let sy = 128; sy < 154; sy++) {
        for (let sx = 326; sx < PW; sx++) {
          const pIdx = sy * PW + sx;
          if (zbuf[pIdx] > 17.0 && zbuf[pIdx] < 20.5) {
            buf32[pIdx] = sy < 136 ? packRGB(6, 12, 42) : packRGB(10, 20, 68);
          }
        }
      }

      // G. Billboarded L.A.P.D. Pig Cops & Red C-4 Hazard Barrels on Street
      if (localT < 2.08) {
        const pig1Firing = (localT > 1.50 && localT < 1.85) && (((localT * 16) | 0) & 1);
        const pig1Flash = localT > 1.98;
        drawHazardBarrelBillboard(
          -0.8, 0.0, 20.4,
          camX, camY, camZ, cosYaw, sinYaw, fovX, fovY, cx, cy
        );
        drawPigCopBillboard(
          0.35, 0.0, 19.5, pig1Firing, pig1Flash,
          camX, camY, camZ, cosYaw, sinYaw, fovX, fovY, cx, cy
        );
      }

      if (localT < 5.68) {
        const pig2Firing = ((localT > 2.4 && localT < 3.1) || (localT > 4.6 && localT < 5.2)) &&
                           (((localT * 14) | 0) & 1);
        const pig2Flash = localT > 5.55;
        drawHazardBarrelBillboard(
          4.8, 0.0, 20.8,
          camX, camY, camZ, cosYaw, sinYaw, fovX, fovY, cx, cy
        );
        drawPigCopBillboard(
          3.9, 0.0, 19.8, pig2Firing, pig2Flash,
          camX, camY, camZ, cosYaw, sinYaw, fovX, fovY, cx, cy
        );
      }

      // H. Screaming RPG Rockets in 3D Space with Pixel Smoke Trails
      const rockets = [
        { t0: 1.62, t1: 2.02, tx: 0.2, ty: 2.2, tz: 20.2 },
        { t0: 3.18, t1: 3.58, tx: 2.8, ty: 4.5, tz: 20.5 },
        { t0: 5.28, t1: 5.65, tx: 3.9, ty: 1.2, tz: 19.8 }
      ];
      for (let r = 0; r < rockets.length; r++) {
        const rk = rockets[r];
        if (localT >= rk.t0 && localT <= rk.t1) {
          const rp = (localT - rk.t0) / (rk.t1 - rk.t0);
          const sx0 = camX + 1.1, sy0 = camY - 0.35, sz0 = camZ + 2.0;
          const rwx = sx0 + (rk.tx - sx0) * rp;
          const rwy = sy0 + (rk.ty - sy0) * rp;
          const rwz = sz0 + (rk.tz - sz0) * rp;

          for (let s = 1; s <= 5; s++) {
            const sp = Math.max(0, rp - s * 0.06);
            const twx = sx0 + (rk.tx - sx0) * sp;
            const twy = sy0 + (rk.ty - sy0) * sp;
            const twz = sz0 + (rk.tz - sz0) * sp;
            drawCellularExplosionPuff(
              twx, twy, twz, 0.28 + s * 0.08, 2, r * 17 + s, localT,
              camX, camY, camZ, cosYaw, sinYaw, fovX, fovY, cx, cy
            );
          }
          drawCellularExplosionPuff(
            rwx, rwy, rwz, 0.42, 0, r * 31, localT,
            camX, camY, camZ, cosYaw, sinYaw, fovX, fovY, cx, cy
          );
        }
      }

      // I. Authentic 1996 Build-Engine Demolition Explosions, Smoke & Rubble
      if (localT >= 3.2) {
        const rubAlpha = Math.min(1.0, (localT - 3.2) / 1.2);
        for (let rb = 0; rb < 9; rb++) {
          const rbx = -1.6 + rb * 0.82;
          const rbz = 21.0 + (rb % 3) * 0.8;
          const rbh = (0.9 + (rb % 4) * 0.35) * rubAlpha;
          const dx = rbx - camX, dz = rbz - camZ;
          const rx = dx * cosYaw - dz * sinYaw;
          const rz = dx * sinYaw + dz * cosYaw;
          if (rz > 1.5) {
            const sxC = Math.round(cx + (rx / rz) * fovX);
            const syB = Math.round(cy - ((0 - camY) / rz) * fovY);
            const syT = Math.round(cy - ((rbh - camY) / rz) * fovY);
            const rw = Math.max(4, Math.round((0.85 / rz) * fovX));
            for (let sy = Math.max(0, syT); sy <= Math.min(PH - 1, syB); sy++) {
              for (let sx = Math.max(0, sxC - rw); sx <= Math.min(PW - 1, sxC + rw); sx++) {
                const pIdx = sy * PW + sx;
                if (rz < zbuf[pIdx]) {
                  zbuf[pIdx] = rz;
                  const h = hash2(sx >> 1, sy >> 1);
                  buf32[pIdx] = h > 0.5 ? packRGB(52, 18, 10) : packRGB(28, 10, 8);
                }
              }
            }
          }
        }
      }

      // Act 2 Explosion (frame_015.jpg at localT = 2.5s)
      if (localT >= 1.98 && localT < 4.10) {
        const ep = (localT - 1.98) / 2.12;
        const grow = Math.min(1.0, ep * 3.5);
        const fade = ep > 0.65 ? 1.0 - (ep - 0.65) / 0.35 : 1.0;
        const scale = grow * fade;

        drawCellularExplosionPuff(
          2.1, 2.5 + ep * 1.2, 19.6, 2.35 * scale, 1, 11.3, localT,
          camX, camY, camZ, cosYaw, sinYaw, fovX, fovY, cx, cy
        );
        drawCellularExplosionPuff(
          2.8, 1.6 + ep * 0.8, 19.4, 2.05 * scale, 1, 23.7, localT,
          camX, camY, camZ, cosYaw, sinYaw, fovX, fovY, cx, cy
        );
        drawCellularExplosionPuff(
          0.3, 1.5 + ep * 0.6, 19.5, 1.95 * scale, 1, 37.1, localT,
          camX, camY, camZ, cosYaw, sinYaw, fovX, fovY, cx, cy
        );
        drawCellularExplosionPuff(
          0.25, 3.85 + ep * 0.7, 19.2, 1.65 * scale, 0, 5.2, localT,
          camX, camY, camZ, cosYaw, sinYaw, fovX, fovY, cx, cy
        );
      }

      // Act 3 Demolition Collapse Fireball & Smoke (frame_016.jpg at localT = 4.5s)
      // Positioned so the left 2 bays of the 4-story rear building peek out clearly on the left!
      if (localT >= 3.45 && localT < 5.75) {
        const ep = (localT - 3.45) / 2.30;
        const grow = Math.min(1.0, ep * 2.8);
        const fade = ep > 0.62 ? 1.0 - (ep - 0.62) / 0.38 : 1.0;
        const scale = grow * fade;

        drawCellularExplosionPuff(
          0.95, 2.9 + ep * 1.6, 20.2, 1.95 * grow, 2, 51.4, localT,
          camX, camY, camZ, cosYaw, sinYaw, fovX, fovY, cx, cy
        );
        drawCellularExplosionPuff(
          0.35, 3.5 + ep * 1.3, 19.8, 1.45 * scale, 1, 63.8, localT,
          camX, camY, camZ, cosYaw, sinYaw, fovX, fovY, cx, cy
        );
        drawCellularExplosionPuff(
          5.3, 2.1 + ep * 1.0, 20.4, 1.85 * grow, 2, 77.2, localT,
          camX, camY, camZ, cosYaw, sinYaw, fovX, fovY, cx, cy
        );
        drawCellularExplosionPuff(
          2.65, 4.35 + ep * 0.9, 19.3, 2.15 * scale, 0, 89.1, localT,
          camX, camY, camZ, cosYaw, sinYaw, fovX, fovY, cx, cy
        );
      }

      // Act 4 Towering Dark Smoke Column & Rubble Spot Fires (frame_017.jpg at localT = 6.5s)
      if (localT >= 4.60) {
        const sp = Math.min(1.0, (localT - 4.60) / 1.4);
        const driftY = (localT - 4.60) * 0.85;

        const smokePuffs = [
          { x: 0.4, y: 2.2, z: 20.5, r: 2.2 },
          { x: 1.8, y: 3.4, z: 20.3, r: 2.4 },
          { x: 0.2, y: 4.8 + driftY * 0.4, z: 20.4, r: 2.3 },
          { x: 1.6, y: 6.4 + driftY * 0.6, z: 20.2, r: 2.1 },
          { x: 0.5, y: 8.2 + driftY * 0.8, z: 20.5, r: 1.95 },
          { x: 1.2, y: 10.0 + driftY * 1.0, z: 20.6, r: 1.65 }
        ];
        for (let i = 0; i < smokePuffs.length; i++) {
          const pf = smokePuffs[i];
          drawCellularExplosionPuff(
            pf.x, pf.y, pf.z, pf.r * sp, 2, 110 + i * 19, localT,
            camX, camY, camZ, cosYaw, sinYaw, fovX, fovY, cx, cy
          );
        }

        drawCellularExplosionPuff(
          -1.45, 1.35, 19.6, 0.48, 0, 201, localT,
          camX, camY, camZ, cosYaw, sinYaw, fovX, fovY, cx, cy
        );
        drawCellularExplosionPuff(
          0.15, 0.95, 19.5, 0.42, 0, 202, localT,
          camX, camY, camZ, cosYaw, sinYaw, fovX, fovY, cx, cy
        );
        drawCellularExplosionPuff(
          3.15, 1.05, 19.4, 0.68, 0, 203, localT,
          camX, camY, camZ, cosYaw, sinYaw, fovX, fovY, cx, cy
        );

        const sparkPts = [
          [-1.8, 0.4, 19.2, 255, 60, 120],
          [-0.9, 0.3, 19.0, 90, 160, 255],
          [0.6, 0.5, 19.1, 255, 220, 60],
          [1.4, 0.3, 19.2, 80, 140, 255],
          [2.1, 0.6, 19.1, 255, 100, 40]
        ];
        for (let i = 0; i < sparkPts.length; i++) {
          const [spx, spy, spz, sr, sg, sb] = sparkPts[i];
          const dx = spx - camX, dz = spz - camZ;
          const rx = dx * cosYaw - dz * sinYaw;
          const rz = dx * sinYaw + dz * cosYaw;
          const sx = Math.round(cx + (rx / rz) * fovX);
          const sy = Math.round(cy - ((spy - camY) / rz) * fovY);
          if (sx >= 0 && sx < PW - 1 && sy >= 0 && sy < PH - 1) {
            const col = packRGB(sr, sg, sb);
            buf32[sy * PW + sx] = col;
            buf32[(sy + 1) * PW + sx] = col;
          }
        }
      }

      // Flying 3D Pixel-Art Brick Masonry Chunks (matching frame_016.jpg & frame_017.jpg!)
      if (localT >= 2.25) {
        const dt = localT - 2.25;
        for (let b = 0; b < 10; b++) {
          const launchDelay = (b % 4) * 0.42;
          const bt = dt - launchDelay;
          if (bt <= 0 || bt > 4.5) continue;

          const vx = ((hash2(b, 1) - 0.48) * 5.2);
          const vy = 4.6 + hash2(b, 2) * 5.2;
          const vz = -1.2 - hash2(b, 3) * 3.2;

          const bwx = 1.6 + vx * bt;
          let bwy = 2.0 + vy * bt - 0.5 * 9.0 * bt * bt;
          const bwz = 19.8 + vz * bt;
          if (bwy < 0.12) {
            if (b > 2) continue; // Only 2 chunks remain resting on the street like frame_017.jpg
            bwy = 0.12;
          }

          const dx = bwx - camX, dz = bwz - camZ;
          const rx = dx * cosYaw - dz * sinYaw;
          const rz = dx * sinYaw + dz * cosYaw;
          if (rz < 2.5) continue;

          const sxC = Math.round(cx + (rx / rz) * fovX);
          const syC = Math.round(cy - ((bwy - camY) / rz) * fovY);
          const rad = Math.max(2, Math.min(5, Math.round((0.36 / rz) * fovY)));

          for (let dy = -rad; dy <= rad; dy++) {
            const sy = syC + dy;
            if (sy < 0 || sy >= PH) continue;
            for (let dx2 = -rad; dx2 <= rad; dx2++) {
              const sx = sxC + dx2;
              if (sx < 0 || sx >= PW) continue;
              const n = hash2(dx2 + b * 7, dy + b * 13);
              if (dx2 * dx2 + dy * dy > rad * rad + (n - 0.5) * 3.0) continue;
              const pIdx = sy * PW + sx;
              if (rz < zbuf[pIdx]) {
                zbuf[pIdx] = rz;
                buf32[pIdx] = n > 0.45 ? packRGB(72, 28, 16) : packRGB(44, 16, 9);
              }
            }
          }
        }
      }
    }

    // 3. Render Act 1 Demolition Switch Wall on Top when turnBlend < 1.0
    if (turnBlend < 0.999) {
      renderSwitchWallScene(localT, turnBlend);
    }

    // 4. Render Duke's Iconic First-Person RPG Launcher in Bottom-Right Corner
    if (turnBlend > 0.35) {
      let recoil = 0.0;
      let muzzle = 0.0;
      const fireTimes = [1.62, 3.18, 5.28];
      for (let i = 0; i < fireTimes.length; i++) {
        const dt = localT - fireTimes[i];
        if (dt >= 0 && dt < 0.32) {
          recoil = Math.sin((dt / 0.32) * Math.PI);
          if (dt < 0.12) muzzle = 1.0 - dt / 0.12;
        }
      }
      const equipSlide = Math.max(0, 1.0 - (turnBlend - 0.35) / 0.65) * 4.0;
      drawFirstPersonRPG(localT, recoil + equipSlide, muzzle);
    }

    // Blit the 360x202 Build-Engine pixel buffer to the main canvas with crisp nearest-neighbor scaling!
    offCtx.putImageData(imgData, 0, 0);
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(offCanvas, 0, 0, w, h);
    ctx.restore();
  }

  window.GAMES = window.GAMES || [];
  window.GAMES[3] = {
    title: 'Duke Nukem 3D',
    year: '1996',
    draw: drawDukeNukem3D
  };

  window.GameAnimations = window.GameAnimations || {};
  window.GameAnimations.game4 = drawDukeNukem3D;
})();
