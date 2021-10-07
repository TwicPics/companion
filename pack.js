/* eslint-disable no-console */
import CleanCSS from "clean-css";
import { copy, remove } from "fs-extra";
import { minify as minifyHTML } from "html-minifier";
import { minify as minifyJS } from "terser";
import { readFile, writeFile } from "fs/promises";
import { dirname, extname, relative, resolve } from "path";
import { zip } from "zip-a-folder";
import { exec } from "child_process";

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
    "safari": `safari`,
};

/**
 * executes a shell command and return it as a Promise.
 * @param cmd {string}
 * @return {Promise<string>}
 */
function execShellCommand( cmd ) {
    return new Promise( resolvePromise => {
        exec( cmd, ( error, stdout, stderr ) => {
            if ( error ) {
                console.warn( error );
            }
            resolvePromise( stdout || stderr );
        } );
    } );
}

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
    const dir = resolve( distDir, browserName );
    const browserConfig = browsers[ browserName ];
    if ( browserConfig === `chrome` ) {
        await handleBrowser( browserConfig );
        const parentDir = resolve( distDir, browserConfig );
        await Promise.all( [
            copy( parentDir, dir ),
            copy( `${ parentDir }.zip`, `${ dir }.zip` ),
        ] );
    } else if ( browserConfig === `safari` ) {
        // shell command to convert extension to safari
        let command = `xcrun safari-web-extension-converter built/ --app-name safari --project-location dist/ \
        --no-open`;
        await execShellCommand( command ).then( () => {
            console.log( `Extension converted to safari` );
        } ).catch( err => {
            console.warn( err );
        } );

        // https://stackoverflow.com/questions/60148692/what-xcodebuild-commands-are-executed-when-i-run-product-archive-in-xcode
        // https://medium.com/xcblog/xcodebuild-deploy-ios-app-from-command-line-c6defff0d8b8

        // build
        // xcodebuild -scheme "safari (macOS)" build

        // archive
        // xcodebuild -scheme "safari (macOS)" archive
        // xcodebuild archive -project safari.xcodeproj -scheme "safari (macOS)" -archivePath /dist/safari

        // export (base command)
        // xcodebuild -exportArchive -archivePath <xcarchivepath> -exportPath <destinationpath> -exportOptionsPlist <path>

        command = `cd dist/safari;xcodebuild -scheme "safari (macOS)" build`;
        await execShellCommand( command ).then( () => {
            console.log( `Extension built for safari` );
        } ).catch( err => {
            console.warn( err );
        } );
        await zip( dir, `${ dir }.zip` );

    } else {
        await copy( builtDir, dir, {
            "filter": async ( src, dest ) => {
                const transform = browserConfig[ relative( builtDir, src ) ] ?? browserConfig[ `*${ extname( src ) }` ];
                if ( transform ) {
                    await writeFile( dest, await transformCache( transform )( src ) );
                    return false;
                }
                return ( transform !== false );
            },
        } );
        await zip( dir, `${ dir }.zip` );
    }
    console.log( `${ browserName } handled in ${ Date.now() - start }ms` );
} );

await remove( `dist` );
await Promise.all( Object.keys( browsers ).map( handleBrowser ) );
