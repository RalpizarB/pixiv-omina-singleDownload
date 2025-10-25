# Pixiv Bookmark URL Extractor

A command-line script that extracts all artwork URLs from a Pixiv user's bookmarks using your existing Pixiv Omina login session.

## Setup Instructions

### Step 1: Install Dependencies

First, make sure you're in the Pixiv Omina directory and have all dependencies installed:

```bash
cd /path/to/pixiv-omina-singleDownload
yarn install
```

Or if you prefer npm:

```bash
cd /path/to/pixiv-omina-singleDownload
npm install
```

### Step 2: Make Sure You're Logged In

1. Launch Pixiv Omina application
2. Log in to your Pixiv account if you haven't already
3. You can close the app after logging in - the cookies will be saved

### Step 3: Place the Script

The script `bookmark-url-extractor.js` should be in the root directory of the Pixiv Omina project (same directory as `package.json`).

## Usage

### Run with npx (Recommended)

From the Pixiv Omina project directory:

```bash
# Extract to console
npx electron bookmark-url-extractor.js "https://www.pixiv.net/en/users/12345/bookmarks/artworks"

# Save to file
npx electron bookmark-url-extractor.js "https://www.pixiv.net/en/users/12345/bookmarks/artworks" --output=file
```

### Run with yarn

If you have yarn installed:

```bash
# Extract to console
yarn electron bookmark-url-extractor.js "https://www.pixiv.net/en/users/12345/bookmarks/artworks"

# Save to file
yarn electron bookmark-url-extractor.js "https://www.pixiv.net/en/users/12345/bookmarks/artworks" --output=file
```

### Run with electron directly

If electron is installed globally or in node_modules:

```bash
./node_modules/.bin/electron bookmark-url-extractor.js "YOUR_BOOKMARK_URL"
```

### Get Help

```bash
npx electron bookmark-url-extractor.js --help
```

## How It Works

This script uses a two-tier approach to get your authentication cookies:

### Tier 1: Electron Session (Automatic)
- First tries to read authentication cookies from your Pixiv Omina application's Electron session storage
- Accesses Electron's `persist:main` partition (where Pixiv Omina stores session data)
- Retrieves cookies for `pixiv.net` domain
- No manual intervention needed if you're logged in to Pixiv Omina

### Tier 2: Cookie File (Manual Fallback)
- If Electron session cookies aren't found, falls back to reading from a `cookie` file
- You create this file manually with cookies from your browser
- Useful if:
  - Electron session is not accessible
  - You want to use different credentials
  - You're running on a system without Pixiv Omina installed

**No separate login required** in either case - it uses existing authentication!

## Output Formats

### Console Output (default)

Artwork URLs are printed to stdout (standard output), making it easy to pipe to other commands:

```bash
npx electron bookmark-url-extractor.js "YOUR_URL" > urls.txt
```

Progress messages are sent to stderr, so they won't interfere with the URL output.

### File Output

Using `--output=file` will create a timestamped file:

```bash
npx electron bookmark-url-extractor.js "YOUR_URL" --output=file
# Creates: pixiv-bookmarks-{userId}-{timestamp}.txt
```

## Example Output

```
Extracting bookmarks for user ID: 12345
Using cookies from your Pixiv Omina session...
Electron app initialized
User data path: /Users/username/Library/Application Support/pixiv-omina
Attempting to read cookies from persist:main partition...
Found 15 Pixiv cookies in session
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

## Cookie File (Manual Authentication)

If you can't use the Electron session (e.g., Pixiv Omina not installed, different credentials needed), you can provide cookies manually via a `cookie` file.

### Setup

1. **Create the cookie file:**
   ```bash
   touch cookie
   ```
   Or create an empty file named `cookie` in the project root.

2. **Get your Pixiv cookies:**
   - Log in to https://www.pixiv.net in your browser
   - Press F12 to open Developer Tools
   - Go to Application/Storage → Cookies → https://www.pixiv.net
   - Find the `PHPSESSID` cookie (this is the most important one)
   - Copy all cookies in this format: `name=value; name=value; ...`

3. **Add cookies to the file:**
   
   Open the `cookie` file and paste your cookies. Format examples:
   
   **Single line (recommended):**
   ```
   PHPSESSID=your_session_id_here; privacy_policy_agreement=1; other_cookie=value
   ```
   
   **Multi-line (also works):**
   ```
   PHPSESSID=your_session_id_here
   privacy_policy_agreement=1
   other_cookie=value
   ```

4. **Run the script:**
   The script will automatically detect and use the cookie file if Electron session cookies aren't available.

### Cookie File Format

See `cookie.example` for detailed format documentation. The script supports:
- Single line with semicolon-separated cookies
- Multi-line with one cookie per line
- Comments (lines starting with `#`)
- Blank lines (ignored)

### Security Notes

- The `cookie` file is automatically added to `.gitignore` to prevent accidental commits
- Keep this file secure - it contains your authentication data
- Cookies expire after some time - you may need to update them periodically
- Never share this file or commit it to version control

## Integration with pixivOpener.html

Perfect workflow for batch downloads:

1. Extract URLs using this script:
   ```bash
   npx electron bookmark-url-extractor.js "YOUR_BOOKMARK_URL" --output=file
   ```

2. Open `pixivOpener.html` in your browser

3. Copy the contents of the generated text file into the textarea

4. Click "Start Downloading" - the tool will add each artwork to Pixiv Omina with a 2-second delay

## Troubleshooting

### "No Pixiv cookies found" error

**Cause:** The script can't find your login session cookies.

**Solutions:**

**Option 1: Use Pixiv Omina session (Recommended)**
1. Make sure you've logged in to Pixiv Omina at least once
2. Launch Pixiv Omina and log in again
3. Check that you're running the script from the correct directory (should be in the same folder as `package.json`)
4. Try closing Pixiv Omina and running the script again

**Option 2: Use cookie file (Alternative)**
1. Create a file named `cookie` in the project root directory
2. Get your Pixiv cookies from your browser:
   - Log in to https://www.pixiv.net
   - Press F12 to open Developer Tools
   - Go to Application/Storage → Cookies → https://www.pixiv.net
   - Copy all cookies in format: `PHPSESSID=value; cookie2=value; cookie3=value`
3. Paste the cookies into the `cookie` file
4. Run the script again

See `cookie.example` for detailed format instructions.

### "Cannot find module 'electron'" error

**Cause:** Electron is not installed or you're not running the script correctly.

**Solutions:**
1. Run `yarn install` or `npm install` in the project directory
2. Use `npx electron` or `yarn electron` instead of `node`
3. Make sure you're in the project directory when running the command

### "Not logged in" error from Pixiv API

**Cause:** Your session cookies are expired or invalid.

**Solutions:**
1. Open Pixiv Omina
2. Log out and log back in to Pixiv
3. Try running the script again

### Script runs but outputs nothing

**Cause:** The user ID might be incorrect or the bookmarks might be private.

**Solutions:**
1. Verify the bookmark URL is correct
2. Make sure it's your own bookmark URL (public bookmarks of others might not be accessible)
3. Check that you have bookmarks in that collection

## Advanced Usage

### Pipe to file with console output

```bash
npx electron bookmark-url-extractor.js "YOUR_URL" > urls.txt 2> progress.log
```

This saves:
- URLs to `urls.txt`
- Progress messages to `progress.log`

### Process URLs with other commands

```bash
# Count bookmarks
npx electron bookmark-url-extractor.js "YOUR_URL" | wc -l

# Filter specific patterns
npx electron bookmark-url-extractor.js "YOUR_URL" | grep "123456"
```

## Technical Details

**Session Data Location:**
- Windows: `%APPDATA%\pixiv-omina\`
- macOS: `~/Library/Application Support/pixiv-omina/`
- Linux: `~/.config/pixiv-omina/`

**Partition:** The script reads from Electron's `persist:main` partition, which is where Pixiv Omina stores its session data.

**Authentication:** Uses the same cookie-based authentication as the main Pixiv Omina application - completely secure and no credentials are exposed.

## Requirements

- Node.js (v12 or higher)
- Electron (installed via yarn/npm)
- Pixiv Omina must be installed with at least one successful login

## Security Note

This script only reads cookies from your local Electron session storage. It:
- ✅ Does NOT store credentials anywhere
- ✅ Does NOT send data to third parties
- ✅ Does NOT modify your session or cookies
- ✅ Does NOT require you to enter your password

It simply reads the same cookies that Pixiv Omina uses and makes API requests on your behalf.

## License

Same as the main Pixiv Omina project (MPL-2.0)
