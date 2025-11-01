import { createEventType } from "@remix-run/events";
import { AppStorage as _AppStorage } from "@remix-run/fetch-router";

const [change, createChange] = createEventType("@webstd-ui/router:storage-change");

/**
 * Type-safe storage for application-specific values.
 */
export class AppStorage extends EventTarget {
    static change = change;

    #storage = new _AppStorage();

    /**
     * Check if a value is stored for the given key.
     *
     * @param key The key to check
     * @returns `true` if a value is stored for the given key, `false` otherwise
     */
    has<K extends StorageKey<any>>(key: K): boolean {
        return this.#storage.has(key);
    }

    /**
     * Get a value from storage.
     *
     * @param key The key to get
     * @returns The value for the given key
     */
    get<K extends StorageKey<any>>(key: K): StorageValue<K> {
        return this.#storage.get(key);
    }

    /**
     * Set a value in storage.
     *
     * @param key The key to set
     * @param value The value to set
     */
    set<K extends StorageKey<any>>(key: K, value: StorageValue<K>): void {
        this.#storage.set(key, value);
        this.dispatchEvent(createChange());
    }
}

interface StorageKey<T> {
    defaultValue?: T;
}

type StorageValue<TKey> = TKey extends StorageKey<infer T> ? T : never;
