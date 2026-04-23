'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Role } from '@prisma/client';
import { toast } from 'sonner';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface Employee {
  id: string;
  name: string;
  email: string;
  position: string | null;
}

interface AccessGrant {
  id: string;
  userId: string;
  employeeId: string;
  createdAt: string;
  user: { name: string; email: string };
  employee: { name: string };
}

export default function AdminClient() {
  const router = useRouter();
  const [role, setRole] = useState<Role | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [accessGrants, setAccessGrants] = useState<AccessGrant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // new employee form state
  const [newEmpName, setNewEmpName] = useState('');
  const [newEmpEmail, setNewEmpEmail] = useState('');
  const [newEmpPosition, setNewEmpPosition] = useState('');
  const [isAddingEmp, setIsAddingEmp] = useState(false);
  const [isSubmittingEmp, setIsSubmittingEmp] = useState(false);

  // document access state
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [isGranting, setIsGranting] = useState(false);
  const [isRevokingId, setIsRevokingId] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/users/me')
      .then(res => res.json())
      .then(data => {
        if (data.role !== 'ADMIN') {
          router.push('/dashboard');
        } else {
          setRole(data.role);
          fetchData();
        }
      })
      .catch(() => router.push('/dashboard'));
  }, [router]);

  const fetchData = async () => {
    try {
      const [usersRes, empRes, accessRes] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/employees'),
        fetch('/api/access')
      ]);
      setUsers(await usersRes.json());
      setEmployees(await empRes.json());
      setAccessGrants(await accessRes.json());
      setIsLoading(false);
    } catch (e) {
      console.error(e);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      const res = await fetch(`/api/users/${userId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole })
      });
      if (res.ok) {
        toast.success('Role updated successfully');
        setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
      } else {
        toast.error('Failed to update role');
      }
    } catch (err) {
      console.error(err);
      toast.error('An error occurred');
    }
  };

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingEmp(true);
    try {
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newEmpName, email: newEmpEmail, position: newEmpPosition })
      });
      if (res.ok) {
        setNewEmpName('');
        setNewEmpEmail('');
        setNewEmpPosition('');
        setIsAddingEmp(false);
        toast.success('Employee added successfully');
        fetchData();
      } else {
        toast.error('Failed to add employee');
      }
    } catch (err) {
      console.error(err);
      toast.error('An error occurred');
    } finally {
      setIsSubmittingEmp(false);
    }
  };

  const handleGrantAccess = async () => {
    if (!selectedUserId || !selectedEmployeeId) {
      toast.error('Please select both a user and an employee');
      return;
    }
    setIsGranting(true);
    try {
      const res = await fetch('/api/access/grant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedUserId, employeeId: selectedEmployeeId })
      });
      if (res.ok) {
        toast.success('Access granted');
        setSelectedUserId('');
        setSelectedEmployeeId('');
        fetchData();
      } else {
        toast.error('Failed to grant access');
      }
    } catch (err) {
      console.error(err);
      toast.error('An error occurred');
    } finally {
      setIsGranting(false);
    }
  };

  const handleRevokeAccess = async (userId: string, employeeId: string) => {
    setIsRevokingId(`${userId}-${employeeId}`);
    try {
      const res = await fetch('/api/access/revoke', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, employeeId })
      });
      if (res.ok) {
        toast.success('Access revoked');
        fetchData();
      } else {
        toast.error('Failed to revoke access');
      }
    } catch (err) {
      console.error(err);
      toast.error('An error occurred');
    } finally {
      setIsRevokingId(null);
    }
  };

  if (role !== 'ADMIN') return null;

  const getFilteredUsers = () => users.filter(u => ['MANAGER', 'SUPERVISOR', 'LAWYER'].includes(u.role));

  return (
    <div className="max-w-6xl mx-auto pb-12 relative">
      <h1 className="text-2xl font-bold text-slate-800 mb-8">Admin Panel</h1>

      {/* Users Section */}
      <section className="mb-12">
        <h2 className="text-xl font-semibold text-slate-800 mb-4">Users</h2>
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 font-medium text-slate-700">Name</th>
                <th className="px-6 py-4 font-medium text-slate-700">Email</th>
                <th className="px-6 py-4 font-medium text-slate-700">Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr><td colSpan={3} className="px-6 py-8 text-center text-slate-500 animate-pulse">Loading users...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={3} className="px-6 py-8 text-center text-slate-500">No users found.</td></tr>
              ) : users.map(u => (
                <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-800">{u.name}</td>
                  <td className="px-6 py-4">{u.email}</td>
                  <td className="px-6 py-4">
                    <select
                      value={u.role}
                      onChange={(e) => handleRoleChange(u.id, e.target.value)}
                      className="border border-slate-300 rounded px-2 py-1 bg-white focus:outline-none focus:border-blue-500"
                    >
                      {Object.values(Role).map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Employees Section */}
      <section className="mb-12">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-slate-800">Employees</h2>
          <button
            onClick={() => setIsAddingEmp(!isAddingEmp)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
          >
            {isAddingEmp ? 'Cancel' : 'Add Employee'}
          </button>
        </div>

        {isAddingEmp && (
          <div className="bg-slate-50 p-6 rounded-lg border border-slate-200 mb-6">
            <h3 className="font-medium text-slate-800 mb-4">New Employee</h3>
            <form onSubmit={handleAddEmployee} className="flex gap-4 items-end">
              <div className="flex-1">
                <label className="block text-xs font-medium text-slate-500 mb-1">Name</label>
                <input required type="text" value={newEmpName} onChange={e => setNewEmpName(e.target.value)} className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-slate-500 mb-1">Email</label>
                <input required type="email" value={newEmpEmail} onChange={e => setNewEmpEmail(e.target.value)} className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-slate-500 mb-1">Position</label>
                <input type="text" value={newEmpPosition} onChange={e => setNewEmpPosition(e.target.value)} className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
              </div>
              <button disabled={isSubmittingEmp} type="submit" className="px-4 py-2 bg-slate-800 text-white rounded-md hover:bg-slate-900 text-sm font-medium h-[38px] disabled:opacity-50">
                {isSubmittingEmp ? 'Saving...' : 'Save'}
              </button>
            </form>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 font-medium text-slate-700">Name</th>
                <th className="px-6 py-4 font-medium text-slate-700">Email</th>
                <th className="px-6 py-4 font-medium text-slate-700">Position</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr><td colSpan={3} className="px-6 py-8 text-center text-slate-500 animate-pulse">Loading employees...</td></tr>
              ) : employees.length === 0 ? (
                <tr><td colSpan={3} className="px-6 py-8 text-center text-slate-500">No employees found.</td></tr>
              ) : employees.map(emp => (
                <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-800">{emp.name}</td>
                  <td className="px-6 py-4">{emp.email}</td>
                  <td className="px-6 py-4">{emp.position || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Document Access Section */}
      <section>
        <h2 className="text-xl font-semibold text-slate-800 mb-4">Document Access</h2>
        <div className="bg-slate-50 p-6 rounded-lg border border-slate-200 mb-6 flex gap-4 items-end flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-slate-500 mb-1">Select User (Manager/Supervisor/Lawyer)</label>
            <select value={selectedUserId} onChange={(e) => setSelectedUserId(e.target.value)} className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-blue-500">
              <option value="">-- Choose User --</option>
              {getFilteredUsers().map(u => (
                <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-slate-500 mb-1">Select Employee</label>
            <select value={selectedEmployeeId} onChange={(e) => setSelectedEmployeeId(e.target.value)} className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-blue-500">
              <option value="">-- Choose Employee --</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.name}</option>
              ))}
            </select>
          </div>
          <button 
            onClick={handleGrantAccess} 
            disabled={isGranting || !selectedUserId || !selectedEmployeeId}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium h-[38px] disabled:opacity-50"
          >
            {isGranting ? 'Granting...' : 'Grant Access'}
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 font-medium text-slate-700">User</th>
                <th className="px-6 py-4 font-medium text-slate-700">Employee</th>
                <th className="px-6 py-4 font-medium text-slate-700">Granted Date</th>
                <th className="px-6 py-4 font-medium text-slate-700 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-500 animate-pulse">Loading access grants...</td></tr>
              ) : accessGrants.length === 0 ? (
                <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-500">No access grants yet.</td></tr>
              ) : accessGrants.map(grant => (
                <tr key={grant.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-800">{grant.user.name}</div>
                    <div className="text-xs text-slate-500">{grant.user.email}</div>
                  </td>
                  <td className="px-6 py-4 font-medium text-slate-800">{grant.employee.name}</td>
                  <td className="px-6 py-4">{new Date(grant.createdAt).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleRevokeAccess(grant.userId, grant.employeeId)}
                      disabled={isRevokingId === `${grant.userId}-${grant.employeeId}`}
                      className="text-red-600 hover:text-red-800 font-medium text-sm disabled:opacity-50"
                    >
                      {isRevokingId === `${grant.userId}-${grant.employeeId}` ? 'Revoking...' : 'Revoke'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

    </div>
  );
}
