/**
 * Supabase Client Configuration (100% Free Tier)
 * Connects directly to Supabase for Auth, PostgreSQL DB, and Storage.
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

class SimpleSupabaseClient {
    constructor(url, anonKey) {
        this.url = url;
        this.anonKey = anonKey;
    }

    isConfigured() {
        return Boolean(this.url && this.anonKey);
    }

    async query(table, select = '*') {
        if (!this.isConfigured()) return { data: null, error: 'Supabase URL or Key not set in .env' };
        try {
            const res = await fetch(`${this.url}/rest/v1/${table}?select=${select}`, {
                headers: {
                    'apikey': this.anonKey,
                    'Authorization': `Bearer ${this.anonKey}`,
                    'Content-Type': 'application/json'
                }
            });
            const data = await res.json();
            return { data, error: null };
        } catch (err) {
            return { data: null, error: err.message };
        }
    }

    async insert(table, payload) {
        if (!this.isConfigured()) return { data: null, error: 'Supabase URL or Key not set in .env' };
        try {
            const res = await fetch(`${this.url}/rest/v1/${table}`, {
                method: 'POST',
                headers: {
                    'apikey': this.anonKey,
                    'Authorization': `Bearer ${this.anonKey}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            return { data, error: null };
        } catch (err) {
            return { data: null, error: err.message };
        }
    }
}

export const supabase = new SimpleSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY);
