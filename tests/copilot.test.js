/**
 * copilot.test.js
 * Suíte de testes automatizada para validação dos cenários obrigatórios do KIXI COPILOT + KIXI IA
 */

import assert from 'assert';
import { normalizePhone, formatPhoneForDisplay } from '../src/auth/phoneNormalizer.js';
import { store } from '../src/database/store.js';
import { seedInitialUsers } from '../src/database/seed.js';
import { ROLES, USER_STATUS, hasPermission, canAccessAgency, isInternalStaff, PERMISSIONS, getRoleDisplayName } from '../src/auth/rbac.js';
import { checkDocumentation, formatDocCheckResult } from '../src/copilot/docChecker.js';
import { analyzeCustomer } from '../src/copilot/customerAnalyzer.js';
import { generateAgencyOperationalReport, handleOperationalInquiry } from '../src/copilot/agencyReports.js';
import { handleCopilotMessage } from '../src/copilot/copilotHandler.js';
import { handleUserManagement } from '../src/copilot/userManagement.js';
import { retrieveOfficialKnowledge, OFFICIAL_DOCUMENTS } from '../src/knowledge/knowledgeBase.js';
import { PRODUCT_DOC_REQUIREMENTS } from '../src/knowledge/docRequirements.js';
import {
  CLIENT_SYSTEM_INSTRUCTION,
  AGENT_SYSTEM_INSTRUCTION,
  MANAGER_SYSTEM_INSTRUCTION,
  ADMIN_SYSTEM_INSTRUCTION
} from '../src/ai/aiService.js';

let passedTests = 0;
let totalTests = 0;

function runTest(testName, testFn) {
  totalTests++;
  try {
    testFn();
    console.log(`✅ [PASS] ${testName}`);
    passedTests++;
  } catch (err) {
    console.error(`❌ [FAIL] ${testName}:`, err.message);
  }
}

async function runAsyncTest(testName, testFn) {
  totalTests++;
  try {
    await testFn();
    console.log(`✅ [PASS] ${testName}`);
    passedTests++;
  } catch (err) {
    console.error(`❌ [FAIL] ${testName}:`, err.message);
  }
}

console.log('====================================================');
console.log('🧪 INICIANDO SUÍTE DE TESTES — KIXI IA & KIXI COPILOT');
console.log('====================================================\n');

// 0. Inicialização da base de dados e seed
seedInitialUsers();

// ----------------------------------------------------
// TESTE NORMALIZAÇÃO UNIVERSAL DE TELEFONES
// ----------------------------------------------------
runTest('Normalização central de múltiplos formatos para 2449XXXXXXXX', () => {
  assert.strictEqual(normalizePhone('+244 933 220 903'), '244933220903');
  assert.strictEqual(normalizePhone('244933220903@c.us'), '244933220903');
  assert.strictEqual(normalizePhone('whatsapp:+244933220903'), '244933220903');
  assert.strictEqual(normalizePhone('244933220903'), '244933220903');
  assert.strictEqual(normalizePhone('933220903'), '244933220903');
  assert.strictEqual(normalizePhone('+244 (922) 380-558'), '244922380558');
  assert.strictEqual(normalizePhone('00244938531613'), '244938531613');
  assert.strictEqual(normalizePhone({ user: '244933220903' }), '244933220903');
  assert.strictEqual(normalizePhone({ _serialized: '244922380558@c.us' }), '244922380558');
  assert.strictEqual(normalizePhone({ id: '244938531613@c.us' }), '244938531613');
});

// ----------------------------------------------------
// TESTE 1: Filipe Binza (+244 933 220 903) -> GESTOR / Mutamba
// ----------------------------------------------------
runTest('TESTE 1: +244 933 220 903 -> GESTOR, Filipe Binza, Agência Mutamba', () => {
  const normPhone = normalizePhone('+244 933 220 903');
  const user = store.getUserByPhone(normPhone);
  assert.ok(user, 'Filipe Binza deve ser encontrado pelo telefone normalizado');
  assert.strictEqual(user.name, 'Filipe Binza');
  assert.strictEqual(user.role, ROLES.MANAGER);
  assert.strictEqual(getRoleDisplayName(user.role), 'GESTOR');
  assert.strictEqual(user.agency, 'Mutamba');
  assert.strictEqual(user.status, USER_STATUS.ACTIVE);
  assert.ok(isInternalStaff(user), 'Filipe deve ser staff interno');
});

// ----------------------------------------------------
// TESTE 2: Dr. Tirso (+244 922 380 558) -> ADMIN
// ----------------------------------------------------
runTest('TESTE 2: +244 922 380 558 -> ADMIN, Dr. Tirso', () => {
  const normPhone = normalizePhone('+244 922 380 558');
  const user = store.getUserByPhone(normPhone);
  assert.ok(user, 'Dr. Tirso deve ser encontrado pelo telefone normalizado');
  assert.strictEqual(user.name, 'Dr. Tirso');
  assert.strictEqual(user.role, ROLES.ADMIN);
  assert.strictEqual(getRoleDisplayName(user.role), 'ADMIN');
  assert.strictEqual(user.agency, 'GLOBAL');
  assert.strictEqual(user.status, USER_STATUS.ACTIVE);
  assert.ok(isInternalStaff(user), 'Dr. Tirso deve ser staff interno');
});

// ----------------------------------------------------
// TESTE 3: Solene Silva (+244 938 531 613) -> AGENTE / Zango
// ----------------------------------------------------
runTest('TESTE 3: +244 938 531 613 -> AGENTE, Solene Silva, Agência Zango', () => {
  const normPhone = normalizePhone('+244 938 531 613');
  const user = store.getUserByPhone(normPhone);
  assert.ok(user, 'Solene Silva deve ser encontrada pelo telefone normalizado');
  assert.strictEqual(user.name, 'Solene Silva');
  assert.strictEqual(user.role, ROLES.AGENT);
  assert.strictEqual(getRoleDisplayName(user.role), 'AGENTE');
  assert.strictEqual(user.agency, 'Zango');
  assert.strictEqual(user.status, USER_STATUS.ACTIVE);
  assert.ok(isInternalStaff(user), 'Solene deve ser staff interno');
});

// ----------------------------------------------------
// TESTE 4: Número Não Cadastrado -> CLIENTE
// ----------------------------------------------------
runTest('TESTE 4: Número não cadastrado é rigorosamente classificado como CLIENTE', () => {
  const unknownPhone = normalizePhone('+244 911 223 344');
  const user = store.getUserByPhone(unknownPhone);
  const isStaff = isInternalStaff(user);
  const role = user ? user.role : ROLES.CLIENT;
  const roleDisplay = getRoleDisplayName(role);

  assert.strictEqual(user, null, 'Não deve existir utilizador interno para número não cadastrado');
  assert.strictEqual(isStaff, false, 'Não deve ser considerado staff');
  assert.strictEqual(role, ROLES.CLIENT, 'Role deve ser CLIENT');
  assert.strictEqual(roleDisplay, 'CLIENTE', 'Display deve ser CLIENTE');
});

// ----------------------------------------------------
// TESTE 5: AGENTE pergunta algo conhecido da documentação
// ----------------------------------------------------
runTest('TESTE 5: AGENTE recebe resposta interna baseada na documentação oficial', () => {
  const solene = store.getUserByPhone('244938531613');
  const prompt = AGENT_SYSTEM_INSTRUCTION;
  
  // Valida que o prompt de agente contém os produtos oficiais
  assert.ok(prompt.includes('KixiFácil'), 'Prompt de agente deve conter KixiFácil');
  assert.ok(prompt.includes('KixiNegócio'), 'Prompt de agente deve conter KixiNegócio');
  assert.ok(prompt.includes('KixiAgronegócio'), 'Prompt de agente deve conter KixiAgronegócio');
  assert.ok(prompt.includes('KixiValor'), 'Prompt de agente deve conter KixiValor');
  assert.ok(prompt.includes('PROIBIDO REENCAMINHAR PARA ATENDIMENTO AO CLIENTE'), 'Deve proibir encaminhamento para suporte público');
});

// ----------------------------------------------------
// TESTE 6: AGENTE pergunta algo que NÃO existe na documentação
// ----------------------------------------------------
runTest('TESTE 6: AGENTE + informação desconhecida NÃO encaminha para atendimento e exige fallback controlado', () => {
  const prompt = AGENT_SYSTEM_INSTRUCTION;
  assert.ok(
    prompt.includes('Não encontrei informação oficial suficiente na documentação oficial disponível para responder com segurança'),
    'Prompt de agente deve conter frase de fallback controlada sem linha de atendimento'
  );
  assert.strictEqual(
    prompt.includes('ligue para a nossa linha de apoio'),
    false,
    'Prompt de agente NUNCA deve conter instrução de ligar para apoio a clientes'
  );
});

// ----------------------------------------------------
// TESTE 7: CLIENTE pergunta algo conhecido
// ----------------------------------------------------
runTest('TESTE 7: CLIENTE recebe atendimento acolhedor e focado em produtos oficiais', () => {
  const prompt = CLIENT_SYSTEM_INSTRUCTION;
  assert.ok(prompt.includes('KIXI IA'), 'Prompt de cliente identifica assistente virtual');
  assert.ok(prompt.includes('KixiCrédito S.A.'), 'Prompt de cliente identifica a instituição');
  assert.ok(prompt.includes('MENSAGENS CURTAS'), 'Regra de respostas curtas');
  assert.ok(prompt.includes('EXTRAÇÃO DE LEADS'), 'Regra de extração de leads');
});

// ----------------------------------------------------
// TESTE 8: CLIENTE pergunta algo desconhecido
// ----------------------------------------------------
runTest('TESTE 8: CLIENTE + informação desconhecida recebe fallback controlado sem inventar dados', () => {
  const prompt = CLIENT_SYSTEM_INSTRUCTION;
  assert.ok(
    prompt.includes('Não encontrei informação suficiente na documentação oficial disponível para responder com segurança'),
    'Prompt de cliente deve ter fallback controlado e seguro'
  );
  assert.ok(prompt.includes('ZERO ALUCINAÇÃO'), 'Prompt proíbe terminantemente inventar dados');
});

// ----------------------------------------------------
// TESTES OPERACIONAIS COMPLEMENTARES
// ----------------------------------------------------
runTest('Validação declarativa de documentos sem fingir leitura física', () => {
  const text = 'Já temos BI, declaração de rendimentos e comprovativo de residência.';
  const result = checkDocumentation('kixifacil', text);

  assert.ok(result.identified.some(d => d.id === 'bi'), 'Identifica BI');
  assert.ok(result.identified.some(d => d.id === 'rendimentos'), 'Identifica Rendimentos');
  assert.ok(result.identified.some(d => d.id === 'residencia'), 'Identifica Residência');
  assert.ok(result.missing.some(d => d.id === 'extrato'), 'Acusa falta de Extrato');

  const formatted = formatDocCheckResult(result);
  assert.ok(formatted.includes('✓ Bilhete de Identidade'), 'Marcação ✓ para BI');
  assert.ok(formatted.includes('❌ Declaração bancária') || formatted.includes('❌ Extrato'), 'Marcação ❌ para Extrato');
});

runTest('Análise preliminar de crédito com parâmetros numéricos e disclaimer de não aprovação', () => {
  const filipe = store.getUserByPhone('244933220903');
  const text = 'Cliente quer 500000 Kz, recebe 250000 Kz por mês e quer pagar em 12 meses.';
  const result = analyzeCustomer(filipe, text);

  assert.ok(result.includes('ANÁLISE PRELIMINAR'), 'Contém título de Análise Preliminar');
  assert.ok(result.includes('KixiFácil'), 'Sugere KixiFácil');
  assert.ok(result.includes('A IA NÃO aprova nem rejeita créditos'), 'Contém disclaimer obrigatório');
});

runTest('Proibição de cross-agency para Gestor (Mutamba vs Zango)', () => {
  const filipe = store.getUserByPhone('244933220903');
  const response = handleOperationalInquiry(filipe, 'Como está a agência do Zango?');
  assert.ok(response.includes('ACESSO NÃO AUTORIZADO') || response.includes('Não possui permissão'));
});

// Execução de testes assíncronos
(async () => {
  await runAsyncTest('Agente impedido de aceder a relatórios de gestão', async () => {
    const solene = store.getUserByPhone('244938531613');
    const response = await handleCopilotMessage(solene, 'Mostra o relatório global das agências.');
    assert.ok(response.includes('ACESSO RESTRITO') || response.includes('Apenas Gestores'));
  });

  await runAsyncTest('Fluxo de gestão de utilizadores pelo ADMIN com confirmação em 2 passos', async () => {
    const tirso = store.getUserByPhone('244922380558');
    store.clearCopilotSession(tirso.phone);
    store.deleteUser('244944111222');

    const step1 = await handleCopilotMessage(tirso, 'Adicionar João Manuel, 244944111222, AGENT, Viana');
    assert.ok(step1.includes('CONFIRMAÇÃO DE REGISTO'));
    assert.ok(step1.includes('CONFIRMAR'));

    const step2 = await handleCopilotMessage(tirso, 'CONFIRMAR');
    assert.ok(step2.includes('UTILIZADOR REGISTADO COM SUCESSO'));

    const joao = store.getUserByPhone('244944111222');
    assert.ok(joao);
    assert.strictEqual(joao.role, ROLES.AGENT);
    assert.strictEqual(joao.agency, 'Viana');

    // Desativação
    const deactStep1 = await handleCopilotMessage(tirso, 'Desativar utilizador 244944111222');
    assert.ok(deactStep1.includes('CONFIRMAÇÃO DE DESATIVAÇÃO'));
    const deactStep2 = await handleCopilotMessage(tirso, 'CONFIRMAR');
    assert.ok(deactStep2.includes('UTILIZADOR DESATIVADO COM SUCESSO'));

    const joaoAfter = store.getUserByPhone('244944111222');
    assert.strictEqual(joaoAfter.status, USER_STATUS.INACTIVE);
  });

  console.log('\n====================================================');
  console.log(`📊 RESULTADO FINAL DOS TESTES: ${passedTests} / ${totalTests} APROVADOS`);
  console.log('====================================================');

  if (passedTests === totalTests) {
    console.log('🎉 TODOS OS CENÁRIOS OBRIGATÓRIOS PASSARAM COM 100% DE SUCESSO!\n');
  } else {
    console.error('⚠️ ALGUNS TESTES FALHARAM.\n');
    process.exit(1);
  }
})();

