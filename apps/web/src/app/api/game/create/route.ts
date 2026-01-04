import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/serverSupabase';

export async function POST() {
    const { data, error } = await supabaseServer
        .from('games')
        .insert({}) // Defaults handle everything (id, status=waiting, pgn='')
        .select()
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ gameId: data.id });
}
