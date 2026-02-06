import { useState, useEffect, useCallback } from 'react';
import { projectsApi } from '../api/projects';
import type { Project, ProjectDetail } from '../types/project';
import toast from 'react-hot-toast';

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await projectsApi.list();
      setProjects(data);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return { projects, loading, reload: load };
}

export function useProjectDetail(projectId: number | null) {
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!projectId) return;
    try {
      setLoading(true);
      const data = await projectsApi.get(projectId);
      setProject(data);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load project');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  return { project, loading, reload: load };
}
