import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  deleteObject,
  getDownloadURL,
  getMetadata,
  listAll,
  ref,
  updateMetadata,
  uploadBytesResumable,
  uploadString,
} from 'firebase/storage';
import { motion } from 'framer-motion';
import prettyBytes from 'pretty-bytes';
import { FiUpload, FiTrash2, FiTag } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { storage } from '../lib/firebase.js';
import { useTenant } from '../context/TenantContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { logEvent } from '../lib/auditLogger.js';

const TAGS = ['logo', 'marketing', 'social', 'internal'];

const Visuals = () => {
  const [assets, setAssets] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedTag, setSelectedTag] = useState(TAGS[0]);
  const [filterTag, setFilterTag] = useState('all');
  const { activeTenantId } = useTenant();
  const { user } = useAuth();

  const basePath = useMemo(
    () => (activeTenantId ? `cdn-assets/${activeTenantId}` : 'cdn-assets'),
    [activeTenantId]
  );

  const filteredAssets = useMemo(() => {
    if (filterTag === 'all') return assets;
    return assets.filter((asset) => asset.tag === filterTag);
  }, [assets, filterTag]);

  const loadAssets = useCallback(async () => {
    if (!activeTenantId) {
      setAssets([]);
      return;
    }
    const rootRef = ref(storage, basePath);
    try {
      const list = await listAll(rootRef);
      const results = await Promise.all(
        list.items
          .filter((item) => item.name !== 'manifest.json')
          .map(async (item) => {
            const [url, metadata] = await Promise.all([getDownloadURL(item), getMetadata(item)]);
            return {
              name: item.name,
              ref: item,
              url,
              size: metadata.size ?? 0,
              contentType: metadata.contentType ?? 'application/octet-stream',
              timeCreated: metadata.timeCreated,
              tag: metadata.customMetadata?.tag ?? 'unassigned',
              published: metadata.customMetadata?.published !== 'false',
            };
          })
      );
      results.sort((a, b) => new Date(b.timeCreated) - new Date(a.timeCreated));
      setAssets(results);
    } catch (error) {
      console.error('[Visuals] Failed to fetch assets', error);
      toast.error('Unable to load CDN assets.');
    }
  }, [activeTenantId, basePath]);

  const regenerateManifest = useCallback(
    async (items) => {
      const manifest = items.reduce((acc, item) => {
        const tag = item.tag ?? 'unassigned';
        if (!acc[tag]) acc[tag] = [];
        acc[tag].push({ name: item.name, url: item.url, published: item.published });
        return acc;
      }, {});
      try {
        const manifestRef = ref(storage, `${basePath}/manifest.json`);
        await uploadString(manifestRef, JSON.stringify(manifest, null, 2), 'raw', {
          contentType: 'application/json',
        });
      } catch (error) {
        console.warn('[Visuals] Manifest upload skipped', error);
      }
    },
    [basePath]
  );

  useEffect(() => {
    loadAssets().catch(() => {});
  }, [loadAssets]);

  const resetUploadState = () => {
    setUploading(false);
    setProgress(0);
  };

  const processFile = async (file) => {
    if (!file) return;
    if (!activeTenantId) {
      toast.error('Select a workspace before uploading.');
      return;
    }
    setUploading(true);
    const storageRef = ref(storage, `${basePath}/${file.name}`);
    const metadata = {
      customMetadata: { tag: selectedTag, published: 'true' },
    };
    const task = uploadBytesResumable(storageRef, file, metadata);

    task.on(
      'state_changed',
      (snapshot) => {
        setProgress(Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100));
      },
      (error) => {
        console.error('[Visuals] Upload error', error);
        toast.error('Upload failed');
        resetUploadState();
      },
      async () => {
        await loadAssets();
        resetUploadState();
        toast.success('Asset uploaded');
        await regenerateManifest(await refreshSnapshot());
        await logEvent(activeTenantId, user?.uid, 'Uploaded Asset', {
          name: file.name,
          tag: selectedTag,
        });
      }
    );
  };

  const refreshSnapshot = async () => {
    if (!activeTenantId) return [];
    const rootRef = ref(storage, basePath);
    const list = await listAll(rootRef);
    return Promise.all(
      list.items
        .filter((item) => item.name !== 'manifest.json')
        .map(async (item) => {
          const [url, metadata] = await Promise.all([getDownloadURL(item), getMetadata(item)]);
          return {
            name: item.name,
            url,
            tag: metadata.customMetadata?.tag ?? 'unassigned',
            published: metadata.customMetadata?.published !== 'false',
          };
        })
    );
  };

  const handleUpload = async (event) => {
    const file = event.target.files?.[0];
    await processFile(file);
    event.target.value = '';
  };

  const handleDrop = async (event) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    await processFile(file);
  };

  const handleDragOver = (event) => {
    event.preventDefault();
  };

  const handleDelete = async (name) => {
    if (!window.confirm(`Delete ${name}?`)) return;
    if (!activeTenantId) {
      toast.error('Select a workspace before deleting assets.');
      return;
    }
    const fileRef = ref(storage, `${basePath}/${name}`);
    await deleteObject(fileRef);
    await loadAssets();
    await regenerateManifest(await refreshSnapshot());
    await logEvent(activeTenantId, user?.uid, 'Deleted Asset', { name });
  };

  const updateTag = async (asset, nextTag) => {
    try {
      await updateMetadata(asset.ref, {
        customMetadata: { tag: nextTag, published: asset.published ? 'true' : 'false' },
      });
      toast.success(`Tag updated to ${nextTag}`);
      await loadAssets();
      await regenerateManifest(await refreshSnapshot());
    } catch (error) {
      console.error('[Visuals] Failed to update tag', error);
      toast.error('Unable to update tag');
    }
  };

  const togglePublish = async (asset) => {
    try {
      await updateMetadata(asset.ref, {
        customMetadata: { tag: asset.tag, published: asset.published ? 'false' : 'true' },
      });
      toast.success(asset.published ? 'Marked as draft' : 'Published');
      await loadAssets();
      await regenerateManifest(await refreshSnapshot());
      await logEvent(activeTenantId, user?.uid, 'Toggled Asset Publish', {
        name: asset.name,
        published: !asset.published,
      });
    } catch (error) {
      console.error('[Visuals] Toggle publish failed', error);
      toast.error('Unable to update publish state');
    }
  };

  const renameAsset = async (asset) => {
    const nextName = window.prompt('Rename asset', asset.name);
    if (!nextName || nextName === asset.name) return;
    try {
      const response = await fetch(asset.url);
      const blob = await response.blob();
      const newRef = ref(storage, `${basePath}/${nextName}`);
      await new Promise((resolve, reject) => {
        const task = uploadBytesResumable(newRef, blob, {
          customMetadata: { tag: asset.tag, published: asset.published ? 'true' : 'false' },
        });
        task.on('state_changed', undefined, reject, resolve);
      });
      await deleteObject(asset.ref);
      toast.success('Asset renamed');
      await loadAssets();
      await regenerateManifest(await refreshSnapshot());
      await logEvent(activeTenantId, user?.uid, 'Renamed Asset', {
        from: asset.name,
        to: nextName,
      });
    } catch (error) {
      console.error('[Visuals] Rename failed', error);
      toast.error('Unable to rename asset');
    }
  };

  return (
    <main className="min-h-screen bg-[#0f0f17] text-white p-10">
      <div className="mx-auto w-full max-w-6xl space-y-8">
        <header className="space-y-3">
          <h1 className="flex items-center gap-2 text-3xl font-bold">
            <FiUpload /> Visuals Manager
          </h1>
          <p className="text-gray-400">
            Upload, retag, and publish Hustle Studio assets. Each change regenerates the CDN manifest for live previews.
          </p>
        </header>

        <section className="flex flex-wrap items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-6">
          <label className="text-xs uppercase tracking-wide text-white/60">
            Upload tag
            <select
              value={selectedTag}
              onChange={(event) => setSelectedTag(event.target.value)}
              className="mt-1 w-full rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-white focus:border-indigo-400 focus:outline-none"
            >
              {TAGS.map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </select>
          </label>
          <label className="flex-1 text-xs uppercase tracking-wide text-white/60">
            Choose asset
            <input
              type="file"
              accept="image/*"
              onChange={handleUpload}
              className="mt-1 block w-full rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-sm text-white file:mr-4 file:rounded-md file:border-0 file:bg-indigo-600 file:px-4 file:py-2 file:font-semibold file:text-white hover:file:bg-indigo-700"
            />
          </label>
          <div
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className="flex-1 rounded-lg border border-dashed border-white/20 bg-black/40 px-4 py-6 text-center text-sm text-white/60 transition hover:border-indigo-400/60"
          >
            Drag & drop files here to upload
          </div>
          {uploading && (
            <div className="flex flex-1 items-center gap-3 text-sm text-white/70">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-800">
                <div className="h-full bg-indigo-500 transition-all" style={{ width: `${progress}%` }} />
              </div>
              <span>{progress}%</span>
            </div>
          )}
        </section>

        <section className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-sm text-white/60">
            <FiTag />
            <span>Filter by tag:</span>
            <select
              value={filterTag}
              onChange={(event) => setFilterTag(event.target.value)}
              className="rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-white focus:border-indigo-400 focus:outline-none"
            >
              <option value="all">All</option>
              {TAGS.map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
              <option value="unassigned">unassigned</option>
            </select>
          </div>
          <button
            type="button"
            onClick={async () => regenerateManifest(await refreshSnapshot())}
            className="rounded-lg bg-white/10 px-4 py-2 text-sm text-white transition hover:bg-white/20"
          >
            Regenerate manifest
          </button>
        </section>

        <motion.div layout className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3">
          {filteredAssets.map((asset) => (
            <motion.div key={asset.name} layout className="space-y-3 rounded-xl border border-white/10 bg-[#1a1a1a] p-4 shadow-lg">
              <img src={asset.url} alt={asset.name} className="h-40 w-full rounded-lg object-cover" loading="lazy" />
              <div>
                <p className="text-sm font-semibold">{asset.name}</p>
                <p className="text-xs text-white/50">
                  {prettyBytes(asset.size)} • {asset.contentType}
                </p>
                <p className="text-[11px] text-white/40">Updated {new Date(asset.timeCreated).toLocaleString()}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-white/60">
                <span className="rounded-full bg-white/10 px-2 py-1">{asset.tag}</span>
                <button
                  type="button"
                  onClick={() => togglePublish(asset)}
                  className={`rounded-full px-3 py-1 transition ${
                    asset.published ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/10 text-white/50'
                  }`}
                >
                  {asset.published ? 'Published' : 'Draft'}
                </button>
                <button
                  type="button"
                  onClick={() => renameAsset(asset)}
                  className="rounded-full bg-white/10 px-3 py-1 text-white/60 transition hover:bg-white/20"
                >
                  Rename
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {TAGS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => updateTag(asset, tag)}
                    className={`rounded-full border px-3 py-1 text-xs transition ${
                      asset.tag === tag
                        ? 'border-indigo-400 bg-indigo-500/20 text-indigo-200'
                        : 'border-white/10 bg-white/5 text-white/60 hover:border-indigo-400/40'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => handleDelete(asset.name)}
                className="mt-2 inline-flex items-center gap-2 rounded-md bg-red-600 px-3 py-1 text-sm transition hover:bg-red-700"
              >
                <FiTrash2 /> Delete
              </button>
            </motion.div>
          ))}
          {!filteredAssets.length && !uploading && (
            <div className="rounded-xl border border-dashed border-white/10 bg-white/5 p-8 text-center text-sm text-gray-400">
              No assets match the selected tag.
            </div>
          )}
        </motion.div>
      </div>
    </main>
  );
};

export default Visuals;
