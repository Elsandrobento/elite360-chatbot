/**
 * rbac.js
 * Sistema de Controlo de Acesso Baseado em Papéis (Role-Based Access Control)
 * Assegura que TODAS as permissões são validadas estritamente no backend.
 */

export const ROLES = {
  CLIENT: 'CLIENT',
  AGENT: 'AGENT',
  MANAGER: 'MANAGER',
  ADMIN: 'ADMIN'
};

export const USER_STATUS = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE'
};

export const PERMISSIONS = {
  // Permissões de Agente (Consultas operacionais, documentação e análise de clientes)
  KNOWLEDGE_QUERY: 'knowledge.query',
  PRODUCT_QUERY: 'product.query',
  PROCEDURE_QUERY: 'procedure.query',
  DOCUMENTATION_CHECK: 'documentation.check',
  CUSTOMER_PREANALYSIS: 'customer.preanalysis',
  PROCESS_GUIDANCE: 'process.guidance',

  // Permissões de Gestor de Agência (Analytics e relatórios da própria agência)
  AGENCY_ANALYTICS: 'agency.analytics',
  AGENCY_ACTIVITY: 'agency.activity',
  AGENCY_COMMON_QUESTIONS: 'agency.common_questions',
  AGENCY_INCOMPLETE_CASES: 'agency.incomplete_cases',
  AGENCY_SUPERVISION_CASES: 'agency.supervision_cases',
  AGENCY_OPERATIONAL_REPORT: 'agency.operational_report',

  // Permissões Administrativas Globais (Visão global e gestão de utilizadores)
  GLOBAL_ANALYTICS: 'global.analytics',
  GLOBAL_AGENCIES: 'global.agencies',
  GLOBAL_REPORTS: 'global.reports',
  SYSTEM_ANALYTICS: 'system.analytics',
  USER_MANAGEMENT: 'user.management'
};

// Permissões padrão atribuídas a cada Role
export const ROLE_PERMISSIONS = {
  [ROLES.CLIENT]: [],

  [ROLES.AGENT]: [
    PERMISSIONS.KNOWLEDGE_QUERY,
    PERMISSIONS.PRODUCT_QUERY,
    PERMISSIONS.PROCEDURE_QUERY,
    PERMISSIONS.DOCUMENTATION_CHECK,
    PERMISSIONS.CUSTOMER_PREANALYSIS,
    PERMISSIONS.PROCESS_GUIDANCE
  ],

  [ROLES.MANAGER]: [
    PERMISSIONS.KNOWLEDGE_QUERY,
    PERMISSIONS.PRODUCT_QUERY,
    PERMISSIONS.PROCEDURE_QUERY,
    PERMISSIONS.DOCUMENTATION_CHECK,
    PERMISSIONS.CUSTOMER_PREANALYSIS,
    PERMISSIONS.PROCESS_GUIDANCE,
    PERMISSIONS.AGENCY_ANALYTICS,
    PERMISSIONS.AGENCY_ACTIVITY,
    PERMISSIONS.AGENCY_COMMON_QUESTIONS,
    PERMISSIONS.AGENCY_INCOMPLETE_CASES,
    PERMISSIONS.AGENCY_SUPERVISION_CASES,
    PERMISSIONS.AGENCY_OPERATIONAL_REPORT
  ],

  [ROLES.ADMIN]: [
    PERMISSIONS.KNOWLEDGE_QUERY,
    PERMISSIONS.PRODUCT_QUERY,
    PERMISSIONS.PROCEDURE_QUERY,
    PERMISSIONS.DOCUMENTATION_CHECK,
    PERMISSIONS.CUSTOMER_PREANALYSIS,
    PERMISSIONS.PROCESS_GUIDANCE,
    PERMISSIONS.AGENCY_ANALYTICS,
    PERMISSIONS.AGENCY_ACTIVITY,
    PERMISSIONS.AGENCY_COMMON_QUESTIONS,
    PERMISSIONS.AGENCY_INCOMPLETE_CASES,
    PERMISSIONS.AGENCY_SUPERVISION_CASES,
    PERMISSIONS.AGENCY_OPERATIONAL_REPORT,
    PERMISSIONS.GLOBAL_ANALYTICS,
    PERMISSIONS.GLOBAL_AGENCIES,
    PERMISSIONS.GLOBAL_REPORTS,
    PERMISSIONS.SYSTEM_ANALYTICS,
    PERMISSIONS.USER_MANAGEMENT
  ]
};

/**
 * Verifica se um utilizador tem uma permissão específica.
 * @param {Object} user 
 * @param {string} permission 
 * @returns {boolean}
 */
export function hasPermission(user, permission) {
  if (!user || user.status !== USER_STATUS.ACTIVE) {
    return false;
  }

  // Se o utilizador tiver permissões explícitas no registo da BD, usa essas
  if (Array.isArray(user.permissions) && user.permissions.includes(permission)) {
    return true;
  }

  // Caso contrário, verifica as permissões padrão da sua Role
  const rolePermissions = ROLE_PERMISSIONS[user.role] || [];
  return rolePermissions.includes(permission);
}

/**
 * Verifica se um utilizador pode consultar dados de uma agência específica.
 * 
 * Regra Crítica:
 * - ADMIN com âmbito GLOBAL: pode consultar qualquer agência.
 * - MANAGER: só pode consultar a sua própria agência (ex: Mutamba só vê Mutamba).
 * - AGENT: não tem permissão para relatórios de agência.
 * - CLIENT: não tem permissão.
 * 
 * @param {Object} user 
 * @param {string} targetAgency 
 * @returns {boolean}
 */
export function canAccessAgency(user, targetAgency) {
  if (!user || user.status !== USER_STATUS.ACTIVE) {
    return false;
  }

  // Administrador tem acesso global a todas as agências
  if (user.role === ROLES.ADMIN) {
    return true;
  }

  // Gestor só tem acesso à sua própria agência
  if (user.role === ROLES.MANAGER) {
    if (!targetAgency || !user.agency) return false;
    return user.agency.trim().toLowerCase() === targetAgency.trim().toLowerCase();
  }

  // Agentes e Clientes não têm permissão para dados de agência
  return false;
}

/**
 * Verifica se o utilizador é funcionário autorizado (AGENT, MANAGER ou ADMIN ativo).
 * @param {Object} user 
 * @returns {boolean}
 */
export function isInternalStaff(user) {
  if (!user || user.status !== USER_STATUS.ACTIVE) return false;
  return [ROLES.AGENT, ROLES.MANAGER, ROLES.ADMIN].includes(user.role);
}

/**
 * Retorna o nome amigável do papel em Português (CLIENTE, AGENTE, GESTOR, ADMIN).
 * @param {string} role 
 * @returns {string}
 */
export function getRoleDisplayName(role) {
  switch (role) {
    case ROLES.ADMIN:
      return 'ADMIN';
    case ROLES.MANAGER:
      return 'GESTOR';
    case ROLES.AGENT:
      return 'AGENTE';
    case ROLES.CLIENT:
    default:
      return 'CLIENTE';
  }
}

