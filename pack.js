/* eslint-disable no-console */
import CleanCSS from "clean-css";
import { copy, remove } from "fs-extra";
import { minify as minifyHTML } from "html-minifier";
import { minify as minifyJS } from "terser";
import { readFile, writeFile } from "fs/promises";
import { dirname, extname, relative, resolve } from "path";
import { zip } from "zip-a-folder";

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
    const dir = resolve( distDir, browserName );
    const browserConfig = browsers[ browserName ];
    if ( typeof browserConfig === `string` ) {
        await handleBrowser( browserConfig );
        const parentDir = resolve( distDir, browserConfig );
        await Promise.all( [
            copy( parentDir, dir ),
            copy( `${ parentDir }.zip`, `${ dir }.zip` ),
        ] );
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
