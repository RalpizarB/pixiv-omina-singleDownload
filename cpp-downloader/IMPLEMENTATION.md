# C++ Downloader Implementation

This document describes the C++ console program for downloading Pixiv illustrations.

## Overview

The C++ downloader is a command-line tool that reads artwork URLs from a file and downloads them one at a time. It integrates with the existing bookmark-url-extractor.js workflow.

## Architecture

### Components

1. **main.cpp** - Entry point, argument parsing, and main execution
2. **pixiv_downloader.cpp/h** - Core downloader logic
3. **http_client.cpp/h** - HTTP/HTTPS communication using libcurl
4. **database.cpp/h** - SQLite database for tracking downloaded artworks
5. **arg_parser.cpp/h** - Command-line argument parsing

### Dependencies

- **libcurl** - HTTP/HTTPS requests
- **SQLite3** - Database for tracking downloads
- **nlohmann/json** - JSON parsing for Pixiv API responses

### Database Schema

```sql
CREATE TABLE downloaded_artworks (
    artwork_id TEXT PRIMARY KEY,
    file_path TEXT NOT NULL,
    download_time DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## Features

### 1. File Input
Reads Pixiv artwork URLs from a text file (one per line). Supports the output format from bookmark-url-extractor.js.

### 2. Download Directory
- Configurable via `-d` or `--download-dir` argument
- Defaults to `./downloads`
- Creates directory if it doesn't exist
- Database file is stored in the download directory

### 3. Cookie File Support
- Uses the same cookie file format as bookmark-url-extractor.js
- Default path: `../cookie` (same directory as the Node.js script)
- Configurable via `-c` or `--cookie-file` argument
- Supports single-line and multi-line formats

### 4. Duplicate Detection
- SQLite database tracks downloaded artworks by ID
- Automatically skips already downloaded artworks
- `-forceRepeated` flag to override and re-download

### 5. Multi-page Support
- Automatically detects multi-page artworks
- Downloads all pages from multi-page submissions

### 6. Progress Display
- Real-time download progress with percentage and bytes
- Summary statistics at completion

## Usage Examples

### Basic Usage
```bash
pixiv_downloader.exe urls.txt
```

### Custom Download Directory
```bash
pixiv_downloader.exe -d "C:\My Pixiv Art" urls.txt
```

### Force Re-download
```bash
pixiv_downloader.exe -forceRepeated urls.txt
```

### Complete Workflow
```bash
# 1. Extract bookmark URLs
npx electron bookmark-url-extractor.js "https://www.pixiv.net/en/users/12345/bookmarks/artworks" --output=file

# 2. Download artworks
pixiv_downloader.exe -d "C:\Pixiv Downloads" pixiv-bookmarks-12345-*.txt

# 3. Later, extract new bookmarks and download (skips existing)
npx electron bookmark-url-extractor.js "https://www.pixiv.net/en/users/12345/bookmarks/artworks" --output=file
pixiv_downloader.exe -d "C:\Pixiv Downloads" pixiv-bookmarks-12345-*.txt
```

## Building

### Prerequisites
- Windows 10/11
- Visual Studio 2019 or later with C++ support
- CMake 3.15+
- vcpkg for dependency management

### Build Steps

1. **Install vcpkg** (if not already installed):
   ```powershell
   git clone https://github.com/Microsoft/vcpkg.git
   cd vcpkg
   .\bootstrap-vcpkg.bat
   ```

2. **Set environment variable**:
   ```powershell
   $env:VCPKG_ROOT = "C:\path\to\vcpkg"
   ```

3. **Build the project**:
   ```powershell
   cd cpp-downloader
   .\build.bat
   ```

   Or manually:
   ```powershell
   mkdir build
   cd build
   cmake .. -DCMAKE_TOOLCHAIN_FILE=%VCPKG_ROOT%/scripts/buildsystems/vcpkg.cmake
   cmake --build . --config Release
   ```

4. **Executable location**: `build/bin/Release/pixiv_downloader.exe`

## GitHub Action

A GitHub Action workflow is configured to automatically build the executable on every push to the cpp-downloader directory.

### Workflow: `.github/workflows/build-cpp-downloader.yml`

**Triggers:**
- Push to main/master branches
- Pull requests
- Manual dispatch

**Actions:**
- Sets up Windows build environment
- Installs dependencies via vcpkg
- Builds the executable
- Uploads artifact (retained for 30 days)
- Creates GitHub release (if tagged with `cpp-v*`)

### Downloading Pre-built Executable

1. Go to the GitHub Actions tab
2. Click on the latest successful workflow run
3. Download the `pixiv-downloader-windows-x64` artifact
4. Extract and use `pixiv_downloader.exe`

## API Endpoints Used

### 1. Artwork Metadata
```
GET https://www.pixiv.net/ajax/illust/{artwork_id}
```
Returns artwork information including title, artist, and image URLs.

### 2. Multi-page Metadata
```
GET https://www.pixiv.net/ajax/illust/{artwork_id}/pages
```
Returns URLs for all pages in a multi-page artwork.

### 3. Image Download
```
GET {image_url}
```
Direct download of image file with proper Referer header.

## Error Handling

- Invalid URLs are skipped with error message
- HTTP errors (403, 404, etc.) are reported
- Failed downloads don't stop the batch process
- Summary shows success/skip/fail counts

## Rate Limiting

- 2-second delay between artwork downloads
- Prevents overwhelming Pixiv servers
- Reduces risk of rate limiting or IP bans

## Security Considerations

1. **Cookie Storage**: Cookie file should be kept secure and not committed to git
2. **HTTPS**: All requests use HTTPS with certificate verification
3. **Database**: SQLite database is local and contains only artwork IDs

## Future Enhancements

Possible improvements:
- Progress bar instead of percentage
- Concurrent downloads (with rate limiting)
- Retry logic for failed downloads
- Filter by date/tags
- Export database to CSV
- Integration with Pixiv Omina's database

## Troubleshooting

### Build Issues
- Ensure vcpkg is properly installed and VCPKG_ROOT is set
- Install Visual Studio with "Desktop development with C++" workload
- Check CMake version (3.15+)

### Runtime Issues
- **"Cannot open cookie file"**: Create cookie file with valid Pixiv cookies
- **"HTTP 403"**: Cookies expired, update cookie file
- **"Failed to fetch"**: Check internet connection and Pixiv availability
- **"Invalid URL"**: Ensure URLs are in format `https://www.pixiv.net/artworks/{id}`

## License

Same as main project (MPL-2.0)
