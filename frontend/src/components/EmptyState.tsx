export default function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      <p className="text-lg font-bold text-gray-700">אין מידע קיים עד כה</p>
      <img src="/no-content-image.png" alt="אין מידע" className="w-[32rem] h-auto" />
    </div>
  );
}
