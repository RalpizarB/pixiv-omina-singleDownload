import { FormatName, GetPath } from '@/modules/Utils';

import Application from '@/Application';
import BasePlugin from '@/modules/BasePlugin';
import BaseProvider from '@/modules/Downloader/Providers/BaseProvider';
import Download from '@/modules/Download';
import DownloadAdapter from '@/modules/Downloader/DownloadAdapter';
import EventEmitter from 'events';
import NotificationManager from '@/modules/NotificationManager';
import Request from '@/modules/Request';
import RequestHeadersOverrider from '@/modules/RequestHeadersOverrider';
import ResponseHeadersOverrider from '@/modules/ResponseHeadersOverrider';
import WorkDownloader from '@/modules/Downloader/WorkDownloader';
import { debug } from '@/global';
import fs from 'fs-extra';
import md5 from 'md5';
import { parse } from 'node-html-parser';
import path from 'path';
import rimraf from 'rimraf';

class PluginManager extends EventEmitter {
  /**
   * @type {PluginManager}
   */
  static instance = null;

  /**
   * @constructor
   */
  constructor(app) {
    super();

    /**
     * @type {Application}
     */
    this.app = app;

    /**
     * @type {Map<String, BasePlugin>}
     */
    this.internalPlugins = new Map();

    /**
     * @type {Map<String, BasePlugin>}
     */
    this.externalPlugins = new Map();

    /**
     * @type {String}
     */
    this.pluginPath = path.join(GetPath.userData(), 'plugins');

    /**
     * @type {NotificationManager}
     */
    this.notificationManager = NotificationManager.getDefault();

    this.initial();
  }

  /**
   * @param {Application} [app]
   * @returns PluginManager
   */
  static getDefault(app) {
    if (PluginManager.instance === null) {
      PluginManager.instance = new PluginManager(app);
    }

    return PluginManager.instance;
  }

  /**
   * @returns void
   */
  initial() {
    this.initalPlugins();
  }

  /**
   * Initial internal plugins
   * @returns {void}
   */
  initalPlugins() {
    if (fs.pathExistsSync(this.pluginPath)) {
      let files = fs.readdirSync(this.pluginPath);

      files.forEach(file => {
        let plugin = this.loadPlugin(path.join(this.pluginPath, file));

        /**
         * Put the plugin to internal scope
         */
        this.internalPlugins.set(plugin.id, plugin);
      });
    }
  }

  /**
   * Load plugin from entry point
   * @param {String} entry
   * @returns {BasePlugin}
   * @throws {Error}
   */
  loadPlugin(entry) {
    let pluginMainFile = '';

    if (fs.existsSync(entry) && fs.lstatSync(entry).isDirectory()) {
      pluginMainFile = path.join(entry, 'main.js');

      if (fs.existsSync(pluginMainFile) && fs.lstatSync(pluginMainFile).isFile) {
        return this.createPlugin(pluginMainFile);
      }
    }

    throw new Error(`Cannot load plugin from entry ${entry}`);
  }

  /**
   * @param {string} file
   * @returns {BasePlugin}
   */
  createPlugin(file) {
    if (__non_webpack_require__.cache[file]) {
      delete __non_webpack_require__.cache[file];
    }

    let module = __non_webpack_require__(file),
        plugin = this.bootPlugin(module, file);

    return plugin;
  }

  /**
   * @param {any} plugin
   * @param {String} file
   * @returns {any}
   */
  bootPlugin(plugin, file) {
    try {
      let pluginInstance = plugin({
        app: this.app,
        utils: {
          GetPath,
          FormatName,
          md5,
          parse,
          debug
        },
        classes: {
          BasePlugin,
          BaseProvider,
          WorkDownloader,
          Request,
          Download
        }
      });

      pluginInstance.providerName = pluginInstance.entryFile = file;
      pluginInstance.id = md5(path.dirname(file));

      if (!pluginInstance.title) {
        pluginInstance.title = file;
      }

      DownloadAdapter.extendMap({
        provider: pluginInstance,
        patterns: pluginInstance.patterns
      });

      if (typeof pluginInstance.requestHeadersOverrider === 'function' &&
          pluginInstance.requestUrlPatterns
      ) {
        RequestHeadersOverrider.getDefault().extendMap({
          id: pluginInstance.id,
          patterns: pluginInstance.requestUrlPatterns,
          requestHeaders: pluginInstance.requestHeadersOverrider
        });
      }

      if (typeof pluginInstance.responseHeadersOverrider === 'function' &&
          pluginInstance.responseUrlPatterns
      ) {
        ResponseHeadersOverrider.getDefault().extendMap({
          id: pluginInstance.id,
          patterns: pluginInstance.responseUrlPatterns,
          responseHeaders: pluginInstance.responseHeadersOverrider
        });
      }

      return pluginInstance;
    } catch (error) {
      this.notificationManager
          .createNotification({ title: `Unable to boot plugin. Boot file: ${file}` })
          .show();
      debug.log(error);
    }
  }

  /**
   *
   * @param {BasePlugin} plugin
   */
  isExternalPlugin(plugin) {
    return this.externalPlugins.has(plugin.id);
  }

  /**
   * Get internal plugins
   * @returns {BasePlugin[]}
   */
  getInternalPlugins() {
    return Array.from(this.internalPlugins.values());
  }

  /**
   * Get external plugins
   * @returns {BasePlugin[]}
   */
  getExternalPlugins() {
    return Array.from(this.externalPlugins.values());
  }

  /**
   * Get plugin instance
   * @param {String} id
   * @returns {any|null}
   */
  getPlugin(id) {
    if (this.internalPlugins.has(id)) {
      return this.internalPlugins.get(id);
    } else if (this.externalPlugins.has(id)) {
      return this.externalPlugins.get(id);
    } else {
      return null;
    }
  }

  /**
   * Reload plugin
   * @param {string} id
   * @throws {Error}
   */
  reloadPlugin(id) {
    let plugin;

    if (typeof id === 'string') {
      plugin = this.getPlugin(id);
    }

    if (plugin) {
      plugin.uninstall();

      let reloadedPlugin = this.createPlugin(plugin.entryFile);

      this.updatePluginInstance(id, reloadedPlugin);

      return reloadedPlugin;
    } else {
      throw new Error('_unable_to_reload_plugin');
    }
  }

  /**
   * Remove a plugin via its id
   * @param {String} id Plugin's id
   * @returns {void}
   */
  removePlugin(id) {
    let plugin;

    if (this.internalPlugins.has(id)) {
      plugin = this.internalPlugins.get(id);
      this.internalPlugins.delete(id);
      this.uninstallPlugin(plugin);
    } else if (this.externalPlugins.has(id)) {
      plugin = this.externalPlugins.get(id);
      this.externalPlugins.delete(id);
    } else {
      debug.log(`There isn't plugin [id] to remove`);
    }

    plugin.uninstall();
  }

  /**
   * Load a plugin temprarily
   * @param {String} entry Plugin entry folder
   * @returns {void}
   */
  loadTemporaryPlugin(entry) {
    let plugin = this.loadPlugin(entry);

    if (plugin) {
      /**
       * Put the plugin to external scope
       */
      this.externalPlugins.set(plugin.id, plugin);
    }
  }

  /**
   * Update plugin's instance in the scope
   * @param {String} id
   * @param {BasePlugin} plugin
   * @param {string} scope
   * @returns {void}
   */
  updatePluginInstance(id, plugin, scope = 'internal') {
    if (this.internalPlugins.has(id)) {
      this.internalPlugins.set(id, plugin);
    } else if (this.externalPlugins.has(id)) {
      this.externalPlugins.set(id, plugin);
    } else {
      if (scope === 'internal') {
        this.internalPlugins.set(id, plugin);
      } else if (scope === 'external') {
        this.externalPlugins.set(id, plugin);
      }
    }
  }

  /**
   * Install a plugin.
   * @param {string} entry File or Folder
   */
  installPlugin(entry) {
    let installationFolder = path.join(GetPath.userData(), 'plugins', md5(entry).toUpperCase());

    /**
     * Copy folder to plugin folder
     */
    if (fs.existsSync(entry) && fs.lstatSync(entry).isDirectory()) {
      fs.copySync(entry, installationFolder);
    }

    try {
      let plugin = this.loadPlugin(installationFolder);
      this.updatePluginInstance(plugin.id, plugin, 'internal');
    } catch (e) {
      this.deletePluginAssets(installationFolder);
      throw e;
    }
  }

  /**
   * Uninstall a plugin
   * @param {BasePlugin} plugin Plugin instance
   * @returns {void}
   */
  uninstallPlugin(plugin) {
    this.deletePluginAssets(path.dirname(plugin.entryFile));
  }

  /**
   * Delete plugin's assets
   * @param {string} pluginPath
   */
  deletePluginAssets(pluginPath) {
    rimraf(pluginPath, () => {});
  }
}

export default PluginManager;
