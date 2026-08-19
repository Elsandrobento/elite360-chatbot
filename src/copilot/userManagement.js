/**
 * userManagement.js
 * Gestão de Utilizadores autorizados exclusiva para Administradores (ADMIN)
 * Fluxo com confirmação obrigatória em 2 etapas ("CONFIRMAR").
 */

import { store } from '../database/store.js';
import { normalizePhone, formatPhoneForDisplay } from '../auth/phoneNormalizer.js';
import { ROLES, USER_STATUS, hasPermission, PERMISSIONS } from '../auth/rbac.js';

/**
 * Processa comandos e pedidos de gestão de utilizadores enviados pelo Administrador.
 * 
 * @param {Object} adminUser 
 * @param {Object} session 
 * @param {string} userMessage 
 * @returns {string}
 */
export function handleUserManagement(adminUser, session, userMessage) {
  // Verificação estrita de RBAC
  if (!hasPermission(adminUser, PERMISSIONS.USER_MANAGEMENT)) {
    return '⛔ *ACESSO NEGADO*\nApenas Administradores possuem autorização para gerir utilizadores do sistema.';
  }

  const msgTrim = userMessage.trim();
  const msgNorm = msgTrim.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // ----------------------------------------------------
  // ETAPA 2: Processamento de Confirmação Pendente
  // ----------------------------------------------------
  if (session.step === 'ADMIN_PENDING_ACTION') {
    if (msgNorm === 'confirmar') {
      const pending = session.context.pendingAction;
      session.step = 'IDLE';
      session.context = {};
      store.setCopilotSession(adminUser.phone, session);

      if (!pending) {
        return 'Nenhuma ação pendente para confirmação.';
      }

      try {
        if (pending.type === 'ADD_USER') {
          const created = store.addUser(pending.data);
          return (
            `✅ *UTILIZADOR REGISTADO COM SUCESSO!*\n\n` +
            `👤 *Nome:* ${created.name}\n` +
            `📱 *Telefone:* ${formatPhoneForDisplay(created.phone)}\n` +
            `💼 *Função:* ${created.role}\n` +
            `🏢 *Agência:* ${created.agency}\n` +
            `🟢 *Estado:* ${created.status}\n\n` +
            `O utilizador já pode interagir com o KIXI COPILOT.`
          );
        }

        if (pending.type === 'DEACTIVATE_USER') {
          const updated = store.deactivateUser(pending.phone);
          if (!updated) {
            return `❌ Utilizador com o telefone ${pending.phone} não foi encontrado.`;
          }
          return `✅ *UTILIZADOR DESATIVADO COM SUCESSO!*\n\nO número ${formatPhoneForDisplay(pending.phone)} foi desativado e passará a receber o atendimento de cliente.`;
        }

        if (pending.type === 'CHANGE_AGENCY') {
          const updated = store.updateUser(pending.phone, { agency: pending.newAgency });
          if (!updated) {
            return `❌ Utilizador não encontrado.`;
          }
          return `✅ *AGÊNCIA ALTERADA COM SUCESSO!*\n\nO utilizador ${updated.name} está agora associado à agência *${updated.agency}*.`;
        }
      } catch (err) {
        return `❌ *Erro ao executar operação:* ${err.message}`;
      }
    } else {
      // Cancelamento
      session.step = 'IDLE';
      session.context = {};
      store.setCopilotSession(adminUser.phone, session);
      return '❌ Operação cancelada pelo Administrador.';
    }
  }

  // ----------------------------------------------------
  // ETAPA 1: Consultas e Iniciação de Ações
  // ----------------------------------------------------

  // 1. Listar utilizadores
  if (
    msgNorm.includes('consultar utilizadores') ||
    msgNorm.includes('listar utilizadores') ||
    msgNorm.includes('ver agentes') ||
    msgNorm.includes('quais sao os gestores') ||
    msgNorm.includes('quantos agentes')
  ) {
    const users = store.listUsers();
    if (users.length === 0) {
      return 'Não existem utilizadores registados na base de dados.';
    }

    let listMsg = `👥 *UTILIZADORES REGISTADOS NO SISTEMA (${users.length})*\n\n`;
    users.forEach((u, i) => {
      const statusIcon = u.status === USER_STATUS.ACTIVE ? '🟢' : '🔴';
      listMsg += `${i + 1}. ${statusIcon} *${u.name || 'Sem nome'}*\n`;
      listMsg += `   📱 ${formatPhoneForDisplay(u.phone)} | *${u.role}*\n`;
      listMsg += `   🏢 Agência: ${u.agency}\n\n`;
    });

    listMsg += `_Para adicionar novo utilizador: "Adicionar [Nome], [Telefone], [Função], [Agência]"_`;
    return listMsg;
  }

  // 2. Adicionar novo utilizador
  // Ex: "Adicionar João Manuel, 244933000111, agente da agência Viana."
  if (msgNorm.startsWith('adicionar') || msgNorm.startsWith('registar')) {
    const parts = msgTrim.replace(/^adicionar\s+/i, '').replace(/^registar\s+/i, '').split(/[,;]/);
    
    let name = parts[0]?.trim();
    let phoneRaw = parts[1]?.trim() || '';
    let roleRaw = parts[2]?.trim() || 'AGENT';
    let agencyRaw = parts[3]?.trim() || 'Geral';

    // Se o telefone estiver misturado no texto
    const phoneMatch = userMessage.match(/(\+?244\s*9\d{8}|9\d{8})/);
    if (phoneMatch) {
      phoneRaw = phoneMatch[0];
    }

    const normPhone = normalizePhone(phoneRaw);
    if (!normPhone) {
      return (
        `⚠️ *DADOS INCOMPLETOS PARA REGISTO*\n\n` +
        `Formato esperado:\n` +
        `*Adicionar [Nome], [Telefone], [Função], [Agência]*\n\n` +
        `Exemplo:\n` +
        `_Adicionar João Manuel, 244933000111, AGENT, Viana_`
      );
    }

    let role = ROLES.AGENT;
    const lowerRole = roleRaw.toLowerCase();
    if (lowerRole.includes('admin')) role = ROLES.ADMIN;
    else if (lowerRole.includes('gestor') || lowerRole.includes('manager')) role = ROLES.MANAGER;

    let agency = agencyRaw.replace(/^(agencia|agência|da agência|de)\s+/i, '').trim();
    if (role === ROLES.ADMIN) agency = 'GLOBAL';

    // Prepara confirmação em 2 passos
    session.step = 'ADMIN_PENDING_ACTION';
    session.context = {
      pendingAction: {
        type: 'ADD_USER',
        data: { name, phone: normPhone, role, agency, status: USER_STATUS.ACTIVE }
      }
    };
    store.setCopilotSession(adminUser.phone, session);

    return (
      `⚠️ *CONFIRMAÇÃO DE REGISTO DE UTILIZADOR*\n\n` +
      `Confirma o registo do seguinte utilizador?\n\n` +
      `👤 *Nome:* ${name}\n` +
      `📱 *Telefone:* ${formatPhoneForDisplay(normPhone)}\n` +
      `💼 *Função:* ${role}\n` +
      `🏢 *Agência:* ${agency}\n\n` +
      `➡️ *Responda CONFIRMAR para concluir ou qualquer outro texto para cancelar.*`
    );
  }

  // 3. Desativar utilizador
  if (msgNorm.includes('desactivar') || msgNorm.includes('desativar') || msgNorm.includes('remover utilizador')) {
    const phoneMatch = userMessage.match(/(\+?244\s*9\d{8}|9\d{8})/);
    if (!phoneMatch) {
      return `⚠️ Por favor, indique o número de telefone a desativar (ex: "Desativar utilizador 244938531613").`;
    }

    const normPhone = normalizePhone(phoneMatch[0]);
    const targetUser = store.getUserByPhone(normPhone);
    if (!targetUser) {
      return `❌ Utilizador com o número ${normPhone} não encontrado.`;
    }

    session.step = 'ADMIN_PENDING_ACTION';
    session.context = {
      pendingAction: {
        type: 'DEACTIVATE_USER',
        phone: normPhone
      }
    };
    store.setCopilotSession(adminUser.phone, session);

    return (
      `⚠️ *CONFIRMAÇÃO DE DESATIVAÇÃO*\n\n` +
      `Confirma a desativação do utilizador *${targetUser.name}* (${formatPhoneForDisplay(normPhone)} — ${targetUser.role})?\n\n` +
      `➡️ *Responda CONFIRMAR para concluir.*`
    );
  }

  return null;
}
