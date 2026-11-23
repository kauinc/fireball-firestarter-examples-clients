/** Status copy for the branded boot / connect screens. */
export const LoadingStatus = Object.freeze({
  LOADING: 'loading',
  CONNECTING: 'connecting',
})

/** @type {Record<string, string>} i18n keys (resolve via `t`) */
export const LOADING_STATUS_LABEL = Object.freeze({
  [LoadingStatus.LOADING]: 'label_loading',
  [LoadingStatus.CONNECTING]: 'label_connecting_stream',
})
