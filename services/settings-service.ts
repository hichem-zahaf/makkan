import { promises as fs } from 'fs';
import path from 'path';
import type { AppSettings, Library } from '../lib/types';
import { settingsSchema } from '../lib/utils/validation';
import { generateDocumentId } from '../lib/utils';

/**
 * Default settings
 */
export const DEFAULT_SETTINGS: AppSettings = {
  libraries: [],
  defaultView: 'grid',
  itemsPerPage: 50,
  autoScan: false,
  scanInterval: 60,
  theme: 'system',
};

/**
 * Path to the settings file
 */
let SETTINGS_FILE_PATH = path.join(process.cwd(), 'data', 'settings.json');

/**
 * Set the settings file path (for testing or custom locations)
 */
export function setSettingsFilePath(path: string): void {
  SETTINGS_FILE_PATH = path;
}

/**
 * Get the settings file path
 */
export function getSettingsFilePath(): string {
  return SETTINGS_FILE_PATH;
}

/**
 * Load settings from disk
 */
export async function loadSettings(): Promise<AppSettings> {
  try {
    const content = await fs.readFile(SETTINGS_FILE_PATH, 'utf-8');
    const data = JSON.parse(content);
    const settings = settingsSchema.parse(data);
    return settings;
  } catch (error) {
    // If file doesn't exist or is invalid, return default settings
    return DEFAULT_SETTINGS;
  }
}

/**
 * Save settings to disk
 */
export async function saveSettings(settings: AppSettings): Promise<void> {
  // Validate settings
  const validated = settingsSchema.parse(settings);

  // Ensure directory exists
  const dir = path.dirname(SETTINGS_FILE_PATH);
  await fs.mkdir(dir, { recursive: true });

  // Write settings to file
  await fs.writeFile(SETTINGS_FILE_PATH, JSON.stringify(validated, null, 2));
}

/**
 * Update specific settings fields
 */
export async function updateSettings(
  updates: Partial<AppSettings>
): Promise<AppSettings> {
  const currentSettings = await loadSettings();
  const updatedSettings = { ...currentSettings, ...updates };
  await saveSettings(updatedSettings);
  return updatedSettings;
}

/**
 * Add a library to settings
 */
export async function addLibrary(library: Omit<Library, 'id'>): Promise<Library> {
  const settings = await loadSettings();
  const newLibrary: Library = {
    ...library,
    id: generateDocumentId(library.path + Date.now()),
  };
  settings.libraries.push(newLibrary);
  await saveSettings(settings);
  return newLibrary;
}

/**
 * Update a library in settings
 */
export async function updateLibrary(
  id: string,
  updates: Partial<Library>
): Promise<Library | null> {
  const settings = await loadSettings();
  const index = settings.libraries.findIndex((lib) => lib.id === id);
  if (index === -1) {
    return null;
  }
  settings.libraries[index] = { ...settings.libraries[index], ...updates };
  await saveSettings(settings);
  return settings.libraries[index];
}

/**
 * Remove a library from settings
 */
export async function removeLibrary(id: string): Promise<boolean> {
  const settings = await loadSettings();
  const index = settings.libraries.findIndex((lib) => lib.id === id);
  if (index === -1) {
    return false;
  }
  settings.libraries.splice(index, 1);
  await saveSettings(settings);
  return true;
}

/**
 * Get a library by ID
 */
export async function getLibrary(id: string): Promise<Library | null> {
  const settings = await loadSettings();
  return settings.libraries.find((lib) => lib.id === id) || null;
}

/**
 * Get all libraries
 */
export async function getLibraries(): Promise<Library[]> {
  const settings = await loadSettings();
  return settings.libraries;
}
