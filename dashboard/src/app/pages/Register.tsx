import { useState } from 'react';
import { useNavigate, Link } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { api } from '../../lib/api';
import { Lock, Mail, User, Briefcase, Bot, Loader2 } from 'lucide-react';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'business' | 'agent'>('business');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const { token, user } = await api.register({ email, password, role });
      login(token, user);
      navigate(role === 'business' ? '/business/analytics' : '/agent/analytics');
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-lg border border-gray-100">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-900">Create account</h2>
          <p className="mt-2 text-sm text-gray-600">
            Join the future of AI advertising
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 text-red-500 p-3 rounded-lg text-sm border border-red-100">
              {error}
            </div>
          )}
          
          <div className="flex gap-4 mb-6">
            <button
              type="button"
              onClick={() => setRole('business')}
              className={`flex-1 flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                role === 'business' ? 'border-[#0000FF] bg-[#0000FF]/5' : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <Briefcase className={`w-6 h-6 ${role === 'business' ? 'text-[#0000FF]' : 'text-gray-400'}`} />
              <span className={`text-sm font-medium ${role === 'business' ? 'text-gray-900' : 'text-gray-500'}`}>Business</span>
            </button>
            <button
              type="button"
              onClick={() => setRole('agent')}
              className={`flex-1 flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                role === 'agent' ? 'border-[#0000FF] bg-[#0000FF]/5' : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <Bot className={`w-6 h-6 ${role === 'agent' ? 'text-[#0000FF]' : 'text-gray-400'}`} />
              <span className={`text-sm font-medium ${role === 'agent' ? 'text-gray-900' : 'text-gray-500'}`}>AI Agent</span>
            </button>
          </div>

          <div className="rounded-md shadow-sm -space-y-px">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="email"
                required
                className="appearance-none rounded-none relative block w-full px-10 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-[#0000FF] focus:border-[#0000FF] focus:z-10 sm:text-sm"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="password"
                required
                className="appearance-none rounded-none relative block w-full px-10 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-[#0000FF] focus:border-[#0000FF] focus:z-10 sm:text-sm"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-[#0000FF] hover:bg-[#0000CC] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0000FF] disabled:opacity-50 transition-colors"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create Account'}
            </button>
          </div>

          <div className="text-center text-sm">
            <span className="text-gray-600">Already have an account? </span>
            <Link to="/login" className="font-medium text-[#0000FF] hover:text-[#0000CC]">
              Sign in
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
