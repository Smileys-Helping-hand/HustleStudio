import { useState } from 'react';
import { motion } from 'framer-motion';
import { getDownloadURL, getStorage, ref, uploadBytes } from 'firebase/storage';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../theme/ThemeContext.jsx';
import { themes, themeOrder } from '../theme/themes.js';

const Settings = () => {
  const storage = getStorage();
  const { user, role, reportOffline } = useAuth();
  const { themeKey, theme, cycleTheme, setShowIntroOnStartup, showIntroOnStartup, setIntroMedia } = useTheme();
  const [studioName, setStudioName] = useState('Hustle Studio HQ');
  const [uploading, setUploading] = useState(false);

  const handleIntroToggle = () => {
    setShowIntroOnStartup(!showIntroOnStartup);
  };

  const uploadAsset = async (file, type) => {
    if (!user || !file) return;
    setUploading(true);
    try {
      const assetRef = ref(storage, `userAssets/${user.uid}/intro/${type}`);
      await uploadBytes(assetRef, file, { contentType: file.type });
      const url = await getDownloadURL(assetRef);
      setIntroMedia((prev) => ({ ...(prev ?? {}), [`${type}Url`]: url }));
      toast.success(`${type === 'video' ? 'Video' : 'Audio'} uploaded successfully.`);
    } catch (error) {
      console.error('[Storage] Upload failed', error);
      reportOffline();
      toast.error('Unable to upload asset right now.');
    } finally {
      setUploading(false);
    }
  };

  const handleVideoUpload = (event) => {
    const [file] = event.target.files ?? [];
    if (file) {
      uploadAsset(file, 'video');
    }
  };

  const handleAudioUpload = (event) => {
    const [file] = event.target.files ?? [];
    if (file) {
      uploadAsset(file, 'audio');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-[var(--theme-text)]">Workspace settings</h1>
        <p className="text-sm text-[color-mix(in_srgb,var(--theme-text)_60%,transparent)]">
          Personalise the cinematic intro, theme rotations, and desktop install options.
        </p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6 rounded-3xl border border-white/5 bg-black/40 p-6 shadow-[0_25px_60px_rgba(0,0,0,0.35)] backdrop-blur"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label
              className="text-xs font-semibold uppercase tracking-widest text-white/50"
              htmlFor="studio-name"
            >
              Studio name
            </label>
            <input
              id="studio-name"
              value={studioName}
              onChange={(event) => setStudioName(event.target.value)}
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/60 px-4 py-3 text-white outline-none focus:border-[var(--theme-highlight)]"
            />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-white/50">Current user</p>
            <p className="mt-2 text-lg font-semibold text-white">{user?.email}</p>
            <p className="text-xs uppercase tracking-widest text-white/40">Role: {role}</p>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-white/50">Active theme</p>
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.35em] text-white/70">
                {themes[themeKey].label}
              </span>
              <button
                type="button"
                onClick={cycleTheme}
                className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs uppercase tracking-[0.35em] text-white transition hover:border-white/40 hover:bg-white/20"
              >
                Cycle theme
              </button>
              <div className="flex items-center gap-2 text-xs text-white/50">
                {themeOrder.map((key) => (
                  <span
                    key={key}
                    className={`h-3 w-3 rounded-full transition ${
                      key === themeKey ? 'bg-[var(--theme-highlight)]' : 'bg-white/20'
                    }`}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2 text-xs text-white/50">
                <span className="h-4 w-4 rounded-full" style={{ background: theme.palette.accent }} />
                <span className="h-4 w-4 rounded-full" style={{ background: theme.palette.highlight }} />
                <span className="h-4 w-4 rounded-full" style={{ background: theme.palette.surface }} />
              </div>
            </div>
          </div>
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-white/50">Intro gate</p>
            <button
              type="button"
              onClick={handleIntroToggle}
              className={`rounded-full border px-4 py-2 text-xs uppercase tracking-[0.35em] transition ${
                showIntroOnStartup
                  ? 'border-[var(--theme-highlight)] bg-[var(--theme-highlight)]/20 text-white'
                  : 'border-white/10 bg-white/5 text-white/60'
              }`}
            >
              {showIntroOnStartup ? 'Disable intro on launch' : 'Enable intro on launch'}
            </button>
            <p className="text-xs text-white/40">
              When enabled, Hustle Studio plays the cinematic gate before unlocking the dashboard.
            </p>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-white/50">
              Upload custom intro video
            </p>
            <label className="inline-flex w-fit cursor-pointer items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.35em] text-white/70 transition hover:border-white/30 hover:bg-white/10">
              <input type="file" accept="video/*" className="hidden" onChange={handleVideoUpload} />
              Upload video
            </label>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-white/50">
              Upload ambient audio
            </p>
            <label className="inline-flex w-fit cursor-pointer items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.35em] text-white/70 transition hover:border-white/30 hover:bg-white/10">
              <input type="file" accept="audio/*" className="hidden" onChange={handleAudioUpload} />
              Upload audio
            </label>
          </div>
        </div>

        {uploading && (
          <div className="rounded-2xl border border-yellow-500/40 bg-yellow-500/10 px-4 py-3 text-xs text-yellow-200">
            Uploading intro assets — please keep this tab open.
          </div>
        )}

        <div className="rounded-2xl border border-white/5 bg-white/5 p-4 text-sm text-white/70">
          Preferences sync automatically to Firestore when online. Offline edits are cached locally and pushed once the connection restores.
        </div>
      </motion.div>
    </div>
  );
};

export default Settings;
