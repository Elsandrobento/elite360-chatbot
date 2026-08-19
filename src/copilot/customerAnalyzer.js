/**
 * customerAnalyzer.js
 * Análise preliminar de pedidos de crédito submetidos por agentes
 * Princípio: A IA NÃO APROVA NEM REJEITA CRÉDITOS.
 * Auxilia apenas na qualificação, validação preliminar e identificação de dados em falta.
 */

import { PRODUCT_DOC_REQUIREMENTS } from '../knowledge/docRequirements.js';
import { store } from '../database/store.js';

/**
 * Extrai valores numéricos monetários e prazos de uma mensagem em texto.
 */
function extractCreditParameters(text) {
  const norm = text.toLowerCase().replace(/\./g, '').replace(/,/g, '.');

  // Extrai montante (ex: 500000 kz, 500 mil, 2.500.000)
  let amount = null;
  const milMatch = norm.match(/(\d+(?:\.\d+)?)\s*mil(?:h[õo]es)?/);
  if (milMatch) {
    const val = parseFloat(milMatch[1]);
    if (norm.includes('milh')) {
      amount = val * 1000000;
    } else {
      amount = val * 1000;
    }
  } else {
    const kzMatches = norm.match(/(\d{4,9})/g);
    if (kzMatches && kzMatches.length > 0) {
      amount = parseInt(kzMatches[0], 10);
    }
  }

  // Extrai rendimento
  let income = null;
  const incomeRegex = /(?:recebe|ganha|rendimento|salario|fatura|faturacao|lucro)[^\d]*(\d{4,9}|\d+(?:\.\d+)?\s*mil)/i;
  const incMatch = text.match(incomeRegex);
  if (incMatch) {
    const incRaw = incMatch[1].toLowerCase().replace(/\./g, '');
    if (incRaw.includes('mil')) {
      income = parseFloat(incRaw) * 1000;
    } else {
      income = parseInt(incRaw, 10);
    }
  }

  // Extrai prazo em meses
  let termMonths = null;
  const termMatch = text.match(/(\d{1,2})\s*meses/i);
  if (termMatch) {
    termMonths = parseInt(termMatch[1], 10);
  }

  return { amount, income, termMonths };
}

/**
 * Determina produtos compatíveis com os parâmetros fornecidos segundo as FTI oficiais.
 */
function matchSuitableProducts(amount, isEmpregado, isAgricultura) {
  const suitable = [];

  if (isAgricultura) {
    suitable.push(PRODUCT_DOC_REQUIREMENTS['kixiagronegocio']);
    return suitable;
  }

  if (isEmpregado) {
    suitable.push(PRODUCT_DOC_REQUIREMENTS['kixivalor']);
    return suitable;
  }

  if (amount) {
    if (amount >= 5000 && amount <= 500000) {
      suitable.push(PRODUCT_DOC_REQUIREMENTS['kixifacil']);
    }
    if (amount >= 500001 && amount <= 2500000) {
      suitable.push(PRODUCT_DOC_REQUIREMENTS['kixinegocio']);
    }
  } else {
    suitable.push(PRODUCT_DOC_REQUIREMENTS['kixifacil']);
    suitable.push(PRODUCT_DOC_REQUIREMENTS['kixinegocio']);
  }
  return suitable.length > 0 ? suitable : [PRODUCT_DOC_REQUIREMENTS['kixifacil']];
}

function formatKz(val) {
  if (val === null || val === undefined) return '';
  return String(Math.round(val)).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' Kz';
}

/**
 * Gera a análise preliminar estruturada no padrão do WhatsApp.
 * 
 * @param {Object} user 
 * @param {string} customerText 
 * @returns {string}
 */
export function analyzeCustomer(user, customerText) {
  const norm = customerText.toLowerCase();
  const params = extractCreditParameters(customerText);

  const isAgricultura = norm.includes('agri') || norm.includes('campo') || norm.includes('pecuaria') || norm.includes('cultivo');
  const isAssalariado = norm.includes('salario') || norm.includes('assalariado') || norm.includes('empresa parceira') || norm.includes('protocolo');

  const products = matchSuitableProducts(params.amount, isAssalariado, isAgricultura);
  const primaryProduct = products[0];

  // Identifica dados em falta
  const missingData = [];
  if (!params.income) missingData.push('Rendimento mensal comprovado ou faturação do negócio');
  if (!params.amount) missingData.push('Montante exato pretendido');
  if (!params.termMonths) missingData.push('Prazo pretendido de reembolso');
  if (!isAgricultura && !isAssalariado && !norm.includes('negocio') && !norm.includes('atividade')) {
    missingData.push('Atividade ou ramo do negócio do cliente');
  }
  missingData.push('Garantias disponíveis (solidária, avalista, penhor ou caução)');

  // Formatação da resposta
  let response = `📊 *ANÁLISE PRELIMINAR DE CRÉDITO*\n\n`;

  response += `*Produto potencialmente adequado:*\n`;
  response += `🔹 *${primaryProduct.name}* (${primaryProduct.category})\n`;
  response += `• Limites de montante: ${formatKz(primaryProduct.minAmount)} a ${formatKz(primaryProduct.maxAmount)}\n`;
  response += `• Prazo máximo: ${primaryProduct.maxTermMonths} meses | Taxa: ${primaryProduct.rate}\n\n`;

  response += `*Dados fornecidos:*\n`;
  if (params.amount) response += `• Montante pretendido: ${formatKz(params.amount)}\n`;
  if (params.income) response += `• Rendimento/Faturação informada: ${formatKz(params.income)}/mês\n`;
  if (params.termMonths) response += `• Prazo pretendido: ${params.termMonths} meses\n`;
  if (!params.amount && !params.income && !params.termMonths) {
    response += `• Descrição geral fornecida pelo agente\n`;
  }
  response += `\n`;

  if (missingData.length > 0) {
    response += `*Dados em falta a confirmar:*\n`;
    for (const item of missingData) {
      response += `• ${item}\n`;
    }
    response += `\n`;
  }

  response += `*Documentação obrigatória a verificar:*\n`;
  for (const doc of primaryProduct.requiredDocs.slice(0, 4)) {
    response += `• ${doc.name}\n`;
  }
  response += `\n`;

  response += `➡️ *Próximo passo recomendado:*\n`;
  response += `Confirmar a capacidade de esforço financeiro do cliente e recolher a documentação obrigatória em falta.\n\n`;

  response += `⚠️ *NOTA IMPORTANTE:*\n`;
  response += `A IA NÃO aprova nem rejeita créditos. A decisão e análise de risco final devem seguir rigorosamente as políticas internas da KixiCrédito.`;

  // Registo do evento operacional
  store.logOperationalEvent({
    phone: user.phone,
    role: user.role,
    agency: user.agency,
    action: 'CUSTOMER_PREANALYSIS',
    category: primaryProduct.name,
    details: {
      product: primaryProduct.name,
      amount: params.amount,
      income: params.income,
      termMonths: params.termMonths
    },
    status: 'SUCCESS'
  });

  return response;
}
