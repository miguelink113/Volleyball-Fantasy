import Sidebar from '@/components/layout/Sidebar';

export default function AppLayout({
                                      children,
                                  }: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex h-screen overflow-hidden bg-white">
            <Sidebar />
            <main className="min-w-0 flex-1 overflow-y-auto bg-white p-8 text-slate-900">
                {children}
            </main>
        </div>
    );
}