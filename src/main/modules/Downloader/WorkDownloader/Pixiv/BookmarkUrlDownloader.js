import WorkDownloader from '@/modules/Downloader/WorkDownloader';
import Request from '@/modules/Request';
import BookmarkUrlProvider from '../../Providers/Pixiv/BookmarkUrlProvider';
import DownloadAdapter from '../../DownloadAdapter';
import { debug } from '@/global';

/**
 * Downloader for user bookmark URLs
 * Handles URLs like: https://www.pixiv.net/en/users/{userId}/bookmarks/artworks
 */
class BookmarkUrlDownloader extends WorkDownloader {
  constructor() {
    super();

    /**
     * @type {string}
     */
    this.type = 'Pixiv User Bookmark';

    /**
     * @type {BookmarkUrlProvider}
     */
    this.provider;

    /**
     * @type {number}
     */
    this.currentPage = 1;

    /**
     * @type {boolean}
     */
    this.hasMorePages = true;
  }

  /**
   * Create a bookmark URL downloader
   * @param {{ url: string, saveTo: string, options: object, provider: BookmarkUrlProvider }} args
   * @returns {BookmarkUrlDownloader}
   */
  static createDownloader({ url, saveTo, options, provider }) {
    let downloader = new BookmarkUrlDownloader();
    downloader.id = provider.id;
    downloader.url = url;
    downloader.saveTo = saveTo;
    downloader.options = options;
    downloader.provider = provider;

    return downloader;
  }

  /**
   * Get bookmark API URL for a specific user
   * @param {number|string} userId - The user ID
   * @param {number} page - Page number (1-based)
   * @returns {string}
   */
  getBookmarkUrl(userId, page) {
    const limit = 48;
    const offset = (page - 1) * limit;
    const rest = this.options.rest || 'show';
    return `https://www.pixiv.net/ajax/user/${userId}/illusts/bookmarks?tag=&offset=${offset}&limit=${limit}&rest=${rest}&lang=en`;
  }

  /**
   * Get artwork URL from ID
   * @param {string|number} id - Artwork ID
   * @returns {string}
   */
  getArtworkUrl(id) {
    return `https://www.pixiv.net/artworks/${id}`;
  }

  /**
   * Request bookmark page content from Pixiv API
   * @param {number} page - Page number
   * @returns {Promise<string>}
   */
  requestBookmarkPage(page) {
    this.setProcessing('_resolving_artworks');

    return new Promise((resolve, reject) => {
      const url = this.getBookmarkUrl(this.options.userId, page);

      this.request = new Request({
        url,
        method: 'GET'
      });

      this.request.on('response', response => {
        let body = '';

        response.on('data', data => {
          body += data;
        });

        response.on('end', () => {
          resolve(body);
        });

        response.on('error', error => {
          reject(error);
        });

        response.on('aborted', () => {
          reject(Error('Response has been interrupted'));
        });
      });

      this.request.on('error', error => {
        reject(error);
      });

      this.request.on('abort', () => {
        reject(Error('Request has been interrupted'));
      });

      this.request.on('end', () => this.request = null);

      this.request.end();
    });
  }

  /**
   * Parse JSON response from API
   * @param {string} content - JSON response body
   * @returns {any[]|null}
   */
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

  /**
   * Add artwork downloaders for bookmarked items
   * @param {string} content - JSON response body
   */
  addArtworkDownloaders(content) {
    const works = this.getItems(content);

    if (works && works.length > 0) {
      works.forEach(work => {
        if (work && work.id) {
          const artworkUrl = this.getArtworkUrl(work.id);
          
          try {
            // Get provider for this artwork
            const provider = DownloadAdapter.getProvider(artworkUrl);

            // Add downloader to download manager
            this.downloadManager.addDownloader(provider.createDownloader({
              url: artworkUrl,
              saveTo: this.saveTo,
              options: this.options
            }));
          } catch (error) {
            debug.log(`Failed to add downloader for artwork ${work.id}:`, error);
          }
        }
      });

      // If we got works, there might be more pages
      this.hasMorePages = works.length === 48;
    } else {
      // No works means no more pages
      this.hasMorePages = false;
    }
  }

  /**
   * Process all bookmark pages
   * @returns {Promise<void>}
   */
  async processAllPages() {
    while (this.hasMorePages) {
      try {
        const content = await this.requestBookmarkPage(this.currentPage);
        this.addArtworkDownloaders(content);
        this.currentPage++;
      } catch (error) {
        debug.log(`Error processing page ${this.currentPage}:`, error);
        throw error;
      }
    }
  }

  /**
   * Start the downloader
   */
  start() {
    this.setStart();

    this.processAllPages()
      .then(() => {
        this.setFinish();
        this.downloadManager.deleteDownload({ downloadId: this.id });
      })
      .catch(error => {
        this.setError(error);
      });
  }
}

export default BookmarkUrlDownloader;
