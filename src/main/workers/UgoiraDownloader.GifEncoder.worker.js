import Jimp from 'jimp';
import GifEncoder from 'gif-encoder';
import fs from 'fs-extra';
import Zip from 'jszip';

class UgoiraDownloaderGifEncoderWorker {
  constructor({ file, saveFile }) {
    this.file = file;

    this.saveFile = saveFile;

    this.tempFile = '';

    this.tempExtension = 'giftemp';

    this.zipObj;

    this.frames;

    this.frameIndex = 0;

    this.gifEncoder;
  }

  static run({ file, saveFile }) {
    let worker = new UgoiraDownloaderGifEncoderWorker({ file, saveFile });

    worker.prepare().then(() => {
      worker.encode();
    });
  }

  createTempFileWriteStream() {
    this.tempFile = `${this.saveFile}.${this.tempExtension}`;

    return fs.createWriteStream(this.tempFile);
  }

  renameTempFileToSaveFile() {
    fs.renameSync(this.tempFile, this.saveFile);
  }

  prepare() {
    return fs.readFile(this.file).then(buffer => {
      return Zip.loadAsync(buffer);
    }).then(zipObj => {
      this.zipObj = zipObj;

      return this.zipObj.file('animation.json').async('string');
    }).then(content => {
      this.frames = JSON.parse(content);

      return this.addFrame();
    });
  }

  encode() {
    this.gifEncoder.on('end', () => {
      this.renameTempFileToSaveFile();

      process.send({status: 'finish'});
    });

    this.gifEncoder.finish();
  }

  addFrame() {
    return new Promise(resolve => {
      const frame = this.frames[this.frameIndex];

      if (!frame) {
        resolve();
        return;
      }

      this.zipObj.file(frame.file).async('nodebuffer').then(buffer => {
        return Jimp.read(buffer);
      }).then(image => {
        if (!this.gifEncoder) {
          this.gifEncoder = new GifEncoder(image.bitmap.width, image.bitmap.height);
          this.gifEncoder.setQuality(1);

          this.gifEncoder.on('frame#stop', () => {
            process.send({
              status: 'progress',
              progress: Math.floor(this.frameIndex / this.frames.length * 100) / 100
            });
          });

          this.gifEncoder.setRepeat(0);
          this.gifEncoder.pipe(this.createTempFileWriteStream());
          this.gifEncoder.writeHeader();
        }

        this.gifEncoder.setDelay(frame.delay);
        this.gifEncoder.addFrame(Array.prototype.slice.call(image.bitmap.data, 0));

        this.frameIndex++;

        resolve(this.addFrame(this.frameIndex));
      });
    });
  }
}

process.on('message', data => {
  UgoiraDownloaderGifEncoderWorker.run({
    file: data.file,
    saveFile: data.saveFile
  });
});
