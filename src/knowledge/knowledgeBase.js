/**
 * knowledgeBase.js
 * Base de Conhecimento Oficial da KixiCrédito S.A.
 * Rastreabilidade completa de fontes: Fichas Técnicas Informativas e Documentos Oficiais.
 * Princípio Zero Alucinação: Fonte da Verdade Estrita.
 */

export const OFFICIAL_DOCUMENTS = [
  {
    id: 'kixi_facil_fti',
    filename: 'FICHA-DE-PRODUTO-KIXIFACIL_page-0001.pdf',
    title: 'Ficha Técnica Informativa — KixiFácil',
    productKey: 'kixifacil',
    type: 'FTI',
    content: `
PRODUTO: KixiFácil
TIPO DE CRÉDITO: Empresarial
CATEGORIA: Nano-micro empresarial (Nano e micro empresários)
MONTANTE: Mínimo Kz 5.000,00 até Máximo Kz 500.000,00
PRAZO MÁXIMO: Até 12 meses
UTILIZAÇÃO: Em conta bancária do Cliente
REGIME DE PRESTAÇÕES: Constantes, periodicidade mensal
TAXA DE JURO (TAN): 55,2% | Taxa fixa contratada: 4,6% ao mês (a.m.)
GARANTIAS EXIGIDAS: Solidária, avalista e penhor
REEMBOLSO ANTECIPADO: Comissão de 4% do capital (aviso prévio mínimo de 15 dias; N/A para antecipação parcial)
ENCARGOS ADICIONAIS: Comissão de processamento (6,5%) + Imprevistos (2%)
TAXA DE MORA: 5% sobre o valor da prestação em mora
FALTA DE PAGAMENTO: Não renovação automática do contrato para reempréstimo
DIREITO DE REVOGAÇÃO: A qualquer momento, sem custos adicionais, antes da concessão do financiamento
REJEIÇÃO DO PEDIDO: O cliente é informado de imediato após a rejeição
CÓPIA DO CONTRATO: Entregue após a sua celebração
PRAZO DAS CONDIÇÕES DA FTI: 90 dias
`
  },
  {
    id: 'kixi_negocio_fti',
    filename: 'FICHA-DE-PRODUTO-KIXINEGOCIO.pdf',
    title: 'Ficha Técnica Informativa — KixiNegócio',
    productKey: 'kixinegocio',
    type: 'FTI',
    content: `
PRODUTO: KixiNegócio
TIPO DE CRÉDITO: Empresarial
CATEGORIA: Empreendedorismo (Empreendedores e pequenos negócios)
MONTANTE: Mínimo Kz 500.001,00 até Máximo Kz 2.500.000,00
PRAZO MÁXIMO: Até 18 meses
UTILIZAÇÃO: Em conta bancária do Cliente
REGIME DE PRESTAÇÕES: Constantes, periodicidade mensal
TAXA DE JURO (TAN): 55,2% | Taxa fixa contratada: 4,6% ao mês (a.m.)
GARANTIAS EXIGIDAS: Avalista, hipoteca, penhor e caução
REEMBOLSO ANTECIPADO: Comissão de 4% do capital (aviso prévio mínimo de 15 dias; N/A para antecipação parcial)
ENCARGOS ADICIONAIS: Comissão de processamento (6,5%) + Imprevistos (2%)
TAXA DE MORA: 5% sobre o valor da prestação em mora
FALTA DE PAGAMENTO: Sem elegibilidade para novo empréstimo
DIREITO DE REVOGAÇÃO: A qualquer momento, sem custos adicionais, antes da concessão do financiamento
REJEIÇÃO DO PEDIDO: O cliente é informado de imediato após a rejeição
CÓPIA DO CONTRATO: O cliente é informado de imediato após a celebração
PRAZO DAS CONDIÇÕES DA FTI: 90 dias
`
  },
  {
    id: 'kixi_agronegocio_fti',
    filename: 'FICHA-DE-PRODUTO-KIXIAGRONEGOCIO_page-0001.pdf',
    title: 'Ficha Técnica Informativa — KixiAgronegócio',
    productKey: 'kixiagronegocio',
    type: 'FTI',
    content: `
PRODUTO: KixiAgronegócio
TIPO DE CRÉDITO: Agricultura e pecuária
CATEGORIA: Nano, micro e pequenos agricultores
MONTANTE: Mínimo Kz 50.000,00 até Máximo Kz 2.500.000,00
PRAZO MÁXIMO: Até 18 meses
UTILIZAÇÃO: Em conta bancária do Cliente
REGIME DE PRESTAÇÕES: Constantes, periodicidade Mensal ou Quadrimestral (ajustado ao ciclo agrícola)
TAXA DE JURO (TAN): 55,2% | Taxa fixa contratada: 4,6% ao mês (a.m.)
GARANTIAS EXIGIDAS: Avalista, hipoteca, penhor e caução
REEMBOLSO ANTECIPADO: Comissão de 4% do capital (aviso prévio mínimo de 15 dias; N/A para antecipação parcial)
ENCARGOS ADICIONAIS: Comissão de processamento (6,5%) + Imprevistos (2%)
TAXA DE MORA: 5% sobre o valor da prestação em mora
FALTA DE PAGAMENTO: Sem elegibilidade para novo empréstimo
DIREITO DE REVOGAÇÃO: A qualquer momento, sem custos adicionais, antes da concessão do financiamento
REJEIÇÃO DO PEDIDO: O cliente é informado de imediato após a rejeição
CÓPIA DO CONTRATO: Entregue após a sua celebração
PRAZO DAS CONDIÇÕES DA FTI: 90 dias
`
  },
  {
    id: 'kixi_valor_fti',
    filename: 'FICHA-DE-PRODUTO-KIXIVALOR_page-0001.pdf',
    title: 'Ficha Técnica Informativa — KixiValor',
    productKey: 'kixivalor',
    type: 'FTI',
    content: `
PRODUTO: KixiValor
TIPO DE CRÉDITO: Adiantamento de Salário (Crédito a Médio Longo Prazo)
PÚBLICO-ALVO: Trabalhadores assalariados (colaboradores de empresas com parceria/protocolo com a KixiCrédito)
MONTANTE: Mínimo Kz 75.000,00 até Máximo Kz 2.500.000,00
PRAZO MÁXIMO: Até 18 meses
UTILIZAÇÃO: Em conta bancária do Cliente
REGIME DE PRESTAÇÕES: Prestações constantes de capital + juros, periodicidade mensal
TAXA DE JURO (TAN): 61,2% (Taxa Fixa contratada de acordo a maturidade do crédito)
GARANTIAS: Não aplicável (garantia implícita pelo vínculo laboral na empresa parceira)
REEMBOLSO ANTECIPADO: Comissão de 3% do valor em dívida
TAXA DE MORA: 50% sobre a prestação mensal convencionada (incide sobre o capital vencido)
MULTA DIÁRIA POR INCUMPRIMENTO: Multa de 1% sobre o valor vencido
CONSEQUÊNCIAS DE INCUMPRIMENTO: Comunicação da situação de incumprimento à Central de Informação e Risco de Crédito do Banco Nacional de Angola (BNA)
DIREITO DE REVOGAÇÃO: Não aplicável
REJEIÇÃO DO PEDIDO: O cliente é informado de imediato após a rejeição
CÓPIA DO CONTRATO: Minuta disponibilizada gratuitamente
PRAZO DAS CONDIÇÕES DA FTI: 90 dias
`
  },
  {
    id: 'kixi_parcerias',
    filename: 'Parcerias - KixiCrédito.pdf',
    title: 'Programa de Parcerias Institucionais',
    productKey: 'parcerias',
    type: 'INSTITUCIONAL',
    content: `
PARCERIAS KIXICRÉDITO:
DESTINATÁRIOS: Entidades empregadoras que queiram oferecer soluções de crédito aos seus colaboradores (KixiValor).
REQUISITOS OBRIGATÓRIOS:
1. Protocolo celebrado com a entidade empregadora
2. Documento de identificação válido (BI) dos colaboradores
3. Extrato bancário

PROCESSO DE ADESÃO À PARCERIA:
1º Passo: Celebração do protocolo de parceria entre a entidade empregadora e a KixiCrédito.
2º Passo: O colaborador apresenta o pedido de crédito junto da KixiCrédito.
3º Passo: Entrega da documentação necessária para análise do pedido de crédito.
4º Passo: Análise e decisão sobre o pedido de crédito.
5º Passo: Assinatura do contrato.
6º Passo: Desembolso do montante aprovado.

CONTACTOS PARA PARCERIAS:
Telefone / Linha: +244 930 968 888
E-mail: atendimento@kixicredito.ao
`
  },
  {
    id: 'kixi_quem_somos',
    filename: 'Quem Somos - KixiCrédito.pdf',
    title: 'Institucional — Quem Somos e Contactos Oficiais',
    productKey: 'institucional',
    type: 'INSTITUCIONAL',
    content: `
INSTITUIÇÃO: KixiCrédito S.A. (Sociedade Anónima | Contribuinte 5403096116)
HISTÓRIA E IDENTIDADE:
- Instituição financeira não bancária dedicada à promoção da inclusão financeira e desenvolvimento do empreendedorismo em Angola.
- Iniciada em 1996 com o projeto de microcrédito da Development Workshop Angola (DWA).
- Em 2008 tornou-se a primeira sociedade de microcrédito licenciada pelo Banco Nacional de Angola (BNA).
- Mais de 20 anos de experiência a apoiar milhares de empreendedores, famílias e pequenos negócios.
SLOGAN: "Há mais de 20 anos a KixiCrédito anda com quem levanta cedo e faz acontecer."

CONTACTOS OFICIAIS:
- Endereço / Sede: Rua Fernando Pessoa, Largo Teixeira de Pascoaes, Vila Alice, Luanda, Angola
- Linha de Atendimento: +244 930 968 888
- E-mail Oficial: atendimento@kixicredito.ao
- Website Oficial: www.kixicredito.ao
- Redes Sociais: Facebook, LinkedIn, Instagram (@kixicredito_oficial)
`
  }
];

/**
 * Monta o texto consolidado da Base de Conhecimento com marcas de fonte para o Prompt.
 */
export function getFormattedKnowledgeBase() {
  return OFFICIAL_DOCUMENTS.map(doc => {
    return `=== FONTE OFICIAL: ${doc.filename} (${doc.title}) ===\n${doc.content.trim()}`;
  }).join('\n\n---\n\n');
}

/**
 * Pesquisa documentos relevantes na base de conhecimento oficial.
 * @param {string} query 
 * @returns {Array} Chunks relevantes com metadados de fonte
 */
export function retrieveOfficialKnowledge(query) {
  if (!query) return OFFICIAL_DOCUMENTS;
  const q = query.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  return OFFICIAL_DOCUMENTS.filter(doc => {
    const text = (doc.title + ' ' + doc.content + ' ' + doc.filename).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return text.includes(q);
  });
}
