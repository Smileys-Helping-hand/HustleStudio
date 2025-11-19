import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { FaFileAudio, FaImage, FaPlay } from 'react-icons/fa';
import prettyBytes from 'pretty-bytes';
import { filesize } from 'filesize';
import { ASSET_MANIFEST_URL } from '@/config/assets.js';

const iconMap = {
  image: FaImage,
  video: FaPlay,
  audio: FaFileAudio,
};

const flattenManifest = (node, base = '') =>
  Object.entries(node).flatMap(([key, value]) => {
    const qualified = base ? `${base}.${key}` : key;
    if (typeof value === 'string') {
      return [{ name: qualified, path: value }];
    }
    return flattenManifest(value, qualified);
  });

function VisualCard({ asset }) {
  const Icon = iconMap[asset.kind] ?? FaImage;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/70 shadow-2xl shadow-black/40 transition duration-300 hover:-translate-y-1 hover:shadow-purple-500/20">
      <div className="aspect-video w-full overflow-hidden bg-black/40">
        {asset.error ? (
          <div className="flex h-full items-center justify-center text-sm text-rose-400">⚠️ Missing</div>
        ) : asset.kind === 'image' ? (
          <img src={asset.path} alt={asset.name} className="h-full w-full object-cover" loading="lazy" />
        ) : asset.kind === 'video' ? (
          /* eslint-disable-next-line jsx-a11y/media-has-caption */
          <video
            src={asset.path}
            muted
            controls
            loop
            aria-hidden="true"
            tabIndex={-1}
            className="h-full w-full object-cover"
            preload="metadata"
          />
        ) : asset.kind === 'audio' ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-purple-200">
            <Icon size={28} />
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <audio
              controls
              src={asset.path}
              aria-hidden="true"
              tabIndex={-1}
              className="w-full"
              preload="metadata"
            />
          </div>
        ) : (
          <div className="flex h-full items-center justify-center p-6 text-sm text-zinc-400">Unknown file</div>
        )}
      </div>

      <div className="space-y-1 bg-black/40 px-4 py-3">
        <p className="truncate text-sm font-medium text-white/90">{asset.name}</p>
        <p className="text-xs text-white/60">
          {asset.error
            ? 'Unavailable'
            : `${asset.typeLabel} • ${asset.prettySize}${asset.prettySize !== asset.fileSize ? ` (${asset.fileSize})` : ''}`}
        </p>
      </div>
    </div>
  );
}

export default function Visuals() {
  const [manifestEntries, setManifestEntries] = useState([]);
  const [assets, setAssets] = useState([]);

  useEffect(() => {
    let cancelled = false;

    const loadManifest = async () => {
      try {
        const response = await fetch(ASSET_MANIFEST_URL);
        if (!response.ok) {
          throw new Error(`Failed to fetch manifest: ${response.status}`);
        }
        const data = await response.json();
        if (!cancelled) {
          setManifestEntries(flattenManifest(data));
        }
      } catch (error) {
        console.error('Unable to load manifest', error);
      }
    };

    loadManifest();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!manifestEntries.length) {
      return;
    }

    let cancelled = false;

    const loadAssets = async () => {
      const resolved = await Promise.all(
        manifestEntries.map(async (item) => {
          try {
            const response = await fetch(item.path);
            if (!response.ok) {
              throw new Error(`Failed to fetch asset: ${response.status}`);
            }
            const blob = await response.blob();
            const type = blob.type || 'application/octet-stream';
            const base = type.split('/')[0];

            return {
              ...item,
              kind: base,
              typeLabel: type,
              prettySize: prettyBytes(blob.size),
              fileSize: filesize(blob.size, { standard: 'iec' }),
            };
          } catch {
            return { ...item, error: true };
          }
        })
      );

      if (!cancelled) {
        setAssets(resolved);
      }
    };

    loadAssets();

    return () => {
      cancelled = true;
    };
  }, [manifestEntries]);

  const isLoading = !assets.length && !!manifestEntries.length;

  return (
    <section className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-black px-4 py-16 text-white sm:px-8">
      <div className="mx-auto max-w-6xl space-y-12">
        <header className="space-y-3 text-center">
          <p className="text-sm uppercase tracking-[0.3em] text-purple-300/80">Asset Library</p>
          <h1 className="text-4xl font-bold text-purple-200 sm:text-5xl">Hustle Studio Visual Vault</h1>
          <p className="mx-auto max-w-3xl text-sm text-purple-100/70 sm:text-base">
            Review the imagery, motion assets, and ambient audio that power the immersive Hustle Studio experience.
            Metadata is fetched in real-time from the published manifest to ensure parity with production builds.
          </p>
        </header>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {assets.map((asset) => (
            <VisualCard key={asset.name} asset={asset} />
          ))}
        </div>

        {isLoading && (
          <div className="flex justify-center">
            <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70">Loading assets...</div>
          </div>
        )}

        <footer className="text-center text-xs uppercase tracking-[0.3em] text-white/40">
          Auto-generated from manifest.json • {new Date().getFullYear()}
        </footer>
      </div>
    </section>
  );
}

VisualCard.propTypes = {
  asset: PropTypes.shape({
    name: PropTypes.string.isRequired,
    path: PropTypes.string.isRequired,
    kind: PropTypes.string,
    typeLabel: PropTypes.string,
    prettySize: PropTypes.string,
    fileSize: PropTypes.string,
    error: PropTypes.bool,
  }).isRequired,
};