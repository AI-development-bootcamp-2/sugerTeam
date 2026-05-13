import { useState } from 'react';
import { useForm } from 'react-hook-form';
import type { Resolver } from 'react-hook-form';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { apiClient } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import type { User } from '../../types/auth';

const loginSchema = z.object({
  email: z.string().email('כתובת מייל לא תקינה'),
  password: z.string().min(1, 'סיסמה שדה חובה'),
  rememberMe: z.boolean(),
});

type LoginFormData = z.infer<typeof loginSchema>;

const loginResolver: Resolver<LoginFormData> = async (values) => {
  const result = loginSchema.safeParse(values);
  if (result.success) {
    return { values: result.data, errors: {} };
  }
  return {
    values: {},
    errors: result.error.issues.reduce<Record<string, { type: string; message: string }>>(
      (acc, issue) => {
        const key = issue.path[0] as string;
        if (!acc[key]) acc[key] = { type: 'validation', message: issue.message };
        return acc;
      },
      {},
    ),
  };
};

interface LoginResponse {
  accessToken: string;
  user: User;
}

async function loginRequest(data: LoginFormData): Promise<LoginResponse> {
  const response = await apiClient.post<LoginResponse>('/api/v1/auth/login', data);
  return response.data;
}

function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.error ?? error.response?.data?.message;
    return typeof message === 'string' ? message : 'מייל או סיסמה שגויים.';
  }
  return 'אירעה שגיאה. נסו שנית.';
}

function AbraLogo() {
  return (
    <img src="/abra-logo-black.png" alt="Abra" style={{ height: 60 }} />
  );
}

const eyeOpen = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 20, height: 20 }}>
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const eyeOff = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 20, height: 20 }}>
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

export function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: loginResolver,
    defaultValues: { rememberMe: false },
  });

  const mutation = useMutation({
    mutationFn: loginRequest,
    onSuccess: (data) => {
      setAuth(data.user, data.accessToken);
      navigate('/dashboard');
    },
  });

  const inputBase: React.CSSProperties = {
    width: '100%',
    height: 56,
    border: '1px solid #E1E7F3',
    borderRadius: 10,
    background: '#fff',
    padding: '0 48px',
    fontFamily: '"Assistant", sans-serif',
    fontSize: 18,
    color: '#141E3E',
    direction: 'rtl',
    textAlign: 'right',
    outline: 'none',
    transition: 'border-color .15s ease, box-shadow .15s ease',
    boxSizing: 'border-box',
  };

  return (
    <main
      style={{
        fontFamily: '"Assistant", -apple-system, "Segoe UI", system-ui, sans-serif',
        background: '#F2F2F7',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        direction: 'rtl',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 640,
          borderRadius: 12,
          background: '#fff',
          padding: '48px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 32,
          boxShadow:
            '0 15px 33px rgba(0,0,0,0.10), 0 59px 59px rgba(0,0,0,0.09), 0 134px 80px rgba(0,0,0,0.05), 0 238px 95px rgba(0,0,0,0.01)',
          margin: '32px 16px',
        }}
      >
        <AbraLogo />

        <h1
          style={{
            margin: 0,
            fontWeight: 700,
            fontSize: 28,
            lineHeight: 1.3,
            textAlign: 'center',
            color: '#141E3E',
          }}
        >
          👋 ברוכים הבאים למערכת הניהול של אברא
          <small
            style={{
              display: 'block',
              fontWeight: 500,
              fontSize: 18,
              color: '#848891',
              marginTop: 8,
            }}
          >
            התחברו עם המייל והסיסמה שלכם
          </small>
        </h1>

        <form
          onSubmit={handleSubmit((data) => mutation.mutate(data))}
          noValidate
          style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 16 }}
        >
          {/* Email */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label htmlFor="email" style={{ fontSize: 16, fontWeight: 600, color: '#141E3E', textAlign: 'right' }}>
              מייל
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <span style={{ position: 'absolute', insetInlineEnd: 16, color: '#848891', pointerEvents: 'none', display: 'inline-flex' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 20, height: 20 }}>
                  <rect x="3" y="5" width="18" height="14" rx="2" />
                  <polyline points="3 7 12 13 21 7" />
                </svg>
              </span>
              <input
                {...register('email')}
                id="email"
                type="email"
                autoComplete="email"
                placeholder="name@abra.co.il"
                style={inputBase}
                onFocus={(e) => { e.currentTarget.style.borderColor = '#0C69FF'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(12,105,255,0.12)'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = errors.email ? '#EF4444' : '#E1E7F3'; e.currentTarget.style.boxShadow = 'none'; }}
              />
            </div>
            {errors.email && (
              <p style={{ margin: 0, fontSize: 13, color: '#EF4444', textAlign: 'right' }}>{errors.email.message}</p>
            )}
          </div>

          {/* Password */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label htmlFor="password" style={{ fontSize: 16, fontWeight: 600, color: '#141E3E', textAlign: 'right' }}>
              סיסמה
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <span style={{ position: 'absolute', insetInlineEnd: 16, color: '#848891', pointerEvents: 'none', display: 'inline-flex' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 20, height: 20 }}>
                  <rect x="4" y="11" width="16" height="10" rx="2" />
                  <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                </svg>
              </span>
              <input
                {...register('password')}
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••"
                style={inputBase}
                onFocus={(e) => { e.currentTarget.style.borderColor = '#0C69FF'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(12,105,255,0.12)'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = errors.password ? '#EF4444' : '#E1E7F3'; e.currentTarget.style.boxShadow = 'none'; }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label="הצג סיסמה"
                style={{
                  position: 'absolute',
                  insetInlineStart: 12,
                  width: 36,
                  height: 36,
                  border: 'none',
                  background: 'transparent',
                  color: '#848891',
                  cursor: 'pointer',
                  borderRadius: 8,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0,
                }}
              >
                {showPassword ? eyeOff : eyeOpen}
              </button>
            </div>
            {errors.password && (
              <p style={{ margin: 0, fontSize: 13, color: '#EF4444', textAlign: 'right' }}>{errors.password.message}</p>
            )}
          </div>

          {/* Remember me */}
          <div style={{ display: 'flex', flexDirection: 'row-reverse', alignItems: 'center', marginTop: -4 }}>
            <label
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                color: '#53575B',
                fontSize: 16,
                cursor: 'pointer',
                userSelect: 'none',
                whiteSpace: 'nowrap',
              }}
            >
              <input {...register('rememberMe')} id="rememberMe" type="checkbox" style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }} />
              <span
                style={{
                  width: 18,
                  height: 18,
                  border: '1.5px solid #B5B9C2',
                  borderRadius: 4,
                  background: '#fff',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              />
              זכור אותי
            </label>
          </div>

          {mutation.isError && (
            <p style={{ margin: 0, fontSize: 15, color: '#EF4444', textAlign: 'center' }}>
              {getErrorMessage(mutation.error)}
            </p>
          )}

          <button
            type="submit"
            disabled={mutation.isPending}
            style={{
              width: '100%',
              height: 60,
              borderRadius: 10,
              background: mutation.isPending ? '#2d3d66' : '#141E3E',
              color: '#fff',
              border: 'none',
              cursor: mutation.isPending ? 'not-allowed' : 'pointer',
              fontFamily: '"Assistant", sans-serif',
              fontWeight: 700,
              fontSize: 20,
              marginTop: 8,
              transition: 'background .15s ease',
              opacity: mutation.isPending ? 0.7 : 1,
            }}
          >
            {mutation.isPending ? '...מתחבר' : 'כניסה'}
          </button>
        </form>
      </div>
    </main>
  );
}
