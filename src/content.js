import { listenToData } from "./utils";

const DEBUG_ATTRIBUTE = `twic:debug`;

const debugElement = document.documentElement;

listenToData( `debugMode`, enabled => {
    if ( enabled ) {
        debugElement.setAttribute( DEBUG_ATTRIBUTE, `` );
    } else {
        debugElement.removeAttribute( DEBUG_ATTRIBUTE );
    }
} );
