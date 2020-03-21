export const SELECT_SETTINGS_PANEL = 'SELECT_SETTINGS_PANEL';
export interface SelectSettingsPanelAction {
  type: typeof SELECT_SETTINGS_PANEL,
}

export const SELECT_TRANSACTION = 'SELECT_TRANSACTION';
export interface SelectTransactionAction {
  type: typeof SELECT_TRANSACTION,
  selectedTransactionUid: number,
  selectedInputIdx: number | undefined,
}

export type MenuAction = SelectSettingsPanelAction
                       | SelectTransactionAction;
