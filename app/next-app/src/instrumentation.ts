import { registerOTel } from "@vercel/otel";

export async function register() {
  registerOTel("scruffy-next-app");
}
