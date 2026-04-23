export default function DashboardPage() {
  return (
    <div className="max-w-4xl">
      <h2 className="text-2xl font-semibold text-slate-800 mb-6">Welcome to SecureDocs</h2>
      <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
        <p className="text-slate-600">
          This is your protected dashboard. You can navigate through the sidebar to view employees and audit logs.
        </p>
      </div>
    </div>
  );
}
