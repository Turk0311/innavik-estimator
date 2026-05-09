"use client";

import { useState } from "react";

export interface LaborTask { id: string; label: string; hours: number }
export interface GeneralLaborData {
  tasks: LaborTask[]
}

interface Props {
  initialData?: Partial<GeneralLaborData>;
  onChange: (data: GeneralLaborData) => void;
}

const inputCls = "w-full rounded-lg bg-slate-700 border border-slate-600 text-white placeholder-slate-500 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition";

function newTask(): LaborTask {
  return { id: String(Date.now() + Math.random()), label: "", hours: 0 };
}

export default function GeneralLaborMeasurements({ initialData, onChange }: Props) {
  const [data, setData] = useState<GeneralLaborData>({
    tasks: initialData?.tasks ?? [newTask()],
  });

  function updateTask(id: string, field: keyof LaborTask, value: string | number) {
    const next = { ...data, tasks: data.tasks.map((t) => t.id === id ? { ...t, [field]: value } : t) };
    setData(next);
    onChange(next);
  }

  function addTask() {
    const next = { ...data, tasks: [...data.tasks, newTask()] };
    setData(next);
    onChange(next);
  }

  function removeTask(id: string) {
    const next = { ...data, tasks: data.tasks.filter((t) => t.id !== id) };
    setData(next);
    onChange(next);
  }

  const totalHours = data.tasks.reduce((sum, t) => sum + (t.hours || 0), 0);

  return (
    <div className="space-y-6">
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Labor Tasks</h3>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500 border-b border-slate-700">
                <th className="pb-2 pr-3 font-medium">Task Description</th>
                <th className="pb-2 pr-3 font-medium">Est. Hours</th>
                <th className="pb-2 w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {data.tasks.map((task, idx) => (
                <tr key={task.id}>
                  <td className="py-2 pr-3">
                    <input
                      type="text"
                      value={task.label}
                      onChange={(e) => updateTask(task.id, "label", e.target.value)}
                      placeholder={`Task ${idx + 1}`}
                      className={inputCls}
                    />
                  </td>
                  <td className="py-2 pr-3">
                    <input
                      type="number"
                      value={task.hours === 0 ? "" : task.hours}
                      onChange={(e) => updateTask(task.id, "hours", Number(e.target.value) || 0)}
                      placeholder="0"
                      min="0"
                      step="0.5"
                      className={inputCls}
                    />
                  </td>
                  <td className="py-2">
                    {data.tasks.length > 1 && (
                      <button
                        onClick={() => removeTask(task.id)}
                        className="text-slate-600 hover:text-red-400 transition-colors p-1"
                        title="Remove task"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <button
          onClick={addTask}
          className="text-xs text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Add Task
        </button>

        {totalHours > 0 && (
          <div className="rounded-lg bg-blue-900/20 border border-blue-800/50 px-4 py-2.5 flex items-center gap-2">
            <svg className="w-4 h-4 text-blue-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm text-blue-300">
              Total: <span className="font-bold">{totalHours} hours</span> estimated labor
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
