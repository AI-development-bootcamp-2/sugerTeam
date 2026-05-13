import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

export function SelectViewPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  return (
    <main dir="rtl" className="flex min-h-screen">
      {/* Right half — content */}
      <div className="flex w-full flex-col items-center justify-center bg-[#F2F2F7] px-8 lg:w-1/2">
        <div className="flex w-full max-w-lg flex-col gap-8 rounded-3xl bg-white px-12 py-12 shadow-[0_8px_40px_rgba(0,0,0,0.18)]">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-[#212525]">
              שלום {user?.fullName ?? ''}
            </h1>
            <p className="mt-2 text-base text-[#53575B]">לאן תרצה להמשיך?</p>
          </div>

          <div className="flex flex-col gap-4">
            <button
              type="button"
              onClick={() => navigate('/admin')}
              className="flex flex-col items-center gap-2 rounded-2xl bg-[#F5F5F5] px-8 py-8 text-[#212525] shadow-md transition hover:bg-[#EBEBEB]"
            >
              <span className="text-xl font-bold">מערכת ניהול</span>
              <span className="text-sm text-[#6B7280]">
                ניהול משתמשים, לקוחות, פרויקטים ומשימות
              </span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/time-report')}
              className="flex flex-col items-center gap-2 rounded-2xl bg-[#F5F5F5] px-8 py-8 text-[#212525] shadow-md transition hover:bg-[#EBEBEB]"
            >
              <span className="text-xl font-bold">דיווח שעות</span>
              <span className="text-sm text-[#6B7280]">
                צפייה ודיווח שעות עבודה חודשיות
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Left half — background image with logo */}
      <div
        className="hidden w-1/2 flex-col items-center justify-center lg:flex"
        style={{
          backgroundImage: 'url(/select-background.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <img src="/abra-logo.png" alt="Abra" className="h-16 object-contain" />
      </div>
    </main>
  );
}
