import { SimpleAuth } from "@/components/auth/SimpleAuth";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-blue-50 to-indigo-100 p-4">
      <SimpleAuth />
    </div>
  );
}
