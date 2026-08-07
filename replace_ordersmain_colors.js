const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'Frontend', 'src', 'modules', 'Food', 'pages', 'restaurant', 'OrdersMain.jsx');

let content = fs.readFileSync(filePath, 'utf8');

// Replace hex colors
content = content.replace(/'#B80B3D'/g, "'#22C55E'");
content = content.replace(/"#B80B3D"/g, '"#22C55E"');
content = content.replace(/#FDF2F4/g, "#DCFCE7");
content = content.replace(/#FBCFE8/g, "#BBF7D0");

// Replace tailwind red/rose with green/emerald
content = content.replace(/border-rose-200/g, "border-emerald-200");
content = content.replace(/bg-rose-50/g, "bg-emerald-50");
content = content.replace(/text-rose-600/g, "text-emerald-600");
content = content.replace(/bg-rose-500/g, "bg-emerald-500");
content = content.replace(/text-rose-500/g, "text-emerald-500");
content = content.replace(/bg-red-100/g, "bg-emerald-100");
content = content.replace(/border-red-200/g, "border-emerald-200");
content = content.replace(/bg-red-50/g, "bg-emerald-50");
content = content.replace(/text-red-800/g, "text-emerald-800");
content = content.replace(/text-red-700/g, "text-emerald-700");
content = content.replace(/border-red-500/g, "border-emerald-500");
content = content.replace(/hover:bg-red-50/g, "hover:bg-emerald-50");
content = content.replace(/hover:bg-red-700/g, "hover:bg-emerald-700");
content = content.replace(/border-red-100/g, "border-emerald-100");
content = content.replace(/text-red-650/g, "text-emerald-600");
content = content.replace(/text-red-600/g, "text-emerald-600");
content = content.replace(/text-red-500/g, "text-emerald-500");

fs.writeFileSync(filePath, content, 'utf8');
console.log('OrdersMain.jsx updated');
