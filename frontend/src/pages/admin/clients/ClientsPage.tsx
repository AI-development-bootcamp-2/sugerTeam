import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useAllClients, useCreateClient, useUpdateClient } from '../../../services/entities.service';
import type { Client } from '../../../types/entities';
import Modal from '../../../components/Modal';
import ConfirmDialog from '../../../components/ConfirmDialog';

interface ClientForm {
  name: string;
  description: string;
}

function ClientFormFields({ register, errors }: { register: ReturnType<typeof useForm<ClientForm>>['register']; errors: ReturnType<typeof useForm<ClientForm>>['formState']['errors'] }) {
  return (
    <>
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium">שם לקוח *</label>
        <input
          {...register('name', { required: 'שדה חובה' })}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium">תיאור</label>
        <input
          {...register('description')}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
    </>
  );
}

function CreateClientModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ClientForm>();
  const createClient = useCreateClient();

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="יצירת לקוח">
      <form
        onSubmit={handleSubmit((data) => {
          createClient.mutate(
            { name: data.name, description: data.description || undefined },
            { onSuccess: handleClose },
          );
        })}
        className="flex flex-col gap-4"
      >
        <ClientFormFields register={register} errors={errors} />
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={handleClose}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm hover:bg-gray-100"
          >
            ביטול
          </button>
          <button
            type="submit"
            disabled={createClient.isPending}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
          >
            שמור
          </button>
        </div>
      </form>
    </Modal>
  );
}

function EditClientModal({ client, isOpen, onClose }: { client: Client; isOpen: boolean; onClose: () => void }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ClientForm>({
    defaultValues: { name: client.name, description: client.description ?? '' },
  });
  const updateClient = useUpdateClient();

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="עריכת לקוח">
      <form
        onSubmit={handleSubmit((data) => {
          updateClient.mutate(
            { id: client.id, name: data.name, description: data.description || undefined },
            { onSuccess: onClose },
          );
        })}
        className="flex flex-col gap-4"
      >
        <ClientFormFields register={register} errors={errors} />
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm hover:bg-gray-100"
          >
            ביטול
          </button>
          <button
            type="submit"
            disabled={updateClient.isPending}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
          >
            שמור
          </button>
        </div>
      </form>
    </Modal>
  );
}

function ClientRow({ client }: { client: Client }) {
  const [editOpen, setEditOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const updateClient = useUpdateClient();
  const isActive = client.status === 'ACTIVE';

  return (
    <>
      <tr className="border-b border-gray-100 hover:bg-gray-50">
        <td className="px-4 py-3 text-sm font-medium">{client.name}</td>
        <td className="px-4 py-3 text-sm text-gray-500">{client.description ?? '—'}</td>
        <td className="px-4 py-3">
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
            }`}
          >
            {isActive ? 'פעיל' : 'לא פעיל'}
          </span>
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setEditOpen(true)}
              className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              aria-label="ערוך"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-5m-1.414-9.414a2 2 0 0 1 2.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => setConfirmOpen(true)}
              className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
              aria-label="השבת"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0 1 16.138 21H7.862a2 2 0 0 1-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </td>
      </tr>

      <EditClientModal client={client} isOpen={editOpen} onClose={() => setEditOpen(false)} />

      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => {
          updateClient.mutate(
            { id: client.id, isActive: false },
            { onSuccess: () => setConfirmOpen(false) },
          );
        }}
        title="השבתת לקוח"
        message="האם אתה בטוח שברצונך להשבית לקוח זה? הלקוח יוסר מהרשימות הפעילות."
        confirmLabel="השבת"
        isPending={updateClient.isPending}
      />
    </>
  );
}

export default function ClientsPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const { data: clients, isLoading } = useAllClients();

  return (
    <div dir="rtl" className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">לקוחות</h1>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
        >
          + יצירה
        </button>
      </div>

      {isLoading && <p className="text-gray-500">טוען...</p>}

      {clients && clients.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-start text-sm font-semibold text-gray-600">שם לקוח</th>
                <th className="px-4 py-3 text-start text-sm font-semibold text-gray-600">תיאור</th>
                <th className="px-4 py-3 text-start text-sm font-semibold text-gray-600">סטטוס</th>
                <th className="px-4 py-3 text-start text-sm font-semibold text-gray-600">פעולות</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => (
                <ClientRow key={client.id} client={client} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {clients && clients.length === 0 && (
        <p className="text-gray-500">אין לקוחות במערכת</p>
      )}

      <CreateClientModal isOpen={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}
