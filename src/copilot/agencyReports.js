/**
 * agencyReports.js
 * Geração de relatórios operacionais e indicadores com dados reais
 * Regra Crítica: Isolamento estrito de agência para MANAGER e proibição absoluta de dados inventados.
 */

import { store } from '../database/store.js';
import { ROLES, canAccessAgency } from '../auth/rbac.js';

/**
 * Normaliza e identifica se a mensagem menciona uma agência específica.
 */
export function extractTargetAgency(text) {
  const norm = (text || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (norm.includes('mutamba')) return 'Mutamba';
  if (norm.includes('zango')) return 'Zango';
  if (norm.includes('viana')) return 'Viana';
  if (norm.includes('talatona')) return 'Talatona';
  if (norm.includes('cazenga')) return 'Cazenga';
  if (norm.includes('vila alice') || norm.includes('alice')) return 'Vila Alice';
  return null;
}

/**
 * Gera relatório operacional para uma agência específica ou global (ADMIN).
 * 
 * @param {Object} user 
 * @param {string} userMessage 
 * @returns {string}
 */
export function generateAgencyOperationalReport(user, userMessage) {
  const targetAgency = extractTargetAgency(userMessage);

  // Se o gestor tentar consultar outra agência para a qual não tem autorização
  if (targetAgency && !canAccessAgency(user, targetAgency)) {
    return `⛔ *ACESSO NÃO AUTORIZADO*\n\nNão possui permissão para consultar dados da agência *${targetAgency}*. Como Gestor, o seu acesso está restrito à agência *${user.agency}*.`;
  }

  // Define a agência a consultar
  let agencyToQuery = targetAgency || user.agency;
  if (user.role === ROLES.ADMIN && (!targetAgency || userMessage.toLowerCase().includes('global') || userMessage.toLowerCase().includes('todas'))) {
    agencyToQuery = 'GLOBAL';
  }

  // Consulta os logs reais gravados no sistema
  const logs = store.getOperationalLogs(agencyToQuery === 'GLOBAL' ? {} : { agency: agencyToQuery });
  const allLeads = store.getLeads();
  const leadsInAgency = agencyToQuery === 'GLOBAL' 
    ? allLeads 
    : allLeads.filter(l => (l.agencia || '').toLowerCase() === agencyToQuery.toLowerCase());

  // Se não houver dados registrados no sistema
  if (logs.length === 0 && leadsInAgency.length === 0) {
    return (
      `📊 *RELATÓRIO OPERACIONAL — ${agencyToQuery.toUpperCase()}*\n\n` +
      `Neste momento não existem dados suficientes registados para gerar este indicador.\n\n` +
      `_À medida que os agentes e clientes utilizarem o KIXI IA, as métricas e resumos serão atualizados em tempo real._`
    );
  }

  // Agregação de estatísticas reais
  const totalInteractions = logs.length + leadsInAgency.length;
  const docCheckLogs = logs.filter(l => l.action === 'DOC_CHECK');
  const incompleteDocs = docCheckLogs.filter(l => l.status === 'INCOMPLETE_DOCS').length;
  const preAnalysisLogs = logs.filter(l => l.action === 'CUSTOMER_PREANALYSIS').length;
  const leadCount = leadsInAgency.length;

  // Dúvidas / Produtos mais consultados
  const productCounts = {};
  logs.forEach(l => {
    if (l.category && l.category !== 'Geral') {
      productCounts[l.category] = (productCounts[l.category] || 0) + 1;
    }
  });

  const topProducts = Object.entries(productCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([p, count]) => `• ${p} (${count} consultas)`);

  let response = `📊 *RELATÓRIO OPERACIONAL — ${agencyToQuery.toUpperCase()}*\n\n`;
  response += `*Período:* Dados acumulados disponíveis\n`;
  response += `*Total de atendimentos / interações:* ${totalInteractions}\n`;
  response += `*Pedidos de crédito / leads:* ${leadCount + preAnalysisLogs}\n`;
  response += `*Processos com documentação incompleta:* ${incompleteDocs}\n\n`;

  if (topProducts.length > 0) {
    response += `*Produtos / Assuntos mais consultados:*\n`;
    response += topProducts.join('\n') + `\n\n`;
  } else {
    response += `*Produtos mais consultados:* Dados em consolidação\n\n`;
  }

  response += `*Principais pontos de atenção identificados:*\n`;
  if (incompleteDocs > 0) {
    response += `• ${incompleteDocs} caso(s) com documentação em falta (necessidade de recolha prévia junto dos clientes)\n`;
  }
  if (preAnalysisLogs > 0) {
    response += `• ${preAnalysisLogs} análise(s) preliminares realizadas pela equipa\n`;
  }
  if (incompleteDocs === 0 && preAnalysisLogs === 0) {
    response += `• Atividades operacionais a decorrer com normalidade\n`;
  }

  return response;
}

/**
 * Responde a perguntas específicas de gestores/admins sobre dúvidas frequentes ou processos incompletos.
 */
export function handleOperationalInquiry(user, userMessage) {
  const norm = userMessage.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  const targetAgency = extractTargetAgency(userMessage);
  if (targetAgency && !canAccessAgency(user, targetAgency)) {
    return `⛔ *ACESSO NÃO AUTORIZADO*\n\nNão possui permissão para consultar dados da agência *${targetAgency}*.`;
  }

  const agencyToQuery = targetAgency || (user.role === ROLES.ADMIN ? 'GLOBAL' : user.agency);
  const logs = store.getOperationalLogs(agencyToQuery === 'GLOBAL' ? {} : { agency: agencyToQuery });

  if (logs.length === 0) {
    return `Neste momento não existem dados suficientes registados para gerar este indicador na agência *${agencyToQuery}*.`;
  }

  // Dúvidas frequentes
  if (norm.includes('duvida') || norm.includes('perguntas') || norm.includes('produtos')) {
    const productCounts = {};
    logs.forEach(l => {
      if (l.category && l.category !== 'Geral') {
        productCounts[l.category] = (productCounts[l.category] || 0) + 1;
      }
    });

    const entries = Object.entries(productCounts).sort((a, b) => b[1] - a[1]);
    if (entries.length === 0) {
      return `Neste momento não existem dados suficientes registados para determinar as dúvidas mais frequentes.`;
    }

    let res = `📋 *DÚVIDAS E PRODUTOS MAIS FREQUENTES — ${agencyToQuery.toUpperCase()}*\n\n`;
    entries.forEach(([name, count], i) => {
      res += `${i + 1}. *${name}*: ${count} consulta(s)\n`;
    });
    return res;
  }

  // Processos incompletos
  if (norm.includes('incomplet') || norm.includes('falta') || norm.includes('pendente')) {
    const incomplete = logs.filter(l => l.status === 'INCOMPLETE_DOCS');
    let res = `📋 *CASOS DE DOCUMENTAÇÃO INCOMPLETA — ${agencyToQuery.toUpperCase()}*\n\n`;
    res += `Total de casos identificados: *${incomplete.length}*\n\n`;
    if (incomplete.length > 0) {
      res += `_Recomenda-se reforçar junto dos agentes a importância de obter BI válido e extratos bancários antes da submissão formal._`;
    } else {
      res += `Não existem registos de processos com pendências graves de documentação.`;
    }
    return res;
  }

  return generateAgencyOperationalReport(user, userMessage);
}
