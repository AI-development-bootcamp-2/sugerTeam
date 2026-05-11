import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { apiClient } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import type { User } from '../../types/auth';

const loginSchema = z.object({
  email: z
    .string()
    .min(1, { message: 'כתובת דוא״ל נדרשת' })
    .email({ message: 'דוא״ל לא תקין' }),
  password: z.string().min(1, { message: 'סיסמה נדרשת' }),
});

type LoginFormData = z.infer<typeof loginSchema>;

interface LoginResponse {
  accessToken: string;
  user: User;
}

function AbraLogoMark() {
  const diamonds: Array<{ x: number; y: number; color: string }> = [
    { x: 0,  y: 15, color: '#F09A37' },
    { x: 13, y: 2,  color: '#F09A37' },
    { x: 26, y: 15, color: '#F09C1A' },
    { x: 26, y: 28, color: '#EA7693' },
    { x: 39, y: 15, color: '#F09A37' },
    { x: 52, y: 2,  color: '#F09A37' },
    { x: 52, y: 28, color: '#F09A37' },
  ];
  return (
    <div className="relative w-[70px] h-12 flex-shrink-0">
      {diamonds.map((d, i) => (
        <span
          key={i}
          className="absolute w-[17px] h-[17px] rounded-[2.5px]"
          style={{ left: d.x, top: d.y, background: d.color, transform: 'rotate(45deg)' }}
        />
      ))}
    </div>
  );
}

export function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [authError, setAuthError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setAuthError(null);
    try {
      const { data: res } = await apiClient.post<LoginResponse>('/api/v1/auth/login', {
        email: data.email,
        password: data.password,
      });
      setAuth(res.user, res.accessToken);
      void navigate('/dashboard');
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        setAuthError('פרטי התחברות שגויים');
      } else {
        setAuthError('אירעה שגיאה, נסה שוב');
      }
    }
  };

  return (
    <main className="min-h-screen bg-[#F2F2F7] flex items-center justify-center px-4 py-8">
      <div className="bg-white rounded-2xl w-full max-w-[640px] px-8 py-10 sm:px-12 sm:py-12 shadow-[0_15px_33px_rgba(0,0,0,0.10),0_59px_59px_rgba(0,0,0,0.09),0_134px_80px_rgba(0,0,0,0.05)]">

        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <span className="font-extrabold text-5xl text-[#141E3E] leading-none tracking-tight">
            abra
          </span>
          <AbraLogoMark />
        </div>

        {/* Welcome */}
        <h1 className="text-[28px] font-bold text-[#141E3E] text-center leading-snug mb-8">
          👋 ברוכים הבאים למערכת הניהול של אברא
          <small className="block text-lg font-medium text-[#848891] mt-2">
            התחברו עם המייל והסיסמה שלכם
          </small>
        </h1>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">

          {/* Email field */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-base font-semibold text-[#141E3E]">
              מייל
            </label>
            <div className="relative flex items-center">
              <span className="absolute end-4 text-[#848891] pointer-events-none">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="5" width="18" height="14" rx="2" />
                  <polyline points="3 7 12 13 21 7" />
                </svg>
              </span>
              <input
                id="email"
                type="email"
                placeholder="name@abra.co.il"
                autoComplete="email"
                {...register('email')}
                className={`w-full h-14 border rounded-[10px] bg-white ps-4 pe-12 text-lg text-[#141E3E] placeholder:text-[#B5B9C2] focus:outline-none focus:ring-2 transition-colors ${
                  errors.email
                    ? 'border-red-400 focus:ring-red-100'
                    : 'border-[#E1E7F3] focus:ring-[#141E3E]/10 focus:border-[#141E3E]/30'
                }`}
              />
            </div>
            {errors.email && (
              <p className="text-sm text-red-500" role="alert">
                {errors.email.message}
              </p>
            )}
          </div>

          {/* Password field */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-base font-semibold text-[#141E3E]">
              סיסמה
            </label>
            <div className="relative flex items-center">
              <span className="absolute end-4 text-[#848891] pointer-events-none">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                  <rect x="4" y="11" width="16" height="10" rx="2" />
                  <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                </svg>
              </span>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                autoComplete="current-password"
                {...register('password')}
                className={`w-full h-14 border rounded-[10px] bg-white pe-12 ps-12 text-lg text-[#141E3E] placeholder:text-[#B5B9C2] focus:outline-none focus:ring-2 transition-colors ${
                  errors.password
                    ? 'border-red-400 focus:ring-red-100'
                    : 'border-[#E1E7F3] focus:ring-[#141E3E]/10 focus:border-[#141E3E]/30'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'הסתר סיסמה' : 'הצג סיסמה'}
                className="absolute start-3 w-9 h-9 flex items-center justify-center text-[#848891] hover:text-[#141E3E] hover:bg-[#F2F2F7] rounded-lg transition-colors"
              >
                {showPassword ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
            {errors.password && (
              <p className="text-sm text-red-500" role="alert">
                {errors.password.message}
              </p>
            )}
          </div>

          {/* Auth error banner */}
          {authError && (
            <p className="text-sm text-red-600 text-center bg-red-50 border border-red-100 rounded-lg py-2 px-3" role="alert">
              {authError}
            </p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-[60px] mt-2 rounded-xl bg-[#141E3E] text-white font-bold text-xl hover:bg-[#1f2c55] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? 'מתחבר...' : 'כניסה'}
          </button>
        </form>
      </div>
    </main>
  );
}
