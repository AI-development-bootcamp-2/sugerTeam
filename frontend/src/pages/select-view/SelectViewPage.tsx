import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

export function SelectViewPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  return (
    <main
      dir="rtl"
      className="flex min-h-screen flex-col items-center justify-center bg-[#F2F2F7] px-6 py-12"
    >
      <div className="flex w-full max-w-xl flex-col items-center gap-10 text-center">
        <img src="/abra-logo-black.png" alt="Abra" className="h-10 object-contain" />

        <div>
          <h1 className="text-3xl font-bold text-[#212525]">
            שלום {user?.fullName ?? ''}
          </h1>
          <p className="mt-2 text-base text-[#53575B]">
            לאן תרצה להמשיך?
          </p>
        </div>

        <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => navigate('/admin')}
            className="flex flex-col items-center gap-3 rounded-2xl bg-white px-8 py-10 text-[#212525] shadow-md ring-1 ring-[#ECECEC] transition hover:bg-[#F8F9FB]"
          >
            <span className="text-xl font-bold">מערכת ניהול</span>
            <span className="text-sm text-[#53575B]">
              ניהול משתמשים, לקוחות, פרויקטים ומשימות
            </span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/time-report')}
            className="flex flex-col items-center gap-3 rounded-2xl bg-white px-8 py-10 text-[#212525] shadow-md ring-1 ring-[#ECECEC] transition hover:bg-[#F8F9FB]"
          >
            <span className="text-xl font-bold">דיווח שעות</span>
            <span className="text-sm text-[#53575B]">
              צפייה ודיווח שעות עבודה חודשיות
            </span>
          </button>
        </div>
      </div>
    </main>
  );
}
