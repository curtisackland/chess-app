'use client';

import ChessGame from '@/components/ChessGame';
import { useParams } from 'next/navigation';

export default function GamePage() {
    const { id } = useParams();

    if (!id || typeof id !== 'string') return <div>Invalid ID</div>;

    return (
        <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
            <ChessGame gameId={id} />
        </div>
    );
}
