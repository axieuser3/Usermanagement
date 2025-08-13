// Super Admin Authentication
// Only this specific Supabase UID can access admin features

export const SUPER_ADMIN_UID = 'b8782453-a343-4301-a947-67c5bb407d2b';

export function isSuperAdmin(userId: string | undefined): boolean {
  return userId === SUPER_ADMIN_UID;
}

export function requireSuperAdmin(userId: string | undefined): void {
  if (!isSuperAdmin(userId)) {
    throw new Error('Super admin access required');
  }
}
