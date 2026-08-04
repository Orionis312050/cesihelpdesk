/**
 * Écran affiché quand les variables d'environnement Supabase sont absentes.
 *
 * Sans cet écran, l'application se charge normalement puis échoue sur chaque
 * requête avec une erreur réseau obscure : la cause réelle (fichier `.env.local`
 * manquant) est invisible.
 */
export const MissingConfigPage = () => (
  <div className="min-h-screen bg-cesi-gris text-cesi-noir font-sans flex items-center justify-center p-4">
    <div className="max-w-2xl bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] rounded-xl overflow-hidden">
      <div className="bg-cesi-jaune border-b-4 border-black p-6">
        <h1 className="text-2xl font-black uppercase tracking-tight">Configuration manquante</h1>
      </div>
      <div className="p-6 space-y-4">
        <p>
          L'application n'a pas trouvé les informations de connexion à Supabase.
          Elle ne peut donc afficher ni les salles, ni les incidents.
        </p>
        <ol className="list-decimal list-inside space-y-2 text-sm">
          <li>Copiez <code className="bg-gray-100 px-1 rounded">.env.example</code> en <code className="bg-gray-100 px-1 rounded">.env.local</code>.</li>
          <li>Renseignez <code className="bg-gray-100 px-1 rounded">VITE_SUPABASE_URL</code> et <code className="bg-gray-100 px-1 rounded">VITE_SUPABASE_PUBLISHABLE_KEY</code>.</li>
          <li>Redémarrez le serveur de développement (<code className="bg-gray-100 px-1 rounded">npm run dev</code>).</li>
        </ol>
        <p className="text-sm text-gray-600">
          La procédure complète est décrite dans <code className="bg-gray-100 px-1 rounded">docs/01-installation.md</code>.
        </p>
      </div>
    </div>
  </div>
)
