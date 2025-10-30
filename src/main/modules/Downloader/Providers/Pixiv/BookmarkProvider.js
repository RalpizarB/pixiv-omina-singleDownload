import BaseProvider from '@/modules/Downloader/Providers/Pixiv/BaseProvider';
import BookmarkDownloader from '@/modules/Downloader/WorkDownloader/Pixiv/BookmarkDownloader';

class BookmarkProvider extends BaseProvider {
  constructor({ url, context }) {
    super({ url, context });
  }

  get id() {
    return [this.providerName, 'bookmark'].join(':');
  }

  /**
   * Get bookmark url using modern Pixiv API
   * @returns {string}
   */
  static getBookmarkUrl({ rest = 'show', page = 1}) {
    // Calculate offset based on page number (48 items per page)
    const limit = 48;
    const offset = (page - 1) * limit;
    return `https://www.pixiv.net/ajax/user/self/illusts/bookmarks?tag=&offset=${offset}&limit=${limit}&rest=${rest}&lang=en`;
  }

  /**
   *
   * @returns {BookmarkProvider}
   */
  static createProvider({ rest = 'show', pages = 1}) {
    let provider = new BookmarkProvider({
      url: BookmarkProvider.getBookmarkUrl({ rest }),
      context: { rest, pages }
    });

    return provider;
  }

  /**
   *
   * @param {{ saveTo: string, options: object }} args
   * @returns {BookmarkDownloader}
   */
  createDownloader({ saveTo, options }) {
    return BookmarkDownloader.createDownloader({
      url: this.url,
      saveTo,
      options,
      provider: this
    });
  }
}

export default BookmarkProvider;
