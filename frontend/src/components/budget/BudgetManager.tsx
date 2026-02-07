import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { budgetApi } from '../../api/budget';
import { projectsApi } from '../../api/projects';
import { costCodesApi } from '../../api/cost_codes';
import type { BudgetLineItem } from '../../types/budget';
import type { ProjectDetail, Building as ProjectBuilding } from '../../types/project';
import type { CostCode, CostCodeTreeNode, CategoryNode, SubcategoryNode } from '../../types/cost_code';
import CurrencyInput from '../shared/CurrencyInput';
import { formatCurrency, formatNumber } from '../../utils/format';
import toast from 'react-hot-toast';
import { ChevronDown, ChevronRight, Wand2, Trash2 } from 'lucide-react';

interface CostCodeTreeDivision {
  division_number: string;
  division_name: string;
  total: number;
  categories: CostCodeTreeCategory[];
}

interface CostCodeTreeCategory {
  category_number: string;
  category_name: string;
  total: number;
  subcategories: CostCodeTreeSubcategory[];
}

interface CostCodeTreeSubcategory {
  subcategory_number: string;
  subcategory_name: string;
  total: number;
  items: BudgetLineItem[];
}

interface ExpandedState {
  divisions: Record<string, boolean>;
  categories: Record<string, boolean>;
  subcategories: Record<string, boolean>;
}

export default function BudgetManager() {
  const { projectId } = useParams<{ projectId: string }>();
  const pid = projectId ? parseInt(projectId) : null;

  const [items, setItems] = useState<BudgetLineItem[]>([]);
  const [costCodeMap, setCostCodeMap] = useState<Record<number, CostCode>>({});
  const [loading, setLoading] = useState(true);
  const [projectBuildings, setProjectBuildings] = useState<Record<number, ProjectBuilding>>({});
  const [selectedBuilding, setSelectedBuilding] = useState<number | null>(null);
  const [generating, setGenerating] = useState(false);
  const [expandedState, setExpandedState] = useState<ExpandedState>({
    divisions: {},
    categories: {},
    subcategories: {},
  });

  const load = useCallback(async () => {
    if (!pid) return;
    try {
      setLoading(true);

      // Load budget items
      const budgetItems = await budgetApi.list(pid);
      setItems(budgetItems);

      // Fetch cost code tree to build a map
      const costCodeDivisions: CostCodeTreeNode[] = await costCodesApi.tree() as any;
      const ccMap: Record<number, CostCode> = {};
      (costCodeDivisions || []).forEach((div: CostCodeTreeNode) => {
        div.categories.forEach((cat: CategoryNode) => {
          cat.subcategories.forEach((subcat: SubcategoryNode) => {
            subcat.items.forEach((item: CostCode) => {
              ccMap[item.cost_code_id] = item;
            });
          });
        });
      });
      setCostCodeMap(ccMap);

      // Fetch project detail for building names
      try {
        const projectDetail: ProjectDetail = await projectsApi.get(pid);
        const buildingMap: Record<number, ProjectBuilding> = {};
        projectDetail.phases.forEach((phase) => {
          phase.buildings.forEach((building) => {
            buildingMap[building.building_id] = building;
          });
        });
        setProjectBuildings(buildingMap);

        // Auto-select first building if not already selected
        if (!selectedBuilding && Object.keys(buildingMap).length > 0) {
          const firstBuildingId = Object.keys(buildingMap)[0];
          setSelectedBuilding(parseInt(firstBuildingId));
        }
      } catch (err: any) {
        toast.error('Failed to load project details: ' + err.message);
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [pid, selectedBuilding]);

  useEffect(() => {
    load();
  }, [load]);

  const handleUpdate = async (id: number, field: string, value: any) => {
    try {
      await budgetApi.update(id, { [field]: value });
      load();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await budgetApi.delete(id);
      toast.success('Line item deleted');
      load();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleGenerateTemplate = async () => {
    if (!pid || !selectedBuilding) return;
    try {
      setGenerating(true);
      await budgetApi.generateFromTemplate(pid, selectedBuilding);
      toast.success('Cost code items generated from template');
      load();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const toggleDivision = (divisionNumber: string) => {
    setExpandedState((prev) => ({
      ...prev,
      divisions: {
        ...prev.divisions,
        [divisionNumber]: !prev.divisions[divisionNumber],
      },
    }));
  };

  const toggleCategory = (categoryKey: string) => {
    setExpandedState((prev) => ({
      ...prev,
      categories: {
        ...prev.categories,
        [categoryKey]: !prev.categories[categoryKey],
      },
    }));
  };

  const toggleSubcategory = (subcategoryKey: string) => {
    setExpandedState((prev) => ({
      ...prev,
      subcategories: {
        ...prev.subcategories,
        [subcategoryKey]: !prev.subcategories[subcategoryKey],
      },
    }));
  };

  // Filter items by building and only those with cost_code_id
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (!item.cost_code_id) return false;
      if (selectedBuilding !== null && item.building_id !== selectedBuilding) return false;
      return true;
    });
  }, [items, selectedBuilding]);

  // Build the 4-level tree from filtered items
  const treeData = useMemo(() => {
    const divisions: Record<string, CostCodeTreeDivision> = {};

    filteredItems.forEach((item) => {
      const costCode = item.cost_code_id ? costCodeMap[item.cost_code_id] : null;
      if (!costCode) return;

      const divKey = costCode.division_number;
      const catKey = `${divKey}|${costCode.category_number}`;
      const subcatKey = `${catKey}|${costCode.subcategory_number}`;

      if (!divisions[divKey]) {
        divisions[divKey] = {
          division_number: costCode.division_number,
          division_name: costCode.division_name,
          total: 0,
          categories: [],
        };
      }

      const div = divisions[divKey];
      let cat = div.categories.find((c) => c.category_number === costCode.category_number);
      if (!cat) {
        cat = {
          category_number: costCode.category_number,
          category_name: costCode.category_name,
          total: 0,
          subcategories: [],
        };
        div.categories.push(cat);
      }

      let subcat = cat.subcategories.find(
        (s) => s.subcategory_number === costCode.subcategory_number
      );
      if (!subcat) {
        subcat = {
          subcategory_number: costCode.subcategory_number,
          subcategory_name: costCode.subcategory_name,
          total: 0,
          items: [],
        };
        cat.subcategories.push(subcat);
      }

      subcat.items.push(item);
      subcat.total += item.budget_amount || 0;
      cat.total += item.budget_amount || 0;
      div.total += item.budget_amount || 0;
    });

    // Sort categories and subcategories
    Object.values(divisions).forEach((div) => {
      div.categories.sort((a, b) => a.category_number.localeCompare(b.category_number));
      div.categories.forEach((cat) => {
        cat.subcategories.sort((a, b) => a.subcategory_number.localeCompare(b.subcategory_number));
      });
    });

    return Object.values(divisions).sort((a, b) =>
      a.division_number.localeCompare(b.division_number)
    );
  }, [filteredItems, costCodeMap]);

  // Calculate totals
  const grandTotal = useMemo(
    () => filteredItems.reduce((sum, i) => sum + (i.budget_amount || 0), 0),
    [filteredItems]
  );

  const buildingSF = useMemo(() => {
    if (!selectedBuilding) return 0;
    const building = projectBuildings[selectedBuilding];
    if (!building) return 0;
    return building.total_sf || (building.sf_per_unit && building.unit_count
      ? building.sf_per_unit * building.unit_count
      : 0);
  }, [selectedBuilding, projectBuildings]);

  const perSF = useMemo(
    () => (buildingSF > 0 ? grandTotal / buildingSF : 0),
    [grandTotal, buildingSF]
  );

  const itemCount = filteredItems.length;

  // Get building list
  const buildingList = useMemo(
    () =>
      Object.values(projectBuildings)
        .filter((b) => b.building_id)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [projectBuildings]
  );

  // Initialize expanded state to all open
  useEffect(() => {
    const newState: ExpandedState = {
      divisions: {},
      categories: {},
      subcategories: {},
    };
    treeData.forEach((div) => {
      newState.divisions[div.division_number] = true;
      div.categories.forEach((cat) => {
        newState.categories[`${div.division_number}|${cat.category_number}`] = true;
        cat.subcategories.forEach((subcat) => {
          newState.subcategories[`${div.division_number}|${cat.category_number}|${subcat.subcategory_number}`] = true;
        });
      });
    });
    setExpandedState(newState);
  }, [treeData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400">
        Loading budget...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Budget / Cost Code Breakdown</h2>
        <button
          onClick={handleGenerateTemplate}
          disabled={generating || !selectedBuilding}
          className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-600/50 text-white px-4 py-2 rounded text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Wand2 size={16} />
          {generating ? 'Generating...' : 'Generate from Template'}
        </button>
      </div>

      {/* Building Selector */}
      <div className="flex items-center gap-4 bg-navy-800/50 border border-navy-700 rounded-lg p-4">
        <label className="text-sm font-medium text-slate-300">Building:</label>
        <select
          value={selectedBuilding ?? ''}
          onChange={(e) => setSelectedBuilding(e.target.value ? parseInt(e.target.value) : null)}
          className="bg-navy-900 text-slate-300 text-sm rounded px-3 py-2 border border-navy-700 flex-1"
        >
          <option value="">Select a building...</option>
          {buildingList.map((b) => (
            <option key={b.building_id} value={b.building_id}>
              {b.name}
            </option>
          ))}
        </select>
      </div>

      {/* Summary Bar */}
      {selectedBuilding && (
        <div className="grid grid-cols-3 gap-4 bg-navy-800/50 border border-navy-700 rounded-lg p-4">
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">
              Total Budget
            </p>
            <p className="text-2xl font-financial font-bold text-white">{formatCurrency(grandTotal)}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">$/SF</p>
            <p className="text-2xl font-financial font-bold text-white">
              {perSF > 0 ? `$${perSF.toFixed(2)}` : '—'}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">
              Line Items
            </p>
            <p className="text-2xl font-financial font-bold text-white">{itemCount}</p>
          </div>
        </div>
      )}

      {/* Cost Code Tree Table */}
      {!selectedBuilding ? (
        <div className="bg-navy-800/50 border border-navy-700 rounded-lg p-8 text-center">
          <p className="text-slate-400">Please select a building to view cost code items.</p>
        </div>
      ) : treeData.length === 0 ? (
        <div className="bg-navy-800/50 border border-navy-700 rounded-lg p-8">
          <div className="space-y-4">
            <p className="text-slate-400 text-center">No cost code items for this building.</p>
            <div className="flex justify-center">
              <button
                onClick={handleGenerateTemplate}
                disabled={generating}
                className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-6 py-2 rounded font-medium transition-colors disabled:opacity-50"
              >
                <Wand2 size={16} />
                Generate from Template
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-navy-800/50 border border-navy-700 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-navy-900/50 text-slate-400 text-xs uppercase tracking-wider border-b border-navy-700">
                  <th className="text-left py-3 px-3 w-8"></th>
                  <th className="text-left py-3 px-3 min-w-[300px]">Code / Description</th>
                  <th className="text-left py-3 px-3 w-24">Unit Type</th>
                  <th className="text-right py-3 px-3 w-20">Qty</th>
                  <th className="text-right py-3 px-3 w-32">Unit Price</th>
                  <th className="text-right py-3 px-3 w-32">Cost / Total</th>
                  <th className="text-center py-3 px-3 w-8"></th>
                </tr>
              </thead>
              <tbody>
                {treeData.map((division) => {
                  const divKey = division.division_number;
                  const divExpanded = expandedState.divisions[divKey] !== false;

                  return (
                    <React.Fragment key={`div-${divKey}`}>
                      {/* Division Row */}
                      <tr
                        className="bg-navy-700/40 cursor-pointer hover:bg-navy-700/60 transition-colors border-b border-navy-700"
                        onClick={() => toggleDivision(divKey)}
                      >
                        <td className="py-3 px-3 text-slate-300">
                          {divExpanded ? (
                            <ChevronDown size={16} />
                          ) : (
                            <ChevronRight size={16} />
                          )}
                        </td>
                        <td className="py-3 px-3 text-white font-bold text-base">
                          {divKey} {division.division_name}
                        </td>
                        <td></td>
                        <td></td>
                        <td></td>
                        <td className="py-3 px-3 text-right font-financial font-bold text-white">
                          {formatCurrency(division.total)}
                        </td>
                        <td></td>
                      </tr>

                      {/* Categories */}
                      {divExpanded &&
                        division.categories.map((category) => {
                          const catKey = `${divKey}|${category.category_number}`;
                          const catExpanded = expandedState.categories[catKey] !== false;

                          return (
                            <React.Fragment key={`cat-${catKey}`}>
                              {/* Category Row */}
                              <tr
                                className="bg-navy-700/20 cursor-pointer hover:bg-navy-700/40 transition-colors border-b border-navy-700"
                                onClick={() => toggleCategory(catKey)}
                              >
                                <td className="py-2 px-3 text-slate-300">
                                  <div style={{ marginLeft: '1.5rem' }}>
                                    {catExpanded ? (
                                      <ChevronDown size={14} />
                                    ) : (
                                      <ChevronRight size={14} />
                                    )}
                                  </div>
                                </td>
                                <td className="py-2 px-3 text-slate-300 font-semibold text-sm">
                                  {category.category_number} {category.category_name}
                                </td>
                                <td></td>
                                <td></td>
                                <td></td>
                                <td className="py-2 px-3 text-right font-financial font-bold text-slate-200">
                                  {formatCurrency(category.total)}
                                </td>
                                <td></td>
                              </tr>

                              {/* Subcategories */}
                              {catExpanded &&
                                category.subcategories.map((subcategory) => {
                                  const subcatKey = `${catKey}|${subcategory.subcategory_number}`;
                                  const subcatExpanded = expandedState.subcategories[subcatKey] !== false;

                                  return (
                                    <React.Fragment key={`subcat-${subcatKey}`}>
                                      {/* Subcategory Row */}
                                      <tr
                                        className="bg-navy-800/30 cursor-pointer hover:bg-navy-800/50 transition-colors border-b border-navy-700"
                                        onClick={() => toggleSubcategory(subcatKey)}
                                      >
                                        <td className="py-2 px-3 text-slate-300">
                                          <div style={{ marginLeft: '3rem' }}>
                                            {subcatExpanded ? (
                                              <ChevronDown size={14} />
                                            ) : (
                                              <ChevronRight size={14} />
                                            )}
                                          </div>
                                        </td>
                                        <td className="py-2 px-3 text-slate-300 text-sm">
                                          {subcategory.subcategory_number} {subcategory.subcategory_name}
                                        </td>
                                        <td></td>
                                        <td></td>
                                        <td></td>
                                        <td className="py-2 px-3 text-right font-financial font-bold text-slate-200">
                                          {formatCurrency(subcategory.total)}
                                        </td>
                                        <td></td>
                                      </tr>

                                      {/* Line Items */}
                                      {subcatExpanded &&
                                        subcategory.items.map((item) => {
                                          const cc = item.cost_code_id ? costCodeMap[item.cost_code_id] : null;
                                          return (
                                          <tr
                                            key={`item-${item.line_item_id}`}
                                            className="border-b border-navy-800/50 hover:bg-navy-800/30 transition-colors"
                                          >
                                            <td className="py-2 px-3"></td>
                                            <td className="py-2 px-3 text-sm">
                                              <div style={{ marginLeft: '4.5rem' }}>
                                                <span className="text-slate-300 font-medium">
                                                  {cc?.item_code || 'N/A'}
                                                </span>
                                                <span className="text-slate-500 text-xs ml-2">
                                                  {cc?.item_name || item.description || ''}
                                                </span>
                                              </div>
                                            </td>
                                            <td className="py-2 px-3 w-24 text-slate-400 text-xs">
                                              {item.unit_type || cc?.default_unit_type || '—'}
                                            </td>
                                            <td className="py-2 px-3 w-20 text-right">
                                              <input
                                                type="number"
                                                value={item.quantity ?? ''}
                                                onChange={(e) =>
                                                  handleUpdate(
                                                    item.line_item_id,
                                                    'quantity',
                                                    e.target.value ? parseFloat(e.target.value) : null
                                                  )
                                                }
                                                className="editable-cell bg-transparent text-slate-300 text-xs w-full px-1 py-0.5 rounded hover:bg-navy-700/30 focus:bg-navy-700/50 focus:outline-none focus:ring-1 focus:ring-blue-500 text-right"
                                                placeholder="—"
                                              />
                                            </td>
                                            <td className="py-2 px-3 w-32 text-right">
                                              <CurrencyInput
                                                value={item.unit_price || 0}
                                                onChange={(val) =>
                                                  handleUpdate(item.line_item_id, 'unit_price', val)
                                                }
                                                className="editable-cell bg-transparent text-slate-300 text-xs w-full px-1 py-0.5 rounded hover:bg-navy-700/30 focus:bg-navy-700/50 focus:outline-none focus:ring-1 focus:ring-blue-500 text-right"
                                              />
                                            </td>
                                            <td className="py-2 px-3 w-32 text-right font-financial font-bold text-white">
                                              {formatCurrency(item.budget_amount || 0)}
                                            </td>
                                            <td className="py-2 px-3 w-8">
                                              <button
                                                onClick={() => handleDelete(item.line_item_id)}
                                                className="text-red-400 hover:text-red-300 transition-colors"
                                              >
                                                <Trash2 size={14} />
                                              </button>
                                            </td>
                                          </tr>
                                          );
                                        })}
                                    </React.Fragment>
                                  );
                                })}
                            </React.Fragment>
                          );
                        })}
                    </React.Fragment>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-navy-900/70 border-t border-navy-700 font-semibold">
                  <td className="py-3 px-3"></td>
                  <td className="py-3 px-3 text-white">Grand Total</td>
                  <td></td>
                  <td></td>
                  <td></td>
                  <td className="py-3 px-3 w-32 text-right font-financial text-white text-lg">
                    {formatCurrency(grandTotal)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
