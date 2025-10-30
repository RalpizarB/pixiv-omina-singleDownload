# Testing Checklist for C++ Downloader

This checklist is for verifying the built executable works correctly.

## Prerequisites
- [ ] Windows 10 or 11 (x64)
- [ ] Cookie file with valid Pixiv cookies
- [ ] Text file with Pixiv artwork URLs
- [ ] Internet connection

## Download Executable
- [ ] Go to GitHub Actions page
- [ ] Find latest successful "Build C++ Downloader" workflow
- [ ] Download `pixiv-downloader-windows-x64` artifact
- [ ] Extract pixiv_downloader.exe

## Setup Test Environment
- [ ] Create a `cookie` file with Pixiv cookies (see cookie.example)
- [ ] Create a test URLs file (e.g., `test-urls.txt`) with 2-3 artwork URLs:
  ```
  https://www.pixiv.net/artworks/123456
  https://www.pixiv.net/artworks/789012
  ```

## Basic Functionality Tests

### Test 1: Help Command
```cmd
pixiv_downloader.exe --help
```
- [ ] Shows help message
- [ ] Lists all options correctly
- [ ] No errors

### Test 2: Version Command
```cmd
pixiv_downloader.exe --version
```
- [ ] Shows version 1.0.0
- [ ] No errors

### Test 3: Basic Download
```cmd
pixiv_downloader.exe test-urls.txt
```
- [ ] Creates `downloads` directory
- [ ] Creates `downloaded.db` database file
- [ ] Downloads images successfully
- [ ] Shows progress for each download
- [ ] Displays summary at end

### Test 4: Custom Download Directory
```cmd
pixiv_downloader.exe -d C:\Test\Pixiv test-urls.txt
```
- [ ] Creates specified directory
- [ ] Downloads to correct location
- [ ] Database created in download directory

### Test 5: Duplicate Detection
```cmd
# Run same command twice
pixiv_downloader.exe test-urls.txt
pixiv_downloader.exe test-urls.txt
```
- [ ] Second run skips already downloaded artworks
- [ ] Shows "Already downloaded" messages
- [ ] No re-downloads

### Test 6: Force Repeated
```cmd
pixiv_downloader.exe -forceRepeated test-urls.txt
```
- [ ] Re-downloads previously downloaded artworks
- [ ] Overwrites existing files
- [ ] Updates database

### Test 7: Custom Cookie File
```cmd
pixiv_downloader.exe -c C:\cookies\pixiv.txt test-urls.txt
```
- [ ] Uses specified cookie file
- [ ] Downloads successfully

### Test 8: Invalid URL Handling
Create `invalid-urls.txt`:
```
https://www.pixiv.net/artworks/999999999999
not-a-url
https://example.com
```
```cmd
pixiv_downloader.exe invalid-urls.txt
```
- [ ] Skips invalid URLs with warnings
- [ ] Continues processing valid URLs
- [ ] Shows error summary

### Test 9: Missing Cookie File
```cmd
pixiv_downloader.exe -c nonexistent.txt test-urls.txt
```
- [ ] Shows clear error message
- [ ] Exits gracefully

### Test 10: Multi-page Artwork
Create `multipage-urls.txt` with a multi-page artwork URL:
```cmd
pixiv_downloader.exe multipage-urls.txt
```
- [ ] Downloads all pages
- [ ] Names files correctly (_p0, _p1, etc.)
- [ ] Shows page count

## Integration Tests

### Test 11: Full Workflow with Bookmark Extractor
```cmd
# Extract bookmarks
cd ..
npx electron bookmark-url-extractor.js "BOOKMARK_URL" --output=file

# Download artworks
cd cpp-downloader
pixiv_downloader.exe -d C:\Test\Bookmarks ..\pixiv-bookmarks-*.txt
```
- [ ] Extraction completes successfully
- [ ] URL file created
- [ ] All artworks downloaded
- [ ] Database tracks all downloads

### Test 12: Incremental Updates
```cmd
# Download initial set
pixiv_downloader.exe -d C:\Test\Incremental urls1.txt

# Add new URLs to urls2.txt (including some from urls1.txt)
pixiv_downloader.exe -d C:\Test\Incremental urls2.txt
```
- [ ] Skips previously downloaded artworks
- [ ] Downloads only new artworks
- [ ] Database correctly tracks both batches

## Error Handling Tests

### Test 13: Expired Cookies
- [ ] Use expired cookies in cookie file
- [ ] Run download
- [ ] Shows HTTP 403 error
- [ ] Clear error message about cookies

### Test 14: No Internet Connection
- [ ] Disconnect internet
- [ ] Run download
- [ ] Shows connection error
- [ ] Handles gracefully

### Test 15: Disk Space
- [ ] Run with nearly full disk
- [ ] Check error handling
- [ ] Verify error message

## Performance Tests

### Test 16: Large Batch
Create file with 50+ URLs:
```cmd
pixiv_downloader.exe large-batch.txt
```
- [ ] Processes all URLs
- [ ] Rate limiting works (2 second delay)
- [ ] Memory usage stable
- [ ] No crashes

### Test 17: Database Performance
- [ ] Download 100+ artworks
- [ ] Check database file size
- [ ] Verify queries are fast
- [ ] No database corruption

## Edge Cases

### Test 18: Special Characters in Filenames
- [ ] Download artworks with special characters in titles
- [ ] Filenames sanitized correctly
- [ ] No file system errors

### Test 19: Long Paths
- [ ] Use very long download directory path
- [ ] Verify handling on Windows (260 char limit)

### Test 20: Concurrent Runs
```cmd
# Start two instances
pixiv_downloader.exe -d C:\Test1 urls.txt
pixiv_downloader.exe -d C:\Test2 urls.txt
```
- [ ] Both run without conflict
- [ ] Separate databases work correctly

## Expected Results Summary

All tests should pass with:
- ✅ No crashes or hangs
- ✅ Clear error messages when errors occur
- ✅ Proper file and directory creation
- ✅ Accurate progress reporting
- ✅ Correct database behavior
- ✅ Proper rate limiting
- ✅ Clean exit codes (0 for success, 1 for errors)

## Reporting Issues

If any test fails, report:
1. Test number and description
2. Command used
3. Expected behavior
4. Actual behavior
5. Error messages (if any)
6. Windows version
7. Screenshots (if applicable)

## Success Criteria

The executable is ready for release if:
- [ ] All basic functionality tests pass
- [ ] Integration tests pass
- [ ] Error handling works correctly
- [ ] No crashes or data corruption
- [ ] Performance is acceptable
- [ ] Documentation matches actual behavior
