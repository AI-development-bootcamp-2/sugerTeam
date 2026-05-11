import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useAllClients, useCreateClient, useUpdateClient } from '../../../services/entities.service';
import type { Client } from '../../../types/entities';
import ProjectsSection from './ProjectsSection';

interface NameForm {
  name: string;
}

function CreateClientForm({ onClose }: { onClose: () => void }) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<NameForm>();
  const createClient = useCreateClient();

  return (
    <form
      onSubmit={handleSubmit((data) => {
        createClient.mutate(data, {
          onSuccess: () => {
            reset();
            onClose();
          },
        });
      })}
      className="mt-3 flex flex-col gap-2 rounded-lg border border-gray-200 bg-gray-50 p-4"
    >
      <input
        {...register('name', { required: 'שדה חובה' })}
        placeholder="שם לקוח"
        className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      {errors.name && <p className="text-sm text-red-600">{errors.name.message}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={createClient.isPending}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
        >
          שמור
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm hover:bg-gray-100"
        >
          ביטול
        </button>
      </div>
    </form>
  );
}

function EditClientForm({ client, onClose }: { client: Client; onClose: () => void }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<NameForm>({ defaultValues: { name: client.name } });
  const updateClient = useUpdateClient();

  return (
    <form
      onSubmit={handleSubmit((data) => {
        updateClient.mutate({ id: client.id, name: data.name }, { onSuccess: onClose });
      })}
      className="flex flex-col gap-2"
    >
      <input
        {...register('name', { required: 'שדה חובה' })}
        className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      {errors.name && <p className="text-sm text-red-600">{errors.name.message}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={updateClient.isPending}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
        >
          שמור
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm hover:bg-gray-100"
        >
          ביטול
        </button>
      </div>
    </form>
  );
}

function ClientAccordion({ client }: { client: Client }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);
  const updateClient = useUpdateClient();
  const isActive = client.status === 'ACTIVE';
  const showBody = isExpanded || isEditing;

  const handleToggleActive = () => {
    if (isActive) {
      setConfirmDeactivate(true);
    } else {
      updateClient.mutate({ id: client.id, isActive: true });
    }
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <div className="flex items-center gap-3 p-3">
        <button
          type="button"
          onClick={() => setIsExpanded((prev) => !prev)}
          className="flex flex-1 items-center gap-3 text-start"
        >
          <span className="text-xs text-gray-400">{isExpanded ? '▲' : '▼'}</span>
          <span className="font-medium">{client.name}</span>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
            }`}
          >
            {isActive ? 'פעיל' : 'לא פעיל'}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setIsEditing((prev) => !prev)}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
        >
          ערוך
        </button>
        <button
          type="button"
          onClick={handleToggleActive}
          disabled={updateClient.isPending}
          className={`rounded-md px-3 py-1.5 text-sm disabled:opacity-50 ${
            isActive
              ? 'border border-red-300 text-red-600 hover:bg-red-50'
              : 'border border-green-300 text-green-700 hover:bg-green-50'
          }`}
        >
          {isActive ? 'השבת' : 'הפעל'}
        </button>
      </div>

      {confirmDeactivate && (
        <div className="border-t border-gray-200 bg-amber-50 px-4 py-3">
          <p className="mb-3 text-sm text-amber-800">
            השבתה תסיר לקוח מהרשימות הפעילות. דיווחים קיימים לא ייפגעו.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                updateClient.mutate(
                  { id: client.id, isActive: false },
                  { onSuccess: () => setConfirmDeactivate(false) },
                );
              }}
              disabled={updateClient.isPending}
              className="rounded-md bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700 disabled:opacity-50"
            >
              אישור
            </button>
            <button
              type="button"
              onClick={() => setConfirmDeactivate(false)}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-100"
            >
              ביטול
            </button>
          </div>
        </div>
      )}

      {showBody && (
        <div className="flex flex-col gap-4 border-t border-gray-200 px-4 py-3">
          {isEditing && (
            <EditClientForm client={client} onClose={() => setIsEditing(false)} />
          )}
          {isExpanded && <ProjectsSection clientId={client.id} />}
        </div>
      )}
    </div>
  );
}

export default function ClientsPage() {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const { data: clients, isLoading } = useAllClients();

  return (
    <main className="mx-auto max-w-2xl p-4">
      <h1 className="mb-6 text-2xl font-bold">לקוחות</h1>

      <button
        type="button"
        onClick={() => setShowCreateForm((prev) => !prev)}
        className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
      >
        + לקוח חדש
      </button>

      {showCreateForm && <CreateClientForm onClose={() => setShowCreateForm(false)} />}

      {isLoading && <p className="mt-4 text-gray-500">טוען...</p>}

      <div className="mt-4 flex flex-col gap-2">
        {clients?.map((client) => (
          <ClientAccordion key={client.id} client={client} />
        ))}
      </div>
    </main>
  );
}
