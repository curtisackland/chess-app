import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/serverSupabase';
import { Chess } from 'chess.js';

export async function POST(request: Request) {
    const body = await request.json();
    const { gameId, from, to, promotion } = body;

    if (!gameId || !from || !to) {
        return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    // 1. Fetch current game state
    const { data: game, error: fetchError } = await supabaseServer
        .from('games')
        .select('*')
        .eq('id', gameId)
        .single();

    if (fetchError || !game) {
        return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    // 2. Load into chess.js
    const chess = new Chess();
    if (game.pgn) {
        chess.loadPgn(game.pgn);
    }

    // 3. Attempt move
    try {
        const move = chess.move({ from, to, promotion: promotion || 'q' });
        if (!move) {
            throw new Error('Invalid move');
        }
    } catch (e) {
        return NextResponse.json({ error: 'Invalid move' }, { status: 400 });
    }

    // 4. Update Game State
    const newPgn = chess.pgn();
    const isGameOver = chess.isGameOver();
    let status = game.status;
    let result = game.result;

    if (status === 'waiting') {
        status = 'active'; // First move starts game if not already
    }

    if (isGameOver) {
        status = 'complete';
        if (chess.isCheckmate()) {
            result = chess.turn() === 'w' ? 'black_wins' : 'white_wins';
        } else if (chess.isDraw()) {
            result = 'draw';
        }
    }

    // 5. Save to DB
    const { error: updateError } = await supabaseServer
        .from('games')
        .update({
            pgn: newPgn,
            status,
            result,
            updated_at: new Date().toISOString()
        })
        .eq('id', gameId);

    if (updateError) {
        console.error('Database Update Error:', updateError);
        return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, pgn: newPgn });
}
