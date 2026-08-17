import { Home, Users, ShoppingCart, Trophy, Newspaper, User as UserIcon, Radio, type LucideIcon } from "lucide-react";
import type { PageId } from "./data";

const map: Record<string, LucideIcon> = {
  Home,
  Users,
  ShoppingCart,
  Trophy,
  Newspaper,
  User: UserIcon,
  Radio,
};

export const getIcon = (name: string): LucideIcon => map[name] ?? Home;

export const isPageId = (v: string): v is PageId =>
  ["home", "team", "market", "matches", "leagues", "news", "profile"].includes(v);
