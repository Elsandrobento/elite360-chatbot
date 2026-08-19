/**
 * phoneNormalizer.js
 * Normalização centralizada e universal de números de telefone para autenticação
 */

/**
 * Normaliza qualquer formato de número de telefone para o formato padrão do sistema (apenas dígitos, com código de país 244 para Angola).
 * 
 * Exemplos:
 * "+244 933 220 903" -> "244933220903"
 * "244933220903@c.us" -> "244933220903"
 * "933220903" -> "244933220903"
 * "244933220903" -> "244933220903"
 * "+244 (922) 380-558" -> "244922380558"
 * 
 * @param {string|number} rawPhone 
 * @returns {string} Número normalizado
 */
export function normalizePhone(rawPhone) {
  if (!rawPhone) return '';

  let phone = String(rawPhone).trim();

  // Se vier com sufixo do WhatsApp (@c.us, @s.whatsapp.net, @g.us)
  if (phone.includes('@')) {
    phone = phone.split('@')[0];
  }

  // Remove todos os caracteres não numéricos (+, -, (, ), espaços, etc.)
  phone = phone.replace(/\D/g, '');

  if (!phone) return '';

  // Se começar com 00244, remove os zeros iniciais
  if (phone.startsWith('00244')) {
    phone = phone.slice(2);
  }

  // Se tiver 9 dígitos e começar por 9 (formato local de telemóvel em Angola: 9XXXXXXXX)
  // Adiciona o código do país de Angola (244)
  if (phone.length === 9 && phone.startsWith('9')) {
    phone = '244' + phone;
  }

  // Se começar com 0 e tiver 10 dígitos (ex: 0933220903), remove o zero e adiciona 244
  if (phone.length === 10 && phone.startsWith('09')) {
    phone = '244' + phone.slice(1);
  }

  return phone;
}

/**
 * Formata um número normalizado para exibição amigável.
 * Ex: "244933220903" -> "+244 933 220 903"
 * 
 * @param {string} phone 
 * @returns {string}
 */
export function formatPhoneForDisplay(phone) {
  const norm = normalizePhone(phone);
  if (norm.startsWith('244') && norm.length === 12) {
    return `+244 ${norm.slice(3, 6)} ${norm.slice(6, 9)} ${norm.slice(9)}`;
  }
  return norm ? `+${norm}` : 'N/D';
}
