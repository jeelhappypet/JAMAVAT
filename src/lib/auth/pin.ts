import { randomBytes, scrypt, timingSafeEqual } from "crypto";

const KEY_LENGTH = 32;

function scryptHex(pin: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(pin, salt, KEY_LENGTH, (error, key) => (error ? reject(error) : resolve(key)));
  });
}

/** Per-staff random salt, so two staff with the same PIN get different hashes. */
export async function hashPin(pin: string): Promise<{ pinHash: string; pinSalt: string }> {
  const pinSalt = randomBytes(16).toString("hex");
  const key = await scryptHex(pin, pinSalt);
  return { pinHash: key.toString("hex"), pinSalt };
}

export async function verifyPin(pin: string, pinHash: string, pinSalt: string): Promise<boolean> {
  const key = await scryptHex(pin, pinSalt);
  const expected = Buffer.from(pinHash, "hex");
  return expected.length === key.length && timingSafeEqual(key, expected);
}
