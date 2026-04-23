import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { LayoutDashboard, Users, FileText } from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="w-64 bg-[#0f172a] text-white flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-slate-700">
          <h1 className="text-xl font-bold tracking-tight">SecureDocs</h1>
        </div>
        
        <nav className="flex-1 py-6 px-4 space-y-2">
          <Link 
            href="/dashboard" 
            className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-[#3b82f6]/20 hover:text-[#3b82f6] transition-colors"
          >
            <LayoutDashboard size={20} />
            <span className="font-medium">Dashboard</span>
          </Link>
          <Link 
            href="#" 
            className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-[#3b82f6]/20 hover:text-[#3b82f6] transition-colors text-slate-300"
          >
            <Users size={20} />
            <span className="font-medium">Employees</span>
          </Link>
          <Link 
            href="#" 
            className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-[#3b82f6]/20 hover:text-[#3b82f6] transition-colors text-slate-300"
          >
            <FileText size={20} />
            <span className="font-medium">Audit Log</span>
          </Link>
        </nav>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Top bar */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-end px-8 shadow-sm">
          <UserButton afterSignOutUrl="/" />
        </header>

        {/* Page Content */}
        <main className="flex-1 p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
