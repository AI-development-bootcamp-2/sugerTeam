import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useAllClients, useCreateClient, useUpdateClient } from '../../../services/entities.service';
import type { Client } from '../../../types/entities';
import Modal from '../../../components/Modal';
import ConfirmDialog from '../../../components/ConfirmDialog';
import EmptyState from '../../../components/EmptyState';

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
          placeholder="תאר בקצרה את הלקוח"
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
        <td className="overflow-hidden px-4 py-3">
          <div className="truncate text-sm font-medium">{client.name}</div>
        </td>
        <td className="overflow-hidden px-4 py-3">
          <div className="truncate text-sm text-gray-500" title={client.description ?? undefined}>
            {client.description ?? '—'}
          </div>
        </td>
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
              className="rounded-md p-1.5 hover:bg-gray-100"
              aria-label="ערוך"
            >
              <img src="/edit-logo.png" className="h-4 w-4" alt="" />
            </button>
            <button
              type="button"
              onClick={() => setConfirmOpen(true)}
              className="rounded-md p-1.5 hover:bg-red-50"
              aria-label="השבת"
            >
              <img src="/delete-logo.png" className="h-4 w-4" alt="" />
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
  const [search, setSearch] = useState('');
  const { data: clients, isLoading } = useAllClients();

  const filtered = clients?.filter((c) =>
    c.name.includes(search) || (c.description ?? '').includes(search),
  );

  return (
    <div dir="rtl" className="p-6">
      <h1 className="mb-6 text-2xl font-bold">לקוחות</h1>

      <div className="mb-4 flex items-center gap-3">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="חיפוש לקוח..."
          className="ms-auto w-48 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="shrink-0 rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
        >
          + יצירה
        </button>
      </div>

      {isLoading && <p className="text-gray-500">טוען...</p>}

      {filtered && filtered.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="w-full table-fixed">
            <thead className="bg-[#141E3E]">
              <tr>
                <th className="w-[18%] px-4 py-2 text-start text-sm font-semibold text-white">שם לקוח</th>
                <th className="w-[62%] px-4 py-2 text-start text-sm font-semibold text-white">תיאור</th>
                <th className="w-[10%] px-4 py-2 text-start text-sm font-semibold text-white">סטטוס</th>
                <th className="w-[10%] px-4 py-2 text-start text-sm font-semibold text-white">פעולות</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((client) => (
                <ClientRow key={client.id} client={client} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!isLoading && filtered && filtered.length === 0 && <EmptyState />}

      <CreateClientModal isOpen={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}
