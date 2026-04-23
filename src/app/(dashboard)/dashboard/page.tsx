import { Metadata } from 'next';
import DashboardClient from './DashboardClient';

export const metadata: Metadata = {
  title: 'Documents | SecureDocs',
};

export default function DashboardPage() {
  return <DashboardClient />;
}
