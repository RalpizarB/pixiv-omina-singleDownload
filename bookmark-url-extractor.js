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
 * Get cookies from Electron session
 */
async function getCookiesFromSession() {
  try {
    // Initialize Electron app
    await app.whenReady();
    
    // Try to get session from the 'main' partition (used by Pixiv Omina)
    const ses = session.fromPartition('persist:main');
    
    // Get cookies for pixiv.net
    const cookies = await ses.cookies.get({ domain: '.pixiv.net' });
    
    if (cookies.length === 0) {
      console.error('Warning: No Pixiv cookies found. Make sure you are logged in to Pixiv Omina.');
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
    console.error('Make sure Pixiv Omina is installed and you have logged in at least once.');
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
  console.error('Using cookies from your Pixiv Omina session...');
  
  try {
    // Get cookies from Electron session
    const cookieString = await getCookiesFromSession();
    
    if (!cookieString) {
      console.error('\nError: Could not retrieve session cookies.');
      console.error('Please make sure:');
      console.error('1. Pixiv Omina is installed');
      console.error('2. You have logged in to Pixiv at least once');
      console.error('3. Your session is still active');
      app.quit();
      process.exit(1);
    }
    
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
