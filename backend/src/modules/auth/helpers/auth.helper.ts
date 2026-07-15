import bcrypt from 'bcryptjs';
import { AuthUser } from '../../../types/common.types';

export async function hashPassword(
  password: string,
  saltRounds: number,
): Promise<string> {
  return bcrypt.hash(password, saltRounds);
}

export async function verifyPassword(
  plain: string,
  hashed: string,
): Promise<boolean> {
  return bcrypt.compare(plain, hashed);
}

export function sanitizeUser(user: {
  id: string;
  email: string;
  createdAt: Date;
}): AuthUser & { createdAt: Date } {
  return {
    id: user.id,
    email: user.email,
    createdAt: user.createdAt,
  };
}
