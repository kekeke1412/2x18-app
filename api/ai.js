import { authenticateMember } from '../server/firebaseAuth.js';
import { createAiHandler } from '../server/aiHandler.js';

export const config = { maxDuration: 60 };
export default createAiHandler({ authenticate: authenticateMember });
