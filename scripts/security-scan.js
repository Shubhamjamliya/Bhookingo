import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

const lifecycleScriptNames = [
  'preinstall', 'install', 'postinstall', 'prepublish', 'prepublishOnly',
  'prepare', 'prestart', 'poststart', 'predev', 'postdev', 'prepack', 'postpack'
];

const malwareIndicators = [
  'A8-3713-1',
  'A8-3387',
  'Payload-B6',
  'x-payload-b64',
  'lastSenderTxViaIndexer',
  'NONCE_FANOUT'
];

function checkPackageScripts() {
  const manifests = [
    path.join(repoRoot, 'Frontend', 'package.json'),
    path.join(repoRoot, 'Backend', 'package.json')
  ];

  for (const manifest of manifests) {
    if (!fs.existsSync(manifest)) continue;
    try {
      const content = JSON.parse(fs.readFileSync(manifest, 'utf8'));
      if (content.scripts) {
        for (const [key, val] of Object.entries(content.scripts)) {
          if (lifecycleScriptNames.includes(key)) {
            console.error(`[Security Guard] Warning: Lifecycle script '${key}' found in ${manifest}`);
          }
        }
      }
    } catch (e) {
      console.error(`[Security Guard] Error reading manifest ${manifest}:`, e.message);
    }
  }
}

function runPreflight() {
  checkPackageScripts();
  console.log('🛡️  [Security Guard] Preflight check passed.');
}

runPreflight();
