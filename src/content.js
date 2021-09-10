import { listenToDebugEnabled } from "./debugEnabled.js";

const DEBUG_ATTRIBUTE = `twic:debug`;

const debugElement = document.documentElement;

listenToDebugEnabled( enabled => {
    if ( enabled ) {
        debugElement.setAttribute( DEBUG_ATTRIBUTE, `` );
    } else {
        debugElement.removeAttribute( DEBUG_ATTRIBUTE );
    }
} );
