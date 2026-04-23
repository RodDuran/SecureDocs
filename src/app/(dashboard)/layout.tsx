'use client';

import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { LayoutDashboard, FileText, Settings, UserCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Toaster } from "sonner";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [role, setRole] = useState<string | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    fetch('/api/users/me')
      .then(res => res.json())
      .then(data => setRole(data.role))
      .catch(console.error);
  }, []);

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="w-64 bg-[#0f172a] text-white flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-slate-700">
          <h1 className="text-xl font-bold tracking-tight">SecureDocs</h1>
        </div>
        
        <nav className="flex-1 py-6 px-4 space-y-2">
          <Link 
            href="/dashboard" 
            className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${pathname === '/dashboard' ? 'bg-[#3b82f6]/20 text-[#3b82f6]' : 'hover:bg-[#3b82f6]/20 hover:text-[#3b82f6] text-slate-300'}`}
          >
            <LayoutDashboard size={20} />
            <span className="font-medium">Dashboard</span>
          </Link>
          
          {role === 'ADMIN' && (
            <>
              <Link 
                href="/audit-log" 
                className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${pathname === '/audit-log' ? 'bg-[#3b82f6]/20 text-[#3b82f6]' : 'hover:bg-[#3b82f6]/20 hover:text-[#3b82f6] text-slate-300'}`}
              >
                <FileText size={20} />
                <span className="font-medium">Audit Log</span>
              </Link>
              <Link 
                href="/admin" 
                className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${pathname === '/admin' ? 'bg-[#3b82f6]/20 text-[#3b82f6]' : 'hover:bg-[#3b82f6]/20 hover:text-[#3b82f6] text-slate-300'}`}
              >
                <Settings size={20} />
                <span className="font-medium">Admin</span>
              </Link>
              <Link 
                href="/admin/invite" 
                className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${pathname === '/admin/invite' ? 'bg-[#3b82f6]/20 text-[#3b82f6]' : 'hover:bg-[#3b82f6]/20 hover:text-[#3b82f6] text-slate-300'}`}
              >
                <UserCircle size={20} />
                <span className="font-medium">Invite User</span>
              </Link>
            </>
          )}
        </nav>
      </aside>

      <div className="flex-1 flex flex-col">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-end px-8 shadow-sm">
          <UserButton afterSignOutUrl="/" />
        </header>
        <main className="flex-1 p-8">
          {children}
        </main>
      </div>
      <Toaster position="top-right" richColors />
    </div>
  );
}
