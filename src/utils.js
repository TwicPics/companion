const { storage } = chrome;
const { local } = storage;

const getFullPropertyName = shortName => `@twicpics/companion:${ shortName }`;

export const listenToData = ( propertyName, listener ) => {
    const fullPropertyName = getFullPropertyName( propertyName );
    local.get( fullPropertyName, ( { [ fullPropertyName ]: value } ) => {
        listener( value, true );
        storage.onChanged.addListener( ( { [ fullPropertyName ]: change }, areaName ) => {
            if ( change && ( areaName === `local` ) ) {
                if ( change.newValue !== value ) {
                    // eslint-disable-next-line no-param-reassign
                    value = change.newValue;
                    listener( value, false );
                }
            }
        } );
    } );
};

export const setData = ( propertyName, newValue ) => {
    local.set( {
        [ getFullPropertyName( propertyName ) ]: newValue,
    } );
};
