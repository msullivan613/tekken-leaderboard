// Config is imported as a module so the deployed bundle bakes in defaults (§1.4).
import raw from '../config/config.json';
import type { AppConfig } from '@/types/data-files';

export const config: AppConfig = raw as AppConfig;
