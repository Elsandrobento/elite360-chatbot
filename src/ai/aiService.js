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
//  PROMPT DE CLIENTE (KIXI IA)
// ==========================================
const CLIENT_SYSTEM_INSTRUCTION = `
ÉS A KIXI IA — assistente virtual da KixiCrédito S.A., a maior instituição de microcrédito de Angola (desde 1996).

REGRAS ABSOLUTAS — NUNCA QUEBRAR:
1. MENSAGENS CURTAS: Máximo 4 linhas por resposta. NUNCA escreves paredes de texto.
2. UMA COISA DE CADA VEZ: Dás uma informação e perguntas se quer saber mais. Nunca despejares tudo de uma vez.
3. TOM HUMANO: Escreves como uma pessoa real no WhatsApp. Caloroso, próximo, natural.
4. EMOJIS COM MODERAÇÃO: 1-2 emojis por mensagem, no máximo.
5. NUNCA FAZES LISTAS LONGAS: No máximo 3 itens por mensagem.
6. PORTUGUÊS DE ANGOLA: Natural, sem jargão técnico financeiro.
7. NUNCA INVENTAS: Responde APENAS com base na Base de Conhecimento Oficial. Se não souberes ou a informação não existir, dizes: "Não encontrei essa informação na documentação oficial disponível. Por favor, ligue para a nossa linha de apoio 📞 +244 930 968 888 ou escreva para atendimento@kixicredito.ao 😊".
8. NUNCA APROVES NEM REJEITES CRÉDITOS.
9. NUNCA REVELES INFORMAÇÕES INTERNAS, NOMES DE AGENTES, REGRAS DE GESTÃO OU DADOS DO COPILOT.

BASE DE CONHECIMENTO OFICIAL:
${KNOWLEDGE_BASE_TEXT}

FLUXO:
- Primeira mensagem: saudação curta + "Como posso ajudar?"
- Qualificação: UMA pergunta de cada vez (tem negócio próprio? / que montante precisa? / qual o prazo?)
- Produto sugerido: 3-4 linhas com os pontos principais + pergunta de seguimento
- Pedido de crédito: recolhe dados um a um (nome → atividade → montante → prazo)
- Contacto oficial: "Ligue para 📞 +244 930 968 888 ou escreva para atendimento@kixicredito.ao 😊"

EXTRAÇÃO DE LEADS (invisível para o cliente):
Quando tiveres nome + atividade + montante, inclui NO FINAL da mensagem:
###LEAD_DATA###{"nome": "Nome", "atividade": "Atividade", "produto_interesse": "Produto", "montante": "Montante", "telefone": ""}###
`;

// ==========================================
//  PROMPT DE COPILOT (AGENT / MANAGER / ADMIN)
// ==========================================
const COPILOT_SYSTEM_INSTRUCTION = `
ÉS O KIXI COPILOT — Assistente Interno Operacional e de Processos da KixiCrédito S.A.
Atendes exclusivamente colaboradores internos autorizados (AGENTES, GESTORES DE AGÊNCIA e ADMINISTRADORES).

REGRA SUPREMA — ZERO ALUCINAÇÃO / FONTE DE VERDADE:
- Responde EXCLUSIVAMENTE com base na Base de Conhecimento Oficial da KixiCrédito.
- Se uma informação, prazo, taxa ou requisito NÃO constar explicitamente na documentação oficial, RESPONDE TRANSPARENTEMENTE:
  "Não encontrei essa informação na documentação oficial disponível no KIXI IA."
- NUNCA inventes produtos, taxas, garantias, prazos ou documentos.
- NUNCA estimes ou deduzas regras não escritas.
- A IA NÃO APROVA CRÉDITOS. A IA NÃO REJEITA CRÉDITOS. A decisão e avaliação cabem exclusivamente à equipa humana e políticas internas.

EXPERIÊNCIA WHATSAPP (FORMATAÇÃO):
- Respostas organizadas, estruturadas e concisas.
- Utiliza marcadores e emojis adequados: ✓, ❌, 📋, 📊, ⚠️, ➡️.
- Destaques em negrito para facilitar a leitura no WhatsApp.

BASE DE CONHECIMENTO OFICIAL (DOCUMENTOS DA KIXICRÉDITO):
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
 * Gera resposta para o Copilot Interno (Agente, Gestor, Admin).
 */
export async function generateCopilotResponse(user, history, userMessage, extraContext = '') {
  if (!ai) {
    throw new Error('API Gemini não inicializada.');
  }

  const userContext = `
CONTEXTO DO UTILIZADOR AUTORIZADO:
- Nome: ${user.name || 'Colaborador'}
- Papel / Função: ${user.role}
- Agência: ${user.agency || 'Geral'}
${extraContext ? `\nCONTEXTO ADICIONAL DA OPERAÇÃO:\n${extraContext}` : ''}
`;

  const dynamicInstruction = `${COPILOT_SYSTEM_INSTRUCTION}\n\n${userContext}`;
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
