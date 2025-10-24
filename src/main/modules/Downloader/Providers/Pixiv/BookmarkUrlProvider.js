import BaseProvider from './BaseProvider';
import BookmarkUrlDownloader from '../../WorkDownloader/Pixiv/BookmarkUrlDownloader';

/**
 * Provider for handling bookmark URLs with user IDs
 * Example URLs:
 * - https://www.pixiv.net/en/users/18556068/bookmarks/artworks
 * - https://www.pixiv.net/users/18556068/bookmarks/artworks
 */
class BookmarkUrlProvider extends BaseProvider {
  constructor({ url, context }) {
    super({ url, context });
  }

  /**
   * Create a bookmark URL provider
   * @param {object} options
   * @param {string} options.url
   * @param {object} options.context
   * @param {string|number} options.context.userId - User ID from the bookmark URL
   * @param {string} options.context.rest - 'show' for public bookmarks
   * @returns {BookmarkUrlProvider}
   */
  static createProvider({ url, context }) {
    return new BookmarkUrlProvider({ url, context });
  }

  /**
   * @returns {string}
   */
  get id() {
    return [this.providerName, 'bookmark-url', this.context.userId].join(':');
  }

  /**
   * Create a bookmark URL downloader
   * @param {{ saveTo: string, options: object }} args
   * @returns {BookmarkUrlDownloader}
   */
  createDownloader({ saveTo, options }) {
    return BookmarkUrlDownloader.createDownloader({
      url: this.url,
      saveTo,
      options: {
        ...options,
        userId: this.context.userId,
        rest: this.context.rest || 'show' // Public bookmarks by default
      },
      provider: this
    });
  }
}

export default BookmarkUrlProvider;
