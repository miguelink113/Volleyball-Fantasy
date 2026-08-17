"use client";
import { Bell, ChevronRight, LogOut, Settings, Shield, Star } from "lucide-react";

export const ProfilePage = () => (
  <div className="space-y-5 max-w-2xl">
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex items-center gap-4">
      <div className="w-16 h-16 rounded-full bg-amber-500 flex items-center justify-center fv-display text-xl font-bold text-slate-950">
        YM
      </div>
      <div>
        <h2 className="fv-display text-xl font-bold text-slate-100">Yaiza Medina</h2>
        <p className="text-sm text-slate-500">Favorite team: CV Canarias · Member since 2023</p>
      </div>
    </div>

    {[
      { title: "Account settings", icon: Settings, rows: ["Edit profile", "Change password", "Language"] },
      { title: "Notifications", icon: Bell, rows: ["Match reminders", "Transfer alerts", "League news"] },
      { title: "Privacy", icon: Shield, rows: ["Profile visibility", "Data & permissions"] },
      { title: "Subscription", icon: Star, rows: ["Manage plan", "Billing history"] },
    ].map((section) => {
      const Icon = section.icon;
      return (
        <div key={section.title} className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <h3 className="fv-display font-semibold text-slate-100 mb-3 flex items-center gap-2">
            <Icon size={16} className="text-amber-400" /> {section.title}
          </h3>
          <ul className="divide-y divide-slate-800">
            {section.rows.map((r) => (
              <li
                key={r}
                className="flex items-center justify-between py-2.5 text-sm text-slate-300"
              >
                {r} <ChevronRight size={15} className="text-slate-600" />
              </li>
            ))}
          </ul>
        </div>
      );
    })}

    <button className="w-full flex items-center justify-center gap-2 border border-red-500/30 text-red-400 font-semibold py-2.5 rounded-lg hover:bg-red-500/10">
      <LogOut size={16} /> Sign out
    </button>
  </div>
);
