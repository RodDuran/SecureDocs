'use client';

import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { FileText, Settings, UserCircle } from "lucide-react";
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
            <FileText size={20} />
            <span className="font-medium">Documents</span>
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
                <span className="font-medium">User & Access</span>
              </Link>
              <div className="pl-8 mt-1">
                <Link 
                  href="/admin/invite" 
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors text-sm ${pathname === '/admin/invite' ? 'bg-[#3b82f6]/20 text-[#3b82f6]' : 'hover:bg-[#3b82f6]/20 hover:text-[#3b82f6] text-slate-400'}`}
                >
                  <UserCircle size={16} />
                  <span>Invite User</span>
                </Link>
              </div>
            </>
          )}
        </nav>
        <div className="p-4 mt-auto border-t border-slate-700/50">
          <p className="text-xs text-slate-500 font-medium leading-tight">
            🔒 All documents are access-controlled and logged
          </p>
        </div>
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
