/* eslint-disable no-console */
import { basename, dirname, extname, relative, resolve } from "path";
import CleanCSS from "clean-css";
import { copy, remove } from "fs-extra";
import { exec } from "child_process";
import { minify as minifyHTML } from "html-minifier";
import { minify as minifyJS } from "terser";
import { readFile, writeFile } from "fs/promises";
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
            // converts chrome extension to safari
            await execShellCommand( `xcrun safari-web-extension-converter ${
                chromeDir
            } --app-name ${
                basename( safariDir )
            } --project-location ${
                dirname( safariDir )
            } --copy-resources --no-open` );
            // builds safari extension
            await execShellCommand( `cd ${ safariDir };xcodebuild -scheme "safari (macOS)" build` );
            // tells it's handled
            return true;
            // eslint-disable-next-line max-len
            // https://stackoverflow.com/questions/60148692/what-xcodebuild-commands-are-executed-when-i-run-product-archive-in-xcode
            // https://medium.com/xcblog/xcodebuild-deploy-ios-app-from-command-line-c6defff0d8b8

            // build
            // xcodebuild -scheme "safari (macOS)" build

            // archive
            // xcodebuild -scheme "safari (macOS)" archive
            // xcodebuild archive -project safari.xcodeproj -scheme "safari (macOS)" -archivePath /dist/safari

            // export (base command)
            // eslint-disable-next-line max-len
            // xcodebuild -exportArchive -archivePath <xcarchivepath> -exportPath <destinationpath> -exportOptionsPlist <path>
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
