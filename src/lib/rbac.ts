import { Role } from "@prisma/client";

export function canPerformAction(role: Role, action: 'upload' | 'view' | 'download'): boolean {
  switch (role) {
    case 'ADMIN':
    case 'MANAGER':
    case 'SUPERVISOR':
      return true; // all actions
    case 'LAWYER':
      return action === 'view' || action === 'download';
    case 'EMPLOYEE':
      return action === 'view';
    default:
      return false;
  }
}
