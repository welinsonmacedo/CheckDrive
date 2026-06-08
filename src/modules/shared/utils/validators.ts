export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf'
];

export const ALLOWED_EXTENSIONS = [
  'jpg',
  'jpeg',
  'png',
  'webp',
  'pdf'
];

export function validateFileUpload(file: File): { valid: boolean; error?: string } {
  if (!file) return { valid: false, error: 'Arquivo inválido.' };

  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: 'O tamanho do arquivo excede o limite de 5MB.' };
  }

  // Check type
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return { valid: false, error: 'Formato de arquivo não suportado.' };
  }

  // Check extension manually just in case
  const parts = file.name.split('.');
  const ext = parts[parts.length - 1].toLowerCase();
  
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return { valid: false, error: 'Extensão de arquivo não permitida.' };
  }

  return { valid: true };
}
