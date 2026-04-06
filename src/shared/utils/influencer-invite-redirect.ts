/**
 * Rotas relativas na **mesma origem** do site (sem variável de ambiente).
 * Ajuste o caminho se o app influenciador usar outro prefixo.
 *
 * Curadoria da pré-seleção: `/influencer/campaigns/:id/preselection-curation`
 */
export function preselectionCurationPath(campaignPublicId: string): string {
  return `/influencer/campaigns/${encodeURIComponent(campaignPublicId)}/preselection-curation`;
}

/** Usuário já cadastrado: abre direto a curadoria da pré-seleção (login no app, se precisar). */
export function buildInfluencerPreselectionCurationUrl(campaignPublicId: string): string {
  return preselectionCurationPath(campaignPublicId);
}
