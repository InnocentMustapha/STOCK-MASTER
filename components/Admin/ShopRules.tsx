
import React, { useState } from 'react';
import { ShopRule } from '../../types';
import { Plus, Trash2, Edit2, Save, X, Gavel, Calendar } from 'lucide-react';

interface ShopRulesProps {
  rules: ShopRule[];
  onUpdate: (rules: ShopRule[]) => void;
  isAdmin: boolean;
  translations: any;
}

const ShopRules: React.FC<ShopRulesProps> = ({ rules, onUpdate, isAdmin, translations }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<ShopRule | null>(null);

  const handleDelete = (id: string) => {
    if (confirm("Permanently delete this rule?")) {
      onUpdate(rules.filter(r => r.id !== id));
    }
  };

  const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newRule: ShopRule = {
      id: editingRule?.id || Math.random().toString(36).substr(2, 9),
      title: formData.get('title') as string,
      content: formData.get('content') as string,
      updatedAt: new Date().toISOString(),
    };

    if (editingRule) {
      onUpdate(rules.map(r => r.id === editingRule.id ? newRule : r));
    } else {
      onUpdate([...rules, newRule]);
    }
    setIsModalOpen(false);
    setEditingRule(null);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
            <Gavel size={24} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-800">{translations.rules}</h3>
            <p className="text-sm text-slate-500">Shop operational policies and guidelines</p>
          </div>
        </div>
        {isAdmin && (
          <button
            onClick={() => {
              setEditingRule(null);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-5 py-3 rounded-2xl font-bold text-sm transition-all"
          >
            <Plus size={18} /> Add New Rule
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {rules.length === 0 ? (
          <div className="md:col-span-2 text-center py-20 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
            <Gavel size={48} className="mx-auto mb-4 text-slate-300" />
            <p className="text-slate-400 font-medium italic">No rules have been established yet.</p>
          </div>
        ) : (
          rules.map(rule => (
            <div key={rule.id} className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm relative group hover:border-blue-200 transition-all">
              <div className="flex items-start justify-between mb-4">
                <h4 className="text-lg font-black text-slate-800 uppercase tracking-tight">{rule.title}</h4>
                {isAdmin && (
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => {
                        setEditingRule(rule);
                        setIsModalOpen(true);
                      }}
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      onClick={() => handleDelete(rule.id)}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </div>
              <p className="text-slate-600 leading-relaxed mb-6 font-medium">{rule.content}</p>
              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest pt-4 border-t border-slate-50">
                <Calendar size={12} />
                Updated {new Date(rule.updatedAt).toLocaleDateString()}
              </div>
            </div>
          ))
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-2xl font-black text-slate-800">
                {editingRule ? 'Edit Rule' : 'New Shop Rule'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Rule Title</label>
                <input 
                  name="title" 
                  defaultValue={editingRule?.title} 
                  required 
                  className="w-full px-5 py-4 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500 outline-none transition-all font-bold" 
                  placeholder="e.g. Cleanliness Standards"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Detailed Content</label>
                <textarea 
                  name="content" 
                  defaultValue={editingRule?.content} 
                  required 
                  rows={5}
                  className="w-full px-5 py-4 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500 outline-none transition-all font-medium resize-none" 
                  placeholder="Describe the rule in detail..."
                />
              </div>
              <div className="pt-4 flex gap-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 border-2 border-slate-100 rounded-2xl font-bold text-slate-500 hover:bg-slate-50 transition-all">Cancel</button>
                <button type="submit" className="flex-1 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold shadow-lg shadow-blue-100 flex items-center justify-center gap-2">
                  <Save size={18} /> {editingRule ? 'Update Rule' : 'Establish Rule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShopRules;
