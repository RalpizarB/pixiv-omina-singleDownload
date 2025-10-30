# Complete Workflow Guide

This guide demonstrates the complete workflow from extracting bookmark URLs to downloading artworks using both the Node.js bookmark extractor and the C++ downloader.

## Prerequisites

1. **For bookmark extraction:**
   - Node.js installed
   - Electron installed (via `yarn install` or `npm install`)
   - Logged into Pixiv Omina OR have a `cookie` file with Pixiv cookies

2. **For artwork downloading:**
   - Windows 10 or later
   - `pixiv_downloader.exe` (download from GitHub Actions or build from source)
   - `cookie` file with valid Pixiv cookies

## Step-by-Step Guide

### Step 1: Install Dependencies (First Time Only)

```bash
# In the main Pixiv Omina directory
cd /path/to/pixiv-omina-singleDownload
yarn install
```

### Step 2: Extract Bookmark URLs

Extract all artwork URLs from your bookmarks:

```bash
# Extract your own bookmarks
npx electron bookmark-url-extractor.js "https://www.pixiv.net/en/users/YOUR_USER_ID/bookmarks/artworks" --output=file

# Extract someone else's public bookmarks
npx electron bookmark-url-extractor.js "https://www.pixiv.net/en/users/123456/bookmarks/artworks" --output=file
```

This creates a file like `pixiv-bookmarks-123456-2025-10-30T07-17-37-943Z.txt` containing all artwork URLs.

### Step 3: Download Artworks

Use the C++ downloader to download all artworks:

```bash
# Basic usage
pixiv_downloader.exe pixiv-bookmarks-123456-*.txt

# With custom download directory
pixiv_downloader.exe -d "C:\My Pixiv Downloads" pixiv-bookmarks-123456-*.txt

# With custom cookie file location
pixiv_downloader.exe -c "C:\cookies\pixiv-cookie.txt" -d "C:\Downloads" pixiv-bookmarks-123456-*.txt
```

### Step 4: Incremental Updates

Later, when you add new bookmarks:

```bash
# Extract bookmarks again (will get all bookmarks including new ones)
npx electron bookmark-url-extractor.js "YOUR_BOOKMARK_URL" --output=file

# Download - it will automatically skip already downloaded artworks
pixiv_downloader.exe -d "C:\My Pixiv Downloads" pixiv-bookmarks-123456-*.txt
```

The downloader maintains a database of downloaded artworks, so it won't re-download existing ones!

## Advanced Workflows

### Workflow 1: Multiple Users

Download bookmarks from multiple users:

```bash
# Extract from user 1
npx electron bookmark-url-extractor.js "https://www.pixiv.net/en/users/11111/bookmarks/artworks" > user1.txt

# Extract from user 2
npx electron bookmark-url-extractor.js "https://www.pixiv.net/en/users/22222/bookmarks/artworks" > user2.txt

# Extract from user 3
npx electron bookmark-url-extractor.js "https://www.pixiv.net/en/users/33333/bookmarks/artworks" > user3.txt

# Download all (they go to the same directory and share the same database)
pixiv_downloader.exe -d "C:\All Bookmarks" user1.txt
pixiv_downloader.exe -d "C:\All Bookmarks" user2.txt
pixiv_downloader.exe -d "C:\All Bookmarks" user3.txt
```

### Workflow 2: Separate Collections

Organize downloads into separate directories:

```bash
# Extract
npx electron bookmark-url-extractor.js "YOUR_URL" --output=file

# Download to different directories by category
pixiv_downloader.exe -d "C:\Pixiv\Illustrations" bookmarks.txt
# or
pixiv_downloader.exe -d "C:\Pixiv\Comics" bookmarks.txt
```

### Workflow 3: Force Re-download

Re-download artworks (e.g., to get higher quality versions):

```bash
pixiv_downloader.exe -forceRepeated -d "C:\My Pixiv Downloads" urls.txt
```

### Workflow 4: Custom URL Lists

Create your own URL list manually:

```txt
# my-favorites.txt
https://www.pixiv.net/artworks/123456
https://www.pixiv.net/artworks/789012
https://www.pixiv.net/artworks/345678
```

Then download:
```bash
pixiv_downloader.exe my-favorites.txt
```

## Cookie File Setup

### Method 1: Use Pixiv Omina Session (Automatic)

If you're logged into Pixiv Omina, the bookmark extractor will automatically use those cookies. Just create a `cookie` file with those cookies once:

1. Run bookmark extractor (it will prompt you)
2. Follow the instructions to create the cookie file
3. The C++ downloader will use the same file

### Method 2: Export from Browser (Manual)

1. Log in to https://www.pixiv.net in your browser
2. Open Developer Tools (F12)
3. Go to Application/Storage → Cookies → https://www.pixiv.net
4. Copy all cookies to a text file named `cookie`:

```
PHPSESSID=your_session_id; privacy_policy_agreement=1; other_cookie=value
```

5. Place the file in the project root directory (or use `-c` to specify location)

## Troubleshooting

### "Cannot open cookie file"

**Solution:** Create a `cookie` file with your Pixiv cookies. See `cookie.example` for format.

### "HTTP 403 Forbidden"

**Solution:** Your cookies have expired. Update the `cookie` file with fresh cookies from your browser.

### "Already downloaded" messages

This is normal! The downloader tracks downloaded artworks to avoid duplicates.

**To override:** Use the `-forceRepeated` flag:
```bash
pixiv_downloader.exe -forceRepeated urls.txt
```

### Download is slow

This is intentional! The downloader adds a 2-second delay between downloads to avoid overwhelming Pixiv's servers and reduce risk of rate limiting.

### "Invalid URL" errors

Make sure URLs are in this format:
```
https://www.pixiv.net/artworks/123456
```

Not in formats like:
- `https://www.pixiv.net/en/artworks/123456` (has `/en/`)
- `https://pixiv.net/artworks/123456` (missing `www.`)

The bookmark extractor generates URLs in the correct format automatically.

## Database Management

The downloader creates a `downloaded.db` SQLite database in your download directory. This tracks which artworks have been downloaded.

### View database contents

Use any SQLite viewer tool, or:

```sql
-- Connect to the database
sqlite3 "C:\My Pixiv Downloads\downloaded.db"

-- View all downloaded artworks
SELECT * FROM downloaded_artworks;

-- Count total downloads
SELECT COUNT(*) FROM downloaded_artworks;

-- Delete a specific artwork (to allow re-download)
DELETE FROM downloaded_artworks WHERE artwork_id = '123456';

-- Clear entire database (allows re-downloading everything)
DELETE FROM downloaded_artworks;
```

### Reset database

To start fresh and re-download everything:

1. Delete `downloaded.db` from your download directory
2. Run the downloader again

Or use `-forceRepeated` flag to bypass the database check.

## Tips and Best Practices

1. **Keep URLs organized**: Save URL files with descriptive names:
   - `pixiv-bookmarks-user123-2025-01.txt`
   - `favorites-artists.txt`
   - `collection-landscapes.txt`

2. **Regular backups**: Bookmark URLs change over time as artworks are deleted. Extract and save URLs periodically.

3. **Cookie security**: Never commit your `cookie` file to version control. It contains authentication data.

4. **Disk space**: Check available disk space before large downloads. Some artworks can be several MB each.

5. **Network**: Stable internet connection recommended for batch downloads.

6. **Rate limiting**: Don't try to bypass the 2-second delay. Respecting Pixiv's servers keeps everyone happy.

## Integration with Pixiv Omina

Both tools can work alongside Pixiv Omina:

- **Bookmark extractor**: Uses Pixiv Omina's saved cookies automatically
- **C++ downloader**: Independent tool, doesn't require Pixiv Omina to be running
- **Cookie file**: Shared between both tools for authentication

You can use Pixiv Omina for interactive downloads and the C++ downloader for batch processing!

## Automation

### Windows Task Scheduler

Automate daily/weekly bookmark downloads:

1. Create a batch file `download-bookmarks.bat`:
```batch
@echo off
cd C:\path\to\pixiv-omina-singleDownload
npx electron bookmark-url-extractor.js "YOUR_BOOKMARK_URL" --output=file
FOR %%f IN (pixiv-bookmarks-*-*.txt) DO (
    pixiv_downloader.exe -d "C:\My Pixiv Downloads" "%%f"
    DEL "%%f"
)
```

2. Schedule it in Task Scheduler to run weekly

### PowerShell Script

```powershell
# download-new-bookmarks.ps1
$bookmarkUrl = "https://www.pixiv.net/en/users/123456/bookmarks/artworks"
$downloadDir = "C:\My Pixiv Downloads"

# Extract URLs
npx electron bookmark-url-extractor.js $bookmarkUrl --output=file

# Get the latest URL file
$urlFile = Get-ChildItem -Filter "pixiv-bookmarks-*.txt" | Sort-Object LastWriteTime -Descending | Select-Object -First 1

# Download
if ($urlFile) {
    & pixiv_downloader.exe -d $downloadDir $urlFile.Name
    Remove-Item $urlFile.Name
}
```

## Example Session

```
PS C:\pixiv-omina-singleDownload> npx electron bookmark-url-extractor.js "https://www.pixiv.net/en/users/12345/bookmarks/artworks" --output=file

Extracting bookmarks for user ID: 12345
Using cookies from your Pixiv Omina session...
Found 15 Pixiv cookies in session
Fetching bookmarks using your Pixiv Omina session...
Fetched 48 artworks (total: 48)
Fetched 24 artworks (total: 72)

Found 72 artworks
URLs saved to: pixiv-bookmarks-12345-2025-10-30T07-17-37-943Z.txt

PS C:\pixiv-omina-singleDownload> cd cpp-downloader

PS C:\pixiv-omina-singleDownload\cpp-downloader> .\pixiv_downloader.exe -d "C:\Downloads\Pixiv" ..\pixiv-bookmarks-12345-2025-10-30T07-17-37-943Z.txt

Pixiv Artwork Downloader v1.0.0

Download directory: C:\Downloads\Pixiv
Database: 0 artworks previously downloaded
Loading cookies from: ../cookie
Loaded cookies from file
Reading URLs from: ..\pixiv-bookmarks-12345-2025-10-30T07-17-37-943Z.txt
Found 72 URL(s) to process

[1/72] 
=== Processing artwork 123456 ===
Fetching artwork information...
Found 1 image(s)
Downloading image 1/1: 123456_p0.jpg
Download progress: 100% (2048 KB / 2048 KB)
Saved: C:\Downloads\Pixiv\123456_p0.jpg
✓ Artwork 123456 downloaded successfully
Waiting 2 seconds before next download...

[2/72] 
=== Processing artwork 789012 ===
Skipping: Already downloaded (use -forceRepeated to override)

...

=== Download Summary ===
Total URLs:       72
Successfully downloaded: 50
Skipped:          20
Failed:           2
Database total:   70
```

## Need Help?

- Check the [README](README.md) for basic usage
- See [IMPLEMENTATION.md](IMPLEMENTATION.md) for technical details
- Open an issue on GitHub for bugs or feature requests

Happy downloading! 🎨
