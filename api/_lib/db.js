import { MongoClient } from "mongodb";

const COLLECTION = process.env.PAIR_SITE_COLLECTION || "pair_sessions";

// Invocations අතරේ connection එක reuse කරනවා
let clientPromise = globalThis.__shanMongo;

export async function getDb() {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is not set");
  }

  if (!clientPromise) {
    clientPromise = globalThis.__shanMongo = new MongoClient(
      process.env.MONGODB_URI,
      { maxPoolSize: 5, serverSelectionTimeoutMS: 8000 }
    ).connect();
  }

  const client = await clientPromise;
  return client.db();
}

export async function sessions() {
  return (await getDb()).collection(COLLECTION);
}

export async function aux(name) {
  return (await getDb()).collection(name);
}

export function cleanNumber(v = "") {
  return String(v).replace(/\D/g, "");
}

export function validNumber(n) {
  return /^[1-9]\d{7,14}$/.test(n);
}
