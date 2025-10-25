# Pixiv Bookmark URL Extractor

A command-line script that extracts all artwork URLs from a Pixiv user's bookmarks using your existing Pixiv Omina login session.

## Key Features

- ✅ **Uses your existing Pixiv Omina session** - No need to log in separately
- ✅ **Leverages stored cookies** - Reads from Electron's session storage
- ✅ **Extracts all bookmarked artwork URLs** - Automatically handles pagination
- ✅ **Output to console or file** - Flexible output options
- ✅ **Simple command-line interface** - Easy to use

## How It Works

This script reads the authentication cookies from your Pixiv Omina application (where you're already logged in) and uses them to fetch your bookmarks from Pixiv. This means:

1. You don't need to provide credentials or log in again
2. It respects your existing session and authentication
3. It can access private bookmarks just like the main application

## Requirements

- Node.js (v12 or higher)
- Pixiv Omina must be installed and you must have logged in at least once
- Your Pixiv Omina session must be active (either the app is running or was recently used)

## Installation

The script uses Electron's built-in modules to access session data. Since Pixiv Omina is already an Electron app, you can run this script from within the application directory:

```bash
# Navigate to the Pixiv Omina directory
cd /path/to/pixiv-omina

# Run the extractor
node bookmark-url-extractor.js "YOUR_BOOKMARK_URL"
```

## Usage

### Basic Usage (Output to Console)

```bash
npx electron bookmark-url-extractor.js "https://www.pixiv.net/en/users/12345/bookmarks/artworks"
```

Or if you're in the Pixiv Omina directory with yarn installed:

```bash
yarn electron bookmark-url-extractor.js "https://www.pixiv.net/en/users/12345/bookmarks/artworks"
```

### Save to File

```bash
npx electron bookmark-url-extractor.js "https://www.pixiv.net/en/users/12345/bookmarks/artworks" --output=file
```

The file will be saved as `pixiv-bookmarks-{userId}-{timestamp}.txt` in the current directory.

### Get Help

```bash
npx electron bookmark-url-extractor.js --help
```

## Example Output

```
Extracting bookmarks for user ID: 12345
Using cookies from your Pixiv Omina session...
Fetching bookmarks using your Pixiv Omina session...
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

Perfect workflow for batch downloads:

1. Extract URLs using this script with your existing session:
   ```bash
   npx electron bookmark-url-extractor.js "YOUR_BOOKMARK_URL" --output=file
   ```

2. Open `pixivOpener.html` in your browser

3. Copy the contents of the generated text file into the textarea

4. Click "Start Downloading" - the tool will add each artwork to Pixiv Omina with a 2-second delay

## Troubleshooting

### "No Pixiv cookies found" error

This means the script couldn't find your login session. Try:

1. Make sure you've logged in to Pixiv Omina at least once
2. Try logging out and back in to refresh your session
3. Make sure Pixiv Omina is running or was recently used

### "Not logged in" error

Your session may have expired. Solution:

1. Open Pixiv Omina
2. Log in to Pixiv
3. Try running the script again

### Permission errors

The script needs to read Electron's session data. Make sure:

1. You're running the script from the Pixiv Omina directory
2. You have read permissions for the application data directory

## Technical Details

The script uses:

- **Electron's session API** to read cookies from the 'persist:main' partition
- **Pixiv's public API** to fetch bookmark data
- **Your existing authentication** via stored cookies

This approach is more reliable than creating a separate authentication system because it leverages the authentication that's already working in your Pixiv Omina application.

## Security Note

This script only reads cookies from your local Electron session storage. It doesn't:
- Store your credentials anywhere
- Send data to any third parties
- Modify your session or cookies
- Require you to enter your password

## License

Same as the main Pixiv Omina project (MPL-2.0)
