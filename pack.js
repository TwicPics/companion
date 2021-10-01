/* eslint-disable no-console */
import CleanCSS from "clean-css";
import { copy, remove } from "fs-extra";
import { minify as minifyHTML } from "html-minifier";
import { minify as minifyJS } from "terser";
import { readFile, writeFile } from "fs/promises";
import { extname, relative } from "path";
import { zip } from "zip-a-folder";

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

const getTimeFactory = () => {
    let now = Date.now();
    return () => {
        const newNow = Date.now();
        const time = newNow - now;
        now = newNow;
        return time;
    };
};

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

( async () => {
    await remove( `dist` );
    const getSource = cacheFactory( readFile );
    const getTime = getTimeFactory();
    await Promise.all( Object.entries( browsers ).map( async ( [ browserName, handlers ] ) => {
        while ( typeof handlers === `string` ) {
            // eslint-disable-next-line no-param-reassign
            handlers = browsers[ handlers ];
        }
        const dir = `dist/${ browserName }`;
        await copy( `built`, dir, {
            "filter": async ( src, dest ) => {
                const handler = handlers[ relative( `built`, src ) ] || handlers[ `*${ extname( src ) }` ];
                if ( handler ) {
                    await writeFile( dest, await handler( await getSource( src ) ) );
                    return false;
                }
                return ( handler !== false );
            },
        } );
        console.log( `created ${ dir } in ${ getTime() }ms` );
        await zip( dir, `${ dir }.zip` );
        console.log( `created ${ dir }.zip in ${ getTime() }ms` );
    } ) );
} )();
