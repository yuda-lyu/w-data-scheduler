import rollupFiles from 'w-package-tools/src/rollupFiles.mjs'
import getFiles from 'w-package-tools/src/getFiles.mjs'


let fdSrc = './src'
let fdTar = './dist'


rollupFiles({
    fns: 'WDataScheduler.mjs',
    fdSrc,
    fdTar,
    // nameDistType: 'kebabCase',
    hookNameDist: () => {
        return 'w-data-scheduler'
    },
    globals: {
        'path': 'path',
        'fs': 'fs',
        'url': 'url',
        'pino': 'pino',
        'events': 'events',
        'chokidar': 'chokidar',
    },
    external: [
        'path',
        'fs',
        'url',
        'pino',
        'events',
        'chokidar',
    ],
})

