const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const horseDir = path.join(__dirname, 'assets', 'images', 'horse');
const colors = ['purple', 'blue', 'red'];

async function convertSvgToPng(color) {
    const svgPath = path.join(horseDir, `horse-${color}.svg`);
    const pngPath = path.join(horseDir, `horse-${color}.png`);
    
    try {
        const svgBuffer = fs.readFileSync(svgPath);
        
        await sharp(svgBuffer)
            .resize(200, 200)
            .png({
                background: { r: 0, g: 0, b: 0, alpha: 0 }
            })
            .toFile(pngPath);
        
        console.log(`Converted horse-${color}.svg -> horse-${color}.png`);
    } catch (error) {
        console.error(`Error converting ${color}:`, error);
    }
}

async function main() {
    for (const color of colors) {
        await convertSvgToPng(color);
    }
    console.log('All conversions complete!');
}

main();