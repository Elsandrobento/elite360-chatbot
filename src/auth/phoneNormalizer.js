/**
 * phoneNormalizer.js
 * Normalização centralizada e universal de números de telefone para autenticação
 */

/**
 * Extrai valor bruto de string ou objeto de contacto/mensagem do WhatsApp.
 * Suporta formatos:
 * - String: "+244 933 220 903", "244933220903@c.us", "whatsapp:+244933220903", "933220903"
 * - Objeto: { user: '244933220903' }, { _serialized: '244933220903@c.us' }, { id: '244933220903@c.us' }
 * 
 * @param {string|number|Object} input 
 * @returns {string}
 */
export function normalizePhone(input) {
  if (!input) return '';

  let phone = '';

  if (typeof input === 'object') {
    // Se for objeto Wid ou Contact do whatsapp-web.js
    if (input.user && typeof input.user === 'string') {
      phone = input.user;
    } else if (input.number && typeof input.number === 'string') {
      phone = input.number;
    } else if (input._serialized && typeof input._serialized === 'string') {
      phone = input._serialized;
    } else if (input.id && typeof input.id === 'string') {
      phone = input.id;
    } else if (input.remote && typeof input.remote === 'string') {
      phone = input.remote;
    } else {
      try {
        phone = JSON.stringify(input);
      } catch (e) {
        phone = String(input);
      }
    }
  } else {
    phone = String(input).trim();
  }

  // Remove prefixos como "whatsapp:"
  phone = phone.replace(/^whatsapp:/i, '');

  // Se vier com sufixo do WhatsApp (@c.us, @s.whatsapp.net, @lid, @g.us)
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

  // Se começar com 00 (outro DDI), remove os zeros iniciais
  if (phone.startsWith('00')) {
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

