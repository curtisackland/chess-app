'use client';

import { useEffect, useState } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { supabase } from '@/lib/supabase';
import type { Game } from '@/types/game';

interface ChessGameProps {
    gameId: string;
}

export default function ChessGame({ gameId }: ChessGameProps) {
    const [game, setGame] = useState<Game | null>(null);
    const [chess] = useState(new Chess());
    const [fen, setFen] = useState(chess.fen());
    const [orientation, setOrientation] = useState<'white' | 'black'>('white');

    // Fetch initial state
    useEffect(() => {
        const fetchGame = async () => {
            const { data, error } = await supabase
                .from('games')
                .select('*')
                .eq('id', gameId)
                .single();

            if (data) {
                console.log('Game loaded:', data);
                setGame(data);
                if (data.pgn) {
                    chess.loadPgn(data.pgn);
                    setFen(chess.fen());
                }
            } else if (error) {
                console.error('Failed to load game:', error);
            }
        };

        fetchGame();

        // Subscribe to changes
        const channel = supabase
            .channel(`game:${gameId}`)
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'games',
                filter: `id=eq.${gameId}`
            }, (payload) => {
                const newGame = payload.new as Game;
                setGame(newGame);
                if (newGame.pgn !== chess.pgn()) {
                    chess.loadPgn(newGame.pgn || '');
                    setFen(chess.fen());
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [gameId, chess]);

    // Handle Move
    function onDrop({ sourceSquare, targetSquare }: { piece: any; sourceSquare: string; targetSquare: string | null }): boolean {
        console.log('onDrop called:', sourceSquare, 'to', targetSquare);

        // Reject if piece dropped off board
        if (!targetSquare) {
            return false;
        }

        // Attempt move locally first
        const move = chess.move({
            from: sourceSquare,
            to: targetSquare,
            promotion: 'q',
        });

        if (!move) {
            console.log('Invalid move');
            return false; // Invalid move
        }

        // Update UI optimistically
        setFen(chess.fen());

        // Send to server asynchronously
        fetch('/api/game/move', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                gameId,
                from: sourceSquare,
                to: targetSquare,
                promotion: 'q',
            }),
        })
            .then(response => response.json())
            .then(result => {
                if (!result.success) {
                    console.error('Move failed on server:', result.error);
                    // Revert the move
                    chess.undo();
                    setFen(chess.fen());
                }
            })
            .catch(e => {
                console.error('Move exception:', e);
                // Revert on error
                chess.undo();
                setFen(chess.fen());
            });

        return true; // Accept the move optimistically
    }

    if (!game) return <div className="text-white">Loading game...</div>;

    return (
        <div className="flex flex-col items-center gap-4">
            <div className="w-[400px] h-[400px]">
                <Chessboard
                    options={{
                        position: fen,
                        onPieceDrop: onDrop,
                        boardOrientation: orientation,
                    }}
                />
            </div>
            <div className="flex gap-4 text-white">
                <div className="p-2 bg-neutral-800 rounded">
                    Status: <span className="font-bold">{game.status}</span>
                </div>
                {game.result && (
                    <div className="p-2 bg-neutral-800 rounded">
                        Result: <span className="font-bold">{game.result}</span>
                    </div>
                )}
                <button
                    onClick={() => {
                        console.log('Flip button clicked, current orientation:', orientation);
                        setOrientation(o => o === 'white' ? 'black' : 'white');
                    }}
                    className="px-4 py-2 bg-neutral-700 rounded hover:bg-neutral-600"
                >
                    Flip Board
                </button>
            </div>
            <div className="text-sm text-neutral-400 mt-4">
                Share this URL to play with a friend.
            </div>
        </div>
    );
}
