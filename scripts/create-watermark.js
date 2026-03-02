const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const outDir = path.join(__dirname, '..', 'public');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const svg = `<svg width="200" height="60" xmlns="http://www.w3.org/2000/svg">
  <text x="100" y="40" font-family="Arial, sans-serif" font-size="22" font-weight="bold"
        fill="white" text-anchor="middle" opacity="0.9">EKAM</text>
</svg>`;

sharp(Buffer.from(svg))
  .png()
  .toFile(path.join(outDir, 'watermark-default.png'))
  .then(() => console.log('Created public/watermark-default.png'))
  .catch(err => console.error('Error:', err));
