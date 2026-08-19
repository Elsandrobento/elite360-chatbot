/**
 * docRequirements.js
 * Requisitos e documentação oficial exigida por produto da KixiCrédito
 * Fonte da Verdade: Fichas Técnicas Informativas (FTI) e Documentos Oficiais.
 */

export const PRODUCT_DOC_REQUIREMENTS = {
  'kixifacil': {
    name: 'KixiFácil',
    category: 'Nano e Micro Empresarial',
    minAmount: 5000,
    maxAmount: 500000,
    maxTermMonths: 12,
    rate: '55,2% TAN (4,6% a.m.)',
    guarantees: 'Solidária, avalista e penhor',
    requiredDocs: [
      { id: 'bi', name: 'Bilhete de Identidade válido', aliases: ['bi', 'identidade', 'documento de identificação', 'bilhete de identidade', 'cc', 'passaporte'] },
      { id: 'rendimentos', name: 'Declaração de Rendimentos / Faturação da atividade', aliases: ['rendimentos', 'declaracao de rendimentos', 'faturacao', 'comprovativo de rendimentos', 'recibos'] },
      { id: 'residencia', name: 'Comprovativo de Residência / Local da atividade', aliases: ['residencia', 'comprovativo de residencia', 'morada', 'localizacao', 'atestado de residencia'] },
      { id: 'garantias', name: 'Comprovativo de Garantias (Solidária, avalista ou penhor)', aliases: ['garantia', 'garantias', 'avalista', 'penhor', 'garantia solidaria'] },
      { id: 'extrato', name: 'Declaração bancária / Extrato de conta', aliases: ['extrato', 'extracto', 'declaracao bancaria', 'extrato bancario', 'extracto bancario', 'iban'] },
      { id: 'formulario', name: 'Formulário / Ficha de pedido de crédito', aliases: ['formulario', 'ficha', 'pedido', 'ficha de pedido', 'proposta'] }
    ]
  },
  'kixinegocio': {
    name: 'KixiNegócio',
    category: 'Empreendedorismo e Pequenos Negócios',
    minAmount: 500001,
    maxAmount: 2500000,
    maxTermMonths: 18,
    rate: '55,2% TAN (4,6% a.m.)',
    guarantees: 'Avalista, hipoteca, penhor e caução',
    requiredDocs: [
      { id: 'bi', name: 'Bilhete de Identidade válido', aliases: ['bi', 'identidade', 'documento de identificação', 'bilhete de identidade'] },
      { id: 'rendimentos', name: 'Declaração de Rendimentos / Movimento do negócio', aliases: ['rendimentos', 'declaracao de rendimentos', 'faturacao', 'comprovativo de rendimentos', 'lucros'] },
      { id: 'residencia', name: 'Comprovativo de Residência e Estabelecimento', aliases: ['residencia', 'comprovativo de residencia', 'morada', 'estabelecimento', 'localizacao'] },
      { id: 'garantias', name: 'Comprovativo de Garantias (Avalista, hipoteca, penhor ou caução)', aliases: ['garantia', 'garantias', 'avalista', 'hipoteca', 'penhor', 'caucao'] },
      { id: 'extrato', name: 'Declaração / Extrato bancário', aliases: ['extrato', 'extracto', 'declaracao bancaria', 'extrato bancario', 'extracto bancario', 'iban'] },
      { id: 'formulario', name: 'Formulário de pedido de crédito preenchido', aliases: ['formulario', 'ficha', 'pedido', 'ficha de pedido'] }
    ]
  },
  'kixiagronegocio': {
    name: 'KixiAgronegócio',
    category: 'Agricultura e Pecuária',
    minAmount: 50000,
    maxAmount: 2500000,
    maxTermMonths: 18,
    rate: '55,2% TAN (4,6% a.m.)',
    guarantees: 'Avalista, hipoteca, penhor e caução',
    requiredDocs: [
      { id: 'bi', name: 'Bilhete de Identidade válido', aliases: ['bi', 'identidade', 'documento de identificação', 'bilhete de identidade'] },
      { id: 'rendimentos', name: 'Comprovativo de Atividade Agrícola/Pecuária ou rendimentos', aliases: ['rendimentos', 'atividade agricola', 'declaracao', 'producao', 'exploracao'] },
      { id: 'residencia', name: 'Comprovativo de Residência e Localização da exploração', aliases: ['residencia', 'comprovativo de residencia', 'morada', 'localizacao da terra', 'terreno'] },
      { id: 'garantias', name: 'Comprovativo de Garantias (Avalista, hipoteca, penhor ou caução)', aliases: ['garantia', 'garantias', 'avalista', 'hipoteca', 'penhor', 'caucao'] },
      { id: 'extrato', name: 'Extrato ou declaração bancária', aliases: ['extrato', 'extracto', 'declaracao bancaria', 'extrato bancario', 'iban'] },
      { id: 'formulario', name: 'Formulário de pedido de crédito', aliases: ['formulario', 'ficha', 'pedido'] }
    ]
  },
  'kixivalor': {
    name: 'KixiValor',
    category: 'Adiantamento de Salário / Assalariados',
    minAmount: 75000,
    maxAmount: 2500000,
    maxTermMonths: 18,
    rate: '61,2% TAN',
    guarantees: 'Não aplicável (garantia implícita pelo vínculo laboral)',
    requiredDocs: [
      { id: 'bi', name: 'Bilhete de Identidade válido', aliases: ['bi', 'identidade', 'documento de identificação', 'bilhete de identidade'] },
      { id: 'protocolo', name: 'Protocolo de Parceria com a Entidade Empregadora', aliases: ['protocolo', 'parceria', 'protocolo com empresa', 'empresa parceira', 'vinculo'] },
      { id: 'rendimentos', name: 'Declaração de Rendimentos / Recibo de Salário', aliases: ['rendimentos', 'declaracao de rendimentos', 'salario', 'recibo de salario', 'recibos de vencimento'] },
      { id: 'extrato', name: 'Extrato bancário recente', aliases: ['extrato', 'extracto', 'declaracao bancaria', 'extrato bancario', 'extracto bancario', 'iban'] },
      { id: 'formulario', name: 'Formulário / Pedido de crédito', aliases: ['formulario', 'ficha', 'pedido'] }
    ]
  },
  'parcerias': {
    name: 'Parcerias KixiCrédito',
    category: 'Entidades Empregadoras',
    minAmount: 0,
    maxAmount: 0,
    maxTermMonths: 0,
    rate: 'Sob consulta de protocolo',
    guarantees: 'Protocolo institucional',
    requiredDocs: [
      { id: 'protocolo', name: 'Protocolo celebrado com a entidade empregadora', aliases: ['protocolo', 'acordo', 'parceria'] },
      { id: 'bi', name: 'Documento de identificação válido dos responsáveis/colaboradores', aliases: ['bi', 'identidade', 'documento de identificacao'] },
      { id: 'extrato', name: 'Extrato bancário', aliases: ['extrato', 'extracto', 'extrato bancario'] }
    ]
  }
};

/**
 * Identifica a chave de produto a partir de texto (nome ou palavras-chave).
 * @param {string} text 
 * @returns {string|null}
 */
export function identifyProductKey(text) {
  if (!text) return null;
  const lower = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  if (lower.includes('facil') || lower.includes('kixifacil')) return 'kixifacil';
  if (lower.includes('negocio') || lower.includes('kixinegocio')) return 'kixinegocio';
  if (lower.includes('agro') || lower.includes('agronegocio') || lower.includes('agricultura') || lower.includes('pecuaria')) return 'kixiagronegocio';
  if (lower.includes('valor') || lower.includes('kixivalor') || lower.includes('salario') || lower.includes('assalariado')) return 'kixivalor';
  if (lower.includes('parceria') || lower.includes('protocolo')) return 'parcerias';

  return null;
}
