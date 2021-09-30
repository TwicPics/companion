import { listenToData } from "./utils.js";

const iconSizes = [ `16`, `24`, `32`, `48`, `128` ];
const icons = [ `disabled`, `enabled` ].map( type => ( {
    "path": Object.fromEntries( iconSizes.map( size => [ size, `/icons/${ type }/${ size }.png` ] ) ),
} ) );

const action = chrome.action || chrome.browserAction;

listenToData( `debugMode`, enabled => {
    action.setIcon( icons[ enabled ? 1 : 0 ] );
} );
