/**
 * Parses a hex color string (e.g. #ffffff, #2563eb, #fff) into RGB values
 */
export function parseHexColor(hex: string): { r: number; g: number; b: number } {
  let c = hex.replace('#', '').trim();
  if (c.length === 3) {
    c = c
      .split('')
      .map((ch) => ch + ch)
      .join('');
  }
  const num = parseInt(c, 16);
  if (isNaN(num)) return { r: 255, g: 255, b: 255 };
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255
  };
}

/**
 * Modifies an SVG document string by replacing its background elements with targetColorHex.
 * Accurately handles <rect id="bg">, <rect class="passport-bg">, root background rects,
 * style attributes, and transparent SVGs by inserting a background rect if none exists.
 */
export function applySvgBackgroundColor(svgText: string, targetColorHex: string): string {
  if (
    !targetColorHex ||
    targetColorHex === 'transparent' ||
    targetColorHex === 'original' ||
    targetColorHex === 'none'
  ) {
    return svgText;
  }

  try {
    if (typeof DOMParser !== 'undefined') {
      const parser = new DOMParser();
      const doc = parser.parseFromString(svgText, 'image/svg+xml');
      const svg = doc.querySelector('svg');
      if (svg) {
        // 1. Look for explicit background elements by id or class
        let bgElement: Element | null = doc.querySelector(
          '#bg, #background, #passport-bg, [id*="bg"], [id*="background"], .passport-bg, .bg, .background'
        );

        // 2. Look for full canvas rects
        if (!bgElement) {
          const rects = doc.querySelectorAll('rect');
          for (let i = 0; i < rects.length; i++) {
            const r = rects[i];
            const w = r.getAttribute('width');
            const h = r.getAttribute('height');
            if (
              w === '100%' ||
              h === '100%' ||
              (w && parseInt(w) >= 600) ||
              r.id.toLowerCase().includes('bg') ||
              r.getAttribute('class')?.toLowerCase().includes('bg')
            ) {
              bgElement = r;
              break;
            }
          }
        }

        // 3. Fallback to the very first child of <svg> if it is a <rect>
        if (!bgElement) {
          const first = svg.firstElementChild;
          if (first && first.tagName.toLowerCase() === 'rect') {
            bgElement = first;
          }
        }

        if (bgElement) {
          bgElement.setAttribute('fill', targetColorHex);
          // If style attribute contains fill, update or remove it so attribute takes effect
          if (bgElement.hasAttribute('style')) {
            const style = bgElement.getAttribute('style') || '';
            const updatedStyle = style.replace(/fill\s*:\s*[^;]+/i, `fill: ${targetColorHex}`);
            bgElement.setAttribute('style', updatedStyle);
          }
        } else {
          // If no background element exists, insert a background rect at the very top of <svg>
          const newRect = doc.createElementNS('http://www.w3.org/2000/svg', 'rect');
          newRect.setAttribute('id', 'bg');
          newRect.setAttribute('class', 'passport-bg');
          newRect.setAttribute('width', '100%');
          newRect.setAttribute('height', '100%');
          newRect.setAttribute('fill', targetColorHex);
          svg.insertBefore(newRect, svg.firstChild);
        }

        return new XMLSerializer().serializeToString(doc);
      }
    }
  } catch (err) {
    console.warn('DOMParser SVG background modification failed, using regex fallback', err);
  }

  // Regex fallback:
  // 1. Matches <rect ... id/class ... fill="..."> with any attribute order
  const bgWithFillRegex = /(<rect\b[^>]*?\b(?:id=["'](?:bg|background|passport-bg)["']|class=["'][^"']*(?:passport-bg|bg)[^"']*["'])[^>]*?\bfill=)(["'])[^"']*?\2/gi;
  if (bgWithFillRegex.test(svgText)) {
    return svgText.replace(bgWithFillRegex, `$1"${targetColorHex}"`);
  }

  // 1b. Fill attribute before id/class attribute
  const fillBeforeIdRegex = /(<rect\b[^>]*?\bfill=)(["'])[^"']*?\2([^>]*?\b(?:id=["'](?:bg|background|passport-bg)["']|class=["'][^"']*(?:passport-bg|bg)[^"']*["']))/gi;
  if (fillBeforeIdRegex.test(svgText)) {
    return svgText.replace(fillBeforeIdRegex, `$1"${targetColorHex}"$3`);
  }

  // 2. Matches <rect width="100%" height="100%" ... fill="...">
  const fullRectRegex = /(<rect\b[^>]*?\bwidth=["']100%["'][^>]*?\bfill=)(["'])[^"']*?\2/gi;
  if (fullRectRegex.test(svgText)) {
    return svgText.replace(fullRectRegex, `$1"${targetColorHex}"`);
  }

  // 3. Fallback: prepend a background rect inside <svg>
  return svgText.replace(/(<svg\b[^>]*?>)/i, `$1<rect id="bg" class="passport-bg" width="100%" height="100%" fill="${targetColorHex}"/>`);
}

/**
 * Replaces the background of an image on an HTMLCanvasElement with targetColorHex.
 * Handles both transparent portraits (cutout PNGs) and solid portrait photos
 * (using boundary-seeded flood fill, edge gradient protection, and skin-tone preservation).
 */
export function replaceCanvasBackground(
  canvas: HTMLCanvasElement,
  targetColorHex: string
): void {
  if (
    !targetColorHex ||
    targetColorHex === 'transparent' ||
    targetColorHex === 'original' ||
    targetColorHex === 'none'
  ) {
    return;
  }

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return;

  const width = canvas.width;
  const height = canvas.height;
  if (width <= 0 || height <= 0) return;

  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;
  const totalPixels = width * height;

  const target = parseHexColor(targetColorHex);

  // 1. Check if image contains existing transparency (alpha < 250)
  let transparentCount = 0;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < 250) {
      transparentCount++;
      if (transparentCount > 10) break;
    }
  }

  // If already transparent / cutout portrait:
  if (transparentCount > 10) {
    for (let i = 0; i < data.length; i += 4) {
      const a = data[i + 3] / 255;
      if (a < 1) {
        data[i] = Math.round(data[i] * a + target.r * (1 - a));
        data[i + 1] = Math.round(data[i + 1] * a + target.g * (1 - a));
        data[i + 2] = Math.round(data[i + 2] * a + target.b * (1 - a));
        data[i + 3] = 255;
      }
    }
    ctx.putImageData(imgData, 0, 0);
    return;
  }

  // 2. Solid portrait photo: Collect background palette from perimeter
  // In passport photos, top edge, top-left corner, and top-right corner are guaranteed background
  const bgPalette: { r: number; g: number; b: number }[] = [];
  let sumR = 0;
  let sumG = 0;
  let sumB = 0;
  let sampleCount = 0;

  const addSample = (x: number, y: number) => {
    if (x < 0 || x >= width || y < 0 || y >= height) return;
    const idx = (y * width + x) * 4;
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];
    sumR += r;
    sumG += g;
    sumB += b;
    sampleCount++;
    if (sampleCount % 12 === 0) {
      bgPalette.push({ r, g, b });
    }
  };

  // Sample top 6 rows
  const maxSampleRow = Math.min(6, Math.floor(height * 0.05));
  for (let y = 0; y < maxSampleRow; y++) {
    for (let x = 0; x < width; x += 3) {
      addSample(x, y);
    }
  }

  // Sample top-left and top-right corner boxes
  const cornerW = Math.max(10, Math.floor(width * 0.18));
  const cornerH = Math.max(10, Math.floor(height * 0.22));
  for (let y = 0; y < cornerH; y += 2) {
    for (let x = 0; x < cornerW; x += 2) {
      addSample(x, y);
    }
    for (let x = width - cornerW; x < width; x += 2) {
      addSample(x, y);
    }
  }

  // Sample upper side borders down to 60% height
  const maxSideH = Math.floor(height * 0.6);
  for (let y = 0; y < maxSideH; y += 3) {
    addSample(0, y);
    addSample(1, y);
    addSample(width - 1, y);
    addSample(width - 2, y);
  }

  if (sampleCount === 0) return;

  const avgBgR = sumR / sampleCount;
  const avgBgG = sumG / sampleCount;
  const avgBgB = sumB / sampleCount;
  bgPalette.push({ r: avgBgR, g: avgBgG, b: avgBgB });

  // 3. Human skin tone & central face region protection
  const isProtected = new Uint8Array(totalPixels);
  const faceLeft = Math.floor(width * 0.22);
  const faceRight = Math.floor(width * 0.78);
  const faceTop = Math.floor(height * 0.16);
  const faceBottom = Math.floor(height * 0.88);

  for (let y = faceTop; y < faceBottom; y++) {
    const rowOffset = y * width;
    for (let x = faceLeft; x < faceRight; x++) {
      const p = (rowOffset + x) * 4;
      const r = data[p];
      const g = data[p + 1];
      const b = data[p + 2];

      // Human skin tone characteristics
      const isSkin =
        r > 60 &&
        g > 35 &&
        b > 20 &&
        r > g &&
        g > b &&
        r - g >= 8 &&
        r - b >= 14;

      if (isSkin) {
        isProtected[rowOffset + x] = 1;
      }
    }
  }

  // 4. Compute Luminance Edge Gradient Map
  const grad = new Uint8Array(totalPixels);
  for (let y = 1; y < height - 1; y++) {
    const rowOffset = y * width;
    for (let x = 1; x < width - 1; x++) {
      const p = (rowOffset + x) * 4;
      const pL = (rowOffset + x - 1) * 4;
      const pR = (rowOffset + x + 1) * 4;
      const pU = (rowOffset - width + x) * 4;
      const pD = (rowOffset + width + x) * 4;

      const lumL = 0.299 * data[pL] + 0.587 * data[pL + 1] + 0.114 * data[pL + 2];
      const lumR = 0.299 * data[pR] + 0.587 * data[pR + 1] + 0.114 * data[pR + 2];
      const lumU = 0.299 * data[pU] + 0.587 * data[pU + 1] + 0.114 * data[pU + 2];
      const lumD = 0.299 * data[pD] + 0.587 * data[pD + 1] + 0.114 * data[pD + 2];

      const gx = lumR - lumL;
      const gy = lumD - lumU;
      const gMag = Math.sqrt(gx * gx + gy * gy);
      grad[rowOffset + x] = Math.min(255, Math.round(gMag));
    }
  }

  // 5. Multi-seed Flood Fill (BFS) from outer borders
  const mask = new Uint8Array(totalPixels);
  const queueX = new Int16Array(totalPixels);
  const queueY = new Int16Array(totalPixels);
  let qHead = 0;
  let qTail = 0;

  const pushSeed = (x: number, y: number) => {
    const idx = y * width + x;
    if (mask[idx] === 0 && isProtected[idx] === 0) {
      mask[idx] = 255;
      queueX[qTail] = x;
      queueY[qTail] = y;
      qTail++;
    }
  };

  // Seed top edge
  for (let x = 0; x < width; x++) {
    pushSeed(x, 0);
  }

  // Seed left & right edges
  for (let y = 1; y < maxSideH; y++) {
    pushSeed(0, y);
    pushSeed(width - 1, y);
  }

  // Distance helper
  const getMinBgDist = (r: number, g: number, b: number): number => {
    let minDist = Infinity;
    for (let i = 0; i < bgPalette.length; i++) {
      const bp = bgPalette[i];
      const d = Math.sqrt(
        0.3 * (r - bp.r) * (r - bp.r) +
          0.59 * (g - bp.g) * (g - bp.g) +
          0.11 * (b - bp.b) * (b - bp.b)
      );
      if (d < minDist) minDist = d;
    }
    return minDist;
  };

  const dx = [1, -1, 0, 0];
  const dy = [0, 0, 1, -1];

  while (qHead < qTail) {
    const cx = queueX[qHead];
    const cy = queueY[qHead];
    qHead++;

    const cIdx = cy * width + cx;
    const cp = cIdx * 4;
    const cr = data[cp];
    const cg = data[cp + 1];
    const cb = data[cp + 2];

    for (let k = 0; k < 4; k++) {
      const nx = cx + dx[k];
      const ny = cy + dy[k];

      if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;

      const nIdx = ny * width + nx;
      if (mask[nIdx] > 0) continue; // Already visited or filled
      if (isProtected[nIdx] === 1) continue; // Skin tone protection

      const np = nIdx * 4;
      const nr = data[np];
      const ng = data[np + 1];
      const nb = data[np + 2];

      // Edge barrier check
      const edge = grad[nIdx];
      if (edge > 42) {
        // Mark as semi-transparent edge feathering to prevent sharp jagged lines
        const d = getMinBgDist(nr, ng, nb);
        if (d < 70) {
          mask[nIdx] = Math.max(40, Math.min(200, Math.round(255 * (1 - d / 70))));
        }
        continue;
      }

      // Local neighbor similarity
      const dLocal = Math.sqrt(
        0.3 * (nr - cr) * (nr - cr) +
          0.59 * (ng - cg) * (ng - cg) +
          0.11 * (nb - cb) * (nb - cb)
      );

      // Global palette similarity
      const dBg = getMinBgDist(nr, ng, nb);

      if (dLocal < 24 && dBg < 75) {
        mask[nIdx] = 255;
        queueX[qTail] = nx;
        queueY[qTail] = ny;
        qTail++;
      } else if (dBg < 95 && edge < 35) {
        // Soft edge transition
        mask[nIdx] = Math.max(30, Math.min(220, Math.round(255 * (1 - (dBg - 65) / 30))));
      }
    }
  }

  // 6. Apply target background color replacement
  for (let i = 0; i < totalPixels; i++) {
    const m = mask[i];
    if (m === 255) {
      const p = i * 4;
      data[p] = target.r;
      data[p + 1] = target.g;
      data[p + 2] = target.b;
      data[p + 3] = 255;
    } else if (m > 0) {
      const p = i * 4;
      const alpha = m / 255;
      data[p] = Math.round(target.r * alpha + data[p] * (1 - alpha));
      data[p + 1] = Math.round(target.g * alpha + data[p + 1] * (1 - alpha));
      data[p + 2] = Math.round(target.b * alpha + data[p + 2] * (1 - alpha));
      data[p + 3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);
}
