class FormatName {
  static format(renameFormat, context) {
    let specials = {
      win: {
        illegals: [
          '<', '>', ':', '"', '/', '\\', '|', '?', '*'
        ],
        /**
        illegalNames: [
          "con","aux","nul","prn","com0","com1","com2","com3","com4","com5","com6","com7","com8","com9","lpt0","lpt1","lpt2","lpt3","lpt4","lpt5","lpt6","lpt7","lpt8","lpt9"
        ],
        */
        max: 200 // full path limitation is 258
      },
      linux: {
        illegals: [
          '/', /** not suggest to use */ '@', '#', '$', '&', '\'',
        ],
        max: 256
      },
      unix: {
        illegals: [
          '/', ' '
        ],
        max: 256
      }
    };

    let filename = '';

    function getContextMetaValue(context, key) {
      var metas = {
        id: {
          key: 'illustId',
          possibleKeys: ['illustId', 'novelId']
        },
        title: {
          key: 'illustTitle',
          possibleKeys: ['illustTitle', 'novelTitle']
        },
        user_name: {
          key: 'userName',
          possibleKeys: ['userName', 'illustAuthor']
        },
        user_id: {
          key: 'userId',
          possibleKeys: ['userId', 'illustAuthorId']
        },
        page_num: {
          key: 'pageNum',
          possibleKeys: ['pageNum']
        }
      };

      let meta = metas[key];

      if (!meta) {
        return;
      }

      var keys = meta.possibleKeys;

      for (var i = 0, l = keys.length; i < l; i++) {
        if (context[keys[i]] !== undefined) {
          return context[keys[i]];
        }
      }

      return 'undefined';
    }

    fallback += '';

    if (!renameFormat) {
      filename = fallback;
    } else {
      var matches = renameFormat.match(/%[a-z]+%/ig);
      var name = renameFormat;

      if (matches && matches.length > 0) {
        matches.forEach(function (match) {
          var key = match.slice(1, -1);
          var val = getContextMetaValue(context, key);

          if (val !== undefined) {
            name = name.replace(match, val);
          }
        });
      }

      filename = !!name ? name : fallback;
    }

    /**
     * use merged platform rule to filter filename.
     **/
    let rule = specials.win;
    let illegalChars = specials.win.illegals.concat(specials.linux.illegals, specials.unix.illegals);

    illegalChars.forEach(char => {
      filename = filename.replace(char, '_');
    });

    filename = filename.substr(0, rule.max);

    return filename;
  }
}

export default FormatName;
