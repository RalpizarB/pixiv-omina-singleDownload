import { debug } from '@/global';
import WorkDownloader from '@/modules/Downloader/WorkDownloader';
import Request from '@/modules/Request';
import BookmarkProvider from '../../Providers/Pixiv/BookmarkProvider';
import DownloadAdapter from '../../DownloadAdapter';

class BookmarkDownloader extends WorkDownloader {
  constructor() {
    super();

    /**
     * @type {string}
     */
    this.type = 'Pixiv Bookmark Page';

    /**
     * @type {BookmarkProvider}
     */
    this.provider;

    /**
     * @type {string}
     */
    this.responseBody = '';
  }

  /**
   * Create a bookmark downloader
   * @param {{ url: string, saveTo: string, options: object, provider: BookmarkProvider}} args
   * @returns {BookmarkDownloader}
   */
  static createDownloader({ url, saveTo, options, provider }) {
    let downloader = new BookmarkDownloader();
    downloader.id = provider.id;
    downloader.url = url;
    downloader.saveTo = saveTo;
    downloader.options = options;
    downloader.provider = provider;

    return downloader;
  }

  /**
   *
   * @param {string} body
   */
  setResponseBody(body) {
    this.responseBody = body;
  }

  /**
   * Get bookmark url using modern Pixiv API
   * @returns {string}
   */
  getBookmarkUrl() {
    // Calculate offset based on page number (48 items per page)
    const limit = 48;
    const offset = (this.options.page - 1) * limit;
    return `https://www.pixiv.net/ajax/user/self/illusts/bookmarks?tag=&offset=${offset}&limit=${limit}&rest=${this.options.rest}&lang=en`;
  }

  getArtworkUrl(id) {
    return `https://www.pixiv.net/artworks/${id}`
  }

  /**
   * Parse JSON response from modern API
   * @param {string} content
   * @return {any[]|null}
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
   * Create general artwork downloader via JSON response
   * @param {string} content
   * @returns {void}
   */
  createGeneralArtworkDownloaders(content) {
    let provider;
    const works = this.getItems(content);

    if (works && works.length > 0) {
      works.forEach(work => {
        if (work && work.id) {
          /**
           * Get target downloader provider
           */
          provider = DownloadAdapter.getProvider(this.getArtworkUrl(work.id));

          /**
           * Add downloader to download manager
           */
          this.downloadManager.addDownloader(provider.createDownloader({
            url: this.getArtworkUrl(work.id),
            saveTo: this.saveTo,
            options: this.options
          }));
        }
      });
    }
  }

  /**
   * Check if the downloader is valid
   */
  canDownload() {
    const works = this.getItems(this.responseBody);
    return works && works.length > 0;
  }

  /**
   * @returns {Promise.<void,Error>}
   */
  requestBookmarkContent() {
    this.setProcessing('_resolving_artworks');

    return new Promise((resolve, reject) => {
      this.request = new Request({
        url: this.getBookmarkUrl(),
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
          reject(Error('Response has been interrepted'));
        });
      });

      this.request.on('error', error => {
        reject(error);
      });

      this.request.on('abort', () => {
        reject(Error('Request has been interrepted'));
      });

      this.request.on('end', () => this.request = null);

      this.request.end();
    });
  }

  /**
   * Start downloader
   */
  start() {
    this.setStart();

    if (this.responseBody) {
      try {
        this.createGeneralArtworkDownloaders(this.responseBody);
        this.setFinish();
        this.downloadManager.deleteDownload({ downloadId: this.id });
      } catch(error) {
        this.setError(error);
      }
    } else {
      this.requestBookmarkContent().then(content => {
        return this.createGeneralArtworkDownloaders(content);
      }).then(() => {
        this.setFinish();
        this.downloadManager.deleteDownload({ downloadId: this.id });
      }).catch(error => {
        this.setError(error);
      });
    }
  }
}

export default BookmarkDownloader;
