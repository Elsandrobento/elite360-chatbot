/**
 * clientHandler.js
 * Atendimento automático e qualificação de clientes (KIXI IA)
 * Mantém rigorosamente 100% da experiência de cliente existente.
 */

import { generateClientResponse } from '../ai/aiService.js';
import { store } from '../database/store.js';

// Memória de sessões ativas de clientes (com TTL)
const clientSessions = new Map();
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutos
const MAX_HISTORY_MESSAGES = 10;
const MAX_ACTIVE_SESSIONS = 300;

// Limpeza periódica de sessões expiradas
setInterval(() => {
  const now = Date.now();
  for (const [phone, data] of clientSessions.entries()) {
    if (now - data.lastActive > SESSION_TIMEOUT) {
      clientSessions.delete(phone);
    }
  }
}, 5 * 60 * 1000).unref();

/**
 * Processa mensagens recebidas de clientes (números não registados como staff).
 * 
 * @param {string} phone 
 * @param {string} userMessage 
 * @param {Object} contactInfo 
 * @returns {Promise<string>}
 */
export async function handleClientMessage(phone, userMessage, contactInfo = {}) {
  const now = Date.now();
  let session = clientSessions.get(phone);

  if (!session || (now - session.lastActive > SESSION_TIMEOUT)) {
    session = {
      history: [],
      clientName: contactInfo.pushname || contactInfo.name || null,
      lastActive: now
    };
    clientSessions.set(phone, session);
  }
  session.lastActive = now;

  // Limite de sessões simultâneas
  if (clientSessions.size > MAX_ACTIVE_SESSIONS) {
    const oldestKey = clientSessions.keys().next().value;
    if (oldestKey && oldestKey !== phone) {
      clientSessions.delete(oldestKey);
    }
  }

  // Poda do histórico
  if (session.history.length > MAX_HISTORY_MESSAGES) {
    session.history = session.history.slice(-MAX_HISTORY_MESSAGES);
  }

  // Gera resposta via Gemini com prompt de cliente
  const { text: rawResponse, updatedHistory } = await generateClientResponse(
    session.history,
    userMessage
  );

  session.history = updatedHistory.slice(-MAX_HISTORY_MESSAGES);
  let finalResponse = rawResponse;

  // Extração e salvamento de lead se a IA tiver qualificado os dados
  const leadRegex = /###LEAD_DATA###(.*?)###/;
  const match = finalResponse.match(leadRegex);
  if (match) {
    try {
      const leadData = JSON.parse(match[1].trim());
      leadData.telefone = phone;
      if (leadData.nome && !session.clientName) {
        session.clientName = leadData.nome;
      }
      store.saveLead(leadData);
      console.log(`\n🚨 [LEAD CAPTURADO] Lead de "${leadData.nome}" registado com sucesso!`);
    } catch (e) {
      console.error('❌ [CLIENT] Erro ao decodificar lead JSON:', e);
    }
    finalResponse = finalResponse.replace(leadRegex, '').trim();
  }

  return finalResponse;
}

export function getActiveClientSessionsCount() {
  return clientSessions.size;
}
