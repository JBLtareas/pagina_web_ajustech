import { Component } from 'react';

class GalleryErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <section id="gallery" className="section glass-section">
          <div className="section-header">
            <h2>Galería</h2>
            <p className="section-lead">
              No se pudo cargar la galería 3D. Recarga la página o corre
              {' '}
              <code>npm run client -- --force</code>
              .
            </p>
          </div>
        </section>
      );
    }

    return this.props.children;
  }
}

export default GalleryErrorBoundary;
