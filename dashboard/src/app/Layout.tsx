import { Link, Outlet, useLocation, useNavigate } from 'react-router';
import { Target, Users, LayoutDashboard, Plus, Briefcase, Bot, LogOut, LogIn } from 'lucide-react';
import { useAuth } from './context/AuthContext';
import { uz } from '../lib/uz';

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, isAuthenticated } = useAuth();

  const allNavItems = [
    { name: uz.nav.home, path: '/', icon: LayoutDashboard, roles: ['any'] },
    { name: uz.nav.campaigns, path: '/business/campaigns', icon: Briefcase, roles: ['business'] },
    { name: uz.nav.businessAnalytics, path: '/business/analytics', icon: Target, roles: ['business'] },
    { name: uz.nav.agents, path: '/agent/manage', icon: Bot, roles: ['agent'] },
    { name: uz.nav.agentAnalytics, path: '/agent/analytics', icon: Users, roles: ['agent'] },
    { name: uz.nav.chatDemo, path: '/demo', icon: Bot, roles: ['any'] },
  ];

  const navItems = allNavItems.filter(item => 
    item.roles.includes('any') || (user && item.roles.includes(user.role))
  );

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="h-screen bg-white flex flex-col font-sans overflow-hidden">
      <header className="border-b-2 border-black/10 bg-white">
        <div className="max-w-7xl mx-auto px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link to="/" className="text-2xl font-bold text-black hover:opacity-80">
              {uz.layout.brand}
            </Link>
            
            <nav className="flex items-center gap-2">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors ${
                    location.pathname === item.path
                      ? 'bg-[#0000FF] text-white'
                      : 'text-black/70 hover:bg-black/5 hover:text-black'
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.name}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <>
                {user?.role === 'agent' && (
                  <Link to="/agent/manage">
                    <button className="px-4 py-2 bg-black/5 text-black hover:bg-black/10 transition-colors rounded-lg text-sm font-medium">
                      {uz.nav.registerAgent}
                    </button>
                  </Link>
                )}
                {user?.role === 'business' && (
                  <Link to="/business/campaigns">
                    <button className="px-4 py-2 bg-[#0000FF] text-white hover:bg-[#0000CC] transition-colors rounded-lg text-sm font-medium flex items-center gap-2">
                      <Plus className="w-4 h-4" />
                      {uz.nav.newCampaign}
                    </button>
                  </Link>
                )}
                <div className="h-6 w-px bg-black/10 mx-2" />
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-black/60">{user?.email}</span>
                  <button 
                    onClick={handleLogout}
                    className="p-2 text-black/40 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50"
                    aria-label={uz.common.signOut}
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              </>
            ) : (
              <Link to="/login">
                <button className="px-6 py-2 bg-[#0000FF] text-white hover:bg-[#0000CC] transition-colors rounded-lg text-sm font-medium flex items-center gap-2">
                  <LogIn className="w-4 h-4" />
                  {uz.common.signIn}
                </button>
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 min-h-0 overflow-hidden flex flex-col">
        <Outlet />
      </main>
    </div>
  );
}
