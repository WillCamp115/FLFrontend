#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('📦 Packaging FreedomLedger Frontend for Deployment...\n');

// Files and folders to EXCLUDE from the package
const excludePatterns = [
  // Build artifacts (will be rebuilt by hosting platform)
  '.next/',
  'node_modules/',
  'out/',
  
  // Development files
  '.git/',
  '.vscode/',
  '*.log',
  'npm-debug.log*',
  'yarn-debug.log*',
  'yarn-error.log*',
  
  // Environment files (add manually to hosting platform)
  '.env.local',
  '.env.development',
  '.env.production',
  '.env*.local',
  
  // OS generated files
  '.DS_Store',
  'Thumbs.db',
  
  // IDE files
  '*.swp',
  '*.swo',
  '*~',
  
  // Testing
  'coverage/',
  '.nyc_output/',
  
  // Misc
  '*.tsbuildinfo',
  '.eslintcache',
  
  // This packaging script itself
  'package-frontend.js',
  'frontend-deployment.zip'
];

// Essential files to INCLUDE
const includePatterns = [
  'src/',
  'public/',
  'package.json',
  'package-lock.json',
  'next.config.js',
  'tailwind.config.js',
  'postcss.config.js',
  'postcss.config.mjs',
  'jsconfig.json',
  'tsconfig.json',
  'eslint.config.mjs',
  'README.md'
];

const projectRoot = process.cwd();
const zipFileName = 'frontend-deployment.zip';
const zipPath = path.join(projectRoot, zipFileName);

// Remove existing zip if it exists
if (fs.existsSync(zipPath)) {
  fs.unlinkSync(zipPath);
  console.log('🗑️  Removed existing deployment zip');
}

try {
  const tempDir = path.join(projectRoot, 'temp-deployment');
  
  // Create temporary directory
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
  fs.mkdirSync(tempDir);
  
  console.log('📂 Copying essential files...');
  
  // Copy included files to temp directory
  const copyFile = (src, dest) => {
    const destDir = path.dirname(dest);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }
    if (fs.statSync(src).isDirectory()) {
      copyDirectory(src, dest);
    } else {
      fs.copyFileSync(src, dest);
    }
  };
  
  const copyDirectory = (src, dest) => {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    
    const items = fs.readdirSync(src);
    for (const item of items) {
      const srcPath = path.join(src, item);
      const destPath = path.join(dest, item);
      
      // Skip excluded patterns
      const shouldExclude = excludePatterns.some(pattern => {
        if (pattern.endsWith('/')) {
          return item === pattern.slice(0, -1) || srcPath.includes(pattern);
        }
        return item.includes(pattern.replace('*', ''));
      });
      
      if (shouldExclude) {
        continue;
      }
      
      if (fs.statSync(srcPath).isDirectory()) {
        copyDirectory(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  };
  
  // Copy each included pattern
  for (const pattern of includePatterns) {
    const fullPath = path.join(projectRoot, pattern);
    if (fs.existsSync(fullPath)) {
      const tempPath = path.join(tempDir, pattern);
      console.log(`  ✅ ${pattern}`);
      copyFile(fullPath, tempPath);
    } else {
      console.log(`  ⚠️  ${pattern} (not found, skipping)`);
    }
  }
  
  // Create zip using PowerShell
  const powershellCommand = `Compress-Archive -Path "${tempDir}\\*" -DestinationPath "${zipPath}" -Force`;
  execSync(powershellCommand, { shell: 'powershell.exe' });
  
  // Clean up temp directory
  fs.rmSync(tempDir, { recursive: true, force: true });
  
  console.log('\n✅ Frontend package created successfully!');
  
  // Get file size
  const stats = fs.statSync(zipPath);
  const fileSizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
  
  console.log(`\n📋 Package Summary:`);
  console.log(`   📁 File: ${zipFileName}`);
  console.log(`   📊 Size: ${fileSizeInMB} MB`);
  console.log(`   📍 Location: ${zipPath}`);
  
  console.log(`\n🚀 Deployment Instructions:`);
  console.log(`   1. Upload ${zipFileName} to your hosting platform`);
  console.log(`   2. Extract the files`);
  console.log(`   3. Set environment variables in hosting dashboard:`);
  console.log(`      - PLAID_CLIENT_ID`);
  console.log(`      - PLAID_SECRET`);
  console.log(`      - PLAID_ENV=sandbox`);
  console.log(`      - DATABASE_URL`);
  console.log(`   4. Deploy!`);
  
  console.log(`\n⚠️  Important Notes:`);
  console.log(`   • .env.local is excluded for security`);
  console.log(`   • node_modules will be installed by hosting platform`);
  console.log(`   • .next build folder will be generated during deployment`);
  
} catch (error) {
  console.error('\n❌ Error creating package:', error.message);
  process.exit(1);
}