import fs from 'fs-extra';
import path from 'path';
import formatUrl from 'url';
import mime from 'mime-types';
import Request from '@/modules/Request';

/**
 * Notice that the dl-progress event is not triggered every time, review codes for detail.
 */
class Download extends Request {
  /**
   * @constructor
   * @param {Object} options
   * @param {string} options.url
   * @param {string} [options.method]
   * @param {Electron.Session} [options.session]
   * @param {string} [options.partition]
   * @param {string} [options.saveTo]
   * @param {string} [options.saveName]
   */
  constructor(options) {
    super(options);

    /**
     * @property {string}
     */
    this.saveTo = options.saveTo;

    this.saveName = options.saveName;

    /**
     * @property {number}
     */
    this.speed = 0;

    /**
     * @property {number}
     */
    this.progress = 0;

    /**
     * @property {number}
     */
    this.speedSensitivity = 100;

    /**
     * @property {number}
     */
    this.startTime = null;

    /**
     * @property {number}
     */
    this.endTime = null;

    /**
     * @type {null | number}
     */
    this.completeTime = null;
  }
//
  /**
   *
   * @param {Object} options
   * @param {Object} [listener]
   */
  static download(options, listener) {
    let download = new Download(options);

    download.download();

    return download;
  }

  /**
   * @param {string} extName
   * @returns {string}
   */
  getFilename(extName) {
    let filename = this.saveName;

    if (!filename) {
      let urlObj = formatUrl.parse(this.options.url);

      if (urlObj.pathname) {
        let parts = urlObj.pathname.split('/');

        if (parts.length > 0) {
          filename = parts[parts.length - 1];
        }
      }
    }

    filename = filename || ('file' + Date.now());

    const regex = RegExp(`\.${extName}$`);

    if (regex.test(filename)) {
      return filename;
    }

    return `${filename}.${extName}`;
  }

  download() {
    /**
     * Create folder
     */
    fs.ensureDir(this.saveTo).then(() => {
      this.startTime = Date.now();

      this.on('response', response => {
        let totalSize = 0;
        let completeSize = 0;

        if (response.headers['content-length']) {
          totalSize = response.headers['content-length'][0];
        }

        if (response.statusCode !== 200) {
          this.emit('dl-error', Error(response.statusCode));
          return;
        }

        const extName = mime.extension(response.headers['content-type'][0]);

        /**
         * Parse file name
         */
        this.saveName = this.getFilename(extName);

        let speedChunkDataLength = 0, duration = 0;

        let startTime = Date.now();

        let writeStream = fs.createWriteStream(path.join(this.saveTo, this.saveName));

        response.pipe(writeStream);

        response.on('data', data => {
          let nowTime = Date.now();

          completeSize += data.length;

          duration = nowTime - startTime;

          if (duration >= this.speedSensitivity) {
            this.speed = Math.floor(speedChunkDataLength / duration * 1000);
            this.progress = (totalSize ? Math.floor(completeSize / totalSize * 100) : 0) / 100;

            this.emit('dl-progress');

            startTime = nowTime;
            speedChunkDataLength = 0;
          } else {
            speedChunkDataLength += data.length;
          }
        });

        response.on('end', () => {
          /**
           * Close write stream
           */
          writeStream.close();
          this.speed = 0;

          this.endTime = Date.now();

          this.completeTime = this.endTime - this.startTime;

          this.progress = 1;

          this.emit('dl-finish');
        });

        response.on('error', error => {
          writeStream.close();
          this.speed = 0;

          this.emit('dl-error', error);
        });

        response.on('aborted', () => {
          writeStream.close();
          this.speed = 0;

          this.emit('dl-aborted');
        });
      });

      this.on('error', error => {
        this.emit('dl-error', error);
      });

      this.on('abort', () => {
        this.emit('dl-aborted');
      });

      console.log(this.options.url);

      /**
       * Send request to start download
       */
      this.end();
    }).catch(error => {
      this.emit('dl-error', error);
    });
  }

  getSavedFile() {
    return path.join(this.saveTo, this.saveName);
  }
}

export default Download;
