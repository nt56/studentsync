// lib/db refuses to load without a URI. Unit tests import modules that pull it in
// but never connect, so a placeholder is enough. Import this module first.
process.env.MONGODB_URI ??= "mongodb://127.0.0.1:1/unused";
export {};
