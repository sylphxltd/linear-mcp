import type { User } from '@linear/sdk';

export interface UserOutput {
  id: string;
  name: string;
  email: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  active: boolean;
  admin: boolean;
  createdAt: string;
  updatedAt: string;
}

export function mapUserToOutput(user: User): UserOutput {
  return {
    id: user.id,
    name: user.name,
    email: user.email ?? null,
    displayName: user.displayName ?? null,
    avatarUrl: user.avatarUrl ?? null,
    active: user.active,
    admin: user.admin,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

export function mapUserToSummary(user: User) {
  return {
    id: user.id,
    name: user.name,
    email: user.email ?? null,
    displayName: user.displayName ?? null,
    active: user.active,
  };
}

export function getAvailableUsersMessage(users: User[]): string {
  if (users.length === 0) {
    return 'No users found.';
  }
  
  const usersList = users.map(user => {
    const displayInfo = user.displayName ? ` (${user.displayName})` : '';
    return `- ${user.id}: ${user.name}${displayInfo}`;
  }).join('\n');
  
  return `Available users:\n${usersList}`;
}