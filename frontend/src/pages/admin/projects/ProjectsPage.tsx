import { useState } from 'react';
import { useAllClients } from '../../../services/entities.service';
import ProjectsSection from '../clients/ProjectsSection';

export default function ProjectsPage() {
  const [clientId, setClientId] = useState<string>('');
  const { data: clients, isLoading } = useAllClients();

  const activeClients = clients?.filter((c) => c.status === 'ACTIVE') ?? [];

  return (
    <main className="mx-auto max-w-2xl p-4">
      <h1 className="mb-6 text-2xl font-bold">פרויקטים</h1>

      <div className="mb-6">
        <label className="mb-1 block text-sm font-medium text-gray-700">בחר לקוח</label>
        <select
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">-- בחר לקוח --</option>
          {isLoading && <option disabled>טוען...</option>}
          {activeClients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {clientId && <ProjectsSection clientId={clientId} />}
    </main>
  );
}
