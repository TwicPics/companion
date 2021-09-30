import { listenToData, setData } from "./utils.js";

document.addEventListener( `DOMContentLoaded`, () => {
    const debugSwitch = document.getElementById( `debug-switch` );
    listenToData( `debugMode`, ( enabled, firstTime ) => {
        debugSwitch.checked = enabled;
        if ( firstTime ) {
            debugSwitch.addEventListener( `click`, () => {
                setData( `debugMode`, debugSwitch.checked );
            } );
            debugSwitch.disabled = false;
        }
    } );
} );
