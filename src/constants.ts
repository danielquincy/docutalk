import { AvatarProfile } from './types';

export const AVATARS: AvatarProfile[] = [
  {
    id: 'luna',
    name: 'Luna',
    description: 'Tranquila y analítica, ideal para documentos técnicos.',
    voice: 'Kore',
    color: 'bg-indigo-500',
    imageUrl: '/img/Luna.png',
    greeting: '¡Hola! Soy Luna. Estoy lista para ayudarte a entender este documento. ¿Por dónde empezamos?'
  },
  {
    id: 'atlas',
    name: 'Atlas',
    description: 'Energético y curioso, le encanta profundizar en los conceptos.',
    voice: 'Fenrir',
    color: 'bg-emerald-500',
    imageUrl: '/img/Atlas.png',
    greeting: '¡Qué tal! Soy Atlas. He estado revisando el material y es fascinante. ¡Pregúntame lo que quieras!'
  },
  {
    id: 'nova',
    name: 'Nova',
    description: 'Creativa y empática, excelente para resumir y dar ejemplos.',
    voice: 'Zephyr',
    color: 'bg-rose-500',
    imageUrl: '/img/Nova.png',
    greeting: '¡Hola! Soy Nova. Me encanta este tema. ¿Quieres que te explique algo con un ejemplo?'
  }
];
