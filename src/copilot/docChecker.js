/**
 * docChecker.js
 * Verificação inteligente de documentação por texto e condução de entrevista guiada
 * Requisito Crítico: NÃO analisa fotos/PDFs; baseia-se 100% nas descrições textuais oficiais.
 */

import { PRODUCT_DOC_REQUIREMENTS, identifyProductKey } from '../knowledge/docRequirements.js';
import { store } from '../database/store.js';

/**
 * Normaliza termos textuais para comparação sem acentos
 */
function cleanText(str) {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Avalia o texto fornecido pelo agente e compara com os requisitos oficiais do produto.
 * 
 * @param {string} productKey 
 * @param {string} text 
 * @returns {Object} { identified: Array, missing: Array, product: Object }
 */
export function checkDocumentation(productKey, text) {
  const product = PRODUCT_DOC_REQUIREMENTS[productKey] || PRODUCT_DOC_REQUIREMENTS['kixifacil'];
  const textNorm = cleanText(text);

  const identified = [];
  const missing = [];

  for (const doc of product.requiredDocs) {
    let found = false;
    for (const alias of doc.aliases) {
      const aliasNorm = cleanText(alias);
      if (textNorm.includes(aliasNorm)) {
        found = true;
        break;
      }
    }

    if (found) {
      identified.push(doc);
    } else {
      missing.push(doc);
    }
  }

  return { identified, missing, product };
}

/**
 * Formata o resultado da verificação de documentos no padrão WhatsApp.
 */
export function formatDocCheckResult(checkResult) {
  const { identified, missing, product } = checkResult;
  let response = `📋 *VERIFICAÇÃO DE DOCUMENTAÇÃO — ${product.name.toUpperCase()}*\n\n`;

  if (identified.length > 0) {
    response += `*Documentação identificada:*\n`;
    for (const doc of identified) {
      response += `✓ ${doc.name}\n`;
    }
    response += `\n`;
  } else {
    response += `*Nenhum documento obrigatório foi claramente identificado na sua descrição.*\n\n`;
  }

  if (missing.length > 0) {
    response += `*Documentos ainda em falta:*\n`;
    for (const doc of missing) {
      response += `❌ ${doc.name}\n`;
    }
    response += `\n`;
  } else {
    response += `🎉 *Todos os documentos principais obrigatórios foram identificados!*\n\n`;
  }

  response += `⚠️ *Recomenda-se confirmar também:*\n`;
  response += `• Validade do documento de identificação (BI)\n`;
  response += `• Legibilidade dos documentos apresentados\n`;
  response += `• Correspondência rigorosa dos dados do cliente\n\n`;

  if (missing.length > 0) {
    response += `➡️ *Próximo passo recomendado:*\n`;
    response += `Solicitar os documentos em falta ao cliente antes de avançar para a próxima etapa do processo.`;
  } else {
    response += `➡️ *Próximo passo recomendado:*\n`;
    response += `Conferir a autenticidade e conformidade das garantias antes de submeter para análise.`;
  }

  return response;
}

/**
 * Conduz o fluxo da entrevista guiada passo a passo para conferência de documentos.
 * 
 * @param {Object} user 
 * @param {Object} session 
 * @param {string} userMessage 
 * @returns {string|null} Resposta do bot ou null se não for entrevista guiada
 */
export function handleGuidedDocInterview(user, session, userMessage) {
  const msgNorm = cleanText(userMessage);

  // Início da entrevista guiada
  if (session.step === 'IDLE') {
    if (
      msgNorm.includes('verificar documentacao') ||
      msgNorm.includes('conferir documentos') ||
      msgNorm.includes('verificar documentos') ||
      msgNorm.includes('verificacao de documentos') ||
      (msgNorm.includes('quero verificar') && msgNorm.includes('document'))
    ) {
      // Verifica se o agente já mencionou o produto na mesma mensagem
      const detectedProduct = identifyProductKey(userMessage);
      if (detectedProduct) {
        session.step = 'GUIDED_DOCS_CHECK';
        session.context = { productKey: detectedProduct };
        store.setCopilotSession(user.phone, session);

        const prod = PRODUCT_DOC_REQUIREMENTS[detectedProduct];
        let checklistMsg = `📋 *CONFERÊNCIA DE DOCUMENTOS — ${prod.name.toUpperCase()}*\n\n`;
        checklistMsg += `Para este produto, indique quais destes documentos já foram recolhidos:\n\n`;
        prod.requiredDocs.forEach((d, idx) => {
          checklistMsg += `${idx + 1}. ${d.name}\n`;
        });
        checklistMsg += `\n_Responda com os números correspondentes (ex: "Temos 1, 2 e 3") ou descreva por texto._`;
        return checklistMsg;
      } else {
        session.step = 'GUIDED_DOCS_PRODUCT';
        session.context = {};
        store.setCopilotSession(user.phone, session);

        return (
          `Claro! 📋 Vou ajudar na verificação da documentação.\n\n` +
          `Indique primeiro qual é o produto de crédito:\n` +
          `1. *KixiFácil* (Microcrédito até 500.000 Kz)\n` +
          `2. *KixiNegócio* (Até 2.500.000 Kz)\n` +
          `3. *KixiAgronegócio* (Agrícola/Pecuária)\n` +
          `4. *KixiValor* (Assalariados / Parcerias)\n\n` +
          `_Digite o nome ou o número do produto._`
        );
      }
    }
  }

  // Passo 1: Seleção do produto
  if (session.step === 'GUIDED_DOCS_PRODUCT') {
    let selectedKey = null;
    if (msgNorm === '1' || msgNorm.includes('facil')) selectedKey = 'kixifacil';
    else if (msgNorm === '2' || msgNorm.includes('negocio')) selectedKey = 'kixinegocio';
    else if (msgNorm === '3' || msgNorm.includes('agro') || msgNorm.includes('agricultura')) selectedKey = 'kixiagronegocio';
    else if (msgNorm === '4' || msgNorm.includes('valor') || msgNorm.includes('salario')) selectedKey = 'kixivalor';
    else selectedKey = identifyProductKey(userMessage);

    if (!selectedKey) {
      return `Por favor, selecione um produto válido:\n1. KixiFácil\n2. KixiNegócio\n3. KixiAgronegócio\n4. KixiValor`;
    }

    session.step = 'GUIDED_DOCS_CHECK';
    session.context = { productKey: selectedKey };
    store.setCopilotSession(user.phone, session);

    const prod = PRODUCT_DOC_REQUIREMENTS[selectedKey];
    let checklistMsg = `📋 *CONFERÊNCIA DE DOCUMENTOS — ${prod.name.toUpperCase()}*\n\n`;
    checklistMsg += `Para este produto, indique quais destes documentos já foram recolhidos:\n\n`;
    prod.requiredDocs.forEach((d, idx) => {
      checklistMsg += `${idx + 1}. ${d.name}\n`;
    });
    checklistMsg += `\n_Responda com os números (ex: "Temos 1, 2 e 3") ou descreva por texto._`;
    return checklistMsg;
  }

  // Passo 2: Receção e conferência da lista informada
  if (session.step === 'GUIDED_DOCS_CHECK') {
    const productKey = session.context.productKey || 'kixifacil';
    const prod = PRODUCT_DOC_REQUIREMENTS[productKey];

    // Deteta se o agente respondeu por números (ex: "1, 2 e 3" ou "temos 1, 3")
    const numberMatches = userMessage.match(/\b([1-6])\b/g);
    let identified = [];
    let missing = [];

    if (numberMatches && numberMatches.length > 0) {
      const selectedIndices = new Set(numberMatches.map(n => parseInt(n, 10) - 1));
      prod.requiredDocs.forEach((doc, idx) => {
        if (selectedIndices.has(idx)) {
          identified.push(doc);
        } else {
          missing.push(doc);
        }
      });
    } else {
      // Análise por texto das palavras-chave
      const checkRes = checkDocumentation(productKey, userMessage);
      identified = checkRes.identified;
      missing = checkRes.missing;
    }

    // Grava log operacional
    store.logOperationalEvent({
      phone: user.phone,
      role: user.role,
      agency: user.agency,
      action: 'DOC_CHECK',
      category: prod.name,
      details: {
        product: prod.name,
        identifiedCount: identified.length,
        missingCount: missing.length
      },
      status: missing.length > 0 ? 'INCOMPLETE_DOCS' : 'SUCCESS'
    });

    // Conclui a entrevista guiada
    session.step = 'IDLE';
    session.context = {};
    store.setCopilotSession(user.phone, session);

    return formatDocCheckResult({ identified, missing, product: prod });
  }

  return null;
}
