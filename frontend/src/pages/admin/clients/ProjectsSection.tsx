import { useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  useActiveProjects,
  useCreateProject,
  useUpdateProject,
} from '../../../services/entities.service';

interface ProjectsSectionProps {
  clientId: string;
}

interface NameForm {
  name: string;
}

interface ActiveProject {
  id: string;
  name: string;
  clientId: string;
}

function EditProjectForm({ project, onClose }: { project: ActiveProject; onClose: () => void }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<NameForm>({ defaultValues: { name: project.name } });
  const updateProject = useUpdateProject();

  return (
    <form
      onSubmit={handleSubmit((data) => {
        updateProject.mutate({ id: project.id, name: data.name }, { onSuccess: onClose });
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
          disabled={updateProject.isPending}
          className="rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
        >
          שמור
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-100"
        >
          ביטול
        </button>
      </div>
    </form>
  );
}

function ProjectRow({ project }: { project: ActiveProject }) {
  const [isEditing, setIsEditing] = useState(false);
  const updateProject = useUpdateProject();

  return (
    <div className="rounded-md border border-gray-100 bg-gray-50">
      <div className="flex items-center gap-3 p-2">
        <div className="flex flex-1 items-center gap-3">
          <span className="text-sm font-medium">{project.name}</span>
          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
            פעיל
          </span>
        </div>
        <button
          type="button"
          onClick={() => setIsEditing((prev) => !prev)}
          className="rounded-md border border-gray-300 px-3 py-1 text-sm hover:bg-gray-100"
        >
          ערוך
        </button>
        <button
          type="button"
          onClick={() => updateProject.mutate({ id: project.id, isActive: false })}
          disabled={updateProject.isPending}
          className="rounded-md border border-red-300 px-3 py-1 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
        >
          השבת
        </button>
      </div>
      {isEditing && (
        <div className="border-t border-gray-100 px-3 py-2">
          <EditProjectForm project={project} onClose={() => setIsEditing(false)} />
        </div>
      )}
    </div>
  );
}

function CreateProjectForm({ clientId, onClose }: { clientId: string; onClose: () => void }) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<NameForm>();
  const createProject = useCreateProject();

  return (
    <form
      onSubmit={handleSubmit((data) => {
        createProject.mutate(
          { clientId, name: data.name },
          {
            onSuccess: () => {
              reset();
              onClose();
            },
          },
        );
      })}
      className="flex flex-col gap-2 rounded-md border border-gray-200 bg-white p-3"
    >
      <input
        {...register('name', { required: 'שדה חובה' })}
        placeholder="שם פרויקט"
        className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      {errors.name && <p className="text-sm text-red-600">{errors.name.message}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={createProject.isPending}
          className="rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
        >
          שמור
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-100"
        >
          ביטול
        </button>
      </div>
    </form>
  );
}

export default function ProjectsSection({ clientId }: ProjectsSectionProps) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const { data: projects, isLoading } = useActiveProjects(clientId);

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold text-gray-500">פרויקטים</h3>

      {isLoading && <p className="text-sm text-gray-400">טוען...</p>}

      {projects?.map((project) => (
        <ProjectRow key={project.id} project={project} />
      ))}

      {showCreateForm ? (
        <CreateProjectForm clientId={clientId} onClose={() => setShowCreateForm(false)} />
      ) : (
        <button
          type="button"
          onClick={() => setShowCreateForm(true)}
          className="self-start rounded-md border border-dashed border-gray-300 px-3 py-1.5 text-sm text-gray-500 hover:border-gray-400 hover:text-gray-700"
        >
          + פרויקט חדש
        </button>
      )}
    </div>
  );
}
