// This script generates a simple icon for the Electron app
const fs = require('fs');
const path = require('path');

// Create a simple 512x512 PNG icon (placeholder)
// In production, you'd want to use a proper icon file
const iconPath = path.join(__dirname, '../public/icon.png');

// Check if icon exists
if (!fs.existsSync(iconPath)) {
  console.log('Icon not found. Creating placeholder icon...');
  // Create a minimal valid PNG (1x1 pixel)
  const minimalPng = Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
    0x00, 0x00, 0x00, 0x0D, // IHDR length
    0x49, 0x48, 0x44, 0x52, // IHDR type
    0x00, 0x00, 0x00, 0x01, // width: 1
    0x00, 0x00, 0x00, 0x01, // height: 1
    0x08, 0x02,             // bit depth: 8, color type: 2 (RGB)
    0x00, 0x00, 0x00,       // compression, filter, interlace
    0x90, 0x77, 0x53, 0xDE, // CRC
    0x00, 0x00, 0x00, 0x0C, // IDAT length
    0x49, 0x44, 0x41, 0x54, // IDAT type
    0x08, 0xD7, 0x63, 0xF8, 0xCF, 0xC0, 0x00, 0x00, // compressed data
    0x00, 0x02, 0x00, 0x01, // CRC
    0xE2, 0x21, 0xBC, 0x33,
    0x00, 0x00, 0x00, 0x00, // IEND length
    0x49, 0x45, 0x4E, 0x44, // IEND type
    0xAE, 0x42, 0x60, 0x82  // CRC
  ]);
  
  fs.writeFileSync(iconPath, minimalPng);
  console.log('Placeholder icon created at:', iconPath);
} else {
  console.log('Icon already exists at:', iconPath);
}
