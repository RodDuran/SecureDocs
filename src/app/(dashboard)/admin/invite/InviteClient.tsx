'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Role } from '@prisma/client';
import { toast } from 'sonner';
import { ArrowLeft, Search, UserPlus } from 'lucide-react';

interface Employee {
  id: string;
  name: string;
  position: string | null;
}

const ROLE_HELP: Record<Role, string> = {
  ADMIN: 'Full control: users, employees, uploads, all documents',
  MANAGER: 'Uploads and views documents for the employees you choose',
  SUPERVISOR: 'Uploads and views documents for the employees you choose',
  LAWYER: 'Views and downloads documents for the employees you choose (no uploads)',
  EMPLOYEE: 'Sees only documents they uploaded themselves',
};

const ROLE_ORDER: Role[] = ['MANAGER', 'SUPERVISOR', 'LAWYER', 'ADMIN', 'EMPLOYEE'];

export default function InviteClient() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('MANAGER');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetch('/api/employees').then(r => r.json()).then(setEmployees).catch(console.error);
  }, []);

  const needsEmployees = role === 'MANAGER' || role === 'SUPERVISOR' || role === 'LAWYER';

  const visible = useMemo(() => {
    const f = filter.trim().toLowerCase();
    return f ? employees.filter(e => e.name.toLowerCase().includes(f)) : employees;
  }, [employees, filter]);

  const toggle = (id: string) =>
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await fetch('/api/users/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          role,
          employeeIds: needsEmployees ? Array.from(selected) : [],
        }),
      });
      if (!res.ok) throw new Error((await res.text()) || 'Failed to add user');
      const data = await res.json();

      if (data.emailSent) {
        toast.success(`Invitation emailed to ${data.user.email}`);
      } else {
        toast.warning(data.emailNote || 'User added, but the invitation email was not sent.');
      }
      setName('');
      setEmail('');
      setRole('MANAGER');
      setSelected(new Set());
      setFilter('');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto">
      <Link href="/admin" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-4">
        <ArrowLeft size={14} /> Back to User &amp; Access
      </Link>
      <div className="bg-white p-8 rounded-lg shadow-sm border border-slate-200">
        <h2 className="text-xl font-semibold mb-1">Add User</h2>
        <p className="text-sm text-slate-500 mb-6">
          Users are the people who view employee documents (managers, supervisors, lawyers).
          They&apos;ll get an email invitation to create their login.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
            <input type="text" required value={name} onChange={e => setName(e.target.value)}
              className="w-full border border-slate-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
              className="w-full border border-slate-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
            <select value={role} onChange={e => setRole(e.target.value as Role)}
              className="w-full border border-slate-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
              {ROLE_ORDER.map(r => (
                <option key={r} value={r}>{r.charAt(0) + r.slice(1).toLowerCase()}</option>
              ))}
            </select>
            <p className="text-xs text-slate-500 mt-1">{ROLE_HELP[role]}</p>
          </div>

          {needsEmployees && (
            <div>
              <div className="flex items-baseline justify-between mb-1">
                <label className="block text-sm font-medium text-slate-700">Can see documents for</label>
                <span className="text-xs text-slate-500">{selected.size} selected</span>
              </div>
              <div className="border border-slate-300 rounded-md">
                <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-200">
                  <Search size={14} className="text-slate-400" />
                  <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Search employees"
                    className="flex-1 text-sm focus:outline-none" />
                  {visible.length > 0 && (
                    <button type="button" className="text-xs text-blue-600 hover:underline"
                      onClick={() => setSelected(prev => new Set([...Array.from(prev), ...visible.map(v => v.id)]))}>
                      Select all
                    </button>
                  )}
                </div>
                <ul className="max-h-56 overflow-y-auto divide-y divide-slate-100">
                  {visible.length === 0 ? (
                    <li className="px-3 py-3 text-sm text-slate-500">No employees found.</li>
                  ) : visible.map(emp => (
                    <li key={emp.id}>
                      <label className="flex items-center gap-3 px-3 py-2 text-sm cursor-pointer hover:bg-slate-50">
                        <input type="checkbox" checked={selected.has(emp.id)} onChange={() => toggle(emp.id)} />
                        <span className="text-slate-800">{emp.name}</span>
                        {emp.position && <span className="text-xs text-slate-500">{emp.position}</span>}
                      </label>
                    </li>
                  ))}
                </ul>
              </div>
              <p className="text-xs text-slate-500 mt-1">You can change this later under &ldquo;Who Can Access Documents&rdquo;.</p>
            </div>
          )}

          <button type="submit" disabled={isLoading}
            className="w-full bg-blue-600 text-white rounded-md py-2 font-medium hover:bg-blue-700 disabled:opacity-50 transition-opacity inline-flex items-center justify-center gap-2">
            <UserPlus size={16} /> {isLoading ? 'Adding...' : 'Add User & Send Invitation'}
          </button>
        </form>
      </div>
    </div>
  );
}
