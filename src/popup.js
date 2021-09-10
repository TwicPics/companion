import { listenToDebugEnabled, setDebugEnabled } from "./debugEnabled.js";

document.addEventListener( `DOMContentLoaded`, () => {
    const debugSwitch = document.getElementById( `debug-switch` );
    listenToDebugEnabled( ( enabled, firstTime ) => {
        debugSwitch.checked = enabled;
        if ( firstTime ) {
            debugSwitch.addEventListener( `click`, () => {
                setDebugEnabled( debugSwitch.checked );
            } );
            debugSwitch.disabled = false;
        }
    } );
} );
