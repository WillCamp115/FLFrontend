// components/NavBar.js
"use client";
import Link from "next/link";
import { useAuth } from "../../../contexts/AuthContext";
import { useRouter } from "next/navigation";

export default function NavBar() {
  const { user, signOut, isAuthenticated } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push("/login");
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };
  return (
    <nav className="bg-white border-b border-gray-200 py-4 px-8 flex items-center justify-between">
      <div className="flex space-x-4">
        <Link href="/home" className="text-gray-700 hover:text-gray-900">
          FreedomLedger
        </Link>
        <Link href="/spending" className="text-gray-700 hover:text-gray-900">
          Spending
        </Link>
        {/** 
        <Link href="/savings" className="text-gray-700 hover:text-gray-900">
          Savings
        </Link>
        */} 
        <Link href="/goals" className="text-gray-700 hover:text-gray-900">
          Goals
        </Link>
        <Link href="/budgets" className="text-gray-700 hover:text-gray-900">
          Budget
        </Link>
        {/** 
        <Link href="/messages" className="text-gray-700 hover:text-gray-900">
          Messages
        </Link>
        */} 
      </div>
      <div className="flex items-center space-x-4">
        {isAuthenticated ? (
          <>
            <span className="text-gray-600 text-sm">
              Welcome, {user?.displayName || user?.email || 'User'}
            </span>
            <Link href="/profile" className="text-gray-700 hover:text-gray-900">
              Profile
            </Link>
            <button 
              onClick={handleSignOut}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded text-sm"
            >
              Sign Out
            </button>
          </>
        ) : (
          <>
            <Link href="/login" className="text-gray-700 hover:text-gray-900">
              Login
            </Link>
            <Link href="/signup" className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded text-sm">
              Sign Up
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}