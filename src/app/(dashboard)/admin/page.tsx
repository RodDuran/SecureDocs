import { Metadata } from 'next';
import AdminClient from './AdminClient';

export const metadata: Metadata = {
  title: 'User & Access | SecureDocs',
};

export default function AdminPage() {
  return <AdminClient />;
}
