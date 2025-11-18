#!/usr/bin/env node

/**
 * Script to check OAuth configuration and display the expected redirect URI
 * Run with: node scripts/check-oauth-config.js
 * 
 * Note: This script reads .env.local manually. Make sure you have a .env.local file.
 */

const fs = require('fs');
const path = require('path');

// Simple .env parser
function parseEnvFile(filePath) {
  const env = {};
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    content.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key) {
          env[key.trim()] = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
        }
      }
    });
  }
  return env;
}

const envPath = path.join(process.cwd(), '.env.local');
const env = parseEnvFile(envPath);

const nextAuthUrl = env.NEXTAUTH_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000';
const googleClientId = env.GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = env.GOOGLE_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET;
const nextAuthSecret = env.NEXTAUTH_SECRET || process.env.NEXTAUTH_SECRET;

console.log('\n🔍 OAuth Configuration Check\n');
console.log('='.repeat(50));

if (!fs.existsSync(envPath)) {
  console.log('\n⚠️  Warning: .env.local file not found!');
  console.log('   Create a .env.local file in the root directory with:');
  console.log('   NEXTAUTH_URL=http://localhost:3000');
  console.log('   GOOGLE_CLIENT_ID=your_client_id');
  console.log('   GOOGLE_CLIENT_SECRET=your_client_secret');
  console.log('   NEXTAUTH_SECRET=your_secret\n');
}

// Check NEXTAUTH_URL
console.log('\n✅ NEXTAUTH_URL:', nextAuthUrl || '❌ NOT SET');

// Construct expected redirect URI
const redirectUri = `${nextAuthUrl}/api/auth/callback/google`;
console.log('\n📍 Expected Redirect URI:');
console.log('   ', redirectUri);
console.log('\n   ⚠️  Make sure this EXACT URI is in Google Cloud Console!');

// Check environment variables
console.log('\n📋 Environment Variables:');
console.log('   GOOGLE_CLIENT_ID:', googleClientId ? '✅ Set' : '❌ NOT SET');
console.log('   GOOGLE_CLIENT_SECRET:', googleClientSecret ? '✅ Set' : '❌ NOT SET');
console.log('   NEXTAUTH_SECRET:', nextAuthSecret ? '✅ Set' : '❌ NOT SET');

// Instructions
console.log('\n📝 Next Steps:');
console.log('   1. Go to Google Cloud Console → APIs & Services → Credentials');
console.log('   2. Click on your OAuth 2.0 Client ID');
console.log('   3. Add this redirect URI to "Authorized redirect URIs":');
console.log(`      ${redirectUri}`);
console.log('   4. Click Save');
console.log('   5. Restart your dev server and try again\n');

