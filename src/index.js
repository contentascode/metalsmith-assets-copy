const debug = require('debug')('metalsmith-assets-copy');
const fs = require('fs-extra');
const copydir = require('copy-dir');
const moment = require('moment');
const path = require('path');
const match = require('multimatch');

const getFilter = function(replace, except, srcPath) {
  debug('filter', { replace, except, srcPath });
  return replace === 'all'
    ? src => {
        // debug('path.relative(srcPath, src)', path.relative(srcPath, src));
        return match(path.relative(srcPath, src), except).length === 0;
      }
    : replace === 'old'
      ? (src, dest) => {
          // const destFile = resolveDestFile(srcFile, dest);
          if (fs.existsSync(dest)) {
            const srcStat = fs.statSync(src);
            const destStat = fs.statSync(dest);
            const srcTime = moment(srcStat.mtime);
            const destTime = moment(destStat.mtime);
            return destTime.isBefore(srcTime);
          }
          return match(path.relative(src, srcPath), except).length === 0;
        }
      : (src, dest) => (fs.existsSync(dest) ? false : match(path.relative(src, srcPath), except).length === 0);
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

  const { replace, overwrite = true, dereference = true, except = [] } = options;

  return function(files, metalsmith, done) {
    // Set the next function to run once we are done
    // setImmediate(done);

    // Default paths, relative to Metalsmith working directory
    const defaults = {
      src: 'assets',
      dest: '.'
    };

    // Merge options and resolve src/dest paths
    const config = Object.assign(defaults, options);
    config.src = metalsmith.path(config.src);
    config.dest = metalsmith.path(metalsmith.destination(), config.dest);

    debug('config.src', config.src);
    debug('config.dest', config.dest);

    // src <String>
    // dest <String> Note that if src is a file, dest cannot be a directory (see issue #323).
    // options <Object>
    //  - overwrite <boolean>: overwrite existing file or directory, default is true. Note that the copy operation will silently fail if you set this to false and the destination exists. Use the errorOnExist option to change this behavior.
    //  - errorOnExist <boolean>: when overwrite is false and the destination exists, throw an error. Default is false.
    //  - dereference <boolean>: dereference symlinks, default is false.
    //  - preserveTimestamps <boolean>: will set last modification and access times to the ones of the original source files, default is false.
    //  - filter <Function>: Function to filter copied files. Return true to include, false to exclude. Can also return a Promise that resolves to true or false (or pass in an async function).

    // Make it so!
    // Set options for `fs-extra` copy operation--options set to default are marked
    const copyOptions = {
      overwrite: replace === 'all', // default
      errorOnExist: false, // default
      dereference, // default
      preserveTimestamps: false,
      filter: getFilter(replace, except, config.src)
    };

    fs.copy(config.src, config.dest, copyOptions, done);
  };
};

module.exports = plugin;
