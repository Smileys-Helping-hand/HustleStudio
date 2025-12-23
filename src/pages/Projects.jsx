import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FiPlus, FiEdit2, FiTrash2, FiCheck, FiX } from 'react-icons/fi';
import PageHeader from '../components/common/PageHeader.jsx';
import { useTenant } from '../context/TenantContext.jsx';
import { doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase.js';
import { toast } from 'react-hot-toast';

const Projects = () => {
  const { activeTenantId } = useTenant();
  const [projects, setProjects] = useState([
    {
      id: '1',
      title: 'Brand Refresh',
      description: 'Update signage, socials, and onboarding collateral for the Q4 push.',
      status: 'In Progress',
      dueDate: '2025-12-31',
    },
    {
      id: '2',
      title: 'Pop-up Weekend',
      description: 'Coordinate staff roster, till hardware, and inventory staging.',
      status: 'Planning',
      dueDate: '2025-12-20',
    },
    {
      id: '3',
      title: 'Loyalty Program',
      description: 'Design rewards tiers and integrate POS enrolment workflow.',
      status: 'Backlog',
      dueDate: '2026-01-15',
    },
  ]);
  
  const [showModal, setShowModal] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'Planning',
    dueDate: '',
  });

  const statusOptions = ['Planning', 'In Progress', 'Review', 'Completed', 'Backlog'];

  const handleCreate = () => {
    setEditingProject(null);
    setFormData({ title: '', description: '', status: 'Planning', dueDate: '' });
    setShowModal(true);
  };

  const handleEdit = (project) => {
    setEditingProject(project);
    setFormData({
      title: project.title,
      description: project.description,
      status: project.status,
      dueDate: project.dueDate,
    });
    setShowModal(true);
  };

  const handleDelete = async (projectId) => {
    if (!window.confirm('Are you sure you want to delete this project?')) return;
    
    try {
      if (activeTenantId) {
        await deleteDoc(doc(db, 'tenants', activeTenantId, 'projects', projectId));
      }
      setProjects(projects.filter(p => p.id !== projectId));
      toast.success('Project deleted');
    } catch (error) {
      console.error('[Projects] Delete failed', error);
      toast.error('Failed to delete project');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      toast.error('Please enter a project title');
      return;
    }

    try {
      if (editingProject) {
        // Update existing
        if (activeTenantId) {
          await setDoc(doc(db, 'tenants', activeTenantId, 'projects', editingProject.id), {
            ...formData,
            updatedAt: serverTimestamp(),
          }, { merge: true });
        }
        
        setProjects(projects.map(p => 
          p.id === editingProject.id 
            ? { ...p, ...formData }
            : p
        ));
        toast.success('Project updated');
      } else {
        // Create new
        const newId = Date.now().toString();
        const newProject = { id: newId, ...formData };
        
        if (activeTenantId) {
          await setDoc(doc(db, 'tenants', activeTenantId, 'projects', newId), {
            ...formData,
            createdAt: serverTimestamp(),
          });
        }
        
        setProjects([...projects, newProject]);
        toast.success('Project created');
      }
      
      setShowModal(false);
      setFormData({ title: '', description: '', status: 'Planning', dueDate: '' });
    } catch (error) {
      console.error('[Projects] Save failed', error);
      toast.error('Failed to save project');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'Planning': 'bg-blue-500/10 border-blue-400/40 text-blue-200',
      'In Progress': 'bg-indigo-500/10 border-indigo-400/40 text-indigo-200',
      'Review': 'bg-yellow-500/10 border-yellow-400/40 text-yellow-200',
      'Completed': 'bg-green-500/10 border-green-400/40 text-green-200',
      'Backlog': 'bg-gray-500/10 border-gray-400/40 text-gray-200',
    };
    return colors[status] || colors['Planning'];
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#0e0e18] to-[#1b1830] px-6 pb-24 text-white sm:px-10 lg:px-12">
      <PageHeader
        title="Projects & Tasks"
        subtitle="Track upcoming launches, assign workstreams, and keep your hustle roadmap visible."
        actions={
          <button
            onClick={handleCreate}
            className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 px-6 py-3 text-sm font-semibold transition hover:from-indigo-600 hover:to-purple-600"
          >
            <FiPlus /> New Project
          </button>
        }
      />

      <motion.div
        layout
        className="grid gap-6 md:grid-cols-2 xl:grid-cols-3"
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
      >
        {projects.map((project) => (
          <motion.article
            key={project.id}
            layout
            whileHover={{ translateY: -4 }}
            className="flex h-full flex-col justify-between rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_0_30px_rgba(99,102,241,0.16)]"
          >
            <div>
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-xl font-semibold">{project.title}</h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(project)}
                    className="text-white/60 transition hover:text-white"
                  >
                    <FiEdit2 size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(project.id)}
                    className="text-red-400/60 transition hover:text-red-400"
                  >
                    <FiTrash2 size={16} />
                  </button>
                </div>
              </div>
              <p className="mt-3 text-sm text-white/70">{project.description}</p>
              {project.dueDate && (
                <p className="mt-2 text-xs text-white/50">
                  Due: {new Date(project.dueDate).toLocaleDateString()}
                </p>
              )}
            </div>
            <span className={`mt-6 inline-flex w-fit rounded-full border px-3 py-1 text-xs uppercase tracking-[0.3em] ${getStatusColor(project.status)}`}>
              {project.status}
            </span>
          </motion.article>
        ))}
      </motion.div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative z-10 w-full max-w-lg rounded-2xl border border-white/10 bg-gradient-to-br from-[#1a1a2e] to-[#16213e] p-8 shadow-2xl"
          >
            <h2 className="text-2xl font-bold text-white">
              {editingProject ? 'Edit Project' : 'New Project'}
            </h2>
            
            <form onSubmit={handleSubmit} className="mt-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-white/80">
                  Project Title <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/40 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/20"
                  placeholder="e.g., Website Redesign"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/40 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/20"
                  placeholder="Brief description of the project..."
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-white/80">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/20"
                  >
                    {statusOptions.map(status => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/80">Due Date</label>
                  <input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/20"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/10"
                >
                  <FiX /> Cancel
                </button>
                <button
                  type="submit"
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 px-4 py-3 text-sm font-semibold text-white transition hover:from-indigo-600 hover:to-purple-600"
                >
                  <FiCheck /> {editingProject ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </main>
  );
};

export default Projects;
