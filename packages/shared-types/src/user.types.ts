export type UserRole = 'admin' | 'leader' | 'office' | 'user';
export type UserStatus = 'active' | 'inactive' | 'pending';

export interface UserBase {
  id: number;
  email: string;
  fullName: string;
  role: UserRole;
  status: UserStatus;
  unit: string | null;
  isVerified: boolean;
}

export interface UserWithPermissions extends UserBase {
  permissions: string[];
  roles: RoleBase[];
}

export interface RoleBase {
  id: number;
  name: string;
  description: string | null;
}

export interface PermissionBase {
  id: number;
  name: string;
  description: string | null;
  parentId: number | null;
}
