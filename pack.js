/* eslint-disable no-console */
import CleanCSS from "clean-css";
import { copy, remove } from "fs-extra";
import { dirname, extname, relative, resolve } from "path";
import { exec } from "child_process";
import { homedir } from "os";
import { minify as minifyHTML } from "html-minifier";
import { minify as minifyJS } from "terser";
import { mkdir, readdir, readFile, writeFile } from "fs/promises";
import { zip } from "zip-a-folder";

const execShellCommand = cmd => new Promise( ( ok, nok ) => {
    exec( cmd, ( error, stdout, stderr ) => {
        if ( error ) {
            nok( error );
        } else {
            ok( {
                stdout,
                stderr,
            } );
        }
    } );
} );

const baseDir = dirname( new URL( ``, import.meta.url ).pathname );
const builtDir = resolve( baseDir, `built` );
const distDir = resolve( baseDir, `dist` );

const defaultBrowserConfig = {
    "*.css": buffer => new CleanCSS().minify( buffer.toString() ).styles,
    "*.html": buffer => minifyHTML( buffer.toString(), {
        "collapseBooleanAttributes": true,
        "collapseWhitespace": true,
        "continueOnParseError": true,
        "decodeEntities": true,
        "minifyURLs": true,
        "removeAttributeQuotes": true,
        "removeComments": true,
        "removeEmptyAttributes": true,
        "removeOptionalTags": true,
        "removeRedundantAttributes": true,
        "sortAttributes": true,
        "sortClassName": true,
        "useShortDoctype": true,
    } ),
    "*.js": async buffer => ( await minifyJS( buffer.toString(), {
        "module": true,
    } ) ).code,
    "*.json": buffer => JSON.stringify( JSON.parse( buffer.toString() ) ),
};

const browsers = {
    "chrome": {
        ...defaultBrowserConfig,
        "manifest.json": manifestBuffer => JSON.stringify( {
            ...JSON.parse( manifestBuffer.toString() ),
            "browser_specific_settings": undefined,
        } ),
    },
    "edge": `chrome`,
    "firefox": defaultBrowserConfig,
    "opera": `chrome`,
    "safari": ( process.platform === `darwin` ) ? [
        `chrome`,
        async ( chromeDir, safariDir ) => {
            // utility to get XCode builds
            const rTC = /^twicpics-companion-/;
            const baseBuildDir = `${ homedir() }/Library/Developer/XCode/DerivedData`;
            const getBuildDirs = () => readdir( baseBuildDir ).then(
                files => files.flatMap( file => ( rTC.test( file ) ? [ resolve( baseBuildDir, file ) ] : [] ) )
            );
            await mkdir( safariDir );
            // converts chrome extension to safari
            await execShellCommand( `xcrun safari-web-extension-converter ${
                chromeDir
            } --app-name twicpics-companion --project-location ${
                safariDir
            } --copy-resources --no-open` );
            // cleans up previously built ones
            await Promise.all( ( await getBuildDirs() ).map( dir => remove( dir ) ) );
            // builds safari extension
            await execShellCommand( `cd ${
                safariDir
            }/twicpics-companion; xcodebuild -scheme "twicpics-companion (macOS)" build -configuration Release` );
            // get build dir
            const [ buildDir ] = await getBuildDirs();
            // cleans safari folder and re-creates it
            await remove( safariDir );
            await mkdir( safariDir );
            // copies extension
            await copy(
                resolve( buildDir, `Build/Products/Release/twicpics-companion.app` ),
                resolve( safariDir, `twicpics-companion.app` )
            );
            // tells it's handled
            return true;
        },
    ] : console.warn( `You need to be on a MacOS machine to build the Safari extension.` ),
};

const cacheFactory = create => {
    const map = new Map();
    return key => {
        if ( map.has( key ) ) {
            return map.get( key );
        }
        const value = create( key );
        map.set( key, value );
        return value;
    };
};

const getSource = cacheFactory( readFile );
const transformCache = cacheFactory( transform => cacheFactory( src => getSource( src ).then( transform ) ) );

const handleBrowser = cacheFactory( async browserName => {
    const start = Date.now();
    try {
        const dir = resolve( distDir, browserName );
        let browserData = browsers[ browserName ];
        if ( !browserData ) {
            return;
        }
        if ( !Array.isArray( browserData ) ) {
            browserData = [ browserData ];
        }
        const [ browserConfig, postHandler ] = browserData;
        if ( typeof browserConfig === `string` ) {
            await handleBrowser( browserConfig );
            const parentDir = resolve( distDir, browserConfig );
            const handled = postHandler && await postHandler( parentDir, dir );
            if ( !handled ) {
                await Promise.all( [
                    copy( parentDir, dir ),
                    copy( `${ parentDir }.zip`, `${ dir }.zip` ),
                ] );
            }
        } else {
            await copy( builtDir, dir, {
                "filter": async ( src, dest ) => {
                    const transform =
                        browserConfig[ relative( builtDir, src ) ] ?? browserConfig[ `*${ extname( src ) }` ];
                    if ( transform ) {
                        await writeFile( dest, await transformCache( transform )( src ) );
                        return false;
                    }
                    return ( transform !== false );
                },
            } );
            await zip( dir, `${ dir }.zip` );
        }
    } catch ( e ) {
        console.log( `something went wrong handling ${ browserName }: ${ e }` );
    }
    console.log( `${ browserName } handled in ${ Date.now() - start }ms` );
} );

await remove( `dist` );
await Promise.all( Object.keys( browsers ).map( handleBrowser ) );
