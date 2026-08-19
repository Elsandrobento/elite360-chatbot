/**
 * copilotHandler.js
 * Roteador central do KIXI COPILOT para Agentes, Gestores e Administradores
 * Aplica estritamente o RBAC no backend e as regras de zero alucinação.
 */

import { store } from '../database/store.js';
import { ROLES, hasPermission, PERMISSIONS } from '../auth/rbac.js';
import { handleGuidedDocInterview, checkDocumentation, formatDocCheckResult } from './docChecker.js';
import { analyzeCustomer } from './customerAnalyzer.js';
import { handleOperationalInquiry, generateAgencyOperationalReport, extractTargetAgency } from './agencyReports.js';
import { handleUserManagement } from './userManagement.js';
import { generateCopilotResponse } from '../ai/aiService.js';
import { identifyProductKey, PRODUCT_DOC_REQUIREMENTS } from '../knowledge/docRequirements.js';

/**
 * Retorna o menu de ajuda personalizado conforme o papel (Role) do utilizador.
 */
function getHelpMenu(user) {
  let menu = `👋 *OLÁ, ${user.name.toUpperCase()}!*\n`;
  menu += `Você está autenticado no *KIXI COPILOT* (*${user.role}* — Agência: ${user.agency})\n\n`;

  menu += `📌 *FUNCIONALIDADES OPERACIONAIS:*\n`;
  menu += `• *Dúvidas de Produtos:* "Quais os requisitos do KixiNegócio?"\n`;
  menu += `• *Verificar Documentação:* "Verificar documentação" ou descreva os documentos que possui.\n`;
  menu += `• *Análise Preliminar:* "Cliente recebe 200.000 Kz e quer 500.000 Kz a 12 meses."\n`;
  menu += `• *Prazos e Taxas:* "Qual a TAN do KixiValor?"\n`;

  if (user.role === ROLES.MANAGER || user.role === ROLES.ADMIN) {
    menu += `\n📊 *FUNCIONALIDADES DE GESTÃO (${user.agency}):*\n`;
    menu += `• *Relatório Operacional:* "Resumo operacional da agência"\n`;
    menu += `• *Dúvidas Frequentes:* "Quais as principais dúvidas dos agentes?"\n`;
    menu += `• *Processos Pendentes:* "Quantos casos tiveram documentação incompleta?"\n`;
  }

  if (user.role === ROLES.ADMIN) {
    menu += `\n⚙️ *GESTÃO ADMINISTRATIVA (GLOBAL):*\n`;
    menu += `• *Visão Global:* "Relatório global de todas as agências"\n`;
    menu += `• *Utilizadores:* "Consultar utilizadores activos"\n`;
    menu += `• *Adicionar:* "Adicionar [Nome], [Telefone], [Função], [Agência]"\n`;
    menu += `• *Desativar:* "Desativar utilizador [Telefone]"\n`;
  }

  menu += `\n_Pode escrever qualquer dúvida em linguagem natural._`;
  return menu;
}

/**
 * Processador principal de mensagens para utilizadores internos autenticados.
 * 
 * @param {Object} user Utilizador registado
 * @param {string} userMessage Texto da mensagem
 * @param {boolean} hasMedia Indica se a mensagem continha ficheiro/imagem
 * @returns {Promise<string>} Resposta formatada para o WhatsApp
 */
export async function handleCopilotMessage(user, userMessage, hasMedia = false) {
  // Regra 10: Se o funcionário enviar documento/imagem no WhatsApp, orienta para envio em texto
  if (hasMedia) {
    return (
      `📄 *ANÁLISE DE DOCUMENTAÇÃO*\n\n` +
      `Para esta verificação, por favor indique por texto quais documentos foram recolhidos.\n\n` +
      `_Por exemplo: "Já temos BI, declaração de rendimentos e comprovativo de residência."_`
    );
  }

  const rawText = (userMessage || '').trim();
  const lowerText = rawText.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const session = store.getCopilotSession(user.phone);

  // ----------------------------------------------------
  // 1. GESTÃO DE UTILIZADORES (Exclusivo ADMIN)
  // ----------------------------------------------------
  if (user.role === ROLES.ADMIN || session.step === 'ADMIN_PENDING_ACTION') {
    const adminResponse = handleUserManagement(user, session, rawText);
    if (adminResponse) {
      return adminResponse;
    }
  }

  // ----------------------------------------------------
  // 2. ENTREVISTA GUIADA DE DOCUMENTAÇÃO
  // ----------------------------------------------------
  if (
    session.step === 'GUIDED_DOCS_PRODUCT' ||
    session.step === 'GUIDED_DOCS_CHECK' ||
    lowerText.includes('verificar documentacao') ||
    lowerText.includes('conferir documentos') ||
    (lowerText.includes('quero verificar') && lowerText.includes('document'))
  ) {
    const guidedResponse = handleGuidedDocInterview(user, session, rawText);
    if (guidedResponse) {
      return guidedResponse;
    }
  }

  // ----------------------------------------------------
  // 3. COMANDOS BÁSICOS E AJUDA
  // ----------------------------------------------------
  if (lowerText === 'ajuda' || lowerText === 'menu' || lowerText === 'modo copilot' || lowerText === 'ola' || lowerText === 'ola!') {
    return getHelpMenu(user);
  }

  // ----------------------------------------------------
  // 4. VERIFICAÇÃO DIRETA DE DOCUMENTOS EM TEXTO
  // Ex: "Já temos BI, declaração de rendimentos e comprovativo de residência."
  // ----------------------------------------------------
  if (
    (lowerText.includes('temos') || lowerText.includes('recebemos') || lowerText.includes('entregou') || lowerText.includes('ja temos')) &&
    (lowerText.includes('bi') || lowerText.includes('bilhete') || lowerText.includes('rendimento') || lowerText.includes('residencia') || lowerText.includes('extrato'))
  ) {
    const productKey = identifyProductKey(rawText) || 'kixifacil';
    const checkResult = checkDocumentation(productKey, rawText);
    
    // Grava log
    store.logOperationalEvent({
      phone: user.phone,
      role: user.role,
      agency: user.agency,
      action: 'DOC_CHECK',
      category: checkResult.product.name,
      details: {
        product: checkResult.product.name,
        identifiedCount: checkResult.identified.length,
        missingCount: checkResult.missing.length
      },
      status: checkResult.missing.length > 0 ? 'INCOMPLETE_DOCS' : 'SUCCESS'
    });

    return formatDocCheckResult(checkResult);
  }

  // ----------------------------------------------------
  // 5. ANÁLISE PRELIMINAR DE CLIENTE
  // Ex: "Cliente quer 500000 Kz, recebe 250000 Kz por mês e quer pagar em 12 meses."
  // ----------------------------------------------------
  if (
    (lowerText.includes('cliente quer') || lowerText.includes('cliente recebe') || lowerText.includes('analisar cliente') || lowerText.includes('pre-analise')) ||
    (lowerText.includes('kz') && (lowerText.includes('meses') || lowerText.includes('recebe') || lowerText.includes('rendimento')))
  ) {
    return analyzeCustomer(user, rawText);
  }

  // ----------------------------------------------------
  // 6. RELATÓRIOS E INDICADORES OPERACIONAIS (MANAGER & ADMIN)
  // ----------------------------------------------------
  if (
    lowerText.includes('relatorio') ||
    lowerText.includes('resumo operacional') ||
    lowerText.includes('duvidas dos agentes') ||
    lowerText.includes('principais problemas') ||
    lowerText.includes('processos incompletos') ||
    lowerText.includes('actividade das agencias') ||
    lowerText.includes('atividade das agencias') ||
    lowerText.includes('como estao as agencias') ||
    lowerText.includes('como esta a agencia')
  ) {
    // Se for AGENT a tentar aceder a relatórios de gestão
    if (user.role === ROLES.AGENT) {
      return `⛔ *ACESSO RESTRITO*\n\nApenas Gestores de Agência e Administradores possuem autorização para consultar relatórios e indicadores operacionais.`;
    }

    return handleOperationalInquiry(user, rawText);
  }

  // ----------------------------------------------------
  // 7. CONSULTAS GERAIS DE CONHECIMENTO E PROCEDIMENTOS (VIA IA GEMINI GROUNDED)
  // ----------------------------------------------------
  try {
    const aiResult = await generateCopilotResponse(
      user,
      session.history,
      rawText
    );

    // Atualiza histórico na sessão
    session.history = aiResult.updatedHistory.slice(-10);
    store.setCopilotSession(user.phone, session);

    // Regista consulta
    store.logOperationalEvent({
      phone: user.phone,
      role: user.role,
      agency: user.agency,
      action: 'KNOWLEDGE_QUERY',
      category: identifyProductKey(rawText) || 'Geral',
      details: { querySnippet: rawText.substring(0, 100) },
      status: 'SUCCESS'
    });

    return aiResult.text;
  } catch (err) {
    console.error('❌ [COPILOT] Erro ao gerar resposta Gemini:', err);
    return (
      `⚠️ De momento não consegui consultar a base de conhecimento.\n\n` +
      `Por favor tente novamente ou contacte o suporte interno.`
    );
  }
}
