const fs = require('fs');
const path = require('path');

const filesToUpdate = [
  'Frontend/src/modules/Food/pages/restaurant/Inventory.jsx',
  'Frontend/src/modules/Food/pages/restaurant/auth/OTP.jsx',
  'Frontend/src/modules/Food/pages/restaurant/auth/Login.jsx'
];

for (const relPath of filesToUpdate) {
  const filePath = path.join(__dirname, relPath);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Replace hex colors
    content = content.replace(/'#B80B3D'/g, "'#22C55E'");
    content = content.replace(/"#B80B3D"/g, '"#22C55E"');
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`${relPath} updated`);
  }
}
