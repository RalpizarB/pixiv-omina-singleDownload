# Quick Reference: C++ Downloader

## Installation

### Option 1: Download Pre-built (Recommended)
1. Go to [GitHub Actions](https://github.com/RalpizarB/pixiv-omina-singleDownload/actions)
2. Click the latest successful "Build C++ Downloader" workflow run
3. Download `pixiv-downloader-windows-x64` artifact
4. Extract `pixiv_downloader.exe`

### Option 2: Build from Source
```cmd
cd cpp-downloader
build.bat
```

## Quick Start

```cmd
# 1. Create cookie file with your Pixiv cookies
copy cookie.example cookie
# Edit cookie file with your browser cookies

# 2. Extract bookmark URLs
cd ..
npx electron bookmark-url-extractor.js "YOUR_BOOKMARK_URL" --output=file

# 3. Download artworks
cd cpp-downloader
pixiv_downloader.exe -d C:\Downloads ..\pixiv-bookmarks-*.txt
```

## Command Reference

```
pixiv_downloader [options] <input_file>

Options:
  -d, --download-dir DIR    Download directory (default: ./downloads)
  -c, --cookie-file FILE    Cookie file (default: ../cookie)
  -forceRepeated            Re-download existing artworks
  -h, --help                Show help
  -v, --version             Show version
```

## Examples

```cmd
# Basic download
pixiv_downloader.exe urls.txt

# Custom directory
pixiv_downloader.exe -d "C:\My Art" urls.txt

# Custom cookie file
pixiv_downloader.exe -c "C:\cookies\pixiv.txt" urls.txt

# Force re-download
pixiv_downloader.exe -forceRepeated urls.txt

# All options
pixiv_downloader.exe -d "C:\Art" -c ".\cookie" -forceRepeated urls.txt
```

## Workflow

```
bookmark-url-extractor.js → urls.txt → pixiv_downloader.exe → downloaded artworks
                                              ↓
                                         downloaded.db
                                    (tracks downloaded IDs)
```

## File Locations

- **Executable**: `cpp-downloader/build/bin/Release/pixiv_downloader.exe`
- **Cookie file**: `../cookie` (or custom with `-c`)
- **URL file**: Any text file with URLs
- **Downloads**: `./downloads` (or custom with `-d`)
- **Database**: `<download-dir>/downloaded.db`

## Cookie File Format

```
PHPSESSID=your_session_id; other_cookie=value; another=value
```

See `../cookie.example` for details.

## Database

The downloader creates `downloaded.db` in your download directory:

```sql
-- View downloads
SELECT * FROM downloaded_artworks;

-- Count downloads
SELECT COUNT(*) FROM downloaded_artworks;

-- Reset (delete database file)
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Cannot open cookie file | Create `cookie` file with Pixiv cookies |
| HTTP 403 error | Update cookies (they expired) |
| Invalid URL error | Ensure URLs are `https://www.pixiv.net/artworks/{id}` |
| Already downloaded message | Use `-forceRepeated` to override |

## Links

- Full documentation: [README.md](README.md)
- Complete workflow guide: [../COMPLETE_WORKFLOW.md](../COMPLETE_WORKFLOW.md)
- Implementation details: [IMPLEMENTATION.md](IMPLEMENTATION.md)
- Bookmark extractor: [../README-bookmark-extractor.md](../README-bookmark-extractor.md)

## Features

✅ One-by-one downloads  
✅ Automatic duplicate detection  
✅ Multi-page artwork support  
✅ Progress display  
✅ Cookie file authentication  
✅ Configurable download directory  
✅ SQLite database tracking  
✅ 2-second rate limiting  

## Version

Current version: 1.0.0

Built with:
- C++17
- libcurl (HTTP/HTTPS)
- SQLite3 (database)
- nlohmann/json (JSON parsing)

## Platform

Windows 10/11 (x64)

---

For more detailed information, see the full [README.md](README.md) and [COMPLETE_WORKFLOW.md](../COMPLETE_WORKFLOW.md).
