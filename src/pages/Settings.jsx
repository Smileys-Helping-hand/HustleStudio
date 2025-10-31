import { useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext.jsx";

const Settings = () => {
  const { user, role } = useAuth();
  const [studioName, setStudioName] = useState("Side Hustle Studio");
  const [theme, setTheme] = useState("midnight");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-white">Workspace settings</h1>
        <p className="text-white/60">Personalize the experience for you and your crew.</p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6 rounded-3xl border border-white/5 bg-black/40 p-6"
      >
        <div>
          <label className="text-xs font-semibold uppercase tracking-widest text-white/50">
            Studio name
          </label>
          <input
            value={studioName}
            onChange={(event) => setStudioName(event.target.value)}
            className="mt-2 w-full rounded-xl border border-white/10 bg-black/60 px-4 py-3 text-white outline-none focus:border-brand-500"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-white/50">Current user</p>
            <p className="mt-1 text-lg font-semibold text-white">{user?.email}</p>
            <p className="text-xs uppercase tracking-widest text-white/40">Role: {role}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-white/50">Theme</p>
            <div className="mt-3 flex gap-2">
              {["midnight", "aurora", "sunset"].map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setTheme(option)}
                  className={`rounded-full border px-4 py-2 text-sm capitalize transition ${
                    theme === option
                      ? "border-brand-500 bg-brand-500/20 text-white"
                      : "border-white/10 bg-white/5 text-white/70"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/5 bg-white/5 p-4 text-sm text-white/70">
          These settings are stored locally for demo purposes. Connect your Firebase rules to persist workspace preferences for
          every teammate.
        </div>
      </motion.div>
    </div>
  );
};

export default Settings;
