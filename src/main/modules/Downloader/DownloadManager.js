import EventEmitter from 'events';
import WorkDownloader from '@/modules/Downloader/WorkDownloader';
import {
  debug
} from '@/global';
import fs from 'fs-extra';
import { shell } from 'electron';

/**
 * @class
 */
class DownloadManager extends EventEmitter {
  constructor() {
    super();

    /**
     * @property
     * @type {Map<number|string, WorkDownloader>}
     */
    this.workDownloaderPool = new Map();

    /**
     * @property
     * @type {Map<number|string, WorkDownloader>}
     */
    this.attachedListenersDownloaders = new Map();

    /**
     * Maximum number of multi-image downloads (manga/comic) that can run simultaneously
     * @property
     * @type {number}
     */
    this.maxMultiImageDownloading = 1;

    /**
     * Maximum number of single-image downloads that can run simultaneously
     * @property
     * @type {number}
     */
    this.maxSingleImageDownloading = 3;

    /**
     * @deprecated Use maxMultiImageDownloading and maxSingleImageDownloading instead
     * @property
     * @type {number}
     */
    this.maxDownloading = 1;
  }

  static instance = null;

  /**
   * @returns {DownloadManager}
   */
  static getManager() {
    if (!DownloadManager.instance) {
      DownloadManager.instance = new DownloadManager();
    }

    return DownloadManager.instance;
  }

  /**
   * Alias for getManager
   * @returns {DownloadManager}
   */
  static getDefault() {
    return DownloadManager.getManager();
  }

  /**
   * @param {number|string} id
   * @returns {WorkDownloader}
   */
  static getWorkDownloader(id) {
    return DownloadManager.instance.getWorkDownloader(id);
  }

  /**
   * @param {WorkDownloader} downloader
   * @returns {void}
   * @deprecated
   */
  addWorkDownloader(downloader) {
    this.workDownloaderPool.set(downloader.id, downloader);
    this.emit('add', downloader);
    this.startWorkDownloader({ downloadId: downloader.id });
  }

  /**
   * Add a downloader to download manager
   * @param {WorkDownloader} downloader
   */
  addDownloader(downloader) {
    if (!this.workDownloaderPool.has(downloader.id)) {
      this.attachListenersToDownloader(downloader);
      this.workDownloaderPool.set(downloader.id, downloader);
      this.emit('add', downloader);
      this.startWorkDownloader({ downloadId: downloader.id });
    }
  }

  /**
   * @param {WorkDownloader} downloader
   * @returns {void}
   */
  transformWorkDownloader(downloader) {
    let oldDownloader = this.getWorkDownloader(downloader.id);

    this.deattachListenersFromDownloader(oldDownloader);

    this.attachListenersToDownloader(downloader);
    this.workDownloaderPool.set(downloader.id, downloader);
    this.emit('update', downloader);

    this.startWorkDownloader({ downloadId: downloader.id });

    if (oldDownloader) {
      oldDownloader = null;
    }
  }

  /**
   * Add multiple downloaders to download manager
   * @param {Array.<WorkDownloader>} downloaders
   * @param {Object} [options]
   * @param {Boolean} [options.mute=false]
   * @param {Boolean} [options.autoStart=false]
   * @param {WorkDownloader} [options.replace=null]
   * @returns {void}
   */
  addDownloaders(downloaders, options) {
    const { mute, autoStart, replace } = Object.assign({mute: false, autoStart: false, replace: null}, options);

    let addedDownloaders = [];
    let addedDownloadersMap = new Map();

    downloaders.forEach(downloader => {
      if (!this.getWorkDownloader(downloader.id)) {
        this.attachListenersToDownloader(downloader);
        addedDownloadersMap.set(downloader.id, downloader);
        addedDownloaders.push(downloader);
      }
    });

    if (replace && this.getWorkDownloader(replace.id)) {
      let beforeReplaceDownloadersMap = new Map();
      let afterReplaceDownloadersMap = new Map();
      let found = false;

      this.workDownloaderPool.forEach((downloader, id) => {
        if (id !== replace.id) {
          if (found) {
            afterReplaceDownloadersMap.set(id, downloader);
          } else {
            beforeReplaceDownloadersMap.set(id, downloader);
          }
        } else {
          this.emit('delete', id);
          this.workDownloaderPool.delete(id);
          found = true;
        }
      });

      this.workDownloaderPool = new Map([
        ...beforeReplaceDownloadersMap,
        ...addedDownloadersMap,
        ...afterReplaceDownloadersMap
      ]);
    } else {
      this.workDownloaderPool = new Map([
        ...this.workDownloaderPool,
        ...addedDownloadersMap
      ]);
    }

    if (!mute) this.emit('add-batch', addedDownloaders);

    if (autoStart) {
      this.downloadNext();
    }
  }

  /**
   * Check if a downloader has multiple images (manga/comic)
   * @param {WorkDownloader} workDownloader
   * @returns {boolean}
   */
  isMultiImageDownload(workDownloader) {
    // Check if the downloader has an images array with more than 1 image
    if (workDownloader.images && Array.isArray(workDownloader.images)) {
      return workDownloader.images.length > 1;
    }
    
    // Check context for pageCount (available for manga/illustration before images are loaded)
    if (workDownloader.context && workDownloader.context.pageCount) {
      return workDownloader.context.pageCount > 1;
    }
    
    // Fallback: check if it's already started and has a total property
    if (workDownloader.toJSON) {
      const data = workDownloader.toJSON();
      if (data.total !== undefined && data.total > 1) {
        return true;
      }
    }
    
    return false;
  }

  reachMaxDownloading() {
    let multiImageDownloadingCount = 0;
    let singleImageDownloadingCount = 0;

    this.workDownloaderPool.forEach(workDownloader => {
      if (workDownloader.isDownloading() || workDownloader.isProcessing()) {
        if (this.isMultiImageDownload(workDownloader)) {
          multiImageDownloadingCount++;
        } else {
          singleImageDownloadingCount++;
        }
      }
    });

    // Return true if either limit is reached
    return multiImageDownloadingCount >= this.maxMultiImageDownloading ||
           singleImageDownloadingCount >= this.maxSingleImageDownloading;
  }

  /**
   * Find next downloader and start download.
   * @returns {void}
   */
  downloadNext() {
    if (this.workDownloaderPool.size < 1) {
      return;
    }

    let nextWorkDownloader;

    this.workDownloaderPool.forEach(workDownloader => {
      if (!nextWorkDownloader && workDownloader.isPending()) {
        nextWorkDownloader = workDownloader;
      }
    });

    if (nextWorkDownloader) {
      this.startWorkDownloader({
        downloadId: nextWorkDownloader.id
      });

      if (!this.reachMaxDownloading()) {
        this.downloadNext();
      }
    }
  }

  /**
   * @param {Object} args
   * @param {WorkDownloader} args.downloader
   */
  workDownloaderStartHandler({ downloader }) {
    this.emit('update', downloader);
  }

  /**
   * @param {Object} args
   * @param {WorkDownloader} args.downloader
   */
  workDownloaderStopHandler({ downloader }) {
    /**
     * Make sure the downloader is exists then fire the update event
     * Because this listener can be called by a delete operation
     */
    if (this.workDownloaderPool.has(downloader.id)) {
      this.emit('stop', downloader);
    }
  }

  /**
   * @param {Object} args
   * @param {WorkDownloader} args.downloader
   */
  workDownloaderProgressHandler({ downloader }) {
    if (this.getWorkDownloader(downloader.id)) {
      this.emit('update', downloader);
    }
  }

  /**
   * @param {Object} args
   * @param {WorkDownloader} args.downloader
   */
  workDownloaderErrorHandler({ downloader }) {
    this.emit('update', downloader);

    this.downloadNext();
  }

  /**
   * @param {Object} args
   * @param {WorkDownloader} args.downloader
   */
  workDownloaderFinishHandler({ downloader }) {
    this.emit('update', downloader);

    this.emit('finish', downloader);

    this.downloadNext();
  }

  /**
   * @param {WorkDownloader} workDownloader
   */
  attachListenersToDownloader(workDownloader) {
    /**
     * Prevent listeners attach to downloader multiple times
     */
    if (this.attachedListenersDownloaders.has(workDownloader.id)) {
      return;
    }

    workDownloader.on('start', this.workDownloaderStartHandler.bind(this));
    workDownloader.on('stop', this.workDownloaderStopHandler.bind(this));
    workDownloader.on('progress', this.workDownloaderProgressHandler.bind(this));
    workDownloader.on('error', this.workDownloaderErrorHandler.bind(this));
    workDownloader.on('finish', this.workDownloaderFinishHandler.bind(this));
  }

  /**
   * @param {WorkDownloader} workDownloader
   */
  deattachListenersFromDownloader(workDownloader) {
    workDownloader.removeAllListeners('start');
    workDownloader.removeAllListeners('stop');
    workDownloader.removeAllListeners('progress');
    workDownloader.removeAllListeners('error');
    workDownloader.removeAllListeners('finish');

    /**
     * Remove downloader from the attachedListenersDownloaders to make sure the listeners can
     * attache to the downloader again
     */
    this.attachedListenersDownloaders.delete(workDownloader.id);
  }

  /**
   * Get all downloader
   */
  getAllDownloader()
  {
    return this.workDownloaderPool;
  }

  canStartDownload(download) {
    return ['finish', 'stopping', 'downloading', 'processing'].indexOf(download.state) < 0;
  }

  /**
   * Check if we can start a specific downloader based on current download limits
   * @param {WorkDownloader} workDownloader
   * @returns {boolean}
   */
  canStartSpecificDownload(workDownloader) {
    let multiImageDownloadingCount = 0;
    let singleImageDownloadingCount = 0;
    
    const isMultiImage = this.isMultiImageDownload(workDownloader);

    this.workDownloaderPool.forEach(wd => {
      if ((wd.isDownloading() || wd.isProcessing()) && wd.id !== workDownloader.id) {
        if (this.isMultiImageDownload(wd)) {
          multiImageDownloadingCount++;
        } else {
          singleImageDownloadingCount++;
        }
      }
    });

    // Check if starting this downloader would exceed limits
    if (isMultiImage) {
      return multiImageDownloadingCount < this.maxMultiImageDownloading;
    } else {
      return singleImageDownloadingCount < this.maxSingleImageDownloading;
    }
  }

  /**
   * @param {Object} param
   * @param {number|string} param.downloadId
   * @param {boolean} param.reset
   */
  startWorkDownloader({downloadId, reset}) {
    let workDownloader = this.getWorkDownloader(downloadId);

    if (workDownloader && this.canStartDownload(workDownloader)) {

      if (reset) {
        workDownloader.reset();
      }

      if (this.canStartSpecificDownload(workDownloader)) {
        workDownloader.start();
      } else {
        workDownloader.setPending();
        this.emit('update', workDownloader);
      }
    }
  }

  /**
   * Once stop a download, try to start next avaliable download
   * @param {Object} param
   * @param {number|string} param.downloadId
   */
  stopWorkDownloader({downloadId}) {
    let workDownloader = this.getWorkDownloader(downloadId);

    if (workDownloader && workDownloader.isStoppable()) {
      workDownloader.stop();
    }

    this.downloadNext();
  }

  /**
   * Delete download using given download id, then try restart downloads
   * @param {Object} param
   * @param {number|string} param.downloadId//
   */
  deleteWorkDownloader({downloadId}) {
    let workDownloader = this.getWorkDownloader(downloadId);

    if (workDownloader && !workDownloader.isStopping()) {
      this.workDownloaderPool.delete(downloadId);

      workDownloader.willRecycle();

      workDownloader.stop();
    }

    this.deattachListenersFromDownloader(workDownloader);

    this.emit('delete', downloadId);

    this.downloadNext();
  }

  /**
   * Alias for deleteWorkDownloader
   * @param {{ downloadId: string }} args
   */
  deleteDownload({ downloadId }) {
    this.deleteWorkDownloader({ downloadId });
  }

  /**
   * @param {Object} param
   * @param {Array} param.downloadIds
   */
  deleteDownloads({downloadIds}) {
    let deletedDownloadIds = [];

    downloadIds.forEach(downloadId => {
      let download = this.getWorkDownloader(downloadId);

      if (download && !download.isStopping()) {
        this.workDownloaderPool.delete(downloadId);

        deletedDownloadIds.push(download.id);

        download.willRecycle();

        download.stop({
          mute: true
        });

        download = null;
      }
    });

    this.emit('delete-batch', deletedDownloadIds);
  }

  /**
   * Once stop downloads, try to start next avaliable download
   * @param {Object} param
   * @param {Array} param.downloadIds
   */
  stopDownloads({downloadIds}) {
    let stoppedDownloadIds = [];

    downloadIds.forEach(downloadId => {
      let download = this.getWorkDownloader(downloadId);

      if (download) {
        try {
          download.stop({
            mute: true
          });

          stoppedDownloadIds.push(download.id);
        } catch (error) {
          if (error.name === 'WorkDownloaderUnstoppableError') {
            debug.sendStatus(`Download ${download.id} cannot be stopped`);
          } else {
            debug.sendStatus(`Download ${download.id} error ${error.message}`)
          }
        }
      }
    });

    this.emit('stop-batch', stoppedDownloadIds);

    this.downloadNext();
  }

  /**
   * @param {Object} param
   * @param {number|string} param.downloadId
   */
  openFolder({downloadId}) {
    let downloader = this.getWorkDownloader(downloadId);

    if (downloader) {
      shell.showItemInFolder(downloader.savedTarget);
    }
  }

  /**
   * @param {number|string} id
   * @returns {WorkDownloader}
   */
  getWorkDownloader(id) {
    if (this.workDownloaderPool.has(id)) {
      return this.workDownloaderPool.get(id);
    }

    return null;
  }
}

export default DownloadManager;
