import React, { useState, useEffect, useCallback } from 'react';
import { costCodesApi } from '../../api/cost_codes';
import type { CostCode, CostCodeCreate, CostCodeTreeNode, CategoryNode, SubcategoryNode } from '../../types/cost_code';
import { UNIT_TYPE_LABELS, type UnitType } from '../../types/cost_code';
import CurrencyInput from '../shared/CurrencyInput';
import { formatCurrency } from '../../utils/format';
import toast from 'react-hot-toast';
import {
  ChevronDown, ChevronRight, Plus, Trash2, Save, X,
  FileSpreadsheet, Search,
} from 'lucide-react';

interface ExpandedState {
  divisions: Record<string, boolean>;
  categories: Record<string, boolean>;
  subcategories: Record<string, boolean>;
}

interface NewItemForm {
  parentDivision: string;
  parentDivisionName: string;
  parentCategory: string;
  parentCategoryName: string;
  parentSubcategory: string;
  parentSubcategoryName: string;
  item_code: string;
  item_name: string;
  default_unit_type: string;
  default_unit_price: number;
}

const EMPTY_NEW_ITEM: NewItemForm = {
  parentDivision: '',
  parentDivisionName: '',
  parentCategory: '',
  parentCategoryName: '',
  parentSubcategory: '',
  parentSubcategoryName: '',
  item_code: '',
  item_name: '',
  default_unit_type: '',
  default_unit_price: 0,
};

export default function CostCodeTemplate() {
  const [tree, setTree] = useState<CostCodeTreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedState, setExpandedState] = useState<ExpandedState>({
    divisions: {},
    categories: {},
    subcategories: {},
  });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValues, setEditValues] = useState<Partial<CostCode>>({});
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [newItem, setNewItem] = useState<NewItemForm>(EMPTY_NEW_ITEM);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data: CostCodeTreeNode[] = await costCodesApi.tree() as any;
      setTree(data || []);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Initialize expanded state
  useEffect(() => {
    const newState: ExpandedState = { divisions: {}, categories: {}, subcategories: {} };
    tree.forEach((div) => {
      newState.divisions[div.division_number] = true;
      div.categories.forEach((cat) => {
        newState.categories[`${div.division_number}|${cat.category_number}`] = true;
        cat.subcategories.forEach((subcat) => {
          newState.subcategories[`${div.division_number}|${cat.category_number}|${subcat.subcategory_number}`] = true;
        });
      });
    });
    setExpandedState(newState);
  }, [tree]);

  const toggleDivision = (key: string) => {
    setExpandedState((prev) => ({
      ...prev,
      divisions: { ...prev.divisions, [key]: !prev.divisions[key] },
    }));
  };

  const toggleCategory = (key: string) => {
    setExpandedState((prev) => ({
      ...prev,
      categories: { ...prev.categories, [key]: !prev.categories[key] },
    }));
  };

  const toggleSubcategory = (key: string) => {
    setExpandedState((prev) => ({
      ...prev,
      subcategories: { ...prev.subcategories, [key]: !prev.subcategories[key] },
    }));
  };

  const startEdit = (item: CostCode) => {
    setEditingId(item.cost_code_id);
    setEditValues({
      item_code: item.item_code,
      item_name: item.item_name,
      default_unit_type: item.default_unit_type || '',
      default_unit_price: item.default_unit_price || 0,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValues({});
  };

  const saveEdit = async (id: number) => {
    try {
      await costCodesApi.update(id, editValues);
      toast.success('Cost code updated');
      setEditingId(null);
      setEditValues({});
      load();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this cost code? This cannot be undone.')) return;
    try {
      await costCodesApi.delete(id);
      toast.success('Cost code deleted');
      load();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const startAdd = (div: CostCodeTreeNode, cat: CategoryNode, subcat: SubcategoryNode) => {
    const key = `${div.division_number}|${cat.category_number}|${subcat.subcategory_number}`;
    setAddingTo(key);
    setNewItem({
      ...EMPTY_NEW_ITEM,
      parentDivision: div.division_number,
      parentDivisionName: div.division_name,
      parentCategory: cat.category_number,
      parentCategoryName: cat.category_name,
      parentSubcategory: subcat.subcategory_number,
      parentSubcategoryName: subcat.subcategory_name,
    });
  };

  const cancelAdd = () => {
    setAddingTo(null);
    setNewItem(EMPTY_NEW_ITEM);
  };

  const saveNewItem = async () => {
    if (!newItem.item_code || !newItem.item_name) {
      toast.error('Item code and name are required');
      return;
    }
    try {
      const payload: CostCodeCreate = {
        division_number: newItem.parentDivision,
        division_name: newItem.parentDivisionName,
        category_number: newItem.parentCategory,
        category_name: newItem.parentCategoryName,
        subcategory_number: newItem.parentSubcategory,
        subcategory_name: newItem.parentSubcategoryName,
        item_code: newItem.item_code,
        item_name: newItem.item_name,
        default_unit_type: newItem.default_unit_type || undefined,
        default_unit_price: newItem.default_unit_price || undefined,
      };
      await costCodesApi.create(payload);
      toast.success('Cost code created');
      cancelAdd();
      load();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // Filter tree by search query
  const filteredTree = React.useMemo(() => {
    if (!searchQuery.trim()) return tree;
    const q = searchQuery.toLowerCase();
    return tree
      .map((div) => {
        const filteredCats = div.categories
          .map((cat) => {
            const filteredSubs = cat.subcategories
              .map((sub) => {
                const filteredItems = sub.items.filter(
                  (item) =>
                    item.item_code.toLowerCase().includes(q) ||
                    item.item_name.toLowerCase().includes(q)
                );
                if (filteredItems.length > 0) {
                  return { ...sub, items: filteredItems };
                }
                if (
                  sub.subcategory_number.toLowerCase().includes(q) ||
                  sub.subcategory_name.toLowerCase().includes(q)
                ) {
                  return sub;
                }
                return null;
              })
              .filter(Boolean) as SubcategoryNode[];
            if (filteredSubs.length > 0) return { ...cat, subcategories: filteredSubs };
            if (
              cat.category_number.toLowerCase().includes(q) ||
              cat.category_name.toLowerCase().includes(q)
            ) {
              return cat;
            }
            return null;
          })
          .filter(Boolean) as CategoryNode[];
        if (filteredCats.length > 0) return { ...div, categories: filteredCats };
        if (
          div.division_number.toLowerCase().includes(q) ||
          div.division_name.toLowerCase().includes(q)
        ) {
          return div;
        }
        return null;
      })
      .filter(Boolean) as CostCodeTreeNode[];
  }, [tree, searchQuery]);

  const totalCodes = React.useMemo(() => {
    let count = 0;
    tree.forEach((div) =>
      div.categories.forEach((cat) =>
        cat.subcategories.forEach((sub) => {
          count += sub.items.length;
        })
      )
    );
    return count;
  }, [tree]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400">
        Loading cost code template...
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <FileSpreadsheet size={24} className="text-amber-400" />
            Cost Code Template
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Master template of cost codes used across all projects. {totalCodes} item codes defined.
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search cost codes by code, name, category, or division..."
          className="w-full bg-navy-800/50 border border-navy-700 rounded-lg pl-10 pr-4 py-2.5 text-sm text-slate-300 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* Tree Table */}
      {filteredTree.length === 0 ? (
        <div className="bg-navy-800/50 border border-navy-700 rounded-lg p-8 text-center">
          <p className="text-slate-400">
            {searchQuery ? 'No cost codes match your search.' : 'No cost codes defined yet.'}
          </p>
        </div>
      ) : (
        <div className="bg-navy-800/50 border border-navy-700 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-navy-900/50 text-slate-400 text-xs uppercase tracking-wider border-b border-navy-700">
                  <th className="text-left py-3 px-3 w-8"></th>
                  <th className="text-left py-3 px-3 min-w-[200px]">Code</th>
                  <th className="text-left py-3 px-3 min-w-[250px]">Name</th>
                  <th className="text-left py-3 px-3 w-28">Default Unit</th>
                  <th className="text-right py-3 px-3 w-32">Default Price</th>
                  <th className="text-center py-3 px-3 w-24">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTree.map((division) => {
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
                          {divExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </td>
                        <td className="py-3 px-3 text-white font-bold text-base" colSpan={2}>
                          {divKey} — {division.division_name}
                        </td>
                        <td></td>
                        <td></td>
                        <td className="py-3 px-3 text-center text-xs text-slate-500">
                          {division.categories.reduce(
                            (sum, c) => sum + c.subcategories.reduce((s, sc) => s + sc.items.length, 0),
                            0
                          )}{' '}
                          items
                        </td>
                      </tr>

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
                                    {catExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                  </div>
                                </td>
                                <td className="py-2 px-3 text-slate-300 font-semibold text-sm" colSpan={2}>
                                  {category.category_number} — {category.category_name}
                                </td>
                                <td></td>
                                <td></td>
                                <td className="py-2 px-3 text-center text-xs text-slate-500">
                                  {category.subcategories.reduce((s, sc) => s + sc.items.length, 0)} items
                                </td>
                              </tr>

                              {catExpanded &&
                                category.subcategories.map((subcategory) => {
                                  const subcatKey = `${catKey}|${subcategory.subcategory_number}`;
                                  const subcatExpanded = expandedState.subcategories[subcatKey] !== false;
                                  const isAddingHere = addingTo === subcatKey;

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
                                        <td className="py-2 px-3 text-slate-400 text-sm" colSpan={2}>
                                          {subcategory.subcategory_number} — {subcategory.subcategory_name}
                                        </td>
                                        <td></td>
                                        <td></td>
                                        <td className="py-2 px-3 text-center">
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              startAdd(division, category, subcategory);
                                            }}
                                            className="text-emerald-400 hover:text-emerald-300 transition-colors"
                                            title="Add item code"
                                          >
                                            <Plus size={14} />
                                          </button>
                                        </td>
                                      </tr>

                                      {/* Item Codes */}
                                      {subcatExpanded &&
                                        subcategory.items.map((item) => {
                                          const isEditing = editingId === item.cost_code_id;

                                          return (
                                            <tr
                                              key={`item-${item.cost_code_id}`}
                                              className="border-b border-navy-800/50 hover:bg-navy-800/30 transition-colors"
                                            >
                                              <td className="py-2 px-3"></td>
                                              <td className="py-2 px-3">
                                                <div style={{ marginLeft: '4.5rem' }}>
                                                  {isEditing ? (
                                                    <input
                                                      type="text"
                                                      value={editValues.item_code || ''}
                                                      onChange={(e) =>
                                                        setEditValues((v) => ({ ...v, item_code: e.target.value }))
                                                      }
                                                      className="bg-navy-700/50 text-slate-200 text-sm px-2 py-1 rounded border border-navy-600 focus:outline-none focus:ring-1 focus:ring-blue-500 w-full"
                                                    />
                                                  ) : (
                                                    <span className="text-slate-300 font-medium text-sm">
                                                      {item.item_code}
                                                    </span>
                                                  )}
                                                </div>
                                              </td>
                                              <td className="py-2 px-3">
                                                {isEditing ? (
                                                  <input
                                                    type="text"
                                                    value={editValues.item_name || ''}
                                                    onChange={(e) =>
                                                      setEditValues((v) => ({ ...v, item_name: e.target.value }))
                                                    }
                                                    className="bg-navy-700/50 text-slate-200 text-sm px-2 py-1 rounded border border-navy-600 focus:outline-none focus:ring-1 focus:ring-blue-500 w-full"
                                                  />
                                                ) : (
                                                  <span className="text-slate-400 text-sm">{item.item_name}</span>
                                                )}
                                              </td>
                                              <td className="py-2 px-3">
                                                {isEditing ? (
                                                  <select
                                                    value={editValues.default_unit_type || ''}
                                                    onChange={(e) =>
                                                      setEditValues((v) => ({
                                                        ...v,
                                                        default_unit_type: e.target.value,
                                                      }))
                                                    }
                                                    className="bg-navy-700/50 text-slate-200 text-xs px-2 py-1 rounded border border-navy-600 focus:outline-none focus:ring-1 focus:ring-blue-500 w-full"
                                                  >
                                                    <option value="">—</option>
                                                    {Object.entries(UNIT_TYPE_LABELS).map(([k, v]) => (
                                                      <option key={k} value={k}>
                                                        {v}
                                                      </option>
                                                    ))}
                                                  </select>
                                                ) : (
                                                  <span className="text-slate-500 text-xs">
                                                    {item.default_unit_type
                                                      ? UNIT_TYPE_LABELS[item.default_unit_type as UnitType] ||
                                                        item.default_unit_type
                                                      : '—'}
                                                  </span>
                                                )}
                                              </td>
                                              <td className="py-2 px-3 text-right">
                                                {isEditing ? (
                                                  <CurrencyInput
                                                    value={editValues.default_unit_price || 0}
                                                    onChange={(val) =>
                                                      setEditValues((v) => ({ ...v, default_unit_price: val }))
                                                    }
                                                    className="bg-navy-700/50 text-slate-200 text-xs px-2 py-1 rounded border border-navy-600 focus:outline-none focus:ring-1 focus:ring-blue-500 w-full"
                                                  />
                                                ) : (
                                                  <span className="text-slate-500 text-xs font-financial">
                                                    {item.default_unit_price
                                                      ? formatCurrency(item.default_unit_price)
                                                      : '—'}
                                                  </span>
                                                )}
                                              </td>
                                              <td className="py-2 px-3">
                                                <div className="flex items-center justify-center gap-1">
                                                  {isEditing ? (
                                                    <>
                                                      <button
                                                        onClick={() => saveEdit(item.cost_code_id)}
                                                        className="text-emerald-400 hover:text-emerald-300 p-1 transition-colors"
                                                        title="Save"
                                                      >
                                                        <Save size={14} />
                                                      </button>
                                                      <button
                                                        onClick={cancelEdit}
                                                        className="text-slate-400 hover:text-slate-300 p-1 transition-colors"
                                                        title="Cancel"
                                                      >
                                                        <X size={14} />
                                                      </button>
                                                    </>
                                                  ) : (
                                                    <>
                                                      <button
                                                        onClick={() => startEdit(item)}
                                                        className="text-blue-400 hover:text-blue-300 p-1 transition-colors text-xs"
                                                        title="Edit"
                                                      >
                                                        Edit
                                                      </button>
                                                      <button
                                                        onClick={() => handleDelete(item.cost_code_id)}
                                                        className="text-red-400 hover:text-red-300 p-1 transition-colors"
                                                        title="Delete"
                                                      >
                                                        <Trash2 size={14} />
                                                      </button>
                                                    </>
                                                  )}
                                                </div>
                                              </td>
                                            </tr>
                                          );
                                        })}

                                      {/* Add New Item Row */}
                                      {subcatExpanded && isAddingHere && (
                                        <tr className="border-b border-navy-800/50 bg-navy-900/40">
                                          <td className="py-2 px-3"></td>
                                          <td className="py-2 px-3">
                                            <div style={{ marginLeft: '4.5rem' }}>
                                              <input
                                                type="text"
                                                value={newItem.item_code}
                                                onChange={(e) =>
                                                  setNewItem((v) => ({ ...v, item_code: e.target.value }))
                                                }
                                                placeholder="Item code (e.g. 01311)"
                                                className="bg-navy-700/50 text-slate-200 text-sm px-2 py-1 rounded border border-navy-600 focus:outline-none focus:ring-1 focus:ring-emerald-500 w-full"
                                                autoFocus
                                              />
                                            </div>
                                          </td>
                                          <td className="py-2 px-3">
                                            <input
                                              type="text"
                                              value={newItem.item_name}
                                              onChange={(e) =>
                                                setNewItem((v) => ({ ...v, item_name: e.target.value }))
                                              }
                                              placeholder="Item name"
                                              className="bg-navy-700/50 text-slate-200 text-sm px-2 py-1 rounded border border-navy-600 focus:outline-none focus:ring-1 focus:ring-emerald-500 w-full"
                                            />
                                          </td>
                                          <td className="py-2 px-3">
                                            <select
                                              value={newItem.default_unit_type}
                                              onChange={(e) =>
                                                setNewItem((v) => ({ ...v, default_unit_type: e.target.value }))
                                              }
                                              className="bg-navy-700/50 text-slate-200 text-xs px-2 py-1 rounded border border-navy-600 focus:outline-none focus:ring-1 focus:ring-emerald-500 w-full"
                                            >
                                              <option value="">—</option>
                                              {Object.entries(UNIT_TYPE_LABELS).map(([k, v]) => (
                                                <option key={k} value={k}>
                                                  {v}
                                                </option>
                                              ))}
                                            </select>
                                          </td>
                                          <td className="py-2 px-3">
                                            <CurrencyInput
                                              value={newItem.default_unit_price}
                                              onChange={(val) =>
                                                setNewItem((v) => ({ ...v, default_unit_price: val }))
                                              }
                                              className="bg-navy-700/50 text-slate-200 text-xs px-2 py-1 rounded border border-navy-600 focus:outline-none focus:ring-1 focus:ring-emerald-500 w-full"
                                            />
                                          </td>
                                          <td className="py-2 px-3">
                                            <div className="flex items-center justify-center gap-1">
                                              <button
                                                onClick={saveNewItem}
                                                className="text-emerald-400 hover:text-emerald-300 p-1 transition-colors"
                                                title="Save"
                                              >
                                                <Save size={14} />
                                              </button>
                                              <button
                                                onClick={cancelAdd}
                                                className="text-slate-400 hover:text-slate-300 p-1 transition-colors"
                                                title="Cancel"
                                              >
                                                <X size={14} />
                                              </button>
                                            </div>
                                          </td>
                                        </tr>
                                      )}
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
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
