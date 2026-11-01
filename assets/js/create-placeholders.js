// Script to create placeholder images for all fabric types
const fabricColors = {
    'soho': '#FF6B6B',
    'babyface': '#4ECDC4',
    'yonsuz_luna': '#45B7D1',
    'coco': '#96CEB4',
    'otto': '#FFEAA7',
    'anka': '#DDA0DD',
    'puffy': '#98D8C8',
    'zuma': '#F7DC6F',
    'santa': '#BB8FCE',
    'premium': '#F1948A'
};

// Generate SVG content for each fabric
Object.keys(fabricColors).forEach(fabric => {
    const color = fabricColors[fabric];
    const svgContent = `<svg width="300" height="300" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="${color}"/>
  <text x="50%" y="40%" font-family="Arial" font-size="24" fill="white" text-anchor="middle" dominant-baseline="middle">${fabric.charAt(0).toUpperCase() + fabric.slice(1)}</text>
  <text x="50%" y="60%" font-family="Arial" font-size="16" fill="white" text-anchor="middle" dominant-baseline="middle">Fabric Image</text>
</svg>`;
    
    console.log(`Creating placeholder for ${fabric}`);
    console.log(svgContent);
    console.log('---');
});