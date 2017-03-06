function storageAvailable(type) {
    //type can be 'localStorage' or 'sessionStorage'
    try {
        var storage = window[type],
            x = '__storage_test__';
        storage.setItem(x, x);
        storage.removeItem(x);
        return true;
    }
    catch(e) {
        return false;
    }
}

function checkStorage(site){
    if (storageAvailable('localStorage')) {
        // localStorage is available
        console.log("localStorage is available!");
        try {
            var storage = window['localStorage'];
            return JSON.parse(storage.getItem(site));
        }
        catch(e) {
            return false;
        }

            
        
    }
    else {
        // Too bad, no localStorage for us
        console.log("localStorage is not available.")
    }
}

function saveData(key, data) {
    if (storageAvailable('localStorage')) {
        // localStorage is available
        console.log("attempting to save");
        try {
            var storage = window['localStorage'];
            storage.setItem(key, JSON.stringify(data));
            return true;
        }
        catch(e) {
            console.log("Unable to save data");
            console.log(e);
            console.log("Key: " + key);
            console.log(data);
        }
    }
}