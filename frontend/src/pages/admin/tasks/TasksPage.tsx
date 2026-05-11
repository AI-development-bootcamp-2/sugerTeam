import { useState } from 'react';
import { useAllClients, useActiveProjects } from '../../../services/entities.service';
import TasksSection from '../clients/TasksSection';

export default function TasksPage() {
  const [clientId, setClientId] = useState<string>('');
  const [projectId, setProjectId] = useState<string>('');

  const { data: clients, isLoading: loadingClients } = useAllClients();
  const { data: projects, isLoading: loadingProjects } = useActiveProjects(clientId || undefined);

  const activeClients = clients?.filter((c) => c.status === 'ACTIVE') ?? [];

  const handleClientChange = (id: string) => {
    setClientId(id);
    setProjectId('');
  };

  return (
    <main className="mx-auto max-w-2xl p-4">
      <h1 className="mb-6 text-2xl font-bold">משימות</h1>

      <div className="mb-4">
        <label className="mb-1 block text-sm font-medium text-gray-700">בחר לקוח</label>
        <select
          value={clientId}
          onChange={(e) => handleClientChange(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">-- בחר לקוח --</option>
          {loadingClients && <option disabled>טוען...</option>}
          {activeClients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {clientId && (
        <div className="mb-6">
          <label className="mb-1 block text-sm font-medium text-gray-700">בחר פרויקט</label>
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">-- בחר פרויקט --</option>
            {loadingProjects && <option disabled>טוען...</option>}
            {projects?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {projectId && <TasksSection projectId={projectId} clientId={clientId} />}
    </main>
  );
}
