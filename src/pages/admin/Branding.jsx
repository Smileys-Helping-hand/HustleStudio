import { useEffect, useState } from 'react';
import PageHeader from '../../components/common/PageHeader.jsx';
import { useTenant } from '../../context/TenantContext.jsx';
import { defaultBrand } from '../../config/branding.js';

export default function BrandingAdmin() {
  const { brand, saveBranding } = useTenant();
  const [formState, setFormState] = useState(defaultBrand);

  useEffect(() => {
    if (brand) {
      setFormState({
        name: brand.name,
        logo: brand.logo,
        favicon: brand.favicon,
        domain: brand.domain,
        colors: { ...defaultBrand.colors, ...brand.colors },
      });
    }
  }, [brand]);

  const updateField = (key, value) => {
    setFormState((prev) => ({ ...prev, [key]: value }));
  };

  const updateColor = (key, value) => {
    setFormState((prev) => ({ ...prev, colors: { ...prev.colors, [key]: value } }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    saveBranding(formState);
  };

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 pb-16">
      <PageHeader
        title="White-label Branding"
        subtitle="Control logos, colours, and domain overlays for each tenant workspace."
      />

      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-2xl border border-white/10 bg-white/5 p-8 shadow-[0_0_30px_rgba(99,102,241,0.15)]"
      >
        <div className="grid gap-6 md:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm text-white/70">
            Brand name
            <input
              value={formState.name ?? ''}
              onChange={(event) => updateField('name', event.target.value)}
              className="rounded-lg border border-white/10 bg-black/40 px-4 py-3 text-white placeholder:text-white/40 focus:border-indigo-400 focus:outline-none"
              placeholder="Workspace name"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm text-white/70">
            Domain (optional)
            <input
              value={formState.domain ?? ''}
              onChange={(event) => updateField('domain', event.target.value)}
              className="rounded-lg border border-white/10 bg-black/40 px-4 py-3 text-white placeholder:text-white/40 focus:border-indigo-400 focus:outline-none"
              placeholder="example.yourdomain.com"
            />
          </label>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm text-white/70">
            Logo URL
            <input
              value={formState.logo ?? ''}
              onChange={(event) => updateField('logo', event.target.value)}
              className="rounded-lg border border-white/10 bg-black/40 px-4 py-3 text-white placeholder:text-white/40 focus:border-indigo-400 focus:outline-none"
              placeholder="https://cdn.yourbrand/logo.svg"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm text-white/70">
            Favicon URL
            <input
              value={formState.favicon ?? ''}
              onChange={(event) => updateField('favicon', event.target.value)}
              className="rounded-lg border border-white/10 bg-black/40 px-4 py-3 text-white placeholder:text-white/40 focus:border-indigo-400 focus:outline-none"
              placeholder="https://cdn.yourbrand/favicon.svg"
            />
          </label>
        </div>

        <div className="grid gap-6 md:grid-cols-4">
          {['primary', 'accent', 'surface', 'text'].map((key) => (
            <label key={key} className="flex flex-col gap-2 text-sm text-white/70">
              {key.charAt(0).toUpperCase() + key.slice(1)} colour
              <input
                type="color"
                value={formState.colors?.[key] ?? defaultBrand.colors[key]}
                onChange={(event) => updateColor(key, event.target.value)}
                className="h-12 w-full cursor-pointer rounded-lg border border-white/10 bg-black/40"
              />
            </label>
          ))}
        </div>

        <div className="rounded-xl border border-white/10 bg-black/40 p-6 text-sm text-white/60">
          <p className="mb-3 font-semibold text-white">Live preview</p>
          <div
            className="rounded-xl p-6"
            style={{
              background: formState.colors?.surface,
              color: formState.colors?.text,
            }}
          >
            <div className="flex items-center gap-4">
              {formState.logo ? (
                <img
                  src={formState.logo}
                  alt="Preview logo"
                  className="h-10 w-10 rounded-full border border-white/20 bg-white/10 object-contain"
                />
              ) : null}
              <div>
                <p className="text-lg font-semibold">{formState.name || 'Workspace brand'}</p>
                <p style={{ color: formState.colors?.accent }}>Accent preview</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="rounded-full bg-indigo-500 px-6 py-3 text-sm font-semibold text-white shadow-[0_0_20px_rgba(99,102,241,0.35)] transition hover:bg-indigo-400"
          >
            Save branding
          </button>
        </div>
      </form>
    </div>
  );
}
