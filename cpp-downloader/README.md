# Pixiv Artwork Downloader (C++ Console Program)

A command-line tool for downloading Pixiv artworks one at a time from a list of URLs.

## Features

- Download illustrations from a file containing Pixiv artwork URLs
- Specify custom download directory
- Automatic duplicate detection using SQLite database
- Skip already downloaded artworks (configurable)
- Use cookies from the same file as `bookmark-url-extractor.js`
- Progress display for downloads
- Multi-page artwork support

## Requirements

- Windows (tested on Windows 10/11)
- Cookie file with Pixiv authentication (same format as used by bookmark-url-extractor.js)

## Usage

### Basic Usage

```bash
pixiv_downloader.exe urls.txt
```

### With Custom Download Directory

```bash
pixiv_downloader.exe -d C:\Downloads\Pixiv urls.txt
```

### Force Re-download Already Downloaded Artworks

```bash
pixiv_downloader.exe -forceRepeated urls.txt
```

### Complete Example

```bash
pixiv_downloader.exe -d ./my_downloads -c ./cookie urls.txt
```

## Command Line Options

- `input_file` - File containing Pixiv artwork URLs (one per line)
- `-d, --download-dir DIR` - Download directory (default: `./downloads`)
- `-c, --cookie-file FILE` - Cookie file path (default: `../cookie`)
- `-forceRepeated` - Re-download already downloaded artworks
- `-h, --help` - Show help message
- `-v, --version` - Show version information

## Input File Format

The input file should contain one Pixiv artwork URL per line:

```
https://www.pixiv.net/artworks/123456
https://www.pixiv.net/artworks/789012
https://www.pixiv.net/artworks/345678
```

You can use the output from `bookmark-url-extractor.js`:

```bash
# Extract bookmarks to file
npx electron bookmark-url-extractor.js "YOUR_BOOKMARK_URL" --output=file

# Download the artworks
pixiv_downloader.exe pixiv-bookmarks-*.txt
```

## Cookie File

The program uses the same cookie file format as `bookmark-url-extractor.js`. See `cookie.example` in the parent directory for format details.

Example cookie file:
```
PHPSESSID=your_session_id; privacy_policy_agreement=1
```

## Database

The program maintains a SQLite database (`downloaded.db`) in the download directory to track downloaded artworks. This prevents re-downloading the same artwork unless you use the `-forceRepeated` flag.

## Building from Source

### Prerequisites

- CMake 3.15 or higher
- Visual Studio 2019 or higher (with C++ support)
- vcpkg (for dependency management)

### Build Steps

1. Install vcpkg and set the environment variable:
   ```cmd
   set VCPKG_ROOT=C:\path\to\vcpkg
   ```

2. Build the project:
   ```cmd
   cd cpp-downloader
   mkdir build
   cd build
   cmake .. -DCMAKE_TOOLCHAIN_FILE=%VCPKG_ROOT%/scripts/buildsystems/vcpkg.cmake
   cmake --build . --config Release
   ```

3. The executable will be in `build/bin/Release/pixiv_downloader.exe`

## Example Workflow

1. Extract bookmark URLs:
   ```bash
   npx electron bookmark-url-extractor.js "https://www.pixiv.net/en/users/12345/bookmarks/artworks" --output=file
   ```

2. Download the artworks:
   ```bash
   pixiv_downloader.exe -d "C:\My Pixiv Downloads" pixiv-bookmarks-12345-*.txt
   ```

3. Re-run to download any new bookmarks (skips existing):
   ```bash
   pixiv_downloader.exe -d "C:\My Pixiv Downloads" new-bookmarks.txt
   ```

## Troubleshooting

### "Cannot open cookie file"
Make sure the cookie file exists and contains valid Pixiv cookies. See the parent directory's `cookie.example` for format.

### "HTTP error: 403"
Your cookies may have expired. Update the cookie file with fresh cookies from your browser.

### "Failed to fetch artwork info"
Check your internet connection and verify that the artwork URL is valid and accessible.

## License

Same as the main Pixiv Omina project (MPL-2.0)
