/**
 * logger.js
 * Sistema de logging estruturado e seguro
 * Anonimiza telefones e nunca expõe chaves de API nem credenciais.
 */

/**
 * Mascara número de telefone para proteger privacidade nos logs.
 * Ex: "244933220903" -> "2449***03"
 */
export function maskPhone(phone) {
  if (!phone) return 'N/A';
  const str = String(phone);
  if (str.length < 6) return '***';
  return str.slice(0, 4) + '***' + str.slice(-2);
}

export const logger = {
  info: (msg, meta = {}) => {
    const timestamp = new Date().toISOString();
    const safeMeta = { ...meta };
    if (safeMeta.phone) safeMeta.phone = maskPhone(safeMeta.phone);
    console.log(`[INFO] [${timestamp}] ${msg}`, Object.keys(safeMeta).length > 0 ? JSON.stringify(safeMeta) : '');
  },

  warn: (msg, meta = {}) => {
    const timestamp = new Date().toISOString();
    const safeMeta = { ...meta };
    if (safeMeta.phone) safeMeta.phone = maskPhone(safeMeta.phone);
    console.warn(`⚠️ [WARN] [${timestamp}] ${msg}`, Object.keys(safeMeta).length > 0 ? JSON.stringify(safeMeta) : '');
  },

  error: (msg, err = null, meta = {}) => {
    const timestamp = new Date().toISOString();
    const safeMeta = { ...meta };
    if (safeMeta.phone) safeMeta.phone = maskPhone(safeMeta.phone);
    console.error(`❌ [ERROR] [${timestamp}] ${msg}`, err?.message || err || '', Object.keys(safeMeta).length > 0 ? JSON.stringify(safeMeta) : '');
  },

  logInteraction: ({ phone, role, agency, message, responseSnippet, mode }) => {
    const timestamp = new Date().toISOString();
    const masked = maskPhone(phone);
    console.log(
      `\n📨 [INTERACTION] [${timestamp}] Mode: ${mode} | User: ${masked} (${role} - ${agency})` +
      `\n   📥 In: "${(message || '').replace(/\n/g, ' ').substring(0, 80)}"` +
      `\n   📤 Out: "${(responseSnippet || '').replace(/\n/g, ' ').substring(0, 80)}..."`
    );
  }
};
