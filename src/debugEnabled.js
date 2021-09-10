import { listenToData, setData } from "./utils.js";

const TWICPICS_DEBUG_ENABLED = `@twicpics/debug/enabled`;

export const listenToDebugEnabled = fn => listenToData( TWICPICS_DEBUG_ENABLED, ( v, f ) => fn( Boolean( v ), f ) );
export const setDebugEnabled = newValue => setData( TWICPICS_DEBUG_ENABLED, Boolean( newValue ) );
