'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function Header() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const getUserAndProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role,full_name')
          .eq('id', user.id)
          .single();
        setProfile(profile);
      }
    };
    getUserAndProfile();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        supabase
          .from('profiles')
          .select('role,full_name')
          .eq('id', session.user.id)
          .single()
          .then(({ data }) => setProfile(data));
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  return (
    <header className="sticky top-0 bg-white shadow-md z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center my-2 md:my-4">
          <Link href="/" className="text-xl md:text-2xl font-bold text-blue-600">
            AMS
          </Link>
          {user && window.location.pathname !== '/' && (
            <div className="hidden md:block text-center flex-1">
              {profile &&
                <h1 className="text-xl md:text-3xl font-bold text-gray-900 mb-0 md:mb-2">
                  {profile?.role.charAt(0).toUpperCase() + profile?.role.slice(1)} Dashboard
                </h1>
              }
            </div>
          )}
          <nav className="relative">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden flex flex-col space-y-1 p-2"
              aria-label="Toggle mobile menu"
            >
              <span className="block w-6 h-0.5 bg-gray-700"></span>
              <span className="block w-6 h-0.5 bg-gray-700"></span>
              <span className="block w-6 h-0.5 bg-gray-700"></span>
            </button>
            <ul className="hidden md:flex space-x-6">
              {user && window.location.pathname !== '/' ? (
                <>
                  <li>
                    <span>Welcome, {profile?.full_name}!</span>
                  </li>
                  <li>
                    <button
                      onClick={handleLogout}
                      className="text-white hover:text-white bg-red-600 rounded-md px-2 py-1 cursor-pointer"
                    >
                      Logout
                    </button>
                  </li>
                </>
              ) : (
                <>
                  <li>
                    <Link href="/login" className="text-gray-700 hover:text-blue-600 transition">
                      Login
                    </Link>
                  </li>
                  <li>
                    <Link href="/signup" className="text-gray-700 hover:text-blue-600 transition">
                      Signup
                    </Link>
                  </li>
                </>
              )}
            </ul>
            {isMobileMenuOpen && (
              <div className="absolute top-full right-0 bg-white border shadow-md z-10 mt-2 md:hidden">
                <ul className="flex flex-col space-y-4 p-4">
                  {user && window.location.pathname !== '/' ? (
                    <>
                      <li>
                        <span className="text-gray-900">Welcome, {profile?.full_name}!</span>
                      </li>
                      <li>
                        <button
                          onClick={() => {
                            handleLogout();
                            setIsMobileMenuOpen(false);
                          }}
                          className="text-gray-700 hover:text-blue-600 transition block text-left"
                        >
                          Logout
                        </button>
                      </li>
                    </>
                  ) : (
                    <>
                      <li>
                        <Link
                          href="/login"
                          className="text-gray-700 hover:text-blue-600 transition block"
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          Login
                        </Link>
                      </li>
                      <li>
                        <Link
                          href="/signup"
                          className="text-gray-700 hover:text-blue-600 transition block"
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          Signup
                        </Link>
                      </li>
                    </>
                  )}
                </ul>
              </div>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
