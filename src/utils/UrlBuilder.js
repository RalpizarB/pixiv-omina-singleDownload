/**
 * @class
 */
class UrlBuilder {
  /**
   * Build work request url
   * @param {number|string} id Work id from Pixiv
   * @returns {string}
   */
  static getWorkUrl(id) {
    return `https://www.pixiv.net/artworks/${id}`;
  }

  /**
   * Build work info request url
   * @param {number|string} id Work id from Pixiv
   * @returns {string}
   */
  static getWorkInfoUrl(id) {
    return `https://www.pixiv.net/ajax/illust/${id}`;
  }

  static getAccountUnreadCountUrl() {
    return 'https://www.pixiv.net/rpc/index.php?mode=message_thread_unread_count';
  }

  /**
   *
   * @param {number|string} id
   */
  static getWorkPagesUrl(id) {
    return `https://www.pixiv.net/ajax/illust/${id}/pages`;
  }

  /**
   * @returns {string}
   */
  static getUserLogoutUrl() {
    return 'https://www.pixiv.net/logout.php';
  }

  /**
   * @param {number|string} id
   * @returns {string}
   */
  static getUgoiraMetaUrl(id) {
    return `https://www.pixiv.net/ajax/illust/${id}/ugoira_meta`;
  }

  static getUserProfileAllUrl(id) {
    return `https://www.pixiv.net/ajax/user/${id}/profile/all`;
  }

  /**
   * Get bookmark URL using modern Pixiv API
   * @param {Object} params
   * @param {string} params.rest - 'show' for public, 'hide' for private bookmarks
   * @returns {string}
   */
  static getBookmarkUrl({ rest }) {
    return `https://www.pixiv.net/ajax/user/self/illusts/bookmarks?tag=&offset=0&limit=48&rest=${rest}&lang=en`;
  }
}

export default UrlBuilder;
