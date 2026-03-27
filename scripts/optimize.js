// Full cache wipe — use only when fixing corrupt .next / webpack cache (e.g. Windows ENOENT).
// For day-to-day work use `npm run dev`; `dev:fresh` runs this then starts the dev server.
const fs = require('fs');
const path = require('path');

console.log('🧹 Clearing Next.js cache...');

// Remove .next directory
const nextDir = path.join(process.cwd(), '.next');
if (fs.existsSync(nextDir)) {
  fs.rmSync(nextDir, {
    recursive: true,
    force: true,
    maxRetries: 10,
    retryDelay: 100,
  });
  console.log('✅ Cleared .next directory');
} else {
  console.log('ℹ️  .next directory not found');
}

// Remove node_modules/.cache if exists
const cacheDir = path.join(process.cwd(), 'node_modules', '.cache');
if (fs.existsSync(cacheDir)) {
  fs.rmSync(cacheDir, {
    recursive: true,
    force: true,
    maxRetries: 10,
    retryDelay: 100,
  });
  console.log('✅ Cleared node_modules/.cache');
}

console.log('✨ Cache cleared! Run "npm run dev" to restart.');







