# Pixiv Bookmark URL Extractor

A simple Node.js script to extract all artwork URLs from a Pixiv user's bookmarks.

## Features

- ✅ Extracts all bookmarked artwork URLs from a Pixiv user
- ✅ Fetches multiple pages automatically
- ✅ Output to console or file
- ✅ Simple command-line interface
- ✅ No external dependencies (uses built-in Node.js modules)

## Requirements

- Node.js (v12 or higher)

## Usage

### Basic Usage (Output to Console)

```bash
node bookmark-url-extractor.js "https://www.pixiv.net/en/users/12345/bookmarks/artworks"
```

### Save to File

```bash
node bookmark-url-extractor.js "https://www.pixiv.net/en/users/12345/bookmarks/artworks" --output=file
```

The file will be saved as `pixiv-bookmarks-{userId}-{timestamp}.txt` in the current directory.

### Help

```bash
node bookmark-url-extractor.js --help
```

## How It Works

1. The script extracts the user ID from the provided bookmark URL
2. It uses Pixiv's public API to fetch bookmark data
3. It automatically handles pagination to get all bookmarked artworks
4. URLs are extracted and output to console or saved to a file

## Example Output

```
Extracting bookmarks for user ID: 12345
Fetching bookmarks...
Fetched 48 artworks (total: 48)
Fetched 48 artworks (total: 96)
Fetched 24 artworks (total: 120)

Found 120 artworks

--- Artwork URLs ---
https://www.pixiv.net/artworks/123456
https://www.pixiv.net/artworks/789012
https://www.pixiv.net/artworks/345678
...
```

## Integration with pixivOpener.html

You can use this script in combination with the `pixivOpener.html` tool:

1. Extract URLs using the script:
   ```bash
   node bookmark-url-extractor.js "YOUR_BOOKMARK_URL" --output=file
   ```

2. Open `pixivOpener.html` in your browser

3. Copy the contents of the generated text file into the textarea

4. Click "Start Downloading" - the tool will add each artwork to Pixiv Omina with a 2-second delay between each

## Notes

- The script adds a 1-second delay between API requests to avoid rate limiting
- Progress information is output to stderr, so you can redirect stdout to a file:
  ```bash
  node bookmark-url-extractor.js "YOUR_URL" > urls.txt
  ```
- Make sure you have permission to access the bookmarks (public bookmarks work without authentication)

## License

Same as the main Pixiv Omina project (MPL-2.0)
