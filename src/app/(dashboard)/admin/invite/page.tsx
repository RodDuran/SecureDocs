import { Metadata } from 'next';
import InviteClient from './InviteClient';

export const metadata: Metadata = {
  title: 'Add User | SecureDocs',
};

export default function InvitePage() {
  return <InviteClient />;
}
