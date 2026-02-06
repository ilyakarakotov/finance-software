import { useNavigate } from 'react-router-dom';
import { useProjects } from '../../hooks/useProject';
import { projectsApi } from '../../api/projects';
import { formatCurrency } from '../../utils/format';
import toast from 'react-hot-toast';
import { Plus, Trash2, FolderOpen } from 'lucide-react';

export default function ProjectList() {
  const { projects, loading, reload } = useProjects();
  const navigate = useNavigate();

  const handleCreate = async () => {
    try {
      const project = await projectsApi.create({
        name: 'New Project',
        cost_of_sale_pct: 0.065,
        gc_fee_pct: 0.12,
        contingency_pct: 0.05,
      });
      toast.success('Project created');
      navigate(`/project/${project.project_id}/setup`);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this project?')) return;
    try {
      await projectsApi.delete(id);
      toast.success('Project deleted');
      reload();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-slate-400">Loading projects...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Projects</h1>
          <p className="text-sm text-slate-400 mt-1">Greencity Development Finance Platform</p>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={16} /> New Project
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <FolderOpen size={48} className="mx-auto mb-4 opacity-50" />
          <p>No projects yet. Create your first project to get started.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {projects.map((project) => (
            <div
              key={project.project_id}
              onClick={() => navigate(`/project/${project.project_id}/setup`)}
              className="bg-navy-800/50 border border-navy-700 rounded-lg p-4 cursor-pointer hover:bg-navy-700/50 transition-colors group"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-white font-medium group-hover:text-emerald-400 transition-colors">
                    {project.name}
                  </h3>
                  <div className="flex items-center gap-4 mt-1 text-xs text-slate-400">
                    {project.address && <span>{project.address}</span>}
                    {project.total_units && <span>{project.total_units} units</span>}
                    {project.lot_size_acres && <span>{project.lot_size_acres} acres</span>}
                  </div>
                </div>
                <button
                  onClick={(e) => handleDelete(project.project_id, e)}
                  className="text-slate-500 hover:text-red-400 p-2 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
