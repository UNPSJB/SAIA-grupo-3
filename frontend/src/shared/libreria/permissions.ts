import type { AuthUser } from '../../features/auth/types';
export function permissions(user: AuthUser | null) {
  return { canAdmin: user?.administrar === true, canOperate: user?.operar === true };
}
export function homeFor(user: AuthUser | null): string {
  const { canAdmin, canOperate } = permissions(user);
  return canOperate ? '/checklist' : canAdmin ? '/personal' : '/sin-permisos';
}
