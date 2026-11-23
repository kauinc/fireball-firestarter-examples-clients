import { Component } from 'react'
import { useT } from '../../../shared/i18n/index.js'

function StreamErrorFallback({ error }) {
  const t = useT()
  const message =
    error?.message || String(error) || t('label_unknown_error')
  return (
    <div className="stream-shell stream-shell--error">
      <div className="stream-shell__banner stream-shell__banner--warn" role="alert">
        {t('label_something_went_wrong')}
      </div>
      <button
        type="button"
        className="stream-shell__retry"
        aria-label={t('label_reload')}
        title={message}
        onClick={() => window.location.reload()}
      />
    </div>
  )
}

/**
 * Catches render errors in the stream / overlay tree so a single
 * overlay crash does not blank the whole viewer.
 */
export class StreamErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('[stream] overlay error', error, info?.componentStack)
  }

  render() {
    if (this.state.error) {
      return <StreamErrorFallback error={this.state.error} />
    }
    return this.props.children
  }
}
