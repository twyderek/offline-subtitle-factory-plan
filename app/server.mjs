/**
 * Local server bootstrap.
 *
 * The runtime implementation remains a compatibility module while domain
 * services migrate into lib/. Keeping this entry stable preserves Electron,
 * browser and development launch commands.
 */
import './server-runtime.mjs';
