"use server";
import { cookies } from "next/headers";
import { compare, hashSync } from "bcrypt";
import { randomBytes } from "crypto";
import { getRedisClient } from "@/redis";

const adminPassword =
  process.env.ADMIN_PASSWORD ??
  (() => {
    throw "Please set a ADMIN_PASSWORD in env";
  })();

export const readAuth = () => cookies().get("authorization")?.value;

const sessions: Record<string, {}> = {};

const insertSession = async (tkn: string) => {
  const client = getRedisClient();
  if (client) {
    await client.set(`sessions-${tkn}`, "exists");
    return;
  }

  sessions[tkn] = {};
};

const checkSession = async (tkn: string) => {
  const client = getRedisClient();
  if (client) {
    const res = await client.get(`sessions-${tkn}`);
    return res !== null;
  }

  return !!sessions[tkn];
};

export const login = async (password: string) => {
  console.log(hashSync(password, 10));
  if (!(await compare(password, adminPassword))) {
    return null;
  }

  const sessionToken = randomBytes(20).toString("base64");
  cookies().set("authentication", sessionToken);
  await insertSession(sessionToken);

  return sessionToken;
};

export const isLoggedIn = async () => {
  const tkn = cookies().get("authentication")?.value;
  if (!tkn) return false;

  return await checkSession(tkn);
};
