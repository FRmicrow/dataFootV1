import { Component } from 'react';
import PropTypes from 'prop-types';
import './ErrorBoundary.css';

class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
        this.reset = this.reset.bind(this);
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, info) {
        console.error('[ErrorBoundary] Uncaught render error:', error, info.componentStack);
    }

    reset() {
        this.setState({ hasError: false, error: null });
    }

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback(this.state.error, this.reset);
            }

            return (
                <div className="error-boundary" role="alert">
                    <div className="error-boundary__card">
                        <span className="error-boundary__icon" aria-hidden="true">⚠️</span>
                        <h1 className="error-boundary__title">Something went wrong</h1>
                        <p className="error-boundary__message">
                            An unexpected error occurred. You can try reloading the page, or contact support if the issue persists.
                        </p>
                        {this.state.error && (
                            <pre className="error-boundary__detail">
                                {this.state.error.message}
                            </pre>
                        )}
                        <button
                            className="error-boundary__button"
                            onClick={() => window.location.reload()}
                        >
                            🔄 Reload page
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

ErrorBoundary.propTypes = {
    children: PropTypes.node.isRequired,
    fallback: PropTypes.func,
};

export default ErrorBoundary;
