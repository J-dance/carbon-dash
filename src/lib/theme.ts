/**
 * Where the theme toggle saves the reader's choice ("light" or "dark"). app.html reads the same key
 * in an inline script, which cannot import this, so the two must be kept the same by hand.
 */
export const THEME_STORAGE_KEY = 'theme'
