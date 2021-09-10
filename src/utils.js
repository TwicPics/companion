const { storage } = chrome;
const { local } = storage;

export const listenToData = ( propertyName, listener ) => {
    local.get( propertyName, ( { [ propertyName ]: value } ) => {
        listener( value, true );
        storage.onChanged.addListener( ( { [ propertyName ]: change }, areaName ) => {
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
        [ propertyName ]: newValue,
    } );
};
