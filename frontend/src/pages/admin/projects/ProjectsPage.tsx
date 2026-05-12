import { useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  useAllClients,
  useProjectsByClient,
  useAllProjects,
  useCreateProject,
  useUpdateProject,
} from '../../../services/entities.service';
import type { ProjectWithRelations } from '../../../types/entities';
import Modal from '../../../components/Modal';
import ConfirmDialog from '../../../components/ConfirmDialog';

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return dateStr.slice(0, 10).split('-').reverse().join('/');
}

interface CreateProjectForm {
  clientId: string;
  name: string;
  startDate: string;
  endDate: string;
}

interface EditProjectForm {
  name: string;
  status: 'ACTIVE' | 'INACTIVE';
  startDate: string;
  endDate: string;
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
    formState: { errors },
  } = useForm<CreateProjectForm>({ defaultValues: { clientId: defaultClientId ?? '', name: '', startDate: '', endDate: '' } });
  const createProject = useCreateProject();

  const handleClose = () => {
    reset({ clientId: defaultClientId ?? '', name: '', startDate: '', endDate: '' });
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="יצירת פרויקט">
      <form
        onSubmit={handleSubmit((data) => {
          createProject.mutate(
            { clientId: data.clientId, name: data.name, startDate: data.startDate || undefined, endDate: data.endDate || undefined },
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
              {...register('endDate')}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
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
    formState: { errors },
  } = useForm<EditProjectForm>({
    defaultValues: {
      name:      project.name,
      status:    project.status,
      startDate: project.startDate?.slice(0, 10) ?? '',
      endDate:   project.endDate?.slice(0, 10)   ?? '',
    },
  });
  const updateProject = useUpdateProject();

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="עריכת פרויקט">
      <form
        onSubmit={handleSubmit((data) => {
          updateProject.mutate(
            { id: project.id, name: data.name, isActive: data.status === 'ACTIVE', startDate: data.startDate || null, endDate: data.endDate || null },
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
          <label className="text-sm font-medium">סטטוס</label>
          <select
            {...register('status')}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ACTIVE">פעיל</option>
            <option value="INACTIVE">לא פעיל</option>
          </select>
        </div>
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
              {...register('endDate')}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
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
        <td className="px-4 py-3 text-sm text-gray-500">{project.client.name}</td>
        <td className="px-4 py-3 text-sm font-medium">{project.name}</td>
        <td className="px-4 py-3 text-sm text-gray-500">
          {project.primaryManager?.fullName ?? '—'}
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
  const [createOpen, setCreateOpen] = useState(false);
  const { data: clients } = useAllClients();
  const { data: projects, isLoading } = useAllProjects(selectedClientId);

  return (
    <div dir="rtl" className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">פרויקטים</h1>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
        >
          + יצירה
        </button>
      </div>

      <div className="mb-4">
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
      </div>

      {isLoading && <p className="text-gray-500">טוען...</p>}

      {!isLoading && projects && projects.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-start text-sm font-semibold text-gray-600">לקוח</th>
                <th className="px-4 py-3 text-start text-sm font-semibold text-gray-600">שם פרויקט</th>
                <th className="px-4 py-3 text-start text-sm font-semibold text-gray-600">מנהל ראשי</th>
                <th className="px-4 py-3 text-start text-sm font-semibold text-gray-600">התחלה</th>
                <th className="px-4 py-3 text-start text-sm font-semibold text-gray-600">סיום</th>
                <th className="px-4 py-3 text-start text-sm font-semibold text-gray-600">סטטוס</th>
                <th className="px-4 py-3 text-start text-sm font-semibold text-gray-600">פעולות</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => (
                <ProjectRow key={project.id} project={project} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!isLoading && projects && projects.length === 0 && (
        <p className="text-gray-500">אין פרויקטים</p>
      )}

      <CreateProjectModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        defaultClientId={selectedClientId}
      />
    </div>
  );
}
