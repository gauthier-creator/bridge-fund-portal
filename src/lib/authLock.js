// Simple lock to prevent AuthContext from reacting to intermediate
// session changes during admin user creation (signUp switches session).
let locked = false;

export function lockAuth() { locked = true; }
export function unlockAuth() { locked = false; }
export function isAuthLocked() { return locked; }
