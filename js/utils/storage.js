// Storage utility to gracefully handle localStorage unavailability (e.g., in sandboxed environments)

let localStorageAvailable = false;
let inMemoryStorage = {};

try {
    const testKey = '__localStorageTest__';
    window.localStorage.setItem(testKey, testKey);
    window.localStorage.removeItem(testKey);
    localStorageAvailable = true;
    console.log('LocalStorage is available.');
} catch (e) {
    localStorageAvailable = false;
    console.warn('LocalStorage is not available (e.g., sandboxed environment). Settings will not persist across sessions. Serving the app via HTTP is recommended.');
}

export function isLocalStorageAvailable() {
    return localStorageAvailable;
}

export function getItem(key, defaultValue = null) {
    if (localStorageAvailable) {
        const value = window.localStorage.getItem(key);
        return value === null ? defaultValue : value;
    } else {
        return key in inMemoryStorage ? inMemoryStorage[key] : defaultValue;
    }
}

export function setItem(key, value) {
    if (localStorageAvailable) {
        window.localStorage.setItem(key, value);
    } else {
        inMemoryStorage[key] = value;
    }
}

export function removeItem(key) {
    if (localStorageAvailable) {
        window.localStorage.removeItem(key);
    } else {
        delete inMemoryStorage[key];
    }
}

export function clearStorage() {
    if (localStorageAvailable) {
        window.localStorage.clear();
    } else {
        inMemoryStorage = {};
    }
}
