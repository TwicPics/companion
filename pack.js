/* eslint-disable no-console */
import { copy, remove } from "fs-extra";
import { readFile, writeFile } from "fs/promises";
import { relative } from "path";
import { zip } from "zip-a-folder";

const cacheFactory = create => {
    const map = new Map();
    return async key => {
        if ( map.has( key ) ) {
            return map.get( key );
        }
        const value = await create( key );
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

const browsers = {
    "chrome": {
        "manifest.json": manifestBuffer => JSON.stringify( {
            ...JSON.parse( manifestBuffer.toString() ),
            "browser_specific_settings": undefined,
        } ),
    },
    "firefox": {
        "manifest.json": manifestBuffer => {
            const manifest = JSON.parse( manifestBuffer.toString() );
            return JSON.stringify( {
                ...manifest,
                "action": undefined,
                "background": {
                    "scripts": [ manifest.background[ `service_worker` ] ],
                },
                "browser_action": manifest.action,
                "manifest_version": 2,
            } );
        },
    },
};

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
