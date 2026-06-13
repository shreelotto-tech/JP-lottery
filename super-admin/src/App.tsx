import { useEffect, useState } from 'react';
import AdminSuperPanel from './AdminSuperPanel';
import { supabase } from './lib/supabase';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(localStorage.getItem('super_admin_auth') === 'true');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [currentDrawId, setCurrentDrawId] = useState<string | null>(null);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === '202690' && password === '202690') {
      localStorage.setItem('super_admin_auth', 'true');
      setIsLoggedIn(true);
      setError('');
    } else {
      setError('Invalid username or password');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('super_admin_auth');
    setIsLoggedIn(false);
    setUsername('');
    setPassword('');
  };

  useEffect(() => {
    // Fetch the next upcoming or open draw to manage
    const fetchActiveDraw = async () => {
      const { data, error } = await supabase.rpc('get_or_create_current_draw');

      if (error) {
        console.error('Error fetching active draw:', error);
        return;
      }
      if (data && data.id) {
        setCurrentDrawId(data.id);
      } else if (data?.error) {
        console.warn('Draw RPC returned error:', data.error);
      }
    };

    fetchActiveDraw();

    // Re-fetch when draw status changes (e.g. after publishing results)
    const channel = supabase
      .channel('super-admin-draws')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'draws' },
        () => {
          fetchActiveDraw();
        }
      )
      .subscribe();

    // Also poll every 30s as a fallback
    const pollInterval = setInterval(fetchActiveDraw, 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, []);

  const series = [
    { label: '1000s', base: 1000, color: '#ef4444' }, // Red
    { label: '3000s', base: 3000, color: '#22c55e' }, // Green
    { label: '5000s', base: 5000, color: '#3b82f6' }, // Blue
  ];

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Super Admin Login
          </h2>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <form className="space-y-6" onSubmit={handleLogin}>
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded text-sm text-center">
                  {error}
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Username</label>
                <div className="mt-1">
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Password</label>
                <div className="mt-1">
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Sign in
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-black text-gray-900">J.P — Super Admin</h1>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 font-medium text-sm transition-colors"
          >
            Logout
          </button>
        </div>
        {currentDrawId ? (
          <AdminSuperPanel currentDrawId={currentDrawId} series={series} />
        ) : (
          <div className="bg-white p-6 rounded shadow text-gray-600">
            No active or upcoming draws found to manage.
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
