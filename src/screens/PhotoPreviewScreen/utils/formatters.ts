export { formatBytes } from '../../../utils/format';

export const formatDate = (ms: number): string => {
  const d = new Date(ms);
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
};

export const formatDimensions = (width: number, height: number): string => `${width} × ${height}`;

export const formatExtension = (filename: string): string => {
  const parts = filename.split('.');
  return parts.length > 1 ? (parts[parts.length - 1]?.toUpperCase() ?? '') : '';
};

export const formatHeaderDate = (ms: number): string =>
  new Date(ms).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

export const formatHeaderTime = (ms: number): string =>
  new Date(ms).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
