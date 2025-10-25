#!/usr/bin/env node

/**
 * Pixiv Bookmark URL Extractor
 * 
 * This script extracts all artwork URLs from a Pixiv bookmark page using the
 * cookies from your Pixiv Omina session (where you're already logged in).
 * 
 * Usage:
 *   electron bookmark-url-extractor.js <bookmark_url> [--output=console|file]
 * 
 * Examples:
 *   electron bookmark-url-extractor.js "https://www.pixiv.net/en/users/12345/bookmarks/artworks"
 *   electron bookmark-url-extractor.js "https://www.pixiv.net/en/users/12345/bookmarks/artworks" --output=file
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Check if running in Electron context
let app, session;
try {
  const electron = require('electron');
  app = electron.app;
  session = electron.session;
} catch (e) {
  console.error('Error: This script must be run with Electron to access session cookies.');
  console.error('');
  console.error('Usage:');
  console.error('  npx electron bookmark-url-extractor.js <bookmark_url> [--output=console|file]');
  console.error('');
  console.error('Or from within the Pixiv Omina application directory:');
  console.error('  yarn electron bookmark-url-extractor.js <bookmark_url>');
  process.exit(1);
}

// Parse command line arguments
const args = process.argv.slice(2);

if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
  console.log(`
Pixiv Bookmark URL Extractor

This script uses your existing Pixiv Omina login session to extract bookmark URLs.

Usage:
  npx electron bookmark-url-extractor.js <bookmark_url> [--output=console|file]
  
Or:
  yarn electron bookmark-url-extractor.js <bookmark_url> [--output=console|file]

Arguments:
  bookmark_url    The Pixiv bookmark URL to extract artworks from
  --output        Output destination: 'console' (default) or 'file'

Examples:
  npx electron bookmark-url-extractor.js "https://www.pixiv.net/en/users/12345/bookmarks/artworks"
  npx electron bookmark-url-extractor.js "https://www.pixiv.net/en/users/12345/bookmarks/artworks" --output=file

Note: Make sure Pixiv Omina is running or was recently run with an active login session.
  `);
  app.quit();
  process.exit(0);
}

const bookmarkUrl = args[0];
const outputArg = args.find(arg => arg.startsWith('--output='));
const outputMode = outputArg ? outputArg.split('=')[1] : 'console';

if (!bookmarkUrl || !bookmarkUrl.includes('pixiv.net')) {
  console.error('Error: Please provide a valid Pixiv bookmark URL');
  app.quit();
  process.exit(1);
}

if (outputMode !== 'console' && outputMode !== 'file') {
  console.error('Error: --output must be either "console" or "file"');
  app.quit();
  process.exit(1);
}

/**
 * Extract user ID from bookmark URL
 */
function extractUserId(url) {
  const match = url.match(/users\/(\d+)/);
  return match ? match[1] : null;
}

/**
 * Read cookies from cookie file
 */
function readCookieFile() {
  const cookieFilePath = path.join(__dirname, 'cookie');
  
  try {
    if (!fs.existsSync(cookieFilePath)) {
      return null;
    }
    
    const content = fs.readFileSync(cookieFilePath, 'utf8').trim();
    
    if (!content) {
      return null;
    }
    
    // Parse cookie file - supports both single line and multi-line formats
    let cookieString = '';
    const lines = content.split('\n');
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        // If line contains '=', it's a cookie
        if (trimmedLine.includes('=')) {
          cookieString += trimmedLine;
          // Add semicolon if not already there
          if (!trimmedLine.endsWith(';')) {
            cookieString += '; ';
          }
        }
      }
    }
    
    return cookieString.trim() || null;
  } catch (error) {
    console.error('Error reading cookie file:', error.message);
    return null;
  }
}

/**
 * Prompt user to create cookie file
 */
async function promptForCookieFile() {
  const cookieFilePath = path.join(__dirname, 'cookie');
  const exampleFilePath = path.join(__dirname, 'cookie.example');
  
  console.error('\n' + '='.repeat(70));
  console.error('NO COOKIES FOUND - Manual Cookie Setup Required');
  console.error('='.repeat(70));
  console.error('\nCould not find cookies in Electron session or cookie file.');
  console.error('\nTo continue, please provide your Pixiv cookies manually:');
  console.error('\n1. Create a file named "cookie" in this directory:');
  console.error(`   ${path.dirname(cookieFilePath)}`);
  console.error('\n2. Add your Pixiv cookies in this format:');
  console.error('   PHPSESSID=your_session_id; cookie2=value2; cookie3=value3');
  console.error('\n3. See cookie.example for detailed format instructions');
  console.error('\nHow to get your cookies:');
  console.error('   a) Log in to https://www.pixiv.net in your browser');
  console.error('   b) Press F12 to open Developer Tools');
  console.error('   c) Go to Application/Storage → Cookies → https://www.pixiv.net');
  console.error('   d) Copy all cookies in format: name=value; name=value; ...');
  console.error('\nPress Enter after creating the cookie file to try again, or Ctrl+C to exit...');
  
  // Create example file if it doesn't exist
  if (!fs.existsSync(exampleFilePath)) {
    try {
      const exampleContent = `# Pixiv Cookie File Example
# 
# Format: cookie_name=cookie_value; another_cookie=another_value
#
# You can use single line:
# PHPSESSID=12345_abcdef; privacy_policy_agreement=1
#
# Or multiple lines (one cookie per line):
# PHPSESSID=12345_abcdef
# privacy_policy_agreement=1
#
# Required: At minimum, you need the PHPSESSID cookie
#
# Add your cookies below (remove these comment lines):

`;
      fs.writeFileSync(exampleFilePath, exampleContent);
    } catch (e) {
      // Ignore if we can't create example file
    }
  }
  
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stderr
    });
    
    rl.question('', () => {
      rl.close();
      resolve();
    });
  });
}

/**
 * Get cookies from Electron session
 */
async function getCookiesFromSession() {
  try {
    // Initialize Electron app
    await app.whenReady();
    
    console.error('Electron app initialized');
    console.error(`User data path: ${app.getPath('userData')}`);
    
    // Try to get session from the 'main' partition (used by Pixiv Omina)
    const ses = session.fromPartition('persist:main');
    
    console.error('Attempting to read cookies from persist:main partition...');
    
    // Get cookies for pixiv.net
    const cookies = await ses.cookies.get({ domain: '.pixiv.net' });
    
    if (cookies.length === 0) {
      console.error('\nWarning: No Pixiv cookies found.');
      console.error('Trying alternative cookie domain...');
      
      // Try without the leading dot
      const cookies2 = await ses.cookies.get({ domain: 'pixiv.net' });
      if (cookies2.length > 0) {
        cookies.push(...cookies2);
      }
    }
    
    if (cookies.length === 0) {
      console.error('\nError: No Pixiv cookies found in any location.');
      console.error('Make sure:');
      console.error('1. You have logged in to Pixiv Omina');
      console.error('2. Pixiv Omina is using the default user data directory');
      console.error('3. You are running this script with the correct Electron version');
      return '';
    }
    
    console.error(`Found ${cookies.length} Pixiv cookies in session`);
    
    // Build cookie string
    let cookieString = '';
    cookies.forEach(cookie => {
      cookieString += `${cookie.name}=${cookie.value}; `;
    });
    
    return cookieString.trim();
  } catch (error) {
    console.error('Error getting cookies from session:', error.message);
    console.error('\nDebug info:');
    console.error('- Error details:', error);
    console.error('- Make sure Pixiv Omina is installed and you have logged in at least once.');
    return '';
  }
}

/**
 * Fetch bookmark data from Pixiv API using session cookies
 */
function fetchBookmarks(userId, cookieString, offset = 0, limit = 48, rest = 'show') {
  return new Promise((resolve, reject) => {
    const apiUrl = `/ajax/user/${userId}/illusts/bookmarks?tag=&offset=${offset}&limit=${limit}&rest=${rest}&lang=en`;
    
    const options = {
      hostname: 'www.pixiv.net',
      port: 443,
      path: apiUrl,
      method: 'GET',
      headers: {
        'Cookie': cookieString,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Referer': 'https://www.pixiv.net/',
        'Accept': 'application/json'
      }
    };
    
    https.get(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json);
        } catch (error) {
          reject(new Error(`Failed to parse JSON: ${error.message}`));
        }
      });
    }).on('error', (error) => {
      reject(error);
    });
  });
}

/**
 * Extract all artwork URLs from bookmarks using session cookies
 */
async function extractArtworkUrls(userId, cookieString) {
  const artworkUrls = [];
  let offset = 0;
  const limit = 48;
  let hasMore = true;
  
  console.error('Fetching bookmarks using your Pixiv Omina session...');
  
  while (hasMore) {
    try {
      const response = await fetchBookmarks(userId, cookieString, offset, limit);
      
      if (response.error) {
        if (response.message && response.message.includes('not logged in')) {
          console.error('Error: Not logged in. Please log in to Pixiv Omina first.');
        } else {
          console.error('Error:', response.message || 'Failed to fetch bookmarks');
        }
        break;
      }
      
      if (!response.body || !response.body.works) {
        console.error('Error: Invalid response from Pixiv API');
        break;
      }
      
      const works = response.body.works;
      
      if (works.length === 0) {
        hasMore = false;
        break;
      }
      
      works.forEach(work => {
        if (work && work.id) {
          artworkUrls.push(`https://www.pixiv.net/artworks/${work.id}`);
        }
      });
      
      console.error(`Fetched ${works.length} artworks (total: ${artworkUrls.length})`);
      
      offset += limit;
      
      // Check if there are more pages
      if (works.length < limit) {
        hasMore = false;
      }
      
      // Add a small delay to avoid rate limiting
      if (hasMore) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error(`Error fetching bookmarks: ${error.message}`);
      break;
    }
  }
  
  return artworkUrls;
}

/**
 * Main function
 */
async function main() {
  const userId = extractUserId(bookmarkUrl);
  
  if (!userId) {
    console.error('Error: Could not extract user ID from URL');
    app.quit();
    process.exit(1);
  }
  
  console.error(`Extracting bookmarks for user ID: ${userId}`);
  
  let cookieString = '';
  let retryCount = 0;
  const maxRetries = 2;
  
  while (!cookieString && retryCount < maxRetries) {
    if (retryCount === 0) {
      // First attempt: Try Electron session
      console.error('Attempting to use cookies from your Pixiv Omina session...');
      cookieString = await getCookiesFromSession();
    }
    
    if (!cookieString) {
      // Second attempt: Try cookie file
      console.error('\nAttempting to read cookies from cookie file...');
      cookieString = readCookieFile();
      
      if (cookieString) {
        console.error('✓ Successfully loaded cookies from cookie file');
      }
    }
    
    if (!cookieString) {
      // If still no cookies, prompt user to create cookie file
      await promptForCookieFile();
      
      // Try reading cookie file again after user creates it
      cookieString = readCookieFile();
      
      if (cookieString) {
        console.error('✓ Successfully loaded cookies from cookie file');
      } else {
        retryCount++;
        if (retryCount < maxRetries) {
          console.error('\nCookie file still not found or empty. Please try again.');
        }
      }
    } else {
      // Got cookies, break out of loop
      break;
    }
  }
  
  if (!cookieString) {
    console.error('\n' + '='.repeat(70));
    console.error('ERROR: Could not retrieve cookies after multiple attempts');
    console.error('='.repeat(70));
    console.error('\nPlease either:');
    console.error('1. Log in to Pixiv Omina and try again, OR');
    console.error('2. Create a "cookie" file with your Pixiv cookies (see cookie.example)');
    app.quit();
    process.exit(1);
  }
  
  try {
    const artworkUrls = await extractArtworkUrls(userId, cookieString);
    
    if (artworkUrls.length === 0) {
      console.error('No artworks found');
      app.quit();
      process.exit(0);
    }
    
    console.error(`\nFound ${artworkUrls.length} artworks`);
    
    if (outputMode === 'file') {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `pixiv-bookmarks-${userId}-${timestamp}.txt`;
      
      fs.writeFileSync(filename, artworkUrls.join('\n'));
      console.error(`\nURLs saved to: ${filename}`);
    } else {
      // Output to console (stdout)
      console.log('\n--- Artwork URLs ---');
      artworkUrls.forEach(url => console.log(url));
    }
    
    // Quit the app
    app.quit();
    
  } catch (error) {
    console.error(`Error: ${error.message}`);
    app.quit();
    process.exit(1);
  }
}

// Run the main function
main();
