# Bookmark Download Implementation - Visual Guide

## Quick Reference Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     PIXIV BOOKMARK DOWNLOAD FLOW                             │
└─────────────────────────────────────────────────────────────────────────────┘

USER ACTION
    │
    ├──────────────────────────────┬──────────────────────────────────────┐
    │                              │                                      │
┌───▼────────┐              ┌─────▼───────┐                   ┌─────────▼────────┐
│ Click "+"  │              │ Paste URL   │                   │  Use Bookmark    │
│  Button    │              │  in Dialog  │                   │     Tab          │
└───┬────────┘              └─────┬───────┘                   └─────────┬────────┘
    │                              │                                      │
    │                       ┌──────▼───────┐                             │
    │                       │  UrlMatcher  │                             │
    │                       │   checks:    │                             │
    │                       │ isPixivBookmark()                         │
    │                       └──────┬───────┘                             │
    │                              │                                      │
    │                       ┌──────▼────────────────┐                    │
    │                       │  DownloadAdapter      │                    │
    │                       │  Pattern Matching:    │                    │
    │                       │  /users/(\d+)/        │                    │
    │                       │   bookmarks/artworks  │                    │
    │                       └──────┬────────────────┘                    │
    │                              │                                      │
    │                       ┌──────▼────────────┐            ┌───────────▼──────────┐
    │                       │ BookmarkUrl       │            │  Bookmark            │
    │                       │ Provider          │            │  Provider            │
    │                       │ (for user URLs)   │            │  (for own bookmarks) │
    │                       └──────┬────────────┘            └───────────┬──────────┘
    │                              │                                      │
    │                       ┌──────▼────────────┐            ┌───────────▼──────────┐
    │                       │ BookmarkUrl       │            │  Bookmark            │
    │                       │ Downloader        │            │  Downloader          │
    │                       └──────┬────────────┘            └───────────┬──────────┘
    │                              │                                      │
    │                              └────────────┬─────────────────────────┘
    │                                           │
    │                                  ┌────────▼──────────┐
    │                                  │  Pixiv API Call   │
    │                                  │ /ajax/user/{id}/  │
    │                                  │ illusts/bookmarks │
    │                                  └────────┬──────────┘
    │                                           │
    │                                  ┌────────▼──────────┐
    │                                  │  Parse JSON       │
    │                                  │  Extract work IDs │
    │                                  └────────┬──────────┘
    │                                           │
    │                                  ┌────────▼──────────┐
    │                                  │ Create Artwork    │
    │                                  │ Downloaders       │
    │                                  └────────┬──────────┘
    │                                           │
    └───────────────────────────────────────────▼──────────────────────────────────┐
                                         ┌────────────────┐                         │
                                         │ Download       │                         │
                                         │ Manager        │                         │
                                         │ Queue Tasks    │                         │
                                         └────────┬───────┘                         │
                                                  │                                 │
                                         ┌────────▼───────┐                         │
                                         │ Download       │                         │
                                         │ Artworks       │                         │
                                         └────────────────┘                         │
                                                                                     │
└────────────────────────────────────────────────────────────────────────────────────┘
```

## URL Format Comparison

### Supported URL Formats

#### ✅ Bookmark URLs (NEW - Now Supported)
```
https://www.pixiv.net/en/users/18556068/bookmarks/artworks
https://www.pixiv.net/users/18556068/bookmarks/artworks
https://www.pixiv.net/ja/users/18556068/bookmarks/artworks
```
**Downloads:** User 18556068's public bookmarks
**Method:** URL Input field

#### ✅ User Profile URLs (Already Supported)
```
https://www.pixiv.net/en/users/18556068
https://www.pixiv.net/users/18556068
https://www.pixiv.net/member.php?id=18556068
```
**Downloads:** All artworks by user 18556068
**Method:** URL Input field

#### ✅ Artwork URLs (Already Supported)
```
https://www.pixiv.net/en/artworks/123456789
https://www.pixiv.net/artworks/123456789
```
**Downloads:** Single artwork
**Method:** URL Input field

#### ✅ Own Bookmarks (Already Supported)
**Method:** Bookmark Tab in dialog
**Downloads:** Your own public or private bookmarks

---

## Pattern Matching Priority

The order matters! More specific patterns must come first:

```
1. BookmarkUrlProvider    /users/123/bookmarks/artworks  ← More specific
2. UserProvider           /users/123                     ← More general
3. GeneralArtworkProvider /artworks/123
4. NovelProvider          /novel/show.php?id=123
5. NovelSeriesProvider    /novel/series/123
```

If we put UserProvider first, it would match bookmark URLs incorrectly!

---

## API Endpoints Used

### For Own Bookmarks (Bookmark Tab)
```
GET https://www.pixiv.net/ajax/user/self/illusts/bookmarks
    ?tag=
    &offset=0
    &limit=48
    &rest=show        ← 'show' for public, 'hide' for private
    &lang=en
```

**Response:**
```json
{
  "error": false,
  "body": {
    "works": [
      { "id": "123456789", "title": "...", ... },
      { "id": "987654321", "title": "...", ... }
    ],
    "total": 1234
  }
}
```

### For User Bookmarks (URL Input)
```
GET https://www.pixiv.net/ajax/user/{userId}/illusts/bookmarks
    ?tag=
    &offset=0
    &limit=48
    &rest=show        ← Always public for other users
    &lang=en
```

**Response:** Same JSON format as above

---

## Code Flow for URL-Based Download

```javascript
// 1. User pastes URL
const url = "https://www.pixiv.net/en/users/18556068/bookmarks/artworks";

// 2. URL Matcher validates
UrlMatcher.isPixivBookmark(url) // → true

// 3. Download Adapter matches pattern
const pattern = /^https?:\/\/www\.pixiv\.net\/(?:[a-z]+\/)?users\/(?<userId>\d+)\/bookmarks\/artworks/i;
const matches = url.match(pattern);
// matches.groups.userId → "18556068"

// 4. Create Provider
const provider = BookmarkUrlProvider.createProvider({
  url: url,
  context: { userId: "18556068" }
});

// 5. Create Downloader
const downloader = provider.createDownloader({
  saveTo: "/path/to/save",
  options: { userId: "18556068", rest: "show" }
});

// 6. Start Download
downloader.start();
// → Fetches bookmarks page by page
// → Creates GeneralArtworkDownloader for each work
// → Adds to DownloadManager queue
```

---

## Testing Checklist

### ✅ Test Case 1: Own Bookmarks
- [ ] Login to Pixiv in app
- [ ] Click "+" button
- [ ] Switch to "Bookmark" tab
- [ ] Select "Public" bookmarks
- [ ] Click "Add"
- [ ] Verify bookmarks are queued

### ✅ Test Case 2: User Bookmark URL
- [ ] Login to Pixiv in app
- [ ] Copy bookmark URL: `https://www.pixiv.net/en/users/18556068/bookmarks/artworks`
- [ ] Click "+" button
- [ ] Paste URL in "URL" tab
- [ ] Click "Add"
- [ ] Verify user's public bookmarks are queued

### ✅ Test Case 3: Pattern Priority
- [ ] Paste user profile URL: `https://www.pixiv.net/en/users/18556068`
- [ ] Verify it downloads user's artworks (not bookmarks)
- [ ] Paste bookmark URL: `https://www.pixiv.net/en/users/18556068/bookmarks/artworks`
- [ ] Verify it downloads user's bookmarks (not artworks)

---

## Files Modified Summary

```
NEW FILES:
├── src/main/modules/Downloader/Providers/Pixiv/
│   └── BookmarkUrlProvider.js              (53 lines, Provider class)
├── src/main/modules/Downloader/WorkDownloader/Pixiv/
│   └── BookmarkUrlDownloader.js            (218 lines, Downloader class)
└── docs/
    └── BOOKMARK_IMPLEMENTATION.md          (396 lines, Full documentation)

MODIFIED FILES:
├── src/main/modules/Downloader/
│   └── DownloadAdapter.js                  (Added bookmark pattern)
├── src/main/modules/Downloader/Providers/
│   └── index.js                            (Exported new provider)
└── src/utils/
    └── UrlMatcher.js                       (Added isPixivBookmark method)
```

---

## Security Summary

✅ **CodeQL Scan:** 0 alerts found
✅ **Code Review:** All issues addressed
✅ **Build:** Success
✅ **Pattern Security:** No injection vulnerabilities
✅ **API Security:** Uses authenticated Pixiv API endpoints

---

## Quick Start for Users

### Method 1: Download Your Own Bookmarks
1. Open app → Login to Pixiv
2. Click **+** button
3. Select **Bookmark** tab
4. Choose Public or Private
5. Click **Add**

### Method 2: Download Someone's Public Bookmarks
1. Open app → Login to Pixiv
2. Go to their Pixiv profile → Copy bookmark URL
3. Click **+** button
4. **Paste URL** in URL field
5. Click **Add**

**Example URL:**
```
https://www.pixiv.net/en/users/18556068/bookmarks/artworks
```

---

## Support

For issues or questions:
- Check `docs/BOOKMARK_IMPLEMENTATION.md` for detailed technical documentation
- Review this visual guide for quick reference
- Check application logs for errors
- Ensure you're logged into Pixiv

