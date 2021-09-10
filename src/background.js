import { listenToDebugEnabled } from "./debugEnabled.js";

const iconSizes = [ `16`, `24`, `32`, `48`, `128` ];
const icons = [ `disabled`, `enabled` ].map( type => ( {
    "path": Object.fromEntries( iconSizes.map( size => [ size, `/icons/${ type }/${ size }.png` ] ) ),
} ) );

listenToDebugEnabled( enabled => {
    chrome.action.setIcon( icons[ enabled ? 1 : 0 ] );
} );
