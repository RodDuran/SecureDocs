import { Metadata } from 'next';
import InviteClient from './InviteClient';

export const metadata: Metadata = {
  title: 'Invite User | SecureDocs',
};

export default function InvitePage() {
  return <InviteClient />;
}
