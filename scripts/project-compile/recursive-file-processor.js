/*
   RECURSIVE-FILE-PROCESSOR.JS Applies a handler to all files within a directory

   @param initDir 
   @param fileFilter
   @param fileHandler(dir, fileName, fileContent, config)
   @param externalConfRequired	
   @param confFile 
   @param skipDirs 
*/

var fs 		= require('fs'),
	path 	= require('path'),
	process = require('process');

// ======== Auxilary =========

function include(arr, obj) {
    return (arr.indexOf(obj) != -1);
}

Array.prototype.unique = function() {
    var a = this.concat();
    for(var i=0; i<a.length; ++i) {
        for(var j=i+1; j<a.length; ++j) {
            if(a[i] === a[j])
                a.splice(j--, 1);
        }
    }

    return a;
};

// ========== Main ===========

function recursiveFileProcessor(conf) {
	var initDir 		= conf.initDir || __dirname,
		fileFilter 		= conf.fileFilter || /^_/,
		callback 		= conf.fileHandler || function() {},
		initConf		= conf.externalConfRequired ? undefined : {},
		confFile 		= conf.confFile || 'config.json',
		skipDirs		= ['node_modules'],
		initialDirFlag 	= true;

	skipDirs = skipDirs.concat(conf.skipDirs).unique();

	/*
		@param dir
		@param config
	*/
	function filesIterator(dir, config) {

		/*
			@param dir
			@param doUpPropagation Boolean
		*/
		function getConfig(dir, doUpPropagation) {
			var config;
			try {
				config = JSON.parse(
					fs.readFileSync( path.join(dir, confFile), 'utf8' )
				);
			}
			catch (e) {
				if (dir === '/' || !doUpPropagation) {
					return false
				} else {
					return getConfig( path.join(dir, '..'), doUpPropagation );
				}
			}
			return config;
		}

		function itemHandler(fileOrDir, index) {
			var fullPath = path.join(dir, fileOrDir);

			fs.stat(fullPath, function(err, stat) {
				if (err) {
					console.error('Error stating file.', err);
					process.exit(1);
				}

				if ( stat.isFile() && fileFilter.test(fileOrDir) ) {
					var fileContent = fs.readFileSync(path.join(dir, fileOrDir), 'utf8');
					console.log('   ', fileOrDir);
					callback(dir, fileOrDir, fileContent, config);
				} else if ( stat.isDirectory() && !include(skipDirs, fileOrDir) ) {
					filesIterator(path.join(dir, fileOrDir), config);
				}
			});

		}

		function dirHandler(err, files) {
			if (err) {
				console.error('Could not list the directory.', err);
				process.exit(1);
			}

			files.forEach(itemHandler);
		}


		console.log('DIRECTORY ' + dir);
		config = getConfig(dir, initialDirFlag) || config;
		if (initialDirFlag) initialDirFlag = false;
		fs.readdir(dir, dirHandler);
	}

	filesIterator(initDir, initConf);
}

module.exports = recursiveFileProcessor;