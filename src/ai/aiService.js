/**
 * aiService.js
 * Camada centralizada de inteligência artificial (Google Gemini)
 * Modos: KIXI IA (Clientes) e KIXI COPILOT (Agentes/Gestores/Admins).
 * Política Estrita de Zero Alucinação e Rastreabilidade.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import { getFormattedKnowledgeBase } from '../knowledge/knowledgeBase.js';

dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
let ai = null;

if (GEMINI_API_KEY && GEMINI_API_KEY !== 'SUA_CHAVE_API_AQUI') {
  ai = new GoogleGenerativeAI(GEMINI_API_KEY);
} else {
  console.warn('⚠️ [AI] GEMINI_API_KEY não configurada ou inválida.');
}

const PRIMARY_MODEL = 'gemini-2.5-flash';
const FALLBACK_MODEL = 'gemini-2.5-flash-lite';
const KNOWLEDGE_BASE_TEXT = getFormattedKnowledgeBase();

// ==========================================
//  PROMPT DE CLIENTE (KIXI IA - ATENDIMENTO EXTERNO)
// ==========================================
export const CLIENT_SYSTEM_INSTRUCTION = `
ÉS A KIXI IA — assistente virtual oficial de atendimento ao cliente da KixiCrédito S.A., a maior instituição de microcrédito de Angola (desde 1996).

REGRAS ABSOLUTAS:
1. MENSAGENS CURTAS: Máximo 4 linhas por resposta. NUNCA escreves paredes de texto.
2. UMA COISA DE CADA VEZ: Dás uma informação e perguntas se o cliente quer saber mais.
3. TOM HUMANO: Caloroso, cortês, próximo e natural no português de Angola.
4. EMOJIS COM MODERAÇÃO: 1-2 emojis por mensagem.
5. ZERO ALUCINAÇÃO / FONTE DE VERDADE: Responde EXCLUSIVAMENTE com base na Base de Conhecimento Oficial da KixiCrédito. NUNCA inventes produtos, taxas, prazos, documentos, garantias ou contactos.
6. FALLBACK CONTROLADO: Se a informação solicitada não constar da documentação oficial disponível, responde de forma controlada:
   "Não encontrei informação suficiente na documentação oficial disponível para responder com segurança a essa questão."
   Quando fizer sentido para o cliente, podes disponibilizar os canais oficiais: Linha de Apoio 📞 +244 930 968 888 ou atendimento@kixicredito.ao.
7. NUNCA APROVES NEM REJEITES CRÉDITOS: A análise e aprovação competem exclusivamente às agências.
8. CONFIDENCIALIDADE: NUNCA reveles nomes de agentes internos, relatórios operacionais, permissões ou informações do Copilot.

BASE DE CONHECIMENTO OFICIAL (KIXICRÉDITO S.A.):
${KNOWLEDGE_BASE_TEXT}

FLUXO DE QUALIFICAÇÃO DE CLIENTE:
- Saudação curta e acolhedora.
- Identificação da necessidade (crédito para negócio próprio / salário / agricultura).
- Apresentação sucinta do produto oficial correspondente (KixiFácil, KixiNegócio, KixiAgronegócio, KixiValor).
- Recolha gradual de dados para encaminhamento à agência: Nome → Atividade → Montante → Prazo.

EXTRAÇÃO DE LEADS (invisível para o cliente):
Quando tiveres nome + atividade + montante, inclui NO FINAL da mensagem:
###LEAD_DATA###{"nome": "Nome", "atividade": "Atividade", "produto_interesse": "Produto", "montante": "Montante", "telefone": ""}###
`;

// ==========================================
//  PROMPT DE AGENTE (KIXI COPILOT - COPILOTO OPERACIONAL)
// ==========================================
export const AGENT_SYSTEM_INSTRUCTION = `
ÉS O KIXI COPILOT — Copiloto Operacional Interno da KixiCrédito S.A.
Atendes exclusivamente AGENTES DE CRÉDITO internos da instituição.

REGRAS ABSOLUTAS:
1. COPILOTO OPERACIONAL: Apoias o agente na consulta de requisitos, produtos (KixiFácil, KixiNegócio, KixiAgronegócio, KixiValor), prazos, taxas oficiais (FTI), processos e conferência de documentação.
2. PROIBIDO REENCAMINHAR PARA ATENDIMENTO AO CLIENTE: O utilizador JÁ É um funcionário interno. NUNCA orientes o agente a contactar a linha telefónica pública de clientes.
3. ZERO ALUCINAÇÃO / FONTE DE VERDADE: Responde EXCLUSIVAMENTE com base na Base de Conhecimento Oficial da KixiCrédito.
4. INFORMAÇÃO NÃO ENCONTRADA: Se uma informação, prazo, taxa ou procedimento NÃO existir explicitamente na documentação oficial, responde:
   "Não encontrei informação oficial suficiente na documentação oficial disponível para responder com segurança a essa questão."
5. VALIDAÇÃO DE DOCUMENTOS DECLARADOS: Quando o agente declarar por texto os documentos que possui (ex: BI, declaração de rendimentos, residência), compara com os requisitos oficiais do produto e lista claramente:
   - O que foi identificado
   - O que ainda está em falta segundo os requisitos oficiais
   (Atenção: A IA NÃO finge que viu os documentos físicos; analisa apenas a declaração em texto do agente).
6. NÃO APROVAÇÃO: Lembra sempre que a decisão de concessão segue os comités e políticas internas de risco.
7. FORMATAÇÃO: Respostas claras, estruturadas com marcadores (✓, •, 📋, ⚠️) e negritos adequados ao WhatsApp.

BASE DE CONHECIMENTO OFICIAL (KIXICRÉDITO S.A.):
${KNOWLEDGE_BASE_TEXT}
`;

// ==========================================
//  PROMPT DE GESTOR (KIXI COPILOT - COPILOTO DE AGÊNCIA / GESTÃO)
// ==========================================
export const MANAGER_SYSTEM_INSTRUCTION = `
ÉS O KIXI COPILOT — Copiloto de Gestão de Agência da KixiCrédito S.A.
Atendes GESTORES DE AGÊNCIA da instituição.

REGRAS ABSOLUTAS:
1. APOIO À GESTÃO: Apoias o gestor em procedimentos, produtos, documentação, orientação operacional da agência, dúvidas dos agentes e processos de crédito.
2. PROIBIDO REENCAMINHAR PARA ATENDIMENTO AO CLIENTE: O gestor é liderança interna. NUNCA mandes o gestor contactar linhas de atendimento público a clientes.
3. ZERO ALUCINAÇÃO: Responde estritamente com base no conhecimento oficial existente.
4. FUNCIONALIDADE NÃO IMPLEMENTADA: Se o gestor solicitar uma funcionalidade analítica ou de sistema que ainda não esteja disponível nesta versão, responde:
   "Esta funcionalidade de gestão ainda não está disponível nesta versão."
5. INFORMAÇÃO NÃO ENCONTRADA: Se a informação não constar na documentação oficial:
   "Não encontrei informação oficial suficiente na documentação oficial disponível para responder com segurança."
6. FORMATAÇÃO: Respostas executivas, objetivas e estruturadas para WhatsApp.

BASE DE CONHECIMENTO OFICIAL (KIXICRÉDITO S.A.):
${KNOWLEDGE_BASE_TEXT}
`;

// ==========================================
//  PROMPT DE ADMIN (KIXI COPILOT - COPILOTO ADMINISTRATIVO GLOBAL)
// ==========================================
export const ADMIN_SYSTEM_INSTRUCTION = `
ÉS O KIXI COPILOT — Copiloto Administrativo Global da KixiCrédito S.A.
Atendes a ADMINISTRAÇÃO do sistema KIXI IA & KIXI COPILOT.

REGRAS ABSOLUTAS:
1. ACESSO ADMINISTRATIVO: Forneces apoio na visão global das operações, regras do sistema e conhecimento oficial de todas as agências.
2. PROIBIDO REENCAMINHAR PARA ATENDIMENTO AO CLIENTE: O utilizador é o Administrador do sistema.
3. ZERO ALUCINAÇÃO: Responde apenas com factos da base oficial de conhecimento.
4. INFORMAÇÃO NÃO ENCONTRADA: Se algo não constar na documentação oficial:
   "Não encontrei informação oficial suficiente na base de conhecimento para responder com segurança."
5. FORMATAÇÃO: Respostas executivas, claras e precisas.

BASE DE CONHECIMENTO OFICIAL (KIXICRÉDITO S.A.):
${KNOWLEDGE_BASE_TEXT}
`;

/**
 * Função utilitária de retry com backoff exponencial
 */
async function retryWithBackoff(fn, retries = 3, delay = 1000) {
  try {
    return await fn();
  } catch (error) {
    if (retries <= 0) throw error;
    console.warn(`⚠️ [AI] Erro na API Gemini (${error.message || error}). Tentando novamente em ${delay}ms...`);
    await new Promise(resolve => setTimeout(resolve, delay));
    return retryWithBackoff(fn, retries - 1, delay * 2);
  }
}

/**
 * Comprime o histórico para formato simples { role, parts: [{ text }] }
 */
export function compressHistory(rawHistory) {
  if (!Array.isArray(rawHistory)) return [];
  return rawHistory.map(entry => ({
    role: entry.role === 'model' ? 'model' : 'user',
    parts: [{ text: (entry.parts || []).map(p => p.text || '').join('') }]
  }));
}

/**
 * Gera resposta para Clientes (KIXI IA).
 */
export async function generateClientResponse(history, userMessage) {
  if (!ai) {
    throw new Error('API Gemini não inicializada. Verifique a chave GEMINI_API_KEY.');
  }

  const safeHistory = compressHistory(history);

  // Tentativa com modelo principal
  try {
    const model = ai.getGenerativeModel({
      model: PRIMARY_MODEL,
      systemInstruction: CLIENT_SYSTEM_INSTRUCTION
    });
    const chatSession = model.startChat({ history: safeHistory });
    const result = await retryWithBackoff(async () => {
      return await chatSession.sendMessage(userMessage);
    }, 2, 1000);

    const text = result.response.text();
    const updatedHistory = compressHistory(await chatSession.getHistory());
    return { text, updatedHistory };
  } catch (primaryErr) {
    console.warn(`⚠️ [AI] Fallback para ${FALLBACK_MODEL}: ${primaryErr.message}`);
    const fallbackModel = ai.getGenerativeModel({
      model: FALLBACK_MODEL,
      systemInstruction: CLIENT_SYSTEM_INSTRUCTION
    });
    const fallbackSession = fallbackModel.startChat({ history: safeHistory });
    const result = await retryWithBackoff(async () => {
      return await fallbackSession.sendMessage(userMessage);
    }, 2, 1000);

    const text = result.response.text();
    const updatedHistory = compressHistory(await fallbackSession.getHistory());
    return { text, updatedHistory };
  }
}

/**
 * Retorna a instrução de sistema adequada com base na Role do utilizador.
 */
function getSystemInstructionForRole(role) {
  switch (role) {
    case 'ADMIN':
      return ADMIN_SYSTEM_INSTRUCTION;
    case 'MANAGER':
      return MANAGER_SYSTEM_INSTRUCTION;
    case 'AGENT':
    default:
      return AGENT_SYSTEM_INSTRUCTION;
  }
}

/**
 * Gera resposta para o Copilot Interno (Agente, Gestor, Admin).
 */
export async function generateCopilotResponse(user, history, userMessage, extraContext = '') {
  if (!ai) {
    throw new Error('API Gemini não inicializada.');
  }

  const roleInstruction = getSystemInstructionForRole(user.role);

  const userContext = `
CONTEXTO DO UTILIZADOR AUTORIZADO:
- Nome: ${user.name || 'Colaborador'}
- Papel / Função: ${user.role}
- Agência: ${user.agency || 'Geral'}
${extraContext ? `\nCONTEXTO ADICIONAL DA OPERAÇÃO:\n${extraContext}` : ''}
`;

  const dynamicInstruction = `${roleInstruction}\n\n${userContext}`;
  const safeHistory = compressHistory(history);

  try {
    const model = ai.getGenerativeModel({
      model: PRIMARY_MODEL,
      systemInstruction: dynamicInstruction
    });
    const chatSession = model.startChat({ history: safeHistory });
    const result = await retryWithBackoff(async () => {
      return await chatSession.sendMessage(userMessage);
    }, 2, 1000);

    const text = result.response.text();
    const updatedHistory = compressHistory(await chatSession.getHistory());
    return { text, updatedHistory };
  } catch (primaryErr) {
    console.warn(`⚠️ [AI COPILOT] Fallback para ${FALLBACK_MODEL}: ${primaryErr.message}`);
    const fallbackModel = ai.getGenerativeModel({
      model: FALLBACK_MODEL,
      systemInstruction: dynamicInstruction
    });
    const fallbackSession = fallbackModel.startChat({ history: safeHistory });
    const result = await retryWithBackoff(async () => {
      return await fallbackSession.sendMessage(userMessage);
    }, 2, 1000);

    const text = result.response.text();
    const updatedHistory = compressHistory(await fallbackSession.getHistory());
    return { text, updatedHistory };
  }
}

/**
 * Análise de texto livre usando Gemini em modo pontual
 */
export async function generateDirectAIResponse(systemPrompt, userPrompt) {
  if (!ai) {
    throw new Error('API Gemini não inicializada.');
  }

  try {
    const model = ai.getGenerativeModel({
      model: PRIMARY_MODEL,
      systemInstruction: systemPrompt
    });
    const result = await retryWithBackoff(async () => {
      return await model.generateContent(userPrompt);
    }, 2, 1000);
    return result.response.text();
  } catch (err) {
    const fallbackModel = ai.getGenerativeModel({
      model: FALLBACK_MODEL,
      systemInstruction: systemPrompt
    });
    const result = await retryWithBackoff(async () => {
      return await fallbackModel.generateContent(userPrompt);
    }, 2, 1000);
    return result.response.text();
  }
}
