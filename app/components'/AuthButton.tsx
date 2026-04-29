"use client";
import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
export default function AuthButton() {
  const [user, setUser] = useState<any>(null);
  const router = useRouter();
  useEffect(() => {
    // Check initial user
    const checkUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
    };
    checkUser();
    // Listen for auth changes (login/logout)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      router.refresh(); // Refresh the server components to update the UI
    });
    return () => subscription.unsubscribe();
  }, [router]);
  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };
  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    router.push("/");
  };
  if (user) {
    return (
      <div className="flex items-center gap-4">
        <span className="text-xs text-gray-500 hidden sm:inline">
          {user.email}
        </span>
        <button
          onClick={handleLogout}
          className="text-sm font-medium text-red-600 hover:text-red-700"
        >
          Logout
        </button>
      </div>
    );
  }
  return (
    <button
      onClick={handleLogin}
      className="rounded-full bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-
800 transition-colors"
    >
      Login
    </button>
  );
}
