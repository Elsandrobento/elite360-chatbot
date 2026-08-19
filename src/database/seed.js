/**
 * seed.js
 * Inicializa os utilizadores autorizados pré-definidos no sistema se ainda não existirem.
 */

import { store } from './store.js';
import { ROLES, USER_STATUS, ROLE_PERMISSIONS } from '../auth/rbac.js';

export const INITIAL_USERS = [
  {
    name: 'Filipe Binza',
    phone: '244933220903',
    role: ROLES.MANAGER,
    agency: 'Mutamba',
    status: USER_STATUS.ACTIVE,
    permissions: [
      'knowledge.query',
      'product.query',
      'procedure.query',
      'documentation.check',
      'customer.preanalysis',
      'process.guidance',
      'agency.analytics',
      'agency.activity',
      'agency.common_questions',
      'agency.incomplete_cases',
      'agency.supervision_cases',
      'agency.operational_report'
    ]
  },
  {
    name: 'Dr. Tirso',
    phone: '244922380558',
    role: ROLES.ADMIN,
    agency: 'GLOBAL',
    status: USER_STATUS.ACTIVE,
    permissions: [
      'knowledge.query',
      'product.query',
      'procedure.query',
      'documentation.check',
      'customer.preanalysis',
      'process.guidance',
      'agency.analytics',
      'agency.activity',
      'agency.common_questions',
      'agency.incomplete_cases',
      'agency.supervision_cases',
      'agency.operational_report',
      'global.analytics',
      'global.agencies',
      'global.reports',
      'system.analytics',
      'user.management'
    ]
  },
  {
    name: 'Solene Silva',
    phone: '244938531613',
    role: ROLES.AGENT,
    agency: 'Zango',
    status: USER_STATUS.ACTIVE,
    permissions: [
      'knowledge.query',
      'product.query',
      'procedure.query',
      'documentation.check',
      'customer.preanalysis',
      'process.guidance'
    ]
  }
];

export function seedInitialUsers() {
  console.log('[SEED] A verificar utilizadores autorizados iniciais...');
  let addedCount = 0;

  for (const initUser of INITIAL_USERS) {
    const existing = store.getUserByPhone(initUser.phone);
    if (!existing) {
      store.addUser(initUser);
      console.log(`✅ [SEED] Utilizador criado: ${initUser.name} (${initUser.role} - ${initUser.agency}) | ${initUser.phone}`);
      addedCount++;
    } else {
      // Garante que os utilizadores padrão têm as roles e agências corretas
      store.updateUser(initUser.phone, {
        name: initUser.name,
        role: initUser.role,
        agency: initUser.agency,
        status: initUser.status,
        permissions: initUser.permissions
      });
    }
  }

  if (addedCount > 0) {
    console.log(`[SEED] ${addedCount} novos utilizadores pré-configurados foram adicionados com sucesso.`);
  } else {
    console.log(`[SEED] Todos os utilizadores autorizados iniciais já se encontram atualizados.`);
  }
}
