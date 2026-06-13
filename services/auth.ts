import bcrypt from 'bcryptjs';
import { User, UserRole } from '../types';
import { generateId } from '../utils/id';

const SALT_ROUNDS = 10;
const DEFAULT_ADMIN_USERNAME = 'admin';
const DEFAULT_ADMIN_PASSWORD = 'admin123';

export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, SALT_ROUNDS);
};

export const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

export const createDefaultAdmin = async (): Promise<User> => ({
  id: generateId(),
  username: DEFAULT_ADMIN_USERNAME,
  passwordHash: await hashPassword(DEFAULT_ADMIN_PASSWORD),
  role: 'MUDIR' as UserRole,
  name: 'Sistem Administratoru',
  mustChangePassword: true,
});

export const getDefaultCredentialsHint = (): string =>
  `İlk giriş: istifadəçi adı "${DEFAULT_ADMIN_USERNAME}", şifrə "${DEFAULT_ADMIN_PASSWORD}"`;
