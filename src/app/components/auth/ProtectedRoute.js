"use client";
import { useAuth } from "../../../contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function ProtectedRoute({ children }) {
  console.log('ProtectedRoute component rendered');
  const { user, loading } = useAuth();
  const router = useRouter();
  console.log('ProtectedRoute - Initial auth state:', { loading, user: !!user });

  useEffect(() => {
    console.log('ProtectedRoute - Auth state:', { loading, user: !!user });
    if (!loading && !user) {
      console.log('Redirecting to login page...');
      // Use window.location.href for more reliable redirect
      window.location.href = "/login";
    }
  }, [user, loading, router]);

  // Show loading spinner while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render children if user is not authenticated
  if (!user) {
    return null;
  }

  return children;
} 