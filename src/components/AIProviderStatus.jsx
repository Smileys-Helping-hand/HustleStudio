import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiCpu, FiZap, FiCheckCircle } from 'react-icons/fi';
import { getActiveProvider, getProviderInfo, getAvailableModels } from '../lib/aiClient';
import { isGeminiAvailable } from '../lib/geminiClient';

const AIProviderStatus = () => {
  const [provider, setProvider] = useState(null);
  const [providerInfo, setProviderInfo] = useState(null);
  const [models, setModels] = useState(null);

  useEffect(() => {
    const activeProvider = getActiveProvider();
    const info = getProviderInfo();
    const availableModels = getAvailableModels();
    
    setProvider(activeProvider);
    setProviderInfo(info);
    setModels(availableModels);
  }, []);

  if (!provider || !providerInfo) {
    return null;
  }

  const isGemini = provider === 'gemini';
  const geminiAvailable = isGeminiAvailable();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-white/10 bg-black/40 p-6"
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-white mb-1">AI Provider</h3>
          <p className="text-sm text-white/60">Currently active AI service</p>
        </div>
        <div className="flex items-center gap-2">
          {isGemini ? (
            <FiZap className="w-5 h-5 text-gold" />
          ) : (
            <FiCpu className="w-5 h-5 text-blue-400" />
          )}
        </div>
      </div>

      <div className="space-y-4">
        {/* Active Provider */}
        <div className="flex items-center justify-between p-4 rounded-xl bg-white/5">
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center text-xl"
              style={{ backgroundColor: providerInfo.color + '20' }}
            >
              {providerInfo.icon}
            </div>
            <div>
              <p className="font-semibold text-white">{providerInfo.name}</p>
              <p className="text-xs text-white/50 capitalize">{providerInfo.provider}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/30">
            <FiCheckCircle className="w-4 h-4 text-green-400" />
            <span className="text-xs font-medium text-green-400">Active</span>
          </div>
        </div>

        {/* Available Models */}
        <div>
          <p className="text-xs uppercase tracking-wider text-white/40 mb-2">Available Models</p>
          <div className="grid gap-2">
            {models && Object.entries(models).map(([key, model]) => (
              <div
                key={key}
                className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/5"
              >
                <span className="text-sm text-white/70 capitalize">{key}</span>
                <code className="text-xs text-white/50 font-mono">{model}</code>
              </div>
            ))}
          </div>
        </div>

        {/* Features */}
        <div className="flex flex-wrap gap-2">
          {isGemini && (
            <>
              <span className="px-3 py-1 rounded-full bg-gold/10 border border-gold/30 text-xs text-gold">
                Cost-Effective
              </span>
              <span className="px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-xs text-blue-400">
                2M Context
              </span>
              <span className="px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-xs text-purple-400">
                Multimodal
              </span>
            </>
          )}
          {!isGemini && (
            <>
              <span className="px-3 py-1 rounded-full bg-green-500/10 border border-green-500/30 text-xs text-green-400">
                GPT-4 Series
              </span>
              <span className="px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-xs text-blue-400">
                128K Context
              </span>
            </>
          )}
        </div>

        {/* Fallback Info */}
        {isGemini && geminiAvailable && (
          <div className="pt-3 border-t border-white/10">
            <p className="text-xs text-white/40">
              OpenAI fallback available if needed
            </p>
          </div>
        )}

        {/* Configuration Help */}
        <div className="pt-3 border-t border-white/10">
          <p className="text-xs text-white/50">
            To change provider, update <code className="text-gold">VITE_AI_PROVIDER</code> in your environment variables
          </p>
        </div>
      </div>
    </motion.div>
  );
};

export default AIProviderStatus;
