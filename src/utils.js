const { local } = chrome.storage;

export const listenToData = ( propertyName, listener ) => {
    local.get( propertyName, ( { [ propertyName ]: value } ) => {
        listener( value, true );
        local.onChanged.addListener( ( { [ propertyName ]: change } ) => {
            if ( change ) {
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
