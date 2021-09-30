import { copy, removeSync } from "fs-extra";

removeSync( `built` );

const assets = [ `icons`, `manifest.json`, `popup.css`, `popup.html` ];
const entries = [ `background.js`, `content.js`, `popup.js` ];

assets.forEach( file => copy( `src/${ file }`, `built/${ file }` ) );

export default entries.map( entry => ( {
    "input": `src/${ entry }`,
    "output": {
        "file": `built/${ entry }`,
    },
} ) );
