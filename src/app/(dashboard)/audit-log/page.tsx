import { Metadata } from 'next';
import AuditLogClient from './AuditLogClient';

export const metadata: Metadata = {
  title: 'Audit Log | SecureDocs',
};

export default function AuditLogPage() {
  return <AuditLogClient />;
}
