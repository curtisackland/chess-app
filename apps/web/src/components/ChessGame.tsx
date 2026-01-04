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
    const [playerId, setPlayerId] = useState<string>('');
    const [playerColor, setPlayerColor] = useState<'white' | 'black' | null>(null);

    // Generate or retrieve player ID
    useEffect(() => {
        let id = localStorage.getItem('chess_player_id');
        if (!id) {
            id = crypto.randomUUID();
            localStorage.setItem('chess_player_id', id);
        }
        setPlayerId(id);
    }, []);

    // Fetch initial state and assign player
    useEffect(() => {
        if (!playerId) return;

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

                // Assign player to a color if not already assigned
                if (!data.player_white) {
                    // First player joins as white
                    await supabase
                        .from('games')
                        .update({ player_white: playerId })
                        .eq('id', gameId);
                    setPlayerColor('white');
                    setOrientation('white');
                } else if (data.player_white === playerId) {
                    setPlayerColor('white');
                    setOrientation('white');
                } else if (!data.player_black) {
                    // Second player joins as black
                    await supabase
                        .from('games')
                        .update({ player_black: playerId })
                        .eq('id', gameId);
                    setPlayerColor('black');
                    setOrientation('black');
                } else if (data.player_black === playerId) {
                    setPlayerColor('black');
                    setOrientation('black');
                } else {
                    // Spectator mode
                    setPlayerColor(null);
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
    }, [gameId, chess, playerId]);

    // Handle Move
    function onDrop({ sourceSquare, targetSquare }: { piece: any; sourceSquare: string; targetSquare: string | null }): boolean {
        console.log('onDrop called:', sourceSquare, 'to', targetSquare);

        // Reject if piece dropped off board
        if (!targetSquare) {
            return false;
        }

        // Check if it's this player's turn
        const currentTurn = chess.turn(); // 'w' or 'b'
        const canMove = (currentTurn === 'w' && playerColor === 'white') ||
            (currentTurn === 'b' && playerColor === 'black');

        if (!canMove) {
            console.log('Not your turn or not your piece');
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
                {playerColor && (
                    <div className="p-2 bg-blue-700 rounded">
                        You are: <span className="font-bold capitalize">{playerColor}</span>
                    </div>
                )}
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
