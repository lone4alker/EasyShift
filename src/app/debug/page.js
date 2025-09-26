'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/app/utils/supabase';

export default function DebugPage() {
  const [authInfo, setAuthInfo] = useState(null);
  const [businessInfo, setBusinessInfo] = useState(null);
  const [testEmail, setTestEmail] = useState('');
  const [testPassword, setTestPassword] = useState('');
  const [testResult, setTestResult] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkAuthStatus();
    checkBusinessTables();
  }, []);

  const checkAuthStatus = async () => {
    try {
      // Get current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      setAuthInfo({
        session: session,
        user: user,
        sessionError: sessionError?.message,
        userError: userError?.message,
        isConnected: !sessionError && !userError
      });
    } catch (err) {
      setAuthInfo({
        error: err.message,
        isConnected: false
      });
    }
  };

  const checkBusinessTables = async () => {
    try {
      // Try to fetch from businesses table to see if it exists
      const { data, error } = await supabase
        .from('businesses')
        .select('*')
        .limit(5);

      setBusinessInfo({
        data: data || [],
        error: error?.message,
        tableExists: !error
      });
    } catch (err) {
      setBusinessInfo({
        error: err.message,
        tableExists: false
      });
    }
  };

  const testLogin = async () => {
    if (!testEmail.trim() || !testPassword.trim()) {
      setTestResult('Please enter both email and password');
      return;
    }

    setLoading(true);
    setTestResult('');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: testEmail.trim(),
        password: testPassword.trim(),
      });

      if (error) {
        setTestResult(`❌ Login Failed: ${error.message}`);
      } else {
        setTestResult(`✅ Login Successful! User ID: ${data.user.id}`);
        // Refresh auth info
        await checkAuthStatus();
      }
    } catch (err) {
      setTestResult(`❌ Unexpected Error: ${err.message}`);
    }

    setLoading(false);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    await checkAuthStatus();
    setTestResult('Signed out successfully');
  };

  const createTestAccount = async () => {
    const email = 'test@example.com';
    const password = 'test123456';
    
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
      });

      if (error) {
        setTestResult(`❌ Signup Failed: ${error.message}`);
      } else {
        setTestResult(`✅ Test account created! Check email: ${email} for confirmation link. Password: ${password}`);
      }
    } catch (err) {
      setTestResult(`❌ Unexpected Error: ${err.message}`);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-6">🔧 EasyShift Debug Panel</h1>
          
          {/* Supabase Connection Status */}
          <div className="mb-8 p-4 border rounded-lg">
            <h2 className="text-xl font-semibold mb-4 text-gray-700">📡 Supabase Connection</h2>
            {authInfo ? (
              <div className="space-y-2">
                <div className={`p-2 rounded ${authInfo.isConnected ? 'bg-green-100' : 'bg-red-100'}`}>
                  <strong>Status:</strong> {authInfo.isConnected ? '✅ Connected' : '❌ Error'}
                </div>
                <div><strong>Current User:</strong> {authInfo.user ? authInfo.user.email : 'None'}</div>
                <div><strong>Session:</strong> {authInfo.session ? 'Active' : 'None'}</div>
                {authInfo.user && (
                  <div className="text-xs bg-gray-100 p-2 rounded">
                    <strong>User Details:</strong><br/>
                    ID: {authInfo.user.id}<br/>
                    Email: {authInfo.user.email}<br/>
                    Confirmed: {authInfo.user.email_confirmed_at ? '✅ Yes' : '❌ No'}<br/>
                    Created: {authInfo.user.created_at}
                  </div>
                )}
                {authInfo.error && (
                  <div className="text-red-600">Error: {authInfo.error}</div>
                )}
              </div>
            ) : (
              <div>Loading...</div>
            )}
          </div>

          {/* Database Tables */}
          <div className="mb-8 p-4 border rounded-lg">
            <h2 className="text-xl font-semibold mb-4 text-gray-700">🗄️ Database Tables</h2>
            {businessInfo ? (
              <div className="space-y-2">
                <div className={`p-2 rounded ${businessInfo.tableExists ? 'bg-green-100' : 'bg-red-100'}`}>
                  <strong>Businesses Table:</strong> {businessInfo.tableExists ? '✅ Exists' : '❌ Error'}
                </div>
                {businessInfo.data && businessInfo.data.length > 0 && (
                  <div className="text-xs bg-gray-100 p-2 rounded">
                    <strong>Sample Business Records:</strong><br/>
                    {businessInfo.data.map((business, index) => (
                      <div key={index}>
                        {business.shop_name} ({business.owner_email})
                      </div>
                    ))}
                  </div>
                )}
                {businessInfo.error && (
                  <div className="text-red-600">Error: {businessInfo.error}</div>
                )}
              </div>
            ) : (
              <div>Loading...</div>
            )}
          </div>

          {/* Test Login */}
          <div className="mb-8 p-4 border rounded-lg">
            <h2 className="text-xl font-semibold mb-4 text-gray-700">🔐 Test Login</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Email:</label>
                <input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  className="w-full border rounded px-3 py-2 text-black"
                  placeholder="Enter email to test"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Password:</label>
                <input
                  type="password"
                  value={testPassword}
                  onChange={(e) => setTestPassword(e.target.value)}
                  className="w-full border rounded px-3 py-2 text-black"
                  placeholder="Enter password to test"
                />
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={testLogin}
                  disabled={loading}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {loading ? 'Testing...' : 'Test Login'}
                </button>
                <button
                  onClick={createTestAccount}
                  disabled={loading}
                  className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:bg-gray-400"
                >
                  Create Test Account
                </button>
                {authInfo?.user && (
                  <button
                    onClick={signOut}
                    className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                  >
                    Sign Out
                  </button>
                )}
              </div>
              {testResult && (
                <div className={`p-3 rounded ${testResult.includes('✅') ? 'bg-green-100' : 'bg-red-100'}`}>
                  {testResult}
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mb-8 p-4 border rounded-lg">
            <h2 className="text-xl font-semibold mb-4 text-gray-700">⚡ Quick Actions</h2>
            <div className="space-y-2">
              <a href="/owner/signup" className="block bg-blue-100 p-2 rounded hover:bg-blue-200">
                🔗 Go to Owner Signup
              </a>
              <a href="/owner/login" className="block bg-green-100 p-2 rounded hover:bg-green-200">
                🔗 Go to Owner Login
              </a>
              <a href="/staff/signup" className="block bg-purple-100 p-2 rounded hover:bg-purple-200">
                🔗 Go to Staff Signup
              </a>
              <a href="/staff/login" className="block bg-yellow-100 p-2 rounded hover:bg-yellow-200">
                🔗 Go to Staff Login
              </a>
            </div>
          </div>

          {/* Instructions */}
          <div className="p-4 bg-blue-50 rounded-lg">
            <h3 className="font-semibold mb-2">🔍 Troubleshooting Steps:</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm">
              <li>Check if Supabase connection is working (should see ✅ above)</li>
              <li>Create a test account using the button above</li>
              <li>Check your email for the confirmation link and click it</li>
              <li>Try logging in with the test credentials</li>
              <li>If login works, try with your actual credentials</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}