'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Trophy, LogOut, Activity } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Resultados', href: '/results', icon: Trophy },
];

export default function Sidebar() {
    const pathname = usePathname();
    const { profile, signOut } = useAuth();

    return (
        <aside className="flex h-screen min-h-screen w-64 shrink-0 flex-col border-r border-slate-200 bg-slate-50 text-slate-600 shadow-sm">
            <div className="border-b border-slate-100 p-6">
                <h1 className="flex items-center gap-2 text-xl font-bold text-slate-900">
                    <Activity className="h-5 w-5" />
                    Volley Fantasy
                </h1>
            </div>

            <nav className="mt-6 flex-1 space-y-1 px-3">
                {navItems.map((item) => {
                    const isActive = pathname.startsWith(item.href);
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                                isActive
                                    ? 'bg-slate-100 text-slate-900'
                                    : 'hover:bg-slate-50 hover:text-slate-900'
                            }`}
                        >
                            <item.icon className="h-4 w-4" />
                            {item.name}
                        </Link>
                    );
                })}
            </nav>

            <div className="flex items-center gap-3 border-t border-slate-100 p-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-700">
                    {profile?.username?.slice(0, 2).toUpperCase() ?? 'US'}
                </div>
                <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900">{profile?.username ?? 'Usuario'}</p>
                    <p className="truncate text-xs text-slate-500">{profile?.email ?? ''}</p>
                </div>
                <button
                    aria-label="Cerrar sesión"
                    className="rounded-md p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                    onClick={() => signOut()}
                >
                    <LogOut className="h-4 w-4" />
                </button>
            </div>
        </aside>
    );
}