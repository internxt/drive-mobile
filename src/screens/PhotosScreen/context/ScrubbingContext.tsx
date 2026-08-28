import { createContext, useContext } from 'react';

/**
 * Whether the user is currently dragging the timeline date scrubber. Consumers use it to skip
 * expensive work that would be discarded as cells recycle during a fast jump.
 *
 * Defaults to `false` rather than throwing when no provider is present: the timeline cells are not
 * the only consumers of the hooks that read it (the photo preview filmstrip renders them outside
 * the Photos timeline), and "not scrubbing" is the correct behaviour everywhere else.
 */
export const ScrubbingContext = createContext(false);

export const useIsScrubbing = (): boolean => useContext(ScrubbingContext);
