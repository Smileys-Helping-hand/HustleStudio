import { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { motion } from 'framer-motion';
import { db } from '../lib/firebase';

const Team = () => {
  const [members, setMembers] = useState([]);

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'users'));
        setMembers(
          snapshot.docs.map((docSnapshot) => ({ id: docSnapshot.id, ...docSnapshot.data() }))
        );
      } catch (error) {
        console.error('Failed to load team members', error);
      }
    };

    fetchMembers();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-white">Your team</h1>
        <p className="text-white/60">An overview of authenticated users and their roles.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {members.length === 0 ? (
          <p className="text-white/50">
            No team members found. Seed the database to add demo accounts.
          </p>
        ) : (
          members.map((member, index) => (
            <motion.div
              key={member.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="rounded-3xl border border-white/5 bg-black/40 p-5"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-white">
                    {member.displayName ?? member.email}
                  </p>
                  <p className="text-xs uppercase tracking-widest text-white/40">
                    {member.role ?? 'member'}
                  </p>
                </div>
                <span className="rounded-full bg-brand-500/20 px-3 py-1 text-xs font-semibold text-brand-200">
                  {member.role === 'admin' ? 'Owner' : 'Crew'}
                </span>
              </div>
              <p className="mt-4 text-xs text-white/50">{member.email}</p>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};

export default Team;
