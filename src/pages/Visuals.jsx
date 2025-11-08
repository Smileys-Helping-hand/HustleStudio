import React, { useState, useEffect, useCallback } from 'react';
import { storage } from '../lib/firebase';
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  listAll,
  deleteObject,
  getMetadata,
} from 'firebase/storage';
import { motion } from 'framer-motion';
import prettyBytes from 'pretty-bytes';
import { FiUpload, FiTrash2 } from 'react-icons/fi';

export default function Visuals() {
  const [assets, setAssets] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);

  const loadAssets = useCallback(async () => {
    const rootRef = ref(storage, 'cdn-assets');
    const list = await listAll(rootRef);
    const urls = await Promise.all(
      list.items.map(async (item) => {
        const url = await getDownloadURL(item);
        const metadata = await getMetadata(item);
        return {
          name: item.name,
          url,
          size: Number(metadata.size ?? 0),
          contentType: metadata.contentType ?? 'application/octet-stream',
          timeCreated: metadata.timeCreated,
        };
      })
    );
    urls.sort((a, b) => new Date(b.timeCreated) - new Date(a.timeCreated));
    setAssets(urls);
  }, []);

  useEffect(() => {
    loadAssets().catch((error) => {
      console.error('Failed to load assets', error);
    });
  }, [loadAssets]);

  const resetUploadState = () => {
    setUploading(false);
    setProgress(0);
  };

  const processFile = async (file) => {
    if (!file) return;
    setUploading(true);
    const storageRef = ref(storage, `cdn-assets/${file.name}`);
    const task = uploadBytesResumable(storageRef, file);

    task.on(
      'state_changed',
      (snap) => {
        setProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100));
      },
      (err) => {
        console.error('Upload error', err);
        alert(`Upload error: ${err.message}`);
        resetUploadState();
      },
      async () => {
        await loadAssets();
        resetUploadState();
      }
    );
  };

  const handleUpload = async (event) => {
    const file = event.target.files?.[0];
    await processFile(file);
    event.target.value = '';
  };

  const handleDrop = async (event) => {
    event.preventDefault();
    setDragActive(false);
    const file = event.dataTransfer.files?.[0];
    await processFile(file);
  };

  const handleDelete = async (name) => {
    if (!window.confirm(`Delete ${name}?`)) return;
    const fileRef = ref(storage, `cdn-assets/${name}`);
    await deleteObject(fileRef);
    await loadAssets();
  };

  return (
    <main className="min-h-screen bg-[#0f0f17] text-white p-10">
      <div className="mx-auto w-full max-w-6xl">
        <h1 className="mb-6 flex items-center gap-2 text-3xl font-bold">
          <FiUpload /> Visuals Manager
        </h1>
        <p className="mb-8 text-gray-400">
          Manage brand visuals for Hustle Studio — upload new backgrounds, icons, or logos, and they’ll
          sync automatically to the CDN.
        </p>

        <div
          onDragOver={(event) => {
            event.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={(event) => {
            event.preventDefault();
            setDragActive(false);
          }}
          onDrop={handleDrop}
          className={`mb-6 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 text-center transition-colors ${
            dragActive ? 'border-indigo-400 bg-indigo-400/10' : 'border-white/10 bg-white/5'
          }`}
        >
          <p className="text-sm text-gray-300">Drag & drop brand assets here</p>
          <p className="mt-2 text-xs text-gray-500">Accepted: images (SVG, PNG, JPG, WEBP)</p>
          <label className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700">
            <FiUpload /> Browse Files
            <input type="file" accept="image/*" onChange={handleUpload} className="hidden" />
          </label>
          {uploading && (
            <div className="mt-4 w-full max-w-md overflow-hidden rounded-full bg-gray-800">
              <div
                className="h-2 bg-indigo-500 transition-all"
                style={{ width: `${progress}%` }}
              />
              <p className="mt-2 text-xs text-gray-400">Uploading… {progress}%</p>
            </div>
          )}
        </div>

        <motion.div layout className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3">
          {assets.map((asset) => (
            <motion.div
              key={asset.name}
              layout
              className="rounded-xl border border-white/10 bg-[#1a1a1a] p-4 shadow-lg"
            >
              <img
                src={asset.url}
                alt={asset.name}
                className="mb-3 h-40 w-full rounded-lg object-cover"
                loading="lazy"
              />
              <p className="text-sm font-semibold">{asset.name}</p>
              <p className="text-xs text-gray-400">
                {prettyBytes(asset.size)} • {asset.contentType}
              </p>
              <p className="text-[11px] text-gray-500">
                Updated {new Date(asset.timeCreated).toLocaleString()}
              </p>
              <button
                type="button"
                onClick={() => handleDelete(asset.name)}
                className="mt-3 inline-flex items-center gap-2 rounded-md bg-red-600 px-3 py-1 text-sm transition hover:bg-red-700"
              >
                <FiTrash2 /> Delete
              </button>
            </motion.div>
          ))}
          {!assets.length && !uploading && (
            <div className="rounded-xl border border-dashed border-white/10 bg-white/5 p-8 text-center text-sm text-gray-400">
              No assets uploaded yet.
            </div>
          )}
        </motion.div>
      </div>
    </main>
  );
}
