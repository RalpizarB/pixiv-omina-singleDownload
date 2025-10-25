# Quick Start Guide: Bookmark URL Extractor

## 🚀 Quick Setup (3 steps)

### 1. Install Dependencies

```bash
cd /path/to/pixiv-omina-singleDownload
yarn install
```

### 2. Login to Pixiv Omina

- Launch the Pixiv Omina app
- Log in to your Pixiv account
- You can close the app after logging in

### 3. Run the Extractor

```bash
# From the project directory
npx electron bookmark-url-extractor.js "https://www.pixiv.net/en/users/YOUR_USER_ID/bookmarks/artworks"
```

That's it! 🎉

## 📝 Common Commands

### Extract to console
```bash
npx electron bookmark-url-extractor.js "YOUR_BOOKMARK_URL"
```

### Save to file
```bash
npx electron bookmark-url-extractor.js "YOUR_BOOKMARK_URL" --output=file
```

### Get help
```bash
npx electron bookmark-url-extractor.js --help
```

## ❓ Troubleshooting

### Error: "No Pixiv cookies found"

**Solution Option 1 (Automatic):**
1. Open Pixiv Omina app
2. Make sure you're logged in
3. Close the app and try again

**Solution Option 2 (Manual - Use Cookie File):**
1. Create a file named `cookie` in project root
2. Log in to pixiv.net in your browser
3. Press F12 → Application → Cookies → pixiv.net
4. Copy cookies in format: `PHPSESSID=value; cookie2=value`
5. Paste into `cookie` file
6. Run script again

See `cookie.example` for detailed format.

### Error: "Cannot find module 'electron'"

**Solution:**
Run `yarn install` in the project directory first

### Still having issues?

Check the full README-bookmark-extractor.md for detailed troubleshooting.

## 🔗 Where to find your bookmark URL?

1. Go to Pixiv.net
2. Click on your profile
3. Go to "Bookmarks" tab
4. Copy the URL from your browser
5. It should look like: `https://www.pixiv.net/en/users/12345/bookmarks/artworks`

## 📂 File Location

- Script: `bookmark-url-extractor.js` (in project root)
- README: `README-bookmark-extractor.md` (in project root)
- This guide: `QUICKSTART-bookmark-extractor.md` (in project root)

## 💡 Pro Tip

Combine with pixivOpener.html for easy batch downloads:

1. Extract URLs: `npx electron bookmark-url-extractor.js "URL" --output=file`
2. Open `pixivOpener.html` in browser
3. Paste URLs and click "Start Downloading"
4. Enjoy throttled downloads with 2-second delays! 🎨
