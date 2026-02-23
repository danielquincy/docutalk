import React from 'react';
import { AvatarProfile } from '../types';
import { AVATARS } from '../constants';
import { motion } from 'motion/react';
import { Check } from 'lucide-react';

interface Props {
  onSelect: (avatar: AvatarProfile) => void;
  selectedId?: string;
}

export const AvatarSelector: React.FC<Props> = ({ onSelect, selectedId }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl mx-auto px-4">
      {AVATARS.map((avatar) => (
        <motion.button
          key={avatar.id}
          whileHover={{ y: -5 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onSelect(avatar)}
          className={`
            relative flex flex-col items-center p-6 rounded-3xl transition-all duration-300
            ${selectedId === avatar.id 
              ? 'bg-white shadow-xl ring-2 ring-indigo-500' 
              : 'bg-white/50 hover:bg-white hover:shadow-lg border border-zinc-100'}
          `}
        >
          <div className="relative w-32 h-32 mb-4">
            <img
              src={avatar.imageUrl}
              alt={avatar.name}
              className="w-full h-full object-cover rounded-full shadow-inner"
              referrerPolicy="no-referrer"
            />
            {selectedId === avatar.id && (
              <div className="absolute -bottom-1 -right-1 bg-indigo-500 text-white p-1.5 rounded-full shadow-lg">
                <Check className="w-4 h-4" />
              </div>
            )}
          </div>
          
          <h3 className="text-xl font-bold text-zinc-900 mb-1">{avatar.name}</h3>
          <p className="text-sm text-zinc-500 text-center leading-relaxed">
            {avatar.description}
          </p>
          
          <div className={`mt-4 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider text-white ${avatar.color}`}>
            Voz: {avatar.voice}
          </div>
        </motion.button>
      ))}
    </div>
  );
};
