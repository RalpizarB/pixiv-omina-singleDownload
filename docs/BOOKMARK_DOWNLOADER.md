# Bookmark Downloader Feature

## Status: NOT WORKING (Requires Update)

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

## Why It Doesn't Work

The bookmark downloader was designed to work with Pixiv's old website structure that used:
- URL format: `https://www.pixiv.net/bookmark.php?rest={rest}&type=illust_all&p={page}`
- HTML parsing with CSS selectors: `.display_editable_works .image-item`

**The Problem**: Pixiv has modernized their website and no longer uses this old HTML structure. The current implementation tries to parse HTML elements that don't exist in the modern Pixiv website, causing the feature to fail silently.

### Specific Issues:

1. **Old URL Format** (BookmarkProvider.js, line 17-18):
   ```javascript
   static getBookmarkUrl({ rest = 'show', page = 1}) {
     return `https://www.pixiv.net/bookmark.php?rest=${rest}&type=illust_all` + ...
   }
   ```
   This URL format is deprecated.

2. **HTML Parsing** (BookmarkPageDownloader.js, lines 69-72):
   ```javascript
   getItems(content) {
     let dom = parse(content);
     return dom.querySelectorAll('.display_editable_works .image-item');
   }
   ```
   These CSS selectors no longer exist in the modern Pixiv website.

## How to Fix

To fix this feature, the implementation needs to be updated to use Pixiv's modern AJAX API, similar to how other features in the codebase already work:

### Required Changes:

1. **Update URL Builder** (`src/utils/UrlBuilder.js`):
   - Add a method to generate the new bookmark API endpoint
   - The modern Pixiv API uses endpoints like: `/ajax/user/{userId}/illusts/bookmarks`
   - Parameters would include: `tag`, `offset`, `limit`, `rest` (show/hide for public/private)

2. **Update BookmarkPageDownloader**:
   - Replace HTML parsing with JSON API response parsing
   - The API returns JSON with a structure like:
     ```json
     {
       "error": false,
       "body": {
         "works": [
           { "id": "123456", ... },
           ...
         ],
         "total": 1234
       }
     }
     ```

3. **Add User ID Retrieval**:
   - Need to determine the current logged-in user's ID
   - Can be obtained from `/ajax/user/{userId}/profile/top` or similar endpoint
   - Or extracted from cookies/session data

4. **Update BookmarkProvider**:
   - Use pagination based on offset/limit instead of page numbers
   - Modern API typically uses offset-based pagination

### Example Modern API Endpoint:
```
https://www.pixiv.net/ajax/user/{userId}/illusts/bookmarks?tag=&offset=0&limit=48&rest=show
```

Where:
- `{userId}`: The current user's ID
- `tag`: Filter by tag (empty for all)
- `offset`: Starting position for pagination
- `limit`: Number of items per request (typically 48)
- `rest`: "show" for public, "hide" for private bookmarks

## Compatibility Note

The rest of the codebase already uses the modern AJAX API pattern (see `GeneralArtworkDownloader.js`, `UserDownloader.js`, etc.), so the bookmark downloader is the only feature still using the old HTML parsing approach.

## Testing After Fix

After implementing the fix:
1. Login to Pixiv through the application
2. Open Add Download dialog
3. Switch to Bookmark tab
4. Select bookmark type (Public/Private)
5. Choose download mode (All or specific pages)
6. Click Add
7. Verify that bookmarked artworks are properly downloaded

## Alternative: Remove Feature

If updating to the new API is too complex, consider:
- Removing the Bookmark tab from the UI
- Removing all bookmark-related code
- Update documentation to indicate this feature is not supported
- Suggest users use the URL-based download for individual artworks instead
