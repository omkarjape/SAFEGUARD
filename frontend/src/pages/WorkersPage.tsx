import React, { useState, useMemo } from 'react';
import { useSafety } from '../context/SafetyContext';
import { StatusBadge } from '../components/StatusBadge';
import { Link } from 'react-router-dom';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  ExternalLink,
  Shield,
  X,
  Building,
  Briefcase,
  Phone,
  Mail,
  UserCheck,
  Edit2,
  Trash2,
  AlertTriangle,
  HeartPulse,
  Calendar,
  Clock,
  Radio,
  CheckCircle2,
  Cpu
} from 'lucide-react';
import { Worker } from '../types';

export const WorkersPage: React.FC = () => {
  const { workers, jackets, createWorker, updateWorker, deleteWorker, pairJacket, unpairJacket } = useSafety();

  // Filter states
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedDept, setSelectedDept] = useState<string>('ALL');
  const [selectedShift, setSelectedShift] = useState<string>('ALL');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null);
  const [deletingWorker, setDeletingWorker] = useState<Worker | null>(null);
  const [pairingWorker, setPairingWorker] = useState<Worker | null>(null);
  const [selectedJacketToPair, setSelectedJacketToPair] = useState<string>('');

  // Form State for Add / Edit
  const [formData, setFormData] = useState({
    workerId: '',
    name: '',
    department: '',
    designation: '',
    phone: '',
    email: '',
    emergencyContact: '',
    shift: 'DAY' as 'DAY' | 'NIGHT' | 'SWING',
    bloodGroup: 'O+',
    medicalNotes: '',
    safetyTrainingDate: new Date().toISOString().slice(0, 10),
    jacketId: ''
  });
  const [formError, setFormError] = useState<string>('');

  const departments = ['ALL', ...Array.from(new Set(workers.map(w => w.department)))];

  // Workforce KPI calculations
  const stats = useMemo(() => {
    const total = workers.length;
    const assigned = workers.filter(w => !!w.jacketId).length;
    const unassigned = total - assigned;
    const safeCount = workers.filter(w => w.status === 'SAFE').length;
    const safePercent = total > 0 ? Math.round((safeCount / total) * 100) : 100;
    return { total, assigned, unassigned, safePercent };
  }, [workers]);

  const filteredWorkers = workers.filter(w => {
    const matchesSearch =
      w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.workerId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (w.designation && w.designation.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesDept = selectedDept === 'ALL' || w.department === selectedDept;
    const matchesShift = selectedShift === 'ALL' || w.shift === selectedShift;
    return matchesSearch && matchesDept && matchesShift;
  });

  const handleOpenAdd = () => {
    setFormData({
      workerId: '',
      name: '',
      department: '',
      designation: 'Safety Operator',
      phone: '',
      email: '',
      emergencyContact: '',
      shift: 'DAY',
      bloodGroup: 'O+',
      medicalNotes: 'No known chronic conditions.',
      safetyTrainingDate: new Date().toISOString().slice(0, 10),
      jacketId: ''
    });
    setFormError('');
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (w: Worker) => {
    setFormData({
      workerId: w.workerId,
      name: w.name,
      department: w.department,
      designation: w.designation,
      phone: w.phone,
      email: w.email || '',
      emergencyContact: w.emergencyContact,
      shift: w.shift || 'DAY',
      bloodGroup: w.bloodGroup || 'O+',
      medicalNotes: w.medicalNotes || '',
      safetyTrainingDate: w.safetyTrainingDate || new Date().toISOString().slice(0, 10),
      jacketId: w.jacketId || ''
    });
    setFormError('');
    setEditingWorker(w);
  };

  const handleSaveWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formData.name || !formData.department || !formData.phone || !formData.emergencyContact) {
      setFormError('Please fill in all mandatory fields.');
      return;
    }

    try {
      if (editingWorker) {
        await updateWorker(editingWorker.workerId, {
          name: formData.name,
          department: formData.department,
          designation: formData.designation,
          phone: formData.phone,
          email: formData.email || undefined,
          emergencyContact: formData.emergencyContact,
          shift: formData.shift,
          bloodGroup: formData.bloodGroup,
          medicalNotes: formData.medicalNotes,
          safetyTrainingDate: formData.safetyTrainingDate
        });
        setEditingWorker(null);
      } else {
        if (!formData.workerId) {
          setFormError('Worker ID is mandatory.');
          return;
        }
        await createWorker({
          workerId: formData.workerId.toUpperCase(),
          name: formData.name,
          department: formData.department,
          designation: formData.designation || 'Safety Operator',
          phone: formData.phone,
          email: formData.email || undefined,
          emergencyContact: formData.emergencyContact,
          shift: formData.shift,
          bloodGroup: formData.bloodGroup,
          medicalNotes: formData.medicalNotes,
          safetyTrainingDate: formData.safetyTrainingDate,
          jacketId: formData.jacketId || undefined,
          status: 'SAFE'
        });
        setIsAddModalOpen(false);
      }
    } catch (err: any) {
      setFormError(err.message || 'Failed to save worker record.');
    }
  };

  const handleDeleteWorker = async () => {
    if (!deletingWorker) return;
    try {
      await deleteWorker(deletingWorker.workerId);
      setDeletingWorker(null);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handlePairJacket = async () => {
    if (!pairingWorker) return;
    try {
      if (selectedJacketToPair) {
        await pairJacket(pairingWorker.workerId, selectedJacketToPair);
      } else {
        await unpairJacket(pairingWorker.workerId);
      }
      setPairingWorker(null);
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-cyan-400" />
            Worker Personnel & Health Operations Directory
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Workforce roster, medical profiles, safety shift assignments, and smart vest pairings
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-950 transition"
        >
          <UserPlus className="w-4 h-4" />
          Enroll New Industrial Worker
        </button>
      </div>

      {/* Workforce KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
        <div className="p-4 rounded-xl bg-[#111827] border border-[#1f293d]">
          <span className="text-slate-400 font-mono text-[11px] uppercase block">Total Enrolled</span>
          <span className="text-2xl font-bold font-mono text-white mt-1 block">{stats.total}</span>
          <span className="text-[10px] text-slate-500">Personnel on database</span>
        </div>

        <div className="p-4 rounded-xl bg-[#111827] border border-[#1f293d]">
          <span className="text-slate-400 font-mono text-[11px] uppercase block">Assigned Vests</span>
          <span className="text-2xl font-bold font-mono text-cyan-400 mt-1 block">{stats.assigned}</span>
          <span className="text-[10px] text-slate-500">Smart safety vests active</span>
        </div>

        <div className="p-4 rounded-xl bg-[#111827] border border-[#1f293d]">
          <span className="text-slate-400 font-mono text-[11px] uppercase block">Unassigned Staff</span>
          <span className="text-2xl font-bold font-mono text-amber-400 mt-1 block">{stats.unassigned}</span>
          <span className="text-[10px] text-slate-500">Awaiting hardware link</span>
        </div>

        <div className="p-4 rounded-xl bg-[#111827] border border-[#1f293d]">
          <span className="text-slate-400 font-mono text-[11px] uppercase block">Safety Index</span>
          <span className="text-2xl font-bold font-mono text-emerald-400 mt-1 block">{stats.safePercent}%</span>
          <span className="text-[10px] text-slate-500">Personnel in SAFE status</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-xl bg-[#111827] border border-[#1f293d] flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by ID, name, designation, or department..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#0b0f19] border border-slate-700 rounded-lg pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="bg-[#0b0f19] border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            {departments.map((dept) => (
              <option key={dept} value={dept}>
                Dept: {dept}
              </option>
            ))}
          </select>

          <select
            value={selectedShift}
            onChange={(e) => setSelectedShift(e.target.value)}
            className="bg-[#0b0f19] border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
          >
            <option value="ALL">Shift: All</option>
            <option value="DAY">Shift: DAY</option>
            <option value="NIGHT">Shift: NIGHT</option>
            <option value="SWING">Shift: SWING</option>
          </select>
        </div>
      </div>

      {/* Workers Table */}
      <div className="bg-[#111827] rounded-xl border border-[#1f293d] overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#0b0f19] border-b border-[#1f293d] text-slate-400 font-mono uppercase tracking-wider">
                <th className="py-3.5 px-4 font-semibold">Worker ID</th>
                <th className="py-3.5 px-4 font-semibold">Name & Designation</th>
                <th className="py-3.5 px-4 font-semibold">Department & Shift</th>
                <th className="py-3.5 px-4 font-semibold">Smart Jacket</th>
                <th className="py-3.5 px-4 font-semibold">Safety Status</th>
                <th className="py-3.5 px-4 font-semibold">Medical / Blood</th>
                <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1f293d] text-slate-300">
              {filteredWorkers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    No workers match your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredWorkers.map((w) => (
                  <tr key={w.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-white">
                      {w.workerId}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-white">{w.name}</div>
                      <div className="text-[11px] text-slate-400">{w.designation}</div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="text-slate-200">{w.department}</div>
                      <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded text-[10px] font-mono bg-slate-800 text-slate-400 border border-slate-700">
                        {w.shift || 'DAY'} SHIFT
                      </span>
                    </td>

                    <td className="py-3.5 px-4 font-mono">
                      {w.jacketId ? (
                        <div>
                          <span className="text-cyan-400 font-semibold">{w.jacketId}</span>
                          <span className="text-[10px] text-slate-500 block">{w.deviceId}</span>
                        </div>
                      ) : (
                        <span className="text-slate-500 italic">Unassigned</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <StatusBadge status={w.status} size="sm" />
                    </td>

                    <td className="py-3.5 px-4 font-mono text-[11px]">
                      <span className="px-1.5 py-0.5 rounded bg-red-950/50 text-red-400 border border-red-500/30 font-bold mr-1.5">
                        {w.bloodGroup || 'O+'}
                      </span>
                      <span className="text-slate-400 truncate max-w-[120px] inline-block align-bottom" title={w.medicalNotes}>
                        {w.medicalNotes ? w.medicalNotes.slice(0, 24) + '...' : 'Clear'}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                      <button
                        onClick={() => {
                          setPairingWorker(w);
                          setSelectedJacketToPair(w.jacketId || '');
                        }}
                        className="px-2.5 py-1.5 rounded text-[11px] font-medium bg-[#1f293d] hover:bg-slate-700 text-slate-200 transition"
                        title="Pair or unpair jacket"
                      >
                        Pair Vest
                      </button>

                      <button
                        onClick={() => handleOpenEdit(w)}
                        className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition inline-block align-middle"
                        title="Edit Worker Profile"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => setDeletingWorker(w)}
                        className="p-1.5 rounded text-slate-400 hover:text-red-400 hover:bg-red-950/40 transition inline-block align-middle"
                        title="Delete Worker"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>

                      <Link
                        to={`/workers/${w.workerId}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded text-[11px] font-medium bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 border border-cyan-500/30 transition"
                      >
                        Profile
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Worker Modal */}
      {(isAddModalOpen || editingWorker) && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-slate-700 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-emerald-400" />
                {editingWorker ? `Edit Worker: ${editingWorker.name}` : 'Enroll New Industrial Worker'}
              </h3>
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingWorker(null);
                }}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-2.5 rounded bg-red-950/80 border border-red-500/50 text-red-300 text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveWorker} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Worker ID *</label>
                  <input
                    type="text"
                    required
                    disabled={!!editingWorker}
                    placeholder="e.g. W004"
                    value={formData.workerId}
                    onChange={(e) => setFormData({ ...formData, workerId: e.target.value })}
                    className="w-full bg-[#0b0f19] border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500 font-mono disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Elena Rostova"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-[#0b0f19] border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Department *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. High Pressure Turbine Area"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full bg-[#0b0f19] border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Designation</label>
                  <input
                    type="text"
                    placeholder="e.g. Boiler Safety Inspector"
                    value={formData.designation}
                    onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                    className="w-full bg-[#0b0f19] border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Work Shift</label>
                  <select
                    value={formData.shift}
                    onChange={(e) => setFormData({ ...formData, shift: e.target.value as any })}
                    className="w-full bg-[#0b0f19] border border-slate-700 rounded-lg px-2.5 py-2 text-white font-mono"
                  >
                    <option value="DAY">DAY (08:00 - 16:00)</option>
                    <option value="SWING">SWING (16:00 - 00:00)</option>
                    <option value="NIGHT">NIGHT (00:00 - 08:00)</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Blood Group</label>
                  <select
                    value={formData.bloodGroup}
                    onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
                    className="w-full bg-[#0b0f19] border border-slate-700 rounded-lg px-2.5 py-2 text-white font-mono"
                  >
                    {['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map(bg => (
                      <option key={bg} value={bg}>{bg}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Training Date</label>
                  <input
                    type="date"
                    value={formData.safetyTrainingDate}
                    onChange={(e) => setFormData({ ...formData, safetyTrainingDate: e.target.value })}
                    className="w-full bg-[#0b0f19] border border-slate-700 rounded-lg px-2 py-1.5 text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Mobile Phone *</label>
                  <input
                    type="text"
                    required
                    placeholder="+1 (555) 000-0000"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-[#0b0f19] border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Internal Email</label>
                  <input
                    type="email"
                    placeholder="worker@plant.internal"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-[#0b0f19] border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Emergency Contact (Next-of-Kin) *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Nikolai Rostova (+1 555-444-3333, Brother)"
                  value={formData.emergencyContact}
                  onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
                  className="w-full bg-[#0b0f19] border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Medical Warnings / Allergies</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Mild respiratory sensitivity, penicillan allergy."
                  value={formData.medicalNotes}
                  onChange={(e) => setFormData({ ...formData, medicalNotes: e.target.value })}
                  className="w-full bg-[#0b0f19] border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingWorker(null);
                  }}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
                >
                  {editingWorker ? 'Save Changes' : 'Confirm Enrollment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Worker Confirmation Dialog */}
      {deletingWorker && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-red-500/50 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-red-400 border-b border-slate-800 pb-3">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-base font-bold text-white">Confirm Worker De-enrollment</h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to permanently delete worker record <strong className="text-white font-mono">{deletingWorker.workerId} - {deletingWorker.name}</strong>?
            </p>

            {deletingWorker.jacketId && (
              <div className="p-3 rounded-lg bg-amber-950/50 border border-amber-500/40 text-[11px] text-amber-200">
                Note: Smart vest <strong className="font-mono">{deletingWorker.jacketId}</strong> will be automatically unlinked and returned to available inventory.
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setDeletingWorker(null)}
                className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteWorker}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold text-xs"
              >
                Delete Worker
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Smart Jacket Pairing Modal */}
      {pairingWorker && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Shield className="w-5 h-5 text-cyan-400" />
                Smart Jacket Hardware Pairing
              </h3>
              <button onClick={() => setPairingWorker(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-300">
                Assign an active smart safety vest to worker <strong className="text-white">{pairingWorker.name} ({pairingWorker.workerId})</strong>:
              </p>

              <div className="space-y-2">
                {jackets.map((j) => {
                  const isCurrentlyAssigned = j.workerId && j.workerId !== pairingWorker.workerId;
                  const isSelected = selectedJacketToPair === j.jacketId;

                  return (
                    <div
                      key={j.jacketId}
                      onClick={() => setSelectedJacketToPair(isSelected ? '' : j.jacketId)}
                      className={`p-3 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                        isSelected
                          ? 'bg-cyan-950/80 border-cyan-500 text-white'
                          : 'bg-[#0b0f19] border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Cpu className={`w-4 h-4 ${isSelected ? 'text-cyan-400' : 'text-slate-500'}`} />
                        <div>
                          <div className="font-mono font-bold text-white">{j.jacketId}</div>
                          <div className="text-[10px] text-slate-400">{j.model}</div>
                        </div>
                      </div>

                      <div className="text-right">
                        {isCurrentlyAssigned ? (
                          <span className="text-[10px] font-mono text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-500/30">
                            Bound to {j.workerId}
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
                            Available
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  onClick={() => setPairingWorker(null)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePairJacket}
                  className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold"
                >
                  {selectedJacketToPair ? 'Confirm Pairing' : 'Unassign Vest'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
