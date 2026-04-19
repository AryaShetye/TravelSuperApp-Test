/**
 * Database Layer — Firebase Firestore OR In-Memory Store
 *
 * When USE_MEMORY_DB=true (default for local dev), uses a fast in-memory
 * store so the server starts without any external database.
 *
 * When USE_MEMORY_DB=false, connects to real Firebase Firestore using
 * the service account credentials in .env.
 */

require('dotenv').config();
const { v4: uuidv4 } = require('uuid');

// ─── In-Memory Store ──────────────────────────────────────────────────────────
// Simple Map-based store that mimics Firestore's collection/document API.
// Data is lost on server restart — perfect for demos and local dev.

class MemoryCollection {
  constructor(name) {
    this.name = name;
    this.docs = new Map();
  }

  async add(data) {
    const id = uuidv4();
    const doc = { id, ...data, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    this.docs.set(id, doc);
    return { id, data: () => doc };
  }

  async set(id, data, options = {}) {
    if (options.merge && this.docs.has(id)) {
      const existing = this.docs.get(id);
      const merged = { ...existing, ...data, updatedAt: new Date().toISOString() };
      this.docs.set(id, merged);
      return merged;
    }
    const doc = { id, ...data, createdAt: data.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString() };
    this.docs.set(id, doc);
    return doc;
  }

  doc(id) {
    return new MemoryDocRef(this, id);
  }

  async get() {
    return {
      docs: Array.from(this.docs.values()).map(d => ({
        id: d.id,
        data: () => d,
        exists: true,
      })),
      empty: this.docs.size === 0,
    };
  }

  where(field, op, value) {
    return new MemoryQuery(this, [{ field, op, value }]);
  }

  orderBy(field, direction = 'asc') {
    return new MemoryQuery(this, [], [{ field, direction }]);
  }

  limit(n) {
    return new MemoryQuery(this, [], [], n);
  }
}

class MemoryDocRef {
  constructor(collection, id) {
    this.collection = collection;
    this.id = id;
  }

  async get() {
    const data = this.collection.docs.get(this.id);
    return {
      id: this.id,
      exists: !!data,
      data: () => data || null,
    };
  }

  async set(data, options = {}) {
    return this.collection.set(this.id, data, options);
  }

  async update(data) {
    const existing = this.collection.docs.get(this.id);
    if (!existing) throw new Error(`Document ${this.id} not found`);
    const updated = { ...existing, ...data, updatedAt: new Date().toISOString() };
    this.collection.docs.set(this.id, updated);
    return updated;
  }

  async delete() {
    this.collection.docs.delete(this.id);
  }

  collection(name) {
    // Sub-collection — store as flat key
    const key = `${this.collection.name}/${this.id}/${name}`;
    return db.collection(key);
  }
}

class MemoryQuery {
  constructor(collection, filters = [], sorts = [], limitN = null) {
    this.collection = collection;
    this.filters = filters;
    this.sorts = sorts;
    this.limitN = limitN;
  }

  where(field, op, value) {
    return new MemoryQuery(this.collection, [...this.filters, { field, op, value }], this.sorts, this.limitN);
  }

  orderBy(field, direction = 'asc') {
    return new MemoryQuery(this.collection, this.filters, [...this.sorts, { field, direction }], this.limitN);
  }

  limit(n) {
    return new MemoryQuery(this.collection, this.filters, this.sorts, n);
  }

  async get() {
    let docs = Array.from(this.collection.docs.values());

    // Apply filters
    for (const { field, op, value } of this.filters) {
      docs = docs.filter(doc => {
        const docVal = field.split('.').reduce((o, k) => o?.[k], doc);
        switch (op) {
          case '==': return docVal === value;
          case '!=': return docVal !== value;
          case '>': return docVal > value;
          case '>=': return docVal >= value;
          case '<': return docVal < value;
          case '<=': return docVal <= value;
          case 'array-contains': return Array.isArray(docVal) && docVal.includes(value);
          case 'in': return Array.isArray(value) && value.includes(docVal);
          default: return true;
        }
      });
    }

    // Apply sorts
    for (const { field, direction } of this.sorts) {
      docs.sort((a, b) => {
        const aVal = field.split('.').reduce((o, k) => o?.[k], a);
        const bVal = field.split('.').reduce((o, k) => o?.[k], b);
        if (aVal < bVal) return direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    // Apply limit
    if (this.limitN) docs = docs.slice(0, this.limitN);

    return {
      docs: docs.map(d => ({ id: d.id, data: () => d, exists: true })),
      empty: docs.length === 0,
      size: docs.length,
    };
  }
}

// ─── DB Singleton ─────────────────────────────────────────────────────────────
class MemoryDB {
  constructor() {
    this._collections = new Map();
  }

  collection(name) {
    if (!this._collections.has(name)) {
      this._collections.set(name, new MemoryCollection(name));
    }
    return this._collections.get(name);
  }
}

// ─── Firebase Firestore Wrapper ───────────────────────────────────────────────
class FirestoreDB {
  constructor(firestore) {
    this._db = firestore;
  }

  collection(name) {
    return this._db.collection(name);
  }
}

// ─── Initialize ───────────────────────────────────────────────────────────────
let db;
let isFirebase = false;

async function initDB() {
  const useMemory = process.env.USE_MEMORY_DB === 'true' || !process.env.FIREBASE_PROJECT_ID;

  if (useMemory) {
    db = new MemoryDB();
    console.log('✅ In-memory database initialized (USE_MEMORY_DB=true)');
    console.log('   ℹ️  Data will reset on server restart. Set USE_MEMORY_DB=false for Firebase.');
    return db;
  }

  try {
    const admin = require('firebase-admin');

    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
      });
    }

    db = new FirestoreDB(admin.firestore());
    isFirebase = true;
    console.log('✅ Firebase Firestore connected');
    return db;
  } catch (err) {
    console.warn('⚠️  Firebase init failed, falling back to in-memory DB:', err.message);
    db = new MemoryDB();
    return db;
  }
}

function getDB() {
  if (!db) throw new Error('Database not initialized. Call initDB() first.');
  return db;
}

module.exports = { initDB, getDB, isFirebase: () => isFirebase };
