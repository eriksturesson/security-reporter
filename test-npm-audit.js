// test-npm-audit-v2.js
// Förbättrad version med direkt output

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('=== NPM AUDIT DEBUG TEST ===\n');
console.log('Current directory:', process.cwd());
console.log('Node version:', process.version);
console.log('Platform:', process.platform);

// Check package-lock.json
const lockfilePath = path.join(process.cwd(), 'package-lock.json');
console.log('\n--- Lockfile Check ---');
console.log('Looking for:', lockfilePath);
console.log('Exists:', fs.existsSync(lockfilePath));
if (fs.existsSync(lockfilePath)) {
  const stats = fs.statSync(lockfilePath);
  console.log('Size:', stats.size, 'bytes');
}

// Check npm
console.log('\n--- NPM Check ---');
const npmVersion = spawnSync('npm', ['--version'], { encoding: 'utf8' });
if (npmVersion.error) {
  console.log('❌ npm not found:', npmVersion.error.message);
  console.log('Error object:', npmVersion.error);
} else {
  const verOut = (npmVersion.stdout || '').trim();
  const verErr = (npmVersion.stderr || '').trim();
  console.log('npm version:', verOut || 'unknown');
  console.log('npm stderr:', verErr || 'none');
}

// Run npm audit
console.log('\n--- Running npm audit --json ---');
console.log('Command: npm audit --json');
console.log('CWD:', process.cwd());

let result;
if (npmVersion && npmVersion.error) {
  console.log('Skipping `npm audit` because `npm` was not found.');
  result = { status: null, signal: null, error: npmVersion.error, stdout: '', stderr: '' };
} else {
  result = spawnSync('npm', ['audit', '--json'], {
    cwd: process.cwd(),
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024,
    timeout: 30000,
  });
}

console.log('\n--- Results ---');
console.log('Exit code:', result.status);
console.log('Signal:', result.signal || 'none');
console.log('Error:', result.error || 'none');

console.log('\n--- STDOUT ---');
console.log('Length:', result.stdout ? result.stdout.length : 0);
if (result.stdout) {
  console.log('Content preview (first 1000 chars):');
  console.log(result.stdout.substring(0, 1000));
  console.log('...');
  console.log('\nLast 500 chars:');
  console.log(result.stdout.substring(Math.max(0, result.stdout.length - 500)));
}

console.log('\n--- STDERR ---');
console.log('Length:', result.stderr ? result.stderr.length : 0);
if (result.stderr) {
  console.log('Content:');
  console.log(result.stderr);
}

// Try parsing
console.log('\n--- JSON Parsing Attempt ---');
if (result.stdout) {
  // Try direct parse
  try {
    const parsed = JSON.parse(result.stdout);
    console.log('✅ Direct parse SUCCESS');
    console.log('Type:', typeof parsed);
    console.log('Keys:', Object.keys(parsed).join(', '));
    
    if (parsed.error) {
      console.log('\n⚠️  Has error field:');
      console.log('  Code:', parsed.error.code);
      console.log('  Summary:', parsed.error.summary);
    }
    
    if (parsed.metadata) {
      console.log('\n✅ Has metadata:');
      console.log('  Vulnerabilities:', JSON.stringify(parsed.metadata.vulnerabilities));
    }
  } catch (err) {
    console.log('❌ Direct parse FAILED:', err.message);
    
    // Try finding JSON
    console.log('\nTrying to find JSON in output...');
    const lines = result.stdout.split(/\r?\n/);
    let jsonStart = -1;
    let jsonEnd = -1;
    
    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim();
      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        jsonStart = i;
        console.log('  Found JSON start at line', i);
        break;
      }
    }
    
    for (let i = lines.length - 1; i >= 0; i--) {
      const trimmed = lines[i].trim();
      if (trimmed.endsWith('}') || trimmed.endsWith(']')) {
        jsonEnd = i;
        console.log('  Found JSON end at line', i);
        break;
      }
    }
    
    if (jsonStart !== -1 && jsonEnd !== -1) {
      const jsonPart = lines.slice(jsonStart, jsonEnd + 1).join('\n');
      console.log('\nExtracted JSON (first 500 chars):');
      console.log(jsonPart.substring(0, 500));
      
      try {
        const parsed = JSON.parse(jsonPart);
        console.log('\n✅ Extracted JSON parse SUCCESS');
        console.log('Keys:', Object.keys(parsed).join(', '));
      } catch (err2) {
        console.log('\n❌ Extracted JSON parse FAILED:', err2.message);
      }
    } else {
      console.log('❌ Could not find JSON boundaries');
    }
  }
} else {
  console.log('❌ No stdout to parse');
}

console.log('\n=== TEST COMPLETE ===');