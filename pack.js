/* eslint-disable no-console */
import CleanCSS from "clean-css";
import { copy, remove } from "fs-extra";
import { minify as minifyHTML } from "html-minifier";
import { readFile, writeFile } from "fs/promises";
import { relative } from "path";
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
    "manifest.json": manifestBuffer => JSON.stringify( JSON.parse( manifestBuffer.toString() ) ),
    "popup.css": cssBuffer => new CleanCSS().minify( cssBuffer.toString() ).styles,
    "popup.html": htmlBuffer => minifyHTML( htmlBuffer.toString(), {
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
};

const browsers = {
    "chrome": {
        ...defaultBrowserConfig,
        "manifest.json": manifestBuffer => JSON.stringify( {
            ...JSON.parse( manifestBuffer.toString() ),
            "browser_specific_settings": undefined,
        } ),
    },
    "edge": undefined,
    "firefox": defaultBrowserConfig,
};

// edge uses exact same version as chrome
browsers.edge = browsers.chrome;

( async () => {
    await remove( `dist` );
    const getSource = cacheFactory( readFile );
    const getTime = getTimeFactory();
    await Promise.all( Object.entries( browsers ).map( async ( [ browserName, handlers ] ) => {
        const dir = `dist/${ browserName }`;
        await copy( `built`, dir, {
            "filter": async ( src, dest ) => {
                const handler = handlers[ relative( `built`, src ) ];
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
