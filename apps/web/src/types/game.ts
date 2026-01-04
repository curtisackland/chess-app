export interface Game {
    id: string;
    player_white: string | null;
    player_black: string | null;
    pgn: string;
    status: 'waiting' | 'active' | 'complete';
    result: 'white_wins' | 'black_wins' | 'draw' | null;
    created_at: string;
}
