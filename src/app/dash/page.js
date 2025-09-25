'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/app/utils/supabase';

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const router = useRouter();

  useEffect(() => {
    // Listen for changes in authentication state
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        setUser(session.user);
      } else {
        // Redirect to login if the session is null (user is signed out)
        router.push('/login');
      }
      setLoading(false);
    });

    // Cleanup the subscription on component unmount
    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  const handleLogout = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Logout error:', error.message);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading dashboard...</p>
      </div>
    );
  }

  // The component will only render if a user is logged in
  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header/Navbar */}
      <nav className="bg-white shadow p-4 flex justify-between items-center">
        <h1 className="text-xl font-bold">Dashboard</h1>
        <button
          onClick={handleLogout}
          disabled={loading}
          className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
        >
          Logout
        </button>
      </nav>

      {/* Main Content Area */}
      <main className="container mx-auto mt-8 p-4">
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <h2 className="text-2xl font-semibold mb-4">
            Welcome, {user?.email || 'User'}!
          </h2>
          <p className="text-gray-600 mb-4">
            This is your personal dashboard. You are logged in with Supabase authentication.
          </p>
          <div className="mt-6">
            <h3 className="text-xl font-medium mb-2">User Information:</h3>
            <ul className="list-disc list-inside text-gray-700">
              <li>**User ID:** {user?.id}</li>
              <li>**Email:** {user?.email}</li>
              <li>**Created At:** {new Date(user?.created_at).toLocaleDateString()}</li>
            </ul>
          </div>
        </div>

        {/* Placeholder for more content */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h3 className="text-lg font-semibold">Section 1</h3>
            <p className="text-gray-600 mt-2">
              Placeholder for charts, data, or other components.
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h3 className="text-lg font-semibold">Section 2</h3>
            <p className="text-gray-600 mt-2">
              Another section with unique content.
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h3 className="text-lg font-semibold">Section 3</h3>
            <p className="text-gray-600 mt-2">
              Add more cards or information as needed.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full text-center p-4 text-gray-500 text-sm">
        <p>&copy; {new Date().getFullYear()} My Dashboard. All rights reserved.</p>
      </footer>
    </div>
  );
}
