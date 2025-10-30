# Bookmark Downloader Feature

## Status: FIXED ✅

The bookmark downloader feature has been updated to work with Pixiv's modern API (as of October 2025).

## Location in Code

The bookmark downloader feature is implemented in the following files:

### Main Implementation Files:
- **UI Component**: `src/renderer/components/dialogs/AddDownloadDialog.vue`
  - Contains the "Bookmark" tab in the Add Download dialog
  - Allows users to select public/private bookmarks
  - Supports downloading all bookmarks or specific page ranges

- **Service Handler**: `src/main/services/DownloadService.js`
  - Method: `createBmDownloadAction()` (lines 273-292)
  - Handles the bookmark download request from the renderer

- **Provider Classes**:
  - `src/main/modules/Downloader/Providers/Pixiv/BookmarkProvider.js`
  - `src/main/modules/Downloader/Providers/Pixiv/BookmarkPageProvider.js`

- **Downloader Classes**:
  - `src/main/modules/Downloader/WorkDownloader/Pixiv/BookmarkDownloader.js`
  - `src/main/modules/Downloader/WorkDownloader/Pixiv/BookmarkPageDownloader.js`

## What Was Fixed

The bookmark downloader was originally designed to work with Pixiv's old website structure:
- **Old URL format**: `https://www.pixiv.net/bookmark.php?rest={rest}&type=illust_all&p={page}`
- **Old method**: HTML parsing with CSS selectors (`.display_editable_works .image-item`)

**The Problem**: Pixiv modernized their website and deprecated the old HTML structure. The old implementation tried to parse HTML elements that no longer existed.

### Changes Implemented:

1. **Updated to Modern API Endpoint**:
   ```javascript
   // NEW: Using modern AJAX API
   static getBookmarkUrl({ rest = 'show', page = 1}) {
     const limit = 48;
     const offset = (page - 1) * limit;
     return `https://www.pixiv.net/ajax/user/self/illusts/bookmarks?tag=&offset=${offset}&limit=${limit}&rest=${rest}&lang=en`;
   }
   ```

2. **Updated to JSON Parsing** (BookmarkPageDownloader.js):
   ```javascript
   // NEW: Parse JSON response instead of HTML
   getItems(content) {
     try {
       const data = JSON.parse(content);
       if (data && !data.error && data.body && data.body.works) {
         return data.body.works;
       }
     } catch (error) {
       debug.log('Error parsing bookmark response:', error);
     }
     return null;
   }
   ```

3. **Key Improvements**:
   - Uses `/ajax/user/self/illusts/bookmarks` endpoint (no user ID required)
   - Parses JSON responses instead of HTML
   - Implements offset-based pagination (48 items per page)
   - More reliable and consistent with other downloaders in the codebase

## How to Use the Bookmark Downloader

1. **Login to Pixiv** through the application (required for bookmark access)
2. **Open Add Download dialog** (click the "+" button or use the menu)
3. **Switch to Bookmark tab**
4. **Select bookmark type**:
   - **Public** (rest='show'): Your public bookmarks
   - **Private** (rest='hide'): Your private bookmarks
5. **Choose download mode**:
   - **All**: Downloads all bookmarks (automatically fetches all pages)
   - **Pages**: Downloads specific page ranges (e.g., "1" or "1-3" or "1-3,5-10")
6. **Select save location**
7. **Click Add** to start downloading

The downloader will:
- Fetch your bookmarked artworks using the modern API
- Create individual download tasks for each artwork
- Handle pagination automatically (48 artworks per page)
- Skip artworks that have already been downloaded (if skip feature is enabled)

## API Details

### Modern Endpoint Structure:
```
https://www.pixiv.net/ajax/user/self/illusts/bookmarks
```

### Query Parameters:
- `tag`: Filter by tag (empty string for all)
- `offset`: Starting position (0-based, calculated from page number)
- `limit`: Items per request (48)
- `rest`: "show" for public, "hide" for private bookmarks
- `lang`: Language code (e.g., "en")

### Response Format:
```json
{
  "error": false,
  "message": "",
  "body": {
    "works": [
      {
        "id": "123456789",
        "title": "Artwork Title",
        "illustType": 0,
        ...
      }
    ],
    "total": 1234
  }
}
```

## Testing

To verify the bookmark downloader works:
1. Login to Pixiv through the application
2. Make sure you have some bookmarked artworks in your Pixiv account
3. Open Add Download dialog and switch to Bookmark tab
4. Try downloading your public bookmarks (mode: "All")
5. Verify that bookmarked artworks are properly queued for download
6. Check that the artworks download successfully

## Troubleshooting

**Issue**: Bookmark download fails immediately
- **Solution**: Make sure you're logged into Pixiv through the application

**Issue**: No bookmarks found
- **Solution**: Verify you have bookmarks in your Pixiv account at https://www.pixiv.net/bookmark.php

**Issue**: Only some bookmarks download
- **Solution**: This is expected if "skip downloaded works" is enabled in settings

**Issue**: Download stops after first page
- **Solution**: Check the application logs for errors. The API might be rate-limited or require authentication refresh.
