/**
 * Seeds the local development admin account.
 *
 * Sign-in never creates accounts — this script is the only way the demo user
 * gets into the database. Safe to re-run: it resets the password and status of
 * an existing account rather than creating a duplicate.
 *
 *   npm run seed
 */
import { loadEnvConfig } from "@next/env";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db/connect";
import { User } from "@/lib/db/models/user";
import type { Department } from "@/lib/departments";

// connectDB and the User model both read env lazily, so loading .env.local at
// module scope is early enough.
loadEnvConfig(process.cwd());

const BCRYPT_ROUNDS = 12;

// Typed against Yarmouk's faculty list, so a value that is not on it (this was
// once "Computer Science") fails the type check instead of reaching the database.
// Matches the demo account already stored.
const DEMO_DEPARTMENT: Department = "Hijjawi Faculty for Engineering Technology";

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to seed a development account in production.");
  }

  const email = (process.env.DEV_USER_EMAIL ?? "demo@university.edu").toLowerCase();
  const password = process.env.DEV_USER_PASSWORD ?? "demo123456";

  await connectDB();

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  const user = await User.findOneAndUpdate(
    { email },
    {
      $set: {
        passwordHash,
        status: "active",
        role: "Admin",
        isPublic: true,
      },
      $setOnInsert: {
        email,
        universityId: "DEV-001",
        name: "Demo Researcher",
        department: DEMO_DEPARTMENT,
        position: "Professor",
        researchInterests: ["collaboration", "open science"],
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  console.log(`Seeded ${user.email} (role: ${user.role}, status: ${user.status})`);
  console.log(`Password: ${password}`);
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
