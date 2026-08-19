/**
 * store.js
 * Repositório central de dados persistente com escrita atómica e segura
 * Armazena utilizadores, logs operacionais, sessões do copilot e leads.
 */

import fs from 'fs';
import path from 'path';
import { normalizePhone } from '../auth/phoneNormalizer.js';
import { ROLES, USER_STATUS, ROLE_PERMISSIONS } from '../auth/rbac.js';

const DATA_DIR = path.join(process.cwd(), 'data');
const STORE_FILE = path.join(DATA_DIR, 'kixi_store.json');

// Estrutura padrão inicial da base de dados
const DEFAULT_DATA = {
  users: [],
  operational_logs: [],
  leads: [],
  version: '1.0.0'
};

class Store {
  constructor() {
    this.memoryState = null;
    this.copilotSessions = new Map();
    this.init();
  }

  init() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      if (fs.existsSync(STORE_FILE)) {
        const raw = fs.readFileSync(STORE_FILE, 'utf-8');
        if (raw.trim()) {
          this.memoryState = JSON.parse(raw);
        } else {
          this.memoryState = { ...DEFAULT_DATA };
          this.save();
        }
      } else {
        this.memoryState = { ...DEFAULT_DATA };
        this.save();
      }
    } catch (err) {
      console.error('❌ [STORE] Erro ao inicializar base de dados:', err);
      this.memoryState = { ...DEFAULT_DATA };
    }
  }

  /**
   * Gravação atómica em disco (escreve em ficheiro temporário e substitui).
   */
  save() {
    try {
      const tempFile = `${STORE_FILE}.tmp.${Date.now()}`;
      fs.writeFileSync(tempFile, JSON.stringify(this.memoryState, null, 2), 'utf-8');
      fs.renameSync(tempFile, STORE_FILE);
    } catch (err) {
      console.error('❌ [STORE] Erro ao gravar dados em disco:', err);
    }
  }

  // ==========================================
  //  UTILIZADORES (USERS)
  // ==========================================

  /**
   * Obtém um utilizador pelo número de telefone normalizado.
   * @param {string} rawPhone 
   * @returns {Object|null}
   */
  getUserByPhone(rawPhone) {
    const normalized = normalizePhone(rawPhone);
    if (!normalized) return null;
    return this.memoryState.users.find(u => u.phone === normalized) || null;
  }

  /**
   * Lista utilizadores com filtros opcionais.
   * @param {Object} filter { role, agency, status }
   * @returns {Array}
   */
  listUsers(filter = {}) {
    return this.memoryState.users.filter(u => {
      if (filter.role && u.role !== filter.role) return false;
      if (filter.agency && u.agency?.toLowerCase() !== filter.agency.toLowerCase()) return false;
      if (filter.status && u.status !== filter.status) return false;
      return true;
    });
  }

  /**
   * Adiciona um novo utilizador.
   * @param {Object} userData { name, phone, role, agency, permissions, status }
   * @returns {Object}
   */
  addUser(userData) {
    const phone = normalizePhone(userData.phone);
    if (!phone) {
      throw new Error('Número de telefone inválido para registo de utilizador.');
    }

    const existing = this.getUserByPhone(phone);
    if (existing) {
      throw new Error(`Utilizador com o número ${phone} já se encontra registado.`);
    }

    const role = userData.role || ROLES.AGENT;
    const permissions = userData.permissions || ROLE_PERMISSIONS[role] || [];
    const now = new Date().toISOString();

    const newUser = {
      id: `usr_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      phone,
      name: (userData.name || '').trim(),
      role,
      agency: (userData.agency || (role === ROLES.ADMIN ? 'GLOBAL' : 'Geral')).trim(),
      status: userData.status || USER_STATUS.ACTIVE,
      permissions,
      created_at: now,
      updated_at: now
    };

    this.memoryState.users.push(newUser);
    this.save();
    return newUser;
  }

  /**
   * Atualiza dados de um utilizador existente.
   * @param {string} rawPhone 
   * @param {Object} updates 
   * @returns {Object|null}
   */
  updateUser(rawPhone, updates = {}) {
    const phone = normalizePhone(rawPhone);
    const userIndex = this.memoryState.users.findIndex(u => u.phone === phone);
    if (userIndex === -1) return null;

    const user = this.memoryState.users[userIndex];
    if (updates.name !== undefined) user.name = updates.name.trim();
    if (updates.role !== undefined) {
      user.role = updates.role;
      if (!updates.permissions) {
        user.permissions = ROLE_PERMISSIONS[updates.role] || [];
      }
    }
    if (updates.agency !== undefined) user.agency = updates.agency.trim();
    if (updates.status !== undefined) user.status = updates.status;
    if (updates.permissions !== undefined) user.permissions = updates.permissions;

    user.updated_at = new Date().toISOString();
    this.memoryState.users[userIndex] = user;
    this.save();
    return user;
  }

  /**
   * Desativa um utilizador.
   * @param {string} rawPhone 
   * @returns {Object|null}
   */
  deactivateUser(rawPhone) {
    return this.updateUser(rawPhone, { status: USER_STATUS.INACTIVE });
  }

  /**
   * Elimina um utilizador da base de dados (usado para testes ou limpeza).
   * @param {string} rawPhone 
   * @returns {boolean}
   */
  deleteUser(rawPhone) {
    const phone = normalizePhone(rawPhone);
    if (!phone) return false;
    const initialLen = this.memoryState.users.length;
    this.memoryState.users = this.memoryState.users.filter(u => u.phone !== phone);
    if (this.memoryState.users.length !== initialLen) {
      this.save();
      return true;
    }
    return false;
  }

  // ==========================================
  //  LOGS OPERACIONAIS (OPERATIONAL LOGS)
  // ==========================================

  /**
   * Regista um evento operacional.
   * @param {Object} eventData { phone, role, agency, action, category, details, status }
   */
  logOperationalEvent(eventData) {
    const logEntry = {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      timestamp: new Date().toISOString(),
      phone: normalizePhone(eventData.phone),
      role: eventData.role || ROLES.CLIENT,
      agency: eventData.agency || 'Geral',
      action: eventData.action || 'QUERY',
      category: eventData.category || 'Geral',
      details: eventData.details || null,
      status: eventData.status || 'SUCCESS'
    };

    this.memoryState.operational_logs.push(logEntry);

    // Mantém no máximo os últimos 10.000 logs em disco para evitar crescimento excessivo
    if (this.memoryState.operational_logs.length > 10000) {
      this.memoryState.operational_logs = this.memoryState.operational_logs.slice(-10000);
    }

    this.save();
    return logEntry;
  }

  /**
   * Consulta logs operacionais com filtros de agência, período e tipo.
   * @param {Object} filter { agency, startDate, endDate, action, role }
   * @returns {Array}
   */
  getOperationalLogs(filter = {}) {
    return this.memoryState.operational_logs.filter(log => {
      if (filter.agency && filter.agency !== 'GLOBAL' && log.agency?.toLowerCase() !== filter.agency.toLowerCase()) {
        return false;
      }
      if (filter.role && log.role !== filter.role) return false;
      if (filter.action && log.action !== filter.action) return false;
      if (filter.startDate && new Date(log.timestamp) < new Date(filter.startDate)) return false;
      if (filter.endDate && new Date(log.timestamp) > new Date(filter.endDate)) return false;
      return true;
    });
  }

  // ==========================================
  //  LEADS
  // ==========================================

  /**
   * Guarda ou atualiza um lead capturado.
   * @param {Object} leadData 
   * @returns {Object}
   */
  saveLead(leadData) {
    const phone = normalizePhone(leadData.telefone);
    const existingIndex = this.memoryState.leads.findIndex(l =>
      l.telefone === phone &&
      l.nome?.toLowerCase() === leadData.nome?.toLowerCase()
    );

    const now = new Date().toISOString();
    const entry = {
      ...leadData,
      telefone: phone,
      updated_at: now
    };

    if (existingIndex >= 0) {
      this.memoryState.leads[existingIndex] = {
        ...this.memoryState.leads[existingIndex],
        ...entry
      };
    } else {
      entry.dataRegisto = now;
      this.memoryState.leads.push(entry);
    }

    this.save();
    return entry;
  }

  getLeads() {
    return [...this.memoryState.leads];
  }

  // ==========================================
  //  SESSÕES DO COPILOT (EM MEMÓRIA COM TIMEOUT)
  // ==========================================

  /**
   * Obtém a sessão ativa de conversação do Copilot (ex: passos de entrevista guiada ou ação pendente do admin).
   * @param {string} rawPhone 
   * @returns {Object}
   */
  getCopilotSession(rawPhone) {
    const phone = normalizePhone(rawPhone);
    let session = this.copilotSessions.get(phone);
    const now = Date.now();

    if (!session || (now - session.lastActive > 30 * 60 * 1000)) {
      session = {
        phone,
        history: [],
        step: 'IDLE', // IDLE | GUIDED_DOCS_PRODUCT | GUIDED_DOCS_CHECK | ADMIN_PENDING_ACTION
        context: {},
        lastActive: now
      };
      this.copilotSessions.set(phone, session);
    }

    session.lastActive = now;
    return session;
  }

  setCopilotSession(rawPhone, updates = {}) {
    const session = this.getCopilotSession(rawPhone);
    Object.assign(session, updates, { lastActive: Date.now() });
    this.copilotSessions.set(session.phone, session);
    return session;
  }

  clearCopilotSession(rawPhone) {
    const phone = normalizePhone(rawPhone);
    this.copilotSessions.delete(phone);
  }
}

// Instância singleton partilhada
export const store = new Store();
