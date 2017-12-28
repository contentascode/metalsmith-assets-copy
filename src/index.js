const debug = require('debug')('metalsmith-assets-copy');
const fs = require('fs-extra');
const copydir = require('copy-dir');
const moment = require('moment');
const path = require('path');
const _ = require('lodash');
const match = require('multimatch');

const getFilter = function(replace, src, dest, except) {
  return replace === 'all'
    ? function() {
        // To overwrite everything, return `true` always
        return true;
      }
    : replace === 'old'
      ? function(srcFile) {
          const destFile = resolveDestFile(srcFile, dest);
          if (fs.existsSync(destFile)) {
            const srcStat = fs.statSync(srcFile);
            const destStat = fs.statSync(destFile);
            const srcTime = moment(srcStat.mtime);
            const destTime = moment(destStat.mtime);
            return destTime.isBefore(srcTime);
          }
          return true;
        }
      : function(srcFile) {
          const destFile = resolveDestFile(srcFile, dest);
          //noinspection RedundantIfStatementJS
          if (fs.existsSync(destFile)) {
            return false;
          }
          return true;
        };
};

const resolveDestFile = function(file, dest) {
  const base = path.basename(file);
  return path.resolve(dest, base);
};

/**
 * Include static assets in a Metalsmith build
 *
 * @param {Object | Array} [options] (optional) A configuration object with one
 * or more of the following fields (all are optional). To copy from more than
 * one source or to more than one destination, pass an array of configuration
 * objects.
 *   @property {String} [src] Directory to copy files _from_. Relative paths are
 *   resolved against the Metalsmith project directory (i.e. `src` can be a
 *   sibling to the directory used as Metalsmith's source). Defaults to
 *   `./assets`.
 *   @property {String} [dest] Directory to copy files _to_. Relative paths are
 *   resolved against the directory configured via's Metalsmith `destination`
 *   function. Defaults to `.` (i.e. the same as `destination`).
 *   @property {String} [replace] Which, if any, files in the `dest` folder
 *   should be overwritten during the build process. Possible values are
 *     - 'all' (all files will be overwritten)
 *     - 'old' (files in `dest` older than their counterparts in `src` will
 *       be overwritten)
 *     - 'none' (no files in `dest` will be overwritten, but files in `src`
 *       without a counterpart will be copied to `dest`)
 *   Defaults to 'none'.
 * @returns {Function} Worker for the Metalsmith build process
 */
const plugin = function metalsmith_assets_copy(options) {
  // Make sure there is an `options` object with a `replace` property

  const { replace, overwrite = true, dereference = false, except = [] } = options;

  return function(files, metalsmith, done) {
    // Set the next function to run once we are done
    setImmediate(done);

    // Default paths, relative to Metalsmith working directory
    const defaults = {
      src: 'assets',
      dest: '.'
    };

    // Merge options and resolve src/dest paths
    const config = _.merge({}, defaults, options);
    config.src = metalsmith.path(config.src);
    config.dest = metalsmith.path(metalsmith.destination(), config.dest);

    if (replace === 'dir') {
      copydir.sync(
        config.src,
        config.dest,
        function(stat, filepath, filename) {
          // To overwrite everything, return `true` always
          // debug('filepath', filepath);
          // debug('path.relative', path.relative(config.src, filepath));
          // debug('match(filepath, except)', match(path.relative(config.src, filepath), except));
          //
          return match(path.relative(config.src, filepath), except).length === 0;
        },
        function(err) {
          if (err) {
            console.error(err);
            process.exit(1);
          }
          console.log('ok');
        }
      );
    } else {
      // Set options for `fs-extra` copy operation--options set to default are marked
      const copyOptions = {
        overwrite, // default
        errorOnExist: false, // default
        dereference, // default
        preserveTimestamps: true,
        filter: getFilter(replace, config.src, config.dest)
      };

      // Make it so!
      fs.copySync(config.src, config.dest, copyOptions);
    }
  };
};

module.exports = plugin;
