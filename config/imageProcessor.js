const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

// ── In-memory cache for downloaded logos (keyed by URL, expires after 1 hour) ──
const logoCache = new Map(); // { url: { buffer, expiry } }
const LOGO_CACHE_TTL = 60 * 60 * 1000; // 1 hour

const DEFAULT_LOGO_PATH = path.join(__dirname, '..', 'public', 'watermark-default.png');

// ── Configuration ──
const CONFIG = {
  mainMaxWidth: 1200,      // Max width for watermarked image
  thumbMaxWidth: 300,       // Max width for thumbnail
  jpegQuality: 80,          // JPEG compression quality
  logoSizePercent: 0.10,    // Logo = 10% of image width (corners)
  logoCenterPercent: 0.12,  // Logo = 12% of image width (center)
  logoOpacity: 0.15,        // 15% opacity
  cornerOffset: 0.05,       // 5% offset from edges
};

/**
 * Download a logo image from a URL and return as a Buffer.
 * Uses in-memory cache with 1-hour TTL.
 * @param {string} url - Logo URL
 * @returns {Promise<Buffer|null>} PNG buffer or null on failure
 */
async function fetchLogo(url) {
  if (!url) return null;

  // Check cache
  const cached = logoCache.get(url);
  if (cached && cached.expiry > Date.now()) {
    return cached.buffer;
  }

  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Convert to PNG with alpha (in case it's JPEG)
    const pngBuffer = await sharp(buffer).ensureAlpha().png().toBuffer();

    // Cache it
    logoCache.set(url, { buffer: pngBuffer, expiry: Date.now() + LOGO_CACHE_TTL });
    return pngBuffer;
  } catch (err) {
    console.error('Failed to fetch logo from URL:', url, err.message);
    return null;
  }
}

/**
 * Load the default fallback watermark logo.
 * @returns {Promise<Buffer|null>}
 */
async function getDefaultLogo() {
  try {
    if (!fs.existsSync(DEFAULT_LOGO_PATH)) return null;
    return await sharp(DEFAULT_LOGO_PATH).ensureAlpha().png().toBuffer();
  } catch {
    return null;
  }
}

/**
 * Get the watermark logo buffer — from partner URL or fallback.
 * @param {string|null} partnerLogoUrl
 * @returns {Promise<Buffer|null>}
 */
async function getWatermarkLogo(partnerLogoUrl) {
  const logo = await fetchLogo(partnerLogoUrl);
  if (logo) return logo;
  return await getDefaultLogo();
}

/**
 * Resize a logo buffer to a target width, maintaining aspect ratio.
 * Also applies the desired opacity.
 * @param {Buffer} logoBuffer
 * @param {number} targetWidth
 * @param {number} opacity - 0 to 1
 * @returns {Promise<Buffer>}
 */
async function prepareLogoAtSize(logoBuffer, targetWidth, opacity) {
  const resized = await sharp(logoBuffer)
    .resize({ width: Math.round(targetWidth), fit: 'inside' })
    .ensureAlpha()
    .toBuffer();

  // Apply opacity by compositing with a transparent layer
  const meta = await sharp(resized).metadata();
  const opacityOverlay = Buffer.from(
    `<svg width="${meta.width}" height="${meta.height}">
      <rect width="100%" height="100%" fill="white" opacity="${opacity}"/>
    </svg>`
  );

  // Use the logo as input, then composite a semi-transparent white mask to reduce opacity
  // Actually, a simpler approach: extract channels and multiply alpha
  const { data, info } = await sharp(resized).raw().toBuffer({ resolveWithObject: true });

  // Multiply alpha channel by opacity factor
  const channels = info.channels; // should be 4 (RGBA)
  if (channels === 4) {
    for (let i = 3; i < data.length; i += 4) {
      data[i] = Math.round(data[i] * opacity);
    }
  }

  return await sharp(data, { raw: { width: info.width, height: info.height, channels: info.channels } })
    .png()
    .toBuffer();
}

/**
 * Build an SVG overlay with diagonal repeated text watermark.
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @param {string} text - Watermark text (brand name)
 * @returns {string} SVG string
 */
function buildTextWatermarkSvg(width, height, text) {
  const fontSize = Math.max(Math.round(width * 0.04), 14);
  const spacing = Math.round(fontSize * 6);
  const escapedText = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  // Generate a grid of text elements rotated -35 degrees
  let textElements = '';
  for (let y = -height; y < height * 2; y += spacing) {
    for (let x = -width; x < width * 2; x += spacing) {
      textElements += `<text x="${x}" y="${y}" font-size="${fontSize}" font-family="Arial, sans-serif" font-weight="bold" fill="white" opacity="0.06" transform="rotate(-35, ${x}, ${y})">${escapedText}</text>`;
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    ${textElements}
  </svg>`;
}

/**
 * Process an uploaded image: resize, compress, watermark (5 positions + text), generate thumbnail.
 *
 * @param {Buffer} inputBuffer - Raw uploaded image buffer
 * @param {string|null} partnerLogoUrl - URL to partner's logo for watermarking
 * @param {string|null} partnerBrandName - Brand name for text watermark
 * @returns {Promise<{ main: Buffer, thumbnail: Buffer }>}
 */
async function processImage(inputBuffer, partnerLogoUrl, partnerBrandName) {
  // Step 1: Resize main image to max width, convert to JPEG
  const mainImage = sharp(inputBuffer)
    .rotate() // auto-rotate based on EXIF
    .resize({ width: CONFIG.mainMaxWidth, withoutEnlargement: true })
    .jpeg({ quality: CONFIG.jpegQuality, mozjpeg: true });

  let mainBuffer = await mainImage.toBuffer();
  const mainMeta = await sharp(mainBuffer).metadata();
  const imgW = mainMeta.width;
  const imgH = mainMeta.height;

  // Step 2: Get watermark logo
  const logoBuffer = await getWatermarkLogo(partnerLogoUrl);

  if (logoBuffer) {
    // Prepare corner logos and center logo
    const cornerLogoWidth = Math.round(imgW * CONFIG.logoSizePercent);
    const centerLogoWidth = Math.round(imgW * CONFIG.logoCenterPercent);

    const [cornerLogo, centerLogo] = await Promise.all([
      prepareLogoAtSize(logoBuffer, cornerLogoWidth, CONFIG.logoOpacity),
      prepareLogoAtSize(logoBuffer, centerLogoWidth, CONFIG.logoOpacity),
    ]);

    const cornerMeta = await sharp(cornerLogo).metadata();
    const centerMeta = await sharp(centerLogo).metadata();

    const offsetX = Math.round(imgW * CONFIG.cornerOffset);
    const offsetY = Math.round(imgH * CONFIG.cornerOffset);

    // 5-point composite: top-left, top-right, center, bottom-left, bottom-right
    const composites = [
      // Top-left
      { input: cornerLogo, left: offsetX, top: offsetY },
      // Top-right
      { input: cornerLogo, left: imgW - cornerMeta.width - offsetX, top: offsetY },
      // Center
      {
        input: centerLogo,
        left: Math.round((imgW - centerMeta.width) / 2),
        top: Math.round((imgH - centerMeta.height) / 2),
      },
      // Bottom-left
      { input: cornerLogo, left: offsetX, top: imgH - cornerMeta.height - offsetY },
      // Bottom-right
      { input: cornerLogo, left: imgW - cornerMeta.width - offsetX, top: imgH - cornerMeta.height - offsetY },
    ];

    mainBuffer = await sharp(mainBuffer)
      .composite(composites)
      .jpeg({ quality: CONFIG.jpegQuality, mozjpeg: true })
      .toBuffer();
  }

  // Step 2b: Add diagonal text watermark (brand name repeated across image)
  if (partnerBrandName) {
    const textSvg = buildTextWatermarkSvg(imgW, imgH, partnerBrandName);
    mainBuffer = await sharp(mainBuffer)
      .composite([{ input: Buffer.from(textSvg), left: 0, top: 0 }])
      .jpeg({ quality: CONFIG.jpegQuality, mozjpeg: true })
      .toBuffer();
  }

  // Step 3: Generate thumbnail from watermarked image
  const thumbnail = await sharp(mainBuffer)
    .resize({ width: CONFIG.thumbMaxWidth, withoutEnlargement: true })
    .jpeg({ quality: CONFIG.jpegQuality, mozjpeg: true })
    .toBuffer();

  return { main: mainBuffer, thumbnail };
}

/**
 * Clear the in-memory logo cache (useful for testing or when partner logo changes).
 */
function clearLogoCache() {
  logoCache.clear();
}

module.exports = {
  processImage,
  clearLogoCache,
  CONFIG,
};
