// import { createAuthClient } from "better-auth/react";

// export const authClient = createAuthClient({});
export const authClient = { useSession: () => ({ data: null, isPending: false }), signOut: () => { } } as any;
