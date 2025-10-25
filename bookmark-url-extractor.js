#!/usr/bin/env node

/**
 * Pixiv Bookmark URL Extractor
 * 
 * This script extracts all artwork URLs from a Pixiv bookmark page.
 * 
 * Usage:
 *   node bookmark-url-extractor.js <bookmark_url> [--output=console|file]
 * 
 * Examples:
 *   node bookmark-url-extractor.js "https://www.pixiv.net/en/users/12345/bookmarks/artworks"
 *   node bookmark-url-extractor.js "https://www.pixiv.net/en/users/12345/bookmarks/artworks" --output=file
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Parse command line arguments
const args = process.argv.slice(2);

if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
  console.log(`
Pixiv Bookmark URL Extractor

Usage:
  node bookmark-url-extractor.js <bookmark_url> [--output=console|file]

Arguments:
  bookmark_url    The Pixiv bookmark URL to extract artworks from
  --output        Output destination: 'console' (default) or 'file'

Examples:
  node bookmark-url-extractor.js "https://www.pixiv.net/en/users/12345/bookmarks/artworks"
  node bookmark-url-extractor.js "https://www.pixiv.net/en/users/12345/bookmarks/artworks" --output=file
  `);
  process.exit(0);
}

const bookmarkUrl = args[0];
const outputArg = args.find(arg => arg.startsWith('--output='));
const outputMode = outputArg ? outputArg.split('=')[1] : 'console';

if (!bookmarkUrl || !bookmarkUrl.includes('pixiv.net')) {
  console.error('Error: Please provide a valid Pixiv bookmark URL');
  process.exit(1);
}

if (outputMode !== 'console' && outputMode !== 'file') {
  console.error('Error: --output must be either "console" or "file"');
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
 * Fetch bookmark data from Pixiv API
 */
function fetchBookmarks(userId, offset = 0, limit = 48, rest = 'show') {
  return new Promise((resolve, reject) => {
    const apiUrl = `https://www.pixiv.net/ajax/user/${userId}/illusts/bookmarks?tag=&offset=${offset}&limit=${limit}&rest=${rest}&lang=en`;
    
    https.get(apiUrl, (res) => {
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
 * Extract all artwork URLs from bookmarks
 */
async function extractArtworkUrls(userId) {
  const artworkUrls = [];
  let offset = 0;
  const limit = 48;
  let hasMore = true;
  
  console.error('Fetching bookmarks...');
  
  while (hasMore) {
    try {
      const response = await fetchBookmarks(userId, offset, limit);
      
      if (response.error || !response.body || !response.body.works) {
        console.error('Error: Failed to fetch bookmarks or invalid response');
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
    process.exit(1);
  }
  
  console.error(`Extracting bookmarks for user ID: ${userId}`);
  
  try {
    const artworkUrls = await extractArtworkUrls(userId);
    
    if (artworkUrls.length === 0) {
      console.error('No artworks found');
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
    
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

// Run the main function
main();
