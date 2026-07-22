import type { Ticket } from '../../types/helpdesk'

export const AdminStats = ({ tickets }: { tickets: Ticket[] }) => {
  const total = tickets.length
  const enCours = tickets.filter(t => t.status === 'EN_COURS' || t.status === 'NOUVEAU').length
  const urgences = tickets.filter(t => t.risk).length

  const typesCount: Record<string, number> = {}
  tickets.forEach(t => t.types.forEach(type => { typesCount[type] = (typesCount[type] || 0) + 1 }))

  const pieColors = ['#FBE800', '#1A1A1A', '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899']
  let currentAngle = 0
  const totalTypes = Object.values(typesCount).reduce((a,b) => a+b, 0)
  const pieData = Object.entries(typesCount).map(([type, count], i) => {
    const percentage = (count / totalTypes) * 100
    const item = { type, count, percentage, color: pieColors[i % pieColors.length], startAngle: currentAngle }
    currentAngle += percentage
    return item
  })

  const conicGradient = pieData.length > 0
    ? pieData.map(d => `${d.color} ${d.startAngle}% ${d.startAngle + d.percentage}%`).join(', ')
    : '#F3F4F6 0% 100%'

  const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']
  const monthlyData = new Array<number>(12).fill(0)
  tickets.forEach(t => {
    const date = new Date(t.date)
    if(date.getFullYear() === 2026) monthlyData[date.getMonth()]++
  })
  const maxMonthValue = Math.max(...monthlyData, 1)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-6 rounded-xl text-center">
          <div className="text-gray-500 font-bold mb-2">Total Incidents (Année)</div>
          <div className="text-5xl font-black">{total}</div>
        </div>
        <div className="bg-[#FBE800] border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-6 rounded-xl text-center">
          <div className="text-black font-bold mb-2">À traiter / En cours</div>
          <div className="text-5xl font-black">{enCours}</div>
        </div>
        <div className="bg-black text-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-6 rounded-xl text-center relative overflow-hidden">
          <div className="text-gray-300 font-bold mb-2 relative z-10">Alertes Risque (Cumul)</div>
          <div className="text-5xl font-black text-[#FBE800] relative z-10">{urgences}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow p-6 border border-gray-100">
          <h3 className="font-bold text-lg mb-6 text-center">Volume d'incidents (2026)</h3>
          <div className="flex items-end justify-between h-64 gap-1 pb-6 border-b border-gray-200">
            {monthlyData.map((val, i) => (
              <div key={i} className="flex flex-col items-center w-full group">
                <div className="opacity-0 group-hover:opacity-100 text-xs font-bold mb-1 transition-opacity">{val}</div>
                <div
                  className="w-full bg-[#1A1A1A] rounded-t transition-all duration-500 ease-out hover:bg-[#FBE800]"
                  style={{ height: `${(val / maxMonthValue) * 100}%`, minHeight: val > 0 ? '4px' : '0' }}
                ></div>
                <div className="text-[10px] sm:text-xs text-gray-500 mt-2 truncate w-full text-center">{monthNames[i]}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-6 border border-gray-100 flex flex-col items-center">
          <h3 className="font-bold text-lg mb-6 text-center">Répartition par type</h3>
          <div className="flex-grow flex items-center justify-center w-full relative">
            <div
              className="w-48 h-48 rounded-full border-4 border-white shadow-lg animate-fade-in"
              style={{ background: `conic-gradient(${conicGradient})` }}
            ></div>
            <div className="ml-8 flex flex-col justify-center space-y-2 text-sm max-h-48 overflow-y-auto w-1/2">
              {pieData.map((d, i) => (
                <div key={i} className="flex items-center">
                  <span className="w-3 h-3 rounded-full mr-2 flex-shrink-0" style={{ backgroundColor: d.color }}></span>
                  <span className="truncate" title={d.type}>{d.type}</span>
                  <span className="ml-auto font-bold text-gray-500 text-xs">({d.count})</span>
                </div>
              ))}
              {pieData.length === 0 && <span className="text-gray-400 italic">Aucune donnée</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
