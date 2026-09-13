import mongoose from "mongoose";

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: MongooseCache | undefined;
}

const cached: MongooseCache = global.mongooseCache ?? {
  conn: null,
  promise: null,
};

global.mongooseCache = cached;

export async function connectDB(): Promise<typeof mongoose> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("Please define MONGODB_URI in your environment");
  }

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(uri, {
      bufferCommands: false,
    });
  }

  cached.conn = await cached.promise;

  // A URI without a database path silently lands in MongoDB's default "test"
  // database, which is where production data sat until it was moved.
  const dbName = cached.conn.connection.db?.databaseName;
  if (dbName === "test" && process.env.NODE_ENV === "production") {
    console.warn(
      '[db] connected to the default "test" database; add the database name to MONGODB_URI (…mongodb.net/research-platform?…)'
    );
  }

  return cached.conn;
}
