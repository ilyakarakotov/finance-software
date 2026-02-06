import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { projectsApi } from '../../api/projects';
import { useProjectDetail } from '../../hooks/useProject';
import type { ProjectCreate, PhaseCreate, BuildingCreate } from '../../types/project';
import CurrencyInput from '../shared/CurrencyInput';
import PercentInput from '../shared/PercentInput';
import toast from 'react-hot-toast';
import { Plus, Trash2, Building2, Layers, Save } from 'lucide-react';

export default function ProjectSetup() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const pid = projectId ? parseInt(projectId) : null;
  const { project, loading, reload } = useProjectDetail(pid);

  const [form, setForm] = useState<ProjectCreate>({
    name: '',
    address: '',
    lot_size_acres: 0,
    start_date: '',
    total_units: 0,
    total_sf: 0,
    cost_of_sale_pct: 0.065,
    gc_fee_pct: 0.12,
    contingency_pct: 0.12,
    sales_tax_rate: 0,
    construction_cost_psf: 0,
    soft_costs_pct: 0.12,
    gp_equity_pct: 0.59,
    preferred_return_rate: 0.18,
    senior_debt_rate: 0.11,
    loan_release_pct: 1.15,
    land_loan_origination_pct: 0.03,
    use_ltc_ratio: false,
    ltc_ratio: null,
  });

  const [newPhase, setNewPhase] = useState({ name: '', start_month: 0, sequence: 1 });
  const [newBuilding, setNewBuilding] = useState({ phase_id: 0, name: '', unit_count: 5, sf_per_unit: 1800, construction_start_month: 1, construction_duration: 6 });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (project) {
      setForm({
        name: project.name,
        address: project.address || '',
        lot_size_acres: project.lot_size_acres || 0,
        start_date: project.start_date ? project.start_date.split('T')[0] : '',
        total_units: project.total_units || 0,
        total_sf: project.total_sf || 0,
        cost_of_sale_pct: project.cost_of_sale_pct,
        gc_fee_pct: project.gc_fee_pct,
        contingency_pct: project.contingency_pct,
        sales_tax_rate: project.sales_tax_rate,
        construction_cost_psf: project.construction_cost_psf || 0,
        soft_costs_pct: project.soft_costs_pct || 0.12,
        gp_equity_pct: project.gp_equity_pct || 0.59,
        preferred_return_rate: project.preferred_return_rate || 0.18,
        senior_debt_rate: project.senior_debt_rate || 0.11,
        loan_release_pct: project.loan_release_pct || 1.15,
        land_loan_origination_pct: project.land_loan_origination_pct || 0.03,
        use_ltc_ratio: project.use_ltc_ratio || false,
        ltc_ratio: project.ltc_ratio ?? null,
      });
    }
  }, [project]);

  const handleSave = async () => {
    try {
      setSaving(true);
      if (pid) {
        await projectsApi.update(pid, form);
        toast.success('Project updated');
      } else {
        const created = await projectsApi.create(form);
        toast.success('Project created');
        navigate(`/project/${created.project_id}/setup`);
      }
      reload();
    } catch (err: any) {
      toast.error(err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleAddPhase = async () => {
    if (!pid || !newPhase.name) return;
    try {
      await projectsApi.createPhase(pid, newPhase);
      toast.success('Phase added');
      setNewPhase({ name: '', start_month: 0, sequence: (project?.phases.length || 0) + 1 });
      reload();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDeletePhase = async (phaseId: number) => {
    try {
      await projectsApi.deletePhase(phaseId);
      toast.success('Phase deleted');
      reload();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleAddBuilding = async () => {
    if (!newBuilding.phase_id || !newBuilding.name) return;
    try {
      await projectsApi.createBuilding(newBuilding);
      toast.success('Building added with auto-generated units');
      setNewBuilding({ ...newBuilding, name: '' });
      reload();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleBuildingUpdate = async (buildingId: number, field: string, value: any) => {
    try {
      await projectsApi.updateBuilding(buildingId, { [field]: value });
      reload();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDeleteBuilding = async (buildingId: number) => {
    try {
      await projectsApi.deleteBuilding(buildingId);
      toast.success('Building deleted');
      reload();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleUnitUpdate = async (unitId: number, field: string, value: any) => {
    try {
      await projectsApi.updateUnit(unitId, { [field]: value });
      reload();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-slate-400">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Project Info */}
      <div className="bg-navy-800/50 border border-navy-700 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Building2 size={20} />
          Project Information
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Project Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="editable-cell bg-navy-900 text-white text-sm px-3 py-2 rounded w-full"
              placeholder="e.g. Lowell Heights"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Address</label>
            <input
              type="text"
              value={form.address || ''}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="editable-cell bg-navy-900 text-white text-sm px-3 py-2 rounded w-full"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Lot Size (acres)</label>
            <input
              type="number"
              step="0.1"
              value={form.lot_size_acres || ''}
              onChange={(e) => setForm({ ...form, lot_size_acres: parseFloat(e.target.value) || 0 })}
              className="editable-cell bg-navy-900 text-white text-sm px-3 py-2 rounded w-full"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Start Date</label>
            <input
              type="date"
              value={form.start_date || ''}
              onChange={(e) => setForm({ ...form, start_date: e.target.value })}
              className="editable-cell bg-navy-900 text-white text-sm px-3 py-2 rounded w-full"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Total Units</label>
            <input
              type="number"
              value={form.total_units || ''}
              onChange={(e) => setForm({ ...form, total_units: parseInt(e.target.value) || 0 })}
              className="editable-cell bg-navy-900 text-white text-sm px-3 py-2 rounded w-full"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Total SF</label>
            <input
              type="number"
              value={form.total_sf || ''}
              onChange={(e) => setForm({ ...form, total_sf: parseInt(e.target.value) || 0 })}
              className="editable-cell bg-navy-900 text-white text-sm px-3 py-2 rounded w-full"
            />
          </div>
        </div>

        <h3 className="text-sm font-medium text-slate-300 mt-6 mb-3">Default Rates</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Cost of Sale %</label>
            <PercentInput value={form.cost_of_sale_pct || 0} onChange={(v) => setForm({ ...form, cost_of_sale_pct: v })} />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">GC Fee %</label>
            <PercentInput value={form.gc_fee_pct || 0} onChange={(v) => setForm({ ...form, gc_fee_pct: v })} />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Contingency %</label>
            <PercentInput value={form.contingency_pct || 0} onChange={(v) => setForm({ ...form, contingency_pct: v })} />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Sales Tax Rate</label>
            <PercentInput value={form.sales_tax_rate || 0} onChange={(v) => setForm({ ...form, sales_tax_rate: v })} />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Construction Cost ($/SF)</label>
            <CurrencyInput value={form.construction_cost_psf || 0} onChange={(v) => setForm({ ...form, construction_cost_psf: v })} />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Soft Costs %</label>
            <PercentInput value={form.soft_costs_pct || 0} onChange={(v) => setForm({ ...form, soft_costs_pct: v })} />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">GP Equity %</label>
            <PercentInput value={form.gp_equity_pct || 0} onChange={(v) => setForm({ ...form, gp_equity_pct: v })} />
            <p className="text-xs text-slate-500 mt-1">LP Equity %: {((1 - (form.gp_equity_pct || 0)) * 100).toFixed(1)}%</p>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Preferred Return (XIRR)</label>
            <PercentInput value={form.preferred_return_rate || 0} onChange={(v) => setForm({ ...form, preferred_return_rate: v })} />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Senior Debt Rate</label>
            <PercentInput value={form.senior_debt_rate || 0} onChange={(v) => setForm({ ...form, senior_debt_rate: v })} />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Loan Release %</label>
            <PercentInput value={form.loan_release_pct || 0} onChange={(v) => setForm({ ...form, loan_release_pct: v })} />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Land Loan Origination Fee</label>
            <PercentInput value={form.land_loan_origination_pct || 0} onChange={(v) => setForm({ ...form, land_loan_origination_pct: v })} />
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors disabled:opacity-50"
          >
            <Save size={16} />
            {saving ? 'Saving...' : pid ? 'Update Project' : 'Create Project'}
          </button>
        </div>
      </div>

      {/* Phases */}
      {pid && (
        <div className="bg-navy-800/50 border border-navy-700 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Layers size={20} />
            Phases
          </h2>

          {project?.phases.map((phase) => (
            <div key={phase.phase_id} className="mb-4 border border-navy-600 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-4">
                  <span className="text-white font-medium">{phase.name}</span>
                  <span className="text-xs text-slate-400">Start Month: {phase.start_month}</span>
                  <span className="text-xs text-slate-400">Seq: {phase.sequence}</span>
                </div>
                <button
                  onClick={() => handleDeletePhase(phase.phase_id)}
                  className="text-red-400 hover:text-red-300 p-1"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              {/* Buildings in this phase */}
              {phase.buildings.map((building) => (
                <div key={building.building_id} className="ml-4 mb-2 bg-navy-900/50 rounded p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-sm text-white">{building.name}</span>
                      <span className="text-xs text-slate-400">{building.unit_count} units</span>
                      <span className="text-xs text-slate-400">{building.sf_per_unit} SF/unit</span>
                      <span className="text-xs text-slate-500">|</span>
                      <span className="text-xs text-slate-400">Start Mo:</span>
                      <input
                        type="number"
                        value={building.construction_start_month}
                        onChange={(e) => handleBuildingUpdate(building.building_id, 'construction_start_month', parseInt(e.target.value) || 1)}
                        className="editable-cell bg-navy-900 text-white text-xs px-1 py-0.5 rounded w-12 text-right border border-navy-700"
                      />
                      <span className="text-xs text-slate-400">Duration:</span>
                      <input
                        type="number"
                        value={building.construction_duration}
                        onChange={(e) => handleBuildingUpdate(building.building_id, 'construction_duration', parseInt(e.target.value) || 6)}
                        className="editable-cell bg-navy-900 text-white text-xs px-1 py-0.5 rounded w-12 text-right border border-navy-700"
                      />
                      <span className="text-xs text-slate-500">mo</span>
                    </div>
                    <button
                      onClick={() => handleDeleteBuilding(building.building_id)}
                      className="text-red-400 hover:text-red-300 p-1"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>

                  {/* Unit table */}
                  {building.units && building.units.length > 0 && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-slate-400 border-b border-navy-700">
                            <th className="text-left py-1 px-2">Unit</th>
                            <th className="text-right py-1 px-2">SF</th>
                            <th className="text-right py-1 px-2">Sale Price</th>
                            <th className="text-right py-1 px-2">Sale Month</th>
                            <th className="text-left py-1 px-2">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {building.units.map((unit) => (
                            <tr key={unit.unit_id} className="border-b border-navy-800/50">
                              <td className="py-1 px-2 text-slate-300">{unit.unit_number}</td>
                              <td className="py-1 px-2">
                                <input
                                  type="number"
                                  value={unit.sf || ''}
                                  onChange={(e) => handleUnitUpdate(unit.unit_id, 'sf', parseInt(e.target.value) || 0)}
                                  className="editable-cell bg-transparent text-right font-financial text-xs w-16 px-1 py-0.5 rounded"
                                />
                              </td>
                              <td className="py-1 px-2">
                                <CurrencyInput
                                  value={unit.sale_price || 0}
                                  onChange={(v) => handleUnitUpdate(unit.unit_id, 'sale_price', v)}
                                  className="text-xs w-24"
                                />
                              </td>
                              <td className="py-1 px-2">
                                <input
                                  type="number"
                                  value={unit.sale_month ?? ''}
                                  onChange={(e) => handleUnitUpdate(unit.unit_id, 'sale_month', e.target.value ? parseInt(e.target.value) : null)}
                                  className="editable-cell bg-transparent text-right font-financial text-xs w-12 px-1 py-0.5 rounded"
                                />
                              </td>
                              <td className="py-1 px-2">
                                <select
                                  value={unit.status}
                                  onChange={(e) => handleUnitUpdate(unit.unit_id, 'status', e.target.value)}
                                  className="bg-navy-900 text-slate-300 text-xs rounded px-1 py-0.5 border border-navy-700"
                                >
                                  <option value="available">Available</option>
                                  <option value="under_contract">Under Contract</option>
                                  <option value="closed">Closed</option>
                                </select>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}

              {/* Add Building */}
              <div className="ml-4 mt-2 flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Building name"
                  value={newBuilding.phase_id === phase.phase_id ? newBuilding.name : ''}
                  onChange={(e) => setNewBuilding({ ...newBuilding, phase_id: phase.phase_id, name: e.target.value })}
                  className="bg-navy-900 text-white text-xs px-2 py-1 rounded border border-navy-700 w-32"
                />
                <input
                  type="number"
                  placeholder="Units"
                  value={newBuilding.phase_id === phase.phase_id ? newBuilding.unit_count : 5}
                  onChange={(e) => setNewBuilding({ ...newBuilding, phase_id: phase.phase_id, unit_count: parseInt(e.target.value) || 0 })}
                  className="bg-navy-900 text-white text-xs px-2 py-1 rounded border border-navy-700 w-16"
                />
                <input
                  type="number"
                  placeholder="SF/unit"
                  value={newBuilding.phase_id === phase.phase_id ? newBuilding.sf_per_unit : 1800}
                  onChange={(e) => setNewBuilding({ ...newBuilding, phase_id: phase.phase_id, sf_per_unit: parseInt(e.target.value) || 0 })}
                  className="bg-navy-900 text-white text-xs px-2 py-1 rounded border border-navy-700 w-20"
                />
                <button
                  onClick={() => { setNewBuilding({ ...newBuilding, phase_id: phase.phase_id }); handleAddBuilding(); }}
                  className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-xs"
                >
                  <Plus size={12} /> Building
                </button>
              </div>
            </div>
          ))}

          {/* Add Phase */}
          <div className="flex items-center gap-2 mt-4">
            <input
              type="text"
              placeholder="Phase name"
              value={newPhase.name}
              onChange={(e) => setNewPhase({ ...newPhase, name: e.target.value })}
              className="bg-navy-900 text-white text-sm px-3 py-2 rounded border border-navy-700 w-40"
            />
            <input
              type="number"
              placeholder="Start month"
              value={newPhase.start_month}
              onChange={(e) => setNewPhase({ ...newPhase, start_month: parseInt(e.target.value) || 0 })}
              className="bg-navy-900 text-white text-sm px-3 py-2 rounded border border-navy-700 w-28"
            />
            <button
              onClick={handleAddPhase}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-sm font-medium"
            >
              <Plus size={16} /> Add Phase
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
