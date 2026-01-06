import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiPlus, FiEdit2, FiTrash2, FiCheck, FiX, FiAlertCircle } from 'react-icons/fi';
import PageHeader from '../components/common/PageHeader.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { useTenant } from '../context/TenantContext.jsx';
import { collection, doc, setDoc, deleteDoc, serverTimestamp, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase.js';
import { toast } from 'react-hot-toast';

const Projects = () => {
  const { activeTenantId } = useTenant();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'Planning',
    dueDate: '',
  });

  const statusOptions = ['Planning', 'In Progress', 'Review', 'Completed', 'Backlog'];

  // Load projects from Firestore
  useEffect(() => {
    if (!activeTenantId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const projectsRef = collection(db, 'tenants', activeTenantId, 'projects');
      const q = query(projectsRef, orderBy('createdAt', 'desc'));

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const projectsData = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          setProjects(projectsData);
          setLoading(false);
        },
        (err) => {
          console.error('[Projects] Failed to load projects:', err);
          setError('Failed to load projects');
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (err) {
      console.error('[Projects] Setup failed:', err);
      setError('Failed to initialize projects');
      setLoading(false);
    }
  }, [activeTenantId]);

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
    
    if (!activeTenantId) {
      toast.error('No workspace selected');
      return;
    }

    try {
      await deleteDoc(doc(db, 'tenants', activeTenantId, 'projects', projectId));
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

    if (!activeTenantId) {
      toast.error('No workspace selected');
      return;
    }

    setSubmitting(true);

    try {
      if (editingProject) {
        // Update existing
        await setDoc(doc(db, 'tenants', activeTenantId, 'projects', editingProject.id), {
          title: formData.title.trim(),
          description: formData.description.trim(),
          status: formData.status,
          dueDate: formData.dueDate || null,
          updatedAt: serverTimestamp(),
        }, { merge: true });
        
        toast.success('Project updated');
      } else {
        // Create new
        const newProjectRef = doc(collection(db, 'tenants', activeTenantId, 'projects'));
        await setDoc(newProjectRef, {
          title: formData.title.trim(),
          description: formData.description.trim(),
          status: formData.status,
          dueDate: formData.dueDate || null,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        
        toast.success('Project created');
      }
      
      setShowModal(false);
      setFormData({ title: '', description: '', status: 'Planning', dueDate: '' });
      setEditingProject(null);
    } catch (error) {
      console.error('[Projects] Save failed', error);
      toast.error('Failed to save project');
    } finally {
      setSubmitting(false);
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
            disabled={!activeTenantId}
            className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 px-6 py-3 text-sm font-semibold transition hover:from-indigo-600 hover:to-purple-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FiPlus /> New Project
          </button>
        }
      />

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500/20 border-t-indigo-500"></div>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="mx-auto max-w-md rounded-2xl border border-red-500/50 bg-red-500/10 p-6">
          <div className="flex items-center gap-3 text-red-400">
            <FiAlertCircle size={24} />
            <div>
              <h3 className="font-semibold">Failed to load projects</h3>
              <p className="mt-1 text-sm text-red-400/80">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && projects.length === 0 && (
        <EmptyState
          title="No projects yet"
          description="Create your first project to start tracking tasks and deliverables."
          action={
            <button
              onClick={handleCreate}
              disabled={!activeTenantId}
              className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 px-6 py-3 text-sm font-semibold transition hover:from-indigo-600 hover:to-purple-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FiPlus /> Create First Project
            </button>
          }
        />
      )}

      {/* Projects Grid */}
      {!loading && !error && projects.length > 0 && (
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
      )}

      {/* Create/Edit Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0" 
              onClick={() => !submitting && setShowModal(false)} 
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative z-10 w-full max-w-lg rounded-2xl border border-white/10 bg-gradient-to-br from-[#1a1a2e] to-[#16213e] p-8 shadow-2xl"
            >
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-white">
                  {editingProject ? 'Edit Project' : 'New Project'}
                </h2>
                <p className="mt-2 text-sm text-white/60">
                  {editingProject ? 'Update project details' : 'Create a new project to track'}
                </p>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label htmlFor="project-title" className="block text-sm font-medium text-white/80">
                    Project Title <span className="text-red-400">*</span>
                  </label>
                  <input
                    id="project-title"
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/40 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/20"
                    placeholder="e.g., Website Redesign"
                    disabled={submitting}
                    required
                  />
                </div>

                <div>
                  <label htmlFor="project-description" className="block text-sm font-medium text-white/80">Description</label>
                  <textarea
                    id="project-description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/40 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/20"
                    placeholder="Brief description of the project..."
                    disabled={submitting}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="project-status" className="block text-sm font-medium text-white/80">Status</label>
                    <select
                      id="project-status"
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/20"
                      disabled={submitting}
                    >
                      {statusOptions.map(status => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="project-duedate" className="block text-sm font-medium text-white/80">Due Date</label>
                    <input
                      id="project-duedate"
                      type="date"
                      value={formData.dueDate}
                      onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                      className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/20"
                      disabled={submitting}
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    disabled={submitting}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <FiX /> Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !formData.title.trim()}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 px-4 py-3 text-sm font-semibold text-white transition hover:from-indigo-600 hover:to-purple-600 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <FiCheck /> {submitting ? 'Saving...' : editingProject ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  );
};

export default Projects;
