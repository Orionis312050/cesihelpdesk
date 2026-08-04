import { Link } from 'react-router'

/** Page affichée pour une URL inconnue. */
export const NotFoundPage = () => (
  <div className="max-w-xl mx-auto bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] rounded-xl p-8 text-center mt-8">
    <p className="text-6xl font-black mb-2">404</p>
    <h1 className="text-2xl font-black uppercase tracking-tight mb-3">Page introuvable</h1>
    <p className="text-gray-600 mb-6">
      Cette adresse n'existe pas. Si vous venez de scanner un QR code, l'affiche
      est peut-être périmée : signalez-le à l'accueil.
    </p>
    <Link to="/signaler" className="inline-block bg-black text-white font-bold px-6 py-3 rounded hover:bg-gray-800 transition-colors">
      Déclarer un incident
    </Link>
  </div>
)
