import { SignJWT, jwtVerify } from "jose";
import { SiweMessage } from "siwe";
import { prisma } from "@/lib/server/prisma";

const SESSION_COOKIE = "aaa_session";
const encoder = new TextEncoder();

function secret() {
  const value = process.env.AUTH_SECRET;
  if (!value || value.length < 32) {
    throw new Error("AUTH_SECRET must be configured with at least 32 characters");
  }
  return encoder.encode(value);
}

export async function createNonce(address: string) {
  const nonce = crypto.randomUUID().replace(/-/g, "");
  await prisma.wallet.upsert({
    where: { address: address.toLowerCase() },
    create: { address: address.toLowerCase(), nonce, nonceAt: new Date() },
    update: { nonce, nonceAt: new Date() }
  });
  return nonce;
}

export async function verifySiweAndCreateToken(message: string, signature: string) {
  const siwe = new SiweMessage(message);
  const wallet = await prisma.wallet.findUnique({ where: { address: siwe.address.toLowerCase() } });
  if (!wallet?.nonce) throw new Error("Nonce not found");

  const result = await siwe.verify({
    signature,
    nonce: wallet.nonce,
    domain: process.env.AUTH_SIWE_DOMAIN || undefined
  });

  if (!result.success) throw new Error("Signature verification failed");

  const user = wallet.userId ? { id: wallet.userId } : await prisma.user.create({ data: {} });
  await prisma.wallet.update({
    where: { address: siwe.address.toLowerCase() },
    data: { userId: user.id, nonce: null, nonceAt: null }
  });

  return new SignJWT({ sub: user.id, address: siwe.address.toLowerCase() })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret());
}

export async function verifySession(token?: string) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return {
      userId: String(payload.sub),
      address: String(payload.address)
    };
  } catch {
    return null;
  }
}

export { SESSION_COOKIE };
