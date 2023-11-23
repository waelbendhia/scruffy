"use server";
import { cookies } from "next/headers";
import { compare } from "bcrypt";
import { randomBytes } from "crypto";

const adminPassword =
  process.env.ADMIN_PASSWORD ??
  (() => {
    throw "Please set a ADMIN_PASSWORD in env";
  })();

export const readAuth = () => cookies().get("authorization")?.value;

const sessions: Record<string, {}> = {};

export const login = async (password: string) => {
  if (!(await compare(password, adminPassword))) {
    return null;
  }

  const sessionToken = randomBytes(20).toString("base64");
  cookies().set("authentication", sessionToken);
  sessions[sessionToken] = {};

  return sessionToken;
};

export const isLoggedIn = () => {
  const authToken = cookies().get("authentication")?.value;
  if (!authToken) return false;
  if (sessions[authToken] === undefined) return false;

  return true;
};
