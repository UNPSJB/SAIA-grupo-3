import type { AuthUser } from '../../features/auth/types';
export function permissions(user: AuthUser | null) {
  return { canAdmin: user?.administrar === true, canOperate: user?.operar === true };
}
export function homeFor(user: AuthUser | null): string {
  const { canAdmin, canOperate } = permissions(user);

  if (canAdmin) return '/inicio';
  if (canOperate) return '/checklist';

  return '/sin-permisos';
}
