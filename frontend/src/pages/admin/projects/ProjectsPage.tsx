import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  useAllClients,
  useAllProjects,
  useCreateProject,
  useUpdateProject,
} from '../../../services/entities.service';
import type { ProjectWithRelations } from '../../../types/entities';
import Modal from '../../../components/Modal';
import EmptyState from '../../../components/EmptyState';
import ConfirmDialog from '../../../components/ConfirmDialog';

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return dateStr.slice(0, 10).split('-').reverse().join('/');
}

interface CreateProjectForm {
  clientId:    string;
  name:        string;
  description: string;
  startDate:   string;
  endDate:     string;
}

interface EditProjectForm {
  name:        string;
  description: string;
  status:      'ACTIVE' | 'INACTIVE';
  startDate:   string;
  endDate:     string;
}

function CreateProjectModal({
  isOpen,
  onClose,
  defaultClientId,
}: {
  isOpen: boolean;
  onClose: () => void;
  defaultClientId: string | undefined;
}) {
  const { data: clients } = useAllClients();
  const {
    register,
    handleSubmit,
    reset,
    getValues,
    formState: { errors },
  } = useForm<CreateProjectForm>({ defaultValues: { clientId: defaultClientId ?? '', name: '', description: '', startDate: '', endDate: '' } });
  const createProject = useCreateProject();

  useEffect(() => {
    if (isOpen) reset({ clientId: defaultClientId ?? '', name: '', description: '', startDate: '', endDate: '' });
  }, [isOpen, defaultClientId, reset]);

  const handleClose = () => {
    reset({ clientId: defaultClientId ?? '', name: '', description: '', startDate: '', endDate: '' });
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="יצירת פרויקט">
      <form
        onSubmit={handleSubmit((data) => {
          createProject.mutate(
            { clientId: data.clientId, name: data.name, description: data.description || undefined, startDate: data.startDate || undefined, endDate: data.endDate || undefined },
            { onSuccess: handleClose },
          );
        })}
        className="flex flex-col gap-4"
      >
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">לקוח *</label>
          <select
            {...register('clientId', { required: 'שדה חובה' })}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">— בחר לקוח —</option>
            {clients?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          {errors.clientId && <p className="text-xs text-red-600">{errors.clientId.message}</p>}
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">שם פרויקט *</label>
          <input
            {...register('name', { required: 'שדה חובה' })}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
        </div>
        <div className="flex flex-col gap-1">
          <div className="flex gap-3">
            <div className="flex flex-1 flex-col gap-1">
              <label className="text-sm font-medium">תאריך התחלה</label>
              <input
                type="date"
                {...register('startDate')}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex flex-1 flex-col gap-1">
              <label className="text-sm font-medium">תאריך סיום</label>
              <input
                type="date"
                {...register('endDate', {
                  validate: (val) =>
                    !val || !getValues('startDate') || val >= getValues('startDate') || 'תאריך הסיום חייב להיות אחרי תאריך ההתחלה',
                })}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          {errors.endDate && <p className="text-xs text-red-600">{errors.endDate.message}</p>}
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">תיאור</label>
          <input
            {...register('description')}
            placeholder="תאר בקצרה את הפרויקט"
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
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
            disabled={createProject.isPending}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
          >
            שמור
          </button>
        </div>
      </form>
    </Modal>
  );
}

function EditProjectModal({
  project,
  isOpen,
  onClose,
}: {
  project: ProjectWithRelations;
  isOpen: boolean;
  onClose: () => void;
}) {
  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<EditProjectForm>({
    defaultValues: {
      name:        project.name,
      description: project.description ?? '',
      status:      project.status,
      startDate:   project.startDate?.slice(0, 10) ?? '',
      endDate:     project.endDate?.slice(0, 10)   ?? '',
    },
  });
  const updateProject = useUpdateProject();

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="עריכת פרויקט">
      <form
        onSubmit={handleSubmit((data) => {
          updateProject.mutate(
            { id: project.id, name: data.name, description: data.description || undefined, isActive: data.status === 'ACTIVE', startDate: data.startDate || null, endDate: data.endDate || null },
            { onSuccess: onClose },
          );
        })}
        className="flex flex-col gap-4"
      >
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">שם פרויקט *</label>
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
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">סטטוס</label>
          <select
            {...register('status')}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ACTIVE">פעיל</option>
            <option value="INACTIVE">לא פעיל</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <div className="flex gap-3">
            <div className="flex flex-1 flex-col gap-1">
              <label className="text-sm font-medium">תאריך התחלה</label>
              <input
                type="date"
                {...register('startDate')}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex flex-1 flex-col gap-1">
              <label className="text-sm font-medium">תאריך סיום</label>
              <input
                type="date"
                {...register('endDate', {
                  validate: (val) =>
                    !val || !getValues('startDate') || val >= getValues('startDate') || 'תאריך הסיום חייב להיות אחרי תאריך ההתחלה',
                })}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          {errors.endDate && <p className="text-xs text-red-600">{errors.endDate.message}</p>}
        </div>
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
            disabled={updateProject.isPending}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
          >
            שמור
          </button>
        </div>
      </form>
    </Modal>
  );
}

function ProjectRow({ project }: { project: ProjectWithRelations }) {
  const [editOpen, setEditOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const updateProject = useUpdateProject();
  const isActive = project.status === 'ACTIVE';

  return (
    <>
      <tr className="border-b border-gray-100 hover:bg-gray-50">
        <td className="overflow-hidden px-4 py-3">
          <div className="truncate text-sm text-gray-500">{project.client.name}</div>
        </td>
        <td className="overflow-hidden px-4 py-3">
          <div className="truncate text-sm font-medium">{project.name}</div>
        </td>
        <td className="overflow-hidden px-4 py-3">
          <div className="truncate text-sm text-gray-500" title={project.description ?? undefined}>
            {project.description ?? '—'}
          </div>
        </td>
        <td className="px-4 py-3 text-sm text-gray-500">{formatDate(project.startDate)}</td>
        <td className="px-4 py-3 text-sm text-gray-500">{formatDate(project.endDate)}</td>
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

      <EditProjectModal project={project} isOpen={editOpen} onClose={() => setEditOpen(false)} />

      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => {
          updateProject.mutate(
            { id: project.id, isActive: false },
            { onSuccess: () => setConfirmOpen(false) },
          );
        }}
        title="השבתת פרויקט"
        message="האם אתה בטוח שברצונך להשבית פרויקט זה?"
        confirmLabel="השבת"
        isPending={updateProject.isPending}
      />
    </>
  );
}

export default function ProjectsPage() {
  const [selectedClientId, setSelectedClientId] = useState<string | undefined>(undefined);
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const { data: clients } = useAllClients();
  const { data: projects, isLoading } = useAllProjects(selectedClientId);

  const filtered = projects?.filter((p) => p.name.includes(search));

  return (
    <div dir="rtl" className="p-6">
      <h1 className="mb-6 text-2xl font-bold">פרויקטים</h1>

      <div className="mb-4 flex items-center gap-3">
        <select
          value={selectedClientId ?? ''}
          onChange={(e) => setSelectedClientId(e.target.value || undefined)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">— כל הלקוחות —</option>
          {clients?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="חיפוש פרויקט..."
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

      {!isLoading && filtered && filtered.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="w-full table-fixed">
            <thead className="bg-[#141E3E]">
              <tr>
                <th className="w-[15%] px-4 py-2 text-start text-sm font-semibold text-white">שם לקוח</th>
                <th className="w-[20%] px-4 py-2 text-start text-sm font-semibold text-white">שם פרויקט</th>
                <th className="w-[25%] px-4 py-2 text-start text-sm font-semibold text-white">תיאור</th>
                <th className="w-[10%] px-4 py-2 text-start text-sm font-semibold text-white">התחלה</th>
                <th className="w-[10%] px-4 py-2 text-start text-sm font-semibold text-white">סיום</th>
                <th className="w-[10%] px-4 py-2 text-start text-sm font-semibold text-white">סטטוס</th>
                <th className="w-[10%] px-4 py-2 text-start text-sm font-semibold text-white">פעולות</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((project) => (
                <ProjectRow key={project.id} project={project} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!isLoading && filtered && filtered.length === 0 && <EmptyState />}

      <CreateProjectModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        defaultClientId={selectedClientId}
      />
    </div>
  );
}
