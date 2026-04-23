import { Metadata } from 'next';
import DashboardClient from './DashboardClient';

export const metadata: Metadata = {
  title: 'Employee Documents | SecureDocs',
};

export default function DashboardPage() {
  return <DashboardClient />;
}
