'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const createGame = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/game/create', { method: 'POST' });
      const data = await res.json();
      if (data.gameId) {
        router.push(`/game/${data.gameId}`);
      }
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-neutral-950 text-white">
      <h1 className="text-4xl font-bold mb-8">Multiplayer Chess</h1>
      <button
        onClick={createGame}
        disabled={loading}
        className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg text-lg font-semibold transition-colors disabled:opacity-50"
      >
        {loading ? 'Creating...' : 'Create New Game'}
      </button>
    </div>
  );
}
